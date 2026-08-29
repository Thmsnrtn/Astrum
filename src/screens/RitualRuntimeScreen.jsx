// ═══════════════════════════════════════════════════════════════════════
// RITUAL RUNTIME — the instrument in the hand during the work
// ═══════════════════════════════════════════════════════════════════════
// The Work screen makes a plan; this walks it. A distraction-minimal, full-
// bleed companion for the elected hour: the planetary hour held at the top,
// the steps advanced one at a time, a slow breath pacer, and — when the rite
// is sealed — a casting recorded with the sky as it stood, so the working
// enters the Operator's Loop and can be judged later in Review.

import { useState, useEffect, useMemo, useRef } from "react";
import { F, L, T, GOLD } from "../ui/theme.js";
import { P } from "../data/planets.js";
import { TRADITIONS, TRADITION_STEPS } from "../data/traditions.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { createCasting } from "../lib/castings.js";
import { loadSpirits } from "../lib/spirits.js";
import { startDrum, bell, soundAvailable } from "../lib/sound.js";
import { ORPHIC_HYMNS } from "../data/orphicHymns.js";
import { useWakeLock } from "../lib/wakeLock.js";

const fmtElapsed = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export default function RitualRuntimeScreen({ eph, hour, profile, natalPos, now }) {
  const primaryTrad = profile?.traditions?.[0] || "western-ceremonial";
  const [phase, setPhase] = useState("setup"); // setup | running | done
  const [tradition, setTradition] = useState(primaryTrad);
  const [planet, setPlanet] = useState("jupiter");
  const [intent, setIntent] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [breathIn, setBreathIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allies, setAllies] = useState([]);
  const court = loadSpirits();
  const [drumming, setDrumming] = useState(false);
  const [hymnOpen, setHymnOpen] = useState(false);
  const drumStop = useRef(null);
  const toggleDrum = () => {
    if (drumming) { drumStop.current?.(); drumStop.current = null; setDrumming(false); }
    else { drumStop.current = startDrum(4.5); if (drumStop.current) setDrumming(true); }
  };
  // Stop the drum when leaving the running phase or unmounting.
  useEffect(() => () => { drumStop.current?.(); }, []);
  useEffect(() => { if (phase !== "running" && drumming) { drumStop.current?.(); drumStop.current = null; setDrumming(false); } }, [phase]); // eslint-disable-line

  const steps = TRADITION_STEPS[tradition] || TRADITION_STEPS["western-ceremonial"];
  useWakeLock(phase === "running"); // the rite must not dim mid-working
  const hourPlanet = hour?.planet;
  const aligned = hourPlanet === planet;
  const dayRuler = hour?.dayRuler;
  const dayAligned = dayRuler === planet;

  // Elapsed timer while running.
  useEffect(() => {
    if (phase !== "running" || !startedAt) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [phase, startedAt]);
  // Slow breath pacer (~4s in / 4s out).
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setBreathIn(b => !b), 4000);
    return () => clearInterval(t);
  }, [phase]);

  const begin = () => { setStepIdx(0); setStartedAt(Date.now()); setElapsed(0); setPhase("running"); };
  const next = () => { if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1); else { try { bell(432); } catch {} setPhase("done"); } };
  const prev = () => { if (stepIdx > 0) setStepIdx(stepIdx - 1); };

  const seal = () => {
    if (saved) return;
    try {
      createCasting({
        kind: "working", title: intent.slice(0, 60) || `${P[planet].name} rite`, intent,
        planet, tradition,
        conditions: conditionsFromProfile(new Date(), profile, natalPos),
        links: { ritual: { tradition, steps: steps.length, elapsedMs: elapsed, sealedAt: new Date().toISOString() }, ...(allies.length ? { spirits: allies } : {}) },
      });
      setSaved(true);
    } catch {}
  };

  const IS = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(var(--tint-rgb),0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "9px 11px", fontSize: 12, boxSizing: "border-box", resize: "none" };
  const pc = P[planet]?.col || GOLD;

  // ── Setup ────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
        <div style={{ padding: "16px 18px 8px" }}>
          <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>The Rite in Progress</div>
          <div style={T(20)}>Ritual Runtime</div>
          <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>Set the frame, then step through the working under the hour — the instrument in your hand, not on the shelf.</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
          {/* Current hour */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 13, background: "rgba(8,5,22,0.7)", border: `1px solid ${aligned ? "rgba(92,168,92,0.35)" : "rgba(var(--tint-rgb),0.12)"}`, marginBottom: 10 }}>
            <div style={{ fontSize: 26, color: P[hourPlanet]?.col || GOLD }}>{P[hourPlanet]?.sym}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F, fontSize: 12, color: GOLD }}>Hour of {P[hourPlanet]?.name}</div>
              <div style={{ fontFamily: F, fontSize: 9, color: aligned ? "#7AB07A" : "#8A7050", marginTop: 2 }}>{aligned ? "✓ Aligned with your working planet" : dayAligned ? "Day aligned; hour differs" : "Consider waiting for the planet's hour"}</div>
            </div>
          </div>
          <div className="card" style={{ marginBottom: 9 }}>
            <div style={L()}>The Working Planet</div>
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>{Object.keys(P).map(pk => { const a = planet === pk; return <button key={pk} onClick={() => setPlanet(pk)} style={{ flex: 1, padding: "8px 2px", borderRadius: 8, background: a ? P[pk].col + "18" : "rgba(8,5,22,0.5)", border: `1px solid ${a ? P[pk].col + "48" : "rgba(var(--tint-rgb),0.09)"}`, cursor: "pointer" }}><div style={{ fontSize: 15, textAlign: "center", color: P[pk].col }}>{P[pk].sym}</div></button>; })}</div>
          </div>
          <div className="card" style={{ marginBottom: 9 }}>
            <div style={L()}>The Rite</div>
            <select value={tradition} onChange={e => setTradition(e.target.value)} style={{ ...IS, marginTop: 8 }}>
              {Object.keys(TRADITION_STEPS).map(t => <option key={t} value={t}>{TRADITIONS[t]?.label || t} — {TRADITION_STEPS[t].length} steps</option>)}
            </select>
            <textarea value={intent} onChange={e => setIntent(e.target.value)} rows={2} placeholder="Name the intent of this working…" style={{ ...IS, marginTop: 8 }} />
            {court.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.4)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Working With (optional)</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {court.slice(0, 12).map(s => {
                    const on = allies.includes(s.name);
                    return <button key={s.id} onClick={() => setAllies(a => on ? a.filter(x => x !== s.name) : [...a, s.name])} style={{ fontFamily: F, fontSize: 8.5, color: on ? GOLD : "#7A6030", background: on ? "rgba(var(--tint-rgb),0.14)" : "rgba(0,0,0,0.3)", border: `1px solid ${on ? "rgba(var(--tint-rgb),0.4)" : "rgba(var(--tint-rgb),0.12)"}`, borderRadius: 12, padding: "4px 10px", cursor: "pointer" }}>{on ? "✓ " : ""}{s.name}</button>;
                  })}
                </div>
              </div>
            )}
          </div>
          <button onClick={begin} style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: pc + "18", border: `1px solid ${pc}45`, fontFamily: F, fontSize: 11, color: pc, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>✦ Begin the Rite</button>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 40, color: pc, marginBottom: 14 }}>{P[planet]?.sym}</div>
        <div style={T(22)}>The Rite is Sealed</div>
        <div style={{ fontFamily: F, fontSize: 11, color: "#9A8060", fontStyle: "italic", lineHeight: 1.8, margin: "10px 0 4px", maxWidth: 300 }}>{steps.length} steps · {fmtElapsed(elapsed)} under the hour of {P[hourPlanet]?.name}. Let it go now — the outcome operates in its own time.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 18, width: "100%", maxWidth: 320 }}>
          <button onClick={seal} disabled={saved} style={{ flex: 1, padding: "12px 0", borderRadius: 11, background: saved ? "rgba(92,168,92,0.15)" : pc + "16", border: `1px solid ${saved ? "rgba(92,168,92,0.4)" : pc + "40"}`, fontFamily: F, fontSize: 9.5, color: saved ? "#7AB07A" : pc, letterSpacing: 2, textTransform: "uppercase", cursor: saved ? "default" : "pointer" }}>{saved ? "✓ Recorded — judge in Review" : "⚑ Record This Working"}</button>
          <button onClick={() => { setPhase("setup"); setSaved(false); setIntent(""); }} style={{ flex: 1, padding: "12px 0", borderRadius: 11, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(var(--tint-rgb),0.15)", fontFamily: F, fontSize: 9.5, color: "rgba(var(--tint-rgb),0.55)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>New Rite</button>
        </div>
      </div>
    );
  }

  // ── Running (full-bleed) ─────────────────────────────────────────────
  const step = steps[stepIdx];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "radial-gradient(ellipse at 50% 30%, " + pc + "0C, transparent 70%)" }}>
      {/* Hour + progress header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: "1px solid rgba(var(--tint-rgb),0.08)" }}>
        <span style={{ fontSize: 18, color: P[hourPlanet]?.col || GOLD }}>{P[hourPlanet]?.sym}</span>
        <span style={{ fontFamily: F, fontSize: 10, color: aligned ? "#7AB07A" : "rgba(var(--tint-rgb),0.5)" }}>Hour of {P[hourPlanet]?.name}{aligned ? " ✓" : ""}</span>
        {ORPHIC_HYMNS[planet] && <button onClick={() => setHymnOpen(true)} aria-label="Recite the Orphic hymn" style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(var(--tint-rgb),0.2)", borderRadius: 8, color: "rgba(var(--tint-rgb),0.6)", fontFamily: F, fontSize: 9, padding: "4px 10px", letterSpacing: 1, cursor: "pointer" }}>✦ hymn</button>}
        {soundAvailable() && <button onClick={toggleDrum} style={{ background: drumming ? pc + "1A" : "none", border: `1px solid ${drumming ? pc + "50" : "rgba(var(--tint-rgb),0.15)"}`, borderRadius: 8, color: drumming ? pc : "rgba(var(--tint-rgb),0.45)", fontFamily: F, fontSize: 9, padding: "4px 10px", letterSpacing: 1, cursor: "pointer" }}>{drumming ? "◉ drum" : "○ drum"}</button>}
        <span style={{ fontFamily: F, fontSize: 10, color: "rgba(var(--tint-rgb),0.35)", marginLeft: soundAvailable() ? 0 : "auto" }}>{fmtElapsed(elapsed)}</span>
      </div>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", padding: "12px 0 4px" }}>
        {steps.map((_, i) => <div key={i} style={{ width: i === stepIdx ? 22 : 7, height: 7, borderRadius: 4, background: i < stepIdx ? pc + "80" : i === stepIdx ? pc : "rgba(var(--tint-rgb),0.15)", transition: "all 0.3s" }} />)}
      </div>
      {/* Step body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 26px", textAlign: "center" }}>
        {/* Breath pacer */}
        <div style={{ width: 90, height: 90, borderRadius: 45, border: `1.5px solid ${pc}55`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 26, transform: breathIn ? "scale(1.18)" : "scale(0.92)", transition: "transform 4s ease-in-out", background: "radial-gradient(circle, " + pc + "20, transparent)" }}>
          <span style={{ fontFamily: F, fontSize: 30, color: pc }}>{stepIdx + 1}</span>
        </div>
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(var(--tint-rgb),0.4)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Step {stepIdx + 1} of {steps.length}</div>
        <div style={{ fontFamily: F, fontSize: 21, color: GOLD, marginBottom: 14 }}>{step.t}</div>
        <div style={{ fontFamily: F, fontSize: 13, color: "#B8A578", lineHeight: 2, maxWidth: 420 }}>{step.d}</div>
      </div>
      {hymnOpen && ORPHIC_HYMNS[planet] && (() => { const h = ORPHIC_HYMNS[planet]; return (
        <div onClick={() => setHymnOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(2,3,10,0.96)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 26px", overflowY: "auto", cursor: "pointer" }}>
          <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(var(--tint-rgb),0.5)", letterSpacing: 3, textTransform: "uppercase" }}>Orphic Hymn {h.taylorNumber} · Taylor 1792 · {h.deity}</div>
          <div style={{ fontFamily: F, fontSize: 17, color: pc, letterSpacing: 4, textTransform: "uppercase", margin: "6px 0 2px" }}>{h.title}</div>
          {h.fumigation && <div style={{ fontFamily: F, fontSize: 9.5, color: "rgba(var(--tint-rgb),0.45)", fontStyle: "italic", marginBottom: 14 }}>{h.fumigation}</div>}
          <div style={{ maxWidth: 440 }}>
            {h.lines.map((l, i) => <div key={i} style={{ fontFamily: F, fontSize: 13.5, color: "#C8B588", lineHeight: 2.05, textAlign: "center" }}>{l}</div>)}
          </div>
          <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(var(--tint-rgb),0.35)", marginTop: 16, letterSpacing: 2, textTransform: "uppercase" }}>tap anywhere to return to the rite</div>
        </div>
      ); })()}
      {/* Controls */}
      <div style={{ display: "flex", gap: 9, padding: "14px 18px 20px" }}>
        <button onClick={prev} disabled={stepIdx === 0} style={{ padding: "13px 20px", borderRadius: 11, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(var(--tint-rgb),0.15)", fontFamily: F, fontSize: 10, color: stepIdx === 0 ? "#4A3818" : "rgba(var(--tint-rgb),0.55)", letterSpacing: 1, cursor: stepIdx === 0 ? "default" : "pointer" }}>← Back</button>
        <button onClick={next} style={{ flex: 1, padding: "13px 0", borderRadius: 11, background: pc + "1A", border: `1px solid ${pc}48`, fontFamily: F, fontSize: 11, color: pc, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>{stepIdx < steps.length - 1 ? "Next →" : "Seal the Rite ✦"}</button>
      </div>
    </div>
  );
}
