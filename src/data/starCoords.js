// ═══════════════════════════════════════════════════════════════════════
// BEHENIAN STAR COORDINATES — J2000.0 ecliptic, triple-witnessed
// ═══════════════════════════════════════════════════════════════════════
// Verified Aug 2026 against three independent lineages, all fetched live:
// SIMBAD TAP ICRS (primary), Hipparcos-2 (VizieR I/311, propagated
// J1991.25→J2000 by catalog proper motions; agrees ≤0.02″), and the
// pre-Hipparcos Bright Star Catalogue (VizieR V/50; agrees ≤1″, and its
// Bayer identifications confirm every star: Algol=β Per, Alcyone=η Tau,
// Aldebaran=α Tau, Capella=α Aur, Sirius=α CMa, Procyon=α CMi,
// Regulus=α Leo, Alkaid=η UMa, Algorab=δ Crv, Spica=α Vir, Arcturus=α Boo,
// Alphecca=α CrB, Antares=α Sco, Vega=α Lyr, Deneb Algedi=δ Cap).
// Ecliptic conversion from ICRS RA/Dec with ε = 23.4392911°.
// The latitudes are what fixedStars.js lacks — they make rising and
// culmination times computable (heliacal.js eclToEqu → starRiseJD /
// starCulminationJD), completing Agrippa I.47's "when any Star ascends
// fortunately" alongside the Thebit Moon-conjunction rule.

export const BEHENIAN_COORDS = [
  { name: "Algol",        lonJ2000: 56.17,  latJ2000: 22.43 },
  { name: "Alcyone",      lonJ2000: 59.99,  latJ2000: 4.05 },
  { name: "Aldebaran",    lonJ2000: 69.79,  latJ2000: -5.47 },
  { name: "Capella",      lonJ2000: 81.86,  latJ2000: 22.86 },
  { name: "Sirius",       lonJ2000: 104.08, latJ2000: -39.61 },
  { name: "Procyon",      lonJ2000: 115.79, latJ2000: -16.02 },
  { name: "Regulus",      lonJ2000: 149.83, latJ2000: 0.46 },
  { name: "Alkaid",       lonJ2000: 176.93, latJ2000: 54.39 },
  { name: "Algorab",      lonJ2000: 193.45, latJ2000: -12.20 },
  { name: "Spica",        lonJ2000: 203.84, latJ2000: -2.05 },
  { name: "Arcturus",     lonJ2000: 204.23, latJ2000: 30.74 },
  { name: "Alphecca",     lonJ2000: 222.30, latJ2000: 44.32 },
  { name: "Antares",      lonJ2000: 249.76, latJ2000: -4.57 },
  { name: "Vega",         lonJ2000: 285.32, latJ2000: 61.73 },
  { name: "Deneb Algedi", lonJ2000: 323.54, latJ2000: -2.60 },
];

export const coordsForStar = name => BEHENIAN_COORDS.find(c => c.name === name) || null;
