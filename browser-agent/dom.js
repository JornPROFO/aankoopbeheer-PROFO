// This self-contained function runs in Chrome's isolated world. It only inspects
// public page DOM and clicks the exact product's add button. No checkout primitive.
export function supplierDOM(action, expected, reportErrors = false) {
  // Chrome can serialize an uncaught injected-script exception as a null result.
  // Always send an explicit envelope to the worker, including on page errors.
  try {
    const value = inspectPage();
    return reportErrors ? { ok: true, value } : value;
  } catch (error) {
    if (!reportErrors) throw error;
    return { ok: false, error: error?.message || 'Leverancierspagina kon niet worden gecontroleerd.' };
  }
  function inspectPage() {
  const fail = reason => { throw new Error(reason); };
  const url = new URL(location.href);
  if (url.origin !== `https://www.${expected.supplier}`) fail('Leveranciersdomein gewijzigd.');
  const main = document.querySelector('main');
  if (!main) fail('Paginaopbouw niet herkend.');
  const norm = s => String(s || '').replace(/\s+/g,' ').trim();
  const signedIn = [...document.querySelectorAll('button,a,input[type=submit]')].some(e => /^(uitloggen|afmelden)$/i.test(norm(e.textContent || e.value)));
  if (!signedIn) fail('Meld je eerst zelf aan bij de leverancier in deze browser en probeer opnieuw.');
  if (action === 'cart') {
    if (url.pathname !== '/shoppingcart.html') fail('Geen winkelwagenpagina.');
    const table = main.querySelector('table.shopcart_overview');
    const rows = [...main.querySelectorAll('tr[data-role="cart-item"]')];
    if (!rows.length && !/Uw winkelwagentje is leeg/i.test(main.innerText)) fail('Winkelwagen kon niet betrouwbaar worden gelezen.');
    if (rows.length && (!table || table.querySelectorAll('input[data-role="amount"]').length !== rows.length)) fail('Onbekende winkelwagenstructuur.');
    return rows.map(row => {
      const quantity = row.querySelector('input[data-role="amount"]');
      const link = row.querySelector('[data-test="product-name"] a');
      const code = row.getAttribute('data-product-code');
      if (!quantity || !code || !link || !/^\d{1,3}$/.test(quantity.value)) fail('Onleesbare winkelwagenregel.');
      return {article:code,quantity:Number(quantity.value),url:link.href,title:norm(link.textContent)};
    });
  }
  if (url.href !== expected.url) fail('Productlink is gewijzigd of doorverwezen.');
  // Explicitly verified 123inkt house-brand aliases; original HP or similar
  // products must not pass this check just because they share an HP number.
  const hpAliases = {
    W2030X: ['HP-123inkt-huismerk-vervangt-HP-415X-W2030X-toner-zwart-hoge-capaciteit-W2030XC-i56518.html', '055437'],
    W2031X: ['HP-123inkt-huismerk-vervangt-HP-415X-W2031X-toner-cyaan-hoge-capaciteit-W2031XC-i56519.html', '055441'],
    W2032X: ['HP-123inkt-huismerk-vervangt-HP-415X-W2032X-toner-geel-hoge-capaciteit-W2032XC-i56520.html', '055445'],
    W2033X: ['HP-123inkt-huismerk-vervangt-HP-415X-W2033X-toner-magenta-hoge-capaciteit-W2033XC-i56521.html', '055449'],
  };
  const alias = hpAliases[expected.article];
  const expectedArticle = expected.supplier === '123inkt.be' && alias
    && url.href === `https://www.123inkt.be/${alias[0]}` ? alias[1] : expected.article;
  const forms = [...document.querySelectorAll('form.prodform')].filter(f => {
    const a = f.getAttribute('action');
    if (!a) return false;
    const target = new URL(a,location.href);
    return target.origin === url.origin && target.pathname === url.pathname && /^#p[a-z0-9._/-]+$/i.test(target.hash) && (!expectedArticle || target.hash === `#p${expectedArticle}`);
  });
  if (forms.length !== 1) fail('Exact artikelnummer niet gevonden bij de bestelknop.');
  const form = forms[0];
  const article = new URL(form.getAttribute('action'),location.href).hash.slice(2);
  const buttons = form.querySelectorAll('[data-test="add-to-cart"]');
  const inputs = form.querySelectorAll('input[name="amount"]:not([type=hidden])');
  const title = norm(main.querySelector('h1')?.textContent);
  if (buttons.length !== 1 || inputs.length !== 1 || !title) fail('Bestelknop of aantalveld niet eenduidig.');
  const button = buttons[0], input = inputs[0];
  let measurement;
  try { measurement = JSON.parse(button.getAttribute('data-measure')); } catch { fail('Artikelcontrole bij bestelknop ontbreekt.'); }
  if (!measurement || norm(measurement.label) !== `${title} - ${article}`) fail('Producttitel en artikelnummer spreken elkaar tegen.');
  // Availability belongs to the exact order block, never a recommendation or
  // sidebar. Clearance products may publish InStock without a visible badge.
  const orderBlock = form.closest('.block');
  const unavailable = () => fail('Product niet aantoonbaar direct beschikbaar.');
  if (!orderBlock || orderBlock.querySelectorAll('form.prodform').length !== 1) unavailable();
  const stockLabels = [...orderBlock.querySelectorAll('.stock-text')].filter(e => e.getClientRects().length);
  const directlyAvailable = stockLabels.length === 1 && /^Direct leverbaar$/i.test(norm(stockLabels[0].textContent));
  if (stockLabels.length && !directlyAvailable) unavailable();

  const productSelector = '[itemscope][itemtype="http://schema.org/Product"], [itemscope][itemtype="https://schema.org/Product"]';
  const product = form.closest(productSelector);
  const offers = [...orderBlock.querySelectorAll('[itemprop="offers"][itemscope]')];
  let inStock = false;
  if (offers.length) {
    const offer = offers[0];
    const skus = product ? [...product.querySelectorAll('[itemprop="sku"]')].filter(e => e.closest(productSelector) === product) : [];
    const availability = offer.querySelectorAll('[itemprop="availability"]');
    const offerUrls = offer.querySelectorAll('[itemprop="url"]');
    if (offers.length !== 1 || !product || product.getAttribute('itemid') !== `${url.href}#product`
      || skus.length !== 1 || skus[0].getAttribute('content') !== article
      || offer.closest(productSelector) !== product || !/^https?:\/\/schema\.org\/Offer$/.test(offer.getAttribute('itemtype'))
      || offerUrls.length !== 1 || offerUrls[0].getAttribute('content') !== url.href
      || availability.length !== 1) unavailable();
    const status = availability[0].getAttribute('content') || availability[0].getAttribute('href');
    inStock = /^(?:https?:\/\/schema\.org\/)?InStock$/.test(status);
    // Explicit negative, unknown or conflicting metadata must not fall back to
    // a possibly stale visible badge.
    if (!inStock) unavailable();
  }
  if (button.disabled || input.disabled || !button.getClientRects().length || !input.getClientRects().length
    || (!directlyAvailable && !inStock)) unavailable();
  if (action === 'inspect') return {title,article,url:url.href};
  if (action !== 'add' || title !== expected.title) fail('Product of verpakking is gewijzigd sinds de voorcontrole.');
  if (!Number.isSafeInteger(expected.quantity) || expected.quantity < 1 || expected.quantity > 999) fail('Ongeldig aantal.');
  input.value = String(expected.quantity);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  if (input.value !== String(expected.quantity)) fail('Aantalveld accepteert het aantal niet.');
  button.click();
  return {submitted:true};
}

}
