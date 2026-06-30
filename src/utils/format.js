export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function getFirstValue(row, fields) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
}

export function getUserLabel(user) {
  return getFirstValue(user, ['naam', 'volledige_naam', 'display_name', 'email']) || `Gebruiker ${user?.id ?? ''}`;
}

export function getLocationLabel(location) {
  const name = getFirstValue(location, ['naam', 'locatie', 'gemeente', 'adres']);
  const address = getFirstValue(location, ['adres']);
  return [name, address && address !== name ? address : ''].filter(Boolean).join(' - ') || `Locatie ${location?.id ?? ''}`;
}

export function getUserRole(user) {
  return getFirstValue(user, ['rol', 'role']) || 'Gebruiker';
}

const beheerderEmails = new Set(['jorn.neeus@profo.be', 'kathleen.nerinckx@profo.be']);

export function isAdminUser(user, sessionEmail = '') {
  const email = String(user?.email || sessionEmail || '').trim().toLowerCase();
  return beheerderEmails.has(email);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) {
    return 'Nog niet gekend';
  }

  return new Intl.DateTimeFormat('nl-BE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function parseDecimal(value) {
  const normalized = String(value ?? '').replace(',', '.').trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
