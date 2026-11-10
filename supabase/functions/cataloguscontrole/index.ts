import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { auditItem } from './core.mjs';

// No browser endpoint: each request requires a random, expiring, one-use batch token.
// The service key is supplied by the Supabase runtime and never leaves this function.
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (Number(request.headers.get('content-length') || 0) > 2048) return new Response('Too large', { status: 413 });
  let body;
  try { const raw = await request.text(); if (raw.length > 2048) throw new Error(); body = JSON.parse(raw); } catch { return new Response('Invalid request', { status: 400 }); }
  if (!/^[a-f0-9-]{36}$/.test(body.batch_id || '') || !/^[a-f0-9]{64}$/.test(body.token || '')) return new Response('Invalid request', { status: 400 });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc('aankoop_catalogus_claim', { p_batch: body.batch_id, p_token: body.token });
  if (error || !data?.items) return new Response('Invalid or expired batch', { status: 403 });
  const items = [...data.items]; const results: unknown[] = [];
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
    while (items.length) { const item = items.shift(); results.push(await auditItem(item)); }
  }));
  const completed = await client.rpc('aankoop_catalogus_complete', { p_batch: body.batch_id, p_token: body.token, p_results: results });
  if (completed.error) { console.error('Cataloguscontrole: opslaan mislukt', body.batch_id, completed.error.code); return new Response('Persistence failed; scheduler will retry', { status: 500 }); }
  return Response.json({ completed: results.length });
});
