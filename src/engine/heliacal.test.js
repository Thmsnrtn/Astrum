import { describe, it, expect } from "vitest";
import { eclToEqu, gmst, altitudeAt, starRiseJD, starCulminationJD, heliacalRising, starPhase, HELIACAL_STARS } from "./heliacal.js";

// Sirius J2000: RA 101.287°, Dec −16.716°; ecliptic λ ≈ 104.08°, β ≈ −39.61°.
const SIRIUS = { lon: 104.08, lat: -39.61 };

// A mean Sun good to ~1-2° — adequate for anchoring heliacal dates to weeks.
const meanSun = jd => {
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  return ((L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360 + 360) % 360;
};
const jdOf = iso => new Date(iso).getTime() / 86400000 + 2440587.5;
const dateOf = jd => new Date((jd - 2440587.5) * 86400000);

describe("eclToEqu", () => {
  it("recovers Sirius's catalogue RA/Dec from its ecliptic position", () => {
    const { ra, dec } = eclToEqu(SIRIUS.lon, SIRIUS.lat);
    expect(ra).toBeCloseTo(101.3, 0);
    expect(dec).toBeCloseTo(-16.7, 0);
  });
  it("the vernal point maps to RA 0, Dec 0", () => {
    const { ra, dec } = eclToEqu(0, 0);
    expect(ra).toBeCloseTo(0, 5);
    expect(dec).toBeCloseTo(0, 5);
  });
});

describe("starRiseJD", () => {
  it("finds a rise within a sidereal day, at ~zero altitude", () => {
    const { ra, dec } = eclToEqu(SIRIUS.lon, SIRIUS.lat);
    const jd0 = jdOf("2026-01-01T00:00:00Z");
    const rise = starRiseJD(jd0, ra, dec, 30, 31);
    expect(rise).toBeGreaterThanOrEqual(jd0);
    expect(rise).toBeLessThan(jd0 + 1.01);
    expect(Math.abs(altitudeAt(rise, ra, dec, 30, 31))).toBeLessThan(0.5);
  });
  it("returns null for a circumpolar star", () => {
    expect(starRiseJD(jdOf("2026-01-01"), 0, 80, 51.5, 0)).toBeNull();
  });
});

describe("heliacalRising — Sirius anchors", () => {
  it("lands in late July / early August at Cairo's latitude (~30°N)", () => {
    const hr = heliacalRising(SIRIUS.lon, SIRIUS.lat, jdOf("2026-06-01T00:00:00Z"), 30.05, 31.25, meanSun, 10);
    expect(hr).toBeTruthy();
    const d = dateOf(hr.jd);
    const doy = (d - new Date(Date.UTC(2026, 0, 1))) / 86400000;
    expect(doy).toBeGreaterThan(198);  // after ~Jul 18
    expect(doy).toBeLessThan(230);     // before ~Aug 18
  });
  it("comes later at London's latitude than at Cairo's (southern star rises shallow in the north)", () => {
    const cairo = heliacalRising(SIRIUS.lon, SIRIUS.lat, jdOf("2026-06-01T00:00:00Z"), 30.05, 31.25, meanSun, 10);
    const london = heliacalRising(SIRIUS.lon, SIRIUS.lat, jdOf("2026-06-01T00:00:00Z"), 51.5, -0.12, meanSun, 10);
    expect(london.jd).toBeGreaterThan(cairo.jd + 5);
  });
  it("at the transition the sun sits just below −AV", () => {
    const hr = heliacalRising(SIRIUS.lon, SIRIUS.lat, jdOf("2026-06-01T00:00:00Z"), 30.05, 31.25, meanSun, 10);
    expect(hr.sunAlt).toBeLessThanOrEqual(-10);
    expect(hr.sunAlt).toBeGreaterThan(-14); // just crossed, not deep night
  });
  it("is null for a circumpolar star", () => {
    expect(heliacalRising(90, 85, jdOf("2026-01-01"), 51.5, 0, meanSun)).toBeNull();
  });
});

describe("HELIACAL_STARS latitudes recover catalogue RA/Dec (data proof)", () => {
  // J2000 catalogue values; a wrong ecliptic latitude cannot reproduce these.
  const CATALOGUE = {
    Sirius:    { ra: 101.29, dec: -16.72 },
    Regulus:   { ra: 152.09, dec: 11.97 },
    Spica:     { ra: 201.30, dec: -11.16 },
    Aldebaran: { ra: 68.98,  dec: 16.51 },
    Antares:   { ra: 247.35, dec: -26.43 },
    Vega:      { ra: 279.23, dec: 38.78 },
    Procyon:   { ra: 114.83, dec: 5.22 },
  };
  for (const s of HELIACAL_STARS) {
    it(`${s.name} → RA/Dec within 0.6°`, () => {
      const { ra, dec } = eclToEqu(s.lon, s.lat);
      expect(Math.abs(ra - CATALOGUE[s.name].ra)).toBeLessThan(0.6);
      expect(Math.abs(dec - CATALOGUE[s.name].dec)).toBeLessThan(0.6);
    });
  }
});

describe("starPhase — morning/evening star", () => {
  it("Venus behind the Sun in longitude is the morning star", () => {
    expect(starPhase(80, 100).phase).toBe("morning star");
  });
  it("Venus ahead of the Sun is the evening star", () => {
    expect(starPhase(120, 100).phase).toBe("evening star");
  });
  it("handles the 0° wrap", () => {
    expect(starPhase(350, 10).phase).toBe("morning star");
    expect(starPhase(10, 350).phase).toBe("evening star");
  });
  it("close to the Sun is under the beams", () => {
    expect(starPhase(103, 100).phase).toBe("under the beams");
  });
});

describe("starCulminationJD", () => {
  it("culmination is the local altitude maximum and recurs each sidereal day", () => {
    // Regulus from London — RA/Dec from its ecliptic place via eclToEqu.
    const { ra, dec } = eclToEqu(150.2, 0.46);
    const jd0 = 2460900.5, lat = 51.5, lon = -0.12;
    const c = starCulminationJD(jd0, ra, lon);
    expect(c).toBeGreaterThanOrEqual(jd0);
    expect(c - jd0).toBeLessThan(1.01);
    const altC = altitudeAt(c, ra, dec, lat, lon);
    for (const off of [-2 / 24, -1 / 24, 1 / 24, 2 / 24]) {
      expect(altC).toBeGreaterThan(altitudeAt(c + off, ra, dec, lat, lon));
    }
    // Upper culmination altitude = 90 − |lat − dec| (meridian geometry).
    expect(Math.abs(altC - (90 - Math.abs(lat - dec)))).toBeLessThan(0.01);
    const c2 = starCulminationJD(c + 0.01, ra, lon);
    expect((c2 - c) * 24).toBeGreaterThan(23.9);   // sidereal day ≈ 23h56m
    expect((c2 - c) * 24).toBeLessThan(23.95);
  });
});
