// The alchemical corpus: structural integrity + the astro-alchemical helpers.
import { describe, it, expect, beforeAll } from "vitest";
import { initSweph } from "../engine/sweph.js";
import {
  GREAT_WORK_STAGES, ALCHEMICAL_ZODIAC, RIPLEY_GATES, TRIA_PRIMA, METALS,
  EMERALD_TABLET, FIRE_DEGREES, STUDY_ONLY_PATHS, alchemicalSeason,
  moonSignOperation, moonWorkGuidance,
} from "./alchemy.js";
import { OPERATION_TEMPLATES, TEMPLATE_ORDER, OPERATION_FAMILIES, TIER_META } from "./operations.js";
import { resolveDueRule } from "../lib/athanor.js";
import { getPlanetaryHourUnequal, planetLon, dateToJD } from "../App.jsx";

const LONDON = { lat: 51.5, lon: -0.12 };
const NOW = new Date("2026-07-15T10:00:00Z");
const norm = a => ((a % 360) + 360) % 360;

beforeAll(async () => { await initSweph(); }, 30000);

describe("the corpus", () => {
  it("has 4 stages, 12 zodiac processes, 12 gates, 3 principles, 7 metals, 4 fires", () => {
    expect(GREAT_WORK_STAGES).toHaveLength(4);
    expect(ALCHEMICAL_ZODIAC).toHaveLength(12);
    expect(RIPLEY_GATES).toHaveLength(12);
    expect(TRIA_PRIMA).toHaveLength(3);
    expect(METALS).toHaveLength(7);
    expect(FIRE_DEGREES).toHaveLength(4);
    expect(STUDY_ONLY_PATHS.length).toBeGreaterThanOrEqual(5);
  });
  it("the Emerald Tablet carries the as-above clause", () => {
    expect(EMERALD_TABLET.lines.join(" ")).toContain("That which is below is like that which is above");
  });
  it("Pernety's wheel: Aries=Calcination … Pisces=Projection", () => {
    expect(alchemicalSeason(15).process).toBe("Calcination");
    expect(alchemicalSeason(95).process).toBe("Solution");     // Cancer
    expect(alchemicalSeason(200).process).toBe("Sublimation"); // Libra 20°
    expect(alchemicalSeason(355).process).toBe("Projection");  // Pisces
  });
  it("Junius's Moon-key differs only at Sagittarius (Incineration)", () => {
    expect(moonSignOperation(250).process).toBe("Incineration");
    expect(moonSignOperation(250).variant).toBe("Junius variant");
    expect(moonSignOperation(95).process).toBe("Solution");
  });
  it("moonWorkGuidance covers the whole lunation", () => {
    expect(moonWorkGuidance(0).phase).toBe("Dark / New");
    expect(moonWorkGuidance(90).mode).toBe("coagula");
    expect(moonWorkGuidance(180).mode).toBe("harvest");
    expect(moonWorkGuidance(270).mode).toBe("solve");
  });
});

describe("operation templates", () => {
  it("every ordered template exists with valid family, tier, steps, and rules", () => {
    TEMPLATE_ORDER.forEach(id => {
      const t = OPERATION_TEMPLATES[id];
      expect(t, id).toBeTruthy();
      expect(OPERATION_FAMILIES[t.family], id).toBeTruthy();
      expect(TIER_META[t.tier], id).toBeTruthy();
      expect(t.steps.length, id).toBeGreaterThanOrEqual(3);
      expect(t.source, id).toBeTruthy();
      t.steps.forEach(s => {
        expect(s.title).toBeTruthy();
        expect(s.instructions.length).toBeGreaterThan(40);
        expect(s.observe).toBeTruthy();
        if (s.fire != null) { expect(s.fire).toBeGreaterThanOrEqual(0); expect(s.fire).toBeLessThanOrEqual(4); }
      });
    });
  });
  it("legacy template ids survive (tincture, water, ferment, custom)", () => {
    ["tincture", "water", "ferment", "custom"].forEach(id => expect(OPERATION_TEMPLATES[id]).toBeTruthy());
  });
  it("every template's first step resolves to a concrete window", () => {
    TEMPLATE_ORDER.forEach(id => {
      const t = OPERATION_TEMPLATES[id];
      const d = resolveDueRule(t.steps[0].dueRule, NOW, LONDON, "venus");
      expect(d, `${id} first step`).toBeTruthy();
    });
  }, 120000);
});

describe("extended dueRules", () => {
  it("sunSigns fast-forwards to the season (dew under Aries from July)", () => {
    const d = resolveDueRule({ sunSigns: [0, 1], preDawn: true }, NOW, LONDON, "sun");
    expect(d).toBeTruthy();
    const sunSign = Math.floor(norm(planetLon("sun", dateToJD(d))) / 30);
    expect([0, 1]).toContain(sunSign);
    const h = getPlanetaryHourUnequal(d, LONDON.lat, LONDON.lon);
    expect(h.isDayHour).toBe(false);
    expect(h.hourNum).toBeGreaterThanOrEqual(22);
    // next Aries season from July 2026 is ~8 months out
    expect(d.getTime() - NOW.getTime()).toBeGreaterThan(200 * 86400000);
  });
  it("in-season sunSigns rule resolves immediately (Cancer in July)", () => {
    const d = resolveDueRule({ sunSigns: [3] }, NOW, LONDON, "moon");
    expect(d.getTime() - NOW.getTime()).toBeLessThan(86400000);
  });
});
