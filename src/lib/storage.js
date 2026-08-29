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
  "astrum_ai",          // AI engine settings (provider, local endpoint, model)
  "astrum_feed",        // ingested timing events (Intake → Almanac)
  "astrum_spirits",     // the Spirit Court — allies, offerings, feast days
  "astrum_omens",       // omen & dream log
  "astrum_watchlist",   // standing electional intentions (the Vigil)
  "astrum_srs",         // spaced-repetition state over the canon
  "astrum_tombstones",  // sync: deletions that travel (see lib/sync)
  "astrum_meta",        // sync: per-store last-write timestamps
  "astrum_schema",      // data schema version (gates migrations)
  "astrum_last_export", // ISO timestamp of last backup export
];

import { idbSet, idbGet, idbDelete, idbKeys, requestPersistent, hydrateDecision } from "./durable.js";
import { requestSnapshot, nativeReadSnapshot, nativeAvailable } from "./nativeStore.js";

export function rawGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

// Collect the whole record for the native filesystem snapshot.
function collectAll() {
  const out = {};
  for (const k of STORAGE_KEYS) { const v = rawGet(k); if (v != null) out[k] = v; }
  return out;
}

export function rawSet(key, val) {
  let ok = false;
  try { localStorage.setItem(key, val); ok = true; } catch {}
  if (key.startsWith("astrum_")) {
    stampWrite(key);
    idbSet(key, val);                 // durable bucket (survives eviction)
    requestSnapshot(collectAll);      // app-owned file (survives WebView clearing) — native-only, debounced
  }
  return ok;
}

// Sync bookkeeping: per-store last-write ISO (for whole-value LWW on
// non-array stores) and the device lamport counter (deterministic ties).
// Never stamp the bookkeeping keys themselves.
const NO_STAMP = new Set(["astrum_meta", "astrum_tombstones", "astrum_last_export", "astrum_cmd_hist", "astrum_srs", "astrum_sync_state"]);
function stampWrite(key) {
  if (NO_STAMP.has(key)) return;
  try {
    const meta = JSON.parse(localStorage.getItem("astrum_meta") || "{}");
    meta[key] = new Date().toISOString();
    localStorage.setItem("astrum_meta", JSON.stringify(meta));
    const n = (parseInt(localStorage.getItem("astrum_lamport") || "0", 10) || 0) + 1;
    localStorage.setItem("astrum_lamport", String(n));
  } catch {}
}

// Stamp a record for last-writer-wins sync. Use on every mutation of a
// record inside an array store.
export function touch(rec) { return { ...rec, updatedAt: new Date().toISOString() }; }

export function removeKey(key) {
  try { localStorage.removeItem(key); } catch {}
  if (key.startsWith("astrum_")) { idbDelete(key); requestSnapshot(collectAll); }
}

// Boot step: claim the durable bucket, then reconcile localStorage with
// IndexedDB — restore anything localStorage lost to an eviction, seed
// IndexedDB with anything only localStorage has. Run before the app reads
// storage. Best-effort: any failure leaves the app on plain localStorage.
export async function initDurable() {
  const summary = { restored: 0, seeded: 0, fileRestored: 0, persistent: false };
  try { summary.persistent = await requestPersistent(); } catch {}
  try {
    // Tier 1 — IndexedDB reconciliation (survives eviction)
    const idbAll = await idbKeys();
    const keys = new Set([...STORAGE_KEYS, ...idbAll.filter(k => typeof k === "string" && k.startsWith("astrum_"))]);
    for (const key of keys) {
      const ls = rawGet(key);
      const idb = await idbGet(key);
      const decision = hydrateDecision(ls, idb);
      if (decision === "restore") { try { localStorage.setItem(key, idb); summary.restored++; } catch {} }
      else if (decision === "seed") { await idbSet(key, ls); summary.seeded++; }
    }
    // Tier 2 — native filesystem snapshot (survives WebView data clearing).
    // Only reached on Capacitor; restores anything still missing after tier 1.
    if (nativeAvailable()) {
      const snap = await nativeReadSnapshot();
      if (snap) {
        for (const [key, val] of Object.entries(snap)) {
          if (!key.startsWith("astrum_") || typeof val !== "string") continue;
          if (rawGet(key) == null) {
            try { localStorage.setItem(key, val); summary.fileRestored++; } catch {}
            idbSet(key, val); // re-seed the middle tier too
          }
        }
      }
      // ensure a fresh snapshot exists for next boot
      requestSnapshot(collectAll);
    }
  } catch {}
  return summary;
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
