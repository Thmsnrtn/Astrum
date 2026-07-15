// Reference tests for the Swiss Ephemeris adapter.
// Sun/Moon values cross-checked against Meeus worked examples (25.a, 47.a,
// which quote Dynamical Time — the small offsets below are exactly ΔT), and
// star positions against standard J2000 catalog places.
import { describe, it, expect, beforeAll } from "vitest";
import { initSweph, swephReady, swPlanetLon, swDailyMotion, swHouses, swFixstar, swTrueNode, swChiron } from "./sweph.js";
import { getMansion, MANSION_WIDTH, MANSIONS } from "../data/mansions.js";
import { transitsToNatal } from "./snapshot.js";

const JD_J2000 = 2451545.0;

beforeAll(async () => {
  await initSweph();
}, 30000);

describe("swiss ephemeris adapter", () => {
  it("initializes", () => {
    expect(swephReady()).toBe(true);
  });

  it("Sun matches Meeus example 25.a (1992-10-13, ΔT-adjusted)", () => {
    // Meeus gives apparent λ☉ = 199.90588° at 0h TD; at 0h UT the Sun is
    // ~58.6s of time further along ≈ +0.00068°.
    const jd = 2448908.5;
    expect(Math.abs(swPlanetLon("sun", jd) - 199.90656)).toBeLessThan(0.001);
  });

  it("Moon matches Meeus example 47.a (1992-04-12) within full-theory tolerance", () => {
    // Meeus' truncated ELP gives λ☽ = 133.162655° at 0h TD; Swiss uses the
    // full theory + ΔT, expect agreement within a couple arc-minutes.
    const jd = 2448724.5;
    expect(Math.abs(swPlanetLon("moon", jd) - 133.1627)).toBeLessThan(0.04);
  });

  it("Sun at J2000.0 epoch", () => {
    expect(Math.abs(swPlanetLon("sun", JD_J2000) - 280.37)).toBeLessThan(0.05);
  });

  it("Regulus at J2000 is 29°50′ Leo (149.83°)", () => {
    const r = swFixstar("Regulus", JD_J2000);
    expect(r).toBeTruthy();
    expect(Math.abs(r.lon - 149.829)).toBeLessThan(0.01);
  });

  it("Spica at J2000 is 23°50′ Libra (203.84°)", () => {
    const s = swFixstar("Spica", JD_J2000);
    expect(Math.abs(s.lon - 203.836)).toBeLessThan(0.01);
  });

  it("fixed stars precess ~50.3″/yr", () => {
    const r2000 = swFixstar("Regulus", JD_J2000).lon;
    const r2072 = swFixstar("Regulus", JD_J2000 + 72 * 365.25).lon;
    // one degree per ~71.6 years
    expect(r2072 - r2000).toBeGreaterThan(0.9);
    expect(r2072 - r2000).toBeLessThan(1.1);
  });

  it("Moon daily motion is 11.8–15.4°/day", () => {
    const dm = swDailyMotion("moon", JD_J2000);
    expect(dm).toBeGreaterThan(11.8);
    expect(dm).toBeLessThan(15.4);
  });

  it("outer planets resolve (Uranus/Neptune/Pluto)", () => {
    ["uranus", "neptune", "pluto"].forEach(p => {
      const lon = swPlanetLon(p, JD_J2000);
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    });
  });

  it("Chiron and true node resolve at J2000", () => {
    expect(Math.abs(swChiron(JD_J2000) - 251.62)).toBeLessThan(0.05);
    expect(Math.abs(swTrueNode(JD_J2000) - 123.95)).toBeLessThan(0.05);
  });

  it("houses return ASC/MC and 12 cusps (Placidus and Regiomontanus)", () => {
    for (const sys of ["P", "R"]) {
      const h = swHouses(JD_J2000, 51.5, -0.12, sys);
      expect(h.cusps).toHaveLength(12);
      expect(Math.abs(h.asc - 24.02)).toBeLessThan(0.05);
      expect(Math.abs(h.mc - 279.5)).toBeLessThan(0.05);
      // ASC must equal cusp 1 in quadrant systems
      expect(Math.abs(h.asc - h.cusps[0])).toBeLessThan(0.001);
    }
  });

  it("covers the app's full working range (1700–2400)", () => {
    [2342000, 2378497, 2415021, 2488070, 2597641].forEach(jd => {
      const lon = swPlanetLon("saturn", jd);
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    });
  });
});

describe("lunar mansions", () => {
  it("has 28 mansions spanning exactly 360°", () => {
    expect(MANSIONS).toHaveLength(28);
    expect(MANSION_WIDTH * 28).toBeCloseTo(360, 10);
  });
  it("boundaries land where the tradition puts them", () => {
    expect(getMansion(0).index).toBe(1);          // 0° Aries → Al-Sharatain
    expect(getMansion(12.85).index).toBe(1);
    expect(getMansion(12.86).index).toBe(2);      // second mansion begins 12°51′26″
    expect(getMansion(185).arabic).toBe("Al-Ghafr");  // 15th mansion spans 180°–192°51′
    expect(getMansion(200).arabic).toBe("Al-Zubana"); // 16th begins 192°51′
    expect(getMansion(359.99).index).toBe(28);    // Batn al-Hut closes the circle
  });
});

describe("transit snapshot", () => {
  it("finds exact transits within orb and sorts by tightness", () => {
    const hits = transitsToNatal(
      { mars: { lon: 100.5 }, sun: { lon: 55 } },
      { sun: { lon: 280.2 }, moon: { lon: 222.0 } },
    );
    expect(hits[0]).toMatchObject({ transiting: "mars", natal: "sun", aspect: "Opposition" });
    expect(hits[0].orb).toBeCloseTo(0.3, 5);
  });
});
