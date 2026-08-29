// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useMemo } from "react";
import { DECANS } from "../data/decans.js";
import { P } from "../data/planets.js";
import { D2R, HOUSE_MEANINGS, HOUSE_NAMES, calcHouses, dateToJD, getHouseNum, getTriplicity, lonToZodiac, norm } from "../engine/astro.js";
import { calcNatal } from "../engine/chart.js";
import { LOTS, chartFromPositions, computeLots } from "../engine/lots.js";
import { profection } from "../engine/profections.js";
import { calcAllLots, calcFirdaria, calcLunarReturn, calcProgressions, calcSolarArc, calcSolarReturn, getDeclAspects, getMidpoints } from "../engine/scan.js";
import { DIGNITY_COL, DIGNITY_LBL, F, GOLD, L, T } from "../ui/theme.js";

function loadPeople(){try{const r=localStorage.getItem("astrum_people");return r?JSON.parse(r):[];}catch{return[];}}
function savePeople(p){try{localStorage.setItem("astrum_people",JSON.stringify(p));}catch{}}

function NatalWheelChart({natalPos,outerPos,outerLabel,cusps,houseSys,onSelectPlanet,selPlanet}){
  if(!natalPos)return null;
  const W=340,H=340,cx=W/2,cy=H/2;
  const R_ZODIAC=155,R_ZODIAC_IN=135,R_HOUSE_OUT=130,R_HOUSE_IN=105,R_PLANET=95,R_OUTER=120;
  // Angle conversion: ASC at 9 o'clock (180° in screen coords), zodiac counterclockwise
  const asc=natalPos.asc||0;
  const lon2ang=(lon)=>(asc-lon)*D2R; // radians, counterclockwise from ASC=left
  const px=(r,a)=>cx+r*Math.cos(a);
  const py=(r,a)=>cy-r*Math.sin(a); // SVG y-down so negate
  // Build inner planet list (natal + extra bodies)
  const planetKeys=["sun","moon","mercury","venus","mars","jupiter","saturn"];
  if(natalPos.lilith!=null)planetKeys.push("lilith");
  if(natalPos.chiron!=null)planetKeys.push("chiron");
  const extraKeys=[natalPos.northNode!=null&&"northNode",natalPos.southNode!=null&&"southNode"].filter(Boolean);
  const allKeys=[...planetKeys,...extraKeys];

  const allP={...P,
    lilith:{sym:"⚸",col:"#C080C0",name:"Lilith"},
    chiron:{sym:"⚷",col:"#80A0B0",name:"Chiron"},
    northNode:{sym:"☊",col:"#90C890",name:"N.Node"},
    southNode:{sym:"☋",col:"#C08080",name:"S.Node"},
  };

  // Aspects between inner planets
  const ASP_DEFS=[{n:"Conjunction",a:0,o:8},{n:"Opposition",a:180,o:8},{n:"Trine",a:120,o:7},{n:"Square",a:90,o:7},{n:"Sextile",a:60,o:5}];
  const aspects=[];
  for(let i=0;i<planetKeys.length;i++)for(let j=i+1;j<planetKeys.length;j++){
    const pk1=planetKeys[i],pk2=planetKeys[j];
    const l1=natalPos[pk1]?.lon,l2=natalPos[pk2]?.lon;
    if(l1==null||l2==null)continue;
    let diff=Math.abs(norm(l1-l2));if(diff>180)diff=360-diff;
    ASP_DEFS.forEach(ad=>{if(Math.abs(diff-ad.a)<=ad.o)aspects.push({pk1,pk2,ad,orb:Math.abs(diff-ad.a).toFixed(1)});});
  }

  // Cluster planets that are too close (< 8°) — offset alternately
  const placed={};
  planetKeys.forEach((pk,i)=>{
    const lon=natalPos[pk]?.lon;if(lon==null)return;
    let r=R_PLANET;
    for(let j=0;j<i;j++){
      const pk2=planetKeys[j],l2=natalPos[pk2]?.lon;if(l2==null)continue;
      let d=Math.abs(norm(lon-l2));if(d>180)d=360-d;
      if(d<8)r=placed[pk2]===R_PLANET?R_PLANET-16:R_PLANET;
    }
    placed[pk]=r;
  });

  return(
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block",touchAction:"none"}}>
      {/* Background */}
      <circle cx={cx} cy={cy} r={R_ZODIAC} fill="rgba(4,4,16,0.95)" stroke="rgba(200,175,100,0.15)" strokeWidth={1}/>

      {/* Zodiac sign sectors */}
      {Array.from({length:12},(_,i)=>{
        const startLon=i*30,endLon=(i+1)*30;
        const a1=lon2ang(startLon),a2=lon2ang(endLon);
        const x1=px(R_ZODIAC,a1),y1=py(R_ZODIAC,a1),x2=px(R_ZODIAC_IN,a1),y2=py(R_ZODIAC_IN,a1);
        const x3=px(R_ZODIAC_IN,a2),y3=py(R_ZODIAC_IN,a2),x4=px(R_ZODIAC,a2),y4=py(R_ZODIAC,a2);
        const large=Math.abs(a2-a1)>Math.PI?1:0;
        const col=SIGN_COLORS[i];
        const midA=lon2ang(i*30+15),gx=px(R_ZODIAC-10,midA),gy=py(R_ZODIAC-10,midA);
        return(
          <g key={i}>
            <path d={`M${x1} ${y1} A${R_ZODIAC} ${R_ZODIAC} 0 ${large} 0 ${x4} ${y4} L${x3} ${y3} A${R_ZODIAC_IN} ${R_ZODIAC_IN} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={`${col}11`} stroke={`${col}30`} strokeWidth={0.5}/>
            <text x={gx} y={gy} textAnchor="middle" dominantBaseline="middle" fill={col} fontSize={8} fontFamily="serif" opacity={0.7}>{SIGN_SYMS[i]}</text>
          </g>
        );
      })}

      {/* 5° tick marks on zodiac ring */}
      {Array.from({length:72},(_,i)=>{
        const lon=i*5,a=lon2ang(lon),major=i%6===0;
        const r0=major?R_ZODIAC_IN:R_ZODIAC_IN+3;
        return<line key={i} x1={px(r0,a)} y1={py(r0,a)} x2={px(R_ZODIAC_IN+7,a)} y2={py(R_ZODIAC_IN+7,a)} stroke={`rgba(200,175,100,${major?0.4:0.15})`} strokeWidth={major?1:0.5}/>;
      })}

      {/* House cusps */}
      {cusps&&cusps.map((c,i)=>{
        const a=lon2ang(c);
        const isAngular=i===0||i===3||i===6||i===9;
        const hx=px((R_HOUSE_IN+R_HOUSE_OUT)/2,a),hy=py((R_HOUSE_IN+R_HOUSE_OUT)/2,a);
        return(
          <g key={i}>
            <line x1={px(isAngular?R_ZODIAC_IN:R_HOUSE_OUT,a)} y1={py(isAngular?R_ZODIAC_IN:R_HOUSE_OUT,a)} x2={px(R_HOUSE_IN-5,a)} y2={py(R_HOUSE_IN-5,a)} stroke={`rgba(200,175,100,${isAngular?0.6:0.2})`} strokeWidth={isAngular?1.2:0.6}/>
            <text x={hx} y={hy} textAnchor="middle" dominantBaseline="middle" fill={`rgba(200,175,100,${isAngular?0.7:0.3})`} fontSize={isAngular?7:6} fontFamily={F}>{HOUSE_NAMES[i]}</text>
          </g>
        );
      })}

      {/* Aspect lines */}
      {aspects.map((asp,i)=>{
        const l1=natalPos[asp.pk1]?.lon,l2=natalPos[asp.pk2]?.lon;
        if(l1==null||l2==null)return null;
        const a1=lon2ang(l1),a2=lon2ang(l2),r=R_HOUSE_IN-8;
        const col=ASP_COLORS[asp.ad.n]||"rgba(200,175,100,0.2)";
        const isDash=asp.ad.n==="Square"||asp.ad.n==="Opposition";
        return<line key={i} x1={px(r,a1)} y1={py(r,a1)} x2={px(r,a2)} y2={py(r,a2)} stroke={col} strokeWidth={0.8} opacity={0.35} strokeDasharray={isDash?"3,3":"none"}/>;
      })}

      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={R_HOUSE_IN} fill="rgba(4,4,16,0.4)" stroke="rgba(200,175,100,0.12)" strokeWidth={0.8}/>
      <circle cx={cx} cy={cy} r={R_HOUSE_OUT} fill="none" stroke="rgba(200,175,100,0.1)" strokeWidth={0.5}/>

      {/* Outer planets (bi-wheel) */}
      {outerPos&&planetKeys.map(pk=>{
        const pl=allP[pk]||P[pk];if(!pl)return null;
        const lon=outerPos[pk]?.lon;if(lon==null)return null;
        const a=lon2ang(lon);
        return(
          <g key={"o"+pk}>
            <circle cx={px(R_OUTER,a)} cy={py(R_OUTER,a)} r={6} fill={`${pl.col}20`} stroke={pl.col} strokeWidth={1} opacity={0.7}/>
            <text x={px(R_OUTER,a)} y={py(R_OUTER,a)} textAnchor="middle" dominantBaseline="middle" fill={pl.col} fontSize={7} fontFamily="serif">{pl.sym}</text>
          </g>
        );
      })}
      {outerPos&&outerLabel&&<text x={cx} y={cy+R_OUTER+16} textAnchor="middle" fill="rgba(200,175,100,0.4)" fontSize={7} fontFamily={F}>{outerLabel}</text>}

      {/* Inner planets */}
      {allKeys.map(pk=>{
        const pl=allP[pk]||P[pk];if(!pl)return null;
        const lon=natalPos[pk]?.lon??natalPos[pk];
        if(lon==null||typeof lon!=="number")return null;
        const a=lon2ang(lon),r=placed[pk]||R_PLANET;
        const isSel=selPlanet===pk;
        return(
          <g key={pk} onClick={()=>onSelectPlanet&&onSelectPlanet(pk)} style={{cursor:"pointer"}}>
            {isSel&&<circle cx={px(r,a)} cy={py(r,a)} r={11} fill="none" stroke={pl.col} strokeWidth={1.5}/>}
            <circle cx={px(r,a)} cy={py(r,a)} r={8} fill="rgba(4,4,16,0.9)" stroke={pl.col} strokeWidth={1.2}/>
            <text x={px(r,a)} y={py(r,a)} textAnchor="middle" dominantBaseline="middle" fill={pl.col} fontSize={8} fontFamily="serif">{pl.sym}</text>
            {natalPos[pk]?.isRetro&&<text x={px(r-12,a)} y={py(r-12,a)} textAnchor="middle" fill="#9B4040" fontSize={6}>℞</text>}
          </g>
        );
      })}

      {/* ASC / DSC / MC / IC axis labels */}
      {natalPos.asc!=null&&[{l:"ASC",lon:natalPos.asc,r:R_ZODIAC+10},{l:"DSC",lon:norm(natalPos.asc+180),r:R_ZODIAC+10},{l:"MC",lon:natalPos.mc,r:R_ZODIAC+10},{l:"IC",lon:norm(natalPos.mc+180),r:R_ZODIAC+10}].map(ax=>{
        const a=lon2ang(ax.lon);
        return<text key={ax.l} x={px(ax.r,a)} y={py(ax.r,a)} textAnchor="middle" dominantBaseline="middle" fill="rgba(200,175,100,0.55)" fontSize={6.5} fontFamily={F}>{ax.l}</text>;
      })}

      {/* Center */}
      <circle cx={cx} cy={cy} r={30} fill="rgba(4,4,16,0.95)" stroke="rgba(200,175,100,0.1)" strokeWidth={0.8}/>
      <text x={cx} y={cy-8} textAnchor="middle" fill="rgba(200,175,100,0.5)" fontSize={7} fontFamily={F}>{houseSys?.toUpperCase()||"WS"}</text>
      <text x={cx} y={cy+5} textAnchor="middle" fill="rgba(200,175,100,0.3)" fontSize={6} fontFamily={F}>HOUSES</text>
    </svg>
  );
}

export default function NatalScreen({natalData,setNatalData,eph,fractal,natalPos,profile}){
  const [bd,setBd]=useState(natalData?.date||"");
  const [bt,setBt]=useState(natalData?.time||"");
  const [view,setView]=useState("wheel");
  const [houseSys,setHouseSys]=useState(profile?.houseSys||"whole");
  const [selPlanet,setSelPlanet]=useState(null);
  const [progDate,setProgDate]=useState(new Date().toISOString().slice(0,10));
  const [srYear,setSrYear]=useState(new Date().getFullYear());
  const [synPerson,setSynPerson]=useState(null);
  const [people,setPeople]=useState(loadPeople);
  const [showAddPerson,setShowAddPerson]=useState(false);
  const [newPerson,setNewPerson]=useState({name:"",date:"",time:"",city:"",lat:null,lon:null});
  const location=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;

  const save=async()=>{if(!bd)return;const d={date:bd,time:bt};setNatalData(d);try{await window.storage.set("astrum_natal",JSON.stringify(d));}catch(e){}};
  const clear=async()=>{setNatalData(null);setBd("");setBt("");try{await window.storage.delete("astrum_natal");}catch(e){}};

  // Compute cusps if we have location + natalPos
  const cusps=useMemo(()=>{
    if(!natalPos?.asc||!location)return null;
    const bd_=natalData?.date?new Date(natalData.date+(natalData.time?"T"+natalData.time:"T12:00")):null;
    if(!bd_)return null;
    try{return calcHouses(dateToJD(bd_),location.lat,location.lon,houseSys);}catch{return null;}
  },[natalPos,natalData,location,houseSys]);

  const houseOf=(lon)=>cusps?getHouseNum(lon,cusps):null;

  // Selected planet detail
  const selPlanetData=selPlanet&&natalPos?natalPos[selPlanet]:null;
  const selPlanetObj=selPlanet?(P[selPlanet]||{sym:"?",col:GOLD,name:selPlanet}):null;

  const HOUSE_SYMS=[
    ["whole","WS","Whole Sign"],["equal","EQ","Equal"],["regio","RG","Regiomontanus"],
    ["koch","KO","Koch"],["placidus","PL","Placidus"]
  ];

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 8px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <div style={L()}>Natal Chart</div>
          <div style={T(20)}>Personal Resonance</div>
        </div>
        {natalPos&&natalPos.asc!=null&&(
          <div style={{display:"flex",gap:4}}>
            {HOUSE_SYMS.map(([sys,abbr,full])=>(
              <button key={sys} onClick={()=>setHouseSys(sys)} title={full} style={{padding:"3px 6px",borderRadius:5,border:`1px solid ${houseSys===sys?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.1)"}`,background:houseSys===sys?"rgba(200,175,100,0.1)":"transparent",color:houseSys===sys?GOLD:"rgba(200,175,100,0.35)",fontFamily:F,fontSize:7.5,letterSpacing:0.5,cursor:"pointer"}}>{abbr}</button>
            ))}
          </div>
        )}
      </div>

      {/* Birth data entry */}
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:2}}><div style={L("rgba(200,175,100,0.4)",7)}>Birth Date</div><input type="date" value={bd} onChange={e=>setBd(e.target.value)} style={{width:"100%",marginTop:4,fontSize:12}}/></div>
          <div style={{flex:1}}><div style={L("rgba(200,175,100,0.4)",7)}>Time</div><input type="time" value={bt} onChange={e=>setBt(e.target.value)} style={{width:"100%",marginTop:4,fontSize:12}}/></div>
          <button onClick={save} disabled={!bd} style={{padding:"9px 14px",borderRadius:10,background:bd?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${bd?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:9,color:bd?"#D4AF6A":"#5A4020",cursor:bd?"pointer":"default",whiteSpace:"nowrap"}}>✦ CALC</button>
          {natalPos&&<button onClick={clear} style={{padding:"9px 10px",borderRadius:10,background:"rgba(80,20,20,0.3)",border:"1px solid rgba(150,60,60,0.3)",fontFamily:F,fontSize:9,color:"#9B5050",cursor:"pointer"}}>✕</button>}
        </div>
        {!location&&natalPos&&<div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginTop:7}}>✦ Add birth city in Profile for Ascendant, houses, and lots.</div>}
      </div>

      {natalPos&&(
        <>
          {/* View tabs — scrollable */}
          <div style={{overflowX:"auto",padding:"0 14px",marginBottom:8}}>
            <div style={{display:"flex",gap:5,minWidth:"max-content"}}>
              {[["wheel","Wheel"],["planets","Planets"],["angles","Angles"],["decans","Decans"],["prog","Prog"],["firdaria","Firdaria"],["returns","Returns"],["synastry","Synastry"],["midpoints","Midpoints"]].map(([v,lbl])=>(
                <button key={v} onClick={()=>setView(v)} style={{padding:"5px 11px",borderRadius:8,border:`1px solid ${view===v?"rgba(200,175,100,0.4)":"rgba(200,175,100,0.1)"}`,background:view===v?"rgba(200,175,100,0.08)":"transparent",color:view===v?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap"}}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* WHEEL VIEW */}
          {view==="wheel"&&(
            <>
              <div style={{display:"flex",justifyContent:"center",marginBottom:4}}>
                <NatalWheelChart natalPos={natalPos} outerPos={null} cusps={cusps} houseSys={houseSys} onSelectPlanet={setSelPlanet} selPlanet={selPlanet}/>
              </div>
              {/* Planet detail popup */}
              {selPlanet&&selPlanetData&&selPlanetData.lon!=null&&(
                <div className="card" style={{margin:"4px 14px 10px",background:`rgba(8,5,22,0.9)`,border:`1px solid ${selPlanetObj.col}40`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:22,color:selPlanetObj.col}}>{selPlanetObj.sym}</span>
                      <div>
                        <div style={{fontFamily:F,fontSize:14,color:selPlanetObj.col}}>{selPlanetObj.name||selPlanet}</div>
                        <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.6)",marginTop:2}}>
                          {selPlanetData.zodiac?.degree}°{String(selPlanetData.zodiac?.minutes||0).padStart(2,"0")}' {selPlanetData.zodiac?.name}
                          {selPlanetData.isRetro&&<span style={{color:"#9B4040",marginLeft:6}}>℞</span>}
                          {cusps&&<span style={{marginLeft:8,color:"rgba(200,175,100,0.4)"}}>House {houseOf(selPlanetData.lon)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={()=>setSelPlanet(null)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontSize:16,cursor:"pointer"}}>✕</button>
                  </div>
                  {selPlanetData.dignity&&(
                    <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontFamily:F,fontSize:8,color:DIGNITY_COL[selPlanetData.dignity],letterSpacing:1,padding:"2px 8px",border:`1px solid ${DIGNITY_COL[selPlanetData.dignity]}40`,borderRadius:4}}>{selPlanetData.dignity.toUpperCase()}</span>
                      {selPlanetData.bound&&<span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:1,padding:"2px 8px",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4}}>{P[selPlanetData.bound]?.sym} BOUND</span>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* PLANETS VIEW */}
          {view==="planets"&&(
            <div className="card" style={{margin:"0 14px 10px"}}>
              <div style={L()}>Natal Positions</div>
              <div style={{marginTop:8}}>
                {[
                  ...Object.entries(natalPos).filter(([pk])=>P[pk]),
                  natalPos.lilith?.lon!=null?["lilith",natalPos.lilith]:null,
                  natalPos.chiron?.lon!=null?["chiron",natalPos.chiron]:null,
                ].filter(Boolean).map(([pk,np])=>{
                  const pl=P[pk]||(pk==="lilith"?{sym:"⚸",col:"#9060A0",name:"Lilith"}:{sym:"⚷",col:"#80A080",name:"Chiron"});
                  const dc=DIGNITY_COL[np.dignity];
                  const house=cusps&&np.lon!=null?houseOf(np.lon):null;
                  const fractalActive=np.decanIdx!=null&&fractal.levels.some(l=>l.idx===np.decanIdx);
                  const transit=eph.pos[pk];
                  const tripRuler=P[pk]&&np.lon!=null&&natalPos.isDayChart!=null?getTriplicity(np.lon,natalPos.isDayChart):null;
                  return(
                    <div key={pk} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(200,175,100,0.05)"}}>
                      <span style={{fontSize:16,color:pl.col,width:22}}>{pl.sym}</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>
                          {np.zodiac?.degree}°{String(np.zodiac?.minutes||0).padStart(2,"0")}' {np.zodiac?.name}
                          {np.isRetro&&<span style={{color:"#9B4040",marginLeft:4,fontSize:9}}>℞</span>}
                        </div>
                        <div style={{fontFamily:F,fontSize:8,color:"#5A4020",marginTop:1}}>
                          {np.dignity&&<span style={{color:dc}}>{DIGNITY_LBL[np.dignity]?.split(" ")[0]}</span>}
                          {tripRuler&&<span style={{marginLeft:6,color:"rgba(200,175,100,0.4)"}}>Trip: {P[tripRuler]?.sym}</span>}
                          {house&&<span style={{marginLeft:6,color:"rgba(200,175,100,0.35)"}}>H{house}</span>}
                          {fractalActive&&<span style={{marginLeft:6,color:"#D4AF6A"}}>✦ fractal</span>}
                          {transit&&<span style={{marginLeft:6,color:"rgba(200,175,100,0.35)"}}>Now: {transit.zodiac?.name}</span>}
                        </div>
                      </div>
                      {np.score!=null&&<div style={{fontFamily:F,fontSize:9,color:dc}}>{np.score}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ANGLES & LOTS VIEW */}
          {view==="angles"&&(()=>{
            const allLots=natalPos.asc!=null?calcAllLots(
              natalPos.asc,natalPos.sun?.lon,natalPos.moon?.lon,
              natalPos.mars?.lon,natalPos.venus?.lon,natalPos.jupiter?.lon,natalPos.saturn?.lon,
              natalPos.isDayChart??true
            ):{};
            const LOT_LABELS={fortune:"Part of Fortune",spirit:"Part of Spirit",eros:"Lot of Eros",necessity:"Lot of Necessity",courage:"Lot of Courage",victory:"Lot of Victory",nemesis:"Lot of Nemesis",exaltation:"Lot of Exaltation"};
            return(
              <div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={L()}>Angles & Nodes</div>
                  <div style={{marginTop:8}}>
                    {[
                      natalPos.asc!=null&&{sym:"AC",label:"Ascendant",lon:natalPos.asc,col:"#D4AF6A",desc:HOUSE_MEANINGS[0]},
                      natalPos.mc!=null&&{sym:"MC",label:"Midheaven",lon:natalPos.mc,col:"#D4AF6A",desc:HOUSE_MEANINGS[9]},
                      natalPos.asc!=null&&{sym:"DC",label:"Descendant",lon:norm(natalPos.asc+180),col:"#D4AF6A",desc:HOUSE_MEANINGS[6]},
                      natalPos.mc!=null&&{sym:"IC",label:"Imum Coeli",lon:norm(natalPos.mc+180),col:"#D4AF6A",desc:HOUSE_MEANINGS[3]},
                      natalPos.northNode!=null&&{sym:"☊",label:"True North Node",lon:natalPos.northNode,col:"#90C890",desc:"Dragon's Head — increase, growth"},
                      natalPos.southNode!=null&&{sym:"☋",label:"South Node",lon:natalPos.southNode,col:"#C08080",desc:"Dragon's Tail — release, past"},
                      natalPos.lilith?.lon!=null&&{sym:"⚸",label:"Black Moon Lilith",lon:natalPos.lilith.lon,col:"#9060A0",desc:"Mean apogee — raw instinct, shadow"},
                      natalPos.chiron?.lon!=null&&{sym:"⚷",label:"Chiron",lon:natalPos.chiron.lon,col:"#80A080",desc:"Wounded Healer — Saturn/Uranus bridge"},
                    ].filter(Boolean).map(({sym,label,lon,col,desc})=>{
                      const z=lonToZodiac(lon),house=cusps?houseOf(lon):null;
                      return(
                        <div key={sym} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(200,175,100,0.05)"}}>
                          <div style={{width:28,height:28,borderRadius:14,background:`${col}15`,border:`1px solid ${col}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:col,flexShrink:0}}>{sym}</div>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{label}</div>
                            <div style={{fontFamily:F,fontSize:8,color:"#5A4020"}}>{z.degree}° {z.name}{house?` · H${house}`:""} · {desc}</div>
                          </div>
                        </div>
                      );
                    })}
                    {!natalPos.asc&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",padding:"8px 0"}}>Add birth city in Profile to calculate angles.</div>}
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.2)",marginTop:8}}>
                      Sect: {natalPos.isDayChart!=null?(natalPos.isDayChart?"☉ Day chart":"☽ Night chart"):"unknown"}
                      {cusps&&` · ${HOUSE_SYMS.find(h=>h[0]===houseSys)?.[2]||houseSys} houses`}
                    </div>
                  </div>
                </div>
                {Object.keys(allLots).length>0&&(
                  <div className="card" style={{margin:"0 14px 8px"}}>
                    <div style={L()}>Arabic Lots</div>
                    <div style={{marginTop:8}}>
                      {Object.entries(allLots).map(([key,lon])=>{
                        const z=lonToZodiac(lon),house=cusps?houseOf(lon):null;
                        return(
                          <div key={key} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                            <div style={{width:26,height:26,borderRadius:13,background:"rgba(144,200,144,0.1)",border:"1px solid rgba(144,200,144,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#90C890",flexShrink:0}}>⊕</div>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>{LOT_LABELS[key]||key}</div>
                              <div style={{fontFamily:F,fontSize:8,color:"#5A4020"}}>{z.degree}° {z.name}{house?` · H${house}`:""}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* DECANS VIEW */}
          {view==="decans"&&(
            <div className="card" style={{margin:"0 14px 10px"}}>
              <div style={L()}>Natal Decan Signatures</div>
              <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,marginBottom:10,lineHeight:1.6}}>These are the seven faces your planets occupied at birth. When the fractal system lands on these faces, or when transiting planets enter these decans, your personal frequency is activated.</div>
              {Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>{
                const pl=P[pk],dc=DIGNITY_COL[np.dignity];
                const fractalActive=fractal.levels.some(l=>l.idx===np.decanIdx);
                const transitIn=eph.pos[pk]&&Math.floor(norm(eph.pos[pk].lon)/10)===np.decanIdx;
                return(
                  <button key={pk} className="row-btn">
                    <span style={{fontSize:14,color:pl.col,width:22}}>{pl.sym}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:F,fontSize:12,color:"#C4A870"}}>{np.decan.name}</div>
                      <div style={{fontFamily:F,fontSize:9,color:"#5A4020"}}>{np.zodiac.degree}° {np.decan.sym} {np.decan.sign} · {DIGNITY_LBL[np.dignity].split(" ")[0]}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                      <span style={{fontFamily:F,fontSize:7,color:dc,letterSpacing:1}}>{np.dignity.toUpperCase()}</span>
                      {fractalActive&&<span style={{fontFamily:F,fontSize:7,color:"#D4AF6A",letterSpacing:1}}>FRACTAL ✦</span>}
                      {transitIn&&<span style={{fontFamily:F,fontSize:7,color:"#5CA85C",letterSpacing:1}}>TRANSIT IN</span>}
                      {np.isRetro&&<span style={{fontFamily:F,fontSize:7,color:"#9B4040"}}>RETRO</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {/* PROGRESSIONS VIEW */}
          {view==="prog"&&(()=>{
            const bd_=natalData?.date?new Date(natalData.date+(natalData.time?"T"+natalData.time:"T12:00")):null;
            if(!bd_)return <div className="card" style={{margin:"0 14px"}}>Enter birth date to use progressions.</div>;
            const prog=calcProgressions(bd_,location?.lat??null,location?.lon??null,new Date(progDate));
            const sa=calcSolarArc(bd_,new Date(progDate),natalPos);
            return(
              <div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={L()}>Secondary Progressions</div>
                    <input type="date" value={progDate} onChange={e=>setProgDate(e.target.value)} style={{fontSize:10,width:130}}/>
                  </div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",marginBottom:8}}>Age: {prog.ageYears}y · 1 day = 1 year</div>
                  {Object.entries(prog.pos).filter(([pk])=>P[pk]).map(([pk,np])=>{
                    const pl=P[pk],natal=natalPos[pk];
                    const diff=natal?((norm(np.lon-natal.lon+180)-180)).toFixed(1):null;
                    return(
                      <div key={pk} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                        <span style={{fontSize:14,color:pl.col,width:20}}>{pl.sym}</span>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{np.zodiac.degree}° {np.zodiac.name}{np.isRetro&&<span style={{color:"#9B4040",fontSize:9}}> ℞</span>}</div>
                          {diff&&<div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)"}}>Δ {diff}° from natal</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={L()}>Solar Arc Directions</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",marginBottom:8}}>Arc: {sa.arc}°</div>
                  {Object.entries(sa.directed).filter(([pk])=>P[pk]).map(([pk,dp])=>{
                    const pl=P[pk];
                    const isActive=Math.abs(parseFloat(sa.arc)-Math.round(parseFloat(sa.arc)))<0.017;
                    return(
                      <div key={pk} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                        <span style={{fontSize:14,color:pl.col,width:20}}>{pl.sym}</span>
                        <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{lonToZodiac(dp.lon).degree}° {lonToZodiac(dp.lon).name}</div>
                        {isActive&&<span style={{fontFamily:F,fontSize:7,color:"#5CA85C",letterSpacing:1}}>EXACT</span>}
                      </div>
                    );
                  })}
                </div>
                <NatalWheelChart natalPos={natalPos} outerPos={prog.pos} outerLabel="Prog" cusps={cusps} houseSys={houseSys} onSelectPlanet={setSelPlanet} selPlanet={selPlanet}/>
              </div>
            );
          })()}

          {/* FIRDARIA VIEW */}
          {view==="firdaria"&&(()=>{
            const bd_=natalData?.date?new Date(natalData.date+(natalData.time?"T"+natalData.time:"T12:00")):null;
            if(!bd_)return <div className="card" style={{margin:"0 14px"}}>Enter birth date to use Firdaria.</div>;
            const isDayChart=natalPos.isDayChart??true;
            const fd=calcFirdaria(bd_,isDayChart,new Date());
            const majPl=P[fd.majLord]||{sym:"☊",col:"#90C890",name:fd.majLord};
            const minPl=P[fd.minLord]||{sym:"☋",col:"#C08080",name:fd.minLord};
            return(
              <div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={L()}>Current Time Lords</div>
                  <div style={{display:"flex",gap:14,marginTop:10,marginBottom:10}}>
                    <div style={{flex:1,padding:"10px",borderRadius:10,background:`${majPl.col}10`,border:`1px solid ${majPl.col}30`}}>
                      <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,marginBottom:4}}>MAJOR LORD</div>
                      <div style={{fontSize:26,color:majPl.col}}>{majPl.sym}</div>
                      <div style={{fontFamily:F,fontSize:12,color:majPl.col,marginTop:2}}>{majPl.name}</div>
                      <div style={{height:3,borderRadius:2,background:`rgba(200,175,100,0.1)`,marginTop:8}}><div style={{height:3,borderRadius:2,background:majPl.col,width:`${fd.pct.toFixed(0)}%`}}/></div>
                      <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)",marginTop:3}}>{fd.pct.toFixed(0)}% elapsed</div>
                    </div>
                    <div style={{flex:1,padding:"10px",borderRadius:10,background:`${minPl.col}10`,border:`1px solid ${minPl.col}30`}}>
                      <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,marginBottom:4}}>MINOR LORD</div>
                      <div style={{fontSize:26,color:minPl.col}}>{minPl.sym}</div>
                      <div style={{fontFamily:F,fontSize:12,color:minPl.col,marginTop:2}}>{minPl.name}</div>
                    </div>
                  </div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)"}}>{isDayChart?"Day chart sequence":"Night chart sequence"}</div>
                </div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={L()}>Period Timeline</div>
                  <div style={{marginTop:8}}>
                    {fd.periods.map((period,i)=>{
                      const pl=P[period.lord]||{sym:"☊",col:"#90C890",name:period.lord};
                      const isPast=period.end<new Date();
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(200,175,100,0.04)",opacity:isPast?0.4:1}}>
                          <span style={{fontSize:15,color:period.isCurrent?"#D4AF6A":pl.col,width:22}}>{pl.sym}</span>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:F,fontSize:11,color:period.isCurrent?"#D4AF6A":"#C4A870"}}>{pl.name} {period.isCurrent&&<span style={{fontSize:7,color:"#5CA85C",letterSpacing:1}}>← NOW</span>}</div>
                            <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)"}}>{period.start.getFullYear()}–{period.end.getFullYear()} · {period.years}yr</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* RETURNS VIEW */}
          {view==="returns"&&(()=>{
            const bd_=natalData?.date?new Date(natalData.date+(natalData.time?"T"+natalData.time:"T12:00")):null;
            if(!bd_||!natalPos.sun)return <div className="card" style={{margin:"0 14px"}}>Enter birth date to calculate returns.</div>;
            const sr=calcSolarReturn(natalPos.sun.lon,srYear,location?.lat??null,location?.lon??null);
            const lr=natalPos.moon?calcLunarReturn(natalPos.moon.lon,new Date(),location?.lat??null,location?.lon??null):null;
            return(
              <div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={L()}>Solar Return</div>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <button onClick={()=>setSrYear(y=>y-1)} style={{background:"none",border:"1px solid rgba(200,175,100,0.2)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:10,padding:"2px 7px",cursor:"pointer"}}>‹</button>
                      <span style={{fontFamily:F,fontSize:11,color:GOLD}}>{srYear}</span>
                      <button onClick={()=>setSrYear(y=>y+1)} style={{background:"none",border:"1px solid rgba(200,175,100,0.2)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:10,padding:"2px 7px",cursor:"pointer"}}>›</button>
                    </div>
                  </div>
                  {sr?(
                    <>
                      <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.6)",marginBottom:8}}>{sr.date.toLocaleDateString()} {sr.date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} UTC{sr.asc!=null&&` · ASC ${lonToZodiac(sr.asc).degree}° ${lonToZodiac(sr.asc).name}`}</div>
                      {Object.entries(sr.pos).filter(([pk])=>P[pk]).map(([pk,np])=>{
                        const pl=P[pk];
                        return(<div key={pk} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                          <span style={{fontSize:13,color:pl.col,width:20}}>{pl.sym}</span>
                          <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>{np.zodiac.degree}° {np.zodiac.name}</div>
                        </div>);
                      })}
                    </>
                  ):<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)"}}>Could not compute solar return.</div>}
                </div>
                {sr&&<NatalWheelChart natalPos={natalPos} outerPos={sr.pos} outerLabel="SR" cusps={cusps} houseSys={houseSys} onSelectPlanet={setSelPlanet} selPlanet={selPlanet}/>}
                {lr&&(
                  <div className="card" style={{margin:"8px 14px 8px"}}>
                    <div style={L()}>Next Lunar Return</div>
                    <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.6)",marginTop:6}}>{lr.date.toLocaleDateString()} {lr.date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} UTC{lr.asc!=null&&` · ASC ${lonToZodiac(lr.asc).degree}° ${lonToZodiac(lr.asc).name}`}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                      {Object.entries(lr.pos).filter(([pk])=>P[pk]).map(([pk,np])=>{
                        const pl=P[pk];
                        return(<div key={pk} style={{fontFamily:F,fontSize:9,color:"#C4A870"}}><span style={{color:pl.col}}>{pl.sym}</span> {np.zodiac.degree}° {np.zodiac.name}</div>);
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SYNASTRY VIEW */}
          {view==="synastry"&&(()=>{
            const savePerson=()=>{
              if(!newPerson.name||!newPerson.date)return;
              const bd2=new Date(newPerson.date+(newPerson.time?"T"+newPerson.time:"T12:00"));
              const loc2=newPerson.lat&&newPerson.lon?{lat:newPerson.lat,lon:newPerson.lon}:null;
              const pPos=calcNatal(bd2,loc2);
              const entry={...newPerson,id:Date.now(),pos:pPos};
              const updated=[...people,entry];
              setPeople(updated);savePeople(updated);
              setSynPerson(entry);setShowAddPerson(false);
              setNewPerson({name:"",date:"",time:"",city:"",lat:null,lon:null});
            };
            const removePerson=(id)=>{const updated=people.filter(p=>p.id!==id);setPeople(updated);savePeople(updated);if(synPerson?.id===id)setSynPerson(null);};
            return(
              <div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={L()}>People Library</div>
                    <button onClick={()=>setShowAddPerson(v=>!v)} style={{padding:"5px 10px",borderRadius:8,border:"1px solid rgba(200,175,100,0.3)",background:"rgba(200,175,100,0.06)",color:GOLD,fontFamily:F,fontSize:9,cursor:"pointer"}}>+ Add</button>
                  </div>
                  {showAddPerson&&(
                    <div style={{background:"rgba(8,5,22,0.8)",borderRadius:8,padding:10,marginBottom:10,border:"1px solid rgba(200,175,100,0.1)"}}>
                      <div style={{display:"flex",gap:8,marginBottom:6}}>
                        <div style={{flex:2}}><div style={L("rgba(200,175,100,0.4)",7)}>Name</div><input value={newPerson.name} onChange={e=>setNewPerson(p=>({...p,name:e.target.value}))} style={{width:"100%",marginTop:4,fontSize:11}} placeholder="Name"/></div>
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <div style={{flex:2}}><div style={L("rgba(200,175,100,0.4)",7)}>Date</div><input type="date" value={newPerson.date} onChange={e=>setNewPerson(p=>({...p,date:e.target.value}))} style={{width:"100%",marginTop:4,fontSize:11}}/></div>
                        <div style={{flex:1}}><div style={L("rgba(200,175,100,0.4)",7)}>Time</div><input type="time" value={newPerson.time} onChange={e=>setNewPerson(p=>({...p,time:e.target.value}))} style={{width:"100%",marginTop:4,fontSize:11}}/></div>
                      </div>
                      <button onClick={savePerson} disabled={!newPerson.name||!newPerson.date} style={{padding:"7px 14px",borderRadius:8,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.3)",color:GOLD,fontFamily:F,fontSize:9,cursor:"pointer"}}>Save Person</button>
                    </div>
                  )}
                  {people.length===0&&!showAddPerson&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",padding:"8px 0"}}>No people saved yet. Add someone to compare charts.</div>}
                  {people.map(person=>(
                    <div key={person.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(200,175,100,0.05)"}}>
                      <button onClick={()=>setSynPerson(synPerson?.id===person.id?null:person)} style={{flex:1,background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>
                        <div style={{fontFamily:F,fontSize:12,color:synPerson?.id===person.id?"#D4AF6A":"#C4A870"}}>{person.name}</div>
                        <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)"}}>{person.date}{person.time?" "+person.time:""}</div>
                      </button>
                      <button onClick={()=>removePerson(person.id)} style={{background:"none",border:"none",color:"rgba(200,100,100,0.4)",fontSize:12,cursor:"pointer",padding:4}}>✕</button>
                    </div>
                  ))}
                </div>
                {synPerson&&synPerson.pos&&(
                  <>
                    <div style={{textAlign:"center",fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.5)",marginBottom:4}}>
                      Inner: You · Outer: {synPerson.name}
                    </div>
                    {/* Their lots and profection (needs their birth time+place for an Asc) */}
                    {(()=>{try{
                      const theirLots=computeLots(chartFromPositions(synPerson.pos));
                      const theirProf=synPerson.date&&synPerson.pos.asc!=null?calcProfection(new Date(synPerson.date+"T"+(synPerson.time||"12:00")),new Date(),Math.floor(synPerson.pos.asc/30)):null;
                      if(!theirLots&&!theirProf)return null;
                      return(<div className="card" style={{margin:"0 14px 8px"}}>
                        <div style={L()}>{synPerson.name}'s Lots & Year</div>
                        <div style={{marginTop:7,fontFamily:F,fontSize:10,color:"#C4A870",lineHeight:1.8}}>
                          {theirLots?.fortune!=null&&<div>⊕ Fortune: {lonToZodiac(theirLots.fortune).degree}° {lonToZodiac(theirLots.fortune).name} · ⊗ Spirit: {lonToZodiac(theirLots.spirit).degree}° {lonToZodiac(theirLots.spirit).name} · ♡ Eros: {lonToZodiac(theirLots.eros).degree}° {lonToZodiac(theirLots.eros).name}</div>}
                          {theirProf&&<div style={{color:P[theirProf.lord]?.col}}>Age {theirProf.age} — {theirProf.house}th house year in {theirProf.sign}; {P[theirProf.lord]?.name} is their Lord of the Year.</div>}
                          {theirLots?.fortune==null&&<div style={{color:"#8A7050",fontStyle:"italic"}}>Add their birth time and place for the lots and profection.</div>}
                        </div>
                      </div>);
                    }catch{return null;}})()}
                    <NatalWheelChart natalPos={natalPos} outerPos={synPerson.pos} outerLabel={synPerson.name} cusps={cusps} houseSys={houseSys} onSelectPlanet={setSelPlanet} selPlanet={selPlanet}/>
                    <div className="card" style={{margin:"8px 14px"}}>
                      <div style={L()}>Synastry Aspects</div>
                      <div style={{marginTop:8}}>
                        {(()=>{
                          const aspList=[];
                          const myKeys=["sun","moon","mercury","venus","mars","jupiter","saturn"];
                          const theirKeys=["sun","moon","mercury","venus","mars","jupiter","saturn"];
                          const ASP_DEF=[{n:"Conj",a:0,orb:8},{n:"Opp",a:180,orb:8},{n:"Trine",a:120,orb:6},{n:"Square",a:90,orb:6},{n:"Sext",a:60,orb:4}];
                          for(const mk of myKeys)for(const tk of theirKeys){
                            if(mk===tk)continue;
                            const ml=natalPos[mk]?.lon,tl=synPerson.pos[tk]?.lon;
                            if(ml==null||tl==null)continue;
                            const diff=Math.abs(((norm(ml-tl)+180)%360)-180);
                            for(const asp of ASP_DEF){
                              if(Math.abs(diff-asp.a)<asp.orb){
                                const benefic=(mk==="venus"||mk==="jupiter"||tk==="venus"||tk==="jupiter")&&asp.n!=="Square"&&asp.n!=="Opp";
                                aspList.push({mk,tk,asp:asp.n,diff:(diff-asp.a).toFixed(1),benefic});
                              }
                            }
                          }
                          return aspList.slice(0,20).map((a,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                              <span style={{fontSize:12,color:P[a.mk]?.col}}>{P[a.mk]?.sym}</span>
                              <span style={{fontFamily:F,fontSize:8,color:a.benefic?"#5CA85C":"#D24B31"}}>{a.asp}</span>
                              <span style={{fontSize:12,color:P[a.tk]?.col}}>{P[a.tk]?.sym}</span>
                              <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginLeft:"auto"}}>±{a.diff}°</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* MIDPOINTS VIEW */}
          {view==="midpoints"&&(()=>{
            const mp=getMidpoints(natalPos);
            const jd=natalData?.date?dateToJD(new Date(natalData.date+(natalData.time?"T"+natalData.time:"T12:00"))):dateToJD(new Date());
            const {decls,aspects:declAsp}=getDeclAspects(natalPos,jd);
            return(
              <div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={L()}>Midpoints</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginBottom:8}}>Stimulated midpoints (planet within 1.5°) highlighted</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {mp.map((pair,i)=>{
                      const active=pair.activated.length>0;
                      return(
                        <div key={i} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${active?"rgba(200,175,100,0.3)":"rgba(200,175,100,0.08)"}`,background:active?"rgba(200,175,100,0.06)":"transparent"}}>
                          <div style={{fontFamily:F,fontSize:8,color:active?GOLD:"rgba(200,175,100,0.4)"}}>
                            {P[pair.a]?.sym}{P[pair.b]?.sym} {pair.zodiacNear.degree}°{pair.zodiacNear.sym}
                          </div>
                          {active&&<div style={{fontFamily:F,fontSize:7,color:"#5CA85C"}}>{pair.activated.map(k=>P[k]?.sym).join("")} ✦</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="card" style={{margin:"0 14px 8px"}}>
                  <div style={L()}>Declinations</div>
                  <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:8}}>
                    {Object.entries(decls).map(([pk,d])=>(
                      <div key={pk} style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.6)"}}>
                        <span style={{color:P[pk]?.col}}>{P[pk]?.sym}</span> {d>0?"+":""}{parseFloat(d).toFixed(1)}°
                      </div>
                    ))}
                  </div>
                  {declAsp.length>0&&(
                    <div style={{marginTop:8}}>
                      <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",marginBottom:6}}>Parallels & Contra-Parallels</div>
                      {declAsp.map((a,i)=>(
                        <div key={i} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                          <span style={{fontSize:12,color:P[a.p1]?.col}}>{P[a.p1]?.sym}</span>
                          <span style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.5)"}}>{a.type}</span>
                          <span style={{fontSize:12,color:P[a.p2]?.col}}>{P[a.p2]?.sym}</span>
                          <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginLeft:"auto"}}>{a.d1}° / {a.d2}°</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </>
      )}
      {!natalPos&&<div style={{margin:"0 14px",padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:14,opacity:0.2}}>☽ ☉ ♄</div><div style={{fontFamily:F,fontSize:13,color:"#5A4020",fontStyle:"italic",lineHeight:1.9}}>Enter your birth date to unlock personal resonance — the layer where every timing system in this app is calibrated to your natal frequency.</div></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FRACTAL SCREEN
// ═══════════════════════════════════════════════════════════════════════
const VOWEL_SOUNDS={"moon":"AH","mercury":"EH","venus":"AY","sun":"EE","mars":"OH","jupiter":"EUW","saturn":"OHW"};
const L_META=[
  {w:"Atziluth",dur:"~10.1 days",use:"Electional window · Talismanic harvest"},
  {w:"Beriah",dur:"~6.76 hours",use:"Ritual design · Working day"},
  {w:"Yetzirah",dur:"~11.3 min",use:"Single act · Focused meditation"},
  {w:"Assiah",dur:"~18.8 sec",use:"One vowel · One breath · One face"},
];
const ROMAN=["I","II","III","IV"];
