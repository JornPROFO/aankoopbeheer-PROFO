const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const encoder = new TextEncoder();

async function key(secret: string) {
  if (secret.length < 32) throw new Error('Ontvangstlinks zijn nog niet geconfigureerd.');
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}

export async function signReceiptLink(id: string, secret: string) {
  if (!uuid.test(id)) throw new Error('Ongeldig verzendkenmerk.');
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode('receipt-v1:'+id)));
  return id+'.'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}

export async function verifyReceiptLink(token: unknown, secret: string) {
  if (typeof token !== 'string' || token.length !== 101) return null;
  const [id,signature] = token.split('.');
  if (!uuid.test(id) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const bytes = Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16));
  return await crypto.subtle.verify('HMAC',await key(secret),bytes,encoder.encode('receipt-v1:'+id)) ? id : null;
}

export function receiptEmail(data: Record<string, any>, token: string) {
  const d=data.mail_inhoud;
  const url='https://aankoopbeheer-profo.vercel.app/ontvangst.html#'+token;
  const e=(value: unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const subject=`${d.herinnering?'Herinnering: bevestig':'Bevestig'} de ontvangst - bestelling ${d.bestelling_id} - ${d.locatie}`;
  const intro=d.herinnering
    ? `Voor bestelling ${d.bestelling_id} voor ${d.locatie} ontbreekt nog een volledige ontvangstbevestiging.`
    : `Je bestelling ${d.bestelling_id} voor ${d.locatie} is bij de leverancier geplaatst.`;
  const instructions='Zijn de spullen geleverd? Bevestig dan wat je ontvangen hebt. Via de knop hieronder kan dat zonder je aan te melden in Aankoopbeheer. Je kunt alles bevestigen of per artikel de nieuw ontvangen aantallen invullen.';
  const footer='Is er nog niets geleverd, dan hoef je nog niets te bevestigen. Ontbrekende artikelen blijven open voor opvolging. Aankoopbeheer krijgt je bevestiging automatisch.';
  const validity='Deze persoonlijke link is 14 dagen geldig. Stuur hem niet door. Gebruik bij een nieuwe herinnering de link uit de meest recente mail.';
  return {subject,
    text:[`Dag ${d.naam},`,'',intro,'',instructions,'',`Ontvangst bevestigen: ${url}`,'',footer,'',validity,'','Bedankt voor de opvolging.','PROFO Aankoopbeheer'].join('\n'),
    html:`<!doctype html><html lang="nl"><body style="font-family:Arial,sans-serif;color:#333;background:#F9F9F9;padding:24px"><main style="max-width:620px;margin:auto;background:#fff;padding:28px;border-top:5px solid #B61917"><h1 style="color:#B61917;font-size:24px">Ontvangst bevestigen</h1><p>Dag ${e(d.naam)},</p><p>${e(intro)}</p><p>${e(instructions)}</p><p style="margin:28px 0"><a href="${e(url)}" style="display:inline-block;background:#B61917;color:white;text-decoration:none;padding:14px 20px;border-radius:6px">Ontvangst bevestigen</a></p><p>${e(footer)}</p><p style="background:#F5DEDD;padding:14px;font-size:14px">${e(validity)}</p><p>Bedankt voor de opvolging.<br>PROFO Aankoopbeheer</p></main></body></html>`};
}
