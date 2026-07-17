import { describe, it, expect } from "vitest";
import { windowStale, watchPlans } from "./watchlist.js";

const NOW = new Date("2026-07-17T12:00:00Z");

describe("windowStale", () => {
  it("is stale when never computed", () => {
    expect(windowStale({ computedAt: null }, NOW)).toBe(true);
  });
  it("is stale after maxAgeHours", () => {
    expect(windowStale({ computedAt: "2026-07-17T00:00:00Z", nextWindow: null }, NOW, 6)).toBe(true);
  });
  it("is fresh within the window", () => {
    expect(windowStale({ computedAt: "2026-07-17T10:00:00Z", nextWindow: { date: "2026-07-20T00:00:00Z" } }, NOW, 6)).toBe(false);
  });
  it("is stale once the cached window has passed", () => {
    expect(windowStale({ computedAt: "2026-07-17T10:00:00Z", nextWindow: { date: "2026-07-17T11:00:00Z" } }, NOW, 6)).toBe(true);
  });
});

describe("watchPlans", () => {
  const end = new Date("2026-07-20T12:00:00Z");
  it("emits T-24h and T-1h plans for an active watch", () => {
    const w = { id: "w1", active: true, label: "Jupiter for the business", nextWindow: { date: "2026-07-19T12:00:00Z", score: 82, grade: "Excellent" } };
    const plans = watchPlans([w], NOW, end);
    expect(plans).toHaveLength(2);
    expect(plans[0].title).toMatch(/Jupiter for the business/);
    expect(plans.map(p => p.at.toISOString())).toEqual(["2026-07-18T12:00:00.000Z", "2026-07-19T11:00:00.000Z"]);
  });
  it("skips inactive watches, missing windows, and past windows", () => {
    expect(watchPlans([{ id: "a", active: false, nextWindow: { date: "2026-07-19T12:00:00Z" } }], NOW, end)).toHaveLength(0);
    expect(watchPlans([{ id: "b", active: true, nextWindow: null }], NOW, end)).toHaveLength(0);
    expect(watchPlans([{ id: "c", active: true, nextWindow: { date: "2026-07-17T11:00:00Z" } }], NOW, end)).toHaveLength(0);
  });
  it("drops lead times that fall outside the horizon", () => {
    const w = { id: "w1", active: true, label: "x", nextWindow: { date: "2026-07-21T00:00:00Z", score: 70 } };
    const plans = watchPlans([w], NOW, end); // T-24h = Jul 20 00:00 (inside), T-1h = Jul 20 23:00 (outside)
    expect(plans).toHaveLength(1);
  });
});
