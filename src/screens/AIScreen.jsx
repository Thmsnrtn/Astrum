// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useRef } from "react";
import { aiConfigured, aiUnconfiguredMessage, askClaude } from "../ai/client.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { DECANS } from "../data/decans.js";
import { P } from "../data/planets.js";
import { DAY_NAMES, dailyMotion, dateToJD, getCombustion, getDignity, lonToZodiac, planetLon } from "../engine/astro.js";
import { groundingForAsync } from "../lib/rag.js";
import { F, L, T, GOLD } from "../ui/theme.js";

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
    return `CURRENT SKY (${DAY_NAMES[now.getDay()]} ${now.toLocaleDateString()}): Planetary Hour: ${P[hour.planet].name} (Hour ${hour.hourNum}${hour.equal?" — approximate, no place set":""}, Day of ${P[hour.dayRuler].name}) Planetary Positions: ${positions} Moon: ${eph.moonPhase}${eph.voc?.isVoC?" — VOID OF COURSE":""} Current Decan (Sun): Decan ${eph.decanIdx+1} — ${DECANS[eph.decanIdx].name} (${DECANS[eph.decanIdx].sign}) Active Fractal Layers: ${fd} Natal Planets: ${nd} Upcoming Elections (next 30 days): ${nextElections.join("; ")||"Scanning..."}`;
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
      <div style={{padding:"16px 18px 10px",borderBottom:"1px solid rgba(var(--tint-rgb),0.07)"}}>
        <div style={L()}>AI Working Planner</div>
        <div style={T(20)}>Build a Working ✧</div>
        <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.6}}>Describe your goal and deadline. I'll build a complete magical operation plan from all traditions.</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {messages.map((m,i)=>(
          <div key={i} style={{marginBottom:14,display:"flex",gap:9,animation:"float-in 0.3s ease-out"}}>
            {m.role==="assistant"&&<div style={{width:24,height:24,borderRadius:12,background:"rgba(var(--tint-rgb),0.15)",border:"1px solid rgba(var(--tint-rgb),0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,marginTop:2}}>✧</div>}
            <div style={{flex:1,maxWidth:"100%"}}>
              <div style={{borderRadius:m.role==="user"?12:14,background:m.role==="user"?"rgba(var(--tint-rgb),0.1)":"rgba(8,5,22,0.7)",border:`1px solid ${m.role==="user"?"rgba(var(--tint-rgb),0.2)":"rgba(var(--tint-rgb),0.09)"}`,padding:"11px 13px",backdropFilter:m.role!=="user"?"blur(16px)":"none"}}>
                <div style={{fontFamily:F,fontSize:11.5,color:"#C4A870",lineHeight:1.85,whiteSpace:"pre-wrap"}}>{m.content}</div>
              </div>
            </div>
            {m.role==="user"&&<div style={{width:24,height:24,borderRadius:12,background:"rgba(var(--tint-rgb),0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2,color:"rgba(var(--tint-rgb),0.5)"}}>☽</div>}
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:9,marginBottom:14}}>
          <div style={{width:24,height:24,borderRadius:12,background:"rgba(var(--tint-rgb),0.15)",border:"1px solid rgba(var(--tint-rgb),0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✧</div>
          <div style={{padding:"11px 13px",borderRadius:14,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(var(--tint-rgb),0.09)"}}>
            <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(var(--tint-rgb),0.4)",animation:`breathe 1.2s ease-in-out infinite`,animationDelay:`${i*0.3}s`}}/>)}</div>
          </div>
        </div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"8px 14px",borderTop:"1px solid rgba(var(--tint-rgb),0.07)",display:"flex",gap:8}}>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Describe your goal and deadline…" rows={2} style={{flex:1,resize:"none",fontSize:12,lineHeight:1.6}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{padding:"0 14px",borderRadius:10,background:input.trim()?"rgba(var(--tint-rgb),0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${input.trim()?"rgba(var(--tint-rgb),0.35)":"rgba(var(--tint-rgb),0.1)"}`,fontFamily:F,fontSize:10,color:input.trim()?GOLD:"#4A3020",letterSpacing:2,cursor:input.trim()?"pointer":"default",alignSelf:"flex-end",height:38}}>SEND</button>
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
