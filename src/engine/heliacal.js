// ═══════════════════════════════════════════════════════════════════════
// HELIACAL PHENOMENA — the appearances of the stars
// ═══════════════════════════════════════════════════════════════════════
// PGM-era star timing: a star's heliacal rising is the first dawn it rises
// visibly again after its season of invisibility — found by the classical
// arcus-visionis method (Ptolemy ~11°, Gautschy's Sirius mean 10°; we use
// 10° for bright stars and flag results approximate — the date shifts ~1
// day per 0.5–1° of AV, and haze/horizon vary). Morning/evening star for
// the inferior planets by signed elongation. Pure module: the caller
// injects sunLonAt(jd), so the math is testable against a real or mock sun.

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const OBLIQUITY = 23.4367;
const norm360 = a => ((a % 360) + 360) % 360;
const wrap180 = a => { let x = norm360(a); return x > 180 ? x - 360 : x; };

export const DEFAULT_ARCUS_VISIONIS = 10; // bright-star convention (Sirius mean)

// Ecliptic (lon, lat in degrees) → equatorial {ra, dec} in degrees.
export function eclToEqu(lonDeg, latDeg) {
  const l = lonDeg * D2R, b = latDeg * D2R, e = OBLIQUITY * D2R;
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  return { ra: norm360(ra * R2D), dec: dec * R2D };
}

// Greenwich mean sidereal time in degrees.
export function gmst(jd) {
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
}

// Altitude (degrees) of an equatorial position from lat/lon at jd.
export function altitudeAt(jd, ra, dec, lat, lon) {
  const H = (gmst(jd) + lon - ra) * D2R;
  const phi = lat * D2R, d = dec * D2R;
  return Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H)) * R2D;
}

// JD of the star's rising nearest after jd0. Null if circumpolar/never-rising.
export function starRiseJD(jd0, ra, dec, lat, lon) {
  const cosH0 = -Math.tan(lat * D2R) * Math.tan(dec * D2R);
  if (cosH0 < -1 || cosH0 > 1) return null;
  const H0 = Math.acos(cosH0) * R2D;              // semi-diurnal arc
  const lstRise = norm360(ra - H0);                // rising hour angle = −H0
  const delta = norm360(lstRise - (gmst(jd0) + lon));
  return jd0 + delta / 360.98564736629;
}


// JD of the star's upper culmination (LST = RA) nearest after jd0.
export function starCulminationJD(jd0, ra, lon) {
  const delta = norm360(ra - (gmst(jd0) + lon));
  return jd0 + delta / 360.98564736629;
}

// The heliacal rising: scan a year of mornings from startJD; at each star-rise
// compute the Sun's altitude; during invisibility the sun is too high
// (alt > −AV) — the first transition to alt ≤ −AV is the heliacal rising.
// Returns { jd, sunAlt } or null (circumpolar / no transition found).
export function heliacalRising(starLon, starLat, startJD, lat, lon, sunLonAt, av = DEFAULT_ARCUS_VISIONIS) {
  const { ra, dec } = eclToEqu(starLon, starLat);
  let prevBright = null;
  for (let d = 0; d < 400; d++) {
    const rise = starRiseJD(startJD + d, ra, dec, lat, lon);
    if (rise == null) return null;
    const sun = eclToEqu(sunLonAt(rise), 0);
    const sunAlt = altitudeAt(rise, sun.ra, sun.dec, lat, lon);
    const bright = sunAlt > -av;
    if (prevBright === true && !bright) return { jd: rise, sunAlt: +sunAlt.toFixed(2) };
    prevBright = bright;
  }
  return null;
}

// The classical heliacal anchors — J2000 ecliptic positions WITH latitude
// (which the FIXED_STARS table omits, and which dominates rising behaviour:
// Sirius sits 40° south of the ecliptic). Each entry is verified by the test
// suite recovering its catalogue RA/Dec through eclToEqu — a wrong latitude
// cannot pass.
export const HELIACAL_STARS = [
  { name: "Sirius",    lon: 104.08, lat: -39.61, note: "Sothis — the old new year; the most watched rising in history" },
  { name: "Regulus",   lon: 149.83, lat: 0.46,   note: "the Royal Star of kingship, almost on the ecliptic" },
  { name: "Spica",     lon: 203.84, lat: -2.06,  note: "the gift-giving star of the harvest" },
  { name: "Aldebaran", lon: 69.79,  lat: -5.47,  note: "the Watcher of the East" },
  { name: "Antares",   lon: 249.75, lat: -4.57,  note: "the Watcher of the West" },
  { name: "Vega",      lon: 285.32, lat: 61.73,  note: "the Vulture — high northern, circumpolar-leaning" },
  { name: "Procyon",   lon: 115.79, lat: -16.02, note: "the forerunner of the Dog" }, // lon was 115.87 — a 79→87 digit slip caught by the Aug 2026 coordinate audit (SIMBAD/HIP2/BSC agree on 115.79)
];

// Morning/evening star for an inferior planet by signed elongation.
// Δ = wrap±180(λ_planet − λ_sun): Δ < 0 → morning star (Phosphorus, rises
// before the Sun), Δ > 0 → evening star (Hesperus, sets after it).
export function starPhase(planetLonDeg, sunLonDeg) {
  const d = wrap180(planetLonDeg - sunLonDeg);
  if (Math.abs(d) < 8) return { phase: "under the beams", elongation: +d.toFixed(1) };
  return { phase: d < 0 ? "morning star" : "evening star", elongation: +d.toFixed(1) };
}
