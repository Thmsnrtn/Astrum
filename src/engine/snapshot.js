// ═══════════════════════════════════════════════════════════════════════
// CONDITION SNAPSHOT — the sky as it stood at the moment of casting
// ═══════════════════════════════════════════════════════════════════════
// captureConditions() serializes everything a practitioner would want on
// record for a working: planetary day/hour, positions with dignities, moon
// phase/mansion/VoC, angles, nearby fixed stars, tightest aspects, transits
// to natal, and the election score. It takes the objects the app has already
// computed (eph from useEphemeris, hour from getPlanetaryHour[Unequal]) so it
// stays engine-agnostic — snapshots survive engine upgrades untouched.

import { getMansion } from "../data/mansions.js";

const norm = a => ((a % 360) + 360) % 360;
const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const ASPECTS = [
  { name: "Conjunction", angle: 0,   orb: 3 },
  { name: "Opposition",  angle: 180, orb: 3 },
  { name: "Trine",       angle: 120, orb: 3 },
  { name: "Square",      angle: 90,  orb: 3 },
  { name: "Sextile",     angle: 60,  orb: 2.5 },
];

function fmtLon(lon) {
  const l = norm(lon);
  return `${Math.floor(l % 30)}° ${SIGN_NAMES[Math.floor(l / 30)]}`;
}

// Exact transits from current positions to natal positions, within tight orbs.
export function transitsToNatal(pos, natalPos) {
  if (!pos || !natalPos) return [];
  const hits = [];
  Object.entries(pos).forEach(([tp, t]) => {
    if (t?.lon == null) return;
    Object.entries(natalPos).forEach(([np, n]) => {
      if (n?.lon == null || typeof n.lon !== "number") return;
      let diff = Math.abs(norm(t.lon - n.lon));
      if (diff > 180) diff = 360 - diff;
      ASPECTS.forEach(a => {
        const orb = Math.abs(diff - a.angle);
        if (orb <= a.orb) hits.push({ transiting: tp, natal: np, aspect: a.name, orb: +orb.toFixed(2) });
      });
    });
  });
  return hits.sort((a, b) => a.orb - b.orb).slice(0, 8);
}

export function captureConditions({ now, eph, hour, location, natalPos, election, approximate = false }) {
  const planets = {};
  Object.entries(eph?.pos || {}).forEach(([pk, p]) => {
    planets[pk] = {
      lon: +p.lon.toFixed(2),
      pos: fmtLon(p.lon),
      dignity: p.dignity,
      retro: !!p.isRetro,
      score: p.score,
      combust: p.combust ? p.combust.type : null,
    };
  });
  const moonLon = eph?.pos?.moon?.lon;
  const mansion = moonLon != null ? getMansion(moonLon) : null;
  return {
    at: now.toISOString(),
    jd: eph?.jd,
    location: location ? { lat: location.lat, lon: location.lon } : null,
    dayRuler: hour?.dayRuler ?? null,
    hourPlanet: hour?.planet ?? null,
    hourNum: hour?.hourNum ?? null,
    isDayHour: hour?.isDayHour ?? null,
    planets,
    moonPhase: eph?.moonPhase ?? null,
    moonPhaseDeg: eph?.moonPhaseDeg != null ? +eph.moonPhaseDeg.toFixed(1) : null,
    voc: eph?.voc ? { isVoC: !!eph.voc.isVoC, hoursToIngress: eph.voc.hoursToIngress != null ? +(+eph.voc.hoursToIngress).toFixed(1) : null } : null,
    mansion: mansion ? { n: mansion.index, name: mansion.arabic, nature: mansion.nature } : null,
    asc: eph?.asc != null ? fmtLon(eph.asc) : null,
    mc: eph?.mc != null ? fmtLon(eph.mc) : null,
    nearStars: (eph?.nearStars || []).map(s => s.name).slice(0, 5),
    aspects: (eph?.aspects || []).slice(0, 5).map(a => ({ p1: a.p1, p2: a.p2, type: a.aspect?.n || a.aspect?.name, orb: +(+a.orb).toFixed(1) })),
    transits: transitsToNatal(eph?.pos, natalPos),
    election: election ? { score: election.score, grade: election.grade } : null,
    approximate: approximate || undefined,
  };
}
