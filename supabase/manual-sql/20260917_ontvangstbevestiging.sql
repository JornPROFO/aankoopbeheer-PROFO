begin;

create table if not exists public.aankoop_ontvangstverzoeken (
  bestelling_id bigint primary key references public.aankoop_bestellingen(id),
  id uuid not null unique default gen_random_uuid(),
  gevraagd_op timestamptz not null default now(),
  gevraagd_door bigint not null references public.gebruikers(id),
  mail_verzonden_op timestamptz,
  mail_id text
);
create table if not exists public.aankoop_ontvangstbevestigingen (
  id uuid primary key,
  bestelling_id bigint not null references public.aankoop_bestellingen(id),
  besteller_id bigint not null references public.gebruikers(id),
  created_at timestamptz not null default now(),
  volledig boolean not null,
  aantallen jsonb not null,
  opmerking text not null default '' check (length(opmerking) <= 1000)
);
create index if not exists aankoop_ontvangst_bestelling_idx
  on public.aankoop_ontvangstbevestigingen(bestelling_id, created_at desc);
alter table public.aankoop_ontvangstverzoeken enable row level security;
alter table public.aankoop_ontvangstbevestigingen enable row level security;
revoke all on public.aankoop_ontvangstverzoeken, public.aankoop_ontvangstbevestigingen from anon, authenticated;
grant select on public.aankoop_ontvangstverzoeken, public.aankoop_ontvangstbevestigingen to authenticated;
grant all on public.aankoop_ontvangstverzoeken, public.aankoop_ontvangstbevestigingen to service_role;
drop policy if exists ontvangstverzoeken_lezen on public.aankoop_ontvangstverzoeken;
create policy ontvangstverzoeken_lezen on public.aankoop_ontvangstverzoeken for select to authenticated
  using (exists (select 1 from public.aankoop_bestellingen b where b.id = bestelling_id));
drop policy if exists ontvangstbevestigingen_lezen on public.aankoop_ontvangstbevestigingen;
create policy ontvangstbevestigingen_lezen on public.aankoop_ontvangstbevestigingen for select to authenticated
  using (exists (select 1 from public.aankoop_bestellingen b where b.id = bestelling_id));

-- Alleen de Edge Function mag schrijven. Zij valideert het JWT; deze transactie
-- controleert vervolgens de actieve actor, eigenaarschap, status en versie.
create or replace function public.aankoop_ontvangst_verwerken(
  p_bestelling_id bigint, p_actor_id bigint, p_actie text,
  p_request_id uuid, p_updated_at timestamptz default null,
  p_aantallen jsonb default null, p_opmerking text default ''
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  b public.aankoop_bestellingen%rowtype;
  u public.gebruikers%rowtype;
  r public.aankoop_bestelregels%rowtype;
  v public.aankoop_ontvangstverzoeken%rowtype;
  vorige public.aankoop_ontvangstbevestigingen%rowtype;
  herhaling public.aankoop_ontvangstbevestigingen%rowtype;
  n numeric;
  volledig boolean := true;
  totaal numeric := 0;
  aantal_regels integer := 0;
  melding text;
begin
  select * into u from public.gebruikers where id=p_actor_id and actief;
  if not found then raise exception 'Actieve gebruiker vereist.' using errcode='42501'; end if;
  select * into b from public.aankoop_bestellingen where id=p_bestelling_id for update;
  if not found then raise exception 'Bestelling niet gevonden.'; end if;
  if p_actie='vragen' then
    if coalesce(lower(trim(u.rol)),'') not in ('beheerder aankoop','superadmin') then
      raise exception 'Alleen aankoopbeheer kan een ontvangstbevestiging vragen.' using errcode='42501';
    end if;
    if b.status not in ('Besteld','Besteld bij leverancier','Gedeeltelijk geleverd') then
      raise exception 'Deze bestelling staat niet open voor ontvangstbevestiging.';
    end if;
    insert into public.aankoop_ontvangstverzoeken(bestelling_id,gevraagd_door)
      values(b.id,u.id) on conflict (bestelling_id) do nothing returning * into v;
    if found then
      insert into public.aankoop_meldingen(gebruiker_id,bestelling_id,type,titel,boodschap,actie_url)
        values(b.besteller_id,b.id,'ontvangst_gevraagd','Bevestig de ontvangst',
          'Zijn de spullen van bestelling '||b.id||' geleverd? Bevestig de volledige of gedeeltelijke ontvangst.',
          '#bestellingen?ontvangst='||b.id);
    else
      select * into v from public.aankoop_ontvangstverzoeken where bestelling_id=b.id;
    end if;
    return to_jsonb(v);
  end if;
  if p_actie is distinct from 'bevestigen' then raise exception 'Onbekende actie.'; end if;
  if u.id is distinct from b.besteller_id then
    raise exception 'Alleen de besteller kan de ontvangst bevestigen.' using errcode='42501';
  end if;
  if p_request_id is null then raise exception 'Bevestigingskenmerk ontbreekt.'; end if;
  select * into herhaling from public.aankoop_ontvangstbevestigingen where id=p_request_id;
  if found then
    if herhaling.bestelling_id<>b.id or herhaling.besteller_id<>u.id then raise exception 'Kenmerk al gebruikt.'; end if;
    return to_jsonb(herhaling);
  end if;
  if b.status not in ('Besteld','Besteld bij leverancier','Gedeeltelijk geleverd') then
    raise exception 'Deze bestelling kan niet meer bevestigd worden.';
  end if;
  if p_updated_at is null or p_updated_at is distinct from b.updated_at then
    raise exception 'De bestelling is intussen gewijzigd. Vernieuw het overzicht.' using errcode='40001';
  end if;
  if jsonb_typeof(p_aantallen) is distinct from 'object' or length(coalesce(p_opmerking,''))>1000 then
    raise exception 'Ongeldige ontvangstgegevens.';
  end if;
  select * into vorige from public.aankoop_ontvangstbevestigingen
    where bestelling_id=b.id order by created_at desc limit 1;
  for r in select * from public.aankoop_bestelregels where bestelling_id=b.id and leverstatus<>'geannuleerd' order by id for update loop
    aantal_regels := aantal_regels+1;
    if not (p_aantallen ? r.id::text) or jsonb_typeof(p_aantallen->r.id::text) <> 'number' then
      raise exception 'Vul voor elk artikel het ontvangen aantal in.';
    end if;
    n := (p_aantallen->>r.id::text)::numeric;
    if n<>trunc(n) or n<0 or n>r.aantal or n<coalesce((vorige.aantallen->>r.id::text)::numeric,0) then
      raise exception 'Ongeldig aantal voor %. Gebruik het totaal ontvangen aantal, maximaal %.',r.product_naam,r.aantal;
    end if;
    totaal := totaal+n;
    volledig := volledig and n=r.aantal;
  end loop;
  if aantal_regels=0 or totaal=0 or (select count(*) from jsonb_object_keys(p_aantallen))<>aantal_regels then
    raise exception 'Controleer de ontvangen artikelen. Er moet minstens één verpakking ontvangen zijn.';
  end if;
  if vorige.aantallen=p_aantallen then raise exception 'Deze aantallen zijn al bevestigd.'; end if;
  insert into public.aankoop_ontvangstbevestigingen(id,bestelling_id,besteller_id,volledig,aantallen,opmerking)
    values(p_request_id,b.id,u.id,volledig,p_aantallen,trim(coalesce(p_opmerking,''))) returning * into herhaling;
  update public.aankoop_bestelregels set
    leverstatus=case when (p_aantallen->>id::text)::numeric=aantal then 'geleverd'
      when (p_aantallen->>id::text)::numeric>0 then 'gedeeltelijk_geleverd'
      when leverstatus='backorder' then 'backorder' else 'open' end,
    leverstatus_bijgewerkt_op=now(), leverstatus_bijgewerkt_door=u.email
    where bestelling_id=b.id and leverstatus<>'geannuleerd';
  update public.aankoop_bestellingen set status=case when volledig then 'Geleverd' else 'Gedeeltelijk geleverd' end,
    updated_at=now() where id=b.id;
  melding := u.naam||' bevestigt dat bestelling '||b.id||' voor '||b.locatie_naam||
    case when volledig then ' volledig ontvangen is.' else ' gedeeltelijk ontvangen is. Bekijk de ontbrekende aantallen.' end;
  insert into public.aankoop_meldingen(gebruiker_id,bestelling_id,type,titel,boodschap,actie_url)
    select id,b.id,'ontvangst_bevestigd','Ontvangst bevestigd - bestelling '||b.id,melding,'#bestellingen?ontvangst='||b.id
    from public.gebruikers where actief and lower(trim(rol)) in ('beheerder aankoop','superadmin');
  if volledig then
    update public.aankoop_meldingen set gelezen_op=coalesce(gelezen_op,now())
      where bestelling_id=b.id and type='ontvangst_gevraagd' and gebruiker_id=u.id;
  end if;
  return to_jsonb(herhaling);
end;
$$;
revoke all on function public.aankoop_ontvangst_verwerken(bigint,bigint,text,uuid,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.aankoop_ontvangst_verwerken(bigint,bigint,text,uuid,timestamptz,jsonb,text) to service_role;
commit;
