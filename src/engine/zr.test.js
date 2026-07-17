import { describe, it, expect } from "vitest";
import { ZR_YEARS, ZR_DAY_YEAR, ZR_UNITS, zrL1, zrSubdivide, zrCurrent, angularityFromFortune, SIGN_NAMES } from "./zr.js";
import { profection, ageAt, DOMICILE_RULERS } from "./profections.js";

const DAY = 86400000;
const BIRTH = new Date("1990-06-15T12:00:00Z");

describe("ZR period table (Valens)", () => {
  it("holds the verified minor-years values, Capricorn 27", () => {
    expect(ZR_YEARS).toEqual([15, 8, 20, 25, 19, 20, 8, 15, 12, 27, 30, 12]);
    expect(ZR_YEARS[9]).toBe(27);   // Capricorn — the exception, NOT Saturn's 30
    expect(ZR_YEARS[10]).toBe(30);  // Aquarius keeps Saturn's 30
    expect(ZR_YEARS.reduce((a, b) => a + b, 0)).toBe(211); // full circuit
  });
});

describe("zrL1 — the major periods", () => {
  const l1 = zrL1(0 /* Aries */, BIRTH, 108);
  it("starts from the lot's sign at birth and walks zodiacally", () => {
    expect(l1[0].sign).toBe(0);
    expect(l1[1].sign).toBe(1);
    expect(l1[2].sign).toBe(2);
  });
  it("uses 360-day years (Aries = 15 × 360 days exactly)", () => {
    expect(l1[0].end.getTime() - l1[0].start.getTime()).toBe(15 * 360 * DAY);
  });
  it("periods are contiguous", () => {
    for (let i = 1; i < l1.length; i++) expect(l1[i].start.getTime()).toBe(l1[i - 1].end.getTime());
  });
  it("never looses the bond at L1 within a lifetime (circuit = 211 years)", () => {
    expect(l1.every(p => !p.lb)).toBe(true);
  });
});

describe("zrSubdivide — L2 months and the loosing of the bond", () => {
  // Aquarius L1 = 30 years = 360 months > 211 → LB must occur.
  const aqL1 = { sign: 10, start: new Date(0), end: new Date(30 * 360 * DAY) };
  const l2 = zrSubdivide(aqL1, ZR_UNITS.l2);
  it("L2 starts from the parent's own sign, in 30-day months", () => {
    expect(l2[0].sign).toBe(10); // Aquarius first
    expect(l2[0].end.getTime() - l2[0].start.getTime()).toBe(30 * 30 * DAY); // 30 months of 30 days
  });
  it("the 13th sub-period leaps to the OPPOSITE sign (Aquarius → Leo)", () => {
    expect(l2[12].sign).toBe(4); // Leo = opposite of Aquarius
    expect(l2[12].lb).toBe(true);
    // and the leap happens exactly at 211 months
    expect(l2[12].start.getTime()).toBe(211 * 30 * DAY);
  });
  it("only one LB flag in the sequence, and the sequence resumes zodiacally", () => {
    expect(l2.filter(p => p.lb)).toHaveLength(1);
    expect(l2[13].sign).toBe(5); // Virgo follows Leo
  });
  it("short parents never loose the bond (Taurus 8y = 96 months < 211)", () => {
    const tau = { sign: 1, start: new Date(0), end: new Date(8 * 360 * DAY) };
    const sub = zrSubdivide(tau, ZR_UNITS.l2);
    expect(sub.every(p => !p.lb)).toBe(true);
    expect(sub[0].sign).toBe(1);
  });
  it("truncates the last sub-period at the parent's end", () => {
    const tau = { sign: 1, start: new Date(0), end: new Date(8 * 360 * DAY) };
    const sub = zrSubdivide(tau, ZR_UNITS.l2);
    expect(sub[sub.length - 1].end.getTime()).toBe(8 * 360 * DAY);
    expect(sub[sub.length - 1].truncated).toBe(true);
  });
});

describe("peaks — angularity from the Lot of Fortune", () => {
  it("flags 1st/4th/7th/10th from Fortune", () => {
    expect(angularityFromFortune(3, 3)).toBe(1);
    expect(angularityFromFortune(6, 3)).toBe(4);
    expect(angularityFromFortune(9, 3)).toBe(7);
    expect(angularityFromFortune(0, 3)).toBe(10); // the culmination
    expect(angularityFromFortune(4, 3)).toBeNull();
  });
  it("carries the angle onto periods when Fortune is supplied", () => {
    const l1 = zrL1(0, BIRTH, 220, 0); // Fortune in Aries too; long horizon to reach Capricorn
    expect(l1[0].angle).toBe(1);
    expect(l1[9].angle).toBe(10); // Capricorn period = 10th from Aries Fortune
  });
});

describe("zrCurrent — the live chain", () => {
  it("finds a coherent L1 → L2 → L3 chain at a given moment", () => {
    const now = new Date("2026-07-17T12:00:00Z");
    const cur = zrCurrent(7 /* Scorpio spirit */, BIRTH, now, 3);
    expect(cur.l1).toBeTruthy();
    expect(cur.l2).toBeTruthy();
    expect(cur.l3).toBeTruthy();
    const t = now.getTime();
    for (const p of [cur.l1, cur.l2, cur.l3]) {
      expect(p.start.getTime()).toBeLessThanOrEqual(t);
      expect(p.end.getTime()).toBeGreaterThan(t);
    }
    // L2 falls inside L1, L3 inside L2
    expect(cur.l2.start.getTime()).toBeGreaterThanOrEqual(cur.l1.start.getTime());
    expect(cur.l3.end.getTime()).toBeLessThanOrEqual(cur.l2.end.getTime() + 1);
  });
});

describe("profections", () => {
  it("age counts completed years, turning on the birthday", () => {
    expect(ageAt(BIRTH, new Date("2026-06-14T12:00:00Z"))).toBe(35);
    expect(ageAt(BIRTH, new Date("2026-06-15T12:00:00Z"))).toBe(36);
  });
  it("age 0 is the 1st house in the Ascendant's sign", () => {
    const p = profection(BIRTH, new Date("1990-08-01"), 5 /* Virgo Asc */);
    expect(p.house).toBe(1);
    expect(p.sign).toBe("Virgo");
    expect(p.lord).toBe("mercury");
  });
  it("age 36 returns to the 1st house (36 % 12 = 0)", () => {
    const p = profection(BIRTH, new Date("2026-07-17"), 5);
    expect(p.age).toBe(36);
    expect(p.house).toBe(1);
    expect(p.sign).toBe("Virgo");
  });
  it("age 35 is the 12th house, eleven signs on", () => {
    const p = profection(BIRTH, new Date("2026-06-01"), 5);
    expect(p.age).toBe(35);
    expect(p.house).toBe(12);
    expect(p.sign).toBe(SIGN_NAMES[(5 + 11) % 12]); // Leo
    expect(p.lord).toBe("sun");
  });
  it("domicile rulers are traditional", () => {
    expect(DOMICILE_RULERS).toEqual(["mars","venus","mercury","moon","sun","mercury","venus","mars","jupiter","saturn","saturn","jupiter"]);
  });
});
