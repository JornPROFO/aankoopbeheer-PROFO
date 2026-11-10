-- All fixtures and attempted changes are rolled back; no HTTP requests commit.
begin;
select pg_advisory_xact_lock(716310112026::bigint);
create temporary table catalog_test_ids(run_id uuid,batch_id uuid,first_id uuid,second_id uuid);
grant select on catalog_test_ids to service_role;
do $$ declare v_run uuid;v_batch uuid;v_first uuid;v_second uuid;v_row record; begin
  if exists(select 1 from public.aankoop_catalogus_runs where status='running') then raise exception 'Wait until the real run has finished'; end if;
  insert into public.aankoop_catalogus_runs(dry_run,total) values(false,2) returning id into v_run;
  insert into aankoop_catalogus.batches(run_id,state,nonce_hash,expires_at) values(v_run,'queued',encode(extensions.digest(repeat('a',64),'sha256'),'hex'),now()+interval '4 minutes') returning id into v_batch;
  update public.aankoop_producten set image_url=null where id in (1,2);
  insert into public.aankoop_catalogus_resultaten(run_id,batch_id,kind,record_id,snapshot) select v_run,v_batch,'producten',id,to_jsonb(p) from public.aankoop_producten p where id=1 returning id into v_first;
  insert into public.aankoop_catalogus_resultaten(run_id,batch_id,kind,record_id,snapshot) select v_run,v_batch,'producten',id,to_jsonb(p) from public.aankoop_producten p where id=2 returning id into v_second;
  insert into catalog_test_ids values(v_run,v_batch,v_first,v_second);
  -- The next batch verifies server-only pg_net enqueue permissions. It never commits.
  insert into aankoop_catalogus.batches(run_id) values(v_run);
  -- Simulate a concurrent catalogue edit after the audit took its snapshot.
  update public.aankoop_producten set omschrijving=omschrijving||' concurrency fixture' where id=2;
  if has_function_privilege('anon','public.aankoop_catalogus_claim(uuid,text)','EXECUTE') or has_function_privilege('authenticated','public.aankoop_catalogus_complete(uuid,text,jsonb)','EXECUTE') then raise exception 'Worker RPC exposed'; end if;
  if has_schema_privilege('authenticated','aankoop_catalogus','USAGE') or has_table_privilege('anon','public.aankoop_catalogus_runs','SELECT') then raise exception 'Private audit state exposed'; end if;
  if has_table_privilege('authenticated','public.aankoop_catalogus_runs','UPDATE') then raise exception 'Audit log writable by browser'; end if;
  if has_function_privilege('service_role','aankoop_catalogus.start_run(boolean,timestamp with time zone)','EXECUTE') then raise exception 'Worker can start unrestricted runs'; end if;
end $$;
set local role service_role;
do $$ declare v_ids record;v_items jsonb;v_result jsonb;v_expected text; begin
  select * into v_ids from catalog_test_ids;
  begin perform public.aankoop_catalogus_claim(v_ids.batch_id,repeat('b',64)); raise exception 'Wrong token accepted'; exception when others then if sqlerrm='Wrong token accepted' then raise; end if; end;
  update aankoop_catalogus.batches set expires_at=now()-interval '1 second' where id=v_ids.batch_id;
  begin perform public.aankoop_catalogus_claim(v_ids.batch_id,repeat('a',64)); raise exception 'Expired token accepted'; exception when others then if sqlerrm='Expired token accepted' then raise; end if; end;
  update aankoop_catalogus.batches set expires_at=now()+interval '4 minutes' where id=v_ids.batch_id;
  v_items:=public.aankoop_catalogus_claim(v_ids.batch_id,repeat('a',64));
  if jsonb_array_length(v_items->'items')<>2 then raise exception 'Wrong batch size'; end if;
  begin perform public.aankoop_catalogus_claim(v_ids.batch_id,repeat('a',64)); raise exception 'Replay accepted'; exception when others then if sqlerrm='Replay accepted' then raise; end if; end;
  select jsonb_agg(jsonb_build_object('item_id',i.id,'status','corrected','message','Rollback fixture','patch',jsonb_build_object('image_url',b.evidence->>'image'),'evidence',b.evidence||jsonb_build_object('image_hash',repeat('a',64)))) into v_result from public.aankoop_catalogus_resultaten i join aankoop_catalogus.baselines b on b.kind=i.kind and b.record_id=i.record_id where batch_id=v_ids.batch_id;
  begin perform public.aankoop_catalogus_complete(v_ids.batch_id,repeat('a',64),jsonb_set(v_result,'{0,patch,prijs_excl_btw}','0')); raise exception 'Price mutation accepted'; exception when others then if sqlerrm='Price mutation accepted' then raise; end if; end;
  begin perform public.aankoop_catalogus_complete(v_ids.batch_id,repeat('a',64),null); raise exception 'Null results accepted'; exception when others then if sqlerrm='Null results accepted' then raise; end if; end;
  perform public.aankoop_catalogus_complete(v_ids.batch_id,repeat('a',64),v_result);
  select evidence->>'image' into v_expected from aankoop_catalogus.baselines where kind='producten' and record_id=1;
  if (select image_url from public.aankoop_producten where id=1) is distinct from v_expected then raise exception 'Verified repair not saved'; end if;
  if (select image_url from public.aankoop_producten where id=2) is not null then raise exception 'Concurrent change overwritten'; end if;
  if (select status from public.aankoop_catalogus_resultaten where id=v_ids.second_id)<>'conflict' then raise exception 'Conflict not recorded'; end if;
  if not exists(select 1 from aankoop_catalogus.batches where run_id=v_ids.run_id and id<>v_ids.batch_id and state='queued' and request_id is not null) then raise exception 'Next server batch not queued'; end if;
  if exists(select 1 from public.aankoop_catalogus_resultaten i join public.aankoop_producten p on p.id=i.record_id where i.batch_id=v_ids.batch_id and i.record_id=1 and (to_jsonb(p)-'image_url'-'updated_at')<>(i.snapshot-'image_url'-'updated_at')) then raise exception 'Unrelated product field changed'; end if;
end $$;
reset role;
do $$ begin
  if ('2027-03-29 08:00'::timestamp at time zone 'Europe/Brussels')<>'2027-03-29 06:00Z'::timestamptz or ('2026-11-16 08:00'::timestamp at time zone 'Europe/Brussels')<>'2026-11-16 07:00Z'::timestamptz then raise exception 'DST schedule incorrect'; end if;
end $$;
select 'PASS: single-use token, worker scope, image repair, concurrent edit, immutable fields, log ACL and Belgian DST' as result;
rollback;
