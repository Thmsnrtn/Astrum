// The Behenian coordinate table stays consistent with everything else
// that names these stars — and with the sky.
import { describe, it, expect } from "vitest";
import { BEHENIAN_COORDS, coordsForStar } from "./starCoords.js";
import { BEHENIAN } from "./behenian.js";
import { FIXED_STARS } from "./fixedStars.js";
import { HELIACAL_STARS } from "../engine/heliacal.js";

describe("BEHENIAN_COORDS", () => {
  it("covers exactly the fifteen Behenian stars of the app's catalog", () => {
    expect(BEHENIAN_COORDS).toHaveLength(15);
    const names = BEHENIAN_COORDS.map(c => c.name);
    expect(new Set(names).size).toBe(15);
    for (const key of Object.keys(BEHENIAN)) expect(names).toContain(key);
    for (const c of BEHENIAN_COORDS) {
      expect(Math.abs(c.latJ2000)).toBeLessThan(90);
      expect(c.lonJ2000).toBeGreaterThanOrEqual(0);
      expect(c.lonJ2000).toBeLessThan(360);
    }
  });
  it("agrees with the fixed-star catalog longitudes within 0.02°", () => {
    for (const c of BEHENIAN_COORDS) {
      const fs = FIXED_STARS.find(s => s.name === c.name);
      expect(fs, c.name).toBeDefined();
      expect(Math.abs(fs.lon - c.lonJ2000), c.name).toBeLessThan(0.02);
    }
  });
  it("agrees with the heliacal catalog (lat AND lon) within 0.02°", () => {
    for (const h of HELIACAL_STARS) {
      const c = coordsForStar(h.name);
      if (!c) continue; // heliacal has non-Behenian stars? (it does not, but stay safe)
      expect(Math.abs(h.lon - c.lonJ2000), `${h.name} lon`).toBeLessThan(0.02);
      expect(Math.abs(h.lat - c.latJ2000), `${h.name} lat`).toBeLessThan(0.02);
    }
  });
});
