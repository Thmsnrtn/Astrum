// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useMemo } from "react";
import { BEHENIAN_DOCTRINE, getBehenian } from "../data/behenian.js";
import { FIXED_STARS } from "../data/fixedStars.js";
import { P } from "../data/planets.js";
import { norm, planetLon, starLonAt } from "../engine/astro.js";
import { DEFAULT_ARCUS_VISIONIS, HELIACAL_STARS, heliacalRising, starPhase } from "../engine/heliacal.js";
import { F, L, T } from "../ui/theme.js";

export default function StarsScreen({eph,natalPos,profile}){
  const [sel,setSel]=useState(null);
  const s=sel!==null?FIXED_STARS[sel]:null;
  // ── Appearances: morning/evening stars + coming heliacal risings ──
  const appearances=useMemo(()=>{
    const sunL=eph?.pos?.sun?.lon;
    const phases=sunL!=null?[["venus",starPhase(eph.pos.venus.lon,sunL)],["mercury",starPhase(eph.pos.mercury.lon,sunL)]]:[];
    const lat=profile?.natal?.lat,lon=profile?.natal?.lon;
    let risings=[];
    if(lat!=null&&lon!=null&&eph?.jd){
      const sunAt=jd=>planetLon("sun",jd);
      risings=HELIACAL_STARS.map(st=>{
        try{
          const hr=heliacalRising(st.lon,st.lat,eph.jd,lat,lon,sunAt,DEFAULT_ARCUS_VISIONIS);
          return hr?{...st,date:new Date((hr.jd-2440587.5)*86400000)}:null;
        }catch{return null;}
      }).filter(Boolean).sort((a,b)=>a.date-b.date);
    }
    return{phases,risings};
  },[Math.floor((eph?.jd||0)),profile]);
  const starActivity = FIXED_STARS.map((star,i)=>{
    const sLon=starLonAt(star,eph.jd);
    const nearTransit=Object.entries(eph.pos).filter(([pk,p])=>{let d=Math.abs(norm(sLon-p.lon));if(d>180)d=360-d;return d<3;}).map(([pk])=>pk);
    const nearNatal=natalPos?Object.entries(natalPos).filter(([pk,np])=>P[pk]&&np?.lon!=null&&(()=>{let d=Math.abs(norm(sLon-np.lon));if(d>180)d=360-d;return d<3;})()).map(([pk])=>pk):[];
    return{...star,sLon,idx:i,nearTransit,nearNatal,isActive:nearTransit.length>0||nearNatal.length>0};
  }).sort((a,b)=>b.isActive-a.isActive);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Stellar Magic</div>
        <div style={T(20)}>Fixed Stars</div>
        <div style={{fontFamily:F,fontSize:10,color:"#6A5030",fontStyle:"italic",marginTop:3,lineHeight:1.6}}>The Royal Stars and fixed stellar powers. Stars within 3° of a transiting or natal planet confer their nature on that planet's operations.</div>
      </div>
      {(appearances.phases.length>0||appearances.risings.length>0)&&(
        <div style={{margin:"0 14px 8px",padding:"10px 13px",borderRadius:12,background:"rgba(8,5,22,0.6)",border:"1px solid rgba(200,175,100,0.12)"}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.45)",letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Appearances</div>
          {appearances.phases.map(([pk,ph])=>(
            <div key={pk} style={{fontFamily:F,fontSize:10,color:P[pk].col,padding:"2px 0"}}>{P[pk].sym} {P[pk].name} is the <span style={{color:"#D4C098"}}>{ph.phase}</span> ({ph.elongation>0?"+":""}{ph.elongation}° from the Sun)</div>
          ))}
          {appearances.risings.slice(0,4).map(st=>(
            <div key={st.name} style={{fontFamily:F,fontSize:9.5,color:"#B8A578",padding:"2px 0"}}>★ {st.name} rises heliacally ~{st.date.toLocaleDateString("en-US",{month:"short",day:"numeric"})} <span style={{color:"#6A5028",fontStyle:"italic"}}>— {st.note}</span></div>
          ))}
          <div style={{fontFamily:F,fontSize:8,color:"#5A4020",fontStyle:"italic",marginTop:4}}>Arcus visionis 10° (Ptolemaic convention) — approximate; haze and horizon shift the true first sighting by days.</div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"center",marginBottom:4}}>
        <svg width={280} height={160} viewBox="0 0 280 160">
          <rect width={280} height={160} fill="rgba(4,4,16,0.9)" rx={12}/>
          <line x1={10} y1={80} x2={270} y2={80} stroke="rgba(200,175,100,0.08)" strokeWidth={1} strokeDasharray="4,4"/>
          {Array.from({length:13}).map((_,i)=>(
            <line key={i} x1={10+i*20} y1={74} x2={10+i*20} y2={86} stroke="rgba(200,175,100,0.15)" strokeWidth={0.5}/>
          ))}
          {FIXED_STARS.map((star,i)=>{
            const act=starActivity.find(s2=>s2.name===star.name);
            const x=10+((act?.sLon??starLonAt(star,eph.jd))/360)*260, y=80;
            const size=Math.max(2.5,4.5-star.mag*0.5);
            const isActive=act?.isActive;
            return (
              <g key={star.name} onClick={()=>setSel(i===sel?null:i)} style={{cursor:"pointer"}}>
                {isActive&&<circle cx={x} cy={y} r={size+4} fill="none" stroke={star.col} strokeWidth={0.8} opacity={0.5}/>}
                <circle cx={x} cy={y} r={size} fill={star.col} opacity={isActive?1:0.5}/>
                {sel===i&&<circle cx={x} cy={y} r={size+6} fill="none" stroke={star.col} strokeWidth={1}/>}
                <text x={x} y={y-size-5} textAnchor="middle" fill={star.col} fontSize={6} fontFamily="serif" opacity={isActive?0.9:0.35}>{star.name}</text>
              </g>
            );
          })}
          {Object.entries(eph.pos).map(([pk,pos])=>{
            const x=10+(pos.lon/360)*260;
            return <text key={pk} x={x} y={96} textAnchor="middle" fill={P[pk].col} fontSize={8} fontFamily="serif" opacity={0.7}>{P[pk].sym}</text>;
          })}
        </svg>
      </div>
      {s&&(
        <div className="card" style={{margin:"0 14px 10px",background:`linear-gradient(135deg,rgba(8,5,22,0.8),rgba(200,180,255,0.04))`,borderColor:"rgba(200,180,255,0.15)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={L("rgba(180,190,220,0.6)",8)}>Fixed Star · {s.sign}</div>
              <div style={T(17,s.col)}>{s.name}</div>
              <div style={{fontFamily:F,fontSize:10,color:"rgba(180,190,220,0.5)",marginTop:1}}>Nature: {s.nature} · Mag: {s.mag}</div>
            </div>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",lineHeight:1.8,marginBottom:8}}>{s.desc}</div>
          <div style={L("rgba(180,190,220,0.5)",7)}>Magic</div>
          <div style={{fontFamily:F,fontSize:11,color:"#C4A870",fontStyle:"italic",lineHeight:1.7,marginTop:4}}>{s.magic}</div>
          {/* Behenian talismanic materia — Agrippa I.32/II.47, Hermes on the 15 Stars */}
          {(()=>{
            const b=getBehenian(s.name);
            if(!b)return null;
            return(
              <div style={{marginTop:9,padding:"10px 12px",borderRadius:10,background:"rgba(200,180,255,0.05)",border:"1px solid rgba(200,180,255,0.18)"}}>
                <div style={{fontFamily:F,fontSize:8,color:"rgba(200,180,255,0.65)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>✦ Behenian Star — {b.latin}</div>
                <div style={{fontFamily:F,fontSize:10,color:"#C4A870",lineHeight:1.8}}>
                  <span style={{color:"rgba(200,180,255,0.6)"}}>STONE</span> {b.stone} · <span style={{color:"rgba(200,180,255,0.6)"}}>HERB</span> {b.herb}
                </div>
                <div style={{fontFamily:F,fontSize:9.5,color:"rgba(200,175,100,0.5)",marginTop:3}}>Nature: {b.nature}{b.ptolemy?` · Ptolemy ${b.ptolemy}`:""}</div>
                <div style={{fontFamily:F,fontSize:10.5,color:"#9A8060",fontStyle:"italic",lineHeight:1.7,marginTop:6}}>Image: {b.image}</div>
                <div style={{fontFamily:F,fontSize:10.5,color:"#C4A870",fontStyle:"italic",lineHeight:1.7,marginTop:4}}>{b.virtue}</div>
                {b.variant&&<div style={{fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.6)",fontStyle:"italic",marginTop:4,lineHeight:1.5}}>{b.variant}</div>}
                <div style={{fontFamily:F,fontSize:8.5,color:"rgba(200,175,100,0.4)",fontStyle:"italic",marginTop:6,lineHeight:1.6}}>{BEHENIAN_DOCTRINE.thebit}</div>
              </div>
            );
          })()}
          {s.warning!=="One of the most benefic stars in the sky. No major cautions."&&(
            <div style={{marginTop:8,padding:"7px 9px",borderRadius:8,background:"rgba(180,80,80,0.1)",border:"1px solid rgba(180,80,80,0.25)"}}>
              <div style={{fontFamily:F,fontSize:9,color:"rgba(220,140,140,0.8)",fontStyle:"italic"}}>⚠ {s.warning}</div>
            </div>
          )}
          {(() => {
            const act=starActivity.find(sa=>sa.name===s.name);
            const all=[...act.nearTransit.map(pk=>({pk,type:"transit"})),...act.nearNatal.map(pk=>({pk,type:"natal"}))];
            if(all.length===0) return null;
            return (
              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(200,175,100,0.08)"}}>
                <div style={L("rgba(255,215,0,0.5)",7)}>Currently Active</div>
                <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                  {all.map(({pk,type})=>(
                    <div key={pk+type} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:7,background:`${P[pk].col}12`,border:`1px solid ${P[pk].col}30`}}>
                      <span style={{color:P[pk].col,fontSize:11}}>{P[pk].sym}</span>
                      <span style={{fontFamily:F,fontSize:7,color:P[pk].col,letterSpacing:1}}>{type.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      <div className="card" style={{margin:"0 14px"}}>
        <div style={L()}>The {FIXED_STARS.length} Stars</div>
        <div style={{marginTop:8}}>
          {starActivity.map((star,i)=>(
            <button key={star.name} className="row-btn" onClick={()=>setSel(sel===star.idx?null:star.idx)}>
              <div style={{width:8,height:8,borderRadius:4,background:star.col,flexShrink:0,opacity:star.isActive?1:0.4}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:F,fontSize:12,color:star.isActive?"#D4AF6A":"#C4A870"}}>{star.name}</span>
                  {star.nearTransit.length>0&&star.nearTransit.map(pk=><span key={pk} style={{color:P[pk].col,fontSize:9}}>{P[pk].sym}</span>)}
                  {star.nearNatal?.length>0&&star.nearNatal.map(pk=><span key={pk+"n"} style={{color:"rgba(255,215,0,0.6)",fontSize:8}}>✦{P[pk].sym}</span>)}
                </div>
                <div style={{fontFamily:F,fontSize:8,color:"#5A4020"}}>{star.sign} · {star.nature}</div>
              </div>
              <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)"}}>{star.isActive?"ACTIVE":""}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
