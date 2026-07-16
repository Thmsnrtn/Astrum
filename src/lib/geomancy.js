// ═══════════════════════════════════════════════════════════════════════
// GEOMANCY ENGINE — the shield chart
// ═══════════════════════════════════════════════════════════════════════
// Pure computation: from four Mothers, derive the four Daughters (by
// transposition), the four Nieces and two Witnesses and the Judge (by
// addition), and lay the twelve figures into the astrological houses.
// A figure is four rows, top→bottom Fire / Air / Water / Earth, each row a
// single dot (1, active/odd) or a double (2, passive/even). Attributions
// and names live in data/geomancy.js; this module is the mathematics.
//
// Method after Agrippa (Of Geomancy) and J.M. Greer, The Art and Practice
// of Geomancy (2009) — verified separately.

import { FIGURES, figureByPattern } from "../data/geomancy.js";

// Add two figures row by row: like parities → double, unlike → single.
// (Dot counts summed; even total → double (2), odd → single (1).)
export function addFigures(a, b) {
  return a.map((r, i) => ((r + b[i]) % 2 === 0 ? 2 : 1));
}

// Transpose the four Mothers into the four Daughters: Daughter j's rows are
// the j-th row read down all four Mothers.
export function deriveDaughters(mothers) {
  return [0, 1, 2, 3].map(j => mothers.map(m => m[j]));
}

export function castShield(mothers) {
  const daughters = deriveDaughters(mothers);
  const nieces = [
    addFigures(mothers[0], mothers[1]),
    addFigures(mothers[2], mothers[3]),
    addFigures(daughters[0], daughters[1]),
    addFigures(daughters[2], daughters[3]),
  ];
  const rightWitness = addFigures(nieces[0], nieces[1]);
  const leftWitness = addFigures(nieces[2], nieces[3]);
  const judge = addFigures(rightWitness, leftWitness);
  // The Reconciler links the Judge back to the querent's First Mother.
  const reconciler = addFigures(judge, mothers[0]);
  return { mothers, daughters, nieces, rightWitness, leftWitness, judge, reconciler };
}

// The Judge is valid only if it is an even figure (total dots even) — the
// classical self-check that the cast was performed correctly.
export function judgeIsValid(judge) {
  return judge.reduce((a, r) => a + r, 0) % 2 === 0;
}

// Identify a figure pattern → its data record (name, planet, meaning…).
export function identify(pattern) {
  return figureByPattern(pattern) || null;
}

// Random figure generation — the modern stand-in for making rows of marks.
function randomRow() {
  const n = (typeof crypto !== "undefined" && crypto.getRandomValues)
    ? crypto.getRandomValues(new Uint8Array(1))[0]
    : Math.floor(Math.random() * 256);
  return (n % 2 === 0) ? 2 : 1;
}
export function randomFigure() { return [randomRow(), randomRow(), randomRow(), randomRow()]; }
export function randomMothers() { return [randomFigure(), randomFigure(), randomFigure(), randomFigure()]; }

// A tally of marks the user tapped out, per row, reduced to parity — the
// traditional generation (make dots without counting, take odd/even).
export function figureFromTallies(tallies) {
  return tallies.map(t => (t % 2 === 0 ? 2 : 1));
}

// Lay the shield's twelve figures into the houses: Mothers 1–4, Daughters
// 5–8, Nieces 9–12. Returns [{house, figure}] for houses 1..12.
export function houseChart(shield) {
  const order = [...shield.mothers, ...shield.daughters, ...shield.nieces];
  return order.map((figure, i) => ({ house: i + 1, figure }));
}

// The favorability of the Judge → the headline answer.
export function judgeVerdict(judge) {
  const rec = identify(judge);
  if (!rec) return { tone: "unknown", text: "" };
  return { tone: rec.tone, figure: rec.name, text: rec.meaning };
}
