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

// merge mode: array stores are merged by entry id and existing local entries
// always win — an import can add history but never destroy it.
// replace mode: imported values overwrite local ones key by key.
export function importAll(jsonText, { merge = true } = {}) {
  let envelope;
  try { envelope = JSON.parse(jsonText); }
  catch { throw new Error("Not valid JSON — is this an Astrum backup file?"); }
  if (envelope?.app !== "astrum" || typeof envelope.data !== "object" || !envelope.data) {
    throw new Error("Not an Astrum backup — missing the expected envelope.");
  }
  const summary = { keysRestored: 0, entriesAdded: 0 };
  Object.entries(envelope.data).forEach(([key, raw]) => {
    if (!key.startsWith("astrum_") || typeof raw !== "string") return;
    if (merge) {
      const localRaw = rawGet(key);
      const merged = mergeArraysById(localRaw, raw);
      if (merged) {
        rawSet(key, merged.json);
        summary.entriesAdded += merged.added;
        summary.keysRestored++;
        return;
      }
      // Not two arrays — only fill in keys that are locally absent.
      if (localRaw == null) { rawSet(key, raw); summary.keysRestored++; }
      return;
    }
    rawSet(key, raw);
    summary.keysRestored++;
  });
  return summary;
}

function mergeArraysById(localRaw, importedRaw) {
  let local, imported;
  try { local = JSON.parse(localRaw); imported = JSON.parse(importedRaw); } catch { return null; }
  if (!Array.isArray(local) || !Array.isArray(imported)) return null;
  const seen = new Set(local.map(e => e?.id).filter(id => id != null));
  const additions = imported.filter(e => e?.id != null && !seen.has(e.id));
  return { json: JSON.stringify([...local, ...additions]), added: additions.length };
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

export async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}
