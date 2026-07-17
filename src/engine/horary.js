// ═══════════════════════════════════════════════════════════════════════
// HORARY — the chart of the question
// ═══════════════════════════════════════════════════════════════════════
// Casts the chart for the moment a question is asked: Regiomontanus houses
// (Lilly's system), radicality checks, significator identification, and
// the applying aspects between the significators with translation of light
// and prohibition detection. Pure computation — the screen renders it and
// the AI may draft a judgment from it.

import { dateToJD, planetLon, dailyMotion, checkVoC, lonToZodiac, getDignity } from "../App.jsx";
import { swHouses } from "./sweph.js";

const norm = a => ((a % 360) + 360) % 360;
export const SIGN_RULERS = ["mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];
const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
const ASPECTS = [
  { name: "Conjunction", angle: 0 }, { name: "Sextile", angle: 60 }, { name: "Square", angle: 90 },
  { name: "Trine", angle: 120 }, { name: "Opposition", angle: 180 },
];
const ORB = 6; // moiety-style working orb for significator aspects

// Question categories → quesited house (Lilly, Christian Astrology I.50+)
export const QUESTION_HOUSES = [
  { id: "self",        house: 1,  label: "Myself, my body, my direction" },
  { id: "money",       house: 2,  label: "Money, possessions, lost objects" },
  { id: "siblings",    house: 3,  label: "Siblings, neighbors, short journeys, messages" },
  { id: "home",        house: 4,  label: "Home, land, property, the father, endings" },
  { id: "children",    house: 5,  label: "Children, pregnancy, pleasure, speculation" },
  { id: "health",      house: 6,  label: "Illness, servants, small animals, work" },
  { id: "partner",     house: 7,  label: "Marriage, partners, open enemies, the other" },
  { id: "death",       house: 8,  label: "Death, the partner's money, debts, the occult" },
  { id: "journeys",    house: 9,  label: "Long journeys, law, religion, dreams, learning" },
  { id: "career",      house: 10, label: "Career, honor, authority, the mother" },
  { id: "friends",     house: 11, label: "Friends, hopes, patrons" },
  { id: "hidden",      house: 12, label: "Hidden enemies, confinement, self-undoing" },
];

function houseOf(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const span = norm(b - a), off = norm(lon - a);
    if (off < span) return i + 1;
  }
  return 1;
}

export function castHorary({ date, lat, lon, quesitedHouse }) {
  const jd = dateToJD(date);
  const houses = swHouses(jd, lat, lon, "R");
  if (!houses) return { error: "The Swiss Ephemeris is still loading — horary needs exact houses. Try again in a moment." };
  const { asc, mc, cusps } = houses;

  const pos = {};
  PLANETS.forEach(pk => {
    const l = planetLon(pk, jd), dm = dailyMotion(pk, jd);
    pos[pk] = { lon: l, speed: dm, retro: dm < 0 && pk !== "sun" && pk !== "moon", zodiac: lonToZodiac(l), dignity: getDignity(pk, l), house: houseOf(l, cusps) };
  });

  // ── Radicality (considerations before judgment) ──
  const ascInSign = asc % 30;
  const voc = checkVoC(jd);
  const moonL = pos.moon.lon;
  const considerations = [
    { id: "early", ok: ascInSign >= 3,  label: "Ascendant not too early", note: ascInSign < 3 ? `ASC at ${ascInSign.toFixed(1)}° — too early to judge; the matter is not yet ripe` : `ASC at ${ascInSign.toFixed(1)}°` },
    { id: "late",  ok: ascInSign <= 27, label: "Ascendant not too late",  note: ascInSign > 27 ? `ASC at ${ascInSign.toFixed(1)}° — too late; the matter is already decided` : `ASC at ${ascInSign.toFixed(1)}°` },
    { id: "sat7",  ok: pos.saturn.house !== 7, label: "Saturn not in the 7th", note: pos.saturn.house === 7 ? "Saturn in the 7th — the astrologer may err in judgment" : `Saturn in house ${pos.saturn.house}` },
    { id: "voc",   ok: !voc.isVoC, label: "Moon not void of course", note: voc.isVoC ? "Void Moon — nothing will come of the matter" : "Moon is applying" },
    { id: "via",   ok: !(moonL >= 195 && moonL <= 225), label: "Moon not in Via Combusta", note: (moonL >= 195 && moonL <= 225) ? "Moon in the Burnt Path — judgment unreliable" : "Moon clear of the Burnt Path" },
  ];
  const radical = considerations.every(c => c.ok);

  // ── Significators ──
  const ascSign = Math.floor(asc / 30);
  const querentRuler = SIGN_RULERS[ascSign];
  const quesitedCusp = cusps[quesitedHouse - 1];
  const quesitedSign = Math.floor(quesitedCusp / 30);
  const quesitedRuler = SIGN_RULERS[quesitedSign];
  const sameRuler = querentRuler === quesitedRuler;

  // ── Aspects between significators (and Moon as co-significator) ──
  const pairs = [];
  const sigPairs = sameRuler
    ? [["moon", quesitedRuler]]
    : [[querentRuler, quesitedRuler], ["moon", quesitedRuler]];
  sigPairs.forEach(([a, b]) => {
    if (a === b) return;
    const A = pos[a], B = pos[b];
    let diff = Math.abs(norm(A.lon - B.lon));
    if (diff > 180) diff = 360 - diff;
    ASPECTS.forEach(asp => {
      const orb = Math.abs(diff - asp.angle);
      if (orb <= ORB) {
        const applying = orb <= 0.05 || willPerfect(A, B, asp.angle);
        pairs.push({ p1: a, p2: b, aspect: asp.name, orb: +orb.toFixed(2), applying,
          daysToPerfect: applying ? +(orb / Math.max(0.01, Math.abs(A.speed - B.speed))).toFixed(1) : null });
      }
    });
  });

  // ── Translation of light: a swifter planet separating from one
  //    significator and applying to the other ──
  let translation = null;
  if (!sameRuler) {
    PLANETS.forEach(pk => {
      if (pk === querentRuler || pk === quesitedRuler || translation) return;
      const T = pos[pk], A = pos[querentRuler], B = pos[quesitedRuler];
      if (Math.abs(T.speed) < Math.abs(A.speed) || Math.abs(T.speed) < Math.abs(B.speed)) return;
      const sepFromA = aspectState(T, A), appToB = aspectState(T, B);
      const sepFromB = aspectState(T, B), appToA = aspectState(T, A);
      if (sepFromA?.separating && appToB?.applying) translation = { planet: pk, from: querentRuler, to: quesitedRuler };
      else if (sepFromB?.separating && appToA?.applying) translation = { planet: pk, from: quesitedRuler, to: querentRuler };
    });
  }

  // ── Collection of light: a weightier (slower) planet to which BOTH
  //    significators apply — it gathers and joins their matter ──
  let collection = null;
  if (!sameRuler) {
    PLANETS.forEach(pk => {
      if (pk === querentRuler || pk === quesitedRuler || collection) return;
      const C = pos[pk], A = pos[querentRuler], B = pos[quesitedRuler];
      if (Math.abs(C.speed) > Math.abs(A.speed) || Math.abs(C.speed) > Math.abs(B.speed)) return;
      const a = aspectState(A, C), b2 = aspectState(B, C);
      if (a?.applying && b2?.applying) collection = { planet: pk, aspects: [a.aspect, b2.aspect] };
    });
  }

  return {
    jd, date: date.toISOString(), asc, mc, cusps, pos, considerations, radical, voc,
    querent: { ruler: querentRuler, coSignificator: "moon", ascSign },
    quesited: { house: quesitedHouse, ruler: quesitedRuler, sign: quesitedSign, sameRuler },
    aspects: pairs, translation, collection,
  };
}

// Nearest classical aspect between two bodies with applying/separating state.
function aspectState(A, B) {
  let diff = Math.abs(norm(A.lon - B.lon));
  if (diff > 180) diff = 360 - diff;
  let best = null;
  ASPECTS.forEach(asp => {
    const orb = Math.abs(diff - asp.angle);
    if (orb <= ORB && (!best || orb < best.orb)) best = { aspect: asp.name, angle: asp.angle, orb };
  });
  if (!best) return null;
  const applying = willPerfect(A, B, best.angle);
  return { ...best, applying, separating: !applying };
}

// Does the aspect tighten over the next step of motion?
function willPerfect(A, B, angle) {
  const step = 0.5; // half a day
  const now = sepFrom(A.lon, B.lon, angle);
  const next = sepFrom(A.lon + A.speed * step, B.lon + B.speed * step, angle);
  return next < now;
}
function sepFrom(l1, l2, angle) {
  let diff = Math.abs(norm(l1 - l2));
  if (diff > 180) diff = 360 - diff;
  return Math.abs(diff - angle);
}

// Serialize a cast chart for the AI judgment prompt.
export function horaryToText(chart, question) {
  const f = l => `${Math.floor(l % 30)}°${String(Math.round(((l % 30) % 1) * 60)).padStart(2, "0")}′ ${["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][Math.floor(norm(l) / 30)]}`;
  const lines = [
    `QUESTION: ${question}`,
    `Cast: ${chart.date} — Regiomontanus houses`,
    `ASC ${f(chart.asc)} · MC ${f(chart.mc)}`,
    `Radicality: ${chart.radical ? "radical" : "NOT radical"} — ${chart.considerations.filter(c => !c.ok).map(c => c.note).join("; ") || "all considerations pass"}`,
    `Querent significator: ${chart.querent.ruler} (ruler of ASC), co-significator Moon`,
    `Quesited: house ${chart.quesited.house}, significator ${chart.quesited.ruler}${chart.quesited.sameRuler ? " (same ruler as querent — judge by Moon)" : ""}`,
    `Planets: ${Object.entries(chart.pos).map(([pk, p]) => `${pk} ${f(p.lon)} (${p.dignity}${p.retro ? " ℞" : ""}, house ${p.house}, ${p.speed.toFixed(2)}°/d)`).join("; ")}`,
    `Significator aspects: ${chart.aspects.length ? chart.aspects.map(a => `${a.p1} ${a.aspect} ${a.p2} (orb ${a.orb}°, ${a.applying ? `applying — perfects in ~${a.daysToPerfect}d` : "separating"})`).join("; ") : "none within orb"}`,
    chart.translation ? `Translation of light: ${chart.translation.planet} carries light from ${chart.translation.from} to ${chart.translation.to}` : `No translation of light`,
    chart.collection ? `Collection of light: ${chart.collection.planet} (heavier) receives the application of both significators (${chart.collection.aspects.join(", ")}) — a third party joins the matter` : `No collection of light`,
    chart.voc.isVoC ? "Moon is VOID OF COURSE" : "",
  ];
  return lines.filter(Boolean).join("\n");
}
