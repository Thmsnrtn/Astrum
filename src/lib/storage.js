// ═══════════════════════════════════════════════════════════════════════
// STORAGE — central persistence layer
// ═══════════════════════════════════════════════════════════════════════
// All Astrum data lives in localStorage on every platform (the window.storage
// polyfill in main.jsx is a thin async wrapper over it, kept for legacy call
// sites). New code should import from this module.

export const STORAGE_KEYS = [
  "astrum_profile",     // practitioner identity, traditions, natal data, API key
  "astrum_natal",       // legacy natal data (pre-profile)
  "astrum_journal",     // practice journal entries
  "astrum_grimoire",    // book of shadows entries
  "astrum_people",      // synastry people
  "astrum_sigils",      // sigil workshop records
  "astrum_knowledge",   // knowledge base nodes (AI context)
  "astrum_foundations", // Learn screen progress
  "astrum_cmd_hist",    // command palette history
  "astrum_castings",    // casting records (Operator's Loop)
  "astrum_athanor",     // alchemical operations (Athanor)
  "astrum_notify_prefs",// ambient notification preferences
  "astrum_feed",        // ingested timing events (Intake → Almanac)
  "astrum_schema",      // data schema version (gates migrations)
  "astrum_last_export", // ISO timestamp of last backup export
];

export function rawGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function rawSet(key, val) {
  try { localStorage.setItem(key, val); return true; } catch { return false; }
}

export function removeKey(key) {
  try { localStorage.removeItem(key); } catch {}
}

export function loadJSON(key, fallback = null) {
  const raw = rawGet(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function saveJSON(key, value) {
  return rawSet(key, JSON.stringify(value));
}

export function getSchemaVersion() {
  const v = parseInt(rawGet("astrum_schema") || "1", 10);
  return Number.isFinite(v) ? v : 1;
}

export function setSchemaVersion(v) {
  rawSet("astrum_schema", String(v));
}
