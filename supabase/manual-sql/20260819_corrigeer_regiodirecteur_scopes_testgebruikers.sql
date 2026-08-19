-- PROFO Aankoopbeheer - goedkeuringsflow corrigeren.
-- Timothy is algemeen directeur en wordt niet organisatiebreed belast met aankoopgoedkeuringen.
-- Alle regionale medewerkers worden op basis van de actuele PROFO-contactenlijst
-- gekoppeld aan de directeur die op hun regionale tabblad vermeld staat.

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
  select
    coalesce(public.current_gebruiker_rol(), '') in (
      'Goedkeurder aankoop',
      'Regiodirecteur',
      'Beheerder aankoop',
      'Superadmin'
    )
    or exists (
      select 1
      from public.aankoop_goedkeurder_scopes scope
      where scope.goedkeurder_id = public.current_gebruiker_id()
        and scope.actief = true
    );
$$;

revoke all on function public.current_gebruiker_is_goedkeurder() from public;
revoke all on function public.current_gebruiker_is_goedkeurder() from anon;
grant execute on function public.current_gebruiker_is_goedkeurder() to authenticated;

update public.gebruikers
set rol = 'Regiodirecteur',
    updated_at = now()
where lower(email) in (
  'nathan.blondeel@profo.be',
  'karima.lakdim@profo.be',
  'annelies.vuye@profo.be',
  'joke.delille@profo.be'
)
  and actief = true;

create temporary table aankoop_regio_koppelingen (
  goedkeurder_email text not null,
  teamlid_email text not null,
  primary key (goedkeurder_email, teamlid_email)
) on commit drop;

insert into aankoop_regio_koppelingen (goedkeurder_email, teamlid_email)
  values
    ('timothy.vanraemdonck@profo.be', 'sam.bruynooghe@profo.be'),
    ('timothy.vanraemdonck@profo.be', 'jorn.neeus@profo.be'),
    ('timothy.vanraemdonck@profo.be', 'kathleen.nerinckx@profo.be'),
    ('timothy.vanraemdonck@profo.be', 'nele.tkindt@profo.be'),
    ('nathan.blondeel@profo.be', 'thibo.bleys@profo.be'),
    ('nathan.blondeel@profo.be', 'sky.buggenhout@profo.be'),
    ('nathan.blondeel@profo.be', 'gitte.hellemans@profo.be'),
    ('nathan.blondeel@profo.be', 'sara.an.greefs@profo.be'),
    ('nathan.blondeel@profo.be', 'nima.rasoolzadeh@profo.be'),
    ('nathan.blondeel@profo.be', 'mehtap.uysal@profo.be'),
    ('nathan.blondeel@profo.be', 'wout.vangeel@profo.be'),
    ('nathan.blondeel@profo.be', 'laura.verbruggen@profo.be'),
    ('nathan.blondeel@profo.be', 'zeb.marichal@profo.be'),
    ('nathan.blondeel@profo.be', 'yoshi.vanostaede@profo.be'),
    ('nathan.blondeel@profo.be', 'seppe.huysmans@profo.be'),
    ('nathan.blondeel@profo.be', 'femke.vangestel@profo.be'),
    ('nathan.blondeel@profo.be', 'glen.vandeneynde@profo.be'),
    ('nathan.blondeel@profo.be', 'tino.crabbe@profo.be'),
    ('nathan.blondeel@profo.be', 'joke.jannes@profo.be'),
    ('nathan.blondeel@profo.be', 'fleur.stroobants@profo.be'),
    ('nathan.blondeel@profo.be', 'jade.bloemen@profo.be'),
    ('nathan.blondeel@profo.be', 'britt.soebert@profo.be'),
    ('nathan.blondeel@profo.be', 'britt.vanimmerseel@profo.be'),
    ('karima.lakdim@profo.be', 'mathijs.cremers@profo.be'),
    ('karima.lakdim@profo.be', 'dirk.denridder@profo.be'),
    ('karima.lakdim@profo.be', 'margareth.vandervelden@profo.be'),
    ('karima.lakdim@profo.be', 'kim.dupont@profo.be'),
    ('karima.lakdim@profo.be', 'michelle.heussen@profo.be'),
    ('karima.lakdim@profo.be', 'veronique.salden@profo.be'),
    ('karima.lakdim@profo.be', 'deborah.codorniu.agua@profo.be'),
    ('karima.lakdim@profo.be', 'nawal.naime@profo.be'),
    ('karima.lakdim@profo.be', 'sabrina.vandenbrink@profo.be'),
    ('karima.lakdim@profo.be', 'johannes.crommen@profo.be'),
    ('karima.lakdim@profo.be', 'bavo.nys@profo.be'),
    ('karima.lakdim@profo.be', 'tom.heiremans@profo.be'),
    ('karima.lakdim@profo.be', 'astrid.verwimp@profo.be'),
    ('karima.lakdim@profo.be', 'karl.ferlin@profo.be'),
    ('karima.lakdim@profo.be', 'bert.giesbers@profo.be'),
    ('annelies.vuye@profo.be', 'lowie.cloet@profo.be'),
    ('annelies.vuye@profo.be', 'brecht.valepijn@profo.be'),
    ('annelies.vuye@profo.be', 'david.denoulet@profo.be'),
    ('annelies.vuye@profo.be', 'sarah.declippeleir@profo.be'),
    ('annelies.vuye@profo.be', 'vicky.dewilde@profo.be'),
    ('annelies.vuye@profo.be', 'faith.dhaen@profo.be'),
    ('annelies.vuye@profo.be', 'ismail.chaouki@profo.be'),
    ('annelies.vuye@profo.be', 'stela.cardaku@profo.be'),
    ('joke.delille@profo.be', 'kurt.debruyne@profo.be'),
    ('joke.delille@profo.be', 'simon.viaene@profo.be'),
    ('joke.delille@profo.be', 'wendy.degraeuwe@profo.be'),
    ('joke.delille@profo.be', 'ellen.vandevelde@profo.be'),
    ('joke.delille@profo.be', 'femke.vanneste@profo.be'),
    ('joke.delille@profo.be', 'jamie.decruw@profo.be');

insert into public.aankoop_goedkeurder_scopes (
  goedkeurder_id,
  scope_type,
  teamlid_id,
  actief
)
select goedkeurder.id, 'teamlid', teamlid.id, true
from aankoop_regio_koppelingen koppeling
join public.gebruikers goedkeurder on lower(goedkeurder.email) = koppeling.goedkeurder_email
join public.gebruikers teamlid on lower(teamlid.email) = koppeling.teamlid_email
where goedkeurder.actief = true
  and teamlid.actief = true
on conflict do nothing;

update public.aankoop_goedkeurder_scopes scope
set actief = true,
    updated_at = now()
from aankoop_regio_koppelingen koppeling
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
      and (
        lower(coalesce(goedkeurder.rol, '')) = 'regiodirecteur'
        or lower(goedkeurder.email) = 'timothy.vanraemdonck@profo.be'
      )
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
  'nathan.blondeel@profo.be',
  'karima.lakdim@profo.be',
  'annelies.vuye@profo.be',
  'joke.delille@profo.be'
)
order by goedkeurder.naam, teamlid.naam;
