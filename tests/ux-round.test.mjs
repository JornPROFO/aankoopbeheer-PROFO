import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseHTML} from '../tmp/cart-test-runtime/node_modules/linkedom/esm/index.js';
import {escapeHtml} from '../src/utils/format.js';
import {renderSupplierSteps,supplierRemedy} from '../src/ui/supplier-guidance.js';

const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
function load(name,context) {
  const rest=source.slice(source.indexOf(`function ${name}(`));
  const end=rest.slice(1).search(/^(?:async )?function /m);
  vm.runInNewContext((end<0?rest:rest.slice(0,end+1))+`;result=${name};`,context);
  return context.result;
}
test('voortgang heeft ontvangst en maakt van administratief afgesloten geen ontvangst',()=>{
  const trail=load('renderStatusTrail',{escapeHtml,getNormalizedStatus:s=>s,getStatusLabel:s=>s});
  assert.match(trail('Geleverd'),/aria-current="step"[^>]*>Ontvangen/);
  assert.match(trail('Gedeeltelijk geleverd'),/aria-current="step"[^>]*>Deels ontvangen/);
  assert.doesNotMatch(trail('Afgesloten'),/Ontvangen/);
});
test('zoekveld staat buiten de extra filters; geselecteerde filters blijven zichtbaar',()=>{
  const context={escapeHtml,state:{orderFilters:{search:'zeep',status:'Besteld'},data:{locations:[]}},getOrderStatusOptions:()=>[],productCategories:[],priorityOptions:[]};
  const html=load('renderOrderFilters',context)(false,false);
  const {document}=parseHTML(html);
  assert.equal(document.querySelector('[name="search"]').closest('details'),null);
  assert.ok(document.querySelector('details').hasAttribute('open'));
  assert.equal(document.querySelectorAll('details select,details input').length,6);
});
test('leveranciersoverdracht registreert pas na externe bevestiging en expliciete vervolgknop',async()=>{
  const {document,window}=parseHTML('<html><body></body></html>');
  window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLElement.prototype.close=function(){this.remove();};
  const code=(await readFile(new URL('../src/supplierAgentView.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export async function','async function');
  let registrations=0;
  const context={document,navigator:{userAgent:'desktop',platform:'test'},e:escapeHtml,prepareLines:()=>[{id:1,product_naam:'Koffie',aantal:1,eenheid:'doos',supplier:'123inkt.be'}],suppliers:{'123inkt.be':{home:'https://www.123inkt.be/',cart:'https://www.123inkt.be/shoppingcart.html'}},outcomes:{toegevoegd:'Toegevoegd'},renderSupplierSteps,supplierRemedy,
    previewTransfer:async()=>({}),getTransferHistory:async()=>[],getTransferEvents:async()=>[],connectAgent:async()=>{},prepareAgent:async()=>({id:'plan',lines:[{id:1,action:'add'}]}),executeAgent:async()=>({results:[{regel_id:1,resultaat:'toegevoegd'}]})};
  vm.runInNewContext(code+'; open=openSupplierAgent;',context);
  await context.open(9901,{onOrdered:()=>registrations++});
  const click=selector=>document.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true}));
  const tick=()=>new Promise(r=>setImmediate(r));
  click('[data-prepare]');await tick();
  assert.equal(document.querySelector('[data-execute]').disabled,true);
  const confirm=document.querySelector('[data-confirm]');confirm.checked=true;confirm.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(document.querySelector('[data-execute]').disabled,false);
  click('[data-execute]');await tick();
  assert.equal(registrations,0);
  assert.equal(document.querySelector('[data-register-ordered]').disabled,true);
  const done=document.querySelector('[data-external-done]');done.checked=true;done.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(registrations,0);
  click('[data-register-ordered]');
  assert.equal(registrations,1);
  assert.equal(document.querySelector('dialog'),null);
});
