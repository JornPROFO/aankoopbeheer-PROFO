import './styles/main.css';
import {
  getCurrentSession,
  onAuthChange,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from './services/authService.js';
import {
  createOrder,
  disableInkCartridge,
  disableProduct,
  disablePrinter,
  getActiveUserByEmail,
  invokeOrderMail,
  loadAankoopData,
  saveInkCartridge,
  saveProduct,
  savePrinter,
  updateOrderMailStatus,
  updateOrderStatus,
} from './services/aankoopService.js';
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  getLocationLabel,
  getUserLabel,
  isAdminUser,
  parseDecimal,
  roundMoney,
} from './utils/format.js';

const app = document.querySelector('#app');
const cartStorageKey = 'profo-aankoopbeheer-cart';
const orderDraftStorageKey = 'profo-aankoopbeheer-order-draft';
const productDraftStorageKey = 'profo-aankoopbeheer-product-draft';
const inkDraftStorageKey = 'profo-aankoopbeheer-ink-draft';
const inkCartridgeDraftStorageKey = 'profo-aankoopbeheer-ink-cartridge-draft';
const analysisFiltersStorageKey = 'profo-aankoopbeheer-analysis-filters';
const defaultImage = '/assets/gevouwen-handdoeken-voorbeeld.png';

const state = {
  session: null,
  appUser: null,
  data: {
    products: [],
    printers: [],
    cartridges: [],
    users: [],
    locations: [],
    orders: [],
  },
  cart: readCart(),
  orderDraft: readOrderDraft(),
  inkDraft: readInkDraft(),
  orderReview: false,
  inkReview: false,
  view: getRoute(),
  authMode: 'login',
  notice: '',
  error: '',
  loading: true,
  setupError: '',
  adminSection: 'products',
  adminCartridgePrinterId: '',
  editingProduct: null,
  editingPrinter: null,
  editingInkCartridge: null,
  productDraft: readProductDraft(),
  inkCartridgeDraft: readInkCartridgeDraft(),
  analysisFilters: readAnalysisFilters(),
  previewProductId: '',
  mailWarning: '',
};

onAuthChange(async (session) => {
  state.session = session;
  await bootstrapData();
});

window.addEventListener('hashchange', () => {
  state.view = getRoute();
  render();
});

app.addEventListener('submit', async (event) => {
  const form = event.target;

  if (form.matches('[data-auth-form]')) {
    event.preventDefault();
    await handleAuth(form);
  }

  if (form.matches('[data-order-form]')) {
    event.preventDefault();
    await handleOrder(form);
  }

  if (form.matches('[data-product-form]')) {
    event.preventDefault();
    await handleProductSave(form);
  }

  if (form.matches('[data-printer-form]')) {
    event.preventDefault();
    await handlePrinterSave(form);
  }

  if (form.matches('[data-ink-cartridge-form]')) {
    event.preventDefault();
    await handleInkCartridgeSave(form);
  }

  if (form.matches('[data-ink-order-form]')) {
    event.preventDefault();
    await handleInkOrder(form);
  }
});

app.addEventListener('input', handleProductDraftChange);
app.addEventListener('change', handleProductDraftChange);
app.addEventListener('input', handleOrderDraftChange);
app.addEventListener('change', handleOrderDraftChange);
app.addEventListener('input', handleInkDraftChange);
app.addEventListener('change', handleInkDraftChange);
app.addEventListener('input', handleAdminCartridgeDraftChange);
app.addEventListener('change', handleAdminCartridgeDraftChange);
app.addEventListener('input', handleAnalysisFilterChange);
app.addEventListener('change', handleAnalysisFilterChange);

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button, a');

  if (!target) {
    return;
  }

  if (target.matches('[data-auth-tab]')) {
    state.authMode = target.dataset.authTab;
    state.error = '';
    state.notice = '';
    render();
  }

  if (target.matches('[data-sign-out]')) {
    await signOut();
    state.session = null;
    state.appUser = null;
    render();
  }

  if (target.matches('[data-add-product]')) {
    addToCart(target.dataset.addProduct, Number(target.dataset.step || 1));
  }

  if (target.matches('[data-preview-product]')) {
    state.previewProductId = target.dataset.previewProduct || '';
    render();
  }

  if (target.matches('[data-close-preview]')) {
    state.previewProductId = '';
    render();
  }

  if (target.matches('[data-cart-action]')) {
    updateCart(target.dataset.productId, target.dataset.cartAction);
  }

  if (target.matches('[data-clear-cart]')) {
    state.cart = {};
    state.orderReview = false;
    persistCart();
    render();
  }

  if (target.matches('[data-edit-order-review]')) {
    state.orderReview = false;
    render();
  }

  if (target.matches('[data-edit-product]')) {
    const product = state.data.products.find((item) => String(item.id) === String(target.dataset.editProduct));
    state.editingProduct = product ?? null;
    state.adminSection = 'products';
    state.view = 'beheer';
    window.location.hash = '#beheer';
    render();
  }

  if (target.matches('[data-cancel-product-edit]')) {
    state.editingProduct = null;
    render();
  }

  if (target.matches('[data-disable-product]')) {
    await handleProductDisable(target.dataset.disableProduct);
  }

  if (target.matches('[data-status]')) {
    await handleStatusChange(target.dataset.orderId, target.dataset.status);
  }

  if (target.matches('[data-admin-section]')) {
    state.adminSection = target.dataset.adminSection;
    state.error = '';
    state.notice = '';
    render();
  }

  if (target.matches('[data-ink-action]')) {
    updateInkQuantity(target.dataset.cartridgeId, target.dataset.inkAction);
  }

  if (target.matches('[data-clear-ink]')) {
    clearInkDraft();
    state.inkReview = false;
    render();
  }

  if (target.matches('[data-edit-ink-review]')) {
    state.inkReview = false;
    render();
  }

  if (target.matches('[data-edit-printer]')) {
    const printer = state.data.printers.find((item) => String(item.id) === String(target.dataset.editPrinter));
    state.editingPrinter = printer ?? null;
    state.adminSection = 'printers';
    state.view = 'beheer';
    window.location.hash = '#beheer';
    render();
  }

  if (target.matches('[data-cancel-printer-edit]')) {
    state.editingPrinter = null;
    render();
  }

  if (target.matches('[data-disable-printer]')) {
    await handlePrinterDisable(target.dataset.disablePrinter);
  }

  if (target.matches('[data-edit-ink-cartridge]')) {
    const cartridge = state.data.cartridges.find((item) => String(item.id) === String(target.dataset.editInkCartridge));
    state.editingInkCartridge = cartridge ?? null;
    state.adminCartridgePrinterId = cartridge?.printer_id ? String(cartridge.printer_id) : '';
    state.adminSection = 'cartridges';
    state.view = 'beheer';
    window.location.hash = '#beheer';
    render();
  }

  if (target.matches('[data-copy-ink-cartridge]')) {
    const cartridge = state.data.cartridges.find((item) => String(item.id) === String(target.dataset.copyInkCartridge));
    copyCartridgeToDraft(cartridge);
  }

  if (target.matches('[data-cancel-ink-edit]')) {
    state.editingInkCartridge = null;
    render();
  }

  if (target.matches('[data-disable-ink-cartridge]')) {
    await handleInkCartridgeDisable(target.dataset.disableInkCartridge);
  }

  if (target.matches('[data-print-analysis]')) {
    window.print();
  }
});

init();

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.previewProductId) {
    state.previewProductId = '';
    render();
  }
});

function handleProductDraftChange(event) {
  const form = event.target.closest('[data-product-form]');

  if (!form) {
    return;
  }

  const formData = new FormData(form);
  const id = String(formData.get('id') ?? '').trim();

  if (id) {
    return;
  }

  state.productDraft = readProductDraftFromForm(form);
  persistProductDraft();
}

function handleOrderDraftChange(event) {
  const form = event.target.closest('[data-order-form]');

  if (!form) {
    return;
  }

  state.orderDraft = readOrderDraftFromForm(form);
  persistOrderDraft();
}

function handleInkDraftChange(event) {
  const form = event.target.closest('[data-ink-order-form]');

  if (!form) {
    return;
  }

  if (event.target.matches('[data-ink-toggle]')) {
    toggleInkSelection(event.target.dataset.cartridgeId, event.target.checked);
    return;
  }

  state.inkDraft = {
    ...state.inkDraft,
    ...readInkDraftFromForm(form),
  };

  const selectedPrinter = getSelectedInkPrinter();
  if (selectedPrinter && String(selectedPrinter.locatie_id) !== String(state.inkDraft.locatie_id)) {
    state.inkDraft.printer_id = '';
    state.inkDraft.quantities = {};
  }

  state.inkReview = false;
  persistInkDraft();

  if (event.type === 'change' && ['locatie_id', 'printer_id'].includes(event.target.name)) {
    render();
  }
}

function handleAdminCartridgeDraftChange(event) {
  const form = event.target.closest('[data-ink-cartridge-form]');

  if (!form) {
    return;
  }

  const id = String(new FormData(form).get('id') ?? '').trim();
  state.inkCartridgeDraft = readInkCartridgeDraftFromForm(form);
  state.adminCartridgePrinterId = state.inkCartridgeDraft.printer_id;

  if (!id) {
    persistInkCartridgeDraft();
  }

  if (event.type === 'change' && event.target.name === 'printer_id') {
    render();
  }
}

function handleAnalysisFilterChange(event) {
  const form = event.target.closest('[data-analysis-form]');

  if (!form) {
    return;
  }

  state.analysisFilters = readAnalysisFiltersFromForm(form);
  persistAnalysisFilters();
  render();
}

async function init() {
  try {
    state.session = await getCurrentSession();
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    state.loading = false;
    render();
  }
}

async function bootstrapData() {
  state.loading = true;
  state.setupError = '';
  render();

  if (!state.session) {
    state.loading = false;
    render();
    return;
  }

  try {
    state.appUser = await getActiveUserByEmail(state.session.user.email);

    if (!state.appUser) {
      state.error = 'Je bent aangemeld, maar je staat nog niet actief in de PROFO-gebruikerslijst.';
      state.loading = false;
      render();
      return;
    }

    const admin = isAdminUser(state.appUser, state.session.user.email);
    state.data = await loadAankoopData({ includeInactiveProducts: admin });
    state.error = '';
  } catch (error) {
    state.setupError = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

function render() {
  if (!state.session) {
    app.innerHTML = renderAuth();
    return;
  }

  if (state.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  if (!state.appUser) {
    app.innerHTML = renderAccessIssue();
    return;
  }

  app.innerHTML = renderShell();
}

function renderAuth() {
  const isRegister = state.authMode === 'register';

  return `
    <main class="auth-page">
      <section class="auth-panel">
        <div class="auth-brand">
          <span class="brand-logo-box"><img src="/assets/profo-logo.png" alt="PROFO" /></span>
          <div>
            <p class="eyebrow">Aankoopbeheer</p>
            <h1>Intern bestellen</h1>
          </div>
        </div>
        <p class="auth-intro">
          Meld aan met je PROFO-mailadres om materiaal voor je locatie te bestellen.
        </p>
        <div class="auth-tabs" role="tablist">
          <button type="button" class="${!isRegister ? 'is-active' : ''}" data-auth-tab="login">Inloggen</button>
          <button type="button" class="${isRegister ? 'is-active' : ''}" data-auth-tab="register">Registreren</button>
        </div>
        ${state.error ? `<div class="auth-error">${escapeHtml(state.error)}</div>` : ''}
        ${state.notice ? `<div class="auth-notice">${escapeHtml(state.notice)}</div>` : ''}
        <form class="auth-form" data-auth-form>
          <label class="field">
            <span>PROFO-mailadres</span>
            <input name="email" type="email" autocomplete="email" placeholder="voornaam.naam@profo.be" required />
          </label>
          ${
            isRegister
              ? `<label class="field">
                  <span>Volledige naam</span>
                  <input name="name" type="text" autocomplete="name" required />
                </label>`
              : ''
          }
          <label class="field">
            <span>Wachtwoord</span>
            <input name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required />
          </label>
          <button class="primary-button" type="submit">${isRegister ? 'Account aanmaken' : 'Inloggen'}</button>
        </form>
        <p class="auth-note">
          De app gebruikt dezelfde PROFO-gebruikerslijst en locatielijst als Voertuigenbeheer.
        </p>
      </section>
    </main>
  `;
}

function renderLoading() {
  return `
    <main class="loading-page">
      <div class="spinner" aria-hidden="true"></div>
      <p>Gegevens worden opgehaald.</p>
    </main>
  `;
}

function renderAccessIssue() {
  return `
    <main class="auth-page">
      <section class="auth-panel">
        <div class="auth-brand">
          <span class="brand-logo-box"><img src="/assets/profo-logo.png" alt="PROFO" /></span>
          <h1>Aankoopbeheer</h1>
        </div>
        <div class="auth-error">${escapeHtml(state.error || 'Geen toegang tot de app.')}</div>
        <button class="primary-button" type="button" data-sign-out>Afmelden</button>
      </section>
    </main>
  `;
}

function renderShell() {
  const admin = isAdminUser(state.appUser, state.session.user.email);
  const userLabel = getUserLabel(state.appUser);

  return `
    <header class="app-header">
      <div class="brand-block">
        <span class="brand-logo-box"><img src="/assets/profo-logo.png" alt="PROFO" /></span>
        <div>
          <p class="eyebrow">Aankoopbeheer</p>
          <h1>Bestelportaal</h1>
        </div>
      </div>
      <div class="header-actions">
        <span class="environment-pill">${escapeHtml(userLabel)}</span>
        <button class="header-button" type="button" data-sign-out>Afmelden</button>
      </div>
    </header>
    <div class="app-layout">
      <nav class="sidebar" aria-label="Hoofdnavigatie">
        ${navLink('bestellen', 'Onderhoud')}
        ${navLink('inkt', 'Inkt')}
        ${navLink('bestellingen', 'Bestellingen')}
        ${admin ? navLink('analyse', 'Analyse') : ''}
        ${admin ? navLink('beheer', 'Beheer') : ''}
      </nav>
      <main class="content">
        ${state.setupError ? renderSetupError() : renderCurrentView(admin)}
      </main>
    </div>
    ${renderProductPreview()}
  `;
}

function navLink(id, label) {
  const active = state.view === id ? 'is-active' : '';
  return `<a class="nav-link ${active}" href="#${id}">${escapeHtml(label)}</a>`;
}

function renderSetupError() {
  return `
    <section class="empty-state is-error">
      <div>
        <strong>De aankoop-tabellen zijn nog niet klaar in Supabase.</strong>
        <p>${escapeHtml(state.setupError)}</p>
        <p>Controleer of het basisschema en het bestand <code>supabase/manual-sql/20260629_aankoopbeheer_inktmodule.sql</code> volledig zijn uitgevoerd.</p>
      </div>
    </section>
  `;
}

function renderCurrentView(admin) {
  if (state.view === 'bestellingen') {
    return renderOrders(admin);
  }

  if (state.view === 'inkt') {
    return renderInkWorkspace();
  }

  if (state.view === 'beheer' && admin) {
    return renderAdmin();
  }

  if (state.view === 'analyse' && admin) {
    return renderAnalysis();
  }

  return renderOrderWorkspace();
}

function renderOrderWorkspace() {
  const products = state.data.products
    .filter((product) => product.actief !== false)
    .sort((a, b) => {
      const order = Number(a.sort_order || 100) - Number(b.sort_order || 100);
      if (order !== 0) {
        return order;
      }

      return String(a.naam || '').localeCompare(String(b.naam || ''), 'nl-BE');
    });
  const cartItems = getCartItems();

  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">Catalogus</p>
        <h2>Bestellen voor de locatie</h2>
      </div>
      <p class="page-intro">
        Kies de locatie, controleer de besteller en voeg de nodige producten toe. De prijs wordt berekend op basis van de actuele catalogusprijs in beheer.
      </p>
    </section>
    ${state.error ? `<div class="warning-panel">${escapeHtml(state.error)}</div>` : ''}
    ${state.notice ? `<div class="notice-panel">${escapeHtml(state.notice)}</div>` : ''}
    ${state.mailWarning ? `<div class="warning-panel">${escapeHtml(state.mailWarning)}</div>` : ''}
    <section class="order-layout">
      <div class="catalog-panel">
        ${renderProductCatalog(products)}
      </div>
      <aside class="cart-panel">
        <div class="panel-header">
          <h3>Winkelmand</h3>
          <span>${cartItems.length} product${cartItems.length === 1 ? '' : 'en'}</span>
        </div>
        ${renderCart(cartItems)}
      </aside>
    </section>
  `;
}

function renderInkWorkspace() {
  const selectedLocationId = state.inkDraft.locatie_id ?? '';
  const selectedPrinterId = state.inkDraft.printer_id ?? '';
  const currentUserId = state.appUser?.id ?? '';
  const selectedBestellerId = state.inkDraft.besteller_id || currentUserId;
  const printersForLocation = getPrintersForLocation(selectedLocationId);
  const selectedPrinter = state.data.printers.find((printer) => String(printer.id) === String(selectedPrinterId));
  const allPrinterCartridges = selectedPrinter ? getAllCartridgesForPrinter(selectedPrinter.id) : [];
  const inkItems = getInkItems();
  const totals = calculateInkTotals(inkItems);
  const submitLabel = state.inkReview ? 'Inktbestelling definitief doorsturen' : 'Inktbestelling controleren';

  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">Inkt en toner</p>
        <h2>Bestellen per printer</h2>
      </div>
      <p class="page-intro">
        Kies eerst de locatie en daarna de printer. De app toont alleen de inktpatronen of toners die in beheer aan die printer gekoppeld zijn.
      </p>
    </section>
    ${state.error ? `<div class="warning-panel">${escapeHtml(state.error)}</div>` : ''}
    ${state.notice ? `<div class="notice-panel">${escapeHtml(state.notice)}</div>` : ''}
    ${state.mailWarning ? `<div class="warning-panel">${escapeHtml(state.mailWarning)}</div>` : ''}
    <form class="ink-layout" data-ink-order-form data-ink-review="${state.inkReview ? 'true' : 'false'}">
      <section class="panel">
        <div class="panel-header">
          <h3>Bestelgegevens</h3>
          <span>wie, waar en welke printer</span>
        </div>
        <div class="form-grid two">
          <label class="field">
            <span>Wie bestelt de inkt?</span>
            <select name="besteller_id" required>
              ${state.data.users
                .map((user) => `<option value="${escapeHtml(user.id)}" ${String(user.id) === String(selectedBestellerId) ? 'selected' : ''}>${escapeHtml(getUserLabel(user))}</option>`)
                .join('')}
            </select>
          </label>
          <label class="field">
            <span>Voor welke locatie?</span>
            <select name="locatie_id" required>
              <option value="">Kies een locatie</option>
              ${state.data.locations
                .map((location) => `<option value="${escapeHtml(location.id)}" ${String(location.id) === String(selectedLocationId) ? 'selected' : ''}>${escapeHtml(getLocationLabel(location))}</option>`)
                .join('')}
            </select>
          </label>
        </div>
        <label class="field">
          <span>Voor welke printer?</span>
          <select name="printer_id" required ${selectedLocationId ? '' : 'disabled'}>
            <option value="">${selectedLocationId ? 'Kies een printer' : 'Kies eerst een locatie'}</option>
            ${printersForLocation
              .map((printer) => `<option value="${escapeHtml(printer.id)}" ${String(printer.id) === String(selectedPrinterId) ? 'selected' : ''}>${escapeHtml(getPrinterLabel(printer))}</option>`)
              .join('')}
          </select>
        </label>
        ${
          selectedLocationId && !printersForLocation.length
            ? '<div class="empty-state is-compact"><p>Voor deze locatie zijn nog geen printers gekoppeld in beheer.</p></div>'
            : ''
        }
        <label class="field">
          <span>Opmerking voor verwerking</span>
          <textarea name="opmerkingen" placeholder="Bijvoorbeeld dringend, bijna leeg, of enkel bestellen samen met andere materialen.">${escapeHtml(state.inkDraft.opmerkingen ?? '')}</textarea>
        </label>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h3>Welke kleuren?</h3>
          <span>${inkItems.length} gekozen</span>
        </div>
        ${renderInkOptions(allPrinterCartridges)}
      </section>

      <aside class="cart-panel">
        <div class="panel-header">
          <h3>Inktmand</h3>
          <span>${inkItems.length} kleur${inkItems.length === 1 ? '' : 'en'}</span>
        </div>
        ${renderInkCart(inkItems, totals, submitLabel)}
      </aside>
    </form>
  `;
}

function renderInkOptions(cartridges) {
  if (!state.inkDraft.printer_id) {
    return '<div class="empty-state is-compact"><p>Kies eerst een printer om de beschikbare kleuren te zien.</p></div>';
  }

  if (!cartridges.length) {
    return '<div class="empty-state is-compact"><p>Voor deze printer zijn nog geen inktpatronen of toners gekoppeld in beheer.</p></div>';
  }

  return `
    <div class="ink-options">
      ${cartridges
        .map((cartridge) => {
          const quantity = Number(state.inkDraft.quantities?.[cartridge.id] || 0);
          const supplierUrl = normalizeHttpUrl(cartridge.leverancier_url);
          const orderable = isCartridgeOrderable(cartridge);
          const status = getCartridgeOrderStatus(cartridge);
          return `
            <article class="ink-option ${orderable ? '' : 'is-unavailable'}">
              <div class="ink-option-main">
                <label class="ink-check">
                  <input type="checkbox" data-ink-toggle data-cartridge-id="${escapeHtml(cartridge.id)}" ${quantity > 0 ? 'checked' : ''} ${orderable ? '' : 'disabled'} />
                  <span class="color-badge color-${escapeHtml(cartridge.kleur).toLowerCase()}">${escapeHtml(cartridge.kleur)}</span>
                </label>
                <div>
                  <strong>${escapeHtml(getInkColorLabel(cartridge.kleur))}</strong>
                  <span>${escapeHtml(cartridge.naam)}</span>
                  <small>${escapeHtml(cartridge.artikelnummer ? `Art. ${cartridge.artikelnummer}` : cartridge.leverancier || 'Leverancier nog te bepalen')}</small>
                  ${status ? `<small class="availability-note">${escapeHtml(status)}</small>` : ''}
                  ${supplierUrl ? `<a class="supplier-link" href="${escapeHtml(supplierUrl)}" target="_blank" rel="noreferrer">Bekijk bij leverancier</a>` : ''}
                </div>
              </div>
              <div class="ink-option-side">
                <strong>${formatCurrency(getCartridgePriceInclVat(cartridge))}</strong>
                <div class="quantity-control" aria-label="Aantal ${escapeHtml(getInkColorLabel(cartridge.kleur))}">
                  <button type="button" data-ink-action="decrease" data-cartridge-id="${escapeHtml(cartridge.id)}" ${orderable ? '' : 'disabled'}>-</button>
                  <output>${quantity}</output>
                  <button type="button" data-ink-action="increase" data-cartridge-id="${escapeHtml(cartridge.id)}" ${orderable ? '' : 'disabled'}>+</button>
                </div>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderInkCart(inkItems, totals, submitLabel) {
  if (!inkItems.length) {
    return `
      <div class="empty-state is-compact">
        <p>Je inktmand is nog leeg.</p>
      </div>
    `;
  }

  return `
    <div class="cart-lines">
      ${inkItems
        .map(({ cartridge, quantity }) => {
          const printer = getPrinterById(cartridge.printer_id);
          const supplierUrl = normalizeHttpUrl(cartridge.leverancier_url);
          return `
            <article class="cart-line">
              <div>
                <strong>${escapeHtml(getInkColorLabel(cartridge.kleur))}</strong>
                <span>${escapeHtml(cartridge.naam)} - ${escapeHtml(printer ? getPrinterLabel(printer) : 'printer niet gevonden')}</span>
                <span>${escapeHtml(cartridge.eenheid || 'stuk')} - ${formatCurrency(getCartridgePriceInclVat(cartridge))} incl. btw</span>
                ${supplierUrl ? `<a class="supplier-link" href="${escapeHtml(supplierUrl)}" target="_blank" rel="noreferrer">Bekijk bij leverancier</a>` : ''}
              </div>
              <div class="quantity-control" aria-label="Aantal">
                <button type="button" data-ink-action="decrease" data-cartridge-id="${escapeHtml(cartridge.id)}">-</button>
                <output>${quantity}</output>
                <button type="button" data-ink-action="increase" data-cartridge-id="${escapeHtml(cartridge.id)}">+</button>
              </div>
              <button class="text-button" type="button" data-ink-action="remove" data-cartridge-id="${escapeHtml(cartridge.id)}">Verwijderen</button>
            </article>
          `;
        })
        .join('')}
    </div>
    <div class="cart-totals">
      <div><span>Prijs incl. btw</span><strong>${formatCurrency(totals.incl)}</strong></div>
      <div><span>Waarvan btw</span><strong>${formatCurrency(totals.vat)}</strong></div>
      <div class="grand-total"><span>Totaal te betalen</span><strong>${formatCurrency(totals.incl)}</strong></div>
    </div>
    ${state.inkReview ? renderInkReview(inkItems, totals) : ''}
    <div class="form-actions">
      <button class="primary-button" type="submit">${submitLabel}</button>
      ${state.inkReview ? '<button class="ghost-button" type="button" data-edit-ink-review>Aanpassen</button>' : ''}
      <button class="ghost-button" type="button" data-clear-ink>Leegmaken</button>
    </div>
  `;
}

function renderInkReview(inkItems, totals) {
  const location = state.data.locations.find((item) => String(item.id) === String(state.inkDraft.locatie_id));
  const besteller = state.data.users.find((item) => String(item.id) === String(state.inkDraft.besteller_id || state.appUser?.id));
  const printer = getSelectedInkPrinter();

  return `
    <section class="cart-review">
      <div class="review-heading">
        <strong>Controleer je inktbestelling</strong>
        <span>${inkItems.length} kleur${inkItems.length === 1 ? '' : 'en'}</span>
      </div>
      <dl class="review-meta">
        <div><dt>Locatie</dt><dd>${escapeHtml(location ? getLocationLabel(location) : 'Niet gekozen')}</dd></div>
        <div><dt>Besteller</dt><dd>${escapeHtml(besteller ? getUserLabel(besteller) : 'Niet gekozen')}</dd></div>
        <div><dt>Printer</dt><dd>${escapeHtml(printer ? getPrinterLabel(printer) : 'Niet gekozen')}</dd></div>
      </dl>
      <div class="review-lines">
        ${inkItems
          .map(({ cartridge, quantity }) => {
            const line = calculateInkLine(cartridge, quantity);
            return `
              <div>
                <span>${escapeHtml(quantity)} x ${escapeHtml(getInkColorLabel(cartridge.kleur))} - ${escapeHtml(cartridge.naam)}</span>
                <strong>${formatCurrency(line.incl)}</strong>
              </div>
            `;
          })
          .join('')}
      </div>
      <div class="review-total">
        <span>Totaal te betalen</span>
        <strong>${formatCurrency(totals.incl)}</strong>
      </div>
    </section>
  `;
}

function renderProductCatalog(products) {
  return `
    <section class="category-section">
      <div class="catalog-toolbar">
        <h3>Producten</h3>
        <span>${products.length} artikel${products.length === 1 ? '' : 'en'}</span>
      </div>
      <div class="product-grid">
        ${products.map(renderProductCard).join('')}
      </div>
    </section>
  `;
}

function renderProductCard(product) {
  const image = product.image_url || defaultImage;
  const step = Number(product.minimum_bestelhoeveelheid || 1);

  return `
    <article class="product-card">
      <div class="product-image">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.naam)}" loading="lazy" />
        <button class="image-zoom-button" type="button" data-preview-product="${escapeHtml(product.id)}">
          Vergroten
        </button>
      </div>
      <div class="product-content">
        <div class="product-text">
          <div class="product-labels">
            <span class="category-pill">${escapeHtml(product.categorie || 'Algemeen')}</span>
            <span class="supplier">${escapeHtml(getSupplierDisplay(product))}</span>
          </div>
          <h4>${escapeHtml(product.naam)}</h4>
          <p>${escapeHtml(product.omschrijving || 'Geen omschrijving ingevuld.')}</p>
        </div>
        <dl class="product-meta">
          <div><dt>Eenheid</dt><dd>${escapeHtml(product.eenheid || 'stuks')}</dd></div>
          <div><dt>Prijs</dt><dd>${formatCurrency(getProductPriceInclVat(product))}</dd></div>
          <div><dt>Btw</dt><dd>inbegrepen</dd></div>
        </dl>
        <button class="primary-button product-button" type="button" data-add-product="${escapeHtml(product.id)}" data-step="${escapeHtml(step)}">
          In winkelmand
        </button>
      </div>
    </article>
  `;
}

function renderProductPreview() {
  if (!state.previewProductId) {
    return '';
  }

  const product = state.data.products.find((item) => String(item.id) === String(state.previewProductId));

  if (!product) {
    return '';
  }

  const image = product.image_url || defaultImage;

  return `
    <div class="image-modal" role="dialog" aria-modal="true" aria-labelledby="product-preview-title">
      <button class="image-modal-backdrop" type="button" data-close-preview aria-label="Voorbeeld sluiten"></button>
      <section class="image-modal-panel">
        <div class="image-modal-header">
          <div>
            <span class="supplier">${escapeHtml(getSupplierDisplay(product))}</span>
            <h3 id="product-preview-title">${escapeHtml(product.naam)}</h3>
          </div>
          <button class="ghost-button" type="button" data-close-preview>Sluiten</button>
        </div>
        <div class="image-modal-body">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product.naam)}" />
        </div>
      </section>
    </div>
  `;
}

function renderCart(cartItems) {
  if (!cartItems.length) {
    return `
      <div class="empty-state is-compact">
        <p>Je winkelmand is nog leeg.</p>
      </div>
    `;
  }

  const totals = calculateTotals(cartItems);
  const currentUserId = state.appUser?.id ?? '';
  const selectedLocationId = state.orderDraft.locatie_id ?? '';
  const selectedBestellerId = state.orderDraft.besteller_id || currentUserId;
  const opmerkingen = state.orderDraft.opmerkingen ?? '';
  const submitLabel = state.orderReview ? 'Bestelling definitief doorsturen' : 'Bestelling controleren';

  return `
    <form data-order-form data-order-review="${state.orderReview ? 'true' : 'false'}">
      <div class="cart-lines">
        ${cartItems
          .map(
            ({ product, quantity }) => `
              <article class="cart-line">
                <div>
                  <strong>${escapeHtml(product.naam)}</strong>
                  <span>${escapeHtml(product.eenheid || 'stuks')} - ${formatCurrency(getProductPriceInclVat(product))} incl. btw</span>
                </div>
                <div class="quantity-control" aria-label="Aantal">
                  <button type="button" data-cart-action="decrease" data-product-id="${escapeHtml(product.id)}">-</button>
                  <output>${quantity}</output>
                  <button type="button" data-cart-action="increase" data-product-id="${escapeHtml(product.id)}">+</button>
                </div>
                <button class="text-button" type="button" data-cart-action="remove" data-product-id="${escapeHtml(product.id)}">Verwijderen</button>
              </article>
            `,
          )
          .join('')}
      </div>
      <div class="cart-totals">
        <div><span>Prijs incl. btw</span><strong>${formatCurrency(totals.incl)}</strong></div>
        <div><span>Waarvan btw</span><strong>${formatCurrency(totals.vat)}</strong></div>
        <div class="grand-total"><span>Totaal te betalen</span><strong>${formatCurrency(totals.incl)}</strong></div>
      </div>
      <label class="field">
        <span>Locatie</span>
        <select name="locatie_id" required>
          <option value="">Kies een locatie</option>
          ${state.data.locations
            .map((location) => `<option value="${escapeHtml(location.id)}" ${String(location.id) === String(selectedLocationId) ? 'selected' : ''}>${escapeHtml(getLocationLabel(location))}</option>`)
            .join('')}
        </select>
      </label>
      <label class="field">
        <span>Besteller</span>
        <select name="besteller_id" required>
          ${state.data.users
            .map((user) => `<option value="${escapeHtml(user.id)}" ${String(user.id) === String(selectedBestellerId) ? 'selected' : ''}>${escapeHtml(getUserLabel(user))}</option>`)
            .join('')}
        </select>
      </label>
      <label class="field">
        <span>Opmerking voor verwerking</span>
        <textarea name="opmerkingen" placeholder="Bijvoorbeeld dringendheid, voorraad bijna op, of levering na bepaalde datum.">${escapeHtml(opmerkingen)}</textarea>
      </label>
      ${state.orderReview ? renderOrderReview(cartItems, totals) : ''}
      <div class="form-actions">
        <button class="primary-button" type="submit">${submitLabel}</button>
        ${state.orderReview ? '<button class="ghost-button" type="button" data-edit-order-review>Aanpassen</button>' : ''}
        <button class="ghost-button" type="button" data-clear-cart>Leegmaken</button>
      </div>
    </form>
  `;
}

function renderOrderReview(cartItems, totals) {
  const location = state.data.locations.find((item) => String(item.id) === String(state.orderDraft.locatie_id));
  const besteller = state.data.users.find((item) => String(item.id) === String(state.orderDraft.besteller_id || state.appUser?.id));

  return `
    <section class="cart-review">
      <div class="review-heading">
        <strong>Controleer je bestelling</strong>
        <span>${cartItems.length} product${cartItems.length === 1 ? '' : 'en'}</span>
      </div>
      <dl class="review-meta">
        <div><dt>Locatie</dt><dd>${escapeHtml(location ? getLocationLabel(location) : 'Niet gekozen')}</dd></div>
        <div><dt>Besteller</dt><dd>${escapeHtml(besteller ? getUserLabel(besteller) : 'Niet gekozen')}</dd></div>
      </dl>
      <div class="review-lines">
        ${cartItems
          .map(({ product, quantity }) => {
            const line = calculateLine(product, quantity);
            return `
              <div>
                <span>${escapeHtml(quantity)} x ${escapeHtml(product.naam)}</span>
                <strong>${formatCurrency(line.incl)}</strong>
              </div>
            `;
          })
          .join('')}
      </div>
      <div class="review-total">
        <span>Totaal te betalen</span>
        <strong>${formatCurrency(totals.incl)}</strong>
      </div>
    </section>
  `;
}

function renderOrders(admin) {
  const orders = state.data.orders;

  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">Opvolging</p>
        <h2>${admin ? 'Alle bestellingen' : 'Mijn bestellingen'}</h2>
      </div>
      <p class="page-intro">
        Elke bestelling blijft raadpleegbaar met locatie, besteller, regels, totaalbedrag en mailstatus.
      </p>
    </section>
    ${state.notice ? `<div class="notice-panel">${escapeHtml(state.notice)}</div>` : ''}
    ${state.mailWarning ? `<div class="warning-panel">${escapeHtml(state.mailWarning)}</div>` : ''}
    ${orders.length ? `<div class="order-list">${orders.map((order) => renderOrderCard(order, admin)).join('')}</div>` : '<div class="empty-state"><p>Nog geen bestellingen gevonden.</p></div>'}
  `;
}

function renderOrderCard(order, admin) {
  return `
    <article class="order-card">
      <div class="order-card-header">
        <div>
          <span>${formatDateTime(order.created_at)}</span>
          <h3>Bestelling ${escapeHtml(order.id)}</h3>
        </div>
        <span class="status-badge">${escapeHtml(order.status || 'Nieuw')}</span>
      </div>
      <dl class="order-meta">
        <div><dt>Locatie</dt><dd>${escapeHtml(order.locatie_naam)}</dd></div>
        <div><dt>Besteller</dt><dd>${escapeHtml(order.besteller_naam)}<br /><span>${escapeHtml(order.besteller_email)}</span></dd></div>
        <div><dt>Totaal</dt><dd>${formatCurrency(order.totaal_incl_btw)}</dd></div>
        <div><dt>Mail</dt><dd>${escapeHtml(order.mail_status || 'Nog niet verzonden')}</dd></div>
      </dl>
      <div class="line-table">
        ${order.regels
          .map(
            (line) => `
              <div>
                <span>${escapeHtml(line.aantal)} x ${escapeHtml(line.product_naam)}</span>
                <strong>${formatCurrency(line.lijn_totaal_incl_btw)}</strong>
              </div>
            `,
          )
          .join('')}
      </div>
      ${order.opmerkingen ? `<p class="order-note">${escapeHtml(order.opmerkingen)}</p>` : ''}
      ${
        admin
          ? `<div class="record-actions">
              ${['Nieuw', 'In verwerking', 'Besteld bij leverancier', 'Geleverd', 'Geannuleerd']
                .map((status) => `<button class="ghost-button" type="button" data-order-id="${escapeHtml(order.id)}" data-status="${escapeHtml(status)}">${escapeHtml(status)}</button>`)
                .join('')}
            </div>`
          : ''
      }
    </article>
  `;
}

function renderAnalysis() {
  const filters = state.analysisFilters;
  const data = getAnalysisData(filters);
  const chartRows = filters.group_by === 'location' ? data.byLocation : data.byProduct;
  const tableTitle = filters.group_by === 'location' ? 'Analyse per locatie' : 'Analyse per product';

  return `
    <section class="analysis-page">
      <section class="page-heading">
        <div>
          <p class="eyebrow">Analyse</p>
          <h2>Bestelcijfers</h2>
        </div>
        <p class="page-intro">
          Filter bestellingen op periode, locatie, product en status. De resultaten kunnen afgedrukt worden of visueel bekeken worden.
        </p>
      </section>

      <form class="panel analysis-filters" data-analysis-form>
        <div class="form-grid analysis-filter-grid">
          <label class="field">
            <span>Periode vanaf</span>
            <input name="date_from" type="date" value="${escapeHtml(filters.date_from)}" />
          </label>
          <label class="field">
            <span>Periode tot</span>
            <input name="date_to" type="date" value="${escapeHtml(filters.date_to)}" />
          </label>
          <label class="field">
            <span>Locatie</span>
            <select name="location_id">
              <option value="">Alle locaties</option>
              ${state.data.locations
                .map((location) => `<option value="${escapeHtml(location.id)}" ${String(location.id) === String(filters.location_id) ? 'selected' : ''}>${escapeHtml(getLocationLabel(location))}</option>`)
                .join('')}
            </select>
          </label>
          <label class="field">
            <span>Product</span>
            <select name="product_key">
              <option value="">Alle producten</option>
              ${getAnalysisProductOptions()
                .map((product) => `<option value="${escapeHtml(product.key)}" ${product.key === filters.product_key ? 'selected' : ''}>${escapeHtml(product.label)}</option>`)
                .join('')}
            </select>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              <option value="">Alle statussen</option>
              ${getAnalysisStatusOptions()
                .map((status) => `<option value="${escapeHtml(status)}" ${status === filters.status ? 'selected' : ''}>${escapeHtml(status)}</option>`)
                .join('')}
            </select>
          </label>
          <label class="field">
            <span>Analyse</span>
            <select name="group_by">
              <option value="product" ${filters.group_by === 'product' ? 'selected' : ''}>Per product</option>
              <option value="location" ${filters.group_by === 'location' ? 'selected' : ''}>Per locatie</option>
            </select>
          </label>
          <label class="field">
            <span>Grafiek</span>
            <select name="chart_type">
              <option value="bar" ${filters.chart_type === 'bar' ? 'selected' : ''}>Staafdiagram</option>
              <option value="pie" ${filters.chart_type === 'pie' ? 'selected' : ''}>Taartdiagram</option>
            </select>
          </label>
        </div>
        <div class="form-actions analysis-actions">
          <button class="ghost-button" type="button" data-print-analysis>Afdrukken</button>
        </div>
      </form>

      <section class="analysis-summary">
        ${analysisSummaryCard('Bestellingen', data.summary.orders, 'aantal gefilterde bestellingen')}
        ${analysisSummaryCard('Locaties', data.summary.locations, 'locaties in selectie')}
        ${analysisSummaryCard('Producten', data.summary.products, 'producten in selectie')}
        ${analysisSummaryCard('Aantal', data.summary.quantity, 'stuks of eenheden')}
        ${analysisSummaryCard('Totaal', formatCurrency(data.summary.total), 'incl. btw')}
      </section>

      <section class="analysis-layout">
        <div class="panel analysis-chart-panel">
          <div class="panel-header">
            <h3>${escapeHtml(tableTitle)}</h3>
            <span>${chartRows.length} regels</span>
          </div>
          ${chartRows.length ? renderAnalysisChart(chartRows, filters.chart_type) : '<div class="empty-state is-compact"><p>Geen gegevens voor deze filter.</p></div>'}
        </div>

        <div class="panel analysis-table-panel">
          <div class="panel-header">
            <h3>Detailtabel</h3>
            <span>${formatCurrency(data.summary.total)} incl. btw</span>
          </div>
          ${renderAnalysisTable(chartRows)}
        </div>
      </section>
    </section>
  `;
}

function analysisSummaryCard(label, value, detail) {
  return `
    <article class="analysis-summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderAnalysisChart(rows, chartType) {
  const topRows = rows.slice(0, 8);

  if (chartType === 'pie') {
    return renderPieChart(topRows);
  }

  return renderBarChart(topRows);
}

function renderBarChart(rows) {
  const max = Math.max(...rows.map((row) => row.total), 1);

  return `
    <div class="bar-chart" aria-label="Staafdiagram">
      ${rows
        .map((row) => {
          const percentage = Math.max(3, Math.round((row.total / max) * 100));
          return `
            <div class="bar-row">
              <span>${escapeHtml(row.label)}</span>
              <div class="bar-track"><div class="bar-fill" style="width: ${percentage}%"></div></div>
              <strong>${formatCurrency(row.total)}</strong>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderPieChart(rows) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = ['#b61917', '#ce5f5a', '#891811', '#d8a4a1', '#6f6a6a', '#1f6f43', '#b78a88', '#423f3f'];

  return `
    <div class="pie-chart-wrap">
      <svg class="pie-chart" viewBox="0 0 180 180" role="img" aria-label="Taartdiagram">
        <circle cx="90" cy="90" r="${radius}" fill="transparent" stroke="#f5dedd" stroke-width="34"></circle>
        ${rows
          .map((row, index) => {
            const length = total > 0 ? (row.total / total) * circumference : 0;
            const segment = `
              <circle
                cx="90"
                cy="90"
                r="${radius}"
                fill="transparent"
                stroke="${colors[index % colors.length]}"
                stroke-width="34"
                stroke-dasharray="${length} ${circumference - length}"
                stroke-dashoffset="${-offset}"
                transform="rotate(-90 90 90)"
              ></circle>
            `;
            offset += length;
            return segment;
          })
          .join('')}
      </svg>
      <div class="chart-legend">
        ${rows
          .map(
            (row, index) => `
              <div>
                <span style="background: ${colors[index % colors.length]}"></span>
                <strong>${escapeHtml(row.label)}</strong>
                <small>${formatCurrency(row.total)}</small>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderAnalysisTable(rows) {
  if (!rows.length) {
    return '<div class="empty-state is-compact"><p>Geen gegevens voor deze filter.</p></div>';
  }

  return `
    <div class="analysis-table">
      <div class="analysis-table-head">
        <span>Omschrijving</span>
        <span>Bestellingen</span>
        <span>Aantal</span>
        <span>Totaal incl. btw</span>
      </div>
      ${rows
        .map(
          (row) => `
            <div class="analysis-table-row">
              <span>${escapeHtml(row.label)}</span>
              <span>${escapeHtml(row.orders)}</span>
              <span>${escapeHtml(row.quantity)}</span>
              <strong>${formatCurrency(row.total)}</strong>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderAdmin() {
  const sections = {
    products: {
      eyebrow: 'Beheer',
      title: 'Producten',
      intro: 'Beheer hier de onderhoudsproducten, omschrijvingen, foto’s en prijzen voor het gewone winkelmandje.',
      content: renderProductAdmin,
    },
    printers: {
      eyebrow: 'Beheer',
      title: 'Printers',
      intro: 'Beheer hier welke printers per locatie beschikbaar zijn voor inkt- en tonerbestellingen.',
      content: renderPrinterAdmin,
    },
    cartridges: {
      eyebrow: 'Beheer',
      title: 'Inkt en toners',
      intro: 'Koppel hier inktpatronen of toners aan de juiste printer en activeer ze pas wanneer prijs en link gecontroleerd zijn.',
      content: renderCartridgeAdmin,
    },
  };
  const section = sections[state.adminSection] ?? sections.products;

  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
        <h2>${escapeHtml(section.title)}</h2>
      </div>
      <p class="page-intro">${escapeHtml(section.intro)}</p>
    </section>
    <section class="admin-switcher" aria-label="Beheerkeuze">
      ${adminSectionButton('products', 'Producten', `${state.data.products.length} artikelen`)}
      ${adminSectionButton('printers', 'Printers toevoegen', `${state.data.printers.length} printers`)}
      ${adminSectionButton('cartridges', 'Inkt of toner toevoegen', `${state.data.cartridges.length} types`)}
    </section>
    ${section.content()}
  `;
}

function adminSectionButton(id, label, detail) {
  const active = state.adminSection === id ? 'is-active' : '';
  return `
    <button class="admin-section-button ${active}" type="button" data-admin-section="${escapeHtml(id)}">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </button>
  `;
}

function renderProductAdmin() {
  const product = state.editingProduct;
  const draft = product ? {} : state.productDraft;
  const productValue = (field, fallback = '') => product?.[field] ?? draft?.[field] ?? fallback;
  const productActive = product ? product.actief !== false : draft?.actief !== false;
  const supplierReference = product
    ? parseSupplierReference(product.leverancier_url)
    : {
        artikelnummer: draft.artikelnummer ?? '',
        url: draft.leverancier_url ?? '',
      };
  const image = productValue('image_url');

  return `
    <section class="admin-layout">
      <form class="panel product-form" data-product-form>
        <div class="panel-header">
          <h3>${product ? 'Product bewerken' : 'Product toevoegen'}</h3>
          ${product ? '<button class="ghost-button" type="button" data-cancel-product-edit>Nieuw product</button>' : ''}
        </div>
        <input type="hidden" name="id" value="${escapeHtml(product?.id || '')}" />
        <section class="form-section">
          <h4>Basis</h4>
          <label class="field"><span>Productnaam</span><input name="naam" value="${escapeHtml(productValue('naam'))}" required /></label>
          <label class="field"><span>Categorie</span><input name="categorie" list="product-categories" value="${escapeHtml(productValue('categorie', 'Sanitair en hygiene'))}" required /></label>
          <datalist id="product-categories">
            ${[...new Set(state.data.products.map((item) => item.categorie).filter(Boolean))]
              .map((category) => `<option value="${escapeHtml(category)}"></option>`)
              .join('')}
          </datalist>
          <label class="field"><span>Omschrijving voor collega&apos;s</span><textarea name="omschrijving">${escapeHtml(productValue('omschrijving'))}</textarea></label>
        </section>

        <section class="form-section">
          <h4>Leverancier</h4>
          <label class="field"><span>Leverancier</span><input name="leverancier" value="${escapeHtml(productValue('leverancier', '123schoon.nl'))}" /></label>
          <div class="form-grid two">
            <label class="field"><span>Artikelnummer</span><input name="artikelnummer" value="${escapeHtml(supplierReference.artikelnummer)}" /></label>
            <label class="field"><span>Leverancierlink</span><input name="leverancier_url" inputmode="url" value="${escapeHtml(supplierReference.url)}" placeholder="https://..." /></label>
          </div>
        </section>

        <section class="form-section">
          <h4>Prijs en bestelling</h4>
          <div class="form-grid two">
            <label class="field"><span>Verpakkingseenheid</span><input name="eenheid" value="${escapeHtml(productValue('eenheid', 'stuk'))}" placeholder="bv. fles, doos van 20 pakken" /></label>
            <label class="field"><span>Prijs incl. btw</span><input name="prijs_excl_btw" inputmode="decimal" value="${escapeHtml(productValue('prijs_excl_btw'))}" required /></label>
            <label class="field"><span>Btw %</span><input name="btw_percentage" inputmode="decimal" value="${escapeHtml(productValue('btw_percentage', 21))}" required /></label>
            <label class="field"><span>Bestelstap</span><input name="minimum_bestelhoeveelheid" type="number" min="1" value="${escapeHtml(productValue('minimum_bestelhoeveelheid', 1))}" required /></label>
          </div>
        </section>

        <section class="form-section">
          <h4>Beeld</h4>
          <label class="field"><span>Foto-URL of lokaal afbeeldingspad</span><input name="image_url" value="${escapeHtml(image)}" placeholder="/assets/voorbeeld.png" /></label>
          <div class="image-preview">
            <img src="${escapeHtml(image || defaultImage)}" alt="" loading="lazy" />
            <span>Voorbeeld in catalogus</span>
          </div>
        </section>

        <label class="toggle-field">
          <input name="actief" type="checkbox" ${productActive ? 'checked' : ''} />
          <span>Actief tonen in catalogus</span>
        </label>
        <button class="primary-button" type="submit">${product ? 'Wijzigingen bewaren' : 'Product toevoegen'}</button>
      </form>
      <div class="panel">
        <div class="panel-header">
          <h3>Assortiment</h3>
          <span>${state.data.products.length} producten</span>
        </div>
        <div class="admin-product-list">
          ${state.data.products.map(renderAdminProductRow).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderAdminProductRow(product) {
  const supplierReference = parseSupplierReference(product.leverancier_url);
  const supplierUrl = normalizeHttpUrl(supplierReference.url);

  return `
    <article class="admin-product-row ${product.actief === false ? 'is-inactive' : ''}">
      <img src="${escapeHtml(product.image_url || defaultImage)}" alt="" loading="lazy" />
      <div>
        <strong>${escapeHtml(product.naam)}</strong>
        <span>${escapeHtml(product.categorie || 'Algemeen')} - ${formatCurrency(getProductPriceInclVat(product))} incl. btw</span>
        <span>${escapeHtml(getSupplierDisplay(product))}${product.eenheid ? ` - ${escapeHtml(product.eenheid)}` : ''}</span>
      </div>
      <div class="inline-actions">
        ${supplierUrl ? `<a class="ghost-button" href="${escapeHtml(supplierUrl)}" target="_blank" rel="noreferrer">Leverancier</a>` : ''}
        <button class="ghost-button" type="button" data-edit-product="${escapeHtml(product.id)}">Bewerken</button>
        <button class="ghost-button" type="button" data-disable-product="${escapeHtml(product.id)}">Verwijderen</button>
      </div>
    </article>
  `;
}

function renderPrinterAdmin() {
  const printer = state.editingPrinter;
  const printerValue = (field, fallback = '') => printer?.[field] ?? fallback;
  const printerActive = printer ? printer.actief !== false : true;

  return `
    <section class="admin-layout">
      <form class="panel" data-printer-form>
        <div class="panel-header">
          <h3>${printer ? 'Printer bewerken' : 'Printer toevoegen'}</h3>
          ${printer ? '<button class="ghost-button" type="button" data-cancel-printer-edit>Nieuwe printer</button>' : ''}
        </div>
        <input type="hidden" name="id" value="${escapeHtml(printer?.id || '')}" />
        <section class="form-section">
          <h4>Printer per locatie</h4>
          <label class="field">
            <span>Locatie</span>
            <select name="locatie_id" required>
              <option value="">Kies een locatie</option>
              ${state.data.locations
                .map((location) => `<option value="${escapeHtml(location.id)}" ${String(location.id) === String(printerValue('locatie_id')) ? 'selected' : ''}>${escapeHtml(getLocationLabel(location))}</option>`)
                .join('')}
            </select>
          </label>
          <label class="field"><span>Printernaam</span><input name="naam" value="${escapeHtml(printerValue('naam'))}" placeholder="bv. Brother secretariaat" required /></label>
          <div class="form-grid two">
            <label class="field"><span>Merk</span><input name="merk" value="${escapeHtml(printerValue('merk'))}" /></label>
            <label class="field"><span>Model</span><input name="model" value="${escapeHtml(printerValue('model'))}" /></label>
            <label class="field"><span>Inventarisnummer</span><input name="inventaris_id" value="${escapeHtml(printerValue('inventaris_id'))}" placeholder="bv. PROFO-PT-2024-001" /></label>
            <label class="field"><span>Inventarislink</span><input name="inventaris_url" inputmode="url" value="${escapeHtml(printerValue('inventaris_url'))}" placeholder="https://inventaris.picture360.eu/..." /></label>
          </div>
          <label class="field"><span>Volgorde</span><input name="sort_order" type="number" value="${escapeHtml(printerValue('sort_order', 100))}" /></label>
        </section>
        <label class="toggle-field">
          <input name="actief" type="checkbox" ${printerActive ? 'checked' : ''} />
          <span>Actief tonen bij inktbestellingen</span>
        </label>
        <button class="primary-button" type="submit">${printer ? 'Printer bewaren' : 'Printer toevoegen'}</button>
      </form>

      <div class="panel">
        <div class="panel-header">
          <h3>Printers</h3>
          <span>${state.data.printers.length} printers</span>
        </div>
        <div class="admin-simple-list">
          ${state.data.printers.length ? state.data.printers.map(renderAdminPrinterRow).join('') : '<div class="empty-state is-compact"><p>Nog geen printers toegevoegd.</p></div>'}
        </div>
      </div>
    </section>
  `;
}

function renderCartridgeAdmin() {
  const cartridge = state.editingInkCartridge;
  const draft = cartridge ? {} : state.inkCartridgeDraft;
  const cartridgeValue = (field, fallback = '') => cartridge?.[field] ?? draft?.[field] ?? fallback;
  const selectedPrinterId = String(cartridgeValue('printer_id', state.adminCartridgePrinterId || ''));
  const cartridgeActive = cartridge ? cartridge.actief !== false : draft?.actief !== false;
  const cartridgesForSelectedPrinter = selectedPrinterId
    ? state.data.cartridges.filter((item) => String(item.printer_id) === String(selectedPrinterId))
    : state.data.cartridges;

  return `
    <section class="admin-layout">
      <form class="panel" data-ink-cartridge-form>
        <div class="panel-header">
          <h3>${cartridge ? 'Inkt of toner bewerken' : 'Inkt of toner toevoegen'}</h3>
          ${cartridge ? '<button class="ghost-button" type="button" data-cancel-ink-edit>Nieuw type</button>' : ''}
        </div>
        <input type="hidden" name="id" value="${escapeHtml(cartridge?.id || '')}" />
        <section class="form-section">
          <h4>Koppeling aan printer</h4>
          <label class="field">
            <span>Printer</span>
            <select name="printer_id" required>
              <option value="">Kies een printer</option>
              ${state.data.printers
                .map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selectedPrinterId) ? 'selected' : ''}>${escapeHtml(getPrinterAdminLabel(item))}</option>`)
                .join('')}
            </select>
          </label>
          <label class="field">
            <span>Kleur</span>
            <select name="kleur" required>
              ${['BK', 'C', 'M', 'Y']
                .map((kleur) => `<option value="${kleur}" ${String(cartridgeValue('kleur', 'BK')) === kleur ? 'selected' : ''}>${escapeHtml(getInkColorLabel(kleur))}</option>`)
                .join('')}
            </select>
          </label>
          <label class="field"><span>Naam in catalogus</span><input name="naam" value="${escapeHtml(cartridgeValue('naam'))}" placeholder="bv. Brother LC-3219XL zwart" required /></label>
        </section>

        <section class="form-section">
          <h4>Leverancier en prijs</h4>
          <div class="form-grid two">
            <label class="field"><span>Artikelnummer</span><input name="artikelnummer" value="${escapeHtml(cartridgeValue('artikelnummer'))}" /></label>
            <label class="field"><span>Leverancier</span><input name="leverancier" value="${escapeHtml(cartridgeValue('leverancier', '123inkt.nl'))}" /></label>
            <label class="field"><span>Prijs incl. btw</span><input name="prijs_incl_btw" inputmode="decimal" value="${escapeHtml(cartridgeValue('prijs_incl_btw'))}" required /></label>
            <label class="field"><span>Btw %</span><input name="btw_percentage" inputmode="decimal" value="${escapeHtml(cartridgeValue('btw_percentage', 21))}" required /></label>
            <label class="field"><span>Eenheid</span><input name="eenheid" value="${escapeHtml(cartridgeValue('eenheid', 'stuk'))}" /></label>
            <label class="field"><span>Volgorde</span><input name="sort_order" type="number" value="${escapeHtml(cartridgeValue('sort_order', 100))}" /></label>
          </div>
          <label class="field"><span>Leverancierlink</span><input name="leverancier_url" inputmode="url" value="${escapeHtml(cartridgeValue('leverancier_url'))}" placeholder="https://www.123inkt.nl/..." /></label>
        </section>
        <label class="toggle-field">
          <input name="actief" type="checkbox" ${cartridgeActive ? 'checked' : ''} />
          <span>Actief tonen bij deze printer</span>
        </label>
        <button class="primary-button" type="submit">${cartridge ? 'Type bewaren' : 'Type toevoegen'}</button>
      </form>

      <div class="panel">
        <div class="panel-header">
          <h3>Inkt en toners</h3>
          <span>${cartridgesForSelectedPrinter.length} types</span>
        </div>
        ${
          selectedPrinterId
            ? `<div class="linked-printer-note">Geselecteerde printer: ${escapeHtml(getPrinterAdminLabel(getPrinterById(selectedPrinterId) || {}))}</div>`
            : '<div class="linked-printer-note">Kies links een printer om de gekoppelde inkt of toner gericht te bekijken.</div>'
        }
        <p class="panel-hint">Gebruik Overnemen om de gegevens links in het formulier te plaatsen. Gebruik Bewerken alleen om de bestaande regel zelf aan te passen.</p>
        <div class="admin-simple-list">
          ${cartridgesForSelectedPrinter.length ? cartridgesForSelectedPrinter.map(renderAdminCartridgeRow).join('') : '<div class="empty-state is-compact"><p>Nog geen cartridges of toners toegevoegd voor deze selectie.</p></div>'}
        </div>
      </div>
    </section>
  `;
}

function renderAdminPrinterRow(printer) {
  return `
    <article class="admin-simple-row ${printer.actief === false ? 'is-inactive' : ''}">
      <div>
        <strong>${escapeHtml(getPrinterLabel(printer))}</strong>
        <span>${escapeHtml(printer.locatie_naam || 'Locatie niet gekend')}</span>
        ${printer.inventaris_id ? `<span>${escapeHtml(printer.inventaris_id)}</span>` : ''}
      </div>
      <div class="inline-actions">
        ${normalizeHttpUrl(printer.inventaris_url) ? `<a class="ghost-button" href="${escapeHtml(normalizeHttpUrl(printer.inventaris_url))}" target="_blank" rel="noreferrer">Inventaris</a>` : ''}
        <button class="ghost-button" type="button" data-edit-printer="${escapeHtml(printer.id)}">Bewerken</button>
        <button class="ghost-button" type="button" data-disable-printer="${escapeHtml(printer.id)}">Verwijderen</button>
      </div>
    </article>
  `;
}

function renderAdminCartridgeRow(cartridge) {
  const printer = getPrinterById(cartridge.printer_id);
  const supplierUrl = normalizeHttpUrl(cartridge.leverancier_url);

  return `
    <article class="admin-simple-row ${cartridge.actief === false ? 'is-inactive' : ''}">
      <div>
        <strong>${escapeHtml(getInkColorLabel(cartridge.kleur))} - ${escapeHtml(cartridge.naam)}</strong>
        <span>${escapeHtml(printer ? getPrinterAdminLabel(printer) : 'Printer niet gevonden')}</span>
        <span>${escapeHtml(cartridge.artikelnummer ? `Art. ${cartridge.artikelnummer}` : cartridge.leverancier || 'Leverancier nog te bepalen')} - ${formatCurrency(getCartridgePriceInclVat(cartridge))} incl. btw</span>
      </div>
      <div class="inline-actions">
        ${supplierUrl ? `<a class="ghost-button" href="${escapeHtml(supplierUrl)}" target="_blank" rel="noreferrer">Leverancier</a>` : ''}
        <button class="ghost-button" type="button" data-copy-ink-cartridge="${escapeHtml(cartridge.id)}">Overnemen</button>
        <button class="ghost-button" type="button" data-edit-ink-cartridge="${escapeHtml(cartridge.id)}">Bewerken</button>
        <button class="ghost-button" type="button" data-disable-ink-cartridge="${escapeHtml(cartridge.id)}">Verwijderen</button>
      </div>
    </article>
  `;
}

async function handleAuth(form) {
  const formData = new FormData(form);
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email.endsWith('@profo.be')) {
    state.error = 'Gebruik je PROFO-mailadres.';
    render();
    return;
  }

  try {
    if (state.authMode === 'register') {
      const name = String(formData.get('name') ?? '').trim();
      const result = await signUpWithPassword(email, password, { full_name: name || email });
      state.session = result.session;
      state.notice = 'Account aangemaakt. Bevestig eventueel eerst je e-mailadres en meld daarna aan.';
    } else {
      state.session = await signInWithPassword(email, password);
      state.notice = '';
    }

    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleOrder(form) {
  const cartItems = getCartItems();

  if (!cartItems.length) {
    return;
  }

  const formData = new FormData(form);
  state.orderDraft = readOrderDraftFromForm(form);
  persistOrderDraft();

  const location = state.data.locations.find((item) => String(item.id) === String(formData.get('locatie_id')));
  const besteller = state.data.users.find((item) => String(item.id) === String(formData.get('besteller_id')));

  if (!location || !besteller) {
    state.error = 'Kies een locatie en besteller.';
    render();
    return;
  }

  if (form.dataset.orderReview !== 'true') {
    state.error = '';
    state.orderReview = true;
    render();
    return;
  }

  const totals = calculateTotals(cartItems);
  const orderPayload = {
    locatie_id: location.id,
    locatie_naam: getLocationLabel(location),
    besteller_id: besteller.id,
    besteller_naam: getUserLabel(besteller),
    besteller_email: besteller.email,
    aangemaakt_door_id: state.appUser.id,
    aangemaakt_door_email: state.session.user.email,
    status: 'Nieuw',
    opmerkingen: String(formData.get('opmerkingen') ?? '').trim(),
    totaal_excl_btw: totals.excl,
    totaal_btw: totals.vat,
    totaal_incl_btw: totals.incl,
    mail_status: 'Automatische mail wordt verzonden',
  };

  const linePayloads = cartItems.map(({ product, quantity }) => {
    const line = calculateLine(product, quantity);
    return {
      product_id: product.id,
      product_naam: product.naam,
      product_omschrijving: product.omschrijving,
      aantal: quantity,
      eenheid: product.eenheid,
      eenheidsprijs_excl_btw: line.unitExcl,
      btw_percentage: roundMoney(product.btw_percentage ?? 21),
      lijn_totaal_excl_btw: line.excl,
      lijn_totaal_btw: line.vat,
      lijn_totaal_incl_btw: line.incl,
    };
  });

  try {
    const order = await createOrder(orderPayload, linePayloads);
    state.mailWarning = '';

    try {
      await invokeOrderMail(order.id);
    } catch (mailError) {
      const mailStatus = `Mailfout: ${mailError.message}`.slice(0, 240);
      try {
        await updateOrderMailStatus(order.id, mailStatus);
      } catch {
        // De bestelling zelf is al bewaard; de waarschuwing hieronder blijft dan de belangrijkste feedback.
      }
      state.mailWarning = `De bestelling is bewaard, maar de automatische mail is nog niet verzonden: ${mailError.message}`;
    }

    state.cart = {};
    state.orderReview = false;
    persistCart();
    clearOrderDraft();
    state.notice = 'De bestelling is bewaard en doorgestuurd voor verwerking.';
    state.view = 'bestellingen';
    window.location.hash = '#bestellingen';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleInkOrder(form) {
  const inkItems = getInkItems();

  if (!inkItems.length) {
    state.error = 'Kies minstens een kleur of toner om te bestellen.';
    render();
    return;
  }

  const formData = new FormData(form);
  state.inkDraft = {
    ...state.inkDraft,
    ...readInkDraftFromForm(form),
  };
  persistInkDraft();

  const location = state.data.locations.find((item) => String(item.id) === String(formData.get('locatie_id')));
  const besteller = state.data.users.find((item) => String(item.id) === String(formData.get('besteller_id')));
  const printer = state.data.printers.find((item) => String(item.id) === String(formData.get('printer_id')));

  if (!location || !besteller || !printer) {
    state.error = 'Kies een besteller, locatie en printer.';
    render();
    return;
  }

  if (String(printer.locatie_id) !== String(location.id)) {
    state.error = 'De gekozen printer hoort niet bij deze locatie. Kies opnieuw de locatie en printer.';
    render();
    return;
  }

  if (form.dataset.inkReview !== 'true') {
    state.error = '';
    state.inkReview = true;
    render();
    return;
  }

  const totals = calculateInkTotals(inkItems);
  const opmerkingen = String(formData.get('opmerkingen') ?? '').trim();
  const orderPayload = {
    locatie_id: location.id,
    locatie_naam: getLocationLabel(location),
    besteller_id: besteller.id,
    besteller_naam: getUserLabel(besteller),
    besteller_email: besteller.email,
    aangemaakt_door_id: state.appUser.id,
    aangemaakt_door_email: state.session.user.email,
    status: 'Nieuw',
    opmerkingen: [
      'Inktbestelling',
      `Printer: ${getPrinterLabel(printer)}`,
      opmerkingen ? `Opmerking: ${opmerkingen}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    totaal_excl_btw: totals.excl,
    totaal_btw: totals.vat,
    totaal_incl_btw: totals.incl,
    mail_status: 'Automatische mail wordt verzonden',
  };

  const linePayloads = inkItems.map(({ cartridge, quantity }) => {
    const line = calculateInkLine(cartridge, quantity);
    return {
      product_id: null,
      product_naam: `${getInkColorLabel(cartridge.kleur)} - ${cartridge.naam}`,
      product_omschrijving: `Inkt/toner voor ${getPrinterLabel(printer)}${cartridge.artikelnummer ? ` - art. ${cartridge.artikelnummer}` : ''}`,
      aantal: quantity,
      eenheid: cartridge.eenheid || 'stuk',
      eenheidsprijs_excl_btw: line.unitExcl,
      btw_percentage: roundMoney(cartridge.btw_percentage ?? 21),
      lijn_totaal_excl_btw: line.excl,
      lijn_totaal_btw: line.vat,
      lijn_totaal_incl_btw: line.incl,
    };
  });

  try {
    const order = await createOrder(orderPayload, linePayloads);
    state.mailWarning = '';

    try {
      await invokeOrderMail(order.id);
    } catch (mailError) {
      const mailStatus = `Mailfout: ${mailError.message}`.slice(0, 240);
      try {
        await updateOrderMailStatus(order.id, mailStatus);
      } catch {
        // De bestelling zelf is bewaard; de waarschuwing blijft zichtbaar in de app.
      }
      state.mailWarning = `De inktbestelling is bewaard, maar de automatische mail is nog niet verzonden: ${mailError.message}`;
    }

    clearInkDraft();
    state.inkReview = false;
    state.notice = 'De inktbestelling is bewaard en doorgestuurd voor verwerking.';
    state.view = 'bestellingen';
    window.location.hash = '#bestellingen';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleProductSave(form) {
  const formData = new FormData(form);
  const id = String(formData.get('id') ?? '').trim() || null;
  const payload = {
    naam: String(formData.get('naam') ?? '').trim(),
    categorie: String(formData.get('categorie') ?? '').trim(),
    leverancier: String(formData.get('leverancier') ?? '').trim(),
    leverancier_url: stringifySupplierReference(
      String(formData.get('artikelnummer') ?? '').trim(),
      String(formData.get('leverancier_url') ?? '').trim(),
    ),
    omschrijving: String(formData.get('omschrijving') ?? '').trim(),
    eenheid: String(formData.get('eenheid') ?? '').trim(),
    prijs_excl_btw: roundMoney(parseDecimal(formData.get('prijs_excl_btw'))),
    btw_percentage: roundMoney(parseDecimal(formData.get('btw_percentage'))),
    minimum_bestelhoeveelheid: Math.max(1, Number(formData.get('minimum_bestelhoeveelheid') || 1)),
    image_url: String(formData.get('image_url') ?? '').trim(),
    actief: formData.get('actief') === 'on',
  };

  try {
    await saveProduct(payload, id);
    state.editingProduct = null;
    if (!id) {
      clearProductDraft();
    }
    state.notice = id ? 'Product aangepast.' : 'Product toegevoegd.';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleProductDisable(id) {
  try {
    await disableProduct(id);
    state.notice = 'Product uit de catalogus verwijderd.';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handlePrinterSave(form) {
  const formData = new FormData(form);
  const id = String(formData.get('id') ?? '').trim() || null;
  const location = state.data.locations.find((item) => String(item.id) === String(formData.get('locatie_id')));

  if (!location) {
    state.error = 'Kies een locatie voor deze printer.';
    render();
    return;
  }

  const payload = {
    locatie_id: location.id,
    locatie_naam: getLocationLabel(location),
    naam: String(formData.get('naam') ?? '').trim(),
    merk: String(formData.get('merk') ?? '').trim(),
    model: String(formData.get('model') ?? '').trim(),
    inventaris_id: String(formData.get('inventaris_id') ?? '').trim(),
    inventaris_url: String(formData.get('inventaris_url') ?? '').trim(),
    sort_order: Number(formData.get('sort_order') || 100),
    actief: formData.get('actief') === 'on',
  };

  try {
    await savePrinter(payload, id);
    state.editingPrinter = null;
    state.notice = id ? 'Printer aangepast.' : 'Printer toegevoegd.';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handlePrinterDisable(id) {
  try {
    await disablePrinter(id);
    state.notice = 'Printer uit de inktmodule verwijderd.';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleInkCartridgeSave(form) {
  const formData = new FormData(form);
  const id = String(formData.get('id') ?? '').trim() || null;
  const printer = state.data.printers.find((item) => String(item.id) === String(formData.get('printer_id')));

  if (!printer) {
    state.error = 'Kies een printer voor dit inkt- of tonertype.';
    render();
    return;
  }

  const payload = {
    printer_id: printer.id,
    kleur: String(formData.get('kleur') ?? 'BK').trim(),
    naam: String(formData.get('naam') ?? '').trim(),
    artikelnummer: String(formData.get('artikelnummer') ?? '').trim(),
    leverancier: String(formData.get('leverancier') ?? '').trim() || '123inkt.nl',
    leverancier_url: String(formData.get('leverancier_url') ?? '').trim(),
    prijs_incl_btw: roundMoney(parseDecimal(formData.get('prijs_incl_btw'))),
    btw_percentage: roundMoney(parseDecimal(formData.get('btw_percentage'))),
    eenheid: String(formData.get('eenheid') ?? '').trim() || 'stuk',
    sort_order: Number(formData.get('sort_order') || 100),
    actief: formData.get('actief') === 'on',
  };

  try {
    await saveInkCartridge(payload, id);
    state.editingInkCartridge = null;
    state.adminCartridgePrinterId = String(printer.id);
    if (!id) {
      clearInkCartridgeDraft();
      state.adminCartridgePrinterId = String(printer.id);
    }
    state.notice = id ? 'Inkt- of tonertype aangepast.' : 'Inkt- of tonertype toegevoegd.';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleInkCartridgeDisable(id) {
  try {
    await disableInkCartridge(id);
    state.notice = 'Inkt- of tonertype verwijderd.';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

function copyCartridgeToDraft(cartridge) {
  if (!cartridge) {
    return;
  }

  state.editingInkCartridge = null;
  state.adminSection = 'cartridges';
  state.adminCartridgePrinterId = String(cartridge.printer_id || '');
  state.inkCartridgeDraft = {
    printer_id: String(cartridge.printer_id || ''),
    kleur: String(cartridge.kleur || 'BK'),
    naam: String(cartridge.naam || ''),
    artikelnummer: String(cartridge.artikelnummer || ''),
    leverancier: String(cartridge.leverancier || '123inkt.nl'),
    prijs_incl_btw: String(cartridge.prijs_incl_btw ?? ''),
    btw_percentage: String(cartridge.btw_percentage ?? 21),
    eenheid: String(cartridge.eenheid || 'stuk'),
    sort_order: String(cartridge.sort_order ?? 100),
    leverancier_url: String(cartridge.leverancier_url || ''),
    actief: cartridge.actief !== false,
  };
  persistInkCartridgeDraft();
  state.notice = 'Gegevens overgenomen in het formulier. Controleer prijs en link voor je bewaart.';
  render();
}

async function handleStatusChange(orderId, status) {
  try {
    await updateOrderStatus(orderId, status);
    state.notice = 'Status aangepast.';
    await bootstrapData();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

function addToCart(productId, step = 1) {
  const current = Number(state.cart[productId] || 0);
  state.cart[productId] = current + step;
  state.orderReview = false;
  state.error = '';
  persistCart();
  render();
}

function updateCart(productId, action) {
  const product = state.data.products.find((item) => String(item.id) === String(productId));
  const step = Number(product?.minimum_bestelhoeveelheid || 1);
  const current = Number(state.cart[productId] || 0);

  if (action === 'increase') {
    state.cart[productId] = current + step;
  }

  if (action === 'decrease') {
    state.cart[productId] = Math.max(0, current - step);
  }

  if (action === 'remove' || state.cart[productId] === 0) {
    delete state.cart[productId];
  }

  state.orderReview = false;
  state.error = '';
  persistCart();
  render();
}

function updateInkQuantity(cartridgeId, action) {
  const cartridge = state.data.cartridges.find((item) => String(item.id) === String(cartridgeId));

  if (!cartridge || !isCartridgeOrderable(cartridge)) {
    return;
  }

  const quantities = { ...(state.inkDraft.quantities ?? {}) };
  const current = Number(quantities[cartridgeId] || 0);

  if (action === 'increase') {
    quantities[cartridgeId] = current + 1;
  }

  if (action === 'decrease') {
    quantities[cartridgeId] = Math.max(0, current - 1);
  }

  if (action === 'remove' || quantities[cartridgeId] === 0) {
    delete quantities[cartridgeId];
  }

  state.inkDraft = {
    ...state.inkDraft,
    printer_id: String(cartridge.printer_id),
    quantities,
  };
  state.inkReview = false;
  state.error = '';
  persistInkDraft();
  render();
}

function toggleInkSelection(cartridgeId, checked) {
  const cartridge = state.data.cartridges.find((item) => String(item.id) === String(cartridgeId));

  if (!cartridge || !isCartridgeOrderable(cartridge)) {
    return;
  }

  const quantities = { ...(state.inkDraft.quantities ?? {}) };

  if (checked) {
    quantities[cartridgeId] = Math.max(1, Number(quantities[cartridgeId] || 0));
  } else {
    delete quantities[cartridgeId];
  }

  state.inkDraft = {
    ...state.inkDraft,
    printer_id: String(cartridge.printer_id),
    quantities,
  };
  state.inkReview = false;
  state.error = '';
  persistInkDraft();
  render();
}

function getCartItems() {
  return Object.entries(state.cart)
    .map(([productId, quantity]) => ({
      product: state.data.products.find((product) => String(product.id) === String(productId)),
      quantity: Number(quantity),
    }))
    .filter((item) => item.product && item.quantity > 0);
}

function getInkItems() {
  return Object.entries(state.inkDraft.quantities ?? {})
    .map(([cartridgeId, quantity]) => ({
      cartridge: state.data.cartridges.find((cartridge) => String(cartridge.id) === String(cartridgeId)),
      quantity: Number(quantity),
    }))
    .filter(
      (item) =>
        item.cartridge &&
        item.quantity > 0 &&
        isCartridgeOrderable(item.cartridge) &&
        String(item.cartridge.printer_id) === String(state.inkDraft.printer_id),
    );
}

function calculateLine(product, quantity) {
  const unitIncl = getProductPriceInclVat(product);
  const vatRate = Number(product.btw_percentage ?? 21) / 100;
  const unitExcl = roundMoney(unitIncl / (1 + vatRate));
  const incl = roundMoney(unitIncl * quantity);
  const excl = roundMoney(incl / (1 + vatRate));
  const vat = roundMoney(incl - excl);

  return {
    unitIncl,
    unitExcl,
    excl,
    vat,
    incl,
  };
}

function calculateTotals(cartItems) {
  return cartItems.reduce(
    (totals, item) => {
      const line = calculateLine(item.product, item.quantity);
      totals.excl = roundMoney(totals.excl + line.excl);
      totals.vat = roundMoney(totals.vat + line.vat);
      totals.incl = roundMoney(totals.incl + line.incl);
      return totals;
    },
    { excl: 0, vat: 0, incl: 0 },
  );
}

function calculateInkLine(cartridge, quantity) {
  const unitIncl = getCartridgePriceInclVat(cartridge);
  const vatRate = Number(cartridge.btw_percentage ?? 21) / 100;
  const unitExcl = roundMoney(unitIncl / (1 + vatRate));
  const incl = roundMoney(unitIncl * quantity);
  const excl = roundMoney(incl / (1 + vatRate));
  const vat = roundMoney(incl - excl);

  return {
    unitIncl,
    unitExcl,
    excl,
    vat,
    incl,
  };
}

function calculateInkTotals(inkItems) {
  return inkItems.reduce(
    (totals, item) => {
      const line = calculateInkLine(item.cartridge, item.quantity);
      totals.excl = roundMoney(totals.excl + line.excl);
      totals.vat = roundMoney(totals.vat + line.vat);
      totals.incl = roundMoney(totals.incl + line.incl);
      return totals;
    },
    { excl: 0, vat: 0, incl: 0 },
  );
}

function getProductPriceInclVat(product) {
  return roundMoney(parseDecimal(product.prijs_excl_btw));
}

function getCartridgePriceInclVat(cartridge) {
  return roundMoney(parseDecimal(cartridge.prijs_incl_btw));
}

function isCartridgeOrderable(cartridge) {
  return cartridge?.actief !== false;
}

function getCartridgeOrderStatus(cartridge) {
  if (cartridge?.actief === false) {
    return 'Nog niet actief in beheer';
  }

  if (getCartridgePriceInclVat(cartridge) <= 0) {
    return 'Testfase: prijs nog niet ingevuld';
  }

  return '';
}

function getInkColorLabel(color) {
  const labels = {
    BK: 'Zwart (BK)',
    C: 'Cyaan (C)',
    M: 'Magenta (M)',
    Y: 'Geel (Y)',
  };

  return labels[color] ?? color ?? 'Kleur';
}

function getPrinterById(id) {
  return state.data.printers.find((printer) => String(printer.id) === String(id));
}

function getSelectedInkPrinter() {
  return getPrinterById(state.inkDraft.printer_id);
}

function getPrintersForLocation(locationId) {
  return state.data.printers.filter(
    (printer) => printer.actief !== false && String(printer.locatie_id) === String(locationId || ''),
  );
}

function getCartridgesForPrinter(printerId) {
  return state.data.cartridges.filter(
    (cartridge) =>
      cartridge.actief !== false &&
      String(cartridge.printer_id) === String(printerId || ''),
  );
}

function getAllCartridgesForPrinter(printerId) {
  return state.data.cartridges.filter(
    (cartridge) => String(cartridge.printer_id) === String(printerId || ''),
  );
}

function getPrinterLabel(printer) {
  const label = [printer.naam, printer.merk, printer.model].filter(Boolean).join(' - ') || `Printer ${printer?.id ?? ''}`;
  return printer.inventaris_id ? `${label} (${printer.inventaris_id})` : label;
}

function getPrinterAdminLabel(printer) {
  return `${printer.locatie_naam || 'Locatie niet gekend'} - ${getPrinterLabel(printer)}`;
}

function getSupplierDisplay(product) {
  const reference = parseSupplierReference(product.leverancier_url);
  const supplier = product.leverancier || 'Leverancier nog te bepalen';
  return reference.artikelnummer ? `${supplier} - art. ${reference.artikelnummer}` : supplier;
}

function getAnalysisData(filters) {
  const rows = [];
  const orderIds = new Set();
  const locationNames = new Set();
  const productNames = new Set();

  state.data.orders.forEach((order) => {
    if (!orderMatchesAnalysisFilters(order, filters)) {
      return;
    }

    (order.regels ?? []).forEach((line) => {
      if (filters.product_key && getLineProductKey(line) !== filters.product_key) {
        return;
      }

      const quantity = Number(line.aantal || 0);
      const total = roundMoney(line.lijn_totaal_incl_btw || 0);
      const productLabel = line.product_naam || 'Product niet gekend';
      const locationLabel = order.locatie_naam || 'Locatie niet gekend';

      rows.push({
        orderId: order.id,
        locationLabel,
        productLabel,
        quantity,
        total,
      });

      orderIds.add(order.id);
      locationNames.add(locationLabel);
      productNames.add(productLabel);
    });
  });

  return {
    summary: {
      orders: orderIds.size,
      locations: locationNames.size,
      products: productNames.size,
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      total: roundMoney(rows.reduce((sum, row) => sum + row.total, 0)),
    },
    byProduct: aggregateAnalysisRows(rows, 'productLabel'),
    byLocation: aggregateAnalysisRows(rows, 'locationLabel'),
  };
}

function orderMatchesAnalysisFilters(order, filters) {
  const orderDate = getDateInputValue(order.created_at);

  if (filters.date_from && orderDate && orderDate < filters.date_from) {
    return false;
  }

  if (filters.date_to && orderDate && orderDate > filters.date_to) {
    return false;
  }

  if (filters.location_id && String(order.locatie_id) !== String(filters.location_id)) {
    return false;
  }

  if (filters.status && String(order.status || '') !== String(filters.status)) {
    return false;
  }

  if (filters.product_key) {
    return (order.regels ?? []).some((line) => getLineProductKey(line) === filters.product_key);
  }

  return true;
}

function aggregateAnalysisRows(rows, key) {
  const groups = rows.reduce((map, row) => {
    const label = row[key] || 'Niet gekend';
    const item = map.get(label) ?? {
      label,
      orders: new Set(),
      quantity: 0,
      total: 0,
    };

    item.orders.add(row.orderId);
    item.quantity += row.quantity;
    item.total = roundMoney(item.total + row.total);
    map.set(label, item);
    return map;
  }, new Map());

  return [...groups.values()]
    .map((item) => ({
      label: item.label,
      orders: item.orders.size,
      quantity: item.quantity,
      total: item.total,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'nl-BE'));
}

function getAnalysisProductOptions() {
  const products = new Map();

  state.data.orders.forEach((order) => {
    (order.regels ?? []).forEach((line) => {
      const key = getLineProductKey(line);
      const label = line.product_naam || 'Product niet gekend';

      if (!products.has(key)) {
        products.set(key, label);
      }
    });
  });

  return [...products.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'nl-BE'));
}

function getAnalysisStatusOptions() {
  return [...new Set(state.data.orders.map((order) => order.status).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'nl-BE'),
  );
}

function getLineProductKey(line) {
  return line.product_id ? `product:${line.product_id}` : `name:${line.product_naam || 'onbekend'}`;
}

function getDateInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function parseSupplierReference(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return {
      artikelnummer: '',
      url: '',
    };
  }

  try {
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object') {
      return {
        artikelnummer: String(parsed.artikelnummer ?? '').trim(),
        url: String(parsed.url ?? '').trim(),
      };
    }
  } catch {
    // Oudere waarden waren gewone tekst of een gewone link.
  }

  if (normalizeHttpUrl(raw)) {
    return {
      artikelnummer: '',
      url: raw,
    };
  }

  return {
    artikelnummer: raw,
    url: '',
  };
}

function stringifySupplierReference(artikelnummer, url) {
  const reference = {
    artikelnummer: String(artikelnummer ?? '').trim(),
    url: String(url ?? '').trim(),
  };

  if (!reference.artikelnummer && !reference.url) {
    return '';
  }

  return JSON.stringify(reference);
}

function normalizeHttpUrl(value) {
  const url = String(value ?? '').trim();

  if (!url) {
    return '';
  }

  return /^https?:\/\//i.test(url) ? url : '';
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(cartStorageKey) || '{}');
  } catch {
    return {};
  }
}

function persistCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(state.cart));
}

function readOrderDraft() {
  try {
    return JSON.parse(localStorage.getItem(orderDraftStorageKey) || '{}');
  } catch {
    return {};
  }
}

function readOrderDraftFromForm(form) {
  const formData = new FormData(form);

  return {
    locatie_id: String(formData.get('locatie_id') ?? ''),
    besteller_id: String(formData.get('besteller_id') ?? ''),
    opmerkingen: String(formData.get('opmerkingen') ?? ''),
  };
}

function persistOrderDraft() {
  localStorage.setItem(orderDraftStorageKey, JSON.stringify(state.orderDraft));
}

function clearOrderDraft() {
  state.orderDraft = {};
  localStorage.removeItem(orderDraftStorageKey);
}

function readInkDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(inkDraftStorageKey) || '{}');
    return {
      locatie_id: String(draft.locatie_id ?? ''),
      besteller_id: String(draft.besteller_id ?? ''),
      printer_id: String(draft.printer_id ?? ''),
      opmerkingen: String(draft.opmerkingen ?? ''),
      quantities: draft.quantities && typeof draft.quantities === 'object' ? draft.quantities : {},
    };
  } catch {
    return {
      quantities: {},
    };
  }
}

function readInkDraftFromForm(form) {
  const formData = new FormData(form);

  return {
    locatie_id: String(formData.get('locatie_id') ?? ''),
    besteller_id: String(formData.get('besteller_id') ?? ''),
    printer_id: String(formData.get('printer_id') ?? ''),
    opmerkingen: String(formData.get('opmerkingen') ?? ''),
  };
}

function persistInkDraft() {
  localStorage.setItem(inkDraftStorageKey, JSON.stringify(state.inkDraft));
}

function clearInkDraft() {
  state.inkDraft = {
    quantities: {},
  };
  localStorage.removeItem(inkDraftStorageKey);
}

function readProductDraft() {
  try {
    return JSON.parse(localStorage.getItem(productDraftStorageKey) || '{}');
  } catch {
    return {};
  }
}

function readProductDraftFromForm(form) {
  const formData = new FormData(form);

  return {
    naam: String(formData.get('naam') ?? ''),
    categorie: String(formData.get('categorie') ?? ''),
    leverancier: String(formData.get('leverancier') ?? ''),
    artikelnummer: String(formData.get('artikelnummer') ?? ''),
    leverancier_url: String(formData.get('leverancier_url') ?? ''),
    omschrijving: String(formData.get('omschrijving') ?? ''),
    eenheid: String(formData.get('eenheid') ?? ''),
    prijs_excl_btw: String(formData.get('prijs_excl_btw') ?? ''),
    btw_percentage: String(formData.get('btw_percentage') ?? ''),
    minimum_bestelhoeveelheid: String(formData.get('minimum_bestelhoeveelheid') ?? ''),
    image_url: String(formData.get('image_url') ?? ''),
    actief: formData.get('actief') === 'on',
  };
}

function persistProductDraft() {
  localStorage.setItem(productDraftStorageKey, JSON.stringify(state.productDraft));
}

function clearProductDraft() {
  state.productDraft = {};
  localStorage.removeItem(productDraftStorageKey);
}

function readInkCartridgeDraft() {
  try {
    return JSON.parse(localStorage.getItem(inkCartridgeDraftStorageKey) || '{}');
  } catch {
    return {};
  }
}

function readInkCartridgeDraftFromForm(form) {
  const formData = new FormData(form);

  return {
    printer_id: String(formData.get('printer_id') ?? ''),
    kleur: String(formData.get('kleur') ?? 'BK'),
    naam: String(formData.get('naam') ?? ''),
    artikelnummer: String(formData.get('artikelnummer') ?? ''),
    leverancier: String(formData.get('leverancier') ?? ''),
    prijs_incl_btw: String(formData.get('prijs_incl_btw') ?? ''),
    btw_percentage: String(formData.get('btw_percentage') ?? ''),
    eenheid: String(formData.get('eenheid') ?? ''),
    sort_order: String(formData.get('sort_order') ?? ''),
    leverancier_url: String(formData.get('leverancier_url') ?? ''),
    actief: formData.get('actief') === 'on',
  };
}

function persistInkCartridgeDraft() {
  localStorage.setItem(inkCartridgeDraftStorageKey, JSON.stringify(state.inkCartridgeDraft));
}

function clearInkCartridgeDraft() {
  state.inkCartridgeDraft = {};
  localStorage.removeItem(inkCartridgeDraftStorageKey);
}

function readAnalysisFilters() {
  const defaults = {
    date_from: '',
    date_to: '',
    location_id: '',
    product_key: '',
    status: '',
    group_by: 'product',
    chart_type: 'bar',
  };

  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem(analysisFiltersStorageKey) || '{}'),
    };
  } catch {
    return defaults;
  }
}

function readAnalysisFiltersFromForm(form) {
  const formData = new FormData(form);

  return {
    date_from: String(formData.get('date_from') ?? ''),
    date_to: String(formData.get('date_to') ?? ''),
    location_id: String(formData.get('location_id') ?? ''),
    product_key: String(formData.get('product_key') ?? ''),
    status: String(formData.get('status') ?? ''),
    group_by: String(formData.get('group_by') ?? 'product'),
    chart_type: String(formData.get('chart_type') ?? 'bar'),
  };
}

function persistAnalysisFilters() {
  localStorage.setItem(analysisFiltersStorageKey, JSON.stringify(state.analysisFilters));
}

function getRoute() {
  const route = window.location.hash.replace('#', '');
  return ['bestellen', 'inkt', 'bestellingen', 'analyse', 'beheer'].includes(route) ? route : 'bestellen';
}
