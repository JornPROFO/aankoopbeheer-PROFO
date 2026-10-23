import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseHTML} from '../tmp/cart-test-runtime/node_modules/linkedom/esm/index.js';

const source=readFileSync(new URL('../src/ui/tactile-experience.js',import.meta.url),'utf8').replaceAll('export function','function');
function setup() {
  const {document,window}=parseHTML('<html data-motion="calm"><body><div id="app"><div class="family-nav"><nav class="sidebar"><a href="#start">Start</a><a href="#bestellen">Producten</a></nav></div><input value="Onbewaarde invoer"/></div></body></html>');
  const values=new Map();
  const context={document,window,Element:window.Element,MutationObserver:window.MutationObserver,location:{hash:'#start'},requestAnimationFrame:()=>1,setTimeout,localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}};
  runInNewContext(`${source};document.getElementById('app').insertAdjacentHTML('beforeend',renderSoundControl()+renderExperienceDock('purchase','start'));initializeTactileExperience();`,context);
  const dialog=document.querySelector('dialog');dialog.showModal=function(){this.open=true;};dialog.close=function(){this.open=false;};
  return {document,values,dialog,click:selector=>document.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true})),cancel:()=>dialog.dispatchEvent(new window.Event('cancel',{cancelable:true}))};
}
test('sound preference updates without replacing unsaved input or requiring audio support',()=>{
  const ui=setup(),input=ui.document.querySelector('input');
  ui.click('[data-click-sound]');
  assert.equal(ui.values.get('profo-click-sound'),'off');
  assert.equal(ui.document.querySelector('[data-click-sound]').getAttribute('aria-pressed'),'false');
  assert.equal(ui.document.querySelector('input'),input);
  assert.equal(input.value,'Onbewaarde invoer');
  assert.doesNotThrow(()=>ui.click('[data-click-sound]'));
  assert.equal(ui.values.get('profo-click-sound'),'on');
});
test('mobile menu copies only visible navigation and restores scrolling when cancelled',()=>{
  const ui=setup();ui.click('[data-experience-menu]');
  assert.equal(ui.dialog.open,true);
  assert.deepEqual([...ui.dialog.querySelectorAll('a')].map(a=>a.getAttribute('href')),['#start','#bestellen']);
  assert.equal(ui.document.body.style.overflow,'hidden');
  ui.cancel();
  assert.equal(ui.dialog.open,false);
  assert.notEqual(ui.document.body.style.overflow,'hidden');
  assert.equal(ui.document.querySelector('[data-experience-menu]').getAttribute('aria-expanded'),'false');
});
