// ═══════════════════════════════════════════════════════════════════════
// REVIEW SCREEN — the Operator's Loop closes here
// ═══════════════════════════════════════════════════════════════════════
// Open castings awaiting outcomes, local hit-rate statistics sliced by
// condition (planet, hour, phase, mansion, VoC, election score), and an AI
// correlation analysis over the practitioner's own dataset.

import { useState, useEffect } from "react";
import { F, L, T, GOLD } from "../ui/theme.js";
import { P } from "../data/planets.js";
import { TRADITIONS } from "../data/traditions.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { loadCastings, addOutcome, closeCasting, deleteCasting, effectiveVerdict, computeStats, castingsToTSV, updateCasting, timeToResult, staleOpen } from "../lib/castings.js";
import PhotoStrip from "./PhotoStrip.jsx";
import { composeBook } from "../lib/bookOfResults.js";
import { loadOmens } from "../lib/omens.js";
import { loadJSON } from "../lib/storage.js";
import { downloadText } from "../lib/backup.js";
import { askClaude } from "../ai/client.js";

const VERDICT_META = {
  hit:     { label: "HIT",     col: "#5CA85C" },
  partial: { label: "PARTIAL", col: GOLD },
  miss:    { label: "MISS",    col: "#D24B31" },
};
const KIND_ICONS = { working: "⚗", sigil: "⟁", talisman: "◈", election: "◫", horary: "?", athanor: "🜍", geomancy: "⚏" };

function CondChips({ c }) {
  const cond = c.conditions;
  if (!cond) return <span style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.25)", fontStyle: "italic" }}>no sky record</span>;
  const chips = [];
  if (cond.dayRuler && P[cond.dayRuler]) chips.push(`Day of ${P[cond.dayRuler].name}`);
  if (cond.hourPlanet && P[cond.hourPlanet]) chips.push(`Hour of ${P[cond.hourPlanet].name}`);
  if (cond.moonPhase) chips.push(`${cond.moonPhase} Moon`);
  if (cond.mansion) chips.push(`M${cond.mansion.n} ${cond.mansion.name}`);
  if (cond.voc?.isVoC) chips.push("VoC");
  if (cond.election) chips.push(`Score ${cond.election.score}`);
  if (cond.approximate) chips.push("≈ retro-computed");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
      {chips.map((t, i) => (
        <span key={i} style={{ fontFamily: F, fontSize: 7.5, color: "rgba(var(--tint-rgb),0.5)", letterSpacing: 0.8, padding: "2px 7px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(var(--tint-rgb),0.1)" }}>{t}</span>
      ))}
    </div>
  );
}

function StatTable({ title, rows }) {
  const shown = rows.filter(r => r.n >= 1).slice(0, 8);
  if (!shown.length) return null;
  return (
    <div className="card" style={{ margin: "0 14px 10px" }}>
      <div style={L()}>{title}</div>
      <div style={{ marginTop: 8 }}>
        {shown.map(r => (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontFamily: F, fontSize: 10, color: "#C4A870", width: 118, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{P[r.key]?.name || r.key}</div>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.35)", overflow: "hidden" }}>
              <div style={{ width: `${r.pct ?? 0}%`, height: "100%", borderRadius: 3, background: r.pct >= 60 ? "#5CA85C" : r.pct >= 35 ? GOLD : "#8B4040", transition: "width 0.4s" }} />
            </div>
            <div style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.55)", width: 62, textAlign: "right", flexShrink: 0 }}>{r.pct != null ? `${r.pct}%` : "—"} · n={r.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewScreen({ profile }) {
  const [castings, setCastings] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [view, setView] = useState("open"); // open | stats | all

  const refresh = () => setCastings(loadCastings());
  useEffect(() => { refresh(); }, []);

  const stats = computeStats(castings);
  const open = castings.filter(c => c.status === "open").sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const judged = castings.filter(c => effectiveVerdict(c));

  const record = (id, verdict) => {
    addOutcome(id, { verdict, note: note.trim() });
    if (verdict !== "unknown") closeCasting(id);
    setNote(""); setExpanded(null); refresh();
  };

  const analyze = async () => {
    const apiKey = profile?.apiKey || "";
    setAnalyzing(true); setAnalysis(null);
    const trad = profile?.traditions?.map(t => TRADITIONS[t]?.label || t).join(", ") || "Western Ceremonial";
    const sys = buildSystemPrompt(profile,
      "You are a rigorous analyst of a magician's practice records. You are given the practitioner's own casting dataset as TSV: each row is one working with the astrological conditions at cast time and its judged outcome. Find real correlations — which planets, hours, moon phases, mansions, and election scores coincide with hits vs misses FOR THIS PRACTITIONER. Be honest about sample sizes: below n=5 say 'suggestive, not conclusive'. End with 2-3 concrete, testable timing recommendations for their next workings.");
    const userMsg = `My practice dataset (${judged.length} judged of ${castings.length} total castings, tradition: ${trad}):\n\n${castingsToTSV(castings)}`;
    try {
      setAnalysis(await askClaude({ apiKey, system: sys, messages: [{ role: "user", content: userMsg }], maxTokens: 1200 }));
    } catch (e) { setAnalysis(e.message || "Analysis unavailable — check connection."); }
    setAnalyzing(false);
  };

  const CastingRow = ({ c, showVerdict }) => {
    const pl = c.planet ? P[c.planet] : null;
    const v = effectiveVerdict(c);
    const vm = v ? VERDICT_META[v] : null;
    const isExp = expanded === c.id;
    return (
      <div style={{ marginBottom: 8, padding: "11px 12px", borderRadius: 13, background: "rgba(8,5,22,0.65)", border: `1px solid ${pl ? pl.col + "20" : "rgba(var(--tint-rgb),0.1)"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => { setExpanded(isExp ? null : c.id); setNote(""); }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12, color: pl?.col || GOLD }}>{pl?.sym || KIND_ICONS[c.kind] || "✦"}</span>
              <span style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.45)", letterSpacing: 1.5, textTransform: "uppercase" }}>{c.kind}</span>
              <span style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.35)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
              {showVerdict && vm && <span style={{ fontFamily: F, fontSize: 8, color: vm.col, letterSpacing: 1 }}>{vm.label}</span>}
            </div>
            <div style={{ fontFamily: F, fontSize: 12, color: GOLD, marginTop: 3, fontStyle: "italic" }}>{c.title}</div>
            <CondChips c={c} />
          </div>
          <span style={{ color: "rgba(var(--tint-rgb),0.3)", fontSize: 11, marginLeft: 6 }}>{isExp ? "▾" : "▸"}</span>
        </div>
        {isExp && (
          <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(var(--tint-rgb),0.08)" }}>
            {(c.outcomes || []).map(o => (
              <div key={o.id} style={{ marginBottom: 6, padding: "6px 9px", borderRadius: 8, background: "rgba(0,0,0,0.3)" }}>
                <span style={{ fontFamily: F, fontSize: 8, color: VERDICT_META[o.verdict]?.col || "rgba(var(--tint-rgb),0.4)", letterSpacing: 1 }}>{(o.verdict || "note").toUpperCase()}</span>
                <span style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.35)", marginLeft: 6 }}>{new Date(o.date).toLocaleDateString()}</span>
                {o.note && <div style={{ fontFamily: F, fontSize: 10, color: "#9A8060", fontStyle: "italic", marginTop: 3, lineHeight: 1.6 }}>{o.note}</div>}
              </div>
            ))}
            <PhotoStrip photoIds={c.photoIds || []} onChange={ids => { updateCasting(c.id, { photoIds: ids }); refresh(); }} label="Talisman · altar · evidence" />
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="What happened? (optional note)"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(var(--tint-rgb),0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "8px 10px", width: "100%", fontSize: 11, resize: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {Object.entries(VERDICT_META).map(([v2, m]) => (
                <button key={v2} onClick={() => record(c.id, v2)} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: `${m.col}18`, border: `1px solid ${m.col}50`, fontFamily: F, fontSize: 9, color: m.col, letterSpacing: 1.5, cursor: "pointer" }}>{m.label}</button>
              ))}
              <button onClick={() => record(c.id, "unknown")} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(var(--tint-rgb),0.15)", fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.5)", letterSpacing: 1, cursor: "pointer" }}>NOTE ONLY</button>
            </div>
            <button onClick={() => { deleteCasting(c.id); setExpanded(null); refresh(); }} style={{ marginTop: 7, background: "none", border: "none", fontFamily: F, fontSize: 8, color: "rgba(200,100,80,0.45)", letterSpacing: 1, cursor: "pointer", padding: 0 }}>DELETE RECORD</button>
          </div>
        )}
      </div>
    );
  };

  const TABS = [["open", `Awaiting (${open.length})`], ["stats", "Statistics"], ["all", `All (${castings.length})`]];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>The Operator's Loop</div>
        <div style={T(20)}>Review & Results</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>Every working recorded under its sky, every outcome judged, and your own dataset consulted on what actually works.</div>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "6px 14px 10px" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: view === id ? "rgba(var(--tint-rgb),0.12)" : "rgba(0,0,0,0.25)", border: `1px solid ${view === id ? "rgba(var(--tint-rgb),0.35)" : "rgba(var(--tint-rgb),0.08)"}`, fontFamily: F, fontSize: 9, color: view === id ? GOLD : "rgba(var(--tint-rgb),0.4)", letterSpacing: 1, cursor: "pointer" }}>{lbl}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {view === "open" && (
          <div style={{ padding: "0 14px" }}>
            {open.length === 0 && <div style={{ textAlign: "center", padding: "36px 20px", fontFamily: F, fontSize: 12, color: "#5A4020", fontStyle: "italic", lineHeight: 1.8 }}>No castings awaiting outcomes.<br />Workings, sigils, and committed elections will appear here for judgment.</div>}
            {(() => { const stale = staleOpen(castings, new Date(), 60); return stale.length > 0 && (
              <div style={{ padding: "9px 12px", borderRadius: 11, background: "rgba(180,120,60,0.08)", border: "1px solid rgba(180,120,60,0.3)", marginBottom: 9 }}>
                <div style={{ fontFamily: F, fontSize: 9.5, color: "#D2A060", lineHeight: 1.6 }}>◷ {stale.length} casting{stale.length === 1 ? " has" : "s have"} waited over 60 days — a working that never lands is itself a verdict. Judge or close {stale.length === 1 ? "it" : "the oldest"}: <span style={{ fontStyle: "italic" }}>“{stale[0].title}”</span> ({new Date(stale[0].createdAt).toLocaleDateString()}).</div>
              </div>); })()}
            {open.map(c => <CastingRow key={c.id} c={c} />)}
          </div>
        )}
        {view === "stats" && (
          <>
            <div className="card" style={{ margin: "0 14px 10px", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
              {[["Castings", stats.total], ["Judged", stats.judged], ["Open", stats.open], ["Hit Rate", stats.overall.pct != null ? `${stats.overall.pct}%` : "—"]].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontFamily: F, fontSize: 20, color: GOLD }}>{val}</div>
                  <div style={{ fontFamily: F, fontSize: 7.5, color: "rgba(var(--tint-rgb),0.4)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
            {stats.judged < 3 ? (
              <div style={{ textAlign: "center", padding: "24px 30px", fontFamily: F, fontSize: 11, color: "#5A4020", fontStyle: "italic", lineHeight: 1.8 }}>Judge at least 3 castings and the condition statistics appear — hit rate by planet, hour, phase, mansion, and election score.</div>
            ) : (
              <>
                {stats.byAlly?.length > 0 && <StatTable title="By Ally (Spirit Court)" rows={stats.byAlly} />}
                <StatTable title="By Working Planet" rows={stats.byPlanet} />
                <StatTable title="By Planetary Hour" rows={stats.byHourRuler} />
                <StatTable title="By Moon Phase" rows={stats.byMoonPhase} />
                <StatTable title="By Lunar Mansion" rows={stats.byMansion} />
                <StatTable title="By Void of Course" rows={stats.byVoC} />
                <StatTable title="By Election Score" rows={stats.byElectionBand} />
                {(() => { const ttr = timeToResult(castings); return ttr.overall && (
                  <div style={{ padding: "11px 13px", borderRadius: 12, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(var(--tint-rgb),0.1)", marginBottom: 9 }}>
                    <div style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.45)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Time to Result</div>
                    <div style={{ fontFamily: F, fontSize: 11, color: "#C4A870", lineHeight: 1.7 }}>Your workings land in a median of <span style={{ color: GOLD }}>{ttr.overall.medianDays} days</span> (mean {ttr.overall.avgDays}, over {ttr.overall.n} judged).</div>
                    {ttr.byPlanet.slice(0, 4).map(r => <div key={r.key} style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", padding: "2px 0" }}>{r.key}: median {r.medianDays}d · n{r.n}</div>)}
                  </div>); })()}
                <button onClick={() => {
                  const to = new Date(); const from = new Date(to.getTime() - 365.25 * 86400000);
                  const html = composeBook({ from, to, castings, omens: loadOmens(), grimoire: loadJSON("astrum_grimoire", []), title: `The Book of Results · ${from.getFullYear()}–${to.getFullYear()}` });
                  downloadText(`astrum-book-of-results-${to.toISOString().slice(0, 10)}.html`, html);
                }} style={{ width: "100%", marginTop: 6, padding: "12px 0", borderRadius: 11, background: "rgba(var(--tint-rgb),0.1)", border: "1px solid rgba(var(--tint-rgb),0.3)", fontFamily: F, fontSize: 9.5, color: GOLD, letterSpacing: 2.5, textTransform: "uppercase", cursor: "pointer" }}>📖 Bind the Year — export the Book of Results</button>
              </>
            )}
            {stats.judged >= 3 && (
              <div style={{ padding: "0 14px 10px" }}>
                <button onClick={analyze} disabled={analyzing} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: "rgba(100,80,160,0.15)", border: "1px solid rgba(100,80,160,0.35)", fontFamily: F, fontSize: 10, color: "rgba(160,140,220,0.85)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{analyzing ? "Consulting the record…" : "✧ AI Correlation Analysis"}</button>
              </div>
            )}
            {analysis && (
              <div style={{ margin: "0 14px 10px", padding: "13px 14px", borderRadius: 13, background: "rgba(20,15,40,0.8)", border: "1px solid rgba(100,80,160,0.25)" }}>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(160,140,220,0.6)", letterSpacing: 2, marginBottom: 8 }}>RESULTS REVIEW · {stats.judged} JUDGED CASTINGS</div>
                <div style={{ fontFamily: F, fontSize: 11, color: "#C4A870", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{analysis}</div>
                <button onClick={() => setAnalysis(null)} style={{ marginTop: 10, background: "none", border: "none", fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.3)", cursor: "pointer", letterSpacing: 1 }}>DISMISS</button>
              </div>
            )}
          </>
        )}
        {view === "all" && (
          <div style={{ padding: "0 14px" }}>
            {castings.length === 0 && <div style={{ textAlign: "center", padding: "36px 20px", fontFamily: F, fontSize: 12, color: "#5A4020", fontStyle: "italic" }}>No castings recorded yet.</div>}
            {castings.map(c => <CastingRow key={c.id} c={c} showVerdict />)}
          </div>
        )}
      </div>
    </div>
  );
}
