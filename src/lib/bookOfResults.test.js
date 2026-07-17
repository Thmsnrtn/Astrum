import { describe, it, expect } from "vitest";
import { composeBook } from "./bookOfResults.js";

const castings = [
  { id: "1", createdAt: "2026-03-01T12:00:00Z", kind: "working", title: "Venus rite", intent: "love", planet: "venus",
    conditions: { moonPhase: "Full", mansion: { n: 4 }, hourPlanet: "venus" },
    outcomes: [{ id: "o1", date: "2026-04-01", verdict: "hit", note: "It landed" }], status: "closed" },
  { id: "2", createdAt: "2025-01-01T12:00:00Z", kind: "sigil", title: "Old one", outcomes: [], status: "open" }, // out of range
];
const omens = [{ id: "a", at: "2026-05-10T08:00:00Z", kind: "dream", text: "silver river" }];
const grimoire = [{ id: "g", title: "Jupiter Rite", date: "2026-02-01" }];

describe("composeBook", () => {
  const html = composeBook({ from: "2026-01-01", to: "2027-01-01", castings, omens, grimoire, title: "Year One" });

  it("includes only records within the span", () => {
    expect(html).toContain("Venus rite");
    expect(html).not.toContain("Old one");
  });
  it("carries verdicts, outcome notes, and conditions", () => {
    expect(html).toContain("✦ Hit");
    expect(html).toContain("It landed");
    expect(html).toMatch(/Full · mansion 4 · hour of venus/);
  });
  it("summarizes the year in number", () => {
    expect(html).toMatch(/1\/1/);        // judged/total in range
    expect(html).toContain("100%");
    expect(html).toContain("1 omens");
  });
  it("includes omens and grimoire sections", () => {
    expect(html).toContain("silver river");
    expect(html).toContain("Jupiter Rite");
  });
  it("escapes HTML in user text", () => {
    const h = composeBook({ from: "2026-01-01", to: "2027-01-01", castings: [{ id: "x", createdAt: "2026-02-02", kind: "working", title: "<script>alert(1)</script>", outcomes: [], status: "open" }] });
    expect(h).not.toContain("<script>alert");
    expect(h).toContain("&lt;script&gt;");
  });
  it("is a complete printable document", () => {
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("@media print");
    expect(html).toContain("Year One");
  });
});
