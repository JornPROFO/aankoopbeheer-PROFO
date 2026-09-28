import { escapeHtml as e, formatDateTime } from './utils/format.js';
import { suppliers, outcomes, reasons, prepareLines, latestResults, cartSummary, transferReadiness } from './services/supplierCartModel.js';
import * as service from './services/supplierCartService.js';
import './styles/supplier-cart.css';

export async function openSupplierCart(orderId, api = service) {
  document.querySelector('[data-supplier-cart-dialog]')?.remove();
  const dialog = document.createElement('dialog');
  dialog.dataset.supplierCartDialog = '';
  dialog.className = 'supplier-cart-dialog';
  dialog.setAttribute('aria-label', `Handmatige controlelijst leverancier — bestelling ${orderId}`);
  document.body.append(dialog);
  let snapshot, run, events = [], history = [], busy = false;
  const close = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('close', () => dialog.remove());
  dialog.innerHTML = '<p role="status">Bestelregels en bevoegdheid controleren…</p><button type="button" data-close>Sluiten</button>';
  dialog.showModal();
  dialog.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close')) { close(); return; }
    if (busy) return;
    if (button.hasAttribute('data-copy')) {
      try { await navigator.clipboard.writeText(button.dataset.copy); message('Gekopieerd.'); }
      catch { message('Kopiëren lukt niet in deze browser. Selecteer de zichtbare tekst om die handmatig te kopiëren.'); }
    }
    if (button.hasAttribute('data-start')) {
      if (!transferReadiness(snapshot).canStart) { message('Geen bruikbare productreferenties. Vul eerst in Productbeheer het exacte artikelnummer of de productlink aan. Er is niets aan de winkelwagen toegevoegd.'); return; }
      busy = true; button.disabled = true;
      try {
        run = await api.startTransfer(orderId, snapshot);
        events = await api.getTransferEvents(run.id);
        history = await api.getTransferHistory(orderId);
        draw();
      } catch (error) { message(error.message); button.disabled = false; }
      finally { busy = false; }
    }
  });
  dialog.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !run) return;
    const form = event.target;
    const data = new FormData(form);
    const result = data.get('resultaat');
    const successful = ['toegevoegd', 'reeds_aanwezig', 'aantal_aangepast'].includes(result);
    const line = prepareLines(snapshot).find(item => String(item.id) === form.dataset.line);
    const quantity = data.get('aantal') === '' ? null : Number(data.get('aantal'));
    if (successful && (line.issue || !data.get('exact') || quantity !== Number(line.aantal))) {
      message('Bevestig alleen na controle van exact artikel, variant, verpakking en het volledige gewenste aantal in de winkelwagen.'); return;
    }
    if (!successful && (!reasons[data.get('reden')] || data.get('reden') === 'gecontroleerd')) { message('Kies de concrete reden waarom deze regel onzeker of mislukt is.'); return; }
    busy = true;
    form.querySelector('button[type="submit"]').disabled = true;
    try {
      const saved = await api.recordTransferResult(run.id, line.id, result, successful ? 'gecontroleerd' : data.get('reden'), quantity, Boolean(data.get('exact')));
      events.push(saved);
      draw();
      message('Jouw handmatige registratie is bewaard. Deze actie voegt niets toe aan de leverancierswinkelwagen en wijzigt de aankoopstatus niet.');
    } catch (error) { message(error.message); form.querySelector('button[type="submit"]').disabled = false; }
    finally { busy = false; }
  });
  function message(text) {
    const el = dialog.querySelector('[data-message]');
    if (el) el.textContent = text;
  }
  function draw() {
    if (!dialog.isConnected) return;
    const lines = prepareLines(snapshot);
    const readiness = transferReadiness(snapshot);
    const latest = latestResults(events);
    const summary = cartSummary(lines, events);
    const shops = [...new Set(lines.map(line => line.supplier).filter(Boolean))];
    dialog.innerHTML = `
      <div class="supplier-cart-heading"><h2>Handmatige controlelijst leverancier</h2><button class="ghost-button" type="button" data-close>Sluiten</button></div>
      <p><strong>Bestelling ${e(orderId)} · Begeleid handmatig</strong></p>
      <div class="warning-panel"><strong>Deze functie vult de winkelwagen niet.</strong><p>Er is geen browser gekoppeld waarmee Aankoopbeheer producten bij de leverancier kan toevoegen of teruglezen. De onderstaande controlelijst opent alleen productlinks en bewaart wat jij handmatig controleert. Opslaan voegt geen product toe.</p></div>
      ${readiness.blocked ? `<p class="warning-panel">${readiness.blocked} van ${lines.length} regels kunnen niet worden voorbereid. Vul ontbrekende productreferenties aan via Producten beheren en open deze lijst opnieuw. Kies geen vervangend product op basis van een vergelijkbare naam.</p>` : ''}
      <details><summary>Aanmelden, bestaande winkelwagen en smartphone</summary>
        <p>Meld je rechtstreeks aan bij de leverancier in de browser waarin de link opent. Gebruik voor alle producten dezelfde browser en hetzelfde leveranciersaccount. De login van Aankoopbeheer staat hier los van. Voer een CAPTCHA of tweestapsverificatie zelf uit. Aankoopbeheer ontvangt geen leverancierswachtwoorden of sessiecookies.</p>
        <p>Controleer vóór toevoegen of hetzelfde artikel al aanwezig is. Staat het juiste aantal er al, kies dan “Reeds aanwezig”. Tel bij herhalen nooit opnieuw het aangevraagde aantal erbij. Pas een afwijkend aantal pas aan nadat je hebt vastgesteld bij welke aanvraag het hoort. Laat andere producten staan. Behoort het artikel mogelijk tot een andere bestelling, sla de regel over en registreer dat als onzeker.</p>
        <p>Op smartphone wissel je tussen deze app en de leveranciersbrowser. Een geïnstalleerde app kan een andere browser openen dan je normaal gebruikt. Controleer daarom daar opnieuw je aanmelding en winkelwagen.</p>
      </details>
      <div class="${summary.complete === summary.total && summary.total > 0 ? 'notice-panel' : 'warning-panel'}"><strong>${e(summary.label)}</strong><p>${summary.complete} van ${summary.total} regels handmatig bevestigd. Dit is geen bestelling bij de leverancier.</p></div>
      <p role="status" aria-live="polite" data-message></p>
      ${run ? `<p>Registratie gestart: ${e(formatDateTime(run.created_at))}. Hervatten opent eerdere handmatige registraties. Er wordt niets overgedragen. Controleer de actuele winkelwagen opnieuw.</p>` : `<button class="primary-button" type="button" data-start ${readiness.canStart ? '' : 'disabled'}>Open handmatige registratie</button>${readiness.canStart ? '' : '<p>Registratie geblokkeerd: geen enkele regel heeft een bruikbare productreferentie. Er is niets aan de winkelwagen toegevoegd.</p>'}`}
      ${run ? `<div class="record-actions">${shops.map(shop => `<a class="ghost-button" href="${suppliers[shop].home}" target="_blank" rel="noopener noreferrer">Open ${e(shop)} om aan te melden of te zoeken</a>`).join('')}</div>` : ''}
      ${snapshot.opmerking ? `<details><summary>Interne bestelopmerking</summary><p>${e(snapshot.opmerking)}</p></details>` : ''}
      <div class="supplier-cart-lines">${lines.map(line => {
        const result = latest.get(String(line.id));
        return `<section class="supplier-cart-line"><h3>${e(line.product_naam)}</h3>
          <dl><dt>Leverancier</dt><dd>${e(line.supplier || line.leverancier || 'Niet vastgesteld')}</dd>
          <dt>Artikelnummer</dt><dd>${e(line.article || 'Ontbreekt')}</dd>
          <dt>Productlink</dt><dd>${e(line.url || 'Geen bruikbare productlink')}</dd>
          <dt>Verpakking / variant</dt><dd>${e(line.eenheid || 'Ontbreekt')} — ${e(line.product_omschrijving || 'Controleer de variant op de productpagina')}</dd>
          <dt>Gewenst aantal</dt><dd><strong>${e(line.aantal)} × ${e(line.eenheid || 'onbekende eenheid')}</strong></dd></dl>
          ${line.issue ? `<p class="warning-panel">Handmatige behandeling: ${e(line.issue)}</p>` : '<p>Catalogusreferentie; product, variant, verpakking en beschikbaarheid nog bij leverancier controleren.</p>'}
          ${run ? `<div class="record-actions">${line.url ? `<a class="ghost-button" href="${e(line.url)}" target="_blank" rel="noopener noreferrer">Open productpagina</a>` : ''}
            ${line.article ? `<button class="ghost-button" type="button" data-copy="${e(line.article)}">Kopieer artikelnummer</button>` : ''}
            <button class="ghost-button" type="button" data-copy="${e(line.aantal)}">Kopieer aantal</button></div>
            <p><strong>${e(result ? outcomes[result.resultaat] : 'Onzeker')}</strong> — ${e(result ? reasons[result.reden] : 'Nog niet handmatig gecontroleerd')}${result ? ` · ${e(formatDateTime(result.created_at))}` : ''}</p>
            <form data-line="${e(line.id)}">
              <label class="field">Resultaat<select name="resultaat">${Object.entries(outcomes).map(([key, label]) => `<option value="${key}" ${key === 'onzeker' ? 'selected' : ''} ${line.issue && !['onzeker','mislukt'].includes(key) ? 'disabled' : ''}>${label}</option>`).join('')}</select></label>
              <label class="field">Reden bij onzeker of mislukt<select name="reden"><option value="">Kies een concrete reden</option>${Object.entries(reasons).filter(([key]) => key !== 'gecontroleerd').map(([key,label]) => `<option value="${key}">${e(label)}</option>`).join('')}</select></label>
              <label class="field">Aantal daadwerkelijk in winkelwagen<input name="aantal" type="number" min="0" step="1" /></label>
              <label><input name="exact" type="checkbox" /> Ik heb exact artikel, variant, verpakking en aantal in de winkelwagen gecontroleerd.</label>
              <button type="submit" class="primary-button">Bewaar mijn handmatige controle</button>
            </form>` : ''}
        </section>`;
      }).join('')}</div>
      ${run ? `<div class="record-actions">${shops.map(shop => `<a class="primary-button" href="${suppliers[shop].cart}" target="_blank" rel="noopener noreferrer">Controleer winkelwagen ${e(shop)}</a>`).join('')}</div>
      <p>Controleer producten, aantallen, prijzen en levergegevens. Rond de bestelling zelf af bij de leverancier. Bevestig pas daarna via de bestaande bestelworkflow dat de bestelling effectief geplaatst is.</p>
      <details><summary>Registratiegeschiedenis (${events.length} resultaten)</summary>${events.map(item => `<p>${e(formatDateTime(item.created_at))} · regel ${e(item.regel_id)} · ${e(outcomes[item.resultaat])} · ${e(reasons[item.reden])} · gebruiker ${e(item.actor_id)}</p>`).join('')}
      <p>Gestart door gebruiker ${e(run.actor_id)}. ${history.length} registratie(s) voor deze bestelling. Bij gewijzigde bestel- of catalogusgegevens wordt een nieuwe registratie gestart; eerdere registraties blijven bewaard.</p></details>` : ''}`;
  }
  try { snapshot = await api.previewTransfer(orderId); draw(); }
  catch (error) { dialog.innerHTML = `<p role="alert">${e(error.message)}</p><button type="button" data-close>Sluiten</button>`; }
}
