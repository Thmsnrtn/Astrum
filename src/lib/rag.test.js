import { describe, it, expect } from "vitest";
import { ragSearch, ragContext } from "./rag.js";
import { buildIndex } from "./retrieval.js";

// Build a rag-shaped object directly (buildRAG itself reads storage).
const docs = [
  { id: "j0", source: "Journal", tab: "journal", date: "2026-01-05", text: "Venus talisman for a new relationship; met someone within the month." },
  { id: "g0", source: "Grimoire", tab: "grimoire", date: "2026-02-01", text: "Jupiter rite for wealth and expansion, Jupiter exalted." },
  { id: "f0", source: "Timing letter (Circle Thrice)", tab: "almanac", date: "2026-04-04", text: "Friday Venus hour is ideal for love and reconciliation work." },
];
const rag = { docs, index: buildIndex(docs), count: docs.length };

describe("ragSearch", () => {
  it("returns the Venus passages for a love query", () => {
    const ids = ragSearch(rag, "Venus love relationship", 6).map(r => r.doc.id);
    expect(ids).toContain("j0");
    expect(ids).toContain("f0");
    expect(ids).not.toContain("g0");
  });
  it("is safe with no rag or query", () => {
    expect(ragSearch(null, "x")).toEqual([]);
    expect(ragSearch(rag, "")).toEqual([]);
  });
});

describe("ragContext", () => {
  it("formats retrieved passages with source and date tags", () => {
    const { text, hits } = ragContext(rag, "Venus love", { k: 6 });
    expect(hits.length).toBeGreaterThan(0);
    expect(text).toMatch(/\[Journal, 2026-01-05\]/);
    expect(text).toMatch(/Circle Thrice/);
  });
  it("caps total length", () => {
    const { text } = ragContext(rag, "Venus love wealth", { k: 6, maxChars: 80 });
    expect(text.length).toBeLessThanOrEqual(200); // one passage may exceed cap, but no more
  });
  it("returns empty for an out-of-vocabulary query", () => {
    expect(ragContext(rag, "zzz qqq").text).toBe("");
    expect(ragContext(rag, "zzz qqq").hits).toEqual([]);
  });
});
