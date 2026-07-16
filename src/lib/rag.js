// ═══════════════════════════════════════════════════════════════════════
// RAG — grounding the Oracle in the practitioner's own corpus
// ═══════════════════════════════════════════════════════════════════════
// Ties the corpus (what the practitioner has written/ingested) to the BM25
// index and formats retrieved passages for a prompt. Local-first: no network,
// no model download. buildRAG() is built once by a caller and reused; the
// Oracle passes the user's question through ragContext() so its answers can
// cite what this practitioner actually recorded.

import { gatherCorpus } from "./corpus.js";
import { buildIndex, search } from "./retrieval.js";

export function buildRAG() {
  const docs = gatherCorpus();
  return { docs, index: buildIndex(docs), count: docs.length };
}

export function ragSearch(rag, query, k = 6) {
  if (!rag || !query) return [];
  return search(rag.index, query, k);
}

// Format the top passages into a compact context block plus the hit list that
// justifies it. Caps total length so the grounding never crowds out the prompt.
export function ragContext(rag, query, { k = 6, maxChars = 1800 } = {}) {
  const hits = ragSearch(rag, query, k);
  if (!hits.length) return { text: "", hits: [] };
  let out = "", used = [];
  for (const h of hits) {
    const tag = `[${h.doc.source}${h.doc.date ? `, ${h.doc.date}` : ""}]`;
    const line = `${tag} ${h.doc.text}`;
    if (out.length + line.length > maxChars && used.length) break;
    out += line + "\n\n";
    used.push(h);
  }
  return { text: out.trim(), hits: used };
}

// Convenience for call sites that just want a system-prompt addendum: builds
// the corpus fresh, retrieves, and returns a labelled block ("" if nothing).
export function groundingFor(query, opts = {}) {
  try {
    const { text } = ragContext(buildRAG(), query, opts);
    if (!text) return "";
    return `\n\nFROM YOUR OWN RECORD (passages retrieved from the practitioner's journal, grimoire, castings, lab notes, and ingested letters — cite these where relevant, and say when the record is silent):\n${text}`;
  } catch { return ""; }
}
