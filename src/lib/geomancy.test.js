// The geomantic shield mathematics — verified independently of the figures'
// names/attributions, which live in data/geomancy.js.
import { describe, it, expect } from "vitest";
import { addFigures, deriveDaughters, castShield, judgeIsValid, figureFromTallies, houseChart, randomMothers, identify } from "./geomancy.js";
import { FIGURES, EVEN_JUDGES, figureByPattern } from "../data/geomancy.js";

describe("addFigures", () => {
  it("like parities give a double, unlike give a single", () => {
    // single(1)+single(1) → double(2); double+double → double; single+double → single
    expect(addFigures([1, 1, 2, 2], [1, 2, 2, 1])).toEqual([2, 1, 2, 1]);
  });
});

describe("deriveDaughters", () => {
  it("transposes the mothers (daughter j = j-th row down the mothers)", () => {
    const mothers = [
      [1, 2, 1, 2],
      [1, 1, 2, 2],
      [2, 2, 2, 1],
      [1, 2, 1, 1],
    ];
    const d = deriveDaughters(mothers);
    // Daughter 1's rows = the first row of each mother
    expect(d[0]).toEqual([1, 1, 2, 1]);
    // Daughter 3's rows = the third row of each mother
    expect(d[2]).toEqual([1, 2, 2, 1]);
  });
});

describe("castShield", () => {
  const mothers = [[1, 1, 1, 1], [2, 2, 2, 2], [1, 2, 1, 2], [2, 1, 2, 1]];
  const s = castShield(mothers);

  it("produces the full shield structure", () => {
    expect(s.daughters).toHaveLength(4);
    expect(s.nieces).toHaveLength(4);
    expect(s.rightWitness).toHaveLength(4);
    expect(s.leftWitness).toHaveLength(4);
    expect(s.judge).toHaveLength(4);
    expect(s.reconciler).toHaveLength(4);
  });

  it("derives witnesses and judge by the addition chain", () => {
    expect(s.rightWitness).toEqual(addFigures(s.nieces[0], s.nieces[1]));
    expect(s.leftWitness).toEqual(addFigures(s.nieces[2], s.nieces[3]));
    expect(s.judge).toEqual(addFigures(s.rightWitness, s.leftWitness));
  });

  it("the Judge is always a valid (even) figure — the classical self-check", () => {
    // property holds for any cast: run several random shields
    for (let i = 0; i < 200; i++) {
      const j = castShield(randomMothers()).judge;
      expect(judgeIsValid(j)).toBe(true);
    }
  });

  it("the reconciler links the Judge to the First Mother", () => {
    expect(s.reconciler).toEqual(addFigures(s.judge, mothers[0]));
  });
});

describe("houseChart", () => {
  it("lays twelve figures into houses 1..12 (mothers, daughters, nieces)", () => {
    const s = castShield([[1, 1, 1, 1], [2, 2, 2, 2], [1, 2, 1, 2], [2, 1, 2, 1]]);
    const hc = houseChart(s);
    expect(hc).toHaveLength(12);
    expect(hc[0]).toEqual({ house: 1, figure: s.mothers[0] });
    expect(hc[4].figure).toEqual(s.daughters[0]);   // house 5
    expect(hc[8].figure).toEqual(s.nieces[0]);       // house 9
  });
});

describe("figureFromTallies", () => {
  it("reduces mark counts to parity rows", () => {
    expect(figureFromTallies([7, 4, 3, 10])).toEqual([1, 2, 1, 2]);
  });
});

describe("the sixteen figures (verified data)", () => {
  it("has 16 unique figures with the canonical point-count distribution", () => {
    expect(FIGURES).toHaveLength(16);
    const patterns = new Set(FIGURES.map(f => f.pattern.join("")));
    expect(patterns.size).toBe(16); // all distinct
    const dist = {};
    FIGURES.forEach(f => { const s = f.pattern.reduce((a, r) => a + r, 0); dist[s] = (dist[s] || 0) + 1; });
    expect(dist).toEqual({ 4: 1, 5: 4, 6: 6, 7: 4, 8: 1 }); // Hessle's distribution
  });
  it("names exactly the eight even figures as possible Judges", () => {
    expect(EVEN_JUDGES.sort()).toEqual(
      ["Acquisitio", "Amissio", "Carcer", "Conjunctio", "Fortuna Major", "Fortuna Minor", "Populus", "Via"].sort()
    );
  });
  it("every figure carries pattern, planet, zodiac, element, tone, and meaning", () => {
    FIGURES.forEach(f => {
      expect(f.pattern).toHaveLength(4);
      expect(f.planet).toBeTruthy();
      expect(f.zodiac).toBeTruthy();
      expect(["good", "bad", "mixed"]).toContain(f.tone);
      expect(f.meaning.length).toBeGreaterThan(20);
    });
  });
  it("the pure-element anchors are correct (Greer's check)", () => {
    expect(figureByPattern([1, 2, 2, 2]).name).toBe("Laetitia");   // single Fire only
    expect(figureByPattern([2, 1, 2, 2]).name).toBe("Rubeus");     // single Air only
    expect(figureByPattern([2, 2, 1, 2]).name).toBe("Albus");      // single Water only
    expect(figureByPattern([2, 2, 2, 1]).name).toBe("Tristitia");  // single Earth only
  });
  it("identify() resolves a cast Judge to a real, even figure", () => {
    for (let i = 0; i < 50; i++) {
      const rec = identify(castShield(randomMothers()).judge);
      expect(rec).toBeTruthy();
      expect(EVEN_JUDGES).toContain(rec.name);
    }
  });
});
