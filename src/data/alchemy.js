// ═══════════════════════════════════════════════════════════════════════
// THE ALCHEMICAL CORPUS — verified reference data for the Athanor
// ═══════════════════════════════════════════════════════════════════════
// Researched and verified against primary/secondary sources (July 2026):
//   Ripley, The Compound of Alchymie (1471; 1591 ed., Adam McLean,
//     alchemywebsite.com/ripgates.html)
//   Pernety, Dictionnaire mytho-hermétique (1758) — the zodiac↔process
//     list, confirmed via Coudert (alchemywebsite.com/I-pernet.html) and
//     Wikipedia "Alchemical symbol" (both cite Pernety 1758)
//   Newton, Keynes MS 28 (Emerald Tablet translation), diplomatic
//     transcription: Chymistry of Isaac Newton, Indiana University,
//     purl.dlib.indiana.edu/iudl/newton/ALCH00017
//   Agrippa, Three Books of Occult Philosophy (J.F. trans. 1651),
//     esotericarchives.com — Book I chs. 23–29 (metals), Book II ch. 22
//   pseudo-Democritus, Physika kai Mystika (1st c. CE) — the Ostanes triad
//   Unicode block U+1F700–1F77F (Alchemical Symbols), verified per UCD
// Attribution flags are encoded honestly: where a doctrine is a modern
// synthesis (Hauck's seven operations, the spagyric alcohol/oil/ash
// mapping) it is labeled as such, never passed off as classical.

// ── The stages of the Great Work ────────────────────────────────────────
// Color sequence from Greco-Egyptian alchemy (1st c. CE); Greek names per
// Zosimos. The 3-stage scheme (citrinitas absorbed into rubedo) became
// standard after the 15th century.
export const GREAT_WORK_STAGES = [
  { key: "nigredo", name: "Nigredo", greek: "melanosis", color: "#1A1A22", accent: "#4A4A58",
    epithet: "The Blackening",
    meaning: "Death, putrefaction, dissolution of the old form into the massa confusa. In the vessel: matter charring, rotting, or fermenting black. Nothing true is built except on this death.",
    operations: "Calcination, putrefaction",
    inner: "Confrontation with the shadow; the breakdown of the ruling attitude. Melancholia as prima materia. (Jung, Psychology and Alchemy, CW 12.)" },
  { key: "albedo", name: "Albedo", greek: "leucosis", color: "#E8E8F0", accent: "#B8C4D8",
    epithet: "The Whitening",
    meaning: "Purification and washing — the ablutio. The matter cleansed of blackness into the lunar, silver state. The first great goal of the Work.",
    operations: "Solution, ablution, distillation",
    inner: "Washing of projections; the dawn-light of insight — still silver, still lacking the blood of life." },
  { key: "citrinitas", name: "Citrinitas", greek: "xanthosis", color: "#E8C868", accent: "#D4AF6A",
    epithet: "The Yellowing",
    meaning: "The transmutation of lunar silver-consciousness into the solar dawning — the transitional gold-hue. After the 15th century most writers folded this stage into rubedo.",
    operations: "Digestion under increasing fire",
    inner: "The dawning of solar wisdom out of reflective silver." },
  { key: "rubedo", name: "Rubedo", greek: "iosis", color: "#B03030", accent: "#D24B31",
    epithet: "The Reddening",
    meaning: "The perfected Stone: the marriage of Sun and Moon, the fixation of the tincture. The success of the magnum opus.",
    operations: "Coagulation, fermentation with gold, projection",
    inner: "The coniunctio of opposites; emergence of the Self." },
];

export const CAUDA_PAVONIS = {
  key: "cauda_pavonis", name: "Cauda Pavonis", epithet: "The Peacock's Tail",
  meaning: "A transitional flash of iridescent colors in the vessel — omnes colores — classically the herald of a stage-change. Its placement varies by author: most commonly between nigredo and albedo, sometimes before rubedo. When the colors come, a threshold is near.",
};

export const STAGE_SCHEMES_NOTE = "The tradition counts the Work in 3, 4, 7, 12, or 14 stages depending on the author — 'there is little consistency in the names of these processes, their number, their order, or their description.' The four-color sequence is the oldest thread; Ripley's twelve gates the most complete ladder; the popular seven-operation scheme (calcination→coagulation) is a 20th-century synthesis (D.W. Hauck, 1999), useful but modern.";

// ── The Alchemical Zodiac: 12 processes ↔ 12 signs (Pernety, 1758) ──────
// The Sun's sign names the season's operation — the wheel of the year IS
// the wheel of the Work. (Attribution verified to Pernety's Dictionnaire
// mytho-hermétique, 1758, via two independent secondary sources.)
export const ALCHEMICAL_ZODIAC = [
  { n: 1,  process: "Calcination",   sign: "Aries",       sym: "♈", glyph: "🝗",
    lab: "Roasting a solid to ash or calx by open fire — the destruction of the gross body.",
    symbolic: "Purging by fire; the destruction of form and ego so the essential may be freed." },
  { n: 2,  process: "Congelation",   sign: "Taurus",      sym: "♉", glyph: "🝕",
    lab: "Thickening a liquid into a solid as it cools — giving the dissolved matter new body.",
    symbolic: "Fixing the volatile; the first stabilization of what dissolution set free." },
  { n: 3,  process: "Fixation",      sign: "Gemini",      sym: "♊", glyph: "🝓",
    lab: "Making a volatile substance able to stand the fire without flying off.",
    symbolic: "Stabilizing spirit in matter — teaching the winged thing to stay." },
  { n: 4,  process: "Solution",      sign: "Cancer",      sym: "♋", glyph: "🝡",
    lab: "Dissolving a solid body in its liquid or menstruum.",
    symbolic: "Return to the waters; the surrender of form. Solve — the first word of the Work." },
  { n: 5,  process: "Digestion",     sign: "Leo",         sym: "♌", glyph: "🝮",
    lab: "Long gentle heat in a closed vessel — the slow cooking that changes without violence.",
    symbolic: "Ripening under the lion's warmth; the patience of the athanor itself." },
  { n: 6,  process: "Distillation",  sign: "Virgo",       sym: "♍", glyph: "🝠",
    lab: "Vaporizing and condensing a liquid to purify it — the subtle drawn off from the gross.",
    symbolic: "Extraction and refinement of essence; Virgo's discriminating purity." },
  { n: 7,  process: "Sublimation",   sign: "Libra",       sym: "♎", glyph: "🝞",
    lab: "Driving a solid directly to vapor and back to solid, bypassing the liquid state.",
    symbolic: "Elevation of the corporeal; the exchange of above and below held in balance." },
  { n: 8,  process: "Separation",    sign: "Scorpio",     sym: "♏", glyph: "🝣",
    lab: "Dividing mixed substances — filtering, decanting, cutting the pure from the impure.",
    symbolic: "Discrimination; Scorpio's surgical severance of what does not belong." },
  { n: 9,  process: "Ceration",      sign: "Sagittarius", sym: "♐", glyph: "🝊",
    lab: "Softening a hard body to a waxy, fusible consistency by repeated imbibition.",
    symbolic: "Making the rigid pliable — the arrow needs a bow that bends." },
  { n: 10, process: "Fermentation",  sign: "Capricorn",   sym: "♑", glyph: "🝤",
    lab: "Leavening the matter with a ferment — the gold seed that transforms the whole mass.",
    symbolic: "Ensouling the new body; life quickening in the depth of winter." },
  { n: 11, process: "Multiplication", sign: "Aquarius",   sym: "♒", glyph: "🝢",
    lab: "Augmenting the Stone's quantity and potency by turning the wheel again.",
    symbolic: "Increase of the perfected virtue, poured out for the many." },
  { n: 12, process: "Projection",    sign: "Pisces",      sym: "♓", glyph: "🜚",
    lab: "Casting the powdered Stone upon molten base metal to transmute it.",
    symbolic: "The Work released into the world; the sea receives the tincture." },
];

export function alchemicalSeason(sunLon) {
  const idx = Math.floor((((sunLon % 360) + 360) % 360) / 30);
  return ALCHEMICAL_ZODIAC[idx];
}

// ── Ripley's Twelve Gates (The Compound of Alchymie, 1471) ──────────────
// Gate names and order verbatim from the 1591 edition (McLean); the
// original carries NO zodiac attributions — that overlay is Pernety's.
export const RIPLEY_GATES = [
  { n: 1,  gate: "Calcination",   note: "Purging the body's superfluous moisture by gentle natural fire — 'the purgation of our stone.'" },
  { n: 2,  gate: "Solution",      note: "Dissolving the calcined body in the philosophical water." },
  { n: 3,  gate: "Separation",    note: "Dividing the subtle from the gross, the pure from the impure." },
  { n: 4,  gate: "Conjunction",   note: "Joining the separated opposites — the red man and the white woman espoused." },
  { n: 5,  gate: "Putrefaction",  note: "Death and blackening of the conjoined matter in the vessel — the nigredo." },
  { n: 6,  gate: "Congelation",   note: "The dissolved matter coagulates into a new white body." },
  { n: 7,  gate: "Cibation",      note: "Feeding the dry matter 'with milk and meat' — fresh material added by measure." },
  { n: 8,  gate: "Sublimation",   note: "The body made spiritual, the spirit corporeal — exalted by vapor." },
  { n: 9,  gate: "Fermentation",  note: "Ensouling the stone with the ferment of gold, that it may tinge." },
  { n: 10, gate: "Exaltation",    note: "Raising the stone to a nobler degree of purity and virtue." },
  { n: 11, gate: "Multiplication", note: "Increasing the stone in quantity and potency — the wheel turned again." },
  { n: 12, gate: "Projection",    note: "Casting the medicine upon imperfect metals to transmute them." },
];

// ── Tria Prima & the elements ───────────────────────────────────────────
export const TRIA_PRIMA = [
  { key: "mercury", name: "Mercury", sym: "☿", principle: "Spirit",
    nature: "The volatile, watery principle of life and connection — what escapes the fire as vapor.",
    inPlants: "The fermented alcohol — the animating intelligence, common to all plants." },
  { key: "sulfur", name: "Sulfur", sym: "🜍", principle: "Soul",
    nature: "The oily, combustible principle of individuality and desire — what burns.",
    inPlants: "The essential oil — the consciousness-signature unique to each plant." },
  { key: "salt", name: "Salt", sym: "🜔", principle: "Body",
    nature: "The fixed, incombustible principle of substance and structure — what remains as ash.",
    inPlants: "The purified mineral ash — the crystalline body that anchors the reunited essence." },
];
export const TRIA_PRIMA_NOTE = "The three-principle doctrine is Paracelsus (Opus Paramirum, c. 1531). The specific plant-work mapping — alcohol as Mercury, essential oil as Sulfur, calcined ash as Salt — is the standard of modern spagyric practice (Frater Albertus, The Alchemist's Handbook, 1960), not a Paracelsus quotation.";

export const ELEMENTS = [
  { name: "Fire",  sym: "🜂", qualities: "hot + dry" },
  { name: "Air",   sym: "🜁", qualities: "hot + moist" },
  { name: "Water", sym: "🜄", qualities: "cold + moist" },
  { name: "Earth", sym: "🜃", qualities: "cold + dry" },
  { name: "Quintessence", sym: "🜀", qualities: "the incorruptible fifth essence — in spagyrics, the reunited three principles" },
];

// ── The seven metals ────────────────────────────────────────────────────
// Doctrine: metals ripen in the earth under their governing planet, and
// the planet's name is the metal's cover-name. Supported by Agrippa,
// Three Books I.23–29 (1651 trans.), though his chapter lists overlap.
export const METALS = [
  { metal: "Lead",        planet: "saturn",  sym: "♄", altGlyph: "🜪",
    character: "Heaviness, melancholy, patience — the prima materia of the metals, in which all the others sleep. Saturn's metal begins every metallic work.", agrippa: "I.25" },
  { metal: "Tin",         planet: "jupiter", sym: "♃", altGlyph: "🜩",
    character: "Temperate, benevolent, expansive — the cheerful metal, ringing and bright, that neither corrodes like lead nor rages like iron.", agrippa: "I.26" },
  { metal: "Iron",        planet: "mars",    sym: "♂", altGlyph: "🜜",
    character: "Hardness, war, the cutting edge. The metal of blood (and of the blood) — force made material.", agrippa: "I.27" },
  { metal: "Gold",        planet: "sun",     sym: "☉", altGlyph: "🜚",
    character: "Perfection and incorruptibility — the goal-metal, matured to completion in the earth. What every metal would be if nothing hindered it.", agrippa: "I.23" },
  { metal: "Copper",      planet: "venus",   sym: "♀", altGlyph: "🜠",
    character: "Beauty and attraction — the metal of Cyprus, Venus's isle. Warm-colored, conductive, quick to verdigris green.", agrippa: "I.28" },
  { metal: "Quicksilver", planet: "mercury", sym: "☿", altGlyph: "☿",
    character: "The volatile, dual transformer — liquid metal, neither one thing nor the other, dissolver of gold. (Toxic: study, never handle.)", agrippa: "I.29" },
  { metal: "Silver",      planet: "moon",    sym: "☽", altGlyph: "🜛",
    character: "Purity and receptivity — the mirror-metal of the white work, tarnishing black under sulfur like the Moon eclipsed.", agrippa: "I.24" },
];

// Agrippa II.22: the kamea-on-metal prescriptions for talismans. Note these
// are NOT simply the metal-of-the-planet (Jupiter's and Venus's tables go
// on silver) — stored separately so the talisman module can cite them.
export const AGRIPPA_KAMEA_METALS = {
  saturn:  { metal: "a plate of lead",   effect: "power and protection in Saturnine matters; inverted if Saturn is afflicted" },
  jupiter: { metal: "a silver plate",    effect: "gain, riches, favor, love, and peace" },
  mars:    { metal: "an iron plate or sword", effect: "potent in war and judgments; terrible to enemies" },
  sun:     { metal: "a golden plate",    effect: "renown, amiability, acceptance; elevation to high fortunes" },
  venus:   { metal: "a silver plate",    effect: "concord, the ending of strife, the procuring of love" },
  mercury: { metal: "silver, tin, yellow brass, or virgin parchment", effect: "gain, memory, understanding, and knowledge of things to come" },
  moon:    { metal: "silver (for good); lead (for baneful works)", effect: "makes the bearer amiable, pleasant, cheerful; protects travelers" },
};

// ── The Emerald Tablet — Newton's translation ───────────────────────────
// Diplomatic text of Keynes MS 28, King's College, Cambridge (c. 1680s),
// via The Chymistry of Isaac Newton, Indiana University:
// purl.dlib.indiana.edu/iudl/newton/ALCH00017. Abbreviations normalized
// for display (wch→which, ye/yt→the/that, wth→with, ffor→For).
export const EMERALD_TABLET = {
  title: "Tabula Smaragdina — The Emerald Tablet",
  translator: "Isaac Newton (Keynes MS 28, c. 1680s)",
  source: "The Chymistry of Isaac Newton, Indiana University — purl.dlib.indiana.edu/iudl/newton/ALCH00017",
  about: "The foundational credo of Western alchemy — held to compress the entire Great Work into a dozen aphorisms. Earliest attested in Arabic (Sirr al-khalīqa, c. 8th century), reaching Latin Europe in the 12th; every major alchemist from Albertus Magnus to Newton glossed it. Its second clause — 'as above, so below' — is the hinge between alchemy and astrology, and the charter of this entire application.",
  lines: [
    "Tis true without lying, certain and most true.",
    "That which is below is like that which is above, and that which is above is like that which is below, to do the miracles of one only thing.",
    "And as all things have been and arose from one by the mediation of one: so all things have their birth from this one thing by adaptation.",
    "The Sun is its father, the Moon its mother, the wind hath carried it in its belly, the earth is its nurse.",
    "The father of all perfection in the whole world is here.",
    "Its force or power is entire if it be converted into earth.",
    "Separate thou the earth from the fire, the subtle from the gross, sweetly with great industry.",
    "It ascends from the earth to the heaven and again it descends to the earth, and receives the force of things superior and inferior.",
    "By this means you shall have the glory of the whole world, and thereby all obscurity shall fly from you.",
    "Its force is above all force, for it vanquishes every subtle thing and penetrates every solid thing.",
    "So was the world created.",
    "From this are and do come admirable adaptations, whereof the means (or process) is here in this.",
    "Hence I am called Hermes Trismegist, having the three parts of the philosophy of the whole world.",
    "That which I have said of the operation of the Sun is accomplished and ended.",
  ],
};

// ── Axioms of the Art ───────────────────────────────────────────────────
export const AXIOMS = [
  { latin: "Solve et Coagula", en: "Dissolve and coagulate",
    gloss: "The master-rhythm of the Work: break down, then re-form. Everything in the laboratory — and everything in the practitioner — moves by this alternation. (Traditional medieval axiom; no single primary source.)" },
  { latin: "V.I.T.R.I.O.L.", en: "Visita Interiora Terrae Rectificando Invenies Occultum Lapidem — Visit the interior of the earth; by rectifying you will find the hidden stone",
    gloss: "The acrostic on vitriol 🜖, traditionally attributed to Basil Valentine's Azoth (1613 French ed.). The extended VITRIOLUM adds Veram Medicinam — the true medicine." },
  { latin: "Quod est inferius est sicut quod est superius", en: "As above, so below",
    gloss: "Emerald Tablet, second clause. The charter linking alchemy to astrology — the reason an ephemeris belongs in a laboratory." },
  { latin: "Ora et Labora", en: "Pray and work",
    gloss: "The Benedictine motto adopted by spiritual alchemy: the laboratory is also an oratory — exemplified by Khunrath's Amphitheatrum plate (1595/1609), where the alchemist's workbench and prayer-tent share one hall." },
  { latin: "Nuptiae Chymicae", en: "The alchemical wedding",
    gloss: "The union of opposites — Sol and Luna, Sulfur and Mercury, King and Queen — producing the Stone. Landmark text: the Chymical Wedding of Christian Rosenkreutz (1616)." },
  { latin: "Festina lente", en: "Make haste slowly",
    gloss: "Augustus's adage adopted for the regimen of the fire: the Work cannot be rushed, only tended. The athanor's whole meaning in two words." },
  { latin: "Obscurum per obscurius", en: "The obscure by the more obscure",
    gloss: "The alchemists' ironic method of deliberate obscurity — reading them requires the same patience as the fire. (Traditional; popularized by Jung.)" },
  { greek: "Ἡ φύσις τῇ φύσει τέρπεται", en: "Nature delights in nature; nature conquers nature; nature masters nature",
    gloss: "The Ostanes triad — revealed on a temple column in pseudo-Democritus's Physika kai Mystika (1st c. CE), the oldest axiom of sympathetic transformation in the Western record." },
];

// ── The athanor ─────────────────────────────────────────────────────────
export const ATHANOR_LORE = {
  name: "Athanor",
  etymology: "Arabic al-tannūr, 'the oven' (cognate with tandoor), from Middle Persian and ultimately Akkadian.",
  nicknames: "Piger Henricus ('Slow Henry'), the philosophical furnace, the tower furnace.",
  what: "A self-stoking digestion furnace: a tower charged with coals that feed down as they burn, holding a low, uniform heat for days or weeks with minimal tending, the vessel sitting in an ash- or sand-bath beside it.",
  symbolism: "The constant gentle fire is the philosophical incubator — the hen brooding her egg. It figures the steady, unforced warmth of attention that matures the Work without burning it; in the inner reading, the alchemist's own body is the athanor.",
};

// ── Glyph reference (verified Unicode codepoints) ───────────────────────
export const GLYPHS = [
  { g: "🜀", name: "Quintessence" }, { g: "🜁", name: "Air" }, { g: "🜂", name: "Fire" },
  { g: "🜃", name: "Earth" }, { g: "🜄", name: "Water" }, { g: "🜍", name: "Sulfur" },
  { g: "🜔", name: "Salt" }, { g: "☿", name: "Mercury / quicksilver" },
  { g: "🜚", name: "Gold (Sol)" }, { g: "🜛", name: "Silver (Luna)" },
  { g: "🜖", name: "Vitriol" }, { g: "🜊", name: "Vinegar" }, { g: "🜈", name: "Aqua vitae (spirit of wine)" },
  { g: "🜅", name: "Aqua fortis" }, { g: "🜆", name: "Aqua regia" },
  { g: "🝆", name: "Oil" }, { g: "🝇", name: "Spirit" }, { g: "🝈", name: "Tincture" },
  { g: "🝗", name: "Ashes" }, { g: "🝎", name: "Caput mortuum (death's head)" },
  { g: "🝪", name: "Alembic" }, { g: "🝭", name: "Retort" }, { g: "🝥", name: "Crucible" },
  { g: "🝫", name: "Balneum Mariae (water bath)" }, { g: "🝬", name: "Balneum vaporis (vapor bath)" },
  { g: "🝤", name: "Putrefaction" }, { g: "🝞", name: "Sublimation" }, { g: "🝠", name: "Distill" },
  { g: "🝡", name: "Dissolve" }, { g: "🝣", name: "Purify" }, { g: "🝟", name: "Precipitate" },
  { g: "🝛", name: "Amalgam" }, { g: "🝮", name: "Hour" }, { g: "🝯", name: "Night" },
  { g: "🝰", name: "Day-night (24h)" }, { g: "🝱", name: "Month" },
];

// ── Lunar guidance for the laboratory ───────────────────────────────────
// The solve/coagula reading of the lunation: the waning Moon favors works
// of breaking-down (solve — maceration, putrefaction, calcination of what
// must die), the waxing favors building-up (coagula — recombination,
// imbibition, sealing), full favors extraction at peak virtue, dark favors
// beginnings-in-darkness (fermentation, nigredo work).
export function moonWorkGuidance(moonPhaseDeg) {
  const d = ((moonPhaseDeg % 360) + 360) % 360;
  if (d < 30 || d > 330) return { phase: "Dark / New", counsel: "Begin what must gestate in darkness — fermentations, putrefactions, the nigredo. Seal vessels; plant intentions with the seed of the light to come.", mode: "solve → coagula turn" };
  if (d < 150) return { phase: "Waxing", counsel: "The tide builds: coagula. Recombine, imbibe, cerate, seal finished work. Draughts and medicines gain strength taken now.", mode: "coagula" };
  if (d < 210) return { phase: "Full", counsel: "Peak virtue: filter and harvest tinctures, complete extractions, charge and consecrate. The menstruum has drawn all it will draw.", mode: "harvest" };
  return { phase: "Waning", counsel: "The tide releases: solve. Calcine, dissolve, purge, banish, reduce to ash what must die. Clear the vessel for the next turn.", mode: "solve" };
}
