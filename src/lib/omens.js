// ═══════════════════════════════════════════════════════════════════════
// OMEN & DREAM LOG — the call-and-response of practice
// ═══════════════════════════════════════════════════════════════════════
// A near-zero-friction capture surface for dreams, omens, and the baroque
// coincidences that confirm (or question) a working. Every entry is stamped
// with the sky as it stood, so Review can correlate omen-clusters with
// casting windows, and the corpus makes them searchable by the Oracle.

import { loadJSON, saveJSON } from "./storage.js";

export const OMEN_KINDS = [
  { id: "dream",         label: "Dream",         icon: "☾" },
  { id: "omen",          label: "Omen",          icon: "◬" },
  { id: "synchronicity", label: "Synchronicity", icon: "✧" },
];

export function loadOmens() { return loadJSON("astrum_omens", []); }
export function saveOmens(list) { saveJSON("astrum_omens", list); }

export function createOmen({ kind = "omen", text = "", conditions = null, at = null }) {
  const o = { id: `om_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: at || new Date().toISOString(), kind, text, conditions };
  saveOmens([o, ...loadOmens()]);
  return o;
}

export function deleteOmen(id) { saveOmens(loadOmens().filter(o => o.id !== id)); }

// Omens within N days of a given date — Review uses this to show what the
// world said around a casting.
export function omensNear(omens, date, days = 3) {
  const t = new Date(date).getTime();
  const w = days * 86400000;
  return (omens || []).filter(o => Math.abs(new Date(o.at).getTime() - t) <= w);
}
