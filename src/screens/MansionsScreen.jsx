// ═══════════════════════════════════════════════════════════════════════
// MANSIONS SCREEN — the 28 stations of the Moon
// ═══════════════════════════════════════════════════════════════════════
// Live mansion with Picatrix meaning and electional use, the wheel of 28,
// and the Moon's next boundary crossings (computed by bisection on the
// real lunar longitude, so times are engine-accurate).

import { fmtT } from "../data/uiTables.jsx";
import { useState, useMemo } from "react";
import { F, L, T, GOLD } from "../ui/theme.js";
import { dateToJD, planetLon } from "../engine/astro.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { MANSIONS, MANSION_WIDTH, getMansion } from "../data/mansions.js";
import { createCasting } from "../lib/castings.js";

const NATURE_COL = { favorable: "#5CA85C", unfavorable: "#B05050", mixed: GOLD };

// Next time the Moon reaches eclipticLon `target` after jd (bisection).
function nextMoonCrossing(target, jd) {
  const lonAt = j => planetLon("moon", j);
  const gap0 = ((target - lonAt(jd)) % 360 + 360) % 360;
  let lo = jd + gap0 / 15.5;           // moon max ~15.4°/day
  let hi = jd + gap0 / 11.7 + 0.05;    // moon min ~11.8°/day
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const g = ((target - lonAt(mid)) % 360 + 360) % 360;
    if (g > 180) hi = mid; else lo = mid; // passed target when gap wraps past 180
  }
  return (lo + hi) / 2;
}

function jdToDate(jd) { return new Date((jd - 2440587.5) * 86400000); }

export default function MansionsScreen({ eph, now, profile, natalPos }) {
  const [sel, setSel] = useState(null);
  const [committed, setCommitted] = useState(false);
  const moonLonNow = eph?.pos?.moon?.lon ?? 0;
  const current = getMansion(moonLonNow);
  const shown = sel != null ? { ...MANSIONS[sel], index: sel + 1 } : current;

  // Operator's Loop: a working timed to the mansion is a casting like any other
  const recordUnderMansion = () => {
    try {
      createCasting({
        kind: "working",
        title: `Working under ${current.arabic} (mansion ${current.index})`,
        intent: current.elect,
        conditions: conditionsFromProfile(new Date(now), profile, natalPos),
        links: {},
      });
      setCommitted(true); setTimeout(() => setCommitted(false), 3000);
    } catch {}
  };

  // Next 5 mansion entries
  const upcoming = useMemo(() => {
    const jd = dateToJD(now);
    const out = [];
    for (let k = 1; k <= 5; k++) {
      const idx = (current.index - 1 + k) % 28;
      const target = idx * MANSION_WIDTH;
      const cJd = nextMoonCrossing(target, jd);
      out.push({ mansion: MANSIONS[idx], n: idx + 1, at: jdToDate(cJd) });
    }
    return out;
    // eslint-disable-next-line
  }, [current.index, Math.floor(dateToJD(now) * 24)]);

  const fmtT = d => `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} ${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Manāzil al-Qamar · Picatrix</div>
        <div style={T(20)}>Lunar Mansions</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>The Moon's 28 stations — the oldest electional framework in the tradition. Each mansion colours everything begun beneath it.</div>
      </div>

      {/* Wheel of 28 */}
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
        <svg width={280} height={280} viewBox="0 0 280 280">
          <circle cx={140} cy={140} r={126} fill="none" stroke="rgba(var(--tint-rgb),0.12)" strokeWidth={1} />
          <circle cx={140} cy={140} r={92} fill="none" stroke="rgba(var(--tint-rgb),0.07)" strokeWidth={1} />
          {MANSIONS.map((m, i) => {
            const a0 = (i * MANSION_WIDTH - 90) * Math.PI / 180;
            const aMid = ((i + 0.5) * MANSION_WIDTH - 90) * Math.PI / 180;
            const isCur = i === current.index - 1;
            const isSel = sel === i;
            return (
              <g key={m.n} onClick={() => setSel(isSel ? null : i)} style={{ cursor: "pointer" }}>
                <line x1={140 + 92 * Math.cos(a0)} y1={140 + 92 * Math.sin(a0)} x2={140 + 126 * Math.cos(a0)} y2={140 + 126 * Math.sin(a0)} stroke="rgba(var(--tint-rgb),0.15)" strokeWidth={0.6} />
                <circle cx={140 + 109 * Math.cos(aMid)} cy={140 + 109 * Math.sin(aMid)} r={isCur ? 8 : 6}
                  fill={isCur ? "rgba(200,221,237,0.25)" : isSel ? "rgba(var(--tint-rgb),0.25)" : "rgba(8,5,22,0.8)"}
                  stroke={isCur ? "#C8DDED" : isSel ? GOLD : NATURE_COL[m.nature] + "55"} strokeWidth={isCur ? 1.5 : 0.8} />
                <text x={140 + 109 * Math.cos(aMid)} y={140 + 109 * Math.sin(aMid) + 2.5} textAnchor="middle" fontSize={6.5} fontFamily={F} fill={isCur ? "#C8DDED" : "rgba(var(--tint-rgb),0.6)"}>{m.n}</text>
              </g>
            );
          })}
          {/* Moon marker */}
          {(() => { const a = (moonLonNow - 90) * Math.PI / 180; return <text x={140 + 126 * Math.cos(a)} y={140 + 126 * Math.sin(a) + 4} textAnchor="middle" fontSize={13} fill="#C8DDED">☽</text>; })()}
          <text x={140} y={136} textAnchor="middle" fontFamily={F} fontSize={9} fill="rgba(var(--tint-rgb),0.5)" letterSpacing={2}>MANSION</text>
          <text x={140} y={154} textAnchor="middle" fontFamily={F} fontSize={16} fill="#C8DDED">{current.index}</text>
        </svg>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {/* Selected / current mansion card */}
        <div style={{ borderRadius: 14, background: "rgba(8,5,22,0.85)", border: `1px solid ${NATURE_COL[shown.nature]}35`, padding: "14px 15px", marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: F, fontSize: 15, color: GOLD }}>{shown.index ?? shown.n}. {shown.arabic}</div>
              <div style={{ fontFamily: F, fontSize: 9, color: "rgba(var(--tint-rgb),0.45)", marginTop: 2, fontStyle: "italic" }}>{shown.latin} — "{shown.translation}" · {shown.sign}</div>
            </div>
            <span style={{ fontFamily: F, fontSize: 8, color: NATURE_COL[shown.nature], letterSpacing: 1.5, textTransform: "uppercase", border: `1px solid ${NATURE_COL[shown.nature]}50`, borderRadius: 7, padding: "3px 8px" }}>{shown.nature}</span>
          </div>
          {(shown.index ?? shown.n) === current.index && sel == null && (
            <div style={{ fontFamily: F, fontSize: 9, color: "#C8DDED", marginTop: 6 }}>☽ Moon is here now — {Math.round(current.progress * 100)}% through</div>
          )}
          <div style={{ fontFamily: F, fontSize: 11, color: "#9A8060", fontStyle: "italic", lineHeight: 1.9, marginTop: 8 }}>{shown.meaning}</div>
          <div style={{ marginTop: 9, padding: "8px 10px", borderRadius: 9, background: "rgba(92,168,92,0.07)", border: "1px solid rgba(92,168,92,0.18)" }}>
            <span style={{ fontFamily: F, fontSize: 8, color: "#5CA85C", letterSpacing: 2 }}>ELECT: </span>
            <span style={{ fontFamily: F, fontSize: 10, color: "#C4A870", fontStyle: "italic" }}>{shown.elect}</span>
          </div>
          <div style={{ marginTop: 5, padding: "8px 10px", borderRadius: 9, background: "rgba(176,80,80,0.07)", border: "1px solid rgba(176,80,80,0.18)" }}>
            <span style={{ fontFamily: F, fontSize: 8, color: "#B05050", letterSpacing: 2 }}>AVOID: </span>
            <span style={{ fontFamily: F, fontSize: 10, color: "#C4A870", fontStyle: "italic" }}>{shown.avoid}</span>
          </div>
          {(shown.index ?? shown.n) === current.index && (
            <button onClick={recordUnderMansion} style={{ width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 10, background: committed ? "rgba(92,168,92,0.15)" : "rgba(200,221,237,0.08)", border: `1px solid ${committed ? "rgba(92,168,92,0.4)" : "rgba(200,221,237,0.25)"}`, fontFamily: F, fontSize: 9, color: committed ? "#7AB07A" : "#C8DDED", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>
              {committed ? "✓ Recorded — judge it in Review" : "⚑ Record a Working Under This Mansion"}
            </button>
          )}
        </div>

        {/* Upcoming entries */}
        <div style={{ borderRadius: 13, background: "rgba(8,5,22,0.65)", border: "1px solid rgba(200,221,237,0.14)", padding: "12px 14px", marginBottom: 9 }}>
          <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,221,237,0.6)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 7 }}>Next Mansion Entries</div>
          {upcoming.map(u => (
            <div key={u.n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(var(--tint-rgb),0.05)" }}>
              <div style={{ fontFamily: F, fontSize: 10.5, color: "#C4A870" }}>
                <span style={{ color: NATURE_COL[u.mansion.nature] }}>{u.n}.</span> {u.mansion.arabic}
              </div>
              <div style={{ fontFamily: F, fontSize: 9.5, color: "rgba(var(--tint-rgb),0.5)" }}>{fmtT(u.at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
