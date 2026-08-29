// ═══════════════════════════════════════════════════════════════════════
// TRANSPORT: File System Access API (Chromium browsers)
// ═══════════════════════════════════════════════════════════════════════
// The user picks the shared sync folder once (e.g. the Astrum folder in
// iCloud Drive, mounted on the Mac); the DirectoryHandle persists in
// IndexedDB and is re-permissioned on load. Writes are atomic-enough for
// one-writer-per-file: each device writes only its own <deviceId>.json.
// chooseSyncFolder() must be called from a user gesture.

import { idbSet, idbGet, idbDelete } from "../../durable.js";

const HANDLE_KEY = "astrum_sync_dirhandle";

export function fsAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function chooseSyncFolder() {
  const handle = await window.showDirectoryPicker({ id: "astrum-sync", mode: "readwrite" });
  await idbSet(HANDLE_KEY, handle);
  return handle;
}

export async function forgetSyncFolder() { await idbDelete(HANDLE_KEY); }

async function storedHandle() {
  try {
    const h = await idbGet(HANDLE_KEY);
    if (!h) return null;
    const perm = await h.queryPermission?.({ mode: "readwrite" });
    if (perm === "granted") return h;
    if (perm === "prompt") {
      const req = await h.requestPermission?.({ mode: "readwrite" }).catch(() => "denied");
      return req === "granted" ? h : null;
    }
    return null;
  } catch { return null; }
}

// Build a transport over any DirectoryHandle (the test hook passes an OPFS
// handle; production passes the picked folder).
export function transportFromHandle(dir) {
  return {
    name: "fs-access",
    available: async () => !!dir,
    list: async () => {
      const out = [];
      for await (const [name, h] of dir.entries()) if (h.kind === "file") out.push(name);
      return out;
    },
    read: async name => {
      const fh = await dir.getFileHandle(name);
      return await (await fh.getFile()).text();
    },
    write: async (name, text) => {
      const fh = await dir.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
    },
  };
}

export async function webFsTransport() {
  if (typeof window !== "undefined" && window.__astrumTestDirHandle) {
    return transportFromHandle(window.__astrumTestDirHandle); // E2E hook (OPFS)
  }
  if (!fsAccessSupported()) return null;
  const h = await storedHandle();
  return h ? transportFromHandle(h) : null;
}
