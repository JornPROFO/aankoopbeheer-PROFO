begin;

alter table public.aankoop_bestelregels
  add column if not exists leverstatus text not null default 'open',
  add column if not exists verwachte_leverdatum date,
  add column if not exists leveringsopmerking text,
  add column if not exists leverstatus_bijgewerkt_op timestamptz,
  add column if not exists leverstatus_bijgewerkt_door text;

alter table public.aankoop_bestelregels
  drop constraint if exists aankoop_bestelregels_leverstatus_check;

alter table public.aankoop_bestelregels
  add constraint aankoop_bestelregels_leverstatus_check
  check (leverstatus in ('open', 'backorder', 'gedeeltelijk_geleverd', 'geleverd', 'geannuleerd'));

create index if not exists aankoop_bestelregels_open_levering_idx
  on public.aankoop_bestelregels (bestelling_id, leverstatus)
  where leverstatus <> 'geleverd';

comment on column public.aankoop_bestelregels.leverstatus is
  'Operationele leverstatus van het individuele artikel binnen de bestelling.';
comment on column public.aankoop_bestelregels.verwachte_leverdatum is
  'Meest recente verwachte leverdatum voor deze bestelregel.';
comment on column public.aankoop_bestelregels.leveringsopmerking is
  'Korte toelichting bij backorder, nalevering, gedeeltelijke levering of annulering.';

commit;

select id, bestelling_id, product_naam, leverstatus, verwachte_leverdatum
from public.aankoop_bestelregels
order by bestelling_id desc, id
limit 20;
