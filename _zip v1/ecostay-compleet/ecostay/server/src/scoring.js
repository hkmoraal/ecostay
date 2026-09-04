// The one place that decides how many leaves a stay earns.
// Keep thresholds here so the rule lives in a single, testable spot.

export const LEVELS = [
  { level: 0, key: 'geen',   label: 'Nog niet gecertificeerd', min: 0 },
  { level: 1, key: 'brons',  label: 'Brons',  min: 40 },
  { level: 2, key: 'zilver', label: 'Zilver', min: 60 },
  { level: 3, key: 'goud',   label: 'Goud',   min: 80 },
];

// score is a percentage 0..100
export function levelForScore(score) {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (score >= l.min) result = l;
  }
  return result.level;
}

export function levelInfo(level) {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
}

// Given the full criteria list and the set of met criterion ids, return
// { score, level, gotPoints, totalPoints }.
export function computeScore(criteria, metIds) {
  const met = new Set(metIds.map(Number));
  let got = 0;
  let total = 0;
  for (const c of criteria) {
    total += c.points;
    if (met.has(Number(c.id))) got += c.points;
  }
  const score = total === 0 ? 0 : Math.round((1000 * got) / total) / 10; // 1 decimal
  return { score, level: levelForScore(score), gotPoints: got, totalPoints: total };
}
