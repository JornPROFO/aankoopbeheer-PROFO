import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { corsHeaders, HttpError, json, requireActiveUser } from '../_shared/security.ts';
import { signReceiptLink, receiptEmail } from '../_shared/receipt-link.ts';

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
      || !['vragen', 'herinneren', 'bevestigen'].includes(body.actie)) throw new HttpError('Ongeldige aanvraag.', 400);
    // Actor comes exclusively from the verified sign-in, never from request JSON.
    if (body.actie === 'bevestigen') {
      const { data, error } = await client.rpc('aankoop_ontvangst_verwerken', {
        p_bestelling_id: body.bestelling_id, p_actor_id: user.id, p_actie: body.actie,
        p_request_id: body.request_id || null, p_updated_at: body.updated_at || null,
        p_aantallen: body.aantallen || null, p_opmerking: body.opmerking || '',
      });
      if (error) throw new HttpError(error.message, error.code === '42501' ? 403 : 409);
      return json(req, { ok: true, bevestiging: data });
    }
    const key = Deno.env.get('RESEND_API_KEY');
    if (!key) throw new HttpError('De mailfunctie is niet geconfigureerd. De ontvangstmail is niet verstuurd.', 503);
    const secret = Deno.env.get('RECEIPT_LINK_SECRET') || '';
    if (secret.length < 32) throw new HttpError('Ontvangstlinks zijn nog niet geconfigureerd.', 503);
    const { data, error } = await client.rpc('aankoop_ontvangst_mail_voorbereiden', {
      p_bestelling_id:body.bestelling_id,p_actor_id:user.id,
      p_request_id:body.request_id || crypto.randomUUID(),p_herinnering:body.actie==='herinneren',
    });
    if (error) throw new HttpError(error.message,error.code==='42501'?403:409);
    if (data.alreadySent) return json(req,{ok:true,alreadySent:true});
    const message=receiptEmail(data,await signReceiptLink(data.mail_poging_id,secret));
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `ontvangst-${data.mail_poging_id}` },
      body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'PROFO Aankoopbeheer <aankoopbeheer@meldingen.profo.be>',
        to: [data.mail_inhoud.email], ...message }),
    });
    const mail = await response.json();
    if (!response.ok) throw new HttpError('De ontvangstvraag staat in de app, maar de e-mail kon niet worden verzonden. Probeer opnieuw.', 502);
    const { error: saveError } = await client.rpc('aankoop_ontvangst_mail_verzonden',{
      p_poging_id:data.mail_poging_id,p_mail_id:mail.id,
    });
    if (saveError) throw new HttpError('E-mail aanvaard; verzendregistratie mislukt. Probeer opnieuw om de registratie te herstellen.', 502);
    return json(req, { ok: true });
  } catch (error) {
    return json(req, { error: error instanceof HttpError ? error.message : 'De ontvangstactie kon niet worden verwerkt.' },
      error instanceof HttpError ? error.status : 500);
  }
});
