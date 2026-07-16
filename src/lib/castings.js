// ═══════════════════════════════════════════════════════════════════════
// CASTINGS — the Operator's Loop
// ═══════════════════════════════════════════════════════════════════════
// Every act of magic (working, sigil, talisman, election commitment, horary,
// athanor operation) produces a casting record: the intent, the sky as it
// stood (a conditions snapshot), links to the artifacts it produced, and a
// growing list of outcomes. Over time this becomes the practitioner's own
// dataset of what actually works.

import { loadJSON, saveJSON, getSchemaVersion, setSchemaVersion } from "./storage.js";

export const CASTING_KINDS = ["working", "sigil", "talisman", "election", "horary", "athanor", "geomancy"];
export const VERDICTS = ["hit", "partial", "miss", "unknown"];

export function loadCastings() { return loadJSON("astrum_castings", []); }
export function saveCastings(list) { saveJSON("astrum_castings", list); }

function newId() { return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

export function createCasting({ kind, title, intent = "", planet = null, tradition = null, conditions = null, links = {}, createdAt = null }) {
  const entry = {
    id: newId(),
    createdAt: createdAt || new Date().toISOString(),
    kind,
    title: title || "Untitled working",
    intent,
    planet,
    tradition,
    conditions,
    links,
    outcomes: [],
    status: "open",
  };
  saveCastings([entry, ...loadCastings()]);
  return entry;
}

export function updateCasting(id, patch) {
  const list = loadCastings();
  const next = list.map(c => (c.id === id ? { ...c, ...patch } : c));
  saveCastings(next);
  return next.find(c => c.id === id) || null;
}

export function deleteCasting(id) {
  saveCastings(loadCastings().filter(c => c.id !== id));
}

export function addOutcome(id, { verdict = "unknown", note = "", date = null }) {
  const list = loadCastings();
  const next = list.map(c => {
    if (c.id !== id) return c;
    const outcome = { id: newId(), date: date || new Date().toISOString(), verdict, note };
    return { ...c, outcomes: [...(c.outcomes || []), outcome] };
  });
  saveCastings(next);
  return next.find(c => c.id === id) || null;
}

export function closeCasting(id) { return updateCasting(id, { status: "closed" }); }

// The effective verdict of a casting is its most recent decisive outcome.
export function effectiveVerdict(casting) {
  const decisive = (casting.outcomes || []).filter(o => o.verdict && o.verdict !== "unknown");
  return decisive.length ? decisive[decisive.length - 1].verdict : null;
}

// ── Local statistics (no API required) ─────────────────────────────────

export function computeStats(castings) {
  const judged = castings.filter(c => effectiveVerdict(c));
  const rate = list => {
    const hits = list.filter(c => effectiveVerdict(c) === "hit").length;
    const partial = list.filter(c => effectiveVerdict(c) === "partial").length;
    return { n: list.length, hits, partial, pct: list.length ? Math.round(((hits + partial * 0.5) / list.length) * 100) : null };
  };
  const groupBy = keyFn => {
    const groups = {};
    judged.forEach(c => {
      const k = keyFn(c);
      if (k == null) return;
      (groups[k] = groups[k] || []).push(c);
    });
    return Object.entries(groups).map(([k, list]) => ({ key: k, ...rate(list) })).sort((a, b) => b.n - a.n);
  };
  return {
    total: castings.length,
    judged: judged.length,
    open: castings.filter(c => c.status === "open").length,
    overall: rate(judged),
    byPlanet: groupBy(c => c.planet),
    byHourRuler: groupBy(c => c.conditions?.hourPlanet),
    byMoonPhase: groupBy(c => c.conditions?.moonPhase),
    byMansion: groupBy(c => c.conditions?.mansion ? `${c.conditions.mansion.n}. ${c.conditions.mansion.name}` : null),
    byVoC: groupBy(c => c.conditions?.voc ? (c.conditions.voc.isVoC ? "Void of Course" : "Not Void") : null),
    byKind: groupBy(c => c.kind),
    byElectionBand: groupBy(c => {
      const s = c.conditions?.election?.score;
      if (s == null) return null;
      return s >= 90 ? "90+ Talismanic" : s >= 75 ? "75–89 Excellent" : s >= 60 ? "60–74 Good" : s >= 45 ? "45–59 Acceptable" : "< 45 Marginal";
    }),
  };
}

// Compact TSV of the dataset for AI correlation analysis.
export function castingsToTSV(castings) {
  const rows = [["kind", "planet", "intent", "day_ruler", "hour", "moon_phase", "mansion", "voc", "election_score", "verdict", "outcome_notes"].join("\t")];
  castings.forEach(c => {
    const v = effectiveVerdict(c) || (c.status === "open" ? "pending" : "unknown");
    const notes = (c.outcomes || []).map(o => o.note).filter(Boolean).join(" | ").replace(/[\t\n]/g, " ").slice(0, 160);
    rows.push([
      c.kind, c.planet || "", (c.intent || c.title || "").replace(/[\t\n]/g, " ").slice(0, 80),
      c.conditions?.dayRuler || "", c.conditions?.hourPlanet || "",
      c.conditions?.moonPhase || "", c.conditions?.mansion?.name || "",
      c.conditions?.voc?.isVoC ? "yes" : "no",
      c.conditions?.election?.score ?? "", v, notes,
    ].join("\t"));
  });
  return rows.join("\n");
}

// ── Migration: schema 1 → 2 ─────────────────────────────────────────────
// Builds castings retroactively from the existing journal and sigil stores.
// Additive and idempotent: old stores are never touched, and the schema
// version gate ensures it runs once. computeConditionsAt(date) is supplied
// by the caller (it needs the ephemeris engine); retro-computed conditions
// are flagged approximate.

export function migrateToCastings({ computeConditionsAt }) {
  if (getSchemaVersion() >= 2) return { ran: false };
  const existing = loadCastings();
  const created = [];
  const journal = loadJSON("astrum_journal", []);
  journal.forEach(e => {
    if (existing.some(c => c.links?.journalId === e.id)) return;
    let conditions = null;
    try {
      const d = new Date(`${e.date}T12:00:00`);
      if (!isNaN(d.getTime())) conditions = computeConditionsAt(d);
    } catch {}
    created.push({
      id: `c_mig_j_${e.id}`,
      createdAt: e.date ? `${e.date}T12:00:00.000Z` : new Date().toISOString(),
      kind: "working",
      title: (e.intent || "Journal working").slice(0, 60),
      intent: e.intent || "",
      planet: e.planet || null,
      tradition: null,
      conditions,
      links: { journalId: e.id },
      outcomes: e.outcome ? [{ id: `o_mig_j_${e.id}`, date: e.date || new Date().toISOString(), verdict: "unknown", note: e.outcome }] : [],
      status: e.outcome ? "closed" : "open",
    });
  });
  const sigils = loadJSON("astrum_sigils", []);
  sigils.forEach(s => {
    if (existing.some(c => c.links?.sigilId === s.id)) return;
    let conditions = null;
    try {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) conditions = computeConditionsAt(d);
    } catch {}
    const fulfilled = s.status === "fulfilled";
    created.push({
      id: `c_mig_s_${s.id}`,
      createdAt: s.date || new Date().toISOString(),
      kind: "sigil",
      title: (s.intent || s.word || "Sigil").slice(0, 60),
      intent: s.intent || "",
      planet: s.planet || null,
      tradition: null,
      conditions,
      links: { sigilId: s.id },
      outcomes: fulfilled ? [{ id: `o_mig_s_${s.id}`, date: new Date().toISOString(), verdict: "hit", note: "Marked fulfilled (migrated)" }] : [],
      status: fulfilled || s.status === "retired" ? "closed" : "open",
    });
  });
  if (created.length) saveCastings([...created, ...existing]);
  setSchemaVersion(2);
  return { ran: true, created: created.length };
}
