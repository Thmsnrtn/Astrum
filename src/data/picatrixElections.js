// ═══════════════════════════════════════════════════════════════════════
// PICATRIX ELECTIONS — the classical named elections, triple-witnessed
// ═══════════════════════════════════════════════════════════════════════
// Benefic and protective operations only, verified against three
// independent witnesses (Aug 2026): Greer & Warnock's Complete Picatrix
// (Latin tradition), Pingree's 1986 Latin critical edition (the text
// Attrell & Porreca translate, paragraph refs from Pingree's index), and
// Atallah/Kiesel from the Arabic. Where the witnesses disagree the entry
// carries a flag with the ruling and its reasoning — most notably the
// freeing-of-a-captive Moon, where both source-language texts read WAXING
// against Greer/Warnock's "waning."
//
// Universal preconditions (Picatrix I.4, end): for all benefic work the
// Moon waxing, dignified, free of Saturn and Mars by body and aspect, not
// combust (within 12° of the Sun), not slow (under 12°/day), not in the
// Via Combusta, not in the 9th house or late degrees; if unavoidable,
// place Jupiter or Venus on the Ascendant or Midheaven to mend her.

export const PICATRIX_PRECONDITIONS =
  "Moon waxing, dignified, free of the malefics by body and aspect, not combust, not slow (<12°/day), not in the Via Combusta, not in the 9th or late degrees — or Jupiter/Venus on the Ascendant or MC to mend her (Picatrix I.4).";

export const PICATRIX_ELECTIONS = [
  { id: "love-two-people", name: "For love between two people", category: "love", planet: "venus",
    citation: "Picatrix I.5 (GW pp. 40–41; AP I.5; AT I.5)",
    conditions: "Hour of Jupiter or Venus; the North Node rising; Moon in good aspect to Venus; lord of the 7th applying to the lord of the Ascendant by trine or sextile.",
    summary: "Two images of the couple made under these conditions, joined embracing, and buried in the home of the one who is to love the more." },
  { id: "peace-friendship", name: "For peace and friendship", category: "love", planet: "venus",
    citation: "Picatrix I.5 (GW p. 41; AP I.5; AT I.5)",
    conditions: "Ascendant and 10th fortunate, malefics removed from the Ascendant; lord of the 10th applying to the lord of the Ascendant by trine (perfect love) or sextile (moderate friendship). Paired images: the 11th of the first becomes the Ascendant of the second (friends), or the 7th (spouses), with reception.",
    summary: "A paired-image working buried where the friendship is to take root." },
  { id: "gain-love-marriage", name: "To gain another's love / for one who would marry", category: "love", planet: "venus",
    citation: "Picatrix I.5 (GW p. 42; AP I.5; AT I.5)",
    conditions: "First image: hour of Jupiter, Virgo rising, waxing Moon angular (1st/4th/7th/10th). Second: hour of Venus, Venus aspecting Jupiter, malefics cadent; the second image's Ascendant = the first's 7th cusp; the lords applying by trine or sextile.",
    summary: "Two images bound face to face and buried where love is sought.",
    flag: "The Latin tradition frames this as gaining love; the Arabic as enabling a marriage. Conditions identical." },
  { id: "favor-kings", name: "For the favor of the powerful", category: "honor", planet: "sun",
    citation: "Picatrix I.5 (GW p. 41; AP I.5; AT I.5)",
    conditions: "Ascendant fortunate with a strong benefic (not cadent, retrograde or combust); lord of the Ascendant direct in its exaltation; lord of the 10th aspecting it by trine/sextile with strong reception; Asc-lord in a commanding sign (Aries–Virgo), 10th-lord in an obeying one (Libra–Pisces).",
    summary: "An image in the petitioner's name and likeness, carried on the person; what is asked of the great is granted." },
  { id: "honor-office", name: "To receive honor and office", category: "honor", planet: "sun",
    citation: "Picatrix I.5 (GW p. 42; AP I.5; AT I.5)",
    conditions: "Ascendant, 10th, and Asc-lord fortunate; malefics away; benefics in the 11th aspecting the Ascendant; lords of the 10th and Ascendant in mutual reception with a good aspect.",
    summary: "A single image, kept hidden, carried when entering the lord's presence." },
  { id: "wealth-trade", name: "To increase wealth, business and trade", category: "wealth", planet: "jupiter",
    citation: "Picatrix I.5 (GW p. 42; AP I.5; AT I.5)",
    conditions: "Ascendant, 10th, their lords, and those lords' dispositors fortunate; Moon and her dispositor fortunate; 2nd house and its lord fortunate, its lord in reception with the Asc-lord by trine/sextile; a benefic in the 2nd; Part of Fortune in the 1st or 10th, well aspected by its lord; 11th and its lord fortunate.",
    summary: "The grand house-based wealth election (~15 conditions): the image, kept secret, brings profit in every undertaking." },
  { id: "city-prosperity", name: "To make a place prosper", category: "wealth", planet: "jupiter",
    citation: "Picatrix I.5 (GW p. 42; AP I.5; AT I.5)",
    conditions: "Ascendant and 10th and their lords fortunate and aspected by benefics; lords of the 2nd and 8th fortunate; the Asc-lord's dispositor, the Moon, and the Moon's dispositor all fortunate.",
    summary: "The image is buried at the center of the place to make it grow and prosper." },
  { id: "free-captive", name: "For the freeing of a captive", category: "freedom", planet: "moon",
    citation: "Picatrix I.5 (GW p. 43; Pingree/AP I.5; AT I.5); cf. II.10 emerald seal, hour of Mercury exalted rising",
    conditions: "Image in the captive's likeness in the hour of the Moon; Moon WAXING in light, swift, separating from the malefics; buried near the prison when the Ascendant equals the 10th of the captor's city.",
    summary: "A liberation image buried by the prison; the II.10 emerald seal 'carried into a prison liberates prisoners.'",
    flag: "Textual conflict resolved: Greer/Warnock read 'waning', but Pingree's Latin (ipsa crescente lumine) and the Arabic ('increasingly bright') both read WAXING — two of three witnesses including both source languages. Waxing adopted." },
  { id: "eloquence-intellect", name: "For eloquence, memory and intellect", category: "eloquence", planet: "mercury",
    citation: "Picatrix II.10 (GW p. 112; AP II.10)",
    conditions: "Hour of Mercury, Mercury rising in the first face of Gemini (0–10° Gemini ascending with Mercury in it).",
    summary: "Images under this figure sharpen memory and intellect and win grace; emerald seals in Mercury's hour with Mercury rising win the service of scribes." },
  { id: "crops-thrive", name: "For crops and plantings to thrive", category: "crops", planet: "moon",
    citation: "Picatrix II.10 (GW p. 112); IV.9 (Pingree/AP IV.9.53) for the 25th-mansion ward",
    conditions: "Hour of the Moon, Moon rising in the first face of Cancer. Ward: Moon in the 25th mansion (Sa'd al-Akhbiya) — a fig-wood seal of a man planting, suffumigated with the trees' flowers, placed in a tree of the field.",
    summary: "The Cancer/Moon figure makes all that grows thrive; the mansion seal wards fields and orchards." },
  { id: "healing", name: "For curing illness and easing childbirth", category: "healing", planet: "sun",
    citation: "Picatrix IV.9 (Pingree/AP IV.9.38; GW p. 288); cf. I.4 mansions 22–23; II.10 Sun in first face of Leo for the stomach",
    conditions: "Moon in the 10th mansion (Al-Jabhah, ~25° Cancer–8° Leo): a lion's head of gold or brass, suffumigated with amber, to lift sadness, sluggishness and infirmity.",
    summary: "The lion's-head talisman is carried to the sick, or washed in a drink given to the ill or to labouring women." },
  { id: "safe-journeys", name: "For safe journeys and taking medicines", category: "travel", planet: "moon",
    citation: "Picatrix I.4, 1st mansion (GW p. 33; AP I.4; AT I.4); II.10 Moon exalted rising",
    conditions: "Moon in the 1st mansion (Al-Sharatain, 0–12°51' Aries), 'the root in every image made to travel safely and return in health'; or hour of the Moon with the Moon rising in Taurus, her exaltation.",
    summary: "The mansion under which the Indian sages begin journeys and take medicines." },
  { id: "safe-sea", name: "For safe voyages by water", category: "travel", planet: "moon",
    citation: "Picatrix I.4, 3rd mansion (GW p. 34; AT I.4); also the 7th and 17th",
    conditions: "Moon in the 3rd mansion (Al-Thurayya, the Pleiades, ~25° Aries–8° Taurus), waxing and fortified per the general rule.",
    summary: "Images made here let one sail safely and return; the mansion also favours works of fire and love between spouses." },
  { id: "trade-mansion", name: "For profit, safe roads, and audience with the great", category: "wealth", planet: "mercury",
    citation: "Picatrix I.4, 7th mansion (GW pp. 34–35; AT I.4)",
    conditions: "Moon in the 7th mansion (Al-Dhira, ~17° Gemini–0° Cancer), fortified per the general rule.",
    summary: "Increases merchandise, profit and crops, protects travellers, causes friendship, and favours going before the powerful." },
  { id: "lasting-friendship", name: "For friendship that endures", category: "love", planet: "venus",
    citation: "Picatrix I.4, 17th mansion (GW p. 35; AT I.4); IV.9 (Pingree/AP IV.9.43) for the 15th-mansion image",
    conditions: "Moon in the 17th mansion (Al-Iklil, ~25° Libra–8° Scorpio): 'everyone agrees' friendship begun here is never broken. Variant: 15th mansion, a seated figure reading scrolls, suffumigated with frankincense and nutmeg, for the joining of friends.",
    summary: "The consensus mansion for making bonds durable." },
  { id: "find-treasure", name: "For finding what is hidden; wells and treasures", category: "finding", planet: "mercury",
    citation: "Picatrix I.4, 2nd mansion (GW p. 33; AT I.4); also the 15th",
    conditions: "Moon in the 2nd mansion (Al-Butain, ~12°51'–25°42' Aries) or the 15th (Al-Ghafr), fortified per the general rule.",
    summary: "Images made here serve to dig for streams and wells and to find hidden treasures." },
  { id: "foundations", name: "For strong foundations and enduring buildings", category: "building", planet: "saturn",
    citation: "Picatrix I.4, 17th and 21st mansions (GW pp. 35–36; AT I.4)",
    conditions: "Moon in the 17th mansion ('to make buildings firm and stable') or the 21st (Al-Baldah, ~17° Sagittarius–0° Capricorn: buildings, harvests, keeping money, safe country roads).",
    summary: "The mansions elected for laying foundations meant to last." },
  { id: "protection-home", name: "For protection of the home; against slander", category: "protection", planet: "saturn",
    citation: "Picatrix IV.9 (Pingree/AP IV.9.45, IV.9.50; GW pp. 290–91)",
    conditions: "Thieves: Moon in the 17th mansion — an iron seal buried in the house. Slander/safe flight: Moon in the 22nd mansion (Sa'd al-Dhabih, 0–12°51' Capricorn) — an iron ring engraved with a winged-footed figure, 'to bind tongues so they cannot speak evil.'",
    summary: "Two guardian talismans: the buried house-ward, and the ring that binds hostile tongues and covers a needed escape." },
];
