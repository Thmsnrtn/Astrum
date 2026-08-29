// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useEffect } from "react";
import { P } from "../data/planets.js";
import { assessElection } from "../engine/scan.js";
import { B, F, L, T } from "../ui/theme.js";

export default function CalendarScreen({now,natalPos}){
  const [planet,setPlanet]=useState("jupiter");
  const [monthOffset,setMonthOffset]=useState(0);
  const [dayData,setDayData]=useState({});
  const [scanning,setScanning]=useState(false);
  const [selDay,setSelDay]=useState(null);
  const pl=P[planet];
  const monthStart=new Date(now.getFullYear(),now.getMonth()+monthOffset,1);
  const monthEnd=new Date(now.getFullYear(),now.getMonth()+monthOffset+1,0);
  const todayStr=now.toISOString().split("T")[0];
  const scoreColor=s=>{if(!s&&s!==0)return"rgba(200,175,100,0.06)";if(s>=80)return"#3A7A4A";if(s>=65)return"#5A8A3A";if(s>=50)return"#8A7A30";if(s>=35)return"#7A5030";return"rgba(200,175,100,0.06)";};
  const gradeFromScore=s=>s>=80?"Excel":s>=65?"Good":s>=50?"Fair":s>=35?"Mgn":"—";
  const scanMonth=()=>{
    setScanning(true);setDayData({});setSelDay(null);
    setTimeout(()=>{
      const dd={};
      for(let d=1;d<=monthEnd.getDate();d++){
        const date=new Date(monthStart.getFullYear(),monthStart.getMonth(),d,10,0,0);
        // Quick scan: try 10am, 2pm — take best non-disqualified
        let best=null;
        [10,14,19].forEach(h=>{
          const dt=new Date(date);dt.setHours(h,0,0,0);
          const assess=assessElection(dt,planet,natalPos);
          if(!best||assess.score>best.score)best={score:assess.score,grade:assess.grade,critFail:assess.critFail};
        });
        dd[d]=best;
      }
      setDayData(dd);setScanning(false);
    },50);
  };
  useEffect(()=>{setDayData({});setSelDay(null);},[planet,monthOffset]);
  const dow1=monthStart.getDay(); // 0=Sun
  const daysInMonth=monthEnd.getDate();
  const selData=selDay?dayData[selDay]:null;
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Election Calendar</div>
        <div style={T(20)}>Monthly View</div>
      </div>
      {/* Planet picker */}
      <div style={{padding:"0 12px 8px",display:"flex",gap:5,overflowX:"auto"}}>
        {Object.keys(P).map(pk=>{const a=pk===planet;return(
          <button key={pk} onClick={()=>setPlanet(pk)} style={{padding:"7px 10px",borderRadius:10,background:a?`${P[pk].col}18`:"rgba(0,0,0,0.3)",border:`1px solid ${a?P[pk].col+"40":"rgba(200,175,100,0.1)"}`,cursor:"pointer",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            <span style={{fontSize:14,color:P[pk].col}}>{P[pk].sym}</span>
            {a&&<span style={{fontFamily:F,fontSize:9,color:P[pk].col}}>{P[pk].name}</span>}
          </button>
        );})}
      </div>
      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px 8px"}}>
        <button onClick={()=>setMonthOffset(m=>m-1)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:13,cursor:"pointer",padding:"4px 10px"}}>‹</button>
        <div style={{fontFamily:F,fontSize:11,color:"#D4AF6A",letterSpacing:2}}>
          {monthStart.toLocaleString("en-US",{month:"long",year:"numeric"}).toUpperCase()}
        </div>
        <button onClick={()=>setMonthOffset(m=>m+1)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:13,cursor:"pointer",padding:"4px 10px"}}>›</button>
      </div>
      {/* Day-of-week headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,padding:"0 14px 4px",textAlign:"center"}}>
        {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",padding:"3px 0"}}>{d}</div>)}
      </div>
      {/* Calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,padding:"0 14px"}}>
        {Array.from({length:dow1}).map((_,i)=><div key={"e"+i}/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const d=i+1;
          const dateStr=`${monthStart.getFullYear()}-${String(monthStart.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isToday=dateStr===todayStr;
          const isSel=selDay===d;
          const data=dayData[d];
          const hasBg=data&&data.critFail?.length===0;
          const bg=hasBg?scoreColor(data.score):"rgba(8,5,22,0.6)";
          return(
            <button key={d} onClick={()=>{if(Object.keys(dayData).length>0)setSelDay(isSel?null:d);}} style={{aspectRatio:"1",borderRadius:9,background:bg,border:isToday?`2px solid ${pl.col}60`:isSel?"2px solid rgba(200,175,100,0.5)":"1px solid rgba(200,175,100,0.07)",cursor:Object.keys(dayData).length>0?"pointer":"default",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:0}}>
              <div style={{fontFamily:F,fontSize:11,color:hasBg?"rgba(255,255,255,0.9)":isToday?"#D4AF6A":"rgba(200,175,100,0.4)"}}>{d}</div>
              {data&&<div style={{fontFamily:F,fontSize:6,color:hasBg?"rgba(255,255,255,0.7)":"rgba(200,175,100,0.25)",letterSpacing:0.5}}>{data.critFail?.length===0?gradeFromScore(data.score):"✗"}</div>}
            </button>
          );
        })}
      </div>
      {/* Scan button */}
      {Object.keys(dayData).length===0&&!scanning&&(
        <div style={{padding:"12px 14px 0"}}>
          <button onClick={scanMonth} style={{width:"100%",padding:"12px 0",borderRadius:12,background:`${pl.col}15`,border:`1px solid ${pl.col}40`,fontFamily:F,fontSize:10,color:pl.col,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>
            ✦ Scan {monthStart.toLocaleString("en-US",{month:"long"})} for {pl.name} Elections
          </button>
        </div>
      )}
      {scanning&&<div style={{display:"flex",gap:5,justifyContent:"center",padding:"16px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:`${pl.col}60`,animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
      {/* Legend */}
      {Object.keys(dayData).length>0&&!scanning&&(
        <div style={{padding:"10px 14px 0",display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}>
          {[["#3A7A4A","Excellent"],["#5A8A3A","Good"],["#8A7A30","Fair"],["rgba(8,5,22,0.6)","✗"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:10,height:10,borderRadius:2,background:c,border:"1px solid rgba(200,175,100,0.15)"}}/>
              <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)"}}>{l}</span>
            </div>
          ))}
        </div>
      )}
      {/* Selected day detail */}
      {selDay&&selData&&(
        <div style={{margin:"10px 14px 0",padding:"12px 14px",borderRadius:13,background:"rgba(8,5,22,0.8)",border:`1px solid ${pl.col}25`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={L(`${pl.col}70`,8)}>{monthStart.toLocaleString("en-US",{month:"short"})} {selDay} — {pl.name}</div>
            <button onClick={()=>setSelDay(null)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.3)",cursor:"pointer",fontSize:14,padding:0}}>×</button>
          </div>
          {selData.critFail?.length>0?(
            <div style={{fontFamily:F,fontSize:10,color:"#C08080",fontStyle:"italic",lineHeight:1.7}}>Disqualified: {selData.critFail.map(c=>c.label).join(", ")}</div>
          ):(
            <div style={{fontFamily:F,fontSize:10,color:"#9A8060",fontStyle:"italic",lineHeight:1.7}}>Score: {selData.score} — {selData.grade}. Best windows: morning or evening {P[planet].name} hour. Scan Elections screen for exact times.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SIGIL SCREEN
// ═══════════════════════════════════════════════════════════════════════
// Rose Cross positions: 22 Hebrew letters + 5 finals mapped to grid cells
const ROSE_CROSS_LETTERS={
  A:[2,1],B:[1,3],C:[3,2],D:[1,2],E:[2,3],F:[2,2],G:[3,3],H:[3,1],I:[2,4],J:[2,4],
  K:[1,4],L:[3,4],M:[1,5],N:[2,5],O:[4,1],P:[4,2],Q:[4,3],R:[4,4],S:[4,5],T:[5,1],
  U:[5,2],V:[5,2],W:[5,3],X:[5,4],Y:[5,5],Z:[1,1]
};
// Rose cross cell → pixel: 5 rows × 5 cols, centered in 260×260 canvas
function roseCrossXY(row,col,w=260,h=260){
  const cx=w/2,cy=h/2,dx=w/6,dy=h/6;
  const ox=(col-3)*dx,oy=(row-3)*dy;
  return[cx+ox,cy+oy];
}
// Kamea (magic squares) for 7 planets — row-major order, 0-indexed
const KAMEA={
  saturn:   {size:3,sq:[2,7,6,9,5,1,4,3,8]},
  jupiter:  {size:4,sq:[16,3,2,13,5,10,11,8,9,6,7,12,4,15,14,1]},
  mars:     {size:5,sq:[11,24,7,20,3,4,12,25,8,16,17,5,13,21,9,10,18,1,14,22,23,6,19,2,15]},
  sun:      {size:6,sq:[6,32,3,34,35,1,7,11,27,28,8,30,19,14,16,15,23,24,18,20,22,21,17,13,25,29,10,9,26,12,36,5,33,4,2,31]},
  venus:    {size:7,sq:[22,47,16,41,10,35,4,5,23,48,17,42,11,29,30,6,24,49,18,36,12,13,31,7,25,43,19,37,38,14,32,1,26,44,20,21,39,8,33,2,27,45,46,15,40,9,34,3,28]},
  mercury:  {size:8,sq:[64,2,3,61,60,6,7,57,9,55,54,12,13,51,50,16,17,47,46,20,21,43,42,24,40,26,27,37,36,30,31,33,32,34,35,29,28,38,39,25,41,23,22,44,45,19,18,48,49,15,14,52,53,11,10,56,8,58,59,5,4,62,63,1]},
  moon:     {size:9,sq:[37,78,29,70,21,62,13,54,5,6,38,79,30,71,22,63,14,46,47,7,39,80,31,72,23,55,15,16,48,8,40,81,32,64,24,56,57,17,49,9,41,73,33,65,25,26,58,18,50,1,42,74,34,66,67,27,59,10,51,2,43,75,35,36,68,19,60,11,52,3,44,76,77,28,69,20,61,12,53,4,45]}
};
function kamea_letterNum(c){const v=c.toUpperCase().charCodeAt(0)-64;return v>=1&&v<=26?v:0;}
function kamea_xy(num,planet,w=260,h=260){
  const km=KAMEA[planet]||KAMEA.jupiter;
  const idx=km.sq.indexOf(num);
  if(idx<0)return null;
  const row=Math.floor(idx/km.size),col=idx%km.size;
  const cell=Math.min(w,h)/km.size;
  return[col*cell+cell/2,row*cell+cell/2];
}
// Reduce multi-digit number to single digit for Kamea lookup (e.g. 26 → 8)
function kamea_reduce(n,size){while(n>size*size)n-=size*size;return n;}
