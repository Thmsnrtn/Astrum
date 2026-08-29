// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useEffect } from "react";
import { aiConfigured, aiUnconfiguredMessage, askClaude } from "../ai/client.js";
import { P } from "../data/planets.js";
import { TRADITIONS } from "../data/traditions.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { addOutcome, createCasting } from "../lib/castings.js";
import { F, L, T } from "../ui/theme.js";

export default function JournalScreen({profile,natalPos}){
  const [entries,setEntries]=useState([]);
  const [showNew,setShowNew]=useState(false);
  const [form,setForm]=useState({planet:"jupiter",intent:"",outcome:"",date:new Date().toISOString().split("T")[0]});
  const [reflection,setReflection]=useState(null);
  const [reflecting,setReflecting]=useState(false);
  useEffect(()=>{(async()=>{try{const r=await window.storage.get("astrum_journal");if(r?.value)setEntries(JSON.parse(r.value));}catch(e){}})();},[]);
  const save=async()=>{
    const e={id:Date.now(),...form};const ne=[e,...entries];setEntries(ne);setShowNew(false);
    setForm({planet:"jupiter",intent:"",outcome:"",date:new Date().toISOString().split("T")[0]});
    try{await window.storage.set("astrum_journal",JSON.stringify(ne));}catch(e){}
    // Operator's Loop: every journal working becomes a casting record
    try{
      const today=new Date().toISOString().split("T")[0];
      const at=e.date===today?new Date():new Date(`${e.date}T12:00:00`);
      const casting=createCasting({kind:"working",title:(e.intent||"Journal working").slice(0,60),intent:e.intent,planet:e.planet,
        conditions:conditionsFromProfile(at,profile,natalPos,null,e.date!==today),links:{journalId:e.id},createdAt:at.toISOString()});
      if(e.outcome)addOutcome(casting.id,{verdict:"unknown",note:e.outcome});
    }catch(err){}
  };
  const del=async(id)=>{const ne=entries.filter(e=>e.id!==id);setEntries(ne);try{await window.storage.set("astrum_journal",JSON.stringify(ne));}catch(e){}};
  const reflect=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setReflection(aiUnconfiguredMessage());return;}
    setReflecting(true);setReflection(null);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const entrySummary=entries.slice(0,20).map(e=>`[${e.date}] ${P[e.planet]?.name||e.planet}: ${e.intent}${e.outcome?` → ${e.outcome}`:""}`).join("\n");
    const sys=`You are an analytical magical advisor reviewing a practitioner's journal. Look for patterns: which planets appear most often, success vs. failure patterns, timing observations, seasonal patterns, repeating intentions. Be specific — cite exact data from the journal. Give actionable recommendations. Tradition: ${trad}.`;
    const userMsg=`Here is my magical practice journal (${entries.length} entries). Analyze it for patterns and give me your honest assessment and recommendations:\n\n${entrySummary}`;
    try{
      setReflection(await askClaude({apiKey,system:sys,messages:[{role:"user",content:userMsg}],maxTokens:900}));
    }catch(e){setReflection(e.message||"Reflection unavailable — check connection.");}
    setReflecting(false);
  };
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div style={L()}>Practice Journal</div><div style={T(20)}>Record & Reflect</div></div>
        <div style={{display:"flex",gap:6}}>
          {entries.length>=3&&<button onClick={reflect} disabled={reflecting} style={{padding:"8px 12px",borderRadius:10,background:"rgba(100,80,160,0.15)",border:"1px solid rgba(100,80,160,0.35)",fontFamily:F,fontSize:9,color:"rgba(160,140,220,0.8)",letterSpacing:1,cursor:"pointer"}}>{reflecting?"…":"REFLECT"}</button>}
          <button onClick={()=>setShowNew(!showNew)} style={{padding:"8px 14px",borderRadius:10,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.28)",fontFamily:F,fontSize:9,color:"#D4AF6A",letterSpacing:2,cursor:"pointer"}}>{showNew?"CANCEL":"+ LOG"}</button>
        </div>
      </div>
      {reflection&&(
        <div style={{margin:"0 14px 10px",padding:"13px 14px",borderRadius:13,background:"rgba(20,15,40,0.8)",border:"1px solid rgba(100,80,160,0.25)"}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(160,140,220,0.6)",letterSpacing:2,marginBottom:8}}>AI REFLECTION · {entries.length} ENTRIES ANALYZED</div>
          <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{reflection}</div>
          <button onClick={()=>setReflection(null)} style={{marginTop:10,background:"none",border:"none",fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",cursor:"pointer",letterSpacing:1}}>DISMISS</button>
        </div>
      )}
      {showNew&&<div style={{margin:"0 14px 10px",padding:"13px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,175,100,0.1)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Date</div><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",width:"100%",fontSize:11}}/></div>
          <div><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Planet</div>
            <select value={form.planet} onChange={e=>setForm({...form,planet:e.target.value})} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",width:"100%",fontSize:11}}>
              {Object.keys(P).map(pk=><option key={pk} value={pk}>{P[pk].name}</option>)}
            </select>
          </div>
        </div>
        {[["Intention","intent","What was the working for?"],["Outcome","outcome","What happened?"]].map(([lbl,key,ph])=><div key={key} style={{marginBottom:7}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{lbl}</div>
          <textarea value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} rows={2} placeholder={ph} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",width:"100%",fontSize:11,resize:"none"}}/>
        </div>)}
        <button onClick={save} disabled={!form.intent} style={{width:"100%",padding:"10px 0",borderRadius:10,background:form.intent?"rgba(212,175,106,0.1)":"rgba(0,0,0,0.3)",border:"1px solid "+(form.intent?"rgba(212,175,106,0.3)":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:form.intent?"#D4AF6A":"#5A4020",letterSpacing:2,textTransform:"uppercase",cursor:form.intent?"pointer":"default"}}>Save Entry</button>
      </div>}
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {entries.length===0?<div style={{textAlign:"center",padding:"40px 20px",fontFamily:F,fontSize:12,color:"#5A4020",fontStyle:"italic",lineHeight:1.8}}>Log your first working to begin building your personal magical record.</div>:
        entries.map(e=>{const pl=P[e.planet];return(<div key={e.id} style={{marginBottom:9,padding:"12px 13px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid "+pl.col+"17"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:13,color:pl.col}}>{pl.sym}</span>
              <span style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{pl.name} · {e.date}</span>
            </div><div style={{fontFamily:F,fontSize:12,color:"#D4AF6A",marginTop:3,fontStyle:"italic"}}>{e.intent}</div></div>
            <button onClick={()=>del(e.id)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.25)",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
          {e.outcome&&<div style={{marginTop:5,padding:"6px 9px",borderRadius:8,background:"rgba(0,0,0,0.3)",border:"1px solid "+pl.col+"14",fontFamily:F,fontSize:10,color:"#9A8060",fontStyle:"italic",lineHeight:1.7}}>{e.outcome}</div>}
        </div>);})}
      </div>
    </div>
  );
}
