// ═══════════════════════════════════════════════════════════════════════
// LEARN PRIMERS — static, sourced seed content
// ═══════════════════════════════════════════════════════════════════════
// Every foundation module and each app-grounded topic ships a primer that
// works with no API key: what the thing is, where it comes from, how this
// app embodies it, and what to read. Sources follow the same standard as
// the rest of the data layer — named texts, honest about modern layers.
// The AI tutor builds on these; it no longer carries the whole weight.

export const FOUNDATION_PRIMERS = {
  f1: {
    title: "Animism & the Living World",
    body: `Animism is not a belief bolted onto magic — it is the operating assumption underneath every traditional practice this app contains: the world is a community of persons, most of whom are not human. Plants, rivers, planets, the dead — the question is never whether they are alive but what kind of relationship you have with them.

The practical consequence is that magic works like diplomacy, not engineering. You do not "use" a planetary hour; you call on the planet in the hour when it holds court. Offerings, greetings, reciprocity, and consistency matter more than technique. Graham Harvey's definition is the modern academic anchor ("the world is full of persons, only some of whom are human, and life is always lived in relationship with others"); Gordon White's Ani.Mystic is the practitioner's restatement this app's tradition-prompts draw on.

Begin here: choose one non-human person in your bioregion — a tree, a river, the Moon — and greet it daily for a lunation. Note responses in the Journal. That is the whole foundation; everything else is elaboration.`,
    sources: ["Graham Harvey, Animism: Respecting the Living World (2005)", "Gordon White, Ani.Mystic (2022)", "Irving Hallowell, 'Ojibwa Ontology, Behavior, and World View' (1960)"],
    inApp: "The Traditions in Profile carry the animist framing into every AI feature; the Journal is where the relationship record lives.",
  },
  f2: {
    title: "Timing & the Sky",
    body: `The oldest layer of magical technique is when, not what. The system has three tiers. The planetary days and hours: each day belongs to a planet, and the hours from sunrise are dealt in the Chaldean order, so the first hour of the day always belongs to the day's ruler (Agrippa II.34) — begin a planet's work on its day, in its hour. The Moon: her phase sets the tide (waxing builds, waning clears), her sign and mansion color the work, and void of course she completes nothing (the oldest rule in electional astrology). The election: for important work, the full chart — the working planet dignified, angular, the Moon applying to it, the malefics quiet (Agrippa I.29: "thou shalt do nothing without the assistance of the Moon").

This app computes all three tiers live: the hour ring on the Sky screen, the mansions wheel, and the Elections scanner that scores windows against fourteen classical criteria. The discipline is simply to consult them before you act — and to record what you did, so Review can tell you which timing factors actually move your results.`,
    sources: ["Agrippa, Three Books of Occult Philosophy I.29, II.34 (1533)", "Picatrix I.4 (mansions)", "Culpeper, The English Physitian (1652) — gathering elections", "Junius, Practical Handbook of Plant Alchemy ch. 6 (1979)"],
    inApp: "Sky (hours), Mansions, Elections, Calendar — and every casting records the timing automatically.",
  },
  f3: {
    title: "The Dead & the Ancestors",
    body: `Across every tradition this app touches, the ancestors are the foundation of the spirit-relationship stack — the most motivated, most accessible allies a practitioner has, because you are their stake in the world. The practice is ancient and nearly universal: a dedicated surface, fresh water, light, and regular address by name. Reciprocity, not worship — you feed the current, the current feeds you.

The classical world institutionalized this (the Roman lares and parentalia, the Greek heroes); folk traditions never stopped (the saints and the beloved dead of rootwork and folk Catholicism); the modern revival (White's "ancestor current") simply names what survived. Two practical cautions carried by every tradition: tend the recent dead before the mighty dead, and keep the ancestor surface separate from working altars.

Begin with water, a candle, and names, weekly on Saturn's day or Monday. Note what changes over a season — traditionally: doors opening, warnings in dreams, the sense of a house at your back.`,
    sources: ["Ovid, Fasti II (Parentalia)", "Daniel Foor, Ancestral Medicine (2017)", "Gordon White, The Chaos Protocols ch. on the dead (2015)"],
    inApp: "Record ancestor sessions in the Journal; the Oracle's animist framing assumes the current is tended.",
  },
  f4: {
    title: "Divination & Fortune",
    body: `Divination is the read channel of the same line magic writes on. The traditional forms sort by mechanism: sortilege (lots, cards, geomancy — pattern summoned into randomness), omens (pattern observed in the world — the original meaning of augury), and vision (dream incubation, scrying). Astrology spans all three: the horary chart is a lot cast on the sky itself.

Two disciplines make divination real rather than decorative. First, commitment: record the question, the answer, and — later — what actually happened. An unfalsifiable divination practice is entertainment. Second, the follow-up rule the horary tradition insists on: ask sincerely, ask once. The Review screen exists precisely to close this loop — a horary casting judged against outcome is worth a hundred unjudged readings.

Synchronicity deserves its own note: in the animist frame it is not "meaningful coincidence" but the response half of a call-and-response. Log it like data, because it is.`,
    sources: ["William Lilly, Christian Astrology (1647) — horary method", "Cicero, De Divinatione (44 BC) — the classical taxonomy", "C.G. Jung, Synchronicity (1952) — the modern frame, flagged as modern"],
    inApp: "Horary casts the chart of the question; Review judges it; the Journal holds dreams and omens.",
  },
  f5: {
    title: "The Blended Cycle Model",
    body: `Your practice happens inside history, and history has astrological weather. The model layers three time-scales: personal (profections, firdaria, transits to your natal chart), generational (the outer planets' sign-eras — Pluto's ~20-year signatures, Neptune's ~14, Uranus's ~7), and civilizational (the Jupiter–Saturn conjunction cycle, whose ~200-year elemental "mutations" have marked epochal shifts since Mesopotamian astrology first tracked them; the 2020 conjunction opened the first Air mutation since 1226).

The practical claim, drawn from mundane astrology's revival (Rudhyar, Charles Harvey, Gordon White's synthesis): operations aligned with the macro-weather run downhill. Aquarian-era work — networks, knowledge, decentralization — carries a tailwind that late-Earth-era institutional forms no longer have. The Cycles screen holds the dated historical parallels; the Elections screen already weights macro context.

This layer is honest about itself: the cycle data is classical, the "blended" synthesis is modern.`,
    sources: ["Dane Rudhyar, Astrological Timing (1969)", "Baigent, Campion & Harvey, Mundane Astrology (1984)", "Gordon White, The Chaos Protocols (2015)"],
    inApp: "Cycles (macro), Fractal (personal, a modern synthesis), Natal profections and firdaria.",
  },
  f6: {
    title: "Building Your Posse",
    body: `The lone-operator model of magic is a modern distortion; every traditional practitioner worked inside a team of unseen relationships. The classical stack, bottom to top: the ancestors (foundation — see that module), a fortune or luck entity (a deity or spirit of roads and increase — Hermes at the crossroads, Fortuna, the folk saints of money), the personal daimon (the agathodaimon of the Greeks, the natal genius the Renaissance astrologers located from the chart, the HGA of the moderns), and the working allies acquired by practice (plant spirits from the Athanor's devotional layer, the decan and mansion spirits, grimoire contacts).

Assembly is slow and sequential — ancestors first, always; the daimon cannot be rushed; allies accumulate through kept promises. The reciprocity economy runs on offerings, attention, and credit given publicly. What you get is not power but backing: the sense, confirmed in results, that your workings are co-signed.`,
    sources: ["Apuleius, De Deo Socratis (the daimon)", "Ficino, Three Books on Life III (the natal genius)", "Gordon White, The Chaos Protocols — the 'posse' framing (2015)"],
    inApp: "Planets carry each sphere's angel/intelligence/spirit; Review shows which allies' operations actually land for you.",
  },
  f7: {
    title: "Grimoire & the 72 Spirits",
    body: `The Solomonic grimoires — the Goetia of the Lemegeton foremost — preserve late-antique spirit rosters filtered through medieval Christian exorcism. The 72 spirits with their seals, offices, and ranks are a directory of specialized non-human contractors: knowledge, love, treasure, discord, languages, architecture.

Two working stances divide the modern revival. The classical-apparatus school works the system as written — circle, triangle, divine names, coercion — arguing the constraint structure exists for good reasons. The relational school (Jake Stratton-Kent's "spirit-congress" reading, White's "extradimensional diplomacy") reads the coercive frame as a churchy overlay on older pact-and-offering practice, and works by negotiation instead. Both agree on the fundamentals: know the spirit's office before calling, keep terms explicit, pay what you promise, and bank the relationship rather than the single result.

The Headless Rite (PGM V.96–172, the "Bornless" ritual) is the traditional empowerment that precedes goetic work — the operator takes on the authority in whose name the congress convenes.`,
    sources: ["The Lesser Key of Solomon (Lemegeton), 17th c.", "Jake Stratton-Kent, The True Grimoire & Geosophia (2009–10)", "PGM V.96–172 (the Headless Rite)"],
    inApp: "The Work screen's ceremonial tradition steps frame the operations; castings record every contact under its sky.",
  },
  f8: {
    title: "Narrative Magic & Synchronicity",
    body: `Enchantment operates on the story layer of reality — the frame within which events get their meaning and their momentum. The practical insight, ancient in myth and modern in formulation: you are always inside a story, so choose and tend the one you are in. Workings phrased as story-moves ("the chapter where the door opens") recruit the pattern-making engine that meanings actually run on.

Synchronicity is the feedback channel. In the call-and-response model, a working is a call; the "baroque coincidences" that follow are the response — confirmation, redirection, or refusal. The discipline is the same as all divination: log them, date them, and read the run of them rather than any single hit. A working that produces no synchronicities within a lunation missed, or was answered No.

This is the most modern module in the foundations — its sources are 20th-century — but it names something every traditional practice did implicitly through myth, festival, and omen-reading.`,
    sources: ["C.G. Jung, Synchronicity (1952)", "Gordon White, Pieces of Eight (2016) — shoaling & narrative frames", "Robert Anton Wilson, Prometheus Rising (1983) — the reality-tunnel frame"],
    inApp: "The Journal's outcome fields and Review's correlation analysis are the synchronicity ledger, made falsifiable.",
  },
  f9: {
    title: "The Stellar Tradition",
    body: `Beneath the planetary cult lies an older sky. The decans are Egyptian star-clocks from the coffin lids of the First Intermediate Period (21st century BC) — thirty-six asterisms that told the hour of the night, becoming thirty-six spirits with faces, images, and operations as they passed through the Hermetica, the Testament of Solomon, India, and the Picatrix. The Behenian stars are the fifteen the Hermetic tradition singled out for talismanic work — each with its stone, its herb, its image, and its character (Agrippa I.32, II.47, II.52).

The Star.Ships thesis (White, 2016) argues the stellar layer is the oldest stratum of human spirit-contact — Paleolithic, pre-agricultural, oriented to the risings of particular stars — and that decan and star magic is therefore the deepest well the Western practitioner can draw from. The academic case is contested; the practical case is simply that star magic works differently: slower, stranger, less transactional than planetary work.

Election rule for star work (Agrippa I.47, Thebit): the star rising or culminating, the Moon conjoined to it or applying by good aspect.`,
    sources: ["Picatrix II.11 (the 36 faces)", "Agrippa I.32, I.47, II.31, II.47, II.52 (the Behenian stars)", "Gordon White, Star.Ships (2016) — modern thesis, flagged as such", "O. Neugebauer & R. Parker, Egyptian Astronomical Texts (the star clocks)"],
    inApp: "Decans holds all 36 verified images; Stars carries the full Behenian materia and Thebit's election rule on every star card.",
  },
};

export const TOPIC_PRIMERS = {
  "planetary-hours": {
    body: `The day runs from sunrise, not midnight, and its hours belong to the planets in the Chaldean order (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon, repeating). Daylight is divided into twelve equal parts, night into twelve — so the hours stretch and shrink with the season, and the first hour of every day belongs to the day's own ruler (Agrippa II.34). That first hour after sunrise is the classical prime window: Jupiter's work on Thursday at dawn.

The rule of use is Agrippa I.29: work a planet's matter "in the day, hour, and in the Figure of the Heaven" — day and hour are the minimum election, the full chart the ideal.`,
    sources: ["Agrippa II.34, I.29", "Junius ch. 6 (the six hour-systems)"],
    inApp: "The Sky screen's hour ring computes true unequal hours for your location; Ambient Practice can notify you at chosen planets' hours.",
  },
  "lunar-timing": {
    body: `Three lunar dials, in order of force. Phase: waxing builds and enriches, waning clears and separates; new moons begin great works (Junius); full moons harvest. Void of course: after her last aspect in a sign, the Moon completes nothing begun — the most universal prohibition in electional astrology. Mansions: the 28 stations of Picatrix I.4, each favoring and forbidding its own matters — the oldest electional framework of all, older than the zodiac division it rides on.

The Moon is the transmitter: "she carries every planet's virtue to earth" (Dorotheus, via the whole tradition). Every other election is negotiable; her condition is not.`,
    sources: ["Picatrix I.4 (mansions)", "Dorotheus of Sidon, Carmen Astrologicum I", "Lilly, Christian Astrology (VoC in practice)"],
    inApp: "Mansions screen (wheel, meanings, next entries), VoC warnings throughout, moon tide in the Athanor's Season.",
  },
  "electional": {
    body: `Electional astrology chooses the birth-moment of a working, because the working takes the chart of its beginning as a natal chart. The classical checklist, in the order the tradition weights it: the Moon first (not void, not in the Via Combusta, not besieged, applying to your working planet), the working planet second (essentially dignified, direct, clear of the Sun's beams), the angles third (planet or its dispositor on the Ascendant or Midheaven), and the malefics quieted throughout.

This app's scanner scores fourteen such criteria; the five critical ones disqualify outright. The refinement beyond the scanner is Junius's: the operation begins at the minute of first contact — elect that minute.`,
    sources: ["Dorotheus, Carmen Astrologicum V", "Ramesey, Astrologia Restaurata (1653)", "Agrippa I.29"],
    inApp: "Elections (live + scan), Calendar (month grid), and the ⚑ commit buttons that record every elected window as a casting.",
  },
  "decans": {
    body: `Thirty-six faces of ten degrees, ruled in the descending Chaldean order entered at Aries I = Mars. Each carries an image — "a black man, restless, red-eyed, an axe in his hand, girt in white" (Aries I) — and an operation, preserved in Picatrix II.11 and reworked in Agrippa II.37. The rule of use (Picatrix II.11 §39): craft the image in the material of the face's ruler, in that planet's hour, and the dignity hierarchy runs term > face > house.

The Golden Dawn mapped the 36 faces onto the tarot's pips (2–10 of each suit), which is why the Sun's current decan names a card on the Decans screen.`,
    sources: ["Picatrix II.11 (Attrell/Porreca trans.)", "Agrippa II.37", "Golden Dawn Book T (1888)"],
    inApp: "Decans holds all 36 verified images with both traditions and variants; the Sky screen tracks the Sun's current face.",
  },
  "fixed-stars": {
    body: `Fifteen stars carry the Hermetic talismanic tradition — the Behenian stars of Agrippa I.32: each with a stone, an herb, an image, and a woodcut character (II.52). Regulus tempers wrath under garnet and celandine; Spica increases gold under emerald and sage; Algol, handled justly, turns curses back under diamond and hellebore.

The election is different from planetary work (Agrippa I.47; Thebit in II.32): the star rising or culminating, with the Moon corporally joined to it or applying by good aspect. Stars precess ~1° in 72 years — this app computes their true current places from the Swiss Ephemeris rather than trusting old tables.`,
    sources: ["Agrippa I.32, I.47, II.31, II.47, II.52", "Hermes on the 15 Fixed Stars (Bodleian MS 52, trans. Greer)", "Ptolemy, Tetrabiblos I.9 (natures)"],
    inApp: "Stars — every Behenian star carries its full materia card and Thebit's rule; conjunctions to your natal chart are flagged live.",
  },
  "essential-dignities": {
    body: `Dignity measures how much of itself a planet can be where it stands. Domicile: the planet in its own sign, at home, full strength. Exaltation: an honored guest, brilliant but less rooted. Detriment and fall: the mirror positions, exiled and humiliated. Peregrine: no dignity at all — a wanderer, easily led. Below the sign level run the triplicity rulers (by sect), the terms or bounds (the Egyptian sub-divisions this app uses), and the faces — the weakest dignity, "the last dignity before peregrination."

For magic the doctrine is load-bearing: a talisman fixes the planet's condition at election, so the tradition demands domicile or exaltation and refuses combustion — a planet within ~8° of the Sun is burned away, except in the heart of the Sun (cazimi), where it is throned.`,
    sources: ["Ptolemy, Tetrabiblos I.17–23", "Lilly, Christian Astrology ch. 18 (the point system)", "Dorotheus I (triplicities)"],
    inApp: "Every screen colors planets by dignity; Elections weights dignity 25 points of 100 and disqualifies combustion.",
  },
  "planetary-magic": {
    body: `The seven spheres are the grammar of the whole Western system: every day, hour, metal, stone, herb, incense, number, angel, intelligence, and spirit sorts under one of them. The working method is correspondence plus timing: assemble the planet's materia (Agrippa I.22–29 catalogs it), work in its day and hour with it dignified, and address the sphere through its chain — the angel governs, the intelligence guides, the spirit executes (Agrippa's Nakhiel and Sorath for the Sun).

Ficino's gentler version — planetary music, colors, scents, and regimen as therapeutic magic — is the same system tuned for daily life rather than operation, and is the ancestor of this app's ambient layer.`,
    sources: ["Agrippa I.22–29, II.22 (kameas & spirit names)", "Ficino, Three Books on Life III (1489)", "Picatrix III (planetary petitions)"],
    inApp: "Planets holds each sphere's complete materia, ritual, Orphic hymn, and vowel; the Work and Talisman screens operationalize them.",
  },
  "talismans": {
    body: `A talisman is astrological force fixed into matter: elect the moment, prepare the material, inscribe the image or character, and consecrate — suffumigation, invocation, and statement of purpose — while the election holds. The Picatrix is the tradition's deep source; Agrippa II systematizes the tables (with a caveat this app preserves: his kamea-metal prescriptions in II.22 are not simply the metal-of-the-planet — Jupiter's square goes on silver).

The hierarchy of what can be fixed: planetary characters and kameas, the decan images (Picatrix II.11), the Behenian star rings (stone + herb + character, Agrippa I.47). The election is everything: "a talisman made under a weak sky is a weak talisman."`,
    sources: ["Picatrix (throughout; II.11 for decan images)", "Agrippa II.22, II.35–52", "Hermes on the 15 Fixed Stars"],
    inApp: "The Talisman workshop runs the whole pipeline — election, figure, consecration, record — and Review asks for the outcome.",
  },
  "geomancy": {
    body: `Geomancy is divination by earth — the oldest of the elemental oracles, carried out of the Arabic ilm al-raml ("science of the sand") into medieval Europe, where Agrippa gave it its standard Latin form. Sixteen figures, each four rows of a single or double dot, are all it uses. You cast four Mothers (originally by making rows of marks in sand or on paper without counting, then taking each row's parity — odd is single, even is double). From the Mothers the whole chart derives by two operations: the four Daughters by transposition (reading the Mothers' rows as columns), and the Nieces, two Witnesses, and Judge by addition — combining figures row by row, like parities making a double, unlike making a single.

The Judge is the answer folded into one figure, and a beautiful property guarantees the work: the Judge is always one of the eight "even" figures, so an odd Judge means you erred. The Right Witness is the querent's side and the road travelled, the Left the outcome and the road ahead. For a fuller reading the twelve figures fall into the astrological houses — Mothers to I–IV, Daughters to V–VIII, Nieces to IX–XII — and you judge whether the querent's significator (the 1st house) and the quesited's (the house of the matter, as in horary) "perfect" by occupation, conjunction, mutation, or translation. Geomancy is earthier and more decisive than a horary chart: it answers plainly.`,
    sources: ["Agrippa, Fourth Book of Occult Philosophy — Of Geomancy (1655 trans.)", "J.M. Greer, The Art and Practice of Geomancy (2009)", "Regardie, A Practical Guide to Geomantic Divination (Golden Dawn)"],
    inApp: "The Geomancy screen casts and derives the whole shield, shows the Judge's verdict and the house chart, and saves each reading as a casting judged in Review.",
  },
  "hermetic-lots": {
    body: `A lot (Greek klēros, Latin pars; the medieval "Arabic Part" is a misnomer — the doctrine is Hellenistic) is a sensitive point derived by arithmetic, not a body. You measure the arc between two chart factors and swing it out from the Ascendant. The two hinges are the Lot of Fortune and the Lot of Spirit. Fortune is the lunar lot: the body, health, livelihood, and what fortune hands you unbidden. Spirit is the solar lot (the Daimon): the soul, the will, career and deliberate action. They mirror each other across the Ascendant — Fortune by day is Asc + Moon − Sun, Spirit is the reverse, and by night both formulas swap.

That swap is the crux of the whole doctrine: the lots are sect-aware. A day chart and a night chart with identical planets yield different lots. The five lesser lots swing from Fortune and Spirit: Eros (Venus — desire and love), Necessity (Mercury — constraint and enmities), Courage (Mars — boldness), Victory (Jupiter — success and hope), and Nemesis (Saturn — retribution and the hidden). Two conventions differ on Eros and Necessity: Valens computes them as pure mirrors of Fortune and Spirit; Paulus Alexandrinus substitutes the significator planet (Venus, Mercury) — the version the modern Hellenistic revival and standard software adopt. Read a lot by its sign, its whole-sign house from the Ascendant, and above all the condition of its ruling planet.`,
    sources: ["Paulus Alexandrinus, Introduction (Schmidt / Project Hindsight trans.)", "Vettius Valens, Anthology II", "Chris Brennan, Hellenistic Astrology: The Study of Fate and Fortune (2017) & The Theoretical Rationale Underlying the Seven Hermetic Lots (2010)"],
    inApp: "The Lots screen computes all seven sect-aware from either your natal chart or the sky now, with each lot's sign, degree, and whole-sign house, and an optional Hellenistic reading.",
  },
  "sigils": {
    body: `Two lineages share the name. The classical sigil is derived, not designed: a spirit's name traced by gematria across a planetary kamea (the seals of Agrippa II.22's intelligences and spirits), or a character received in the grimoire tradition. The modern sigil (Austin Osman Spare, systematized by chaos magic) is manufactured from intent: write the desire, strike the repeating letters, compress the remainder into a glyph, charge it in gnosis, and forget it.

White's shoaling refinement: fire several related sigils together, anchored by one near-certainty (the "robofish"), so no single working carries the lust of result. Both lineages meet at the same insight — the glyph slips past the censor that words alarm.`,
    sources: ["Agrippa II.22 (kamea seals)", "A.O. Spare, The Book of Pleasure (1913)", "Gordon White, Pieces of Eight (2016) — shoaling"],
    inApp: "The Sigil workshop holds all methods — Rose Cross, kamea, Agrippa seals, freehand — and every sigil becomes a casting.",
  },
  "great-work": {
    body: `The Great Work is tracked by color. Nigredo, the blackening: death and putrefaction of the starting matter — nothing true is built except on this death. Albedo, the whitening: the washed, lunar, silver state — the first great goal. Citrinitas, the yellowing: dawn of the solar tincture (folded into rubedo by most writers after the 15th century). Rubedo, the reddening: the Stone, the marriage of Sun and Moon. Between stages the peacock's tail — a flash of every color — heralds the threshold.

The sequence is Greco-Egyptian (1st century, attributed through Zosimos to Mary the Jewess) and runs equally in the flask and in the operator: Jung read the whole corpus as the psyche's individuation projected into matter — a modern reading, flagged as one, but one the modern laboratory tradition works with deliberately.`,
    sources: ["Zosimos of Panopolis (via the color doctrine)", "Ripley, The Compound of Alchymie (1471)", "Jung, Psychology and Alchemy (1944) — modern layer"],
    inApp: "The Athanor's Library holds the full stage doctrine; the Season shows where the year stands on the wheel.",
  },
  "alchemical-zodiac": {
    body: `Pernety's dictionary (1758) fixed the correspondence of the twelve alchemical processes to the twelve signs: Calcination under Aries, Solution under Cancer, Distillation under Virgo, Fermentation under Capricorn, Projection under Pisces. The Sun's sign therefore names the season's operation — the wheel of the year is the wheel of the Work. Junius applied the same key to the Moon's sign for day-to-day lab timing: "the position of the Moon for each day can be seen in an ephemeris."

Layer the planetary days over it (Saturn's day for calcination and fixation, Mercury's for distillation, the Moon's for dissolution) and the four degrees of fire (French, 1651), and the whole laboratory calendar assembles itself from the sky.`,
    sources: ["Pernety, Dictionnaire mytho-hermétique (1758)", "Junius, Practical Handbook ch. 6", "French, The Art of Distillation (1651)"],
    inApp: "The Athanor's Season chamber computes all of it live — Sun process, Moon key, tide, and the day's counsel.",
  },
  "spagyrics": {
    body: `Spagyria — Paracelsus's coinage, "separate and recombine" — is plant alchemy: divide the herb into its three principles, purify each, and reunite them. Mercury is the spirit (the fermented alcohol, one across the plant world), Sulfur the soul (the essential oil, unique to each plant), Salt the body (the purified mineral ash). The recombined essence is held to work on all three levels at once, which simple extraction cannot.

The craft is a devotional practice as much as a chemistry: the herb is gathered under its ruling planet (Culpeper's rule), the work begun in its day and hour, and the laboratory diary — Junius's "duty of every practicing spagyrist" — records vessel and operator alike.`,
    sources: ["Paracelsus, Opus Paramirum (c. 1531)", "Frater Albertus, The Alchemist's Handbook (1960)", "Junius, Practical Handbook of Plant Alchemy (1979)"],
    inApp: "The Athanor's plant operations run the full craft with timed steps; the spagyric tradition in Profile tunes the AI to it.",
  },
  "salt-work": {
    body: `Calcine, dissolve, filter, coagulate — repeated until the salt rises snow-white. Lémery's salt of tartar (1675) is the teaching form: char the tartar black, keep the fire until it whitens, dissolve the ashes in hot water, filter off the dead earth, evaporate in the sand heat, and do it all again until calcination releases neither carbon nor fume. Exposed to humid night air, the finished salt deliquesces into the caustic Oil of Tartar — the liquor the Ens tincture drinks.

It is the humblest work in the repertoire and the foundation of every other: the hands that have whitened a salt know fire, solution, and patience in their fingers, not their reading.`,
    sources: ["Lémery, A Course of Chemistry (1675)", "Basil Valentine (via Junius) on plant salts", "Bartlett, Real Alchemy ch. 6"],
    inApp: "The Athanor's Salt of Tartar operation walks the full cycle with timing and observation prompts.",
  },
  "mineral-study": {
    body: `The mineral works divide sharply into the practicable and the prohibited, and knowing which is which is the study. Practicable: the copper acetate path (the gateway metallic work — green crystals, dry distillation into the cold trap, the radical vinegar), and green vitriol grown and calcined through white to the red colcothar. Study-only, absolutely: the lead acetate path (Hollandus's recipe is, by modern knowledge, a poisoning protocol), all mercury and cinnabar work, antimony's fusions and fumes, the distillation of oil of vitriol, and every classical aurum potabile.

The texts remain essential reading — the Triumphal Chariot's doctrine, the Golden Chain's theory of the acetate — because the mineral works carry the tradition's deepest symbols. The emetic cups and sugar of lead are exactly why reading is the only safe apparatus for most of them.`,
    sources: ["Kirchweger, The Golden Chain of Homer (1723)", "'Basil Valentine', Triumphal Chariot of Antimony (1604)", "Bartlett, The Way of the Crucible (2009)"],
    inApp: "The Athanor's mineral operations stop at the safe line; its Library documents the five prohibited paths with their warnings.",
  },
  "dew-work": {
    body: `The Mutus Liber — the wordless book of 1677 — shows the work in pictures: cloths staked out under a sky flanked by the ram and the bull, wrung into basins before sunrise. Dew gathered under Aries and Taurus is the tradition's celestial water; stood warm and covered it putrefies to a black sediment within weeks (Henshaw weighed the process for the Royal Society in 1665 — two pounds of grey earth, two ounces of fine white salt), and the distilled spirit and crystallized salts recombine and circulate season over season.

Barbault worked it for twelve years — "the gold of a thousand mornings." It is the most patient work in the repertoire, chemically mild and calendar-bound, and the purest expression of the doctrine that the sky itself is the first matter.`,
    sources: ["Mutus Liber (1677), with Canseliet's commentary", "Henshaw, 'Observations upon May-dew', Phil. Trans. (1665)", "Barbault, Gold of a Thousand Mornings (1969)"],
    inApp: "The Athanor's Dew Work schedules collection to the pre-dawn of Aries–Taurus automatically — even if you start in July.",
  },
};
