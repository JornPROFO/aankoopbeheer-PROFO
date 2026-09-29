export const APP_ORIGIN = 'https://aankoopbeheer-profo.vercel.app';
export const DB_ORIGIN = 'https://rxkffollbimmsvwhucgd.supabase.co';
export function cartDecision(cart, line) {
  if (!Array.isArray(cart)) throw Error('Winkelwagen kon niet betrouwbaar worden gelezen. Controleer opnieuw; er is niets toegevoegd.');
  const same = cart.filter(r => r.article === line.article || r.url === line.url);
  if (!same.length) return {action:'add',before:0};
  if (same.length !== 1 || same[0].article !== line.article || same[0].url !== line.url || same[0].title !== line.title) return {action:'skip',reason:'Artikel of variant in de bestaande winkelwagen wijkt af.'};
  if (same[0].quantity === Number(line.aantal)) return {action:'keep',before:same[0].quantity};
  return {action:'skip',before:same[0].quantity,reason:`Dit artikel staat al met aantal ${same[0].quantity} in de winkelwagen. Gewenst: ${line.aantal}. Controleer eerst bij welke bestelling het hoort; het bestaande aantal blijft behouden.`};
}
export function unchangedOthers(before, after, article) {
  if (!Array.isArray(before) || !Array.isArray(after)) return false;
  const key = rows => JSON.stringify(rows.filter(r=>r.article !== article).map(r=>[r.article,r.url,r.quantity]).sort());
  return key(before) === key(after);
}
export function sameSnapshot(a,b) {
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])) : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
