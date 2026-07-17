// ═══════════════════════════════════════════════════════════════════════
// ZODIACAL RELEASING — the chapters of a life (Valens, Anthologies IV)
// ═══════════════════════════════════════════════════════════════════════
// Released from the Lot of Spirit (career, action, mind) or Fortune (body,
// health, circumstance). Verified against Valens (Riley trans.), Brennan,
// Delphic Oracle, and astro-seek (July 2026):
//   · Period years per sign = the ruler's minor years, with CAPRICORN = 27
//     (Valens' unexplained exception — hard-coded, never derived from Saturn).
//   · 1 releasing year = 360 days, 1 month = 30 days (Valens' own convention
//     and the modern standard — civil years drift ~5¼ days/year).
//   · Sub-periods start from the parent's own sign and run in zodiacal order,
//     truncated at the parent's end. Units: L2 = 30-day months, L3 = 2.5-day
//     periods, L4 = 5-hour periods (each level 1/12 of the one above).
//   · LOOSING OF THE BOND: when a sub-sequence completes the full circuit of
//     12 signs (211 units) and would repeat its starting sign, it leaps to
//     the OPPOSITE sign instead and continues zodiacally from there.
//   · PEAKS: periods whose sign is angular (1st/4th/7th/10th) from the natal
//     LOT OF FORTUNE — even when releasing from Spirit. The 10th from
//     Fortune is the culmination (career peak).

export const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
// Period lengths in "years" per sign (ruler's minor years; Capricorn = 27).
export const ZR_YEARS = [15, 8, 20, 25, 19, 20, 8, 15, 12, 27, 30, 12];
export const ZR_DAY_YEAR = 360;   // days per releasing year
const DAY_MS = 86400000;

// Angularity of a sign from the Lot of Fortune's sign: 1, 4, 7, 10 or null.
export function angularityFromFortune(signIndex, fortuneSignIndex) {
  if (fortuneSignIndex == null) return null;
  const d = ((signIndex - fortuneSignIndex) % 12 + 12) % 12;
  return d === 0 ? 1 : d === 3 ? 4 : d === 6 ? 7 : d === 9 ? 10 : null;
}

// Walk sub-periods of `unitDays` inside [start, end), beginning from
// startSign, applying the loosing of the bond. Generic across levels:
// L1 uses unitDays=360 with an open horizon; L2=30; L3=2.5; L4=5/24.
function walk(startSign, startMs, endMs, unitDays, fortuneSignIndex) {
  const out = [];
  let sign = startSign;
  let circuitStart = startSign; // the sign this circuit began from (for LB)
  let emitted = 0;              // sub-periods emitted since the circuit began
  let t = startMs;
  while (t < endMs) {
    const lenMs = ZR_YEARS[sign] * unitDays * DAY_MS;
    const end = Math.min(t + lenMs, endMs);
    out.push({
      sign, signName: SIGN_NAMES[sign],
      start: new Date(t), end: new Date(end),
      units: ZR_YEARS[sign],
      truncated: t + lenMs > endMs,
      lb: false,
      angle: angularityFromFortune(sign, fortuneSignIndex),
    });
    t += lenMs;
    emitted += 1;
    if (emitted === 12) {
      // Full circuit complete — the bond looses: leap to the opposite sign.
      const opposite = (circuitStart + 6) % 12;
      sign = opposite;
      circuitStart = opposite;
      emitted = 0;
    } else {
      sign = (sign + 1) % 12;
    }
  }
  // Mark the period that begins each post-LB circuit: its sign is not the
  // zodiacal successor of the previous period's sign.
  for (let i = 1; i < out.length; i++) {
    if (out[i].sign !== (out[i - 1].sign + 1) % 12) out[i].lb = true;
  }
  return out;
}

// The L1 timeline from birth, released from lotSignIndex, spanning ~`years`.
export function zrL1(lotSignIndex, birthDate, years = 108, fortuneSignIndex = null) {
  if (lotSignIndex == null || !birthDate) return [];
  const startMs = new Date(birthDate).getTime();
  const endMs = startMs + years * 365.25 * DAY_MS;
  return walk(lotSignIndex, startMs, endMs, ZR_DAY_YEAR, fortuneSignIndex);
}

// Subdivide a period one level down. levelUnitDays: L2=30, L3=2.5, L4=5/24.
export function zrSubdivide(period, unitDays, fortuneSignIndex = null) {
  if (!period) return [];
  return walk(period.sign, period.start.getTime(), period.end.getTime(), unitDays, fortuneSignIndex);
}

export const ZR_UNITS = { l2: 30, l3: 2.5, l4: 5 / 24 };

// The full current chain at `now`: L1 → L2 → L3.
export function zrCurrent(lotSignIndex, birthDate, now, fortuneSignIndex = null) {
  const l1 = zrL1(lotSignIndex, birthDate, 120, fortuneSignIndex);
  const t = new Date(now).getTime();
  const cur1 = l1.find(p => t >= p.start.getTime() && t < p.end.getTime()) || null;
  if (!cur1) return { l1: null, l2: null, l3: null, timeline: l1 };
  const l2 = zrSubdivide(cur1, ZR_UNITS.l2, fortuneSignIndex);
  const cur2 = l2.find(p => t >= p.start.getTime() && t < p.end.getTime()) || null;
  const l3 = cur2 ? zrSubdivide(cur2, ZR_UNITS.l3, fortuneSignIndex) : [];
  const cur3 = l3.find(p => t >= p.start.getTime() && t < p.end.getTime()) || null;
  return { l1: cur1, l2: cur2, l3: cur3, timeline: l1, l2list: l2 };
}
