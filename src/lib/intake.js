// ═══════════════════════════════════════════════════════════════════════
// INTAKE — turn pasted material into knowledge + a dated calendar feed
// ═══════════════════════════════════════════════════════════════════════
// The practitioner pays for timing letters and magazine-style magical
// material (Circle Thrice's almanac, Rune Soup posts). This is a purely
// personal, never-distributed instrument, so ingesting what one has paid
// for — as one's own attributed notes — is exactly marginalia in a bought
// book. parseFeed() reads pasted text with local heuristics (no network,
// so it works on an offline iPad) and extracts dated timing events for the
// almanac; the prose itself becomes an attributed Knowledge Base node.

import { GOLD } from "../ui/theme.js";
import { loadJSON, saveJSON } from "./storage.js";

export function loadFeed() { return loadJSON("astrum_feed", []); }
export function saveFeed(list) { saveJSON("astrum_feed", list); }

const newId = () => `fe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function addFeedEvents(events) {
  const existing = loadFeed();
  // de-dupe by source+date+title
  const seen = new Set(existing.map(e => `${e.source}|${e.date}|${e.title}`));
  const fresh = events.filter(e => !seen.has(`${e.source}|${e.date}|${e.title}`));
  saveFeed([...existing, ...fresh]);
  return fresh.length;
}
export function deleteFeedEvent(id) { saveFeed(loadFeed().filter(e => e.id !== id)); }
export function deleteFeedSource(source) { saveFeed(loadFeed().filter(e => e.source !== source)); }
export function feedForDate(dateStr) { return loadFeed().filter(e => e.date === dateStr); }
export function feedInRange(startStr, endStr) {
  return loadFeed().filter(e => e.date >= startStr && e.date <= endStr).sort((a, b) => a.date.localeCompare(b.date));
}
export function feedSources() { return [...new Set(loadFeed().map(e => e.source))]; }

// ── Heuristic parser ────────────────────────────────────────────────────

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)\b|\b(\d{1,2}):(\d{2})\b/i;

// Event classification by keyword — order matters (most specific first).
const KINDS = [
  { kind: "eclipse",  re: /\beclipse\b/i },
  { kind: "lunation", re: /\b(full moon|new moon|first quarter|last quarter|full|new)\b/i, guard: /\bmoon\b/i },
  { kind: "station",  re: /\b(stations?|retrograde|goes direct|turns direct|direct|rx)\b/i },
  { kind: "ingress",  re: /\b(enters|ingress(?:es)?|moves into|into)\b/i },
  { kind: "voc",      re: /\b(void of course|v\.?o\.?c\.?|void)\b/i },
  { kind: "election", re: /\b(election|window|auspicious|talisman|elect|favorable|good for|best for|work for)\b/i },
];

function classify(line) {
  for (const k of KINDS) {
    if (k.re.test(line) && (!k.guard || k.guard.test(line))) return k.kind;
  }
  return "note";
}

// Find a date in a line. Returns {month, day, year?} or null.
function findDate(line, refYear) {
  // "March 20", "Mar 20th", "20 March", optionally with a year
  let m = new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`, "i").exec(line);
  if (m) return { month: MONTHS[m[1].slice(0, 3).toLowerCase()], day: +m[2], year: m[3] ? +m[3] : null };
  m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}\\.?(?:,?\\s*(\\d{4}))?`, "i").exec(line);
  if (m) return { month: MONTHS[m[2].slice(0, 3).toLowerCase()], day: +m[1], year: m[3] ? +m[3] : null };
  // numeric "3/20", "03/20/2026", "2026-03-20"
  m = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(line);
  if (m) return { month: +m[2] - 1, day: +m[3], year: +m[1] };
  m = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(line);
  if (m) { let y = m[3] ? +m[3] : null; if (y != null && y < 100) y += 2000; return { month: +m[1] - 1, day: +m[2], year: y }; }
  return null;
}

function findTime(line) {
  const t = TIME_RE.exec(line);
  if (!t) return null;
  return t[0].trim();
}

function toISO(month, day, year) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Split pasted text into candidate lines (handles bullet/newline/sentence forms).
function toLines(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .flatMap(l => l.split(/(?<=[.;])\s+(?=[A-Z0-9])/)) // sentence-ish within a line
    .map(l => l.replace(/^[\s•\-*–—·>]+/, "").trim())
    .filter(l => l.length > 3);
}

// Parse pasted text into candidate feed events. refYear seeds dates that
// omit a year (a Circle Thrice letter for March won't repeat the year on
// every line); undated lines are skipped. Returns events sorted by date.
export function parseFeed(text, source, refYear) {
  const year0 = refYear || new Date().getFullYear();
  const events = [];
  toLines(text).forEach(line => {
    const dt = findDate(line, year0);
    if (!dt) return;
    const year = dt.year || year0;
    const iso = toISO(dt.month, dt.day, year);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || dt.day < 1 || dt.day > 31 || dt.month < 0 || dt.month > 11) return;
    const time = findTime(line.replace(new RegExp(`${MONTH_RE}\\.?\\s+\\d{1,2}`, "i"), "")); // avoid matching the date's own day as a time
    const kind = classify(line);
    events.push({
      id: newId(),
      source: source || "Imported",
      date: iso,
      time: time || null,
      title: line.length > 140 ? line.slice(0, 137) + "…" : line,
      kind,
      note: "",
      raw: line,
      addedAt: new Date().toISOString(),
    });
  });
  // de-dupe within this parse by date+title
  const seen = new Set();
  return events.filter(e => { const k = e.date + "|" + e.title; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── AI-assisted extraction (optional; heuristic remains the offline core) ─
// The prompt and the response parser live here (pure/testable); the actual
// model call happens in the UI via the configured AI engine, so a local or
// on-device engine extracts timing offline too.
const VALID_KINDS = ["ingress", "station", "lunation", "eclipse", "election", "voc", "note"];

export function aiExtractionMessages(text, refYear) {
  const year = refYear || new Date().getFullYear();
  const system = `You extract astrological and magical timing events from a newsletter or post. Output ONLY a JSON array — no prose, no code fences. Each element: {"date":"YYYY-MM-DD","time":"3:34 PM" or null,"title":"one short line","kind":"ingress|station|lunation|eclipse|election|voc|note"}. Use the year ${year} for any date that omits one. Include only genuinely dated events; skip undated commentary. "kind": ingress = a body entering a sign; station = retrograde/direct; lunation = new/full/quarter Moon; eclipse; election = an auspicious window or talisman timing; voc = void-of-course Moon; note = anything else dated.`;
  return { system, messages: [{ role: "user", content: text.slice(0, 8000) }] };
}

// Parse a model's JSON reply into feed events. Tolerant of code fences and
// stray prose around the array; validates each field.
export function parseAIResponse(reply, source, refYear) {
  const year = refYear || new Date().getFullYear();
  let arr;
  try {
    const start = reply.indexOf("["), end = reply.lastIndexOf("]");
    if (start < 0 || end < start) return [];
    arr = JSON.parse(reply.slice(start, end + 1));
  } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    let date = typeof it.date === "string" ? it.date.trim() : "";
    // accept YYYY-MM-DD; otherwise try to read a date out of the string
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const d = findDate(String(it.date || it.title || ""), year);
      if (!d) continue;
      date = toISO(d.month, d.day, d.year || year);
    }
    const [y, m, dd] = date.split("-").map(Number);
    if (!(y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && dd >= 1 && dd <= 31)) continue;
    const title = String(it.title || "").trim().slice(0, 140) || "(untitled)";
    const kind = VALID_KINDS.includes(it.kind) ? it.kind : "note";
    out.push({
      id: newId(), source: source || "Imported", date, time: it.time && String(it.time).trim() ? String(it.time).trim() : null,
      title, kind, note: "", raw: title, addedAt: new Date().toISOString(),
    });
  }
  return dedupe(out);
}

function dedupe(events) {
  const seen = new Set();
  return events.filter(e => { const k = e.date + "|" + e.title; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Merge two event lists (e.g. AI + heuristic), preferring the first on a
// date+title collision so nothing either method found is lost.
export function mergeEvents(primary, secondary) {
  const key = e => e.date + "|" + e.title.toLowerCase().slice(0, 40);
  const seen = new Set(primary.map(key));
  return dedupe([...primary, ...secondary.filter(e => !seen.has(key(e)))]);
}

export const FEED_KIND_META = {
  ingress:  { glyph: "≡", col: "#7CB8E0", label: "Ingress" },
  station:  { glyph: "℞", col: "#C878A8", label: "Station" },
  lunation: { glyph: "☽", col: "#C8DDED", label: "Lunation" },
  eclipse:  { glyph: "◉", col: "#D24B31", label: "Eclipse" },
  election: { glyph: "◈", col: GOLD, label: "Election" },
  voc:      { glyph: "⊘", col: "#E09060", label: "Void" },
  note:     { glyph: "✎", col: "#9A8060", label: "Note" },
};
