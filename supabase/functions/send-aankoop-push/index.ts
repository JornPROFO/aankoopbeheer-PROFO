import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import webPush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { melding_id } = await req.json();

    if (!melding_id) {
      return json({ error: 'melding_id ontbreekt.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const vapidPublicKey = Deno.env.get('PUSH_VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('PUSH_VAPID_PRIVATE_KEY') ?? '';
    const vapidSubject = Deno.env.get('PUSH_VAPID_SUBJECT') ?? 'mailto:jorn.neeus@profo.be';

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return json({ error: 'Pushfunctie is nog niet volledig geconfigureerd. Controleer SUPABASE_URL, SERVICE_ROLE_KEY, PUSH_VAPID_PUBLIC_KEY en PUSH_VAPID_PRIVATE_KEY in de Supabase Edge Function secrets.' }, 500);
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: notification, error: notificationError } = await supabase
      .from('aankoop_meldingen')
      .select('id, gebruiker_id, bestelling_id, type, titel, boodschap, actie_url')
      .eq('id', melding_id)
      .single();

    if (notificationError) {
      throw notificationError;
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('aankoop_push_abonnementen')
      .select('id, endpoint, p256dh, auth')
      .eq('gebruiker_id', notification.gebruiker_id)
      .eq('actief', true);

    if (subscriptionError) {
      throw subscriptionError;
    }

    const payload = JSON.stringify({
      title: notification.titel || 'PROFO Aankoopbeheer',
      body: notification.boodschap || 'Er is een nieuwe melding in Aankoopbeheer.',
      url: notification.actie_url || '/#start',
      notificationId: notification.id,
      tag: `aankoop-melding-${notification.id}`,
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions ?? []) {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        await handlePushError(supabase, subscription.id, error);
      }
    }

    return json({ ok: true, sent, failed });
  } catch (error) {
    return json({ error: error.message ?? String(error) }, 500);
  }
});

async function handlePushError(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: number,
  error: unknown,
) {
  const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);
  const message = error instanceof Error ? error.message : String(error);
  const update: Record<string, unknown> = {
    laatste_fout_op: new Date().toISOString(),
    laatste_fout: message.slice(0, 500),
  };

  if (statusCode === 404 || statusCode === 410) {
    update.actief = false;
  }

  await supabase
    .from('aankoop_push_abonnementen')
    .update(update)
    .eq('id', subscriptionId);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
