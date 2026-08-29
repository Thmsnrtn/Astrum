// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useCallback, useMemo } from "react";
import { P } from "../data/planets.js";
import { scanTransits } from "../engine/scan.js";
import { F, GOLD, L, T } from "../ui/theme.js";

export default function TransitsScreen({natalPos,now}){
  const [days,setDays]=useState(90);
  const [hits,setHits]=useState(null);
  const [running,setRunning]=useState(false);
  const [filter,setFilter]=useState("all");

  const run=useCallback(()=>{
    if(!natalPos){setHits([]);return;}
    setRunning(true);
    setTimeout(()=>{
      try{const h=scanTransits(natalPos,now,days);setHits(h);}catch(e){setHits([]);}
      setRunning(false);
    },50);
  },[natalPos,now,days]);

  const fmtDate=(d)=>{
    const diff=Math.round((d-now)/(86400000));
    return d.toLocaleDateString([],{month:"short",day:"numeric"})+" ("+(diff===0?"today":diff===1?"tmrw":diff+"d")+")";
  };

  const PLANET_FILTER=["all","moon","sun","mercury","venus","mars","jupiter","saturn"];
  const BENEFIC_ASPECTS=["Trine","Sextile","Conjunction"];
  const BENEFIC_PLANETS=["venus","jupiter","sun","moon"];
  const filtered=useMemo(()=>{
    if(!hits)return null;
    const f=hits.filter(h=>filter==="all"||h.tp===filter);
    // Sort: within same calendar day, benefic aspects first; then by date
    return f.sort((a,b)=>{
      const dayA=Math.floor(a.date.getTime()/86400000);
      const dayB=Math.floor(b.date.getTime()/86400000);
      if(dayA!==dayB)return dayA-dayB;
      const benefA=(BENEFIC_ASPECTS.includes(a.asp)?1:0)+(BENEFIC_PLANETS.includes(a.tp)?1:0);
      const benefB=(BENEFIC_ASPECTS.includes(b.asp)?1:0)+(BENEFIC_PLANETS.includes(b.tp)?1:0);
      return benefB-benefA;
    });
  },[hits,filter]);

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Transit Hit List</div>
        <div style={T(20)}>Upcoming Sky–Natal Contacts</div>
      </div>
      {!natalPos&&<div className="card" style={{margin:"0 14px"}}><div style={{fontFamily:F,fontSize:11,color:"rgba(var(--tint-rgb),0.4)"}}>Enter natal chart data to calculate transits.</div></div>}
      {natalPos&&(
        <>
          <div style={{padding:"0 14px 10px",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",gap:4}}>
              {[30,90,365].map(d=>(
                <button key={d} onClick={()=>setDays(d)} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${days===d?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.1)"}`,background:days===d?"rgba(var(--tint-rgb),0.08)":"transparent",color:days===d?GOLD:"rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:9,cursor:"pointer"}}>{d}d</button>
              ))}
            </div>
            <button onClick={run} disabled={running} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:8,background:"rgba(var(--tint-rgb),0.1)",border:"1px solid rgba(var(--tint-rgb),0.3)",color:GOLD,fontFamily:F,fontSize:9,cursor:running?"default":"pointer",opacity:running?0.6:1}}>
              {running?"Scanning…":"▶ Scan"}
            </button>
          </div>
          {/* Planet filter */}
          {hits&&(
            <div style={{overflowX:"auto",padding:"0 14px 8px"}}>
              <div style={{display:"flex",gap:4,minWidth:"max-content"}}>
                {PLANET_FILTER.map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${filter===f?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.08)"}`,background:filter===f?"rgba(var(--tint-rgb),0.08)":"transparent",color:filter===f?GOLD:"rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:9,cursor:"pointer"}}>
                    {f==="all"?"All":(P[f]?.sym+" "+P[f]?.name)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {hits===null&&<div style={{padding:"30px",textAlign:"center",fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.3)"}}>Press Scan to calculate transits</div>}
          {filtered&&filtered.length===0&&<div style={{padding:"20px 14px",fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.3)"}}>No transits found for this filter.</div>}
          {filtered&&filtered.length>0&&(
            <div className="card" style={{margin:"0 14px"}}>
              {filtered.map((hit,i)=>{
                const tp=P[hit.tp],np2=P[hit.np];
                const isBenefic=BENEFIC_ASPECTS.includes(hit.asp);
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderBottom:"1px solid rgba(var(--tint-rgb),0.04)",borderLeft:`2px solid ${isBenefic?"rgba(92,168,92,0.5)":"rgba(192,128,128,0.35)"}`,marginLeft:2,borderRadius:"0 6px 6px 0"}}>
                    <div style={{width:42,flexShrink:0}}>
                      <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)"}}>{hit.date.toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                      <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)"}}>{hit.date.toLocaleDateString([],{weekday:"short"})}</div>
                    </div>
                    <span className="planet-orb" style={{fontSize:14,color:tp?.col||GOLD,padding:"2px 4px"}}>{tp?.sym||hit.tp}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>
                        {tp?.name||hit.tp} <span style={{color:hit.col||"rgba(var(--tint-rgb),0.5)"}}>{hit.asp}</span> natal {np2?.name||hit.np}
                      </div>
                      <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)"}}>{fmtDate(hit.date)}</div>
                    </div>
                    <span style={{fontFamily:F,fontSize:9,color:isBenefic?"#5CA85C":"#C08080"}}>{isBenefic?"✦":"▼"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
