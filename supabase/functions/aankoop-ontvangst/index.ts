import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { corsHeaders, HttpError, json, requireActiveUser } from '../_shared/security.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Gebruik POST.' }, 405);
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } });
    const user = await requireActiveUser(req, client);
    const body = await req.json();
    if (!Number.isSafeInteger(Number(body.bestelling_id)) || Number(body.bestelling_id) < 1
      || !['vragen', 'bevestigen'].includes(body.actie)) throw new HttpError('Ongeldige aanvraag.', 400);
    // Actor comes exclusively from the verified sign-in, never from request JSON.
    const { data, error } = await client.rpc('aankoop_ontvangst_verwerken', {
      p_bestelling_id: body.bestelling_id, p_actor_id: user.id, p_actie: body.actie,
      p_request_id: body.request_id || null, p_updated_at: body.updated_at || null,
      p_aantallen: body.aantallen || null, p_opmerking: body.opmerking || '',
    });
    if (error) throw new HttpError(error.message, error.code === '42501' ? 403 : 409);
    if (body.actie === 'bevestigen') return json(req, { ok: true, bevestiging: data });
    if (data.mail_verzonden_op) return json(req, { ok: true, alreadySent: true });
    const { data: order, error: orderError } = await client.from('aankoop_bestellingen')
      .select('id,besteller_id,besteller_naam,locatie_naam,opmerkingen').eq('id', body.bestelling_id).single();
    if (orderError) throw orderError;
    const { data: recipient, error: recipientError } = await client.from('gebruikers')
      .select('email').eq('id', order.besteller_id).eq('actief', true).single();
    if (recipientError || !recipient.email) throw new HttpError('Geen actieve besteller met e-mailadres gevonden.', 409);
    const key = Deno.env.get('RESEND_API_KEY');
    if (!key) throw new HttpError('De ontvangstvraag is opgeslagen, maar de mailfunctie is niet geconfigureerd.', 503);
    const url = `https://aankoopbeheer-profo.vercel.app/#bestellingen?ontvangst=${order.id}`;
    const expected = String(order.opmerkingen || '').match(/(?:^|\n)Verwachte leverdatum:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    const text = [
      `Dag ${order.besteller_naam},`, '',
      `Je bestelling ${order.id} voor ${order.locatie_naam} is bij de leverancier geplaatst.`,
      expected ? `De verwachte leverdatum is ${expected.split('-').reverse().join('/')}.` : '', '',
      'Wil je zodra de spullen aankomen de ontvangst bevestigen in Aankoopbeheer?',
      'Je kunt de volledige levering bevestigen of per artikel invullen hoeveel verpakkingen je tot nu toe hebt ontvangen. Ontbrekende artikelen blijven open voor opvolging.',
      'Als er nog niets geleverd is, hoef je nog niets te bevestigen. Na een gedeeltelijke levering kun je dezelfde link opnieuw gebruiken voor een nalevering.', '',
      `Open je bestelling en meld je aan met je PROFO-account: ${url}`, '',
      'Aankoopbeheer krijgt je bevestiging rechtstreeks in de app.', '', 'Bedankt voor de opvolging.', 'PROFO Aankoopbeheer',
    ].filter((line) => line !== undefined).join('\n');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `ontvangst-${data.id}` },
      body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'PROFO Aankoopbeheer <aankoopbeheer@meldingen.profo.be>',
        to: [recipient.email], subject: `Bevestig de ontvangst - bestelling ${order.id} - ${order.locatie_naam}`, text }),
    });
    const mail = await response.json();
    if (!response.ok) throw new HttpError('De ontvangstvraag staat in de app, maar de e-mail kon niet worden verzonden. Probeer opnieuw.', 502);
    const { error: saveError } = await client.from('aankoop_ontvangstverzoeken').update({
      mail_verzonden_op: new Date().toISOString(), mail_id: mail.id,
    }).eq('bestelling_id', order.id).eq('id', data.id);
    if (saveError) throw new HttpError('E-mail aanvaard; verzendregistratie mislukt. Probeer opnieuw om de registratie te herstellen.', 502);
    return json(req, { ok: true });
  } catch (error) {
    return json(req, { error: error instanceof HttpError ? error.message : 'De ontvangstactie kon niet worden verwerkt.' },
      error instanceof HttpError ? error.status : 500);
  }
});
