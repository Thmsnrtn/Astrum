// ═══════════════════════════════════════════════════════════════════════
// ELECTIVE MEMORY — the Operator's Loop paying off
// ═══════════════════════════════════════════════════════════════════════
// Classical electional astrology scores a moment by the rules of the art.
// This adds a second voice: *your own record*. Given the practitioner's
// casting statistics (computeStats) and the factor-values of a candidate
// election, it reports how conditions like these have actually fared for this
// operator — a bounded nudge to the classical score, with the testimony that
// justifies it. Pure and testable; the app supplies the resolved factors.

// Groups smaller than this are ignored — too little history to trust.
export const MIN_N = 3;
// The nudge is capped at ±this many score-points, so memory informs the
// classical judgment without overruling it.
export const MAX_ADJUSTMENT = 15;

// stats: the object returned by castings.computeStats().
// factors: resolved key strings matching the stats' group keys —
//   { planet, hourPlanet, moonPhase, mansionKey, vocKey, bandKey }
// Returns { available, adjustment, base, testimony:[{factor,key,pct,n,delta}], reason? }.
export function electiveMemory(stats, factors) {
  if (!stats || stats.judged < MIN_N || stats.overall?.pct == null) {
    return { available: false, adjustment: 0, base: null, testimony: [],
      reason: `Only ${stats?.judged || 0} judged casting${stats?.judged === 1 ? "" : "s"} on record — need ${MIN_N}+ before your history can speak.` };
  }
  const base = stats.overall.pct;
  const lookups = [
    { factor: "Elected planet", group: stats.byPlanet, key: factors.planet, weight: 1.0 },
    { factor: "Planetary hour", group: stats.byHourRuler, key: factors.hourPlanet, weight: 1.0 },
    { factor: "Moon phase", group: stats.byMoonPhase, key: factors.moonPhase, weight: 0.8 },
    { factor: "Lunar mansion", group: stats.byMansion, key: factors.mansionKey, weight: 0.8 },
    { factor: "Void Moon", group: stats.byVoC, key: factors.vocKey, weight: 0.9 },
    { factor: "Election grade", group: stats.byElectionBand, key: factors.bandKey, weight: 0.7 },
  ];
  const testimony = [];
  let num = 0, den = 0;
  for (const l of lookups) {
    if (l.key == null) continue;
    const g = (l.group || []).find(x => x.key === l.key);
    if (!g || g.n < MIN_N || g.pct == null) continue;
    const delta = g.pct - base;                 // how this factor runs vs your baseline
    const conf = Math.min(1, g.n / 8) * l.weight; // trust grows with sample size, up to ~8
    testimony.push({ factor: l.factor, key: l.key, pct: g.pct, n: g.n, delta });
    num += delta * conf; den += conf;
  }
  if (!den) {
    return { available: false, adjustment: 0, base, testimony: [],
      reason: "No matching history for these conditions yet." };
  }
  const meanDelta = num / den;                   // weighted mean pct-point deviation
  const adjustment = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, Math.round(meanDelta * 0.5)));
  testimony.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { available: true, adjustment, base, testimony };
}

// A one-line human verdict for the memory result.
export function memoryVerdict(mem) {
  if (!mem?.available) return mem?.reason || "No record yet.";
  const sign = mem.adjustment > 0 ? "favours" : mem.adjustment < 0 ? "cautions against" : "is neutral on";
  const top = mem.testimony[0];
  const lead = top ? ` — ${top.factor.toLowerCase()} “${top.key}” runs ${top.pct}% over ${top.n}` : "";
  return `Your record ${sign} this moment${lead}.`;
}
