// The geomantic shield mathematics — verified independently of the figures'
// names/attributions, which live in data/geomancy.js.
import { describe, it, expect } from "vitest";
import { addFigures, deriveDaughters, castShield, judgeIsValid, figureFromTallies, houseChart, randomMothers, identify, perfection, company, invertFigure } from "./geomancy.js";
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

describe("perfection — the four modes (Greer)", () => {
  const VIA = [1,1,1,1], POP = [2,2,2,2], LAE = [1,2,2,2], RUB = [2,1,2,2], ALB = [2,2,1,2];
  // Build a 12-house chart from a base fill with overrides {house: pattern}.
  const chart = over => Array.from({ length: 12 }, (_, i) => over[i + 1] || [
    [1,1,2,2],[2,2,1,1],[1,2,1,2],[2,1,2,1],[1,1,1,2],[2,1,1,1],
    [1,2,2,1],[2,1,1,2],[1,1,2,1],[1,2,1,1],[2,2,2,1],[2,2,1,2]][i]);

  it("occupation: the same figure in both houses", () => {
    const p = perfection(chart({ 1: VIA, 7: VIA }), 7);
    expect(p.perfects).toBe(true);
    expect(p.modes[0].mode).toBe("occupation");
  });
  it("conjunction: the querent's figure beside the quesited", () => {
    const p = perfection(chart({ 1: VIA, 7: POP, 6: VIA }), 7);
    expect(p.modes.some(m => m.mode === "conjunction")).toBe(true);
  });
  it("mutation: the significators side-by-side elsewhere", () => {
    const p = perfection(chart({ 1: VIA, 7: POP, 9: VIA, 10: POP }), 7);
    expect(p.modes.some(m => m.mode === "mutation")).toBe(true);
  });
  it("translation: the same third figure beside both", () => {
    const p = perfection(chart({ 1: VIA, 7: POP, 2: ALB, 6: ALB }), 7);
    expect(p.modes.some(m => m.mode === "translation")).toBe(true);
  });
  it("denial: no connection anywhere", () => {
    // The default fill has all-distinct figures with no adjacencies to 1/7.
    const p = perfection(chart({ 1: VIA, 7: POP }), 7);
    expect(p.perfects).toBe(false);
    expect(p.modes).toHaveLength(0);
  });
  it("a chart can perfect in more than one mode", () => {
    const p = perfection(chart({ 1: VIA, 7: VIA, 6: VIA }), 7);
    expect(p.modes.length).toBeGreaterThan(1);
  });
});

describe("company of houses", () => {
  const base = Array.from({ length: 12 }, () => [1,1,2,2]);
  it("simple: the same figure in the paired house", () => {
    const h = [...base]; h[0] = [1,1,1,1]; h[1] = [1,1,1,1];
    expect(company(h, 1)).toMatchObject({ kind: "simple", partner: 2 });
  });
  it("compound: a figure and its inverse", () => {
    const h = [...base]; h[0] = [1,2,2,2]; h[1] = invertFigure([1,2,2,2]); // Laetitia + Tristitia? inverse of 1222 = 2111
    expect(company(h, 1)?.kind).toBe("compound");
  });
  it("demi-simple: same ruling planet (Laetitia & Acquisitio — both Jupiter)", () => {
    const h = [...base]; h[2] = [1,2,2,2]; h[3] = [2,1,2,1];
    expect(company(h, 3)).toMatchObject({ kind: "demi-simple", partner: 4 });
  });
  it("capitular: matching Fire line only", () => {
    const h = [...base]; h[4] = [1,1,1,1]; h[5] = [1,2,1,2]; // both Fire=1; Via(moon) vs Amissio(venus): not demi
    expect(company(h, 5)?.kind).toBe("capitular");
    expect(company(h, 6)?.kind).toBe("capitular"); // symmetric from either side
  });
  it("null when nothing matches", () => {
    const h = [...base]; h[6] = [1,1,1,1]; h[7] = [2,1,2,2]; // Via(moon,Fire1) vs Rubeus(mars,Fire2)
    expect(company(h, 7)).toBeNull();
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
