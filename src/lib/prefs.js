// ═══════════════════════════════════════════════════════════════════════
// PRACTICE PREFERENCES — doctrinal choices the practitioner owns
// ═══════════════════════════════════════════════════════════════════════
// Where the tradition itself splits, the app should not pick silently.
// These are the practitioner's standing choices; engines stay pure and
// take the choice as an argument, so tests never touch storage.
//
// vocMode — which void-of-course doctrine governs the whole app:
//   "lilly"       (default) CA p.112 — void until the Moon perfects an
//                 aspect in her current sign, however far away it lies.
//   "hellenistic" kenodromia — void only when nothing perfects within
//                 the next 30° regardless of sign; far rarer, stricter.

import { loadJSON, saveJSON } from "./storage.js";

const KEY = "astrum_practice_prefs";

export function loadPracticePrefs() {
  return { vocMode: "lilly", ...loadJSON(KEY, {}) };
}

export function savePracticePrefs(patch) {
  const next = { ...loadPracticePrefs(), ...patch };
  saveJSON(KEY, next);
  // Let live consumers (the 30s ephemeris bucket) recompute immediately.
  try { window.dispatchEvent(new Event("astrum-prefs")); } catch {}
  return next;
}

export function getVoCMode() {
  const m = loadPracticePrefs().vocMode;
  return m === "hellenistic" ? "hellenistic" : "lilly";
}

export function setVoCMode(mode) {
  return savePracticePrefs({ vocMode: mode === "hellenistic" ? "hellenistic" : "lilly" }).vocMode;
}
