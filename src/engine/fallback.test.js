// ═══════════════════════════════════════════════════════════════════════
// THE FALLBACK'S ERROR ENVELOPE — know exactly how wrong Meeus can be
// ═══════════════════════════════════════════════════════════════════════
// The app boots on the Meeus approximation and upgrades to the Swiss
// Ephemeris when the WASM lands; offline-forever devices may never
// upgrade. Nobody had quantified that gap. These tests sweep 1950–2100
// and pin the fallback's worst-case error per body against arc-second
// truth, so the envelope is a tested contract, not a hope:
// Measured (1950–2100 biennial sweep, Aug 2026 audit):
//   Sun 0.007°, Moon 0.10° (the 30-term Ch.47 truncation), Mercury 0.98°,
//   Jupiter 1.37°, Saturn 1.76°, Mars 2.97°, Venus 3.53° — two-body
//   Kepler without perturbations; the inner planets' epicyclic geometry
//   hurts most. Limits below = measured worst + margin.
// Practical meaning: Sun/Moon from Meeus alone are display-exact at 0.1°;
// planetary hours (Sun-driven) are effectively exact; a planet within
// ~3.5° of a sign cusp can show the wrong sign until the Swiss upgrade —
// which is why the engine chip matters.
// Also here: sunrise/set sanity (geometry properties, not memorized
// times) and the app's own house math cross-checked against Swiss.

import { describe, it, expect, beforeAll } from "vitest";
import { initSweph, swephReady, swPlanetLon, swHouses } from "./sweph.js";
import { meeusPlanetLon, sunriseSetUTC, calcHouses, calcASC, calcMC } from "./astro.js";

beforeAll(async () => { await initSweph(); }, 30000);

const JD_J2000 = 2451545.0;
const yearsToJd = y => JD_J2000 + (y - 2000) * 365.25;
const angDiff = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

describe("Meeus fallback envelope vs Swiss Ephemeris, 1950–2100", () => {
  const LIMITS = { sun: 0.02, moon: 0.15, mercury: 1.3, venus: 4.0, mars: 3.5, jupiter: 1.8, saturn: 2.2 };
  for (const [planet, limit] of Object.entries(LIMITS)) {
    it(`${planet} stays within ${limit}°`, () => {
      expect(swephReady()).toBe(true);
      let worst = 0;
      for (let y = 1950; y <= 2100; y += 2) {
        const jd = yearsToJd(y + 0.37); // avoid exact year boundaries
        const truth = swPlanetLon(planet, jd);
        const approx = meeusPlanetLon(planet, jd);
        if (truth == null) continue;
        worst = Math.max(worst, angDiff(truth, approx));
      }
      expect(worst).toBeGreaterThan(0);      // the sweep actually ran
      expect(worst).toBeLessThan(limit);
    });
  }
});

describe("sunrise/sunset geometry (properties, not memorized almanac rows)", () => {
  it("on the equator, every month's day length is ~12h", () => {
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(2026, m, 15));
      const ss = sunriseSetUTC(d, 0, 0);
      const hours = (ss.set - ss.rise) / 3600000;
      expect(hours).toBeGreaterThan(11.7);
      expect(hours).toBeLessThan(12.3);
    }
  });
  it("London's solstices bracket correctly (long June, short December)", () => {
    const jun = sunriseSetUTC(new Date(Date.UTC(2026, 5, 21)), 51.5, -0.12);
    const dec = sunriseSetUTC(new Date(Date.UTC(2026, 11, 21)), 51.5, -0.12);
    const junH = (jun.set - jun.rise) / 3600000;
    const decH = (dec.set - dec.rise) / 3600000;
    expect(junH).toBeGreaterThan(16.2); expect(junH).toBeLessThan(17.0);
    expect(decH).toBeGreaterThan(7.5);  expect(decH).toBeLessThan(8.3);
    expect(junH + decH).toBeGreaterThan(23.5); // complementary within refraction
    expect(junH + decH).toBeLessThan(25.0);
  });
  it("rise precedes set on ordinary days", () => {
    const ss = sunriseSetUTC(new Date(Date.UTC(2026, 3, 10)), 40, -74);
    expect(ss.rise.getTime()).toBeLessThan(ss.set.getTime());
  });
});

describe("the app's own angle & house math vs Swiss Ephemeris", () => {
  it("ASC never lands on the Descendant — 400-point random sweep within 0.2°", () => {
    // The quadrant bug this catches was intermittent: the raw atan2 chose
    // the Descendant for some moment-geometries and every chart drew from
    // it. Sweep broadly so the flip can never quietly return.
    let rng = 12345;
    const rand = () => (rng = (rng * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    let checked = 0;
    for (let i = 0; i < 400; i++) {
      const jd = 2440000 + rand() * 40000;          // ~1968–2077
      const lat = -60 + rand() * 120;               // habitable latitudes
      const lon = -180 + rand() * 360;
      const sw = swHouses(jd, lat, lon, "P");
      if (!sw) continue;
      checked++;
      expect(angDiff(calcASC(jd, lat, lon), sw.asc), `jd=${jd.toFixed(2)} lat=${lat.toFixed(1)}`).toBeLessThan(0.2);
      expect(angDiff(calcMC(jd, lon), sw.mc)).toBeLessThan(0.2);
    }
    expect(checked).toBeGreaterThan(300);
  });
  it("Placidus and Regiomontanus cusps agree within 0.5°", () => {
    for (const c of [{ jd: 2460000.25, lat: 51.5, lon: -0.12 }, { jd: 2461000.7, lat: 34.05, lon: -118.24 }]) {
      for (const [sys, code] of [["placidus", "P"], ["regiomontanus", "R"]]) {
        const sw = swHouses(c.jd, c.lat, c.lon, code);
        if (!sw) continue;
        const own = calcHouses(c.jd, c.lat, c.lon, sys); // returns the cusp array
        for (let i = 0; i < 12; i++) {
          expect(angDiff(own[i], sw.cusps[i]), `${sys} cusp ${i + 1}`).toBeLessThan(0.5);
        }
      }
    }
  });
});
