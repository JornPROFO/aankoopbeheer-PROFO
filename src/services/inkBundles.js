// Only this verified supplier set is interchangeable with these four singles.
export const hp415xSetUrl = 'https://www.123inkt.be/HP-Aanbieding-123inkt-huismerk-set-voor-HP-415X-HP-W2030X-W2031X-W2032X-W2033X-zwart-3-kleuren-i73734.html';
export const hp415xSingles = Object.freeze({
  W2030X: 'https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-415X-W2030X-toner-zwart-hoge-capaciteit-W2030XC-i56518.html',
  W2031X: 'https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-415X-W2031X-toner-cyaan-hoge-capaciteit-W2031XC-i56519.html',
  W2032X: 'https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-415X-W2032X-toner-geel-hoge-capaciteit-W2032XC-i56520.html',
  W2033X: 'https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-415X-W2033X-toner-magenta-hoge-capaciteit-W2033XC-i56521.html',
});

export function bundleInkCart(cart, cartridges) {
  const result = { ...cart };
  const usable = cartridges.filter(c => c.actief === true && c.leverancier === '123inkt.be'
    && Number.isFinite(Number(c.prijs_incl_btw)) && Number(c.prijs_incl_btw) > 0
    && Number(c.btw_percentage) === 21);
  for (const printerId of new Set(usable.map(c => String(c.printer_id)))) {
    const rows = usable.filter(c => String(c.printer_id) === printerId);
    const sets = rows.filter(c => c.kleur === 'SET' && c.artikelnummer === '132198'
      && c.leverancier_url === hp415xSetUrl && c.eenheid === 'set van 4 toners');
    if (sets.length !== 1) continue;
    const groups = Object.entries(hp415xSingles).map(([article, url]) => rows.filter(c =>
      c.artikelnummer === article && c.leverancier_url === url && c.eenheid === 'stuk'));
    // Ambiguous catalogue entries are not silently resolved.
    if (groups.some(group => group.length !== 1)) continue;
    const singles = groups.map(group => group[0]);
    const quantities = singles.map(c => Number(result[`ink:${c.id}`] || 0));
    if (quantities.some(q => !Number.isSafeInteger(q) || q < 1)) continue;
    const set = sets[0];
    if (Number(set.prijs_incl_btw) > singles.reduce((sum, c) => sum + Number(c.prijs_incl_btw), 0)) continue;
    const count = Math.min(...quantities);
    const setKey = `ink:${set.id}`;
    const existing = Number(result[setKey] || 0);
    if (!Number.isSafeInteger(existing) || existing < 0 || !Number.isSafeInteger(existing + count)) continue;
    singles.forEach((c, i) => {
      const key = `ink:${c.id}`;
      const remainder = quantities[i] - count;
      if (remainder) result[key] = remainder;
      else delete result[key];
    });
    result[setKey] = existing + count;
  }
  return result;
}
