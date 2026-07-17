// ═══════════════════════════════════════════════════════════════════════
// CORPUS — the practitioner's own writing, gathered for retrieval
// ═══════════════════════════════════════════════════════════════════════
// Pulls every text the practitioner has authored or ingested — journal,
// grimoire, knowledge base, castings (intents + outcomes + readings), Athanor
// lab notes, and the ingested timing letters — and chunks it into passages the
// BM25 index can search. buildCorpus is pure (takes the loaded stores);
// gatherCorpus reads them from storage.

import { loadJSON } from "./storage.js";

// Split text into ~maxLen-char passages on paragraph/sentence boundaries so a
// chunk is a coherent unit, not a mid-sentence fragment.
export function chunkText(text, maxLen = 600) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];
  const out = [];
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) || [clean];
  let buf = "";
  for (const s of sentences) {
    if (buf.length + s.length > maxLen && buf) { out.push(buf.trim()); buf = ""; }
    if (s.length > maxLen) { // a single very long sentence — hard-split
      for (let i = 0; i < s.length; i += maxLen) out.push(s.slice(i, i + maxLen).trim());
    } else buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

export function gatherSources() {
  return {
    journal: loadJSON("astrum_journal", []),
    grimoire: loadJSON("astrum_grimoire", []),
    knowledge: loadJSON("astrum_knowledge", []),
    castings: loadJSON("astrum_castings", []),
    athanor: loadJSON("astrum_athanor", []),
    feed: loadJSON("astrum_feed", []),
    spirits: loadJSON("astrum_spirits", []),
    omens: loadJSON("astrum_omens", []),
  };
}

// Build a flat, chunked corpus from the loaded stores. Each doc:
//   { id, source, title, text, date, tab }  (tab = screen to jump to)
export function buildCorpus(sources = {}) {
  const docs = [];
  let n = 0;
  const push = (source, tab, title, text, date) => {
    for (const ch of chunkText(text)) {
      docs.push({ id: `${tab}_${n++}`, source, tab, title: (title || source).slice(0, 70), text: ch, date: date || null });
    }
  };

  (sources.journal || []).forEach(e => {
    const t = [e.intent, e.outcome && `Outcome: ${e.outcome}`].filter(Boolean).join(" — ");
    push("Journal", "journal", e.intent || "Working", t, e.date);
  });
  (sources.grimoire || []).forEach(e => {
    push("Grimoire", "grimoire", e.title, [e.title, e.body].filter(Boolean).join("\n"), e.date);
  });
  (sources.knowledge || []).forEach(n2 => {
    push("Knowledge", "learn", n2.title, [n2.title, n2.content].filter(Boolean).join("\n"), n2.date);
  });
  (sources.castings || []).forEach(c => {
    const notes = (c.outcomes || []).map(o => o.note).filter(Boolean).join(" ");
    const reading = c.links?.geomancy?.reading || "";
    const t = [c.intent || c.title, notes && `Outcome: ${notes}`, reading].filter(Boolean).join(" — ");
    push(`Casting (${c.kind})`, "review", c.title, t, c.createdAt);
  });
  (sources.athanor || []).forEach(op => {
    const notes = (op.labNotes || []).map(l => l.text).filter(Boolean).join(" ");
    push("Athanor", "athanor", op.name, [op.name, notes].filter(Boolean).join(": "), op.startedAt);
  });
  (sources.feed || []).forEach(f => {
    push(`Timing letter (${f.source || "feed"})`, "almanac", f.title, [f.title, f.note].filter(Boolean).join(" "), f.date);
  });
  (sources.spirits || []).forEach(s => {
    const log = (s.log || []).map(l => `${l.type}: ${l.text}`).join(" ");
    push("Spirit Court", "spirits", s.name, [s.name, s.epithet, s.notes, s.offerings && `Offerings: ${s.offerings}`, log].filter(Boolean).join(". "), s.createdAt);
  });
  (sources.omens || []).forEach(o => {
    push(`Omen (${o.kind})`, "omens", o.text.slice(0, 50), o.text, o.at);
  });

  return docs;
}

export function gatherCorpus() { return buildCorpus(gatherSources()); }
