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
    const { bestelling_id } = await req.json();

    if (!bestelling_id) {
      return json({ error: 'bestelling_id ontbreekt.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const mailFrom = Deno.env.get('MAIL_FROM') ?? 'PROFO Aankoopbeheer <aankoopbeheer@meldingen.profo.be>';
    const beheerderMail = parseRecipients(Deno.env.get('AANKOOPBEHEER_MAIL_TO') ?? 'jorn.neeus@profo.be');

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return json({ error: 'Mailfunctie is nog niet volledig geconfigureerd. Controleer SUPABASE_URL, SERVICE_ROLE_KEY en RESEND_API_KEY in de Supabase Edge Function secrets.' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from('aankoop_bestellingen')
      .select('*')
      .eq('id', bestelling_id)
      .single();

    if (orderError) {
      throw orderError;
    }

    const { data: lines, error: linesError } = await supabase
      .from('aankoop_bestelregels')
      .select('*')
      .eq('bestelling_id', bestelling_id)
      .order('id', { ascending: true });

    if (linesError) {
      throw linesError;
    }

    const status = normalizeStatus(order.status);
    const mailPlan = await buildMailPlan(supabase, order, lines ?? [], status, beheerderMail);

    for (const message of mailPlan.messages) {
      await sendMail({
        apiKey: resendApiKey,
        from: mailFrom,
        ...message,
      });
    }

    await supabase
      .from('aankoop_bestellingen')
      .update({
        mail_status: mailPlan.status,
        mail_verzonden_op: new Date().toISOString(),
      })
      .eq('id', bestelling_id);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message ?? String(error) }, 500);
  }
});

async function buildMailPlan(
  supabase: ReturnType<typeof createClient>,
  order: Record<string, unknown>,
  lines: Record<string, unknown>[],
  status: string,
  beheerderMail: string[],
) {
  if (status === 'Ter goedkeuring') {
    const approvers = await getApprovalRecipients(supabase, order, beheerderMail);
    return {
      status: 'Verzonden naar goedkeurder en besteller',
      messages: [
        {
          to: approvers,
          subject: `PROFO-bestelling te controleren - ${order.locatie_naam} - bestelling ${order.id}`,
          text: buildApprovalMailBody(order),
        },
        {
          to: String(order.besteller_email || ''),
          subject: `Bevestiging PROFO-bestelling ${order.id} - ter goedkeuring`,
          text: buildRequesterMailBody(order, lines, 'Je bestelling werd geregistreerd en doorgestuurd naar de bevoegde goedkeurder. Na goedkeuring krijgt aankoopbeheer de melding om de bestelling bij de leverancier in te voeren.'),
        },
      ],
    };
  }

  if (status === 'Goedgekeurd') {
    return {
      status: 'Goedgekeurd: melding verzonden naar aankoopbeheer en besteller',
      messages: [
        {
          to: beheerderMail,
          subject: `PROFO-bestelling goedgekeurd - invoeren bij leverancier - ${order.locatie_naam} - bestelling ${order.id}`,
          text: buildManagerMailBody(order),
        },
        {
          to: String(order.besteller_email || ''),
          subject: `PROFO-bestelling ${order.id} goedgekeurd`,
          text: buildRequesterMailBody(order, lines, 'Je bestelling werd goedgekeurd. Aankoopbeheer krijgt nu de melding om de bestelling bij de leverancier in te voeren.'),
        },
      ],
    };
  }

  if (status === 'Geweigerd') {
    return {
      status: 'Weigering verzonden naar besteller',
      messages: [
        {
          to: String(order.besteller_email || ''),
          subject: `PROFO-bestelling ${order.id} geweigerd`,
          text: buildRequesterMailBody(order, lines, 'Je bestelling werd gecontroleerd en geweigerd. Kijk in Aankoopbeheer bij de bestelling voor de beschikbare toelichting.'),
        },
      ],
    };
  }

  if (status === 'Extra informatie gevraagd') {
    return {
      status: 'Vraag om extra informatie verzonden naar besteller',
      messages: [
        {
          to: String(order.besteller_email || ''),
          subject: `PROFO-bestelling ${order.id} - extra informatie gevraagd`,
          text: buildRequesterMailBody(order, lines, 'De goedkeurder vraagt extra informatie voor deze bestelling. Vul de ontbrekende informatie aan of neem contact op met aankoopbeheer.'),
        },
      ],
    };
  }

  return {
    status: 'Statusmelding verzonden naar aankoopbeheer en besteller',
    messages: [
      {
        to: beheerderMail,
        subject: `PROFO-bestelling te verwerken - ${order.locatie_naam} - bestelling ${order.id}`,
        text: buildManagerMailBody(order),
      },
      {
        to: String(order.besteller_email || ''),
        subject: `Update PROFO-bestelling ${order.id} - ${order.locatie_naam}`,
        text: buildRequesterMailBody(order, lines, 'De status van je bestelling werd aangepast.'),
      },
    ],
  };
}

async function getApprovalRecipients(
  supabase: ReturnType<typeof createClient>,
  order: Record<string, unknown>,
  fallbackRecipients: string[],
) {
  const { data: scopes, error } = await supabase
    .from('aankoop_goedkeurder_scopes')
    .select('goedkeurder_id, scope_type, teamlid_id, locatie_id, actief')
    .eq('actief', true);

  if (error || !scopes?.length) {
    return fallbackRecipients;
  }

  const bestellerId = String(order.besteller_id ?? '');
  const aangemaaktDoorId = String(order.aangemaakt_door_id ?? '');
  const locatieId = String(order.locatie_id ?? '');

  const approverIds = [
    ...new Set(
      scopes
        .filter((scope) => {
          if (scope.scope_type === 'organisatie') {
            return true;
          }

          if (scope.scope_type === 'locatie') {
            return String(scope.locatie_id ?? '') === locatieId;
          }

          return [bestellerId, aangemaaktDoorId].includes(String(scope.teamlid_id ?? ''));
        })
        .map((scope) => scope.goedkeurder_id)
        .filter(Boolean),
    ),
  ];

  if (!approverIds.length) {
    return fallbackRecipients;
  }

  const { data: users, error: userError } = await supabase
    .from('gebruikers')
    .select('id, email, actief')
    .in('id', approverIds)
    .eq('actief', true);

  if (userError) {
    return fallbackRecipients;
  }

  const recipients = [
    ...new Set(
      (users ?? [])
        .map((user) => String(user.email || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  return recipients.length ? recipients : fallbackRecipients;
}

function buildApprovalMailBody(order: Record<string, unknown>) {
  return [
    'Dag,',
    '',
    'Er staat een PROFO-bestelling klaar om te controleren en goed te keuren of te weigeren.',
    '',
    `Bestelling: ${order.id}`,
    `Locatie: ${order.locatie_naam}`,
    `Besteller: ${order.besteller_naam} <${order.besteller_email}>`,
    `Totaal incl. btw: ${formatCurrency(order.totaal_incl_btw)}`,
    '',
    'Open Aankoopbeheer en ga naar Bestellingen om de aanvraag te beoordelen.',
    '',
    'PROFO Aankoopbeheer',
  ].join('\n');
}

function buildManagerMailBody(order: Record<string, unknown>) {
  return [
    'Dag Jorn,',
    '',
    'Er staat een goedgekeurde bestelling klaar voor verwerking in PROFO Aankoopbeheer.',
    '',
    `Bestelling: ${order.id}`,
    `Locatie: ${order.locatie_naam}`,
    `Besteller: ${order.besteller_naam} <${order.besteller_email}>`,
    `Totaal incl. btw: ${formatCurrency(order.totaal_incl_btw)}`,
    '',
    'Open de app en ga naar Bestellingen om de bestelling in te voeren bij het bestelplatform. Zet de bestelling daarna op Besteld.',
    '',
    'PROFO Aankoopbeheer',
  ].join('\n');
}

function buildRequesterMailBody(order: Record<string, unknown>, lines: Record<string, unknown>[], intro: string) {
  const rows = lines
    .map((line) => {
      return [
        `${line.aantal} x ${line.product_naam}`,
        `Eenheid: ${line.eenheid ?? '-'}`,
        `Totaal incl. btw: ${formatCurrency(line.lijn_totaal_incl_btw)}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    `Beste ${order.besteller_naam ?? 'collega'},`,
    '',
    intro,
    '',
    `Bestelling: ${order.id}`,
    `Locatie: ${order.locatie_naam}`,
    `Status: ${order.status}`,
    '',
    'Bestelregels:',
    rows,
    '',
    `Totaal incl. btw: ${formatCurrency(order.totaal_incl_btw)}`,
    '',
    order.opmerkingen ? `Opmerking: ${order.opmerkingen}` : 'Opmerking: geen',
    '',
    'Met vriendelijke groet,',
    'PROFO Aankoopbeheer',
  ].join('\n');
}

async function sendMail(options: {
  apiKey: string;
  from: string;
  to: string | string[];
  subject: string;
  text: string;
}) {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const to = recipients.map((recipient) => String(recipient || '').trim()).filter(Boolean);

  if (!to.length) {
    throw new Error('Er is geen geldig mailadres gevonden voor deze melding.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to,
      subject: options.subject,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mail kon niet worden verzonden via Resend. Controleer of MAIL_FROM bij een verified Resend-domein hoort en of SPF/DKIM/Return-Path correct gevalideerd zijn. Resend antwoordde: ${body}`);
  }
}

function normalizeStatus(status: unknown) {
  const value = String(status || 'Ter goedkeuring').trim();

  if (['Concept', 'Nieuw', 'Ingediend'].includes(value)) {
    return 'Ter goedkeuring';
  }

  if (value === 'In verwerking') {
    return 'In behandeling';
  }

  if (value === 'Besteld bij leverancier') {
    return 'Besteld';
  }

  if (value === 'Geannuleerd') {
    return 'Geweigerd';
  }

  return value;
}

function parseRecipients(value: string) {
  return value
    .split(/[;,]/)
    .map((recipient) => recipient.trim().toLowerCase())
    .filter(Boolean);
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
