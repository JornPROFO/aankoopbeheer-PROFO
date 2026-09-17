begin;
do $$
declare
  test_id bigint; line_id bigint; manager bigint; requester bigint; outsider bigint;
  version timestamptz; receipt_id uuid := gen_random_uuid(); result jsonb; first_request jsonb;
begin
  select id into strict manager from public.gebruikers where email='jorn.neeus@profo.be' and actief;
  select besteller_id into strict requester from public.aankoop_bestellingen where id=10;
  select id into outsider from public.gebruikers where actief and id not in (manager,requester) limit 1;
  insert into public.aankoop_bestellingen(locatie_naam,besteller_id,besteller_naam,besteller_email,status,totaal_excl_btw,totaal_btw,totaal_incl_btw)
    values('TEST ontvangst rollback',requester,'Test','test@example.invalid','Besteld',10,2.1,12.1) returning id,updated_at into test_id,version;
  insert into public.aankoop_bestelregels(bestelling_id,product_naam,aantal,eenheid,eenheidsprijs_excl_btw,btw_percentage,lijn_totaal_excl_btw,lijn_totaal_btw,lijn_totaal_incl_btw)
    values(test_id,'Testartikel',3,'pak',3.33,21,10,2.1,12.1) returning id into line_id;
  first_request := public.aankoop_ontvangst_verwerken(test_id,manager,'vragen',null);
  result := public.aankoop_ontvangst_verwerken(test_id,manager,'vragen',null);
  if result->>'id' <> first_request->>'id' then raise exception 'Dubbel verzoek' using errcode='XX000'; end if;
  if (select count(*) from public.aankoop_meldingen where bestelling_id=test_id and type='ontvangst_gevraagd')<>1 then raise exception 'Dubbele melding' using errcode='XX000'; end if;
  begin
    perform public.aankoop_ontvangst_verwerken(test_id,outsider,'bevestigen',receipt_id,version,jsonb_build_object(line_id,1));
    raise exception 'Onbevoegde besteller' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  begin
    perform public.aankoop_ontvangst_verwerken(test_id,requester,'vragen',null);
    raise exception 'Besteller kan verzoek versturen' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  begin
    perform public.aankoop_ontvangst_verwerken(test_id,requester,'bevestigen',receipt_id,version-interval '1 second',jsonb_build_object(line_id,1));
    raise exception 'Verouderde versie toegestaan' using errcode='XX000';
  exception when serialization_failure then null; end;
  begin
    perform public.aankoop_ontvangst_verwerken(test_id,requester,'bevestigen',receipt_id,version,jsonb_build_object(line_id,4));
    raise exception 'Te veel ontvangen toegestaan' using errcode='XX000';
  exception when raise_exception then null; end;
  begin
    perform public.aankoop_ontvangst_verwerken(test_id,requester,'bevestigen',receipt_id,version,jsonb_build_object(line_id,0));
    raise exception 'Nul ontvangen toegestaan' using errcode='XX000';
  exception when raise_exception then null; end;
  result := public.aankoop_ontvangst_verwerken(test_id,requester,'bevestigen',receipt_id,version,jsonb_build_object(line_id,1),'Een pak ontvangen');
  if (result->>'volledig')::boolean or (select status from public.aankoop_bestellingen where id=test_id)<>'Gedeeltelijk geleverd' then raise exception 'Deellevering mislukt' using errcode='XX000'; end if;
  perform public.aankoop_ontvangst_verwerken(test_id,requester,'bevestigen',receipt_id,version,jsonb_build_object(line_id,1));
  if (select count(*) from public.aankoop_ontvangstbevestigingen where bestelling_id=test_id)<>1 then raise exception 'Dubbele bevestiging' using errcode='XX000'; end if;
  select updated_at into version from public.aankoop_bestellingen where id=test_id;
  begin
    perform public.aankoop_ontvangst_verwerken(test_id,requester,'bevestigen',gen_random_uuid(),version,jsonb_build_object(line_id,0));
    raise exception 'Vermindering toegestaan' using errcode='XX000';
  exception when raise_exception then null; end;
  result := public.aankoop_ontvangst_verwerken(test_id,requester,'bevestigen',gen_random_uuid(),version,jsonb_build_object(line_id,3));
  if not (result->>'volledig')::boolean or (select status from public.aankoop_bestellingen where id=test_id)<>'Geleverd'
    or (select leverstatus from public.aankoop_bestelregels where id=line_id)<>'geleverd' then raise exception 'Volledige ontvangst mislukt' using errcode='XX000'; end if;
  if not exists(select 1 from public.aankoop_meldingen where bestelling_id=test_id and gebruiker_id=manager and type='ontvangst_bevestigd') then raise exception 'Beheermelding ontbreekt' using errcode='XX000'; end if;
  if has_function_privilege('authenticated','public.aankoop_ontvangst_verwerken(bigint,bigint,text,uuid,timestamptz,jsonb,text)','execute')
    or has_function_privilege('anon','public.aankoop_ontvangst_verwerken(bigint,bigint,text,uuid,timestamptz,jsonb,text)','execute')
    or has_table_privilege('authenticated','public.aankoop_ontvangstbevestigingen','insert') then raise exception 'Client kan controles omzeilen' using errcode='XX000'; end if;
end $$;
rollback;
select 'Geslaagd: verzoek, idempotentie, rechten, versie, aantallen, deellevering, nalevering, statussen, beheermelding. Alles teruggedraaid.' as resultaat;
