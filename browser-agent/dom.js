// This self-contained function runs in Chrome's isolated world. It only inspects
// public page DOM and clicks the exact product's add button. No checkout primitive.
export function supplierDOM(action, expected) {
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
  const forms = [...document.querySelectorAll('form.prodform')].filter(f => {
    const a = f.getAttribute('action');
    if (!a) return false;
    const target = new URL(a,location.href);
    return target.origin === url.origin && target.pathname === url.pathname && /^#p[a-z0-9._/-]+$/i.test(target.hash) && (!expected.article || target.hash === `#p${expected.article}`);
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
  if (norm(measurement.label) !== `${title} - ${article}`) fail('Producttitel en artikelnummer spreken elkaar tegen.');
  if (button.disabled || input.disabled || !button.getClientRects().length || !/Direct leverbaar/i.test(main.innerText)) fail('Product niet aantoonbaar direct beschikbaar.');
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
