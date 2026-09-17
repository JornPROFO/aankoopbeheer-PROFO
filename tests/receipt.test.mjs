import test from 'node:test';
import assert from 'node:assert/strict';
import { canConfirmReceipt, validateReceipt, receiptRoute } from '../src/utils/receipt.js';
import { renderReceiptPanel } from '../src/ui/receipt.js';
const order = {id:10,besteller_id:42,besteller_naam:'Laura',status:'Besteld',regels:[
  {id:1,aantal:3,product_naam:'Zeep',eenheid:'fles',leverstatus:'open'},
  {id:2,aantal:1,product_naam:'Papier',leverstatus:'open'},
]};
test('alleen de besteller kan ontvangen na bestelling',()=>{
  assert.equal(canConfirmReceipt(order,42),true);
  assert.equal(canConfirmReceipt(order,43),false);
  assert.equal(canConfirmReceipt({...order,status:'Ter goedkeuring'},42),false);
  assert.equal(canConfirmReceipt({...order,status:'Geleverd'},42),false);
});
test('gedeeltelijke en volledige ontvangst, nul en ongeldige aantallen',()=>{
  assert.deepEqual(validateReceipt(order,{1:1,2:0}),{1:1,2:0});
  assert.deepEqual(validateReceipt(order,{1:3,2:1}),{1:3,2:1});
  for(const values of [{1:0,2:0},{1:4,2:1},{1:-1,2:1},{1:1.5,2:1},{1:1},{1:NaN,2:1},{1:1,2:1,3:1}])
    assert.throws(()=>validateReceipt(order,values));
});
test('nalevering kan eerdere ontvangst niet verminderen',()=>{
  const partial={...order,ontvangst:{aantallen:{1:2,2:0}}};
  assert.throws(()=>validateReceipt(partial,{1:1,2:1}));
  assert.deepEqual(validateReceipt(partial,{1:3,2:1}),{1:3,2:1});
});
test('geannuleerde regels tellen niet mee',()=>{
  assert.deepEqual(validateReceipt({...order,regels:[order.regels[0],{...order.regels[1],leverstatus:'geannuleerd'}]},{1:3}),{1:3});
});
test('link opent alleen de bedoelde bestelling',()=>{
  assert.equal(receiptRoute('#bestellingen?ontvangst=10'),'10');
  assert.equal(receiptRoute('#bestellingen'),null);
  assert.equal(receiptRoute('#bestellingen?ontvangst=<script>'),null);
});
test('beheerder ziet aanvraagknop, besteller bevestigingsformulier; tekst wordt escaped',()=>{
  const admin=renderReceiptPanel(order,99,true,false);
  assert.match(admin,/data-request-receipt/); assert.doesNotMatch(admin,/data-receipt-form/);
  const requester=renderReceiptPanel({...order,ontvangst:{created_at:new Date().toISOString(),aantallen:{1:1,2:0},opmerking:'<script>alert(1)</script>'}},42,false,false);
  assert.match(requester,/data-receipt-form/); assert.match(requester,/nog 2 te ontvangen/);
  assert.doesNotMatch(requester,/<script>/); assert.match(requester,/&lt;script&gt;/);
});
