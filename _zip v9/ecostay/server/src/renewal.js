// Certificaatgeldigheid + herbeoordeling (renewal).
//
// Een certificaat is 12 maanden geldig. De herbeoordeling wordt aangeboden in
// het laatste jaar vóór verloop. Hoe eerder de eigenaar 'm aanvraagt, hoe
// goedkoper — met een bodem van € 10.
//
// Prijsstaffel per "maanden tot verloop" (index 1..12). Pas gerust aan:
//   1 mnd → €50, 2 → €40, 3 → €30, 4 → €20, 5..12 → €10
export const CERT_VALID_MONTHS = 12;

export const RENEWAL_PRICES = {
  1: 50, 2: 40, 3: 30, 4: 20,
  5: 10, 6: 10, 7: 10, 8: 10, 9: 10, 10: 10, 11: 10, 12: 10,
};

// Hele maanden tot de verloopdatum, op basis van de kalender (niet gemiddelde
// maandlengtes), zodat precies 2 kalendermaanden ook "2" oplevert.
export function monthsUntil(expiresAt, now = new Date()) {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt);
  if (exp.getTime() <= now.getTime()) return 0; // al verlopen
  let months = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
  // Resterende dagen voorbij de laatste hele maand tellen als een extra bucket.
  if (exp.getDate() > now.getDate()) months += 1;
  return Math.max(1, months);
}

// Geeft het herbeoordelingsaanbod voor een verblijf, of null als (nog) niet
// van toepassing.
export function renewalOffer(expiresAt, now = new Date()) {
  if (!expiresAt) return null;
  const months = monthsUntil(expiresAt, now);
  if (months === null) return null;

  // Verlopen: herbeoordeling tegen het hoogste tarief.
  if (months === 0) {
    return { available: true, expired: true, monthsUntilExpiry: 0, price: RENEWAL_PRICES[1], expiresAt };
  }
  // Binnen het laatste jaar: aanbod actief.
  if (months <= CERT_VALID_MONTHS) {
    const price = RENEWAL_PRICES[months] ?? RENEWAL_PRICES[CERT_VALID_MONTHS];
    return { available: true, expired: false, monthsUntilExpiry: months, price, expiresAt };
  }
  // Verder dan een jaar weg: nog geen aanbod.
  return { available: false, expired: false, monthsUntilExpiry: months, price: null, expiresAt };
}
