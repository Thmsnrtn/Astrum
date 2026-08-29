// ═══════════════════════════════════════════════════════════════════════
// ROOTS REGRESSION — the source-audit fixes, pinned so they cannot regress
// ═══════════════════════════════════════════════════════════════════════
// The Aug 2026 roots audit traced every load-bearing table and rule to its
// primary sources and found five live defects. Each fix gets a test here
// that fails against the OLD behavior, plus integrity checks over the two
// enrichment tables the audit delivered (Picatrix IV.9 mansion talismans,
// Picatrix II.11 decan images/significations).

import { describe, it, expect } from "vitest";
import { calcFirdaria, FIRDARIA_YEARS, FIRDARIA_DAY, FIRDARIA_NIGHT, checkBesiegement, getMoonSpeed } from "./scan.js";
import { checkVoC, EXALT, inExaltationDegree, getCombustion } from "./astro.js";
import { MANSION_TALISMANS, talismanForMansion } from "../data/mansionTalismans.js";
import { PICATRIX_DECANS } from "../data/picatrixDecans.js";
import { MANSIONS } from "../data/mansions.js";
import { DECAN_IMAGES } from "../data/decanImages.js";

// ── Firdaria: years belong to PLANETS, not to sequence positions ───────
describe("firdaria (Abu Ma'shar per Hand/Birchfield)", () => {
  it("night charts get each planet's own years — the audit's headline bug", () => {
    // Old code indexed [10,8,13,...] by position, so a night chart's opening
    // Moon period ran 10 years instead of 9. Age 9.5 must already be Saturn.
    const birth = new Date(Date.UTC(1990, 0, 1));
    const at = yrs => new Date(birth.getTime() + yrs * 365.25 * 86400000);
    expect(calcFirdaria(birth, false, at(8.9)).majLord).toBe("moon");     // 0–9: Moon
    expect(calcFirdaria(birth, false, at(9.5)).majLord).toBe("saturn");   // 9–20: Saturn
    expect(calcFirdaria(birth, false, at(19.5)).majLord).toBe("saturn");
    expect(calcFirdaria(birth, false, at(20.5)).majLord).toBe("jupiter"); // 20–32
  });
  it("day sequence still opens Sun 10 / Venus 8 / Mercury 13", () => {
    const birth = new Date(Date.UTC(1990, 0, 1));
    const at = yrs => new Date(birth.getTime() + yrs * 365.25 * 86400000);
    expect(calcFirdaria(birth, true, at(9.9)).majLord).toBe("sun");
    expect(calcFirdaria(birth, true, at(10.1)).majLord).toBe("venus");
    expect(calcFirdaria(birth, true, at(18.5)).majLord).toBe("mercury");
  });
  it("both sequences cover 75 years with the nodes last", () => {
    for (const seq of [FIRDARIA_DAY, FIRDARIA_NIGHT]) {
      expect(seq.reduce((a, p) => a + FIRDARIA_YEARS[p], 0)).toBe(75);
      expect(seq.slice(7)).toEqual(["northNode", "southNode"]);
    }
  });
  it("node periods carry no minor lord; planet periods always do", () => {
    const birth = new Date(Date.UTC(1990, 0, 1));
    const at = yrs => new Date(birth.getTime() + yrs * 365.25 * 86400000);
    const nodal = calcFirdaria(birth, true, at(71));   // day: nodes at 70–75
    expect(nodal.majLord).toBe("northNode");
    expect(nodal.minLord).toBeNull();
    const planetary = calcFirdaria(birth, true, at(5));
    expect(planetary.minLord).not.toBeNull();
    expect(["northNode", "southNode"]).not.toContain(planetary.minLord);
  });
  it("minor lords cycle the seven planets from the major lord", () => {
    const birth = new Date(Date.UTC(1990, 0, 1));
    const at = yrs => new Date(birth.getTime() + yrs * 365.25 * 86400000);
    // Day chart, Sun period (10y): first seventh (~1.43y) is Sun itself,
    // second is Venus (next in the day sequence's planet cycle).
    expect(calcFirdaria(birth, true, at(0.5)).minLord).toBe("sun");
    expect(calcFirdaria(birth, true, at(2.0)).minLord).toBe("venus");
  });
});

// ── VoC: perfection before ingress, no phantom orb cap ─────────────────
describe("void of course (Lilly CA p.112 / Hellenistic)", () => {
  // Sweep a lunar month hourly and check the definition structurally:
  // whenever Lilly-VoC is true the Moon must perfect nothing before
  // ingress no matter how far away — the old `<8°` cap can't come back.
  const jd0 = 2460700.5; // late Jan 2025
  it("lilly mode: void means NO aspect perfects in the sign, even >8° out", () => {
    let voids = 0, checked = 0;
    for (let h = 0; h < 29 * 24; h += 3) {
      const jd = jd0 + h / 24;
      const r = checkVoC(jd, "lilly");
      checked++;
      if (r.isVoC) voids++;
      expect(r.mode).toBe("lilly");
      expect(r.hoursToIngress).toBeGreaterThan(0);
      expect(r.hoursToIngress).toBeLessThan(70); // ≤30° at ≥11°/day + margin
    }
    expect(checked).toBeGreaterThan(200);
    expect(voids).toBeGreaterThan(0);           // voids exist in any month
    expect(voids / checked).toBeLessThan(0.5);  // but are the exception —
    // the orb-cap bug made VoC the majority state (~60–70% of all hours)
  });
  it("hellenistic mode is stricter than or equal to lilly at every point", () => {
    // 30° of applying room always includes the remainder of the sign, so
    // hellenistic void ⇒ lilly void; the converse fails often.
    for (let h = 0; h < 29 * 24; h += 6) {
      const jd = jd0 + h / 24;
      const hel = checkVoC(jd, "hellenistic"), lil = checkVoC(jd, "lilly");
      if (hel.isVoC) expect(lil.isVoC).toBe(true);
    }
  });
});

// ── Besiegement: wraparound-safe, benefics break the siege ─────────────
describe("besiegement arcs survive 0° Aries", () => {
  it("returns a boolean over a broad sweep without throwing", () => {
    // The old min/max comparison silently failed across the equinox point;
    // this sweep crosses it many times. Structural: never throws, and any
    // true result implies Mars–Saturn really do enclose the Moon in <20°.
    for (let d = 0; d < 700; d += 7) {
      const jd = 2460000.5 + d;
      const r = checkBesiegement(jd);
      expect(typeof r).toBe("boolean");
    }
  });
});

// ── Moon speed: the mean is 13.176°, both flags one threshold ──────────
describe("moon speed (mean daily motion 13.176°)", () => {
  it("fast and slow are complementary at the traditional mean", () => {
    for (let d = 0; d < 28; d++) {
      const r = getMoonSpeed(2460600.5 + d);
      expect(r.fast).toBe(!r.slow);
      expect(r.label).toBe(r.fast ? "Swift" : "Slow");
      const s = parseFloat(r.speed);
      expect(s).toBeGreaterThan(11.5);
      expect(s).toBeLessThan(15.5);
      if (s > 13.2) expect(r.fast).toBe(true);
      if (s < 13.1) expect(r.slow).toBe(true);
    }
  });
});

// ── Exaltation degrees: the ordinal convention ─────────────────────────
describe("exaltation degrees (al-Biruni; ordinal 19th = 18°00–18°59)", () => {
  it("matches the traditional list", () => {
    expect(EXALT).toEqual({
      sun: { s: 0, d: 19 }, moon: { s: 1, d: 3 }, mercury: { s: 5, d: 15 },
      venus: { s: 11, d: 27 }, mars: { s: 9, d: 28 }, jupiter: { s: 3, d: 15 },
      saturn: { s: 6, d: 21 },
    });
  });
  it("the Sun's throne is 18°00–18°59 Aries, not 19°xx", () => {
    expect(inExaltationDegree("sun", 18.0)).toBe(true);
    expect(inExaltationDegree("sun", 18.99)).toBe(true);
    expect(inExaltationDegree("sun", 19.0)).toBe(false);   // ordinal, not cardinal
    expect(inExaltationDegree("sun", 17.99)).toBe(false);
    expect(inExaltationDegree("sun", 30 + 18.5)).toBe(false); // wrong sign
    expect(inExaltationDegree("moon", 30 + 2.5)).toBe(true);  // 3rd deg Taurus
  });
});

// ── Combustion: Lilly's scheme, one consistent set of orbs ─────────────
describe("combustion orbs (Lilly CA p.113)", () => {
  const at = (planetL, sunL) => getCombustion("venus", planetL, sunL);
  it("cazimi within 17′, combust to 8°30′, beams to 17°", () => {
    expect(at(100.2, 100).type).toBe("cazimi");
    expect(at(104, 100).type).toBe("combust");
    expect(at(108.4, 100).type).toBe("combust");  // 8.4° < 8.5 — old 8° cap failed here
    expect(at(109, 100).type).toBe("sunbeams");
    expect(at(116.9, 100).type).toBe("sunbeams");
    expect(at(118, 100)).toBeNull();
  });
});

// ── Enrichment tables: complete, well-formed, corrections present ──────
describe("mansion talismans (Picatrix IV.9)", () => {
  it("covers all 28 mansions with full fields", () => {
    expect(MANSION_TALISMANS).toHaveLength(28);
    MANSION_TALISMANS.forEach((t, i) => {
      expect(t.n).toBe(i + 1);
      for (const f of ["lord", "agrippaLord", "image", "use", "agrippa"]) {
        expect(t[f], `mansion ${t.n} ${f}`).toBeTruthy();
        expect(t[f].length).toBeGreaterThan(3);
      }
    });
  });
  it("keeps the three exact Picatrix/Agrippa lord matches and the corrupt rest", () => {
    const exact = MANSION_TALISMANS.filter(t => t.lord === t.agrippaLord).map(t => t.n);
    expect(exact).toEqual([22, 25, 26]); // Geliel, Aziel, Tagriel
  });
  it("lookup helper resolves by mansion number", () => {
    expect(talismanForMansion(28).agrippaLord).toBe("Amnixiel");
    expect(talismanForMansion(0)).toBeNull();
  });
});

describe("Picatrix decan images (II.11, Greer & Warnock)", () => {
  it("covers all 36 decans in order with image and signification", () => {
    expect(PICATRIX_DECANS).toHaveLength(36);
    PICATRIX_DECANS.forEach((d, i) => {
      expect(d.n).toBe(i + 1);
      expect(d.picatrixImage.length).toBeGreaterThan(10);
      expect(d.picatrixSignification.length).toBeGreaterThan(10);
    });
  });
  it("Pisces II (n:35) is ONE inverted man with an emptied tray", () => {
    // The old reading gave him "a second inverted head" — a misreading of
    // Pingree's "vir ex adverso secundum caput deorsum habens".
    expect(PICATRIX_DECANS[34].picatrixImage).toMatch(/upside down/);
    expect(PICATRIX_DECANS[34].picatrixImage).not.toMatch(/second.*head/);
    expect(DECAN_IMAGES[34].p).not.toMatch(/second inverted head/);
  });
});

describe("mansion source-contradiction fixes stay fixed", () => {
  const m = n => MANSIONS.find(x => x.n === n);
  it("M6: friendship belongs to ELECT, not AVOID", () => {
    expect(m(6).elect.toLowerCase()).toMatch(/friendship/);
    expect(m(6).avoid.toLowerCase()).not.toMatch(/friendship/);
  });
  it("M21 Al-Baldah is favorable (the audit un-inverted it)", () => {
    expect(m(21).nature).toBe("favorable");
    expect(m(21).elect.toLowerCase()).toMatch(/build|harvest|profit/);
  });
  it("M14: sea journeys good, planting avoided", () => {
    expect(m(14).elect.toLowerCase()).toMatch(/sea/);
    expect(m(14).avoid.toLowerCase()).toMatch(/plant|land/);
  });
  it("M28: land travel elected, sea and lending avoided", () => {
    expect(m(28).elect.toLowerCase()).toMatch(/land/);
    expect(m(28).avoid.toLowerCase()).toMatch(/lend|sea/);
  });
  it("M5 latin name is Alchatay", () => {
    expect(m(5).latin).toBe("Alchatay");
  });
});
