import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { corsHeaders, HttpError } from '../_shared/security.ts';
import { verifyReceiptLink } from '../_shared/receipt-link.ts';

// Separate capability endpoint: no session, no general order access, no mail send.
serve(async (req) => {
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{
    ...corsHeaders(req),'Content-Type':'application/json','Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
  }});
  if (req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders(req)});
  if (req.method!=='POST') return reply({error:'Gebruik POST.'},405);
  try {
    const raw=await req.text();
    if (raw.length>16000) throw new HttpError('Aanvraag is te groot.',413);
    const body=JSON.parse(raw);
    if (!['bekijken','bevestigen'].includes(body.actie)) throw new HttpError('Ongeldige aanvraag.',400);
    const id=await verifyReceiptLink(body.token,Deno.env.get('RECEIPT_LINK_SECRET') || '');
    if (!id) throw new HttpError('Deze ontvangstlink is ongeldig. Gebruik de volledige link uit de meest recente mail.',403);
    const client=createClient(Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '',
      {auth:{persistSession:false}});
    const {data,error}=await client.rpc('aankoop_ontvangst_via_link',{
      p_poging_id:id,p_actie:body.actie,p_request_id:body.request_id || null,
      p_updated_at:body.updated_at || null,p_aantallen:body.aantallen || null,p_opmerking:body.opmerking || '',
    });
    if (error) throw new HttpError(error.message,error.code==='42501'?403:409);
    return reply(data);
  } catch(error) {
    return reply({error:error instanceof HttpError?error.message:'De ontvangst kon niet worden verwerkt. Probeer opnieuw.'},
      error instanceof HttpError?error.status:400);
  }
});
