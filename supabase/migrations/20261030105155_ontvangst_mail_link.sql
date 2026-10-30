begin;

-- Only non-secret delivery metadata is stored here. Mail links are signed on
-- the server with a separate secret; the signature is never stored in a row.
alter table public.aankoop_ontvangstverzoeken
  add column if not exists mail_poging_id uuid,
  add column if not exists mail_voorbereid_op timestamptz,
  add column if not exists mail_link_geldig_tot timestamptz,
  add column if not exists mail_poging_verzonden_op timestamptz,
  add column if not exists mail_aantal integer not null default 0,
  add column if not exists mail_inhoud jsonb;
create unique index if not exists aankoop_ontvangst_mail_poging_idx
  on public.aankoop_ontvangstverzoeken(mail_poging_id);
alter table public.aankoop_ontvangstbevestigingen
  add column if not exists kanaal text not null default 'app';

create or replace function public.aankoop_ontvangst_mail_voorbereiden(
  p_bestelling_id bigint, p_actor_id bigint, p_request_id uuid, p_herinnering boolean default false
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v public.aankoop_ontvangstverzoeken%rowtype;
  b public.aankoop_bestellingen%rowtype;
  u public.gebruikers%rowtype;
begin
  -- Existing RPC checks manager role and status and locks the order first.
  perform public.aankoop_ontvangst_verwerken(p_bestelling_id,p_actor_id,'vragen',null);
  select * into b from public.aankoop_bestellingen where id=p_bestelling_id;
  select * into v from public.aankoop_ontvangstverzoeken where bestelling_id=b.id for update;
  if p_request_id is null then raise exception 'Verzendkenmerk ontbreekt.'; end if;
  if (not p_herinnering and v.mail_verzonden_op is not null)
    or (v.mail_poging_id=p_request_id and v.mail_poging_verzonden_op is not null) then
    return jsonb_build_object('alreadySent',true);
  end if;
  select * into u from public.gebruikers where id=b.besteller_id and actief;
  if not found or nullif(trim(u.email),'') is null then
    raise exception 'Geen actieve besteller met e-mailadres gevonden.';
  end if;
  -- Reuse a pending attempt, including its exact mail body, after a timeout.
  if v.mail_poging_id is not null and v.mail_poging_verzonden_op is null
    and v.mail_voorbereid_op > now()-interval '23 hours'
    and v.mail_inhoud->>'email'=u.email
    and (v.mail_inhoud->>'besteller_id')::bigint=u.id then
    return to_jsonb(v);
  end if;
  if v.mail_verzonden_op > now()-interval '5 minutes' then
    raise exception 'Er is zojuist een ontvangstmail verstuurd. Wacht minstens vijf minuten voor een nieuwe herinnering.';
  end if;
  update public.aankoop_ontvangstverzoeken set
    mail_poging_id=p_request_id, mail_voorbereid_op=now(),
    mail_link_geldig_tot=now()+interval '14 days', mail_poging_verzonden_op=null,
    mail_inhoud=jsonb_build_object('bestelling_id',b.id,'besteller_id',u.id,
      'naam',b.besteller_naam,'email',u.email,'locatie',b.locatie_naam,
      'herinnering',v.mail_verzonden_op is not null),
    gevraagd_door=p_actor_id
    where bestelling_id=b.id returning * into v;
  return to_jsonb(v);
end;
$$;

create or replace function public.aankoop_ontvangst_mail_verzonden(p_poging_id uuid,p_mail_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.aankoop_ontvangstverzoeken set mail_verzonden_op=now(),
    mail_poging_verzonden_op=now(),mail_id=p_mail_id,
    mail_aantal=greatest(mail_aantal,case when mail_verzonden_op is null then 0 else 1 end)+1
    where mail_poging_id=p_poging_id and mail_poging_verzonden_op is null;
end;
$$;

-- Called only after cryptographic verification by aankoop-ontvangst-link.
-- No anonymous or authenticated client may invoke these RPCs directly.
create or replace function public.aankoop_ontvangst_via_link(
  p_poging_id uuid,p_actie text,p_request_id uuid default null,
  p_updated_at timestamptz default null,p_aantallen jsonb default null,p_opmerking text default ''
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v public.aankoop_ontvangstverzoeken%rowtype;
  b public.aankoop_bestellingen%rowtype;
  vorige jsonb;
  resultaat jsonb;
begin
  select b0.* into b from public.aankoop_bestellingen b0
    join public.aankoop_ontvangstverzoeken v0 on v0.bestelling_id=b0.id
    where v0.mail_poging_id=p_poging_id for update of b0;
  select * into v from public.aankoop_ontvangstverzoeken where mail_poging_id=p_poging_id;
  if not found or v.mail_link_geldig_tot <= now() or not exists (
    select 1 from public.gebruikers u where u.id=b.besteller_id and u.actief
      and u.id=(v.mail_inhoud->>'besteller_id')::bigint and u.email=v.mail_inhoud->>'email'
  ) then raise exception 'Deze link is verlopen of vervangen. Gebruik de meest recente ontvangstmail of vraag aankoopbeheer een nieuwe link.' using errcode='42501'; end if;
  if p_actie='bevestigen' then
    resultaat:=public.aankoop_ontvangst_verwerken(b.id,b.besteller_id,'bevestigen',
      p_request_id,p_updated_at,p_aantallen,p_opmerking);
    update public.aankoop_ontvangstbevestigingen set kanaal='mail'
      where id=p_request_id and bestelling_id=b.id;
    return jsonb_build_object('ok',true,'volledig',(resultaat->>'volledig')::boolean);
  end if;
  if p_actie is distinct from 'bekijken' then raise exception 'Onbekende actie.'; end if;
  if b.status not in ('Besteld','Besteld bij leverancier','Gedeeltelijk geleverd','Geleverd') then
    raise exception 'Deze bestelling staat niet meer open voor ontvangstbevestiging.';
  end if;
  select jsonb_build_object('aantallen',r.aantallen,'volledig',r.volledig,'created_at',r.created_at)
    into vorige from public.aankoop_ontvangstbevestigingen r
    where r.bestelling_id=b.id order by r.created_at desc limit 1;
  return jsonb_build_object('id',b.id,'status',b.status,'locatie_naam',b.locatie_naam,
    'updated_at',b.updated_at,'ontvangst',vorige,'regels',coalesce((
      select jsonb_agg(jsonb_build_object('id',r.id,'product_naam',r.product_naam,
        'aantal',r.aantal,'eenheid',r.eenheid,'leverstatus',r.leverstatus) order by r.id)
      from public.aankoop_bestelregels r where r.bestelling_id=b.id and r.leverstatus<>'geannuleerd'
    ),'[]'::jsonb));
end;
$$;

revoke all on function public.aankoop_ontvangst_mail_voorbereiden(bigint,bigint,uuid,boolean) from public,anon,authenticated;
revoke all on function public.aankoop_ontvangst_mail_verzonden(uuid,text) from public,anon,authenticated;
revoke all on function public.aankoop_ontvangst_via_link(uuid,text,uuid,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.aankoop_ontvangst_mail_voorbereiden(bigint,bigint,uuid,boolean) to service_role;
grant execute on function public.aankoop_ontvangst_mail_verzonden(uuid,text) to service_role;
grant execute on function public.aankoop_ontvangst_via_link(uuid,text,uuid,timestamptz,jsonb,text) to service_role;

commit;
