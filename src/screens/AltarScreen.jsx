// ═══════════════════════════════════════════════════════════════════════
// ALTAR MODE — the iPad as ritual furniture
// ═══════════════════════════════════════════════════════════════════════
// A full-bleed, glanceable face for the device that lives in the practice
// space: the planetary hour held large with its countdown, the Moon's disc
// and phase, today's observances and watched windows, and a single tap into
// the Ritual Runtime. Dim, near-static, burn-in-considerate. An optional
// bell marks each hour boundary.

import { useState, useEffect, useRef, useMemo } from "react";
import { F } from "../ui/theme.js";
import { P } from "../data/planets.js";
import { MoonDisc } from "./LunarCycleScreen.jsx";
import { useClock } from "../ui/clock.jsx";
import { loadSpirits, upcomingObservances } from "../lib/spirits.js";
import { loadWatchlist } from "../lib/watchlist.js";
import { bell, soundAvailable } from "../lib/sound.js";

const fmtHM = ms => { const m = Math.floor(ms / 60000), h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${Math.floor((ms % 60000) / 1000)}s`; };

export default function AltarScreen({ now, hour, eph, setTab }) {
  // Wall-clock leaf: the face shows minutes/seconds, so it ticks at 1 Hz
  // while the astro props (hour/eph) hold their 30 s identities.
  const clock = useClock();
  const drift = clock - now; // ms since the astro bucket was computed
  const [bellOn, setBellOn] = useState(false);
  const lastHourRef = useRef(hour?.planet);

  // Ring the bell on the hour boundary when enabled.
  useEffect(() => {
    if (hour?.planet && lastHourRef.current && hour.planet !== lastHourRef.current && bellOn) bell(432);
    lastHourRef.current = hour?.planet;
  }, [hour?.planet, bellOn]);

  const p = P[hour?.planet] || {};
  const moon = eph?.pos?.moon;
  const elong = moon && eph?.pos?.sun ? ((moon.lon - eph.pos.sun.lon) % 360 + 360) % 360 : 0;
  // Anchor at local midnight so a feast still shows all day, not only before 9 AM.
  // Storage reads memoized to the 30 s astro bucket — never in the 1 Hz path.
  const { observances, watches } = useMemo(() => {
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    return {
      observances: upcomingObservances(loadSpirits(), dayStart, 1),
      watches: loadWatchlist().filter(w => w.active && w.nextWindow && new Date(w.nextWindow.date) > now && new Date(w.nextWindow.date) - now < 48 * 3600000),
    };
  }, [now]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 18px", position: "relative", background: `radial-gradient(ellipse at 50% 38%, ${p.col || "#D4AF6A"}0A, transparent 65%)` }}>
      {/* Clock */}
      <div style={{ fontFamily: F, fontSize: 13, color: "rgba(200,175,100,0.45)", letterSpacing: 3 }}>{clock.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      <div style={{ fontFamily: F, fontSize: 30, color: "rgba(212,192,152,0.85)", letterSpacing: 2, marginTop: 2 }}>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>

      {/* The hour */}
      <div style={{ fontSize: 110, color: p.col || "#D4AF6A", lineHeight: 1.15, marginTop: 12, textShadow: `0 0 42px ${p.glow || "rgba(212,175,106,0.3)"}` }}>{p.sym}</div>
      <div style={{ fontFamily: F, fontSize: 22, color: p.col || "#D4AF6A", letterSpacing: 4, textTransform: "uppercase" }}>Hour of {p.name}</div>
      <div style={{ fontFamily: F, fontSize: 11.5, color: "rgba(200,175,100,0.5)", marginTop: 5 }}>
        {hour?.msRemaining != null ? `${fmtHM(Math.max(0, hour.msRemaining - drift))} remaining` : ""} · then {P[hour?.nextPlanet]?.name || ""} · Day of {P[hour?.dayRuler]?.name || ""}
      </div>

      {/* Moon */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
        <MoonDisc elong={elong} R={30} />
        <div>
          <div style={{ fontFamily: F, fontSize: 12, color: "#C8DDED" }}>{eph?.moonPhase} · {moon?.zodiac?.degree}° {moon?.zodiac?.name}</div>
          {eph?.voc?.isVoC
            ? <div style={{ fontFamily: F, fontSize: 10.5, color: "#D28060", marginTop: 2 }}>⚠ Void of course — hold new workings</div>
            : <div style={{ fontFamily: F, fontSize: 10.5, color: "rgba(200,175,100,0.4)", marginTop: 2 }}>The channel is open</div>}
        </div>
      </div>

      {/* Today's calls */}
      {(observances.length > 0 || watches.length > 0) && (
        <div style={{ marginTop: 18, textAlign: "center" }}>
          {observances.slice(0, 2).map((o, i) => (
            <div key={i} style={{ fontFamily: F, fontSize: 11, color: "#D4AF6A", padding: "2px 0" }}>🕯 {o.label} today — tend the relationship</div>
          ))}
          {watches.slice(0, 2).map(w => (
            <div key={w.id} style={{ fontFamily: F, fontSize: 11, color: "#7AB07A", padding: "2px 0" }}>👁 {w.label}: window {new Date(w.nextWindow.date).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} · score {w.nextWindow.score}</div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ position: "absolute", bottom: 26, display: "flex", gap: 10 }}>
        <button onClick={() => setTab && setTab("rite")} style={{ padding: "11px 24px", borderRadius: 12, background: (p.col || "#D4AF6A") + "16", border: `1px solid ${(p.col || "#D4AF6A")}40`, fontFamily: F, fontSize: 10, color: p.col || "#D4AF6A", letterSpacing: 3, textTransform: "uppercase", cursor: "pointer" }}>✦ Begin a Rite</button>
        {soundAvailable() && (
          <button onClick={() => { setBellOn(b => !b); if (!bellOn) bell(432); }} style={{ padding: "11px 18px", borderRadius: 12, background: bellOn ? "rgba(212,175,106,0.14)" : "rgba(0,0,0,0.3)", border: `1px solid ${bellOn ? "rgba(212,175,106,0.4)" : "rgba(200,175,100,0.15)"}`, fontFamily: F, fontSize: 10, color: bellOn ? "#D4AF6A" : "rgba(200,175,100,0.5)", letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}>{bellOn ? "🔔 Hour bell on" : "🔕 Hour bell"}</button>
        )}
      </div>
    </div>
  );
}
