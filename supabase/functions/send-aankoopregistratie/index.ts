import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, email } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!user_id || !normalizedEmail.endsWith('@profo.be')) {
      return json({ error: 'Ongeldige registratiegegevens.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const mailFrom = Deno.env.get('MAIL_FROM') ?? 'PROFO Aankoopbeheer <aankoopbeheer@meldingen.profo.be>';
    const primaryManager = parseRecipients(Deno.env.get('AANKOOPBEHEER_PRIMARY_MAIL_TO') ?? 'jorn.neeus@profo.be');

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !primaryManager.length) {
      return json({ error: 'De registratiemelding is nog niet volledig geconfigureerd.' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(String(user_id));

    if (authError || !authResult.user || String(authResult.user.email || '').toLowerCase() !== normalizedEmail) {
      return json({ error: 'De geregistreerde gebruiker kon niet worden bevestigd.' }, 403);
    }

    const createdAt = new Date(authResult.user.created_at).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 30 * 60 * 1000) {
      return json({ error: 'Deze registratie is niet meer nieuw.' }, 409);
    }

    if (authResult.user.app_metadata?.aankoop_registratie_gemeld_op) {
      return json({ ok: true, already_sent: true });
    }

    const { data: appUser } = await supabase
      .from('gebruikers')
      .select('id, naam, email, functie, actief')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    const regionalDirectors = appUser?.id
      ? await getRegionalDirectorRecipients(supabase, appUser.id)
      : [];
    const recipients = [...new Set([...primaryManager, ...regionalDirectors])];
    const displayName = String(appUser?.naam || authResult.user.user_metadata?.full_name || normalizedEmail).trim();

    await sendMail({
      apiKey: resendApiKey,
      from: mailFrom,
      to: recipients,
      subject: `Nieuwe gebruiker geregistreerd in PROFO Aankoopbeheer - ${displayName}`,
      text: buildRegistrationMailBody({
        displayName,
        email: normalizedEmail,
        functionName: String(appUser?.functie || ''),
        hasProfile: Boolean(appUser?.id && appUser?.actief),
        hasRegionalDirector: regionalDirectors.length > 0,
      }),
    });

    await supabase.auth.admin.updateUserById(String(user_id), {
      app_metadata: {
        ...authResult.user.app_metadata,
        aankoop_registratie_gemeld_op: new Date().toISOString(),
      },
    });

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message ?? String(error) }, 500);
  }
});

async function getRegionalDirectorRecipients(supabase: ReturnType<typeof createClient>, userId: string | number) {
  const { data: scopes, error: scopeError } = await supabase
    .from('aankoop_goedkeurder_scopes')
    .select('goedkeurder_id')
    .eq('scope_type', 'teamlid')
    .eq('teamlid_id', userId)
    .eq('actief', true);

  if (scopeError || !scopes?.length) {
    return [];
  }

  const approverIds = [...new Set(scopes.map((scope) => scope.goedkeurder_id).filter(Boolean))];
  const { data: users, error: userError } = await supabase
    .from('gebruikers')
    .select('email, rol, actief')
    .in('id', approverIds)
    .eq('actief', true);

  if (userError) {
    return [];
  }

  return [...new Set(
    (users ?? [])
      .filter((user) => String(user.rol || '').trim().toLowerCase() === 'regiodirecteur')
      .map((user) => String(user.email || '').trim().toLowerCase())
      .filter(Boolean),
  )];
}

function buildRegistrationMailBody(details: {
  displayName: string;
  email: string;
  functionName: string;
  hasProfile: boolean;
  hasRegionalDirector: boolean;
}) {
  return [
    'Dag,',
    '',
    'Er heeft zich een nieuwe gebruiker geregistreerd in PROFO Aankoopbeheer.',
    '',
    `Naam: ${details.displayName}`,
    `E-mailadres: ${details.email}`,
    details.functionName ? `Functie: ${details.functionName}` : '',
    `Actief profiel gevonden: ${details.hasProfile ? 'ja' : 'nee'}`,
    `Regiodirecteur gekoppeld: ${details.hasRegionalDirector ? 'ja' : 'nee'}`,
    '',
    details.hasRegionalDirector
      ? 'Jorn en de gekoppelde regiodirecteur ontvangen deze melding.'
      : 'Er is nog geen regiodirecteur gekoppeld. Jorn moet de teamkoppeling controleren voordat deze gebruiker een aanvraag indient.',
    '',
    'PROFO Aankoopbeheer',
  ].filter(Boolean).join('\n');
}

async function sendMail(options: { apiKey: string; from: string; to: string[]; subject: string; text: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Registratiemelding kon niet worden verzonden: ${await response.text()}`);
  }
}

function parseRecipients(value: string) {
  return value.split(/[;,]/).map((recipient) => recipient.trim().toLowerCase()).filter(Boolean);
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
