// ═══════════════════════════════════════════════════════════════════════
// DURABLE — IndexedDB mirror behind the synchronous storage layer
// ═══════════════════════════════════════════════════════════════════════
// localStorage is fast and synchronous — the whole app reads it directly —
// but on iOS WKWebView it lives in the evictable bucket and carries a ~5 MB
// quota, which is unacceptable for a practice record meant to last decades.
// IndexedDB lives in the durable bucket (survives storage pressure once
// navigator.storage.persist() is granted) with a gigabyte-scale quota.
//
// The strategy: keep localStorage as the synchronous working store (no call
// site changes), MIRROR every write into IndexedDB, and on boot REHYDRATE
// any key that localStorage lost but IndexedDB still holds. localStorage is
// the truth within a session; IndexedDB is the truth across an eviction.
// (A native SQLite backend under Capacitor is a natural later step for iOS;
// this same mirror pattern ports to it directly.)
//
// This module is pure IndexedDB — it does not import the storage layer, so
// there is no import cycle. storage.js drives it.

const DB_NAME = "astrum", STORE = "kv", VERSION = 1;
let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") { rej(new Error("no indexededb")); return; }
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbPromise;
}

function reqP(request) {
  return new Promise((res, rej) => { request.onsuccess = () => res(request.result); request.onerror = () => rej(request.error); });
}

async function store(mode) {
  const db = await open();
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function idbSet(key, value) {
  try { return await reqP((await store("readwrite")).put(value, key)); } catch { /* durable mirror is best-effort */ }
}
export async function idbGet(key) {
  try { return await reqP((await store("readonly")).get(key)); } catch { return undefined; }
}
export async function idbDelete(key) {
  try { return await reqP((await store("readwrite")).delete(key)); } catch { /* best-effort */ }
}
export async function idbKeys() {
  try { return await reqP((await store("readonly")).getAllKeys()); } catch { return []; }
}

// Ask the browser to move our data into the durable (non-evictable) bucket.
export async function requestPersistent() {
  try {
    if (navigator?.storage?.persist) {
      if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch { /* not supported */ }
  return false;
}

// The per-key decision, pure and unit-testable:
//   both present  → localStorage wins (the working store); leave IDB to catch up
//   only IDB      → restore into localStorage (survived an eviction)
//   only LS       → seed IDB (first run / newly added key)
//   neither       → nothing
export function hydrateDecision(lsValue, idbValue) {
  if (lsValue != null && idbValue != null) return "noop";
  if (lsValue == null && idbValue != null) return "restore";
  if (lsValue != null && idbValue == null) return "seed";
  return "none";
}
