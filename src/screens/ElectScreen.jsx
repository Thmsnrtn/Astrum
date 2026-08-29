// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { OUTER_META, fmtD } from "../data/uiTables.jsx";
import { useState, useEffect, useMemo } from "react";
import { aiConfigured, aiUnconfiguredMessage, askClaude } from "../ai/client.js";
import { INTENTS } from "../data/intents.js";
import { PICATRIX_ELECTIONS, PICATRIX_PRECONDITIONS } from "../data/picatrixElections.js";
import { P } from "../data/planets.js";
import { TRADITIONS } from "../data/traditions.js";
import { DAY_NAMES, OUTER_EPOCHS, dateToJD, fmtTime, outerPlanetLon } from "../engine/astro.js";
import { MANSIONS } from "../data/mansions.js";
import { getVoCMode } from "../lib/prefs.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { profection } from "../engine/profections.js";
import { assessElection, electionFactors, scanElections, nextCleanMansionWindow } from "../engine/scan.js";
import { SIGN_NAMES } from "../engine/zr.js";
import { computeStats, createCasting, loadCastings } from "../lib/castings.js";
import { electiveMemory, memoryVerdict } from "../lib/electiveMemory.js";
import { createWatch, deleteWatch, loadWatchlist, refreshWatch, updateWatch, windowStale } from "../lib/watchlist.js";
import { B, DIGNITY_COL, F, T, GOLD } from "../ui/theme.js";

export default function ElectScreen({now,natalPos,eph,profile}){
  const [ik,setIk]=useState("money");
  const [planet,setPlanet]=useState("jupiter");
  const [scanning,setScanning]=useState(false);
  const [elections,setElections]=useState([]);
  const [selIdx,setSelIdx]=useState(null);
  const [days,setDays]=useState(30);
  const [view,setView]=useState("live");
  const [showAll,setShowAll]=useState(false);
  // Season planning state
  const [seasonDomain,setSeasonDomain]=useState("wealth");
  const [seasonHorizon,setSeasonHorizon]=useState(6);
  const [seasonReport,setSeasonReport]=useState(null);
  const [seasonLoading,setSeasonLoading]=useState(false);
  const meta=INTENTS[ik]||INTENTS.money;
  const [committed,setCommitted]=useState(null);
  useEffect(()=>{setPlanet(meta.planet);setElections([]);setSelIdx(null);},[ik]);
  const elLoc=profile?.natal?.lat!=null&&profile?.natal?.lon!=null?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
  const live=assessElection(now,planet,natalPos,elLoc);
  // Elective memory: how conditions like these have fared in your own record.
  const memStats=useMemo(()=>computeStats(loadCastings()),[committed]);
  const mem=useMemo(()=>electiveMemory(memStats,electionFactors(now,planet,live.score)),[memStats,planet,live.score,now]);
  const adjusted=mem.available?Math.max(0,Math.min(100,live.score+mem.adjustment)):null;
  // Lord of the Year (annual profection) — a standing weight on this year's elections
  const yearLord=useMemo(()=>{
    try{
      if(!profile?.natal?.date||natalPos?.asc==null)return null;
      const bd=new Date(`${profile.natal.date}T${profile.natal.time||"12:00"}:00`);
      return calcProfection(bd,now,Math.floor(natalPos.asc/30));
    }catch{return null;}
  },[profile,natalPos,now]);
  // Operator's Loop: committing an election creates a casting record
  const commitElection=(date,assess)=>{
    try{
      const c=createCasting({kind:"election",title:`${meta.label} election — ${P[planet].name}`,intent:meta.label,planet,
        conditions:conditionsFromProfile(date,profile,natalPos,{score:assess.score,grade:assess.grade}),
        links:{electionWindow:{start:date.toISOString(),score:assess.score,grade:assess.grade}}});
      setCommitted(c.id);setTimeout(()=>setCommitted(null),3000);
    }catch(e){}
  };
  const sc=live.score;
  const sCol=s=>s>=90?"#FFD700":s>=75?"#5CA85C":s>=60?GOLD:s>=45?"#C08050":"#8B4040";
  const gCol=g=>g.includes("DISQ")?"#8B4040":g.includes("Talismanic")?"#FFD700":g.includes("Excellent")?"#5CA85C":g.includes("Good")?GOLD:"#8A7050";
  const fmtD=d=>{const diff=Math.floor((d-now)/86400000),t=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});if(diff===0)return"Today "+t;if(diff===1)return"Tomorrow "+t;if(diff<8)return DAY_NAMES[d.getDay()]+" "+t;return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+t;};
  const [rankByRecord,setRankByRecord]=useState(false);
  const runScan=()=>{setScanning(true);setElections([]);setSelIdx(null);const snap=new Date(now);setTimeout(()=>{
    const raw=scanElections(snap,days,planet,natalPos,elLoc);
    // Decorate each window with elective memory so your record can rank them.
    const decorated=raw.map(r=>{const m=electiveMemory(memStats,electionFactors(r.date,planet,r.assess.score));return{...r,mem:m,adjusted:m.available?Math.max(0,Math.min(100,r.assess.score+m.adjustment)):r.assess.score};});
    setElections(decorated);setScanning(false);
  },300);};
  const SEASON_DOMAINS=[
    {id:"wealth",  label:"Wealth",   icon:"✦", col:GOLD},
    {id:"health",  label:"Health",   icon:"⊕", col:"#5CA87C"},
    {id:"love",    label:"Love",     icon:"♡", col:"#C878A8"},
    {id:"creative",label:"Creative", icon:"◈", col:"#78A8C8"},
    {id:"spiritual",label:"Spiritual",icon:"☽",col:"#A888D8"},
    {id:"protection",label:"Protection",icon:"⊗",col:"#C87858"},
  ];
  const generateSeasonReport=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setSeasonReport(aiUnconfiguredMessage());return;}
    setSeasonLoading(true);setSeasonReport(null);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const jupPos=eph?.pos?.jupiter?`Jupiter ${eph.pos.jupiter.zodiac.degree}° ${eph.pos.jupiter.zodiac.name}`:"";
    const satPos=eph?.pos?.saturn?`Saturn ${eph.pos.saturn.zodiac.degree}° ${eph.pos.saturn.zodiac.name}`:"";
    const moonPos=eph?.pos?.moon?`Moon ${eph.pos.moon.zodiac.degree}° ${eph.pos.moon.zodiac.name} (${eph.moonPhase}${eph.voc?.isVoC?" — VoC":""})`:"";
    const outerStr=Object.keys(OUTER_EPOCHS).map(p=>{const lon=outerPlanetLon(p,now);const sn=SIGN_NAMES[Math.floor(lon/30)%12];return`${OUTER_META[p].name} in ${sn}`;}).join(", ");
    const jsYrs=(((now.getTime()-new Date("2020-12-21").getTime())/(365.25*86400000))).toFixed(1);
    const domain=SEASON_DOMAINS.find(d=>d.id===seasonDomain);
    const natalStr=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.zodiac.degree}° ${np.zodiac.name})`).join("; "):"No natal chart.";
    const sys=`You are a master of electional astrology and magical timing. Generate a practical season planning report for a practitioner working in the ${trad} tradition.`;
    const userMsg=`Generate a ${seasonHorizon}-month Season Planning Report for the domain of ${domain.label.toUpperCase()} in the ${trad} tradition.\n\nCurrent sky: ${moonPos}. ${jupPos}. ${satPos}. Outer planets: ${outerStr}. Air Mutation (Jupiter-Saturn 2020): ${jsYrs} years in.\n\nNatal context: ${natalStr}\n\nStructure your report as:\n1. **Overview** — The quality of this ${seasonHorizon}-month period for ${domain.label} work. What is the broad signature?\n2. **Peak Windows** — Name 2-3 specific time periods (month + rough timing) that are especially favorable for ${domain.label} workings and why.\n3. **Cautions** — What conditions to watch for or avoid. When to hold back.\n4. **Recommended Practice** — One concrete magical practice or focus that fits this season in the ${trad} tradition.\n\nBe specific and practical. 4-5 tight paragraphs.`;
    try{
      setSeasonReport(await askClaude({apiKey,system:sys,messages:[{role:"user",content:userMsg}],maxTokens:900}));
    }catch(e){setSeasonReport(e.message||"Season report unavailable — check connection.");}
    setSeasonLoading(false);
  };
  const TABS=[{id:"live",label:"Live"},{id:"scan",label:"Scan"},{id:"vigil",label:"Vigil"},{id:"intents",label:"Intents"},{id:"season",label:"Season"},{id:"theory",label:"Theory"}];
  // ── The Vigil: standing intentions the app keeps watch for ──
  const [watches,setWatches]=useState(loadWatchlist);
  const [vigilForm,setVigilForm]=useState({label:"",planet:"jupiter",minScore:70,mansion:null});
  const refreshVigil=()=>{setWatches(loadWatchlist());};
  const vigilScan=(w,days)=>{
    if(w.mansion){
      const r=nextCleanMansionWindow(w.mansion,dateToJD(new Date(now)),days,getVoCMode());
      return r?[{date:new Date((r.cleanJd-2440587.5)*86400000),assess:{score:"clean",grade:"mansion"}}]:[];
    }
    return scanElections(new Date(now),days,w.planet,natalPos,elLoc);
  };
  const refreshWatchWindows=()=>{
    loadWatchlist().forEach(w=>{if(w.active&&windowStale(w,now)){refreshWatch(w,now,vigilScan);}});
    refreshVigil();
  };
  useEffect(()=>{if(view==="vigil")refreshWatchWindows();},[view]); // eslint-disable-line
  const THEORY=[
    {title:"The Moon — First Principle",text:"The Moon is the most important factor in all election astrology. She carries every planet's virtue to earth. Before anything else: is she void of course? In Via Combusta? Besieged by malefics? Slow in motion? Dorotheus: 'Look always to the Moon first.' A perfect election with a bad Moon delivers nothing. A mediocre election with an excellent Moon often succeeds."},
    {title:"Via Combusta — The Burnt Path",text:"15° Libra to 15° Scorpio — the Burnt Path. The Sun falls in Libra, the Moon falls in Scorpio. Both malefics (Mars domicile in Scorpio, Saturn exaltation ended) hold power here. Dozens of malefic fixed stars cluster in this band. Moon in Via Combusta vitiates any election without exception. Do not attempt to compensate with other dignities."},
    {title:"Void of Course — Writing on Water",text:"A void Moon is like writing on water. She makes no more applying aspects before leaving her current sign. Nothing begun under a void Moon completes as intended — not because it fails dramatically, but because it dissolves, peters out, or goes nowhere. The oldest and most universal rule in election astrology, confirmed across every tradition from Dorotheus to Lilly to the PGM."},
    {title:"Reception — The Alliance Principle",text:"When planet A is in planet B's sign, B receives A. Mutual reception (each in the other's sign) is the most powerful planetary alliance available — the 'chymical wedding' of election astrology. A malefic that receives the working planet becomes a helper rather than an enemy. Reception transforms square and opposition aspects from conflict into cooperative tension, like load-bearing architecture."},
    {title:"Hayz and Sect",text:"Diurnal planets (Sun, Jupiter, Saturn) are strongest by day, above the horizon, in masculine signs. Nocturnal planets (Moon, Venus, Mars) are strongest by night, below the horizon, in feminine signs. Being in hayz — in all your sect's conditions simultaneously — adds power beyond essential dignity alone. Mercury is of both sects. Check sect before any election."},
    {title:"Prohibition and Translation",text:"Prohibition: another planet perfects an aspect with the Moon before she reaches your working planet, blocking your matter — like an interloper closing a deal first. Translation of Light: the Moon carries virtue from one planet to another, uniting their significations. Use translation deliberately: if you need two factors joined, elect when the Moon translates light between them."},
    {title:"Shoaling Elections — Concurrent Timing",text:"Gordon White's shoaling principle applied to elections: instead of one precisely-timed operation, plan a shoal of related workings across multiple favorable windows within a season. Each working is slightly different — a different face of the same overall intention. Leave outcome space open for Black Swan results. 'If you think you know precisely how something is supposed to happen and you enchant for it, you may have just blocked the enormous opportunity.'"},
    {title:"Macrocycle Alignment",text:"The Blended Cycle Model in elections: the inner planet timing sits within the outer planet civilizational weather. An election for wealth during Jupiter in Aquarius (Air Mutation era) will have a different quality than the same election during Jupiter in Capricorn. Align your elections with the macro-signature when possible. Pluto in Aquarius (2024-2043) amplifies Mercury-ruled and Aquarius operations. Neptune in Aries amplifies new spiritual ventures. Uranus in Gemini amplifies communication, intelligence, and rapid-transmission workings."},
    {title:"Synchronicity as Election Confirmation",text:"A successful election produces synchronicities before, during, and after. Before: 'baroque coincidences' that confirm you are on the right track. During: a quality of heightened aliveness in the ritual space. After: unexpected developments that serve the intent from unexpected directions. If no synchronicities appear within a lunar cycle, the election either missed or the working needs follow-up. Synchronicity is the call-and-response of the spirit world, not lucky coincidence."},
    {title:"The Ancestor Current in Elections",text:"The most overlooked factor in election astrology: the condition of the practitioner's ancestor current. An electional window that is perfect by all classical criteria can still underperform if the ancestor current is weak, blocked, or antagonistic. Before any major working: propitiate the ancestors (fresh water, a candle, naming the beloved dead). They are the most motivated and accessible allies in the entire spirit hierarchy, and their backing amplifies every elected operation."},
  ];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 8px"}}>
        <div style={{fontFamily:F,fontSize:9,color:"#8A7040",letterSpacing:3.5,textTransform:"uppercase"}}>Dorotheus · Bonatti · Lilly · Classical Tradition</div>
        <div style={T(20)}>Election Astrology</div>
      </div>
      <div style={{padding:"0 14px 8px",display:"flex",gap:5}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setView(t.id)} style={{flex:1,padding:"6px 0",borderRadius:9,background:view===t.id?"rgba(var(--tint-rgb),0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(view===t.id?"rgba(var(--tint-rgb),0.38)":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:8,color:view===t.id?GOLD:"#6A5030",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{t.label}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {view==="live"&&<>
          {eph.voc?.isVoC&&<div style={{marginBottom:9,padding:"8px 12px",borderRadius:10,background:"rgba(180,100,50,0.12)",border:"1px solid rgba(200,120,60,0.28)",fontFamily:F,fontSize:9,color:"#E09060",letterSpacing:2}}>MOON VOID — {fmtTime(eph.voc.hoursToIngress*3600)} until {eph.voc.nextSign?.name}</div>}
          <div style={{marginBottom:8}}>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:3,textTransform:"uppercase",marginBottom:5}}>Intent</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {Object.entries(INTENTS).map(([k,m])=><button key={k} onClick={()=>setIk(k)} style={{padding:"7px 9px",borderRadius:10,background:ik===k?m.col+"14":"rgba(8,5,22,0.5)",border:"1px solid "+(ik===k?m.col+"45":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:9,color:ik===k?m.col:"#6A5030",cursor:"pointer",textAlign:"left",display:"flex",gap:5,alignItems:"center"}}><span>{m.icon}</span><span>{m.label}</span></button>)}
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:3,textTransform:"uppercase",marginBottom:5}}>Planet</div>
            <div style={{display:"flex",gap:4}}>
              {Object.keys(P).map(pk=>{const pl2=P[pk],pos=eph.pos[pk],a=planet===pk,ok=(pos.dignity==="domicile"||pos.dignity==="exaltation")&&!pos.isRetro&&!pos.combust;return<button key={pk} onClick={()=>setPlanet(pk)} style={{flex:1,padding:"7px 3px",borderRadius:9,background:a?pl2.col+"16":"rgba(8,5,22,0.5)",border:"1px solid "+(a?pl2.col+"50":ok?"rgba(92,168,92,0.2)":"rgba(var(--tint-rgb),0.09)"),cursor:"pointer"}}><div style={{fontSize:14,textAlign:"center",color:pl2.col}}>{pl2.sym}</div><div style={{fontFamily:F,fontSize:8,color:ok?"#5CA85C":DIGNITY_COL[pos.dignity],textAlign:"center",marginTop:1}}>{ok?"OK":pos.isRetro?"R":"–"}</div></button>;})}
            </div>
          </div>
          <div style={{borderRadius:14,background:"rgba(8,5,22,0.85)",border:"2px solid "+gCol(live.grade)+"40",padding:"14px 15px",marginBottom:9}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div><div style={{fontFamily:F,fontSize:16,color:gCol(live.grade)}}>{live.grade}</div><div style={{fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.45)",marginTop:2}}>{live.passCount}/{live.criteria.length} criteria</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:F,fontSize:48,color:sCol(sc),lineHeight:1}}>{sc}</div></div>
            </div>
            <div style={{height:3,background:"rgba(var(--tint-rgb),0.09)",borderRadius:2,marginBottom:9}}><div style={{height:"100%",width:sc+"%",background:sCol(sc),borderRadius:2}}/></div>
            {/* Elective memory — the second voice: your own record */}
            <div style={{marginBottom:9,padding:"9px 11px",borderRadius:10,background:mem.available?(mem.adjustment>0?"rgba(92,168,92,0.08)":mem.adjustment<0?"rgba(180,80,60,0.08)":"rgba(8,5,22,0.5)"):"rgba(8,5,22,0.5)",border:`1px solid ${mem.available?(mem.adjustment>0?"rgba(92,168,92,0.3)":mem.adjustment<0?"rgba(180,80,60,0.3)":"rgba(var(--tint-rgb),0.12)"):"rgba(var(--tint-rgb),0.1)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:mem.available&&mem.testimony.length?7:0}}>
                <span style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.5)",letterSpacing:2,textTransform:"uppercase"}}>Your Record</span>
                {mem.available&&<span style={{fontFamily:F,fontSize:12,color:mem.adjustment>0?"#7AB07A":mem.adjustment<0?"#D28060":"#8A7050",marginLeft:"auto"}}>{mem.adjustment>0?"+":""}{mem.adjustment} → {adjusted}</span>}
              </div>
              <div style={{fontFamily:F,fontSize:9.5,color:"#9A8060",fontStyle:"italic",lineHeight:1.6}}>{memoryVerdict(mem)}</div>
              {mem.available&&mem.testimony.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>
                {mem.testimony.slice(0,4).map((t,i)=><span key={i} style={{fontFamily:F,fontSize:8,color:t.delta>0?"#7AB07A":t.delta<0?"#D28060":"#8A7050",background:"rgba(0,0,0,0.25)",border:`1px solid ${t.delta>0?"rgba(92,168,92,0.25)":t.delta<0?"rgba(180,80,60,0.25)":"rgba(var(--tint-rgb),0.15)"}`,borderRadius:6,padding:"2px 7px"}}>{t.factor} “{t.key}” {t.pct}% · n{t.n}</span>)}
              </div>}
            </div>
            {live.critFail.length>0&&<div style={{marginBottom:8,padding:"8px 10px",borderRadius:9,background:"rgba(100,20,20,0.4)",border:"1px solid rgba(180,60,60,0.3)"}}>{live.critFail.map(c=><div key={c.id} style={{fontFamily:F,fontSize:10,color:"#C08080",fontStyle:"italic",lineHeight:1.6}}>✗ {c.label}: {c.note}</div>)}</div>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              {live.trans&&<span style={{fontFamily:F,fontSize:8,color:"#7CB8E0",background:"rgba(124,184,224,0.1)",border:"1px solid rgba(124,184,224,0.25)",borderRadius:6,padding:"2px 7px"}}>Translation: {P[live.trans.from]?.sym} to {P[live.trans.to]?.sym}</span>}
              {live.prohib&&<span style={{fontFamily:F,fontSize:8,color:"#D24B31",background:"rgba(210,75,49,0.1)",border:"1px solid rgba(210,75,49,0.25)",borderRadius:6,padding:"2px 7px"}}>Prohibited by {P[live.prohib.planet]?.name}</span>}
              {live.speed.fast&&<span style={{fontFamily:F,fontSize:8,color:GOLD,background:"rgba(var(--tint-rgb),0.1)",border:"1px solid rgba(var(--tint-rgb),0.2)",borderRadius:6,padding:"2px 7px"}}>Fast Moon {live.speed.speed}°/day</span>}
              {yearLord&&yearLord.lord===planet&&<span style={{fontFamily:F,fontSize:8,color:"#FFD700",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:6,padding:"2px 7px"}}>★ {P[planet].name} is Lord of the Year — carries double weight</span>}
              {live.stars.map(s=><span key={s.name} style={{fontFamily:F,fontSize:8,color:s.col,background:"rgba(200,200,255,0.08)",border:"1px solid "+s.col+"25",borderRadius:6,padding:"2px 7px"}}>{s.name}</span>)}
            </div>
            <button onClick={()=>commitElection(now,live)} style={{width:"100%",padding:"9px 0",borderRadius:9,marginBottom:6,background:committed?"rgba(92,168,92,0.15)":gCol(live.grade)+"14",border:"1px solid "+(committed?"rgba(92,168,92,0.4)":gCol(live.grade)+"40"),fontFamily:F,fontSize:9,color:committed?"#7AB07A":gCol(live.grade),letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{committed?"✓ Recorded — judge it in Review":"⚑ Cast Now — Record This Sky"}</button>
            <button onClick={()=>setShowAll(!showAll)} style={{width:"100%",padding:"7px 0",borderRadius:9,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(var(--tint-rgb),0.12)",fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.5)",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{showAll?"HIDE":"SHOW"} ALL {live.criteria.length} CRITERIA</button>
            {showAll&&live.criteria.map(c=><div key={c.id} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(var(--tint-rgb),0.05)"}}>
              <span style={{fontSize:10,color:c.pass?"#5CA85C":"#8B4040",width:14}}>{c.pass?"✓":"✗"}</span>
              <div style={{flex:1}}><div style={{fontFamily:F,fontSize:10,color:c.pass?"#C4A870":"#9A7060"}}>{c.label}</div><div style={{fontFamily:F,fontSize:9,color:"#6A5030",fontStyle:"italic",marginTop:2,lineHeight:1.5}}>{c.note}</div></div>
            </div>)}
          </div>
          <div style={{borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,221,237,0.14)",padding:"12px 14px",marginBottom:9}}>
            <div style={{fontFamily:F,fontSize:9,color:"rgba(200,221,237,0.6)",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>Moon Aspects</div>
            {live.moonAsp.applying.slice(0,4).map((a,i)=>{const isW=a.planet===planet,isBad=["mars","saturn"].includes(a.planet)&&["Square","Opposition"].includes(a.aspect);return<div key={i} style={{display:"flex",gap:8,padding:"4px 8px",borderRadius:8,background:isW?"rgba(var(--tint-rgb),0.1)":isBad?"rgba(180,60,60,0.1)":"rgba(0,0,0,0.2)",border:"1px solid "+(isW?"rgba(var(--tint-rgb),0.3)":isBad?"rgba(180,60,60,0.25)":"transparent"),marginBottom:3,alignItems:"center"}}>
              <span style={{color:P[a.planet].col,fontSize:12,width:18}}>{P[a.planet].sym}</span>
              <span style={{fontFamily:F,fontSize:10,color:isW?GOLD:isBad?"#C08080":"#C4A870",flex:1}}>Moon {a.aspect} {P[a.planet].name} in {a.hours}h</span>
              {isW&&<span style={{fontFamily:F,fontSize:8,color:GOLD}}>TARGET</span>}
              {isBad&&<span style={{fontFamily:F,fontSize:8,color:"#D24B31"}}>BAD</span>}
            </div>;})}
          </div>
        </>}
        {view==="scan"&&<>
          <div style={{padding:"12px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(var(--tint-rgb),0.1)",marginBottom:9}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:7}}>
              {Object.entries(INTENTS).map(([k,m])=><button key={k} onClick={()=>setIk(k)} style={{padding:"6px 8px",borderRadius:9,background:ik===k?m.col+"14":"rgba(0,0,0,0.3)",border:"1px solid "+(ik===k?m.col+"40":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:8,color:ik===k?m.col:"#6A5030",cursor:"pointer",textAlign:"left",display:"flex",gap:4,alignItems:"center"}}><span>{m.icon}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</span></button>)}
            </div>
            <div style={{display:"flex",gap:4,marginBottom:7}}>{Object.keys(P).map(pk=>{const pl2=P[pk],a=planet===pk;return<button key={pk} onClick={()=>setPlanet(pk)} style={{flex:1,padding:"6px 2px",borderRadius:8,background:a?pl2.col+"16":"rgba(8,5,22,0.5)",border:"1px solid "+(a?pl2.col+"45":"rgba(var(--tint-rgb),0.09)"),cursor:"pointer"}}><div style={{fontSize:13,textAlign:"center",color:pl2.col}}>{pl2.sym}</div></button>;})}</div>
            <div style={{display:"flex",gap:5,marginBottom:9}}>{[14,30,60,90].map(d=><button key={d} onClick={()=>setDays(d)} style={{flex:1,padding:"6px 0",borderRadius:8,background:days===d?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(days===d?"rgba(var(--tint-rgb),0.35)":"rgba(var(--tint-rgb),0.12)"),fontFamily:F,fontSize:8,color:days===d?GOLD:"#6A5030",letterSpacing:2,cursor:"pointer"}}>{d}D</button>)}</div>
            <button onClick={runScan} disabled={scanning} style={{width:"100%",padding:"12px 0",borderRadius:11,background:scanning?"rgba(0,0,0,0.3)":P[planet].col+"18",border:"1px solid "+(scanning?"rgba(var(--tint-rgb),0.12)":P[planet].col+"45"),fontFamily:F,fontSize:10,color:scanning?"#6A5030":P[planet].col,letterSpacing:3,textTransform:"uppercase",cursor:scanning?"default":"pointer"}}>{scanning?"SCANNING…":"FIND ELECTIONS"}</button>
          </div>
          {elections.some(e=>e.mem?.available)&&<button onClick={()=>setRankByRecord(r=>!r)} style={{width:"100%",padding:"8px 0",marginBottom:8,borderRadius:9,background:rankByRecord?"rgba(92,168,92,0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(rankByRecord?"rgba(92,168,92,0.35)":"rgba(var(--tint-rgb),0.12)"),fontFamily:F,fontSize:8.5,color:rankByRecord?"#7AB07A":"rgba(var(--tint-rgb),0.5)",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{rankByRecord?"◬ Ranked by your record":"◬ Rank by your record"}</button>}
          {(rankByRecord?elections.map((e,i)=>[e,i]).sort((a,b)=>b[0].adjusted-a[0].adjusted):elections.map((e,i)=>[e,i])).map(([e,i])=>{const isSel=selIdx===i,gc=sCol(e.assess.score),adj=e.mem?.available?e.mem.adjustment:0;return<div key={i} onClick={()=>setSelIdx(isSel?null:i)} style={{marginBottom:8,borderRadius:13,background:isSel?P[planet].col+"0F":"rgba(8,5,22,0.65)",border:"2px solid "+(isSel?gc+"60":gc+"22"),padding:"12px 13px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}><div style={{fontFamily:F,fontSize:11,color:gc}}>{e.assess.grade}</div><div style={{fontFamily:F,fontSize:10,color:"#C4A870",fontStyle:"italic"}}>{fmtD(e.date)}</div><div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.45)",marginTop:1}}>{P[planet].name} {e.zodiac.degree}° {e.zodiac.sym}</div>{e.mem?.available&&adj!==0&&<div style={{fontFamily:F,fontSize:8.5,color:adj>0?"#7AB07A":"#D28060",marginTop:3}}>◬ Your record {adj>0?"+":""}{adj} → {e.adjusted}{e.mem.testimony[0]?` · ${e.mem.testimony[0].key} ${e.mem.testimony[0].pct}%`:""}</div>}</div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:F,fontSize:30,color:gc,lineHeight:1}}>{e.assess.score}</div>{e.mem?.available&&adj!==0&&<div style={{fontFamily:F,fontSize:11,color:adj>0?"#7AB07A":"#D28060",marginTop:2}}>{e.adjusted}</div>}</div>
            </div>
            {isSel&&<div style={{marginTop:9,paddingTop:9,borderTop:"1px solid "+gc+"20"}}>
              <button onClick={ev=>{ev.stopPropagation();commitElection(e.date,e.assess);}} style={{width:"100%",padding:"9px 0",borderRadius:9,marginBottom:7,background:committed?"rgba(92,168,92,0.15)":gc+"14",border:"1px solid "+(committed?"rgba(92,168,92,0.4)":gc+"40"),fontFamily:F,fontSize:9,color:committed?"#7AB07A":gc,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{committed?"✓ Recorded — judge it in Review":"⚑ Commit to This Window"}</button>
              {e.assess.criteria.map(c=><div key={c.id} style={{display:"flex",gap:7,padding:"4px 0",borderBottom:"1px solid rgba(var(--tint-rgb),0.04)"}}><span style={{fontSize:10,color:c.pass?"#5CA85C":"#8B4040",width:14}}>{c.pass?"✓":"✗"}</span><div style={{flex:1}}><div style={{fontFamily:F,fontSize:10,color:c.pass?"#C4A870":"#9A7060"}}>{c.label}</div><div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:1}}>{c.note}</div></div></div>)}</div>}
          </div>;})}
          {elections.length===0&&!scanning&&<div style={{textAlign:"center",padding:"30px 20px",fontFamily:F,fontSize:11,color:"#5A4020",fontStyle:"italic",lineHeight:1.8}}>Configure intent and planet, then scan. Only elections passing all 5 critical criteria shown.</div>}
        </>}
        {view==="vigil"&&<>
          <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",lineHeight:1.7,margin:"2px 4px 9px"}}>Standing intentions the app keeps watch for — each caches its next qualifying window and warns you at T−24h and T−1h.</div>
          <div style={{padding:"12px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(var(--tint-rgb),0.1)",marginBottom:9}}>
            <input value={vigilForm.label} onChange={e=>setVigilForm(f=>({...f,label:e.target.value}))} placeholder="The intention — 'Jupiter working for the business'…" style={{width:"100%",background:"rgba(0,0,0,0.45)",border:"1px solid rgba(var(--tint-rgb),0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"9px 11px",fontSize:12,boxSizing:"border-box",marginBottom:7}}/>
            <div style={{display:"flex",gap:4,marginBottom:7}}>{Object.keys(P).map(pk=>{const a=vigilForm.planet===pk&&!vigilForm.mansion;return<button key={pk} onClick={()=>setVigilForm(f=>({...f,planet:pk,mansion:null}))} style={{flex:1,padding:"6px 2px",borderRadius:8,background:a?P[pk].col+"16":"rgba(8,5,22,0.5)",border:"1px solid "+(a?P[pk].col+"45":"rgba(var(--tint-rgb),0.09)"),cursor:"pointer"}}><div style={{fontSize:13,textAlign:"center",color:P[pk].col}}>{P[pk].sym}</div></button>;})}</div>
            <select value={vigilForm.mansion||""} onChange={e=>setVigilForm(f=>({...f,mansion:e.target.value?parseInt(e.target.value,10):null}))} style={{width:"100%",marginBottom:7,background:"rgba(0,0,0,0.45)",border:"1px solid "+(vigilForm.mansion?"rgba(200,221,237,0.35)":"rgba(var(--tint-rgb),0.18)"),borderRadius:10,color:vigilForm.mansion?"#C8DDED":"#8A7050",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:10.5,boxSizing:"border-box"}}>
              <option value="">— or watch a mansion's next clean window —</option>
              {MANSIONS.map(m=><option key={m.n} value={m.n}>☾ Mansion {m.n} · {m.arabic} — {m.translation}</option>)}
            </select>
            {!vigilForm.mansion&&<div style={{display:"flex",gap:5,marginBottom:8}}>{[60,70,80,90].map(s=><button key={s} onClick={()=>setVigilForm(f=>({...f,minScore:s}))} style={{flex:1,padding:"6px 0",borderRadius:8,background:vigilForm.minScore===s?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(vigilForm.minScore===s?"rgba(var(--tint-rgb),0.35)":"rgba(var(--tint-rgb),0.12)"),fontFamily:F,fontSize:8,color:vigilForm.minScore===s?GOLD:"#6A5030",letterSpacing:1,cursor:"pointer"}}>≥{s}</button>)}</div>}
            {vigilForm.mansion&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,221,237,0.55)",fontStyle:"italic",marginBottom:8,lineHeight:1.6}}>Watches for the first moment the Moon occupies this mansion while not void, waxing, and unbesieged.</div>}
            <button onClick={()=>{if(!vigilForm.label.trim())return;createWatch(vigilForm);setVigilForm({label:"",planet:"jupiter",minScore:70,mansion:null});refreshWatchWindows();}} disabled={!vigilForm.label.trim()} style={{width:"100%",padding:"11px 0",borderRadius:10,background:vigilForm.label.trim()?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(vigilForm.label.trim()?"rgba(var(--tint-rgb),0.35)":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:9.5,color:vigilForm.label.trim()?GOLD:"#5A4020",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>👁 Keep Watch</button>
          </div>
          {watches.map(w=>{const win=w.nextWindow;return(
            <div key={w.id} style={{marginBottom:8,padding:"11px 13px",borderRadius:12,background:"rgba(8,5,22,0.6)",border:"1px solid "+(win?"rgba(92,168,92,0.3)":"rgba(var(--tint-rgb),0.1)"),opacity:w.active?1:0.5}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <span style={{fontSize:16,color:w.mansion?"#C8DDED":P[w.planet]?.col}}>{w.mansion?"☾":P[w.planet]?.sym}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:12,color:"#D4C098"}}>{w.label}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.45)",marginTop:1}}>{w.mansion?`Mansion ${w.mansion} · ${MANSIONS[w.mansion-1]?.arabic} · clean window`:`${P[w.planet]?.name} · score ≥${w.minScore}`}</div>
                </div>
                <button onClick={()=>{updateWatch(w.id,{active:!w.active});refreshVigil();}} style={{background:"none",border:"1px solid rgba(var(--tint-rgb),0.2)",borderRadius:7,color:"#8A7050",fontFamily:F,fontSize:8,padding:"3px 8px",cursor:"pointer"}}>{w.active?"pause":"resume"}</button>
                <button onClick={()=>{deleteWatch(w.id);refreshVigil();}} style={{background:"none",border:"none",color:"rgba(var(--tint-rgb),0.3)",fontSize:12,cursor:"pointer"}}>✕</button>
              </div>
              {win?<div style={{fontFamily:F,fontSize:10.5,color:"#7AB07A",marginTop:6}}>Next window: {fmtD(new Date(win.date))} — {win.grade==="mansion"?"clean mansion window":`score ${win.score} (${win.grade})`}</div>
                :<div style={{fontFamily:F,fontSize:9.5,color:"#8A7050",fontStyle:"italic",marginTop:6}}>{w.computedAt?"No qualifying window in the horizon — the vigil continues.":"Watching…"}</div>}
            </div>);})}
          {watches.length===0&&<div style={{textAlign:"center",padding:"22px 16px",fontFamily:F,fontSize:10.5,color:"#5A4020",fontStyle:"italic",lineHeight:1.8}}>No vigils yet. Name an intention and the app will keep watch for its window.</div>}
        </>}
        {view==="intents"&&<>
          {/* The classical catalog — Picatrix named elections, triple-witnessed */}
          <div style={{padding:"11px 13px",borderRadius:12,background:"rgba(8,5,22,0.6)",border:"1px solid rgba(var(--tint-rgb),0.12)",marginBottom:9}}>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.5)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>Picatrix — The Named Elections</div>
            <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.4)",fontStyle:"italic",lineHeight:1.6,marginBottom:8}}>{PICATRIX_PRECONDITIONS}</div>
            {PICATRIX_ELECTIONS.map(pe=>(
              <details key={pe.id} style={{marginBottom:5}}>
                <summary style={{fontFamily:F,fontSize:10.5,color:P[pe.planet]?.col||GOLD,cursor:"pointer",padding:"3px 0"}}>{P[pe.planet]?.sym} {pe.name}</summary>
                <div style={{padding:"5px 0 7px 16px"}}>
                  <div style={{fontFamily:F,fontSize:9.5,color:"#B8A578",lineHeight:1.7}}>{pe.conditions}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.5)",fontStyle:"italic",lineHeight:1.6,marginTop:4}}>{pe.summary}</div>
                  {pe.flag&&<div style={{fontFamily:F,fontSize:8.5,color:"#D2A060",lineHeight:1.6,marginTop:4}}>⚑ {pe.flag}</div>}
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.32)",marginTop:4}}>{pe.citation}</div>
                </div>
              </details>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:9}}>{Object.entries(INTENTS).map(([k,m])=><button key={k} onClick={()=>setIk(k)} style={{padding:"8px",borderRadius:10,background:ik===k?m.col+"14":"rgba(0,0,0,0.3)",border:"1px solid "+(ik===k?m.col+"45":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:9,color:ik===k?m.col:"#7A6030",cursor:"pointer",textAlign:"left"}}>{m.icon} {m.label}</button>)}</div>
          <div style={{borderRadius:14,background:"rgba(8,5,22,0.85)",border:"1px solid "+meta.col+"25",padding:"14px 15px"}}>
            <div style={{fontFamily:F,fontSize:15,color:meta.col,marginBottom:9}}>{meta.icon} {meta.label}</div>
            {meta.reqs.map((r,i)=><div key={i} style={{display:"flex",gap:7,padding:"4px 0",borderBottom:"1px solid rgba(var(--tint-rgb),0.04)"}}><span style={{color:meta.col+"50",fontSize:9,marginTop:1,width:14}}>{i+1}.</span><div style={{fontFamily:F,fontSize:10,color:"#C4A870",fontStyle:"italic",lineHeight:1.6}}>{r}</div></div>)}
          </div>
        </>}
        {view==="season"&&(
          <div style={{paddingTop:4}}>
            <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",lineHeight:1.7,marginBottom:10}}>Choose your domain and horizon. The AI generates a practical season planning report — peak windows, cautions, and recommended practice.</div>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)",letterSpacing:3,marginBottom:5}}>DOMAIN</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:10}}>
              {SEASON_DOMAINS.map(d=>(
                <button key={d.id} onClick={()=>setSeasonDomain(d.id)} style={{padding:"7px 5px",borderRadius:10,background:seasonDomain===d.id?d.col+"14":"rgba(8,5,22,0.5)",border:"1px solid "+(seasonDomain===d.id?d.col+"45":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:9,color:seasonDomain===d.id?d.col:"#7A6030",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:14,marginBottom:2}}>{d.icon}</div>
                  <div style={{fontSize:8,letterSpacing:1}}>{d.label}</div>
                </button>
              ))}
            </div>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)",letterSpacing:3,marginBottom:5}}>HORIZON</div>
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              {[3,6,12].map(h=>(
                <button key={h} onClick={()=>setSeasonHorizon(h)} style={{flex:1,padding:"7px 0",borderRadius:9,background:seasonHorizon===h?"rgba(var(--tint-rgb),0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(seasonHorizon===h?"rgba(var(--tint-rgb),0.38)":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:9,color:seasonHorizon===h?GOLD:"#6A5030",cursor:"pointer"}}>
                  {h === 12 ? "1 year" : `${h} months`}
                </button>
              ))}
            </div>
            <button onClick={generateSeasonReport} disabled={seasonLoading} style={{width:"100%",padding:"13px",borderRadius:13,background:"rgba(var(--tint-rgb),0.07)",border:"1px solid rgba(var(--tint-rgb),0.22)",fontFamily:F,fontSize:11,color:seasonLoading?"rgba(var(--tint-rgb),0.4)":GOLD,letterSpacing:2,cursor:seasonLoading?"default":"pointer",marginBottom:10}}>
              {seasonLoading?"READING THE SEASON…":"◈ GENERATE SEASON REPORT"}
            </button>
            {seasonReport&&(
              <div style={{borderRadius:13,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(var(--tint-rgb),0.1)",padding:"14px 15px"}}>
                <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{seasonReport}</div>
              </div>
            )}
          </div>
        )}
        {view==="theory"&&THEORY.map(({title,text})=><div key={title} style={{marginBottom:8,borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(var(--tint-rgb),0.09)",padding:"13px 14px"}}><div style={{fontFamily:F,fontSize:13,color:GOLD,marginBottom:5}}>{title}</div><div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",lineHeight:1.9}}>{text}</div></div>)}
      </div>
    </div>
  );
}
