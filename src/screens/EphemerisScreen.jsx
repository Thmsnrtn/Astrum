// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { SIGN_SYMS } from "../data/uiTables.jsx";
import { useState, useEffect, useCallback, useMemo } from "react";
import { P } from "../data/planets.js";
import { dateToJD, norm, planetLon } from "../engine/astro.js";
import { scanEclipses, scanIngresses, scanStations } from "../engine/scan.js";
import { F, GOLD, L, T } from "../ui/theme.js";

export default function EphemerisScreen({now}){
  const [tab,setTab]=useState("ingresses");
  const [data,setData]=useState(null);
  const [running,setRunning]=useState(false);
  const [months,setMonths]=useState(6);
  const [graphMonth,setGraphMonth]=useState(now.getMonth());
  const [graphYear,setGraphYear]=useState(now.getFullYear());

  const run=useCallback(()=>{
    setRunning(true);
    setTimeout(()=>{
      try{
        const ing=scanIngresses(now,180);
        const sta=scanStations(now,365);
        const ecl=scanEclipses(now,months);
        setData({ing,sta,ecl});
      }catch(e){console.error(e);setData({ing:[],sta:[],ecl:[]});}
      setRunning(false);
    },50);
  },[now,months]);
  // Auto-run on first mount — a blank screen greeted every visit before.
  useEffect(()=>{if(!data&&!running)run();},[]); // eslint-disable-line


  const GRAPH_PLANETS=["sun","moon","mercury","venus","mars","jupiter","saturn"];
  const GRAPH_COLORS={sun:"#E8C060",moon:"#B0B8D0",mercury:"#88AA88",venus:"#C09870",mars:"#C05050",jupiter:"#A080C0",saturn:"#6080A0"};

  // Graphic ephemeris: compute planet positions for each day of the month
  const graphData=useMemo(()=>{
    const year=graphYear,month=graphMonth;
    const daysInMonth=new Date(year,month+1,0).getDate();
    const result={};
    GRAPH_PLANETS.forEach(p=>{result[p]=[];});
    for(let d=1;d<=daysInMonth;d++){
      const jd=dateToJD(new Date(year,month,d,12,0,0));
      GRAPH_PLANETS.forEach(p=>{result[p].push(norm(planetLon(p,jd)));});
    }
    return{result,daysInMonth,year,month};
  },[graphYear,graphMonth]);

  const MONTH_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Ephemeris</div>
        <div style={T(20)}>Ingresses · Stations · Eclipses · Graphic</div>
      </div>
      <div style={{display:"flex",gap:6,padding:"0 14px 10px",overflowX:"auto"}}>
        {[["ingresses","Ingresses"],["stations","Stations"],["eclipses","Eclipses"],["graphic","Graphic Eph"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${tab===id?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.1)"}`,background:tab===id?"rgba(var(--tint-rgb),0.08)":"transparent",color:tab===id?GOLD:"rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap"}}>{lbl}</button>
        ))}
      </div>

      {tab!=="graphic"&&(
        <div style={{padding:"0 14px 10px",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={run} disabled={running} style={{padding:"6px 14px",borderRadius:8,background:"rgba(var(--tint-rgb),0.1)",border:"1px solid rgba(var(--tint-rgb),0.3)",color:GOLD,fontFamily:F,fontSize:9,cursor:running?"default":"pointer",opacity:running?0.6:1}}>
            {running?"Calculating…":"▶ Calculate"}
          </button>
          {!data&&<div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.3)"}}>Press Calculate to load data</div>}
        </div>
      )}

      {tab==="ingresses"&&data&&(
        <div className="card" style={{margin:"0 14px"}}>
          <div style={L()}>Sign Ingresses — next 6 months</div>
          <div style={{marginTop:8}}>
            {data.ing.slice(0,40).map((ing,i)=>{
              const pl=P[ing.planet];
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(var(--tint-rgb),0.04)"}}>
                  <span className="planet-orb" style={{fontSize:14,color:pl?.col||GOLD,padding:"2px 4px"}}>{pl?.sym||ing.planet}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>{pl?.name||ing.planet} enters {ing.to}</div>
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.35)"}}>{ing.date.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
                  </div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)"}}>{Math.round((ing.date-now)/86400000)}d</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="stations"&&data&&(
        <div className="card" style={{margin:"0 14px"}}>
          <div style={L()}>Retrograde Stations — next 12 months</div>
          <div style={{marginTop:8}}>
            {data.sta.map((st,i)=>{
              const pl=P[st.planet];
              const isRx=st.type==="Rx";
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(var(--tint-rgb),0.04)"}}>
                  <span className="planet-orb" style={{fontSize:14,color:pl?.col||GOLD,padding:"2px 4px"}}>{pl?.sym||st.planet}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>
                      {pl?.name} {isRx?"Stations Retrograde ℞":"Stations Direct ♐"}
                    </div>
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.35)"}}>{st.date.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric",year:"numeric"})} · {st.zodiac.degree}° {st.zodiac.name}</div>
                  </div>
                  <span style={{fontFamily:F,fontSize:8,color:isRx?"#C08080":"#5CA85C",letterSpacing:1}}>{isRx?"℞":"D"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="eclipses"&&data&&(
        <div className="card" style={{margin:"0 14px"}}>
          <div style={L()}>Eclipse Calendar — next {months} months</div>
          <div style={{display:"flex",gap:4,marginTop:6,marginBottom:10}}>
            {[3,6,12,24].map(m=>(
              <button key={m} onClick={()=>setMonths(m)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${months===m?"rgba(var(--tint-rgb),0.4)":"rgba(var(--tint-rgb),0.1)"}`,background:months===m?"rgba(var(--tint-rgb),0.08)":"transparent",color:months===m?GOLD:"rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:8,cursor:"pointer"}}>{m}mo</button>
            ))}
          </div>
          {data.ecl.length===0&&<div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.3)"}}>No eclipses found in this period.</div>}
          {data.ecl.map((ecl,i)=>{
            const isSolar=ecl.type==="Solar";
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(var(--tint-rgb),0.06)"}}>
                <div style={{width:34,height:34,borderRadius:17,background:isSolar?"rgba(230,200,60,0.1)":"rgba(100,120,180,0.1)",border:`1px solid ${isSolar?"rgba(230,200,60,0.3)":"rgba(100,120,180,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{isSolar?"☉":"☽"}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{ecl.type} Eclipse {ecl.total?"(Total/Annular)":"(Partial/Penumbral)"}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.5)"}}>{ecl.zodiac.degree}° {ecl.zodiac.name}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.35)"}}>{ecl.date.toLocaleDateString([],{weekday:"short",month:"long",day:"numeric",year:"numeric"})}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="graphic"&&(()=>{
        const {result,daysInMonth}=graphData;
        const W=390,H=260,pad={l:28,r:8,t:10,b:20};
        const cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;
        const xOf=(d)=>pad.l+((d-1)/(daysInMonth-1))*cw;
        const yOf=(lon)=>pad.t+ch*(1-lon/360);
        // Detect large jumps (0/360 wrap) and split into segments
        const pathFor=(lons)=>{
          let d="";let first=true;
          for(let i=0;i<lons.length;i++){
            const x=xOf(i+1),y=yOf(lons[i]);
            if(first){d+=`M${x.toFixed(1)},${y.toFixed(1)}`;first=false;}
            else{
              const prev=lons[i-1];
              if(Math.abs(lons[i]-prev)>180)d+=`M${x.toFixed(1)},${y.toFixed(1)}`;
              else d+=`L${x.toFixed(1)},${y.toFixed(1)}`;
            }
          }
          return d;
        };
        return(
          <div style={{padding:"0 14px"}}>
            <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:8}}>
              <button onClick={()=>{let m=graphMonth-1,y=graphYear;if(m<0){m=11;y--;}setGraphMonth(m);setGraphYear(y);}} style={{background:"none",border:"1px solid rgba(var(--tint-rgb),0.2)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:11,padding:"2px 8px",cursor:"pointer"}}>‹</button>
              <span style={{fontFamily:F,fontSize:11,color:GOLD,flex:1,textAlign:"center"}}>{MONTH_NAMES[graphMonth]} {graphYear}</span>
              <button onClick={()=>{let m=graphMonth+1,y=graphYear;if(m>11){m=0;y++;}setGraphMonth(m);setGraphYear(y);}} style={{background:"none",border:"1px solid rgba(var(--tint-rgb),0.2)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:11,padding:"2px 8px",cursor:"pointer"}}>›</button>
            </div>
            <div style={{background:"rgba(4,4,16,0.9)",borderRadius:12,border:"1px solid rgba(var(--tint-rgb),0.1)",padding:4}}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
                {/* Y axis labels (sign boundaries) */}
                {[0,30,60,90,120,150,180,210,240,270,300,330,360].map(deg=>{
                  const y=yOf(deg);const si=Math.floor(deg/30)%12;
                  return(<g key={deg}><line x1={pad.l} y1={y} x2={W-pad.r} y2={y} stroke="rgba(var(--tint-rgb),0.06)" strokeWidth={0.5}/><text x={pad.l-2} y={y+3} textAnchor="end" fill="rgba(var(--tint-rgb),0.25)" fontSize={7}>{SIGN_SYMS[si]}</text></g>);
                })}
                {/* Today line */}
                {(()=>{const today=new Date(graphYear,graphMonth,now.getDate());if(today.getMonth()===graphMonth&&today.getFullYear()===graphYear){const x=xOf(now.getDate());return<line x1={x} y1={pad.t} x2={x} y2={H-pad.b} stroke="rgba(var(--tint-rgb),0.2)" strokeWidth={0.8} strokeDasharray="3,3"/>;}return null;})()}
                {/* Planet lines */}
                {GRAPH_PLANETS.map(p=>(
                  <path key={p} d={pathFor(result[p])} fill="none" stroke={GRAPH_COLORS[p]} strokeWidth={1.2} opacity={0.85}/>
                ))}
                {/* X axis day labels */}
                {[1,5,10,15,20,25,daysInMonth].map(d=>(
                  <text key={d} x={xOf(d)} y={H-pad.b+12} textAnchor="middle" fill="rgba(var(--tint-rgb),0.3)" fontSize={7}>{d}</text>
                ))}
              </svg>
            </div>
            {/* Legend */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
              {GRAPH_PLANETS.map(p=>(
                <div key={p} style={{display:"flex",alignItems:"center",gap:3}}>
                  <div style={{width:14,height:2,background:GRAPH_COLORS[p],borderRadius:1}}/>
                  <span style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.5)"}}>{P[p]?.sym}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
