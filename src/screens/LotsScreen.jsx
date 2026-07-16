// ═══════════════════════════════════════════════════════════════════════
// LOTS SCREEN — the seven Hermetic Lots (Arabic Parts)
// ═══════════════════════════════════════════════════════════════════════
// Fortune and Spirit and the five that swing from them, computed sect-aware
// from either the natal chart or the sky right now. Each lot shows its sign,
// degree, and whole-sign house counted from that chart's Ascendant. An
// optional reading interprets the lots in the practitioner's tradition.

import { useState, useMemo } from "react";
import { F, L, T, TRADITIONS, buildSystemPrompt, lonToZodiac } from "../App.jsx";
import { computeLots, chartFromPositions, wholeSignHouse, LOTS } from "../engine/lots.js";
import { askAI, aiConfigured, aiUnconfiguredMessage } from "../ai/client.js";

const GOLD = "#D4AF6A";
const ordinal = n => n + (n >= 11 && n <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");

function Deg({ lon }) {
  if (lon == null) return <span style={{ color: "#5A4020" }}>—</span>;
  const z = lonToZodiac(lon);
  return (
    <span style={{ fontFamily: F }}>
      <span style={{ color: GOLD, fontSize: 15 }}>{z.sym}</span>{" "}
      <span style={{ color: "#C4A870" }}>{z.degree}°{String(z.minutes).padStart(2, "0")}′</span>{" "}
      <span style={{ color: "#7A6030", fontSize: 10 }}>{z.name}</span>
    </span>
  );
}

export default function LotsScreen({ eph, natalPos, profile, now }) {
  const [source, setSource] = useState("natal"); // natal | now
  const [convention, setConvention] = useState("paulus"); // paulus | valens
  const [open, setOpen] = useState(null);
  const [reading, setReading] = useState(null);
  const [busy, setBusy] = useState(false);

  const chart = useMemo(() => {
    const src = source === "natal" ? natalPos : eph;
    return chartFromPositions(src);
  }, [source, natalPos, eph]);

  const lots = useMemo(() => (chart ? computeLots(chart, { convention }) : null), [chart, convention]);
  const hasChart = chart && chart.asc != null && lots;

  const draftReading = async () => {
    if (!hasChart) return;
    if (!aiConfigured()) { setReading(aiUnconfiguredMessage()); return; }
    setBusy(true); setReading(null);
    const lines = LOTS.map(l => {
      const lon = lots[l.id]; const z = lon != null ? lonToZodiac(lon) : null;
      const h = wholeSignHouse(lon, chart.asc);
      return `${l.name}: ${z ? `${z.degree}° ${z.name}` : "—"}${h ? `, ${ordinal(h)} whole-sign house` : ""}`;
    }).join("\n");
    const sect = chart.isDayChart === false ? "a NIGHT (nocturnal) chart" : "a DAY (diurnal) chart";
    const conv = convention === "valens" ? "the VALENS convention (Eros and Necessity as pure mirrors of Fortune and Spirit)" : "the PAULUS convention (Eros from Venus, Necessity from Mercury)";
    const sys = buildSystemPrompt(profile,
      "You are a Hellenistic astrologer in the tradition of Paulus Alexandrinus and Vettius Valens, versed in the doctrine of the lots as revived by the modern Hellenistic school. Interpret the seven Hermetic Lots below for the practitioner. This is " + sect + ", which determines the lots' formulas, computed under " + conv + ". Weigh especially: the Lot of Fortune (the body and fortune) and its ruler; the Lot of Spirit (the soul, action, career) and its ruler; and how the two relate. Then read Eros, Necessity, Courage, Victory, and Nemesis by the houses they fall in and their rulers. Be concrete about the houses and rulers; name what each lot points to in this life. Keep it to a few tight paragraphs — this is chart analysis, not a sermon.");
    try {
      setReading(await askAI({ apiKey: profile?.apiKey || "", system: sys,
        messages: [{ role: "user", content: `Chart: ${source === "natal" ? "natal" : "the present sky"}, ${sect}.\nAscendant: ${lonToZodiac(chart.asc).degree}° ${lonToZodiac(chart.asc).name}.\n\nThe seven lots:\n${lines}` }], maxTokens: 900 }));
    } catch (e) { setReading(e.message || "Reading unavailable."); }
    setBusy(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 8px" }}>
        <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>Hēmerai · Paulus · Valens</div>
        <div style={T(20)}>The Hermetic Lots</div>
        <div style={{ fontFamily: F, fontSize: 10, color: "#5A4020", fontStyle: "italic", marginTop: 3, lineHeight: 1.7 }}>Seven arcs swung from the Ascendant — Fortune and Spirit, the body and the soul, and the five that turn upon them.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {/* Source toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
          {[["natal", "Natal Chart"], ["now", "The Sky Now"]].map(([k, lbl]) => (
            <button key={k} onClick={() => { setSource(k); setReading(null); }} style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: source === k ? "rgba(212,175,106,0.14)" : "rgba(0,0,0,0.3)", border: `1px solid ${source === k ? "rgba(212,175,106,0.4)" : "rgba(200,175,100,0.1)"}`, fontFamily: F, fontSize: 9.5, color: source === k ? GOLD : "#7A6030", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{lbl}</button>
          ))}
        </div>
        {/* Convention toggle — Eros/Necessity differ between the two schools */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
          <span style={{ fontFamily: F, fontSize: 8, color: "#6A5028", letterSpacing: 1.5, textTransform: "uppercase", marginRight: 2 }}>Rite</span>
          {[["paulus", "Paulus"], ["valens", "Valens"]].map(([k, lbl]) => (
            <button key={k} onClick={() => { setConvention(k); setReading(null); }} style={{ flex: 1, padding: "6px 0", borderRadius: 8, background: convention === k ? "rgba(120,100,180,0.16)" : "rgba(0,0,0,0.3)", border: `1px solid ${convention === k ? "rgba(120,100,180,0.4)" : "rgba(200,175,100,0.08)"}`, fontFamily: F, fontSize: 8.5, color: convention === k ? "#B0A0E0" : "#6A5028", letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer" }}>{lbl}</button>
          ))}
        </div>

        {!hasChart && (
          <div className="card" style={{ textAlign: "center", padding: "22px 16px" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: "#9A8060", lineHeight: 1.7 }}>
              {source === "natal"
                ? "The lots need a birth time and place. Add your natal data in Profile to see them."
                : "The lots need your location to raise an Ascendant. Add it in Profile."}
            </div>
          </div>
        )}

        {hasChart && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, padding: "8px 12px", borderRadius: 10, background: "rgba(8,5,22,0.6)", border: "1px solid rgba(200,175,100,0.1)" }}>
              <span style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", letterSpacing: 2, textTransform: "uppercase" }}>Sect</span>
              <span style={{ fontFamily: F, fontSize: 12, color: GOLD }}>{chart.isDayChart === false ? "☾ Nocturnal" : "☉ Diurnal"}</span>
              <span style={{ fontFamily: F, fontSize: 9.5, color: "#7A6030", marginLeft: "auto" }}>Asc <Deg lon={chart.asc} /></span>
            </div>

            {LOTS.map(lot => {
              const lon = lots[lot.id];
              const house = wholeSignHouse(lon, chart.asc);
              const isOpen = open === lot.id;
              return (
                <div key={lot.id} onClick={() => setOpen(isOpen ? null : lot.id)} style={{ marginBottom: 7, padding: "11px 13px", borderRadius: 12, background: "rgba(8,5,22,0.6)", border: `1px solid ${isOpen ? "rgba(212,175,106,0.3)" : "rgba(200,175,100,0.1)"}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ fontSize: 19, color: GOLD, width: 24, textAlign: "center", flexShrink: 0 }}>{lot.glyph}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F, fontSize: 13, color: "#D4C098" }}>{lot.name} <span style={{ fontSize: 9, color: "#6A5028", fontStyle: "italic" }}>· {lot.latin}</span></div>
                      <div style={{ fontFamily: F, fontSize: 8.5, color: "#7A6030", letterSpacing: 0.5, marginTop: 1 }}>{lot.theme}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div><Deg lon={lon} /></div>
                      {house && <div style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", marginTop: 2 }}>{ordinal(house)} house</div>}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(200,175,100,0.1)", fontFamily: F, fontSize: 10.5, color: "#9A8060", lineHeight: 1.75 }}>
                      {lot.meaning}
                      <div style={{ marginTop: 6, fontSize: 9, color: "#6A5028" }}>Significator: {lot.significator[0].toUpperCase() + lot.significator.slice(1)} · {chart.isDayChart === false && lot.reverses ? "night formula (reversed)" : "day formula"}</div>
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={draftReading} disabled={busy} style={{ width: "100%", marginTop: 4, marginBottom: 9, padding: "12px 0", borderRadius: 11, background: "rgba(100,80,160,0.15)", border: "1px solid rgba(100,80,160,0.35)", fontFamily: F, fontSize: 9.5, color: "rgba(160,140,220,0.85)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{busy ? "Reading…" : "✧ Read the Lots"}</button>

            {reading && (
              <div style={{ padding: "13px 14px", borderRadius: 13, background: "rgba(20,15,40,0.8)", border: "1px solid rgba(100,80,160,0.25)", marginBottom: 9 }}>
                <div style={{ fontFamily: F, fontSize: 8, color: "rgba(160,140,220,0.6)", letterSpacing: 2, marginBottom: 8 }}>THE LOTS · {profile?.traditions?.map(t => TRADITIONS[t]?.label || t).join(" · ") || "HELLENISTIC"}</div>
                <div style={{ fontFamily: F, fontSize: 11, color: "#C4A870", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{reading}</div>
              </div>
            )}

            <div style={{ fontFamily: F, fontSize: 8.5, color: "#5A4020", fontStyle: "italic", lineHeight: 1.7, padding: "4px 6px 12px" }}>
              {convention === "valens"
                ? "Valens convention: Eros and Necessity are computed as pure mirrors of the Lots of Fortune and Spirit (no significator planet) — the older layer. The other five lots are unchanged. Sect-aware; houses whole-sign from the Ascendant."
                : "Paulus Alexandrinus convention (the modern Hellenistic-revival default): Eros and Necessity take the significator planet (Venus, Mercury). Switch to Valens for the older, planet-free mirrors. Sect-aware; houses whole-sign from the Ascendant."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
