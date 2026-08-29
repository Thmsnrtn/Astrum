// ═══════════════════════════════════════════════════════════════════════
// TOMBSTONES — deletions that travel
// ═══════════════════════════════════════════════════════════════════════
// A record deleted with .filter(id) silently resurrects on the next merge
// (the peer still has it, id-union brings it back). deleteRecord() is the
// sync-safe deletion: filter + a tombstone that outweighs the record until
// someone edits it fresher. Pruned at 180 days — by then every device has
// long since converged.

import { loadJSON, saveJSON } from "../storage.js";
import { getDeviceId } from "./deviceId.js";

export function loadTombstones() { return loadJSON("astrum_tombstones", []); }
export function saveTombstones(list) { saveJSON("astrum_tombstones", list); }

export function deleteRecord(storeKey, id) {
  const list = loadJSON(storeKey, []);
  if (!Array.isArray(list)) return;
  saveJSON(storeKey, list.filter(r => r?.id !== id));
  const tombs = loadTombstones();
  tombs.push({ store: storeKey, id, deletedAt: new Date().toISOString(), deviceId: getDeviceId() });
  saveTombstones(tombs);
}

export function pruneTombstones(days = 180, now = new Date()) {
  const cutoff = new Date(now.getTime() - days * 86400000).toISOString();
  const kept = loadTombstones().filter(t => (t.deletedAt || "") > cutoff);
  saveTombstones(kept);
  return kept;
}
