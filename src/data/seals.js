// ═══════════════════════════════════════════════════════════════════════
// PLANETARY SPIRITS & INTELLIGENCES — Agrippa, Three Books II.22
// ═══════════════════════════════════════════════════════════════════════
// The sigil of each spirit and intelligence is drawn by tracing the
// gematria values of its Hebrew name across the planet's kamea (magic
// square), reducing any value beyond the square's range by subtracting
// the square's cell count — the same method the SigilScreen kamea engine
// already uses for intent words. Values below are the standard letter
// numerations; the Moon's intelligence-of-intelligences bears a name too
// long for practical tracing, so its customary short form is encoded.
//
// The intelligence is the benevolent, guiding aspect of the sphere; the
// spirit is the raw, blind force — traditionally the talisman carries the
// intelligence to direct the spirit.

export const SEALS = {
  saturn: {
    intelligence: { name: "Agiel",      hebrew: "אגיאל",  seq: [1, 3, 1, 1, 3] },          // 1,3,10→1,1,30→3 on 3×3
    spirit:       { name: "Zazel",      hebrew: "זאזל",   seq: [7, 1, 7, 3] },              // 7,1,7,30→3
  },
  jupiter: {
    intelligence: { name: "Iophiel",    hebrew: "יהפיאל", seq: [10, 5, 16, 10, 1, 14] },    // 10,5,80→16,10,1,30→14 on 4×4
    spirit:       { name: "Hismael",    hebrew: "הסמאל",  seq: [5, 12, 8, 1, 14] },         // 5,60→12,40→8,1,30→14
  },
  mars: {
    intelligence: { name: "Graphiel",   hebrew: "גראפיאל", seq: [3, 25, 1, 5, 10, 1, 5] },  // 3,200→25,1,80→5,10,1,30→5 on 5×5
    spirit:       { name: "Barzabel",   hebrew: "ברצבאל", seq: [2, 25, 15, 2, 1, 5] },      // 2,200→25,90→15,2,1,30→5
  },
  sun: {
    intelligence: { name: "Nakhiel",    hebrew: "נכיאל",  seq: [14, 20, 10, 1, 30] },       // 50→14,20,10,1,30 on 6×6
    spirit:       { name: "Sorath",     hebrew: "סורת",   seq: [24, 6, 20, 4] },            // 60→24,6,200→20,400→4
  },
  venus: {
    intelligence: { name: "Hagiel",     hebrew: "הגיאל",  seq: [5, 3, 10, 1, 30] },         // all within 49 on 7×7
    spirit:       { name: "Kedemel",    hebrew: "קדמאל",  seq: [2, 4, 40, 1, 30] },         // 100→2,4,40,1,30
  },
  mercury: {
    intelligence: { name: "Tiriel",     hebrew: "טיריאל", seq: [9, 10, 8, 10, 1, 30] },     // 9,10,200→8,10,1,30 on 8×8
    spirit:       { name: "Taphthartharath", hebrew: "תפתרתרת", seq: [16, 16, 16, 8, 16, 8, 16] }, // 400→16,80→16,…,200→8
  },
  moon: {
    intelligence: { name: "Malkah (be-Tarshisim)", hebrew: "מלכה", seq: [40, 30, 20, 5], abbreviated: true }, // customary short form on 9×9
    spirit:       { name: "Hasmodai",   hebrew: "חשמודאי", seq: [8, 57, 40, 6, 4, 1, 10] }, // 8,300→57,40,6,4,1,10
  },
};

export function getSeal(planet, kind) {
  return SEALS[planet]?.[kind] || null;
}
