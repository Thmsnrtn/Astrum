// ═══════════════════════════════════════════════════════════════════════
// HORARY — the chart of the question, structurally verified
// ═══════════════════════════════════════════════════════════════════════
// castHorary needs Swiss Ephemeris houses (Regiomontanus, Lilly's system),
// so this suite initializes the WASM like fallback.test.js does. The
// tests are structural sweeps rather than memorized charts: across many
// cast moments the invariants of the doctrine must hold — considerations
// always five, prohibition only ever earlier than the main perfection,
// testimonies grounded in the engine's own combustion/besiegement math.

import { describe, it, expect, beforeAll } from "vitest";
import { initSweph, swephReady } from "./sweph.js";
import { castHorary, horaryToText, QUESTION_HOUSES } from "./horary.js";
import { getCombustion } from "./astro.js";

beforeAll(async () => { await initSweph(); }, 30000);

const cast = (iso, house = 7) => castHorary({ date: new Date(iso), lat: 51.5, lon: -0.12, quesitedHouse: house });

describe("castHorary structure", () => {
  it("returns the full judgment apparatus for an arbitrary question", () => {
    expect(swephReady()).toBe(true);
    const c = cast("2026-03-15T14:30:00Z");
    expect(c.error).toBeUndefined();
    expect(c.considerations).toHaveLength(5);
    expect(c.pos.moon).toBeDefined();
    expect(Array.isArray(c.testimonies)).toBe(true);
    // The Moon-speed testimony is always present, exactly once, and
    // matches the Moon's actual speed against the 13.176° mean.
    const speedT = c.testimonies.filter(t => /Moon (swift|slow) in motion/.test(t.text));
    expect(speedT).toHaveLength(1);
    expect(speedT[0].good).toBe(c.pos.moon.speed > 13.176);
  });
  it("every question house resolves a quesited ruler", () => {
    for (const q of QUESTION_HOUSES) {
      const c = cast("2026-05-01T10:00:00Z", q.house);
      expect(c.quesited.house).toBe(q.house);
      expect(typeof c.quesited.ruler).toBe("string");
    }
  });
});

describe("prohibition and testimonies over a broad sweep", () => {
  it("prohibition, when found, always perfects before the main aspect and is never the Moon", () => {
    let prohibitions = 0, charts = 0;
    for (let d = 0; d < 120; d += 1) {
      const c = cast(new Date(Date.UTC(2026, 0, 5, 12) + d * 86400000).toISOString());
      if (c.error) continue;
      charts++;
      if (!c.prohibition) continue;
      prohibitions++;
      expect(c.prohibition.planet).not.toBe("moon");
      const main = c.aspects.find(a => a.applying && a.daysToPerfect != null);
      expect(main).toBeDefined();
      expect(c.prohibition.daysToPerfect).toBeLessThan(main.daysToPerfect);
      expect([main.p1, main.p2]).toContain(c.prohibition.blocks);
    }
    expect(charts).toBeGreaterThan(100);
    expect(prohibitions).toBeGreaterThan(0); // 120 days of sky must produce some
  });
  it("combustion testimonies agree with the engine's combustion math", () => {
    let combustSeen = 0;
    for (let d = 0; d < 120; d += 3) {
      const c = cast(new Date(Date.UTC(2026, 0, 5, 12) + d * 86400000).toISOString());
      if (c.error) continue;
      for (const t of c.testimonies) {
        if (!/combust/.test(t.text)) continue;
        combustSeen++;
        const comb = getCombustion(t.sig, c.pos[t.sig].lon, c.pos.sun.lon);
        expect(comb?.type).toBe("combust");
        expect(t.good).toBe(false);
      }
    }
    expect(combustSeen).toBeGreaterThan(0); // Mercury/Venus are combust often
  });
});

describe("horaryToText", () => {
  it("serializes prohibition and testimonies for the AI judgment", () => {
    for (let d = 0; d < 120; d += 1) {
      const c = cast(new Date(Date.UTC(2026, 0, 5, 12) + d * 86400000).toISOString());
      if (c.error || !c.prohibition) continue;
      const txt = horaryToText(c, "Will the matter succeed?");
      expect(txt).toMatch(/PROHIBITION/);
      expect(txt).toMatch(/Testimonies:/);
      return; // one confirmed serialization is enough
    }
    throw new Error("no prohibition chart found to serialize");
  });
});
