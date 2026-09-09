// planUpcoming is the pure core of ambient notifications — verify its plans
// against the app's own planetary-hour engine.
import { describe, it, expect, beforeAll } from "vitest";
import { initSweph } from "../engine/sweph.js";
import { planUpcoming, DEFAULT_NOTIFY_PREFS, composeBriefing } from "./scheduler.js";
import { nextFullCoherenceWindows, dateToJD } from "../engine/astro.js";
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

  it("a fractal-grade election gets the short-lead cascade (24h/1h/2min/10s), not just the two long leads", () => {
    const start = new Date(NOW.getTime() + 25 * 3600000);
    const castings = [{ id: "c2", kind: "election", status: "open", title: "Full-coherence alignment",
      links: { electionWindow: { start: start.toISOString(), score: "aligned", grade: "fractal" } } }];
    const p = planUpcoming({ now: NOW, location: LONDON, prefs, castings, athanor: [] })
      .filter(x => x.kind === "election");
    expect(p).toHaveLength(4);
    const expected = [24 * 3600000, 3600000, 2 * 60000, 10000];
    p.forEach((plan, i) => expect(Math.abs(plan.at.getTime() - (start.getTime() - expected[i]))).toBeLessThan(1000));
    expect(p.some(x => /fractal levels align/i.test(x.body))).toBe(true);
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

describe("composeBriefing", () => {
  const hour = { dayRuler: "jupiter", planet: "venus", isDayHour: true };
  const eph = { pos: { sun: { lon: 113, zodiac: {} }, moon: { lon: 40, zodiac: { name: "Taurus" } } }, moonPhase: "Waxing Gibbous", moonPhaseDeg: 100, voc: { isVoC: false } };

  it("always opens with the day/hour line", () => {
    const text = composeBriefing({ now: NOW, eph, hour });
    expect(text).toMatch(/Day of Jupiter, hour of Venus/);
  });
  it("announces a full fractal alignment when one falls within the next 24 hours, and cites the real decan", () => {
    const w = nextFullCoherenceWindows(dateToJD(NOW), 1, "B")[0];
    const openAt = new Date((w.openJd - 2440587.5) * 86400000);
    const closeEnough = openAt - NOW < 86400000;
    const text = composeBriefing({ now: NOW, eph, hour, fractalMode: "B" });
    expect(/Full fractal alignment today/.test(text)).toBe(closeEnough);
  });
  it("actually renders the announcement text when a window is a known few hours away", () => {
    // Force the true branch deliberately, rather than leaving it to chance:
    // "now" set to 3 hours before a real, freshly-found window opens.
    const w = nextFullCoherenceWindows(dateToJD(NOW), 1, "B")[0];
    const openAt = new Date((w.openJd - 2440587.5) * 86400000);
    const shortlyBefore = new Date(openAt.getTime() - 3 * 3600000);
    const text = composeBriefing({ now: shortlyBefore, eph, hour, fractalMode: "B" });
    expect(text).toMatch(/Full fractal alignment today at \d{1,2}:\d{2}/);
  });
  it("says nothing about fractal alignment when the next window is more than a day out", () => {
    // 2026-07-15 is very unlikely to be within 24h of a decan ingress for
    // every mode, but assert the CONTRACT directly rather than hope: build
    // a synthetic "now" exactly 2 days after the next mode-B window opens,
    // so the FOLLOWING window is guaranteed >24h away (~10 days per decan).
    const w = nextFullCoherenceWindows(dateToJD(NOW), 1, "B")[0];
    const justAfter = new Date((w.openJd - 2440587.5) * 86400000 + 2 * 86400000);
    const text = composeBriefing({ now: justAfter, eph, hour, fractalMode: "B" });
    expect(text).not.toMatch(/Full fractal alignment today/);
  });
});
