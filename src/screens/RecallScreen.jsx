// ═══════════════════════════════════════════════════════════════════════
// RECALL — search your own record
// ═══════════════════════════════════════════════════════════════════════
// A direct window on the corpus that grounds the Oracle: BM25 over everything
// the practitioner has written or ingested — journal, grimoire, knowledge,
// castings, lab notes, timing letters. Ask in plain words; the passages that
// answer surface with their source and a jump to where they live. Fully local.

import { useState, useMemo } from "react";
import { F, L, T } from "../ui/theme.js";
import { buildRAG, ragSearch } from "../lib/rag.js";

const SOURCE_COL = { Journal: "#C4A870", Grimoire: "#A888D8", Knowledge: "#78A8C8", Athanor: "#C87858" };
const colFor = s => SOURCE_COL[s] || (s.startsWith("Casting") ? "#5CA87C" : s.startsWith("Timing") ? "#D0A860" : "#9A8060");

const SUGGESTIONS = ["Venus love talisman", "Saturn binding", "waxing moon intentions", "what worked for wealth", "void of course"];

export default function RecallScreen({ setTab }) {
  const [q, setQ] = useState("");
  const rag = useMemo(() => buildRAG(), []);
  const results = useMemo(() => (q.trim() ? ragSearch(rag, q, 12) : []), [q, rag]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Search Your Own Record</div>
        <div style={T(20)}>Recall</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>Everything you have written and ingested, searchable — the same corpus that now grounds the Oracle. {rag.count} passage{rag.count === 1 ? "" : "s"} on record.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Ask your record — a planet, an intent, a phase…" style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(var(--tint-rgb),0.25)", borderRadius: 11, color: "#D4C098", fontFamily: F, outline: "none", padding: "12px 14px", fontSize: 13, boxSizing: "border-box", marginBottom: 9 }} />

        {rag.count === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "22px 16px" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: "#9A8060", lineHeight: 1.7 }}>Your record is empty. As you keep a journal, write in the grimoire, judge castings, and ingest timing letters, they become searchable here — and the Oracle learns to answer from them.</div>
          </div>
        )}

        {rag.count > 0 && !q.trim() && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {SUGGESTIONS.map(s => <button key={s} onClick={() => setQ(s)} style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.6)", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(var(--tint-rgb),0.15)", borderRadius: 14, padding: "5px 11px", cursor: "pointer" }}>{s}</button>)}
          </div>
        )}

        {q.trim() && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "26px 16px", fontFamily: F, fontSize: 10.5, color: "#5A4020", fontStyle: "italic", lineHeight: 1.7 }}>Nothing in your record matches that yet.</div>
        )}

        {results.map((r, i) => {
          const c = colFor(r.doc.source);
          return (
            <div key={i} style={{ marginBottom: 8, padding: "11px 13px", borderRadius: 12, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(var(--tint-rgb),0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: F, fontSize: 8.5, color: c, background: c + "18", border: `1px solid ${c}35`, borderRadius: 6, padding: "2px 8px", letterSpacing: 0.5 }}>{r.doc.source}</span>
                {r.doc.date && <span style={{ fontFamily: F, fontSize: 8.5, color: "rgba(var(--tint-rgb),0.4)" }}>{r.doc.date}</span>}
                {setTab && r.doc.tab && <button onClick={() => setTab(r.doc.tab)} style={{ marginLeft: "auto", fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.55)", background: "none", border: "1px solid rgba(var(--tint-rgb),0.18)", borderRadius: 6, padding: "2px 8px", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>Open →</button>}
              </div>
              {r.doc.title && r.doc.title !== r.doc.source && <div style={{ fontFamily: F, fontSize: 10.5, color: "#D4C098", marginBottom: 3 }}>{r.doc.title}</div>}
              <div style={{ fontFamily: F, fontSize: 11, color: "#9A8060", lineHeight: 1.7 }}>{r.doc.text.length > 300 ? r.doc.text.slice(0, 300) + "…" : r.doc.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
