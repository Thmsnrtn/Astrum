// ═══════════════════════════════════════════════════════════════════════
// ATHANOR — long-running alchemical operations
// ═══════════════════════════════════════════════════════════════════════
// Operations are sequences of steps gated by planetary timing. Steps are
// scheduled lazily: completing step k resolves the concrete datetime of
// step k+1 via resolveDueRule(), and the ambient scheduler picks those
// times up as reminders.

import { loadJSON, saveJSON } from "./storage.js";
import { getPlanetaryHour, getPlanetaryHourUnequal, planetLon, dateToJD } from "../App.jsx";
import { OPERATION_TEMPLATES } from "../data/operations.js";

export function loadAthanor() { return loadJSON("astrum_athanor", []); }
export function saveAthanor(list) { saveJSON("astrum_athanor", list); }

const norm = a => ((a % 360) + 360) % 360;
function newId() { return `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function moonPhaseKind(date) {
  const jd = dateToJD(date);
  const elong = norm(planetLon("moon", jd) - planetLon("sun", jd));
  if (elong < 30 || elong > 330) return "new";
  if (Math.abs(elong - 180) < 30) return "full";
  return elong < 180 ? "waxing" : "waning";
}

// Next datetime after `after` satisfying the rule. Scans in 20-minute steps;
// seasonal (sunSigns) constraints fast-forward the scan to the season's
// start, so even an out-of-season rule (dew under Aries in July) resolves —
// up to ~14 months out. Null only for genuinely unsatisfiable rules.
export function resolveDueRule(rule, after, location, planet) {
  let start = new Date(after.getTime() + (rule.minDaysAfterPrev || 0) * 86400000);
  const stepMs = 20 * 60000;
  const hourAt = t => location ? getPlanetaryHourUnequal(t, location.lat, location.lon) : getPlanetaryHour(t);
  const horizon = rule.sunSigns ? 430 : 60; // days
  for (let t = start.getTime(); t < start.getTime() + horizon * 86400000; t += stepMs) {
    let d = new Date(t);
    if (rule.sunSigns?.length) {
      const sunSign = Math.floor(norm(planetLon("sun", dateToJD(d))) / 30);
      if (!rule.sunSigns.includes(sunSign)) {
        // fast-forward: Sun moves ~1°/day; jump to just before the nearest season start
        const sunDeg = norm(planetLon("sun", dateToJD(d)));
        let minAhead = 400;
        rule.sunSigns.forEach(s => { const ahead = norm(s * 30 - sunDeg); if (ahead < minAhead) minAhead = ahead; });
        t += Math.max(0, Math.floor(minAhead - 1)) * 86400000;
        continue;
      }
    }
    const h = hourAt(d);
    if (rule.planetHour && h.planet !== planet) continue;
    if (rule.planetDay && h.dayRuler !== planet) continue;
    if (rule.preDawn && !(h.isDayHour === false && h.hourNum >= 22)) continue;
    if (rule.moonPhase) {
      const phase = moonPhaseKind(d);
      if (rule.moonPhase === "waxing" ? !(phase === "waxing" || phase === "full") :
          rule.moonPhase === "waning" ? !(phase === "waning" || phase === "new") :
          phase !== rule.moonPhase) continue;
    }
    return d;
  }
  return null;
}

// Human-readable description of a dueRule (for the timeline UI).
const SIGN_NAMES_SHORT = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export function describeDueRule(rule, planet) {
  if (!rule) return "";
  const parts = [];
  if (rule.planetDay) parts.push(`${planet}'s day`);
  if (rule.planetHour) parts.push(`${planet}'s hour`);
  if (rule.preDawn) parts.push("before sunrise");
  if (rule.moonPhase) parts.push(`${rule.moonPhase} Moon`);
  if (rule.sunSigns?.length) parts.push(`Sun in ${rule.sunSigns.map(s => SIGN_NAMES_SHORT[s]).join("/")}`);
  if (rule.minDaysAfterPrev) parts.push(`≥ ${rule.minDaysAfterPrev}d after previous`);
  return parts.join(" · ");
}

export function createOperation({ name, templateId, planet, location }) {
  const template = OPERATION_TEMPLATES[templateId] || OPERATION_TEMPLATES.custom;
  const now = new Date();
  const steps = template.steps.map(s => ({ id: newId(), title: s.title, instructions: s.instructions, dueRule: s.dueRule, fire: s.fire ?? null, observe: s.observe || "", scheduledFor: null, completedAt: null, note: "" }));
  // schedule the first step now; the rest resolve as their predecessors complete
  const first = resolveDueRule(steps[0].dueRule, now, location, planet);
  steps[0].scheduledFor = first ? first.toISOString() : null;
  const op = {
    id: newId(),
    name: name || template.name,
    template: template.id,
    planet,
    startedAt: now.toISOString(),
    status: "active",
    castingId: null,
    steps,
    labNotes: [],
  };
  saveAthanor([op, ...loadAthanor()]);
  return op;
}

export function updateOperation(id, patch) {
  const list = loadAthanor().map(op => op.id === id ? { ...op, ...patch } : op);
  saveAthanor(list);
  return list.find(op => op.id === id) || null;
}

export function completeStep(opId, stepId, note, location) {
  const list = loadAthanor();
  let finished = false;
  const next = list.map(op => {
    if (op.id !== opId) return op;
    const steps = op.steps.map(s => s.id === stepId ? { ...s, completedAt: new Date().toISOString(), note: note || "" } : { ...s });
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx >= 0 && idx + 1 < steps.length && !steps[idx + 1].scheduledFor) {
      const due = resolveDueRule(steps[idx + 1].dueRule || {}, new Date(), location, op.planet);
      steps[idx + 1].scheduledFor = due ? due.toISOString() : null;
    }
    const allDone = steps.every(s => s.completedAt);
    if (allDone) finished = true;
    return { ...op, steps, status: allDone ? "complete" : op.status };
  });
  saveAthanor(next);
  return { op: next.find(o => o.id === opId), finished };
}

export function setOpPhotos(opId, photoIds) {
  const list = loadAthanor();
  const next = list.map(op => (op.id === opId ? { ...op, photoIds } : op));
  saveAthanor(next);
  return next.find(o => o.id === opId) || null;
}

export function addLabNote(opId, text) {
  const list = loadAthanor().map(op => op.id === opId
    ? { ...op, labNotes: [{ id: newId(), ts: new Date().toISOString(), text }, ...(op.labNotes || [])] }
    : op);
  saveAthanor(list);
  return list.find(o => o.id === opId);
}

export function abandonOperation(opId) { return updateOperation(opId, { status: "abandoned" }); }
export function deleteOperation(opId) { saveAthanor(loadAthanor().filter(o => o.id !== opId)); }
