import { describe, it, expect } from "vitest";
import { computeLots, wholeSignHouse, LOTS, chartFromPositions } from "./lots.js";

// A simple test chart. Asc 0° Aries; luminaries placed so Fortune/Spirit are
// clean round numbers.
const base = { asc: 0, sun: 120, moon: 90, mercury: 100, venus: 60, jupiter: 200, mars: 150, saturn: 250 };
const day = { ...base, isDayChart: true };
const night = { ...base, isDayChart: false };

describe("Fortune and Spirit — the two hinges", () => {
  it("Fortune by day is Asc + Moon − Sun; Spirit is the reverse", () => {
    const l = computeLots(day);
    expect(l.fortune).toBe(((0 + 90 - 120) % 360 + 360) % 360); // 330
    expect(l.spirit).toBe(((0 + 120 - 90) % 360 + 360) % 360);  // 30
  });
  it("by night the luminary formulas swap", () => {
    const l = computeLots(night);
    expect(l.fortune).toBe(30);
    expect(l.spirit).toBe(330);
  });
  it("Fortune + Spirit = 2·Asc (they mirror across the Ascendant) — day and night", () => {
    for (const c of [day, night]) {
      const l = computeLots(c);
      expect(((l.fortune + l.spirit) % 360 + 360) % 360).toBe(((2 * c.asc) % 360 + 360) % 360);
    }
  });
});

describe("all seven lots resolve to a longitude in [0,360)", () => {
  it("computes every lot for a valid chart", () => {
    const l = computeLots(day);
    for (const lot of LOTS) {
      expect(l[lot.id]).toBeGreaterThanOrEqual(0);
      expect(l[lot.id]).toBeLessThan(360);
    }
  });
  it("returns null for a chart without an Ascendant", () => {
    expect(computeLots({ ...base, asc: null })).toBeNull();
    expect(computeLots(null)).toBeNull();
  });
});

describe("the five derived lots swing from Fortune/Spirit (day chart)", () => {
  const l = computeLots(day);
  const N = x => ((x % 360) + 360) % 360;
  it("Eros = Asc + Venus − Spirit (Paulus)", () => expect(l.eros).toBe(N(0 + 60 - l.spirit)));
  it("Necessity = Asc + Fortune − Mercury (Paulus)", () => expect(l.necessity).toBe(N(0 + l.fortune - 100)));
  it("Courage = Asc + Fortune − Mars", () => expect(l.courage).toBe(N(0 + l.fortune - 150)));
  it("Victory = Asc + Jupiter − Spirit", () => expect(l.victory).toBe(N(0 + 200 - l.spirit)));
  it("Nemesis = Asc + Fortune − Saturn", () => expect(l.nemesis).toBe(N(0 + l.fortune - 250)));
});

describe("the five derived lots reverse by night", () => {
  it("Eros flips to Asc + Spirit − Venus by night", () => {
    const l = computeLots(night);
    const N = x => ((x % 360) + 360) % 360;
    expect(l.eros).toBe(N(0 + l.spirit - 60));
  });
});

describe("the Valens convention (Eros/Necessity as pure mirrors)", () => {
  const N = x => ((x % 360) + 360) % 360;
  it("Valens Eros = Asc + Spirit − Fortune, Necessity = Asc + Fortune − Spirit (day)", () => {
    const l = computeLots(day, { convention: "valens" });
    expect(l.eros).toBe(N(0 + l.spirit - l.fortune));
    expect(l.necessity).toBe(N(0 + l.fortune - l.spirit));
  });
  it("under Valens, Eros and Necessity are exact reverses of each other", () => {
    const l = computeLots(day, { convention: "valens" });
    // Eros and Necessity are equidistant from Asc in opposite directions.
    expect(N(l.eros + l.necessity)).toBe(N(2 * day.asc));
  });
  it("leaves the other five lots identical to Paulus", () => {
    const p = computeLots(day), v = computeLots(day, { convention: "valens" });
    for (const id of ["fortune", "spirit", "courage", "victory", "nemesis"]) {
      expect(v[id]).toBe(p[id]);
    }
  });
  it("differs from Paulus on Eros/Necessity for a generic chart", () => {
    const p = computeLots(day), v = computeLots(day, { convention: "valens" });
    expect(v.eros).not.toBe(p.eros);
    expect(v.necessity).not.toBe(p.necessity);
  });
});

describe("wholeSignHouse", () => {
  it("counts whole-sign houses from the Ascendant", () => {
    expect(wholeSignHouse(15, 15)).toBe(1);       // same sign as Asc → 1st
    expect(wholeSignHouse(45, 15)).toBe(2);        // next sign → 2nd
    expect(wholeSignHouse(345, 15)).toBe(12);      // sign before Asc → 12th
    expect(wholeSignHouse(200, 10)).toBe(7);       // opposite-ish
  });
  it("is null without inputs", () => {
    expect(wholeSignHouse(null, 10)).toBeNull();
    expect(wholeSignHouse(10, null)).toBeNull();
  });
});

describe("the seven lots are well-formed data", () => {
  it("has exactly the seven Hermetic lots, Fortune and Spirit first", () => {
    expect(LOTS).toHaveLength(7);
    expect(LOTS.map(l => l.id)).toEqual(["fortune", "spirit", "eros", "necessity", "courage", "victory", "nemesis"]);
  });
  it("every lot carries a significator, glyph, and a meaning", () => {
    for (const l of LOTS) {
      expect(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]).toContain(l.significator);
      expect(l.glyph).toBeTruthy();
      expect(l.meaning.length).toBeGreaterThan(30);
    }
  });
});

describe("chartFromPositions", () => {
  it("reads a flat natalPos", () => {
    const c = chartFromPositions({ asc: 10, isDayChart: true, sun: { lon: 100 }, moon: { lon: 200 } });
    expect(c.asc).toBe(10); expect(c.sun).toBe(100); expect(c.moon).toBe(200);
  });
  it("reads a nested eph snapshot", () => {
    const c = chartFromPositions({ asc: 5, isDayChart: false, pos: { sun: { lon: 42 }, venus: { lon: 7 } } });
    expect(c.asc).toBe(5); expect(c.sun).toBe(42); expect(c.venus).toBe(7); expect(c.isDayChart).toBe(false);
  });
});
