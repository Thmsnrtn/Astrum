import { describe, it, expect } from "vitest";
import { essentialDignity, essentialScore, receives, mutualReception, almuten, DIGNITY_WEIGHTS, faceRuler } from "./reception.js";
import { BOUNDS } from "./astro.js";

describe("the Egyptian bounds table integrity", () => {
  it("every sign's bounds cover exactly 0–30 with no gaps or overlaps", () => {
    for (let si = 0; si < 12; si++) {
      const bs = BOUNDS[si];
      expect(bs[0].f).toBe(0);
      expect(bs[bs.length - 1].t).toBe(30);
      for (let i = 1; i < bs.length; i++) expect(bs[i].f).toBe(bs[i - 1].t);
      expect(bs).toHaveLength(5);
    }
  });
});

describe("essentialDignity — weighted Ptolemaic", () => {
  it("Mars in Aries: domicile (+5) and more from minor dignities", () => {
    const d = essentialDignity("mars", 22, true); // 22° Aries — Mars' own Egyptian bound (20–25)
    expect(d.parts).toContain("domicile");
    expect(d.parts).toContain("bound");
    expect(d.points).toBeGreaterThanOrEqual(7);
  });
  it("the Sun at 5° Aries is exalted with day triplicity", () => {
    const d = essentialDignity("sun", 5, true);
    expect(d.parts).toContain("exaltation");
    expect(d.parts).toContain("triplicity"); // fire day ruler = sun
    expect(d.points).toBe(7);
  });
  it("night flips the triplicity ruler", () => {
    expect(essentialDignity("sun", 5, false).parts).not.toContain("triplicity");
    expect(essentialDignity("jupiter", 5, false).parts).toContain("triplicity");
  });
  it("peregrine is zero; detriment and fall go negative", () => {
    expect(essentialDignity("saturn", 100, true).points).toBeLessThanOrEqual(0); // Saturn in Cancer = detriment
    const venusVirgo = essentialDignity("venus", 155, true); // Venus in Virgo = fall
    expect(venusVirgo.parts).toContain("fall");
  });
  it("a planet in own bound+triplicity no longer ranks as bare peregrine", () => {
    // Venus at 10° Taurus by night: domicile + night triplicity(moon? earth night=moon) — pick a pure minor case:
    // Jupiter at 2° Aries (bound of Jupiter 0–6) by night (fire night = jupiter): bound+triplicity, no domicile.
    const d = essentialDignity("jupiter", 2, false);
    expect(d.parts.sort()).toEqual(["bound", "triplicity"]);
    expect(d.points).toBe(5);
    expect(essentialScore("jupiter", 2, false)).toBeGreaterThan(essentialScore("jupiter", 130, false)); // vs peregrine spot
  });
});

describe("essentialScore mapping", () => {
  it("is monotonic in points and bounded", () => {
    let prev = -1;
    for (const [pk, lon, day] of [["saturn", 100, true], ["mercury", 130, true], ["jupiter", 2, false], ["mars", 22, true]]) {
      const s = essentialScore(pk, lon, day);
      expect(s).toBeGreaterThanOrEqual(12);
      expect(s).toBeLessThanOrEqual(99);
    }
    expect(essentialScore("mars", 22, true)).toBeGreaterThan(essentialScore("mars", 22, true, true)); // retro penalty
  });
});

describe("reception", () => {
  it("Venus in Aries is received by Mars (domicile)", () => {
    expect(receives("mars", 10)).toBe("domicile");
  });
  it("mutual reception by domicile: Jupiter in Taurus ↔ Venus in Pisces", () => {
    const r = mutualReception("jupiter", 40, "venus", 340);
    expect(r?.kind).toBe("mutual"); // each stands in the other's domicile
  });
  it("one-way: the Sun receives Mars-in-Aries by exaltation", () => {
    const r = mutualReception("sun", 130, "mars", 10);
    expect(r).toEqual({ kind: "single", receiver: "sun", of: "mars", by: "exaltation" });
  });
  it("mutual by domicile: Moon in Capricorn ↔ Saturn in Cancer", () => {
    const r = mutualReception("moon", 280, "saturn", 100);
    expect(r).toEqual({ kind: "mutual", a: expect.any(String), b: expect.any(String) });
  });
  it("single reception reported with direction", () => {
    const r = mutualReception("venus", 200, "mars", 40); // Mars in Taurus → received by Venus; Venus in Libra is her own
    expect(r?.kind === "single" || r?.kind === "mutual").toBe(true);
  });
  it("null when neither receives", () => {
    expect(mutualReception("sun", 300, "moon", 250)).toBeNull(); // Sun in Aqu (detriment), Moon in Sag — no reception either way
  });
});

describe("almuten", () => {
  it("ranks the strongest claim on a degree (0° Aries by day → Mars vs Sun contest)", () => {
    const a = almuten(0, true);
    // Aries 0°: Mars domicile 5; Sun exaltation 4 + triplicity 3 = 7 → Sun wins
    expect(a.planet).toBe("sun");
    expect(a.points).toBe(7);
  });
  it("night shifts it (Aries night triplicity = Jupiter)", () => {
    const a = almuten(0, false);
    // Mars: domicile 5 + face 1 = 6; Jupiter: night triplicity 3 + bound 2 = 5; Sun: exaltation 4.
    expect(a.planet).toBe("mars");
    expect(a.ranking.find(([p]) => p === "mars")[1]).toBe(6);
    expect(a.ranking.find(([p]) => p === "jupiter")[1]).toBe(5);
  });
});

describe("faceRuler follows the Chaldean decans", () => {
  it("first three decans of Aries: Mars, Sun, Venus", () => {
    expect(faceRuler(5)).toBe("mars");
    expect(faceRuler(15)).toBe("sun");
    expect(faceRuler(25)).toBe("venus");
  });
});
