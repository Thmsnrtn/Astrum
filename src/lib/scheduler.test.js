// planUpcoming is the pure core of ambient notifications — verify its plans
// against the app's own planetary-hour engine.
import { describe, it, expect, beforeAll } from "vitest";
import { initSweph } from "../engine/sweph.js";
import { planUpcoming, DEFAULT_NOTIFY_PREFS } from "./scheduler.js";
import { getPlanetaryHourUnequal } from "../engine/astro.js";

const LONDON = { lat: 51.5, lon: -0.12 };
const NOW = new Date("2026-07-15T10:00:00Z");

beforeAll(async () => { await initSweph(); }, 30000);

describe("planUpcoming", () => {
  const prefs = { ...DEFAULT_NOTIFY_PREFS, enabled: true, hourPlanets: ["jupiter"], horizonDays: 2 };
  const plans = () => planUpcoming({ now: NOW, location: LONDON, prefs, castings: [], athanor: [] });

  it("returns time-sorted plans inside the horizon", () => {
    const p = plans();
    expect(p.length).toBeGreaterThan(0);
    for (let i = 1; i < p.length; i++) expect(p[i].at >= p[i - 1].at).toBe(true);
    p.forEach(x => {
      expect(x.at.getTime()).toBeGreaterThan(NOW.getTime());
      expect(x.at.getTime()).toBeLessThan(NOW.getTime() + 2 * 86400000);
    });
  });

  it("hour-change plans land at true Jupiter hour starts", () => {
    const hourPlans = plans().filter(x => x.kind === "hourChange");
    // Jupiter rules ~2 of every 24 unequal hours → expect ~4 in 2 days
    expect(hourPlans.length).toBeGreaterThanOrEqual(3);
    hourPlans.forEach(x => {
      const h = getPlanetaryHourUnequal(new Date(x.at.getTime() + 60000), LONDON.lat, LONDON.lon);
      expect(h.planet).toBe("jupiter");
    });
  });

  it("briefing fires daily at the configured time", () => {
    const briefs = plans().filter(x => x.kind === "briefing");
    expect(briefs.length).toBeGreaterThanOrEqual(1);
    briefs.forEach(b => {
      expect(b.at.getHours()).toBe(7);
      expect(b.at.getMinutes()).toBe(30);
    });
  });

  it("election reminders come 24h and 1h before committed windows", () => {
    const start = new Date(NOW.getTime() + 30 * 3600000); // 30h out
    const castings = [{ id: "c1", kind: "election", status: "open", title: "Jupiter window",
      links: { electionWindow: { start: start.toISOString(), score: 82 } } }];
    const p = planUpcoming({ now: NOW, location: LONDON, prefs, castings, athanor: [] })
      .filter(x => x.kind === "election");
    expect(p).toHaveLength(2);
    expect(Math.abs(p[0].at.getTime() - (start.getTime() - 24 * 3600000))).toBeLessThan(1000);
    expect(Math.abs(p[1].at.getTime() - (start.getTime() - 3600000))).toBeLessThan(1000);
  });

  it("athanor step due-times become plans", () => {
    const due = new Date(NOW.getTime() + 5 * 3600000);
    const athanor = [{ id: "op1", name: "Mars Tincture", status: "active",
      steps: [{ id: "s1", title: "First agitation", scheduledFor: due.toISOString() }] }];
    const p = planUpcoming({ now: NOW, location: LONDON, prefs, castings: [], athanor })
      .filter(x => x.kind === "athanor");
    expect(p).toHaveLength(1);
    expect(p[0].title).toContain("Mars Tincture");
  });

  it("disabled kinds produce no plans", () => {
    const quiet = { ...prefs, kinds: { hourChange: false, voc: false, elections: false, briefing: false, athanor: false } };
    expect(planUpcoming({ now: NOW, location: LONDON, prefs: quiet, castings: [], athanor: [] })).toHaveLength(0);
  });
});
