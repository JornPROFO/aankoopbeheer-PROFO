-- PROFO Aankoopbeheer - geregistreerde Supabase-accounts koppelen aan gebruikers
-- Doel:
-- 1. bestaande gebruikers in public.gebruikers koppelen aan hun Supabase Auth-account;
-- 2. nieuw geregistreerde @profo.be-accounts toevoegen als gewone gebruiker;
-- 3. Jorn en Kathleen expliciet als beheerder behouden.
--
-- Dit script bevestigt geen e-mailadressen in Supabase Auth. Als Supabase zegt
-- "Email not confirmed", bevestig de gebruiker dan eerst in Authentication > Users.

with auth_profo as (
  select
    auth_user.id as auth_user_id,
    lower(auth_user.email) as email,
    coalesce(
      nullif(trim(auth_user.raw_user_meta_data->>'full_name'), ''),
      split_part(auth_user.email, '@', 1)
    ) as naam,
    auth_user.email_confirmed_at
  from auth.users auth_user
  where auth_user.email is not null
    and lower(auth_user.email) like '%@profo.be'
),
bestaand_gekoppeld as (
  update public.gebruikers gebruiker
  set
    auth_user_id = auth_profo.auth_user_id,
    updated_at = now()
  from auth_profo
  where lower(gebruiker.email) = auth_profo.email
    and gebruiker.auth_user_id is distinct from auth_profo.auth_user_id
  returning
    'bestaande gebruiker gekoppeld'::text as actie,
    gebruiker.naam,
    gebruiker.email,
    gebruiker.rol,
    gebruiker.actief,
    auth_profo.email_confirmed_at
),
nieuw_toegevoegd as (
  insert into public.gebruikers (
    auth_user_id,
    naam,
    email,
    functie,
    rol,
    actief
  )
  select
    auth_profo.auth_user_id,
    auth_profo.naam,
    auth_profo.email,
    'Aankoopbeheer',
    'Gebruiker',
    true
  from auth_profo
  where not exists (
    select 1
    from public.gebruikers gebruiker
    where lower(gebruiker.email) = auth_profo.email
  )
  returning
    'nieuwe gebruiker toegevoegd'::text as actie,
    naam,
    email,
    rol,
    actief,
    null::timestamp with time zone as email_confirmed_at
),
beheerders_ingesteld as (
  update public.gebruikers gebruiker
  set
    rol = 'Beheerder',
    actief = true,
    updated_at = now()
  where lower(gebruiker.email) in (
    'jorn.neeus@profo.be',
    'kathleen.nerinckx@profo.be'
  )
  returning
    'beheerder bevestigd'::text as actie,
    gebruiker.naam,
    gebruiker.email,
    gebruiker.rol,
    gebruiker.actief,
    (
      select auth_user.email_confirmed_at
      from auth.users auth_user
      where lower(auth_user.email) = lower(gebruiker.email)
      limit 1
    ) as email_confirmed_at
)
select *
from bestaand_gekoppeld
union all
select *
from nieuw_toegevoegd
union all
select *
from beheerders_ingesteld
order by actie, email;

-- Controlelijst na uitvoering.
-- Accounts zonder email_confirmed_at kunnen nog niet aanmelden wanneer
-- e-mailbevestiging in Supabase Auth verplicht staat.
select
  gebruiker.naam,
  gebruiker.email,
  gebruiker.rol,
  gebruiker.actief,
  gebruiker.auth_user_id is not null as gekoppeld_aan_auth,
  auth_user.email_confirmed_at
from public.gebruikers gebruiker
left join auth.users auth_user
  on auth_user.id = gebruiker.auth_user_id
where lower(gebruiker.email) like '%@profo.be'
order by gebruiker.rol desc, gebruiker.naam;
