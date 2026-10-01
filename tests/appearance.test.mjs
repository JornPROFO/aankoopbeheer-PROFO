import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseHTML } from '../tmp/cart-test-runtime/node_modules/linkedom/esm/index.js';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const initialize = source.slice(source.indexOf('function initializeTheme()'), source.indexOf('function renderSetupError()'));
function setup(saved, reduced = false, blocked = false) {
  const {document,window} = parseHTML('<html><body><button data-motion="dynamic"></button><button data-motion="calm"></button><button data-appearance-theme><span>Donker</span></button></body></html>');
  let stored = saved;
  runInNewContext(`${initialize}; initializeTheme();`, {document,matchMedia:()=>({matches:reduced}),localStorage:{getItem:()=>stored,setItem:(_key,value)=>{if(blocked)throw Error('Storage disabled');stored=value;}}});
  const click = selector => document.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true}));
  return {document,click,saved:()=>stored};
}
test('appearance changes persist and update accessible controls without rebuilding the page',()=>{
  const ui=setup(null);
  const body=ui.document.body;
  ui.click('[data-motion="calm"]');
  ui.click('[data-appearance-theme]');
  assert.equal(ui.document.documentElement.dataset.motion,'calm');
  assert.equal(ui.document.documentElement.dataset.theme,'dark');
  assert.equal(ui.document.querySelector('[data-motion="calm"]').getAttribute('aria-pressed'),'true');
  assert.equal(ui.document.querySelector('[data-appearance-theme]').getAttribute('aria-label'),'Lichte weergave');
  assert.equal(ui.document.body,body);
  const restored=setup(ui.saved());
  assert.equal(restored.document.documentElement.dataset.theme,'dark');
  assert.equal(restored.document.documentElement.dataset.motion,'calm');
});
test('reduced-motion default and unavailable storage remain usable',()=>{
  const ui=setup('{broken',true,true);
  assert.equal(ui.document.documentElement.dataset.motion,'calm');
  assert.doesNotThrow(()=>ui.click('[data-appearance-theme]'));
  assert.equal(ui.document.documentElement.dataset.theme,'dark');
});
