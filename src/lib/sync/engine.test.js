// Engine integration: one device against two peer files in an in-memory
// folder — union applied to local storage, tombstones honored, own envelope
// written, second pass idempotent, corrupt peer skipped harmlessly.
import { describe, it, expect, beforeEach } from "vitest";

// localStorage shim BEFORE the engine imports storage.js
const backing = new Map();
globalThis.localStorage = {
  getItem: k => (backing.has(k) ? backing.get(k) : null),
  setItem: (k, v) => backing.set(k, String(v)),
  removeItem: k => backing.delete(k),
};

const { syncNow, buildSyncEnvelope } = await import("./engine.js");

function memTransport(files = new Map()) {
  return {
    name: "mem", files,
    available: async () => true,
    list: async () => [...files.keys()],
    read: async n => { if (!files.has(n)) throw new Error("ENOENT"); return files.get(n); },
    write: async (n, text) => { files.set(n, text); },
  };
}

const env = (deviceId, data, { meta = {}, tombstones = [], lamport = 1 } = {}) =>
  JSON.stringify({ app: "astrum-sync", v: 1, deviceId, lamport, writtenAt: "2026-01-05T00:00:00.000Z", data, meta, tombstones });

beforeEach(() => {
  backing.clear();
  backing.set("astrum_device_id", "dev_local");
  backing.set("astrum_journal", JSON.stringify([{ id: "L1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", text: "local" }]));
});

describe("syncNow", () => {
  it("unions peer records into local storage and writes its own envelope", async () => {
    const t = memTransport(new Map([
      ["dev_b.json", env("dev_b", { astrum_journal: JSON.stringify([{ id: "B1", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", text: "from b" }]) })],
      ["dev_c.json", env("dev_c", { astrum_omens: JSON.stringify([{ id: "C1", at: "2026-01-03", createdAt: "2026-01-03T00:00:00.000Z", updatedAt: "2026-01-03T00:00:00.000Z", kind: "dream", text: "c dream" }]) })],
    ]));
    const r = await syncNow(t);
    expect(r.peers).toBe(2);
    expect(r.errors).toEqual([]);
    const journal = JSON.parse(backing.get("astrum_journal"));
    expect(journal.map(x => x.id).sort()).toEqual(["B1", "L1"]);
    expect(JSON.parse(backing.get("astrum_omens")).map(x => x.id)).toEqual(["C1"]);
    expect(r.wrote).toBe(true);
    const mine = JSON.parse(t.files.get("dev_local.json"));
    expect(mine.deviceId).toBe("dev_local");
    expect(JSON.parse(mine.data.astrum_journal)).toHaveLength(2);
  });

  it("applies peer tombstones (pure deletion propagates)", async () => {
    const recent = new Date(Date.now() - 86400000).toISOString(); // inside the 180-day prune window
    const t = memTransport(new Map([
      ["dev_b.json", env("dev_b", { astrum_journal: "[]" }, { tombstones: [{ store: "astrum_journal", id: "L1", deletedAt: recent, deviceId: "dev_b" }] })],
    ]));
    const r = await syncNow(t);
    expect(r.changedStores).toContain("astrum_journal");
    expect(JSON.parse(backing.get("astrum_journal"))).toHaveLength(0);
    // and the tombstone is now carried locally for further propagation
    expect(JSON.parse(backing.get("astrum_tombstones")).some(x => x.id === "L1")).toBe(true);
  });

  it("second pass is a no-op (idempotent through the full stack)", async () => {
    const t = memTransport(new Map([
      ["dev_b.json", env("dev_b", { astrum_journal: JSON.stringify([{ id: "B1", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }]) })],
    ]));
    await syncNow(t);
    const r2 = await syncNow(t);
    expect(r2.changedStores).toEqual([]);
  });

  it("a corrupt peer is reported and skipped; local survives", async () => {
    const t = memTransport(new Map([
      ["dev_evil.json", "{truncated"],
      ["dev_b.json", env("dev_b", { astrum_journal: JSON.stringify([{ id: "B1", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }]) })],
    ]));
    const r = await syncNow(t);
    expect(r.errors.some(e => e.startsWith("dev_evil.json"))).toBe(true);
    expect(JSON.parse(backing.get("astrum_journal")).map(x => x.id).sort()).toEqual(["B1", "L1"]);
  });

  it("no transport → clean error report, nothing touched", async () => {
    const before = backing.get("astrum_journal");
    const r = await syncNow(null);
    expect(r.errors).toContain("no transport");
    expect(backing.get("astrum_journal")).toBe(before);
  });
});

describe("buildSyncEnvelope", () => {
  it("excludes device identity and bookkeeping from the payload", () => {
    const e = buildSyncEnvelope();
    expect(e.data.astrum_device_id).toBeUndefined();
    expect(e.data.astrum_tombstones).toBeUndefined();
    expect(e.data.astrum_meta).toBeUndefined();
    expect(e.deviceId).toBe("dev_local");
  });
});
