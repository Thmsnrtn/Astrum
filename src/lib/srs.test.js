import { describe, it, expect } from "vitest";
import { initialState, review, isDue, buildDeck } from "./srs.js";
import { timeToResult, staleOpen } from "./castings.js";

const NOW = new Date("2026-07-17T12:00:00Z");

describe("SRS scheduling", () => {
  it("a new card is due immediately", () => {
    expect(isDue(undefined, NOW)).toBe(true);
    expect(isDue(initialState(NOW), NOW)).toBe(true);
  });
  it("good on a new card schedules ~1 day out; again resets", () => {
    const s1 = review(initialState(NOW), "good", NOW);
    expect(s1.intervalDays).toBe(1);
    expect(isDue(s1, NOW)).toBe(false);
    expect(isDue(s1, new Date("2026-07-19T12:00:00Z"))).toBe(true);
    const s2 = review(s1, "again", NOW);
    expect(s2.intervalDays).toBe(0);
    expect(s2.ease).toBeLessThan(s1.ease);
  });
  it("intervals grow multiplicatively with repeated good", () => {
    let s = review(initialState(NOW), "good", NOW);      // 1d
    s = review(s, "good", NOW);                           // ×ease
    const i2 = s.intervalDays;
    s = review(s, "good", NOW);
    expect(s.intervalDays).toBeGreaterThan(i2);
  });
  it("easy grows faster and raises ease (capped)", () => {
    let g = review(initialState(NOW), "good", NOW); g = review(g, "good", NOW);
    let e = review(initialState(NOW), "easy", NOW); e = review(e, "easy", NOW);
    expect(e.intervalDays).toBeGreaterThan(g.intervalDays);
    let s = initialState(NOW);
    for (let i = 0; i < 20; i++) s = review(s, "easy", NOW);
    expect(s.ease).toBeLessThanOrEqual(3.0);
  });
});

describe("buildDeck", () => {
  const deck = buildDeck();
  it("covers mansions, figures, lots, phases, decans, and talismans", () => {
    expect(deck.filter(c => c.id.startsWith("mansion_"))).toHaveLength(28);
    expect(deck.filter(c => c.id.startsWith("figure_"))).toHaveLength(16);
    expect(deck.filter(c => c.id.startsWith("lot_"))).toHaveLength(7);
    expect(deck.filter(c => c.id.startsWith("phase_"))).toHaveLength(8);
    expect(deck.filter(c => c.id.startsWith("decan_"))).toHaveLength(36);
    expect(deck.filter(c => c.id.startsWith("mtalisman_"))).toHaveLength(28);
  });
  it("card ids are unique (grading one card must never touch another)", () => {
    expect(new Set(deck.map(c => c.id)).size).toBe(deck.length);
  });
  it("every card has front and back", () => {
    for (const c of deck) { expect(c.front).toBeTruthy(); expect(c.back?.length).toBeGreaterThan(5); }
  });
  it("accepts extra cards from callers", () => {
    const d = buildDeck([{ id: "custom_1", topic: "Custom", front: "x", back: "yyyyyy" }]);
    expect(d.some(c => c.id === "custom_1")).toBe(true);
  });
});

describe("timeToResult", () => {
  it("measures days from casting to first decisive outcome", () => {
    const t = timeToResult([
      { createdAt: "2026-01-01T00:00:00Z", planet: "venus", outcomes: [{ date: "2026-01-11T00:00:00Z", verdict: "hit" }] },
      { createdAt: "2026-02-01T00:00:00Z", planet: "venus", outcomes: [{ date: "2026-02-21T00:00:00Z", verdict: "miss" }] },
      { createdAt: "2026-03-01T00:00:00Z", outcomes: [] }, // open — ignored
    ]);
    expect(t.overall.n).toBe(2);
    expect(t.overall.avgDays).toBe(15);
    expect(t.byPlanet[0]).toMatchObject({ key: "venus", n: 2 });
  });
  it("ignores unknown-only outcomes and negative spans", () => {
    const t = timeToResult([{ createdAt: "2026-01-10T00:00:00Z", outcomes: [{ date: "2026-01-05T00:00:00Z", verdict: "hit" }] }]);
    expect(t.overall).toBeNull();
  });
});

describe("staleOpen", () => {
  it("surfaces open castings older than the threshold, oldest first", () => {
    const s = staleOpen([
      { id: "new", status: "open", createdAt: "2026-07-01T00:00:00Z" },
      { id: "old", status: "open", createdAt: "2026-01-01T00:00:00Z" },
      { id: "older", status: "open", createdAt: "2025-11-01T00:00:00Z" },
      { id: "closed", status: "closed", createdAt: "2025-01-01T00:00:00Z" },
    ], NOW, 60);
    expect(s.map(c => c.id)).toEqual(["older", "old"]);
  });
});
