// Durable IndexedDB mirror: roundtrip, the hydrate decision, and the boot
// reconciliation that restores localStorage after an eviction.
import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";

// fresh localStorage per test
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
  vi.resetModules();
});

describe("hydrateDecision", () => {
  it("chooses correctly for every combination", async () => {
    const { hydrateDecision } = await import("./durable.js");
    expect(hydrateDecision("x", "y")).toBe("noop");     // both → LS wins
    expect(hydrateDecision(null, "y")).toBe("restore"); // only IDB → restore
    expect(hydrateDecision("x", null)).toBe("seed");    // only LS → seed IDB
    expect(hydrateDecision(null, null)).toBe("none");
  });
});

describe("idb roundtrip", () => {
  it("set/get/delete/keys", async () => {
    const { idbSet, idbGet, idbDelete, idbKeys } = await import("./durable.js");
    await idbSet("astrum_x", '{"a":1}');
    expect(await idbGet("astrum_x")).toBe('{"a":1}');
    expect(await idbKeys()).toContain("astrum_x");
    await idbDelete("astrum_x");
    expect(await idbGet("astrum_x")).toBeUndefined();
  });
});

describe("write mirroring + rehydration", () => {
  it("saveJSON mirrors to IndexedDB", async () => {
    const { saveJSON } = await import("./storage.js");
    const { idbGet } = await import("./durable.js");
    saveJSON("astrum_journal", [{ id: 1, intent: "a" }]);
    // mirror is async fire-and-forget; give the put a tick
    await new Promise(r => setTimeout(r, 20));
    expect(JSON.parse(await idbGet("astrum_journal"))).toEqual([{ id: 1, intent: "a" }]);
  });

  it("initDurable restores localStorage from IndexedDB after an eviction", async () => {
    const storage = await import("./storage.js");
    const { idbGet } = await import("./durable.js");
    // seed a record and let it mirror
    storage.saveJSON("astrum_grimoire", [{ id: 9, title: "kept" }]);
    await new Promise(r => setTimeout(r, 20));
    expect(await idbGet("astrum_grimoire")).toBeTruthy();
    // simulate iOS evicting localStorage (IndexedDB survives)
    localStorage.clear();
    expect(storage.loadJSON("astrum_grimoire", null)).toBe(null);
    // boot reconciliation restores it
    const summary = await storage.initDurable();
    expect(summary.restored).toBeGreaterThanOrEqual(1);
    expect(storage.loadJSON("astrum_grimoire", null)).toEqual([{ id: 9, title: "kept" }]);
  });

  it("initDurable seeds IndexedDB from a localStorage-only key", async () => {
    const storage = await import("./storage.js");
    const { idbGet } = await import("./durable.js");
    // write directly to localStorage without mirroring
    localStorage.setItem("astrum_castings", JSON.stringify([{ id: "c1" }]));
    await storage.initDurable();
    expect(JSON.parse(await idbGet("astrum_castings"))).toEqual([{ id: "c1" }]);
  });
});
