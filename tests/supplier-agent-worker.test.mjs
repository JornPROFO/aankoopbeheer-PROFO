import test from 'node:test';
import assert from 'node:assert/strict';
import {APP_ORIGIN} from '../browser-agent/policy.js';

test('agent orchestration: partial failure, repeat, authorization and audit before mutation',async()=>{
  const snapshot={bestelling_id:15,lines:[1,2].map(id=>({id,product_id:id,product_naam:`Product ${id}`,eenheid:'pak',catalogus_eenheid:'pak',aantal:id,leverancier:'123schoon.nl',leverancier_url:JSON.stringify({artikelnummer:`SKU${id}`,url:`https://www.123schoon.nl/Product-i${id}.html`})}))};
  const events=[],cart=[],tabMap=new Map(),session={};let handler,tabId=0,adds=0,failSecond=true,authorized=true,brokenCart=false;
  const originalTimeout=globalThis.setTimeout;
  // Speed up the mocked browser transport, not a real browser.
  globalThis.setTimeout=(fn,ms,...args)=>originalTimeout(fn,0,...args);
  globalThis.fetch=async(url,request)=>{
    const body=JSON.parse(request.body);
    if(!authorized) return {ok:false};
    let data;
    if(url.endsWith('/aankoop_winkelwagen_snapshot')) data=snapshot;
    else if(url.endsWith('/aankoop_winkelwagen_agent_start')) data={id:'run',snapshot};
    else {events.push(body);data=[body];}
    return {ok:true,json:async()=>structuredClone(data)};
  };
  globalThis.chrome={storage:{session:{get:async key=>key?{[key]:session[key]}:{...session},set:async data=>Object.assign(session,data),remove:async keys=>{for(const key of [].concat(keys))delete session[key];}}},runtime:{id:'agent',getPlatformInfo:async()=>({}),onMessage:{addListener:fn=>{handler=fn;}}},tabs:{
    get:async id=>{if(!tabMap.has(id))throw Error('closed');return tabMap.get(id);},
    create:async options=>{const tab={id:++tabId,status:'complete',...options};tabMap.set(tab.id,tab);return tab;},
    update:async(id,options)=>{const tab={id,status:'complete',...options};tabMap.set(id,tab);return tab;},
  },scripting:{executeScript:async({args})=>{
    const [action,line]=args;
    if(action==='inspect')return [{result:{ok:true,value:{title:line.product_naam,article:line.article,url:line.url}}}];
    if(action==='cart')return [{result:brokenCart ? null : {ok:true,value:structuredClone(cart)}}];
    assert.equal(action,'add');
    assert.equal(events.at(-1).resultaat,'onzeker');
    if(line.id===2&&failSecond)throw Error('Leverancier niet bereikbaar');
    adds++;cart.push({article:line.article,url:line.url,title:line.title,quantity:line.quantity});return [{result:{ok:true,value:{submitted:true}}}];
  }}};
  try {
    await import('../browser-agent/worker.js');
    const send=(action,payload)=>new Promise(resolve=>handler({action,payload},{id:'agent',frameId:0,url:APP_ORIGIN+'/'},resolve));
    const credentials={token:'test-not-a-real-token',key:'test'};
    const prepare=()=>send('prepare',{orderId:15,snapshot,credentials});
    brokenCart=true;
    let failed=await prepare();assert.ok(failed.data.lines.every(l=>l.action==='skip' && /geldig controleresultaat/.test(l.reason)));assert.equal(adds,0);
    let failedExecution=await send('execute',{planId:failed.data.id,credentials});assert.equal(adds,0);assert.ok(failedExecution.data.results.every(r=>r.resultaat==='onzeker'));
    brokenCart=false;
    let plan=await prepare();assert.ok(plan.data?.id);
    assert.equal(JSON.stringify(session).includes(credentials.token),false);
    await import('../browser-agent/worker.js?simulated-worker-restart');
    let response=await send('execute',{planId:plan.data.id,credentials});
    assert.deepEqual(response.data.results.map(r=>r.resultaat),['toegevoegd','onzeker']);assert.equal(adds,1);
    failSecond=false;plan=await prepare();response=await send('execute',{planId:plan.data.id,credentials});
    assert.deepEqual(response.data.results.map(r=>r.resultaat),['reeds_aanwezig','toegevoegd']);assert.equal(adds,2);
    plan=await prepare();response=await send('execute',{planId:plan.data.id,credentials});
    assert.deepEqual(response.data.results.map(r=>r.resultaat),['reeds_aanwezig','reeds_aanwezig']);assert.equal(adds,2);
    authorized=false;assert.ok((await prepare()).error);assert.equal(adds,2);
    let responded=false;handler({action:'ping'},{id:'agent',frameId:0,url:'https://evil.example/'},()=>{responded=true;});assert.equal(responded,false);
    assert.ok([...tabMap.values()].every(t=>!t.url.includes('checkout')));
  } finally {globalThis.setTimeout=originalTimeout;}
});
