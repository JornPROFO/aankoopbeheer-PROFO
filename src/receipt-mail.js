import './styles/receipt-mail.css';
import './styles/receipt.css';
import {renderReceiptPanel} from './ui/receipt.js';
import {receiptDraft,receiptTotals} from './utils/receipt.js';
import {escapeHtml} from './utils/format.js';

const root=document.querySelector('#receipt-content');
const token=window.location.hash.slice(1);
let order, draft={}, busy=false, error='', notice='';
const attempts=new Map();

async function call(actie,payload={}) {
  const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aankoop-ontvangst-link`,{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',referrerPolicy:'no-referrer',
    body:JSON.stringify({actie,token,...payload}),
  });
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'De ontvangst kon niet worden verwerkt. Probeer opnieuw.');
  return data;
}

function render() {
  root.innerHTML=`${notice?`<p class="notice-panel" role="status">${escapeHtml(notice)}</p>`:''}
    ${error?`<p class="error-panel" role="alert">${escapeHtml(error)}</p>`:''}
    ${order?`<p class="order-context"><strong>Bestelling ${escapeHtml(order.id)}</strong> · ${escapeHtml(order.locatie_naam)}</p>
      ${order.status==='Geleverd'?'<p>Deze bestelling is volledig ontvangen. Je hoeft niets meer te bevestigen.</p>':
        `<p>Je hoeft je niet aan te melden. Registreer alleen de spullen die je werkelijk ontvangen hebt.</p>${renderReceiptPanel({...order,besteller_id:1,besteller_naam:'jou'},1,false,busy,draft)}`}`:''}
    <div class="page-actions"><button type="button" class="text-button" data-reload ${busy?'disabled':''}>Gegevens opnieuw ophalen</button></div>
    <p class="privacy-note">Deze pagina is uitsluitend bestemd voor de besteller. Stuur de persoonlijke link niet door. Bij een foutieve bevestiging of een verlopen link neem je contact op met aankoopbeheer.</p>`;
}

async function load() {
  busy=true;
  if(order) render();
  try {
    if(!/^[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(token)) throw new Error('Open de volledige persoonlijke link uit de ontvangstmail.');
    order=await call('bekijken'); draft={}; error='';
  } catch(err) {error=err.message;}
  finally {busy=false;render();}
}

root.addEventListener('change',event=>{
  const form=event.target.closest('[data-receipt-form]');
  if(!form || busy) return;
  if(event.target.name==='receipt-mode' && event.target.value==='all') {
    for(const input of form.querySelectorAll('[data-receipt-base]')) input.value=Number(input.dataset.receiptOrdered)-Number(input.dataset.receiptBase);
  } else if(event.target.matches('[data-receipt-base]')) form.querySelector('[value="partial"]').checked=true;
  draft=receiptDraft(order,Object.fromEntries(new FormData(form)),draft);
  for(const input of form.querySelectorAll('[data-receipt-base]'))
    input.closest('.receipt-line').querySelector('output').textContent=`Totaal na deze levering: ${Number(input.dataset.receiptBase)+Number(input.value||0)} van ${input.dataset.receiptOrdered}`;
});

root.addEventListener('click',event=>{
  if(busy) return;
  if(event.target.closest('[data-reload]')) {
    if(Object.keys(draft).length && !window.confirm('Je huidige invoer wordt gewist. Wil je de actuele gegevens opnieuw ophalen?')) return;
    void load();
  }
  if(event.target.closest('[data-receipt-edit]')) {draft.__review=false;render();}
  if(event.target.closest('[data-receipt-reset]')) {draft={};error='';render();}
});

root.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-receipt-form]');
  if(!form) return;
  event.preventDefault();
  if(busy) return;
  draft=receiptDraft(order,Object.fromEntries(new FormData(form)),draft);
  try {
    const aantallen=receiptTotals(order,draft);
    if(!draft.__review) {draft.__review=true;error='';render();root.querySelector('[type="submit"]')?.focus();return;}
    const opmerking=String(draft['receipt-note']||'').trim();
    const signature=JSON.stringify([draft.__version,aantallen,opmerking]);
    if(!attempts.has(signature)) attempts.set(signature,crypto.randomUUID());
    busy=true;error='';render();
    const result=await call('bevestigen',{request_id:attempts.get(signature),updated_at:draft.__version,aantallen,opmerking});
    draft={};
    notice=result.volledig?'Bedankt. De volledige ontvangst is bevestigd en aankoopbeheer heeft een melding gekregen.':'Bedankt. De ontvangen aantallen zijn opgeslagen en aankoopbeheer heeft een melding gekregen. Ontbrekende artikelen blijven open.';
    await load();
  } catch(err) {error=err.message;}
  finally {busy=false;render();}
});

void load();
