// ═══════════════════════════════════════════════════════════════════════
// SWISS EPHEMERIS (WASM) — precision core
// ═══════════════════════════════════════════════════════════════════════
// Wraps swisseph-wasm behind synchronous accessors so the existing Meeus
// call sites can delegate with zero API change. initSweph() is fired at
// boot without blocking render; until it resolves every accessor returns
// null and callers fall back to the Meeus engine. The 12 MB WASM+data
// bundle (planets 1500–2500 AD, asteroids, sefstars catalog) is fetched
// once and service-worker cached.
//
// swisseph-wasm's own fixstar wrappers free the result buffer before
// copying values out (returns garbage), so stars go through a manual
// ccall with copy-before-free.

import SwissEph from "swisseph-wasm";

let swe = null;          // initialized SwissEph instance
let initPromise = null;
let failed = false;

const SE_PLANET = { sun: 0, moon: 1, mercury: 2, venus: 3, mars: 4, jupiter: 5, saturn: 6, uranus: 7, neptune: 8, pluto: 9 };
const SE_TRUE_NODE = 11, SE_CHIRON = 15, SE_MEAN_APOG = 12; // mean lunar apogee = Lilith
const SEFLG_SWIEPH = 2, SEFLG_SPEED = 256;

const readyCallbacks = [];
export function onSwephReady(cb) { if (swe) cb(); else readyCallbacks.push(cb); }

const isNode = typeof process !== "undefined" && !!process.versions?.node && typeof document === "undefined";

// Browser init bypasses the package's initSwissEph: its locateFile resolves
// against location.href (Vite rewrites dynamic import.meta.url), which breaks
// under a served base path. We instantiate the Emscripten glue ourselves and
// resolve wasm/ against document.baseURI — correct in dev (/wasm/), on GH
// Pages (/Astrum/wasm/), and under Tauri/Capacitor custom schemes.
async function initInstance() {
  const inst = new SwissEph();
  if (isNode) {
    await inst.initSwissEph(); // package's Node path logic is correct
    return inst;
  }
  const { default: WasmSwissEph } = await import("swisseph-wasm-glue");
  const glue = await WasmSwissEph({
    locateFile: (path, prefix) =>
      path.endsWith(".wasm") || path.endsWith(".data")
        ? new URL("wasm/" + path, document.baseURI).href
        : prefix + path,
  });
  inst.SweModule = glue;
  if (!glue.HEAP32) glue.HEAP32 = new Int32Array(glue.HEAPF64.buffer);
  inst.set_ephe_path("sweph");
  return inst;
}

export function initSweph() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const inst = await initInstance();
      // Sanity probe before committing: Sun at J2000 must be ~280.37°
      const probe = inst.calc_ut(2451545.0, 0, SEFLG_SWIEPH);
      if (!probe || Math.abs(probe[0] - 280.37) > 0.5) throw new Error("sweph probe failed");
      swe = inst;
      readyCallbacks.splice(0).forEach(cb => { try { cb(); } catch {} });
      return true;
    } catch (e) {
      failed = true;
      return false;
    }
  })();
  return initPromise;
}

export function swephReady() { return !!swe; }
export function engineInfo() { return swe ? "swiss" : failed ? "meeus (swiss failed to load)" : "meeus (swiss loading…)"; }

// ── Memoization ─────────────────────────────────────────────────────────
// useEphemeris re-runs on every 200 ms UI tick; cache per planet + JD
// rounded to ~0.5 s so the WASM is only consulted when time moves.
const calcCache = new Map();
function cachedCalc(ipl, jd) {
  const key = ipl * 1e9 + Math.round(jd * 172800) / 172800 * 10;
  const hit = calcCache.get(key);
  if (hit) return hit;
  const r = swe.calc_ut(jd, ipl, SEFLG_SWIEPH | SEFLG_SPEED);
  if (!r) return null;
  const out = { lon: r[0], lat: r[1], dist: r[2], speed: r[3] };
  if (calcCache.size > 2000) calcCache.clear();
  calcCache.set(key, out);
  return out;
}

// ── Synchronous accessors (null ⇒ caller falls back to Meeus) ──────────

export function swPlanetLon(pk, jd) {
  if (!swe) return null;
  const ipl = SE_PLANET[pk];
  if (ipl == null) return null;
  try { return cachedCalc(ipl, jd)?.lon ?? null; } catch { return null; }
}

export function swDailyMotion(pk, jd) {
  if (!swe) return null;
  const ipl = SE_PLANET[pk];
  if (ipl == null) return null;
  try { return cachedCalc(ipl, jd)?.speed ?? null; } catch { return null; }
}

export function swTrueNode(jd) {
  if (!swe) return null;
  try { return cachedCalc(SE_TRUE_NODE, jd)?.lon ?? null; } catch { return null; }
}

export function swChiron(jd) {
  if (!swe) return null;
  try { return cachedCalc(SE_CHIRON, jd)?.lon ?? null; } catch { return null; }
}

export function swLilith(jd) {
  if (!swe) return null;
  try { return cachedCalc(SE_MEAN_APOG, jd)?.lon ?? null; } catch { return null; }
}

// houses: system 'P' Placidus (app default), 'R' Regiomontanus (horary).
// Returns { asc, mc, cusps: [1..12] } or null.
export function swHouses(jd, lat, lon, sys = "P") {
  if (!swe) return null;
  try {
    const h = swe.houses(jd, lat, lon, sys);
    if (!h?.ascmc) return null;
    return { asc: h.ascmc[0], mc: h.ascmc[1], cusps: Array.from(h.cusps).slice(1, 13) };
  } catch { return null; }
}

// Fixed star position at date (true precessed ecliptic longitude).
// Manual ccall — see header note. Cached per star per day.
const starCache = new Map();
export function swFixstar(name, jd) {
  if (!swe) return null;
  const key = `${name}@${Math.round(jd)}`;
  if (starCache.has(key)) return starCache.get(key);
  let out = null;
  try {
    const M = swe.SweModule;
    const resultPtr = M._malloc(48), starBuf = M._malloc(64), serr = M._malloc(256);
    M.stringToUTF8(name, starBuf, 64);
    const ret = M.ccall("swe_fixstar2_ut", "number",
      ["pointer", "number", "number", "pointer", "pointer"],
      [starBuf, jd, SEFLG_SWIEPH, resultPtr, serr]);
    if (ret >= 0) {
      const vals = new Float64Array(M.HEAPF64.buffer, resultPtr, 6);
      out = { lon: vals[0], lat: vals[1] };
    }
    M._free(resultPtr); M._free(starBuf); M._free(serr);
  } catch { out = null; }
  starCache.set(key, out);
  return out;
}
