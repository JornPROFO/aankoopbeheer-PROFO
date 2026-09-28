import { supabase } from '../config/supabase.js';

async function checked(request) {
  const { data, error } = await request;
  if (error) throw new Error('De winkelwagenregistratie kon niet worden gelezen of bewaard. Controleer je bevoegdheid, de goedkeuringsstatus en of de database-uitbreiding voor winkelwagenoverdracht is geïnstalleerd. Open bij gewijzigde gegevens het overzicht opnieuw. Controleer vóór opnieuw proberen of een handmatige wijziging bij de leverancier al is uitgevoerd.');
  return data;
}
export const previewTransfer = orderId => checked(supabase.rpc('aankoop_winkelwagen_snapshot', { p_bestelling: orderId }));
export const startTransfer = (orderId, snapshot) => checked(supabase.rpc('aankoop_winkelwagen_start', { p_bestelling: orderId, p_verwacht: snapshot }));
export const getTransferEvents = runId => checked(supabase.from('aankoop_winkelwagen_resultaten').select('*').eq('overdracht_id', runId).order('id'));
export const getTransferHistory = orderId => checked(supabase.from('aankoop_winkelwagen_overdrachten').select('id,created_at,actor_id').eq('bestelling_id', orderId).order('created_at', { ascending: false }));
export const recordTransferResult = (runId, lineId, result, reason, quantity, confirmed) => checked(supabase.from('aankoop_winkelwagen_resultaten').insert({ overdracht_id: runId, regel_id: lineId, resultaat: result, reden: reason, gecontroleerd_aantal: quantity, exact_gecontroleerd: confirmed }).select('*').single());
