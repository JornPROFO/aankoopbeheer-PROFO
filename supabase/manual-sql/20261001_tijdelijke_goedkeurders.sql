-- Operationele gegevenswijziging op verzoek van Jorn, 1 oktober 2026.
-- Geen wijziging aan orders, gebruikersaccounts, rollen of RLS.
begin;
lock table public.aankoop_goedkeurder_scopes in share row exclusive mode;
do $$
begin
  if (select count(*) from public.gebruikers where actief and rol='Regiodirecteur'
      and (id,email) in ((5,'nathan.blondeel@profo.be'),(64,'annelies.vuye@profo.be'),(33,'karima.lakdim@profo.be'))) <> 3 then
    raise exception 'Goedkeurders komen niet overeen met de gecontroleerde configuratie.';
  end if;
  if (select count(*) from public.locaties where actief and (id,naam) in ((13,'Merksem'),(6,'Heist Op Den Berg'),(12,'Mechelen'))) <> 3 then
    raise exception 'Locaties komen niet overeen met de gecontroleerde configuratie.';
  end if;
  if exists(select 1 from public.aankoop_goedkeurder_scopes where goedkeurder_id=5 and actief and id not between 6 and 23) then
    raise exception 'Nathan heeft bijkomende scopes: eerst opnieuw controleren.';
  end if;
end $$;
-- Bewaar de oorspronkelijke teamkoppelingen inactief voor gerichte terugkeer.
update public.aankoop_goedkeurder_scopes set actief=false,updated_at=now()
where goedkeurder_id=5 and id between 6 and 23 and scope_type='teamlid' and actief;

insert into public.aankoop_goedkeurder_scopes(goedkeurder_id,scope_type,locatie_id,actief)
select v.goedkeurder_id,'locatie',v.locatie_id,true
from (values(64::bigint,13::bigint),(33,6),(33,12)) v(goedkeurder_id,locatie_id)
where not exists(select 1 from public.aankoop_goedkeurder_scopes s
  where s.goedkeurder_id=v.goedkeurder_id and s.scope_type='locatie' and s.locatie_id=v.locatie_id);

update public.aankoop_goedkeurder_scopes s set actief=true,updated_at=now()
from (values(64::bigint,13::bigint),(33,6),(33,12)) v(goedkeurder_id,locatie_id)
where s.goedkeurder_id=v.goedkeurder_id and s.scope_type='locatie' and s.locatie_id=v.locatie_id and not s.actief;

do $$
begin
  if exists(select 1 from public.aankoop_goedkeurder_scopes where goedkeurder_id=5 and actief) then
    raise exception 'Er is nog een actieve goedkeuringsroute naar Nathan.';
  end if;
  if (select count(*) from public.aankoop_goedkeurder_scopes where actief and scope_type='locatie'
    and (goedkeurder_id,locatie_id) in ((64,13),(33,6),(33,12))) <> 3 then
    raise exception 'Tijdelijke locatiekoppelingen zijn niet volledig.';
  end if;
end $$;
commit;

select s.id,l.naam as locatie,g.naam as goedkeurder,s.actief
from public.aankoop_goedkeurder_scopes s join public.gebruikers g on g.id=s.goedkeurder_id
join public.locaties l on l.id=s.locatie_id
where s.scope_type='locatie' and (s.goedkeurder_id,s.locatie_id) in ((64,13),(33,6),(33,12))
order by l.naam;
