// ═══════════════════════════════════════════════════════════════════════
// ALMANAC SCREEN — the liturgical calendar
// ═══════════════════════════════════════════════════════════════════════
// A Circle Thrice–style month almanac generated from your own ephemeris:
// each day's planetary ruler, Moon phase / sign / mansion, Sun decan, void
// windows, and the month's ingresses, stations, and lunations — overlaid
// with your committed elections and the timing letters you've ingested,
// so your computed sky and their flagged windows sit side by side.
// Exports a clean printable HTML almanac (print → PDF on any iPad).

import { useState, useMemo } from "react";
import { F, L, T, P } from "../App.jsx";
import { buildMonthModel, dayHours, EVENT_GLYPH } from "../lib/almanac.js";
import { loadFeed, FEED_KIND_META } from "../lib/intake.js";
import { loadCastings } from "../lib/castings.js";
import { downloadText, shareOnNative } from "../lib/backup.js";

const GOLD = "#D4AF6A";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AlmanacScreen({ now, profile }) {
  const [offset, setOffset] = useState(0);
  const [selDay, setSelDay] = useState(null);
  const [exportMsg, setExportMsg] = useState("");
  const location = profile?.natal?.lat && profile?.natal?.lon ? { lat: profile.natal.lat, lon: profile.natal.lon } : null;

  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = base.getFullYear(), month = base.getMonth();

  const model = useMemo(() => buildMonthModel({ year, month, location }), [year, month, location?.lat, location?.lon]);

  // Overlays: ingested feed events + committed elections, mapped by date
  const overlays = useMemo(() => {
    const feed = {}, elect = {};
    loadFeed().forEach(e => { (feed[e.date] = feed[e.date] || []).push(e); });
    loadCastings().filter(c => c.kind === "election" && c.status === "open" && c.links?.electionWindow?.start).forEach(c => {
      const d = c.links.electionWindow.start.split("T")[0];
      (elect[d] = elect[d] || []).push(c);
    });
    return { feed, elect };
  }, [selDay, offset]); // re-read when navigating or after actions

  const todayStr = now.toISOString().split("T")[0];
  const sel = selDay ? model.days.find(d => d.day === selDay) : null;

  const exportAlmanac = async () => {
    const html = buildAlmanacHTML(model, overlays, `${MONTHS[month]} ${year}`, location);
    const name = `astrum-almanac-${year}-${String(month + 1).padStart(2, "0")}.html`;
    if (await shareOnNative(name, html)) { setExportMsg("✓ Almanac sent to the share sheet — open and print to PDF"); return; }
    if (downloadText(name, html)) { setExportMsg(`✓ Downloaded ${name} — open it and print to PDF`); return; }
    setExportMsg("✗ Export unavailable here");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 20 }}>
      <div style={{ padding: "16px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: F, fontSize: 9, color: "#8A7040", letterSpacing: 3.5, textTransform: "uppercase" }}>The Liturgical Calendar</div>
          <div style={T(20)}>Almanac</div>
        </div>
        <button onClick={exportAlmanac} style={{ padding: "7px 12px", borderRadius: 9, background: "rgba(212,175,106,0.1)", border: "1px solid rgba(212,175,106,0.28)", fontFamily: F, fontSize: 8.5, color: GOLD, letterSpacing: 1.5, cursor: "pointer" }}>⎙ EXPORT</button>
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 14px 8px" }}>
        <button onClick={() => { setOffset(o => o - 1); setSelDay(null); }} style={{ background: "none", border: "none", color: "rgba(200,175,100,0.5)", fontSize: 15, cursor: "pointer", padding: "4px 10px" }}>‹</button>
        <div style={{ fontFamily: F, fontSize: 12, color: GOLD, letterSpacing: 2 }}>{MONTHS[month].toUpperCase()} {year}</div>
        <button onClick={() => { setOffset(o => o + 1); setSelDay(null); }} style={{ background: "none", border: "none", color: "rgba(200,175,100,0.5)", fontSize: 15, cursor: "pointer", padding: "4px 10px" }}>›</button>
      </div>

      {/* Weekday header — colored by each day's planetary ruler */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, padding: "0 12px 3px", textAlign: "center" }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => {
          const ruler = ["sun","moon","mars","mercury","jupiter","venus","saturn"][i];
          return <div key={d} style={{ fontFamily: F, fontSize: 8, color: P[ruler].col + "AA" }}>{P[ruler].sym}</div>;
        })}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, padding: "0 12px" }}>
        {Array.from({ length: model.firstDow }).map((_, i) => <div key={"e" + i} />)}
        {model.days.map(dm => {
          const isToday = dm.dateStr === todayStr;
          const isSel = selDay === dm.day;
          const feed = overlays.feed[dm.dateStr] || [];
          const elect = overlays.elect[dm.dateStr] || [];
          const bigEvents = dm.events.filter(e => e.kind === "ingress" || e.kind === "station" || e.kind === "lunation");
          const rc = P[dm.dayRuler].col;
          return (
            <button key={dm.day} onClick={() => setSelDay(isSel ? null : dm.day)} style={{
              aspectRatio: "0.82", borderRadius: 8, padding: "3px 2px 2px",
              background: isSel ? rc + "1E" : "rgba(8,5,22,0.6)",
              border: isToday ? `1.5px solid ${rc}90` : isSel ? `1px solid ${rc}70` : "1px solid rgba(200,175,100,0.07)",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontFamily: F, fontSize: 9, color: isToday ? GOLD : "rgba(200,175,100,0.6)" }}>{dm.day}</span>
                <span style={{ fontSize: 8, color: rc }}>{P[dm.dayRuler].sym}</span>
              </div>
              <div style={{ fontSize: 11, color: "#C8DDED", lineHeight: 1, marginTop: 1 }}>{dm.moon.phaseGlyph}</div>
              <div style={{ fontFamily: F, fontSize: 6, color: "rgba(200,175,100,0.4)", marginTop: 1 }}>{dm.moon.signSym}{dm.voc ? "∅" : ""}</div>
              <div style={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", marginTop: "auto", minHeight: 8 }}>
                {bigEvents.slice(0, 2).map((e, i) => <span key={i} style={{ fontSize: 6.5, color: e.kind === "station" ? "#C878A8" : e.kind === "lunation" ? "#C8DDED" : "#7CB8E0" }}>{EVENT_GLYPH[e.kind]}</span>)}
                {elect.length > 0 && <span style={{ fontSize: 6.5, color: "#5CA85C" }}>◈</span>}
                {feed.slice(0, 3).map((e, i) => <span key={"f" + i} style={{ width: 3, height: 3, borderRadius: 2, background: FEED_KIND_META[e.kind]?.col || GOLD, display: "inline-block" }} />)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "8px 16px 0", fontFamily: F, fontSize: 7.5, color: "rgba(200,175,100,0.4)" }}>
        <span>☽ phase</span><span style={{ color: "#7CB8E0" }}>≡ ingress</span><span style={{ color: "#C878A8" }}>℞ station</span><span style={{ color: "#C8DDED" }}>○ lunation</span><span style={{ color: "#5CA85C" }}>◈ your election</span><span style={{ color: GOLD }}>• timing letter</span><span>∅ void</span>
      </div>

      {/* Day detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 0" }}>
        {!sel && <div style={{ textAlign: "center", padding: "24px 20px", fontFamily: F, fontSize: 11, color: "#5A4020", fontStyle: "italic", lineHeight: 1.8 }}>Tap a day for its full reckoning — the planetary hours, the Moon's station, the events of the sky, and what your letters and your own elections mark.</div>}
        {sel && <DayDetail dm={sel} year={year} month={month} location={location} feed={overlays.feed[sel.dateStr] || []} elect={overlays.elect[sel.dateStr] || []} />}
      </div>
      {exportMsg && <div style={{ fontFamily: F, fontSize: 9, color: exportMsg.startsWith("✓") ? "#7A9A7A" : "#9B5050", padding: "6px 16px 0" }}>{exportMsg}</div>}
    </div>
  );
}

function DayDetail({ dm, year, month, location, feed, elect }) {
  const hours = useMemo(() => dayHours(new Date(year, month, dm.day), location), [year, month, dm.day, location?.lat, location?.lon]);
  const now = new Date();
  const nowStr = now.toISOString().split("T")[0];
  const isToday = dm.dateStr === nowStr;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <div style={T(17)}>{new Date(year, month, dm.day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <span style={{ fontSize: 13, color: P[dm.dayRuler].col }}>{P[dm.dayRuler].sym}</span>
        <span style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.45)" }}>Day of {P[dm.dayRuler].name}</span>
      </div>

      {/* Sky summary */}
      <div style={{ borderRadius: 12, background: "rgba(8,5,22,0.65)", border: "1px solid rgba(200,175,100,0.1)", padding: "11px 13px", marginBottom: 8 }}>
        <div style={{ fontFamily: F, fontSize: 10.5, color: "#C8DDED" }}>{dm.moon.phaseGlyph} {dm.moon.phaseName} Moon in {dm.moon.sign} {dm.moon.signSym}{dm.voc ? " — Void of Course" : ""}</div>
        <div style={{ fontFamily: F, fontSize: 9.5, color: "rgba(200,175,100,0.6)", marginTop: 3 }}>Mansion {dm.mansion.n} · {dm.mansion.name} ({dm.mansion.nature})</div>
        <div style={{ fontFamily: F, fontSize: 9.5, color: "rgba(200,175,100,0.6)", marginTop: 2 }}>Sun in decan {dm.sunDecan.idx + 1} — {dm.sunDecan.name} ({dm.sunDecan.ruler ? P[dm.sunDecan.ruler]?.name : ""})</div>
      </div>

      {/* Events */}
      {dm.events.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {dm.events.map((e, i) => (
            <div key={i} style={{ fontFamily: F, fontSize: 10, color: e.kind === "station" ? "#C878A8" : e.kind === "lunation" ? "#C8DDED" : "#9A8060", padding: "2px 0" }}>
              {EVENT_GLYPH[e.kind]} {e.text}
            </div>
          ))}
        </div>
      )}

      {/* Overlays */}
      {elect.map(c => (
        <div key={c.id} style={{ padding: "7px 10px", borderRadius: 9, background: "rgba(92,168,92,0.08)", border: "1px solid rgba(92,168,92,0.25)", marginBottom: 5, fontFamily: F, fontSize: 9.5, color: "#7AB07A" }}>
          ◈ Your committed election: {c.title} ({c.links.electionWindow.score})
        </div>
      ))}
      {feed.map(e => {
        const k = FEED_KIND_META[e.kind];
        return (
          <div key={e.id} style={{ padding: "7px 10px", borderRadius: 9, background: "rgba(200,175,100,0.05)", border: `1px solid ${k.col}30`, marginBottom: 5 }}>
            <div style={{ fontFamily: F, fontSize: 9.5, color: "#C4A870", lineHeight: 1.5 }}><span style={{ color: k.col }}>{k.glyph}</span> {e.title}</div>
            <div style={{ fontFamily: F, fontSize: 7.5, color: "rgba(200,175,100,0.4)", marginTop: 2 }}>{e.source}{e.time ? ` · ${e.time}` : ""} · {k.label}</div>
          </div>
        );
      })}

      {/* Planetary hours */}
      <div style={{ marginTop: 6 }}>
        <div style={L()}>Planetary Hours{location ? "" : " (equal — set location for true hours)"}</div>
        <div style={{ marginTop: 6 }}>
          {hours.map((h, i) => {
            const active = isToday && now >= h.start && now < h.end;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 8px", borderRadius: 7, background: active ? P[h.planet].col + "18" : i % 2 ? "rgba(0,0,0,0.15)" : "transparent" }}>
                <span style={{ fontSize: 11, color: P[h.planet].col, width: 16 }}>{P[h.planet].sym}</span>
                <span style={{ fontFamily: F, fontSize: 9.5, color: active ? GOLD : "#C4A870", flex: 1 }}>{P[h.planet].name}</span>
                <span style={{ fontFamily: F, fontSize: 8.5, color: "rgba(200,175,100,0.4)" }}>{h.isDay ? "☀" : "☾"}</span>
                <span style={{ fontFamily: F, fontSize: 9, color: "rgba(200,175,100,0.5)", width: 92, textAlign: "right" }}>
                  {h.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{h.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Printable HTML almanac (open → print to PDF, or share on iOS) ────────
function buildAlmanacHTML(model, overlays, label, location) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rows = model.days.map(dm => {
    const feed = overlays.feed[dm.dateStr] || [];
    const elect = overlays.elect[dm.dateStr] || [];
    const events = dm.events.filter(e => e.kind !== "moon-ingress").map(e => e.text);
    const notes = [
      ...events,
      ...elect.map(c => `◈ Election: ${c.title} (${c.links.electionWindow.score})`),
      ...feed.map(e => `✦ ${e.source}: ${e.title}`),
    ];
    return `<tr>
      <td class="d">${dm.day}<br><span class="dow">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dm.dow]}</span></td>
      <td>${esc(dm.dayRuler)}</td>
      <td>${dm.moon.phaseGlyph} ${esc(dm.moon.phaseName)}<br>${esc(dm.moon.sign)}${dm.voc ? " · VoC" : ""}</td>
      <td>M${dm.mansion.n} ${esc(dm.mansion.name)}</td>
      <td>${esc((dm.sunDecan.name) || "")}</td>
      <td class="n">${notes.map(esc).join("<br>") || "—"}</td>
    </tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Astrum Almanac — ${esc(label)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#2a2018;margin:32px;}
  h1{font-size:20px;letter-spacing:2px;font-weight:normal;border-bottom:1px solid #b8a060;padding-bottom:8px;}
  .sub{font-size:11px;color:#7a6a40;margin:4px 0 18px;}
  table{border-collapse:collapse;width:100%;font-size:11px;}
  th{text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#8a7040;border-bottom:1px solid #ccb;padding:4px 6px;}
  td{border-bottom:1px solid #eee;padding:5px 6px;vertical-align:top;}
  td.d{font-weight:bold;width:34px;} .dow{font-weight:normal;font-size:8px;color:#999;}
  td.n{color:#4a3a20;font-size:10px;line-height:1.5;}
  @media print{body{margin:12px;} a{display:none;}}
</style></head><body>
  <h1>Astrum Almanac — ${esc(label)}</h1>
  <div class="sub">Generated from the Swiss Ephemeris${location ? " for your location" : " (equal hours — no location set)"}. Timing-letter entries are attributed to their source; elections are your own committed windows.</div>
  <table><thead><tr><th>Day</th><th>Ruler</th><th>Moon</th><th>Mansion</th><th>Sun Decan</th><th>Events, Elections & Letters</th></tr></thead>
  <tbody>${rows}</tbody></table>
</body></html>`;
}
