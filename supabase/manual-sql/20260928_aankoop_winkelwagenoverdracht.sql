-- PROFO Aankoopbeheer: begeleide winkelwagencontrole, zonder leverancierssessies.
-- Voer volledig uit na de bestaande rollen- en goedkeuringsflow.
begin;

create or replace function public.aankoop_winkelwagen_bevoegd()
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.gebruikers g where g.actief = true
      and g.auth_user_id = auth.uid()
      and lower(g.email) = lower(auth.jwt()->>'email')
      and lower(g.email) in ('jorn.neeus@profo.be', 'kathleen.nerinckx@profo.be')
  )
$$;
revoke all on function public.aankoop_winkelwagen_bevoegd() from public, anon;
grant execute on function public.aankoop_winkelwagen_bevoegd() to authenticated;

create or replace function public.aankoop_winkelwagen_snapshot(p_bestelling bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare resultaat jsonb;
begin
  if not coalesce(public.aankoop_winkelwagen_bevoegd(), false) then
    raise exception 'Geen bevoegdheid voor verwerking';
  end if;
  select jsonb_build_object('bestelling_id', b.id, 'opmerking', b.opmerkingen, 'lines',
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'product_id', r.product_id, 'product_naam', r.product_naam, 'product_omschrijving', r.product_omschrijving,
      'aantal', r.aantal, 'eenheid', r.eenheid,
      'leverancier', p.leverancier, 'leverancier_url', p.leverancier_url,
      'catalogus_naam', p.naam, 'catalogus_eenheid', p.eenheid
    ) order by r.id) from public.aankoop_bestelregels r
      left join public.aankoop_producten p on p.id = r.product_id
      where r.bestelling_id = b.id), '[]'::jsonb)) into resultaat
    from public.aankoop_bestellingen b
    where b.id = p_bestelling and b.status in ('Goedgekeurd', 'In behandeling');
  if resultaat is null then raise exception 'Bestelling ontbreekt of is niet goedgekeurd'; end if;
  return resultaat;
end $$;

create table if not exists public.aankoop_winkelwagen_overdrachten (
  id uuid primary key default gen_random_uuid(),
  bestelling_id bigint not null references public.aankoop_bestellingen(id),
  created_at timestamptz not null default now(),
  actor_id uuid not null default auth.uid(),
  snapshot jsonb not null default '{}'::jsonb,
  methode text not null default 'begeleid_handmatig' check (methode = 'begeleid_handmatig')
);
create index if not exists aankoop_winkelwagen_bestelling_idx on public.aankoop_winkelwagen_overdrachten(bestelling_id, created_at desc);
create table if not exists public.aankoop_winkelwagen_resultaten (
  id bigint generated always as identity primary key,
  overdracht_id uuid not null references public.aankoop_winkelwagen_overdrachten(id),
  -- Historical identifier: keep audit evidence when an approved line is removed.
  -- The insert trigger validates membership against the immutable snapshot.
  regel_id bigint not null,
  created_at timestamptz not null default now(),
  actor_id uuid not null default auth.uid(),
  resultaat text not null check (resultaat in ('toegevoegd','reeds_aanwezig','aantal_aangepast','onzeker','mislukt')),
  reden text not null check (reden in ('gecontroleerd','niet_gevonden','verpakking','niet_beschikbaar','identificatie','onderbroken','technisch','andere_bestelling')),
  gecontroleerd_aantal integer check (gecontroleerd_aantal >= 0),
  exact_gecontroleerd boolean not null default false,
  check ((resultaat in ('onzeker','mislukt') and reden <> 'gecontroleerd') or
    (resultaat in ('toegevoegd','reeds_aanwezig','aantal_aangepast') and reden = 'gecontroleerd' and exact_gecontroleerd and gecontroleerd_aantal is not null))
);
create index if not exists aankoop_winkelwagen_resultaat_idx on public.aankoop_winkelwagen_resultaten(overdracht_id, id);
create index if not exists aankoop_winkelwagen_regel_idx on public.aankoop_winkelwagen_resultaten(regel_id);

alter table public.aankoop_winkelwagen_overdrachten enable row level security;
alter table public.aankoop_winkelwagen_resultaten enable row level security;
revoke all on public.aankoop_winkelwagen_overdrachten, public.aankoop_winkelwagen_resultaten from public, anon, authenticated;
grant select, insert on public.aankoop_winkelwagen_overdrachten, public.aankoop_winkelwagen_resultaten to authenticated;
grant usage on sequence public.aankoop_winkelwagen_resultaten_id_seq to authenticated;
drop policy if exists winkelwagen_lezen on public.aankoop_winkelwagen_overdrachten;
create policy winkelwagen_lezen on public.aankoop_winkelwagen_overdrachten for select to authenticated using ((select public.aankoop_winkelwagen_bevoegd()));
drop policy if exists winkelwagen_starten on public.aankoop_winkelwagen_overdrachten;
create policy winkelwagen_starten on public.aankoop_winkelwagen_overdrachten for insert to authenticated with check ((select public.aankoop_winkelwagen_bevoegd()) and actor_id = (select auth.uid()));
drop policy if exists winkelwagen_resultaten_lezen on public.aankoop_winkelwagen_resultaten;
create policy winkelwagen_resultaten_lezen on public.aankoop_winkelwagen_resultaten for select to authenticated using ((select public.aankoop_winkelwagen_bevoegd()));
drop policy if exists winkelwagen_resultaten_schrijven on public.aankoop_winkelwagen_resultaten;
create policy winkelwagen_resultaten_schrijven on public.aankoop_winkelwagen_resultaten for insert to authenticated with check ((select public.aankoop_winkelwagen_bevoegd()) and actor_id = (select auth.uid()));

create or replace function public.aankoop_winkelwagen_bewaak()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare overdracht public.aankoop_winkelwagen_overdrachten; regel jsonb;
begin
  if not coalesce(public.aankoop_winkelwagen_bevoegd(), false) then raise exception 'Geen bevoegdheid'; end if;
  new.actor_id := auth.uid();
  new.created_at := clock_timestamp();
  if tg_table_name = 'aankoop_winkelwagen_overdrachten' then
    perform 1 from public.aankoop_bestellingen where id = new.bestelling_id for update;
    new.snapshot := public.aankoop_winkelwagen_snapshot(new.bestelling_id);
  else
    select * into strict overdracht from public.aankoop_winkelwagen_overdrachten where id = new.overdracht_id;
    perform 1 from public.aankoop_bestellingen where id = overdracht.bestelling_id for update;
    if overdracht.snapshot <> public.aankoop_winkelwagen_snapshot(overdracht.bestelling_id) then raise exception 'Bestelling of catalogus gewijzigd: open een nieuw overzicht'; end if;
    select value into regel from jsonb_array_elements(overdracht.snapshot->'lines') where (value->>'id')::bigint = new.regel_id;
    if regel is null then raise exception 'Regel hoort niet bij deze overdracht'; end if;
    if new.resultaat in ('toegevoegd','reeds_aanwezig','aantal_aangepast') and
      (new.gecontroleerd_aantal is distinct from (regel->>'aantal')::integer or not new.exact_gecontroleerd) then
      raise exception 'Exact product en gewenst aantal moeten gecontroleerd zijn';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists aankoop_winkelwagen_bewaak on public.aankoop_winkelwagen_overdrachten;
create trigger aankoop_winkelwagen_bewaak before insert on public.aankoop_winkelwagen_overdrachten for each row execute function public.aankoop_winkelwagen_bewaak();
drop trigger if exists aankoop_winkelwagen_bewaak on public.aankoop_winkelwagen_resultaten;
create trigger aankoop_winkelwagen_bewaak before insert on public.aankoop_winkelwagen_resultaten for each row execute function public.aankoop_winkelwagen_bewaak();

create or replace function public.aankoop_winkelwagen_start(p_bestelling bigint, p_verwacht jsonb)
returns public.aankoop_winkelwagen_overdrachten language plpgsql security invoker set search_path = '' as $$
declare huidige jsonb; overdracht public.aankoop_winkelwagen_overdrachten;
begin
  if not coalesce(public.aankoop_winkelwagen_bevoegd(), false) then raise exception 'Geen bevoegdheid'; end if;
  perform 1 from public.aankoop_bestellingen where id = p_bestelling for update;
  huidige := public.aankoop_winkelwagen_snapshot(p_bestelling);
  if p_verwacht is distinct from huidige then raise exception 'Voorbeeld verouderd: open het overzicht opnieuw'; end if;
  select * into overdracht from public.aankoop_winkelwagen_overdrachten where bestelling_id = p_bestelling order by created_at desc limit 1;
  if overdracht.id is null or overdracht.snapshot <> huidige then
    insert into public.aankoop_winkelwagen_overdrachten(bestelling_id) values (p_bestelling) returning * into overdracht;
  end if;
  return overdracht;
end $$;
revoke all on function public.aankoop_winkelwagen_snapshot(bigint), public.aankoop_winkelwagen_start(bigint,jsonb), public.aankoop_winkelwagen_bewaak() from public, anon;
grant execute on function public.aankoop_winkelwagen_snapshot(bigint), public.aankoop_winkelwagen_start(bigint,jsonb) to authenticated;
commit;
