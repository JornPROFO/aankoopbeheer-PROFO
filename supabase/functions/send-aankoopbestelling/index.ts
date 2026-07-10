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
    const mailFrom = Deno.env.get('MAIL_FROM') ?? 'PROFO Aankoopbeheer <aankoopbeheer@profo.be>';
    const beheerderMail = Deno.env.get('AANKOOPBEHEER_MAIL_TO') ?? 'jorn.neeus@profo.be';

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

    const managerSubject = `Nieuwe PROFO-bestelling te verwerken - ${order.locatie_naam} - bestelling ${order.id}`;
    const requesterSubject = `Bevestiging PROFO-bestelling ${order.id} - ${order.locatie_naam}`;

    await sendMail({
      apiKey: resendApiKey,
      from: mailFrom,
      to: beheerderMail,
      subject: managerSubject,
      text: buildManagerMailBody(order),
    });

    await sendMail({
      apiKey: resendApiKey,
      from: mailFrom,
      to: order.besteller_email,
      subject: requesterSubject,
      text: buildRequesterMailBody(order, lines ?? []),
    });

    await supabase
      .from('aankoop_bestellingen')
      .update({
        mail_status: 'Verzonden naar beheerder en besteller',
        mail_verzonden_op: new Date().toISOString(),
      })
      .eq('id', bestelling_id);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message ?? String(error) }, 500);
  }
});

function buildManagerMailBody(order: Record<string, unknown>) {
  return [
    'Dag Jorn,',
    '',
    'Er staat een nieuwe bestelling klaar voor verwerking in PROFO Aankoopbeheer.',
    '',
    `Bestelling: ${order.id}`,
    `Locatie: ${order.locatie_naam}`,
    `Besteller: ${order.besteller_naam} <${order.besteller_email}>`,
    `Totaal incl. btw: ${formatCurrency(order.totaal_incl_btw)}`,
    '',
    'Open de app en ga naar Bestellingen om de bestelling verder te verwerken en in te voeren bij het bestelplatform.',
    '',
    'PROFO Aankoopbeheer',
  ].join('\n');
}

function buildRequesterMailBody(order: Record<string, unknown>, lines: Record<string, unknown>[]) {
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
    'Je bestelling werd geregistreerd via PROFO Aankoopbeheer.',
    'Jorn ontvangt hiervan een aparte melding om de bestelling verder te verwerken bij het bestelplatform.',
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
  to: string;
  subject: string;
  text: string;
}) {
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
    const body = await response.text();
    throw new Error(`Mail kon niet worden verzonden via Resend. Controleer of MAIL_FROM bij een verified Resend-domein hoort en of SPF/DKIM/Return-Path correct gevalideerd zijn. Resend antwoordde: ${body}`);
  }
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
