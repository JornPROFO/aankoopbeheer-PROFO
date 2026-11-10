-- Weekly supplier maintenance; no workstation, GitHub runner or third-party AI required.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
-- Hosted pg_net ACLs belong to supabase_admin and cannot be changed by postgres.
-- Keep net outside the exposed Data API schemas. Queue only a short-lived batch
-- nonce, never a service/API key; the response contains no catalogue data.
create schema aankoop_catalogus;
revoke all on schema aankoop_catalogus from public, anon, authenticated;
grant usage on schema aankoop_catalogus to service_role;

create table aankoop_catalogus.config (
  id boolean primary key default true check(id),
  enabled boolean not null default false,
  next_run_at timestamptz not null default ((date_trunc('week', now() at time zone 'Europe/Brussels') + interval '7 days 8 hours') at time zone 'Europe/Brussels'),
  endpoint text not null default 'https://rxkffollbimmsvwhucgd.supabase.co/functions/v1/cataloguscontrole'
);
insert into aankoop_catalogus.config(id) values(true);
create table aankoop_catalogus.baselines (
  kind text not null check(kind in ('producten','cartridges')),
  record_id bigint not null,
  evidence jsonb not null,
  confirmed_at timestamptz not null default now(),
  primary key(kind,record_id)
);
create table public.aankoop_catalogus_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  scheduled_for timestamptz unique,
  dry_run boolean not null,
  status text not null default 'running' check(status in ('running','completed','attention','failed')),
  total integer not null default 0,
  checked integer not null default 0,
  corrected integer not null default 0,
  attention integer not null default 0,
  skipped integer not null default 0
);
create unique index aankoop_catalogus_one_running on public.aankoop_catalogus_runs((true)) where status='running';
create table aankoop_catalogus.batches (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.aankoop_catalogus_runs(id),
  state text not null default 'pending' check(state in ('pending','queued','running','done','failed')),
  nonce_hash text,
  expires_at timestamptz,
  attempts integer not null default 0,
  request_id bigint
);
create index on aankoop_catalogus.batches(run_id,state);
create table public.aankoop_catalogus_resultaten (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.aankoop_catalogus_runs(id),
  batch_id uuid not null references aankoop_catalogus.batches(id),
  kind text not null check(kind in ('producten','cartridges')),
  record_id bigint not null,
  snapshot jsonb not null,
  status text not null default 'pending' check(status in ('pending','ok','corrected','would_correct','attention','skipped','conflict','failed')),
  message text not null default '',
  patch jsonb not null default '{}',
  evidence jsonb not null default '{}',
  checked_at timestamptz,
  unique(run_id,kind,record_id)
);
create index on public.aankoop_catalogus_resultaten(batch_id);

alter table aankoop_catalogus.config enable row level security;
alter table aankoop_catalogus.baselines enable row level security;
alter table aankoop_catalogus.batches enable row level security;
revoke all on aankoop_catalogus.config, aankoop_catalogus.baselines, aankoop_catalogus.batches from public,anon,authenticated,service_role;
grant select, insert, update on aankoop_catalogus.config, aankoop_catalogus.baselines, aankoop_catalogus.batches to service_role;
revoke all on public.aankoop_catalogus_runs, public.aankoop_catalogus_resultaten from public, anon, authenticated, service_role;
-- BEGIN EXPLICIT DATA API GRANTS
alter table public.aankoop_catalogus_runs enable row level security;
grant select on table public.aankoop_catalogus_runs to authenticated;
grant select, insert, update on table public.aankoop_catalogus_runs to service_role;
alter table public.aankoop_catalogus_resultaten enable row level security;
grant select on table public.aankoop_catalogus_resultaten to authenticated;
grant select, insert, update on table public.aankoop_catalogus_resultaten to service_role;
-- END EXPLICIT DATA API GRANTS
create policy catalogus_runs_beheer on public.aankoop_catalogus_runs for select to authenticated using ((select public.current_gebruiker_is_beheerder()));
create policy catalogus_resultaten_beheer on public.aankoop_catalogus_resultaten for select to authenticated using ((select public.current_gebruiker_is_beheerder()));

create function aankoop_catalogus.start_run(p_dry_run boolean default true, p_scheduled_for timestamptz default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_run uuid; v_batch uuid; v_row record; v_count int:=0;
begin
  perform pg_advisory_xact_lock(716310112026::bigint);
  if exists(select 1 from public.aankoop_catalogus_runs where status='running') then raise exception 'Er loopt al een cataloguscontrole'; end if;
  insert into public.aankoop_catalogus_runs(dry_run,scheduled_for) values(p_dry_run,p_scheduled_for) returning id into v_run;
  for v_row in select 'producten'::text kind,p.id record_id,to_jsonb(p) snapshot from public.aankoop_producten p
    union all select 'cartridges',c.id,to_jsonb(c) from public.aankoop_printer_cartridges c order by kind,record_id
  loop
    if v_count % 8 = 0 then insert into aankoop_catalogus.batches(run_id) values(v_run) returning id into v_batch; end if;
    insert into public.aankoop_catalogus_resultaten(run_id,batch_id,kind,record_id,snapshot) values(v_run,v_batch,v_row.kind,v_row.record_id,v_row.snapshot);
    v_count:=v_count+1;
  end loop;
  update public.aankoop_catalogus_runs set total=v_count where id=v_run;
  return v_run;
end $$;

create function aankoop_catalogus.dispatch() returns void language plpgsql security invoker set search_path='' as $$
declare v_batch aankoop_catalogus.batches%rowtype; v_nonce text; v_request bigint;
begin
  perform pg_advisory_xact_lock(716310112026::bigint);
  if exists(select 1 from aankoop_catalogus.batches where state in ('queued','running')) then return; end if;
  select b.* into v_batch from aankoop_catalogus.batches b join public.aankoop_catalogus_runs r on r.id=b.run_id where b.state='pending' and r.status='running' order by r.started_at,b.id limit 1 for update of b;
  if not found then return; end if;
  v_nonce:=encode(extensions.gen_random_bytes(32),'hex');
  update aankoop_catalogus.batches set state='queued',nonce_hash=encode(extensions.digest(v_nonce,'sha256'),'hex'),expires_at=now()+interval '4 minutes',attempts=attempts+1 where id=v_batch.id;
  select net.http_post(url:=(select endpoint from aankoop_catalogus.config where id),body:=jsonb_build_object('batch_id',v_batch.id,'token',v_nonce),timeout_milliseconds:=120000) into v_request;
  update aankoop_catalogus.batches set request_id=v_request where id=v_batch.id;
end $$;

create function public.aankoop_catalogus_claim(p_batch uuid,p_token text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_batch aankoop_catalogus.batches%rowtype; v_items jsonb;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Ongeldige taakcode'; end if;
  select * into v_batch from aankoop_catalogus.batches where id=p_batch for update;
  if not found or v_batch.state<>'queued' or v_batch.expires_at<now() or v_batch.nonce_hash<>encode(extensions.digest(p_token,'sha256'),'hex') then raise exception 'Ongeldige of verlopen taakcode'; end if;
  update aankoop_catalogus.batches set state='running' where id=p_batch;
  select jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'record_id',i.record_id,'snapshot',i.snapshot,'baseline',b.evidence)) into v_items
    from public.aankoop_catalogus_resultaten i left join aankoop_catalogus.baselines b on b.kind=i.kind and b.record_id=i.record_id where i.batch_id=p_batch;
  return jsonb_build_object('items',v_items);
end $$;

create function aankoop_catalogus.finish_runs() returns void language plpgsql security invoker set search_path='' as $$
declare v_run public.aankoop_catalogus_runs%rowtype; v_counts record;
begin
  for v_run in select r.* from public.aankoop_catalogus_runs r where status='running' and not exists(select 1 from aankoop_catalogus.batches b where b.run_id=r.id and b.state not in ('done','failed')) for update loop
    select count(*) filter(where status in ('ok','corrected','would_correct')) checked,
      count(*) filter(where status='corrected') corrected,
      count(*) filter(where status in ('attention','conflict','failed')) attention,
      count(*) filter(where status='skipped') skipped,
      count(*) filter(where status='failed') failed
    into v_counts from public.aankoop_catalogus_resultaten where run_id=v_run.id;
    update public.aankoop_catalogus_runs set finished_at=now(),checked=v_counts.checked,corrected=v_counts.corrected,attention=v_counts.attention,skipped=v_counts.skipped,
      status=case when v_counts.failed=total and total>0 then 'failed' when v_counts.attention>0 then 'attention' else 'completed' end where id=v_run.id;
    if not v_run.dry_run and (v_counts.corrected>0 or v_counts.attention>0) then
      insert into public.aankoop_meldingen(gebruiker_id,type,titel,boodschap,actie_url)
      select id,'cataloguscontrole','Wekelijkse cataloguscontrole',format('%s artikelen gecontroleerd; %s link- of fotocorrecties en %s aandachtspunten. Bekijk het logboek bij Beheer > Cataloguscontrole.',v_run.total,v_counts.corrected,v_counts.attention),'#beheer'
      from public.gebruikers where actief and lower(email)='jorn.neeus@profo.be';
    end if;
  end loop;
end $$;

create function public.aankoop_catalogus_complete(p_batch uuid,p_token text,p_results jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare v_batch aankoop_catalogus.batches%rowtype; v_dry boolean; v_result jsonb; v_item public.aankoop_catalogus_resultaten%rowtype;
  v_live jsonb; v_baseline jsonb; v_patch jsonb; v_status text; v_message text; v_url text; v_old_url text; v_link jsonb; v_evidence jsonb;
begin
  perform pg_advisory_xact_lock(716310112026::bigint);
  select * into v_batch from aankoop_catalogus.batches where id=p_batch for update;
  if not found or v_batch.state<>'running' or v_batch.expires_at<now() or v_batch.nonce_hash<>encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') then raise exception 'Geen geldige lopende taak'; end if;
  select dry_run into v_dry from public.aankoop_catalogus_runs where id=v_batch.run_id;
  if p_results is null or jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<>(select count(*) from public.aankoop_catalogus_resultaten where batch_id=p_batch)
    or (select count(distinct r->>'item_id') from jsonb_array_elements(p_results) r)<>jsonb_array_length(p_results) then raise exception 'Onvolledig taakresultaat'; end if;
  for v_result in select * from jsonb_array_elements(p_results) loop
    select * into v_item from public.aankoop_catalogus_resultaten where id=(v_result->>'item_id')::uuid and batch_id=p_batch for update;
    if not found then raise exception 'Onbekende catalogusregel'; end if;
    v_status:=v_result->>'status'; v_message:=left(v_result->>'message',500); v_patch:=coalesce(v_result->'patch','{}'); v_evidence:=coalesce(v_result->'evidence','{}');
    if v_status not in ('ok','corrected','attention','skipped') or jsonb_typeof(v_patch)<>'object' or (v_patch-'leverancier_url'-'image_url')<>'{}'::jsonb then raise exception 'Ongeldig correctiebereik'; end if;
    select evidence into v_baseline from aankoop_catalogus.baselines where kind=v_item.kind and record_id=v_item.record_id;
    if v_patch<>'{}'::jsonb and (v_status<>'corrected' or v_baseline is null or
      (v_evidence->>'sku') is distinct from (v_baseline->>'sku') or
      (v_evidence->>'name') is distinct from (v_baseline->>'name') or
      (v_evidence->'variant') is distinct from (v_baseline->'variant') or
      (v_evidence->>'source_id') is distinct from (v_baseline->>'source_id') or
      coalesce(v_evidence->>'image_hash','') !~ '^[a-f0-9]{64}$') then
      v_status:='attention'; v_message:='Correctie geweigerd: de bevestigde artikelidentiteit wijkt af.'; v_patch:='{}';
    end if;
    if v_item.kind='producten' then select to_jsonb(p) into v_live from public.aankoop_producten p where id=v_item.record_id for update;
    else select to_jsonb(c) into v_live from public.aankoop_printer_cartridges c where id=v_item.record_id for update; end if;
    if v_live is distinct from v_item.snapshot then v_status:='conflict'; v_message:='Catalogusregel is intussen gewijzigd. Volgende controle gebruikt de actuele gegevens.'; v_patch:='{}'; end if;
    if v_patch ? 'leverancier_url' then
      v_url:=v_patch->>'leverancier_url'; v_old_url:=v_item.snapshot->>'leverancier_url'; v_link:=null;
      if left(ltrim(v_old_url),1)='{' then v_link:=v_old_url::jsonb; v_old_url:=v_link->>'url'; end if;
      if v_url is distinct from v_evidence->>'final_url' or v_url !~ '^https://(www[.]123inkt[.](be|nl)|www[.]123schoon[.]nl|www[.]ehbo-koffer[.]be|discountoffice[.]be)/'
        or split_part(v_url,'/',3)<>split_part(v_old_url,'/',3) then raise exception 'Onveilige productlink'; end if;
      if v_link is not null then v_url:=jsonb_set(v_link,'{url}',to_jsonb(v_url))::text; end if;
    else v_url:=v_item.snapshot->>'leverancier_url'; end if;
    if v_patch ? 'image_url' and ((v_patch->>'image_url') is distinct from (v_evidence->>'image') or (v_patch->>'image_url') !~ '^https://(www[.]123inkt[.](be|nl)|www[.]123schoon[.]nl|www[.]ehbo-koffer[.]be|discountoffice[.]be|static[.]discountoffice[.]cloud)/') then raise exception 'Onveilige productafbeelding'; end if;
    if v_status='corrected' then
      if v_patch='{}'::jsonb then raise exception 'Lege correctie'; end if;
      if v_dry then v_status:='would_correct';
      elsif v_item.kind='producten' then update public.aankoop_producten set leverancier_url=v_url,image_url=coalesce(v_patch->>'image_url',image_url) where id=v_item.record_id;
      else update public.aankoop_printer_cartridges set leverancier_url=v_url,image_url=coalesce(v_patch->>'image_url',image_url) where id=v_item.record_id; end if;
    end if;
    update public.aankoop_catalogus_resultaten set status=v_status,message=v_message,patch=v_patch,evidence=v_evidence,checked_at=now() where id=v_item.id;
    if not v_dry and v_status in ('ok','corrected') and (v_evidence->>'sku')=(v_baseline->>'sku') and (v_evidence->>'name')=(v_baseline->>'name') then
      update aankoop_catalogus.baselines set evidence=evidence||jsonb_build_object('image',v_evidence->>'image','image_hash',v_evidence->>'image_hash') where kind=v_item.kind and record_id=v_item.record_id;
    end if;
  end loop;
  update aankoop_catalogus.batches set state='done',nonce_hash=null where id=p_batch;
  update public.aankoop_catalogus_runs r set checked=c.checked,corrected=c.corrected,attention=c.attention,skipped=c.skipped
    from (select count(*) filter(where status in ('ok','corrected','would_correct')) checked,count(*) filter(where status='corrected') corrected,
      count(*) filter(where status in ('attention','conflict','failed')) attention,count(*) filter(where status='skipped') skipped
      from public.aankoop_catalogus_resultaten where run_id=v_batch.run_id) c where r.id=v_batch.run_id;
  perform aankoop_catalogus.finish_runs();
  perform aankoop_catalogus.dispatch();
end $$;

create function aankoop_catalogus.tick() returns void language plpgsql security invoker set search_path='' as $$
declare v_config aankoop_catalogus.config%rowtype;
begin
  perform pg_advisory_xact_lock(716310112026::bigint);
  update aankoop_catalogus.batches set state=case when attempts>=3 then 'failed' else 'pending' end,nonce_hash=null where state in ('queued','running') and expires_at<now();
  update public.aankoop_catalogus_resultaten i set status='failed',message='Servercontrole na drie pogingen niet voltooid; opvolging nodig.',checked_at=now()
    from aankoop_catalogus.batches b where i.batch_id=b.id and b.state='failed' and i.status='pending';
  perform aankoop_catalogus.finish_runs();
  select * into v_config from aankoop_catalogus.config where id for update;
  if v_config.enabled and v_config.next_run_at<=now() and not exists(select 1 from public.aankoop_catalogus_runs where status='running') then
    perform aankoop_catalogus.start_run(false,v_config.next_run_at);
    update aankoop_catalogus.config set next_run_at=((date_trunc('week',now() at time zone 'Europe/Brussels')+interval '7 days 8 hours') at time zone 'Europe/Brussels') where id;
  end if;
  perform aankoop_catalogus.dispatch();
end $$;

create function public.aankoop_catalogus_planning() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('enabled',enabled,'next_run_at',next_run_at,'timezone','Europe/Brussels') from aankoop_catalogus.config where id and public.current_gebruiker_is_beheerder()
$$;
revoke all on function public.aankoop_catalogus_claim(uuid,text),public.aankoop_catalogus_complete(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.aankoop_catalogus_claim(uuid,text),public.aankoop_catalogus_complete(uuid,text,jsonb) to service_role;
revoke all on function public.aankoop_catalogus_planning() from public,anon;
grant execute on function public.aankoop_catalogus_planning() to authenticated;
revoke all on all functions in schema aankoop_catalogus from public,anon,authenticated,service_role;
grant execute on function aankoop_catalogus.finish_runs(),aankoop_catalogus.dispatch() to service_role;
-- Only postgres/pg_cron can start or schedule a full run. A worker can only claim its one-use batch.
select cron.schedule('aankoop-catalogus-dispatch','* * * * *','select aankoop_catalogus.tick();');
commit;
