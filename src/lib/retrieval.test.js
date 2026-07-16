import { describe, it, expect } from "vitest";
import { tokenize, buildIndex, search } from "./retrieval.js";

describe("tokenize", () => {
  it("lowercases, splits, drops stopwords and single chars", () => {
    expect(tokenize("The Moon is Void of Course!")).toEqual(["moon", "void", "course"]);
  });
  it("handles empty / null", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
  it("keeps occult-domain vocabulary", () => {
    expect(tokenize("Saturn talisman consecration")).toEqual(["saturn", "talisman", "consecration"]);
  });
});

const CORPUS = [
  { id: "a", text: "Venus talisman for love, consecrated in the hour of Venus under a waxing Moon." },
  { id: "b", text: "Saturn working for binding and protection; Saturn in domicile, Saturn hour." },
  { id: "c", text: "A journal note on the waxing Moon and lunar mansions for planting intentions." },
  { id: "d", text: "Jupiter election for wealth and expansion, Jupiter exalted." },
];

describe("BM25 search", () => {
  const idx = buildIndex(CORPUS);

  it("ranks the most relevant document first", () => {
    const r = search(idx, "Venus love talisman", 4);
    expect(r[0].doc.id).toBe("a");
  });
  it("weights repeated rare terms (Saturn) toward the right doc", () => {
    const r = search(idx, "Saturn binding", 4);
    expect(r[0].doc.id).toBe("b");
  });
  it("returns only documents that share query terms", () => {
    const r = search(idx, "Jupiter wealth", 4);
    expect(r.map(x => x.doc.id)).toContain("d");
    expect(r.every(x => x.score > 0)).toBe(true);
  });
  it("returns nothing for an out-of-vocabulary query", () => {
    expect(search(idx, "zzz nonexistent qqq", 4)).toEqual([]);
  });
  it("respects k", () => {
    const r = search(idx, "Moon waxing", 1);
    expect(r).toHaveLength(1);
  });
  it("matches the shared 'waxing Moon' phrase across a and c", () => {
    const ids = search(idx, "waxing Moon", 4).map(x => x.doc.id);
    expect(ids).toContain("a");
    expect(ids).toContain("c");
  });
  it("is safe on an empty index", () => {
    expect(search(buildIndex([]), "anything", 5)).toEqual([]);
  });
});

describe("IDF behaviour", () => {
  it("a term appearing in every doc contributes little; a rare term dominates", () => {
    const docs = [
      { id: "1", text: "moon moon moon common" },
      { id: "2", text: "moon common" },
      { id: "3", text: "moon common saturn" },
    ];
    const idx = buildIndex(docs);
    // "saturn" is rare (df=1) and should pull doc 3 to the top over the common "moon".
    const r = search(idx, "moon saturn", 3);
    expect(r[0].doc.id).toBe("3");
  });
});
