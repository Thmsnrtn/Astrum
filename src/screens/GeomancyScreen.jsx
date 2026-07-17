// ═══════════════════════════════════════════════════════════════════════
// GEOMANCY SCREEN — the shield and the house chart
// ═══════════════════════════════════════════════════════════════════════
// Ask a question, cast the four Mothers, and the shield derives itself —
// Daughters by transposition, Nieces and Witnesses and Judge by addition.
// The Judge (always one of the eight even figures) gives the headline; the
// twelve figures fall into the astrological houses, the quesited house
// highlighted. An optional AI reading interprets perfection between the
// significators. Saved as a casting (kind: geomancy) so the answer can be
// judged true or false in Review when life delivers the verdict.

import { useState } from "react";
import { F, L, T, P, TRADITIONS, buildSystemPrompt, conditionsFromProfile } from "../App.jsx";
import { castShield, judgeIsValid, identify, judgeVerdict, houseChart, randomMothers, figureFromTallies, perfection, company } from "../lib/geomancy.js";
import { QUESTION_HOUSES } from "../engine/horary.js";
import { createCasting } from "../lib/castings.js";
import { askAI, aiConfigured, aiUnconfiguredMessage } from "../ai/client.js";

const GOLD = "#D4AF6A";
const TONE = { good: { col: "#5CA85C", label: "Favourable" }, bad: { col: "#D24B31", label: "Unfavourable" }, mixed: { col: "#D4AF6A", label: "Mixed" }, unknown: { col: "#8A7050", label: "—" } };

// Draw a geomantic figure: four rows, each a single dot or a pair.
function Fig({ pattern, size = 7, col = "#C4A870" }) {
  const gap = size * 1.7;
  return (
    <svg width={size * 5} height={gap * 4} style={{ display: "block" }}>
      {pattern.map((r, i) => {
        const y = gap * i + gap / 2;
        if (r === 1) return <circle key={i} cx={size * 2.5} cy={y} r={size / 2} fill={col} />;
        return [<circle key={i + "a"} cx={size * 1.4} cy={y} r={size / 2} fill={col} />, <circle key={i + "b"} cx={size * 3.6} cy={y} r={size / 2} fill={col} />];
      })}
    </svg>
  );
}

function FigCell({ label, pattern, highlight }) {
  const rec = identify(pattern);
  const tone = TONE[rec?.tone || "unknown"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", borderRadius: 9, background: highlight ? tone.col + "18" : "rgba(0,0,0,0.25)", border: `1px solid ${highlight ? tone.col + "55" : "rgba(200,175,100,0.1)"}`, minWidth: 44 }}>
      {label && <div style={{ fontFamily: F, fontSize: 6.5, color: "rgba(200,175,100,0.4)", letterSpacing: 0.5, textAlign: "center" }}>{label}</div>}
      <Fig pattern={pattern} col={tone.col} />
      <div style={{ fontFamily: F, fontSize: 6.5, color: tone.col, textAlign: "center", lineHeight: 1.1 }}>{rec?.name || "?"}</div>
    </div>
  );
}

export default function GeomancyScreen({ profile, natalPos }) {
  const [question, setQuestion] = useState("");
  const [houseId, setHouseId] = useState("partner");
  const [shield, setShield] = useState(null);
  const [reading, setReading] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const qh = QUESTION_HOUSES.find(q => q.id === houseId);

  const cast = () => {
    if (!question.trim()) return;
    setReading(null); setSaved(false);
    setShield(castShield(randomMothers()));
  };

  const verdict = shield ? judgeVerdict(shield.judge) : null;
  const chart = shield ? houseChart(shield) : null;
  const quesitedFig = chart ? chart[qh.house - 1].figure : null;
  const querentFig = chart ? chart[0].figure : null;
  const housePatterns = chart ? chart.map(h => h.figure) : null;
  const perf = housePatterns ? perfection(housePatterns, qh.house) : null;
  const querentCompany = housePatterns ? company(housePatterns, 1) : null;
  const quesitedCompany = housePatterns ? company(housePatterns, qh.house) : null;

  const serialize = () => {
    const hc = houseChart(shield).map(h => `H${h.house}=${identify(h.figure)?.name}`).join(", ");
    const perfLine = perf ? (perf.perfects ? `PERFECTION (computed): ${perf.modes.map(m => m.mode).join(", ")} — ${perf.modes.map(m => m.note).join("; ")}.` : "PERFECTION (computed): DENIAL — no occupation, conjunction, mutation, or translation.") : "";
    return `QUESTION: ${question}\nMatter of the ${qh.house}th house (${qh.label}).\n${perfLine}\nMothers: ${shield.mothers.map(m => identify(m)?.name).join(", ")}.\nDaughters: ${shield.daughters.map(m => identify(m)?.name).join(", ")}.\nNieces: ${shield.nieces.map(m => identify(m)?.name).join(", ")}.\nRight Witness: ${identify(shield.rightWitness)?.name}. Left Witness: ${identify(shield.leftWitness)?.name}. Judge: ${identify(shield.judge)?.name}. Reconciler: ${identify(shield.reconciler)?.name}.\nHouse chart: ${hc}.\nQuerent significator (1st house): ${identify(querentFig)?.name}. Quesited significator (${qh.house}th house): ${identify(quesitedFig)?.name}.`;
  };

  const draftReading = async () => {
    if (!shield) return;
    if (!aiConfigured()) { setReading(aiUnconfiguredMessage()); return; }
    setBusy(true); setReading(null);
    const sys = buildSystemPrompt(profile,
      "You are a master geomancer in the tradition of Agrippa and J.M. Greer's Art and Practice of Geomancy. Judge the question from the shield and house chart given. Weigh: the Judge's own nature (the overall outcome), the two Witnesses as the path to it (right = the querent's side/past, left = the outcome's side/future), and above all whether the querent's significator (1st house) and the quesited significator perfect — by occupation, conjunction, mutation, or translation — or fail to. Note the figures' good/bad natures and their company. Give: 1) ANSWER — yes/no/qualified, one line. 2) PERFECTION — do the significators connect, and how. 3) TESTIMONY — the Judge and Witnesses. 4) COUNSEL — what to do. Be direct; geomancy answers plainly.");
    try {
      setReading(await askAI({ apiKey: profile?.apiKey || "", system: sys, messages: [{ role: "user", content: serialize() }], maxTokens: 900 }));
    } catch (e) { setReading(e.message || "Reading unavailable."); }
    setBusy(false);
  };

  const save = () => {
    if (!shield || saved) return;
    try {
      createCasting({
        kind: "geomancy",
        title: question.slice(0, 60),
        intent: question,
        planet: identify(shield.judge)?.planet || null,
        conditions: conditionsFromProfile(new Date(), profile, natalPos),
        links: { geomancy: {
          judge: identify(shield.judge)?.name, rightWitness: identify(shield.rightWitness)?.name, leftWitness: identify(shield.leftWitness)?.name,
          quesitedHouse: qh.house, quesited: identify(quesitedFig)?.name, querent: identify(querentFig)?.name,
          mothers: shield.mothers, reading: reading ? reading.slice(0, 800) : null,
        } },
      });
      setSaved(true);
    } catch {}
  };

  const IS = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(200,175,100,0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "9px 11px", fontSize: 12, boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Ars Geomantica · Agrippa · Greer</div>
        <div style={T(20)}>Geomancy</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>The oldest divination of the elements — sixteen figures born of odd and even, the whole answer folded into a single Judge.</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        <div className="card" style={{ marginBottom: 9 }}>
          <div style={L()}>The Question</div>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} placeholder="Will the matter come to pass? Where is the lost thing? Should I…" style={{ ...IS, marginTop: 8, resize: "none" }} />
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "10px 0 5px" }}>The Matter Belongs To</div>
          <select value={houseId} onChange={e => setHouseId(e.target.value)} style={IS}>
            {QUESTION_HOUSES.map(q => <option key={q.id} value={q.id}>House {q.house} — {q.label}</option>)}
          </select>
          <button onClick={cast} disabled={!question.trim()} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 11, background: question.trim() ? "rgba(212,175,106,0.12)" : "rgba(0,0,0,0.3)", border: `1px solid ${question.trim() ? "rgba(212,175,106,0.35)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 10, color: question.trim() ? GOLD : "#5A4020", letterSpacing: 3, textTransform: "uppercase", cursor: question.trim() ? "pointer" : "default" }}>{shield ? "Cast Again" : "Cast the Figures"}</button>
        </div>

        {shield && verdict && (
          <>
            {/* Judge verdict */}
            <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.8)", border: `1px solid ${TONE[verdict.tone]?.col || GOLD}45`, padding: "13px 14px", marginBottom: 9, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flexShrink: 0 }}><Fig pattern={shield.judge} size={9} col={TONE[verdict.tone]?.col} /></div>
              <div>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.5)", letterSpacing: 2, textTransform: "uppercase" }}>The Judge — {TONE[verdict.tone]?.label}</div>
                <div style={{ fontFamily: F, fontSize: 15, color: TONE[verdict.tone]?.col }}>{verdict.figure}</div>
                <div style={{ fontFamily: F, fontSize: 10, color: "#9A8060", fontStyle: "italic", lineHeight: 1.6, marginTop: 3 }}>{verdict.text}</div>
                {!judgeIsValid(shield.judge) && <div style={{ fontFamily: F, fontSize: 8.5, color: "#D24B31", marginTop: 3 }}>⚠ Odd Judge — a cast error (should never occur).</div>}
              </div>
            </div>

            {/* Shield: witnesses + judge */}
            <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(200,175,100,0.1)", padding: "12px 10px", marginBottom: 9 }}>
              <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>The Shield</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
                {shield.mothers.map((m, i) => <FigCell key={"m" + i} label={`Mother ${4 - i}`} pattern={shield.mothers[3 - i]} />)}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
                {shield.daughters.map((m, i) => <FigCell key={"d" + i} label={`Daughter ${4 - i}`} pattern={shield.daughters[3 - i]} />)}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 6 }}>
                <FigCell label="Right Witness" pattern={shield.rightWitness} />
                <FigCell label="Left Witness" pattern={shield.leftWitness} />
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <FigCell label="Judge" pattern={shield.judge} highlight />
              </div>
            </div>

            {/* Perfection — the mechanical judgment */}
            {perf && (
              <div style={{ borderRadius: 13, background: perf.perfects ? "rgba(92,168,92,0.08)" : "rgba(180,80,60,0.07)", border: `1px solid ${perf.perfects ? "rgba(92,168,92,0.3)" : "rgba(180,80,60,0.28)"}`, padding: "11px 13px", marginBottom: 9 }}>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>Perfection</div>
                {perf.perfects ? perf.modes.map((m, i) => (
                  <div key={i} style={{ fontFamily: F, fontSize: 10.5, color: "#7AB07A", lineHeight: 1.65, padding: "1px 0" }}>✓ <span style={{ textTransform: "capitalize" }}>{m.mode}</span> — {m.note}</div>
                )) : (
                  <div style={{ fontFamily: F, fontSize: 10.5, color: "#D28060", lineHeight: 1.65 }}>✗ Denial — the significators do not connect by occupation, conjunction, mutation, or translation. The matter does not perfect as asked.</div>
                )}
                {(querentCompany || quesitedCompany) && (
                  <div style={{ fontFamily: F, fontSize: 9, color: "#9A8060", fontStyle: "italic", marginTop: 5 }}>
                    {querentCompany && <>Querent keeps {querentCompany.kind} company with house {querentCompany.partner}. </>}
                    {quesitedCompany && <>Quesited keeps {quesitedCompany.kind} company with house {quesitedCompany.partner}.</>}
                  </div>
                )}
              </div>
            )}

            {/* House chart */}
            <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(200,175,100,0.1)", padding: "12px 10px", marginBottom: 9 }}>
              <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>The Twelve Houses</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                {chart.map(h => (
                  <FigCell key={h.house} label={`${h.house}${h.house === 1 ? " · Querent" : h.house === qh.house ? " · Quesited" : ""}`} pattern={h.figure} highlight={h.house === qh.house || h.house === 1} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
              <button onClick={draftReading} disabled={busy} style={{ flex: 1, padding: "11px 0", borderRadius: 11, background: "rgba(100,80,160,0.15)", border: "1px solid rgba(100,80,160,0.35)", fontFamily: F, fontSize: 9, color: "rgba(160,140,220,0.85)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{busy ? "Reading…" : "✧ Draft Judgment"}</button>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", borderRadius: 11, background: saved ? "rgba(92,168,92,0.15)" : "rgba(212,175,106,0.1)", border: `1px solid ${saved ? "rgba(92,168,92,0.4)" : "rgba(212,175,106,0.3)"}`, fontFamily: F, fontSize: 9, color: saved ? "#7AB07A" : GOLD, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{saved ? "✓ Recorded" : "⚑ Record Casting"}</button>
            </div>

            {reading && (
              <div style={{ padding: "13px 14px", borderRadius: 13, background: "rgba(20,15,40,0.8)", border: "1px solid rgba(100,80,160,0.25)", marginBottom: 9 }}>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(160,140,220,0.6)", letterSpacing: 2, marginBottom: 8 }}>JUDGMENT · {profile?.traditions?.map(t => TRADITIONS[t]?.label || t).join(" · ") || "GEOMANTIC"}</div>
                <div style={{ fontFamily: F, fontSize: 11, color: "#C4A870", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{reading}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
