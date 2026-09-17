import { escapeHtml, formatDateTime } from '../utils/format.js';
import { canConfirmReceipt, receiptLines } from '../utils/receipt.js';

export function renderReceiptPanel(order, userId, admin, busy, draft = {}) {
  const latest = order.ontvangst;
  const request = order.ontvangstverzoek;
  const eligible = ['Besteld', 'Besteld bij leverancier', 'Gedeeltelijk geleverd'].includes(order.status);
  if (!eligible && !latest && !request) return '';
  const lines = receiptLines(order);
  const e = escapeHtml;
  return `<section class="receipt-panel" aria-label="Ontvangst bestelling ${e(order.id)}">
    <h4>Ontvangst door de besteller</h4>
    ${request ? `<p>${request.mail_verzonden_op ? `Ontvangstvraag gemaild op ${formatDateTime(request.mail_verzonden_op)}.` : 'Ontvangstvraag staat in de app. De e-mail is nog niet als verzonden geregistreerd.'}</p>` : ''}
    ${latest ? `<p><strong>${latest.volledig ? 'Volledig ontvangen' : 'Gedeeltelijk ontvangen'}</strong> — bevestigd door ${e(order.besteller_naam)} op ${formatDateTime(latest.created_at)}.</p>
      ${latest.opmerking ? `<p>${e(latest.opmerking)}</p>` : ''}
      <ul>${lines.map((line) => `<li>${e(line.product_naam)}: ${e(latest.aantallen[line.id] || 0)} van ${e(line.aantal)} ontvangen${Number(latest.aantallen[line.id] || 0) < Number(line.aantal) ? ` · <strong>nog ${Number(line.aantal) - Number(latest.aantallen[line.id] || 0)} te ontvangen</strong>` : ''}</li>`).join('')}</ul>` : '<p>De besteller heeft de ontvangst nog niet bevestigd.</p>'}
    ${admin && eligible && !request?.mail_verzonden_op ? `<button type="button" class="ghost-button" data-request-receipt="${e(order.id)}" ${busy ? 'disabled' : ''}>${request ? 'Ontvangstmail opnieuw proberen' : 'Ontvangstbevestiging vragen per mail'}</button>` : ''}
    ${canConfirmReceipt(order, userId) ? `<form data-receipt-form="${e(order.id)}">
      <p>Vul het <strong>totaal ontvangen aantal verpakkingen</strong> in, ook bij een nalevering. Laat nog niet ontvangen artikelen op 0 staan.</p>
      <div class="receipt-lines">${lines.map((line) => `<label class="field"><span>${e(line.product_naam)} <small>(${e(line.eenheid || 'verpakking')}) · besteld: ${e(line.aantal)}</small></span>
        <input type="number" name="receipt-${e(line.id)}" min="${e(latest?.aantallen?.[line.id] || 0)}" max="${e(line.aantal)}" step="1" value="${e(draft['receipt-'+line.id] ?? latest?.aantallen?.[line.id] ?? 0)}" required ${busy ? 'disabled' : ''}/></label>`).join('')}</div>
      <label class="field"><span>Opmerking bij de levering (optioneel)</span><textarea name="receipt-note" maxlength="1000" placeholder="Bijvoorbeeld: één verpakking beschadigd. Vermeld geen vertrouwelijke persoonsgegevens." ${busy ? 'disabled' : ''}>${e(draft['receipt-note'] || '')}</textarea></label>
      <p>Met de bevestiging meld je deze ontvangst aan aankoopbeheer.</p>
      <div class="record-actions"><button class="ghost-button" type="button" data-receipt-all="${e(order.id)}" ${busy ? 'disabled' : ''}>Alles is ontvangen: aantallen invullen</button>
      <button class="primary-button" type="submit" ${busy ? 'disabled' : ''}>Ontvangst bevestigen</button></div>
    </form>` : ''}
  </section>`;
}
