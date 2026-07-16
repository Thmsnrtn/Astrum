// ═══════════════════════════════════════════════════════════════════════
// NATIVE STORE — filesystem-backed durability, the outermost tier
// ═══════════════════════════════════════════════════════════════════════
// localStorage and IndexedDB both live inside the WebView's storage, which
// iOS can clear under pressure or on a data reset. A file the app writes to
// its own Documents directory is app-owned, iCloud-backed, and survives
// everything short of an uninstall. On a dedicated iPad meant to hold a
// practice record for decades, that is the guarantee that matters.
//
// This is a JSON snapshot of the whole record (the app reads whole-record
// blobs, so a key-value snapshot fits its access pattern exactly — a
// SQLite database would add query power the app never uses). Native-only:
// on web/desktop everything here is a no-op, so the verified web paths are
// untouched. The Capacitor runtime itself can only be validated on the
// physical device — that boundary is the user's to confirm.

const isCapacitor = () => typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
export function nativeAvailable() { return isCapacitor(); }

const FILE = "astrum-durable.json";
let writeTimer = null;
let collector = null;

async function fsModule() {
  const m = await import("@capacitor/filesystem");
  return m;
}

export async function nativeWriteSnapshot(dataObj) {
  if (!isCapacitor()) return false;
  try {
    const { Filesystem, Directory, Encoding } = await fsModule();
    const payload = JSON.stringify({ v: 1, at: new Date().toISOString(), data: dataObj });
    await Filesystem.writeFile({ path: FILE, data: payload, directory: Directory.Documents, encoding: Encoding.UTF8 });
    return true;
  } catch { return false; }
}

export async function nativeReadSnapshot() {
  if (!isCapacitor()) return null;
  try {
    const { Filesystem, Directory, Encoding } = await fsModule();
    const r = await Filesystem.readFile({ path: FILE, directory: Directory.Documents, encoding: Encoding.UTF8 });
    const parsed = JSON.parse(typeof r.data === "string" ? r.data : "");
    return parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : null;
  } catch { return null; }
}

// Debounced snapshot: writes bunch up so a burst of saves produces one file
// write. `collect` returns the current {key: value} map of the whole record.
export function requestSnapshot(collect) {
  if (!isCapacitor()) return;
  collector = collect;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    try { const d = collector?.(); if (d) await nativeWriteSnapshot(d); } catch {}
  }, 2500);
}

// Flush any pending snapshot immediately (call on app pause/background).
export async function flushSnapshot() {
  if (!isCapacitor() || !collector) return;
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  try { const d = collector(); if (d) await nativeWriteSnapshot(d); } catch {}
}
