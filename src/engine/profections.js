// ═══════════════════════════════════════════════════════════════════════
// ANNUAL PROFECTIONS — the Lord of the Year
// ═══════════════════════════════════════════════════════════════════════
// The simplest and most used Hellenistic timing technique: the Ascendant
// advances one whole sign per year of life. The profected sign's domicile
// ruler is the Lord of the Year — the planet whose condition and transits
// colour the entire year. Age counts completed years (profection changes on
// the birthday).

const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
// Traditional domicile rulers only (no moderns) — the technique is Hellenistic.
export const DOMICILE_RULERS = ["mars","venus","mercury","moon","sun","mercury","venus","mars","jupiter","saturn","saturn","jupiter"];

export const HOUSE_TOPICS = [
  "self, body, life direction", "money, possessions, livelihood", "siblings, neighbours, short journeys, ritual practice",
  "home, parents, land, the ancestors", "children, creation, pleasure", "illness, service, daily work",
  "marriage, partners, the other", "death, inheritance, the hidden", "travel, religion, divination, the art",
  "career, reputation, action", "friends, allies, hopes", "enemies, loss, confinement, the unseen",
];

// Completed years of age at `date` (the profection year turns on the birthday).
export function ageAt(birthDate, date) {
  const b = new Date(birthDate), d = new Date(date);
  let age = d.getFullYear() - b.getFullYear();
  const beforeBirthday = d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

// ascSignIndex: 0-11 (sign of the natal Ascendant).
export function profection(birthDate, date, ascSignIndex) {
  if (ascSignIndex == null || birthDate == null) return null;
  const age = ageAt(birthDate, date);
  const offset = age % 12;
  const signIndex = (ascSignIndex + offset) % 12;
  const b = new Date(birthDate);
  const yearStart = new Date(b); yearStart.setFullYear(b.getFullYear() + age);
  const yearEnd = new Date(b); yearEnd.setFullYear(b.getFullYear() + age + 1);
  return {
    age,
    house: offset + 1,                       // profected house (1 = year of the Ascendant)
    signIndex,
    sign: SIGN_NAMES[signIndex],
    lord: DOMICILE_RULERS[signIndex],        // Lord of the Year
    topic: HOUSE_TOPICS[offset],
    yearStart, yearEnd,
  };
}
