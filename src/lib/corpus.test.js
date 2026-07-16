import { describe, it, expect } from "vitest";
import { chunkText, buildCorpus } from "./corpus.js";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("A short note.")).toEqual(["A short note."]);
  });
  it("collapses whitespace", () => {
    expect(chunkText("a\n\n  b   c")).toEqual(["a b c"]);
  });
  it("splits long text on sentence boundaries", () => {
    const s = ("This is a sentence. ").repeat(60); // ~1200 chars
    const chunks = chunkText(s, 300);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(320);
  });
  it("hard-splits a single very long sentence", () => {
    const s = "word".repeat(400); // 1600 chars, no punctuation
    const chunks = chunkText(s, 500);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });
  it("is empty for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText(null)).toEqual([]);
  });
});

describe("buildCorpus", () => {
  const sources = {
    journal: [{ id: 1, intent: "Venus talisman for love", outcome: "Met someone new", date: "2026-01-05" }],
    grimoire: [{ id: 2, title: "Jupiter Ritual", body: "A working for wealth and expansion.", date: "2026-02-01" }],
    knowledge: [{ id: 3, title: "Via Combusta", content: "The burnt path from 15 Libra to 15 Scorpio." }],
    castings: [{ id: 4, kind: "geomancy", title: "Will the letter come?", intent: "Lost letter", outcomes: [{ note: "It arrived" }], links: { geomancy: { reading: "The Judge favours it." } }, createdAt: "2026-03-01" }],
    athanor: [{ id: 5, name: "Rosemary Spagyric", labNotes: [{ ts: "t", text: "Calcined the salt today" }], startedAt: "2026-01-20" }],
    feed: [{ id: 6, source: "Circle Thrice", title: "Venus hour Friday for love work", note: "", date: "2026-04-04" }],
  };
  const docs = buildCorpus(sources);

  it("gathers every source into docs", () => {
    const srcs = new Set(docs.map(d => d.source));
    expect([...srcs].some(s => s === "Journal")).toBe(true);
    expect([...srcs].some(s => s === "Grimoire")).toBe(true);
    expect([...srcs].some(s => s === "Knowledge")).toBe(true);
    expect([...srcs].some(s => s.startsWith("Casting"))).toBe(true);
    expect([...srcs].some(s => s === "Athanor")).toBe(true);
    expect([...srcs].some(s => s.startsWith("Timing letter"))).toBe(true);
  });
  it("folds outcomes and readings into the casting text", () => {
    const c = docs.find(d => d.source.startsWith("Casting"));
    expect(c.text).toMatch(/arrived/);
    expect(c.text).toMatch(/favours/);
  });
  it("carries a tab for navigation and a date", () => {
    const j = docs.find(d => d.source === "Journal");
    expect(j.tab).toBe("journal");
    expect(j.date).toBe("2026-01-05");
  });
  it("skips empty entries", () => {
    const d = buildCorpus({ journal: [{ id: 9, intent: "", outcome: "" }] });
    expect(d).toHaveLength(0);
  });
  it("handles missing/empty sources", () => {
    expect(buildCorpus({})).toEqual([]);
    expect(buildCorpus()).toEqual([]);
  });
});
