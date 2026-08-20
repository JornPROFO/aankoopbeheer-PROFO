import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const defaultAllowedOrigins = [
  'https://aankoopbeheer-profo.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function corsHeaders(req: Request) {
  const configuredOrigins = String(Deno.env.get('AANKOOPBEHEER_ALLOWED_ORIGINS') || '')
    .split(/[;,]/).map((origin) => origin.trim()).filter(Boolean);
  const allowedOrigins = configuredOrigins.length ? configuredOrigins : defaultAllowedOrigins;
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export async function requireActiveUser(req: Request, adminClient: ReturnType<typeof createClient>) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
  if (!token || !supabaseUrl || !publishableKey) throw new HttpError('Aanmelding vereist.', 401);

  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user?.id || !authData.user.email) {
    throw new HttpError('Ongeldige of verlopen aanmelding.', 401);
  }

  const { data: appUser, error: profileError } = await adminClient
    .from('gebruikers')
    .select('id, naam, email, rol, actief, auth_user_id')
    .or(`auth_user_id.eq.${authData.user.id},email.ilike.${authData.user.email}`)
    .eq('actief', true).limit(1).maybeSingle();
  if (profileError || !appUser) throw new HttpError('Geen actief PROFO-profiel gevonden.', 403);
  return appUser;
}

export function isPurchaseManager(user: Record<string, unknown>) {
  return ['beheerder aankoop', 'superadmin'].includes(String(user.rol || '').trim().toLowerCase());
}

export async function assertOrderAccess(adminClient: ReturnType<typeof createClient>, user: Record<string, unknown>, order: Record<string, unknown>) {
  if (isPurchaseManager(user) || String(order.besteller_id) === String(user.id) || String(order.aangemaakt_door_id) === String(user.id)) return;

  const { data: scopes, error } = await adminClient
    .from('aankoop_goedkeurder_scopes').select('id')
    .eq('goedkeurder_id', user.id).eq('actief', true)
    .or(`and(scope_type.eq.teamlid,teamlid_id.in.(${order.besteller_id},${order.aangemaakt_door_id})),and(scope_type.eq.locatie,locatie_id.eq.${order.locatie_id})`)
    .limit(1);
  if (error || !scopes?.length) throw new HttpError('Je hebt geen toegang tot deze bestelling.', 403);
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
