-- PROFO Aankoopbeheer - minimale RLS-herstelversie
-- Datum: 2026-07-09
--
-- Doel:
-- Deze versie doet alleen wat nu nodig is om de bestaande aankoopapp af te schermen:
-- rollen zetten, hulpfuncties maken, RLS activeren en policies plaatsen.
--
-- Bewust NIET in dit bestand:
-- statuslog, auditlog en incidententabel. Die volgen pas nadat deze basis zonder fout loopt.

update public.gebruikers
set rol = 'Gebruiker'
where rol is null
   or btrim(rol) = '';

update public.gebruikers
set rol = 'Gebruiker'
where lower(rol) in ('regiodirecteur', 'directeur', 'medewerker', 'user');

update public.gebruikers
set rol = 'Beheerder aankoop'
where lower(rol) in ('beheerder', 'admin', 'eindverantwoordelijke', 'aankoopbeheerder');

insert into public.gebruikers (naam, email, functie, rol, actief)
values
  ('Jorn Neeus', 'jorn.neeus@profo.be', 'Aankoopbeheer / DPO', 'Superadmin', true),
  ('Kathleen Nerinckx', 'kathleen.nerinckx@profo.be', 'Back-up aankoopbeheer', 'Beheerder aankoop', true)
on conflict (email) do update
set
  naam = excluded.naam,
  functie = excluded.functie,
  rol = excluded.rol,
  actief = true;

alter table public.gebruikers
  drop constraint if exists gebruikers_rol_check;

create or replace function public.current_gebruiker_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select gebruiker.id
  from public.gebruikers gebruiker
  where gebruiker.actief = true
    and (
      gebruiker.auth_user_id = auth.uid()
      or lower(gebruiker.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  limit 1
$$;

create or replace function public.current_gebruiker_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select gebruiker.rol
  from public.gebruikers gebruiker
  where gebruiker.actief = true
    and (
      gebruiker.auth_user_id = auth.uid()
      or lower(gebruiker.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  limit 1
$$;

create or replace function public.current_gebruiker_is_beheerder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_gebruiker_rol(), '') in ('Beheerder aankoop', 'Superadmin')
$$;

create or replace function public.current_gebruiker_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_gebruiker_rol(), '') = 'Superadmin'
$$;

grant execute on function public.current_gebruiker_id() to authenticated;
grant execute on function public.current_gebruiker_rol() to authenticated;
grant execute on function public.current_gebruiker_is_beheerder() to authenticated;
grant execute on function public.current_gebruiker_is_superadmin() to authenticated;

do $$
begin
  if to_regclass('public.gebruikers') is not null then
    execute 'alter table public.gebruikers enable row level security';
    execute 'drop policy if exists gebruikers_select_ingelogd on public.gebruikers';
    execute 'drop policy if exists gebruikers_beheerder_beheert on public.gebruikers';
    execute 'drop policy if exists gebruikers_select_actieve_self_of_beheerder on public.gebruikers';
    execute 'drop policy if exists gebruikers_update_superadmin on public.gebruikers';
    execute 'create policy gebruikers_select_actieve_self_of_beheerder on public.gebruikers for select to authenticated using (public.current_gebruiker_is_beheerder() or (actief = true and (auth_user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> ''email'', '''')))))';
    execute 'create policy gebruikers_update_superadmin on public.gebruikers for update to authenticated using (public.current_gebruiker_is_superadmin()) with check (public.current_gebruiker_is_superadmin())';
  end if;

  if to_regclass('public.locaties') is not null then
    execute 'alter table public.locaties enable row level security';
    execute 'drop policy if exists locaties_select_ingelogd on public.locaties';
    execute 'drop policy if exists locaties_beheerder_beheert on public.locaties';
    execute 'drop policy if exists locaties_select_actief on public.locaties';
    execute 'drop policy if exists locaties_insert_beheerder on public.locaties';
    execute 'drop policy if exists locaties_update_beheerder on public.locaties';
    execute 'create policy locaties_select_actief on public.locaties for select to authenticated using (actief = true or public.current_gebruiker_is_beheerder())';
    execute 'create policy locaties_insert_beheerder on public.locaties for insert to authenticated with check (public.current_gebruiker_is_beheerder())';
    execute 'create policy locaties_update_beheerder on public.locaties for update to authenticated using (public.current_gebruiker_is_beheerder()) with check (public.current_gebruiker_is_beheerder())';
  end if;

  if to_regclass('public.aankoop_producten') is not null then
    execute 'alter table public.aankoop_producten enable row level security';
    execute 'drop policy if exists aankoop_producten_authenticated_select on public.aankoop_producten';
    execute 'drop policy if exists aankoop_producten_beheerder_all on public.aankoop_producten';
    execute 'drop policy if exists aankoop_producten_select_actief on public.aankoop_producten';
    execute 'drop policy if exists aankoop_producten_insert_beheerder on public.aankoop_producten';
    execute 'drop policy if exists aankoop_producten_update_beheerder on public.aankoop_producten';
    execute 'create policy aankoop_producten_select_actief on public.aankoop_producten for select to authenticated using (actief = true or public.current_gebruiker_is_beheerder())';
    execute 'create policy aankoop_producten_insert_beheerder on public.aankoop_producten for insert to authenticated with check (public.current_gebruiker_is_beheerder())';
    execute 'create policy aankoop_producten_update_beheerder on public.aankoop_producten for update to authenticated using (public.current_gebruiker_is_beheerder()) with check (public.current_gebruiker_is_beheerder())';
  end if;

  if to_regclass('public.aankoop_printers') is not null then
    execute 'alter table public.aankoop_printers enable row level security';
    execute 'drop policy if exists aankoop_printers_authenticated_select on public.aankoop_printers';
    execute 'drop policy if exists aankoop_printers_beheerder_all on public.aankoop_printers';
    execute 'drop policy if exists aankoop_printers_select_actief on public.aankoop_printers';
    execute 'drop policy if exists aankoop_printers_insert_beheerder on public.aankoop_printers';
    execute 'drop policy if exists aankoop_printers_update_beheerder on public.aankoop_printers';
    execute 'create policy aankoop_printers_select_actief on public.aankoop_printers for select to authenticated using (actief = true or public.current_gebruiker_is_beheerder())';
    execute 'create policy aankoop_printers_insert_beheerder on public.aankoop_printers for insert to authenticated with check (public.current_gebruiker_is_beheerder())';
    execute 'create policy aankoop_printers_update_beheerder on public.aankoop_printers for update to authenticated using (public.current_gebruiker_is_beheerder()) with check (public.current_gebruiker_is_beheerder())';
  end if;

  if to_regclass('public.aankoop_printer_cartridges') is not null then
    execute 'alter table public.aankoop_printer_cartridges enable row level security';
    execute 'drop policy if exists aankoop_printer_cartridges_authenticated_select on public.aankoop_printer_cartridges';
    execute 'drop policy if exists aankoop_printer_cartridges_beheerder_all on public.aankoop_printer_cartridges';
    execute 'drop policy if exists aankoop_printer_cartridges_select_actief on public.aankoop_printer_cartridges';
    execute 'drop policy if exists aankoop_printer_cartridges_insert_beheerder on public.aankoop_printer_cartridges';
    execute 'drop policy if exists aankoop_printer_cartridges_update_beheerder on public.aankoop_printer_cartridges';
    execute 'create policy aankoop_printer_cartridges_select_actief on public.aankoop_printer_cartridges for select to authenticated using (actief = true or public.current_gebruiker_is_beheerder())';
    execute 'create policy aankoop_printer_cartridges_insert_beheerder on public.aankoop_printer_cartridges for insert to authenticated with check (public.current_gebruiker_is_beheerder())';
    execute 'create policy aankoop_printer_cartridges_update_beheerder on public.aankoop_printer_cartridges for update to authenticated using (public.current_gebruiker_is_beheerder()) with check (public.current_gebruiker_is_beheerder())';
  end if;

  if to_regclass('public.aankoop_bestellingen') is not null then
    execute 'alter table public.aankoop_bestellingen enable row level security';
    execute 'drop policy if exists aankoop_bestellingen_select_betrokken_of_beheerder on public.aankoop_bestellingen';
    execute 'drop policy if exists aankoop_bestellingen_insert_eigen_sessie on public.aankoop_bestellingen';
    execute 'drop policy if exists aankoop_bestellingen_update_beheerder on public.aankoop_bestellingen';
    execute 'create policy aankoop_bestellingen_select_betrokken_of_beheerder on public.aankoop_bestellingen for select to authenticated using (public.current_gebruiker_is_beheerder() or besteller_id = public.current_gebruiker_id() or aangemaakt_door_id = public.current_gebruiker_id())';
    execute 'create policy aankoop_bestellingen_insert_eigen_sessie on public.aankoop_bestellingen for insert to authenticated with check (public.current_gebruiker_is_beheerder() or (besteller_id = public.current_gebruiker_id() and aangemaakt_door_id = public.current_gebruiker_id()))';
    execute 'create policy aankoop_bestellingen_update_beheerder on public.aankoop_bestellingen for update to authenticated using (public.current_gebruiker_is_beheerder()) with check (public.current_gebruiker_is_beheerder())';
  end if;

  if to_regclass('public.aankoop_bestelregels') is not null then
    execute 'alter table public.aankoop_bestelregels enable row level security';
    execute 'drop policy if exists aankoop_bestelregels_select_betrokken_of_beheerder on public.aankoop_bestelregels';
    execute 'drop policy if exists aankoop_bestelregels_insert_bij_eigen_bestelling on public.aankoop_bestelregels';
    execute 'drop policy if exists aankoop_bestelregels_update_beheerder on public.aankoop_bestelregels';
    execute 'create policy aankoop_bestelregels_select_betrokken_of_beheerder on public.aankoop_bestelregels for select to authenticated using (exists (select 1 from public.aankoop_bestellingen bestelling where bestelling.id = aankoop_bestelregels.bestelling_id and (public.current_gebruiker_is_beheerder() or bestelling.besteller_id = public.current_gebruiker_id() or bestelling.aangemaakt_door_id = public.current_gebruiker_id())))';
    execute 'create policy aankoop_bestelregels_insert_bij_eigen_bestelling on public.aankoop_bestelregels for insert to authenticated with check (exists (select 1 from public.aankoop_bestellingen bestelling where bestelling.id = aankoop_bestelregels.bestelling_id and (public.current_gebruiker_is_beheerder() or bestelling.aangemaakt_door_id = public.current_gebruiker_id())))';
    execute 'create policy aankoop_bestelregels_update_beheerder on public.aankoop_bestelregels for update to authenticated using (public.current_gebruiker_is_beheerder()) with check (public.current_gebruiker_is_beheerder())';
  end if;
end $$;

select
  'rollen' as controle,
  naam,
  email,
  rol,
  actief
from public.gebruikers
where lower(email) in ('jorn.neeus@profo.be', 'kathleen.nerinckx@profo.be')
order by email;

select
  'rls zonder rijbeveiliging' as controle,
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'gebruikers',
    'locaties',
    'aankoop_producten',
    'aankoop_bestellingen',
    'aankoop_bestelregels',
    'aankoop_printers',
    'aankoop_printer_cartridges'
  )
  and rowsecurity = false
order by tablename;
