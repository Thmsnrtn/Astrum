// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState } from "react";
import { DECAN_IMAGES } from "../data/decanImages.js";
import { DECANS } from "../data/decans.js";
import { P } from "../data/planets.js";
import { fmtTime } from "../engine/astro.js";
import { DIGNITY_COL, DIGNITY_LBL, F, L, T } from "../ui/theme.js";

export default function DecansScreen({eph,fractal,natalPos,mode,setMode}){
  const [sel,setSel]=useState(eph.decanIdx);
  const d=DECANS[sel],col=P[d.ruler].col;
  const isCurrentSolar=sel===eph.decanIdx;
  const isFractalActive=fractal.levels.some(l=>l.idx===sel);
  const isNatal=natalPos&&Object.entries(natalPos).filter(([pk])=>P[pk]).some(([,np])=>np.decanIdx===sel);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Classical Tradition · 36 Faces</div>
        <div style={T(20)}>The Thirty-Six Faces</div>
      </div>
      <div className="card" style={{margin:"0 14px 10px",background:`linear-gradient(135deg,rgba(8,5,22,0.8),${col}09)`,borderColor:`${col}28`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={L(`${col}80`,8)}>Decan {d.n} · {d.sym} {d.sign} · {d.ruler.charAt(0).toUpperCase()+d.ruler.slice(1)}</div>
            <div style={T(18,col)}>{d.name}</div>
            <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",marginTop:2}}>Tarot: {d.tarot}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
            {isCurrentSolar&&<span className="chip" style={{color:"#D4AF6A",borderColor:"rgba(212,175,106,0.3)"}}>Solar Now</span>}
            {isFractalActive&&<span className="chip" style={{color:"#D4AF6A",borderColor:"rgba(212,175,106,0.3)"}}>Fractal Active</span>}
            {isNatal&&<span className="chip" style={{color:"#FFD700",borderColor:"rgba(255,215,0,0.3)"}}>In Natal</span>}
          </div>
        </div>
        <div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",marginTop:10,lineHeight:1.8}}>{d.magic}</div>
        {/* The verified face images — Picatrix II.11 & Agrippa II.37 */}
        {DECAN_IMAGES[sel]&&(
          <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:"rgba(0,0,0,0.3)",border:`1px solid ${col}20`}}>
            <div style={{fontFamily:F,fontSize:8,color:`${col}90`,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>The Image of the Face</div>
            <div style={{fontFamily:F,fontSize:10.5,color:"#C4A870",fontStyle:"italic",lineHeight:1.8}}>{DECAN_IMAGES[sel].p}</div>
            <div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.35)",marginTop:3}}>— Picatrix II.11 (Latin tradition)</div>
            <div style={{fontFamily:F,fontSize:10,color:"#9A8060",fontStyle:"italic",lineHeight:1.7,marginTop:7}}>{DECAN_IMAGES[sel].a}</div>
            <div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.35)",marginTop:3}}>— Agrippa II.37</div>
            {DECAN_IMAGES[sel].v&&<div style={{fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.6)",fontStyle:"italic",marginTop:5,lineHeight:1.5}}>Variant: {DECAN_IMAGES[sel].v}</div>}
            <div style={{fontFamily:F,fontSize:9,color:`${col}90`,marginTop:6}}>{DECAN_IMAGES[sel].t}</div>
          </div>
        )}
        {isFractalActive&&(
          <div style={{marginTop:9,padding:"8px 10px",borderRadius:9,background:"rgba(0,0,0,0.3)",borderColor:`${col}15`,border:"1px solid"}}>
            <div style={L(`${col}50`,7)}>Active Fractal Levels</div>
            <div style={{fontFamily:F,fontSize:9,color:`${col}80`,marginTop:4,fontStyle:"italic"}}>
              {fractal.levels.filter(l=>l.idx===sel).map(l=>`Level ${l.level} (${["Atziluth","Beriah","Yetzirah","Assiah"][l.level-1]}) · ${fmtTime(l.dur-l.secIn)} remaining`).join(" · ")}
            </div>
          </div>
        )}
      </div>
      <div className="card" style={{margin:"0 14px 10px",padding:"10px 10px"}}>
        <div style={L()}>All 36 Faces</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3,marginTop:9}}>
          {DECANS.map(dec=>{
            const rc=P[dec.ruler].col, isSel=dec.n-1===sel, isSolar=dec.n-1===eph.decanIdx;
            const isNat=natalPos&&Object.entries(natalPos).filter(([pk])=>P[pk]).some(([,np])=>np.decanIdx===dec.n-1);
            return (
              <div key={dec.n} onClick={()=>setSel(dec.n-1)} style={{aspectRatio:"1",borderRadius:8,background:isSel?`${rc}20`:isSolar?`${rc}10`:"rgba(0,0,0,0.3)",border:`1px solid ${isSel?rc+"60":isSolar?rc+"30":"rgba(200,175,100,0.08)"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"}}>
                <div style={{fontSize:10,color:rc}}>{P[dec.ruler].sym}</div>
                <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.4)",marginTop:1}}>{dec.n}</div>
                {isNat&&<div style={{position:"absolute",top:2,right:2,width:3,height:3,borderRadius:2,background:"#FFD700"}}/>}
              </div>
            );
          })}
        </div>
      </div>
      {natalPos&&(
        <div className="card" style={{margin:"0 14px 10px"}}>
          <div style={L()}>Your Natal Faces</div>
          <div style={{marginTop:8}}>
            {Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>(
              <button key={pk} className="row-btn" onClick={()=>setSel(np.decanIdx)} style={{cursor:"pointer"}}>
                <span style={{fontSize:13,color:P[pk].col,width:20}}>{P[pk].sym}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{np.decan.name}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"#6A5030"}}>{np.decan.sym} {np.decan.sign} · {DIGNITY_LBL[np.dignity].split(" ")[0]}</div>
                </div>
                <div style={{fontFamily:F,fontSize:8,color:DIGNITY_COL[np.dignity]}}>{np.dignity.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
