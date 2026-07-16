// ═══════════════════════════════════════════════════════════════════════
// THE HERMETIC LOTS (Arabic Parts) — sect-aware
// ═══════════════════════════════════════════════════════════════════════
// The seven lots of the Hermetic tradition, after Paulus Alexandrinus and
// Vettius Valens as revived in modern Hellenistic practice (Schmidt, Brennan,
// Dykes). A lot is an arc measured from one point, swung out from the
// Ascendant: by day  Lot = Asc + A − B ; by night the reversal  Asc + B − A
// (unless the lot does not reverse). Fortune and Spirit are the two hinges —
// the remaining five are measured from them, so they are computed first.
//
// Pure module: computeLots(chart) takes longitudes and the sect flag and
// returns the seven lot longitudes. No dependency on the app or the ephemeris,
// so the arithmetic is unit-testable in isolation.

const norm = a => ((a % 360) + 360) % 360;

// Each lot's DAY formula is Asc + add − sub. `add`/`sub` are references into
// the chart: a planet key, or a previously-computed lot ('fortune'/'spirit').
// reverses:true  → by night the formula flips to Asc + sub − add.
// reverses:false → the same formula is used day and night.
export const LOTS = [
  {
    id: "fortune", name: "Fortune", latin: "Pars Fortunae", glyph: "⊗",
    significator: "moon", add: "moon", sub: "sun", reverses: true,
    theme: "Body · fortune · the given",
    meaning: "The lunar lot — the body, health, livelihood, and the circumstances fortune hands you. The place of what is received rather than chosen; the Moon's domain of the material and the involuntary.",
  },
  {
    id: "spirit", name: "Spirit", latin: "Pars Daemonis", glyph: "☉",
    significator: "sun", add: "sun", sub: "moon", reverses: true,
    theme: "Soul · action · the chosen",
    meaning: "The solar lot (the Daemon) — the soul, the will, career and action, what you set in motion by choice. The counterpart to Fortune: the deliberate to its involuntary, the Sun's domain of intention.",
  },
  // ── The five that swing from Fortune and Spirit ────────────────────────
  // Verified against Manwaring (Delphic Oracle), Augurine, Orphic Astrology,
  // and Brennan's Hermetic-lots paper (July 2026). Structural check: the two
  // Spirit-based lots (Eros, Victory) are  Asc + Planet − Spirit; the three
  // Fortune-based lots (Necessity, Courage, Nemesis) are  Asc + Fortune − Planet.
  // Eros and Necessity are the Paulus↔Valens crux — Paulus (significator-planet)
  // convention adopted, the modern-revival + standard-software default. Valens
  // computes Eros = Asc + Spirit − Fortune and Necessity = Asc + Fortune − Spirit
  // (pure mirror images, no planet) — kept here as a note, not the default.
  {
    id: "eros", name: "Eros", latin: "Pars Amoris", glyph: "♡",
    significator: "venus", add: "venus", sub: "spirit", reverses: true,
    theme: "Love · desire · what is longed for",
    meaning: "The lot of Eros — desire, love, appetite and voluntary longing; what one is drawn to and reaches toward. Swung from Venus and the Lot of Spirit (Asc + Venus − Spirit by day).",
  },
  {
    id: "necessity", name: "Necessity", latin: "Pars Necessitatis", glyph: "⚷",
    significator: "mercury", add: "fortune", sub: "mercury", reverses: true,
    theme: "Constraint · fate · what binds",
    meaning: "The lot of Necessity (Ananke) — constraint, compulsion, subordination, enmities, and the unavoidable obligations fate imposes; where the world sets its terms. Swung from the Lot of Fortune and Mercury (Asc + Fortune − Mercury by day).",
  },
  {
    id: "courage", name: "Courage", latin: "Pars Audaciae", glyph: "⚔",
    significator: "mars", add: "fortune", sub: "mars", reverses: true,
    theme: "Boldness · force · daring",
    meaning: "The lot of Courage (Boldness) — daring, force, martial energy, and the capacity to act against resistance; also rashness and violence. Swung from Fortune and Mars.",
  },
  {
    id: "victory", name: "Victory", latin: "Pars Victoriae", glyph: "🜍",
    significator: "jupiter", add: "jupiter", sub: "spirit", reverses: true,
    theme: "Success · faith · expansion",
    meaning: "The lot of Victory — success, faith, hope, and the good expectation that carries an endeavour through; where fortune favours. Swung from Spirit and Jupiter.",
  },
  {
    id: "nemesis", name: "Nemesis", latin: "Pars Nemesis", glyph: "♄",
    significator: "saturn", add: "fortune", sub: "saturn", reverses: true,
    theme: "Retribution · limit · the hidden",
    meaning: "The lot of Nemesis — retribution, hidden things, chronic affliction, endings and the underworld; the Saturnine account that comes due. Swung from Fortune and Saturn.",
  },
];

export const LOT_BY_ID = Object.fromEntries(LOTS.map(l => [l.id, l]));

// chart: { asc, sun, moon, mercury, venus, mars, jupiter, saturn, isDayChart }
// (all longitudes in degrees). Returns { fortune, spirit, eros, ... } → lon.
export function computeLots(chart) {
  if (chart == null || chart.asc == null) return null;
  const day = chart.isDayChart !== false; // default to day if unknown
  const out = {};
  const ref = k => (k === "fortune" || k === "spirit" ? out[k] : chart[k]);
  for (const lot of LOTS) {
    const a = ref(lot.add), b = ref(lot.sub);
    if (a == null || b == null) { out[lot.id] = null; continue; }
    out[lot.id] = day || !lot.reverses ? norm(chart.asc + a - b) : norm(chart.asc + b - a);
  }
  return out;
}

// Whole-sign house a longitude falls in, counting from the Ascendant's sign.
export function wholeSignHouse(lon, asc) {
  if (lon == null || asc == null) return null;
  return ((Math.floor(norm(lon) / 30) - Math.floor(norm(asc) / 30) + 12) % 12) + 1;
}

// Convenience: pull the sect-relevant longitudes out of an app position object
// (natalPos, or an eph snapshot with a nested `pos`).
export function chartFromPositions(p) {
  if (!p) return null;
  const pos = p.pos || p; // eph has {pos:{...}}, natalPos is flat
  const lon = k => pos?.[k]?.lon;
  return {
    asc: p.asc, isDayChart: p.isDayChart,
    sun: lon("sun"), moon: lon("moon"), mercury: lon("mercury"),
    venus: lon("venus"), mars: lon("mars"), jupiter: lon("jupiter"), saturn: lon("saturn"),
  };
}
