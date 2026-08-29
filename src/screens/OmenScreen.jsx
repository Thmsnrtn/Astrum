// ═══════════════════════════════════════════════════════════════════════
// OMEN & DREAM LOG — capture what the world says back
// ═══════════════════════════════════════════════════════════════════════
// Synchronicity is the call-and-response of the spirit world. This is the
// near-zero-friction capture surface: type, tap, done — the sky conditions
// stamp themselves. Entries feed the corpus (the Oracle learns your dream
// language) and sit beside castings in time so Review can see the
// conversation.

import { useState } from "react";
import { F, L, T, GOLD } from "../ui/theme.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { OMEN_KINDS, loadOmens, createOmen, deleteOmen } from "../lib/omens.js";

const KIND_COL = { dream: "#8A9FE0", omen: GOLD, synchronicity: "#A888D8" };

export default function OmenScreen({ profile, natalPos }) {
  const [omens, setOmens] = useState(loadOmens);
  const [kind, setKind] = useState("dream");
  const [text, setText] = useState("");
  const refresh = () => setOmens(loadOmens());

  const capture = () => {
    if (!text.trim()) return;
    let conditions = null;
    try { conditions = conditionsFromProfile(new Date(), profile, natalPos); } catch {}
    createOmen({ kind, text: text.trim(), conditions });
    setText(""); refresh();
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Call and Response</div>
        <div style={T(20)}>Omens & Dreams</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>Dreams, signs, and baroque coincidences — captured fast, stamped with the sky, searchable by the Oracle.</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {/* Capture */}
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            {OMEN_KINDS.map(k => <button key={k.id} onClick={() => setKind(k.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: kind === k.id ? KIND_COL[k.id] + "1A" : "rgba(0,0,0,0.3)", border: `1px solid ${kind === k.id ? KIND_COL[k.id] + "50" : "rgba(var(--tint-rgb),0.1)"}`, fontFamily: F, fontSize: 9, color: kind === k.id ? KIND_COL[k.id] : "#6A5030", letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer" }}>{k.icon} {k.label}</button>)}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder={kind === "dream" ? "The dream, while it's still warm…" : kind === "omen" ? "What appeared — the birds, the found object, the words overheard…" : "The coincidence — what lined up, and around which working…"}
            style={{ width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(var(--tint-rgb),0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "10px 12px", fontSize: 12.5, boxSizing: "border-box", resize: "none", lineHeight: 1.7 }} />
          <button onClick={capture} disabled={!text.trim()} style={{ width: "100%", marginTop: 8, padding: "11px 0", borderRadius: 10, background: text.trim() ? "rgba(var(--tint-rgb),0.12)" : "rgba(0,0,0,0.3)", border: `1px solid ${text.trim() ? "rgba(var(--tint-rgb),0.35)" : "rgba(var(--tint-rgb),0.1)"}`, fontFamily: F, fontSize: 9.5, color: text.trim() ? GOLD : "#5A4020", letterSpacing: 2.5, textTransform: "uppercase", cursor: text.trim() ? "pointer" : "default" }}>⚑ Capture — the sky stamps itself</button>
        </div>

        {/* The log */}
        {omens.map(o => {
          const c = KIND_COL[o.kind] || GOLD;
          const cond = o.conditions;
          return (
            <div key={o.id} style={{ marginBottom: 8, padding: "11px 13px", borderRadius: 12, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(var(--tint-rgb),0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontFamily: F, fontSize: 8.5, color: c, background: c + "16", border: `1px solid ${c}35`, borderRadius: 6, padding: "2px 8px", letterSpacing: 1, textTransform: "uppercase" }}>{o.kind}</span>
                <span style={{ fontFamily: F, fontSize: 8.5, color: "rgba(var(--tint-rgb),0.4)" }}>{new Date(o.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <button onClick={() => { deleteOmen(o.id); refresh(); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(var(--tint-rgb),0.25)", fontSize: 11, cursor: "pointer", padding: 2 }}>✕</button>
              </div>
              <div style={{ fontFamily: F, fontSize: 11.5, color: "#B8A578", lineHeight: 1.75 }}>{o.text}</div>
              {cond && <div style={{ fontFamily: F, fontSize: 8.5, color: "#6A5028", marginTop: 6 }}>
                {[cond.moonPhase, cond.mansion && `Mansion ${cond.mansion.n} ${cond.mansion.name}`, cond.hourPlanet && `hour of ${cond.hourPlanet}`, cond.voc?.isVoC && "Moon VoC"].filter(Boolean).join(" · ")}
              </div>}
            </div>
          );
        })}
        {omens.length === 0 && (
          <div style={{ textAlign: "center", padding: "22px 16px", fontFamily: F, fontSize: 10.5, color: "#5A4020", fontStyle: "italic", lineHeight: 1.8 }}>
            Nothing captured yet. If no synchronicities appear within a lunar cycle of a working, the election either missed or the working needs follow-up — so write them down when they come.
          </div>
        )}
      </div>
    </div>
  );
}
