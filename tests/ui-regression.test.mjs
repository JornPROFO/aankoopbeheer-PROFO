import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { escapeHtml } from '../src/utils/format.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function loadFunction(name, context) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  assert.notEqual(start, -1);
  const rest = source.slice(start);
  const next = rest.slice(1).search(/^(?:async )?function /m);
  vm.runInContext(next < 0 ? rest : rest.slice(0, next + 1), context);
  return context[name];
}

test('lichte weergave vraagt geen toestelvoorkeur of browseropslag', () => {
  const document = { documentElement: { dataset: {} } };
  const context = vm.createContext({ document });
  loadFunction('initializeTheme', context)();
  assert.equal(document.documentElement.dataset.theme, 'light');
});

test('winkelmand toont productfoto, EHBO-fallback en inktkleur', () => {
  const context = vm.createContext({ escapeHtml, isEhboProduct: p => p.categorie === 'EHBO',
    ehboDefaultImage: '/assets/ehbo-koffer-a-aanvulling.svg', defaultImage: '/assets/gevouwen-handdoeken-voorbeeld.png' });
  const render = loadFunction('renderCartProductImage', context);
  assert.match(render({ naam: 'Test <product>', image_url: '/assets/pritt-lijmstift-22g.jpg' }), /src="\/assets\/pritt-lijmstift-22g.jpg"/);
  assert.match(render({ naam: 'Test <product>' }), /Test &lt;product&gt;/);
  assert.match(render({ naam: 'Verband', categorie: 'EHBO' }), /ehbo-koffer-a-aanvulling.svg/);
  assert.match(render({ source_type: 'ink', kleur: 'C' }), /color-c/);
  assert.match(source, /\$\{renderCartProductImage\(product\)\}/);
  for (const asset of ['pritt-lijmstift-22g.jpg', 'ehbo-koffer-a-aanvulling.svg', 'gevouwen-handdoeken-voorbeeld.png']) {
    assert.ok(existsSync(new URL(`../public/assets/${asset}`, import.meta.url)));
  }
});

test('geen volledige achtergrondverversing tijdens bestellen of dubbel bij focus', async () => {
  let calls = 0;
  const context = vm.createContext({
    state: { session: { user: { email: 'test@example.invalid' } }, appUser: {}, loading: false, view: 'winkelmand' },
    document: { hidden: false }, passiveRefreshRunning: false, lastPassiveRefreshAt: 0,
    passiveRefreshViews: new Set(['start', 'bestellingen', 'analyse', 'beheer']),
    getPassiveRefreshSignature: () => '', isAdminUser: () => false,
    loadAankoopData: async () => { calls++; return {}; }, syncAppBadge: () => {}, render: () => {},
  });
  const refresh = loadFunction('refreshAankoopDataSilently', context);
  await refresh();
  assert.equal(calls, 0);
  context.state.view = 'start';
  await refresh();
  assert.equal(calls, 1);
  await refresh();
  assert.equal(calls, 1);
  context.lastPassiveRefreshAt = 0;
  context.document.hidden = true;
  await refresh();
  assert.equal(calls, 1);
});

test('geen blokkerend openingsscherm; navigatie blijft beschikbaar', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /data-startup-splash/);
  assert.doesNotMatch(source, /1750|renderThemeToggle/);
  for (const route of ['bestellen', 'winkelmand', 'bestellingen', 'analyse', 'beheer']) {
    assert.ok(source.includes(`navLink('${route}'`));
  }
});
