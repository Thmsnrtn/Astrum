// resolveDueRule is the Athanor's timing primitive — verify it against the
// app's own hour engine and lunar phases.
import { describe, it, expect, beforeAll } from "vitest";
import { initSweph } from "../engine/sweph.js";
import { resolveDueRule } from "./athanor.js";
import { getPlanetaryHourUnequal, planetLon, dateToJD } from "../engine/astro.js";

const LONDON = { lat: 51.5, lon: -0.12 };
const NOW = new Date("2026-07-15T10:00:00Z");
const norm = a => ((a % 360) + 360) % 360;

beforeAll(async () => { await initSweph(); }, 30000);

describe("resolveDueRule", () => {
  it("finds the next Venus hour on a Venus day", () => {
    const d = resolveDueRule({ planetHour: true, planetDay: true }, NOW, LONDON, "venus");
    expect(d).toBeTruthy();
    const h = getPlanetaryHourUnequal(d, LONDON.lat, LONDON.lon);
    expect(h.planet).toBe("venus");
    expect(h.dayRuler).toBe("venus");
    expect(d.getTime()).toBeGreaterThan(NOW.getTime());
    expect(d.getTime()).toBeLessThan(NOW.getTime() + 8 * 86400000); // within a week
  });

  it("honors minDaysAfterPrev", () => {
    const d = resolveDueRule({ planetHour: true, minDaysAfterPrev: 3 }, NOW, LONDON, "mars");
    expect(d.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 3 * 86400000);
    expect(getPlanetaryHourUnequal(d, LONDON.lat, LONDON.lon).planet).toBe("mars");
  });

  it("finds the full moon within one lunation", () => {
    const d = resolveDueRule({ moonPhase: "full" }, NOW, LONDON, "moon");
    expect(d).toBeTruthy();
    const elong = norm(planetLon("moon", dateToJD(d)) - planetLon("sun", dateToJD(d)));
    expect(Math.abs(elong - 180)).toBeLessThan(31);
    expect(d.getTime() - NOW.getTime()).toBeLessThan(30 * 86400000);
  });

  it("finds the new moon within one lunation", () => {
    const d = resolveDueRule({ moonPhase: "new" }, NOW, LONDON, "moon");
    const elong = norm(planetLon("moon", dateToJD(d)) - planetLon("sun", dateToJD(d)));
    expect(elong < 31 || elong > 329).toBe(true);
  });

  it("combines phase and hour constraints", () => {
    const d = resolveDueRule({ planetHour: true, moonPhase: "waxing" }, NOW, LONDON, "jupiter");
    const h = getPlanetaryHourUnequal(d, LONDON.lat, LONDON.lon);
    expect(h.planet).toBe("jupiter");
    const elong = norm(planetLon("moon", dateToJD(d)) - planetLon("sun", dateToJD(d)));
    expect(elong).toBeGreaterThan(29); // waxing includes full band
    expect(elong).toBeLessThan(211);
  });
});
