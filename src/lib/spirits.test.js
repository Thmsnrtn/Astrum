import { describe, it, expect, beforeEach } from "vitest";
import { upcomingObservances, daysSinceOffering, SPIRIT_KINDS } from "./spirits.js";
import { omensNear, OMEN_KINDS } from "./omens.js";

const spirit = (feastDays, log = []) => ({ id: "s1", name: "Grandmother Rose", kind: "ancestor", feastDays, log });

describe("upcomingObservances", () => {
  it("finds a feast day inside the window", () => {
    const from = new Date(2026, 6, 17); // Jul 17 2026
    const obs = upcomingObservances([spirit([{ month: 7, day: 20, label: "Anniversary" }])], from, 30);
    expect(obs).toHaveLength(1);
    expect(obs[0].label).toBe("Anniversary");
    expect(obs[0].date.getMonth()).toBe(6);
    expect(obs[0].date.getDate()).toBe(20);
  });
  it("handles the year wrap (December window catching a January feast)", () => {
    const from = new Date(2026, 11, 20); // Dec 20
    const obs = upcomingObservances([spirit([{ month: 1, day: 5 }])], from, 30);
    expect(obs).toHaveLength(1);
    expect(obs[0].date.getFullYear()).toBe(2027);
  });
  it("excludes feasts outside the window and sorts soonest-first", () => {
    const from = new Date(2026, 6, 1);
    const obs = upcomingObservances([
      spirit([{ month: 7, day: 25, label: "B" }, { month: 7, day: 4, label: "A" }, { month: 12, day: 25, label: "far" }]),
    ], from, 30);
    expect(obs.map(o => o.label)).toEqual(["A", "B"]);
  });
  it("uses a default label naming the spirit", () => {
    const obs = upcomingObservances([spirit([{ month: 7, day: 20 }])], new Date(2026, 6, 17), 10);
    expect(obs[0].label).toMatch(/Grandmother Rose/);
  });
  it("is empty for spirits without feasts", () => {
    expect(upcomingObservances([spirit([])], new Date(), 30)).toEqual([]);
    expect(upcomingObservances([], new Date(), 30)).toEqual([]);
  });
});

describe("daysSinceOffering", () => {
  it("counts days from the most recent offering entry", () => {
    const now = new Date("2026-07-17T12:00:00Z");
    const s = spirit([], [
      { id: "1", date: "2026-07-10T09:00:00Z", type: "offering", text: "water" },
      { id: "0", date: "2026-06-01T09:00:00Z", type: "offering", text: "bread" },
    ]);
    expect(daysSinceOffering(s, now)).toBe(7);
  });
  it("ignores non-offering log entries", () => {
    const s = spirit([], [{ id: "1", date: "2026-07-16T09:00:00Z", type: "contact", text: "dream visit" }]);
    expect(daysSinceOffering(s, new Date("2026-07-17T12:00:00Z"))).toBeNull();
  });
  it("is null with no log", () => {
    expect(daysSinceOffering(spirit([]))).toBeNull();
  });
});

describe("omensNear", () => {
  const omens = [
    { id: "a", at: "2026-07-10T08:00:00Z", kind: "dream", text: "river dream" },
    { id: "b", at: "2026-07-20T08:00:00Z", kind: "omen", text: "two crows" },
  ];
  it("returns omens within the window around a date", () => {
    const near = omensNear(omens, "2026-07-11T08:00:00Z", 3);
    expect(near.map(o => o.id)).toEqual(["a"]);
  });
  it("is empty when nothing is near", () => {
    expect(omensNear(omens, "2026-01-01", 3)).toEqual([]);
  });
});

describe("kind tables", () => {
  it("spirit kinds cover the doctrine's posse", () => {
    const ids = SPIRIT_KINDS.map(k => k.id);
    for (const k of ["ancestor", "planetary", "saint", "land", "daimon"]) expect(ids).toContain(k);
  });
  it("omen kinds are the three capture types", () => {
    expect(OMEN_KINDS.map(k => k.id)).toEqual(["dream", "omen", "synchronicity"]);
  });
});
