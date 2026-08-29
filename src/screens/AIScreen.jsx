// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useRef } from "react";
import { aiConfigured, aiUnconfiguredMessage, askClaude } from "../ai/client.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { alchemicalSeason, moonSignOperation, moonWorkGuidance } from "../data/alchemy.js";
import { DECANS } from "../data/decans.js";
import { getMansion } from "../data/mansions.js";
import { P } from "../data/planets.js";
import { TRADITIONS } from "../data/traditions.js";
import { DAY_NAMES, OUTER_EPOCHS, dailyMotion, dateToJD, getCombustion, getDignity, lonToZodiac, outerPlanetLon, planetLon } from "../engine/astro.js";
import { profection } from "../engine/profections.js";
import { transitsToNatal } from "../engine/snapshot.js";
import { SIGN_NAMES } from "../engine/zr.js";
import { loadAthanor } from "../lib/athanor.js";
import { computeStats, loadCastings } from "../lib/castings.js";
import { feedInRange } from "../lib/intake.js";
import { groundingForAsync } from "../lib/rag.js";
import { review } from "../lib/srs.js";
import { loadJSON } from "../lib/storage.js";
import { F, L, T } from "../ui/theme.js";

export default function AIScreen({now,eph,fractal,natalPos,hour,profile}){
  const [messages,setMessages]=useState([{role:"assistant",content:"Greetings. I am your advisor in the classical tradition of celestial and talismanic magic — Picatrix, Agrippa, Ficino, Lilly, and the Hermetic corpus.\n\nTell me what you wish to accomplish and when you need it done. I will build you a complete working plan: optimal election windows, full materia requirements, a ritual structure rooted in the grimoire tradition, the relevant invocations, and a follow-up maintenance schedule.\n\nExample: \"I need to find a new position within 6 weeks\" or \"I want to begin a Venus talisman for an important relationship\" or \"Help me plan a Jupiter prosperity campaign.\""}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const buildContext=()=>{
    const positions=Object.entries(eph.pos).map(([pk,p])=>`${P[pk].name}: ${p.zodiac.degree}° ${p.zodiac.name} (${p.dignity}${p.isRetro?" retrograde":""}${p.combust?` ${p.combust.type}`:""}, score ${p.score})`).join(", ");
    const fd=fractal.levels.map(l=>`L${l.level}: ${l.decan.name} (${l.decan.sign}, ${l.decan.ruler})`).join(", ");
    const nd=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.dignity})`).join(", "):"No natal chart entered";
    const nextElections=[];
    for(let d=0;d<30;d++){
      const date=new Date(now.getTime()+d*86400000);
      const jd=dateToJD(date);
      const dow=date.getDay();
      ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
        const lon=planetLon(pk,jd),dm=dailyMotion(pk,jd);
        const isRetro=dm<0&&pk!=="sun"&&pk!=="moon";
        const dignity=getDignity(pk,lon);
        const combust=getCombustion(pk,lon,planetLon("sun",jd));
        if((dignity==="domicile"||dignity==="exaltation")&&!isRetro&&!combust&&nextElections.length<8){
          nextElections.push(`${DAY_NAMES[dow]} ${date.toLocaleDateString("en-US",{month:"short",day:"numeric"})}: ${P[pk].name} in ${lonToZodiac(lon).name} (${dignity})`);
        }
      });
    }
    return `CURRENT SKY (${DAY_NAMES[now.getDay()]} ${now.toLocaleDateString()}): Planetary Hour: ${P[hour.planet].name} (Hour ${hour.hourNum+1}, Day of ${P[hour.dayRuler].name}) Planetary Positions: ${positions} Moon: ${eph.moonPhase}${eph.voc?.isVoC?" — VOID OF COURSE":""} Current Decan (Sun): Decan ${eph.decanIdx+1} — ${DECANS[eph.decanIdx].name} (${DECANS[eph.decanIdx].sign}) Active Fractal Layers: ${fd} Natal Planets: ${nd} Upcoming Elections (next 30 days): ${nextElections.join("; ")||"Scanning..."}`;
  };
  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input};
    setMessages(m=>[...m,userMsg]);
    setInput("");setLoading(true);
    const context=buildContext();
    // RAG: ground the answer in the practitioner's own corpus — semantic
    // (hybrid) when a local embedding model is configured, BM25 otherwise.
    const grounding=await groundingForAsync(input);
    const systemPrompt=buildSystemPrompt(profile,context)+grounding;
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setMessages(m=>[...m,{role:"assistant",content:aiUnconfiguredMessage()}]);setLoading(false);return;}
    try{
      const txt=await askClaude({apiKey,system:systemPrompt,maxTokens:1500,messages:[...messages,userMsg].filter(m=>m.role!=="assistant"||messages.indexOf(m)>0).map(m=>({role:m.role,content:m.content}))});
      setMessages(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){
      setMessages(m=>[...m,{role:"assistant",content:e.message||"Unable to connect to the API."}]);
    }
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px",borderBottom:"1px solid rgba(200,175,100,0.07)"}}>
        <div style={L()}>AI Working Planner</div>
        <div style={T(20)}>Build a Working ✧</div>
        <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.6}}>Describe your goal and deadline. I'll build a complete magical operation plan from all traditions.</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {messages.map((m,i)=>(
          <div key={i} style={{marginBottom:14,display:"flex",gap:9,animation:"float-in 0.3s ease-out"}}>
            {m.role==="assistant"&&<div style={{width:24,height:24,borderRadius:12,background:"rgba(212,175,106,0.15)",border:"1px solid rgba(212,175,106,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,marginTop:2}}>✧</div>}
            <div style={{flex:1,maxWidth:"100%"}}>
              <div style={{borderRadius:m.role==="user"?12:14,background:m.role==="user"?"rgba(200,175,100,0.1)":"rgba(8,5,22,0.7)",border:`1px solid ${m.role==="user"?"rgba(200,175,100,0.2)":"rgba(200,175,100,0.09)"}`,padding:"11px 13px",backdropFilter:m.role!=="user"?"blur(16px)":"none"}}>
                <div style={{fontFamily:F,fontSize:11.5,color:"#C4A870",lineHeight:1.85,whiteSpace:"pre-wrap"}}>{m.content}</div>
              </div>
            </div>
            {m.role==="user"&&<div style={{width:24,height:24,borderRadius:12,background:"rgba(200,175,100,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2,color:"rgba(200,175,100,0.5)"}}>☽</div>}
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:9,marginBottom:14}}>
          <div style={{width:24,height:24,borderRadius:12,background:"rgba(212,175,106,0.15)",border:"1px solid rgba(212,175,106,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✧</div>
          <div style={{padding:"11px 13px",borderRadius:14,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.09)"}}>
            <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(200,175,100,0.4)",animation:`breathe 1.2s ease-in-out infinite`,animationDelay:`${i*0.3}s`}}/>)}</div>
          </div>
        </div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"8px 14px",borderTop:"1px solid rgba(200,175,100,0.07)",display:"flex",gap:8}}>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Describe your goal and deadline…" rows={2} style={{flex:1,resize:"none",fontSize:12,lineHeight:1.6}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{padding:"0 14px",borderRadius:10,background:input.trim()?"rgba(212,175,106,0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${input.trim()?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:10,color:input.trim()?"#D4AF6A":"#4A3020",letterSpacing:2,cursor:input.trim()?"pointer":"default",alignSelf:"flex-end",height:38}}>SEND</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LEARN TOPICS
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// CONTEXTUAL ORACLE
// ═══════════════════════════════════════════════════════════════════════
function buildOracleContext(tab,now,eph,fractal,natalPos,hour,profile){
  const dayName=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];
  const dateStr=now.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const hourPl=P[hour.planet].name;
  const moonStr=eph?.pos?.moon?`Moon ${eph.pos.moon.zodiac.degree}° ${eph.pos.moon.zodiac.name} (${eph.moonPhase}${eph.voc?.isVoC?" — VOID OF COURSE":""})`:"";
  const positions=eph?.pos?Object.entries(eph.pos).map(([pk,p])=>`${P[pk].name} ${p.zodiac.degree}° ${p.zodiac.name} (${p.dignity}${p.isRetro?" ℞":""}${p.combust?` ${p.combust.type}`:""}) score ${p.score}`).join("; "):"";
  const tradition=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(" + ")||"Western Ceremonial";
  const base=`${dayName} ${dateStr}, Hour of ${hourPl}. Tradition: ${tradition}. ${moonStr}. All planets: ${positions}.`;
  const natalStr=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.dignity})`).join(", "):"No natal chart.";
  const outerStr=Object.keys(OUTER_EPOCHS).map(p=>{const lon=outerPlanetLon(p,now);const sn=SIGN_NAMES[Math.floor(lon/30)%12];return`${OUTER_META[p].name} in ${sn}`;}).join(", ");
  const jsYrs=(((now.getTime()-new Date("2020-12-21").getTime())/(365.25*86400000))).toFixed(1);
  const macroCtx=`Macro cycles: ${outerStr}. Air Mutation (2020 Jupiter-Saturn conjunction): ${jsYrs} years in. ${CYCLE_LORE.plutoCurrent.substring(0,200)}...`;
  const runeContext=`Apply the animist framework: magic is call and response with a relational cosmos. Synchronicity is the primary channel through which results manifest. The ancestor current is the foundation. "Extradimensional diplomacy" — spirits are persons with agendas, not tools. The practitioner is building wyrd — a web of fortunate relationships — not just executing operations. Consider what the story of this moment calls for.`;
  switch(tab){
    case "sky": return `${base} ${macroCtx} Active decan: ${DECANS[eph.decanIdx].name} (${DECANS[eph.decanIdx].sign}, ruler ${DECANS[eph.decanIdx].ruler}). Fractal coherence: ${fractal.cosmicCoherence}%, active layers: ${fractal.levels.slice(0,2).map(l=>l.decan.name).join(", ")}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read this celestial moment with full depth — personal timing, generational context, and spirit ecology. What planetary conditions stand out? What does the animist cosmos say about the quality of this moment? What would you recommend — and what would you caution against? Name the specific spirit relationships most relevant right now.`;
    case "decans": return `${base} The Sun occupies the ${DECANS[eph.decanIdx].name} — the ${eph.decanIdx+1}th decan of ${DECANS[eph.decanIdx].sign}, ruled by ${DECANS[eph.decanIdx].ruler}. Its classical operations: ${DECANS[eph.decanIdx].magic}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Speak to this decan face as a stellar spirit, a presiding intelligence of this ten-day period — drawing on the Hermetic papyri (PGM) and the Star.Ships thesis that decans are among the oldest spirit contacts in the Laurasian tradition. What is the nature of this particular face? What operations does it favor? How does it interact with the current planetary and macro-cycle conditions? What synchronicities should the practitioner be watching for as a response from this decan?`;
    case "fractal": return `${base} Fractal timing layers: ${fractal.levels.map(l=>`L${l.level}: ${l.decan.name} (${l.decan.sign})`).join(", ")}. Cosmic coherence: ${fractal.cosmicCoherence}%. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read this moment of nested time using the blended cycle model — the fractal layers (personal timing) sit within the inner planet weather, which sits within the outer planet civilizational weather. Where do all three levels align? What does the convergence of these layers tell you about the magical opportunity or constraint right now? What story is this moment part of — in the practitioner's life and in the larger historical pattern?`;
    case "planets": return `${base} ${macroCtx} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Survey the state of the seven spheres through the lens of both personal and civilizational timing. Which planets are most empowered as channels for working? Which are afflicted? How does each planet's current condition relate to the macro-cycle context (Pluto in Aquarius, Neptune in Aries, Uranus entering Gemini, Air Mutation)? Which spirit relationships within the planetary hierarchy are most accessible right now, and what do they require as tribute?`;
    case "stars": {const ns=eph.nearStars?.map(s=>`${s.name} conj ${P[s.planet]?.name||s.planet} (${s.orb?.toFixed(1)}° orb)`).join(", ")||"No notable star conjunctions active";return `${base} Active fixed star conjunctions: ${ns}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Interpret the fixed star influences through the Star.Ships lens — these are stellar spirits from the oldest layer of the Laurasian tradition, predating the planetary cult. Each star carries the virtue of the spirit who resides there. What do the currently active star conjunctions portend? How do they modify the planets they conjoin? What specific operations, contacts, or synchronicities do they favor? If Sirius (Sothis) is active: give specific working recommendations for this most potent stellar contact.`;}
    case "natal": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read this practitioner's natal pattern through the blended cycle model — their natal planets define their personal spirit ecology (which planetary intelligences are their natural allies), while the current sky activates specific parts of that ecology. Which natal positions are being activated by current transits? What does the macrocycle context (their generation's signature) mean for their personal practice? What is their natural "posse" based on the natal chart — which planetary intelligences are their strongest allies? What ancestor work would most benefit this chart?`;
    case "elect": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Survey the quality of upcoming election windows with full depth. Consider: the Moon's condition (voC, Via Combusta, speed, phase) as the primary factor; the planet being elected (its dignity and dispositor); the macro-cycle context (which planets benefit from current Pluto/Neptune/Uranus signatures). What is the single strongest opportunity in the next two weeks? What should be avoided absolutely? And: what would you SHOAL — what group of related operations would benefit from being launched together as a sigil shoal, leaving outcome space open for Black Swan results?`;
    case "work": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Give a complete working recommendation for today. What planet or spirit entity should this practitioner work with? What is the specific materia required (by planetary correspondence)? What is the correct timing (hour, day, Moon condition)? What offering is appropriate? And critically: what is the narrative frame for this working — what story is the practitioner entering, and what role do they play in it? Include: the ancestor current that should be established first, the specific spirit relationship being invoked, and how the practitioner will recognize the call-and-response of a successful working.`;
    case "journal": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is reviewing their magical journal. What timing wisdom applies right now? What celestial and macrocycle conditions are worth recording as a snapshot for future reference? Specifically: what synchronicities should they be watching for as responses to past workings? How does the current moment fit into the larger story of their practice — what chapter are they in? What patterns in the journal would you, as an animist advisor, want to highlight?`;
    case "cycles": return `${base} ${macroCtx}\n${CYCLE_LORE.plutoCurrent}\n${CYCLE_LORE.neptuneCurrent}\n${CYCLE_LORE.uranusCurrent}\n${CYCLE_LORE.jsMutationCurrent}\n${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Synthesize the macro-cycle picture into actionable magical guidance. We are at this specific confluence of Pluto in Aquarius, Neptune entering Aries, Uranus entering Gemini, and 5 years into the first Air Mutation since 1226 CE. What does this multi-layered configuration demand of the serious magical practitioner? Which traditions and practices are most amplified by this civilizational weather? What is "ours to do" in Gordon White's framing — what should we be building, which spirits should we be cultivating, and what are we in the putrefactory phase of completing?`;
    case "aspects": {
      const aspStr=(eph.aspects||[]).slice(0,6).map(a=>`${P[a.p1].name} ${a.aspect.n} ${P[a.p2].name} (orb ${a.orb}°${a.applying?", applying":""})`).join("; ")||"No close aspects";
      return `${base} Current aspects: ${aspStr}. Antiscia contacts: ${(eph.antiscia||[]).length}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read the current aspect web as a live conversation among the planetary spirits. Which dialogue dominates the sky right now? Which applying aspect should the practitioner ride, and which should they let pass? Speak to how these aspects color any magical work undertaken today.`;
    }
    case "transits": {
      const hits=natalPos?transitsToNatal(eph.pos,natalPos):[];
      const hitStr=hits.length?hits.map(h=>`${P[h.transiting]?.name||h.transiting} ${h.aspect} natal ${P[h.natal]?.name||h.natal} (orb ${h.orb}°)`).join("; "):"No exact transits within orb";
      return `${base} Exact transits to the natal chart right now: ${hitStr}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: These transits are the sky's current address to this specific practitioner. What is being activated, tested, or offered? Which transit deserves a magical response — a working, an offering, a deliberate pause — and which asks only for observation?`;
    }
    case "ephemeris": {
      const retro=Object.entries(eph.pos).filter(([,p])=>p.isRetro).map(([pk])=>P[pk].name).join(", ")||"none";
      return `${base} Retrograde now: ${retro}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is studying the ephemeris — the raw calendar of the sky. What upcoming celestial mechanics (ingresses, stations, lunations, eclipses) most deserve preparation? What should be scheduled toward, and what should be scheduled around?`;
    }
    case "calendar": case "almanac": {
      let feedStr="";
      try{const today=now.toISOString().split("T")[0];const soon=new Date(now.getTime()+21*86400000).toISOString().split("T")[0];const f=feedInRange(today,soon);if(f.length)feedStr=` Timing letters flag: ${f.slice(0,6).map(e=>`${e.source} (${e.date}): ${e.title.slice(0,60)}`).join("; ")}.`;}catch(e){}
      return `${base}${feedStr} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is planning their month of workings. Read the quality of the coming weeks: where do the good windows cluster, what does the Moon's rhythm suggest for pacing, and how would you sequence a month of practice — elections, maintenance, rest — like a liturgical calendar? Where your own reading of the sky agrees with the timing letters above, say so; where it differs, say that too — the practitioner keeps the letters as one voice among several, their own record being another.`;
    }
    case "mansions": {
      const m=getMansion(eph.pos.moon.lon);
      return `${base} The Moon stands in mansion ${m.index} — ${m.arabic} (${m.latin}, "${m.translation}"), ${Math.round(m.progress*100)}% through. Its nature is ${m.nature}. Elect under it: ${m.elect} Avoid: ${m.avoid} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition and a reader of the Picatrix: Speak to this mansion as a station of the Moon's journey — the oldest electional framework in the tradition. What does ${m.arabic} favor in the coming hours? How does it combine with the Moon's phase and aspects right now? What working, if any, should be timed before the next mansion begins?`;
    }
    case "horary": return `${base} Moon: ${eph.moonPhase}${eph.voc?.isVoC?" — VOID OF COURSE (judgment unreliable)":""}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the tradition of Lilly's Christian Astrology: The practitioner is considering a horary question. Counsel them on the asking itself — is this moment radical enough to bear judgment (consider the void Moon above)? How should the question be framed so the chart can answer it? What makes a question sincere enough for horary?`;
    case "geomancy": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a master geomancer in the tradition of Agrippa and Greer: The practitioner is casting the sixteen figures. Counsel them on the asking — geomancy answers a clear, sincere, single question best. How should they frame this matter, and which house does it truly belong to? Speak briefly to the character of geomancy as an elemental oracle: the figures are built of odd and even, the whole answer folded into a single Judge — earthier and more decisive than the horary chart.`;
    case "spirits": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a diplomat of the unseen: The practitioner is tending their Spirit Court — the ancestors, planetary intelligences, saints, and spirits of place they work with. Counsel them on relationship as the foundation of the art: reciprocity before petition, offerings given freely and regularly, attention as the truest gift, and starting simple (water for the ancestors) before complicating the court. Remind them that spirits have their own natures and agendas — this is diplomacy, not commanding.`;
    case "omens": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a reader of signs: The practitioner is logging dreams, omens, and synchronicities. Counsel them on discernment — what distinguishes a genuine sign from noise, how the spirit world's call-and-response tends to arrive (clusters, repetitions, the uncanny angle), and how to hold an omen lightly until the pattern confirms itself. Synchronicity around a working is its confirmation; silence for a full lunar cycle is information too.`;
    case "chapters": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a Hellenistic astrologer versed in Valens: The practitioner is studying their Chapters — the annual profection (whose Lord of the Year colours everything) and zodiacal releasing from the Lots of Spirit and Fortune. Counsel them on reading the current period: the period ruler's natal condition, whether the time is a peak (angular from Fortune, the 10th being the culmination), what the loosing of the bond means when it comes (a decisive change of narrative), and how to align major undertakings with peak periods rather than fighting the quiet chapters.`;
    case "lunar": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a practitioner steeped in lunar timing: The practitioner is working with the current lunation. Counsel them on the rhythm of the month — planting intentions at the New Moon, taking action at the First Quarter, bringing workings to fruition and reviewing them at the Full, releasing and clearing at the Last Quarter, and resting/banishing in the Balsamic dark before the next New. Speak to how this cycle's intentions should be framed and what practice fits the current phase.`;
    case "lots": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a Hellenistic astrologer in the tradition of Paulus Alexandrinus and Vettius Valens: The practitioner is contemplating the seven Hermetic Lots — Fortune (the body and what fortune gives), Spirit (the soul and what one does by will), and the five that swing from them: Eros, Necessity, Courage, Victory, Nemesis. Remember that the lots are sect-aware — the formulas reverse between a day and a night chart. Counsel them on how to read Fortune and Spirit together as the two hinges of the chart, and how the lesser lots and their rulers colour the life. Be precise and traditional.`;
    case "talisman": {
      const strong=Object.entries(eph.pos).filter(([,p])=>(p.dignity==="domicile"||p.dignity==="exaltation")&&!p.isRetro&&!p.combust).map(([pk])=>P[pk].name).join(", ")||"none at full strength";
      return `${base} Planets currently dignified, direct, and clear of the beams: ${strong}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition, versed in Picatrix and Agrippa: The practitioner is at the talisman workshop. Which sphere is most ready to be fixed into matter right now, and for what intent? What materia and consecration would you counsel? If nothing is ready, say so plainly — a talisman made under a weak sky is a weak talisman.`;
    }
    case "sigils": {
      let sigStr="";
      try{const sigs=loadJSON("astrum_sigils",[]);const open=sigs.filter(s=>["created","charged","deployed"].includes(s.status));sigStr=`${sigs.length} sigils in the workshop, ${open.length} active (${open.slice(0,3).map(s=>`"${(s.intent||s.word||"").slice(0,30)}" — ${s.status}`).join("; ")}).`;}catch(e){}
      return `${base} ${sigStr} Moon: ${eph.moonPhase}${eph.voc?.isVoC?" — void":""}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read the sigil work. Is this an hour for charging (the fire), deploying (the release), or forgetting (the burial)? Which active sigils are ripe for their next stage given the Moon's condition? Speak to the chaos-magical rhythm: fire and forget, but time the firing.`;
    }
    case "grimoire": {
      let gStr="";
      try{const g=loadJSON("astrum_grimoire",[]);gStr=`The grimoire holds ${g.length} entries.`;}catch(e){}
      return `${base} ${gStr} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is in their book of shadows. What patterns in a personal grimoire deserve periodic re-reading? What should be re-attempted, what retired, what consecrated as core practice? Counsel them on curating the record of their own tradition.`;
    }
    case "review": {
      let rStr="";
      try{const stats=computeStats(loadCastings());rStr=`${stats.total} castings recorded, ${stats.judged} judged, overall hit-rate ${stats.overall.pct!=null?stats.overall.pct+"%":"—"}. Strongest planets by record: ${stats.byPlanet.slice(0,3).map(r=>`${P[r.key]?.name||r.key} ${r.pct}% (n=${r.n})`).join(", ")||"insufficient data"}.`;}catch(e){}
      return `${base} ${rStr} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition, and as an honest analyst: The practitioner is reviewing their results. What do these numbers actually support believing? Where might the record be fooling them (small samples, selection effects, unjudged castings)? And what is the single most informative experiment they could run next to sharpen their practice?`;
    }
    case "learn": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is studying. Given the current sky and their tradition, what subject does this moment itself teach best? Point them to what the heavens are currently demonstrating — a dignity, an aspect, a mansion, a season of the Work — and frame one lesson from it.`;
    case "athanor": {
      const season=alchemicalSeason(eph.pos.sun.lon);
      const moonOp=moonSignOperation(eph.pos.moon.lon);
      const tide=moonWorkGuidance(eph.moonPhaseDeg);
      let opsStr="No operations on the fire.";
      try{
        const activeOps=loadAthanor().filter(o=>o.status==="active");
        if(activeOps.length)opsStr=activeOps.map(o=>{
          const next=o.steps.find(s=>!s.completedAt);
          const tpl=ATHANOR_TEMPLATES[o.template];
          return `${o.name} (${tpl?.name||o.template}, ${P[o.planet].name}, ${o.steps.filter(s=>s.completedAt).length}/${o.steps.length} steps done${next?`, next: "${next.title}"${next.scheduledFor?` window ${new Date(next.scheduledFor).toLocaleString()}`:""}`:""})`;
        }).join("; ");
      }catch(e){}
      return `${base} Alchemical season (Sun in ${season.sign}): ${season.process} — ${season.lab} Moon's operation-key (Junius): ${moonOp.process} in ${moonOp.sign}. Lunar tide: ${tide.phase} — ${tide.mode}: ${tide.counsel} Active operations: ${opsStr}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle and as an adept of the laboratory (Paracelsus, Frater Albertus, Junius, the spagyric tradition): Read the practitioner's Athanor. How do the current sky conditions serve or hinder the operations on the fire? What does the season's process and the Moon's operation-key counsel for today's laboratory work — and for the inner work that parallels it? If an operation is between steps, what should the practitioner attend to, observe, or prepare? Speak as one who knows that the vessel and the operator are worked together — ora et labora.`;
    }
    default: return `${base} ${macroCtx} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: What wisdom is most relevant to this practitioner right now? Speak from the animist framework — magic as call and response, spirits as persons, the ancestor current as foundation, synchronicity as the primary channel of response.`;
  }
}
