// ═══════════════════════════════════════════════════════════════════════
// EMBEDDINGS — optional semantic layer over the corpus
// ═══════════════════════════════════════════════════════════════════════
// BM25 finds words; embeddings find meaning ("workings that felt blocked"
// matching entries that never said "blocked"). Served by the SAME local
// OpenAI-compatible endpoint the on-device AI already uses (Ollama /
// LM Studio expose /embeddings) — set an embedding model (e.g.
// nomic-embed-text) in the AI settings and the Oracle's grounding upgrades
// to hybrid ranking. Vectors cache in IndexedDB by content hash; everything
// fails safe back to BM25.

import { loadJSON } from "../lib/storage.js";
import { idbGet, idbSet } from "../lib/durable.js";

export function embeddingConfig() {
  const ai = loadJSON("astrum_ai", {}) || {};
  return {
    url: (ai.localUrl || "http://localhost:11434/v1").replace(/\/$/, ""),
    model: ai.embedModel || "",
    key: ai.localKey || "",
  };
}
export function embeddingsConfigured() { return !!embeddingConfig().model; }

// FNV-1a content hash for the vector cache.
export function textHash(text) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}

// Embed texts via the local endpoint, with per-text IndexedDB caching.
// Returns an array aligned with input; null entries where embedding failed.
export async function embedTexts(texts) {
  const cfg = embeddingConfig();
  if (!cfg.model) return texts.map(() => null);
  const out = new Array(texts.length).fill(null);
  const missing = [];
  for (let i = 0; i < texts.length; i++) {
    const cached = await idbGet(`astrum_vec_${cfg.model}_${textHash(texts[i])}`).catch(() => null);
    if (cached) out[i] = cached; else missing.push(i);
  }
  if (!missing.length) return out;
  try {
    const res = await fetch(`${cfg.url}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cfg.key ? { authorization: `Bearer ${cfg.key}` } : {}) },
      body: JSON.stringify({ model: cfg.model, input: missing.map(i => texts[i]) }),
    });
    if (!res.ok) return out;
    const data = await res.json();
    (data.data || []).forEach((d, j) => {
      const i = missing[j];
      if (Array.isArray(d.embedding)) {
        out[i] = d.embedding;
        idbSet(`astrum_vec_${cfg.model}_${textHash(texts[i])}`, d.embedding).catch(() => {});
      }
    });
  } catch {}
  return out;
}

// Blend BM25 and cosine rankings. hits: [{doc, score}]; vecs aligned with
// hits (null-safe); qv: query vector. Pure and testable.
export function hybridRank(hits, vecs, qv, { wLex = 0.45, wSem = 0.55 } = {}) {
  if (!qv || !vecs?.some(Boolean)) return hits;
  const maxLex = Math.max(...hits.map(h => h.score), 1e-9);
  return hits.map((h, i) => {
    const sem = vecs[i] ? Math.max(0, cosine(qv, vecs[i])) : 0;
    return { ...h, hybrid: +(wLex * (h.score / maxLex) + wSem * sem).toFixed(4) };
  }).sort((a, b) => b.hybrid - a.hybrid);
}
