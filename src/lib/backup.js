// ═══════════════════════════════════════════════════════════════════════
// BACKUP — export/import of the entire practice record
// ═══════════════════════════════════════════════════════════════════════
// The journal, grimoire, sigils, and castings are an irreplaceable practice
// record living only in localStorage (which iOS can evict under pressure).
// exportAll() serializes every registered key into one JSON envelope;
// importAll() restores it, either merging by id or replacing outright.
// Values are stored as the raw localStorage strings so the round trip is
// lossless regardless of each store's internal shape.

import { STORAGE_KEYS, rawGet, rawSet, getSchemaVersion } from "./storage.js";

export function exportAll() {
  const data = {};
  STORAGE_KEYS.forEach(k => {
    const raw = rawGet(k);
    if (raw != null) data[k] = raw;
  });
  const envelope = {
    app: "astrum",
    schema: getSchemaVersion(),
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(envelope, null, 2);
}

export function markExported() {
  rawSet("astrum_last_export", new Date().toISOString());
}

export function lastExportedAt() {
  const raw = rawGet("astrum_last_export");
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// merge mode now rides the SYNC MERGE CORE (lib/sync/merge.js): id-union
// with per-record last-writer-wins and travelling tombstones — so even
// manual file passing between devices honors edits and deletions instead
// of "local always wins, deletes resurrect". replace mode overwrites key
// by key (destructive; the UI confirms first).
import { mergeStoreValue, mergeTombstones } from "./sync/merge.js";
import { loadJSON, saveJSON } from "./storage.js";

export function importAll(jsonText, { merge = true } = {}) {
  let envelope;
  try { envelope = JSON.parse(jsonText); }
  catch { throw new Error("Not valid JSON — is this an Astrum backup file?"); }
  if (envelope?.app !== "astrum" || typeof envelope.data !== "object" || !envelope.data) {
    throw new Error("Not an Astrum backup — missing the expected envelope.");
  }
  const summary = { keysRestored: 0, entriesAdded: 0 };
  const remoteTombs = (() => { try { return JSON.parse(envelope.data.astrum_tombstones || "[]"); } catch { return []; } })();
  const tombstones = mergeTombstones(loadJSON("astrum_tombstones", []), remoteTombs);
  const remoteMeta = (() => { try { return JSON.parse(envelope.data.astrum_meta || "{}"); } catch { return {}; } })();
  const localMeta = loadJSON("astrum_meta", {});
  Object.entries(envelope.data).forEach(([key, raw]) => {
    if (!key.startsWith("astrum_") || typeof raw !== "string") return;
    if (key === "astrum_tombstones" || key === "astrum_meta" || key === "astrum_device_id") return;
    if (merge) {
      const localRaw = rawGet(key);
      const r = mergeStoreValue(key, localRaw, raw,
        { localMeta, remoteMeta, tombstones, ctxL: { deviceId: "local" }, ctxR: { deviceId: envelope.deviceId || "import" } });
      if (r.changed && r.value != null) {
        try {
          const before = Array.isArray(JSON.parse(localRaw || "[]")) ? JSON.parse(localRaw || "[]").length : 0;
          const after = Array.isArray(JSON.parse(r.value)) ? JSON.parse(r.value).length : 0;
          summary.entriesAdded += Math.max(0, after - before);
        } catch {}
        rawSet(key, r.value);
        summary.keysRestored++;
      }
      return;
    }
    rawSet(key, raw);
    summary.keysRestored++;
  });
  saveJSON("astrum_tombstones", tombstones);
  return summary;
}

// ── Delivery helpers ────────────────────────────────────────────────────

export function backupFilename(date = new Date()) {
  return `astrum-backup-${date.toISOString().split("T")[0]}.json`;
}

export function downloadText(filename, text) {
  try {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch { return false; }
}

// On Capacitor the WKWebView can't download blobs — write to the app cache
// and hand the file to the iOS share sheet instead.
export async function shareOnNative(filename, text) {
  try {
    if (!window.Capacitor?.isNativePlatform?.()) return false;
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const res = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: filename, url: res.uri });
    return true;
  } catch { return false; }
}

// Silent safety net: written to the app's Documents dir when iOS backgrounds
// the app, since WKWebView may evict localStorage under storage pressure.
// Rotating slots: seven dated files, one per weekday. A wipe followed by a
// backgrounding can no longer destroy the only copy — six older days survive.
export function autoBackupSlotName(now = new Date()) {
  const day = ["sun","mon","tue","wed","thu","fri","sat"][now.getDay()];
  return `astrum-autobackup-${day}.json`;
}

export async function autoBackupNative() {
  try {
    if (!window.Capacitor?.isNativePlatform?.()) return false;
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    await Filesystem.writeFile({ path: autoBackupSlotName(), data: exportAll(), directory: Directory.Documents, encoding: Encoding.UTF8 });
    return true;
  } catch { return false; }
}

// Web equivalent: a 7-slot snapshot ring in IndexedDB (PWA users previously
// had no safety net at all). Written at most once per day per slot.
export async function autoBackupWebRing() {
  try {
    const { idbSet, idbGet } = await import("./durable.js");
    const slot = `astrum_ring_${autoBackupSlotName()}`;
    const prev = await idbGet(slot + "_at").catch(() => null);
    const today = new Date().toISOString().slice(0, 10);
    if (prev === today) return false; // this slot already written today
    await idbSet(slot, exportAll());
    await idbSet(slot + "_at", today);
    return true;
  } catch { return false; }
}

export async function listWebRing() {
  try {
    const { idbKeys, idbGet } = await import("./durable.js");
    const keys = (await idbKeys()).filter(k => /^astrum_ring_.*\.json$/.test(k));
    const out = [];
    for (const k of keys) out.push({ slot: k.replace("astrum_ring_", ""), writtenOn: await idbGet(k + "_at").catch(() => null) });
    return out;
  } catch { return []; }
}

export async function readWebRing(slot) {
  try { const { idbGet } = await import("./durable.js"); return await idbGet(`astrum_ring_${slot}`); }
  catch { return null; }
}

export async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}
