// Supplier HTML is data, never executable code. No model or external AI service is used.
export const APP = 'https://aankoopbeheer-profo.vercel.app';
const HOSTS = new Set(['www.123inkt.be', 'www.123inkt.nl', 'www.123schoon.nl', 'www.ehbo-koffer.be', 'discountoffice.be', 'static.discountoffice.cloud', 'aankoopbeheer-profo.vercel.app']);
export const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function decode(value) {
  return String(value ?? '').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
function attrs(tag) { return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(m => [m[1].toLowerCase(), decode(m[3])])); }
export function catalogLink(value) {
  try { const v = JSON.parse(value); if (v && typeof v === 'object') return { url: v.url || '', sku: v.artikelnummer || '' }; } catch {}
  return { url: value || '', sku: '' };
}
export function checkedUrl(value, base = APP) {
  const u = new URL(value, base);
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname) || u.username || u.password || (u.port && u.port !== '443')) throw new Error('Niet-toegestane leverancier of afbeeldingshost.');
  return u;
}
function products(value) {
  if (Array.isArray(value)) return value.flatMap(products);
  if (!value || typeof value !== 'object') return [];
  return [value['@type'] === 'Product' || value['@type']?.includes?.('Product') ? value : null, ...Object.values(value).filter(v => v && typeof v === 'object').flatMap(products)].filter(Boolean);
}
export function parseSource(html, finalUrl) {
  const u = checkedUrl(finalUrl); let result;
  if (/www\.123(inkt|schoon)\./.test(u.hostname)) {
    const productId = u.pathname.match(/-i(\d+)\.html$/)?.[1];
    if (!productId) throw new Error('Geen rechtstreekse productpagina.');
    const models = [...html.matchAll(/data-product-model\s*=\s*(["'])([\s\S]*?)\1/g)].map(m => { try { return JSON.parse(decode(m[2])); } catch { return null; } });
    const model = models.find(m => String(m?.productId) === productId);
    if (!model?.productCode || !model.name) throw new Error('Artikelidentiteit ontbreekt op de leverancierspagina.');
    const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => attrs(m[0])).filter(a => a.src && decodeURIComponent(a.src).includes(`_${model.productCode}_`));
    const img = images.find(a => /_big\./.test(a.src)) || images.find(a => /_medium\./.test(a.src));
    result = { sku: String(model.productCode), name: decode(model.name), source_id: productId, image: img ? new URL(img.src, u).href : '', variant: {}, available: model.orderable !== false };
  } else {
    const nodes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m => attrs(m[1]).type === 'application/ld+json').flatMap(m => { try { return products(JSON.parse(m[2])); } catch { return []; } });
    const product = nodes.find(p => { try { return new URL(p.url || p['@id'] || (Array.isArray(p.offers) ? p.offers[0]?.url : p.offers?.url)).pathname === u.pathname; } catch { return false; } });
    if (!product?.name || !product.sku) throw new Error('Geen eenduidige artikelgegevens gevonden.');
    let sku = String(product.sku); let variantAvailable = true; const variant = Object.fromEntries([...u.searchParams].filter(([k]) => k.startsWith('attribute_')));
    if (Object.keys(variant).length) {
      const form = [...html.matchAll(/<form\b[^>]*>/gi)].map(m => attrs(m[0])).find(a => a['data-product_variations']);
      let variations; try { variations = JSON.parse(form?.['data-product_variations'] || '[]'); } catch { variations = []; }
      const matches = variations.filter(v => JSON.stringify(Object.entries(v.attributes || {}).sort()) === JSON.stringify(Object.entries(variant).sort()));
      if (matches.length !== 1 || !matches[0].sku) throw new Error('De opgegeven variant is niet eenduidig beschikbaar.');
      sku = String(matches[0].sku);
      variantAvailable = matches[0].is_in_stock !== false && matches[0].is_purchasable !== false && matches[0].variation_is_active !== false;
    }
    const image = Array.isArray(product.image) ? product.image[0] : product.image?.url || product.image;
    const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
    result = { sku, name: decode(product.name), source_id: u.pathname, image: image ? new URL(image, u).href : '', variant, available: variantAvailable && !offers.some(o => /OutOfStock|Discontinued/.test(o?.availability || '')) };
  }
  return result;
}
export function sameIdentity(expected, actual, url) {
  if (!expected || String(expected.sku) !== String(actual.sku) || normalize(expected.name) !== normalize(actual.name)) return false;
  if (JSON.stringify(Object.entries(expected.variant || {}).sort()) !== JSON.stringify(Object.entries(actual.variant || {}).sort())) return false;
  return !/www\.123(inkt|schoon)\./.test(new URL(url).hostname) || String(expected.source_id) === String(actual.source_id);
}
export function imageSignature(bytes, type) {
  if (!type.startsWith('image/') || bytes.length < 32) return false;
  return (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9)
    || (bytes[0] === 137 && new TextDecoder().decode(bytes.slice(1,4)) === 'PNG')
    || /^GIF8[79]a/.test(new TextDecoder().decode(bytes.slice(0,6)))
    || (new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP')
    || new TextDecoder().decode(bytes.slice(4,12)).startsWith('ftypavif');
}
export async function boundedFetch(url, { signal, fetcher = fetch, image = false } = {}) {
  let u = checkedUrl(url); const host = u.hostname;
  for (let hops = 0; hops < 6; hops++) {
    let r;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        r = await fetcher(u.href, { redirect: 'manual', signal: AbortSignal.any([signal || AbortSignal.timeout(22000), AbortSignal.timeout(8000)]), headers: { 'User-Agent': 'PROFO-Cataloguscontrole/1.0', Accept: image ? 'image/*' : 'text/html' } });
        if (attempt === 0 && (r.status === 429 || r.status >= 500)) { await r.body?.cancel(); continue; }
        break;
      } catch (error) { if (attempt || signal?.aborted) throw error; }
    }
    if (r.status >= 300 && r.status < 400) {
      const target = checkedUrl(r.headers.get('location') || '', u.href); await r.body?.cancel();
      if (target.hostname !== host) throw new Error('Doorverwijzing naar een andere host vereist beoordeling.');
      u = target; continue;
    }
    if (!r.ok) { await r.body?.cancel(); throw new Error(`Leverancier antwoordt met HTTP ${r.status}.`); }
    const type = r.headers.get('content-type') || '';
    if (!(image ? type.startsWith('image/') : type.includes('text/html'))) { await r.body?.cancel(); throw new Error('Onverwacht antwoordformaat van leverancier.'); }
    const reader = r.body.getReader(); const chunks = []; let length = 0;
    while (true) { const {done,value} = await reader.read(); if (done) break; length += value.length; if (length > (image ? 5000000 : 3000000)) { await reader.cancel(); throw new Error('Bestand overschrijdt de controlelimiet.'); } chunks.push(value); }
    const bytes = new Uint8Array(length); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    if (image && !imageSignature(bytes, type)) throw new Error('Het bestand is geen herkenbare volledige productafbeelding.');
    return { url: u.href, type, bytes };
  }
  throw new Error('Te veel doorverwijzingen.');
}
const sha = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2,'0')).join('');
export async function auditItem(item, options = {}) {
  const row = item.snapshot; const link = catalogLink(row.leverancier_url);
  const result = { item_id: item.id, status: 'ok', message: '', patch: {}, evidence: {} };
  if (!link.url) return { ...result, status: 'skipped', message: 'Vrije aanvraagregel zonder vast leveranciersartikel.' };
  const signal = AbortSignal.timeout(22000);
  try {
    const original = checkedUrl(link.url);
    const page = await boundedFetch(original.href, { ...options, signal });
    const final = checkedUrl(page.url);
    for (const [key, value] of original.searchParams) if (key.startsWith('attribute_') && final.searchParams.get(key) !== value) throw new Error('De doorverwijzing verliest de gekozen productvariant.');
    const source = parseSource(new TextDecoder().decode(page.bytes), final.href);
    result.evidence = { ...source, final_url: final.href, checked_at: new Date().toISOString() };
    if (!sameIdentity(item.baseline, source, original.href)) throw new Error('Artikel, verpakking of variant wijkt af van de bevestigde referentie; beoordeling nodig.');
    if (String(row.artikelnummer || link.sku || source.sku) !== source.sku) throw new Error('Het catalogusartikelnummer komt niet overeen met de leverancier.');
    if (!source.available) throw new Error('Leverancier meldt het artikel als niet beschikbaar.');
    if (!source.image) throw new Error('Geen bevestigde productafbeelding gevonden.');
    const officialImage = await boundedFetch(source.image, { ...options, signal, image: true });
    const officialHash = await sha(officialImage.bytes);
    result.evidence.image_hash = officialHash;
    let currentHealthy = false;
    if (row.image_url) {
      try { currentHealthy = row.image_url === source.image || (await boundedFetch(row.image_url, { ...options, signal, image: true })).bytes.length > 0; } catch { currentHealthy = false; }
    }
    if (original.href !== final.href) result.patch.leverancier_url = final.href;
    const changedSupplierImage = item.baseline.image && (item.baseline.image !== source.image || (item.baseline.image_hash && item.baseline.image_hash !== officialHash));
    if (!currentHealthy || changedSupplierImage) if (row.image_url !== source.image) result.patch.image_url = source.image;
    if (Object.keys(result.patch).length) result.status = 'corrected';
    result.message = result.status === 'corrected' ? 'Bevestigde link- of fotocorrectie.' : 'Productlink en afbeelding gecontroleerd.';
  } catch (error) { result.status = 'attention'; result.message = error.message || String(error); result.patch = {}; }
  return result;
}
