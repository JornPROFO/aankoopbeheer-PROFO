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
