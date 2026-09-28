import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareLines, safeProductUrl, canUseSupplierCart, cartSummary, suppliers, transferReadiness } from '../src/services/supplierCartModel.js';

const line = { id: 1, product_naam: 'Stoffer rood', catalogus_naam: 'Stoffer rood', aantal: 3, eenheid: 'set', catalogus_eenheid: 'set', leverancier: '123schoon.nl', leverancier_url: JSON.stringify({ artikelnummer: 'SDR06503', url: 'https://www.123schoon.nl/123schoon-Stoffer-i19920.html' }) };
test('homepage zonder artikelnummer blokkeert starten met een concrete reden', () => {
  const result = transferReadiness({lines:[{...line,leverancier_url:'https://www.123schoon.nl/'}]});
  assert.equal(result.canStart,false);
  assert.match(result.lines[0].issue,/Alleen de homepage/);
});
test('bevestigde handdoekreferentie wordt herkend als 1 doos en geen 20 losse producten', () => {
  const result = transferReadiness({lines:[{...line,aantal:1,eenheid:'doos van 20 pakken',catalogus_eenheid:'doos van 20 pakken',leverancier_url:JSON.stringify({artikelnummer:'SDR02017',url:'https://www.123schoon.nl/123schoon-Gevouwen-handdoeken-2-laags-20-pakken-123schoon-huismerk-Geschikt-voor-Tork-H2-dispenser-i3737.html'})}]});
  assert.equal(result.canStart,true);
  assert.equal(result.lines[0].article,'SDR02017');
  assert.equal(result.lines[0].aantal,1);
});
test('gemengde lijst behoudt de geblokkeerde regel naast de bruikbare regel', () => {
  const result = transferReadiness({lines:[line,{...line,id:2,leverancier_url:'https://www.123schoon.nl/'}]});
  assert.deepEqual([result.ready,result.blocked,result.canStart],[1,1,true]);
});
test('alleen actieve Jorn en Kathleen, nooit een andere beheerder', () => {
  for (const email of ['jorn.neeus@profo.be', 'kathleen.nerinckx@profo.be']) assert.equal(canUseSupplierCart({ email, actief: true }, email), true);
  assert.equal(canUseSupplierCart({ email: 'ander@profo.be', actief: true, rol: 'Superadmin' }, 'ander@profo.be'), false);
  assert.equal(canUseSupplierCart({ email: 'jorn.neeus@profo.be', actief: false }, 'jorn.neeus@profo.be'), false);
  assert.equal(canUseSupplierCart({ email: 'jorn.neeus@profo.be', actief: true }, 'ander@profo.be'), false);
});
test('meerdere artikelen behouden afzonderlijke aantallen en exacte domeinen', () => {
  const rows = prepareLines({ lines: [line, { ...line, id: 2, leverancier: '123inkt.be', leverancier_url: '{"artikelnummer":"123","url":"https://www.123inkt.be/Papier-i123-t456.html"}', aantal: 7 }] });
  assert.deepEqual(rows.map(row => [row.aantal, row.issue]), [[3, ''], [7, '']]);
});
test('bestaande winkelwagen en herhaling worden alleen geregistreerd, nooit opgeteld', () => {
  const events = [{ id: 1, regel_id: 1, resultaat: 'toegevoegd' }, { id: 2, regel_id: 1, resultaat: 'reeds_aanwezig' }];
  assert.equal(cartSummary([line], events).complete, 1);
  assert.equal(line.aantal, 3);
});
test('fout nummer is nooit automatisch geverifieerd; ontbrekend nummer en link worden geblokkeerd', () => {
  const [row] = prepareLines({ lines: [{ ...line, leverancier_url: 'NIETBESTAAND-999' }] });
  assert.equal(row.url, '');
  assert.equal(cartSummary([row], [{ id: 1, regel_id: 1, resultaat: 'mislukt', reden: 'niet_gevonden' }]).complete, 0);
  assert.match(prepareLines({ lines: [{ ...line, leverancier_url: '' }] })[0].issue, /identificatie/);
});
test('afwijkende verpakking en dubbel artikel worden voor handmatige behandeling gemarkeerd', () => {
  assert.match(prepareLines({ lines: [{ ...line, catalogus_eenheid: 'doos 10' }] })[0].issue, /Verpakking/);
  assert.ok(prepareLines({ lines: [line, { ...line, id: 2 }] }).every(row => row.issue.includes('meermaals')));
});
test('bestaande inktregels gebruiken uitsluitend expliciete artikel- en linkreferenties', () => {
  const [ink] = prepareLines({lines:[{ id:4, product_id:null, product_naam:'Zwart - cartridge', aantal:2, eenheid:'stuk', product_omschrijving:'Inkt/toner voor Printer - art. ABC-123 - link: https://www.123inkt.be/Cartridge-i123.html' }]});
  assert.equal(ink.supplier,'123inkt.be');
  assert.equal(ink.article,'ABC-123');
  assert.equal(ink.issue,'');
  const [unknown] = prepareLines({lines:[{id:5,product_naam:'123inkt cartridge',aantal:2,eenheid:'stuk'}]});
  assert.equal(unknown.supplier,'');
});
test('gedeeltelijke mislukking en latere onderbreking blijven zichtbaar', () => {
  const rows = [line, { ...line, id: 2 }];
  const events = [{ id: 1, regel_id: 1, resultaat: 'toegevoegd' }, { id: 2, regel_id: 2, resultaat: 'mislukt' }];
  assert.match(cartSummary(rows, events).label, /Gedeeltelijk/);
  events.push({ id: 3, regel_id: 1, resultaat: 'onzeker' });
  assert.equal(cartSummary(rows, events).complete, 0);
});
test('geen afrekenroute, actie-URL, landwissel, query, credentials of externe host', async () => {
  for (const url of ['https://www.123inkt.be/checkout.html', 'https://www.123inkt.be/action/order.html', 'https://www.123inkt.nl/Papier-i1.html', 'https://www.123inkt.be.evil.test/Papier-i1.html', 'https://user:secret@www.123inkt.be/Papier-i1.html', 'https://www.123inkt.be/Papier-i1.html?order=1', 'javascript:alert(1)', 'http://www.123inkt.be/Papier-i1.html']) assert.equal(safeProductUrl(url, '123inkt.be'), '');
  assert.ok(Object.values(suppliers).every(shop => new URL(shop.cart).pathname === '/shoppingcart.html'));
  const service = await readFile(new URL('../src/services/supplierCartService.js', import.meta.url), 'utf8');
  assert.doesNotMatch(service, /updateOrderStatus|\.update\(|fetch\(/);
});
