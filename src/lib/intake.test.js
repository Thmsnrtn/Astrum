// The intake parser is pure and offline — verify it extracts dated timing
// from the kinds of lines a timing letter actually contains.
import { describe, it, expect } from "vitest";
import { parseFeed, parseAIResponse, mergeEvents, aiExtractionMessages } from "./intake.js";

describe("parseFeed", () => {
  const SAMPLE = `
CIRCLE THRICE — MARCH TIMING

March 20, 3:34 PM ET — Sun enters Aries (Spring Equinox). A powerful moment to begin the year's work.
• Full Moon in Libra, March 14 — good for reconciliation and partnership talismans.
Mercury stations retrograde on March 15th; avoid contracts.
Venus election window: April 2, 10:15am–11:40am — favorable for love talismans.
2026-04-05: Total lunar eclipse in Libra.
Just some prose with no date that should be ignored entirely.
Jupiter enters Cancer 6/9/2026 — a yearlong blessing on home and family.
`;

  it("extracts every dated line and skips the undated prose", () => {
    const ev = parseFeed(SAMPLE, "Circle Thrice", 2026);
    // 6 dated lines, 1 undated prose skipped
    expect(ev.length).toBe(6);
    expect(ev.some(e => e.raw.includes("no date"))).toBe(false);
  });

  it("classifies kinds correctly", () => {
    const ev = parseFeed(SAMPLE, "Circle Thrice", 2026);
    const byDate = Object.fromEntries(ev.map(e => [e.date, e.kind]));
    expect(byDate["2026-03-20"]).toBe("ingress");   // Sun enters Aries
    expect(byDate["2026-03-14"]).toBe("lunation");  // Full Moon
    expect(byDate["2026-03-15"]).toBe("station");   // Mercury stations retrograde
    expect(byDate["2026-04-02"]).toBe("election");  // Venus election window
    expect(byDate["2026-04-05"]).toBe("eclipse");   // lunar eclipse
    expect(byDate["2026-06-09"]).toBe("ingress");   // Jupiter enters Cancer
  });

  it("parses month-name, ISO, and numeric dates alike", () => {
    const ev = parseFeed(SAMPLE, "src", 2026);
    const dates = ev.map(e => e.date);
    expect(dates).toContain("2026-03-20"); // "March 20"
    expect(dates).toContain("2026-04-05"); // "2026-04-05"
    expect(dates).toContain("2026-06-09"); // "6/9/2026"
  });

  it("seeds a missing year from refYear", () => {
    const ev = parseFeed("Full Moon in Scorpio, May 3 — a night for banishing.", "x", 2027);
    expect(ev[0].date).toBe("2027-05-03");
  });

  it("captures a time when present without mistaking the day for a time", () => {
    const ev = parseFeed("March 20, 3:34 PM — Sun enters Aries.", "x", 2026);
    expect(ev[0].time).toMatch(/3:34\s*PM/i);
  });

  it("carries the source and tags each event", () => {
    const ev = parseFeed("March 1 — Venus enters Pisces.", "Rune Soup", 2026);
    expect(ev[0].source).toBe("Rune Soup");
    expect(ev[0].kind).toBe("ingress");
    expect(ev[0].id).toMatch(/^fe_/);
  });

  it("de-dupes identical date+title within one parse", () => {
    const ev = parseFeed("March 1 — Venus enters Pisces.\nMarch 1 — Venus enters Pisces.", "x", 2026);
    expect(ev.length).toBe(1);
  });

  it("returns nothing for text with no dates", () => {
    expect(parseFeed("The Moon is the transmitter of every planet's virtue.", "x", 2026)).toHaveLength(0);
  });
});

describe("parseAIResponse", () => {
  it("parses a clean JSON array of events", () => {
    const reply = JSON.stringify([
      { date: "2026-03-20", time: "3:34 PM", title: "Sun enters Aries", kind: "ingress" },
      { date: "2026-03-14", time: null, title: "Full Moon in Libra", kind: "lunation" },
    ]);
    const ev = parseAIResponse(reply, "Circle Thrice", 2026);
    expect(ev).toHaveLength(2);
    expect(ev[0].date).toBe("2026-03-14"); // sorted
    expect(ev.find(e => e.date === "2026-03-20").kind).toBe("ingress");
    expect(ev.every(e => e.source === "Circle Thrice")).toBe(true);
  });
  it("tolerates code fences and surrounding prose", () => {
    const reply = "Sure! Here are the events:\n```json\n[{\"date\":\"2026-04-02\",\"title\":\"Venus window\",\"kind\":\"election\"}]\n```\nHope that helps.";
    const ev = parseAIResponse(reply, "src", 2026);
    expect(ev).toHaveLength(1);
    expect(ev[0].kind).toBe("election");
  });
  it("coerces an invalid kind to note and recovers a loose date", () => {
    const reply = JSON.stringify([{ date: "May 3", title: "Something", kind: "wobble" }]);
    const ev = parseAIResponse(reply, "src", 2027);
    expect(ev[0].kind).toBe("note");
    expect(ev[0].date).toBe("2027-05-03");
  });
  it("drops items with no usable date", () => {
    const reply = JSON.stringify([{ date: "", title: "no date here", kind: "note" }]);
    expect(parseAIResponse(reply, "src", 2026)).toHaveLength(0);
  });
  it("returns [] for non-JSON or non-array replies", () => {
    expect(parseAIResponse("I could not find any events.", "src", 2026)).toHaveLength(0);
    expect(parseAIResponse('{"date":"2026-01-01"}', "src", 2026)).toHaveLength(0);
  });
});

describe("mergeEvents", () => {
  it("prefers the primary list and backfills unique secondary events", () => {
    const ai = [{ date: "2026-03-20", title: "Sun enters Aries", kind: "ingress", source: "ai" }];
    const heur = [
      { date: "2026-03-20", title: "Sun enters Aries", kind: "ingress", source: "heur" }, // dup → dropped
      { date: "2026-03-14", title: "Full Moon in Libra", kind: "lunation", source: "heur" }, // unique → kept
    ];
    const m = mergeEvents(ai, heur);
    expect(m).toHaveLength(2);
    expect(m.find(e => e.date === "2026-03-20").source).toBe("ai");
  });
});

describe("aiExtractionMessages", () => {
  it("builds a system+user prompt seeded with the reference year", () => {
    const { system, messages } = aiExtractionMessages("some newsletter", 2029);
    expect(system).toContain("2029");
    expect(system).toContain("JSON array");
    expect(messages[0].content).toBe("some newsletter");
  });
});
