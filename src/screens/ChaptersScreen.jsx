// ═══════════════════════════════════════════════════════════════════════
// CHAPTERS — profections and zodiacal releasing
// ═══════════════════════════════════════════════════════════════════════
// The Hellenistic answer to "what chapter am I in?": the annual profection
// (this year's house, sign, and Lord of the Year) and Valens' zodiacal
// releasing from the Lot of Spirit or Fortune — the major and minor periods
// of the life, with peaks (angular from Fortune) and the loosing of the
// bond marked. Verified engine: 360-day years, Capricorn 27, L2 in 30-day
// months, LB after the 211-unit circuit.

import { useState, useMemo } from "react";
import { F, L, T } from "../ui/theme.js";
import { P } from "../data/planets.js";
import { lonToZodiac } from "../engine/astro.js";
import { computeLots, chartFromPositions } from "../engine/lots.js";
import { profection } from "../engine/profections.js";
import { zrCurrent, zrSubdivide, ZR_UNITS, SIGN_NAMES } from "../engine/zr.js";

const GOLD = "#D4AF6A";
const SIGN_SYMS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const fmtD = d => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
const fmtDay = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function PeriodRow({ p, current, onClick, sub }) {
  const col = p.angle === 10 ? "#FFD700" : p.angle ? "#7AB07A" : "#C4A870";
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 9, padding: sub ? "6px 10px" : "9px 12px", borderRadius: 10, background: current ? "rgba(212,175,106,0.12)" : "rgba(8,5,22,0.55)", border: `1px solid ${current ? "rgba(212,175,106,0.45)" : "rgba(200,175,100,0.08)"}`, marginBottom: 5, cursor: onClick ? "pointer" : "default" }}>
      <span style={{ fontSize: sub ? 13 : 16, color: col, width: 20, textAlign: "center" }}>{SIGN_SYMS[p.sign]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F, fontSize: sub ? 10.5 : 12, color: current ? GOLD : "#C4A870" }}>
          {p.signName}
          {p.lb && <span style={{ color: "#D28060", fontSize: 8.5, marginLeft: 6 }}>⚡ loosing of the bond</span>}
          {p.angle === 10 && <span style={{ color: "#FFD700", fontSize: 8.5, marginLeft: 6 }}>★ culmination (10th from Fortune)</span>}
          {p.angle && p.angle !== 10 && <span style={{ color: "#7AB07A", fontSize: 8.5, marginLeft: 6 }}>◆ peak ({p.angle === 1 ? "1st" : `${p.angle}th`} from Fortune)</span>}
        </div>
        <div style={{ fontFamily: F, fontSize: sub ? 8.5 : 9, color: "rgba(200,175,100,0.45)", marginTop: 1 }}>{sub ? `${fmtDay(p.start)} — ${fmtDay(p.end)}` : `${fmtD(p.start)} — ${fmtD(p.end)}`}{p.truncated ? " ·" : ""}</div>
      </div>
      {current && <span style={{ fontFamily: F, fontSize: 8, color: GOLD, letterSpacing: 1.5 }}>NOW</span>}
    </div>
  );
}

export default function ChaptersScreen({ profile, natalPos, now }) {
  const [lotKey, setLotKey] = useState("spirit"); // spirit | fortune
  const [openL1, setOpenL1] = useState(null);

  const birth = profile?.natal?.date ? new Date(`${profile.natal.date}T${profile.natal.time || "12:00"}:00`) : null;
  const chart = useMemo(() => chartFromPositions(natalPos), [natalPos]);
  const lots = useMemo(() => (chart ? computeLots(chart) : null), [chart]);
  const spiritSign = lots?.spirit != null ? Math.floor(lots.spirit / 30) : null;
  const fortuneSign = lots?.fortune != null ? Math.floor(lots.fortune / 30) : null;
  const lotSign = lotKey === "spirit" ? spiritSign : fortuneSign;
  const ascSign = chart?.asc != null ? Math.floor(chart.asc / 30) : null;

  const prof = useMemo(() => (birth && ascSign != null ? profection(birth, now || new Date(), ascSign) : null), [birth, ascSign, now]);
  const zr = useMemo(() => (birth && lotSign != null ? zrCurrent(lotSign, birth, now || new Date(), fortuneSign) : null), [birth, lotSign, fortuneSign, now]);

  const ready = birth && lots && lotSign != null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Valens · Anthologies IV</div>
        <div style={T(20)}>Chapters</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>What chapter am I in? The year's profection and the releasing of the lots — the periods and peaks of the life.</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {!ready && (
          <div className="card" style={{ textAlign: "center", padding: "22px 16px" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: "#9A8060", lineHeight: 1.7 }}>Chapters need a birth date, time, and place (for the Ascendant and the Lots). Add them in Profile.</div>
          </div>
        )}

        {ready && prof && (
          <div style={{ padding: "13px 15px", borderRadius: 13, background: "rgba(8,5,22,0.75)", border: "1px solid rgba(200,175,100,0.15)", marginBottom: 10 }}>
            <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>The Year · Annual Profection · Age {prof.age}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 26, color: P[prof.lord]?.col || GOLD }}>{P[prof.lord]?.sym}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F, fontSize: 14, color: GOLD }}>{prof.house}th house year — {prof.sign}</div>
                <div style={{ fontFamily: F, fontSize: 10, color: "#9A8060", fontStyle: "italic", marginTop: 2 }}>The year of {prof.topic}.</div>
                <div style={{ fontFamily: F, fontSize: 10.5, color: P[prof.lord]?.col, marginTop: 4 }}>{P[prof.lord]?.name} is Lord of the Year — its condition and transits colour everything until {fmtDay(prof.yearEnd)}.</div>
                {natalPos?.[prof.lord] && <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", marginTop: 3 }}>Natal {P[prof.lord].name}: {natalPos[prof.lord].zodiac?.degree}° {natalPos[prof.lord].zodiac?.name} ({natalPos[prof.lord].dignity})</div>}
              </div>
            </div>
          </div>
        )}

        {ready && zr && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
              {[["spirit", "☉ From Spirit — career & action"], ["fortune", "☽ From Fortune — body & fortune"]].map(([k, lbl]) => (
                <button key={k} onClick={() => { setLotKey(k); setOpenL1(null); }} style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: lotKey === k ? "rgba(212,175,106,0.14)" : "rgba(0,0,0,0.3)", border: `1px solid ${lotKey === k ? "rgba(212,175,106,0.4)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 8.5, color: lotKey === k ? GOLD : "#7A6030", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>{lbl}</button>
              ))}
            </div>

            {/* The current chain */}
            {zr.l1 && (
              <div style={{ padding: "12px 14px", borderRadius: 13, background: "rgba(8,5,22,0.75)", border: `1px solid ${zr.l1.angle ? "rgba(122,176,122,0.35)" : "rgba(200,175,100,0.15)"}`, marginBottom: 10 }}>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>The Chapter Now · releasing from the Lot of {lotKey === "spirit" ? "Spirit" : "Fortune"} in {SIGN_NAMES[lotSign]}</div>
                <div style={{ fontFamily: F, fontSize: 15, color: GOLD }}>
                  {zr.l1.signName} period {SIGN_SYMS[zr.l1.sign]}
                  {zr.l1.angle === 10 && <span style={{ color: "#FFD700", fontSize: 10, marginLeft: 8 }}>★ culmination</span>}
                  {zr.l1.angle && zr.l1.angle !== 10 && <span style={{ color: "#7AB07A", fontSize: 10, marginLeft: 8 }}>◆ peak period</span>}
                </div>
                <div style={{ fontFamily: F, fontSize: 9.5, color: "rgba(200,175,100,0.5)", marginTop: 2 }}>{fmtD(zr.l1.start)} — {fmtD(zr.l1.end)} · ruled by {P[["mars","venus","mercury","moon","sun","mercury","venus","mars","jupiter","saturn","saturn","jupiter"][zr.l1.sign]]?.name}</div>
                {zr.l2 && <div style={{ fontFamily: F, fontSize: 11, color: "#C4A870", marginTop: 7 }}>Sub-period: {zr.l2.signName} {SIGN_SYMS[zr.l2.sign]} · {fmtDay(zr.l2.start)} — {fmtDay(zr.l2.end)}{zr.l2.lb ? " · after the loosing of the bond ⚡" : ""}{zr.l2.angle ? ` · ${zr.l2.angle === 10 ? "★ culminating" : "◆ peak"}` : ""}</div>}
                {zr.l3 && <div style={{ fontFamily: F, fontSize: 9.5, color: "#9A8060", marginTop: 3 }}>This week's tone: {zr.l3.signName} · until {fmtDay(zr.l3.end)}</div>}
              </div>
            )}

            {/* L1 timeline */}
            <div style={{ fontFamily: F, fontSize: 8, color: "rgba(200,175,100,0.4)", letterSpacing: 2.5, textTransform: "uppercase", margin: "2px 4px 7px" }}>The Major Periods</div>
            {zr.timeline.filter(p => p.end > new Date((now || new Date()).getTime() - 40 * 365.25 * 86400000)).slice(0, 10).map((p, i) => {
              const isCur = zr.l1 && p.start.getTime() === zr.l1.start.getTime();
              const isOpen = openL1 === i;
              return (
                <div key={i}>
                  <PeriodRow p={p} current={isCur} onClick={() => setOpenL1(isOpen ? null : i)} />
                  {isOpen && (
                    <div style={{ margin: "0 0 7px 18px" }}>
                      {zrSubdivide(p, ZR_UNITS.l2, fortuneSign).map((s, j) => {
                        const curSub = zr.l2 && s.start.getTime() === zr.l2.start.getTime() && isCur;
                        return <PeriodRow key={j} p={s} current={curSub} sub />;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ fontFamily: F, fontSize: 8.5, color: "#5A4020", fontStyle: "italic", lineHeight: 1.7, padding: "6px 6px 12px" }}>
              Verified Valens: 360-day years, Capricorn 27, sub-periods in 30-day months from the parent's sign, the bond loosing to the opposite sign after the full 211-month circuit. Peaks are angular from the Lot of Fortune; the 10th from Fortune is the culmination. Tap a period for its months.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
