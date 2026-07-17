// ═══════════════════════════════════════════════════════════════════════
// SPIRIT COURT — the register of allies
// ═══════════════════════════════════════════════════════════════════════
// The relational half of the practice: ancestors, planetary intelligences,
// saints, the genius loci — each with its nature, preferred offerings, feast
// days, and a log of offerings given and responses observed. The planetary
// court (angel / intelligence / spirit of each sphere, after Agrippa) can be
// seeded with one tap. Feast days flow into the Ancestor Calendar and the
// ambient scheduler.

import { useState } from "react";
import { F, L, T, P } from "../App.jsx";
import { SPIRIT_KINDS, loadSpirits, createSpirit, updateSpirit, deleteSpirit, addLogEntry, upcomingObservances, daysSinceOffering } from "../lib/spirits.js";

const GOLD = "#D4AF6A";
const KIND = Object.fromEntries(SPIRIT_KINDS.map(k => [k.id, k]));
const LOG_TYPES = [["offering", "Offering"], ["contact", "Contact"], ["petition", "Petition"], ["response", "Response"]];

export default function SpiritCourtScreen({ profile }) {
  const [spirits, setSpirits] = useState(loadSpirits);
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "ancestor", planet: null, epithet: "", notes: "", offerings: "", feastMonth: "", feastDay: "", feastLabel: "" });
  const [logForm, setLogForm] = useState({ type: "offering", text: "" });
  const refresh = () => setSpirits(loadSpirits());
  const selected = spirits.find(s => s.id === sel);
  const observances = upcomingObservances(spirits, new Date(), 30);

  const IS = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(200,175,100,0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "9px 11px", fontSize: 12, boxSizing: "border-box" };

  const submit = () => {
    if (!form.name.trim()) return;
    const feastDays = form.feastMonth && form.feastDay ? [{ month: +form.feastMonth, day: +form.feastDay, label: form.feastLabel || undefined }] : [];
    createSpirit({ name: form.name.trim(), kind: form.kind, planet: form.planet, epithet: form.epithet, notes: form.notes, offerings: form.offerings, feastDays });
    setForm({ name: "", kind: "ancestor", planet: null, epithet: "", notes: "", offerings: "", feastMonth: "", feastDay: "", feastLabel: "" });
    setAdding(false); refresh();
  };

  const seedCourt = (pk) => {
    const p = P[pk];
    if (!p) return;
    [["planetary", p.angel, "Angel"], ["planetary", p.intelligence, "Intelligence"], ["planetary", p.spirit, "Spirit"]].forEach(([kind, name, role]) => {
      if (name && !spirits.some(s => s.name === name)) {
        createSpirit({ name, kind, planet: pk, epithet: `${role} of ${p.name}`, offerings: `${p.incense} · ${p.day}`, notes: `The ${role.toLowerCase()} of the sphere of ${p.name}, after Agrippa. Approach in the day and hour of ${p.name}.` });
      }
    });
    refresh();
  };

  const logIt = () => {
    if (!selected || !logForm.text.trim()) return;
    addLogEntry(selected.id, logForm);
    setLogForm({ type: "offering", text: "" }); refresh();
  };

  // ── Detail view ──────────────────────────────────────────────────────
  if (selected) {
    const k = KIND[selected.kind] || KIND.other;
    const dso = daysSinceOffering(selected);
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
        <div style={{ padding: "14px 16px 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSel(null)} style={{ background: "none", border: "1px solid rgba(200,175,100,0.2)", borderRadius: 8, color: "#8A7050", fontFamily: F, fontSize: 10, padding: "5px 11px", cursor: "pointer" }}>← Court</button>
          <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 2, textTransform: "uppercase" }}>{k.icon} {k.label}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
          <div style={{ padding: "13px 15px", borderRadius: 13, background: "rgba(8,5,22,0.75)", border: "1px solid rgba(200,175,100,0.15)", marginBottom: 9 }}>
            <div style={T(19)}>{selected.name}</div>
            {selected.epithet && <div style={{ fontFamily: F, fontSize: 10, color: "#9A8060", fontStyle: "italic", marginTop: 2 }}>{selected.epithet}</div>}
            {selected.planet && P[selected.planet] && <div style={{ fontFamily: F, fontSize: 10, color: P[selected.planet].col, marginTop: 4 }}>{P[selected.planet].sym} Sphere of {P[selected.planet].name}</div>}
            {dso != null && <div style={{ fontFamily: F, fontSize: 9.5, color: dso > 30 ? "#D28060" : "#7AB07A", marginTop: 6 }}>{dso === 0 ? "Offering made today" : `Last offering ${dso} day${dso === 1 ? "" : "s"} ago`}{dso > 30 ? " — the relationship wants tending" : ""}</div>}
            {dso == null && (selected.log || []).length === 0 && <div style={{ fontFamily: F, fontSize: 9.5, color: "#8A7050", marginTop: 6, fontStyle: "italic" }}>No offerings on record yet — relationship begins with the first gift.</div>}
            {selected.offerings && <div style={{ fontFamily: F, fontSize: 10, color: "#B8A578", marginTop: 8, lineHeight: 1.6 }}><span style={{ color: "#7A6030", fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase" }}>Preferred offerings · </span>{selected.offerings}</div>}
            {selected.notes && <div style={{ fontFamily: F, fontSize: 10.5, color: "#9A8060", marginTop: 8, lineHeight: 1.7 }}>{selected.notes}</div>}
            {(selected.feastDays || []).length > 0 && <div style={{ marginTop: 8 }}>{selected.feastDays.map((f, i) => <span key={i} style={{ display: "inline-block", fontFamily: F, fontSize: 8.5, color: GOLD, background: "rgba(212,175,106,0.1)", border: "1px solid rgba(212,175,106,0.25)", borderRadius: 6, padding: "2px 8px", marginRight: 5 }}>{f.label || "Feast"} · {f.month}/{f.day}</span>)}</div>}
          </div>

          {/* Log an entry */}
          <div className="card" style={{ marginBottom: 9 }}>
            <div style={L()}>Tend the Relationship</div>
            <div style={{ display: "flex", gap: 5, margin: "8px 0" }}>
              {LOG_TYPES.map(([id, lbl]) => <button key={id} onClick={() => setLogForm(f => ({ ...f, type: id }))} style={{ flex: 1, padding: "6px 0", borderRadius: 8, background: logForm.type === id ? "rgba(212,175,106,0.14)" : "rgba(0,0,0,0.3)", border: `1px solid ${logForm.type === id ? "rgba(212,175,106,0.35)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 8.5, color: logForm.type === id ? GOLD : "#6A5030", letterSpacing: 1, cursor: "pointer" }}>{lbl}</button>)}
            </div>
            <textarea value={logForm.text} onChange={e => setLogForm(f => ({ ...f, text: e.target.value }))} rows={2} placeholder={logForm.type === "offering" ? "What was given — water, candle, bread, attention…" : logForm.type === "response" ? "What was observed — dream, sign, shift, silence…" : "What passed between you…"} style={{ ...IS, resize: "none" }} />
            <button onClick={logIt} disabled={!logForm.text.trim()} style={{ width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 10, background: logForm.text.trim() ? "rgba(212,175,106,0.12)" : "rgba(0,0,0,0.3)", border: `1px solid ${logForm.text.trim() ? "rgba(212,175,106,0.35)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 9.5, color: logForm.text.trim() ? GOLD : "#5A4020", letterSpacing: 2, textTransform: "uppercase", cursor: logForm.text.trim() ? "pointer" : "default" }}>⚑ Record</button>
          </div>

          {/* The log */}
          {(selected.log || []).length > 0 && (
            <div style={{ padding: "12px 14px", borderRadius: 13, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(200,175,100,0.1)", marginBottom: 9 }}>
              <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>The Record · {selected.log.length}</div>
              {selected.log.slice(0, 30).map(l => (
                <div key={l.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(200,175,100,0.05)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontFamily: F, fontSize: 8.5, color: l.type === "response" ? "#7AB07A" : l.type === "offering" ? GOLD : "#8A9FE0", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>{l.type}</span>
                    <span style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.35)", marginLeft: "auto", flexShrink: 0 }}>{new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 10.5, color: "#9A8060", lineHeight: 1.6, marginTop: 2 }}>{l.text}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { if (confirm(`Remove ${selected.name} from the court? The log goes with them.`)) { deleteSpirit(selected.id); setSel(null); refresh(); } }} style={{ width: "100%", padding: "8px 0", borderRadius: 9, background: "none", border: "1px solid rgba(180,80,60,0.25)", fontFamily: F, fontSize: 8.5, color: "rgba(210,128,96,0.6)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", marginBottom: 10 }}>Release from the Court</button>
        </div>
      </div>
    );
  }

  // ── Roster ───────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Extradimensional Diplomacy</div>
        <div style={T(20)}>The Spirit Court</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>The allies of the practice — ancestors first, then the court. Relationship is built by offering and attention over time; this is its ledger.</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {/* Coming observances */}
        {observances.length > 0 && (
          <div style={{ padding: "10px 13px", borderRadius: 12, background: "rgba(212,175,106,0.07)", border: "1px solid rgba(212,175,106,0.25)", marginBottom: 9 }}>
            <div style={{ fontFamily: F, fontSize: 8, color: GOLD, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Coming Observances</div>
            {observances.slice(0, 5).map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontFamily: F, fontSize: 10, color: "#C4A870", padding: "3px 0" }}>
                <span>{KIND[o.kind]?.icon}</span><span style={{ flex: 1 }}>{o.label}</span>
                <span style={{ color: "rgba(200,175,100,0.5)" }}>{o.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <div className="card" style={{ marginBottom: 9 }}>
            <div style={L()}>New Member of the Court</div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name…" style={{ ...IS, marginTop: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, margin: "7px 0" }}>
              {SPIRIT_KINDS.map(k => <button key={k.id} onClick={() => setForm(f => ({ ...f, kind: k.id }))} style={{ padding: "6px 4px", borderRadius: 8, background: form.kind === k.id ? "rgba(212,175,106,0.14)" : "rgba(0,0,0,0.3)", border: `1px solid ${form.kind === k.id ? "rgba(212,175,106,0.35)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 8, color: form.kind === k.id ? GOLD : "#6A5030", cursor: "pointer" }}>{k.icon} {k.label}</button>)}
            </div>
            <input value={form.epithet} onChange={e => setForm(f => ({ ...f, epithet: e.target.value }))} placeholder="Epithet / relation — 'my great-grandmother', 'spirit of the river'…" style={{ ...IS, marginBottom: 7 }} />
            <input value={form.offerings} onChange={e => setForm(f => ({ ...f, offerings: e.target.value }))} placeholder="Preferred offerings — water, tobacco, rose incense…" style={{ ...IS, marginBottom: 7 }} />
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Nature, temperament, how you met…" style={{ ...IS, resize: "none", marginBottom: 7 }} />
            <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
              <input value={form.feastMonth} onChange={e => setForm(f => ({ ...f, feastMonth: e.target.value }))} placeholder="MM" style={{ ...IS, width: 54, textAlign: "center" }} />
              <input value={form.feastDay} onChange={e => setForm(f => ({ ...f, feastDay: e.target.value }))} placeholder="DD" style={{ ...IS, width: 54, textAlign: "center" }} />
              <input value={form.feastLabel} onChange={e => setForm(f => ({ ...f, feastLabel: e.target.value }))} placeholder="Feast / anniversary label (optional)" style={IS} />
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={submit} disabled={!form.name.trim()} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: form.name.trim() ? "rgba(212,175,106,0.12)" : "rgba(0,0,0,0.3)", border: `1px solid ${form.name.trim() ? "rgba(212,175,106,0.35)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 9.5, color: form.name.trim() ? GOLD : "#5A4020", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>Welcome to the Court</button>
              <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,175,100,0.12)", fontFamily: F, fontSize: 9, color: "#7A6030", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px 0", borderRadius: 11, background: "rgba(212,175,106,0.1)", border: "1px solid rgba(212,175,106,0.3)", fontFamily: F, fontSize: 10, color: GOLD, letterSpacing: 2.5, textTransform: "uppercase", cursor: "pointer", marginBottom: 9 }}>+ Add to the Court</button>
        )}

        {/* Roster grouped by kind */}
        {SPIRIT_KINDS.map(k => {
          const members = spirits.filter(s => s.kind === k.id);
          if (!members.length) return null;
          return (
            <div key={k.id} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2, textTransform: "uppercase", margin: "2px 4px 6px" }}>{k.icon} {k.label}s</div>
              {members.map(s => {
                const dso = daysSinceOffering(s);
                return (
                  <div key={s.id} onClick={() => setSel(s.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 11, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(200,175,100,0.1)", marginBottom: 6, cursor: "pointer" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: F, fontSize: 12.5, color: "#D4C098" }}>{s.name}</div>
                      {s.epithet && <div style={{ fontFamily: F, fontSize: 9, color: "#7A6030", fontStyle: "italic", marginTop: 1 }}>{s.epithet}</div>}
                    </div>
                    {s.planet && P[s.planet] && <span style={{ fontSize: 14, color: P[s.planet].col }}>{P[s.planet].sym}</span>}
                    {dso != null && <span style={{ fontFamily: F, fontSize: 8.5, color: dso > 30 ? "#D28060" : "rgba(200,175,100,0.45)" }}>{dso}d</span>}
                  </div>
                );
              })}
            </div>
          );
        })}

        {spirits.length === 0 && !adding && (
          <div style={{ textAlign: "center", padding: "18px 16px", fontFamily: F, fontSize: 10.5, color: "#5A4020", fontStyle: "italic", lineHeight: 1.8 }}>
            The court is empty. Begin with the ancestors — water, a candle, naming the beloved dead. Or seed the planetary court below.
          </div>
        )}

        {/* Seed the planetary court */}
        <div style={{ padding: "11px 13px", borderRadius: 12, background: "rgba(8,5,22,0.5)", border: "1px solid rgba(200,175,100,0.08)", marginBottom: 10 }}>
          <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 }}>Seed a Sphere's Court (Agrippa)</div>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.keys(P).map(pk => <button key={pk} onClick={() => seedCourt(pk)} title={`${P[pk].angel} · ${P[pk].intelligence} · ${P[pk].spirit}`} style={{ flex: 1, padding: "7px 2px", borderRadius: 8, background: "rgba(8,5,22,0.5)", border: "1px solid rgba(200,175,100,0.1)", cursor: "pointer" }}><div style={{ fontSize: 13, textAlign: "center", color: P[pk].col }}>{P[pk].sym}</div></button>)}
          </div>
          <div style={{ fontFamily: F, fontSize: 8.5, color: "#5A4020", fontStyle: "italic", marginTop: 6 }}>Adds the sphere's angel, intelligence, and spirit with their offerings and approach.</div>
        </div>
      </div>
    </div>
  );
}
