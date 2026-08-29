// ═══════════════════════════════════════════════════════════════════════
// SRS — spaced repetition over the canon
// ═══════════════════════════════════════════════════════════════════════
// The primers are reference-grade; this turns reference into internalized
// knowledge. A small SM-2-style scheduler over the app's own canon — the 28
// mansions, 16 geomantic figures, 7 lots, 8 phases (and any extra cards the
// caller supplies, e.g. the 36 decans from the App table). One card a day
// with the briefing is the intended dose.

import { loadJSON, saveJSON } from "./storage.js";
import { MANSIONS } from "../data/mansions.js";
import { FIGURES } from "../data/geomancy.js";
import { LOTS } from "../engine/lots.js";
import { PHASES } from "./lunation.js";
import { BEHENIAN } from "../data/behenian.js";
import { BOUNDS } from "../engine/astro.js";
import { DECANS } from "../data/decans.js";
import { PICATRIX_DECANS } from "../data/picatrixDecans.js";
import { MANSION_TALISMANS } from "../data/mansionTalismans.js";

// ── Scheduling (pure) ──────────────────────────────────────────────────
// state: { ease, intervalDays, due (ISO), reps }. grade: "again"|"good"|"easy".
export function initialState(now = new Date()) {
  return { ease: 2.3, intervalDays: 0, due: new Date(now).toISOString(), reps: 0 };
}

export function review(state, grade, now = new Date()) {
  let { ease, intervalDays, reps } = state || initialState(now);
  if (grade === "again") {
    ease = Math.max(1.3, ease - 0.2); intervalDays = 0; reps = 0;
  } else if (grade === "good") {
    intervalDays = intervalDays ? Math.round(intervalDays * ease) : 1; reps += 1;
  } else { // easy
    ease = Math.min(3.0, ease + 0.1);
    intervalDays = intervalDays ? Math.round(intervalDays * ease * 1.4) : 3; reps += 1;
  }
  intervalDays = Math.min(intervalDays, 3650); // cap at ~10 years
  const due = new Date(new Date(now).getTime() + Math.max(0.25, intervalDays) * 86400000);
  return { ease: +ease.toFixed(2), intervalDays, due: due.toISOString(), reps };
}

export function isDue(state, now = new Date()) {
  if (!state) return true; // never seen → due
  return new Date(state.due) <= now;
}

// ── The deck ───────────────────────────────────────────────────────────
export function buildDeck(extra = []) {
  const cards = [];
  MANSIONS.forEach(m => cards.push({ id: `mansion_${m.n}`, topic: "Mansion",
    front: `Mansion ${m.n} — ${m.arabic} (${m.translation})`, back: `${m.meaning}${m.elect ? ` · Elect: ${m.elect}` : ""}${m.avoid ? ` · Avoid: ${m.avoid}` : ""}` }));
  FIGURES.forEach(f => cards.push({ id: `figure_${f.name}`, topic: "Geomantic figure",
    front: `${f.name} (${f.english})`, back: f.meaning }));
  LOTS.forEach(l => cards.push({ id: `lot_${l.id}`, topic: "Hermetic lot",
    front: `Lot of ${l.name}`, back: l.meaning }));
  PHASES.forEach(p => cards.push({ id: `phase_${p.key}`, topic: "Lunar phase",
    front: p.name, back: p.keynote }));
  Object.entries(BEHENIAN).forEach(([name, b]) => cards.push({ id: `behenian_${name}`, topic: "Behenian star",
    front: `${name} (${b.latin})`, back: `${b.virtue} · Stone: ${b.stone} · Herb: ${b.herb} · Nature: ${b.nature}` }));
  const SIGN_NAMES_SRS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const CAP = p => p[0].toUpperCase() + p.slice(1);
  BOUNDS.forEach((bs, si) => cards.push({ id: `bounds_${si}`, topic: "Egyptian bounds",
    front: `The bounds of ${SIGN_NAMES_SRS[si]}`,
    back: bs.map(b => `${CAP(b.p)} ${b.f}–${b.t}°`).join(" · ") + " — a planet in its own bound gains +2 essential dignity." }));
  PICATRIX_DECANS.forEach(pd => {
    const d = DECANS[pd.n - 1];
    cards.push({ id: `decan_${pd.n}`, topic: "Decan image",
      front: `Decan ${pd.n} — ${d.name} (${d.sign}, ruled by ${CAP(d.ruler)})`,
      back: `${pd.picatrixImage} · Signifies: ${pd.picatrixSignification}` });
  });
  MANSION_TALISMANS.forEach(t => {
    const m = MANSIONS[t.n - 1];
    cards.push({ id: `mtalisman_${t.n}`, topic: "Mansion talisman",
      front: `The talisman of Mansion ${t.n} — ${m.arabic}: lord and image?`,
      back: `Lord ${t.lord} (Agrippa: ${t.agrippaLord}) · ${t.image} · For: ${t.use}` });
  });
  extra.forEach(c => cards.push(c));
  return cards;
}

// ── Persistence ────────────────────────────────────────────────────────
export function loadSRS() { return loadJSON("astrum_srs", {}); }
export function saveSRS(states) { saveJSON("astrum_srs", states); }

export function dueCards(deck, states, now = new Date(), limit = 5) {
  return deck.filter(c => isDue(states[c.id], now)).slice(0, limit);
}

export function gradeCard(cardId, grade, now = new Date()) {
  const states = loadSRS();
  states[cardId] = review(states[cardId], grade, now);
  saveSRS(states);
  return states[cardId];
}
