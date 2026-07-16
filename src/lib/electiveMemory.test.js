import { describe, it, expect } from "vitest";
import { electiveMemory, memoryVerdict, MIN_N } from "./electiveMemory.js";

// A minimal stats object shaped like castings.computeStats() output.
function stats({ judged = 20, overall = 60, byPlanet = [], byHourRuler = [], byMoonPhase = [], byMansion = [], byVoC = [], byElectionBand = [] } = {}) {
  return {
    judged, overall: { n: judged, pct: overall },
    byPlanet, byHourRuler, byMoonPhase, byMansion, byVoC, byElectionBand,
  };
}
const grp = (key, pct, n) => ({ key, pct, n });

describe("electiveMemory — gating", () => {
  it("stays silent until MIN_N judged castings exist", () => {
    const m = electiveMemory(stats({ judged: MIN_N - 1 }), { planet: "venus" });
    expect(m.available).toBe(false);
    expect(m.adjustment).toBe(0);
    expect(m.reason).toMatch(/need/);
  });
  it("is unavailable when no factor group has enough history", () => {
    const m = electiveMemory(stats({ byPlanet: [grp("venus", 90, 1)] }), { planet: "venus" });
    expect(m.available).toBe(false); // n=1 < MIN_N
  });
  it("handles null stats", () => {
    expect(electiveMemory(null, {}).available).toBe(false);
  });
});

describe("electiveMemory — the nudge", () => {
  it("is positive when your history beats your baseline", () => {
    const m = electiveMemory(
      stats({ overall: 50, byHourRuler: [grp("venus", 90, 8)] }),
      { hourPlanet: "venus" }
    );
    expect(m.available).toBe(true);
    expect(m.adjustment).toBeGreaterThan(0);
    expect(m.testimony[0]).toMatchObject({ factor: "Planetary hour", key: "venus", pct: 90, n: 8 });
  });
  it("is negative when your history trails your baseline", () => {
    const m = electiveMemory(
      stats({ overall: 70, byVoC: [grp("Void of Course", 20, 6)] }),
      { vocKey: "Void of Course" }
    );
    expect(m.adjustment).toBeLessThan(0);
  });
  it("is bounded to ±15 even for extreme deltas", () => {
    const hi = electiveMemory(stats({ overall: 0, byPlanet: [grp("sun", 100, 20)] }), { planet: "sun" });
    const lo = electiveMemory(stats({ overall: 100, byPlanet: [grp("sun", 0, 20)] }), { planet: "sun" });
    expect(hi.adjustment).toBeLessThanOrEqual(15);
    expect(lo.adjustment).toBeGreaterThanOrEqual(-15);
  });
  it("weights larger samples more than small ones", () => {
    // A big favourable group and a small unfavourable one → net positive.
    const m = electiveMemory(
      stats({ overall: 50, byPlanet: [grp("jupiter", 90, 16)], byMoonPhase: [grp("Waning Crescent", 30, 3)] }),
      { planet: "jupiter", moonPhase: "Waning Crescent" }
    );
    expect(m.adjustment).toBeGreaterThan(0);
    expect(m.testimony).toHaveLength(2);
  });
  it("ignores factors with no key supplied", () => {
    const m = electiveMemory(stats({ overall: 50, byPlanet: [grp("mars", 80, 5)] }), {});
    expect(m.available).toBe(false); // nothing to match
  });
});

describe("memoryVerdict", () => {
  it("summarizes an available result", () => {
    const m = electiveMemory(stats({ overall: 50, byHourRuler: [grp("venus", 85, 8)] }), { hourPlanet: "venus" });
    expect(memoryVerdict(m)).toMatch(/favours/);
    expect(memoryVerdict(m)).toMatch(/85%/);
  });
  it("passes through the reason when unavailable", () => {
    const m = electiveMemory(stats({ judged: 1 }), { planet: "venus" });
    expect(memoryVerdict(m)).toBe(m.reason);
  });
});
