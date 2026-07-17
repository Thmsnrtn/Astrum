import { describe, it, expect } from "vitest";
import { textHash, cosine, hybridRank } from "./embeddings.js";

describe("textHash", () => {
  it("is stable and content-sensitive", () => {
    expect(textHash("venus talisman")).toBe(textHash("venus talisman"));
    expect(textHash("venus talisman")).not.toBe(textHash("venus talismen"));
  });
});

describe("cosine", () => {
  it("is 1 for parallel, 0 for orthogonal, −1 for opposite", () => {
    expect(cosine([1, 0], [2, 0])).toBeCloseTo(1, 6);
    expect(cosine([1, 0], [0, 3])).toBeCloseTo(0, 6);
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
  });
  it("is 0 for null/mismatched inputs", () => {
    expect(cosine(null, [1])).toBe(0);
    expect(cosine([1, 2], [1])).toBe(0);
  });
});

describe("hybridRank", () => {
  const hits = [
    { doc: { id: "a" }, score: 10 },  // lexically strongest
    { doc: { id: "b" }, score: 2 },   // lexically weak, semantically close
    { doc: { id: "c" }, score: 5 },
  ];
  const qv = [1, 0];
  it("lets a semantically close doc overtake a lexically stronger one", () => {
    const vecs = [[0, 1], [1, 0], [0.5, 0.5]]; // a orthogonal, b parallel
    const ranked = hybridRank(hits, vecs, qv);
    expect(ranked[0].doc.id).toBe("b");
  });
  it("falls back to input order when no vectors exist", () => {
    expect(hybridRank(hits, [null, null, null], qv).map(h => h.doc.id)).toEqual(["a", "b", "c"]);
    expect(hybridRank(hits, null, qv)).toBe(hits);
    expect(hybridRank(hits, [[1, 0]], null)).toBe(hits);
  });
  it("null vectors score zero semantically but keep lexical weight", () => {
    const ranked = hybridRank(hits, [[1, 0], null, null], qv);
    expect(ranked[0].doc.id).toBe("a"); // strongest lexical AND parallel
  });
});
