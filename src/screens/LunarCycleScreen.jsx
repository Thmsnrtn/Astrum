// ═══════════════════════════════════════════════════════════════════════
// LUNAR CYCLE — the monthly rhythm the practice lives by
// ═══════════════════════════════════════════════════════════════════════
// The current lunation drawn as a phase disc, with the three ritual hinges
// dated ahead: plant at the New, bring to light at the Full, release in the
// Balsamic dark. Open castings surface here to be reviewed at the coming
// Full, and a New-Moon intention becomes a casting like any other working.

import { useState, useMemo } from "react";
import { F, L, T, planetLon, dateToJD, conditionsFromProfile } from "../App.jsx";
import { lunationTimeline, PHASES } from "../lib/lunation.js";
import { createCasting, loadCastings, effectiveVerdict } from "../lib/castings.js";

const GOLD = "#D4AF6A";
const norm = a => ((a % 360) + 360) % 360;
const jdToDate = jd => new Date((jd - 2440587.5) * 86400000);
const elongationAt = jd => norm(planetLon("moon", jd) - planetLon("sun", jd));

// A moon-phase disc. `elong` is the Sun–Moon elongation (0=New … 180=Full).
function MoonDisc({ elong, R = 48 }) {
  const e = norm(elong);
  const rad = (e * Math.PI) / 180;
  const rx = Math.abs(Math.cos(rad)) * R;
  const waxing = e < 180;
  const gibbous = e > 90 && e < 270;
  // Outer limb is a semicircle on the lit side; the terminator is a
  // half-ellipse whose width is R·|cos(elong)| — narrow near the quarters,
  // full near New/Full. Sweep flags place the lit region on the correct side.
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
  const d = `M0,${-R} A ${R},${R} 0 0 ${outerSweep} 0,${R} A ${rx},${R} 0 0 ${innerSweep} 0,${-R} Z`;
  return (
    <svg width={R * 2 + 6} height={R * 2 + 6} viewBox={`${-R - 3} ${-R - 3} ${R * 2 + 6} ${R * 2 + 6}`}>
      <circle r={R} fill="#0a0918" stroke="rgba(200,175,100,0.22)" strokeWidth="1" />
      <path d={d} fill="#E8DFC0" />
      <circle r={R} fill="none" stroke="rgba(200,175,100,0.35)" strokeWidth="0.6" />
    </svg>
  );
}

function Hinge({ label, date, keynote, col, big }) {
  const d = jdToDate(date);
  const now = new Date();
  const days = Math.round((d - now) / 86400000);
  const when = days <= 0 ? "now" : days === 1 ? "tomorrow" : `in ${days} days`;
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: big ? "11px 13px" : "8px 12px", borderRadius: 11, background: big ? col + "12" : "rgba(8,5,22,0.5)", border: `1px solid ${big ? col + "3A" : "rgba(200,175,100,0.1)"}`, marginBottom: 7 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F, fontSize: big ? 12 : 10.5, color: col }}>{label}</div>
        {keynote && <div style={{ fontFamily: F, fontSize: 9, color: "#8A7050", fontStyle: "italic", lineHeight: 1.5, marginTop: 2 }}>{keynote}</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: F, fontSize: 10, color: "#C4A870" }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
        <div style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.45)", marginTop: 1 }}>{when}</div>
      </div>
    </div>
  );
}

export default function LunarCycleScreen({ now, profile, natalPos }) {
  const [intent, setIntent] = useState("");
  const [saved, setSaved] = useState(false);
  const jd = dateToJD(now);
  const tl = useMemo(() => lunationTimeline(jd, elongationAt), [Math.floor(jd * 24)]);
  const ph = tl.phase;
  const openCastings = useMemo(() => loadCastings().filter(c => c.status === "open" && !effectiveVerdict(c)).slice(0, 6), [saved]);

  const plantIntention = () => {
    if (!intent.trim() || saved) return;
    try {
      createCasting({
        kind: "working",
        title: `${ph.name} intention: ${intent.slice(0, 48)}`,
        intent,
        conditions: conditionsFromProfile(new Date(now), profile, natalPos),
        links: { lunation: { phase: ph.key, elongation: +tl.elongation.toFixed(1), setAt: new Date(now).toISOString() } },
      });
      setSaved(true); setIntent("");
    } catch {}
  };

  const IS = { width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(200,175,100,0.18)", borderRadius: 10, color: "#C4A870", fontFamily: F, outline: "none", padding: "9px 11px", fontSize: 12, boxSizing: "border-box", resize: "none" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>The Monthly Rhythm</div>
        <div style={T(20)}>Lunar Cycle</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>Plant at the New, bring to light at the Full, release in the dark — the oldest calendar of the practice.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {/* Current phase */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "14px 15px", borderRadius: 14, background: "rgba(8,5,22,0.8)", border: "1px solid rgba(200,175,100,0.15)", marginBottom: 9 }}>
          <MoonDisc elong={tl.elongation} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F, fontSize: 17, color: GOLD }}>{ph.name}</div>
            <div style={{ fontFamily: F, fontSize: 10, color: ph.waxing ? "#9AC89A" : "#C89A9A", letterSpacing: 1.5, marginTop: 2 }}>{ph.waxing ? "◗ Waxing" : "◖ Waning"} · {Math.round(tl.illum * 100)}% lit</div>
            <div style={{ fontFamily: F, fontSize: 9.5, color: "rgba(200,175,100,0.5)", marginTop: 3 }}>Day {Math.round(tl.ageDays)} of {Math.round(29.53)}</div>
            <div style={{ fontFamily: F, fontSize: 10, color: "#9A8060", fontStyle: "italic", lineHeight: 1.6, marginTop: 6 }}>{ph.keynote}</div>
          </div>
        </div>

        {/* The three hinges + quarters */}
        <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2.5, textTransform: "uppercase", margin: "4px 4px 7px" }}>The Coming Turns</div>
        <Hinge label="◐ First Quarter — act" date={tl.nextFirstQuarter} col="#B0C0A0" />
        <Hinge big label="● Full Moon — fruition & review" date={tl.nextFull} keynote="Bring the working to light; judge what the cycle brought." col="#E8DFC0" />
        <Hinge label="◑ Last Quarter — release" date={tl.nextLastQuarter} col="#C0B0A0" />
        <Hinge label="☽ Balsamic — rest & banish" date={tl.nextBalsamic} col="#8A80A0" />
        <Hinge big label="○ New Moon — plant the seed" date={tl.nextNew} keynote="Set the next lunation's intention; begin." col="#D4AF6A" />

        {/* Plant an intention → a casting */}
        <div className="card" style={{ marginTop: 4, marginBottom: 9 }}>
          <div style={L()}>Set an Intention for This Lunation</div>
          <textarea value={intent} onChange={e => { setIntent(e.target.value); setSaved(false); }} rows={2} placeholder="What do you plant this cycle? (recorded as a working, reviewed at the Full)" style={{ ...IS, marginTop: 8 }} />
          <button onClick={plantIntention} disabled={!intent.trim() || saved} style={{ width: "100%", marginTop: 8, padding: "11px 0", borderRadius: 11, background: saved ? "rgba(92,168,92,0.15)" : intent.trim() ? "rgba(212,175,106,0.12)" : "rgba(0,0,0,0.3)", border: `1px solid ${saved ? "rgba(92,168,92,0.4)" : intent.trim() ? "rgba(212,175,106,0.35)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 9.5, color: saved ? "#7AB07A" : intent.trim() ? GOLD : "#5A4020", letterSpacing: 2, textTransform: "uppercase", cursor: intent.trim() && !saved ? "pointer" : "default" }}>{saved ? "✓ Planted — judge it at the Full, in Review" : "⚑ Plant This Intention"}</button>
        </div>

        {/* Open castings to review at the Full */}
        {openCastings.length > 0 && (
          <div style={{ padding: "12px 14px", borderRadius: 13, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(200,175,100,0.1)", marginBottom: 9 }}>
            <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.45)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>To Bring to Light at the Full · {openCastings.length} open</div>
            {openCastings.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(200,175,100,0.05)" }}>
                <span style={{ fontFamily: F, fontSize: 10, color: "#8A7050", flexShrink: 0 }}>{c.kind === "sigil" ? "⟁" : c.kind === "talisman" ? "◈" : c.kind === "geomancy" ? "⚏" : "✦"}</span>
                <span style={{ fontFamily: F, fontSize: 10, color: "#C4A870", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
              </div>
            ))}
            <div style={{ fontFamily: F, fontSize: 8.5, color: "#5A4020", fontStyle: "italic", marginTop: 7 }}>Judge these in Review as the Moon fills.</div>
          </div>
        )}

        {/* The eight phases as a reference strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 9 }}>
          {PHASES.map((p, i) => (
            <div key={p.key} style={{ padding: "7px 6px", borderRadius: 9, background: i === ph.index ? GOLD + "18" : "rgba(0,0,0,0.25)", border: `1px solid ${i === ph.index ? GOLD + "50" : "rgba(200,175,100,0.08)"}`, textAlign: "center" }}>
              <div style={{ fontFamily: F, fontSize: 8.5, color: i === ph.index ? GOLD : "#7A6030", lineHeight: 1.3 }}>{p.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
