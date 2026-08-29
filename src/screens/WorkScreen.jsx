// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useEffect } from "react";
import { aiConfigured, aiUnconfiguredMessage, askClaude } from "../ai/client.js";
import { P } from "../data/planets.js";
import { TRADITIONS, TRADITION_STEPS } from "../data/traditions.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { createCasting } from "../lib/castings.js";
import { DIGNITY_COL, DIGNITY_LBL, F, L, T, VOWELS } from "../ui/theme.js";

export default function WorkScreen({eph,initPlanet,natalPos,profile,now}){
  const [planet,setPlanet]=useState(initPlanet);
  const [view,setView]=useState("op");
  const [step,setStep]=useState(0);
  const [genGoal,setGenGoal]=useState("");
  const [genTimeline,setGenTimeline]=useState("");
  const [genNotes,setGenNotes]=useState("");
  const [genPlan,setGenPlan]=useState(null);
  const [genLoading,setGenLoading]=useState(false);
  const [genSaved,setGenSaved]=useState(false);
  useEffect(()=>{if(initPlanet){setPlanet(initPlanet);setView("op");setStep(0);}},[initPlanet]);
  const primaryTrad=profile?.traditions?.[0]||"western-ceremonial";
  const STEPS=TRADITION_STEPS[primaryTrad]||TRADITION_STEPS["western-ceremonial"];
  const generatePlan=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setGenPlan(aiUnconfiguredMessage());return;}
    if(!genGoal.trim())return;
    setGenLoading(true);setGenPlan(null);setGenSaved(false);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const tPrompts=profile?.traditions?.map(t=>TRADITIONS[t]?.prompt||"").filter(Boolean).join("\n\n")||TRADITIONS["western-ceremonial"].prompt;
    const positions=Object.entries(eph.pos).map(([pk,p])=>`${P[pk].name}: ${p.zodiac.degree}° ${p.zodiac.name} (${p.dignity}${p.isRetro?" ℞":""}${p.combust?` ${p.combust.type}`:""})`).join(", ");
    const nd=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.dignity})`).join(", "):"No natal chart";
    const dateStr=now?now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}):"today";
    const sys=`You are a master practitioner of ${trad}, deeply versed in the classical sources of magical timing and operation.\n\nTRADITION:\n${tPrompts}\n\nGenerate a complete, practical magical operation plan. Be specific — give exact dates, exact materia, exact words. Format with clear section headers. This is actionable instruction, not theory.`;
    const userMsg=`Current sky (${dateStr}): ${positions}\nMoon: ${eph.moonPhase}${eph.voc?.isVoC?" — VOID":""}\n${nd}\n\nMy goal: ${genGoal}\nTimeline: ${genTimeline||"flexible"}\nNotes/constraints: ${genNotes||"none"}\n${planet?`Primary planet in mind: ${P[planet].name}`:"Let the tradition determine the best planet."}\n\nGenerate a complete ritual plan with these sections:\n1. PLANETARY CHOICE — which sphere and why\n2. ELECTION WINDOW — specific best date/time within my timeline\n3. MATERIA — complete list (incense, herbs, stones, metals, colors, day, hour)\n4. RITUAL STRUCTURE — step-by-step procedure in ${trad} style\n5. INVOCATION — opening prayer or calling\n6. CONSECRATION — how to seal the working\n7. FOLLOW-UP — maintenance timing, what to observe\n8. CAUTIONS — what to avoid`;
    try{
      setGenPlan(await askClaude({apiKey,system:sys,messages:[{role:"user",content:userMsg}],maxTokens:1400}));
    }catch(e){setGenPlan(e.message||"Generator unavailable — check connection.");}
    setGenLoading(false);
  };
  const saveToGrimoire=async()=>{
    if(!genPlan)return;
    try{
      const r=await window.storage.get("astrum_grimoire");
      const existing=r?.value?JSON.parse(r.value):[];
      const entry={id:Date.now(),title:genGoal.slice(0,60)||(planet?`${P[planet].name} Working`:"Custom Working"),body:genPlan,planet:planet||"sun",tags:[planet||"custom","ai-generated"],date:now?now.toISOString().split("T")[0]:new Date().toISOString().split("T")[0],category:"ritual",type:"ai-generated"};
      await window.storage.set("astrum_grimoire",JSON.stringify([entry,...existing]));
      try{
        createCasting({kind:"working",title:entry.title,intent:genGoal,planet:planet||"sun",tradition:primaryTrad,
          conditions:conditionsFromProfile(now||new Date(),profile,natalPos),links:{grimoireId:entry.id}});
      }catch(e){}
      setGenSaved(true);
    }catch(e){}
  };
  if(!planet){
    return (
      <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
        <div style={{padding:"16px 18px 12px"}}>
          <div style={L()}>Talisman Workshop</div>
          <div style={T(20)}>Choose a Planet</div>
        </div>
        <div style={{padding:"0 12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          {Object.entries(P).map(([pk,pl])=>{
            const pos=eph.pos[pk],dc=DIGNITY_COL[pos.dignity],np=natalPos?.[pk];
            return (
              <button key={pk} onClick={()=>{setPlanet(pk);setView("op");setStep(0);}} style={{padding:"14px 12px",borderRadius:16,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.09)",cursor:"pointer",textAlign:"left",backdropFilter:"blur(16px)"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:24,color:pl.col}}>{pl.sym}</span>
                  {np&&<span style={{fontFamily:F,fontSize:7,color:DIGNITY_COL[np.dignity],letterSpacing:1}}>NATAL</span>}
                </div>
                <div style={{fontFamily:F,fontSize:14,color:pl.col,marginTop:6}}>{pl.name}</div>
                <div style={{fontFamily:F,fontSize:8,color:dc,marginTop:3,letterSpacing:1}}>{DIGNITY_LBL[pos.dignity].split(" ")[0].toUpperCase()}{pos.isRetro?" ℞":""}
                  {pos.combust&&<span style={{color:"rgba(245,197,24,0.7)"}}>  ☌</span>}</div>
                <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.4}}>{pl.domains.slice(0,2).join(", ")}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  const pl=P[planet],pos=eph.pos[planet],np=natalPos?.[planet];
  if(view==="ritual"){
    const s=STEPS[step];
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
        <div style={{padding:"14px 16px 10px",background:"rgba(4,4,16,0.9)",borderBottom:`1px solid ${pl.col}1A`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <button onClick={()=>setView("op")} style={{background:"none",border:"none",color:"#6A5030",fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer"}}>← BACK</button>
            <div style={L(`${pl.col}70`,8)}>Step {step+1} / {STEPS.length}</div>
          </div>
          <div style={T(17,pl.col)}>{s.t}</div>
          <div style={{marginTop:9,display:"flex",gap:2}}>{STEPS.map((_,i)=><div key={i} onClick={()=>setStep(i)} style={{flex:1,height:2,borderRadius:1,background:i<=step?pl.col:"rgba(200,175,100,0.1)",cursor:"pointer"}}/>)}</div>
        </div>
        <div style={{flex:1,padding:"30px 22px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
          <div style={{fontSize:38,color:pl.col,opacity:0.55,marginBottom:20,animation:"breathe 4s ease-in-out infinite",fontFamily:"serif"}}>{pl.sym}</div>
          <div style={{fontFamily:F,fontSize:15,color:"#D4C8A0",lineHeight:2,textAlign:"center",fontStyle:"italic",maxWidth:320}}>{s.d}</div>
        </div>
        <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"12px 0",borderRadius:12,background:"rgba(200,175,100,0.06)",border:"1px solid rgba(200,175,100,0.12)",fontFamily:F,fontSize:10,color:"#7A6030",letterSpacing:2,cursor:"pointer"}}>← PREV</button>}
          {step<STEPS.length-1?<button onClick={()=>setStep(s=>s+1)} style={{flex:2,padding:"12px 0",borderRadius:12,background:`${pl.col}15`,border:`1px solid ${pl.col}40`,fontFamily:F,fontSize:10,color:pl.col,letterSpacing:2,cursor:"pointer"}}>NEXT →</button>:<button onClick={()=>setView("op")} style={{flex:2,padding:"12px 0",borderRadius:12,background:`${pl.col}25`,border:`1px solid ${pl.col}50`,fontFamily:F,fontSize:11,color:pl.col,letterSpacing:2,cursor:"pointer"}}>✦ COMPLETE</button>}
        </div>
      </div>
    );
  }
  if(view==="generator"){
    const IS={width:"100%",marginTop:4,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:12,boxSizing:"border-box"};
    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
        <div style={{padding:"12px 16px 10px",borderBottom:"1px solid rgba(200,175,100,0.07)",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>{setView("op");setGenPlan(null);}} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:10,cursor:"pointer",letterSpacing:1}}>← Back</button>
          <div style={{fontFamily:F,fontSize:13,color:"#D4AF6A"}}>AI Ritual Generator</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
          <div className="card" style={{marginBottom:10}}>
            <div style={L("rgba(160,140,220,0.7)")}>Working Parameters</div>
            <div style={{marginTop:10}}>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"}}>Your Goal *</div>
              <textarea value={genGoal} onChange={e=>setGenGoal(e.target.value)} placeholder="What do you want to accomplish? Be specific." rows={2} style={{...IS,resize:"none"}}/>
            </div>
            <div style={{marginTop:8}}>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"}}>Timeline</div>
              <input value={genTimeline} onChange={e=>setGenTimeline(e.target.value)} placeholder="e.g. within 3 weeks, by June 1, flexible…" style={IS}/>
            </div>
            <div style={{marginTop:8}}>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"}}>Notes / Constraints</div>
              <textarea value={genNotes} onChange={e=>setGenNotes(e.target.value)} placeholder="Available materials, limitations, specific requests…" rows={2} style={{...IS,resize:"none"}}/>
            </div>
            <button onClick={generatePlan} disabled={!genGoal.trim()||genLoading} style={{width:"100%",marginTop:12,padding:"13px 0",borderRadius:12,background:genGoal.trim()?"rgba(80,60,150,0.2)":"rgba(0,0,0,0.3)",border:`1px solid ${genGoal.trim()?"rgba(100,80,180,0.45)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:10,color:genGoal.trim()?"rgba(160,140,220,0.9)":"#4A3020",letterSpacing:3,textTransform:"uppercase",cursor:genGoal.trim()?"pointer":"default"}}>
              {genLoading?"Consulting the spheres…":"✧ Generate Plan"}
            </button>
          </div>
          {genLoading&&<div style={{display:"flex",gap:5,justifyContent:"center",padding:"20px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(160,140,220,0.5)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          {genPlan&&(
            <div className="card" style={{borderColor:"rgba(100,80,180,0.25)",background:"rgba(10,5,25,0.8)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={L("rgba(160,140,220,0.7)")}>Generated Plan</div>
                <button onClick={saveToGrimoire} disabled={genSaved} style={{padding:"6px 10px",borderRadius:8,background:genSaved?"rgba(90,150,90,0.2)":"rgba(80,60,150,0.2)",border:`1px solid ${genSaved?"rgba(90,150,90,0.4)":"rgba(100,80,180,0.35)"}`,fontFamily:F,fontSize:8,color:genSaved?"#7AB07A":"rgba(160,140,220,0.8)",letterSpacing:1,cursor:genSaved?"default":"pointer"}}>
                  {genSaved?"✓ SAVED":"SAVE TO GRIMOIRE"}
                </button>
              </div>
              <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{genPlan}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"12px 16px 10px",background:`linear-gradient(180deg,${pl.col}0D 0%,transparent 100%)`,borderBottom:`1px solid ${pl.col}15`}}>
        <button onClick={()=>setPlanet(null)} style={{background:"none",border:"none",color:"#6A5030",fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer",display:"block",marginBottom:7}}>← ALL</button>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:26,background:`${pl.col}12`,border:`2px solid ${pl.col}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:pl.col,animation:"breathe 4s ease-in-out infinite",fontFamily:"serif"}}>{pl.sym}</div>
          <div>
            <div style={T(22,pl.col)}>{pl.name}</div>
            <div style={{fontFamily:F,fontSize:10,color:DIGNITY_COL[pos.dignity],marginTop:2}}>{pos.zodiac.degree}° {pos.zodiac.name} · {DIGNITY_LBL[pos.dignity]}{pos.isRetro?" · ℞":""}</div>
            {np&&<div style={{fontFamily:F,fontSize:9,color:"rgba(255,215,0,0.5)",marginTop:1}}>Natal: {np.dignity} in {np.decan.name}</div>}
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {pos.combust&&<div className="card" style={{background:"rgba(25,15,5,0.8)",borderColor:"rgba(245,197,24,0.2)"}}>
          <div style={L("rgba(245,197,24,0.7)",8)}>⚠ {pos.combust.type==="combust"?"Combust":"Under Sunbeams"}</div>
          <div style={{fontFamily:F,fontSize:10,color:"rgba(245,197,24,0.6)",fontStyle:"italic",marginTop:5,lineHeight:1.7}}>{pl.name} is {pos.combust.diff}° from the Sun and operating at severely reduced capacity. Consider waiting until this planet is more than 17° from the Sun before talismanic work.</div>
        </div>}
        {pos.isRetro&&<div className="card" style={{background:"rgba(50,15,15,0.7)",borderColor:"rgba(150,60,60,0.25)"}}>
          <div style={L("rgba(200,100,100,0.8)",8)}>℞ Retrograde Warning</div>
          <div style={{fontFamily:F,fontSize:10,color:"#C08080",fontStyle:"italic",lineHeight:1.7,marginTop:5}}>Initiate no new operations. Retrograde is excellent for reviewing, revising, and revisiting past {pl.name.toLowerCase()} matters.</div>
        </div>}
        {np&&(np.dignity==="domicile"||np.dignity==="exaltation")&&<div className="card" style={{background:"rgba(255,215,0,0.04)",borderColor:"rgba(255,215,0,0.18)"}}>
          <div style={L("rgba(255,215,0,0.6)",8)}>✦ Natal Amplification</div>
          <div style={{fontFamily:F,fontSize:10,color:"rgba(255,215,0,0.65)",fontStyle:"italic",lineHeight:1.7,marginTop:5}}>Your natal {pl.name} is in {np.dignity} — this is one of your natural strong channels. All {pl.name} workings are inherently amplified for you.</div>
        </div>}
        <div className="card" style={{background:`linear-gradient(135deg,rgba(8,5,22,0.8),${pl.col}07)`,borderColor:`${pl.col}20`}}>
          <div style={L(`${pl.col}70`)}>Orphic Hymn</div>
          <div style={{fontFamily:F,fontSize:13,color:"#D4C0A0",fontStyle:"italic",lineHeight:2.2,marginTop:9}}>{pl.orphic}</div>
          <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${pl.col}18`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,color:pl.col,fontFamily:"serif"}}>{VOWELS[planet]?.l}</div>
              <div style={{fontFamily:F,fontSize:10,color:pl.col,marginTop:3}}>{VOWELS[planet]?.p}</div>
            </div>
            <div style={{fontFamily:F,fontSize:9,color:"#7A6040",fontStyle:"italic",lineHeight:1.7}}>Sound sustained during ritual. Day vowel short preceding, hour vowel long.</div>
          </div>
        </div>
        <div className="card">
          <div style={L(`${pl.col}60`)}>Ritual Preparation</div>
          <div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",marginTop:9,lineHeight:2}}>{pl.ritual}</div>
        </div>
        <button onClick={()=>{setStep(0);setView("ritual");}} style={{width:"100%",padding:"16px 0",borderRadius:14,background:`linear-gradient(135deg,${pl.col}22,${pl.col}10)`,border:`2px solid ${pl.col}45`,fontFamily:F,fontSize:12,color:pl.col,letterSpacing:4,textTransform:"uppercase",cursor:"pointer",marginBottom:4}}>
          ✦ Begin the Ritual
        </button>
        <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.25)",letterSpacing:2,textAlign:"center",marginBottom:9}}>{TRADITIONS[primaryTrad]?.label||"Classical"} · {STEPS.length}-Step Framework</div>
        <button onClick={()=>setView("generator")} style={{width:"100%",padding:"13px 0",borderRadius:13,background:"rgba(80,60,150,0.12)",border:"1px solid rgba(100,80,180,0.3)",fontFamily:F,fontSize:11,color:"rgba(160,140,220,0.8)",letterSpacing:3,textTransform:"uppercase",cursor:"pointer",marginBottom:9}}>
          ✧ Generate AI Ritual Plan
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// NATAL WHEEL CHART SVG (Phase 5a)
// ═══════════════════════════════════════════════════════════════════════
const SIGN_COLORS=["#D04040","#7A5030","#5080C0","#40A060","#D04040","#7A5030","#5080C0","#40A060","#D04040","#7A5030","#5080C0","#40A060"];
const SIGN_SYMS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ASP_COLORS={Conjunction:"#D4AF6A",Opposition:"#D24B31",Trine:"#5CA85C",Square:"#D24B31",Sextile:"#7CB8E0"};
