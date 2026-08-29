// ═══════════════════════════════════════════════════════════════════════
// ESSENTIAL DIGNITY (weighted), RECEPTION, and the ALMUTEN
// ═══════════════════════════════════════════════════════════════════════
// The classical Ptolemaic weights: domicile +5, exaltation +4, triplicity
// +3, bound (Egyptian term) +2, face (decan) +1; detriment −5, fall −4.
// Before this module, dignityScore was a 5-value lookup that ignored the
// bound and triplicity the app already computed — a planet in its own
// bound and triplicity ranked as bare peregrine, and the entire electional
// ranking inherited that blindness.
//
// Reception: planet A *receives* planet B when B stands in one of A's
// dignities (here: domicile or exaltation — the strong receptions of
// horary practice). Mutual reception, "the most powerful planetary
// alliance available", is each received by the other.

import { DOMICILE, EXALT, getBound, getTriplicity, ELEMENT_BY_SIGN, TRIPLICITIES } from "./astro.js";
import { DECANS } from "../data/decans.js";

const norm = a => ((a % 360) + 360) % 360;
const signOf = lon => Math.floor(norm(lon) / 30);

export const DIGNITY_WEIGHTS = { domicile: 5, exaltation: 4, triplicity: 3, bound: 2, face: 1, detriment: -5, fall: -4 };

export function faceRuler(lon) {
  return DECANS[Math.min(35, Math.floor(norm(lon) / 10))]?.ruler ?? null;
}

// Full weighted essential dignity for a planet at a longitude.
// Returns { points, parts: ["domicile", "bound", …] }.
export function essentialDignity(planet, lon, isDayChart = true) {
  const si = signOf(lon);
  const parts = [];
  let points = 0;
  if (DOMICILE[planet]?.includes(si)) { parts.push("domicile"); points += 5; }
  if (EXALT[planet]?.s === si) { parts.push("exaltation"); points += 4; }
  const trip = TRIPLICITIES[ELEMENT_BY_SIGN[si]];
  if ((isDayChart ? trip.day : trip.night) === planet) { parts.push("triplicity"); points += 3; }
  if (getBound(lon) === planet) { parts.push("bound"); points += 2; }
  if (faceRuler(lon) === planet) { parts.push("face"); points += 1; }
  if (DOMICILE[planet]?.map(s => (s + 6) % 12).includes(si)) { parts.push("detriment"); points -= 5; }
  if (EXALT[planet] && (EXALT[planet].s + 6) % 12 === si) { parts.push("fall"); points -= 4; }
  return { points, parts };
}

// Display score 0–99 from weighted points (−9 … +15), retrograde-penalized.
// Replaces the old 5-value lookup while keeping the familiar scale.
export function essentialScore(planet, lon, isDayChart = true, retro = false) {
  const { points } = essentialDignity(planet, lon, isDayChart);
  const base = Math.round(58 + points * 3.2); // peregrine 58; +5 dom → ~74; dom+trip+bound → ~90; −9 → ~29
  return Math.max(12, Math.min(99, base - (retro ? 14 : 0)));
}

// ── Reception ──────────────────────────────────────────────────────────
// Does `receiver` receive `guestLon` (the position of another planet)?
export function receives(receiver, guestLon) {
  const si = signOf(guestLon);
  if (DOMICILE[receiver]?.includes(si)) return "domicile";
  if (EXALT[receiver]?.s === si) return "exaltation";
  return null;
}

export function mutualReception(pkA, lonA, pkB, lonB) {
  const ab = receives(pkA, lonB); // A hosts B
  const ba = receives(pkB, lonA); // B hosts A
  if (ab && ba) return { kind: "mutual", a: ab, b: ba };
  if (ab) return { kind: "single", receiver: pkA, of: pkB, by: ab };
  if (ba) return { kind: "single", receiver: pkB, of: pkA, by: ba };
  return null;
}

// ── Almuten of a degree ────────────────────────────────────────────────
// The planet with the greatest weighted claim on a zodiacal degree.
export function almuten(lon, isDayChart = true) {
  const scores = {};
  const add = (pk, n) => { if (pk) scores[pk] = (scores[pk] || 0) + n; };
  const si = signOf(lon);
  for (const [pk, signs] of Object.entries(DOMICILE)) if (signs.includes(si)) add(pk, 5);
  for (const [pk, ex] of Object.entries(EXALT)) if (ex.s === si) add(pk, 4);
  const trip = TRIPLICITIES[ELEMENT_BY_SIGN[si]];
  add(isDayChart ? trip.day : trip.night, 3);
  add(getBound(lon), 2);
  add(faceRuler(lon), 1);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return ranked.length ? { planet: ranked[0][0], points: ranked[0][1], ranking: ranked } : null;
}
