-- Live integration check. All test rows are rolled back; no supplier action.
begin;
do $$
declare actor uuid; test_id bigint; line_id bigint;
begin
  select id into strict actor from auth.users where lower(email) = 'jorn.neeus@profo.be';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'email','jorn.neeus@profo.be','role','authenticated')::text,true);
  insert into public.aankoop_bestellingen(locatie_naam,besteller_naam,besteller_email,status,totaal_excl_btw,totaal_btw,totaal_incl_btw)
    values ('TEST winkelwagen rollback','TEST winkelwagen rollback','test@example.invalid','Goedgekeurd',1,0.21,1.21) returning id into test_id;
  insert into public.aankoop_bestelregels(bestelling_id,product_naam,aantal,eenheid,eenheidsprijs_excl_btw,btw_percentage,lijn_totaal_excl_btw,lijn_totaal_btw,lijn_totaal_incl_btw)
    values(test_id,'TEST winkelwagen rollback',2,'stuk',0.5,21,1,0.21,1.21) returning id into line_id;
  perform set_config('test.cart_order',test_id::text,true);
  perform set_config('test.cart_line',line_id::text,true);
end $$;
set local role authenticated;
do $$
declare order_id bigint := current_setting('test.cart_order')::bigint; preview jsonb; run public.aankoop_winkelwagen_overdrachten; repeated public.aankoop_winkelwagen_overdrachten;
begin
  if not public.aankoop_winkelwagen_bevoegd() then raise exception 'Jorn niet bevoegd'; end if;
  preview := public.aankoop_winkelwagen_snapshot(order_id);
  run := public.aankoop_winkelwagen_start(order_id,preview);
  repeated := public.aankoop_winkelwagen_start(order_id,preview);
  if run.id <> repeated.id or run.actor_id <> auth.uid() then raise exception 'Herstart of actor onjuist'; end if;
  perform set_config('test.cart_run',run.id::text,true);
  insert into public.aankoop_winkelwagen_resultaten(overdracht_id,regel_id,resultaat,reden)
    values(run.id,current_setting('test.cart_line')::bigint,'onzeker','onderbroken');
  if (select status from public.aankoop_bestellingen where id=order_id) <> 'Goedgekeurd' then raise exception 'Aankoopstatus gewijzigd'; end if;
end $$;
reset role;
do $$
declare actor uuid;
begin
  select id into strict actor from auth.users where lower(email) = 'kathleen.nerinckx@profo.be';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'email','kathleen.nerinckx@profo.be','role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
begin
  if not public.aankoop_winkelwagen_bevoegd() then raise exception 'Kathleen niet bevoegd'; end if;
  if not exists (select 1 from public.aankoop_winkelwagen_overdrachten where id=current_setting('test.cart_run')::uuid) then raise exception 'Kathleen kan registratie niet lezen'; end if;
  insert into public.aankoop_winkelwagen_resultaten(overdracht_id,regel_id,resultaat,reden)
    values(current_setting('test.cart_run')::uuid,current_setting('test.cart_line')::bigint,'mislukt','niet_gevonden');
end $$;
reset role;
do $$
declare other_user record;
begin
  select u.id,u.email into other_user from auth.users u
    join public.gebruikers g on g.auth_user_id=u.id
    where g.actief and lower(g.email) not in ('jorn.neeus@profo.be','kathleen.nerinckx@profo.be') limit 1;
  -- Projects with only the two processors use an unlinked test identity.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',coalesce(other_user.id,gen_random_uuid()),'email',coalesce(other_user.email,'test.other@example.invalid'),'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
begin
  if public.aankoop_winkelwagen_bevoegd() then raise exception 'Andere gebruiker onterecht bevoegd'; end if;
  if exists(select 1 from public.aankoop_winkelwagen_overdrachten) or exists(select 1 from public.aankoop_winkelwagen_resultaten) then raise exception 'Registraties zichtbaar voor onbevoegde'; end if;
  begin
    perform public.aankoop_winkelwagen_snapshot(current_setting('test.cart_order')::bigint);
    raise exception 'Onbevoegde snapshot toegestaan' using errcode='XX000';
  exception when raise_exception then null; end;
end $$;
rollback;
select 'PASS: Jorn en Kathleen bevoegd; andere gebruiker geweigerd; hervatten en audit werken; testgegevens teruggedraaid' as resultaat;
