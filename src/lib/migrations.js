// ═══════════════════════════════════════════════════════════════════════
// MIGRATIONS — schema steps, run once at boot (after durable hydration)
// ═══════════════════════════════════════════════════════════════════════
// Schema 3: every record in an array store gains updatedAt (backfilled from
// createdAt / date / epoch) so the sync layer's last-writer-wins has a
// truthful stamp to compare. A post-migration edit always outranks the
// backfill.

import { loadJSON, saveJSON, getSchemaVersion, setSchemaVersion, STORAGE_KEYS } from "./storage.js";

const ARRAY_STORES = STORAGE_KEYS.filter(k =>
  !["astrum_profile", "astrum_natal", "astrum_notify_prefs", "astrum_ai", "astrum_srs",
    "astrum_foundations", "astrum_schema", "astrum_last_export", "astrum_meta",
    "astrum_cmd_hist", "astrum_tombstones"].includes(k));

export function runMigrations() {
  const v = getSchemaVersion();
  if (v >= 3) return { ran: false, version: v };
  for (const key of ARRAY_STORES) {
    const list = loadJSON(key, null);
    if (!Array.isArray(list)) continue;
    let changed = false;
    const next = list.map(r => {
      if (!r || typeof r !== "object" || r.updatedAt) return r;
      changed = true;
      const stamp = r.createdAt || (r.date ? new Date(r.date).toISOString?.() || "1970-01-01T00:00:00.000Z" : null) || "1970-01-01T00:00:00.000Z";
      return { ...r, updatedAt: typeof stamp === "string" && stamp.includes("T") ? stamp : "1970-01-01T00:00:00.000Z" };
    });
    if (changed) saveJSON(key, next);
  }
  setSchemaVersion(3);
  return { ran: true, version: 3 };
}
