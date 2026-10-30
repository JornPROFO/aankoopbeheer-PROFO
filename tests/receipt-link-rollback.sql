begin;
do $$
declare
  manager bigint; requester bigint; outsider bigint; test_id bigint; line_id bigint;
  attempt uuid:=gen_random_uuid(); reminder uuid:=gen_random_uuid(); receipt uuid:=gen_random_uuid();
  v jsonb; result jsonb; version timestamptz; initial_version timestamptz;
begin
  select id into strict manager from public.gebruikers where email='jorn.neeus@profo.be' and actief;
  select id into strict requester from public.gebruikers where actief and lower(trim(rol)) not in ('beheerder aankoop','superadmin') and nullif(email,'') is not null order by id limit 1;
  select id into outsider from public.gebruikers where actief and id not in (manager,requester) limit 1;
  insert into public.aankoop_bestellingen(locatie_naam,besteller_id,besteller_naam,besteller_email,status,totaal_excl_btw,totaal_btw,totaal_incl_btw)
    values('TEST maillink rollback',requester,'Test','test@example.invalid','Besteld',10,2.1,12.1) returning id,updated_at into test_id,initial_version;
  insert into public.aankoop_bestelregels(bestelling_id,product_naam,aantal,eenheid,eenheidsprijs_excl_btw,btw_percentage,lijn_totaal_excl_btw,lijn_totaal_btw,lijn_totaal_incl_btw)
    values(test_id,'Testartikel',3,'pak',3.33,21,10,2.1,12.1) returning id into line_id;
  begin
    perform public.aankoop_ontvangst_mail_voorbereiden(test_id,requester,attempt,false);
    raise exception 'Besteller mag mail versturen' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  v:=public.aankoop_ontvangst_mail_voorbereiden(test_id,manager,attempt,false);
  result:=public.aankoop_ontvangst_mail_voorbereiden(test_id,manager,gen_random_uuid(),false);
  if v<>result then raise exception 'Gelijktijdige verzendpoging werd niet hergebruikt' using errcode='XX000'; end if;
  perform public.aankoop_ontvangst_mail_verzonden(attempt,'test-no-real-mail');
  perform public.aankoop_ontvangst_mail_verzonden(attempt,'test-no-real-mail');
  if (select mail_aantal from public.aankoop_ontvangstverzoeken where bestelling_id=test_id)<>1 then raise exception 'Dubbele mailregistratie' using errcode='XX000'; end if;
  result:=public.aankoop_ontvangst_mail_voorbereiden(test_id,manager,gen_random_uuid(),false);
  if not (result->>'alreadySent')::boolean then raise exception 'Eerste vraag niet idempotent' using errcode='XX000'; end if;
  begin
    perform public.aankoop_ontvangst_mail_voorbereiden(test_id,manager,reminder,true);
    raise exception 'Herinnering zonder wachttijd' using errcode='XX000';
  exception when raise_exception then null; end;
  result:=public.aankoop_ontvangst_via_link(attempt,'bekijken');
  if result ? 'besteller_email' or result ? 'besteller_id' or result ? 'totaal_incl_btw' then raise exception 'Overbodige persoonsgegevens' using errcode='XX000'; end if;
  if exists(select 1 from public.aankoop_ontvangstbevestigingen where bestelling_id=test_id)
    or (select updated_at from public.aankoop_bestellingen where id=test_id)<>initial_version then raise exception 'Bekijken heeft geschreven' using errcode='XX000'; end if;
  begin
    perform public.aankoop_ontvangst_via_link(gen_random_uuid(),'bekijken');
    raise exception 'Onbekende link geldig' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  update public.aankoop_ontvangstverzoeken set mail_link_geldig_tot=now()-interval '1 second' where bestelling_id=test_id;
  begin
    perform public.aankoop_ontvangst_via_link(attempt,'bekijken');
    raise exception 'Verlopen link geldig' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  update public.aankoop_ontvangstverzoeken set mail_link_geldig_tot=now()+interval '14 days',mail_verzonden_op=now()-interval '6 minutes' where bestelling_id=test_id;
  v:=public.aankoop_ontvangst_mail_voorbereiden(test_id,manager,reminder,true);
  if v->>'mail_poging_id'<>reminder::text then raise exception 'Herinnering heeft geen nieuwe link' using errcode='XX000'; end if;
  begin
    perform public.aankoop_ontvangst_via_link(attempt,'bekijken');
    raise exception 'Oude link na herinnering geldig' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  update public.aankoop_ontvangstverzoeken set mail_inhoud=jsonb_set(mail_inhoud,'{email}','"changed@example.invalid"') where bestelling_id=test_id;
  begin
    perform public.aankoop_ontvangst_via_link(reminder,'bekijken');
    raise exception 'Gewijzigd emailadres toegestaan' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  update public.aankoop_ontvangstverzoeken set mail_inhoud=v->'mail_inhoud' where bestelling_id=test_id;
  select updated_at into version from public.aankoop_bestellingen where id=test_id;
  begin
    perform public.aankoop_ontvangst_via_link(reminder,'bevestigen',receipt,version-interval '1 second',jsonb_build_object(line_id,1));
    raise exception 'Verouderde ontvangst toegestaan' using errcode='XX000';
  exception when serialization_failure then null; end;
  result:=public.aankoop_ontvangst_via_link(reminder,'bevestigen',receipt,version,jsonb_build_object(line_id,1));
  perform public.aankoop_ontvangst_via_link(reminder,'bevestigen',receipt,version,jsonb_build_object(line_id,1));
  if (select count(*) from public.aankoop_ontvangstbevestigingen where bestelling_id=test_id)<>1
    or (select kanaal from public.aankoop_ontvangstbevestigingen where id=receipt)<>'mail'
    or (select status from public.aankoop_bestellingen where id=test_id)<>'Gedeeltelijk geleverd' then raise exception 'Deellevering of herhaling mislukt' using errcode='XX000'; end if;
  select updated_at into version from public.aankoop_bestellingen where id=test_id;
  result:=public.aankoop_ontvangst_via_link(reminder,'bevestigen',gen_random_uuid(),version,jsonb_build_object(line_id,3));
  if not (result->>'volledig')::boolean then raise exception 'Nalevering mislukt' using errcode='XX000'; end if;
  if not exists(select 1 from public.aankoop_meldingen where bestelling_id=test_id and gebruiker_id=manager and type='ontvangst_bevestigd') then raise exception 'Beheermelding ontbreekt' using errcode='XX000'; end if;
  if has_function_privilege('anon','public.aankoop_ontvangst_via_link(uuid,text,uuid,timestamptz,jsonb,text)','execute')
    or has_function_privilege('authenticated','public.aankoop_ontvangst_via_link(uuid,text,uuid,timestamptz,jsonb,text)','execute')
    or has_function_privilege('authenticated','public.aankoop_ontvangst_mail_voorbereiden(bigint,bigint,uuid,boolean)','execute')
    then raise exception 'Client kan beveiliging omzeilen' using errcode='XX000'; end if;
end $$;
rollback;
select 'Geslaagd: herinnering, wachttijd, idempotentie, linkverval, vervangen link, ontvangerbinding, alleen lezen, deellevering, nalevering, melding, rechten. Geen mails verstuurd; testgegevens teruggedraaid.' as resultaat;
