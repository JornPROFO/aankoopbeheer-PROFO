-- Integratietest in SQL Editor. Alle testgegevens verdwijnen via ROLLBACK.
-- Gebruikt de bestaande beheerder Jorn uitsluitend binnen deze transactie.
begin;
do $$
declare test_id bigint; actor uuid;
begin
  select id into strict actor from auth.users where email = 'jorn.neeus@profo.be';
  perform set_config('request.jwt.claims', jsonb_build_object('sub',actor,'email','jorn.neeus@profo.be','role','authenticated')::text, true);
  insert into public.aankoop_bestellingen(locatie_naam,besteller_naam,besteller_email,status,totaal_excl_btw,totaal_btw,totaal_incl_btw)
    values ('TEST - rollback','TEST - rollback','test@example.invalid','Extra informatie gevraagd',7.08,0.42,7.50) returning id into test_id;
  insert into public.aankoop_bestelregels(bestelling_id,product_naam,aantal,eenheid,eenheidsprijs_excl_btw,btw_percentage,lijn_totaal_excl_btw,lijn_totaal_btw,lijn_totaal_incl_btw)
    values(test_id,'Bestaande testregel',1,'verpakking',7.08,6,7.08,0.42,7.50);
  perform set_config('test.order_id',test_id::text,true);
end $$;
set local role authenticated;
do $$
declare
  test_id bigint := current_setting('test.order_id')::bigint;
  v_product_id bigint;
  version timestamptz;
  request_id uuid := gen_random_uuid();
  result jsonb;
  line_id bigint;
begin
  select id into strict v_product_id from public.aankoop_producten
    where naam = 'Lait D''Ardennes Echte Ardense Melk UHT halfvolle melk - 6 x 1 liter';
  select updated_at into version from public.aankoop_bestellingen where id = test_id;
  result := public.aankoop_bestelregel_wijzigen(test_id,version,request_id,'toevoegen',v_product_id,2);
  if (result->>'totaal_incl_btw')::numeric <> 22.50 or jsonb_array_length(result->'regels') <> 2
     or result->>'status' <> 'Extra informatie gevraagd' then raise exception 'Toevoegen/totaal/status onjuist'; end if;
  result := public.aankoop_bestelregel_wijzigen(test_id,version,request_id,'toevoegen',v_product_id,2);
  if jsonb_array_length(result->'regels') <> 2 then raise exception 'Dubbele toevoeging bij herhalen'; end if;
  begin
    perform public.aankoop_bestelregel_wijzigen(test_id,version - interval '1 second',gen_random_uuid(),'toevoegen',v_product_id,1);
    raise exception 'Verouderde versie werd niet geblokkeerd';
  exception when serialization_failure then null; end;
  select updated_at into version from public.aankoop_bestellingen where id=test_id;
  begin
    perform public.aankoop_bestelregel_wijzigen(test_id,version,gen_random_uuid(),'toevoegen',v_product_id,0);
    raise exception 'Ongeldig aantal geaccepteerd' using errcode='XX000';
  exception when raise_exception then null; end;
  select id into strict line_id from public.aankoop_bestelregels where bestelling_id=test_id and product_id=v_product_id;
  result := public.aankoop_bestelregel_wijzigen(test_id,version,gen_random_uuid(),'verwijderen',null,null,line_id);
  if (result->>'totaal_incl_btw')::numeric <> 7.50 or jsonb_array_length(result->'regels') <> 1 then
    raise exception 'Verwijderen/totaal onjuist';
  end if;
  if (select count(*) from public.aankoop_bestelregel_wijzigingen where bestelling_id=test_id) <> 2 then
    raise exception 'Historiek onjuist';
  end if;
  select updated_at into version from public.aankoop_bestellingen where id=test_id;
  select id into line_id from public.aankoop_bestelregels where bestelling_id=test_id;
  begin
    perform public.aankoop_bestelregel_wijzigen(test_id,version,gen_random_uuid(),'verwijderen',null,null,line_id);
    raise exception 'Laatste regel verwijderd' using errcode='XX000';
  exception when raise_exception then null; end;
  update public.aankoop_bestellingen set status='Besteld' where id=test_id;
  select updated_at into version from public.aankoop_bestellingen where id=test_id;
  begin
    perform public.aankoop_bestelregel_wijzigen(test_id,version,gen_random_uuid(),'toevoegen',v_product_id,1);
    raise exception 'Bestelde order aangepast' using errcode='XX000';
  exception when raise_exception then null; end;
  -- Een ingelogde identiteit zonder beheerdersrol krijgt geen toegang tot de RPC.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  begin
    perform public.aankoop_bestelregel_wijzigen(test_id,version,gen_random_uuid(),'toevoegen',v_product_id,1);
    raise exception 'Onbevoegde gebruiker toegelaten' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'Geslaagd: toevoegen, verwijderen, totalen, historiek, herhalen, versiecontrole, aantallen, laatste regel, status en rechten. Testgegevens teruggedraaid.' as resultaat;
