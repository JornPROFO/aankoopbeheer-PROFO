import test from 'node:test';
import assert from 'node:assert/strict';
import { supplierRemedy, renderSupplierSteps } from '../src/ui/supplier-guidance.js';

test('aanmelden, afwijkende aantallen en productgegevens krijgen een passende vervolgstap',()=>{
  const line={supplier:'123inkt.be',url:'https://www.123inkt.be/Koffie-i107759.html'};
  assert.match(supplierRemedy(line,'Meld je eerst zelf aan bij de leverancier'),/href="https:\/\/www.123inkt.be\/"/);
  assert.match(supplierRemedy(line,'Afwijkend bestaand aantal'),/shoppingcart.html/);
  assert.match(supplierRemedy(line,'Geen toegestane productpagina'),/href="#beheer"/);
  assert.match(supplierRemedy(line,'Technische fout'),/Koffie-i107759.html/);
  assert.doesNotMatch(supplierRemedy({...line,url:'javascript:alert(1)'},'Fout'),/javascript:/);
});
test('overdracht is na vullen nog bij extern afronden, nooit automatisch besteld',()=>{
  const html=renderSupplierSteps(true,{},[]);
  assert.match(html,/aria-current="step"[^>]*>Extern afronden/);
  assert.doesNotMatch(html,/aria-current="step"[^>]*>Als besteld registreren/);
  assert.equal((html.match(/aria-current/g)||[]).length,1);
});
