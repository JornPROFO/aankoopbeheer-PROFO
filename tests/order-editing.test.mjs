import test from 'node:test';
import assert from 'node:assert/strict';
import { canEditOrderLines, validateOrderLineQuantity } from '../src/utils/orderEditing.js';

test('alleen beheer mag een nog niet extern geplaatste bestelling aanpassen', () => {
  for (const status of ['Ter goedkeuring', 'Extra informatie gevraagd', 'Goedgekeurd', 'In behandeling']) {
    assert.equal(canEditOrderLines({status}, true), true);
    assert.equal(canEditOrderLines({status}, false), false);
  }
  for (const status of ['Besteld', 'Gedeeltelijk geleverd', 'Geleverd', 'Afgesloten', 'Geweigerd', 'onbekend']) {
    assert.equal(canEditOrderLines({status}, true), false);
  }
  assert.equal(canEditOrderLines({status:'Goedgekeurd', opmerkingen:'Categorie: Keuken\nBesteld op: 2026-09-16'}, true), false);
});

test('aantallen volgen de verpakking en bestelstap', () => {
  assert.equal(validateOrderLineQuantity(1, 1), true);
  assert.equal(validateOrderLineQuantity(6, 3), true);
  for (const value of [0, -1, 1.5, NaN, Infinity, 10001, '']) {
    assert.equal(validateOrderLineQuantity(value), false);
  }
  assert.equal(validateOrderLineQuantity(2, 3), false);
});
