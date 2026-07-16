// ═══════════════════════════════════════════════════════════════════════
// GEOMANCY — the sixteen figures (verified data)
// ═══════════════════════════════════════════════════════════════════════
// Patterns validated three independent ways (July 2026): Erwin Hessle's
// point-count distribution (1×4, 4×5, 6×6, 4×7, 1×8), the seven inversion
// pairs + Via/Populus complement, and Greer's four pure-element anchors.
// Wikipedia's auto-summary mangled several rows and was NOT trusted.
//   pattern = [Fire, Air, Water, Earth], top→bottom; 1 = single dot
//   (active/odd), 2 = double dots (passive/even).
// Attributions: planet + zodiac after Agrippa (Fourth Book, Of Geomancy)
// and the Golden Dawn (Regardie) — the modern-practitioner standard, which
// J.M. Greer's Art and Practice of Geomancy (2009) also uses. The medieval
// Gerard-of-Cremona zodiac and Greer's geomantic elemental ruler are stored
// as alternates. Meanings after Greer / Agrippa.
// Sources: erwinhessle.com/writings/geofig.php · digitalambler.com (shield,
// mathematics, elemental rulers) · princeton.edu/~ezb/geomancy · Regardie,
// A Practical Guide to Geomantic Divination · Agrippa, EEBO A26563.

export const FIGURES = [
  { name: "Via", english: "The Way", pattern: [1,1,1,1], planet: "moon", zodiac: "Cancer", zodiacMedieval: "Leo", element: "Water", elementRuler: "Water", tone: "mixed",
    meaning: "Change, movement, the road. Ill for matters wanting stability; well for journeys and anything you want to shift." },
  { name: "Populus", english: "The People", pattern: [2,2,2,2], planet: "moon", zodiac: "Cancer", zodiacMedieval: "Capricorn", element: "Water", elementRuler: "Water", tone: "mixed",
    meaning: "The multitude, the crowd. Neutral in itself — it takes on the character of the figures around it." },
  { name: "Caput Draconis", english: "Head of the Dragon", pattern: [2,1,1,1], planet: "node", zodiac: "North Node", zodiacMedieval: "Virgo", element: "Earth", elementRuler: "Earth", tone: "good",
    meaning: "The threshold entered — beginnings, gain, the good start. Favorable for anything commencing." },
  { name: "Cauda Draconis", english: "Tail of the Dragon", pattern: [1,1,1,2], planet: "node", zodiac: "South Node", zodiacMedieval: "Sagittarius", element: "Fire", elementRuler: "Fire", tone: "bad",
    meaning: "The threshold departed — endings, exits, loss. Unfavorable; the old books sometimes halted a reading it opened." },
  { name: "Puer", english: "The Boy", pattern: [1,1,2,1], planet: "mars", zodiac: "Aries", zodiacMedieval: "Gemini", element: "Fire", elementRuler: "Air", tone: "mixed",
    meaning: "Rash energy, the young man with a weapon. Ill for most, well for war and for love." },
  { name: "Puella", english: "The Girl", pattern: [1,2,1,1], planet: "venus", zodiac: "Libra", zodiacMedieval: "—", element: "Air", elementRuler: "Water", tone: "good",
    meaning: "Harmony, beauty, the young woman. Favorable, especially in love and matters of women — though it can be fickle." },
  { name: "Fortuna Major", english: "Greater Fortune", pattern: [2,2,1,1], planet: "sun", zodiac: "Leo", zodiacMedieval: "Aquarius", element: "Fire", elementRuler: "Earth", tone: "good",
    meaning: "Great and stable good fortune, won by one's own power — inner help. Strongly favorable." },
  { name: "Fortuna Minor", english: "Lesser Fortune", pattern: [1,1,2,2], planet: "sun", zodiac: "Leo", zodiacMedieval: "Taurus", element: "Fire", elementRuler: "Fire", tone: "good",
    meaning: "Swift success from outside help — but transient. Good for quick action, ill for anything meant to last." },
  { name: "Acquisitio", english: "Gain", pattern: [2,1,2,1], planet: "jupiter", zodiac: "Sagittarius", zodiacMedieval: "Aries", element: "Fire", elementRuler: "Air", tone: "good",
    meaning: "Gain, profit, the thing obtained. Favorable, especially for money and material increase." },
  { name: "Amissio", english: "Loss", pattern: [1,2,1,2], planet: "venus", zodiac: "Taurus", zodiacMedieval: "Scorpio", element: "Earth", elementRuler: "Fire", tone: "bad",
    meaning: "Loss, the thing let go. Ill for gain; well only when loss is wanted — shedding an illness, escaping a bond." },
  { name: "Conjunctio", english: "Conjunction", pattern: [2,1,1,2], planet: "mercury", zodiac: "Virgo", zodiacMedieval: "—", element: "Earth", elementRuler: "Air", tone: "mixed",
    meaning: "Union, meeting, combination. Neutral — good with the good, ill with the ill; fine for recovering the lost and for joining." },
  { name: "Carcer", english: "Prison", pattern: [1,2,2,1], planet: "saturn", zodiac: "Capricorn", zodiacMedieval: "Pisces", element: "Earth", elementRuler: "Earth", tone: "bad",
    meaning: "Prison, restriction, delay, isolation. Unfavorable; well only for binding, security, and containment." },
  { name: "Albus", english: "White", pattern: [2,2,1,2], planet: "mercury", zodiac: "Gemini", zodiacMedieval: "Cancer", element: "Air", elementRuler: "Water", tone: "good",
    meaning: "Peace, wisdom, purity — a mild, favorable figure. Good for beginnings and for matters of the mind." },
  { name: "Rubeus", english: "Red", pattern: [2,1,2,2], planet: "mars", zodiac: "Scorpio", zodiacMedieval: "Gemini", element: "Water", elementRuler: "Air", tone: "bad",
    meaning: "Passion, violence, vice, deceit. Unfavorable — good in evil things, evil in good; it too could halt a reading it opened." },
  { name: "Laetitia", english: "Joy", pattern: [1,2,2,2], planet: "jupiter", zodiac: "Pisces", zodiacMedieval: "Taurus", element: "Water", elementRuler: "Fire", tone: "good",
    meaning: "Joy, health, the upward movement. Favorable in nearly all things." },
  { name: "Tristitia", english: "Sorrow", pattern: [2,2,2,1], planet: "saturn", zodiac: "Aquarius", zodiacMedieval: "Scorpio", element: "Air", elementRuler: "Earth", tone: "bad",
    meaning: "Sorrow, the sinking, delay, endurance. Unfavorable; well only for the works of earth — patience, building, digging deep." },
];

// The eight even figures — the only ones that can ever fall as the Judge.
// (Consequence of the row-wise XOR: the Judge's total is always even.)
export const EVEN_JUDGES = FIGURES.filter(f => f.pattern.reduce((a, r) => a + r, 0) % 2 === 0).map(f => f.name);

const byPattern = new Map(FIGURES.map(f => [f.pattern.join(""), f]));
export function figureByPattern(pattern) {
  return byPattern.get(pattern.join("")) || null;
}

export const GEOMANCY_HOUSE_METHOD = "Mothers → houses I–IV, Daughters → V–VIII, Nieces → IX–XII (the traditional method, ~1000 years of consensus and Greer's default). Querent = 1st house (the First Mother); the quesited is read from the house of the matter, as in horary.";
