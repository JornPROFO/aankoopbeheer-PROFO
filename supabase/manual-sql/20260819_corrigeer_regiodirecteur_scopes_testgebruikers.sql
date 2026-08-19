-- PROFO Aankoopbeheer - goedkeuringsflow corrigeren.
-- Timothy is algemeen directeur en wordt niet organisatiebreed belast met aankoopgoedkeuringen.
-- De huidige testgebruikers worden gekoppeld aan regiodirecteur Karima Lakdim.

begin;

update public.aankoop_goedkeurder_scopes scope
set actief = false,
    updated_at = now()
from public.gebruikers goedkeurder
where goedkeurder.id = scope.goedkeurder_id
  and (
    lower(goedkeurder.email) = 'timothy.vanraemdonck@profo.be'
    or lower(goedkeurder.naam) in ('timothy van raemdonck', 'timothy vanraemdonck')
  );

create or replace function public.current_gebruiker_is_goedkeurder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_gebruiker_rol(), '') in (
    'Goedkeurder aankoop',
    'Regiodirecteur',
    'Beheerder aankoop',
    'Superadmin'
  );
$$;

revoke all on function public.current_gebruiker_is_goedkeurder() from public;
revoke all on function public.current_gebruiker_is_goedkeurder() from anon;
grant execute on function public.current_gebruiker_is_goedkeurder() to authenticated;

with koppelingen (goedkeurder_email, teamlid_email) as (
  values
    ('karima.lakdim@profo.be', 'kim.dupont@profo.be'),
    ('karima.lakdim@profo.be', 'michelle.heussen@profo.be')
)
insert into public.aankoop_goedkeurder_scopes (
  goedkeurder_id,
  scope_type,
  teamlid_id,
  actief
)
select goedkeurder.id, 'teamlid', teamlid.id, true
from koppelingen koppeling
join public.gebruikers goedkeurder on lower(goedkeurder.email) = koppeling.goedkeurder_email
join public.gebruikers teamlid on lower(teamlid.email) = koppeling.teamlid_email
where goedkeurder.actief = true
  and teamlid.actief = true
on conflict do nothing;

with koppelingen (goedkeurder_email, teamlid_email) as (
  values
    ('karima.lakdim@profo.be', 'kim.dupont@profo.be'),
    ('karima.lakdim@profo.be', 'michelle.heussen@profo.be')
)
update public.aankoop_goedkeurder_scopes scope
set actief = true,
    updated_at = now()
from koppelingen koppeling
join public.gebruikers goedkeurder on lower(goedkeurder.email) = koppeling.goedkeurder_email
join public.gebruikers teamlid on lower(teamlid.email) = koppeling.teamlid_email
where scope.goedkeurder_id = goedkeurder.id
  and scope.scope_type = 'teamlid'
  and scope.teamlid_id = teamlid.id;

create or replace function public.aankoop_meld_regiodirecteur(p_bestelling_id bigint)
returns setof bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  bestelling public.aankoop_bestellingen%rowtype;
  goedkeurder_id bigint;
  melding_id bigint;
begin
  select * into bestelling
  from public.aankoop_bestellingen
  where id = p_bestelling_id;

  if bestelling.id is null then
    raise exception 'Bestelling niet gevonden.';
  end if;

  if not (
    public.current_gebruiker_is_beheerder()
    or bestelling.besteller_id = public.current_gebruiker_id()
    or bestelling.aangemaakt_door_id = public.current_gebruiker_id()
  ) then
    raise exception 'Geen toegang tot deze bestelling.';
  end if;

  for goedkeurder_id in
    select distinct goedkeurder.id
    from public.aankoop_goedkeurder_scopes scope
    join public.gebruikers goedkeurder on goedkeurder.id = scope.goedkeurder_id
    where scope.actief = true
      and goedkeurder.actief = true
      and lower(coalesce(goedkeurder.rol, '')) = 'regiodirecteur'
      and (
        (scope.scope_type = 'teamlid' and scope.teamlid_id in (bestelling.besteller_id, bestelling.aangemaakt_door_id))
        or (scope.scope_type = 'locatie' and scope.locatie_id = bestelling.locatie_id)
      )
  loop
    melding_id := public.aankoop_melding_toevoegen(
      goedkeurder_id,
      bestelling.id,
      'bestelling_ingediend',
      'Nieuwe bestelling ter goedkeuring',
      'Bestelling ' || bestelling.id || ' voor ' || coalesce(bestelling.locatie_naam, 'een locatie') || ' staat klaar in Aankoopbeheer.',
      '#bestellingen'
    );

    if melding_id is not null then
      return next melding_id;
    end if;
  end loop;

  return;
end;
$$;

revoke all on function public.aankoop_meld_regiodirecteur(bigint) from public;
revoke all on function public.aankoop_meld_regiodirecteur(bigint) from anon;
grant execute on function public.aankoop_meld_regiodirecteur(bigint) to authenticated;

commit;

select
  goedkeurder.naam as regiodirecteur,
  teamlid.naam as teamlid,
  scope.actief
from public.aankoop_goedkeurder_scopes scope
join public.gebruikers goedkeurder on goedkeurder.id = scope.goedkeurder_id
left join public.gebruikers teamlid on teamlid.id = scope.teamlid_id
where lower(goedkeurder.email) in (
  'timothy.vanraemdonck@profo.be',
  'karima.lakdim@profo.be'
)
order by goedkeurder.naam, teamlid.naam;
