-- Beheer van bestelregels vóór de bestelling bij een leverancier is geplaatst.
-- Regel, totalen en historiek worden atomair opgeslagen met bestaande RLS-rechten.
begin;

create table if not exists public.aankoop_bestelregel_wijzigingen (
  id uuid primary key,
  bestelling_id bigint not null references public.aankoop_bestellingen(id),
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  actie text not null check (actie in ('toevoegen', 'verwijderen')),
  regel jsonb not null,
  totaal_voor numeric(12,2) not null,
  totaal_na numeric(12,2) not null
);
create index if not exists aankoop_bestelregel_wijzigingen_bestelling_idx
  on public.aankoop_bestelregel_wijzigingen(bestelling_id, created_at);
alter table public.aankoop_bestelregel_wijzigingen enable row level security;
revoke all on public.aankoop_bestelregel_wijzigingen from anon, authenticated;
grant select, insert on public.aankoop_bestelregel_wijzigingen to authenticated;
drop policy if exists bestelregel_wijzigingen_select on public.aankoop_bestelregel_wijzigingen;
create policy bestelregel_wijzigingen_select on public.aankoop_bestelregel_wijzigingen
  for select to authenticated using ((select public.current_gebruiker_is_beheerder()));
drop policy if exists bestelregel_wijzigingen_insert on public.aankoop_bestelregel_wijzigingen;
create policy bestelregel_wijzigingen_insert on public.aankoop_bestelregel_wijzigingen
  for insert to authenticated with check (
    (select public.current_gebruiker_is_beheerder()) and actor_id = (select auth.uid())
  );

-- Alleen beheerders mogen regels van nog niet extern geplaatste bestellingen verwijderen.
drop policy if exists aankoop_bestelregels_delete_beheerder on public.aankoop_bestelregels;
create policy aankoop_bestelregels_delete_beheerder on public.aankoop_bestelregels
  for delete to authenticated using (
    (select public.current_gebruiker_is_beheerder())
    and exists (
      select 1 from public.aankoop_bestellingen b where b.id = bestelling_id
      and b.status in ('Concept','Nieuw','Ingediend','Ter goedkeuring',
        'Extra informatie gevraagd','In behandeling','In verwerking','Goedgekeurd')
      and coalesce(b.opmerkingen, '') !~* '(^|\n)Besteld op:'
    )
  );
grant delete on public.aankoop_bestelregels to authenticated;

create or replace function public.aankoop_bestelregel_wijzigen(
  p_bestelling_id bigint,
  p_updated_at timestamptz,
  p_request_id uuid,
  p_actie text,
  p_product_id bigint default null,
  p_aantal integer default null,
  p_regel_id bigint default null
) returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
  b public.aankoop_bestellingen%rowtype;
  p public.aankoop_producten%rowtype;
  r public.aankoop_bestelregels%rowtype;
  wijziging public.aankoop_bestelregel_wijzigingen%rowtype;
  voor numeric;
  incl numeric;
  excl numeric;
begin
  if auth.uid() is null or public.current_gebruiker_is_beheerder() is distinct from true then
    raise exception 'Alleen aankoopbeheer mag bestelregels aanpassen.' using errcode = '42501';
  end if;
  if p_request_id is null then raise exception 'Wijzigingskenmerk ontbreekt.'; end if;
  select * into b from public.aankoop_bestellingen where id = p_bestelling_id for update;
  if not found then raise exception 'Bestelling niet gevonden of geen toegang.'; end if;

  -- Herhalen na een netwerkonderbreking mag geen tweede regel opleveren.
  select * into wijziging from public.aankoop_bestelregel_wijzigingen where id = p_request_id;
  if found then
    if wijziging.bestelling_id <> b.id or wijziging.actor_id <> auth.uid() then
      raise exception 'Wijzigingskenmerk is al gebruikt.';
    end if;
  else
    if p_updated_at is null or b.updated_at is distinct from p_updated_at then
      raise exception 'Deze bestelling is intussen gewijzigd. Vernieuw het overzicht en probeer opnieuw.' using errcode = '40001';
    end if;
    if b.status not in ('Concept','Nieuw','Ingediend','Ter goedkeuring',
        'Extra informatie gevraagd','In behandeling','In verwerking','Goedgekeurd')
       or coalesce(b.opmerkingen, '') ~* '(^|\n)Besteld op:' then
      raise exception 'Alleen bestellingen die nog niet bij een leverancier zijn geplaatst kunnen worden aangepast.';
    end if;
    voor := b.totaal_incl_btw;
    if p_actie = 'toevoegen' then
      if p_aantal is null or p_aantal < 1 or p_aantal > 10000 then
        raise exception 'Kies een geheel aantal tussen 1 en 10000.';
      end if;
      select * into p from public.aankoop_producten where id = p_product_id for share;
      if not found or p.actief is distinct from true or coalesce(btrim(p.naam), '') = ''
         or coalesce(btrim(p.omschrijving), '') = '' or coalesce(btrim(p.eenheid), '') = ''
         or p.naam ~* '(nog te bepalen|ander product)'
         or p.prijs_excl_btw < 0
         or (p.prijs_excl_btw = 0 and p.categorie <> 'Veiligheid/EHBO')
         or p.btw_percentage < 0 or p.btw_percentage > 100 then
        raise exception 'Dit product is niet bestelbaar. Controleer de catalogus.';
      end if;
      if p_aantal % p.minimum_bestelhoeveelheid <> 0 then
        raise exception 'Het aantal moet een veelvoud zijn van de bestelstap (%).', p.minimum_bestelhoeveelheid;
      end if;
      incl := round(p.prijs_excl_btw * p_aantal, 2);
      excl := round(incl / (1 + p.btw_percentage / 100), 2);
      insert into public.aankoop_bestelregels (
        bestelling_id, product_id, product_naam, product_omschrijving, aantal, eenheid,
        eenheidsprijs_excl_btw, btw_percentage, lijn_totaal_excl_btw, lijn_totaal_btw, lijn_totaal_incl_btw
      ) values (b.id, p.id, p.naam, p.omschrijving, p_aantal, p.eenheid,
        round(p.prijs_excl_btw / (1 + p.btw_percentage / 100), 2), p.btw_percentage,
        excl, incl - excl, incl) returning * into r;
    elsif p_actie = 'verwijderen' then
      if (select count(*) from public.aankoop_bestelregels where bestelling_id = b.id) <= 1 then
        raise exception 'Behoud minstens één bestelregel. Voeg eerst een vervangend product toe.';
      end if;
      delete from public.aankoop_bestelregels where id = p_regel_id and bestelling_id = b.id returning * into r;
      if not found then raise exception 'Bestelregel niet gevonden of niet verwijderbaar.'; end if;
    else
      raise exception 'Ongeldige bewerking.';
    end if;

    update public.aankoop_bestellingen
    set totaal_excl_btw = t.excl, totaal_btw = t.btw, totaal_incl_btw = t.incl,
        updated_at = clock_timestamp()
    from (select coalesce(sum(lijn_totaal_excl_btw),0) excl,
      coalesce(sum(lijn_totaal_btw),0) btw, coalesce(sum(lijn_totaal_incl_btw),0) incl
      from public.aankoop_bestelregels where bestelling_id = b.id) t
    where id = b.id returning public.aankoop_bestellingen.* into b;
    if not found then raise exception 'Totalen konden niet worden opgeslagen.'; end if;

    insert into public.aankoop_bestelregel_wijzigingen
      (id, bestelling_id, actor_id, actie, regel, totaal_voor, totaal_na)
    values (p_request_id, b.id, auth.uid(), p_actie, to_jsonb(r), voor, b.totaal_incl_btw);
  end if;
  return to_jsonb(b) || jsonb_build_object('regels', (
    select coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)
    from public.aankoop_bestelregels l where l.bestelling_id = b.id
  ));
end;
$$;
revoke all on function public.aankoop_bestelregel_wijzigen(bigint,timestamptz,uuid,text,bigint,integer,bigint) from public, anon;
grant execute on function public.aankoop_bestelregel_wijzigen(bigint,timestamptz,uuid,text,bigint,integer,bigint) to authenticated;
commit;

