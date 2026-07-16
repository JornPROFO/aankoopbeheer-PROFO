import { supabase } from '../config/supabase.js';

const orderSelect = `
  id,
  created_at,
  status,
  locatie_id,
  locatie_naam,
  besteller_id,
  besteller_naam,
  besteller_email,
  aangemaakt_door_id,
  aangemaakt_door_email,
  opmerkingen,
  totaal_excl_btw,
  totaal_btw,
  totaal_incl_btw,
  mail_status,
  mail_verzonden_op
`;

export async function getActiveUserByEmail(email) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const { data, error } = await supabase
    .from('gebruikers')
    .select('id,naam,email,functie,rol,actief')
    .ilike('email', normalizedEmail)
    .eq('actief', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function loadAankoopData({ includeInactiveProducts = false } = {}) {
  const productsQuery = supabase
    .from('aankoop_producten')
    .select('*')
    .order('categorie', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('naam', { ascending: true });

  if (!includeInactiveProducts) {
    productsQuery.eq('actief', true);
  }

  const printersQuery = supabase
    .from('aankoop_printers')
    .select('*')
    .order('locatie_naam', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('naam', { ascending: true });

  const cartridgesQuery = supabase
    .from('aankoop_printer_cartridges')
    .select('*')
    .order('printer_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('kleur', { ascending: true });

  if (!includeInactiveProducts) {
    printersQuery.eq('actief', true);
    cartridgesQuery.eq('actief', true);
  }

  const [products, printers, cartridges, users, locations, orders, notifications] = await Promise.all([
    run(productsQuery),
    run(printersQuery),
    run(cartridgesQuery),
    run(
      supabase
        .from('gebruikers')
        .select('id,naam,email,functie,rol,actief')
        .eq('actief', true)
        .order('naam', { ascending: true }),
    ),
    run(
      supabase
        .from('locaties')
        .select('*')
        .eq('actief', true)
        .order('naam', { ascending: true }),
    ),
    getOrders(),
    getNotifications(),
  ]);

  return {
    products,
    printers,
    cartridges,
    users,
    locations,
    orders,
    notifications,
  };
}

export async function getNotifications() {
  try {
    return await run(
      supabase
        .from('aankoop_meldingen')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60),
    );
  } catch (error) {
    if (isMissingNotificationsTable(error)) {
      return [];
    }

    throw error;
  }
}

export async function getOrders() {
  const orders = await run(
    supabase
      .from('aankoop_bestellingen')
      .select(orderSelect)
      .order('created_at', { ascending: false })
      .limit(80),
  );

  if (!orders.length) {
    return [];
  }

  const lines = await run(
    supabase
      .from('aankoop_bestelregels')
      .select('*')
      .in(
        'bestelling_id',
        orders.map((order) => order.id),
      )
      .order('id', { ascending: true }),
  );

  const linesByOrder = lines.reduce((map, line) => {
    const group = map.get(line.bestelling_id) ?? [];
    group.push(line);
    map.set(line.bestelling_id, group);
    return map;
  }, new Map());

  return orders.map((order) => ({
    ...order,
    regels: linesByOrder.get(order.id) ?? [],
  }));
}

export async function createOrder(orderPayload, linePayloads) {
  const { data: order, error: orderError } = await supabase
    .from('aankoop_bestellingen')
    .insert(orderPayload)
    .select(orderSelect)
    .single();

  if (orderError) {
    throw orderError;
  }

  const lines = linePayloads.map((line) => ({
    ...line,
    bestelling_id: order.id,
  }));

  const { error: linesError } = await supabase.from('aankoop_bestelregels').insert(lines);

  if (linesError) {
    throw linesError;
  }

  return order;
}

export async function createNotification(payload) {
  const { data, error } = await supabase.rpc('aankoop_melding_toevoegen', {
    p_gebruiker_id: payload.gebruiker_id,
    p_bestelling_id: payload.bestelling_id ?? null,
    p_type: payload.type,
    p_titel: payload.titel,
    p_boodschap: payload.boodschap,
    p_actie_url: payload.actie_url ?? '#bestellingen',
  });

  if (error) {
    if (isMissingNotificationsTable(error)) {
      return null;
    }

    throw error;
  }

  return data ?? null;
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('aankoop_meldingen')
    .update({ gelezen_op: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    if (isMissingNotificationsTable(error)) {
      return;
    }

    throw error;
  }
}

export async function savePushSubscription(payload) {
  const { data, error } = await supabase.rpc('aankoop_push_abonnement_opslaan', {
    p_endpoint: payload.endpoint,
    p_p256dh: payload.p256dh,
    p_auth: payload.auth,
    p_user_agent: payload.user_agent ?? null,
    p_platform: payload.platform ?? null,
  });

  if (error) {
    if (isMissingPushSupport(error)) {
      return null;
    }

    throw error;
  }

  return data ?? null;
}

export async function disablePushSubscription(endpoint) {
  const { error } = await supabase.rpc('aankoop_push_abonnement_deactiveren', {
    p_endpoint: endpoint,
  });

  if (error) {
    if (isMissingPushSupport(error)) {
      return;
    }

    throw error;
  }
}

export async function sendPushNotification(notificationId) {
  const { data, error } = await supabase.functions.invoke('send-aankoop-push', {
    body: {
      melding_id: notificationId,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  return data ?? null;
}

export async function invokeOrderMail(orderId) {
  const { data, error } = await supabase.functions.invoke('send-aankoopbestelling', {
    body: {
      bestelling_id: orderId,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  return data ?? null;
}

async function getFunctionErrorMessage(error) {
  const response = error.context;

  if (response && typeof response.clone === 'function') {
    try {
      const body = await response.clone().json();

      if (body?.error) {
        return body.error;
      }

      return JSON.stringify(body);
    } catch {
      try {
        const text = await response.clone().text();

        if (text) {
          return text;
        }
      } catch {
        // Gebruik de standaardmelding hieronder.
      }
    }
  }

  return error.message || 'De automatische mailfunctie gaf een fout terug.';
}

function isMissingNotificationsTable(error) {
  const message = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '');
  return code === '42P01' || code === '42883' || message.includes('aankoop_meldingen') || message.includes('aankoop_melding_toevoegen');
}

function isMissingPushSupport(error) {
  const message = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '');
  return code === '42P01'
    || code === '42883'
    || message.includes('aankoop_push_abonnementen')
    || message.includes('aankoop_push_abonnement_opslaan')
    || message.includes('aankoop_push_abonnement_deactiveren');
}

export async function saveProduct(payload, id = null) {
  const request = id
    ? supabase.from('aankoop_producten').update(payload).eq('id', id)
    : supabase.from('aankoop_producten').insert(payload);

  const { data, error } = await request.select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function disableProduct(id) {
  const { error } = await supabase
    .from('aankoop_producten')
    .update({ actief: false })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function savePrinter(payload, id = null) {
  const request = id
    ? supabase.from('aankoop_printers').update(payload).eq('id', id)
    : supabase.from('aankoop_printers').insert(payload);

  const { data, error } = await request.select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function disablePrinter(id) {
  const { error } = await supabase
    .from('aankoop_printers')
    .update({ actief: false })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function saveInkCartridge(payload, id = null) {
  const request = id
    ? supabase.from('aankoop_printer_cartridges').update(payload).eq('id', id)
    : supabase.from('aankoop_printer_cartridges').insert(payload);

  const { data, error } = await request.select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function disableInkCartridge(id) {
  const { error } = await supabase
    .from('aankoop_printer_cartridges')
    .update({ actief: false })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function updateOrderStatus(id, status, actor = {}) {
  const { data, error } = await supabase
    .from('aankoop_bestellingen')
    .update({ status })
    .eq('id', id)
    .select(orderSelect)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('De status kon niet worden aangepast. De bestelling werd niet gevonden of je hebt onvoldoende rechten voor deze wijziging.');
  }

  try {
    await supabase.from('aankoop_bestelling_statuslog').insert({
      bestelling_id: id,
      status,
      actor_naam: actor.actorName || '',
      actor_email: actor.actorEmail || '',
    });
  } catch {
    // De statuswijziging zelf blijft leidend. De logtabel kan via de optionele SQL worden toegevoegd.
  }

  return data;
}

export async function updateOrderDeliveryStatus(id, { status, opmerkingen }, actor = {}) {
  const { data, error } = await supabase
    .from('aankoop_bestellingen')
    .update({ status, opmerkingen })
    .eq('id', id)
    .select(orderSelect)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('De leveringsstatus kon niet worden aangepast. De bestelling werd niet gevonden of je hebt onvoldoende rechten voor deze wijziging.');
  }

  try {
    await supabase.from('aankoop_bestelling_statuslog').insert({
      bestelling_id: id,
      status,
      actor_naam: actor.actorName || '',
      actor_email: actor.actorEmail || '',
    });
  } catch {
    // De statuswijziging zelf blijft leidend. De logtabel kan via de optionele SQL worden toegevoegd.
  }

  return data;
}

export async function updateOrderMailStatus(id, mailStatus) {
  const { error } = await supabase
    .from('aankoop_bestellingen')
    .update({ mail_status: mailStatus })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

async function run(request) {
  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return data ?? [];
}
