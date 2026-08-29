// ═══════════════════════════════════════════════════════════════════════
// SCHEDULER — the ambient practice planner
// ═══════════════════════════════════════════════════════════════════════
// planUpcoming() is a pure function: given now, location, preferences, and
// the current castings/athanor stores, it returns every notification-worthy
// moment in the horizon — planetary hour changes (for the preferred
// planets), void-of-course boundaries, committed election windows, athanor
// step due-times, and the morning briefing. The notify layer decides how to
// deliver them per platform. iOS caps ~64 pending local notifications, so
// each plan carries a priority (lower = more important).

import { getPlanetaryHour, getPlanetaryHourUnequal, checkVoC, dateToJD } from "../engine/astro.js";
import { P } from "../data/planets.js";
import { getMansion } from "../data/mansions.js";
import { alchemicalSeason, moonSignOperation, moonWorkGuidance } from "../data/alchemy.js";
import { feedInRange } from "./intake.js";
import { loadJSON, saveJSON } from "./storage.js";

export const DEFAULT_NOTIFY_PREFS = {
  enabled: false,
  kinds: { hourChange: true, voc: true, elections: true, briefing: true, athanor: true, observances: true },
  hourPlanets: ["jupiter", "venus"],
  briefingTime: "07:30",
  horizonDays: 3,
};

export function loadNotifyPrefs() {
  const stored = loadJSON("astrum_notify_prefs", {});
  return { ...DEFAULT_NOTIFY_PREFS, ...stored, kinds: { ...DEFAULT_NOTIFY_PREFS.kinds, ...(stored.kinds || {}) } };
}
export function saveNotifyPrefs(p) { saveJSON("astrum_notify_prefs", p); }

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

export function planUpcoming({ now, location, prefs, castings = [], athanor = [], observances = [] }) {
  const plans = [];
  const horizonDays = prefs.horizonDays ?? 3;
  const end = new Date(now.getTime() + horizonDays * 86400000);
  const hourAt = t => location ? getPlanetaryHourUnequal(t, location.lat, location.lon) : getPlanetaryHour(t);

  // ── Planetary hour boundaries for the preferred planets ──
  if (prefs.kinds.hourChange && prefs.hourPlanets?.length) {
    let t = new Date(now.getTime());
    for (let i = 0; i < horizonDays * 26 + 4; i++) {
      const h = hourAt(t);
      const boundary = new Date(t.getTime() + Math.max(30000, h.msRemaining ?? 0) + 1500);
      if (boundary >= end) break;
      if (prefs.hourPlanets.includes(h.nextPlanet)) {
        plans.push({ id: `hour_${boundary.getTime()}`, at: boundary, kind: "hourChange", priority: 4,
          title: `${P[h.nextPlanet]?.sym || ""} Hour of ${cap(h.nextPlanet)}`,
          body: `The planetary hour of ${cap(h.nextPlanet)} begins now.` });
      }
      t = boundary;
    }
  }

  // ── Void-of-course boundaries (scan at 20-minute resolution) ──
  if (prefs.kinds.voc) {
    const stepMs = 20 * 60000;
    let prev = checkVoC(dateToJD(now)).isVoC;
    for (let t = now.getTime() + stepMs; t < end.getTime(); t += stepMs) {
      const cur = checkVoC(dateToJD(new Date(t))).isVoC;
      if (cur !== prev) {
        const at = new Date(t);
        plans.push(cur
          ? { id: `voc_on_${t}`, at, kind: "voc", priority: 3, title: "☽ Moon goes Void of Course", body: "Nothing begun now completes as intended — pause new workings until the ingress." }
          : { id: `voc_off_${t}`, at, kind: "voc", priority: 3, title: "☽ Void of Course ends", body: "The Moon enters a new sign — the channel is open again." });
        prev = cur;
      }
    }
  }

  // ── Committed election windows (T-24h and T-1h) ──
  if (prefs.kinds.elections) {
    castings.filter(c => c.kind === "election" && c.status === "open" && c.links?.electionWindow?.start).forEach(c => {
      const start = new Date(c.links.electionWindow.start);
      if (isNaN(start.getTime()) || start <= now) return;
      [[24 * 3600000, "opens in 24 hours"], [3600000, "opens in one hour — prepare"]].forEach(([lead, phrase], i) => {
        const at = new Date(start.getTime() - lead);
        if (at > now && at < end) plans.push({ id: `elect_${c.id}_${i}`, at, kind: "election", priority: 1,
          title: `◈ ${c.title}`, body: `Your elected window ${phrase}. Score ${c.links.electionWindow.score}.` });
      });
    });
  }

  // ── Athanor steps due ──
  if (prefs.kinds.athanor) {
    athanor.filter(op => op.status === "active").forEach(op => {
      (op.steps || []).forEach(s => {
        if (s.completedAt || !s.scheduledFor) return;
        const at = new Date(s.scheduledFor);
        if (at > now && at < end) plans.push({ id: `athanor_${op.id}_${s.id}`, at, kind: "athanor", priority: 2,
          title: `🜍 ${op.name}`, body: `${s.title} — the window for this step opens now.` });
      });
    });
  }

  // ── Spirit Court observances (feast days, anniversaries) ──
  if (prefs.kinds.observances !== false) {
    observances.forEach(o => {
      const at = new Date(o.date);
      if (at > now && at < end) plans.push({ id: `obs_${o.spiritId}_${at.getTime()}`, at, kind: "observance", priority: 1,
        title: `🕯 ${o.label}`, body: `${o.name}'s day. Light the candle, pour the water — relationship is kept by keeping it.` });
    });
  }

  // ── Morning briefing ──
  if (prefs.kinds.briefing && prefs.briefingTime) {
    const [hh, mm] = prefs.briefingTime.split(":").map(Number);
    for (let d = 0; d <= horizonDays; d++) {
      const at = new Date(now); at.setDate(at.getDate() + d); at.setHours(hh || 7, mm || 30, 0, 0);
      if (at > now && at < end) plans.push({ id: `brief_${at.getTime()}`, at, kind: "briefing", priority: 1,
        title: "☉ Morning Sky", body: briefingBodyFor(at, location) });
    }
  }

  return plans.sort((a, b) => a.at - b.at);
}

// Short precomputed briefing body (scheduled notifications can't compose at
// fire time). The SkyScreen card composes the full live version.
function briefingBodyFor(at, location) {
  try {
    const h = location ? getPlanetaryHourUnequal(at, location.lat, location.lon) : getPlanetaryHour(at);
    return `Day of ${cap(h.dayRuler)}. Open Astrum for the full sky — hours, mansion, and what you have in the works.`;
  } catch { return "Open Astrum for today's sky."; }
}

// Full live briefing for the SkyScreen card.
export function composeBriefing({ now, eph, hour, castings = [], athanor = [], observances = [] }) {
  const lines = [];
  lines.push(`Day of ${cap(hour.dayRuler)}, hour of ${cap(hour.planet)}${hour.isDayHour === false ? " (night)" : ""}.`);
  const moon = eph?.pos?.moon;
  if (moon) {
    const m = getMansion(moon.lon);
    lines.push(`Moon ${eph.moonPhase} in ${moon.zodiac?.name}, mansion ${m.index} — ${m.arabic} (${m.nature}).`);
  }
  if (eph?.voc?.isVoC) lines.push(`⚠ Void of course — ${Math.round(eph.voc.hoursToIngress)}h until ingress. Hold new workings.`);
  if (eph?.pos?.sun && moon) {
    const season = alchemicalSeason(eph.pos.sun.lon);
    const moonOp = moonSignOperation(moon.lon);
    const tide = moonWorkGuidance(eph.moonPhaseDeg ?? 0);
    lines.push(`🜂 Athanor: season of ${season.process} (Sun in ${season.sign}); the Moon keys ${moonOp.process}; tide runs ${tide.mode}.`);
  }
  const openElections = castings.filter(c => c.kind === "election" && c.status === "open" && c.links?.electionWindow?.start && new Date(c.links.electionWindow.start) > now);
  openElections.slice(0, 2).forEach(c => lines.push(`◈ Committed: ${c.title} — ${new Date(c.links.electionWindow.start).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`));
  const dueSteps = athanor.filter(op => op.status === "active").flatMap(op => (op.steps || []).filter(s => !s.completedAt && s.scheduledFor && new Date(s.scheduledFor).toDateString() === now.toDateString()).map(s => ({ op, s })));
  dueSteps.slice(0, 2).forEach(({ op, s }) => lines.push(`🜍 ${op.name}: ${s.title} due today.`));
  observances.filter(o => new Date(o.date).toDateString() === now.toDateString()).slice(0, 2)
    .forEach(o => lines.push(`🕯 ${o.label} — ${o.name}'s day. Tend the relationship.`));
  // Ingested timing letters — anything they flag for today or the next few days
  try {
    const todayStr = now.toISOString().split("T")[0];
    const soon = new Date(now.getTime() + 4 * 86400000).toISOString().split("T")[0];
    const feed = feedInRange(todayStr, soon);
    feed.slice(0, 3).forEach(e => lines.push(`✦ ${e.source} flags ${e.date === todayStr ? "today" : e.date}: ${e.title.slice(0, 80)}`));
  } catch {}
  const awaiting = castings.filter(c => c.status === "open" && c.kind !== "election").length;
  if (awaiting) lines.push(`${awaiting} casting${awaiting > 1 ? "s" : ""} awaiting outcome in Review.`);
  return lines.join("\n");
}
