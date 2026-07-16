// ═══════════════════════════════════════════════════════════════════════
// LUNATION — the monthly rhythm the practice actually lives by
// ═══════════════════════════════════════════════════════════════════════
// The Moon's elongation from the Sun (0° = New, 90° = First Quarter,
// 180° = Full, 270° = Last Quarter) drives the whole cycle. This module is
// pure: it takes an elongationAt(jd) function (the caller wires it to the
// ephemeris) and finds phase moments by bisection, the same primitive the
// mansion boundaries use. From that it frames the three ritual hinges — set
// intentions at the New, bring to fruition / review at the Full, release in
// the Balsamic dark before the next New.

const norm = a => ((a % 360) + 360) % 360;
export const SYNODIC_MONTH = 29.530588; // mean days, New to New

// The eight phases by 45° bins of elongation, with the practical keynote.
export const PHASES = [
  { name: "New Moon", key: "new", waxing: true, keynote: "Plant. Set intentions, begin, initiate — the seed in the dark." },
  { name: "Waxing Crescent", key: "waxing-crescent", waxing: true, keynote: "Nurture. Take the first concrete steps; feed the intention." },
  { name: "First Quarter", key: "first-quarter", waxing: true, keynote: "Act. The crisis of action — push through resistance, decide, commit." },
  { name: "Waxing Gibbous", key: "waxing-gibbous", waxing: true, keynote: "Refine. Adjust, edit, perfect as the light swells toward fullness." },
  { name: "Full Moon", key: "full", waxing: false, keynote: "Fruition. Culmination, illumination, review — the working comes to light." },
  { name: "Waning Gibbous", key: "waning-gibbous", waxing: false, keynote: "Share. Distribute, teach, give back what the cycle brought." },
  { name: "Last Quarter", key: "last-quarter", waxing: false, keynote: "Release. The crisis of consciousness — let go, forgive, clear the ground." },
  { name: "Balsamic", key: "balsamic", waxing: false, keynote: "Rest. Banish, surrender, dream — the dark before the seed. Do not begin." },
];

// Illumination fraction 0..1 from elongation.
export function illumination(elongationDeg) {
  return (1 - Math.cos((elongationDeg * Math.PI) / 180)) / 2;
}

// Phase from elongation (0..360). Balsamic is the last 45° before New.
export function phaseFromElongation(deg) {
  const e = norm(deg);
  const idx = Math.floor(e / 45) % 8;
  return { ...PHASES[idx], index: idx, elongation: e, illum: illumination(e), waxing: e < 180 };
}

// Approximate age of the current lunation in days (New = 0), from elongation.
export function ageFromElongation(deg) {
  return (norm(deg) / 360) * SYNODIC_MONTH;
}

// Next time the elongation reaches `target` (deg) after jd, by bisection on
// elongationAt(jd). Elongation advances ~11–14.6°/day; if we're essentially
// at the target already, roll forward a full cycle so "next" is future.
export function nextElongation(target, jd, elongationAt) {
  let gap0 = norm(target - elongationAt(jd));
  if (gap0 < 0.5) gap0 += 360;
  let lo = jd + gap0 / 14.6; // fastest elongation rate
  let hi = jd + gap0 / 11.0 + 0.1; // slowest
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    const g = norm(target - elongationAt(mid));
    if (g > 180) hi = mid; else lo = mid; // passed target when the gap wraps past 180
  }
  return (lo + hi) / 2;
}

// The current lunation, framed: phase now, age, illumination, and the JDs of
// the next New / First Quarter / Full / Last Quarter (each the next future
// crossing). elongationAt(jd) must return norm(moonLon - sunLon).
export function lunationTimeline(jd, elongationAt) {
  const e = norm(elongationAt(jd));
  return {
    elongation: e,
    phase: phaseFromElongation(e),
    ageDays: ageFromElongation(e),
    illum: illumination(e),
    nextNew: nextElongation(0, jd, elongationAt),
    nextFirstQuarter: nextElongation(90, jd, elongationAt),
    nextFull: nextElongation(180, jd, elongationAt),
    nextLastQuarter: nextElongation(270, jd, elongationAt),
    // Balsamic begins at 315° (last 45° before New).
    nextBalsamic: nextElongation(315, jd, elongationAt),
  };
}
