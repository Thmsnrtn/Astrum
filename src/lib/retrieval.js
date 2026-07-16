// ═══════════════════════════════════════════════════════════════════════
// RETRIEVAL — BM25 over the practitioner's own corpus
// ═══════════════════════════════════════════════════════════════════════
// A pure, dependency-free lexical search: Okapi BM25. For a personal corpus
// (hundreds to low-thousands of passages) it is fast, fully offline, and needs
// no model download — the right primary for a local-first app. The Oracle uses
// it to ground its answers in what this practitioner has actually written and
// ingested, rather than its generic priors. An embedding backend can layer on
// later; this is the verifiable core.

const K1 = 1.5;
const B = 0.75;

// A compact English stopword set — enough to keep BM25 focused without a
// dependency. Occult-domain words are deliberately NOT filtered.
const STOP = new Set("a an the and or but if then else of to in on at by for with from as is are was were be been being this that these those it its i you he she they we me my your his her their our do does did done have has had will would can could should may might must not no yes so than too very just about into over under out up down".split(" "));

// Lowercase, split on non-alphanumerics, drop stopwords and 1-char tokens.
export function tokenize(text) {
  if (!text) return [];
  return String(text).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1 && !STOP.has(t));
}

// Build a BM25 index over docs: [{ id, text, ...meta }]. Returns an index the
// search fn consumes; keeps the original docs for result hydration.
export function buildIndex(docs) {
  const postings = new Map(); // term -> Map(docIdx -> tf)
  const lengths = [];
  let totalLen = 0;
  docs.forEach((d, i) => {
    const toks = tokenize(d.text);
    lengths[i] = toks.length;
    totalLen += toks.length;
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [t, c] of tf) {
      if (!postings.has(t)) postings.set(t, new Map());
      postings.get(t).set(i, c);
    }
  });
  const N = docs.length;
  const avgdl = N ? totalLen / N : 0;
  const idf = new Map();
  for (const [t, plist] of postings) {
    const df = plist.size;
    idf.set(t, Math.log(1 + (N - df + 0.5) / (df + 0.5)));
  }
  return { docs, postings, lengths, avgdl, N, idf };
}

// Score every doc against the query and return the top-k as
// [{ doc, score }], score-descending. Docs with no query-term overlap are
// omitted. minScore filters weak matches (0 keeps all overlaps).
export function search(index, query, k = 5, minScore = 0) {
  if (!index || !index.N) return [];
  const qterms = [...new Set(tokenize(query))];
  const scores = new Map();
  for (const t of qterms) {
    const plist = index.postings.get(t);
    if (!plist) continue;
    const idf = index.idf.get(t);
    for (const [i, tf] of plist) {
      const dl = index.lengths[i];
      const denom = tf + K1 * (1 - B + (B * dl) / (index.avgdl || 1));
      const s = idf * (tf * (K1 + 1)) / (denom || 1);
      scores.set(i, (scores.get(i) || 0) + s);
    }
  }
  return [...scores.entries()]
    .filter(([, s]) => s > minScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([i, s]) => ({ doc: index.docs[i], score: +s.toFixed(4) }));
}
