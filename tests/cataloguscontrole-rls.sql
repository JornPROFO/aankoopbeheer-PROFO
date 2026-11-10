-- Read-only domain verification with transaction-local authenticated identities.
begin;
create temporary table catalog_rls_expected(runs bigint,items bigint);
insert into catalog_rls_expected select (select count(*) from public.aankoop_catalogus_runs),(select count(*) from public.aankoop_catalogus_resultaten);
grant select on catalog_rls_expected to authenticated;
do $$ begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',auth_user_id,'email',email,'role','authenticated')::text,true)
    from public.gebruikers where lower(email)='jorn.neeus@profo.be' and actief;
end $$;
set local role authenticated;
do $$ begin
  if (select count(*) from public.aankoop_catalogus_runs)<>(select runs from catalog_rls_expected) then raise exception 'Manager cannot read audit runs'; end if;
  if (select count(*) from public.aankoop_catalogus_resultaten)<>(select items from catalog_rls_expected) then raise exception 'Manager cannot read audit results'; end if;
  if public.aankoop_catalogus_planning() is null then raise exception 'Manager cannot read schedule'; end if;
end $$;
reset role;
do $$ declare v_claims text; begin
  select jsonb_build_object('sub',auth_user_id,'email',email,'role','authenticated')::text into v_claims from public.gebruikers where actief and rol='Gebruiker' and auth_user_id is not null limit 1;
  if v_claims is null then raise exception 'No real ordinary user available'; end if;
  perform set_config('request.jwt.claims',v_claims,true);
end $$;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.aankoop_catalogus_runs) or exists(select 1 from public.aankoop_catalogus_resultaten) then raise exception 'Ordinary user can read admin log'; end if;
  if public.aankoop_catalogus_planning() is not null then raise exception 'Ordinary user can read private schedule'; end if;
  begin update public.aankoop_catalogus_runs set corrected=0; raise exception 'Browser can write audit log'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: active manager read, ordinary user isolation, browser writes denied' as result;
rollback;
