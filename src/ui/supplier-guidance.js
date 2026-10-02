import { escapeHtml as e } from '../utils/format.js';
import { suppliers, safeProductUrl } from '../services/supplierCartModel.js';

export function supplierRemedy(line, reason = '') {
  const supplier = suppliers[line.supplier];
  if (/aanmeld|aan bij de leverancier|inlog/i.test(reason) && supplier)
    return `<a class="supplier-remedy" href="${e(supplier.home)}" target="_blank" rel="noopener">Aanmelden bij ${e(line.supplier)} → daarna opnieuw controleren</a>`;
  if (/afwijkend|bestaand aantal|ander aantal/i.test(reason) && supplier)
    return `<a class="supplier-remedy" href="${e(supplier.cart)}" target="_blank" rel="noopener">Aantal in de winkelwagen controleren → daarna opnieuw controleren</a>`;
  if (/productpagina|productlink|artikelnummer ontbreekt|verpakking|eenheid ontbreekt/i.test(reason))
    return '<a class="supplier-remedy" href="#beheer" target="_blank" rel="noopener">Productgegevens nakijken in Instellingen → Assortiment</a>';
  const productUrl = safeProductUrl(line.url, line.supplier);
  if (productUrl)
    return `<a class="supplier-remedy" href="${e(productUrl)}" target="_blank" rel="noopener">Product bij de leverancier nakijken → daarna opnieuw controleren</a>`;
  return '<p>Controleer de productgegevens in Instellingen. Probeer daarna opnieuw.</p>';
}

export function renderSupplierSteps(connected, plan, results) {
  const current = results ? 3 : plan ? 2 : connected ? 1 : 0;
  const labels = ['Browser koppelen', 'Producten controleren', 'Winkelwagen vullen', 'Extern afronden', 'Als besteld registreren'];
  return `<ol class="supplier-steps" aria-label="Stappen bij de leverancier">${labels.map((label, index) => `<li ${index === current ? 'aria-current="step"' : ''} class="${index < current ? 'is-done' : ''}">${label}</li>`).join('')}</ol>`;
}
