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
import { embedTexts, embeddingsConfigured, hybridRank } from "../ai/embeddings.js";

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

// Hybrid retrieval: BM25 selects a candidate pool, and — when a local
// embedding model is configured — semantic cosine re-ranks it, so "workings
// that felt blocked" can find entries that never used the word. Fails safe
// to pure BM25 on any error or when unconfigured.
export async function ragSearchHybrid(rag, query, k = 6) {
  const pool = ragSearch(rag, query, Math.max(k * 4, 16));
  if (!pool.length || !embeddingsConfigured()) return pool.slice(0, k);
  try {
    const [qv, ...vecs] = await embedTexts([query, ...pool.map(h => h.doc.text)]);
    return hybridRank(pool, vecs, qv).slice(0, k);
  } catch { return pool.slice(0, k); }
}

function formatHits(hits, maxChars) {
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

const GROUNDING_HEADER = "\n\nRETRIEVED PASSAGES (two tiers: the practitioner's own record — journal, grimoire, castings, lab notes, letters — and the app's CANON: source-verified tables of the mansions with their Picatrix IV.9 talismans, the 36 decan images, the Behenian stars, the Picatrix named elections, and the Orphic hymns. Prefer a Canon passage over your training memory when they disagree — the Canon here was verified against the primary sources. Cite what you use; say when both tiers are silent):\n";

// Convenience for call sites that just want a system-prompt addendum: builds
// the corpus fresh, retrieves, and returns a labelled block ("" if nothing).
export function groundingFor(query, opts = {}) {
  try {
    const { text } = ragContext(buildRAG(), query, opts);
    if (!text) return "";
    return GROUNDING_HEADER + text;
  } catch { return ""; }
}

// Async variant used by the Oracle: hybrid (semantic when configured).
export async function groundingForAsync(query, { k = 6, maxChars = 1800 } = {}) {
  try {
    const hits = await ragSearchHybrid(buildRAG(), query, k);
    if (!hits.length) return "";
    const { text } = formatHits(hits, maxChars);
    return text ? GROUNDING_HEADER + text : "";
  } catch { return groundingFor(query, { k, maxChars }); }
}
