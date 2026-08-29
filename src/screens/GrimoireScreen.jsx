// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { GRIM_CATS } from "../data/uiTables.jsx";
import { useState, useEffect } from "react";
import { P } from "../data/planets.js";
import { F, L, T, GOLD } from "../ui/theme.js";

export default function GrimoireScreen({profile}){
  const [entries,setEntries]=useState([]);
  const [sel,setSel]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [form,setForm]=useState({title:"",body:"",planet:"sun",category:"ritual",tags:""});
  const [catFilter,setCatFilter]=useState("all");
  useEffect(()=>{(async()=>{try{const r=await window.storage.get("astrum_grimoire");if(r?.value)setEntries(JSON.parse(r.value));}catch(e){}})();},[]);
  const save=async()=>{
    const e={id:Date.now(),...form,tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean),date:new Date().toISOString().split("T")[0],type:"manual"};
    const ne=[e,...entries];setEntries(ne);setShowNew(false);setForm({title:"",body:"",planet:"sun",category:"ritual",tags:""});
    try{await window.storage.set("astrum_grimoire",JSON.stringify(ne));}catch(e){}
  };
  const del=async(id)=>{const ne=entries.filter(e=>e.id!==id);setEntries(ne);setSel(null);try{await window.storage.set("astrum_grimoire",JSON.stringify(ne));}catch(e){}};
  const IS={width:"100%",marginTop:4,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(var(--tint-rgb),0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:12,boxSizing:"border-box"};
  const filtered=catFilter==="all"?entries:entries.filter(e=>e.category===catFilter);
  if(sel){
    const e=entries.find(x=>x.id===sel);
    if(!e)return null;
    const pl=P[e.planet]||P.sun;
    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
        <div style={{padding:"12px 16px 10px",borderBottom:"1px solid rgba(var(--tint-rgb),0.07)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:10,cursor:"pointer",letterSpacing:1}}>← Grimoire</button>
          <button onClick={()=>del(e.id)} style={{background:"none",border:"none",color:"rgba(150,70,70,0.5)",fontFamily:F,fontSize:9,cursor:"pointer",letterSpacing:1}}>DELETE</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
            <span style={{fontSize:20,color:pl.col}}>{pl.sym}</span>
            <div>
              <div style={{fontFamily:F,fontSize:15,color:GOLD}}>{e.title||"Untitled"}</div>
              <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.4)",marginTop:2}}>{e.date} · {e.category} {e.type==="ai-generated"?"· AI Generated":""}</div>
            </div>
          </div>
          {e.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
            {e.tags.map(t=><span key={t} style={{padding:"3px 8px",borderRadius:6,background:"rgba(var(--tint-rgb),0.08)",border:"1px solid rgba(var(--tint-rgb),0.15)",fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.5)"}}>{t}</span>)}
          </div>}
          <div style={{fontFamily:F,fontSize:11.5,color:"#C4A870",lineHeight:2,whiteSpace:"pre-wrap"}}>{e.body}</div>
        </div>
      </div>
    );
  }
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div style={L()}>Personal Grimoire</div><div style={T(20)}>Book of Shadows</div></div>
        <button onClick={()=>setShowNew(!showNew)} style={{padding:"8px 14px",borderRadius:10,background:"rgba(var(--tint-rgb),0.1)",border:"1px solid rgba(var(--tint-rgb),0.28)",fontFamily:F,fontSize:9,color:GOLD,letterSpacing:2,cursor:"pointer"}}>{showNew?"CANCEL":"+ NEW"}</button>
      </div>
      {showNew&&(
        <div style={{margin:"0 14px 10px",padding:"13px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(var(--tint-rgb),0.1)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Category</div>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{...IS,marginTop:0}}>
                {GRIM_CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div><div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Planet</div>
              <select value={form.planet} onChange={e=>setForm({...form,planet:e.target.value})} style={{...IS,marginTop:0}}>
                {Object.keys(P).map(pk=><option key={pk} value={pk}>{P[pk].name}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:8}}><div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Title</div><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Entry title" style={IS}/></div>
          <div style={{marginBottom:8}}><div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Body</div><textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={5} placeholder="Your entry…" style={{...IS,resize:"vertical"}}/></div>
          <div style={{marginBottom:8}}><div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Tags (comma-separated)</div><input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="jupiter, talisman, career…" style={IS}/></div>
          <button onClick={save} disabled={!form.title&&!form.body} style={{width:"100%",padding:"10px 0",borderRadius:10,background:"rgba(var(--tint-rgb),0.1)",border:"1px solid rgba(var(--tint-rgb),0.3)",fontFamily:F,fontSize:9,color:GOLD,letterSpacing:2,cursor:"pointer"}}>Save Entry</button>
        </div>
      )}
      <div style={{display:"flex",gap:6,padding:"0 14px 8px",overflowX:"auto"}}>
        {["all",...GRIM_CATS].map(c=>(
          <button key={c} onClick={()=>setCatFilter(c)} style={{padding:"5px 10px",borderRadius:8,background:catFilter===c?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${catFilter===c?"rgba(var(--tint-rgb),0.35)":"rgba(var(--tint-rgb),0.1)"}`,fontFamily:F,fontSize:8,color:catFilter===c?GOLD:"rgba(var(--tint-rgb),0.4)",letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap"}}>
            {c.charAt(0).toUpperCase()+c.slice(1)}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {filtered.length===0?<div style={{textAlign:"center",padding:"40px 20px",fontFamily:F,fontSize:12,color:"#5A4020",fontStyle:"italic",lineHeight:1.8}}>Your grimoire is empty. Use AI Ritual Generator to create your first entry, or add one manually.</div>:
        filtered.map(e=>{const pl=P[e.planet]||P.sun;return(
          <button key={e.id} onClick={()=>setSel(e.id)} style={{width:"100%",marginBottom:7,padding:"12px 13px",borderRadius:12,background:"rgba(8,5,22,0.65)",border:`1px solid ${pl.col}17`,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16,color:pl.col,flexShrink:0}}>{pl.sym}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:F,fontSize:12,color:GOLD,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title||"Untitled"}</div>
              <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.35)",marginTop:2}}>{e.date} · {e.category}{e.type==="ai-generated"?" · AI":""}</div>
            </div>
            <span style={{color:"rgba(var(--tint-rgb),0.2)",fontSize:14,flexShrink:0}}>›</span>
          </button>
        );})}
      </div>
    </div>
  );
}
