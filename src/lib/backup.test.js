// The single highest-value missing test in the repo: the export→import
// round trip. mergeArraysById used to skip any store on a shape mismatch
// silently — only a round-trip test catches that class of loss.
import { describe, it, expect, beforeEach } from "vitest";

const backing = new Map();
globalThis.localStorage = {
  getItem: k => (backing.has(k) ? backing.get(k) : null),
  setItem: (k, v) => backing.set(k, String(v)),
  removeItem: k => backing.delete(k),
};

const { exportAll, importAll } = await import("./backup.js");
const { STORAGE_KEYS } = await import("./storage.js");

const SEED = {
  astrum_profile: JSON.stringify({ name: "T", traditions: ["western-ceremonial"], natal: { date: "1990-06-15" } }),
  astrum_journal: JSON.stringify([{ id: "j1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", intent: "x" }]),
  astrum_castings: JSON.stringify([{ id: "c1", createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z", kind: "working", outcomes: [] }]),
  astrum_spirits: JSON.stringify([{ id: "s1", name: "Grandmother", kind: "ancestor", createdAt: "2026-01-05T00:00:00.000Z", updatedAt: "2026-01-05T00:00:00.000Z", log: [] }]),
  astrum_omens: "[]",
  astrum_notify_prefs: JSON.stringify({ enabled: true }),
  astrum_schema: "3",
};

beforeEach(() => { backing.clear(); Object.entries(SEED).forEach(([k, v]) => backing.set(k, v)); });

describe("export → import round trip", () => {
  it("replace mode restores every store byte-identically", () => {
    const dump = exportAll();
    // wipe
    for (const k of STORAGE_KEYS) backing.delete(k);
    importAll(dump, { merge: false });
    for (const [k, v] of Object.entries(SEED)) {
      expect(backing.get(k), k).toBe(v);
    }
  });

  it("merge mode on an empty device restores all records", () => {
    const dump = exportAll();
    for (const k of STORAGE_KEYS) backing.delete(k);
    backing.set("astrum_schema", "3");
    importAll(dump, { merge: true });
    expect(JSON.parse(backing.get("astrum_journal"))).toHaveLength(1);
    expect(JSON.parse(backing.get("astrum_castings"))).toHaveLength(1);
    expect(JSON.parse(backing.get("astrum_spirits"))).toHaveLength(1);
    expect(JSON.parse(backing.get("astrum_profile")).name).toBe("T");
  });

  it("merge mode with overlapping ids keeps the fresher record and unions the rest", () => {
    const dump = exportAll();
    // local moves on: j1 edited fresher, j2 added
    backing.set("astrum_journal", JSON.stringify([
      { id: "j1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-03-01T00:00:00.000Z", intent: "edited locally" },
      { id: "j2", createdAt: "2026-02-15T00:00:00.000Z", updatedAt: "2026-02-15T00:00:00.000Z", intent: "new local" },
    ]));
    const s = importAll(dump, { merge: true });
    const j = JSON.parse(backing.get("astrum_journal"));
    expect(j.map(r => r.id).sort()).toEqual(["j1", "j2"]);
    expect(j.find(r => r.id === "j1").intent).toBe("edited locally"); // fresher local wins
    expect(s.entriesAdded).toBe(0);
  });

  it("merge honors tombstones in the imported file (deletes do not resurrect)", () => {
    const recent = new Date(Date.now() - 3600000).toISOString();
    const env = JSON.parse(exportAll());
    env.data.astrum_tombstones = JSON.stringify([{ store: "astrum_journal", id: "j1", deletedAt: recent, deviceId: "other" }]);
    env.data.astrum_journal = "[]";
    importAll(JSON.stringify(env), { merge: true });
    expect(JSON.parse(backing.get("astrum_journal"))).toHaveLength(0);
  });

  it("rejects non-backup files loudly", () => {
    expect(() => importAll("{}")).toThrow(/Not an Astrum backup/);
    expect(() => importAll("not json")).toThrow(/Not valid JSON/);
  });
});
