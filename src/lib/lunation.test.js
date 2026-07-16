import { describe, it, expect } from "vitest";
import { phaseFromElongation, illumination, ageFromElongation, nextElongation, lunationTimeline, PHASES, SYNODIC_MONTH } from "./lunation.js";

const norm = a => ((a % 360) + 360) % 360;
// A synthetic sky: elongation advances linearly at the mean synodic rate.
const RATE = 360 / SYNODIC_MONTH; // deg/day
const linearElong = (jd0 = 0) => jd => norm((jd - jd0) * RATE);

describe("phaseFromElongation", () => {
  it("maps the cardinal points to the right phases", () => {
    expect(phaseFromElongation(0).key).toBe("new");
    expect(phaseFromElongation(90).key).toBe("first-quarter");
    expect(phaseFromElongation(180).key).toBe("full");
    expect(phaseFromElongation(270).key).toBe("last-quarter");
    expect(phaseFromElongation(320).key).toBe("balsamic");
  });
  it("knows waxing from waning", () => {
    expect(phaseFromElongation(45).waxing).toBe(true);
    expect(phaseFromElongation(200).waxing).toBe(false);
  });
  it("wraps 360 back to New", () => {
    expect(phaseFromElongation(360).key).toBe("new");
  });
});

describe("illumination", () => {
  it("is 0 at New, 1 at Full, 0.5 at the quarters", () => {
    expect(illumination(0)).toBeCloseTo(0, 5);
    expect(illumination(180)).toBeCloseTo(1, 5);
    expect(illumination(90)).toBeCloseTo(0.5, 5);
    expect(illumination(270)).toBeCloseTo(0.5, 5);
  });
});

describe("ageFromElongation", () => {
  it("spans a synodic month across the cycle", () => {
    expect(ageFromElongation(0)).toBeCloseTo(0, 5);
    expect(ageFromElongation(180)).toBeCloseTo(SYNODIC_MONTH / 2, 3);
    expect(ageFromElongation(359.9)).toBeLessThan(SYNODIC_MONTH);
  });
});

describe("nextElongation (bisection)", () => {
  const el = linearElong(0);
  it("finds the next Full after a New", () => {
    // At jd=1, elongation ≈ 12.19°. Next 180° crossing ≈ 180/RATE days.
    const t = nextElongation(180, 1, el);
    expect(el(t)).toBeCloseTo(180, 1);
    expect(t).toBeGreaterThan(1);
  });
  it("rolls forward a full cycle when already at the target", () => {
    // At jd=0 elongation is exactly 0 (New). nextElongation(0) must be the
    // NEXT New, ~29.53 days later, not jd=0.
    const t = nextElongation(0, 0, el);
    expect(t).toBeCloseTo(SYNODIC_MONTH, 1);
  });
  it("always returns a future time", () => {
    for (const target of [0, 90, 180, 270, 315]) {
      const t = nextElongation(target, 3.3, el);
      expect(t).toBeGreaterThan(3.3);
    }
  });
});

describe("lunationTimeline", () => {
  const el = linearElong(0);
  it("orders the coming phase moments correctly from a waxing-crescent start", () => {
    // jd=3 → elongation ≈ 36.6° (waxing crescent).
    const tl = lunationTimeline(3, el);
    expect(tl.phase.waxing).toBe(true);
    // The immediate future order from here: First Q → Full → Last Q → Balsamic → New.
    expect(tl.nextFirstQuarter).toBeLessThan(tl.nextFull);
    expect(tl.nextFull).toBeLessThan(tl.nextLastQuarter);
    expect(tl.nextLastQuarter).toBeLessThan(tl.nextBalsamic);
    expect(tl.nextBalsamic).toBeLessThan(tl.nextNew);
  });
  it("reports elongation, illumination and age", () => {
    const tl = lunationTimeline(3, el);
    expect(tl.elongation).toBeCloseTo(el(3), 4);
    expect(tl.illum).toBeCloseTo(illumination(el(3)), 6);
    expect(tl.ageDays).toBeGreaterThan(0);
  });
});

describe("the eight phases", () => {
  it("are complete and keyed", () => {
    expect(PHASES).toHaveLength(8);
    for (const p of PHASES) { expect(p.name).toBeTruthy(); expect(p.keynote.length).toBeGreaterThan(20); }
  });
});
