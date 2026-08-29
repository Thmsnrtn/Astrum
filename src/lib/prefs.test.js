// Practice preferences — the doctrine store stays sane.
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { loadPracticePrefs, savePracticePrefs, getVoCMode, setVoCMode } from "./prefs.js";

// The node test env has no localStorage; a Map-backed shim exercises the
// real storage path instead of letting saveJSON silently no-op.
beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const m = new Map();
    globalThis.localStorage = {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k),
      clear: () => m.clear(),
    };
  }
});
beforeEach(() => { try { localStorage.clear(); } catch {} });

describe("practice prefs", () => {
  it("defaults to Lilly's void-of-course doctrine", () => {
    expect(getVoCMode()).toBe("lilly");
    expect(loadPracticePrefs().vocMode).toBe("lilly");
  });
  it("round-trips the hellenistic choice", () => {
    expect(setVoCMode("hellenistic")).toBe("hellenistic");
    expect(getVoCMode()).toBe("hellenistic");
    expect(setVoCMode("lilly")).toBe("lilly");
    expect(getVoCMode()).toBe("lilly");
  });
  it("rejects unknown modes back to lilly (a corrupt store cannot wedge the app)", () => {
    savePracticePrefs({ vocMode: "chaldean-nonsense" });
    expect(getVoCMode()).toBe("lilly");
  });
  it("patches merge instead of replacing", () => {
    savePracticePrefs({ vocMode: "hellenistic" });
    savePracticePrefs({ someFuturePref: true });
    expect(getVoCMode()).toBe("hellenistic");
  });
});
