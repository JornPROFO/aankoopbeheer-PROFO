import { escapeHtml } from '../utils/format.js';
const formatDateTime = value => new Intl.DateTimeFormat('nl-BE', {dateStyle:'short',timeStyle:'short',timeZone:'Europe/Brussels'}).format(new Date(value));

export function renderCatalogControl(data) {
  if (data?.error) return `<div class="warning-panel">Het logboek kon niet worden geladen. ${escapeHtml(data.error)}</div>`;
  if (!data) return '<div class="empty-state"><p>Het logboek wordt geladen.</p></div>';
  const run = data.runs[0];
  const labels = { running: 'Controle loopt', completed: 'Controle voltooid', attention: 'Opvolging nodig', failed: 'Controle mislukt', corrected: 'Aangepast', would_correct: 'Voorgestelde correctie', skipped: 'Overgeslagen', conflict: 'Intussen gewijzigd' };
  const next = data.planning?.enabled ? `Elke maandag om 08.00 uur (Belgische tijd). Volgende controle: ${formatDateTime(data.planning.next_run_at)}.` : 'De automatische planning staat momenteel uit.';
  return `<section class="panel catalog-control" aria-label="Cataloguscontrole">
    <div class="panel-heading"><div><h3>Wekelijkse cataloguscontrole</h3><p>${escapeHtml(next)} De controle werkt ook wanneer je computer uitstaat.</p></div></div>
    <p>Productlinks en afbeeldingen worden alleen automatisch aangepast wanneer hetzelfde artikel en dezelfde verpakking bevestigd zijn. Afwijkingen die beoordeling vragen, staan hieronder.</p>
    ${run ? `<div class="catalog-control-summary"><strong>${escapeHtml(labels[run.status] || run.status)}${run.dry_run ? ' · testronde zonder wijzigingen' : ''}</strong><span>Gestart: ${escapeHtml(formatDateTime(run.started_at))}${run.finished_at ? ` · voltooid: ${escapeHtml(formatDateTime(run.finished_at))}` : ''}</span><span>${run.total} catalogusregels · ${run.checked} bevestigd · ${run.corrected} aangepast · ${run.attention} aandachtspunten · ${run.skipped} overgeslagen</span></div>` : '<p>Er is nog geen controleronde uitgevoerd.</p>'}
    ${data.items.length ? `<div class="catalog-control-items">${data.items.map(item => `<article class="catalog-control-item"><strong>${escapeHtml(item.snapshot?.naam || item.snapshot?.omschrijving || `Artikel ${item.record_id}`)}</strong><span>${escapeHtml(labels[item.status] || item.status)} · ${item.kind === 'cartridges' ? 'Inkt en toner' : 'Producten'} #${item.record_id}</span><p>${escapeHtml(item.message)}</p>${Object.entries(item.patch || {}).map(([key, value]) => `<p>${key === 'image_url' ? 'Afbeelding' : 'Productlink'}: <a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${key === 'image_url' ? 'Nieuwe afbeelding bekijken' : 'Nieuwe productpagina bekijken'}</a></p>`).join('')}</article>`).join('')}</div>` : '<p>Geen correcties of aandachtspunten in deze ronde.</p>'}
    ${data.runs.length > 1 ? `<details><summary>Eerdere controles</summary><ul>${data.runs.slice(1).map(previous => `<li>${escapeHtml(formatDateTime(previous.started_at))}: ${escapeHtml(labels[previous.status] || previous.status)}${previous.dry_run ? ' (testronde)' : ''}; ${previous.corrected} aangepast, ${previous.attention} aandachtspunten.</li>`).join('')}</ul></details>` : ''}
  </section>`;
}
