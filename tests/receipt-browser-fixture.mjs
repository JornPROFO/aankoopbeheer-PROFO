// Local browser QA only. No Supabase connection and no email provider.
import http from 'node:http';
import fs from 'node:fs';
import {receiptEmail} from '../supabase/functions/_shared/receipt-link.ts';
const token='12345678-abcd-4321-abcd-123456789abc.'+'a'.repeat(64);
const order={id:123,locatie_naam:'Testlocatie',status:'Gedeeltelijk geleverd',updated_at:'2026-10-30T10:00:00Z',ontvangst:{aantallen:{1:1,2:0},volledig:false,created_at:'2026-10-29T10:00:00Z'},regels:[
  {id:1,product_naam:'Koffiecups – doos van 20 stuks',aantal:3,eenheid:'doos',leverstatus:'gedeeltelijk_geleverd'},
  {id:2,product_naam:'Kopieerpapier A4 – pak van 500 vellen',aantal:2,eenheid:'pak',leverstatus:'open'},
]};
const receipts=new Map();
const log=[];
fs.mkdirSync('output/receipt-mail',{recursive:true});
fs.writeFileSync('output/receipt-mail/email-preview.html',receiptEmail({mail_inhoud:{naam:'collega',locatie:'Testlocatie',bestelling_id:123,herinnering:true}},token).html);
http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5173');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.end();return;}
  let raw='';for await(const chunk of req) raw+=chunk;
  let result;
  try {
    const body=JSON.parse(raw);
    log.push(body.actie);
    if(body.token!==token) throw new Error('Ongeldige testlink.');
    if(body.actie==='bekijken') result=order;
    else if(receipts.has(body.request_id)) result=receipts.get(body.request_id);
    else {
      if(body.updated_at!==order.updated_at) throw new Error('De bestelling is intussen gewijzigd.');
      order.ontvangst={aantallen:body.aantallen,created_at:new Date().toISOString(),volledig:order.regels.every(r=>body.aantallen[r.id]===r.aantal)};
      order.status=order.ontvangst.volledig?'Geleverd':'Gedeeltelijk geleverd';
      order.updated_at=new Date().toISOString();
      result={ok:true,volledig:order.ontvangst.volledig};receipts.set(body.request_id,result);
    }
    fs.writeFileSync('output/receipt-mail/browser-check.json',JSON.stringify({actions:log,receipts:receipts.size,order},null,2));
  } catch(error){res.statusCode=409;result={error:error.message};}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
}).listen(5179,'127.0.0.1',()=>console.log('Fixture ready on 5179; synthetic data only.'));
