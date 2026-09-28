begin;
alter table public.aankoop_winkelwagen_overdrachten drop constraint if exists aankoop_winkelwagen_overdrachten_methode_check;
alter table public.aankoop_winkelwagen_overdrachten add constraint aankoop_winkelwagen_overdrachten_methode_check check (methode in ('begeleid_handmatig','browser_agent'));
alter table public.aankoop_winkelwagen_resultaten add column if not exists bron text not null default 'handmatig' check (bron in ('handmatig','browser_agent'));
alter table public.aankoop_winkelwagen_resultaten add column if not exists toelichting text check (length(toelichting) <= 400);

create or replace function public.aankoop_winkelwagen_agent_start(p_bestelling bigint,p_verwacht jsonb)
returns public.aankoop_winkelwagen_overdrachten language plpgsql security invoker set search_path = '' as $$
declare huidige jsonb; overdracht public.aankoop_winkelwagen_overdrachten;
begin
  if not coalesce(public.aankoop_winkelwagen_bevoegd(),false) then raise exception 'Geen bevoegdheid'; end if;
  perform 1 from public.aankoop_bestellingen where id=p_bestelling for update;
  huidige := public.aankoop_winkelwagen_snapshot(p_bestelling);
  if p_verwacht is distinct from huidige then raise exception 'Voorbeeld verouderd'; end if;
  -- Every consciously started attempt is audited, including retries.
  insert into public.aankoop_winkelwagen_overdrachten(bestelling_id,methode)
    values (p_bestelling,'browser_agent') returning * into overdracht;
  return overdracht;
end $$;
revoke all on function public.aankoop_winkelwagen_agent_start(bigint,jsonb) from public,anon;
grant execute on function public.aankoop_winkelwagen_agent_start(bigint,jsonb) to authenticated;
commit;
