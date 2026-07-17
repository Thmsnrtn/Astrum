// ═══════════════════════════════════════════════════════════════════════
// ATHANOR SCREEN — the alchemical home base
// ═══════════════════════════════════════════════════════════════════════
// Three chambers:
//   THE FIRE    — active operations, next timed steps, lab notebook
//   THE SEASON  — the live astro-alchemical dashboard: the Sun's process,
//                 the Moon's operation-key and solve/coagula tide, the
//                 day's counsel, the mansion's laboratory note
//   THE LIBRARY — the verified corpus: stages, the alchemical zodiac,
//                 Ripley's gates, tria prima, metals, fire degrees,
//                 axioms, the Emerald Tablet, the study-only paths
// Everything cast here flows into the Operator's Loop.

import { useState } from "react";
import { F, L, T, P, conditionsFromProfile } from "../App.jsx";
import { OPERATION_TEMPLATES, OPERATION_FAMILIES, TIER_META, TEMPLATE_ORDER } from "../data/operations.js";
import {
  GREAT_WORK_STAGES, CAUDA_PAVONIS, STAGE_SCHEMES_NOTE, ALCHEMICAL_ZODIAC, RIPLEY_GATES,
  TRIA_PRIMA, TRIA_PRIMA_NOTE, ELEMENTS, METALS, AGRIPPA_KAMEA_METALS, EMERALD_TABLET,
  AXIOMS, ATHANOR_LORE, GLYPHS, FIRE_DEGREES, FIRE_RULE, TIMING_DOCTRINE,
  DAY_OPERATION_COUNSEL, STUDY_ONLY_PATHS, LAB_RECORD_PROMPTS,
  alchemicalSeason, moonSignOperation, moonWorkGuidance, MANSION_LAB_NOTES,
} from "../data/alchemy.js";
import { getMansion } from "../data/mansions.js";
import { loadAthanor, createOperation, completeStep, addLabNote, abandonOperation, deleteOperation, describeDueRule, setOpPhotos } from "../lib/athanor.js";
import PhotoStrip from "./PhotoStrip.jsx";
import { createCasting, loadCastings, addOutcome } from "../lib/castings.js";
import { loadJSON, saveJSON } from "../lib/storage.js";

const GOLD = "#D4AF6A";
const fmtT = d => `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} ${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

export default function AthanorScreen({ profile, natalPos, eph, now }) {
  const IS = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(200,175,100,0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "9px 11px", fontSize: 12, boxSizing: "border-box" };
  const [ops, setOps] = useState(loadAthanor);
  const [chamber, setChamber] = useState("fire"); // fire | season | library
  const [mode, setMode] = useState("list");       // within fire: list | new | view
  const [sel, setSel] = useState(null);
  const [templateId, setTemplateId] = useState("tincture");
  const [planet, setPlanet] = useState("jupiter");
  const [name, setName] = useState("");
  const [stepNote, setStepNote] = useState("");
  const [labText, setLabText] = useState("");
  const [libOpen, setLibOpen] = useState(null);
  const location = profile?.natal?.lat && profile?.natal?.lon ? { lat: profile.natal.lat, lon: profile.natal.lon } : null;
  const refresh = () => { const l = loadAthanor(); setOps(l); if (sel) setSel(l.find(o => o.id === sel.id) || null); };

  const start = () => {
    const op = createOperation({ name: name.trim() || undefined, templateId, planet, location });
    try {
      const tpl = OPERATION_TEMPLATES[templateId];
      const casting = createCasting({ kind: "athanor", title: op.name, intent: `${tpl?.name || "Operation"} of ${P[planet].name}`, planet,
        conditions: conditionsFromProfile(new Date(), profile, natalPos), links: { athanorId: op.id } });
      saveJSON("astrum_athanor", loadAthanor().map(o => o.id === op.id ? { ...o, castingId: casting.id } : o));
    } catch {}
    setName(""); setMode("list"); refresh();
  };

  const doCompleteStep = (op, step) => {
    const { op: updated, finished } = completeStep(op.id, step.id, stepNote.trim(), location);
    setStepNote("");
    if (finished && updated) {
      try {
        const casting = loadCastings().find(c => c.links?.athanorId === op.id);
        if (casting) addOutcome(casting.id, { verdict: "unknown", note: "Operation completed — judge the result when it has spoken." });
        const tpl = OPERATION_TEMPLATES[updated.template];
        const grim = { id: Date.now(), title: `${updated.name} — completed`, planet: updated.planet,
          body: `OPERATION: ${updated.name} (${tpl?.name || updated.template})\nSOURCE: ${tpl?.source || "—"}\nPLANET: ${P[updated.planet].name}\nSTARTED: ${new Date(updated.startedAt).toLocaleDateString()}\nCOMPLETED: ${new Date().toLocaleDateString()}\n\nSTEPS:\n${updated.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.completedAt ? new Date(s.completedAt).toLocaleDateString() : "—"}${s.note ? ` · ${s.note}` : ""}`).join("\n")}\n\nLAB NOTES:\n${(updated.labNotes || []).map(n => `[${new Date(n.ts).toLocaleDateString()}] ${n.text}`).join("\n") || "—"}`,
          tags: [updated.planet, "athanor"], date: new Date().toISOString().split("T")[0], category: "observation", type: "athanor" };
        saveJSON("astrum_grimoire", [grim, ...loadJSON("astrum_grimoire", [])]);
      } catch {}
    }
    refresh();
  };

  // ── shared bits ──
  const ChamberTabs = () => (
    <div style={{ display: "flex", gap: 5, padding: "4px 14px 10px" }}>
      {[["fire", "🜂 The Fire"], ["season", "☉ The Season"], ["library", "🕮 The Library"]].map(([id, lbl]) => (
        <button key={id} onClick={() => { setChamber(id); setMode("list"); setSel(null); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: chamber === id ? "rgba(212,175,106,0.12)" : "rgba(8,5,22,0.5)", border: `1px solid ${chamber === id ? "rgba(212,175,106,0.4)" : "rgba(200,175,100,0.08)"}`, fontFamily: F, fontSize: 8.5, color: chamber === id ? GOLD : "#6A5030", letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer" }}>{lbl}</button>
      ))}
    </div>
  );
  const Header = () => (
    <div style={{ padding: "16px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Ora et Labora · The Slow Fire</div>
        <div style={T(20)}>The Athanor</div>
      </div>
      {chamber === "fire" && mode === "list" && (
        <button onClick={() => setMode("new")} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(212,175,106,0.1)", border: "1px solid rgba(212,175,106,0.28)", fontFamily: F, fontSize: 9, color: GOLD, letterSpacing: 2, cursor: "pointer" }}>+ OPERATION</button>
      )}
    </div>
  );

  // ═══ NEW OPERATION ═══
  if (chamber === "fire" && mode === "new") {
    const tpl = OPERATION_TEMPLATES[templateId];
    const tier = TIER_META[tpl.tier];
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 30px" }}>
        <button onClick={() => setMode("list")} style={{ background: "none", border: "none", color: "rgba(200,175,100,0.5)", fontFamily: F, fontSize: 10, letterSpacing: 2, cursor: "pointer", marginBottom: 14, padding: 0 }}>← THE FIRE</button>
        <div style={T(18)}>Light the Fire</div>
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "14px 0 6px" }}>Operation</div>
        {TEMPLATE_ORDER.map(tid => {
          const t = OPERATION_TEMPLATES[tid];
          const fam = OPERATION_FAMILIES[t.family];
          const tm = TIER_META[t.tier];
          const active = templateId === tid;
          return (
            <button key={tid} onClick={() => setTemplateId(tid)} style={{ width: "100%", textAlign: "left", marginBottom: 6, padding: "10px 12px", borderRadius: 11, background: active ? "rgba(212,175,106,0.09)" : "rgba(0,0,0,0.25)", border: `1px solid ${active ? "rgba(212,175,106,0.4)" : "rgba(200,175,100,0.08)"}`, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 13 }}>{fam.glyph}</span>
                <span style={{ fontFamily: F, fontSize: 11.5, color: active ? GOLD : "rgba(200,175,100,0.55)", flex: 1 }}>{t.name}</span>
                <span style={{ fontFamily: F, fontSize: 7, color: tm.col, letterSpacing: 1, border: `1px solid ${tm.col}50`, borderRadius: 6, padding: "2px 6px" }}>{tm.label.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.35)", fontStyle: "italic", marginTop: 3, lineHeight: 1.5 }}>{t.desc}</div>
              {active && <>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.3)", marginTop: 5 }}>{fam.label} · {t.steps.length} steps · {t.source}</div>
                <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.4)", marginTop: 3 }}>Apparatus: {t.apparatus}</div>
                {t.safety?.map((s, i) => <div key={i} style={{ fontFamily: F, fontSize: 8.5, color: "#C08050", marginTop: 3, lineHeight: 1.5 }}>⚠ {s}</div>)}
                {t.lore && <div style={{ fontFamily: F, fontSize: 8.5, color: "#8A7050", fontStyle: "italic", marginTop: 4, lineHeight: 1.5 }}>{t.lore}</div>}
              </>}
            </button>
          );
        })}
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "12px 0 6px" }}>Ruling Planet</div>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.keys(P).map(pk => (
            <button key={pk} onClick={() => setPlanet(pk)} style={{ flex: 1, padding: "8px 2px", borderRadius: 9, background: planet === pk ? P[pk].col + "18" : "rgba(0,0,0,0.25)", border: `1px solid ${planet === pk ? P[pk].col + "55" : "rgba(200,175,100,0.08)"}`, cursor: "pointer" }}>
              <div style={{ fontSize: 14, textAlign: "center", color: planet === pk ? P[pk].col : "rgba(200,175,100,0.3)" }}>{P[pk].sym}</div>
            </button>
          ))}
        </div>
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", fontStyle: "italic", marginTop: 6, lineHeight: 1.6 }}>Herbs of {P[planet].name}: {P[planet].herbs} · Metal: {METALS.find(m => m.planet === planet)?.metal}</div>
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", margin: "12px 0 6px" }}>Name the Work (optional)</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. ${P[planet].name} ${tpl.name.toLowerCase()} of ${(P[planet].herbs || "").split("·")[0].trim().toLowerCase()}`} style={IS} />
        <button onClick={start} style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, background: "rgba(212,175,106,0.12)", border: "1px solid rgba(212,175,106,0.35)", fontFamily: F, fontSize: 10, color: GOLD, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>🜂 Begin the Operation</button>
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", fontStyle: "italic", marginTop: 8, textAlign: "center", lineHeight: 1.6 }}>The first step schedules to its next qualifying window ({describeDueRule(tpl.steps[0].dueRule, P[planet].name) || "now"}); each completed step schedules the next. The sky record is written the moment you begin.</div>
      </div>
    );
  }

  // ═══ OPERATION DETAIL ═══
  if (chamber === "fire" && mode === "view" && sel) {
    const op = sel;
    const pl = P[op.planet];
    const tpl = OPERATION_TEMPLATES[op.template];
    const nextStep = op.steps.find(s => !s.completedAt);
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 30px" }}>
        <button onClick={() => { setMode("list"); setSel(null); refresh(); }} style={{ background: "none", border: "none", color: "rgba(200,175,100,0.5)", fontFamily: F, fontSize: 10, letterSpacing: 2, cursor: "pointer", marginBottom: 14, padding: 0 }}>← THE FIRE</button>
        <div style={T(18)}><span style={{ color: pl.col }}>{pl.sym}</span> {op.name}</div>
        <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.4)", marginTop: 3 }}>{tpl?.name} · begun {new Date(op.startedAt).toLocaleDateString()} · {op.status}</div>
        {tpl?.safety?.map((s, i) => <div key={i} style={{ fontFamily: F, fontSize: 8.5, color: "#C08050", marginTop: 4, lineHeight: 1.5 }}>⚠ {s}</div>)}

        {op.status === "active" && nextStep && (
          <div style={{ marginTop: 12, padding: "13px 14px", borderRadius: 13, background: `${pl.col}0D`, border: `1px solid ${pl.col}40` }}>
            <div style={{ fontFamily: F, fontSize: 8, color: pl.col, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 5 }}>
              Next Step{nextStep.scheduledFor ? ` — window opens ${fmtT(new Date(nextStep.scheduledFor))}` : " — awaits its season"}
            </div>
            <div style={{ fontFamily: F, fontSize: 13, color: GOLD }}>{nextStep.title}</div>
            <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.45)", marginTop: 3 }}>
              {describeDueRule(nextStep.dueRule, pl.name)}{nextStep.fire ? ` · ${FIRE_DEGREES[nextStep.fire - 1]?.glyph} fire of the ${["first","second","third","fourth"][nextStep.fire - 1]} degree` : ""}
            </div>
            <div style={{ fontFamily: F, fontSize: 10.5, color: "#9A8060", fontStyle: "italic", lineHeight: 1.8, marginTop: 6 }}>{nextStep.instructions}</div>
            {nextStep.observe && <div style={{ fontFamily: F, fontSize: 9, color: "rgba(160,140,220,0.7)", fontStyle: "italic", marginTop: 6, lineHeight: 1.6 }}>✎ Record: {nextStep.observe}</div>}
            <textarea value={stepNote} onChange={e => setStepNote(e.target.value)} rows={2} placeholder="Observations at completion…" style={{ ...IS, marginTop: 9, resize: "none" }} />
            <button onClick={() => doCompleteStep(op, nextStep)} style={{ width: "100%", marginTop: 7, padding: "11px 0", borderRadius: 10, background: "rgba(92,168,92,0.12)", border: "1px solid rgba(92,168,92,0.35)", fontFamily: F, fontSize: 9.5, color: "#7AB07A", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>✓ Step Completed</button>
          </div>
        )}
        {op.status === "complete" && <div style={{ marginTop: 12, padding: "11px 13px", borderRadius: 12, background: "rgba(212,175,106,0.08)", border: "1px solid rgba(212,175,106,0.3)", fontFamily: F, fontSize: 10.5, color: GOLD, fontStyle: "italic", lineHeight: 1.7 }}>The operation is complete. A summary is written in the Grimoire; Review will ask for the verdict when the work has spoken.</div>}

        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 7 }}>Process Timeline</div>
          {op.steps.map((s, i) => (
            <div key={s.id} style={{ display: "flex", gap: 10, marginBottom: 2 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: s.completedAt ? pl.col : "rgba(0,0,0,0.4)", border: `1.5px solid ${s.completedAt ? pl.col : s === nextStep ? pl.col + "80" : "rgba(200,175,100,0.2)"}`, flexShrink: 0, marginTop: 3 }} />
                {i < op.steps.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 14, background: s.completedAt ? pl.col + "50" : "rgba(200,175,100,0.1)" }} />}
              </div>
              <div style={{ paddingBottom: 12, flex: 1 }}>
                <div style={{ fontFamily: F, fontSize: 11, color: s.completedAt ? "#C4A870" : s === nextStep ? GOLD : "rgba(200,175,100,0.35)" }}>{s.title}{s.fire ? <span style={{ fontSize: 9, color: "rgba(200,175,100,0.35)" }}>  {FIRE_DEGREES[s.fire - 1]?.glyph}</span> : null}</div>
                <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", marginTop: 1 }}>
                  {s.completedAt ? `done ${fmtT(new Date(s.completedAt))}` : s.scheduledFor ? `window ${fmtT(new Date(s.scheduledFor))}` : describeDueRule(s.dueRule, pl.name) || "awaits the previous step"}
                </div>
                {s.note && <div style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", fontStyle: "italic", marginTop: 3, lineHeight: 1.6 }}>{s.note}</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Lab Notebook</div>
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.3)", fontStyle: "italic", marginBottom: 7, lineHeight: 1.5 }}>“The exact keeping of a laboratory diary should be the duty of every practicing spagyrist.” — Junius</div>
          <PhotoStrip photoIds={op.photoIds || []} onChange={ids => { setOpPhotos(op.id, ids); refresh(); }} label="The vessel's record — colour is data" />
          <div style={{ display: "flex", gap: 6 }}>
            <input value={labText} onChange={e => setLabText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && labText.trim()) { addLabNote(op.id, labText.trim()); setLabText(""); refresh(); } }} placeholder="Color change, smell, consistency, dream…" style={{ ...IS, flex: 1 }} />
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

  // ═══ SEASON (the astro-alchemical dashboard) ═══
  const SeasonChamber = () => {
    const sunLon = eph?.pos?.sun?.lon ?? 0;
    const moonLon = eph?.pos?.moon?.lon ?? 0;
    const season = alchemicalSeason(sunLon);
    const moonOp = moonSignOperation(moonLon);
    const tide = moonWorkGuidance(eph?.moonPhaseDeg ?? 0);
    const mansion = getMansion(moonLon);
    const mansionNote = MANSION_LAB_NOTES[mansion.index];
    const dow = now?.getDay?.() ?? new Date().getDay();
    const DAY_RULERS = { 0: "sun", 1: "moon", 2: "mars", 3: "mercury", 4: "jupiter", 5: "venus", 6: "saturn" };
    const dayPk = DAY_RULERS[dow];
    const metal = METALS.find(m => m.planet === dayPk);
    return (
      <div style={{ padding: "0 14px" }}>
        {/* Sun season */}
        <div style={{ borderRadius: 14, background: "rgba(8,5,22,0.85)", border: "1px solid rgba(212,175,106,0.25)", padding: "14px 15px", marginBottom: 9 }}>
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 4 }}>The Season of the Work — Sun in {season.sign} {season.sym}</div>
          <div style={{ fontFamily: F, fontSize: 17, color: GOLD }}>{season.glyph} {season.process}</div>
          <div style={{ fontFamily: F, fontSize: 10.5, color: "#9A8060", fontStyle: "italic", lineHeight: 1.8, marginTop: 6 }}>{season.lab}</div>
          <div style={{ fontFamily: F, fontSize: 10, color: "#C4A870", fontStyle: "italic", lineHeight: 1.7, marginTop: 4 }}>{season.symbolic}</div>
          <div style={{ fontFamily: F, fontSize: 7.5, color: "rgba(200,175,100,0.3)", marginTop: 6 }}>The alchemical zodiac — Pernety, Dictionnaire mytho-hermétique (1758)</div>
        </div>
        {/* Moon operation key + tide */}
        <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.7)", border: "1px solid rgba(200,221,237,0.18)", padding: "12px 14px", marginBottom: 9 }}>
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,221,237,0.55)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 4 }}>The Moon's Operation-Key — ☽ in {moonOp.sign}</div>
          <div style={{ fontFamily: F, fontSize: 13, color: "#C8DDED" }}>{moonOp.process}{moonOp.variant ? <span style={{ fontSize: 8, color: "rgba(200,221,237,0.4)" }}> ({moonOp.variant})</span> : null}</div>
          <div style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", fontStyle: "italic", lineHeight: 1.7, marginTop: 4 }}>{moonOp.lab} “The position of the Moon for each day can be seen in an ephemeris.” — Junius</div>
          <div style={{ marginTop: 9, padding: "8px 10px", borderRadius: 9, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,221,237,0.1)" }}>
            <span style={{ fontFamily: F, fontSize: 8, color: "#C8DDED", letterSpacing: 1.5 }}>{tide.phase.toUpperCase()} — {tide.mode.toUpperCase()}: </span>
            <span style={{ fontFamily: F, fontSize: 10, color: "#C4A870", fontStyle: "italic" }}>{tide.counsel}</span>
          </div>
          {mansionNote && <div style={{ marginTop: 6, padding: "8px 10px", borderRadius: 9, background: "rgba(100,80,160,0.1)", border: "1px solid rgba(100,80,160,0.25)", fontFamily: F, fontSize: 9.5, color: "#B0A0D0", fontStyle: "italic", lineHeight: 1.6 }}>☽ Mansion {mansion.index} ({mansion.arabic}): {mansionNote}</div>}
        </div>
        {/* Day counsel */}
        <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.65)", border: `1px solid ${P[dayPk].col}30`, padding: "12px 14px", marginBottom: 9 }}>
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 4 }}>The Day's Counsel — {P[dayPk].sym} {P[dayPk].name}'s Day</div>
          <div style={{ fontFamily: F, fontSize: 10.5, color: "#C4A870", fontStyle: "italic", lineHeight: 1.8 }}>{DAY_OPERATION_COUNSEL[dayPk]}</div>
          <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.4)", marginTop: 5 }}>Metal of the day: {metal?.metal} {metal?.altGlyph} · Herbs: {P[dayPk].herbs.split("·").slice(0, 2).join("·")}</div>
        </div>
        {/* Steps due across ops */}
        {(() => {
          const due = ops.filter(o => o.status === "active").flatMap(o => (o.steps || []).filter(s => !s.completedAt && s.scheduledFor).map(s => ({ o, s })))
            .sort((a, b) => new Date(a.s.scheduledFor) - new Date(b.s.scheduledFor)).slice(0, 4);
          if (!due.length) return null;
          return (
            <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.65)", border: "1px solid rgba(200,175,100,0.12)", padding: "12px 14px", marginBottom: 9 }}>
              <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 6 }}>Windows Opening</div>
              {due.map(({ o, s }) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(200,175,100,0.05)" }}>
                  <span style={{ fontFamily: F, fontSize: 10, color: "#C4A870" }}><span style={{ color: P[o.planet].col }}>{P[o.planet].sym}</span> {o.name}: {s.title}</span>
                  <span style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)" }}>{fmtT(new Date(s.scheduledFor))}</span>
                </div>
              ))}
            </div>
          );
        })()}
        {/* Timing doctrine */}
        <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.65)", border: "1px solid rgba(200,175,100,0.09)", padding: "12px 14px", marginBottom: 9 }}>
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 6 }}>The Timing Doctrine</div>
          {TIMING_DOCTRINE.map((t, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ fontFamily: F, fontSize: 10, color: GOLD }}>{t.rule}</div>
              <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", lineHeight: 1.6, marginTop: 1 }}>{t.text} <span style={{ color: "rgba(200,175,100,0.3)" }}>({t.source})</span></div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ═══ LIBRARY ═══
  const LibraryChamber = () => {
    const SECTIONS = [
      { id: "stages", title: "The Stages of the Great Work", render: () => (<>
        {GREAT_WORK_STAGES.map(s => (
          <div key={s.key} style={{ marginBottom: 8, padding: "10px 12px", borderRadius: 11, background: "rgba(0,0,0,0.3)", borderLeft: `3px solid ${s.accent}` }}>
            <div style={{ fontFamily: F, fontSize: 12, color: s.accent }}>{s.name} <span style={{ fontSize: 8.5, color: "rgba(200,175,100,0.4)" }}>· {s.greek} · {s.epithet}</span></div>
            <div style={{ fontFamily: F, fontSize: 10, color: "#9A8060", fontStyle: "italic", lineHeight: 1.7, marginTop: 4 }}>{s.meaning}</div>
            <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.4)", marginTop: 3 }}>In the vessel: {s.operations}</div>
            <div style={{ fontFamily: F, fontSize: 9, color: "rgba(160,140,220,0.6)", fontStyle: "italic", marginTop: 3, lineHeight: 1.6 }}>{s.inner}</div>
          </div>
        ))}
        <div style={{ padding: "10px 12px", borderRadius: 11, background: "rgba(0,0,0,0.25)", border: "1px dashed rgba(200,175,100,0.15)" }}>
          <div style={{ fontFamily: F, fontSize: 11, color: GOLD, fontStyle: "italic" }}>{CAUDA_PAVONIS.name} — {CAUDA_PAVONIS.epithet}</div>
          <div style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", fontStyle: "italic", lineHeight: 1.7, marginTop: 3 }}>{CAUDA_PAVONIS.meaning}</div>
        </div>
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", fontStyle: "italic", marginTop: 8, lineHeight: 1.6 }}>{STAGE_SCHEMES_NOTE}</div>
      </>) },
      { id: "zodiac", title: "The Alchemical Zodiac (Pernety, 1758)", render: () => (<>
        {ALCHEMICAL_ZODIAC.map(z => (
          <div key={z.n} style={{ display: "flex", gap: 9, padding: "6px 0", borderBottom: "1px solid rgba(200,175,100,0.05)" }}>
            <span style={{ fontFamily: F, fontSize: 13, color: GOLD, width: 22 }}>{z.sym}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F, fontSize: 10.5, color: "#C4A870" }}>{z.process} <span style={{ color: "rgba(200,175,100,0.4)", fontSize: 8.5 }}>· {z.sign}</span></div>
              <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", lineHeight: 1.6, marginTop: 1 }}>{z.lab}</div>
            </div>
          </div>
        ))}
      </>) },
      { id: "gates", title: "Ripley's Twelve Gates (1471)", render: () => (<>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", marginBottom: 8, lineHeight: 1.6 }}>The Compound of Alchymie — “the wheel of our philosophy,” to be turned about again. Ripley's own order, with no zodiac overlay.</div>
        {RIPLEY_GATES.map(g => (
          <div key={g.n} style={{ display: "flex", gap: 8, padding: "4px 0" }}>
            <span style={{ fontFamily: F, fontSize: 10, color: GOLD, width: 18 }}>{g.n}.</span>
            <div style={{ fontFamily: F, fontSize: 10, color: "#C4A870" }}>{g.gate} — <span style={{ color: "#8A7050", fontStyle: "italic" }}>{g.note}</span></div>
          </div>
        ))}
      </>) },
      { id: "principles", title: "Tria Prima, Elements & Quintessence", render: () => (<>
        {TRIA_PRIMA.map(p => (
          <div key={p.key} style={{ marginBottom: 7, padding: "9px 11px", borderRadius: 10, background: "rgba(0,0,0,0.28)" }}>
            <div style={{ fontFamily: F, fontSize: 11.5, color: GOLD }}>{p.sym} {p.name} — the {p.principle}</div>
            <div style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", fontStyle: "italic", lineHeight: 1.6, marginTop: 3 }}>{p.nature}</div>
            <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.45)", marginTop: 2 }}>In the plant work: {p.inPlants}</div>
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
          {ELEMENTS.map(e => <span key={e.name} style={{ fontFamily: F, fontSize: 9.5, color: "#C4A870", padding: "4px 9px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,175,100,0.12)" }}>{e.sym} {e.name} · {e.qualities}</span>)}
        </div>
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", fontStyle: "italic", lineHeight: 1.6 }}>{TRIA_PRIMA_NOTE}</div>
      </>) },
      { id: "metals", title: "The Seven Metals & Their Planets", render: () => (<>
        {METALS.map(m => (
          <div key={m.metal} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(200,175,100,0.05)" }}>
            <span style={{ fontSize: 15, color: P[m.planet].col, width: 22 }}>{m.sym}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F, fontSize: 10.5, color: "#C4A870" }}>{m.metal} {m.altGlyph} — {P[m.planet].name} <span style={{ fontSize: 8, color: "rgba(200,175,100,0.35)" }}>(Agrippa {m.agrippa})</span></div>
              <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", lineHeight: 1.6, marginTop: 2 }}>{m.character}</div>
            </div>
          </div>
        ))}
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(160,140,220,0.6)", fontStyle: "italic", marginTop: 8, lineHeight: 1.6 }}>For talismans, Agrippa II.22 prescribes the engraving metals separately — Jupiter's and Venus's tables go on silver, not tin and copper. The Talisman workshop follows II.22.</div>
      </>) },
      { id: "fire", title: "The Four Degrees of Fire", render: () => (<>
        {FIRE_DEGREES.map(f => (
          <div key={f.n} style={{ marginBottom: 8, padding: "9px 11px", borderRadius: 10, background: "rgba(0,0,0,0.28)" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: GOLD }}>{f.glyph} {f.name} <span style={{ fontSize: 8.5, color: "rgba(200,175,100,0.4)" }}>· {f.temp}</span></div>
            <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", lineHeight: 1.6, marginTop: 3 }}>{f.french} — French, The Art of Distillation (1651)</div>
            <div style={{ fontFamily: F, fontSize: 9.5, color: "#C4A870", marginTop: 3, lineHeight: 1.5 }}>{f.use}</div>
          </div>
        ))}
        <div style={{ fontFamily: F, fontSize: 9.5, color: GOLD, fontStyle: "italic", textAlign: "center", marginTop: 6 }}>{FIRE_RULE}</div>
      </>) },
      { id: "tablet", title: "The Emerald Tablet (Newton's translation)", render: () => (<>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", lineHeight: 1.7, marginBottom: 10 }}>{EMERALD_TABLET.about}</div>
        {EMERALD_TABLET.lines.map((l, i) => (
          <div key={i} style={{ fontFamily: F, fontSize: 11, color: "#C4A870", fontStyle: "italic", lineHeight: 2, textAlign: "center", marginBottom: 2 }}>{l}</div>
        ))}
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.35)", textAlign: "center", marginTop: 8 }}>— {EMERALD_TABLET.translator} · {EMERALD_TABLET.source}</div>
      </>) },
      { id: "axioms", title: "Axioms of the Art", render: () => (<>
        {AXIOMS.map((a, i) => (
          <div key={i} style={{ marginBottom: 9, padding: "9px 11px", borderRadius: 10, background: "rgba(0,0,0,0.28)" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: GOLD, fontStyle: "italic" }}>{a.latin || a.greek}</div>
            <div style={{ fontFamily: F, fontSize: 9.5, color: "#C4A870", marginTop: 2 }}>{a.en}</div>
            <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", lineHeight: 1.6, marginTop: 3 }}>{a.gloss}</div>
          </div>
        ))}
      </>) },
      { id: "athanor", title: "The Athanor Itself", render: () => (<>
        <div style={{ fontFamily: F, fontSize: 10.5, color: "#C4A870", lineHeight: 1.8 }}>{ATHANOR_LORE.what}</div>
        <div style={{ fontFamily: F, fontSize: 9.5, color: "#8A7050", fontStyle: "italic", lineHeight: 1.7, marginTop: 6 }}>{ATHANOR_LORE.symbolism}</div>
        <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.4)", marginTop: 6 }}>Etymology: {ATHANOR_LORE.etymology}<br />Also called: {ATHANOR_LORE.nicknames}</div>
      </>) },
      { id: "study", title: "⚠ The Study-Only Paths", render: () => (<>
        <div style={{ fontFamily: F, fontSize: 9.5, color: "#C08050", fontStyle: "italic", lineHeight: 1.7, marginBottom: 10 }}>Five great works of the tradition that the modern practitioner reads and never performs. The historical record of emetic cups, sugar of lead, and mercurial tremors is exactly why. Reading is the only safe apparatus here.</div>
        {STUDY_ONLY_PATHS.map(s => (
          <div key={s.key} style={{ marginBottom: 9, padding: "10px 12px", borderRadius: 11, background: "rgba(60,20,15,0.25)", border: "1px solid rgba(200,100,80,0.25)" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: "#D09070" }}>{P[s.planet]?.sym} {s.name}</div>
            <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.4)", marginTop: 2 }}>{s.source}</div>
            <div style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", fontStyle: "italic", lineHeight: 1.7, marginTop: 4 }}>{s.summary}</div>
            <div style={{ fontFamily: F, fontSize: 9, color: "#C08050", lineHeight: 1.6, marginTop: 5 }}>⚠ {s.warning}</div>
          </div>
        ))}
      </>) },
      { id: "record", title: "Keeping the Laboratory Record", render: () => (<>
        <div style={{ fontFamily: F, fontSize: 9.5, color: "#8A7050", fontStyle: "italic", lineHeight: 1.7, marginBottom: 8 }}>Starkey and Newton logged dates, ratios, colors, costs, and failures; Henshaw weighed his dew-salts to the ounce for the Royal Society. The dream-field is the modern layer — period notebooks recorded matter, not dreams; the Operator's Loop wants both.</div>
        {LAB_RECORD_PROMPTS.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0" }}>
            <span style={{ fontFamily: F, fontSize: 10, color: GOLD }}>✎</span>
            <span style={{ fontFamily: F, fontSize: 10, color: "#C4A870", lineHeight: 1.6 }}>{p}</span>
          </div>
        ))}
      </>) },
      { id: "glyphs", title: "The Glyphs", render: () => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {GLYPHS.map(g => <span key={g.name} style={{ fontFamily: F, fontSize: 9.5, color: "#C4A870", padding: "5px 9px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,175,100,0.1)" }}><span style={{ fontSize: 13 }}>{g.g}</span> {g.name}</span>)}
        </div>
      ) },
    ];
    return (
      <div style={{ padding: "0 14px" }}>
        {SECTIONS.map(sec => (
          <div key={sec.id} style={{ marginBottom: 7, borderRadius: 12, background: "rgba(8,5,22,0.65)", border: "1px solid rgba(200,175,100,0.1)" }}>
            <button onClick={() => setLibOpen(libOpen === sec.id ? null : sec.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: "none", border: "none", cursor: "pointer" }}>
              <span style={{ fontFamily: F, fontSize: 11, color: libOpen === sec.id ? GOLD : "rgba(200,175,100,0.6)", letterSpacing: 1 }}>{sec.title}</span>
              <span style={{ color: "rgba(200,175,100,0.35)", fontSize: 11 }}>{libOpen === sec.id ? "▾" : "▸"}</span>
            </button>
            {libOpen === sec.id && <div style={{ padding: "0 14px 12px" }}>{sec.render()}</div>}
          </div>
        ))}
      </div>
    );
  };

  // ═══ FIRE LIST ═══
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
            Next: {nextStep.title}{nextStep.scheduledFor ? ` — ${fmtT(new Date(nextStep.scheduledFor))}` : " — awaits its season"} · {done}/{op.steps.length} done
          </div>
        )}
      </button>
    );
  };
  const active = ops.filter(o => o.status === "active");
  const finished = ops.filter(o => o.status !== "active");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <Header />
      <ChamberTabs />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {chamber === "fire" && (
          <div style={{ padding: "0 14px" }}>
            {ops.length === 0 && <div style={{ textAlign: "center", padding: "36px 24px", fontFamily: F, fontSize: 12, color: "#5A4020", fontStyle: "italic", lineHeight: 1.9 }}>The fire is unlit.<br />Twelve operations wait in the templates — plant, salt, water, and mineral work, each step timed to the hours and the Moon. The Library holds the doctrine; the Season shows what the sky favors today.</div>}
            {active.map(op => <OpCard key={op.id} op={op} />)}
            {finished.length > 0 && <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.35)", letterSpacing: 2.5, textTransform: "uppercase", margin: "12px 0 7px" }}>Completed & Abandoned</div>}
            {finished.map(op => <OpCard key={op.id} op={op} />)}
          </div>
        )}
        {chamber === "season" && <SeasonChamber />}
        {chamber === "library" && <LibraryChamber />}
      </div>
    </div>
  );
}
