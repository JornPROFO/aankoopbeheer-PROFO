import { supabase, supabasePublishableKey } from '../config/supabase.js';

export function requestAgent(action,payload,timeout=240000) {
  return new Promise((resolve,reject)=>{
    const id = crypto.randomUUID();
    const timer = setTimeout(()=>{window.removeEventListener('message',receive);reject(Error(action==='ping' ? 'Browseragent niet gekoppeld.' : 'Browseragent reageert niet meer. Controleer de winkelwagen vóór opnieuw starten.'));},timeout);
    function receive(event) {
      if (event.source !== window || event.origin !== location.origin || event.data?.channel !== 'profo-cart-response' || event.data.id !== id) return;
      clearTimeout(timer);window.removeEventListener('message',receive);
      event.data.error ? reject(Error(event.data.error)) : resolve(event.data.data);
    }
    window.addEventListener('message',receive);
    window.postMessage({channel:'profo-cart-request',id,action,payload},location.origin);
  });
}
async function credentials() {
  const {data,error} = await supabase.auth.getSession();
  if (error || !data.session) throw Error('Meld je opnieuw aan.');
  // App JWT is transient in the local extension; supplier login stays in browser.
  return {token:data.session.access_token,key:supabasePublishableKey};
}
export const prepareAgent = async (orderId,snapshot) => requestAgent('prepare',{orderId,snapshot,credentials:await credentials()});
export const executeAgent = async planId => requestAgent('execute',{planId,credentials:await credentials()});
export async function connectAgent() {
  const agent = await requestAgent('ping',{},10000);
  if (agent?.version !== '1.0.1') throw Error('Herlaad PROFO Winkelwagenagent naar versie 1.0.1 in het extensiebeheer. Download zo nodig het nieuwe installatiepakket.');
  return agent;
}
