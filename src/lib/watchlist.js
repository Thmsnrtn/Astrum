// ═══════════════════════════════════════════════════════════════════════
// THE VIGIL — standing electional intentions
// ═══════════════════════════════════════════════════════════════════════
// Tell the app what you intend ("a Jupiter working for the business before
// autumn") and it keeps watch: each active watch caches its next qualifying
// window (score threshold, record-adjusted) and the app surfaces it in the
// Vigil tab and the ambient plans. Scanning is injected (the election
// engine lives in App), so this store stays pure and testable.

import { loadJSON, saveJSON, touch } from "./storage.js";
import { deleteRecord } from "./sync/tombstones.js";

export function loadWatchlist() { return loadJSON("astrum_watchlist", []); }
export function saveWatchlist(list) { saveJSON("astrum_watchlist", list); }

export function createWatch({ label, planet, minScore = 60, deadline = null, mansion = null, fractal = null }) {
  const w = { id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: label || "Unnamed intention", planet, minScore, deadline, mansion, fractal,
    active: true, nextWindow: null, computedAt: null, createdAt: new Date().toISOString() };
  saveWatchlist([w, ...loadWatchlist()]);
  return w;
}

export function updateWatch(id, patch) {
  const next = loadWatchlist().map(w => (w.id === id ? touch({ ...w, ...patch }) : w));
  saveWatchlist(next);
  return next.find(w => w.id === id) || null;
}

export function deleteWatch(id) { deleteRecord("astrum_watchlist", id); }

// A cached window is stale after maxAgeHours or once its time has passed.
export function windowStale(watch, now = new Date(), maxAgeHours = 6) {
  if (!watch.computedAt) return true;
  if ((now - new Date(watch.computedAt)) / 3600000 > maxAgeHours) return true;
  if (watch.nextWindow && new Date(watch.nextWindow.date) <= now) return true;
  return false;
}

// Refresh a watch's cached window. scanFn(watch, days) → [{date, assess:{score,grade}}].
// Scans up to the deadline (or 30 days). Planetary watches keep the first
// window ≥ minScore; mansion and fractal watches keep the first window
// outright — a mansion scan already returns only clean moments (not void,
// waxing, unbesieged) and a fractal scan already returns only exact
// full-coherence instants, so a numeric threshold does not apply to either.
export function refreshWatch(watch, now, scanFn) {
  const horizon = watch.deadline
    ? Math.max(1, Math.min(60, Math.ceil((new Date(watch.deadline) - now) / 86400000)))
    : 30;
  let nextWindow = null;
  try {
    const results = scanFn(watch, horizon) || [];
    const hit = (watch.mansion || watch.fractal)
      ? results.find(r => new Date(r.date) > now)
      : results.find(r => r.assess?.score >= watch.minScore && new Date(r.date) > now);
    if (hit) nextWindow = { date: new Date(hit.date).toISOString(), score: hit.assess.score, grade: hit.assess.grade };
  } catch {}
  return updateWatch(watch.id, { nextWindow, computedAt: new Date(now).toISOString() });
}

// Plans for the ambient scheduler: T-24h and T-1h before each cached window
// — except a fractal alignment (~19 seconds long), which needs its own
// short-lead cascade ending seconds before open, or an hour's notice is
// worthless.
const DEFAULT_LEADS = [[24 * 3600000, "opens in 24 hours"], [3600000, "opens in one hour — prepare"]];
const FRACTAL_LEADS = [...DEFAULT_LEADS, [2 * 60000, "opens in 2 minutes — take your place"], [10000, "opens in 10 seconds — one breath"]];
export function watchPlans(watchlist, now, end) {
  const plans = [];
  for (const w of watchlist) {
    if (!w.active || !w.nextWindow) continue;
    const start = new Date(w.nextWindow.date);
    if (isNaN(start.getTime()) || start <= now) continue;
    const leads = w.nextWindow.grade === "fractal" ? FRACTAL_LEADS : DEFAULT_LEADS;
    leads.forEach(([lead, phrase], i) => {
      const at = new Date(start.getTime() - lead);
      if (at > now && at < end) plans.push({ id: `vigil_${w.id}_${i}`, at, kind: "vigil", priority: 1,
        title: `👁 ${w.label}`, body: `Your watched window ${phrase}. ${w.nextWindow.grade === "mansion" ? "Clean mansion window." : w.nextWindow.grade === "fractal" ? "All four fractal levels align." : `Score ${w.nextWindow.score}.`}` });
    });
  }
  return plans;
}
