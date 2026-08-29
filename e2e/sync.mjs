// Sync E2E: the real webFsAccess transport over an OPFS DirectoryHandle
// (same DirectoryHandle interface as a picked folder). A peer envelope is
// planted in the folder as if another device wrote it; syncNow must fold it
// in, honor its tombstone, and write this device's own snapshot.
import { launch } from './_browser.mjs';
const b = await launch();
const p = await (await b.newContext()).newPage();
await p.setViewportSize({ width: 1400, height: 1200 });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
await p.goto('http://127.0.0.1:4174/', { waitUntil: 'load' });
await p.evaluate(() => {
  localStorage.setItem('astrum_profile', JSON.stringify({ name: 'T', traditions: ['western-ceremonial'], natal: { date: '1990-06-15', time: '12:00', lat: 51.5, lon: -0.12 } }));
  localStorage.setItem('astrum_schema', '2'); // migration to 3 runs at boot
  localStorage.setItem('astrum_journal', JSON.stringify([
    { id: 'local1', createdAt: '2026-01-01T00:00:00.000Z', planet: 'venus', intent: 'local entry' },
    { id: 'doomed', createdAt: '2026-01-02T00:00:00.000Z', planet: 'mars', intent: 'peer will delete this' },
  ]));
});
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(2500);

const result = await p.evaluate(async () => {
  const out = {};
  // migration check: updatedAt backfilled
  const j = JSON.parse(localStorage.getItem('astrum_journal'));
  out.migrated = j.every(r => !!r.updatedAt);
  // plant a peer file in OPFS, then hand the OPFS dir to the transport hook
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle('astrum-sync-e2e', { create: true });
  const recent = new Date(Date.now() - 3600000).toISOString();
  const peer = {
    app: 'astrum-sync', v: 1, deviceId: 'dev_peer', lamport: 5, writtenAt: recent,
    data: { astrum_journal: JSON.stringify([{ id: 'peer1', createdAt: recent, updatedAt: recent, planet: 'jupiter', intent: 'from the other device' }]) },
    meta: { astrum_journal: recent },
    tombstones: [{ store: 'astrum_journal', id: 'doomed', deletedAt: recent, deviceId: 'dev_peer' }],
  };
  const fh = await dir.getFileHandle('dev_peer.json', { create: true });
  const w = await fh.createWritable(); await w.write(JSON.stringify(peer)); await w.close();
  window.__astrumTestDirHandle = dir;

  const { resolveTransport, syncNow, getDeviceId } = await import('/src/lib/sync/index.js').catch(() => ({}));
  // production build: modules are bundled — use the test hook through the app's own import path instead
  let api = null;
  try { api = { resolveTransport, syncNow, getDeviceId }; if (!api.syncNow) throw 0; } catch { api = window.__astrumSync; }
  if (!api?.syncNow) return { ...out, error: 'sync api unreachable' };
  const t = await api.resolveTransport();
  out.transport = t?.name || null;
  const rep = await api.syncNow(t);
  out.report = { peers: rep.peers, changed: rep.changedStores, errors: rep.errors, wrote: rep.wrote };
  const after = JSON.parse(localStorage.getItem('astrum_journal'));
  out.ids = after.map(r => r.id).sort();
  // own snapshot written?
  const mineName = api.getDeviceId() + '.json';
  let mine = null;
  try { const mf = await dir.getFileHandle(mineName); mine = JSON.parse(await (await mf.getFile()).text()); } catch {}
  out.ownSnapshot = mine ? { device: mine.deviceId, journalCount: JSON.parse(mine.data.astrum_journal).length } : null;
  // idempotence
  const rep2 = await api.syncNow(t);
  out.secondPass = rep2.changedStores;
  return out;
});
console.log(JSON.stringify(result, null, 1));
const ok = result.migrated && result.transport === 'fs-access' && result.report?.peers === 1
  && JSON.stringify(result.ids) === JSON.stringify(['local1', 'peer1'])
  && result.ownSnapshot?.journalCount === 2 && result.secondPass?.length === 0;
console.log(ok ? '✓ SYNC E2E PASS (merge + tombstone + own snapshot + idempotent)' : '✗ SYNC E2E FAIL');
console.log('errors:', errs.length ? JSON.stringify(errs) : 'none');
await b.close();
process.exit(ok ? 0 : 1);
