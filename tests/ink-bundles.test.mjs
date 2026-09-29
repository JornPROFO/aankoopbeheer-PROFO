import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleInkCart, hp415xSingles, hp415xSetUrl } from '../src/services/inkBundles.js';
const singles = Object.entries(hp415xSingles).map(([artikelnummer, leverancier_url], i) => ({
  id:i+1, printer_id:24, artikelnummer, leverancier_url, actief:true, leverancier:'123inkt.be',
  eenheid:'stuk', kleur:['BK','C','Y','M'][i], prijs_incl_btw:i ? 142.5 : 107.5, btw_percentage:21,
}));
const set = { ...singles[0], id:5, artikelnummer:'132198', kleur:'SET',
  leverancier_url:hp415xSetUrl, eenheid:'set van 4 toners', prijs_incl_btw:532.5 };
const catalog = [...singles,set];
const full = {'ink:1':1,'ink:2':1,'ink:3':1,'ink:4':1};
test('four colours become one editable set, with correct price and no mutation', () => {
  const cart = {...full, 77:3};
  const result = bundleInkCart(cart,catalog);
  assert.deepEqual(result,{'ink:5':1,77:3});
  assert.deepEqual(cart,{...full,77:3});
  assert.deepEqual(bundleInkCart(result,catalog),result);
  assert.equal(set.prijs_incl_btw,532.5);
});
test('multiple sets, excess singles and explicitly selected sets preserve quantities', () => {
  assert.deepEqual(bundleInkCart({'ink:1':4,'ink:2':2,'ink:3':3,'ink:4':2,'ink:5':1},catalog),
    {'ink:1':2,'ink:3':1,'ink:5':3});
});
test('incomplete colours and different printers never combine', () => {
  assert.deepEqual(bundleInkCart({'ink:1':1,'ink:2':1,'ink:3':1},catalog),{'ink:1':1,'ink:2':1,'ink:3':1});
  assert.deepEqual(bundleInkCart(full,catalog.map(c=>c.id===4?{...c,printer_id:26}:c)),full);
});
test('inactive, missing, ambiguous, more expensive or wrong supplier set is ignored', () => {
  for (const changes of [{actief:false},{prijs_incl_btw:0},{prijs_incl_btw:536},{leverancier:'other'},
    {leverancier_url:'https://www.123inkt.be/search/?search=415X'},{btw_percentage:6},{eenheid:'stuk'}]) {
    assert.deepEqual(bundleInkCart(full,[...singles,{...set,...changes}]),full);
  }
  assert.deepEqual(bundleInkCart(full,singles),full);
  assert.deepEqual(bundleInkCart(full,[...catalog,{...set,id:6}]),full);
});
test('original toners, wrong capacities, duplicate singles and invalid amounts are untouched', () => {
  assert.deepEqual(bundleInkCart(full,catalog.map(c=>c.id===1?{...c,leverancier_url:'https://www.123inkt.be/Original-i123.html'}:c)),full);
  assert.deepEqual(bundleInkCart(full,[...catalog,{...singles[0],id:9}]),full);
  for (const q of [-1,1.5,Infinity,'bad']) {
    const cart = {...full,'ink:1':q};
    assert.deepEqual(bundleInkCart(cart,catalog),cart);
  }
});
test('repeated choices made in separate visits combine once all colours are present', () => {
  const partial = bundleInkCart({'ink:1':1,'ink:2':1},catalog);
  assert.deepEqual(bundleInkCart({...partial,'ink:3':1,'ink:4':1},catalog),{'ink:5':1});
});
