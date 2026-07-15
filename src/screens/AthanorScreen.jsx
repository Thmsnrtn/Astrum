// ═══════════════════════════════════════════════════════════════════════
// ATHANOR SCREEN — the alchemical laboratory
// ═══════════════════════════════════════════════════════════════════════
// Active operations with their next timed step, a lab notebook per
// operation (distinct from the grimoire), and completion flowing into the
// Operator's Loop for judgment.

import { useState } from "react";
import { F, L, T, P, conditionsFromProfile } from "../App.jsx";
import { OPERATION_TEMPLATES } from "../data/operations.js";
import { loadAthanor, createOperation, completeStep, addLabNote, abandonOperation, deleteOperation } from "../lib/athanor.js";
import { createCasting, loadCastings, addOutcome } from "../lib/castings.js";
import { loadJSON, saveJSON } from "../lib/storage.js";

const GOLD = "#D4AF6A";
const fmtT = d => `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} ${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

export default function AthanorScreen({ profile, natalPos }) {
  // note: inside the component, not module scope — F comes from App.jsx via a
  // circular import and isn't initialized until App.jsx finishes evaluating
  const IS = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(200,175,100,0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "9px 11px", fontSize: 12, boxSizing: "border-box" };
  const [ops, setOps] = useState(loadAthanor);
  const [mode, setMode] = useState("list"); // list | new | view
  const [sel, setSel] = useState(null);
  const [templateId, setTemplateId] = useState("tincture");
  const [planet, setPlanet] = useState("jupiter");
  const [name, setName] = useState("");
  const [stepNote, setStepNote] = useState("");
  const [labText, setLabText] = useState("");
  const location = profile?.natal?.lat && profile?.natal?.lon ? { lat: profile.natal.lat, lon: profile.natal.lon } : null;
  const refresh = () => { const l = loadAthanor(); setOps(l); if (sel) setSel(l.find(o => o.id === sel.id) || null); };

  const start = () => {
    const op = createOperation({ name: name.trim() || undefined, templateId, planet, location });
    try {
      const casting = createCasting({ kind: "athanor", title: op.name, intent: `${OPERATION_TEMPLATES[templateId]?.name || "Operation"} of ${P[planet].name}`, planet,
        conditions: conditionsFromProfile(new Date(), profile, natalPos), links: { athanorId: op.id } });
      updateCastingId(op.id, casting.id);
    } catch {}
    setName(""); setMode("list"); refresh();
  };
  const updateCastingId = (opId, castingId) => {
    const list = loadAthanor().map(o => o.id === opId ? { ...o, castingId } : o);
    saveJSON("astrum_athanor", list);
  };

  const doCompleteStep = (op, step) => {
    const { op: updated, finished } = completeStep(op.id, step.id, stepNote.trim(), location);
    setStepNote("");
    if (finished) {
      try {
        // outcome prompt lands in Review; a summary goes to the grimoire
        const casting = loadCastings().find(c => c.links?.athanorId === op.id);
        if (casting) addOutcome(casting.id, { verdict: "unknown", note: "Operation completed — judge the result when it has spoken." });
        const grim = { id: Date.now(), title: `${updated.name} — completed`, planet: updated.planet,
          body: `OPERATION: ${updated.name} (${OPERATION_TEMPLATES[updated.template]?.name || updated.template})\nPLANET: ${P[updated.planet].name}\nSTARTED: ${new Date(updated.startedAt).toLocaleDateString()}\nCOMPLETED: ${new Date().toLocaleDateString()}\n\nSTEPS:\n${updated.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.completedAt ? new Date(s.completedAt).toLocaleDateString() : "—"}${s.note ? ` · ${s.note}` : ""}`).join("\n")}\n\nLAB NOTES:\n${(updated.labNotes || []).map(n => `[${new Date(n.ts).toLocaleDateString()}] ${n.text}`).join("\n") || "—"}`,
          tags: [updated.planet, "athanor"], date: new Date().toISOString().split("T")[0], category: "observation", type: "athanor" };
        saveJSON("astrum_grimoire", [grim, ...loadJSON("astrum_grimoire", [])]);
      } catch {}
    }
    refresh();
  };

  const OpCard = ({ op }) => {
    const nextStep = op.steps.find(s => !s.completedAt);
    const done = op.steps.filter(s => s.completedAt).length;
    const pl = P[op.planet];
    return (
      <button onClick={() => { setSel(op); setMode("view"); }} style={{ width: "100%", textAlign: "left", marginBottom: 8, padding: "12px 13px", borderRadius: 13, background: "rgba(8,5,22,0.65)", border: `1px solid ${pl.col}25`, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, color: pl.col }}>{pl.sym}</span>
            <span style={{ fontFamily: F, fontSize: 12, color: GOLD }}>{op.name}</span>
          </div>
          <span style={{ fontFamily: F, fontSize: 8, color: op.status === "active" ? "#7AB07A" : op.status === "complete" ? GOLD : "#9B5050", letterSpacing: 1.5, textTransform: "uppercase" }}>{op.status}</span>
        </div>
        <div style={{ display: "flex", gap: 3, margin: "8px 0 6px" }}>
          {op.steps.map(s => <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: s.completedAt ? pl.col : "rgba(200,175,100,0.12)" }} />)}
        </div>
        {op.status === "active" && nextStep && (
          <div style={{ fontFamily: F, fontSize: 9.5, color: "rgba(200,175,100,0.55)", fontStyle: "italic" }}>
            Next: {nextStep.title}{nextStep.scheduledFor ? ` — ${fmtT(new Date(nextStep.scheduledFor))}` : ""} · {done}/{op.steps.length} done
          </div>
        )}
      </button>
    );
  };

  // ── New operation ──
  if (mode === "new") {
    const tpl = OPERATION_TEMPLATES[templateId];
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 30px" }}>
        <button onClick={() => setMode("list")} style={{ background: "none", border: "none", color: "rgba(200,175,100,0.5)", fontFamily: F, fontSize: 10, letterSpacing: 2, cursor: "pointer", marginBottom: 14, padding: 0 }}>← ATHANOR</button>
        <div style={T(18)}>Light the Fire</div>
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "14px 0 6px" }}>Operation</div>
        {Object.values(OPERATION_TEMPLATES).map(t => (
          <button key={t.id} onClick={() => setTemplateId(t.id)} style={{ width: "100%", textAlign: "left", marginBottom: 6, padding: "10px 12px", borderRadius: 11, background: templateId === t.id ? "rgba(212,175,106,0.09)" : "rgba(0,0,0,0.25)", border: `1px solid ${templateId === t.id ? "rgba(212,175,106,0.4)" : "rgba(200,175,100,0.08)"}`, cursor: "pointer" }}>
            <div style={{ fontFamily: F, fontSize: 11.5, color: templateId === t.id ? GOLD : "rgba(200,175,100,0.55)" }}>🜍 {t.name} <span style={{ fontSize: 8.5, color: "rgba(200,175,100,0.35)" }}>· {t.steps.length} steps</span></div>
            <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.35)", fontStyle: "italic", marginTop: 3, lineHeight: 1.5 }}>{t.desc}</div>
          </button>
        ))}
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "12px 0 6px" }}>Ruling Planet</div>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.keys(P).map(pk => (
            <button key={pk} onClick={() => setPlanet(pk)} style={{ flex: 1, padding: "8px 2px", borderRadius: 9, background: planet === pk ? P[pk].col + "18" : "rgba(0,0,0,0.25)", border: `1px solid ${planet === pk ? P[pk].col + "55" : "rgba(200,175,100,0.08)"}`, cursor: "pointer" }}>
              <div style={{ fontSize: 14, textAlign: "center", color: planet === pk ? P[pk].col : "rgba(200,175,100,0.3)" }}>{P[pk].sym}</div>
            </button>
          ))}
        </div>
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", fontStyle: "italic", marginTop: 6, lineHeight: 1.6 }}>Herbs of {P[planet].name}: {P[planet].herbs}</div>
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "12px 0 6px" }}>Name the Work (optional)</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. ${P[planet].name} tincture of ${(P[planet].herbs || "").split("·")[0].trim().toLowerCase()}`} style={IS} />
        <button onClick={start} style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, background: "rgba(212,175,106,0.12)", border: "1px solid rgba(212,175,106,0.35)", fontFamily: F, fontSize: 10, color: GOLD, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>🜂 Begin the Operation</button>
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", fontStyle: "italic", marginTop: 8, textAlign: "center", lineHeight: 1.6 }}>The first step is scheduled to the next qualifying window; each completed step schedules the next. Ambient notifications remind you when a window opens.</div>
      </div>
    );
  }

  // ── Operation detail ──
  if (mode === "view" && sel) {
    const op = sel;
    const pl = P[op.planet];
    const nextStep = op.steps.find(s => !s.completedAt);
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 30px" }}>
        <button onClick={() => { setMode("list"); setSel(null); refresh(); }} style={{ background: "none", border: "none", color: "rgba(200,175,100,0.5)", fontFamily: F, fontSize: 10, letterSpacing: 2, cursor: "pointer", marginBottom: 14, padding: 0 }}>← ATHANOR</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={T(18)}><span style={{ color: pl.col }}>{pl.sym}</span> {op.name}</div>
            <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.4)", marginTop: 3 }}>{OPERATION_TEMPLATES[op.template]?.name} · begun {new Date(op.startedAt).toLocaleDateString()} · {op.status}</div>
          </div>
        </div>

        {op.status === "active" && nextStep && (
          <div style={{ marginTop: 12, padding: "13px 14px", borderRadius: 13, background: `${pl.col}0D`, border: `1px solid ${pl.col}40` }}>
            <div style={{ fontFamily: F, fontSize: 8, color: pl.col, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 5 }}>Next Step{nextStep.scheduledFor ? ` — window opens ${fmtT(new Date(nextStep.scheduledFor))}` : ""}</div>
            <div style={{ fontFamily: F, fontSize: 13, color: GOLD }}>{nextStep.title}</div>
            <div style={{ fontFamily: F, fontSize: 10.5, color: "#9A8060", fontStyle: "italic", lineHeight: 1.8, marginTop: 6 }}>{nextStep.instructions}</div>
            <textarea value={stepNote} onChange={e => setStepNote(e.target.value)} rows={2} placeholder="Observations at completion (optional)…" style={{ ...IS, marginTop: 9, resize: "none" }} />
            <button onClick={() => doCompleteStep(op, nextStep)} style={{ width: "100%", marginTop: 7, padding: "11px 0", borderRadius: 10, background: "rgba(92,168,92,0.12)", border: "1px solid rgba(92,168,92,0.35)", fontFamily: F, fontSize: 9.5, color: "#7AB07A", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>✓ Step Completed</button>
          </div>
        )}
        {op.status === "complete" && <div style={{ marginTop: 12, padding: "11px 13px", borderRadius: 12, background: "rgba(212,175,106,0.08)", border: "1px solid rgba(212,175,106,0.3)", fontFamily: F, fontSize: 10.5, color: GOLD, fontStyle: "italic", lineHeight: 1.7 }}>The operation is complete. A summary has been written to the Grimoire, and Review will ask for the verdict when the work has spoken.</div>}

        {/* Timeline */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 7 }}>Process Timeline</div>
          {op.steps.map((s, i) => (
            <div key={s.id} style={{ display: "flex", gap: 10, marginBottom: 2 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: s.completedAt ? pl.col : "rgba(0,0,0,0.4)", border: `1.5px solid ${s.completedAt ? pl.col : s === nextStep ? pl.col + "80" : "rgba(200,175,100,0.2)"}`, flexShrink: 0, marginTop: 3 }} />
                {i < op.steps.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 14, background: s.completedAt ? pl.col + "50" : "rgba(200,175,100,0.1)" }} />}
              </div>
              <div style={{ paddingBottom: 12, flex: 1 }}>
                <div style={{ fontFamily: F, fontSize: 11, color: s.completedAt ? "#C4A870" : s === nextStep ? GOLD : "rgba(200,175,100,0.35)" }}>{s.title}</div>
                <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", marginTop: 1 }}>
                  {s.completedAt ? `done ${fmtT(new Date(s.completedAt))}` : s.scheduledFor ? `window ${fmtT(new Date(s.scheduledFor))}` : "awaits the previous step"}
                </div>
                {s.note && <div style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", fontStyle: "italic", marginTop: 3, lineHeight: 1.6 }}>{s.note}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Lab notebook */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 7 }}>Lab Notebook</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={labText} onChange={e => setLabText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && labText.trim()) { addLabNote(op.id, labText.trim()); setLabText(""); refresh(); } }} placeholder="Color change, aroma, signs, synchronicities…" style={{ ...IS, flex: 1 }} />
            <button onClick={() => { if (labText.trim()) { addLabNote(op.id, labText.trim()); setLabText(""); refresh(); } }} style={{ padding: "0 14px", borderRadius: 10, background: "rgba(212,175,106,0.1)", border: "1px solid rgba(212,175,106,0.3)", fontFamily: F, fontSize: 9, color: GOLD, letterSpacing: 1, cursor: "pointer" }}>LOG</button>
          </div>
          {(op.labNotes || []).map(n => (
            <div key={n.id} style={{ marginTop: 6, padding: "8px 11px", borderRadius: 10, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(200,175,100,0.08)" }}>
              <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.35)", marginBottom: 3 }}>{fmtT(new Date(n.ts))}</div>
              <div style={{ fontFamily: F, fontSize: 10.5, color: "#C4A870", fontStyle: "italic", lineHeight: 1.7 }}>{n.text}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {op.status === "active" && <button onClick={() => { abandonOperation(op.id); refresh(); }} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: "none", border: "1px solid rgba(200,100,80,0.25)", fontFamily: F, fontSize: 8.5, color: "rgba(200,100,80,0.6)", letterSpacing: 1.5, cursor: "pointer" }}>ABANDON</button>}
          <button onClick={() => { deleteOperation(op.id); setMode("list"); setSel(null); refresh(); }} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: "none", border: "1px solid rgba(200,100,80,0.2)", fontFamily: F, fontSize: 8.5, color: "rgba(200,100,80,0.45)", letterSpacing: 1.5, cursor: "pointer" }}>DELETE</button>
        </div>
      </div>
    );
  }

  // ── List ──
  const active = ops.filter(o => o.status === "active");
  const finished = ops.filter(o => o.status !== "active");
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Spagyria · The Slow Fire</div>
          <div style={T(20)}>The Athanor</div>
        </div>
        <button onClick={() => setMode("new")} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(212,175,106,0.1)", border: "1px solid rgba(212,175,106,0.28)", fontFamily: F, fontSize: 9, color: GOLD, letterSpacing: 2, cursor: "pointer" }}>+ OPERATION</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {ops.length === 0 && <div style={{ textAlign: "center", padding: "40px 24px", fontFamily: F, fontSize: 12, color: "#5A4020", fontStyle: "italic", lineHeight: 1.9 }}>The fire is unlit.<br />Begin a spagyric tincture, a planetary water, or a fermentation — each step timed to the hours and the Moon, with reminders when the windows open.</div>}
        {active.map(op => <OpCard key={op.id} op={op} />)}
        {finished.length > 0 && <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.35)", letterSpacing: 2.5, textTransform: "uppercase", margin: "12px 0 7px" }}>Completed & Abandoned</div>}
        {finished.map(op => <OpCard key={op.id} op={op} />)}
      </div>
    </div>
  );
}
