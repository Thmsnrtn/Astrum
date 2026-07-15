// ═══════════════════════════════════════════════════════════════════════
// ALCHEMICAL OPERATIONS — spagyric process templates
// ═══════════════════════════════════════════════════════════════════════
// Each template is a sequence of steps whose dueRule constrains WHEN the
// step's window opens: the ruling planet's day/hour, the Moon's phase, and
// a minimum elapsed time since the previous step. resolveDueRule() in
// lib/athanor.js turns a rule into the next concrete datetime.
//
// dueRule fields:
//   planetHour: true      → during the operation planet's planetary hour
//   planetDay: true       → on the operation planet's day (astrological day)
//   moonPhase: "new" | "waxing" | "full" | "waning"
//   minDaysAfterPrev: n   → at least n days after the previous step

export const OPERATION_TEMPLATES = {
  tincture: {
    id: "tincture",
    name: "Spagyric Tincture",
    desc: "The classical three-principle preparation: Mercury (spirit), Sulfur (oil), and Salt (body) of a planetary herb, separated, purified, and recombined.",
    steps: [
      { title: "Begin maceration", dueRule: { planetHour: true, planetDay: true, moonPhase: "waxing" },
        instructions: "Grind the dried herb of the planet and cover with spirit (grain alcohol) in a sealed jar. Begin in the planet's day and hour under a waxing Moon. Speak the intention over the vessel." },
      { title: "First agitation", dueRule: { planetHour: true, minDaysAfterPrev: 2 },
        instructions: "Shake the vessel in the planet's hour. Observe the color drawn into the menstruum — the Sulfur beginning to separate. Note everything in the lab record." },
      { title: "Mid-cycle agitation", dueRule: { planetHour: true, minDaysAfterPrev: 7 },
        instructions: "Second agitation in the planet's hour. The tincture should be deepening. If pale, the matter may want more warmth — keep the vessel near gentle heat." },
      { title: "Filter at the Full Moon", dueRule: { moonPhase: "full", minDaysAfterPrev: 5 },
        instructions: "Filter the liquid from the plant body at the Full Moon. Set the tincture (Mercury + Sulfur) aside, sealed. Keep the marc — it becomes the Salt." },
      { title: "Calcine the body", dueRule: { planetHour: true, minDaysAfterPrev: 1 },
        instructions: "Burn the marc to grey ash, then to whiteness in a crucible. This is the death and purification of the body. Grind the white Salt fine." },
      { title: "Recombine and seal", dueRule: { planetHour: true, planetDay: true, minDaysAfterPrev: 2 },
        instructions: "Pour the tincture over the purified Salt in the planet's day and hour. The three principles reunited — the spagyric is complete. Seal, label with date and election, and record the finished work." },
    ],
  },
  water: {
    id: "water",
    name: "Planetary Water",
    desc: "A simple charged water of the sphere — the gentlest planetary preparation, good for washes, asperging, and consecrations.",
    steps: [
      { title: "Draw and charge the water", dueRule: { planetHour: true, planetDay: true },
        instructions: "Fill a clean vessel with pure water in the planet's day and hour. Add a pinch of the planet's herb. Hold the vessel and direct the planetary virtue into it — hymn, breath, and attention." },
      { title: "Overnight exposure", dueRule: { minDaysAfterPrev: 0 },
        instructions: "Leave the vessel exposed to the night sky (Moon and stars) overnight, covered with cloth or mesh. Bring it in before sunrise." },
      { title: "Seal and dedicate", dueRule: { planetHour: true, minDaysAfterPrev: 1 },
        instructions: "In the next hour of the planet, filter, bottle, and dedicate the water to its purpose. Use within one lunar cycle." },
    ],
  },
  ferment: {
    id: "ferment",
    name: "Fermentation Work",
    desc: "A slow transformation timed to the lunar cycle — mead, herbal ferment, or putrefaction stage of a longer work.",
    steps: [
      { title: "Begin at the New Moon", dueRule: { moonPhase: "new" },
        instructions: "Combine the matter and the ferment at the dark of the Moon — the nigredo begins in darkness. Seal with an airlock. Name the work and its intent aloud." },
      { title: "First inspection", dueRule: { minDaysAfterPrev: 7 },
        instructions: "Check activity, aroma, and clarity. Feed or stir if the process asks for it. Record all signs — the vessel is speaking." },
      { title: "Rack at the Full Moon", dueRule: { moonPhase: "full", minDaysAfterPrev: 5 },
        instructions: "Rack off the lees at the Full Moon, when the work is at its most expanded. Taste, assess, note." },
      { title: "Complete at the following New Moon", dueRule: { moonPhase: "new", minDaysAfterPrev: 7 },
        instructions: "Bottle or move the matter to its next stage as the cycle closes. One full lunation has passed through the vessel." },
    ],
  },
  custom: {
    id: "custom",
    name: "Custom Operation",
    desc: "Your own process — three open steps timed to the planet's hour. Edit the notes as you go; the lab record carries the detail.",
    steps: [
      { title: "Opening operation", dueRule: { planetHour: true, planetDay: true },
        instructions: "Begin the work in the planet's day and hour. Define the matter, the intent, and the endpoint in the lab record." },
      { title: "Middle operation", dueRule: { planetHour: true, minDaysAfterPrev: 3 },
        instructions: "Continue the process in the planet's hour. Adjust as the matter requires." },
      { title: "Closing operation", dueRule: { planetHour: true, minDaysAfterPrev: 3 },
        instructions: "Complete and seal the work in the planet's hour. Record the outcome for review." },
    ],
  },
};
