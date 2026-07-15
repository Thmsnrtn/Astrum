// ═══════════════════════════════════════════════════════════════════════
// THE 15 BEHENIAN FIXED STARS — verified talismanic materia
// ═══════════════════════════════════════════════════════════════════════
// Sources read in full (July 2026):
//   Agrippa, Three Books of Occult Philosophy (1651 trans., Peterson ed.,
//     esotericarchives.com): I.32 (stones & herbs), I.47 (Of Rings — the
//     construction rule), II.31 (natures), II.47 (images), II.52 (sigils)
//   "Hermes on the 15 Fixed Stars" (Tabula variant, Bodleian MS 52,
//     trans. J.M. Greer via Joan Evans, Magical Jewels App. G)
//   Ptolemy, Tetrabiblos I.9 (natures cross-checked; divergences stored)
//   J2000 longitudes rotated from the Swiss Ephemeris ICRS catalog.
// The sigils of the 15 stars are woodcut drawings (Agrippa II.52, 1531
// quarto) with seven manuscript variant sets — no structured encoding
// exists, so they are described, not drawn, here.
//
// keyed by the star's name in the app's FIXED_STARS catalog.

export const BEHENIAN_DOCTRINE = {
  ring: "“When any Star ascends fortunately, with the fortunate aspect or conjunction of the Moon, we must take a stone and herb that is under that Star, and make a Ring of the metal that is suitable to this Star, and in it fasten the stone, putting the herb or root under it — not omitting the inscriptions of images, names, and characters, as also the proper suffumigations.” — Agrippa I.47",
  thebit: "“Thebit adviseth us, for the taking of the virtue of any Star, to take the stone and herb of that plant when the Moon doth either fortunately get under, or hath a good aspect on, that Star.” — Agrippa II.32",
  election: "In practice: elect the moment the star's precessed zodiacal degree rises or culminates, with the Moon corporally joined to the star or applying by good aspect, the star unafflicted. The Mansions and Elections screens supply the Moon's condition; the star's degree is in the catalog.",
  sigils: "The famous fifteen characters are printed in Agrippa II.52 — “Characters which Hermes assigned to the fixed stars, and Behenii” — as woodcut drawings only; the manuscript tradition (Quadripertitus, Tabula, Liber Enoch, Liber Thebit) carries seven variant sets. They resist encoding; draw them from the 1531 plates.",
};

export const BEHENIAN = {
  "Algol": { latin: "Caput Algol", stone: "Diamond", herb: "Black hellebore & mugwort",
    nature: "Saturn & Jupiter (Agrippa II.31)", ptolemy: "agrees (Perseus = Saturn & Jupiter); the modern Saturn/Mars reading is Robson-era",
    image: "The head of a man with a bloody neck.",
    virtue: "Success in petitions; boldness and magnanimity; preserves the body; protects against witchcraft and reflects curses back upon their senders." },
  "Alcyone": { latin: "Pleiades", stone: "Crystal (rock crystal)", herb: "Fennel, with frankincense",
    nature: "Moon & Mars (Agrippa II.31)", ptolemy: "diverges: Moon & Jupiter",
    image: "A little virgin, or the figure of a lamp.",
    virtue: "Increases and preserves eyesight; assembles spirits; raises winds; reveals secret, hidden, and lost things." },
  "Aldebaran": { latin: "Oculus Tauri", stone: "Carbuncle (ruby)", herb: "Milk thistle & woodruff",
    nature: "Mars & Venus (Agrippa II.31)", ptolemy: "agrees (the Torch = Mars)",
    image: "The likeness of God, or of a flying man.",
    virtue: "Riches and great honors — the seed under a carbuncle with its character." },
  "Capella": { latin: "Hircus / Alhajoth — the Goat Star", stone: "Sapphire", herb: "Horehound, with mint, mugwort, mandrake",
    nature: "Jupiter & Saturn (Agrippa II.31)", ptolemy: "diverges: Mars & Mercury",
    image: "A man making himself merry with musical instruments.",
    virtue: "Makes the bearer acceptable, honored, and exalted before kings and princes; heals the teeth." },
  "Sirius": { latin: "Canis Major — the greater Dog-star", stone: "Beryl (golden beryl)", herb: "Savine juniper, mugwort, dragonwort",
    nature: "Venus (Agrippa II.31)", ptolemy: "diverges: Jupiter with some Mars",
    image: "A hound and a little virgin.",
    virtue: "Honor, goodwill, and the favor of men and of the aerial spirits; power to pacify and reconcile kings, princes, and spouses." },
  "Procyon": { latin: "Canis Minor — the lesser Dog-star", stone: "Agate", herb: "Marigold flowers & pennyroyal",
    nature: "Mercury & Mars (Agrippa II.31)", ptolemy: "agrees",
    image: "A cock, or three little maids.",
    virtue: "The favor of gods, spirits, and men; great power against witchcraft; preserves health." },
  "Regulus": { latin: "Cor Leonis — the King's star", stone: "Garnet", herb: "Celandine, mugwort, mastic",
    nature: "Jupiter & Mars (Agrippa II.31)", ptolemy: "agrees",
    image: "A lion or cat, or an honorable person sitting in a chair.",
    virtue: "Renders a man temperate, appeases wrath, gives favor; takes away anger and melancholy." },
  "Alkaid": { latin: "Cauda Ursae Maioris — Tail of the Great Bear", stone: "Loadstone (magnet)", herb: "Succory (chicory), whose leaves turn north; mugwort, periwinkle",
    nature: "Venus & Moon (Agrippa II.31)", ptolemy: "diverges: Mars",
    image: "A pensive man, or a bull, or the figure of a calf.",
    virtue: "Against incantations; makes the bearer secure in travel. Often misnamed Polaris — Agrippa's 19° Virgo (1531) can only be Alkaid.",
    variant: "Picatrix III.7's sole fixed-star working uses this star for vengeance upon an enemy." },
  "Algorab": { latin: "Ala Corvi — Wing of the Crow", stone: "Black onyx", herb: "Burdock (seed, leaves, root); henbane, comfrey",
    nature: "Saturn & Mars (Agrippa II.31)", ptolemy: "agrees (Corvus = Mars & Saturn)",
    image: "A raven, or snake, or a black man clothed in black.",
    virtue: "Double-edged: makes bold and choleric, causes evil dreams — but gives power to drive away and to gather evil spirits, and protection against the malice of men, devils, and winds.",
    variant: "Agrippa gives both wings — Gienah (10° Libra) and Algorab (13° Libra); either serves." },
  "Spica": { latin: "Spica Virginis", stone: "Emerald", herb: "Sage, with trefoil, periwinkle, mugwort, mandrake",
    nature: "Venus & Mercury (Agrippa II.31)", ptolemy: "diverges slightly: Venus with some Mars",
    image: "A bird, or a man laden with merchandise.",
    virtue: "Riches and increase of gold; overcoming contention; victory in lawsuits; frees from evil and anguish." },
  "Arcturus": { latin: "Alchameth", stone: "Jasper (especially green)", herb: "Plantain",
    nature: "Mars & Jupiter (Agrippa II.31)", ptolemy: "agrees",
    image: "A horse or wolf, or a man dancing.",
    virtue: "Medicinal — good against fevers; astringes and retains blood." },
  "Alphecca": { latin: "Elpheia — the Northern Crown", stone: "Topaz", herb: "Rosemary, trefoil, ivy",
    nature: "Venus & Mars (Agrippa II.31)", ptolemy: "diverges: Venus & Mercury",
    image: "A hen, or a man crowned and advanced.",
    virtue: "The goodwill and love of men; chastity; friendship and honor with God and man." },
  "Antares": { latin: "Cor Scorpii", stone: "Sardonyx & amethyst", herb: "Long birthwort & saffron",
    nature: "Mars & Jupiter (Agrippa II.31)", ptolemy: "agrees",
    image: "A man armed in a coat of mail, or the figure of a scorpion.",
    virtue: "Understanding and memory; a healthy color and the appearance of wisdom; drives away and binds evil spirits." },
  "Vega": { latin: "Vultur Cadens — the Falling Vulture", stone: "Chrysolite", herb: "Succory & fumitory (some manuscripts: winter savory)",
    nature: "Temperate — Mercury & Venus (Agrippa II.31)", ptolemy: "agrees (Lyra = Venus & Mercury)",
    image: "A vulture or hen, or a traveller.",
    virtue: "Magnanimity and pride; power over devils and beasts; protects against demons, nocturnal phantoms, and fears." },
  "Deneb Algedi": { latin: "Cauda Capricorni", stone: "Chalcedony", herb: "Marjoram, mugwort, catnip, mandrake root",
    nature: "Saturn & Mercury (Agrippa II.31)", ptolemy: "diverges: Saturn & Jupiter",
    image: "A hart, or goat, or an angry man.",
    virtue: "Bestows prosperity and increases wrath (Agrippa); favor in lawsuits, the improvement and security of the home, increase of riches (Hermes)." },
};

export function getBehenian(name) { return BEHENIAN[name] || null; }
