// ═══════════════════════════════════════════════════════════════════════
// HORARY SCREEN — ask the sky a question
// ═══════════════════════════════════════════════════════════════════════
// Type the question, pick its house, and the chart of the moment is cast:
// radicality considerations, significators, applying aspects, translation
// of light. The judgment can be drafted by the AI from the raw chart, and
// the whole thing is saved as a casting (kind: horary) so the answer can
// be judged true or false in Review once life delivers the verdict.

import { useState } from "react";
import { F, L, T, GOLD } from "../ui/theme.js";
import { P } from "../data/planets.js";
import { TRADITIONS } from "../data/traditions.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { castHorary, horaryToText, QUESTION_HOUSES } from "../engine/horary.js";
import { createCasting } from "../lib/castings.js";
import { askClaude } from "../ai/client.js";

const SIGN_SYMS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const fmtLon = l => `${Math.floor(l % 30)}°${String(Math.round(((l % 30) % 1) * 60)).padStart(2, "0")}′ ${SIGN_SYMS[Math.floor(((l % 360) + 360) % 360 / 30)]}`;

export default function HoraryScreen({ profile, natalPos }) {
  const [question, setQuestion] = useState("");
  const [houseId, setHouseId] = useState("partner");
  const [chart, setChart] = useState(null);
  const [judgment, setJudgment] = useState(null);
  const [judging, setJudging] = useState(false);
  const [saved, setSaved] = useState(false);

  const location = profile?.natal?.lat && profile?.natal?.lon ? { lat: profile.natal.lat, lon: profile.natal.lon } : null;
  const qh = QUESTION_HOUSES.find(q => q.id === houseId);

  const cast = () => {
    if (!question.trim()) return;
    if (!location) { setChart({ error: "Set your location in Profile first — horary houses need geographic coordinates." }); return; }
    setJudgment(null); setSaved(false);
    setChart(castHorary({ date: new Date(), lat: location.lat, lon: location.lon, quesitedHouse: qh.house }));
  };

  const draftJudgment = async () => {
    if (!chart || chart.error) return;
    setJudging(true); setJudgment(null);
    const sys = buildSystemPrompt(profile,
      "You are a master of horary astrology in the tradition of William Lilly's Christian Astrology. Judge the question strictly from the chart data given: weigh radicality, the significators' essential and accidental dignity, the applying aspects between them (perfection = yes, especially by trine/sextile; square perfects with difficulty; refranation/prohibition denies), translation of light, and the Moon's condition. Give: 1) JUDGMENT — yes/no/conditional, one line. 2) TESTIMONY — the 3-4 decisive factors. 3) TIMING — from the degrees to perfection, if the aspect perfects. 4) CAUTION — if the chart is not radical, say the judgment is unreliable and why. Be direct; horary tradition answers plainly.");
    try {
      setJudgment(await askClaude({ apiKey: profile?.apiKey || "", system: sys, messages: [{ role: "user", content: horaryToText(chart, question) }], maxTokens: 900 }));
    } catch (e) { setJudgment(e.message || "Judgment unavailable."); }
    setJudging(false);
  };

  const saveCastingRecord = () => {
    if (!chart || chart.error || saved) return;
    try {
      createCasting({
        kind: "horary",
        title: question.slice(0, 60),
        intent: question,
        planet: chart.quesited.ruler,
        conditions: conditionsFromProfile(new Date(chart.date), profile, natalPos),
        links: { horary: { asc: chart.asc, quesitedHouse: chart.quesited.house, radical: chart.radical, aspects: chart.aspects, translation: chart.translation, judgment: judgment ? judgment.slice(0, 800) : null } },
      });
      setSaved(true);
    } catch {}
  };

  const IS = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(var(--tint-rgb),0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "9px 11px", fontSize: 12, boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Lilly · Christian Astrology</div>
        <div style={T(20)}>Horary</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>The chart of the question. Ask sincerely, once — the moment of asking carries the answer.</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        <div className="card" style={{ marginBottom: 9 }}>
          <div style={L()}>The Question</div>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} placeholder="Will I get the position? Where is the lost ring? Should I…" style={{ ...IS, marginTop: 8, resize: "none" }} />
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "10px 0 5px" }}>The Matter Belongs To</div>
          <select value={houseId} onChange={e => setHouseId(e.target.value)} style={IS}>
            {QUESTION_HOUSES.map(q => <option key={q.id} value={q.id}>House {q.house} — {q.label}</option>)}
          </select>
          <button onClick={cast} disabled={!question.trim()} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 11, background: question.trim() ? "rgba(var(--tint-rgb),0.12)" : "rgba(0,0,0,0.3)", border: `1px solid ${question.trim() ? "rgba(var(--tint-rgb),0.35)" : "rgba(var(--tint-rgb),0.1)"}`, fontFamily: F, fontSize: 10, color: question.trim() ? GOLD : "#5A4020", letterSpacing: 3, textTransform: "uppercase", cursor: question.trim() ? "pointer" : "default" }}>Cast the Question</button>
        </div>

        {chart?.error && <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(155,80,80,0.1)", border: "1px solid rgba(155,80,80,0.3)", fontFamily: F, fontSize: 11, color: "#C08080", fontStyle: "italic", lineHeight: 1.7, marginBottom: 9 }}>{chart.error}</div>}

        {chart && !chart.error && (
          <>
            {/* Radicality */}
            <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.75)", border: `1px solid ${chart.radical ? "rgba(92,168,92,0.3)" : "rgba(176,80,80,0.35)"}`, padding: "12px 14px", marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.5)", letterSpacing: 3, textTransform: "uppercase" }}>Considerations Before Judgment</div>
                <span style={{ fontFamily: F, fontSize: 10, color: chart.radical ? "#5CA85C" : "#B05050", letterSpacing: 1 }}>{chart.radical ? "RADICAL" : "NOT RADICAL"}</span>
              </div>
              {chart.considerations.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 7, padding: "3px 0" }}>
                  <span style={{ fontSize: 10, color: c.ok ? "#5CA85C" : "#B05050", width: 13 }}>{c.ok ? "✓" : "✗"}</span>
                  <div style={{ fontFamily: F, fontSize: 10, color: c.ok ? "#C4A870" : "#C08080", lineHeight: 1.5 }}>{c.note}</div>
                </div>
              ))}
            </div>

            {/* Significators */}
            <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.65)", border: "1px solid rgba(var(--tint-rgb),0.12)", padding: "12px 14px", marginBottom: 9 }}>
              <div style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.5)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Significators — ASC {fmtLon(chart.asc)} · MC {fmtLon(chart.mc)}</div>
              {[["Querent (you)", chart.querent.ruler, "ruler of the Ascendant"], ["Co-significator", "moon", "the Moon, always"], [`Quesited (house ${chart.quesited.house})`, chart.quesited.ruler, `ruler of the ${chart.quesited.house}th cusp${chart.quesited.sameRuler ? " — same as querent; judge by the Moon" : ""}`]].map(([role, pk, why]) => {
                const p = chart.pos[pk], pl = P[pk];
                return (
                  <div key={role} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px solid rgba(var(--tint-rgb),0.05)" }}>
                    <span style={{ fontSize: 15, color: pl.col, width: 20 }}>{pl.sym}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: F, fontSize: 10.5, color: GOLD }}>{role}: {pl.name} {fmtLon(p.lon)} <span style={{ color: "rgba(var(--tint-rgb),0.45)" }}>house {p.house}{p.retro ? " ℞" : ""} · {p.dignity}</span></div>
                      <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(var(--tint-rgb),0.35)", fontStyle: "italic", marginTop: 1 }}>{why}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aspects & translation */}
            <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.65)", border: "1px solid rgba(200,221,237,0.14)", padding: "12px 14px", marginBottom: 9 }}>
              <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,221,237,0.6)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 7 }}>Perfection</div>
              {chart.aspects.length === 0 && !chart.translation && <div style={{ fontFamily: F, fontSize: 10.5, color: "#9A7060", fontStyle: "italic", lineHeight: 1.7 }}>No aspect forms between the significators — without translation or collection, the matter does not perfect.</div>}
              {chart.aspects.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", alignItems: "center" }}>
                  <span style={{ color: P[a.p1].col, fontSize: 12 }}>{P[a.p1].sym}</span>
                  <span style={{ fontFamily: F, fontSize: 10.5, color: a.applying ? "#5CA85C" : "#9A7060", flex: 1 }}>
                    {P[a.p1].name} {a.aspect} {P[a.p2].name} — orb {a.orb}° {a.applying ? `· applying, perfects ≈ ${a.daysToPerfect} days` : "· separating (the matter has passed)"}
                  </span>
                  <span style={{ color: P[a.p2].col, fontSize: 12 }}>{P[a.p2].sym}</span>
                </div>
              ))}
              {chart.translation && (
                <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 9, background: "rgba(124,184,224,0.08)", border: "1px solid rgba(124,184,224,0.25)", fontFamily: F, fontSize: 10, color: "#7CB8E0" }}>
                  Translation of light: {P[chart.translation.planet].name} carries the light of {P[chart.translation.from].name} to {P[chart.translation.to].name} — a third party joins the matter.
                </div>
              )}
              {chart.collection && (
                <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 9, background: "rgba(160,140,220,0.08)", border: "1px solid rgba(160,140,220,0.25)", fontFamily: F, fontSize: 10, color: "#A08CDC" }}>
                  Collection of light: both significators apply to the weightier {P[chart.collection.planet].name} — a third party gathers and joins the matter.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
              <button onClick={draftJudgment} disabled={judging} style={{ flex: 1, padding: "11px 0", borderRadius: 11, background: "rgba(100,80,160,0.15)", border: "1px solid rgba(100,80,160,0.35)", fontFamily: F, fontSize: 9, color: "rgba(160,140,220,0.85)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{judging ? "Judging…" : "✧ Draft Judgment"}</button>
              <button onClick={saveCastingRecord} style={{ flex: 1, padding: "11px 0", borderRadius: 11, background: saved ? "rgba(92,168,92,0.15)" : "rgba(var(--tint-rgb),0.1)", border: `1px solid ${saved ? "rgba(92,168,92,0.4)" : "rgba(var(--tint-rgb),0.3)"}`, fontFamily: F, fontSize: 9, color: saved ? "#7AB07A" : GOLD, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{saved ? "✓ Recorded" : "⚑ Record Casting"}</button>
            </div>

            {judgment && (
              <div style={{ padding: "13px 14px", borderRadius: 13, background: "rgba(20,15,40,0.8)", border: "1px solid rgba(100,80,160,0.25)", marginBottom: 9 }}>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(160,140,220,0.6)", letterSpacing: 2, marginBottom: 8 }}>JUDGMENT · {profile?.traditions?.map(t => TRADITIONS[t]?.label || t).join(" · ") || "TRADITIONAL"}</div>
                <div style={{ fontFamily: F, fontSize: 11, color: "#C4A870", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{judgment}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
