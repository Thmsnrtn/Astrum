// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState } from "react";
import { aspectMeaning } from "../data/aspectMeanings.js";
import { P } from "../data/planets.js";
import { perfection } from "../lib/geomancy.js";
import { F, L, T, GOLD } from "../ui/theme.js";

export default function AspectsScreen({eph}){
  const [sel,setSel]=useState(null);
  const asps=eph.aspects||[];
  const pks=["sun","moon","mercury","venus","mars","jupiter","saturn"];
  const grid={};asps.forEach(a=>{grid[a.p1+"*"+a.p2]=a;grid[a.p2+"*"+a.p1]=a;});
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Live Planetary Aspects</div>
        <div style={T(20)}>Aspect Grid</div>
      </div>
      <div style={{margin:"0 14px 10px",overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse"}}>
          <thead><tr><td style={{width:22}}/>{pks.slice(1).map(pk=><td key={pk} style={{textAlign:"center",padding:"3px",fontFamily:"serif",fontSize:14,color:P[pk].col}}>{P[pk].sym}</td>)}</tr></thead>
          <tbody>{pks.slice(0,-1).map((pk1,ri)=><tr key={pk1}>
            <td style={{fontFamily:"serif",fontSize:14,color:P[pk1].col,paddingRight:4}}>{P[pk1].sym}</td>
            {pks.slice(1).map((pk2,ci)=>{
              if(ci<ri)return<td key={pk2} style={{background:"rgba(0,0,0,0.2)",borderRadius:4,width:30,height:30}}/>;
              if(pk1===pk2)return<td key={pk2} style={{width:30,height:30,textAlign:"center",fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.2)"}}>—</td>;
              const a=grid[pk1+"*"+pk2]||grid[pk2+"*"+pk1];
              const idx=a?asps.indexOf(a):-1;
              return<td key={pk2} onClick={()=>setSel(idx>=0?(sel===idx?null:idx):null)} style={{textAlign:"center",padding:"2px",cursor:a?"pointer":"default"}}>
                {a?<div style={{width:28,height:28,borderRadius:5,background:a.aspect.col+"16",border:"1px solid "+a.aspect.col+"35",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:a.aspect.col}}>{a.aspect.s}</div>:<div style={{width:28,height:28,borderRadius:5,background:"rgba(0,0,0,0.2)"}}/>}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      {sel!==null&&asps[sel]&&<div style={{margin:"0 14px 10px",borderRadius:13,background:"rgba(8,5,22,0.8)",border:"1px solid "+asps[sel].aspect.col+"30",padding:"12px 14px"}}>
        <div style={{fontFamily:F,fontSize:15,color:asps[sel].aspect.col}}>{P[asps[sel].p1].sym} {asps[sel].aspect.n} {P[asps[sel].p2].sym}</div>
        <div style={{fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.5)",marginTop:2}}>{asps[sel].orb}° orb · {asps[sel].applying?"Applying":"Separating"} · {asps[sel].aspect.nat}</div>
        {(()=>{
          const m=aspectMeaning(asps[sel].p1,asps[sel].p2,asps[sel].aspect.n);
          if(!m)return null;
          return(<>
            <div style={{fontFamily:F,fontSize:11,color:"#C4A870",fontStyle:"italic",lineHeight:1.8,marginTop:8}}>{m.essence}</div>
            <div style={{fontFamily:F,fontSize:10.5,color:"#9A8060",fontStyle:"italic",lineHeight:1.7,marginTop:5}}>{m.mode}</div>
            <div style={{fontFamily:F,fontSize:9.5,color:asps[sel].applying?"#7AB07A":"rgba(var(--tint-rgb),0.45)",fontStyle:"italic",marginTop:6,lineHeight:1.6}}>
              {asps[sel].applying?"Applying — the dialogue is building toward perfection; workings ride the wave.":"Separating — the exchange has already perfected; its matter is settled and dispersing."}
            </div>
            <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.3)",marginTop:5}}>Traditional significations after the classical synthesis — interpretive convention, not quotation.</div>
          </>);
        })()}
        <button onClick={()=>setSel(null)} style={{marginTop:8,background:"none",border:"none",color:"rgba(var(--tint-rgb),0.4)",cursor:"pointer",fontFamily:F,fontSize:9}}>CLOSE</button>
      </div>}
      <div style={{margin:"0 14px",padding:"12px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(var(--tint-rgb),0.09)"}}>
        {asps.length===0?<div style={{fontFamily:F,fontSize:11,color:"#5A4020",fontStyle:"italic"}}>No major aspects within orb.</div>:
        asps.map((a,i)=><button key={i} onClick={()=>setSel(sel===i?null:i)} style={{width:"100%",background:"none",border:"none",borderBottom:"1px solid rgba(var(--tint-rgb),0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"7px 0",textAlign:"left"}}>
          <span style={{fontSize:13,color:a.aspect.col,width:20,textAlign:"center"}}>{a.aspect.s}</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:11,color:sel===i?GOLD:"#C4A870"}}>{P[a.p1].sym} {a.aspect.n} {P[a.p2].sym}</div>
            <div style={{fontFamily:F,fontSize:9,color:"#5A4020"}}>{a.orb}° · {a.applying?"Applying":"Separating"}</div>
          </div>
        </button>)}
      </div>
    </div>
  );
}
