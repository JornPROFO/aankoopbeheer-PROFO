import test from 'node:test';
import assert from 'node:assert/strict';
import {signReceiptLink,verifyReceiptLink,receiptEmail} from '../supabase/functions/_shared/receipt-link.ts';
import {renderReceiptPanel} from '../src/ui/receipt.js';
const secret='test-only-secret-'.repeat(4);
const id='12345678-abcd-4321-abcd-123456789abc';

test('link is cryptographically bound to one mail request and secret',async()=>{
  const token=await signReceiptLink(id,secret);
  assert.equal(await verifyReceiptLink(token,secret),id);
  assert.equal(await verifyReceiptLink(token,secret+'other'),null);
  assert.equal(await verifyReceiptLink(token.replace('12345678','12345679'),secret),null);
  assert.equal(await verifyReceiptLink(token.slice(0,-1)+(token.endsWith('a')?'b':'a'),secret),null);
  for(const invalid of [null,{},id,'',token+'.extra','../'+token]) assert.equal(await verifyReceiptLink(invalid,secret),null);
  await assert.rejects(()=>signReceiptLink(id,''));
});

test('mail has the same personal link in text and escaped HTML, no login required',async()=>{
  const token=await signReceiptLink(id,secret);
  const data={mail_inhoud:{naam:'<script>test</script>',locatie:'Merksem & omgeving',bestelling_id:42,herinnering:true}};
  const mail=receiptEmail(data,token);
  assert.match(mail.subject,/Herinnering/);
  assert.match(mail.text,/zonder je aan te melden/);
  assert.match(mail.text,/14 dagen/);
  assert.ok(mail.text.includes('/ontvangst.html#'+token));
  assert.ok(mail.html.includes('/ontvangst.html#'+token));
  assert.doesNotMatch(mail.html,/<script>/);
  assert.match(mail.html,/&lt;script&gt;/);
  assert.deepEqual(mail,receiptEmail(data,await signReceiptLink(id,secret)));
});

test('reminder remains available after a sent request only for open orders and managers',()=>{
  const order={id:10,besteller_id:42,status:'Besteld',regels:[],ontvangstverzoek:{mail_verzonden_op:'2026-10-14T16:53:00Z',mail_aantal:2}};
  assert.match(renderReceiptPanel(order,99,true,false),/Herinnering ontvangst versturen/);
  assert.match(renderReceiptPanel({...order,status:'Gedeeltelijk geleverd'},99,true,false),/data-receipt-reminder="true"/);
  assert.doesNotMatch(renderReceiptPanel(order,42,false,false),/data-request-receipt/);
  for(const status of ['Geleverd','Geannuleerd','Ter goedkeuring'])
    assert.doesNotMatch(renderReceiptPanel({...order,status},99,true,false),/data-request-receipt/);
  assert.match(renderReceiptPanel(order,99,true,true),/data-receipt-reminder="true" disabled/);
  assert.match(renderReceiptPanel(order,99,true,false),/Totaal 2 ontvangstverzoeken/);
});
