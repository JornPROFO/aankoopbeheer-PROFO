// Only the production app, top frame, can talk to this agent. No supplier credentials.
if (window === window.top) {
  window.addEventListener('message', async event => {
    const m = event.data;
    if (event.source !== window || event.origin !== 'https://aankoopbeheer-profo.vercel.app' || m?.channel !== 'profo-cart-request' || typeof m.id !== 'string') return;
    if (!['ping', 'prepare', 'execute'].includes(m.action)) return;
    try {
      const result = await chrome.runtime.sendMessage({action:m.action, payload:m.payload});
      window.postMessage({channel:'profo-cart-response',id:m.id,...result}, event.origin);
    } catch {
      window.postMessage({channel:'profo-cart-response',id:m.id,error:'Browserkoppeling onderbroken. Controleer de winkelwagen en open het overzicht opnieuw.'}, event.origin);
    }
  });
}
