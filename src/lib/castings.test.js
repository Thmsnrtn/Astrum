// Pure-function coverage for the check-in and recurrence helpers added
// alongside the Operator's Loop — dueCheckIns (the nearer, kind-specific
// nudge that precedes the 60-day staleOpen threshold) and
// mostFrequentCorrespondence (the "stalker card" style callout).
import { describe, it, expect } from "vitest";
import { dueCheckIns, CHECKIN_DAYS, mostFrequentCorrespondence } from "./castings.js";

const NOW = new Date("2026-07-15T10:00:00Z");
const daysAgo = n => new Date(NOW.getTime() - n * 86400000).toISOString();

describe("dueCheckIns", () => {
  it("includes a casting exactly on its kind's check-in day, within the day window", () => {
    const c = { id: "c1", kind: "election", status: "open", title: "x", createdAt: daysAgo(CHECKIN_DAYS.election), outcomes: [] };
    expect(dueCheckIns([c], NOW).map(x => x.id)).toEqual(["c1"]);
  });
  it("excludes a casting not yet at its check-in day", () => {
    const c = { id: "c2", kind: "sigil", status: "open", title: "x", createdAt: daysAgo(CHECKIN_DAYS.sigil - 2), outcomes: [] };
    expect(dueCheckIns([c], NOW)).toHaveLength(0);
  });
  it("excludes a casting whose window has already passed", () => {
    const c = { id: "c3", kind: "working", status: "open", title: "x", createdAt: daysAgo(CHECKIN_DAYS.working + 5), outcomes: [] };
    expect(dueCheckIns([c], NOW)).toHaveLength(0);
  });
  it("excludes a casting that already has a decisive outcome", () => {
    const c = { id: "c4", kind: "horary", status: "open", title: "x", createdAt: daysAgo(CHECKIN_DAYS.horary), outcomes: [{ verdict: "miss", date: NOW.toISOString() }] };
    expect(dueCheckIns([c], NOW)).toHaveLength(0);
  });
  it("excludes a closed casting", () => {
    const c = { id: "c5", kind: "geomancy", status: "closed", title: "x", createdAt: daysAgo(CHECKIN_DAYS.geomancy), outcomes: [] };
    expect(dueCheckIns([c], NOW)).toHaveLength(0);
  });
  it("excludes a kind with no configured check-in interval", () => {
    const c = { id: "c6", kind: "unknown-kind", status: "open", title: "x", createdAt: daysAgo(30), outcomes: [] };
    expect(dueCheckIns([c], NOW)).toHaveLength(0);
  });
});

describe("mostFrequentCorrespondence", () => {
  it("is null below the minimum sample size of 5 castings", () => {
    const list = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, planet: "jupiter", links: {} }));
    expect(mostFrequentCorrespondence(list)).toBeNull();
  });
  it("is null when nothing recurs at least 3 times", () => {
    const list = [{ planet: "sun" }, { planet: "moon" }, { planet: "mars" }, { planet: "venus" }, { planet: "saturn" }];
    expect(mostFrequentCorrespondence(list)).toBeNull();
  });
  it("finds the most-worked planet", () => {
    const list = [
      { planet: "jupiter" }, { planet: "jupiter" }, { planet: "jupiter" },
      { planet: "venus" }, { planet: "mars" },
    ];
    const r = mostFrequentCorrespondence(list);
    expect(r).toEqual({ kind: "planet", key: "jupiter", n: 3, pct: 60 });
  });
  it("finds the most-invoked ally even when planets are more varied", () => {
    const list = [
      { planet: "sun", links: { spirits: ["Raziel"] } },
      { planet: "moon", links: { spirits: ["Raziel"] } },
      { planet: "mars", links: { spirits: ["Raziel"] } },
      { planet: "venus", links: {} },
      { planet: "saturn", links: {} },
    ];
    const r = mostFrequentCorrespondence(list);
    expect(r).toEqual({ kind: "ally", key: "Raziel", n: 3, pct: 60 });
  });
});
