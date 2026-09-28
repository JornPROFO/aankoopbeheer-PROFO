import { supplierDOM } from './dom.js';
import { prepareLines, suppliers } from './model.js';
import { APP_ORIGIN, DB_ORIGIN, cartDecision, unchangedOthers, sameSnapshot } from './policy.js';

const plans = new Map(), tabs = new Map();
let busy = false;
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function database(credentials, path, body) {
  if (!credentials?.token || !credentials?.key) throw Error('Meld je opnieuw aan in Aankoopbeheer.');
  const response = await fetch(`${DB_ORIGIN}/rest/v1/${path}`, {
    method:'POST', headers:{apikey:credentials.key,Authorization:`Bearer ${credentials.token}`,'Content-Type':'application/json',Prefer:'return=representation'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(15000),credentials:'omit',redirect:'error',
  });
  if (!response.ok) throw Error('Bevoegdheid, bestelstatus of registratie gewijzigd. Open de bestelling opnieuw.');
  return response.json();
}
async function navigate(supplier, url) {
  const parsed = new URL(url);
  if (parsed.origin !== `https://www.${supplier}` || !(parsed.pathname === '/shoppingcart.html' || /^\/[A-Za-z0-9%_-]+-i\d+(?:-t\d+)?\.html$/.test(parsed.pathname)) || parsed.search || parsed.hash) throw Error('Niet-toegestane browserbestemming.');
  let tab;
  try { tab = await chrome.tabs.get(tabs.get(supplier)); } catch { /* Closed by user. */ }
  if (tab) tab = await chrome.tabs.update(tab.id,{url,active:true});
  else { tab = await chrome.tabs.create({url,active:true}); tabs.set(supplier,tab.id); }
  for (let i=0;i<100;i++) {
    await sleep(200);
    tab = await chrome.tabs.get(tab.id);
    if (tab.status === 'complete' && tab.url === url) return tab.id;
    if (tab.status === 'complete' && tab.url && tab.url !== url) throw Error('Leverancier heeft doorverwezen. Controleer aanmelding of product.');
  }
  throw Error('Leverancierspagina reageert niet tijdig.');
}
async function dom(tabId, action, expected) {
  const values = await chrome.scripting.executeScript({target:{tabId},func:supplierDOM,args:[action,expected]});
  if (values.length !== 1 || values[0].result === undefined) throw Error('Leverancierspagina kon niet worden gecontroleerd.');
  return values[0].result;
}
async function cart(line) { return dom(await navigate(line.supplier,suppliers[line.supplier].cart),'cart',line); }
async function prepare(payload) {
  const snapshot = await database(payload.credentials,'rpc/aankoop_winkelwagen_snapshot',{p_bestelling:payload.orderId});
  if (!sameSnapshot(snapshot,payload.snapshot)) throw Error('Bestelling gewijzigd. Open het overzicht opnieuw.');
  if (snapshot.lines.length > 50) throw Error('Maximaal 50 regels per browseroverdracht.');
  const lines = [];
  for (const line of prepareLines(snapshot)) {
    if (line.issue || !line.url) { lines.push({...line,action:'skip',reason:line.issue || 'Exacte productlink vereist voor browseroverdracht.'}); continue; }
    try {
      const product = await dom(await navigate(line.supplier,line.url),'inspect',line);
      const verified = {...line,...product};
      lines.push({...verified,...cartDecision(await cart(line),verified)});
    } catch (e) { lines.push({...line,action:'skip',reason:e.message}); }
  }
  for (const line of lines) {
    if (line.article && lines.filter(other=>other.supplier===line.supplier && other.article===line.article).length>1) {
      line.action='skip';line.reason='Hetzelfde leveranciersartikel staat op meerdere bestelregels. Bepaal eerst het gezamenlijke aantal.';
    }
  }
  const id = crypto.randomUUID();
  // Only public product data in ephemeral memory; never vendor sessions or credentials.
  plans.clear(); plans.set(id,{snapshot,lines,expires:Date.now()+10*60*1000});
  return {id,lines};
}
async function execute(payload) {
  const plan = plans.get(payload.planId);
  if (!plan || plan.expires < Date.now()) throw Error('Voorcontrole verlopen. Controleer de producten opnieuw.');
  plans.delete(payload.planId);
  const snapshot = await database(payload.credentials,'rpc/aankoop_winkelwagen_snapshot',{p_bestelling:plan.snapshot.bestelling_id});
  if (!sameSnapshot(snapshot,plan.snapshot)) throw Error('Bestelling gewijzigd. Er is niets toegevoegd.');
  const run = await database(payload.credentials,'rpc/aankoop_winkelwagen_agent_start',{p_bestelling:snapshot.bestelling_id,p_verwacht:snapshot});
  const results = [];
  async function record(line,result,reason,detail,quantity=null) {
    const successful = ['toegevoegd','reeds_aanwezig','aantal_aangepast'].includes(result);
    const entry = {overdracht_id:run.id,regel_id:line.id,resultaat:result,reden:reason,gecontroleerd_aantal:quantity,exact_gecontroleerd:successful,bron:'browser_agent',toelichting:detail.slice(0,400)};
    await database(payload.credentials,'aankoop_winkelwagen_resultaten',entry);
    return {...entry,product_naam:line.product_naam};
  }
  for (const line of plan.lines) {
    if (line.action === 'skip') { results.push(await record(line,'onzeker','identificatie',line.reason)); continue; }
    // Write uncertainty BEFORE any supplier mutation. A browser crash cannot leave
    // an unrecorded operation, and a retry always reads the live cart again.
    await record(line,'onzeker','onderbroken','Browsercontrole gestart; resultaat nog niet vastgesteld.');
    let outcome;
    try {
      const current = await database(payload.credentials,'rpc/aankoop_winkelwagen_snapshot',{p_bestelling:snapshot.bestelling_id});
      if (!sameSnapshot(current,snapshot)) throw Error('Bestelling gewijzigd tijdens overdracht.');
      const before = await cart(line);
      const decision = cartDecision(before,line);
      if (decision.action === 'skip') outcome = ['onzeker','andere_bestelling',decision.reason,null];
      else if (decision.action === 'keep') outcome = ['reeds_aanwezig','gecontroleerd','Exact artikel en gewenst aantal opnieuw in de winkelwagen gelezen.',Number(line.aantal)];
      else {
        const tabId = await navigate(line.supplier,line.url);
        await dom(tabId,'add',{...line,quantity:Number(line.aantal)});
        // The supplier submits asynchronously. Never retry the click. Read until
        // the expected row appears; ambiguity remains uncertain on interruption.
        let after;
        for (let attempt=0;attempt<5;attempt++) {
          await sleep(1200);
          after = await cart(line);
          if (after.some(r=>r.article===line.article)) break;
        }
        if (!unchangedOthers(before,after,line.article)) throw Error('Andere winkelwagenregels zijn gewijzigd; controleer de hele winkelwagen.');
        if (cartDecision(after,line).action !== 'keep') throw Error('Toevoeging niet bevestigd met exact artikel, variant en aantal.');
        outcome = ['toegevoegd','gecontroleerd','Toegevoegd en opnieuw gelezen op de winkelwagenpagina.',Number(line.aantal)];
      }
    } catch (e) { outcome = ['onzeker','technisch',e.message,null]; }
    // If recording fails, stop the entire run. Do not continue changing carts.
    results.push(await record(line,...outcome));
  }
  for (const supplier of new Set(plan.lines.filter(l=>suppliers[l.supplier]).map(l=>l.supplier))) {
    try { await navigate(supplier,suppliers[supplier].cart); } catch { /* Results remain visible. */ }
  }
  return {run,results};
}
chrome.runtime.onMessage.addListener((message,sender,respond) => {
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !sender.url || new URL(sender.url).origin !== APP_ORIGIN) return;
  if (message.action === 'ping') { respond({data:{version:'1.0.0'}}); return; }
  if (!['prepare','execute'].includes(message.action)) return;
  if (busy) { respond({error:'Er loopt al een overdracht in deze browser.'}); return; }
  busy = true;
  // A periodic extension API call keeps the worker alive while the user-visible
  // operation runs; no job or credential is persisted across browser restarts.
  const keepAlive = setInterval(()=>chrome.runtime.getPlatformInfo(),20000);
  const finish = result => {busy=false;clearInterval(keepAlive);respond(result);};
  (message.action === 'prepare' ? prepare(message.payload) : execute(message.payload))
    .then(data=>finish({data})).catch(e=>finish({error:e.message}));
  return true;
});
