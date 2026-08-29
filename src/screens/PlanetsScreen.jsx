// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState } from "react";
import { P } from "../data/planets.js";
import { dateToJD, fmtTime, nextIngress } from "../engine/astro.js";
import { DIGNITY_COL, DIGNITY_LBL, F, L, T, VOWELS } from "../ui/theme.js";

export default function PlanetsScreen({eph,natalPos,now}){
  const [sel,setSel]=useState("jupiter");
  const [tab,setTab]=useState("overview");
  const pl=P[sel],pos=eph.pos[sel],natal=natalPos?.[sel];
  const dc=DIGNITY_COL[pos.dignity];
  const ingress=nextIngress(sel,dateToJD(now));
  const ingressDays=((ingress.jd-dateToJD(now))*24);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"12px 14px",display:"flex",gap:5}}>
        {Object.keys(P).map(pk=>{
          const pl2=P[pk],pos2=eph.pos[pk],a=sel===pk;
          return (
            <button key={pk} onClick={()=>{setSel(pk);setTab("overview");}} style={{flex:1,padding:"8px 4px",borderRadius:11,background:a?`${pl2.col}18`:"rgba(8,5,22,0.5)",border:`1px solid ${a?pl2.col+"50":"rgba(var(--tint-rgb),0.09)"}`,cursor:"pointer"}}>
              <div style={{fontSize:15,textAlign:"center",color:pl2.col}}>{pl2.sym}</div>
              <div style={{fontFamily:F,fontSize:8,color:a?pl2.col:DIGNITY_COL[pos2.dignity],letterSpacing:1,textAlign:"center",marginTop:2}}>{pos2.isRetro?"℞":DIGNITY_LBL[pos2.dignity].split(" ")[0].slice(0,3).toUpperCase()}</div>
            </button>
          );
        })}
      </div>
      <div style={{padding:"2px 14px 10px",background:`linear-gradient(180deg,${pl.col}0D 0%,transparent 100%)`}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:26,background:`${pl.col}14`,border:`2px solid ${pl.col}45`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:pl.col,fontFamily:"serif"}}>{pl.sym}</div>
          <div>
            <div style={T(22,pl.col)}>{pl.name}</div>
            <div style={{fontFamily:F,fontSize:10,color:dc,marginTop:2}}>{pos.zodiac.degree}° {pos.zodiac.name} · {DIGNITY_LBL[pos.dignity]}{pos.isRetro?" · ℞ Retro":""}</div>
            {pos.combust&&<div style={{fontFamily:F,fontSize:9,color:"rgba(245,197,24,0.6)",marginTop:1}}>☌ {pos.combust.type==="combust"?"Combust":"Under Sunbeams"} ({pos.combust.diff}° from Sun)</div>}
            {natal&&<div style={{fontFamily:F,fontSize:9,color:"rgba(255,215,0,0.5)",marginTop:1}}>Natal: {natal.dignity} in {natal.decan.name}</div>}
          </div>
        </div>
        <div style={{display:"flex",gap:5,marginTop:10}}>
          {["overview","materia","ritual","hymn"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"5px 10px",borderRadius:7,background:tab===t?`${pl.col}18`:"rgba(0,0,0,0.3)",border:`1px solid ${tab===t?pl.col+"40":"rgba(var(--tint-rgb),0.1)"}`,fontFamily:F,fontSize:8,color:tab===t?pl.col:"#7A6030",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {tab==="overview"&&(
          <>
            <div className="card">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px"}}>
                {[["Day",pl.day],["Metal",pl.metal],["Number",pl.number],["Angel",pl.angel],["Intelligence",pl.intelligence],["Spirit",pl.spirit]].map(([k,v])=>(
                  <div key={k}><div style={L("rgba(var(--tint-rgb),0.4)",7)}>{k}</div><div style={{fontFamily:F,fontSize:11,color:"#C4A870",marginTop:2}}>{v}</div></div>
                ))}
              </div>
            </div>
            <div className="card">
              <div style={L()}>Domains</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
                {pl.domains.map(d=><span key={d} className="chip" style={{color:pl.col,borderColor:`${pl.col}28`}}>{d}</span>)}
              </div>
            </div>
            <div className="card">
              <div style={L()}>Ingress Countdown</div>
              <div style={{fontFamily:F,fontSize:11,color:"#C4A870",marginTop:6,fontStyle:"italic"}}>
                {pl.name} enters {ingress.sign.sym} {ingress.sign.name} in {fmtTime(ingressDays*3600)} · This is {pos.dignity==="peregrine"||pos.dignity==="detriment"||pos.dignity==="fall"?"a potential improvement":"a transition to watch"}
              </div>
            </div>
            {natal&&(
              <div className="card" style={{background:"rgba(255,215,0,0.05)",borderColor:"rgba(255,215,0,0.15)"}}>
                <div style={L("rgba(255,215,0,0.6)")}>Natal Position</div>
                <div style={{fontFamily:F,fontSize:12,color:"rgba(255,215,0,0.8)",marginTop:6,fontStyle:"italic"}}>
                  Born with {pl.name} in {natal.decan.name} ({natal.decan.sym} {natal.decan.sign} · {natal.dignity})
                </div>
                <div style={{fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.5)",marginTop:4,lineHeight:1.7}}>
                  {natal.dignity==="domicile"||natal.dignity==="exaltation"?"This is a strong natal placement — working with this planet is naturally amplified for you.":"This natal position means working with this planet requires more care and precise timing."}
                </div>
              </div>
            )}
          </>
        )}
        {tab==="materia"&&(
          <>
            {[["Stone",pl.stone],["Incense",pl.incense],["Essential Oils",pl.oils],["Herbs",pl.herbs],["Color",pl.color],["Metal",pl.metal]].map(([k,v])=>(
              <div key={k} className="card">
                <div style={L(`${pl.col}70`,8)}>{k}</div>
                <div style={{fontFamily:F,fontSize:12,color:"#C4A870",marginTop:5,lineHeight:1.7}}>{v}</div>
              </div>
            ))}
          </>
        )}
        {tab==="ritual"&&(
          <div className="card">
            <div style={L(`${pl.col}70`)}>Classical Ritual Preparation</div>
            <div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",marginTop:9,lineHeight:2}}>{pl.ritual}</div>
            <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${pl.col}18`}}>
              <div style={L(`${pl.col}60`,8)}>Sacred Vowel — Hermetic Tradition</div>
              <div style={{display:"flex",alignItems:"center",gap:14,marginTop:9,padding:"10px 12px",borderRadius:10,background:"rgba(0,0,0,0.3)"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:38,color:pl.col,fontFamily:"serif",lineHeight:1}}>{VOWELS[sel]?.l}</div>
                  <div style={{fontFamily:F,fontSize:11,color:pl.col,marginTop:4}}>{VOWELS[sel]?.p}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)"}}>{pl.vowelGreek}</div>
                </div>
                <div style={{flex:1,fontFamily:F,fontSize:10,color:"#9A8060",fontStyle:"italic",lineHeight:1.7}}>Sound sustained for pure {pl.name} attunement. Day short, hour long in the 49 Calls.</div>
              </div>
            </div>
          </div>
        )}
        {tab==="hymn"&&(
          <div className="card">
            <div style={L(`${pl.col}70`)}>Orphic Hymn to the {pl.name}</div>
            <div style={{fontFamily:F,fontSize:14,color:"#D4C0A0",fontStyle:"italic",lineHeight:2.2,marginTop:10}}>{pl.orphic}</div>
          </div>
        )}
      </div>
    </div>
  );
}
