// Supplier adapters deliberately support navigation only, never cart mutations.
export const suppliers = Object.freeze({
  '123inkt.be': { home: 'https://www.123inkt.be/', cart: 'https://www.123inkt.be/shoppingcart.html' },
  '123schoon.nl': { home: 'https://www.123schoon.nl/', cart: 'https://www.123schoon.nl/shoppingcart.html' },
});
export function canUseSupplierCart(user, sessionEmail) {
  const email = String(sessionEmail || '').trim().toLowerCase();
  return user?.actief === true && ['jorn.neeus@profo.be', 'kathleen.nerinckx@profo.be'].includes(email)
    && String(user.email || '').trim().toLowerCase() === email;
}
export const outcomes = Object.freeze({
  toegevoegd: 'Toegevoegd', reeds_aanwezig: 'Reeds aanwezig', aantal_aangepast: 'Aantal aangepast',
  onzeker: 'Onzeker', mislukt: 'Mislukt',
});
export const reasons = Object.freeze({
  gecontroleerd: 'Exact artikel, variant, verpakking en aantal handmatig gecontroleerd in de winkelwagen',
  niet_gevonden: 'Artikelnummer niet gevonden', verpakking: 'Verpakking of variant wijkt af',
  niet_beschikbaar: 'Exact product niet beschikbaar', identificatie: 'Productidentificatie ontbreekt of is tegenstrijdig',
  onderbroken: 'Onderbroken; winkelwagen opnieuw controleren', technisch: 'Leverancierspagina werkt niet of vraagt aanmelding/CAPTCHA',
  andere_bestelling: 'Artikel in winkelwagen behoort mogelijk tot een andere bestelling',
});
export function parseReference(value) {
  const raw = String(value || '').trim();
  try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object') return { article: String(parsed.artikelnummer || '').trim(), url: String(parsed.url || '').trim() }; } catch { /* Legacy format. */ }
  return /^https?:/i.test(raw) ? { article: '', url: raw } : { article: raw, url: '' };
}
export function safeProductUrl(raw, supplier) {
  try {
    const url = new URL(raw);
    if (!suppliers[supplier] || ![supplier, `www.${supplier}`].includes(url.hostname) || url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash) return '';
    // Only observed product-detail routes. Reject categories, actions and checkout.
    if (!/^\/[A-Za-z0-9%_-]+-i\d+(?:-t\d+)?\.html$/.test(url.pathname)) return '';
    return url.href;
  } catch { return ''; }
}
export function prepareLines(snapshot) {
  const rows = (snapshot.lines || []).map(line => {
    let ref = parseReference(line.leverancier_url);
    // Ink lines already snapshot these explicit fields in the description.
    // Never infer a supplier or product from a similar product name.
    if (!line.product_id && !line.leverancier_url) {
      const description = String(line.product_omschrijving || '');
      ref = {
        article: description.match(/ - art\. ([a-z0-9._/-]+)(?: - |$)/i)?.[1] || '',
        url: description.match(/ - link: (https:\/\/\S+)$/)?.[1] || '',
      };
    }
    let host = '';
    try { host = new URL(ref.url).hostname.replace(/^www\./, ''); } catch { /* No link. */ }
    const declared = String(line.leverancier || '').trim().toLowerCase().replace(/^www\./, '');
    const supplier = suppliers[declared] ? declared : suppliers[host] ? host : '';
    const url = safeProductUrl(ref.url, supplier);
    const article = /^[a-z0-9][a-z0-9._/-]{0,79}$/i.test(ref.article) ? ref.article : '';
    let issue = '';
    if (!supplier) issue = 'Geen eenduidige koppeling met 123inkt.be of 123schoon.nl.';
    else if ((declared && declared !== supplier) || (ref.url && !url)) issue = 'Leverancier of productlink wijkt af. Geen landdomeinen of producten automatisch vervangen.';
    else if (!article && !url) issue = 'Betrouwbare productidentificatie ontbreekt.';
    else if (!line.eenheid || (line.catalogus_eenheid && line.catalogus_eenheid !== line.eenheid)) issue = 'Verpakking ontbreekt of verschilt van de huidige catalogus.';
    else if (line.catalogus_naam && line.catalogus_naam !== line.product_naam) issue = 'Productnaam is gewijzigd sinds de aanvraag; controleer de productidentiteit.';
    else if (!Number.isSafeInteger(Number(line.aantal)) || Number(line.aantal) < 1) issue = 'Ongeldig aantal.';
    return { ...line, supplier, article, url: issue ? '' : url, issue };
  });
  // The same supplier article on multiple lines needs human allocation, never double-add.
  const keys = rows.map(row => row.supplier && (row.article || row.url) ? `${row.supplier}:${row.article || row.url}` : '');
  return rows.map((row, i) => keys[i] && keys.indexOf(keys[i]) !== keys.lastIndexOf(keys[i])
    ? { ...row, issue: 'Dit artikel komt meermaals voor. Bepaal eerst het gezamenlijke aantal en de verdeling.', url: '' } : row);
}
export function hasSupportedSupplier(order, products) {
  const lines = (order.regels || []).map(line => {
    const product = products.find(item => String(item.id) === String(line.product_id));
    return { ...line, leverancier: product?.leverancier, leverancier_url: product?.leverancier_url };
  });
  return prepareLines({ lines }).some(line => Boolean(line.supplier));
}
export function latestResults(events) {
  return new Map([...events].sort((a, b) => Number(a.id) - Number(b.id)).map(event => [String(event.regel_id), event]));
}
export function cartSummary(lines, events) {
  const latest = latestResults(events);
  const complete = lines.filter(line => ['toegevoegd', 'reeds_aanwezig', 'aantal_aangepast'].includes(latest.get(String(line.id))?.resultaat)).length;
  return { complete, total: lines.length, label: complete === lines.length && complete > 0 ? 'Winkelwagen gevuld — handmatig bevestigd' : complete ? 'Gedeeltelijk verwerkt — controle nodig' : 'Nog niet volledig gecontroleerd' };
}
