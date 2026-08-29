import { useState, useEffect, useCallback, useRef, useMemo, Fragment, lazy, Suspense, Component, memo as React_memo } from "react";
import { askClaude, aiConfigured, aiUnconfiguredMessage, aiProviderInfo, resolveAIConfig, AI_PROVIDERS } from "./ai/client.js";
import { WEBLLM_MODELS } from "./ai/webllm.js";
import { loadJSON, saveJSON } from "./lib/storage.js";
import { exportAll, importAll, markExported, lastExportedAt, backupFilename, downloadText, shareOnNative, copyToClipboard } from "./lib/backup.js";
import { captureConditions, transitsToNatal } from "./engine/snapshot.js";
import { createCasting, loadCastings, addOutcome, closeCasting, migrateToCastings, computeStats } from "./lib/castings.js";
import { getMansion } from "./data/mansions.js";
import { SEALS, getSeal } from "./data/seals.js";
import { alchemicalSeason, moonSignOperation, moonWorkGuidance, GREAT_WORK_STAGES } from "./data/alchemy.js";
import { DECAN_IMAGES, DECAN_DOCTRINE } from "./data/decanImages.js";
import { getBehenian, BEHENIAN_DOCTRINE } from "./data/behenian.js";
import { aspectMeaning } from "./data/aspectMeanings.js";
import { FOUNDATION_PRIMERS, TOPIC_PRIMERS } from "./data/primers.js";
import { parseFeed, addFeedEvents, loadFeed, deleteFeedSource, feedInRange, feedForDate, FEED_KIND_META, aiExtractionMessages, parseAIResponse, mergeEvents } from "./lib/intake.js";
import { loadAthanor } from "./lib/athanor.js";
import { OPERATION_TEMPLATES as ATHANOR_TEMPLATES } from "./data/operations.js";
const MansionsScreen = lazy(() => import("./screens/MansionsScreen.jsx"));
const HoraryScreen = lazy(() => import("./screens/HoraryScreen.jsx"));
const AthanorScreen = lazy(() => import("./screens/AthanorScreen.jsx"));
const AlmanacScreen = lazy(() => import("./screens/AlmanacScreen.jsx"));
const GeomancyScreen = lazy(() => import("./screens/GeomancyScreen.jsx"));
const LotsScreen = lazy(() => import("./screens/LotsScreen.jsx"));
const LunarCycleScreen = lazy(() => import("./screens/LunarCycleScreen.jsx"));
const RitualRuntimeScreen = lazy(() => import("./screens/RitualRuntimeScreen.jsx"));
const SpiritCourtScreen = lazy(() => import("./screens/SpiritCourtScreen.jsx"));
const ChaptersScreen = lazy(() => import("./screens/ChaptersScreen.jsx"));
import AltarScreen from "./screens/AltarScreen.jsx";
import SkyScreen from "./screens/SkyScreen.jsx"; // eager: the default room must not flash a loader
const DecansScreen = lazy(() => import("./screens/DecansScreen.jsx"));
const AspectsScreen = lazy(() => import("./screens/AspectsScreen.jsx"));
const PlanetsScreen = lazy(() => import("./screens/PlanetsScreen.jsx"));
const StarsScreen = lazy(() => import("./screens/StarsScreen.jsx"));
const ElectScreen = lazy(() => import("./screens/ElectScreen.jsx"));
const WorkScreen = lazy(() => import("./screens/WorkScreen.jsx"));
const NatalScreen = lazy(() => import("./screens/NatalScreen.jsx"));
const FractalScreen = lazy(() => import("./screens/FractalScreen.jsx"));
const CyclesScreen = lazy(() => import("./screens/CyclesScreen.jsx"));
const JournalScreen = lazy(() => import("./screens/JournalScreen.jsx"));
const AIScreen = lazy(() => import("./screens/AIScreen.jsx"));
const TransitsScreen = lazy(() => import("./screens/TransitsScreen.jsx"));
const EphemerisScreen = lazy(() => import("./screens/EphemerisScreen.jsx"));
const CalendarScreen = lazy(() => import("./screens/CalendarScreen.jsx"));
const SigilScreen = lazy(() => import("./screens/SigilScreen.jsx"));
const GrimoireScreen = lazy(() => import("./screens/GrimoireScreen.jsx"));
const LearnScreen = lazy(() => import("./screens/LearnScreen.jsx"));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen.jsx"));
const TalismanScreen = lazy(() => import("./screens/TalismanScreen.jsx"));
import { profection as calcProfection } from "./engine/profections.js";
const OmenScreen = lazy(() => import("./screens/OmenScreen.jsx"));
import { loadSpirits, upcomingObservances } from "./lib/spirits.js";
import { computeLots, chartFromPositions } from "./engine/lots.js";
import { electiveMemory, memoryVerdict } from "./lib/electiveMemory.js";
import { loadWatchlist, createWatch, deleteWatch, updateWatch, windowStale, refreshWatch, watchPlans } from "./lib/watchlist.js";
import { heliacalRising, starPhase, DEFAULT_ARCUS_VISIONIS, HELIACAL_STARS } from "./engine/heliacal.js";
import { buildDeck, loadSRS, dueCards, gradeCard } from "./lib/srs.js";
import { groundingForAsync } from "./lib/rag.js";
const RecallScreen = lazy(() => import("./screens/RecallScreen.jsx"));
import { planUpcoming, composeBriefing, loadNotifyPrefs, saveNotifyPrefs, DEFAULT_NOTIFY_PREFS } from "./lib/scheduler.js";
import { reschedule, ensurePermission } from "./lib/notify.js";
import { watchForUpdate } from "./lib/swUpdate.js";
import { autoBackupNative, autoBackupWebRing } from "./lib/backup.js";
const ReviewScreen = lazy(() => import("./screens/ReviewScreen.jsx"));
import { swPlanetLon, swDailyMotion, swTrueNode, swChiron, swLilith, swHouses, swFixstar, onSwephReady, engineInfo } from "./engine/sweph.js";

// ═══════════════════════════════════════════════════════════════════════
// PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════════════════
// Tauri: window.__TAURI_INTERNALS__ is injected by Tauri v2
// Capacitor: window.Capacitor is injected by Capacitor
const isTauri = typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
const isCapacitor = typeof window !== "undefined" && !!window.Capacitor;
const isNative = isTauri || isCapacitor;

// Thin platform shim: haptics
async function triggerHaptic(style="medium"){
  if(isCapacitor){
    try{
      const {Haptics,ImpactStyle}=await import("@capacitor/haptics");
      await Haptics.impact({style:style==="light"?ImpactStyle.Light:style==="heavy"?ImpactStyle.Heavy:ImpactStyle.Medium});
    }catch{}
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ASTRONOMY ENGINE — Meeus Algorithms
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// ENGINE — moved to src/engine/{astro,chart,scan}.js (de-cycling).
// Imports below; App.jsx is now leaf-only (nothing imports from it).
// ═══════════════════════════════════════════════════════════════════════
import { D2R, norm, dateToJD, sunLon, moonLon, EL, equationOfCenter, planetLon, dailyMotion, SIGNS, lonToZodiac, DOMICILE, EXALT, inExaltationDegree, getDignity, dignityScore, getCombustion, BOUNDS, getBound, antiscionOf, contraAntiscionOf, getAntisciaAspects, getPlanetPhase, checkVoC, nextIngress, HOUR_ORDER, DAY_RULERS, DAY_NAMES, getPlanetaryHour, precessStar, starLonAt, meanNode, sunriseSetUTC, gstDeg, lstDeg, obliquity, calcASC, calcMC, calcPOF, calcPOS, getPlanetaryHourUnequal, YEAR_SEC, L_DUR, calcFractal, fmtTime, fmtWindowTime, calcWindowBounds, calcL2Forecast, OUTER_EPOCHS, J2000_MS, outerPlanetLon, JS_CONJUNCTIONS, DECADE_FORECAST, getAspectsAll, meanLilith, chironLon, trueNode, TRIPLICITIES, ELEMENT_BY_SIGN, getTriplicity, calcHouses, getHouseNum, HOUSE_NAMES, HOUSE_MEANINGS } from "./engine/astro.js";
import { calcNatal, conditionsFromProfile } from "./engine/chart.js";
import { ClockProvider, useClock, useAstroNow } from "./ui/clock.jsx";
import { calcProgressions, calcSolarArc, TRANSIT_ASPECTS, scanTransits, FIRDARIA_DAY, FIRDARIA_NIGHT, FIRDARIA_YRS, calcFirdaria, calcSolarReturn, calcLunarReturn, scanIngresses, scanStations, scanEclipses, lonToDecl, getDeclAspects, getMidpoints, calcAllLots, checkViaCombusta, checkBesiegement, getMoonAspects, checkMaleficAffliction, getMoonSignRelation, checkTranslation, checkProhibition, getStarConj, getMoonSpeed, MOON_PHASE_NAMES, electionBandKey, electionFactors, assessElection, scanElections } from "./engine/scan.js";
// ═══════════════════════════════════════════════════════════════════════
// PLANETARY / DECAN / STAR DATA — moved to src/data/ (de-cycling).
// (formerly re-exported here; all importers now use the real modules)

// ═══════════════════════════════════════════════════════════════════════
import { P } from "./data/planets.js";
import { DECANS } from "./data/decans.js";
import { FIXED_STARS } from "./data/fixedStars.js";



// ═══════════════════════════════════════════════════════════════════════
// FRACTAL ENGINE
// ═══════════════════════════════════════════════════════════════════════
// ── 5b: Secondary progressions ────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════
// HOUSE SYSTEMS ENGINE (Phase 5a)
// ═══════════════════════════════════════════════════════════════════════
// Returns array of 12 cusp longitudes [cusp1..cusp12]

// ═══════════════════════════════════════════════════════════════════════
// STYLES + NAV — moved to src/ui/ (de-cycling). Temporary re-export shim.
// ═══════════════════════════════════════════════════════════════════════
import { CSS, F, GOLD, L, T, B, TINT_PRESETS, applyTintJs, DIGNITY_COL, DIGNITY_LBL, VOWELS } from "./ui/theme.js";
import { NAV_SECTIONS, NAV_GROUPS } from "./ui/nav.js";

// ═══════════════════════════════════════════════════════════════════════
// TRADITION MODULES
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// COMMAND PALETTE (Batch 2 — Spotlight-Grade)
// ═══════════════════════════════════════════════════════════════════════
function CommandPalette({open,onClose,setTab,natalPos,eph,onOracle}){
  const [query,setQuery]=useState("");
  const [mode,setMode]=useState("navigate");
  const [idx,setIdx]=useState(0);
  const inputRef=useRef();
  const [hist,setHist]=useState(()=>{try{return JSON.parse(localStorage.getItem("astrum_cmd_hist")||"[]");}catch{return[];}});

  useEffect(()=>{
    if(open){setTimeout(()=>inputRef.current?.focus(),60);setQuery("");setMode("navigate");setIdx(0);}
  },[open]);

  const q=query.toLowerCase();
  const navItems=NAV_SECTIONS.filter(s=>!q||s.label.toLowerCase().includes(q)||s.desc.toLowerCase().includes(q));
  const calcItems=[
    {id:"scan-transits",label:"Scan Transits",desc:"90-day transit hit list against natal chart",icon:"⟳",screen:"transits"},
    {id:"solar-return",label:"Solar Return (Natal → Returns)",desc:"Open the returns view of the natal screen",icon:"☉",screen:"natal"},
    {id:"lunar-return",label:"Lunar Return",desc:"Find the next lunar return date",icon:"☽",screen:"natal"},
    {id:"ingresses",label:"Sign Ingresses",desc:"Upcoming planetary sign changes (6 months)",icon:"≡",screen:"ephemeris"},
    {id:"stations",label:"Retrograde Stations",desc:"Next Rx and Direct stations",icon:"℞",screen:"ephemeris"},
    {id:"eclipses",label:"Eclipse Calendar",desc:"Upcoming solar and lunar eclipses",icon:"◉",screen:"ephemeris"},
    {id:"firdaria",label:"Firdaria Time Lords",desc:"Current major and minor period lords",icon:"⏳",screen:"natal"},
    {id:"progressions",label:"Progressions",desc:"Secondary progressions for today",icon:"→",screen:"natal"},
    {id:"elect",label:"Electional Search",desc:"Find auspicious windows",icon:"◈",screen:"elect"},
    {id:"sigil",label:"New Sigil",desc:"Create a sigil in the workshop",icon:"⟁",screen:"sigils"},
    {id:"mansion",label:"Current Lunar Mansion",desc:"The Moon's station and next entries",icon:"☾",screen:"mansions"},
    {id:"lots",label:"The Hermetic Lots",desc:"Fortune, Spirit, and the five sect-aware lots",icon:"⊗",screen:"lots"},
    {id:"lunar",label:"Lunar Cycle",desc:"Phase, the coming turns, and this lunation's intention",icon:"☾",screen:"lunar"},
    {id:"rite",label:"Begin a Rite",desc:"Step through a working under the planetary hour",icon:"✧",screen:"rite"},
    {id:"spirits",label:"The Spirit Court",desc:"Allies, offerings, and the ancestor calendar",icon:"🕯",screen:"spirits"},
    {id:"omens",label:"Capture an Omen or Dream",desc:"Fast capture, sky-stamped, feeds the Oracle",icon:"◬",screen:"omens"},
    {id:"chapters",label:"Chapters — What Year Is This?",desc:"Annual profection, Lord of the Year, zodiacal releasing",icon:"◔",screen:"chapters"},
    {id:"altar",label:"Altar Mode",desc:"Full-screen temple face — hour, moon, observances",icon:"🕯",screen:"altar"},
    {id:"horary",label:"Cast a Horary Question",desc:"Chart of the question with significators",icon:"?",screen:"horary"},
    {id:"geomancy",label:"Cast Geomancy",desc:"The shield of the sixteen figures",icon:"⚏",screen:"geomancy"},
    {id:"talisman",label:"New Talisman",desc:"Election → design → consecration pipeline",icon:"◈",screen:"talisman"},
    {id:"athanor",label:"The Athanor",desc:"Alchemical operations, season, and library",icon:"🜍",screen:"athanor"},
    {id:"review",label:"Review Outcomes",desc:"Judge castings and see practice statistics",icon:"◬",screen:"review"},
    {id:"recall",label:"Recall — Search Your Record",desc:"BM25 over your journal, grimoire, castings, and ingested letters",icon:"⌕",screen:"recall"},
    {id:"almanac",label:"Open the Almanac",desc:"Liturgical month — sky, elections, and timing letters",icon:"❋",screen:"almanac"},
  ].filter(c=>!q||c.label.toLowerCase().includes(q)||c.desc.toLowerCase().includes(q));
  const histItems=hist.filter(h=>!q||h.label?.toLowerCase().includes(q));

  const items=mode==="navigate"?navItems:mode==="calculate"?calcItems:mode==="history"?histItems:[];
  useEffect(()=>setIdx(0),[query,mode]);

  const addHist=(entry)=>{const u=[entry,...hist.filter(h=>h.id!==entry.id)].slice(0,25);setHist(u);localStorage.setItem("astrum_cmd_hist",JSON.stringify(u));};

  const execute=(item)=>{
    if(mode==="navigate"){addHist({...item,mode:"navigate",ts:Date.now()});setTab(item.id);onClose();}
    else if(mode==="calculate"){addHist({...item,mode:"calculate",ts:Date.now()});if(item.screen)setTab(item.screen);onClose();}
    else if(mode==="ask"){if(query.trim()){onOracle(query.trim());onClose();}}
    else if(mode==="history"){if(item.screen||item.id)setTab(item.screen||item.id);onClose();}
  };

  const handleKey=(e)=>{
    if(e.key==="Escape"){onClose();return;}
    if(e.key==="ArrowDown"){setIdx(i=>Math.min(i+1,items.length-1));e.preventDefault();}
    if(e.key==="ArrowUp"){setIdx(i=>Math.max(i-1,0));e.preventDefault();}
    if(e.key==="Enter"){if(mode==="ask"&&query.trim())execute({});else if(items[idx])execute(items[idx]);}
    if(e.key==="Tab"){const ms=["navigate","calculate","ask","history"];setMode(m=>ms[(ms.indexOf(m)+1)%ms.length]);e.preventDefault();}
  };

  if(!open)return null;
  const MODES=[["navigate","↗ Navigate"],["calculate","◈ Calculate"],["ask","✧ Ask"],["history","◷ History"]];

  return(
    <div className="cmd-overlay" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:72,backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)"}}>
      <div className="cmd-panel glass-ultra" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,margin:"0 14px",overflow:"hidden"}}>
        {/* Search */}
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(var(--tint-rgb),0.1)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:15,color:"rgba(var(--tint-rgb),0.45)",flexShrink:0}}>⌘</span>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder={mode==="ask"?"Ask the Oracle anything…":"Search screens, actions, calculations…"}
            style={{flex:1,background:"none",border:"none",color:"var(--tint-primary)",fontFamily:F,fontSize:14,outline:"none",padding:0,boxShadow:"none"}}/>
          {query&&<button onClick={()=>setQuery("")} style={{background:"none",border:"none",color:"rgba(var(--tint-rgb),0.3)",cursor:"pointer",fontSize:13,padding:2}}>✕</button>}
        </div>
        {/* Mode tabs */}
        <div style={{display:"flex",padding:"0 6px",borderBottom:"1px solid rgba(var(--tint-rgb),0.07)"}}>
          {MODES.map(([m,lbl])=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"8px 2px",background:"none",border:"none",borderBottom:`2px solid ${mode===m?"var(--tint-primary)":"transparent"}`,color:mode===m?"var(--tint-primary)":"rgba(var(--tint-rgb),0.3)",fontFamily:F,fontSize:8.5,letterSpacing:0.5,cursor:"pointer",transition:"border-color 0.15s,color 0.15s",whiteSpace:"nowrap"}}>{lbl}</button>
          ))}
        </div>
        {/* Results */}
        <div style={{maxHeight:320,overflowY:"auto"}}>
          {mode==="ask"?(
            <div style={{padding:"18px 16px"}}>
              <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.35)",letterSpacing:2,marginBottom:12}}>TYPE YOUR QUESTION · PRESS ⏎ TO CONSULT ORACLE</div>
              {eph?.pos?.moon&&<div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.4)",lineHeight:1.8}}>☽ Moon in {eph.pos.moon.zodiac.name} · {eph.moonPhase||""}{eph.voc?.isVoC?" · VoC":""}{natalPos?" · Natal loaded":""}</div>}
            </div>
          ):items.length===0?(
            <div style={{padding:"26px",textAlign:"center",fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.22)"}}>No results for "{query}"</div>
          ):items.map((item,i)=>{
            const active=i===idx;
            return(
              <button key={item.id||i} className={`cmd-result${active?" active":""}`} onClick={()=>execute(item)}
                style={{borderLeftColor:active?"var(--tint-primary)":"transparent"}}>
                <span style={{fontSize:14,color:"var(--tint-primary)",width:22,textAlign:"center",flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:F,fontSize:12,color:active?"var(--tint-primary)":"#C4A870",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.32)",marginTop:1}}>{item.desc}</div>
                </div>
                {mode==="history"&&item.ts&&<div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.22)",flexShrink:0}}>{Math.max(0,Math.round((Date.now()-item.ts)/60000))}m</div>}
              </button>
            );
          })}
        </div>
        {/* Footer hints */}
        <div style={{padding:"8px 16px",borderTop:"1px solid rgba(var(--tint-rgb),0.07)",display:"flex",gap:14,flexWrap:"wrap"}}>
          {[["↑↓","Move"],["⏎","Select"],["⇥","Mode"],["Esc","Close"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.5)",padding:"2px 5px",background:"rgba(var(--tint-rgb),0.07)",borderRadius:4,border:"1px solid rgba(var(--tint-rgb),0.12)"}}>{k}</span>
              <span style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.25)"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ASTRAL LIVE BAR (Batch 4 — Continuity)
// ═══════════════════════════════════════════════════════════════════════
// 1 Hz header clock leaf — the only chrome that re-renders every second.
function ClockText(){
  const t=useClock();
  return <div style={{fontFamily:F,fontSize:9.5,color:"rgba(var(--tint-rgb,200,175,100),0.32)"}}>{t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>;
}

function AstralLiveBarInner({tab,eph,now,natalPos,hour}){
  const nav=NAV_SECTIONS.find(s=>s.id===tab);
  const events=useMemo(()=>{
    const list=[];
    if(eph?.voc?.isVoC)list.push(`⚠ Moon VoC · enters ${eph.voc.nextSign?.name||"?"} in ${fmtTime(eph.voc.hoursToIngress*3600)}`);
    if(eph?.pos?.moon){const z=eph.pos.moon.zodiac;list.push(`☽ ${z.degree}° ${z.name} · ${eph.moonPhase||""}`);}
    if(hour?.planet&&P[hour.planet]){const p=P[hour.planet];list.push(`${p.sym} Hour of ${p.name} · ${Math.floor((hour.msRemaining||0)/60000)}m`);}
    if(eph?.pos?.sun){const z=eph.pos.sun.zodiac;list.push(`☉ ${z.degree}° ${z.name}`);}
    Object.entries(eph?.pos||{}).forEach(([pk,pp])=>{
      if(P[pk]&&pp?.lon!=null&&inExaltationDegree(pk,pp.lon))list.push(`✦ ${P[pk].sym} ${P[pk].name} on the degree of its exaltation — the throne`);
    });
    const lastExp=lastExportedAt();
    const staleDays=lastExp?Math.floor((Date.now()-lastExp.getTime())/86400000):null;
    if(staleDays==null)list.push("⚠ The record has never been exported — bind a backup in Profile");
    else if(staleDays>14)list.push(`⚠ The record is ${staleDays} days unbound — export a backup in Profile`);
    return list;
  },[eph,hour]);

  const multi=events.length>1;
  return(
    <div style={{height:26,background:"rgba(var(--glass-bg,8,5,22),0.72)",backdropFilter:"blur(20px) saturate(160%)",WebkitBackdropFilter:"blur(20px) saturate(160%)",display:"flex",alignItems:"center",padding:"0 14px",borderBottom:"1px solid rgba(var(--tint-rgb,200,175,100),0.06)",gap:10,overflow:"hidden",flexShrink:0}}>
      {/* Live dot */}
      <div style={{width:4,height:4,borderRadius:2,background:"var(--tint-primary)",animation:"live-dot 2s ease-in-out infinite",flexShrink:0}}/>
      {/* Breadcrumb */}
      <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.5)",letterSpacing:2.5,textTransform:"uppercase",flexShrink:0,whiteSpace:"nowrap"}}>{nav?.icon} {nav?.label}</div>
      {/* Separator */}
      <div style={{width:1,height:12,background:"rgba(var(--tint-rgb),0.12)",flexShrink:0}}/>
      {/* Event ticker */}
      <div style={{flex:1,overflow:"hidden",position:"relative",height:"100%",display:"flex",alignItems:"center"}}>
        {multi?(
          <div style={{display:"flex",gap:0,animation:"ticker-scroll 18s linear infinite",whiteSpace:"nowrap"}}>
            {[...events,...events].map((ev,i)=>(
              <span key={i} style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.38)",letterSpacing:1.2,paddingRight:44}}>{ev}</span>
            ))}
          </div>
        ):(
          <span style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.35)",letterSpacing:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{events[0]||nav?.desc}</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ASTRAL CONTROL CENTER (Batch 5 — Replaces Oracle float button)
// ═══════════════════════════════════════════════════════════════════════
function AstralControlCenterInner({tab,onOracle,setTab,natalPos,eph}){
  const [open,setOpen]=useState(false);
  const actions=[
    {icon:"✧",label:"Oracle",    col:"var(--tint-primary)", action:()=>{onOracle();setOpen(false);}},
    {icon:"⟳",label:"Transits",  col:"#7CB8E0", action:()=>{setTab("transits");setOpen(false);}},
    {icon:"◈",label:"Election",  col:"#5CA85C", action:()=>{setTab("elect");setOpen(false);}},
    {icon:"⟁",label:"Sigil",     col:"#A880D0", action:()=>{setTab("sigils");setOpen(false);}},
    {icon:"✎",label:"Journal",   col:"#C4A870", action:()=>{setTab("journal");setOpen(false);}},
    {icon:"☽",label:"Natal",     col:"#B0C8D8", action:()=>{setTab("natal");setOpen(false);}},
  ];
  if(tab==="ai"||tab==="profile")return null;
  return(
    <div style={{position:"fixed",bottom:22,right:18,zIndex:500}}>
      {open&&(
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:-1}}/>
          <div style={{position:"absolute",bottom:54,right:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:7}}>
            {actions.map((a,i)=>(
              <button key={a.label} className="cc-action" onClick={a.action}
                style={{animationDelay:`${i*0.045}s`,animation:"control-expand 0.28s cubic-bezier(0.34,1.56,0.64,1) both",background:"rgba(var(--glass-bg,8,5,22),0.88)",backdropFilter:"blur(24px) saturate(180%)",WebkitBackdropFilter:"blur(24px) saturate(180%)",border:`1px solid ${a.col}35`,boxShadow:`0 6px 24px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.08)`}}>
                <span style={{fontSize:14,color:a.col}}>{a.icon}</span>
                <span style={{fontFamily:F,fontSize:9,color:a.col,letterSpacing:1}}>{a.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:48,height:48,borderRadius:24,background:"rgba(var(--glass-bg,8,5,22),0.88)",backdropFilter:"blur(28px) saturate(200%)",WebkitBackdropFilter:"blur(28px) saturate(200%)",border:`1.5px solid rgba(var(--tint-rgb,200,175,100),${open?0.5:0.28})`,boxShadow:`0 6px 28px rgba(0,0,0,0.65),inset 0 1px 0 rgba(255,255,255,0.12)`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"transform 0.28s cubic-bezier(0.34,1.56,0.64,1),border-color 0.2s",transform:open?"rotate(45deg) scale(1.06)":"scale(1)",fontSize:18,color:"var(--tint-primary)"}}>
        ✧
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRADITION MODULES
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// RUNE SOUP CORE PRINCIPLES — injected into all AI system prompts
// Drawn from Gordon White's framework: Ani.Mystic, Star.Ships,
// The Chaos Protocols, Pieces of Eight, and Rune Soup Substack
// TRADITIONS / PROMPT / LEARN — moved to src/data + src/ai (de-cycling shim).
import { TRADITIONS, TRADITION_STEPS, RUNE_PRINCIPLES } from "./data/traditions.js";
import { buildSystemPrompt, loadKnowledge, saveKnowledge } from "./ai/prompt.js";
import { LEARN_TOPICS, FOUNDATIONS } from "./data/learn.js";
// ═══════════════════════════════════════════════════════════════════════


function SidebarInner({tab, setTab, hour, eph, open, setOpen}) {
  // Backup-staleness badge on the Profile row (14-day threshold).
  const backupStale=useMemo(()=>{const d=lastExportedAt();return d==null||((Date.now()-d.getTime())/86400000)>14;},[open]);
  const p=P[hour.planet], moonVoC=eph?.voc?.isVoC;
  return (
    <>
      {open && <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,backdropFilter:"blur(4px)"}}/>}
      <div style={{position:"fixed",left:0,top:0,bottom:0,width:open?240:0,background:"rgba(var(--glass-bg,8,5,22),0.82)",backdropFilter:"blur(40px) saturate(200%) brightness(1.05)",WebkitBackdropFilter:"blur(40px) saturate(200%) brightness(1.05)",borderRight:"1px solid rgba(var(--tint-rgb,200,175,100),0.13)",zIndex:300,overflow:"hidden",transition:"width 0.32s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:open?"12px 0 50px rgba(0,0,0,0.65),inset -1px 0 0 rgba(255,255,255,0.04)":"none"}}>
        {open && (
          <div style={{width:240,height:"100%",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"22px 20px 16px",borderBottom:"1px solid rgba(var(--tint-rgb),0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontFamily:F,fontSize:13,color:GOLD,letterSpacing:6,textTransform:"uppercase"}}>ASTRUM</div>
                <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"rgba(var(--tint-rgb),0.4)",fontSize:16,cursor:"pointer",padding:4}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:18,color:p.col}}>{p.sym}</span>
                <div>
                  <div style={L(`${p.col}80`,7)}>Hour of {p.name}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:2}}>
                    {Math.floor(hour.msRemaining/60000)}m {Math.floor((hour.msRemaining%60000)/1000)}s remaining
                  </div>
                </div>
              </div>
              {moonVoC && (
                <div style={{padding:"5px 9px",borderRadius:8,background:"rgba(200,100,50,0.15)",border:"1px solid rgba(200,100,50,0.3)",marginBottom:6}}>
                  <div style={{fontFamily:F,fontSize:8,color:"#E09060",letterSpacing:2}}>⚠ MOON VOID OF COURSE</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(200,130,80,0.7)",marginTop:2}}>Avoid new operations — {fmtTime(eph.voc.hoursToIngress*3600)} until Moon enters {eph.voc.nextSign?.name}</div>
                </div>
              )}
              {eph?.pos?.moon && (
                <div style={{fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.5)"}}>
                  Moon: {eph.pos.moon.zodiac.sym} {eph.pos.moon.zodiac.degree}° · {eph.moonPhase}
                </div>
              )}
            </div>
            <div style={{padding:"12px 0",flex:1}}>
              {NAV_GROUPS.map(g=>(
                <div key={g}>
                  <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.35)",letterSpacing:3,textTransform:"uppercase",padding:"12px 20px 4px"}}>{g}</div>
                  {NAV_SECTIONS.filter(s=>s.group===g).map(s=>{
                const active=tab===s.id;
                return (
                  <button key={s.id} aria-label={s.label} onClick={()=>{setTab(s.id);setOpen(false);}} style={{width:"100%",background:active?"rgba(var(--tint-rgb),0.1)":"none",border:"none",borderLeft:active?`2px solid ${GOLD}`:"2px solid transparent",cursor:"pointer",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                    <span style={{fontSize:15,color:active?GOLD:"rgba(var(--tint-rgb),0.4)",width:20,textAlign:"center",position:"relative"}}>{s.icon}{s.id==="profile"&&backupStale&&<span style={{position:"absolute",top:-2,right:-4,width:7,height:7,borderRadius:4,background:"#D2A060"}}/>}</span>
                    <div>
                      <div style={{fontFamily:F,fontSize:13,color:active?GOLD:"rgba(var(--tint-rgb),0.7)"}}>{s.label}</div>
                      <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.3)"}}>{s.desc}</div>
                    </div>
                  </button>
                );
              })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANIMATED ORRERY
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// PLANETARY HOUR RING
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// SKY SCREEN
// ═══════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════
// DECANS SCREEN
// ═══════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════
// ASPECTS SCREEN
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// PLANETS SCREEN
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// STARS SCREEN
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// ELECT SCREEN — Full assessment with live + scan tabs
// ═══════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════
// WORK SCREEN
// ═══════════════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════════════
// NATAL SCREEN
// ═══════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════
// JOURNAL SCREEN
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE — persistent nodes injected into AI context
// ═══════════════════════════════════════════════════════════════════════

// Build dynamic system prompt from profile, knowledge nodes, and optional sky context

// ═══════════════════════════════════════════════════════════════════════
// AI WORKING PLANNER
// ═══════════════════════════════════════════════════════════════════════

function OraclePanel({open,onClose,context,profile}){
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const sendMsg=async(userText,history)=>{
    if(loading)return;
    const apiKey=profile?.apiKey||"";
    const newMsgs=[...history,{role:"user",content:userText}];
    setMsgs(newMsgs);
    setLoading(true);
    if(!aiConfigured()){setMsgs(m=>[...m,{role:"assistant",content:aiUnconfiguredMessage()}]);setLoading(false);return;}
    const sys=buildSystemPrompt(profile,"You are the Oracle — an embedded advisor in a magical practice app. Speak directly to what the practitioner is currently observing. Be concise and specific (2-4 paragraphs for readings, shorter for follow-ups). Reference exact data given. No generalities — address the specific conditions described.");
    try{
      const txt=await askClaude({apiKey,system:sys,maxTokens:800,messages:newMsgs.map(m=>({role:m.role,content:m.content}))});
      setMsgs(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){setMsgs(m=>[...m,{role:"assistant",content:e.message||"Oracle unavailable — check connection."}]);}
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  const sendFollow=()=>{if(!input.trim()||loading)return;const t=input;setInput("");sendMsg(t,msgs);};
  useEffect(()=>{if(open&&context){setMsgs([]);setInput("");setLoading(false);setTimeout(()=>sendMsg(context,[]),80);}},// eslint-disable-next-line
  [open]);
  if(!open)return null;
  const tradLabel=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(" · ")||"Western Ceremonial";
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)"}}/>
      <div style={{position:"relative",background:"rgba(4,4,18,0.98)",border:"1px solid rgba(var(--tint-rgb),0.13)",borderBottom:"none",borderRadius:"20px 20px 0 0",maxHeight:"74vh",display:"flex",flexDirection:"column",boxShadow:"0 -12px 56px rgba(0,0,0,0.75)"}}>
        <div style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(var(--tint-rgb),0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:28,height:28,borderRadius:14,background:"rgba(var(--tint-rgb),0.12)",border:"1px solid rgba(var(--tint-rgb),0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:GOLD}}>✧</div>
            <div>
              <div style={{fontFamily:F,fontSize:12,color:GOLD,letterSpacing:2}}>ORACLE</div>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.35)",letterSpacing:1,marginTop:1}}>{tradLabel}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(var(--tint-rgb),0.4)",fontSize:18,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px"}}>
          {loading&&msgs.length<=1&&(
            <div style={{display:"flex",gap:5,padding:"32px 0",justifyContent:"center"}}>
              {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(var(--tint-rgb),0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}
            </div>
          )}
          {msgs.filter(m=>m.role==="assistant"||msgs.indexOf(m)>0).map((m,i)=>(
            <div key={i} style={{marginBottom:14}}>
              {m.role==="user"&&msgs.indexOf(m)>0&&<div style={{fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.35)",marginBottom:5,letterSpacing:1}}>YOUR QUESTION</div>}
              <div style={{fontFamily:F,fontSize:11.5,color:m.role==="user"?"#9A8060":"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{m.content}</div>
            </div>
          ))}
          {loading&&msgs.length>1&&<div style={{display:"flex",gap:5,padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(var(--tint-rgb),0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"8px 12px 20px",borderTop:"1px solid rgba(var(--tint-rgb),0.06)",display:"flex",gap:8,flexShrink:0}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendFollow();}}} placeholder="Ask a follow-up question…" style={{flex:1,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(var(--tint-rgb),0.15)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:11}}/>
          <button onClick={sendFollow} disabled={!input.trim()||loading} style={{padding:"0 12px",borderRadius:10,background:input.trim()?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(input.trim()?"rgba(var(--tint-rgb),0.28)":"rgba(var(--tint-rgb),0.08)"),fontFamily:F,fontSize:9,color:input.trim()?GOLD:"#4A3020",letterSpacing:1,cursor:input.trim()?"pointer":"default",height:36}}>ASK</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSITS SCREEN (Phase 5b)
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// EPHEMERIS SCREEN (Phase 5e)
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// CALENDAR SCREEN (Phase 3a)
// ═══════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════
// LEARN SCREEN
// ═══════════════════════════════════════════════════════════════════════
// ── The Daily Card: spaced repetition over the canon ───────────────────


// ═══════════════════════════════════════════════════════════════════════
// PROFILE / SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE COMPONENT (embedded in ProfileScreen)
// ═══════════════════════════════════════════════════════════════════════




// ── Screen slot guard: lazy loading fallback + per-screen error boundary ──
// ── Always-mounted chrome, memoized: with the 30 s astro cadence giving
// stable prop identities, these skip re-render between buckets. ──
const AstralLiveBar=React_memo(AstralLiveBarInner);
const AstralControlCenter=React_memo(AstralControlCenterInner);
const Sidebar=React_memo(SidebarInner);

function ScreenLoading(){
  return <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{fontFamily:F,fontSize:11,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:3,textTransform:"uppercase"}}>✦ opening…</div>
  </div>;
}
class ScreenBoundary extends Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(err){return {err};}
  componentDidUpdate(prev){if(prev.tab!==this.props.tab&&this.state.err)this.setState({err:null});}
  render(){
    if(this.state.err)return <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"30px 24px",textAlign:"center"}}>
      <div style={{fontSize:30,color:"#8A7050",marginBottom:12}}>⚠</div>
      <div style={{fontFamily:F,fontSize:15,color:GOLD}}>This room is disturbed</div>
      <div style={{fontFamily:F,fontSize:10,color:"#8A7050",fontStyle:"italic",lineHeight:1.7,margin:"8px 0 14px",maxWidth:340}}>{String(this.state.err?.message||this.state.err).slice(0,180)}</div>
      <button onClick={()=>this.setState({err:null})} style={{padding:"10px 22px",borderRadius:10,background:"rgba(var(--tint-rgb),0.12)",border:"1px solid rgba(var(--tint-rgb),0.35)",fontFamily:F,fontSize:10,color:GOLD,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>Enter again</button>
    </div>;
    return this.props.children;
  }
}


// ── First-run welcome: three light steps, skippable, shown once ─────────
function Welcome({onDone,setProfile}){
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [trads,setTrads]=useState(["western-ceremonial"]);
  const [natal,setNatal]=useState({date:"",time:"12:00",city:"",lat:null,lon:null});
  const IS={width:"100%",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(var(--tint-rgb),0.25)",borderRadius:10,color:GOLD,fontFamily:F,outline:"none",padding:"11px 12px",fontSize:13,boxSizing:"border-box"};
  const finish=(withNatal)=>{
    setProfile(p=>{
      const next={...(p||{}),name:name.trim()||p?.name||"",traditions:trads,
        natal:withNatal?{...natal,lat:natal.lat?+natal.lat:null,lon:natal.lon?+natal.lon:null}:(p?.natal||{date:"",time:"",city:"",lat:null,lon:null})};
      try{window.storage.set("astrum_profile",JSON.stringify(next));}catch{}
      return next;
    });
    try{localStorage.setItem("astrum_welcomed","1");}catch{}
    onDone();
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(2,3,10,0.96)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:400,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontFamily:F,fontSize:22,color:GOLD,letterSpacing:8,textTransform:"uppercase"}}>Astrum</div>
          <div style={{fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.5)",fontStyle:"italic",marginTop:4}}>an instrument for the practice</div>
        </div>
        {step===0&&<>
          <div style={{fontFamily:F,fontSize:12,color:"#C4A870",lineHeight:1.8,marginBottom:12}}>What shall the instrument call you, and which currents do you work in?</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name (or working name)…" style={{...IS,marginBottom:9}} aria-label="Your name"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:12}}>
            {Object.entries(TRADITIONS).slice(0,8).map(([id,t])=>{
              const on=trads.includes(id);
              return <button key={id} onClick={()=>setTrads(x=>on?x.filter(v=>v!==id):[...x,id])} style={{padding:"9px 6px",borderRadius:9,background:on?"rgba(var(--tint-rgb),0.14)":"rgba(0,0,0,0.3)",border:`1px solid ${on?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.1)"}`,fontFamily:F,fontSize:9,color:on?GOLD:"rgba(var(--tint-rgb),0.45)",cursor:"pointer",minHeight:36}}>{t.label}</button>;
            })}
          </div>
          <button onClick={()=>setStep(1)} style={{width:"100%",padding:"13px 0",borderRadius:11,background:"rgba(var(--tint-rgb),0.13)",border:"1px solid rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:11,color:GOLD,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",minHeight:44}}>Continue</button>
        </>}
        {step===1&&<>
          <div style={{fontFamily:F,fontSize:12,color:"#C4A870",lineHeight:1.8,marginBottom:5}}>Your birth moment and place.</div>
          <div style={{fontFamily:F,fontSize:9.5,color:"rgba(var(--tint-rgb),0.45)",fontStyle:"italic",lineHeight:1.6,marginBottom:11}}>This unlocks the Ascendant, the Lots, sect, profections, unequal hours — most of the instrument. It stays on this device.</div>
          <input type="date" value={natal.date} onChange={e=>setNatal(n=>({...n,date:e.target.value}))} style={{...IS,marginBottom:7}} aria-label="Birth date"/>
          <input type="time" value={natal.time} onChange={e=>setNatal(n=>({...n,time:e.target.value}))} style={{...IS,marginBottom:7}} aria-label="Birth time"/>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <input value={natal.lat??""} onChange={e=>setNatal(n=>({...n,lat:e.target.value}))} placeholder="Latitude (51.5)" style={IS} aria-label="Latitude"/>
            <input value={natal.lon??""} onChange={e=>setNatal(n=>({...n,lon:e.target.value}))} placeholder="Longitude (−0.12)" style={IS} aria-label="Longitude"/>
          </div>
          <button onClick={()=>finish(true)} disabled={!natal.date} style={{width:"100%",padding:"13px 0",borderRadius:11,background:natal.date?"rgba(var(--tint-rgb),0.13)":"rgba(0,0,0,0.3)",border:`1px solid ${natal.date?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.12)"}`,fontFamily:F,fontSize:11,color:natal.date?GOLD:"rgba(var(--tint-rgb),0.3)",letterSpacing:3,textTransform:"uppercase",cursor:natal.date?"pointer":"default",minHeight:44}}>Enter the Temple</button>
          <button onClick={()=>finish(false)} style={{width:"100%",marginTop:8,padding:"9px 0",borderRadius:9,background:"none",border:"none",fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.35)",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>Later — enter without a chart</button>
        </>}
      </div>
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState(()=>{try{return localStorage.getItem("astrum_tab")||"sky";}catch{return "sky";}});
  useEffect(()=>{try{localStorage.setItem("astrum_tab",tab);}catch{}},[tab]);
  const [workPlanet,setWork]=useState(null);
  const [fractalMode,setFractalMode]=useState("B");
  const [natalData,setNatalData]=useState(null);
  const [natalPos,setNatalPos]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [profile,setProfile]=useState(null);
  const [oracleOpen,setOracleOpen]=useState(false);
  const [oracleCtx,setOracleCtx]=useState("");
  const [cmdOpen,setCmdOpen]=useState(false);
  const [swReload,setSwReload]=useState(null); // fn → a new build is waiting
  const [showWelcome,setShowWelcome]=useState(()=>{try{return !localStorage.getItem("astrum_welcomed")&&!JSON.parse(localStorage.getItem("astrum_profile")||"{}")?.name&&!JSON.parse(localStorage.getItem("astrum_profile")||"{}")?.natal?.date;}catch{return false;}});
  // Load profile (primary) and legacy natal data
  useEffect(()=>{(async()=>{
    try{const r=await window.storage.get("astrum_profile");if(r?.value){const p=JSON.parse(r.value);setProfile(p);return;}}catch(e){}
    try{const r=await window.storage.get("astrum_natal");if(r?.value){const d=JSON.parse(r.value);setNatalData(d);}}catch(e){}
    setProfile({name:"",natal:{date:"",time:"",city:"",lat:null,lon:null},traditions:["western-ceremonial"],level:"intermediate",apiKey:"",tint:"solar",theme:"dark"});
  })();},[]);
  // Recompute positions once the Swiss Ephemeris WASM finishes loading
  const [engine,setEngine]=useState(engineInfo());
  useEffect(()=>{onSwephReady(()=>setEngine(engineInfo()));},[]);
  useEffect(()=>watchForUpdate(reload=>setSwReload(()=>reload)),[]);
  useEffect(()=>{autoBackupWebRing();},[]); // 7-slot IDB safety ring (daily, web + native)

  // Compute natal positions from profile (or legacy natal data)
  useEffect(()=>{
    const nd=profile?.natal?.date?profile.natal:natalData;
    if(nd?.date){
      const bd=nd.time?new Date(`${nd.date}T${nd.time}:00`):new Date(`${nd.date}T12:00:00`);
      const loc=nd.lat&&nd.lon?{lat:nd.lat,lon:nd.lon}:null;
      if(!isNaN(bd.getTime()))setNatalPos(calcNatal(bd,loc));else setNatalPos(null);
    }else setNatalPos(null);
  },[natalData,profile,engine]);

  // ── Operator's Loop migration: build castings from legacy journal/sigils
  useEffect(()=>{
    if(!profile)return;
    try{
      migrateToCastings({computeConditionsAt:d=>conditionsFromProfile(d,profile,natalPos,null,true)});
    }catch(e){}
  },[profile]); // eslint-disable-line

  // ── Tint system: inject CSS custom properties (Batch 3) ─────────────
  const activeTint=profile?.tint||"solar";
  useEffect(()=>{
    const t=TINT_PRESETS[activeTint]||TINT_PRESETS.solar;
    applyTintJs(activeTint); // keep the JS GOLD live-binding in step with the CSS vars
    const root=document.documentElement;
    root.style.setProperty("--tint-primary",t.primary);
    root.style.setProperty("--tint-rgb",t.rgb);
    root.style.setProperty("--glass-bg",t.glassBg);
    root.style.setProperty("--bg-grad1",t.grad1);
    root.style.setProperty("--bg-grad2",t.grad2);
  },[activeTint]);

  // ── ⌘K keyboard shortcut (Batch 2) ──────────────────────────────────
  useEffect(()=>{
    const handler=(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setCmdOpen(o=>!o);}if(e.key==="Escape")setCmdOpen(false);};
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[]);

  const location=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
  // Two-cadence time: astronomy at 30 s buckets (stable identities), wall
  // clock at 1 Hz only in the leaves that render seconds.
  const {now,eph,hour,fractal}=useAstroNow(location,fractalMode);

  // ── Ambient practice: plan + schedule notifications, refresh every 15 min
  const [notifyPrefs,setNotifyPrefs]=useState(loadNotifyPrefs);
  useEffect(()=>{
    if(!notifyPrefs.enabled)return;
    let cancelled=false,capSub=null;
    const replan=()=>{
      if(cancelled)return;
      try{
        const loc=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
        const horizonEnd=new Date(Date.now()+(notifyPrefs.horizonDays??3)*86400000);
        const plans=[...planUpcoming({now:new Date(),location:loc,prefs:notifyPrefs,castings:loadCastings(),athanor:loadJSON("astrum_athanor",[]),observances:upcomingObservances(loadSpirits(),new Date(),notifyPrefs.horizonDays??3)}),
          ...watchPlans(loadWatchlist(),new Date(),horizonEnd)].sort((a,b)=>a.at-b.at);
        reschedule(plans);
      }catch(e){}
    };
    replan();
    const iv=setInterval(replan,15*60000);
    if(window.Capacitor?.isNativePlatform?.()){
      import("@capacitor/app").then(({App:CapApp})=>{
        capSub=CapApp.addListener("resume",replan);
      }).catch(()=>{});
    }
    return()=>{cancelled=true;clearInterval(iv);Promise.resolve(capSub).then(s=>s?.remove?.()).catch(()=>{});};
  },[notifyPrefs,profile?.natal?.lat,profile?.natal?.lon]); // eslint-disable-line

  // ── Auto-backup + flush the durable snapshot when iOS backgrounds the app
  useEffect(()=>{
    if(!window.Capacitor?.isNativePlatform?.())return;
    let capSub=null;
    import("@capacitor/app").then(({App:CapApp})=>{
      capSub=CapApp.addListener("pause",async()=>{
        try{const {flushSnapshot}=await import("./lib/nativeStore.js");await flushSnapshot();}catch(e){}
        autoBackupNative();
      });
    }).catch(()=>{});
    return()=>{Promise.resolve(capSub).then(s=>s?.remove?.()).catch(()=>{});};
  },[]);

  // ── Dynamic background: shift with planetary hour (Batch 1) ─────────
  const hourTint=useMemo(()=>{
    const cols={sun:"rgba(220,175,40,0.12)",moon:"rgba(160,180,220,0.12)",mercury:"rgba(100,160,100,0.10)",venus:"rgba(200,140,110,0.12)",mars:"rgba(180,50,40,0.14)",jupiter:"rgba(100,90,200,0.14)",saturn:"rgba(80,100,140,0.12)"};
    return cols[hour?.planet]||"rgba(160,120,30,0.12)";
  },[hour?.planet]);
  const openWork=useCallback(pk=>{setWork(pk);setTab("work");},[]);
  const openOracle=useCallback((prefill)=>{
    if(!eph)return;
    setOracleCtx(prefill||buildOracleContext(tab,now,eph,fractal,natalPos,hour,profile));
    setOracleOpen(true);
  },[tab,now,eph,fractal,natalPos,hour,profile]);
  return (
    <ClockProvider>
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 10%,var(--bg-grad1,rgba(60,40,120,0.25)) 0%,transparent 52%),radial-gradient(ellipse at 80% 90%,var(--bg-grad2,rgba(160,120,30,0.15)) 0%,transparent 52%),radial-gradient(ellipse at 50% 50%,${hourTint} 0%,transparent 65%),#04060F`,display:"flex",justifyContent:"center",fontFamily:F,color:"var(--tint-primary,#D4AF6A)",transition:"background 3s ease"}}>
      <style>{CSS}</style>
      {showWelcome&&<Welcome setProfile={setProfile} onDone={()=>setShowWelcome(false)}/>}
      {swReload&&(
        <div onClick={swReload} style={{position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",zIndex:900,padding:"10px 20px",borderRadius:12,background:"rgba(20,15,40,0.95)",border:"1px solid rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:10,color:GOLD,letterSpacing:1.5,cursor:"pointer",boxShadow:"0 6px 24px rgba(0,0,0,0.5)"}}>
          ✦ A new sky is available — tap to renew
        </div>
      )}
      <div style={{width:"100%",maxWidth:430,minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
        <Sidebar tab={tab} setTab={setTab} hour={hour} eph={eph} open={sidebarOpen} setOpen={setSidebarOpen}/>

        {/* ── Liquid Glass Header Bar (Batch 1) ── */}
        <div style={{height:50,background:"rgba(var(--glass-bg,8,5,22),0.78)",backdropFilter:"blur(36px) saturate(190%) brightness(1.06)",WebkitBackdropFilter:"blur(36px) saturate(190%) brightness(1.06)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",flexShrink:0,borderBottom:"1px solid rgba(var(--tint-rgb,200,175,100),0.09)",boxShadow:"0 2px 0 rgba(255,255,255,0.025),inset 0 1px 0 rgba(255,255,255,0.07)"}}>
          <button aria-label="Open navigation" onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",gap:4,padding:4}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===2?14:20,height:1.5,background:"rgba(var(--tint-rgb,200,175,100),0.5)",borderRadius:1,transition:"width 0.2s"}}/>)}
          </button>
          {/* ASTRUM title — tap to open command palette (Batch 2) */}
          <button onClick={()=>setCmdOpen(true)} style={{background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"4px 10px",borderRadius:8,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(var(--tint-rgb,200,175,100),0.06)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <div style={{fontFamily:F,fontSize:11,color:"var(--tint-primary,#D4AF6A)",letterSpacing:7,textTransform:"uppercase"}}>ASTRUM</div>
            {profile?.name
              ?<div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb,200,175,100),0.35)",letterSpacing:2,textTransform:"uppercase",marginTop:1}}>{profile.name}</div>
              :<div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb,200,175,100),0.22)",letterSpacing:1.5,marginTop:1}}>⌘K to search</div>}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button aria-label="Search and commands" onClick={()=>setCmdOpen(true)} style={{background:"rgba(var(--tint-rgb,200,175,100),0.07)",border:"1px solid rgba(var(--tint-rgb,200,175,100),0.18)",borderRadius:8,cursor:"pointer",padding:"4px 9px",fontFamily:F,fontSize:11,color:"rgba(var(--tint-rgb,200,175,100),0.6)",minWidth:30,minHeight:26}}>⌘</button>
            <ClockText/>
            <span style={{fontSize:12,color:P[hour.planet].col,animation:"live-dot 3s ease-in-out infinite"}}>{P[hour.planet].sym}</span>
          </div>
        </div>

        {/* ── Astral Live Bar (Batch 4 — replaces static breadcrumb) ── */}
        <AstralLiveBar tab={tab} eph={eph} now={now} natalPos={natalPos} hour={hour}/>

        {/* ── Screen content — slide transition on tab change (Batch 6) ── */}
        <ScreenBoundary tab={tab}>
        <Suspense fallback={<ScreenLoading/>}>
        <div key={tab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",overflowY:"auto",animation:"slide-screen 0.2s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          {tab==="sky"     &&<SkyScreen     now={now} hour={hour} eph={eph} fractal={fractal} natalPos={natalPos} onWork={openWork} profile={profile}/>}
          {tab==="aspects" &&<AspectsScreen eph={eph}/>}
          {tab==="decans"  &&<DecansScreen  eph={eph} fractal={fractal} natalPos={natalPos} mode={fractalMode} setMode={setFractalMode}/>}
          {tab==="fractal" &&<FractalScreen fractal={fractal} natalPos={natalPos} mode={fractalMode} setMode={setFractalMode} now={now}/>}
          {tab==="planets" &&<PlanetsScreen eph={eph} natalPos={natalPos} now={now}/>}
          {tab==="stars"   &&<StarsScreen   eph={eph} natalPos={natalPos} profile={profile}/>}
          {tab==="natal"   &&<NatalScreen   natalData={natalData} setNatalData={setNatalData} eph={eph} fractal={fractal} natalPos={natalPos} profile={profile}/>}
          {tab==="transits"&&<TransitsScreen natalPos={natalPos} now={now}/>}
          {tab==="ephemeris"&&<EphemerisScreen now={now}/>}
          {tab==="cycles"  &&<CyclesScreen  now={now} profile={profile} eph={eph}/>}
          {tab==="elect"   &&<ElectScreen   now={now} natalPos={natalPos} eph={eph} profile={profile}/>}
          {tab==="mansions"&&<MansionsScreen eph={eph} now={now} profile={profile} natalPos={natalPos}/>}
          {tab==="lots"    &&<LotsScreen     eph={eph} natalPos={natalPos} profile={profile} now={now}/>}
          {tab==="lunar"   &&<LunarCycleScreen now={now} profile={profile} natalPos={natalPos}/>}
          {tab==="rite"    &&<RitualRuntimeScreen eph={eph} hour={hour} profile={profile} natalPos={natalPos} now={now}/>}
          {tab==="spirits" &&<SpiritCourtScreen profile={profile}/>}
          {tab==="omens"   &&<OmenScreen profile={profile} natalPos={natalPos}/>}
          {tab==="chapters"&&<ChaptersScreen profile={profile} natalPos={natalPos} now={now}/>}
          {tab==="altar"   &&<AltarScreen now={now} hour={hour} eph={eph} setTab={setTab}/>}
          {tab==="horary"  &&<HoraryScreen  profile={profile} natalPos={natalPos}/>}
          {tab==="geomancy"&&<GeomancyScreen profile={profile} natalPos={natalPos}/>}
          {tab==="talisman"&&<TalismanScreen eph={eph} natalPos={natalPos} profile={profile} now={now}/>}
          {tab==="athanor" &&<AthanorScreen  profile={profile} natalPos={natalPos} eph={eph} now={now}/>}
          {tab==="calendar"&&<CalendarScreen now={now} natalPos={natalPos}/>}
          {tab==="almanac" &&<AlmanacScreen  now={now} profile={profile}/>}
          {tab==="journal" &&<JournalScreen  profile={profile} natalPos={natalPos}/>}
          {tab==="sigils"  &&<SigilScreen    eph={eph} profile={profile} natalPos={natalPos}/>}
          {tab==="grimoire"&&<GrimoireScreen profile={profile}/>}
          {tab==="review"  &&<ReviewScreen   profile={profile}/>}
          {tab==="recall"  &&<RecallScreen   setTab={setTab}/>}
          {tab==="learn"   &&<LearnScreen   profile={profile}/>}
          {tab==="work"    &&<WorkScreen    eph={eph} initPlanet={workPlanet} natalPos={natalPos} profile={profile} now={now}/>}
          {tab==="ai"      &&<AIScreen      now={now} eph={eph} fractal={fractal} natalPos={natalPos} hour={hour} profile={profile}/>}
          {tab==="profile" &&<ProfileScreen profile={profile} setProfile={setProfile} notifyPrefs={notifyPrefs} setNotifyPrefs={setNotifyPrefs}/>}
        </div>
        </Suspense>
        </ScreenBoundary>

        {/* ── Astral Control Center (Batch 5 — replaces Oracle float button) ── */}
        <AstralControlCenter tab={tab} onOracle={openOracle} setTab={setTab} natalPos={natalPos} eph={eph}/>

        {/* ── Command Palette (Batch 2) ── */}
        <CommandPalette open={cmdOpen} onClose={()=>setCmdOpen(false)} setTab={(t)=>{setTab(t);setCmdOpen(false);}} natalPos={natalPos} eph={eph} onOracle={(q)=>{openOracle(q);}}/>

        <OraclePanel open={oracleOpen} onClose={()=>setOracleOpen(false)} context={oracleCtx} profile={profile}/>
      </div>
    </div>
    </ClockProvider>
  );
}
