// ═══════════════════════════════════════════════════════════════════════
// ALMANAC — the composited liturgical calendar
// ═══════════════════════════════════════════════════════════════════════
// A month model built purely from the ephemeris: for every day, the
// planetary ruler, the Moon's phase / sign / mansion, the Sun's decan, the
// void-of-course condition, and the notable events (sign ingresses,
// stations, lunations). The screen overlays the ingested timing feed and
// the practitioner's committed elections. Everything here is engine-only
// and offline — no storage, no network — so it runs on a wifi-less iPad and
// is unit-testable in Node.

import { dateToJD, planetLon, dailyMotion, checkVoC, getPlanetaryHour, getPlanetaryHourUnequal, DECANS } from "../App.jsx";
import { getMansion } from "../data/mansions.js";

const norm = a => ((a % 360) + 360) % 360;
export const DAY_RULERS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
const PHASES = ["New", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
const PHASE_GLYPH = ["●", "◐", "◑", "◒", "○", "◓", "◔", "◕"];
const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_SYM = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const STATION_PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn"];

function iso(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }

function moonAt(jd) {
  const sun = planetLon("sun", jd), moon = planetLon("moon", jd);
  const elong = norm(moon - sun);
  return {
    phaseName: PHASES[Math.floor(elong / 45) % 8],
    phaseGlyph: PHASE_GLYPH[Math.floor(elong / 45) % 8],
    phaseDeg: +elong.toFixed(1),
    signIndex: Math.floor(norm(moon) / 30),
    sign: SIGN_NAMES[Math.floor(norm(moon) / 30)],
    signSym: SIGN_SYM[Math.floor(norm(moon) / 30)],
    lon: moon,
  };
}

// Events that fall within [jd0, jd1): sun/planet sign ingresses, stations,
// and the four lunation points. Compared start-of-day vs start-of-next-day.
function eventsForDay(jd0, jd1) {
  const ev = [];
  // Sun ingress
  const s0 = Math.floor(norm(planetLon("sun", jd0)) / 30), s1 = Math.floor(norm(planetLon("sun", jd1)) / 30);
  if (s0 !== s1) ev.push({ kind: "ingress", body: "sun", text: `Sun enters ${SIGN_NAMES[s1]}`, sign: s1 });
  // Moon sign ingress (frequent; useful in detail)
  const m0 = Math.floor(norm(planetLon("moon", jd0)) / 30), m1 = Math.floor(norm(planetLon("moon", jd1)) / 30);
  if (m0 !== m1) ev.push({ kind: "moon-ingress", body: "moon", text: `Moon enters ${SIGN_NAMES[m1]}`, sign: m1 });
  // Stations
  STATION_PLANETS.forEach(pk => {
    const d0 = dailyMotion(pk, jd0), d1 = dailyMotion(pk, jd1);
    if (d0 > 0 && d1 < 0) ev.push({ kind: "station", body: pk, text: `${cap(pk)} stations retrograde`, retro: true });
    else if (d0 < 0 && d1 > 0) ev.push({ kind: "station", body: pk, text: `${cap(pk)} stations direct`, retro: false });
  });
  // Lunations — elongation crossing 0/90/180/270
  const e0 = norm(planetLon("moon", jd0) - planetLon("sun", jd0));
  const e1 = norm(planetLon("moon", jd1) - planetLon("sun", jd1));
  [[0, "New Moon"], [90, "First Quarter"], [180, "Full Moon"], [270, "Last Quarter"]].forEach(([deg, name]) => {
    // crossing detection with wrap
    const crossed = deg === 0
      ? (e1 < e0) // wrapped past 360→0
      : (e0 < deg && e1 >= deg);
    if (crossed) ev.push({ kind: "lunation", body: "moon", text: `${name} in ${SIGN_NAMES[Math.floor(norm(planetLon("moon", (jd0 + jd1) / 2)) / 30)]}` , point: deg });
  });
  return ev;
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

export function buildMonthModel({ year, month, location }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const noon = new Date(year, month, d, 12, 0, 0);
    const jdNoon = dateToJD(noon);
    const jd0 = dateToJD(new Date(year, month, d, 0, 0, 0));
    const jd1 = dateToJD(new Date(year, month, d + 1, 0, 0, 0));
    const moon = moonAt(jdNoon);
    const mansion = getMansion(moon.lon);
    const sunLon = norm(planetLon("sun", jdNoon));
    const decanIdx = Math.min(35, Math.floor(sunLon / 10));
    const voc = checkVoC(jdNoon);
    const dow = new Date(year, month, d).getDay();
    days.push({
      day: d,
      dateStr: iso(year, month, d),
      dow,
      dayRuler: DAY_RULERS[dow],
      moon,
      mansion: { n: mansion.index, name: mansion.arabic, nature: mansion.nature },
      sunDecan: { idx: decanIdx, ...(DECANS[decanIdx] || {}) },
      voc: !!voc.isVoC,
      events: eventsForDay(jd0, jd1),
    });
  }
  return { year, month, firstDow, days };
}

// The 24 unequal planetary hours of a day, for the day-detail table.
export function dayHours(date, location) {
  const hours = [];
  let cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 30);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0);
  let guard = 0;
  while (cursor < dayEnd && guard < 30) {
    guard++;
    const h = location ? getPlanetaryHourUnequal(cursor, location.lat, location.lon) : getPlanetaryHour(cursor);
    const start = new Date(cursor);
    const rem = Math.max(60000, h.msRemaining ?? 3600000);
    const end = new Date(cursor.getTime() + rem);
    hours.push({ planet: h.planet, start, end: end < dayEnd ? end : dayEnd, isDay: h.isDayHour, hourNum: h.hourNum });
    cursor = new Date(cursor.getTime() + rem + 1000);
  }
  return hours;
}

export const EVENT_GLYPH = {
  ingress: "≡", "moon-ingress": "☽", station: "℞", lunation: "○",
};
