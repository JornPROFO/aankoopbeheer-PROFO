import { escapeHtml as e } from './utils/format.js';
import { previewTransfer, getTransferHistory, getTransferEvents } from './services/supplierCartService.js';
import { prepareLines, suppliers, outcomes } from './services/supplierCartModel.js';
import { connectAgent, prepareAgent, executeAgent } from './services/supplierAgentService.js';
import './styles/supplier-cart.css';

export async function openSupplierAgent(orderId) {
  document.querySelector('[data-supplier-cart-dialog]')?.remove();
  const dialog = document.createElement('dialog');
  dialog.dataset.supplierCartDialog='';dialog.className='supplier-cart-dialog';
  dialog.setAttribute('aria-label',`Winkelwagen bij leverancier — bestelling ${orderId}`);
  document.body.append(dialog);dialog.showModal();
  let snapshot, plan, connected=false, busy=false, results, previous=[];
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints>1);
  const message = text => {dialog.querySelector('[data-message]').textContent=text;};
  const draw = () => {
    const lines=prepareLines(snapshot || {lines:[]});
    const actionable = plan?.lines.some(line => ['add','keep'].includes(line.action));
    const blocked = plan?.lines.filter(line => line.action === 'skip') || [];
    dialog.innerHTML=`<div class="supplier-cart-heading"><h2>Vul winkelwagen bij leverancier</h2><button type="button" data-close ${busy?'disabled':''}>Sluiten</button></div>
      <p>Bestelling ${e(orderId)} · Alleen desktop en laptop · Controle en afrekenen doe je zelf.</p>
      <p role="status" aria-live="polite" data-message></p>
      ${mobile?'<p class="warning-panel">Open Aankoopbeheer op een desktop of laptop om de winkelwagen te vullen.</p>':!connected?`<div class="warning-panel"><strong>Koppel deze browser eenmalig.</strong><p>Installeer de PROFO Winkelwagenagent in Chrome of Edge. Meld je bij de leveranciers aan in dezelfde browser. De agent leest geen wachtwoorden of cookies.</p><a href="/profo-winkelwagenagent.zip" download>Download browseragent</a> · <a href="/winkelwagenagent-installatie.html" target="_blank" rel="noopener">Installatiestappen</a><p>Na installatie: herlaad deze app en open deze bestelling opnieuw.</p><button type="button" data-connect ${busy?'disabled':''}>Verbinding opnieuw controleren</button></div>`:`<p class="notice-panel">Browseragent gekoppeld. De agent opent leverancierspagina’s in deze browser. Laat de tabbladen tijdens de overdracht ongemoeid.</p>`}
      <p>Bestaat een artikel al met het gewenste aantal, dan blijft het staan. Bij een afwijkend bestaand aantal wordt de regel overgeslagen voor jouw controle. Andere producten blijven behouden. Herhalen telt nooit blind aantallen op.</p>
      ${snapshot?.opmerking?`<details><summary>Interne opmerking</summary><p>${e(snapshot.opmerking)}</p></details>`:''}
      <div class="supplier-cart-lines">${lines.map(line=>{
        const p=plan?.lines.find(p=>p.id===line.id),r=results?.find(r=>r.regel_id===line.id);
        return `<section class="supplier-cart-line"><h3>${e(line.product_naam)}</h3><p>${e(line.article || 'Artikelnummer ontbreekt')} · <strong>${e(line.aantal)} × ${e(line.eenheid)}</strong></p><p>${e(line.product_omschrijving || '')}</p>${line.url?`<a href="${e(line.url)}" target="_blank" rel="noopener">Exacte productpagina</a>`:''}
        ${line.issue?`<p class="warning-panel">${e(line.issue)}</p>`:''}
        ${p?`<p>Bij leverancier: <strong>${e(p.title || 'Niet vastgesteld')}</strong></p><p>${e(p.action==='add'?'Wordt toegevoegd met het gewenste aantal.':p.action==='keep'?'Al aanwezig met het gewenste aantal; wordt opnieuw gecontroleerd.':`Overgeslagen: ${p.reason}`)}</p>`:''}
        ${r?`<p role="status"><strong>${e(outcomes[r.resultaat])}</strong> — ${e(r.toelichting)}</p>`:''}</section>`;
      }).join('')}</div>
      ${previous.length?`<details><summary>Resultaten vorige poging — geen actuele winkelwagencontrole</summary>${previous.map(r=>`<p>Regel ${e(r.regel_id)} · ${e(outcomes[r.resultaat])} · ${e(r.toelichting || r.reden)} · ${e(r.created_at)}</p>`).join('')}</details>`:''}
      ${connected&&!mobile&&!results?`<button type="button" data-prepare ${busy?'disabled':''}>${plan?'Opnieuw controleren':'Controleer producten en huidige winkelwagen'}</button>`:''}
      ${plan&&!results?`${blocked.length ? `<div class="warning-panel" role="status"><strong>${actionable ? 'Niet alle producten kunnen worden toegevoegd.' : 'Winkelwagen vullen is geblokkeerd.'}</strong><p>${actionable ? 'Alleen de goedgekeurde regels worden verwerkt.' : 'Geen enkel product is door de controle gekomen. Het aanvinken van de bevestiging heft deze blokkering niet op.'}</p><ul>${blocked.map(line => `<li><strong>${e(line.product_naam)}</strong>: ${e(line.reason || 'Productcontrole niet geslaagd.')}</li>`).join('')}</ul><p>Los de vermelde oorzaak op en klik daarna op ‘Opnieuw controleren’.</p>${blocked.some(line => /aanmeld|aan bij de leverancier/i.test(line.reason || '')) ? [...new Set(blocked.map(line => line.supplier).filter(s => suppliers[s]))].map(s => `<a href="${suppliers[s].home}" target="_blank" rel="noopener">Aanmelden bij ${e(s)}</a>`).join(' · ') : ''}</div>` : ''}<p><label><input type="checkbox" data-confirm ${busy||!actionable?'disabled':''}> Ik heb de getoonde leveranciersproducten en verpakkingen gecontroleerd. De bestaande overeenkomende aantallen mogen voor deze bestelling worden gebruikt.</label></p><button class="primary-button" type="button" data-execute disabled>Vul winkelwagen nu</button>`:''}
      ${results?`<p class="${results.every(r=>['toegevoegd','reeds_aanwezig','aantal_aangepast'].includes(r.resultaat))?'notice-panel':'warning-panel'}">${results.every(r=>['toegevoegd','reeds_aanwezig','aantal_aangepast'].includes(r.resultaat))?'Winkelwagen gevuld en gecontroleerd.':'Gedeeltelijk of niet verwerkt: controleer de resultaten per regel.'} De aankoop is nog niet als besteld geregistreerd.</p>${[...new Set(lines.map(l=>l.supplier).filter(s=>suppliers[s]))].map(s=>`<a class="primary-button" href="${suppliers[s].cart}" target="_blank" rel="noopener">Controleer winkelwagen ${e(s)}</a>`).join(' ')}`:''}`;
  };
  dialog.addEventListener('cancel',event=>{if(busy) event.preventDefault();});
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.addEventListener('change',()=>{const b=dialog.querySelector('[data-execute]');if(b)b.disabled=busy||!dialog.querySelector('[data-confirm]')?.checked||!plan?.lines.some(l=>['add','keep'].includes(l.action));});
  dialog.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b||busy)return;
    if(b.hasAttribute('data-close')){dialog.close();return;}
    if(b.hasAttribute('data-connect')){busy=true;draw();message('Browserverbinding controleren…');try{await connectAgent();connected=true;busy=false;draw();}catch(error){busy=false;draw();message(error.message);}return;}
    if(!b.hasAttribute('data-prepare')&&!b.hasAttribute('data-execute'))return;
    busy=true;draw();message('Browseragent werkt. Volg de leverancierspagina’s; keer daarna terug naar dit overzicht.');
    try {
      if(b.hasAttribute('data-prepare')) plan=await prepareAgent(orderId,snapshot);
      else {const response=await executeAgent(plan.id);results=response.results;}
      busy=false;draw();
    } catch(error){busy=false;plan=undefined;draw();message(error.message);}
  });
  draw();message('Bevoegdheid en bestelling controleren…');
  try {snapshot=await previewTransfer(orderId);const history=await getTransferHistory(orderId);if(history[0])previous=await getTransferEvents(history[0].id);if(!mobile)try {await connectAgent();connected=true;}catch(error){draw();message(error.message);return;}draw();}
  catch(error){draw();message(error.message);}
}
