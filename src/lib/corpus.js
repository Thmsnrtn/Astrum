// ═══════════════════════════════════════════════════════════════════════
// CORPUS — the practitioner's record AND the verified canon, for retrieval
// ═══════════════════════════════════════════════════════════════════════
// Two tiers. The RECORD: every text the practitioner has authored or
// ingested — journal, grimoire, knowledge base, castings, Athanor lab
// notes, timing letters. The CANON: the app's source-verified reference
// tables — mansions with their Picatrix IV.9 talismans, the 36 decans
// with images and significations, the Behenian stars, the Picatrix named
// elections, the Orphic hymns — so the Oracle grounds its answers in the
// SAME primary-source data every screen displays, not in its training's
// fuzzy memory of them. buildCorpus is pure (takes the loaded stores);
// gatherCorpus reads them from storage and appends the canon.

import { loadJSON } from "./storage.js";
import { MANSIONS } from "../data/mansions.js";
import { MANSION_TALISMANS } from "../data/mansionTalismans.js";
import { DECANS } from "../data/decans.js";
import { DECAN_IMAGES } from "../data/decanImages.js";
import { PICATRIX_DECANS } from "../data/picatrixDecans.js";
import { BEHENIAN } from "../data/behenian.js";
import { PICATRIX_ELECTIONS, PICATRIX_PRECONDITIONS } from "../data/picatrixElections.js";
import { ORPHIC_HYMNS } from "../data/orphicHymns.js";

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

// ── The canon tier: static, source-verified reference docs ─────────────
// Built once (the data never changes at runtime) and appended to every
// gathered corpus. Each doc keeps the {id, source, tab, title, text}
// shape so retrieval and the jump-to-screen links work unchanged.
let CANON = null;
export function canonDocs() {
  if (CANON) return CANON;
  const docs = [];
  let n = 0;
  const push = (source, tab, title, text) => {
    for (const ch of chunkText(text, 800)) {
      docs.push({ id: `canon_${n++}`, source, tab, title: title.slice(0, 70), text: ch, date: null });
    }
  };
  MANSIONS.forEach(m => {
    const tal = MANSION_TALISMANS.find(t => t.n === m.n);
    push("Canon — Mansions", "mansions", `Mansion ${m.n} — ${m.arabic} (${m.translation})`,
      [`Mansion ${m.n}, ${m.arabic} "${m.translation}", ${m.sign}, nature ${m.nature}.`, m.meaning,
        m.elect && `Elect: ${m.elect}.`, m.avoid && `Avoid: ${m.avoid}.`,
        tal && `Picatrix IV.9 talisman — lord ${tal.lord} (Agrippa III.24: ${tal.agrippaLord}): ${tal.image} For ${tal.use}.`,
        tal && `Agrippa II.33: ${tal.agrippa}`].filter(Boolean).join(" "));
  });
  DECANS.forEach((d, i) => {
    const pd = PICATRIX_DECANS[i], im = DECAN_IMAGES[i];
    push("Canon — Decans", "decans", `Decan ${d.n} — ${d.name} (${d.sign})`,
      [`Decan ${d.n}, ${d.name}, ${d.sign}, ruled by ${d.ruler}. Tarot: ${d.tarot}.`,
        pd && `Picatrix II.11 image: ${pd.picatrixImage} Signifies: ${pd.picatrixSignification}`,
        im?.a && `Agrippa II.37: ${im.a}`].filter(Boolean).join(" "));
  });
  Object.entries(BEHENIAN).forEach(([name, b]) => {
    push("Canon — Behenian stars", "stars", `${name} (${b.latin})`,
      [`Behenian star ${name}, ${b.latin}. Nature: ${b.nature}.`, `Virtue: ${b.virtue}`,
        `Stone: ${b.stone}. Herb: ${b.herb}.`].filter(Boolean).join(" "));
  });
  PICATRIX_ELECTIONS.forEach(pe => {
    push("Canon — Picatrix elections", "elect", pe.name,
      [`Picatrix named election: ${pe.name} (${pe.planet}).`, `Conditions: ${pe.conditions}`,
        pe.summary, pe.flag && `Textual note: ${pe.flag}`, pe.citation].filter(Boolean).join(" "));
  });
  push("Canon — Picatrix elections", "elect", "Universal preconditions (Picatrix I.4)", PICATRIX_PRECONDITIONS);
  Object.entries(ORPHIC_HYMNS).forEach(([pk, h]) => {
    push("Canon — Orphic hymns", "rite", `Orphic hymn ${h.taylorNumber} — ${h.title}`,
      [`Orphic hymn to the ${h.planet} (${h.deity}), Taylor ${h.taylorNumber}. ${h.fumigation}`,
        h.lines.join(" / ")].join(" "));
  });
  CANON = docs;
  return CANON;
}

export function gatherCorpus() { return buildCorpus(gatherSources()).concat(canonDocs()); }
