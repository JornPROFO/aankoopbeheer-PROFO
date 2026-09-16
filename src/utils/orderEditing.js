const editableStatuses = new Set([
  'Concept', 'Nieuw', 'Ingediend', 'Ter goedkeuring', 'Extra informatie gevraagd',
  'In behandeling', 'In verwerking', 'Goedgekeurd',
]);

export function canEditOrderLines(order, admin) {
  return Boolean(admin && order && editableStatuses.has(order.status)
    && !/^Besteld op:\s*\S/im.test(String(order.opmerkingen ?? '')));
}

export function validateOrderLineQuantity(value, step = 1) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 10000
    && Number.isInteger(step) && step > 0 && quantity % step === 0;
}
