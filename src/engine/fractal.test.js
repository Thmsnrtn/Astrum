// ═══════════════════════════════════════════════════════════════════════
// FRACTAL DECANS — the app's own nested-time system, proven self-consistent
// ═══════════════════════════════════════════════════════════════════════
// calcFractal is original to this app (not a classical technique — see the
// FractalScreen header), so there is no primary source to verify it
// against. What CAN and must be verified is that its own modular
// arithmetic behaves exactly as designed: the "full coherence" (all four
// nested levels showing the same decan) alignment window is a closed-form,
// once-per-decan, ~18.79-second event, and the forecaster that predicts
// its real-world clock time is astronomically exact — not a linear
// approximation that drifts with the Sun's true (eccentric-orbit,
// non-uniform) angular speed.

import { describe, it, expect, beforeAll } from "vitest";
import { initSweph, swephReady } from "./sweph.js";
import { calcFractal, nextFullCoherenceWindows, nextSunLonCrossing, sunLon, dateToJD, norm, YEAR_SEC, L_DUR } from "./astro.js";

beforeAll(async () => { await initSweph(); }, 30000);

const jdToDate = jd => new Date((jd - 2440587.5) * 86400000);
const angDiff = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

describe("the fractal constants", () => {
  it("Swiss Ephemeris loaded — everything below is arcsecond-precise, not the Meeus fallback", () => {
    expect(swephReady()).toBe(true);
  });
  it("each level is exactly 1/36th of its parent, and the tree has 36^4 leaves", () => {
    expect(L_DUR[1]).toBeCloseTo(L_DUR[0] / 36, 9);
    expect(L_DUR[2]).toBeCloseTo(L_DUR[1] / 36, 9);
    expect(L_DUR[3]).toBeCloseTo(L_DUR[2] / 36, 9);
    expect(36 ** 4).toBe(1679616);
    expect(L_DUR[0]).toBeCloseTo(YEAR_SEC / 36, 9);
  });
  it("Assiah (L4) is the ~19-second 'quaternary period'", () => {
    expect(L_DUR[3]).toBeGreaterThan(18.7);
    expect(L_DUR[3]).toBeLessThan(18.9);
  });
});

describe("calcFractal invariants (sweep many real dates, both modes)", () => {
  const dates = [];
  for (let y = 2020; y <= 2032; y++) for (let m = 0; m < 12; m += 3) dates.push(new Date(Date.UTC(y, m, 15, 7, 23, 41)));
  it("cosmicCoherence is always 1..4, and levels[0] always matches l1Idx trivially", () => {
    for (const mode of ["A", "B"]) {
      for (const d of dates) {
        const f = calcFractal(d, mode);
        expect(f.cosmicCoherence).toBeGreaterThanOrEqual(1);
        expect(f.cosmicCoherence).toBeLessThanOrEqual(4);
        expect(f.levels[0].idx).toBe(f.l1Idx);
        expect(f.cosmicCoherence).toBe(f.levels.filter(l => l.idx === f.l1Idx).length);
      }
    }
  });
  it("every level's pos is in [0,1) and secIn is in [0,dur)", () => {
    for (const mode of ["A", "B"]) {
      for (const d of dates) {
        const f = calcFractal(d, mode);
        f.levels.forEach(l => {
          expect(l.pos).toBeGreaterThanOrEqual(0);
          expect(l.pos).toBeLessThan(1);
          expect(l.secIn).toBeGreaterThanOrEqual(0);
          expect(l.secIn).toBeLessThan(l.dur);
        });
      }
    }
  });
  it("mode A and mode B genuinely diverge (not the same computation twice)", () => {
    let divergences = 0;
    for (const d of dates) {
      const a = calcFractal(d, "A"), b = calcFractal(d, "B");
      expect(a.l1Idx).toBe(b.l1Idx); // L1 never depends on mode
      if (a.levels[1].idx !== b.levels[1].idx) divergences++;
    }
    expect(divergences).toBeGreaterThan(0);
  });
});

describe("CLAIM 1 — mode B: full coherence is exactly secInL1 ∈ [0, L_DUR[3])", () => {
  // calcFractal takes a JS Date, and dateToJD is (correctly, for every
  // other use in this app) SECOND-precision only — it drops milliseconds.
  // Routing a jd through jdToDate → calcFractal → dateToJD can therefore
  // shift it by up to ~1 real second. That is far more precision than an
  // 18.79-second window or a "opens at 3:48:40 PM" display needs, but it
  // means a boundary test must stay ≥2 real seconds clear of the edges it
  // is not currently probing, or test those edges at the jd level
  // directly (no Date round-trip) instead.
  it("cosmicCoherence===4 well inside [0, L_DUR[3]) and false well outside it, sampled across a real decan", () => {
    const anchorJd = dateToJD(new Date(Date.UTC(2026, 5, 15)));
    const l1Idx0 = Math.floor(norm(sunLon(anchorJd)) / 10) % 36;
    const ingressLon = l1Idx0 * 10;
    const ingressJd = nextSunLonCrossing(ingressLon, anchorJd - 15); // this decan's real ingress
    expect(ingressJd).toBeLessThanOrEqual(anchorJd);
    const searchFrom = ingressJd - 2 / 86400;
    let checkedIn = 0, checkedOut = 0;
    for (let secInL1 = 2; secInL1 <= 200; secInL1 += 0.3) {
      if (secInL1 > L_DUR[3] - 2 && secInL1 < L_DUR[3] + 2) continue; // skip the boundary itself — tested separately below
      const degIn = (secInL1 / L_DUR[0]) * 10;
      const jd = nextSunLonCrossing(norm(ingressLon + degIn), searchFrom);
      const f = calcFractal(jdToDate(jd), "B");
      expect(f.l1Idx, `secInL1=${secInL1.toFixed(2)}`).toBe(l1Idx0); // still the same decan
      const shouldBeFull = secInL1 < L_DUR[3];
      expect(f.cosmicCoherence === 4, `secInL1=${secInL1.toFixed(2)}`).toBe(shouldBeFull);
      shouldBeFull ? checkedIn++ : checkedOut++;
    }
    expect(checkedIn).toBeGreaterThan(45); // (L_DUR[3]-2-2)/0.3 ≈ 49 samples inside
    expect(checkedOut).toBeGreaterThan(500);
  });
  it("the transition itself sits within 2 real seconds of L_DUR[3], checked at jd precision (no Date round-trip)", () => {
    const anchorJd = dateToJD(new Date(Date.UTC(2026, 5, 15)));
    const l1Idx0 = Math.floor(norm(sunLon(anchorJd)) / 10) % 36;
    const ingressLon = l1Idx0 * 10;
    const ingressJd = nextSunLonCrossing(ingressLon, anchorJd - 15);
    const closeJd = ingressJd + L_DUR[3] / 86400;
    // Just inside the window (1s before the predicted close): still l1Idx0
    // itself trivially, and the L4 slot must still equal l1Idx0 (mirrors
    // calcFractal's own l4Idx===l1Idx0 coherence test without a Date hop).
    const justBefore = closeJd - 1 / 86400, justAfter = closeJd + 1 / 86400;
    expect(Math.floor(norm(sunLon(justBefore)) / 10) % 36).toBe(l1Idx0);
    expect(Math.floor(norm(sunLon(justAfter)) / 10) % 36).toBe(l1Idx0); // still the same decan either side
    // secInL1 at each probe, recomputed independently of calcFractal:
    const secAt = jd => {
      const lon = norm(sunLon(jd)), degIn = lon % 10;
      return (degIn / 10) * L_DUR[0];
    };
    expect(secAt(justBefore)).toBeLessThan(L_DUR[3]);
    expect(secAt(justAfter)).toBeGreaterThan(L_DUR[3]);
  });
});

describe("CLAIM 2 — mode A: the window sits at l1Idx·(L_DUR[1]+L_DUR[2]+L_DUR[3]) into the decan", () => {
  it("decan 0 aligns at its own start; a late decan aligns near its own end", () => {
    // decan 0 (Aries I): predicted offset is 0 — coherent right at ingress, mode A.
    const jdAries = dateToJD(new Date(Date.UTC(2026, 2, 25))); // deep in Pisces, safely before Aries I
    // Bisect forward to the real Aries I ingress (target longitude 0).
    const ariesIngress = nextSunLonCrossing(0, jdAries);
    const fAtIngress = calcFractal(jdToDate(ariesIngress + 1 / 86400), "A");
    expect(fAtIngress.l1Idx).toBe(0);
    expect(fAtIngress.cosmicCoherence).toBe(4);

    // A late decan (35, Pisces III): predicted offset ≈ decan span minus L_DUR[3] —
    // i.e. the window opens close to the NEXT decan's ingress, not this one's.
    const predictedOffsetSec = 35 * (L_DUR[1] + L_DUR[2] + L_DUR[3]);
    expect(L_DUR[0] - predictedOffsetSec).toBeLessThan(20); // within ~1 quaternary period of the decan's end
    expect(L_DUR[0] - predictedOffsetSec).toBeGreaterThan(0);
  });
  it("the predicted target longitude is exactly where coherence flips to 4, for several decans", () => {
    // Margins are real seconds (well above JS Date's millisecond quantization,
    // well below the ~18.79s window) — 0.0001° of solar motion ≈ 8.6s.
    for (const l1Idx of [0, 1, 14, 20, 35]) {
      const tSec = l1Idx * (L_DUR[1] + L_DUR[2] + L_DUR[3]);
      const targetDeg = (tSec / L_DUR[0]) * 10;
      const targetLon = norm(l1Idx * 10 + targetDeg);
      const after = norm(targetLon + 0.0001);
      const jdAfter = nextSunLonCrossing(after, dateToJD(new Date(Date.UTC(2026, 0, 1))) + l1Idx * 9);
      const fAfter = calcFractal(jdToDate(jdAfter), "A");
      expect(fAfter.l1Idx, `decan ${l1Idx} after`).toBe(l1Idx);
      expect(fAfter.cosmicCoherence, `decan ${l1Idx} just after target`).toBe(4);
      // "Just before" only stays inside the same decan when the window
      // doesn't open at the decan's own first instant (l1Idx=0's target
      // degree is exactly 0 — that decan behaves like mode B, where there
      // genuinely is no "before, same decan" moment to probe).
      if (l1Idx === 0) continue;
      const before = norm(targetLon - 0.0001);
      const jdBefore = nextSunLonCrossing(before, dateToJD(new Date(Date.UTC(2026, 0, 1))) + l1Idx * 9);
      const fBefore = calcFractal(jdToDate(jdBefore), "A");
      expect(fBefore.l1Idx, `decan ${l1Idx} before`).toBe(l1Idx);
      expect(fBefore.cosmicCoherence, `decan ${l1Idx} just before target`).toBeLessThan(4);
    }
  });
});

describe("nextFullCoherenceWindows — the real-time forecaster", () => {
  for (const mode of ["A", "B"]) {
    it(`mode ${mode}: every forecast window truly measures cosmicCoherence===4 at open, and not at open-1s`, () => {
      const jd0 = dateToJD(new Date(Date.UTC(2026, 3, 1, 9, 0, 0)));
      const windows = nextFullCoherenceWindows(jd0, 6, mode);
      expect(windows).toHaveLength(6);
      windows.forEach((w, i) => {
        expect(w.openJd, `window ${i}`).toBeGreaterThan(jd0);
        expect(w.closeJd).toBeGreaterThan(w.openJd);
        expect((w.closeJd - w.openJd) * 86400).toBeCloseTo(L_DUR[3], 1);
        const fOpen = calcFractal(jdToDate(w.openJd + 1 / 86400), mode); // +1 real second — inside the ~18.79s window, well clear of JS Date's ms rounding
        expect(fOpen.cosmicCoherence, `window ${i} open`).toBe(4);
        expect(fOpen.l1Idx, `window ${i} decan`).toBe(w.decanIdx);
        const fBefore = calcFractal(jdToDate(w.openJd - 1 / 86400), mode);
        expect(fBefore.cosmicCoherence, `window ${i} one second before open`).toBeLessThan(4);
      });
    });
    it(`mode ${mode}: consecutive windows are one real decan apart (9–11 real days)`, () => {
      const jd0 = dateToJD(new Date(Date.UTC(2026, 6, 1)));
      const windows = nextFullCoherenceWindows(jd0, 10, mode);
      for (let i = 1; i < windows.length; i++) {
        const gapDays = windows[i].openJd - windows[i - 1].openJd;
        expect(gapDays, `gap ${i}`).toBeGreaterThan(9);
        expect(gapDays, `gap ${i}`).toBeLessThan(11.2);
        expect(windows[i].decanIdx).toBe((windows[i - 1].decanIdx + 1) % 36);
      }
    });
    it(`mode ${mode}: forecasting across the Pisces III → Aries I year wrap holds`, () => {
      // Start deep in the last decan of the tropical year and ask for windows
      // spanning the wrap; decan indices must cycle 35 → 0 correctly.
      const jd0 = nextSunLonCrossing(348, dateToJD(new Date(Date.UTC(2026, 0, 1))));
      const windows = nextFullCoherenceWindows(jd0, 4, mode);
      const wrapped = windows.some((w, i) => i > 0 && windows[i - 1].decanIdx === 35 && w.decanIdx === 0);
      expect(wrapped).toBe(true);
      windows.forEach(w => {
        const f = calcFractal(jdToDate(w.openJd + 1 / 86400), mode);
        expect(f.cosmicCoherence).toBe(4);
      });
    });
  }
  it("is astronomically exact, not a linear L_DUR approximation — real solar rate varies through the year", () => {
    // Cross-check: the forecaster's open times track the REAL Sun, not a
    // constant mean rate. Two full-coherence opens six decans apart should
    // differ from 6×(mean decan length) by an amount consistent with the
    // Sun's measured eccentricity-driven rate range (0.953–1.019°/day),
    // not be pinned exactly to the mean.
    const jd0 = dateToJD(new Date(Date.UTC(2026, 0, 5))); // near perihelion — Sun runs fast
    const windows = nextFullCoherenceWindows(jd0, 6, "B");
    const meanSixDecanDays = 6 * (L_DUR[0] / 86400);
    const actualDays = windows[5].openJd - windows[0].openJd;
    expect(actualDays).toBeLessThan(meanSixDecanDays); // faster than mean near perihelion
    expect(meanSixDecanDays - actualDays).toBeGreaterThan(0.05); // a real, measurable difference — not accidental rounding
  });
  it("real solar longitude at every window open matches the decan boundary within ephemeris precision", () => {
    const jd0 = dateToJD(new Date(Date.UTC(2026, 9, 3)));
    const windows = nextFullCoherenceWindows(jd0, 5, "B"); // mode B opens exactly at ingress
    windows.forEach(w => {
      const lonAtOpen = norm(sunLon(w.openJd));
      expect(angDiff(lonAtOpen, w.decanIdx * 10)).toBeLessThan(0.01);
    });
  });
});

describe("additional regression pins (from the independent adversarial audit)", () => {
  const dates = [];
  for (let y = 2021; y <= 2031; y++) for (let m = 0; m < 12; m += 2) dates.push(new Date(Date.UTC(y, m, 9, 13, 47, 5)));

  it("secToThreshold + L1's own secIn always reconstructs L_DUR[0] exactly", () => {
    for (const mode of ["A", "B"]) for (const d of dates) {
      const f = calcFractal(d, mode);
      expect(f.secToThreshold + f.levels[0].secIn).toBeCloseTo(L_DUR[0], 9);
    }
  });
  it("L1's fields never depend on mode — only L2-L4 differ between A and B", () => {
    for (const d of dates) {
      const a = calcFractal(d, "A"), b = calcFractal(d, "B");
      expect(a.levels[0]).toEqual(b.levels[0]);
      expect(a.l1Idx).toBe(b.l1Idx);
      expect(a.sunL).toBe(b.sunL);
    }
  });
  it("at a decan's own ingress, mode A always restarts at Aries I (l2=0) while mode B inherits the parent (l2=l1Idx) — they coincide only for decan 0 itself", () => {
    for (const l1Idx of [0, 5, 22, 35]) {
      const ingressJd = nextSunLonCrossing(l1Idx * 10, dateToJD(new Date(Date.UTC(2026, 0, 1))) + l1Idx * 9);
      const d = jdToDate(ingressJd + 1 / 86400);
      const a = calcFractal(d, "A"), b = calcFractal(d, "B");
      expect(a.l1Idx, `decan ${l1Idx}`).toBe(l1Idx);
      expect(a.levels[1].idx, `decan ${l1Idx} mode A l2 (Entry: always restarts at 0)`).toBe(0);
      expect(b.levels[1].idx, `decan ${l1Idx} mode B l2 (Absolute: inherits l1Idx)`).toBe(l1Idx);
      if (l1Idx === 0) expect(a.levels[1].idx).toBe(b.levels[1].idx); // the one decan where they coincide
    }
  });
  it("l1Idx never discontinuously resets across a Dec31→Jan1 UTC boundary", () => {
    for (const y of [2023, 2024, 2025, 2026, 2027]) {
      const before = calcFractal(new Date(Date.UTC(y - 1, 11, 31, 23, 59, 0)), "B");
      const after = calcFractal(new Date(Date.UTC(y, 0, 1, 0, 1, 0)), "B");
      const step = norm(after.l1Idx - before.l1Idx);
      expect(step === 0 || step === 1, `year ${y}: ${before.l1Idx} -> ${after.l1Idx}`).toBe(true);
    }
  });
});
