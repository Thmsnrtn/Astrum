// The almanac day-model is pure and engine-driven — verify it against
// known sky events and the hour engine.
import { describe, it, expect, beforeAll } from "vitest";
import { initSweph } from "../engine/sweph.js";
import { buildMonthModel, dayHours, DAY_RULERS } from "./almanac.js";
import { getPlanetaryHourUnequal, nextFullCoherenceWindows, dateToJD } from "../engine/astro.js";

const LONDON = { lat: 51.5, lon: -0.12 };

beforeAll(async () => { await initSweph(); }, 30000);

describe("buildMonthModel", () => {
  // March 2026: Sun enters Aries at the equinox (~Mar 20)
  const march = buildMonthModel({ year: 2026, month: 2, location: LONDON });

  it("returns one entry per calendar day with a correct firstDow", () => {
    expect(march.days).toHaveLength(31);
    expect(march.firstDow).toBe(new Date(2026, 2, 1).getDay());
  });

  it("assigns the correct planetary day ruler to each day", () => {
    march.days.forEach(dm => {
      expect(dm.dayRuler).toBe(DAY_RULERS[new Date(2026, 2, dm.day).getDay()]);
    });
    // 2026-03-01 is a Sunday → Sun
    expect(march.days[0].dayRuler).toBe("sun");
  });

  it("captures the Sun's ingress into Aries at the equinox", () => {
    const ingress = march.days.find(dm => dm.events.some(e => e.kind === "ingress" && e.text.includes("Aries")));
    expect(ingress).toBeTruthy();
    expect(ingress.day).toBeGreaterThanOrEqual(19);
    expect(ingress.day).toBeLessThanOrEqual(21);
  });

  it("marks at least one lunation in the month", () => {
    const lun = march.days.filter(dm => dm.events.some(e => e.kind === "lunation"));
    expect(lun.length).toBeGreaterThanOrEqual(1);
    // a New Moon and a Full Moon should both appear across the month
    const texts = march.days.flatMap(dm => dm.events.filter(e => e.kind === "lunation").map(e => e.text));
    expect(texts.some(t => t.includes("New Moon"))).toBe(true);
    expect(texts.some(t => t.includes("Full Moon"))).toBe(true);
  });

  it("gives each day a moon phase, sign, mansion, and sun decan", () => {
    march.days.forEach(dm => {
      expect(dm.moon.phaseName).toBeTruthy();
      expect(dm.moon.sign).toBeTruthy();
      expect(dm.mansion.n).toBeGreaterThanOrEqual(1);
      expect(dm.mansion.n).toBeLessThanOrEqual(28);
      expect(dm.sunDecan.idx).toBeGreaterThanOrEqual(0);
      expect(dm.sunDecan.idx).toBeLessThanOrEqual(35);
    });
  });

  it("marks the day of a real full fractal alignment, and only that day, with the correct decan", () => {
    // A month spans roughly 3 decans, so at least one alignment should land
    // in March; find every real window the engine reports this month and
    // confirm the model marks exactly those days and no others.
    const monthStartJd = dateToJD(new Date(2026, 2, 1));
    const monthEndJd = dateToJD(new Date(2026, 3, 1));
    const realWindows = [];
    let cursor = monthStartJd - 11;
    for (let i = 0; i < 6; i++) {
      const w = nextFullCoherenceWindows(cursor, 1, "B")[0];
      if (!w || w.openJd >= monthEndJd) break;
      if (w.openJd >= monthStartJd) realWindows.push(w);
      cursor = w.closeJd + 0.01;
    }
    expect(realWindows.length).toBeGreaterThanOrEqual(1);
    const marked = march.days.filter(dm => dm.fractalAlignment);
    expect(marked).toHaveLength(realWindows.length);
    marked.forEach(dm => {
      const w = realWindows.find(rw => new Date((rw.openJd - 2440587.5) * 86400000).toDateString() === dm.fractalAlignment.at.toDateString());
      expect(w, `day ${dm.day}`).toBeTruthy();
      expect(dm.fractalAlignment.decanIdx).toBe(w.decanIdx);
    });
  });
  it("mode A and mode B can mark different days for the same month", () => {
    const modelA = buildMonthModel({ year: 2026, month: 2, location: LONDON, fractalMode: "A" });
    const daysA = modelA.days.filter(d => d.fractalAlignment).map(d => d.day);
    const daysB = march.days.filter(d => d.fractalAlignment).map(d => d.day);
    // Both modes place exactly one alignment per decan, so counts should
    // roughly match, but modes needn't land on identical days.
    expect(Math.abs(daysA.length - daysB.length)).toBeLessThanOrEqual(1);
  });
});

describe("dayHours", () => {
  it("returns the full unequal-hour sequence for a day, matching the hour engine", () => {
    const hrs = dayHours(new Date(2026, 2, 15), LONDON);
    // A day has 24 planetary hours (12 day + 12 night); allow ±1 at the seams
    expect(hrs.length).toBeGreaterThanOrEqual(23);
    expect(hrs.length).toBeLessThanOrEqual(25);
    // sample the middle of each of the first few hours against the engine
    hrs.slice(0, 6).forEach(h => {
      const mid = new Date((h.start.getTime() + h.end.getTime()) / 2);
      const eng = getPlanetaryHourUnequal(mid, LONDON.lat, LONDON.lon);
      expect(eng.planet).toBe(h.planet);
    });
  });
  it("the first hour after midnight belongs to a valid planet", () => {
    const hrs = dayHours(new Date(2026, 2, 15), LONDON);
    expect(["sun","moon","mars","mercury","jupiter","venus","saturn"]).toContain(hrs[0].planet);
  });
});
