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

// ═══ Perfection — does the chart connect querent and quesited? ═══════════
// After Greer's Art and Practice of Geomancy: four modes of perfection,
// judged mechanically over the twelve-house chart (array of 12 patterns,
// houses 1-indexed). Any mode = the chart perfects (a yes, in the manner
// the mode describes); none = denial.
const eqFig = (a, b) => !!a && !!b && a.join("") === b.join("");
const neighbours = h => [((h - 2 + 12) % 12) + 1, (h % 12) + 1];

export function perfection(houses, quesitedHouse, querentHouse = 1) {
  const q = houses[querentHouse - 1], s = houses[quesitedHouse - 1];
  const modes = [];
  // Occupation: the same figure holds both houses — the strongest yes.
  if (eqFig(q, s)) modes.push({ mode: "occupation", note: "the same figure holds both houses — the matter and the querent are one; the strongest perfection" });
  // Conjunction: one significator's figure stands in a house beside the other.
  if (neighbours(quesitedHouse).some(h => h !== querentHouse && eqFig(houses[h - 1], q)))
    modes.push({ mode: "conjunction", note: "the querent's figure stands beside the quesited's house — the querent must go to the matter" });
  else if (neighbours(querentHouse).some(h => h !== quesitedHouse && eqFig(houses[h - 1], s)))
    modes.push({ mode: "conjunction", note: "the quesited's figure stands beside the querent's house — the matter comes to the querent" });
  // Mutation: both significators appear side-by-side elsewhere in the chart.
  for (let h = 1; h <= 12; h++) {
    const nh = (h % 12) + 1;
    if ([h, nh].some(x => x === querentHouse || x === quesitedHouse)) continue;
    if ((eqFig(houses[h - 1], q) && eqFig(houses[nh - 1], s)) || (eqFig(houses[h - 1], s) && eqFig(houses[nh - 1], q))) {
      modes.push({ mode: "mutation", note: `the two significators meet in houses ${h} and ${nh} — the matter resolves in an unexpected place` });
      break;
    }
  }
  // Translation: the same third figure stands beside both significators.
  const qN = neighbours(querentHouse).filter(h => h !== quesitedHouse);
  const sN = neighbours(quesitedHouse).filter(h => h !== querentHouse);
  outer: for (const a of qN) for (const b of sN) {
    const f = houses[a - 1];
    if (a !== b && eqFig(f, houses[b - 1]) && !eqFig(f, q) && !eqFig(f, s)) {
      modes.push({ mode: "translation", note: `${figureByPattern(f)?.name || "a third figure"} stands beside both — a go-between carries the matter` });
      break outer;
    }
  }
  return { perfects: modes.length > 0, modes };
}

// ═══ Company of houses ═══════════════════════════════════════════════════
// Houses pair odd-even (1·2, 3·4 … 11·12). Company strengthens the paired
// house's figure as a co-significator. Kinds in traditional priority:
// simple (same figure), demi-simple (same ruling planet), compound (a figure
// and its inverse), capitular (matching first/Fire line).
export const invertFigure = p => p.map(r => (r === 1 ? 2 : 1));

export function company(houses, houseN) {
  const partner = houseN % 2 === 1 ? houseN + 1 : houseN - 1;
  const a = houses[houseN - 1], b = houses[partner - 1];
  if (!a || !b) return null;
  const fa = figureByPattern(a), fb = figureByPattern(b);
  if (eqFig(a, b)) return { kind: "simple", partner, note: "the same figure — full company" };
  if (fa && fb && fa.planet === fb.planet) return { kind: "demi-simple", partner, note: `both ruled by ${fa.planet} — company of the ruler` };
  if (eqFig(invertFigure(a), b)) return { kind: "compound", partner, note: "a figure and its inverse — company of opposites" };
  if (a[0] === b[0]) return { kind: "capitular", partner, note: "matching Fire lines — company of the head" };
  return null;
}

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
