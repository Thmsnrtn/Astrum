import { GOLD } from "../ui/theme.js";
// ═══════════════════════════════════════════════════════════════════════
// ALCHEMICAL OPERATIONS — the laboratory repertoire
// ═══════════════════════════════════════════════════════════════════════
// Twelve working templates spanning plant, salt, water, and mineral
// operations, synthesized from the practical literature:
//   Frater Albertus, The Alchemist's Handbook (1960)
//   Manfred Junius, The Practical Handbook of Plant Alchemy (1979/1985)
//   Robert Bartlett, Real Alchemy (2007) / The Way of the Crucible (2009)
//   John French, The Art of Distillation (1651)
//   Nicolas Lémery, A Course of Chemistry (1675)
//   Baro Urbigerus, Circulatum Minus Urbigeranum (1690)
//   Mutus Liber (1677) with Canseliet's and McLean's commentaries;
//   Henshaw, "Observations upon May-dew," Phil. Trans. (1665)
//   Kirchweger, The Golden Chain of Homer (1723)
//   Culpeper, The English Physitian (1652) — gathering elections
//   Hartmann's transmission of the Paracelsian Primum Ens (1887, flagged)
// Truly dangerous classical paths (lead, mercury, antimony, oil of
// vitriol, aurum potabile) are NOT templates — they live in
// STUDY_ONLY_PATHS in alchemy.js with hard warnings.
//
// dueRule fields (resolved by lib/athanor.js):
//   planetHour: true       → during the operation planet's hour
//   planetDay: true        → on the operation planet's day
//   moonPhase: "new" | "waxing" | "full" | "waning"
//   minDaysAfterPrev: n    → at least n days after the previous step
//   sunSigns: [indices]    → Sun in these signs (0=Aries … 11=Pisces)
//   preDawn: true          → in the last night-hours before sunrise
// Step extras: fire (1-4, degree of fire), observe (lab-record prompt).

export const OPERATION_FAMILIES = {
  plant:   { key: "plant",   label: "Plant Work",   glyph: "🜎", note: "The entry gate — the vegetable kingdom forgives mistakes." },
  salt:    { key: "salt",    label: "Salt Work",    glyph: "🜔", note: "Purification by dissolve-filter-coagulate — the craft beneath every other craft." },
  water:   { key: "water",   label: "Water Work",   glyph: "🜄", note: "Dew, rain, and the celestial waters — patience-bound, chemically mild." },
  mineral: { key: "mineral", label: "Mineral Work", glyph: "🜍", note: "The safe corners of the metallic realm. The rest is study-only, and the Library says why." },
  custom:  { key: "custom",  label: "Custom",       glyph: "🜀", note: "Your own process, under your own election." },
};

export const TIER_META = {
  novice:       { label: "Novice",       col: "#5CA85C" },
  practitioner: { label: "Practitioner", col: GOLD },
  adept:        { label: "Adept",        col: "#C878A8" },
};

export const OPERATION_TEMPLATES = {

  // ═══ PLANT WORK ═══════════════════════════════════════════════════════

  tincture: {
    id: "tincture", family: "plant", tier: "novice",
    name: "Spagyric Tincture",
    source: "Albertus, Alchemist's Handbook ch. III; Bartlett, Real Alchemy ch. 5; Junius ch. 9",
    apparatus: "Sealable glass jar, filter, mortar, calcining dish, gentle heat (~40 °C)",
    safety: ["Burn the marc outdoors — the smoke is real.", "Never denatured alcohol or methanol if the elixir is to be taken."],
    desc: "The Lesser Work entire: separate, purify, and recombine the three principles of a planetary herb. Salt from the ash, Sulfur and Mercury in the tincture — death and resurrection in a jar.",
    lore: "Make one for each of the seven planets and take each on its day — Bartlett's 'Seven Basics', a year's curriculum in seven jars.",
    steps: [
      { title: "Gather and grind the herb", dueRule: { planetHour: true, planetDay: true }, fire: 0,
        instructions: "Choose the herb by its ruler (Culpeper's tables) — dried herb for first works, since fresh water dilutes the menstruum. Grind fine in the mortar in the planet's day and hour; if wild-gathering, Culpeper wants the ruler dignified and the Moon applying by good aspect.",
        observe: "Herb identity and provenance, weight, the hour, Moon's sign and phase." },
      { title: "Begin the maceration (Solve)", dueRule: { planetHour: true, planetDay: true, minDaysAfterPrev: 0 }, fire: 1,
        instructions: "Cover the herb with 60–70% spirit, one part herb to about eight of menstruum, jar no more than two-thirds full. The operation begins the moment the alcohol touches the matter — Junius elected that minute to the rising of Mercury. Seal, and keep no warmer than a brooding hen (~40 °C).",
        observe: "Ratio and proof; the first hour's color draw." },
      { title: "Daily agitation through the steep", dueRule: { planetHour: true, minDaysAfterPrev: 2 }, fire: 1,
        instructions: "Shake vigorously each day, in the planet's hour when you can. Ten days is the minimum; spagyrists steep up to nine weeks. The Sulfur is drawn into the Mercury — watch the menstruum deepen.",
        observe: "Daily color deepening, aroma through the seal when opened." },
      { title: "Filter at the Full Moon", dueRule: { moonPhase: "full", minDaysAfterPrev: 7 }, fire: 0,
        instructions: "Filter and press the marc at peak virtue; combine the liquids, settle 48 hours, decant clear. Keep the marc — it carries the Salt.",
        observe: "Volume recovered; clarity and color against the light." },
      { title: "Calcine the marc", dueRule: { moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 4,
        instructions: "Outdoors: ignite the spirit-soaked marc, burn to black, grind, then calcine long and slow — 400–500 °C — toward light grey approaching white. A slow calcination at low heat beats a short violent one. Sprinkling the grey ash with distilled water and re-calcining speeds the whitening.",
        observe: "The color march black → grey → white; any fusing (fire too fierce); smoke and smell." },
      { title: "Leach and purify the Salt", dueRule: { moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 1,
        instructions: "Cover the ash with several parts warm distilled water, stir, filter off the dead earth, and evaporate gently to white crystals. If the solution streaks yellow-orange the calcination was short — back to the fire, dissolve, and repeat until snow-white. The Salt is hygroscopic: seal it.",
        observe: "Crystal color and form; yield weight; how many cycles whiteness required." },
      { title: "The Chymical Wedding (Coagula)", dueRule: { planetHour: true, planetDay: true, moonPhase: "waxing", minDaysAfterPrev: 2 }, fire: 1,
        instructions: "In the planet's day and hour under a waxing Moon, pour the tincture over the warm Salt. Seal and digest at 40 °C for one to two weeks, shaking daily — the body drinks its returning soul and spirit. Filter any residue, bottle, label with the election.",
        observe: "Color and aroma shift on the union; absorption; final volume. Dose taken and its effects — this is what Review will ask about." },
    ],
  },

  water: {
    id: "water", family: "plant", tier: "novice",
    name: "Planetary Water & Essential Oil",
    source: "Junius ch. 5 & 7; French, The Art of Distillation (1651)",
    apparatus: "Still with condenser, oil separator (Florentine flask)",
    safety: ["Steam scalds.", "Essential oils are flammable and skin-hot — handle in drops."],
    desc: "Steam-distillation of a fresh planetary herb into its volatile Sulfur (the essential oil) and its hydrosol — the planetary water, menstruum and ritual water in one run.",
    steps: [
      { title: "Harvest at dawn of the ruler's day", dueRule: { planetDay: true, preDawn: true }, fire: 0,
        instructions: "Fresh herb, cut in the last hours before sunrise on its planet's day — the first hour of the day belongs to the ruler. Charge the still promptly; weigh everything.",
        observe: "Charge weight, water volume, the morning's sky." },
      { title: "Distill in the second degree", dueRule: { planetHour: true, minDaysAfterPrev: 0 }, fire: 2,
        instructions: "Seething water and its vapor — run steadily until the distillate loses scent, one to four hours. Heat-sensitive herbs want gentler fire; the separation of the essential oil is always the first act of the plant work.",
        observe: "Time to first drop; the scent's arc across the run; oil and hydrosol volumes." },
      { title: "Separate and store", dueRule: { minDaysAfterPrev: 0 }, fire: 0,
        instructions: "Decant the oil from the hydrosol — some oils float, some sink; note which. The hydrosol is the planetary water: menstruum component, asperging water, offering. Dark glass, cool shelf.",
        observe: "Oil color and whether it floats or sinks; hydrosol clarity." },
      { title: "Dedicate in the ruler's hour", dueRule: { planetHour: true, minDaysAfterPrev: 1 }, fire: 0,
        instructions: "In the next hour of the planet, name the water and oil to their purpose. Use the water within one lunar cycle; the oil keeps.",
        observe: "The dedication spoken; intended uses." },
    ],
  },

  ferment: {
    id: "ferment", family: "plant", tier: "practitioner",
    name: "Fermented Elixir (Full Separation)",
    source: "Junius ch. 5 — the three philosophical principles; Basil Valentine on plant salts",
    apparatus: "Still, fermentation vessel with airlock, calcining dish, filters",
    safety: ["Ferment in ventilated space — CO₂ pools.", "Alcohol vapors flame."],
    desc: "The complete plant work: essential oil first (volatile Sulfur), then the plant's own Mercury born by fermentation, then both Salts from the fixed remains — the tria prima genuinely separated before the wedding.",
    steps: [
      { title: "Distill the volatile Sulfur first", dueRule: { planetHour: true, planetDay: true }, fire: 2,
        instructions: "Steam-distill the fresh plant for its essential oil before anything else — 'the separation of the essential oils is always the first step' (Junius). In no case let the plants ferment beforehand; beware summer temperatures.",
        observe: "Oil yield and character; hydrosol set aside." },
      { title: "Set the ferment at the dark of the Moon", dueRule: { moonPhase: "new", minDaysAfterPrev: 0 }, fire: 1,
        instructions: "The distilled residue with yeast (about 25 g per five quarts), airlock on, warm room. Sugar is permitted — Mercury is the same in the whole plant world (Junius); without it Glauber demands fifty pounds of plants. Life begins in darkness.",
        observe: "Onset of bubbling; temperature; the four elements visible in one vessel — earth settling, water, air rising, the ferment's own heat." },
      { title: "Watch until the plants sink", dueRule: { minDaysAfterPrev: 7 }, fire: 1,
        instructions: "The ferment is done when gas production stops and the plants sink to the bottom — days to weeks. Do not rush the vessel.",
        observe: "Date the bubbling ceased; the sinking; smell of the young wine." },
      { title: "Distill and rectify the Mercury", dueRule: { moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 1,
        instructions: "Filter, press, and distill off the spirit in the water bath, holding strictly to the boiling point; rectify repeatedly toward 95%. Mercury's day and hour suit the still. Store tightly closed — the spirit flees.",
        observe: "Proof achieved at each pass; clarity." },
      { title: "Win the two Salts", dueRule: { moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 4,
        instructions: "Evaporate the fermented liquor to honey and calcine (it stays black long — wet and calcine in cycles); calcine the pressed marc separately. Then Basil Valentine's rule for every plant salt: burn, make a lye with warm water, coagulate, dissolve and coagulate again 'until the salt is beautifully clear… sprouts transparently into crystals.'",
        observe: "Weights of every principle — the diary is the duty of every spagyrist (Junius)." },
      { title: "Recombine and digest (Coagula)", dueRule: { planetHour: true, planetDay: true, moonPhase: "waxing", minDaysAfterPrev: 2 }, fire: 1,
        instructions: "Unite Mercury, the oil-Sulfur, and the purified Salts in the ruler's day and hour, waxing Moon. Digest at 40 °C for a philosophical month — forty days, the number of darkness. Rhythmize if you wish: alternate gentle reflux and rest.",
        observe: "The union's color and aroma; the forty days' changes; the finished elixir's dose and effect." },
    ],
  },

  ens: {
    id: "ens", family: "plant", tier: "practitioner",
    name: "Ens Tincture (Primum Ens)",
    source: "Paracelsian recipe via Hartmann (1887 — provenance flagged); protocol per Bartlett ch. 6",
    apparatus: "Wide glass dish, jars, pipette, cotton filter, gloves and eye protection",
    safety: ["Oil of tartar is caustic lye — it burns skin and etches glass. Gloves and goggles, always.", "Filter through cotton or glass wool; paper disintegrates in the lye."],
    desc: "The famous emerald-green tincture: fresh melissa surrendered to deliquesced salt of tartar, its first essence drawn upward into floated spirit of wine. The rejuvenation stories are anecdote; the green is real.",
    lore: "Hartmann transmits the recipe from 'an unknown manuscript'; Rubellus Petrinus argues the product is a fine tincture but no true Primum Ens. Both views belong in the record.",
    steps: [
      { title: "Deliquesce the salt of tartar", dueRule: { sunSigns: [0, 1, 2], minDaysAfterPrev: 0 }, fire: 0,
        instructions: "On clear humid spring nights (Sun in Aries through Gemini), spread pure salt of tartar a finger deep in a glass dish exposed to the night air, sheltered from rain. It drinks the airborne water — the spring air carries the universal fire. Draw off and filter the liquor after sunrise; repeat over several nights.",
        observe: "Nights exposed, weather, volume of liquor won." },
      { title: "Drown the fresh melissa", dueRule: { planetDay: true, planetHour: true, minDaysAfterPrev: 0 }, fire: 1,
        instructions: "Thursday, Jupiter's hour, herb picked at dawn: fill the filtered liquor with as many fresh leaves as it will hold. Stand closed and moderately warm from one day (Hartmann) to two weeks (Bartlett) — the liquor turns deep red-brown.",
        observe: "Color of the liquor; condition of the drowned leaves." },
      { title: "Float the spirit and watch the green rise", dueRule: { moonPhase: "waxing", minDaysAfterPrev: 1 }, fire: 0,
        instructions: "Strain, then float absolute alcohol two fingers deep upon the liquor without mixing. Day by day the spirit turns intensely emerald as the Ens climbs into it. If the layers merge, dry salt of tartar breaks the emulsion.",
        observe: "The green's intensity each day; the sharpness of the layer boundary." },
      { title: "Draw off, and again", dueRule: { minDaysAfterPrev: 2 }, fire: 0,
        instructions: "Pipette the green tincture off; float fresh spirit and repeat until no more color transfers. A night in the freezer drops any carried water and salt; filter clear. The tartar salt below can be dried, calcined, and used again.",
        observe: "Number of extractions; total tincture volume." },
      { title: "Seal in amber, take on the day", dueRule: { planetHour: true, minDaysAfterPrev: 1 }, fire: 1,
        instructions: "Concentrate gently if desired, and keep from light in amber glass. The classical dose is five to ten drops in wine on the planet's day. The Ens is held to act on the subtle body — the record should say whether it did.",
        observe: "Dose, dreams, and effects — Lesebure's servant is anecdote; your notebook is data." },
    ],
  },

  magistery: {
    id: "magistery", family: "plant", tier: "practitioner",
    name: "Magistery of Paracelsus",
    source: "Paracelsus, as transmitted in Bartlett, Real Alchemy ch. 6",
    apparatus: "Distillation train, 40 °C incubator, circulation flask",
    safety: ["Months of unattended warmth — use a thermostat, not a flame."],
    desc: "The volatilized whole-plant essence: digest, distill, and cohobate over fresh herb again and again until the spirit has grown five-fold rich, then circulate until the Magistery gathers in oily drops. One part is held equal to two hundred of the dried herb.",
    steps: [
      { title: "Digest fresh herb in spirit", dueRule: { planetHour: true, planetDay: true, moonPhase: "waxing" }, fire: 1,
        instructions: "Chopped fresh herb covered with rectified spirit of wine, sealed, digested at 40 °C for one month. The ruler's day and hour open the work; the waxing Moon enriches it.",
        observe: "Color at the month's end." },
      { title: "Distill gently to dryness", dueRule: { minDaysAfterPrev: 28 }, fire: 1,
        instructions: "In the water bath, carefully — do not scorch. The distillate now carries the plant's own liquid with the spirit.",
        observe: "Distillate volume gained over the charge." },
      { title: "Cohobate over fresh herb", dueRule: { planetDay: true, minDaysAfterPrev: 1 }, fire: 1,
        instructions: "Pour the distillate over fresh herb, digest another month at 40 °C, distill again. Repeat the cycle until the volume stands at five times the original spirit — four to five months of patient turning.",
        observe: "Volume at each cycle; the deepening character of the spirit." },
      { title: "The final circulation", dueRule: { moonPhase: "waxing", minDaysAfterPrev: 28 }, fire: 1,
        instructions: "Circulate the finished distillate for one month. The Magistery gathers as oily drops that sink or float according to the herb's nature; collect them by dropper and seal.",
        observe: "The day the drops formed; sink or float; dose response thereafter." },
    ],
  },

  plantstone: {
    id: "plantstone", family: "plant", tier: "adept",
    name: "Plant Stone (Lesser Circulation)",
    source: "Albertus, Alchemist's Handbook ch. III–IV; Bartlett ch. 6",
    apparatus: "Soxhlet extractor, calcining dish, incubator, sealed flask",
    safety: ["Alcohol vapor over months — thermostated heat only, no open flame near the work."],
    desc: "The crown of the plant work: rectified spirit run over the herb until exhausted, the salt fed with its own essence until saturated, then sealed and matured at incubation heat for up to six months — until it runs oily when warm and stands solid when cold.",
    steps: [
      { title: "Rectify the menstruum seven times", dueRule: { planetHour: true, moonPhase: "waxing" }, fire: 1,
        instructions: "Distill high-proof spirit at 78 °C, then again at 76 °C — seven distillations to crystal clarity (or dry it over salt of tartar and redistill). Spirit of true grape wine is the classical spiritus vini. Mercury's hours suit the still.",
        observe: "Temperature discipline; the clouding left behind at each pass." },
      { title: "Soxhlet the herb to exhaustion", dueRule: { planetHour: true, planetDay: true, minDaysAfterPrev: 1 }, fire: 1,
        instructions: "Ground herb in the thimble, gentle water-bath heat so the Sulfur is never scorched; cycle until the siphon runs clear.",
        observe: "Cycle count; extract depth; any dark rim warning of heat." },
      { title: "Calcine, leach, and whiten the Salt", dueRule: { moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 4,
        instructions: "As in the tincture work, but further: prolonged calcination can push the grey toward a faint reddish cast — preferable, says Albertus, though it asks a long time in the fire.",
        observe: "The endpoint color; total hours in the fire." },
      { title: "Feed the Salt its essence", dueRule: { planetDay: true, moonPhase: "waxing", minDaysAfterPrev: 2 }, fire: 1,
        instructions: "Salt below, extract poured over, circulation run until the liquid pales as the salt drinks its Essence and Sulfur; feed more until saturation refuses.",
        observe: "Absorption rate; the pallor of the spent menstruum." },
      { title: "Seal and mature the Stone", dueRule: { moonPhase: "waxing", minDaysAfterPrev: 7 }, fire: 1,
        instructions: "The saturated matter sealed in its flask at 40 °C — one philosophical month at least; six for a true stone. Done, it runs oily when warm and stands solid when cold. Potency rises by iterated calcination and re-circulation, the wheel turned again.",
        observe: "Consistency warm and cold; color; any sublimate flowering on the glass; the dreams of the long digestion." },
    ],
  },

  circulatum: {
    id: "circulatum", family: "plant", tier: "adept",
    name: "Circulatum Minus (Urbigerus)",
    source: "Urbigerus, Aphorismi Urbigerani (1690); working commentary in Junius ch. 10",
    apparatus: "Pelican or circulation flask, still, incubator",
    safety: ["Long unattended heat — thermostat, never flame."],
    desc: "The plant alkahest: the three principles fully separated, the salt volatilized, and all united and circulated until the menstruum, dropped on any fresh plant, separates its essence in a moment without fire — and is recovered unchanged to work again.",
    lore: "Junius favors the 26th lunar mansion (al-Fargh al-Mukdim, late Aquarius–Pisces) for the volatile works; his own Circulatum, he wrote, still separated in minutes years on.",
    steps: [
      { title: "Prepare the three principles in full", dueRule: { planetDay: true, planetHour: true }, fire: 2,
        instructions: "Prerequisite work: the essential oil first ('when Apollo has appeared'), the Mercury by fermentation and rectification, the Salt calcined and purified white. Weigh everything.",
        observe: "Yields of all three by weight." },
      { title: "Determine the Mercury upon the Salt", dueRule: { moonPhase: "waxing", minDaysAfterPrev: 2 }, fire: 1,
        instructions: "Unite the rectified spirit — 'Diana's tears, pure Mercury not yet specified' — with the purified, spiritualized Salt and the Sulfurs, seeking the indissoluble union of Aphorism IV.",
        observe: "Whether the salt dissolves and holds — the union's completeness." },
      { title: "Circulate a philosophical month", dueRule: { moonPhase: "new", minDaysAfterPrev: 1 }, fire: 1,
        instructions: "Begin at the dark of the Moon and circulate forty days and more: 'the exaltation of a pure liquor through a circulating dissolution and coagulation in the pelican, with heat as the agent' (Libavius). Cohobate repeatedly — distill, return, distill again.",
        observe: "The reflux rhythm; clarity; the slow gain of body." },
      { title: "Test upon a fresh plant", dueRule: { planetHour: true, minDaysAfterPrev: 40 }, fire: 0,
        instructions: "A finished Circulatum dropped on a fresh plant separates its essence 'in a moment, without any fire' — the oil beading on the surface — and gentle distillation recovers the menstruum unchanged for the next work.",
        observe: "Separation speed; the beading oil; recovery volume. If it fails, the wheel turns again." },
    ],
  },

  // ═══ SALT WORK ════════════════════════════════════════════════════════

  salttartar: {
    id: "salttartar", family: "salt", tier: "novice",
    name: "Salt of Tartar & the Purification of Salts",
    source: "Lémery, A Course of Chemistry (1675); Bartlett ch. 6",
    apparatus: "Crucible, buckets, filters, evaporating dishes, sand bath",
    safety: ["The calcination fumes are acrid — outdoors only.", "The finished salt is caustic when wet; the deliquesced oil doubly so."],
    desc: "The foundation craft of the whole art: calcine, dissolve, filter, coagulate — again and again until the salt rises snow-white. Yields the sal tartari that feeds the Ens work, and teaches the hands everything the grander works assume.",
    steps: [
      { title: "Calcine the crude tartar", dueRule: { moonPhase: "waning" }, fire: 4,
        instructions: "Outdoors, hours of patient fire: char cream of tartar (or argol from a wine barrel) black, and keep on 'until it becomes white' (Lémery). Hardwood ashes — oak, grapevine, fern — are the alternate road.",
        observe: "The fumes' character; the color stages." },
      { title: "Lixiviate", dueRule: { minDaysAfterPrev: 0 }, fire: 1,
        instructions: "Dissolve the ashes in plenty of hot water and filter. The first liquor runs dark brown; later cycles run yellow-green, then clear.",
        observe: "Liquor color this cycle — it is the measure of your fire." },
      { title: "Coagulate in the sand heat", dueRule: { minDaysAfterPrev: 0 }, fire: 3,
        instructions: "Evaporate to the white alkali salt in a sand bath. Skim any crust as it forms.",
        observe: "Crystal whiteness; yield." },
      { title: "Iterate to whiteness", dueRule: { moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 4,
        instructions: "Recalcine, redissolve, refilter, recoagulate — until calcination releases neither carbon nor fume. Practitioners report a faint blue cast under moonlight after many cycles; your notebook will say.",
        observe: "Cycle count; the final crystal; any blue by moonlight (practitioner observation, not canon)." },
      { title: "Deliquesce for the Oil of Tartar (optional)", dueRule: { sunSigns: [0, 1, 2], minDaysAfterPrev: 1 }, fire: 0,
        instructions: "Spread the finished salt in a wide glass dish in a cellar or the humid night air for some days — it melts into the Oil of Tartar per Deliquium, the caustic liquor the Ens work drinks. Handle as lye.",
        observe: "Nights against volume; the weather that fed it." },
    ],
  },

  // ═══ WATER WORK ═══════════════════════════════════════════════════════

  dew: {
    id: "dew", family: "water", tier: "practitioner",
    name: "The Dew Work (Mutus Liber)",
    source: "Mutus Liber (1677) pl. 4–9; Henshaw, Phil. Trans. (1665); Kirchweger, Golden Chain (1723); Barbault (1969)",
    apparatus: "Clean cloths or sheets and stakes, glass carboys, alembic, evaporating dishes",
    safety: ["Putrefying dew stinks and breeds insects — covered vessels, outdoors or garret.", "Distill once before any internal use; the modern sky is not the 17th-century sky."],
    desc: "The wordless book's own work: dew wrung from meadow cloths under Aries and Taurus before sunrise, putrefied to blackness, distilled and coagulated by turns, the grey earth calcined to its white salt — Henshaw weighed his to the ounce for the Royal Society.",
    lore: "Barbault called it the gold of a thousand mornings — twelve years of dawn collections, 40-day fermentations at 40 °C, toward his philosopher's peat. Storm water stood a month in a warm garret yields the Gur and the two salts of the Golden Chain.",
    steps: [
      { title: "Collect the dew before sunrise", dueRule: { sunSigns: [0, 1], preDawn: true }, fire: 0,
        instructions: "Sun in Aries or Taurus, clear still nights: stake out cloths at dusk (or drag sheets across the grass at dawn, which yields more — Barbault). Wring into a basin before the Sun rises; glass, not metal, receives it.",
        observe: "Date, weather, volume per morning; fresh May-dew runs faintly yellow (Henshaw)." },
      { title: "Putrefy to blackness", dueRule: { moonPhase: "waning", minDaysAfterPrev: 0 }, fire: 1,
        instructions: "Stand covered with cloth in gentle warmth, two to four weeks and more. Films form and sink within a day; the whole putrefies, stinks exceedingly, and lets fall a black sediment like mud (Henshaw). This is nigredo you can smell.",
        observe: "Film cycles; the black sediment's fall; the stench's arc." },
      { title: "Distill the spirited water", dueRule: { moonPhase: "waning", minDaysAfterPrev: 14 }, fire: 1,
        instructions: "Gentle bath distillation, repeated — dividing the water which has spirit from the water without. The wordless plates show the cucurbits passed hand to hand, over and over.",
        observe: "Fractions taken; any pellicle on the boil." },
      { title: "Calcine the earth, win the salts", dueRule: { moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 4,
        instructions: "Evaporate the putrefied residue, calcine the grey earth, leach and crystallize. Henshaw's two pounds of grey earth gave two ounces of fine white salt; the Golden Chain's cooled evaporate shoots into two crystal forms — a volatile nitre and a fixed salt.",
        observe: "Earth and salt weights; needle crystals against cubic." },
      { title: "Recombine and turn the wheel", dueRule: { moonPhase: "waxing", minDaysAfterPrev: 2 }, fire: 1,
        instructions: "The volatile over the fixed in a sealed vessel, circulated; then next spring's dew again. This is a work of seasons, not of weeks — the multiplication plates of the Mutus Liber are a life's calendar.",
        observe: "The long color march; dreams and synchronicities across the seasons — this work keeps its own diary in you." },
    ],
  },

  // ═══ MINERAL WORK ═════════════════════════════════════════════════════

  acetate: {
    id: "acetate", family: "mineral", tier: "adept",
    name: "Acetate Path — Copper (Venus) Variant",
    source: "Theory: Kirchweger, Golden Chain (1723); Hollandus (study-annex); modern: Bartlett, Way of the Crucible; Dubuis",
    apparatus: "Distilled vinegar stock, evaporating dishes, retort with deep cold trap (salt-ice), ventilation",
    safety: ["COPPER ONLY. The classical lead path is a poisoning protocol — it lives in the Library, not the laboratory.", "The dry distillation evolves flammable ketone spirit — cold trap, ventilation, no flames near the receiver.", "Copper salts are emetic; nothing from this path is taken internally."],
    desc: "The gateway metallic work in its one safe metal: copper dissolved in vinegar to the green-blue acetate, dried, and dry-distilled — the volatile 'philosophical mercury' caught in the cold trap first, the radical vinegar after, a sharpened menstruum for further mineral study.",
    steps: [
      { title: "Make the green acetate", dueRule: { planetDay: true, planetHour: true, moonPhase: "waxing" }, fire: 1,
        instructions: "Venus's day and hour: dissolve copper carbonate in distilled vinegar — living vinegar over glacial acid, say the practical archives — filter, and evaporate gently to the green-blue crystals. Recrystallize once for purity.",
        observe: "Crystal color and habit; the solution's clearing." },
      { title: "Dry the salt utterly", dueRule: { moonPhase: "waning", minDaysAfterPrev: 2 }, fire: 2,
        instructions: "The acetate must be bone-dry before the retort — residual water spoils the spirit. Gentle ash-bath heat, stirring, until it pours like sand.",
        observe: "Weight before and after drying." },
      { title: "Dry-distill into the cold trap", dueRule: { planetHour: true, moonPhase: "waning", minDaysAfterPrev: 1 }, fire: 3,
        instructions: "Retort charged, receiver deep in salt-ice, heat raised slowly through the third degree. The volatile spirit comes first — blue-tinted, acetone-sharp; watch for white fume events; in later fractions the heavier oil. Ventilate; nothing near a flame.",
        observe: "Fraction temperatures; the blue tint; fume events; oil droplets." },
      { title: "Rectify and reserve", dueRule: { planetHour: true, minDaysAfterPrev: 1 }, fire: 1,
        instructions: "Redistill the spirit gently in the bath; reserve the radical vinegar as a sharpened menstruum for further mineral study. Label everything; this shelf is not the kitchen's.",
        observe: "Yields; scent; any copper carried over (redistill it out)." },
    ],
  },

  vitriol: {
    id: "vitriol", family: "mineral", tier: "practitioner",
    name: "Green Vitriol & Colcothar",
    source: "the vitriol tradition (pseudo-Valentine corpus); Karpenko & Norris (2002)",
    apparatus: "Jars, filters, evaporating dish, small calcining dish",
    safety: ["Iron sulfate stains and irritates — gloves.", "The DISTILLATION of vitriol to its oil is study-only (see Library); this template stops far short of it."],
    desc: "The Mars work in its safe range: growing the green crystals of vitriol from solution, then the gentle calcination through white to the red colcothar — the caput mortuum that is itself the pigment of Mars. The V.I.T.R.I.O.L. acrostic made visible on a dish.",
    steps: [
      { title: "Grow the green crystals", dueRule: { planetDay: true, moonPhase: "waxing" }, fire: 0,
        instructions: "A saturated solution of iron sulfate, filtered clear, left to crystallize slowly on Mars's day — slower is larger. Harvest the green prisms and dry them on paper.",
        observe: "Crystal habit and size; the green's depth." },
      { title: "Calcine white", dueRule: { moonPhase: "waning", minDaysAfterPrev: 2 }, fire: 2,
        instructions: "Small amounts, gentle ash-bath heat: the green surrenders its water and pales to white — the first death of the vitriol.",
        observe: "The green-to-white transition; weight lost (the water)." },
      { title: "Calcine red — the colcothar", dueRule: { planetHour: true, minDaysAfterPrev: 1 }, fire: 4,
        instructions: "Stronger fire, outdoors: the white passes to the red colcothar, caput mortuum of vitriol. Rectificando — by repeated working — the hidden stone shows its colors. Stop here: the oil beyond needs fires and fumes no house should hold.",
        observe: "The color march white → red; the final pigment's shade against the classical caput mortuum." },
    ],
  },

  // ═══ CUSTOM ═══════════════════════════════════════════════════════════

  custom: {
    id: "custom", family: "custom", tier: "novice",
    name: "Custom Operation",
    source: "your own election",
    apparatus: "as the work requires",
    safety: ["Know the chemistry of what you heat before you heat it."],
    desc: "Your own process — three open steps timed to the planet's hour, with the lab record carrying the detail. Solve, work, coagula.",
    steps: [
      { title: "Opening operation", dueRule: { planetHour: true, planetDay: true }, fire: 1,
        instructions: "Begin in the planet's day and hour. Define the matter, the intent, and the endpoint in the lab record before the first heat.",
        observe: "The matter, the aim, the election." },
      { title: "Middle operation", dueRule: { planetHour: true, minDaysAfterPrev: 3 }, fire: 1,
        instructions: "Continue in the planet's hour; adjust as the matter requires. Solve et coagula — know which one you are doing.",
        observe: "What changed, and under what fire." },
      { title: "Closing operation", dueRule: { planetHour: true, minDaysAfterPrev: 3 }, fire: 1,
        instructions: "Complete and seal the work in the planet's hour. Record the outcome for Review.",
        observe: "The finished matter; what the next turn of the wheel should change." },
    ],
  },
};

export const TEMPLATE_ORDER = ["tincture", "water", "salttartar", "ferment", "ens", "magistery", "dew", "vitriol", "plantstone", "circulatum", "acetate", "custom"];
