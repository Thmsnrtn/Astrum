// ═══════════════════════════════════════════════════════════════════════
// SPIRIT COURT — the relational half of the practice
// ═══════════════════════════════════════════════════════════════════════
// Every tradition in this app says the same thing: timing is the lesser half;
// relationship is the foundation. This store is the register of the beings
// the practitioner actually works with — ancestors by name, planetary
// intelligences, saints, the genius loci — each with its nature, preferred
// offerings, feast days, and a log of offerings given and responses observed.
// Over years this becomes what no book can give: how each ally actually
// responds to *this* practitioner.

import { loadJSON, saveJSON } from "./storage.js";

export const SPIRIT_KINDS = [
  { id: "ancestor",  label: "Ancestor",               icon: "🕯", note: "The beloved dead — most accessible, most motivated." },
  { id: "planetary", label: "Planetary Intelligence", icon: "✶", note: "Angel, intelligence, or spirit of a sphere." },
  { id: "saint",     label: "Saint / Holy Dead",      icon: "✝", note: "The canonized current and the powerful dead." },
  { id: "land",      label: "Genius Loci",            icon: "🌿", note: "The intelligence of a place — river, hill, house, city." },
  { id: "daimon",    label: "Daimon / Familiar",      icon: "◉", note: "The personal daimon or a contracted familiar." },
  { id: "other",     label: "Other",                  icon: "✦", note: "Deities, teachers, and beings that fit no box." },
];

export function loadSpirits() { return loadJSON("astrum_spirits", []); }
export function saveSpirits(list) { saveJSON("astrum_spirits", list); }

const newId = p => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function createSpirit({ name, kind = "ancestor", planet = null, epithet = "", notes = "", offerings = "", feastDays = [] }) {
  const s = { id: newId("sp"), name: name || "Unnamed", kind, planet, epithet, notes, offerings,
    feastDays, // [{month: 1-12, day: 1-31, label}]
    log: [],   // [{id, date ISO, type: offering|contact|petition|response, text}]
    createdAt: new Date().toISOString() };
  saveSpirits([s, ...loadSpirits()]);
  return s;
}

export function updateSpirit(id, patch) {
  const next = loadSpirits().map(s => (s.id === id ? { ...s, ...patch } : s));
  saveSpirits(next);
  return next.find(s => s.id === id) || null;
}

export function deleteSpirit(id) { saveSpirits(loadSpirits().filter(s => s.id !== id)); }

export function addLogEntry(id, { type = "offering", text = "", date = null }) {
  const next = loadSpirits().map(s => s.id === id
    ? { ...s, log: [{ id: newId("sl"), date: date || new Date().toISOString(), type, text }, ...(s.log || [])] }
    : s);
  saveSpirits(next);
  return next.find(s => s.id === id) || null;
}

// ── The Ancestor Calendar ──────────────────────────────────────────────
// All feast-day observances falling within [from, from + days), handling the
// year wrap. Pure — takes the spirit list, returns dated observances sorted
// soonest-first: [{ spiritId, name, kind, label, date }].
export function upcomingObservances(spirits, from, days = 30) {
  const out = [];
  const start = new Date(from);
  for (const s of spirits || []) {
    for (const f of s.feastDays || []) {
      if (!f || !f.month || !f.day) continue;
      for (const yearOff of [0, 1]) {
        const d = new Date(start.getFullYear() + yearOff, f.month - 1, f.day, 9, 0, 0);
        const diff = (d - start) / 86400000;
        if (diff >= 0 && diff < days) {
          out.push({ spiritId: s.id, name: s.name, kind: s.kind, label: f.label || `Feast of ${s.name}`, date: d });
        }
      }
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

// Days since the last offering logged for a spirit (null if never).
export function daysSinceOffering(spirit, now = new Date()) {
  const last = (spirit.log || []).find(l => l.type === "offering");
  if (!last) return null;
  return Math.floor((now - new Date(last.date)) / 86400000);
}
