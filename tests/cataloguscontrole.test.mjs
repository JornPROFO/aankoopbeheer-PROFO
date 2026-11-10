import test from 'node:test';
import assert from 'node:assert/strict';
import { auditItem, parseSource, checkedUrl, boundedFetch, sameIdentity } from '../supabase/functions/cataloguscontrole/core.mjs';
const url='https://www.123schoon.nl/Zakken-35-liter-i8984.html';
const image='https://www.123schoon.nl/image/Zakken_SDR1_m1_big.jpg';
const baseline={sku:'SDR1',name:'Zakken 35 liter 50 stuks',source_id:'8984',variant:{},image};
const html=(changes={})=>`<div data-product-model='${JSON.stringify({productId:8984,productCode:'SDR1',name:baseline.name,orderable:true,...changes})}'></div><img src="${image}">`;
const jpg=new Uint8Array(40); jpg.set([255,216]);jpg.set([255,217],38);
const response=(body,type='text/html')=>new Response(body,{headers:{'content-type':type}});
const item={id:'test',snapshot:{leverancier_url:JSON.stringify({url,artikelnummer:'SDR1'}),image_url:image},baseline};
test('identical supplier redirect is corrected; wrapped SKU remains a separate DB responsibility',async()=>{
  const final=url.replace('Zakken-35-liter','Vuilniszakken-35-liter');
  const fetcher=async(u)=>u===url?new Response(null,{status:301,headers:{location:final}}):u===final?response(html()):response(jpg,'image/jpeg');
  const r=await auditItem(item,{fetcher});assert.equal(r.status,'corrected');assert.deepEqual(r.patch,{leverancier_url:final});
});
test('different SKU, package, product ID and variant cannot be accepted',async()=>{
  for (const actual of [{...baseline,sku:'OTHER'},{...baseline,name:'Zakken 60 liter 20 stuks'},{...baseline,source_id:'9999'},{...baseline,variant:{attribute_pa_size:'xl'}}]) assert.equal(sameIdentity(baseline,actual,url),false);
  const r=await auditItem(item,{fetcher:async()=>response(html({name:'Zakken 35 liter 20 stuks'}))});assert.equal(r.status,'attention');assert.deepEqual(r.patch,{});
});
test('login HTML and unknown references cannot trigger repairs',async()=>{
  for(const row of [item,{...item,baseline:null}]) {const r=await auditItem(row,{fetcher:async()=>response(row.baseline?'<h1>Login</h1>':html())});assert.equal(r.status,'attention');assert.deepEqual(r.patch,{});}
});
test('missing image uses only the verified source image',async()=>{
  const r=await auditItem({...item,snapshot:{...item.snapshot,image_url:''}},{fetcher:async u=>u===url?response(html()):response(jpg,'image/jpeg')});
  assert.equal(r.status,'corrected');assert.deepEqual(r.patch,{image_url:image});
});
test('HTML disguised as an image is rejected',async()=>{
  const r=await auditItem(item,{fetcher:async u=>u===url?response(html()):response('<html>This is not an image even with the image MIME type</html>','image/jpeg')});
  assert.equal(r.status,'attention');assert.deepEqual(r.patch,{});
});
test('network requests cannot reach local addresses or unapproved redirects',async()=>{
  for(const u of ['http://www.123schoon.nl/a','https://127.0.0.1/a','https://www.123schoon.nl.evil.com/a','https://user:pass@www.123schoon.nl/a','https://www.123schoon.nl:444/a']) assert.throws(()=>checkedUrl(u));
  await assert.rejects(boundedFetch(url,{fetcher:async()=>new Response(null,{status:302,headers:{location:'https://169.254.169.254/latest/meta-data/'}})}));
});
test('temporary supplier failure is retried once',async()=>{
  let count=0;const r=await boundedFetch(url,{fetcher:async()=>++count===1?new Response(null,{status:503}):response(html())});assert.equal(count,2);assert.equal(r.url,url);
});
test('EHBO size selection resolves the exact variant, not the parent SKU',()=>{
  const u='https://www.ehbo-koffer.be/product/handschoen/?attribute_pa_maat=m';
  const page=`<script type="application/ld+json">${JSON.stringify({'@type':'Product',url:u,sku:'parent',name:'Handschoen',image:'https://www.ehbo-koffer.be/a.jpg'})}</script><form data-product_variations='${JSON.stringify([{sku:'maat-m',attributes:{attribute_pa_maat:'m'}},{sku:'maat-l',attributes:{attribute_pa_maat:'l'}}])}'></form>`;
  assert.equal(parseSource(page,u).sku,'maat-m');assert.throws(()=>parseSource(page,u.replace('maat=m','maat=s')));
  assert.equal(parseSource(page.replace('"sku":"maat-m"','"is_in_stock":false,"sku":"maat-m"'),u).available,false);
});
test('free-form request without supplier article is explicitly skipped',async()=>{
  const r=await auditItem({id:'free',snapshot:{leverancier_url:''}});assert.equal(r.status,'skipped');
});
