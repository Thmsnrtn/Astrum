// ═══════════════════════════════════════════════════════════════════════
// TIMEKEEPING — planetary hours, sect, and ingresses away from Greenwich
// ═══════════════════════════════════════════════════════════════════════
// Every older hour test ran in London on a UTC clock, where the place's day,
// the UTC day, and the device's day coincide — exactly the case that hid the
// bug where the Americas got tomorrow's sunrise each evening and Asia
// yesterday's each morning. These tests check the engine against oracles
// that share none of its day-selection logic: sunrises found by scanning the
// Sun's altitude, and the weekday read from the place's real IANA time zone.

import { describe, it, expect } from "vitest";
import { getPlanetaryHourUnequal, getPlanetaryHour, sunAltitude, nextIngress, planetLon, dateToJD, HOUR_ORDER, DAY_RULERS, norm } from "./astro.js";
import { computeEphemeris, calcNatal, conditionsFromProfile } from "./chart.js";
import { assessElection, electionFactors } from "./scan.js";
import { essentialDignity } from "./reception.js";

const PLACES = [
  { name: "Los Angeles", lat: 34.05, lon: -118.24, tz: "America/Los_Angeles" },
  { name: "New York", lat: 40.71, lon: -74.01, tz: "America/New_York" },
  { name: "Honolulu", lat: 21.31, lon: -157.86, tz: "Pacific/Honolulu" },
  { name: "London", lat: 51.5, lon: -0.12, tz: "Europe/London" },
  { name: "Reykjavik", lat: 64.15, lon: -21.94, tz: "Atlantic/Reykjavik" },
  { name: "Kolkata", lat: 22.57, lon: 88.36, tz: "Asia/Kolkata" },
  { name: "Tokyo", lat: 35.68, lon: 139.69, tz: "Asia/Tokyo" },
  { name: "Sydney", lat: -33.87, lon: 151.21, tz: "Australia/Sydney" },
  // Where the date line bends: the civil calendar is a whole day off the
  // place's mean-solar date. American Samoa is the control that must not shift.
  { name: "Apia", lat: -13.83, lon: -171.76, tz: "Pacific/Apia" },
  { name: "Nuku'alofa", lat: -21.14, lon: -175.2, tz: "Pacific/Tongatapu" },
  { name: "Kiritimati", lat: 1.87, lon: -157.43, tz: "Pacific/Kiritimati" },
  { name: "Chatham", lat: -43.95, lon: -176.56, tz: "Pacific/Chatham" },
  { name: "Lakeba", lat: -18.2, lon: -178.8, tz: "Pacific/Fiji" },
  { name: "Suva", lat: -18.14, lon: 178.44, tz: "Pacific/Fiji" },
  { name: "Attu", lat: 52.84, lon: 173.18, tz: "America/Adak" },
  { name: "Pago Pago", lat: -14.28, lon: -170.7, tz: "Pacific/Pago_Pago" },
];
const LA = PLACES[0], TOKYO = PLACES[6];
const RISE_ALT = -0.833; // the standard visible-sunrise altitude the engine uses
const MIN = 60000, HOUR = 3600000;

const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const weekdayIn = (date, tz) => WD[new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date)];

// Altitude oracle: crossings of RISE_ALT found by stepping, refined by bisection.
const altAt = (t, p) => sunAltitude(dateToJD(new Date(t)), p.lat, p.lon) - RISE_ALT;
function refine(a, b, p) {
  const up = altAt(a, p) < 0;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if ((altAt(m, p) < 0) === up) a = m; else b = m;
  }
  return (a + b) / 2;
}
function lastRiseBefore(t, p) {
  const step = 10 * MIN;
  for (let b = t; b > t - 40 * HOUR; b -= step) {
    const a = b - step;
    if (altAt(a, p) < 0 && altAt(b, p) >= 0) return refine(a, b, p);
  }
  return null;
}
function nextCrossing(t, p, upward) {
  const step = 10 * MIN;
  for (let a = t; a < t + 40 * HOUR; a += step) {
    const b = a + step;
    if (upward ? altAt(a, p) < 0 && altAt(b, p) >= 0 : altAt(a, p) >= 0 && altAt(b, p) < 0) return refine(a, b, p);
  }
  return null;
}
function oracleHour(t, p) {
  const rise = lastRiseBefore(t, p);
  const set = nextCrossing(rise, p, false);
  const nextRise = nextCrossing(set, p, true);
  const dayRuler = DAY_RULERS[weekdayIn(new Date(rise), p.tz)];
  const isDay = t < set;
  const start = isDay ? rise : set, len = ((isDay ? set : nextRise) - start) / 12;
  const idx = Math.floor((t - start) / len);
  const nearBoundary = Math.min((t - start) % len, len - ((t - start) % len)) < 3 * MIN
    || Math.abs(t - set) < 3 * MIN || Math.abs(t - rise) < 3 * MIN || Math.abs(t - nextRise) < 3 * MIN;
  const planet = HOUR_ORDER[(HOUR_ORDER.indexOf(dayRuler) + (isDay ? 0 : 12) + idx) % 7];
  return { dayRuler, isDay, planet, hourNum: idx + (isDay ? 1 : 13), nearBoundary, len, end: start + (idx + 1) * len };
}

// Deterministic instants spread over 2026 and over every hour of the day.
function sampleInstants(n, seed) {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, () => t0 + Math.floor(rnd() * 365 * 24 * 60) * MIN);
}

describe("unequal planetary hours agree with an independent oracle, everywhere", () => {
  for (const p of PLACES) {
    it(`${p.name}: ruler, day/night, and hour planet match across 2026`, () => {
      let checked = 0;
      for (const t of sampleInstants(48, p.lon * 1000 + 7)) {
        const o = oracleHour(t, p);
        if (o.nearBoundary) continue;
        const h = getPlanetaryHourUnequal(new Date(t), p.lat, p.lon);
        const where = `${p.name} at ${new Date(t).toISOString()}`;
        expect(h.dayRuler, where).toBe(o.dayRuler);
        expect(h.isDayHour, where).toBe(o.isDay);
        expect(h.planet, where).toBe(o.planet);
        expect(h.hourNum, where).toBe(o.hourNum);
        expect(h.msRemaining, where).toBeGreaterThan(0);
        expect(h.msRemaining, where).toBeLessThanOrEqual(h.lenMs);
        // The ring and the countdown: hour length and end within a minute of the oracle's.
        expect(Math.abs(h.lenMs - o.len), where).toBeLessThan(MIN);
        expect(Math.abs(t + h.msRemaining - o.end), where).toBeLessThan(2 * MIN);
        checked++;
      }
      expect(checked).toBeGreaterThan(30);
    });
  }

  it("a California summer evening before sunset is still the day's day hours (the original bug)", () => {
    // 2026-06-20 19:00 PDT = 02:00 UTC on the 21st; sunset is ~20:08 PDT.
    const h = getPlanetaryHourUnequal(new Date("2026-06-21T02:00:00Z"), LA.lat, LA.lon);
    expect(h.isDayHour).toBe(true);
    expect(h.dayRuler).toBe("saturn"); // Saturday 20 June
    expect(HOUR_ORDER).toContain(h.planet);
    expect(h.hourNum).toBe(12); // the last hour of the day
  });

  it("a Tokyo morning after sunrise is the new day's day hours, not last night's", () => {
    // 2026-10-31 07:00 JST = 22:00 UTC on the 30th; sunrise ~05:58 JST.
    const h = getPlanetaryHourUnequal(new Date("2026-10-30T22:00:00Z"), TOKYO.lat, TOKYO.lon);
    expect(h.isDayHour).toBe(true);
    expect(h.dayRuler).toBe("saturn"); // Saturday 31 October
  });

  it("consecutive hours chain without gaps: each hour ends where the next begins", () => {
    for (const p of [LA, TOKYO, PLACES[4]]) {
      let t = Date.UTC(2026, 5, 20, 12);
      let prev = getPlanetaryHourUnequal(new Date(t), p.lat, p.lon);
      for (let i = 0; i < 30; i++) {
        t += prev.msRemaining + 1000;
        const h = getPlanetaryHourUnequal(new Date(t), p.lat, p.lon);
        expect(h.planet, `${p.name} step ${i}`).toBe(prev.nextPlanet);
        prev = h;
      }
    }
  });
});

describe("polar day and night: equal hours anchored at the place, not the device", () => {
  const TROMSO = { lat: 69.65, lon: 18.96, tz: "Europe/Oslo" };
  it("midsummer and midwinter fall back to equal hours from 06:00 mean solar time, named by the place's weekday", () => {
    for (const iso of ["2026-06-21T10:00:00Z", "2026-12-21T10:00:00Z"]) {
      const t = new Date(iso);
      const h = getPlanetaryHourUnequal(t, TROMSO.lat, TROMSO.lon);
      expect(h.polar, iso).toBe(true);
      expect(h.equal, iso).toBe(true);
      expect(h.dayRuler, iso).toBe(DAY_RULERS[weekdayIn(t, TROMSO.tz)]);
      // 06:00 mean solar time at 18.96°E is 04:44:10 UTC: the day's first hour.
      const first = new Date(Date.parse(iso.slice(0, 10) + "T04:44:10Z") + 30 * MIN);
      const h1 = getPlanetaryHourUnequal(first, TROMSO.lat, TROMSO.lon);
      expect(h1.hourNum, iso).toBe(1);
      expect(h1.planet, iso).toBe(h1.dayRuler);
    }
  });
  it("polar hours chain without gaps through a polar day", () => {
    let t = Date.UTC(2026, 5, 20, 0), prev = getPlanetaryHourUnequal(new Date(t), TROMSO.lat, TROMSO.lon);
    for (let i = 0; i < 48; i++) {
      t += prev.msRemaining + 1000;
      const h = getPlanetaryHourUnequal(new Date(t), TROMSO.lat, TROMSO.lon);
      expect(h.planet, `step ${i}`).toBe(prev.nextPlanet);
      prev = h;
    }
  });
});

describe("pre-2011 Samoa kept the American date — the zone's history is honoured", () => {
  it("2010 in Apia names the day by the calendar Apia used then", () => {
    const t = new Date("2010-06-15T23:00:00Z"); // midday in Apia, then UTC−11
    const h = getPlanetaryHourUnequal(t, -13.83, -171.76);
    expect(h.dayRuler).toBe(DAY_RULERS[weekdayIn(t, "Pacific/Apia")]);
  });
});

describe("the no-place fallback keeps the traditional order", () => {
  it("06:00 opens the day with its own ruler's hour; 05:00 is still the previous night", () => {
    const fri6 = getPlanetaryHour(new Date(2026, 9, 30, 6, 0, 1)); // Friday 30 Oct 2026, device clock
    expect(fri6.dayRuler).toBe("venus");
    expect(fri6.planet).toBe("venus");
    expect(fri6.hourNum).toBe(1);
    expect(fri6.isDayHour).toBe(true);
    expect(fri6.equal).toBe(true);
    const fri5 = getPlanetaryHour(new Date(2026, 9, 30, 5, 0, 1));
    expect(fri5.dayRuler).toBe("jupiter"); // Thursday's night
    expect(fri5.hourNum).toBe(24);
    expect(fri5.isDayHour).toBe(false);
    expect(fri5.nextPlanet).toBe("venus"); // Friday's first hour follows
  });
  it("chains through a whole year on the device clock — across DST changes when the clock has them", () => {
    // CI reruns this suite with TZ=America/Los_Angeles, where the planetary
    // days containing 8 Mar and 1 Nov 2026 run 23 and 25 hours.
    let t = new Date(2026, 0, 1, 7).getTime(), prev = getPlanetaryHour(new Date(t));
    let lengths = new Set();
    for (let i = 0; i < 366 * 24; i++) {
      expect(prev.msRemaining, new Date(t).toString()).toBeGreaterThan(0);
      expect(prev.msRemaining).toBeLessThanOrEqual(prev.lenMs + 1);
      t += prev.msRemaining + 1;
      const h = getPlanetaryHour(new Date(t));
      expect(h.planet, new Date(t).toString()).toBe(prev.nextPlanet);
      expect(h.hourNum).toBe(prev.hourNum === 24 ? 1 : prev.hourNum + 1);
      lengths.add(Math.round(h.lenMs / 1000));
      prev = h;
    }
    const hasDST = new Date(2026, 0, 1).getTimezoneOffset() !== new Date(2026, 6, 1).getTimezoneOffset();
    expect(lengths.size).toBe(hasDST ? 3 : 1); // 3600 s, plus 23/24 h and 25/24 h hours on DST days
  });
});

describe("a latitude or longitude of exactly 0 is a place", () => {
  it("Greenwich (lon 0) gets true unequal hours in the record and in the election engine alike", () => {
    const d = new Date("2026-06-01T22:30:00Z"), g = { lat: 51.48, lon: 0 };
    const cond = conditionsFromProfile(d, { natal: g });
    expect(cond.location).toEqual(g);
    expect(cond.hourModel).toBe(2);
    const truth = getPlanetaryHourUnequal(d, g.lat, g.lon);
    expect(cond.hourPlanet).toBe(truth.planet);
    expect(electionFactors(d, "jupiter", 70, g).hourPlanet).toBe(truth.planet);
  });
});

describe("sect follows the Sun above the horizon, at any longitude", () => {
  it("live chart: California evening before sunset is diurnal, after dark nocturnal", () => {
    expect(computeEphemeris(new Date("2026-06-21T02:00:00Z"), LA).isDayChart).toBe(true);
    expect(computeEphemeris(new Date("2026-06-21T05:00:00Z"), LA).isDayChart).toBe(false);
  });
  it("live chart: Tokyo just after sunrise is diurnal", () => {
    expect(computeEphemeris(new Date("2026-10-30T22:00:00Z"), TOKYO).isDayChart).toBe(true);
  });
  it("natal: an evening birth in Los Angeles before sunset is a day chart", () => {
    expect(calcNatal(new Date("1990-07-15T02:30:00Z"), LA).isDayChart).toBe(true); // 19:30 PDT, sunset ~20:05
    expect(calcNatal(new Date("1990-07-15T06:00:00Z"), LA).isDayChart).toBe(false); // 23:00 PDT
  });
  it("matches the Sun's altitude sign for random moments and places", () => {
    for (const p of PLACES) for (const t of sampleInstants(10, p.lat * 100 + 3)) {
      const jd = dateToJD(new Date(t));
      expect(computeEphemeris(new Date(t), p).isDayChart).toBe(sunAltitude(jd, p.lat, p.lon) > 0);
    }
  });
});

describe("nextIngress finds the first sign change, for every body", () => {
  const signAt = (pk, jd) => Math.floor(norm(planetLon(pk, jd)) / 30);
  const FINE = { moon: 0.02, sun: 0.25, mercury: 0.1, venus: 0.25, mars: 0.25, jupiter: 1, saturn: 1 };
  for (const pk of ["moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn"]) {
    it(`${pk}: no earlier crossing, and the sign really changes at the returned instant`, () => {
      for (const t of sampleInstants(pk === "saturn" || pk === "jupiter" ? 4 : 10, pk.length * 97)) {
        const jd = dateToJD(new Date(t)), r = nextIngress(pk, jd);
        expect(r, `${pk} at ${new Date(t).toISOString()}`).not.toBeNull();
        const start = signAt(pk, jd);
        expect(signAt(pk, r.jd - 1e-4)).toBe(start);
        expect(signAt(pk, r.jd + 1e-4)).not.toBe(start);
        for (let x = jd; x < r.jd - 1e-3; x += FINE[pk]) expect(signAt(pk, x)).toBe(start);
        if (pk === "moon") expect(r.jd - jd).toBeLessThan(3);
      }
    });
  }
  it("Saturn's next ingress can be years away — never a phantom one at 60 days", () => {
    const jd = dateToJD(new Date("2026-06-01T00:00:00Z")); // Saturn in Aries until 2028
    expect(nextIngress("saturn", jd).jd - jd).toBeGreaterThan(300);
  });
});

describe("the election engine reads time the same way the record does", () => {
  const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
  it("timing and reception use the true unequal hour and the sunrise-based day ruler", () => {
    for (const t of sampleInstants(12, 4242)) {
      const date = new Date(t), h = getPlanetaryHourUnequal(date, LA.lat, LA.lon);
      for (const pk of ["jupiter", "venus"]) {
        const timing = assessElection(date, pk, null, LA).criteria.find(c => c.id === "timing");
        expect(timing.pass).toBe(h.dayRuler === pk || h.planet === pk);
        const f = electionFactors(date, pk, 70, LA);
        expect(f.hourPlanet).toBe(h.planet);
        expect(f.dayRuler).toBe(h.dayRuler);
      }
    }
  });
  it("minor dignities follow the chart's sect even in the twilight band where the hours already say day", () => {
    const rise = getPlanetaryHourUnequal(new Date("2026-06-21T13:00:00Z"), LA.lat, LA.lon).rise; // ~05:42 PDT
    const twilight = new Date(rise.getTime() + MIN); // visible sunrise passed, Sun's centre still below 0°
    expect(getPlanetaryHourUnequal(twilight, LA.lat, LA.lon).isDayHour).toBe(true);
    expect(sunAltitude(dateToJD(twilight), LA.lat, LA.lon)).toBeLessThan(0);
    for (const pk of PLANETS) {
      const a = assessElection(twilight, pk, null, LA);
      const parts = essentialDignity(pk, a.positions[pk].lon, false).parts.filter(x => ["bound", "triplicity", "face"].includes(x));
      expect(a.criteria.find(c => c.id === "minor").pass).toBe(parts.length > 0);
    }
  });
  it("minor dignities use the night triplicity ruler at night", () => {
    const night = new Date("2026-06-21T07:00:00Z"); // 00:00 PDT
    expect(getPlanetaryHourUnequal(night, LA.lat, LA.lon).isDayHour).toBe(false);
    for (const pk of PLANETS) {
      const a = assessElection(night, pk, null, LA);
      const minor = a.criteria.find(c => c.id === "minor");
      const parts = essentialDignity(pk, a.positions[pk].lon, false).parts.filter(x => ["bound", "triplicity", "face"].includes(x));
      expect(minor.pass).toBe(parts.length > 0);
    }
  });
});
