// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { KAMEA, kamea_xy, KameaPreview, kamea_letterNum, kamea_reduce, fmtD } from "../data/uiTables.jsx";
import { useState } from "react";
import { memo as React_memo } from "react";
import { P } from "../data/planets.js";
import { getSeal } from "../data/seals.js";
import { TRADITIONS, TRADITION_STEPS } from "../data/traditions.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { assessElection, scanElections } from "../engine/scan.js";
import { createCasting } from "../lib/castings.js";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { F, GOLD, L, T } from "../ui/theme.js";

export default function TalismanScreen({eph,natalPos,profile,now}){
  const talLoc=profile?.natal?.lat!=null&&profile?.natal?.lon!=null?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
  const [step,setStep]=useState(0);
  const [intent,setIntent]=useState("");
  const [planet,setPlanet]=useState("jupiter");
  const [elections,setElections]=useState(null);
  const [scanning,setScanning]=useState(false);
  const [chosen,setChosen]=useState(null); // {date, assess, isNow}
  const [design,setDesign]=useState("intelligence"); // intelligence|spirit|word
  const [word,setWord]=useState("");
  const [saved,setSaved]=useState(false);
  const primaryTrad=profile?.traditions?.[0]||"western-ceremonial";
  const STEPS=TRADITION_STEPS[primaryTrad]||TRADITION_STEPS["western-ceremonial"];
  const km=KAMEA[planet]||KAMEA.jupiter;
  const sealPts=(kind)=>{const s=getSeal(planet,kind);return s?s.seq.map(n=>kamea_xy(kamea_reduce(n,km.size),planet)).filter(Boolean):null;};
  const wordPts=()=>{const letters=[...word.toUpperCase().replace(/[^A-Z]/g,"")];if(letters.length<2)return null;return letters.map(l=>{let n=kamea_letterNum(l);n=kamea_reduce(n,km.size);return kamea_xy(n<1?1:n,planet);}).filter(Boolean);};
  const designPts=design==="word"?wordPts():sealPts(design);
  const designName=design==="word"?word.toUpperCase():getSeal(planet,design)?.name;
  const runScan=()=>{setScanning(true);setElections(null);setTimeout(()=>{setElections(scanElections(new Date(now),30,planet,natalPos));setScanning(false);},250);};
  const fmtD=d=>d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+" "+d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const saveTalisman=async()=>{
    if(saved)return;
    try{
      const castDate=chosen?.isNow?new Date(now):chosen?.date||new Date(now);
      const assess=chosen?.assess||assessElection(castDate,planet,natalPos,talLoc);
      // 1. sigil record (shows up in the Sigil workshop)
      const sigilEntry={id:Date.now(),planet,intent,word:designName,method:design==="word"?"kamea":"seal",sealOf:design!=="word"?design:undefined,
        svgData:{method:"kamea",pts:designPts,word:designName,planet},status:"created",date:castDate.toISOString(),skySnap:eph?{moon:eph.pos?.moon?.lon,sun:eph.pos?.sun?.lon}:null,aiNote:""};
      saveJSON("astrum_sigils",[sigilEntry,...loadJSON("astrum_sigils",[])]);
      // 2. grimoire entry
      const grimEntry={id:Date.now()+1,title:`${P[planet].name} Talisman — ${intent.slice(0,40)||designName}`,
        body:`INTENT: ${intent}\nPLANET: ${P[planet].name}\nDESIGN: ${design==="word"?`Kamea sigil of "${designName}"`:`Seal of ${designName} (${design} of ${P[planet].name})`}\nELECTION: ${fmtD(castDate)} — score ${assess.score} (${assess.grade})\nMATERIA: ${P[planet].metal}; ${P[planet].stone}; ${P[planet].incense}; colors ${P[planet].color}\nCONSECRATION: ${STEPS.map((s,i)=>`${i+1}. ${s.t}`).join(" · ")}\nORPHIC HYMN: ${P[planet].orphic}`,
        planet,tags:[planet,"talisman"],date:castDate.toISOString().split("T")[0],category:"ritual",type:"talisman"};
      const r=await window.storage.get("astrum_grimoire");
      await window.storage.set("astrum_grimoire",JSON.stringify([grimEntry,...(r?.value?JSON.parse(r.value):[])]));
      // 3. the casting record that ties it together
      createCasting({kind:"talisman",title:`${P[planet].name} talisman — ${(intent||designName).slice(0,50)}`,intent,planet,tradition:primaryTrad,
        conditions:conditionsFromProfile(castDate,profile,natalPos,{score:assess.score,grade:assess.grade},!chosen?.isNow),
        links:{sigilId:sigilEntry.id,grimoireId:grimEntry.id,electionWindow:{start:castDate.toISOString(),score:assess.score,grade:assess.grade}},
        createdAt:new Date(now).toISOString()});
      setSaved(true);
    }catch(e){}
  };
  const IS={width:"100%",background:"rgba(0,0,0,0.45)",border:"1px solid rgba(var(--tint-rgb),0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"9px 11px",fontSize:12,boxSizing:"border-box"};
  const NEXT=(en,lbl="CONTINUE")=><button onClick={()=>setStep(step+1)} disabled={!en} style={{width:"100%",marginTop:12,padding:"12px 0",borderRadius:11,background:en?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${en?"rgba(var(--tint-rgb),0.35)":"rgba(var(--tint-rgb),0.1)"}`,fontFamily:F,fontSize:10,color:en?GOLD:"#5A4020",letterSpacing:3,textTransform:"uppercase",cursor:en?"pointer":"default"}}>{lbl}</button>;
  const WIZ=["Intent","Election","Design","Consecration","Record"];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 8px"}}>
        <div style={{fontFamily:F,fontSize:9,color:"#8A7040",letterSpacing:3.5,textTransform:"uppercase"}}>Picatrix · Agrippa · The Complete Operation</div>
        <div style={T(20)}>Talisman Workshop</div>
      </div>
      <div style={{display:"flex",gap:4,padding:"4px 14px 10px"}}>
        {WIZ.map((w,i)=>(
          <button key={w} onClick={()=>i<step&&setStep(i)} style={{flex:1,padding:"6px 0",borderRadius:8,background:i===step?"rgba(var(--tint-rgb),0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(i===step?"rgba(var(--tint-rgb),0.4)":i<step?"rgba(92,168,92,0.25)":"rgba(var(--tint-rgb),0.08)"),fontFamily:F,fontSize:8,color:i===step?GOLD:i<step?"#5CA85C":"#5A4020",letterSpacing:1,textTransform:"uppercase",cursor:i<step?"pointer":"default"}}>{i<step?"✓ ":""}{w}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {step===0&&<div className="card">
          <div style={L()}>What is this talisman for?</div>
          <textarea value={intent} onChange={e=>setIntent(e.target.value)} rows={2} placeholder="Steady increase of income through my own work…" style={{...IS,marginTop:8,resize:"none"}}/>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:2,textTransform:"uppercase",margin:"12px 0 6px"}}>Under Which Sphere</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {Object.entries(P).map(([pk,pl])=>{
              const pos=eph.pos[pk],a=planet===pk;
              return(<button key={pk} onClick={()=>setPlanet(pk)} style={{padding:"9px 10px",borderRadius:10,background:a?pl.col+"14":"rgba(0,0,0,0.25)",border:`1px solid ${a?pl.col+"50":"rgba(var(--tint-rgb),0.08)"}`,cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:14,color:pl.col}}>{pl.sym}</span>
                <span style={{fontFamily:F,fontSize:10,color:a?pl.col:"rgba(var(--tint-rgb),0.5)",marginLeft:6}}>{pl.name}</span>
                <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.3)",marginTop:2,fontStyle:"italic"}}>{pl.domains.slice(0,3).join(" · ")}{pos?.dignity==="domicile"||pos?.dignity==="exaltation"?" · STRONG NOW":""}</div>
              </button>);
            })}
          </div>
          {NEXT(intent.trim().length>3)}
        </div>}
        {step===1&&<div className="card">
          <div style={L()}>Elect the Moment</div>
          <div style={{fontFamily:F,fontSize:9.5,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.7}}>Scan the next 30 days for windows when {P[planet].name} is dignified, direct, clear of the beams, and the Moon cooperates.</div>
          <button onClick={runScan} disabled={scanning} style={{width:"100%",marginTop:10,padding:"11px 0",borderRadius:10,background:P[planet].col+"14",border:`1px solid ${P[planet].col}40`,fontFamily:F,fontSize:9,color:P[planet].col,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{scanning?"Scanning the heavens…":"Scan 30 Days"}</button>
          {elections&&elections.length===0&&<div style={{fontFamily:F,fontSize:10,color:"#9A7060",fontStyle:"italic",marginTop:10,lineHeight:1.7}}>No qualifying window in the next 30 days — {P[planet].name} may be retrograde, combust, or out of dignity. Consider another sphere, or work the moment anyway below.</div>}
          {elections&&elections.slice(0,8).map((e,i)=>{
            const isSel=chosen&&!chosen.isNow&&chosen.date.getTime()===e.date.getTime();
            const gc=e.assess.score>=90?"#FFD700":e.assess.score>=75?"#5CA85C":GOLD;
            return(<button key={i} onClick={()=>setChosen({date:e.date,assess:e.assess})} style={{width:"100%",marginTop:7,padding:"10px 12px",borderRadius:11,background:isSel?gc+"14":"rgba(8,5,22,0.6)",border:`1px solid ${isSel?gc+"60":gc+"22"}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{fmtD(e.date)}</div>
                <div style={{fontFamily:F,fontSize:8.5,color:gc,marginTop:1}}>{e.assess.grade}</div>
              </div>
              <div style={{fontFamily:F,fontSize:22,color:gc}}>{e.assess.score}</div>
            </button>);
          })}
          <button onClick={()=>setChosen({date:new Date(now),assess:assessElection(new Date(now),planet,natalPos,talLoc),isNow:true})} style={{width:"100%",marginTop:8,padding:"9px 0",borderRadius:10,background:chosen?.isNow?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${chosen?.isNow?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.12)"}`,fontFamily:F,fontSize:8.5,color:chosen?.isNow?GOLD:"rgba(var(--tint-rgb),0.45)",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>Or: work this present moment</button>
          {chosen&&<div style={{fontFamily:F,fontSize:9.5,color:"#7AB07A",marginTop:8,textAlign:"center"}}>Chosen: {fmtD(chosen.date)} — score {chosen.assess.score}</div>}
          {NEXT(!!chosen)}
        </div>}
        {step===2&&<div className="card">
          <div style={L()}>The Figure</div>
          <div style={{display:"flex",gap:6,marginTop:10,marginBottom:10}}>
            {[["intelligence","Intelligence Seal"],["spirit","Spirit Seal"],["word","Intent Sigil"]].map(([k,lbl])=>(
              <button key={k} onClick={()=>setDesign(k)} style={{flex:1,padding:"8px 0",borderRadius:9,background:design===k?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.25)",border:`1px solid ${design===k?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.1)"}`,fontFamily:F,fontSize:8,color:design===k?GOLD:"rgba(var(--tint-rgb),0.4)",letterSpacing:1,textTransform:"uppercase",cursor:"pointer"}}>{lbl}</button>
            ))}
          </div>
          {design==="word"&&<input value={word} onChange={e=>setWord(e.target.value)} placeholder="Key word of the intent, e.g. INCREASE" style={{...IS,marginBottom:10}}/>}
          {design!=="word"&&<div style={{fontFamily:F,fontSize:9.5,color:"#5A4020",fontStyle:"italic",lineHeight:1.7,marginBottom:10}}>{design==="intelligence"?`${getSeal(planet,"intelligence")?.name} — the benevolent governing intelligence of ${P[planet].name}, traced by gematria on the ${km.size}×${km.size} kamea. The classical choice for a talisman.`:`${getSeal(planet,"spirit")?.name} — the raw daimonic force of ${P[planet].name}. Traditionally inscribed together with the intelligence, which directs it.`}</div>}
          <div style={{display:"flex",justifyContent:"center"}}>
            {designPts?<KameaPreview pts={designPts} planet={planet} size={190}/>:<div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",padding:"30px 0"}}>Enter at least two letters…</div>}
          </div>
          {designName&&designPts&&<div style={{textAlign:"center",fontFamily:F,fontSize:11,color:P[planet].col,marginTop:8}}>{designName}</div>}
          {NEXT(!!designPts)}
        </div>}
        {step===3&&<div className="card">
          <div style={L()}>Consecration — {TRADITIONS[primaryTrad]?.label||"Western Ceremonial"}</div>
          <div style={{fontFamily:F,fontSize:9.5,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.7}}>At the elected moment{chosen?` — ${fmtD(chosen.date)}`:""} — work the sequence. Materia of {P[planet].name}: {P[planet].incense.split("·")[0].trim()} incense, {P[planet].metal.split("·")[0].trim()}, colors of {P[planet].color.split("·")[0].trim()}.</div>
          <div style={{marginTop:10}}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:"1px solid rgba(var(--tint-rgb),0.05)"}}>
                <span style={{fontFamily:F,fontSize:10,color:P[planet].col,width:16,flexShrink:0}}>{i+1}.</span>
                <div>
                  <div style={{fontFamily:F,fontSize:10.5,color:GOLD}}>{s.t}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"#8A7050",fontStyle:"italic",lineHeight:1.6,marginTop:2}}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,padding:"9px 11px",borderRadius:9,background:"rgba(0,0,0,0.3)",border:`1px solid ${P[planet].col}20`,fontFamily:F,fontSize:9.5,color:"#9A8060",fontStyle:"italic",lineHeight:1.8}}>"{P[planet].orphic}"</div>
          {NEXT(true)}
        </div>}
        {step===4&&<div className="card">
          <div style={L()}>Seal the Record</div>
          <div style={{fontFamily:F,fontSize:10,color:"#9A8060",fontStyle:"italic",marginTop:6,lineHeight:1.8}}>
            Saving inscribes the figure into your Sigils, writes the complete operation into the Grimoire, and opens a casting record with the elected sky — the Review screen will ask you for the outcome when the time comes.
          </div>
          <div style={{margin:"10px 0",padding:"10px 12px",borderRadius:10,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(var(--tint-rgb),0.12)",fontFamily:F,fontSize:10,color:"#C4A870",lineHeight:1.9}}>
            <div><span style={{color:"rgba(var(--tint-rgb),0.45)"}}>INTENT</span> {intent}</div>
            <div><span style={{color:"rgba(var(--tint-rgb),0.45)"}}>SPHERE</span> {P[planet].name}</div>
            <div><span style={{color:"rgba(var(--tint-rgb),0.45)"}}>FIGURE</span> {design==="word"?`Kamea sigil "${designName}"`:`Seal of ${designName}`}</div>
            <div><span style={{color:"rgba(var(--tint-rgb),0.45)"}}>MOMENT</span> {chosen?fmtD(chosen.date):"—"} (score {chosen?.assess?.score})</div>
          </div>
          <button onClick={saveTalisman} style={{width:"100%",padding:"13px 0",borderRadius:12,background:saved?"rgba(92,168,92,0.15)":"rgba(var(--tint-rgb),0.12)",border:`1px solid ${saved?"rgba(92,168,92,0.4)":"rgba(var(--tint-rgb),0.35)"}`,fontFamily:F,fontSize:10,color:saved?"#7AB07A":GOLD,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>{saved?"✓ Talisman Recorded":"⚑ Record the Talisman"}</button>
          {saved&&<div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.4)",textAlign:"center",marginTop:8,fontStyle:"italic"}}>Find it in Sigils, Grimoire, and Review.</div>}
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
// (The old inline calcProfection was removed: it profected from Aries instead
// of the natal Ascendant and aged by 365.25-day division instead of the
// birthday. The verified engine in engine/profections.js replaces it.)

