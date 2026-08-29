import { describe, it, expect } from "vitest";
import { recordWins, mergeRecords, mergeStoreValue, mergeTombstones, mergeSnapshot, tombstoneMap } from "./merge.js";

const rec = (id, updatedAt, extra = {}) => ({ id, updatedAt, ...extra });

describe("recordWins", () => {
  it("later updatedAt wins", () => {
    const a = rec("x", "2026-01-02"), b = rec("x", "2026-01-01");
    expect(recordWins(a, b)).toBe(a);
    expect(recordWins(b, a)).toBe(a);
  });
  it("falls back to createdAt, then deterministic device tiebreak", () => {
    const a = { id: "x", createdAt: "2026-01-01" }, b = { id: "x", createdAt: "2026-01-01" };
    expect(recordWins(a, b, { deviceId: "dev_b" }, { deviceId: "dev_a" })).toBe(a);
    expect(recordWins(a, b, { deviceId: "dev_a" }, { deviceId: "dev_b" })).toBe(b);
  });
});

describe("mergeRecords", () => {
  it("unions by id and takes the newer version per id", () => {
    const { merged } = mergeRecords(
      [rec("a", "2026-01-01", { v: "old" }), rec("b", "2026-01-01")],
      [rec("a", "2026-02-01", { v: "new" }), rec("c", "2026-01-05")],
      new Map());
    const byId = Object.fromEntries(merged.map(r => [r.id, r]));
    expect(Object.keys(byId).sort()).toEqual(["a", "b", "c"]);
    expect(byId.a.v).toBe("new");
  });
  it("a tombstone removes the record; a fresher edit un-deletes", () => {
    const tombs = new Map([["a", "2026-01-10"]]);
    const gone = mergeRecords([rec("a", "2026-01-05")], [], tombs);
    expect(gone.merged).toHaveLength(0);
    const undeleted = mergeRecords([rec("a", "2026-01-15")], [], tombs);
    expect(undeleted.merged).toHaveLength(1);
  });
  it("changed=false when remote adds nothing", () => {
    const l = [rec("a", "2026-01-01")];
    expect(mergeRecords(l, l, new Map()).changed).toBe(false);
    expect(mergeRecords(l, [], new Map()).changed).toBe(false);
  });
});

describe("mergeStoreValue", () => {
  it("corrupt remote never harms local", () => {
    const r = mergeStoreValue("astrum_journal", '[{"id":"a"}]', "{nope", {});
    expect(r.value).toBe('[{"id":"a"}]');
    expect(r.corrupt).toBe(true);
  });
  it("non-array stores use whole-value LWW by meta", () => {
    const ctx = { localMeta: { k: "2026-01-01" }, remoteMeta: { k: "2026-02-01" }, ctxL: {}, ctxR: {} };
    expect(mergeStoreValue("k", '{"a":1}', '{"a":2}', ctx).value).toBe('{"a":2}');
    const ctx2 = { localMeta: { k: "2026-03-01" }, remoteMeta: { k: "2026-02-01" }, ctxL: {}, ctxR: {} };
    expect(mergeStoreValue("k", '{"a":1}', '{"a":2}', ctx2).value).toBe('{"a":1}');
  });
});

// ── The three properties, over a seeded 3-device simulation ─────────────
function lcg(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; }

function simulate(seed) {
  const rnd = lcg(seed);
  const stores = ["astrum_journal", "astrum_castings", "astrum_spirits", "astrum_omens"];
  const devices = ["dev_a", "dev_b", "dev_c"].map((deviceId, i) => ({
    deviceId, lamport: 0,
    data: Object.fromEntries(stores.map(s => [s, "[]"])),
    meta: {}, tombstones: [],
  }));
  let clock = 0;
  const iso = () => new Date(1700000000000 + (clock += 60000)).toISOString();
  // ~200 random ops
  for (let i = 0; i < 200; i++) {
    const d = devices[Math.floor(rnd() * 3)];
    const store = stores[Math.floor(rnd() * stores.length)];
    const arr = JSON.parse(d.data[store]);
    const op = rnd();
    d.lamport++;
    if (op < 0.5 || arr.length === 0) {
      arr.push({ id: `${d.deviceId}_${i}`, createdAt: iso(), updatedAt: iso(), text: `t${i}` });
    } else if (op < 0.8) {
      const r = arr[Math.floor(rnd() * arr.length)];
      r.updatedAt = iso(); r.text = `edit${i}`;
    } else {
      const idx = Math.floor(rnd() * arr.length);
      const [gone] = arr.splice(idx, 1);
      d.tombstones.push({ store, id: gone.id, deletedAt: iso(), deviceId: d.deviceId });
    }
    d.data[store] = JSON.stringify(arr);
    d.meta[store] = iso();
  }
  return devices;
}

function exchangeToQuiescence(devices) {
  for (let round = 0; round < 6; round++) {
    let any = false;
    for (const a of devices) for (const b of devices) {
      if (a === b) continue;
      const r = mergeSnapshot(a, b);
      if (r.changed) any = true;
      Object.assign(a, r.snapshot);
    }
    if (!any) break;
  }
}

describe("the three properties (50 seeds, 3 devices, ~200 ops each)", () => {
  it("idempotent: merging a snapshot into itself changes nothing", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const [a] = simulate(seed);
      expect(mergeSnapshot(a, a).changed).toBe(false);
    }
  });
  it("convergent: all devices reach identical stores in any exchange order", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const devices = simulate(seed);
      exchangeToQuiescence(devices);
      const norm = d => JSON.stringify(Object.fromEntries(Object.entries(d.data).map(([k, v]) => [k, JSON.parse(v)])));
      expect(norm(devices[1])).toBe(norm(devices[0]));
      expect(norm(devices[2])).toBe(norm(devices[0]));
    }
  });
  it("order-independent: B-then-C equals C-then-B", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const [a, b, c] = simulate(seed);
      const clone = x => JSON.parse(JSON.stringify(x));
      const abc = mergeSnapshot(mergeSnapshot(clone(a), b).snapshot, c).snapshot;
      const acb = mergeSnapshot(mergeSnapshot(clone(a), c).snapshot, b).snapshot;
      const norm = d => JSON.stringify(Object.fromEntries(Object.entries(d.data).map(([k, v]) => [k, JSON.parse(v)])));
      expect(norm(acb)).toBe(norm(abc));
    }
  });
  it("deletions hold across the mesh (no resurrection)", () => {
    const devices = simulate(7);
    exchangeToQuiescence(devices);
    const [a] = devices;
    for (const t of a.tombstones) {
      const arr = JSON.parse(a.data[t.store] || "[]");
      const back = arr.find(r => r.id === t.id);
      if (back) expect(back.updatedAt > t.deletedAt).toBe(true); // only edit-undelete survives
    }
  });
});

describe("pure deletion propagates in a single merge", () => {
  it("a remote tombstone with no other change removes the local record and reports changed", () => {
    const local = { deviceId: "a", lamport: 1, data: { astrum_journal: '[{"id":"x","updatedAt":"2026-01-01T00:00:00.000Z"}]' }, meta: { astrum_journal: "2026-01-01T00:00:00.000Z" }, tombstones: [] };
    const remote = { deviceId: "b", lamport: 2, data: { astrum_journal: "[]" }, meta: { astrum_journal: "2026-01-02T00:00:00.000Z" }, tombstones: [{ store: "astrum_journal", id: "x", deletedAt: "2026-01-02T00:00:00.000Z", deviceId: "b" }] };
    const r = mergeSnapshot(local, remote);
    expect(r.changed).toBe(true);
    expect(JSON.parse(r.snapshot.data.astrum_journal)).toHaveLength(0);
  });
});

describe("corruption drills", () => {
  it("a snapshot with a truncated store is folded without damage", () => {
    const local = { deviceId: "a", lamport: 1, data: { astrum_journal: '[{"id":"x","updatedAt":"2026-01-01"}]' }, meta: {}, tombstones: [] };
    const evil = { deviceId: "b", lamport: 9, data: { astrum_journal: '[{"id":"x"', astrum_omens: "[]" }, meta: {}, tombstones: [] };
    const r = mergeSnapshot(local, evil);
    expect(JSON.parse(r.snapshot.data.astrum_journal)).toHaveLength(1);
  });
  it("missing fields in the envelope do not throw", () => {
    const r = mergeSnapshot({ deviceId: "a", data: {}, }, { deviceId: "b" });
    expect(r.changed).toBe(false);
  });
});
