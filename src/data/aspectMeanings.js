// ═══════════════════════════════════════════════════════════════════════
// ASPECT SIGNIFICATIONS — the planetary dialogues
// ═══════════════════════════════════════════════════════════════════════
// Traditional significations after the classical synthesis (Ptolemy's
// planetary natures, Lilly's delineation practice, the electional
// tradition's benefic/malefic weighting). Composed at runtime: each
// planet-pair carries its essential dialogue; each aspect names the mode
// of that dialogue. These are interpretive conventions of the tradition,
// not quotations.

const K = (a, b) => [a, b].sort().join("+");

export const PAIR_ESSENCE = {
  [K("sun","moon")]:      "The luminaries — will and body, king and people, the day and night of the soul. Their relation is the chart's fundamental weather.",
  [K("sun","mercury")]:   "The mind in the king's court — thought, speech, and the articulation of purpose. Never far apart; the question is only combustion or clarity.",
  [K("sun","venus")]:     "Grace at court — charm, art, and affection in the light of purpose. Warmth given form.",
  [K("sun","mars")]:      "Will and force — command and the soldier. Vitality doubled or authority challenged.",
  [K("sun","jupiter")]:   "The two benefactors of dignity — honor, expansion, favor from above, the king and the high priest.",
  [K("sun","saturn")]:    "Light against limit — authority tested by time, the father's weight, structures that endure or oppress.",
  [K("moon","mercury")]:  "Instinct and articulation — the tides given words. Memory, mood, and message move together.",
  [K("moon","venus")]:    "The two nocturnal receptives — comfort, sweetness, fertility, the arts of home and body.",
  [K("moon","mars")]:     "The body's tides against the blade — urgency, appetite, irritation, courage that runs on feeling.",
  [K("moon","jupiter")]:  "The people blessed — increase, protection, generosity of circumstance, the good harvest.",
  [K("moon","saturn")]:   "The tides bound — heaviness, delay, duty, the cold that preserves or starves.",
  [K("mercury","venus")]: "Eloquence and charm — persuasion, art in language, the diplomatic word, sweetness of exchange.",
  [K("mercury","mars")]:  "The sharpened tongue — debate, cutting analysis, strategy, the argument that wounds or wins.",
  [K("mercury","jupiter")]:"The scribe and the judge — counsel, doctrine, teaching, contracts and their meaning.",
  [K("mercury","saturn")]:"The mind under discipline — depth, skepticism, the slow thought that endures, melancholy of the scholar.",
  [K("venus","mars")]:    "Desire in both its hands — attraction and pursuit, art and heat, the lovers and their quarrel.",
  [K("venus","jupiter")]: "The greater and lesser benefic in concert — fortune, festivity, abundance, the sky's most generous conversation.",
  [K("venus","saturn")]:  "Love under law — loyalty, constraint, the old promise, beauty disciplined or denied.",
  [K("mars","jupiter")]:  "Force with a banner — crusade, enterprise, righteous (or self-righteous) action, victory sought at scale.",
  [K("mars","saturn")]:   "The two malefics in dialogue — the hard road: friction, endurance, cruelty or tempered steel, depending entirely on the mode.",
  [K("jupiter","saturn")]:"The great chronocrators — expansion against structure, the pair whose meetings mark the mutations of history.",
};

export const ASPECT_MODE = {
  "Conjunction": { tone: "union", text: "United in one place: the dialogue becomes a single voice — for better where natures agree, overwhelming where they don't." },
  "Sextile":     { tone: "opportunity", text: "An open door: the dialogue flows with ease if invited — the aspect of opportunity that must still be taken." },
  "Square":      { tone: "friction", text: "At cross purposes: the dialogue is an argument — productive if worked, destructive if ignored. Perfection comes with difficulty." },
  "Trine":       { tone: "harmony", text: "In full sympathy: the dialogue flows of itself — the gift that asks nothing, and is therefore easy to waste." },
  "Opposition":  { tone: "confrontation", text: "Face to face across the wheel: the dialogue is a negotiation between rivals — awareness through the other, or open contest." },
};

export function aspectMeaning(p1, p2, aspectName) {
  const essence = PAIR_ESSENCE[K(p1, p2)];
  const mode = ASPECT_MODE[aspectName];
  if (!essence || !mode) return null;
  return { essence, mode: mode.text, tone: mode.tone };
}
