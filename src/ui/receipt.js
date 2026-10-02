import { escapeHtml, formatDateTime } from '../utils/format.js';
import { canConfirmReceipt, receiptLines } from '../utils/receipt.js';

export function renderReceiptPanel(order, userId, admin, busy, draft = {}) {
  const latest = order.ontvangst, request = order.ontvangstverzoek;
  const eligible = ['Besteld', 'Besteld bij leverancier', 'Gedeeltelijk geleverd'].includes(order.status);
  if (!eligible && !latest && !request) return '';
  const lines = receiptLines(order), e = escapeHtml;
  const baseline = draft.__baseline || latest?.aantallen || {};
  const review = Boolean(draft.__review);
  return `<section class="receipt-panel" data-help-topic="ontvangst" aria-label="Ontvangst bestelling ${e(order.id)}">
    <h4>Ontvangst bevestigen</h4>
    ${latest ? `<p><strong>${latest.volledig ? 'Volledig ontvangen' : 'Gedeeltelijk ontvangen'}</strong> — bevestigd door ${e(order.besteller_naam)} op ${formatDateTime(latest.created_at)}.</p>
      ${latest.opmerking ? `<p>${e(latest.opmerking)}</p>` : ''}
      <ul>${lines.map(line => `<li>${e(line.product_naam)}: ${e(latest.aantallen[line.id] || 0)} van ${e(line.aantal)} ontvangen${Number(latest.aantallen[line.id] || 0) < Number(line.aantal) ? ` · <strong>nog ${Number(line.aantal) - Number(latest.aantallen[line.id] || 0)} te ontvangen</strong>` : ''}</li>`).join('')}</ul>` : '<p>De besteller heeft de ontvangst nog niet bevestigd.</p>'}
    ${admin && eligible && !request?.mail_verzonden_op ? `<button type="button" class="ghost-button" data-request-receipt="${e(order.id)}" ${busy ? 'disabled' : ''}>${request ? 'Ontvangstmail opnieuw proberen' : 'Ontvangstbevestiging vragen per mail'}</button>` : ''}
    ${canConfirmReceipt(order, userId) ? `<form data-receipt-form="${e(order.id)}">
      <fieldset class="receipt-choice" ${busy || review ? 'disabled' : ''}><legend>Wat is er geleverd?</legend>
        <label><input type="radio" name="receipt-mode" value="partial" ${draft['receipt-mode'] !== 'all' ? 'checked' : ''}> Een deel ontvangen</label>
        <label><input type="radio" name="receipt-mode" value="all" ${draft['receipt-mode'] === 'all' ? 'checked' : ''}> Alles ontvangen</label>
      </fieldset>
      <p>Vul alleen in wat je <strong>vandaag ontvangen</strong> hebt. Eerdere leveringen tellen automatisch mee. Tel verpakkingen: een doos van 20 koffiecups telt als 1 doos.</p>
      <div class="receipt-lines">${lines.map(line => {
        const before = Number(baseline[line.id] || 0), remaining = Math.max(0, Number(line.aantal) - before);
        const today = draft['receipt-' + line.id] ?? 0;
        return `<div class="receipt-line"><strong>${e(line.product_naam)}</strong><span class="muted">Besteld: ${e(line.aantal)} · Eerder ontvangen: ${before} · ${e(line.eenheid || 'verpakking')}</span>
          <label class="field"><span>Vandaag ontvangen</span><input aria-label="Vandaag ontvangen: ${e(line.product_naam)}" type="number" name="receipt-${e(line.id)}" data-receipt-base="${before}" data-receipt-ordered="${e(line.aantal)}" min="0" max="${remaining}" step="1" value="${e(today)}" required ${review || remaining === 0 ? 'readonly' : ''} ${busy ? 'disabled' : ''}/></label>
          <output class="receipt-line-total">Totaal na deze levering: ${before + Number(today || 0)} van ${e(line.aantal)}</output></div>`;
      }).join('')}</div>
      <label class="field"><span>Opmerking bij de levering (optioneel)</span><textarea name="receipt-note" maxlength="1000" placeholder="Bijvoorbeeld: één verpakking beschadigd. Vermeld geen vertrouwelijke persoonsgegevens." ${review ? 'readonly' : ''} ${busy ? 'disabled' : ''}>${e(draft['receipt-note'] || '')}</textarea></label>
      ${review ? '<p class="notice-panel" role="status">Controleer de aantallen hierboven. Met “Ontvangst melden” sla je deze levering op en krijgt aankoopbeheer een melding.</p>' : '<p>Je controleert de aantallen nog voordat je de ontvangst meldt.</p>'}
      <div class="record-actions"><button class="primary-button" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Ontvangst wordt opgeslagen…' : review ? 'Ontvangst melden' : 'Ontvangst controleren'}</button>
        ${review ? '<button type="button" class="ghost-button" data-receipt-edit>Aantallen aanpassen</button>' : ''}
        <button type="button" class="text-button" data-receipt-reset ${busy ? 'disabled' : ''}>Invoer opnieuw beginnen</button>
      </div>
    </form>` : ''}
    ${request ? `<details class="receipt-mail-info"><summary>Ontvangstverzoek</summary><p>${request.mail_verzonden_op ? `Ontvangstvraag gemaild op ${formatDateTime(request.mail_verzonden_op)}.` : 'De vraag staat in de app. De e-mail is nog niet als verzonden geregistreerd.'}</p></details>` : ''}
  </section>`;
}
