-- PROFO Aankoopbeheer - beheerrechten beperken
-- Doel: alleen Jorn Neeus en Kathleen Nerinckx mogen producten, printers,
-- inkt/toners en algemene bestelstatussen beheren.

update public.gebruikers
set rol = 'Gebruiker'
where lower(email) not in ('jorn.neeus@profo.be', 'kathleen.nerinckx@profo.be');

insert into public.gebruikers (naam, email, functie, rol, actief)
values
  ('Jorn Neeus', 'jorn.neeus@profo.be', 'Aankoopbeheer', 'Beheerder', true),
  ('Kathleen Nerinckx', 'kathleen.nerinckx@profo.be', 'Back-up aankoopbeheer', 'Beheerder', true)
on conflict (email) do update
set
  naam = excluded.naam,
  functie = excluded.functie,
  rol = excluded.rol,
  actief = true;

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

create or replace function public.current_gebruiker_is_beheerder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gebruikers gebruiker
    where gebruiker.actief = true
      and lower(gebruiker.email) in ('jorn.neeus@profo.be', 'kathleen.nerinckx@profo.be')
      and (
        gebruiker.auth_user_id = auth.uid()
        or lower(gebruiker.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
$$;

grant execute on function public.current_gebruiker_id() to authenticated;
grant execute on function public.current_gebruiker_is_beheerder() to authenticated;

alter table public.aankoop_producten enable row level security;
alter table public.aankoop_bestellingen enable row level security;
alter table public.aankoop_bestelregels enable row level security;

drop policy if exists aankoop_producten_authenticated_select on public.aankoop_producten;
drop policy if exists aankoop_producten_beheerder_all on public.aankoop_producten;

create policy aankoop_producten_authenticated_select
  on public.aankoop_producten
  for select
  to authenticated
  using (actief = true or public.current_gebruiker_is_beheerder());

create policy aankoop_producten_beheerder_all
  on public.aankoop_producten
  for all
  to authenticated
  using (public.current_gebruiker_is_beheerder())
  with check (public.current_gebruiker_is_beheerder());

drop policy if exists aankoop_bestellingen_select_betrokken_of_beheerder on public.aankoop_bestellingen;
drop policy if exists aankoop_bestellingen_insert_eigen_sessie on public.aankoop_bestellingen;
drop policy if exists aankoop_bestellingen_update_beheerder on public.aankoop_bestellingen;

create policy aankoop_bestellingen_select_betrokken_of_beheerder
  on public.aankoop_bestellingen
  for select
  to authenticated
  using (
    public.current_gebruiker_is_beheerder()
    or besteller_id = public.current_gebruiker_id()
    or aangemaakt_door_id = public.current_gebruiker_id()
  );

create policy aankoop_bestellingen_insert_eigen_sessie
  on public.aankoop_bestellingen
  for insert
  to authenticated
  with check (aangemaakt_door_id = public.current_gebruiker_id());

create policy aankoop_bestellingen_update_beheerder
  on public.aankoop_bestellingen
  for update
  to authenticated
  using (public.current_gebruiker_is_beheerder())
  with check (public.current_gebruiker_is_beheerder());

drop policy if exists aankoop_bestelregels_select_betrokken_of_beheerder on public.aankoop_bestelregels;
drop policy if exists aankoop_bestelregels_insert_bij_eigen_bestelling on public.aankoop_bestelregels;
drop policy if exists aankoop_bestelregels_update_beheerder on public.aankoop_bestelregels;

create policy aankoop_bestelregels_select_betrokken_of_beheerder
  on public.aankoop_bestelregels
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.aankoop_bestellingen bestelling
      where bestelling.id = aankoop_bestelregels.bestelling_id
        and (
          public.current_gebruiker_is_beheerder()
          or bestelling.besteller_id = public.current_gebruiker_id()
          or bestelling.aangemaakt_door_id = public.current_gebruiker_id()
        )
    )
  );

create policy aankoop_bestelregels_insert_bij_eigen_bestelling
  on public.aankoop_bestelregels
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.aankoop_bestellingen bestelling
      where bestelling.id = aankoop_bestelregels.bestelling_id
        and bestelling.aangemaakt_door_id = public.current_gebruiker_id()
    )
  );

create policy aankoop_bestelregels_update_beheerder
  on public.aankoop_bestelregels
  for update
  to authenticated
  using (public.current_gebruiker_is_beheerder())
  with check (public.current_gebruiker_is_beheerder());

alter table public.aankoop_printers enable row level security;
alter table public.aankoop_printer_cartridges enable row level security;

drop policy if exists aankoop_printers_authenticated_select on public.aankoop_printers;
drop policy if exists aankoop_printers_beheerder_all on public.aankoop_printers;

create policy aankoop_printers_authenticated_select
  on public.aankoop_printers
  for select
  to authenticated
  using (actief = true or public.current_gebruiker_is_beheerder());

create policy aankoop_printers_beheerder_all
  on public.aankoop_printers
  for all
  to authenticated
  using (public.current_gebruiker_is_beheerder())
  with check (public.current_gebruiker_is_beheerder());

drop policy if exists aankoop_printer_cartridges_authenticated_select on public.aankoop_printer_cartridges;
drop policy if exists aankoop_printer_cartridges_beheerder_all on public.aankoop_printer_cartridges;

create policy aankoop_printer_cartridges_authenticated_select
  on public.aankoop_printer_cartridges
  for select
  to authenticated
  using (actief = true or public.current_gebruiker_is_beheerder());

create policy aankoop_printer_cartridges_beheerder_all
  on public.aankoop_printer_cartridges
  for all
  to authenticated
  using (public.current_gebruiker_is_beheerder())
  with check (public.current_gebruiker_is_beheerder());
