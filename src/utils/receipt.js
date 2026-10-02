export function canConfirmReceipt(order, userId) {
  return Boolean(userId) && String(order.besteller_id) === String(userId)
    && ['Besteld', 'Besteld bij leverancier', 'Gedeeltelijk geleverd'].includes(order.status);
}

export function receiptLines(order) {
  return (order.regels || []).filter((line) => line.leverstatus !== 'geannuleerd');
}

export function validateReceipt(order, quantities) {
  const lines = receiptLines(order);
  if (!lines.length || Object.keys(quantities).length !== lines.length) throw new Error('Controleer de ontvangen artikelen.');
  let total = 0;
  for (const line of lines) {
    const n = quantities[line.id];
    const previous = Number(order.ontvangst?.aantallen?.[line.id] || 0);
    if (!Number.isSafeInteger(n) || n < previous || n < 0 || n > Number(line.aantal)) {
      throw new Error(`Vul voor ${line.product_naam} het totaal ontvangen aantal in, tussen ${previous} en ${line.aantal}.`);
    }
    total += n;
  }
  if (!total) throw new Error('Er is nog niets ontvangen. Bevestig de ontvangst zodra de eerste spullen geleverd zijn.');
  return quantities;
}

export function receiptRoute(hash) {
  const [route, query] = hash.replace(/^#/, '').split('?');
  const id = new URLSearchParams(query || '').get('ontvangst');
  return route === 'bestellingen' && /^\d+$/.test(id || '') ? id : null;
}

// Keep the baseline and version frozen while editing/retrying a receipt.
// A lost response must never turn the same delivery into another increment.
export function receiptDraft(order, values = {}, previous = {}) {
  return { ...previous, ...values,
    __baseline: previous.__baseline || { ...order.ontvangst?.aantallen },
    __version: previous.__version ?? order.updated_at,
  };
}

export function receiptTotals(order, draft) {
  const baseline = draft.__baseline || order.ontvangst?.aantallen || {};
  let added = 0;
  const totals = Object.fromEntries(receiptLines(order).map(line => {
    const raw = draft['receipt-' + line.id];
    const amount = raw === '' || raw == null ? NaN : Number(raw);
    const before = Number(baseline[line.id] || 0);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > Number(line.aantal) - before)
      throw new Error(`Vul voor ${line.product_naam} het vandaag ontvangen aantal in, tussen 0 en ${Number(line.aantal) - before}.`);
    added += amount;
    return [line.id, before + amount];
  }));
  if (!added) throw new Error('Er zijn geen nieuwe verpakkingen ingevuld. Bevestig zodra er iets geleverd is.');
  return validateReceipt({ ...order, ontvangst: { aantallen: baseline } }, totals);
}
