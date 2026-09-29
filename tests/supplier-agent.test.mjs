import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from '../tmp/cart-test-runtime/node_modules/linkedom/esm/index.js';
import { supplierDOM } from '../browser-agent/dom.js';
import { cartDecision,unchangedOthers,sameSnapshot } from '../browser-agent/policy.js';
import { readFile } from 'node:fs/promises';
import { hp415xSingles } from '../src/services/inkBundles.js';

const url='https://www.123schoon.nl/Handdoeken-i3737.html';
const line={supplier:'123schoon.nl',url,article:'SDR02017',title:'Handdoeken | 20 pakken',aantal:3};
function page(html,path=url) {
  const {document,window}=parseHTML(`<html><body><button>Uitloggen</button><main>${html}</main></body></html>`);
  globalThis.document=document;globalThis.location=new URL(path);globalThis.Event=window.Event;
  window.HTMLElement.prototype.getClientRects=()=>[{}];
  return document;
}
const product=()=>`<h1>${line.title}</h1><p>Direct leverbaar</p><form class="prodform" action="/Handdoeken-i3737.html#pSDR02017"><input name="amount" value="1"><button data-test="add-to-cart" data-measure='${JSON.stringify({label:line.title+' - SDR02017'})}'>Bestellen</button></form><button id="checkout">Afrekenen</button>`;
test('exacte productknop vult het aantal; afrekenen wordt nooit aangeraakt',()=>{
  const doc=page(product());let additions=0,checkout=0;
  doc.querySelector('[data-test]').addEventListener('click',()=>additions++);
  doc.querySelector('#checkout').addEventListener('click',()=>checkout++);
  assert.equal(supplierDOM('inspect',line).article,line.article);
  supplierDOM('add',{...line,quantity:3});
  assert.equal(doc.querySelector('input').value,'3');assert.equal(additions,1);assert.equal(checkout,0);
  assert.throws(()=>supplierDOM('checkout',line));
});
test('verkeerd artikelnummer, gewijzigde verpakking en redirect stoppen vóór klikken',()=>{
  page(product());assert.throws(()=>supplierDOM('add',{...line,article:'FOUT',quantity:1}),/artikelnummer/);
  assert.throws(()=>supplierDOM('add',{...line,title:'Handdoeken | 10 pakken',quantity:1}),/verpakking/);
  page(product(),'https://www.123inkt.be/Handdoeken-i3737.html');assert.throws(()=>supplierDOM('inspect',line),/domein/);
});
test('login, beschikbaarheid en gewijzigde selectors stoppen',()=>{
  page(product()).querySelector('body > button').remove();assert.throws(()=>supplierDOM('inspect',line),/aan/);
  page(product().replace('Direct leverbaar','Uitverkocht'));assert.throws(()=>supplierDOM('inspect',line),/beschikbaar/);
  page(product().replace('data-test="add-to-cart"','data-test="changed"'));assert.throws(()=>supplierDOM('inspect',line),/knop/);
});
test('winkelwagen wordt met exact artikelnummer, URL en aantal teruggelezen',()=>{
  page(`<table class="shopcart_overview"><tr data-role="cart-item" data-product-code="SDR02017"><td><input data-role="amount" value="3"></td><td data-test="product-name"><a href="${url}">${line.title}</a></td></tr></table>`,'https://www.123schoon.nl/shoppingcart.html');
  const cart=supplierDOM('cart',line);assert.equal(cart.length,1);assert.equal(cart[0].quantity,3);assert.equal(cartDecision(cart,line).action,'keep');
});
test('leeg is alleen leeg als de leverancier dat expliciet toont',()=>{
  page('<p>Uw winkelwagentje is leeg</p>','https://www.123schoon.nl/shoppingcart.html');assert.deepEqual(supplierDOM('cart',line),[]);
  page('<p>Storing</p>','https://www.123schoon.nl/shoppingcart.html');assert.throws(()=>supplierDOM('cart',line));
});
test('meerdere artikelen, bestaande winkelwagen en herhaling',()=>{
  const row={article:line.article,url,title:line.title,quantity:3};
  const other={article:'ANDER',url:'https://www.123schoon.nl/Ander-i2.html',title:'Ander',quantity:8};
  assert.equal(cartDecision([other],line).action,'add');
  assert.equal(cartDecision([other,row],line).action,'keep');
  assert.equal(cartDecision([other,{...row,quantity:2}],line).action,'skip');
  assert.equal(cartDecision([row,row],line).action,'skip');
  assert.equal(unchangedOthers([other],[other,row],line.article),true);
  assert.equal(unchangedOthers([other],[{...other,quantity:9},row],line.article),false);
});
test('gedeeltelijke verwerking behoudt afzonderlijke beslissingen',()=>{
  const cart=[{article:line.article,url,title:line.title,quantity:2}];
  const decisions=[line,{...line,article:'NIEUW',url:'https://www.123schoon.nl/Nieuw-i5.html'}].map(l=>cartDecision(cart,l));
  assert.deepEqual(decisions.map(d=>d.action),['skip','add']);
  assert.equal(sameSnapshot({lines:[line],id:1},{id:1,lines:[line]}),true);
  assert.equal(sameSnapshot({lines:[line]},{lines:[{...line,aantal:4}]}),false);
});
test('extensie vraagt geen cookies of algemene webtoegang',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../browser-agent/manifest.json',import.meta.url)));
  assert.deepEqual(manifest.permissions,['scripting','storage']);
  assert.equal(manifest.host_permissions.length,3);
  assert.equal(manifest.host_permissions.some(p=>p.includes('<all_urls>')),false);
  assert.deepEqual(manifest.content_scripts[0].matches,['https://aankoopbeheer-profo.vercel.app/*']);
});

test('HP-modelnummers worden uitsluitend op de vier exacte huismerkpagina’s vertaald',()=>{
  const codes={W2030X:'055437',W2031X:'055441',W2032X:'055445',W2033X:'055449'};
  for(const [hp,url] of Object.entries(hp415xSingles)) {
    const code=codes[hp], title=`123inkt huismerk vervangt HP 415X (${hp})`;
    const html=`<h1>${title}</h1><p>Direct leverbaar</p><form class="prodform" action="${url}#p${code}"><input name="amount" value="1"><button data-test="add-to-cart" data-measure='${JSON.stringify({label:title+' - '+code})}'>Bestellen</button></form>`;
    const doc=page(html,url);let clicks=0;
    doc.querySelector('form button').addEventListener('click',()=>clicks++);
    const expected={supplier:'123inkt.be',article:hp,url};
    const product=supplierDOM('inspect',expected);
    assert.equal(product.article,code);
    supplierDOM('add',{...expected,...product,quantity:1});
    assert.equal(clicks,1);
    assert.throws(()=>supplierDOM('inspect',{...expected,article:'W2039X'}),/artikelnummer/);
    const originalUrl='https://www.123inkt.be/Original-i123.html';
    page(html.replaceAll(url,originalUrl),originalUrl);
    assert.throws(()=>supplierDOM('inspect',{...expected,url:originalUrl}),/artikelnummer/);
  }
});

test('scriptfouten worden serialiseerbaar doorgegeven, nooit als een lege winkelwagen',()=>{
  page('<p>Storing</p>','https://www.123schoon.nl/shoppingcart.html');
  const error=supplierDOM('cart',line,true);
  assert.equal(error.ok,false);assert.match(error.error,/betrouwbaar/);
  page('<p>Uw winkelwagentje is leeg</p>','https://www.123schoon.nl/shoppingcart.html');
  assert.deepEqual(supplierDOM('cart',line,true),{ok:true,value:[]});
  assert.throws(()=>cartDecision(null,line),/betrouwbaar/);
  assert.equal(unchangedOthers([],null,line.article),false);
  page(product().replace(/data-measure='[^']*'/,"data-measure='null'"));
  assert.equal(supplierDOM('inspect',line,true).ok,false);
});
