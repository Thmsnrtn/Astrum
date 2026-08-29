// ═══════════════════════════════════════════════════════════════════════
// SYNC ENGINE — read the peers, merge, write your own snapshot
// ═══════════════════════════════════════════════════════════════════════
// Shared-folder snapshot sync: each device only ever writes its own
// `<deviceId>.json` in the folder, so there is no write contention — the
// whole protocol is read-peers → pure-merge (lib/sync/merge.js, property
// tested) → apply changed stores through rawSet (which mirrors to the
// durable tiers) → write own envelope. A corrupt peer file is skipped and
// reported; local data is only ever merged INTO — nothing here can delete
// the record wholesale.
//
// A transport is { name, available(), list(), read(name), write(name, text) }.
// Real ones live in ./transport/ (Tauri fs, File System Access, iCloud
// plugin); tests use an in-memory folder.

import { STORAGE_KEYS, rawGet, rawSet, loadJSON, saveJSON } from "../storage.js";
import { getDeviceId, getLamport } from "./deviceId.js";
import { loadTombstones, saveTombstones, pruneTombstones } from "./tombstones.js";
import { mergeSnapshot } from "./merge.js";

// Keys that never travel: device identity, sync bookkeeping, volatile UI.
const LOCAL_ONLY = new Set(["astrum_device_id", "astrum_lamport", "astrum_cmd_hist", "astrum_last_export", "astrum_schema"]);

export function buildSyncEnvelope() {
  const data = {};
  for (const k of STORAGE_KEYS) {
    if (LOCAL_ONLY.has(k) || k === "astrum_tombstones" || k === "astrum_meta") continue;
    const v = rawGet(k);
    if (v != null) data[k] = v;
  }
  return {
    app: "astrum-sync", v: 1,
    deviceId: getDeviceId(),
    lamport: getLamport(),
    writtenAt: new Date().toISOString(),
    data,
    meta: loadJSON("astrum_meta", {}),
    tombstones: loadTombstones(),
  };
}

function validEnvelope(env) {
  return env && env.app === "astrum-sync" && env.v === 1 && typeof env.deviceId === "string" && env.data && typeof env.data === "object";
}

// One full sync pass. Returns a report; never throws.
export async function syncNow(transport) {
  const report = { at: new Date().toISOString(), peers: 0, changedStores: [], errors: [], wrote: false };
  const me = getDeviceId();
  try {
    if (!transport || !(await transport.available())) { report.errors.push("no transport"); return report; }
    let names = [];
    try { names = await transport.list(); } catch (e) { report.errors.push("list: " + (e?.message || e)); return report; }
    // local as a snapshot
    let local = {
      deviceId: me, lamport: getLamport(),
      data: buildSyncEnvelope().data,
      meta: loadJSON("astrum_meta", {}),
      tombstones: loadTombstones(),
    };
    const changed = new Set();
    for (const name of names) {
      if (!/\.json$/.test(name) || name === `${me}.json`) continue;
      try {
        const text = await transport.read(name);
        const env = JSON.parse(text);
        if (!validEnvelope(env)) { report.errors.push(`${name}: not an astrum-sync envelope`); continue; }
        report.peers++;
        const r = mergeSnapshot(local, env);
        local = r.snapshot;
        r.changedStores.forEach(k => changed.add(k));
      } catch (e) {
        report.errors.push(`${name}: ${e?.message || e}`); // skip — never abort, never damage local
      }
    }
    // apply merged stores + tombstones back into the app's storage
    for (const k of changed) rawSet(k, local.data[k]);
    if (changed.size) saveJSON("astrum_meta", local.meta || {});
    saveTombstones(pruneTombstonesList(local.tombstones));
    report.changedStores = [...changed];
    // always (re)write our own snapshot so peers see our latest
    try {
      await transport.write(`${me}.json`, JSON.stringify(buildSyncEnvelope()));
      report.wrote = true;
    } catch (e) { report.errors.push("write: " + (e?.message || e)); }
    saveJSON("astrum_sync_state", { lastSync: report.at, lastReport: { peers: report.peers, changedStores: report.changedStores, errors: report.errors } });
  } catch (e) {
    report.errors.push(String(e?.message || e));
  }
  return report;
}

function pruneTombstonesList(list, days = 180, now = new Date()) {
  const cutoff = new Date(now.getTime() - days * 86400000).toISOString();
  return (list || []).filter(t => (t.deletedAt || "") > cutoff);
}

// ── Ambient wiring ─────────────────────────────────────────────────────
let timer = null, running = false;
export function startAutoSync(getTransport, { intervalMs = 5 * 60000 } = {}) {
  const run = async () => {
    if (running) return;
    running = true;
    try { const t = await getTransport(); if (t) await syncNow(t); } catch {}
    running = false;
  };
  run(); // on launch
  timer = setInterval(run, intervalMs);
  const onVis = () => { if (document.visibilityState === "visible") run(); };
  document.addEventListener("visibilitychange", onVis);
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
}
