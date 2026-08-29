// ═══════════════════════════════════════════════════════════════════════
// SCAN — timing scanners + the election engine (extracted from App.jsx)
// ═══════════════════════════════════════════════════════════════════════
import { DIGNITY_LBL, GOLD } from "../ui/theme.js";
import { D2R, norm, dateToJD, sunLon, moonLon, planetLon, dailyMotion, SIGNS, lonToZodiac, getDignity, getCombustion, checkVoC, DAY_RULERS, getPlanetaryHour, starLonAt, obliquity, calcASC, calcMC, fmtTime } from "./astro.js";
import { P } from "../data/planets.js";
import { FIXED_STARS } from "../data/fixedStars.js";
import { getMansion } from "../data/mansions.js";
const SIGN_RULERS_EL=["mars","venus","mercury","moon","sun","mercury","venus","mars","jupiter","saturn","saturn","jupiter"];
import { essentialDignity, receives } from "./reception.js";

export function calcProgressions(birthDate,lat,lon,targetDate){
  const ageYears=(targetDate-birthDate)/(365.25*86400000);
  const jdProg=dateToJD(birthDate)+ageYears;
  const pos={};
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    const l=planetLon(pk,jdProg);
    pos[pk]={lon:l,zodiac:lonToZodiac(l),isRetro:dailyMotion(pk,jdProg)<0&&pk!=="sun"&&pk!=="moon"};
  });
  let asc=null,mc=null;
  if(lat!=null&&lon!=null){try{asc=calcASC(jdProg,lat,lon);mc=calcMC(jdProg,lon);}catch(e){}}
  return{pos,asc,mc,ageYears:ageYears.toFixed(2)};
}

// ── 5b: Solar arc directions ──────────────────────────────────────────
export function calcSolarArc(birthDate,targetDate,natalPos){
  const ageYears=(targetDate-birthDate)/(365.25*86400000);
  const jdProg=dateToJD(birthDate)+ageYears;
  const progSunLon=planetLon("sun",jdProg);
  const arc=norm(progSunLon-natalPos.sun.lon);
  const directed={};
  Object.entries(natalPos).forEach(([pk,np])=>{if(np&&np.lon!=null)directed[pk]={...np,lon:norm(np.lon+arc)};});
  return{arc:arc.toFixed(2),arcDeg:arc,directed};
}

// ── 5b: Transit scanner ───────────────────────────────────────────────
export const TRANSIT_ASPECTS=[
  {name:"Conjunction",angle:0,orb:1,col:GOLD},
  {name:"Opposition",angle:180,orb:1,col:"#D24B31"},
  {name:"Trine",angle:120,orb:1,col:"#5CA85C"},
  {name:"Square",angle:90,orb:1,col:"#D24B31"},
  {name:"Sextile",angle:60,orb:0.8,col:"#7CB8E0"},
];
export function scanTransits(natalPos,startDate,days=90){
  const hits=[];
  const tPlanets=["moon","sun","mercury","venus","mars","jupiter","saturn"];
  const nPlanets=["sun","moon","mercury","venus","mars","jupiter","saturn"];
  const ms=86400000;
  for(const tp of tPlanets){
    for(const np of nPlanets){
      if(tp===np)continue;
      const nlon=natalPos[np]?.lon;
      if(nlon==null)continue;
      for(const asp of TRANSIT_ASPECTS){
        let prev=null,prevDt=null;
        for(let d=0;d<=days;d++){
          const dt=new Date(startDate.getTime()+d*ms);
          const tlon=planetLon(tp,dateToJD(dt));
          const diff=((norm(tlon-nlon)-asp.angle+180+360)%360)-180;
          if(prev!==null&&prev*diff<0&&Math.abs(prev)<8&&Math.abs(diff)<8){
            const frac=Math.abs(prev)/(Math.abs(prev)+Math.abs(diff));
            const exact=new Date(prevDt.getTime()+frac*ms);
            hits.push({tp,np,asp:asp.name,col:asp.col,date:exact});
          }
          prev=diff;prevDt=dt;
        }
      }
    }
  }
  hits.sort((a,b)=>a.date-b.date);
  return hits;
}

// ── 5b: Firdaria ──────────────────────────────────────────────────────
export const FIRDARIA_DAY=["sun","venus","mercury","moon","saturn","jupiter","mars","northNode","southNode"];
export const FIRDARIA_NIGHT=["moon","saturn","jupiter","mars","sun","venus","mercury","northNode","southNode"];
// Years belong to the PLANETS, not to sequence positions (Abu Ma'shar):
// Sun 10, Venus 8, Mercury 13, Moon 9, Saturn 11, Jupiter 12, Mars 7,
// nodes 3 and 2 — total 75. A positional array indexed against the
// nocturnal sequence gave every night chart wrong period lengths (Moon 10
// instead of 9, etc.) — caught in the roots audit. The night sequence
// keeps the nodes LAST per Abu Ma'shar (Hand, Birchfield); Bonatti's
// variant interleaves them after Mars — noted, not adopted.
export const FIRDARIA_YEARS={sun:10,venus:8,mercury:13,moon:9,saturn:11,jupiter:12,mars:7,northNode:3,southNode:2};
export const FIRDARIA_YRS=[10,8,13,9,11,12,7,3,2]; // day-sequence-aligned; kept for reference
export function calcFirdaria(birthDate,isDayChart,now){
  const seq=isDayChart?FIRDARIA_DAY:FIRDARIA_NIGHT;
  const totalYrs=75;
  const ageYrs=(now-birthDate)/(365.25*86400000);
  const cycleYrs=ageYrs%totalYrs;
  let cum=0,majIdx=0;
  for(let i=0;i<seq.length;i++){
    if(cycleYrs<cum+FIRDARIA_YEARS[seq[i]]){majIdx=i;break;}
    cum+=FIRDARIA_YEARS[seq[i]];
  }
  const majLord=seq[majIdx];
  const majPer=FIRDARIA_YEARS[majLord];
  const posInMaj=cycleYrs-cum;
  // Sub-periods cycle the SEVEN PLANETS only, starting from the major lord;
  // the node periods have no subdivisions (classical doctrine).
  const planetSeq=seq.filter(p=>p!=="northNode"&&p!=="southNode");
  const isNodePeriod=majLord==="northNode"||majLord==="southNode";
  let minLord=null,pct=(posInMaj/majPer)*100;
  if(!isNodePeriod){
    const minDur=majPer/7;
    const minIdx=Math.min(6,Math.floor(posInMaj/minDur));
    const startIdx=planetSeq.indexOf(majLord);
    minLord=planetSeq[(startIdx+minIdx)%7];
  }
  // Build full period list
  const periods=[];let c=0;
  for(let i=0;i<seq.length;i++){
    const yrs=FIRDARIA_YEARS[seq[i]];
    const sy=c,ey=c+yrs;
    periods.push({lord:seq[i],start:new Date(birthDate.getTime()+sy*365.25*86400000),end:new Date(birthDate.getTime()+ey*365.25*86400000),years:yrs,isCurrent:i===majIdx});
    c+=yrs;
  }
  return{majLord,minLord,pct,cycleYrs,periods};
}

// ── 5d: Solar Return ──────────────────────────────────────────────────
export function calcSolarReturn(natalSunLon,targetYear,lat,lon){
  let jdA=dateToJD(new Date(`${targetYear}-01-01T00:00:00Z`))+60;
  let jdB=jdA+370;
  // Find where sun crosses natal sun lon
  const diff=(jd)=>((norm(sunLon(jd)-natalSunLon)+180)%360)-180;
  // Bracket search
  let found=false;
  for(let step=1;step<370;step++){
    if(diff(jdA+step-1)*diff(jdA+step)<0){jdB=jdA+step;jdA=jdA+step-1;found=true;break;}
  }
  if(!found)return null;
  for(let i=0;i<50;i++){const m=(jdA+jdB)/2;if(diff(m)*diff(jdA)<0)jdB=m;else jdA=m;if(jdB-jdA<0.0001)break;}
  const jdSR=(jdA+jdB)/2;
  const srDate=new Date((jdSR-2440587.5)*86400000);
  const pos={};
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{const l=planetLon(pk,jdSR);pos[pk]={lon:l,zodiac:lonToZodiac(l)};});
  let asc=null,mc=null;
  if(lat!=null&&lon!=null){try{asc=calcASC(jdSR,lat,lon);mc=calcMC(jdSR,lon);}catch(e){}}
  return{date:srDate,jd:jdSR,pos,asc,mc};
}

// ── 5d: Lunar Return ──────────────────────────────────────────────────
export function calcLunarReturn(natalMoonLon,fromDate,lat,lon){
  const diff=(jd)=>((norm(moonLon(jd)-natalMoonLon)+180)%360)-180;
  let jdA=dateToJD(fromDate),found=false;
  for(let d=0;d<30;d+=0.5){
    if(diff(jdA+d)*diff(jdA+d+0.5)<0){jdA=jdA+d;found=true;break;}
  }
  if(!found)return null;
  let jdB=jdA+0.5;
  for(let i=0;i<40;i++){const m=(jdA+jdB)/2;if(diff(m)*diff(jdA)<0)jdB=m;else jdA=m;if(jdB-jdA<0.0001)break;}
  const jdLR=(jdA+jdB)/2;
  const lrDate=new Date((jdLR-2440587.5)*86400000);
  const pos={};
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{const l=planetLon(pk,jdLR);pos[pk]={lon:l,zodiac:lonToZodiac(l)};});
  let asc=null,mc=null;
  if(lat!=null&&lon!=null){try{asc=calcASC(jdLR,lat,lon);mc=calcMC(jdLR,lon);}catch(e){}}
  return{date:lrDate,jd:jdLR,pos,asc,mc};
}

// ── 5e: Ingress scanner ───────────────────────────────────────────────
export function scanIngresses(startDate,days=180){
  const list=[];const ms=86400000;
  const planets=["sun","moon","mercury","venus","mars","jupiter","saturn"];
  for(const p of planets){
    let prev=Math.floor(norm(planetLon(p,dateToJD(startDate)))/30);
    for(let d=1;d<=days;d++){
      const jd=dateToJD(new Date(startDate.getTime()+d*ms));
      const sign=Math.floor(norm(planetLon(p,jd))/30);
      if(sign!==prev){
        let jdA=jd-1,jdB=jd;
        for(let i=0;i<20;i++){const m=(jdA+jdB)/2;if(Math.floor(norm(planetLon(p,m))/30)!==prev)jdB=m;else jdA=m;if(jdB-jdA<0.001)break;}
        const ex=(jdA+jdB)/2;
        list.push({planet:p,from:SIGNS[prev%12]?.name,to:SIGNS[sign%12]?.name,date:new Date((ex-2440587.5)*86400000),lon:planetLon(p,ex)});
      }
      prev=sign;
    }
  }
  list.sort((a,b)=>a.date-b.date);return list;
}

// ── 5e: Station scanner ───────────────────────────────────────────────
export function scanStations(startDate,days=365){
  const list=[];const ms=86400000;
  const planets=["mercury","venus","mars","jupiter","saturn"];
  for(const p of planets){
    let prevDM=dailyMotion(p,dateToJD(startDate));
    for(let d=1;d<=days;d++){
      const jd=dateToJD(new Date(startDate.getTime()+d*ms));
      const dm=dailyMotion(p,jd);
      if(prevDM>=0&&dm<0||prevDM<0&&dm>=0){
        let jdA=jd-1,jdB=jd;
        for(let i=0;i<20;i++){const m=(jdA+jdB)/2;const dm2=dailyMotion(p,m);if(prevDM>=0?dm2<0:dm2>=0)jdA=m;else jdB=m;if(jdB-jdA<0.001)break;}
        const ex=(jdA+jdB)/2;const l=planetLon(p,ex);
        list.push({planet:p,type:dm>=0?"Direct":"Rx",date:new Date((ex-2440587.5)*86400000),lon:l,zodiac:lonToZodiac(l)});
      }
      prevDM=dm;
    }
  }
  list.sort((a,b)=>a.date-b.date);return list;
}

// ── 5e: Eclipse scanner ───────────────────────────────────────────────
export function scanEclipses(startDate,months=12){
  const list=[];const ms=86400000;const days=months*30;
  for(let d=0;d<=days;d++){
    const jd=dateToJD(new Date(startDate.getTime()+d*ms));
    const elong=norm(moonLon(jd)-sunLon(jd));
    const F=norm(93.272+13.229350*(jd-2451545));
    const lat=5.128*Math.sin(F*D2R);
    if((elong<3||elong>357)&&Math.abs(lat)<1.5){
      let jdA=jd-0.5,jdB=jd+0.5;
      for(let i=0;i<20;i++){const m=(jdA+jdB)/2;const e=norm(moonLon(m)-sunLon(m));if(e>180)jdA=m;else jdB=m;if(jdB-jdA<0.01)break;}
      const ex=(jdA+jdB)/2;const l=sunLon(ex);
      list.push({type:"Solar",date:new Date((ex-2440587.5)*86400000),zodiac:lonToZodiac(l),total:Math.abs(lat)<0.5});
      d+=25;
    } else if(elong>177&&elong<183&&Math.abs(lat)<1.5){
      let jdA=jd-0.5,jdB=jd+0.5;
      for(let i=0;i<20;i++){const m=(jdA+jdB)/2;const e=norm(moonLon(m)-sunLon(m))-180;if(e>0)jdA=m;else jdB=m;if(jdB-jdA<0.01)break;}
      const ex=(jdA+jdB)/2;const l=moonLon(ex);
      list.push({type:"Lunar",date:new Date((ex-2440587.5)*86400000),zodiac:lonToZodiac(l),total:Math.abs(lat)<0.5});
      d+=25;
    }
  }
  list.sort((a,b)=>a.date-b.date);return list;
}

// ── 5f: Declinations ─────────────────────────────────────────────────
export function lonToDecl(lon,jd){
  return Math.asin(Math.sin(obliquity(jd)*D2R)*Math.sin(lon*D2R))*R2D;
}
export function getDeclAspects(pos,jd){
  const keys=Object.keys(pos).filter(k=>P[k]&&pos[k]?.lon!=null);
  const decls={};keys.forEach(k=>{decls[k]=lonToDecl(pos[k].lon,jd);});
  const aspects=[];
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    const a=keys[i],b=keys[j];
    const diff=Math.abs(decls[a]-decls[b]);
    const sum=Math.abs(Math.abs(decls[a])+Math.abs(decls[b])-Math.abs(decls[a]+decls[b]))<0.01?Math.abs(decls[a]+decls[b]):999;
    if(diff<1)aspects.push({p1:a,p2:b,type:"Parallel",d1:decls[a].toFixed(1),d2:decls[b].toFixed(1)});
    else if(Math.abs(decls[a]+decls[b])<1)aspects.push({p1:a,p2:b,type:"Contra-P",d1:decls[a].toFixed(1),d2:decls[b].toFixed(1)});
  }
  return{decls,aspects};
}

// ── 5f: Midpoints ────────────────────────────────────────────────────
export function getMidpoints(pos){
  const keys=Object.keys(pos).filter(k=>P[k]&&pos[k]?.lon!=null);
  const pairs=[];
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    const a=keys[i],b=keys[j];
    const la=pos[a].lon,lb=pos[b].lon;
    const near=norm((la+lb)/2);const far=norm(near+180);
    const activated=keys.filter(k=>{
      if(k===a||k===b)return false;
      const lk=pos[k].lon;
      return Math.abs(((lk-near+180+360)%360)-180)<1.5||Math.abs(((lk-far+180+360)%360)-180)<1.5;
    });
    pairs.push({a,b,near,far,zodiacNear:lonToZodiac(near),activated});
  }
  pairs.sort((a,b)=>a.near-b.near);return pairs;
}

// ── 5f: Extended Arabic Lots ─────────────────────────────────────────
export function calcAllLots(asc,sLon,mLon,maLon,vLon,jLon,saLon,day){
  if(asc==null)return{};
  const n=(v)=>norm(v);
  return{
    fortune:  day?n(asc+mLon-sLon):n(asc+sLon-mLon),
    spirit:   day?n(asc+sLon-mLon):n(asc+mLon-sLon),
    eros:     n(asc+vLon-sLon),
    necessity:n(asc+saLon-mLon),
    courage:  n(asc+maLon-saLon),
    victory:  day?n(asc+jLon-sLon):n(asc+sLon-jLon),
    nemesis:  day?n(asc+saLon-sLon):n(asc+sLon-saLon),
    exaltation:day?n(asc+19-mLon):n(asc+mLon-19),
  };
}

// ── People Library (5d Synastry) ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
// ELECTION ENGINE
// ═══════════════════════════════════════════════════════════════════════
export function checkViaCombusta(lon){const l=norm(lon);return l>=195&&l<=225;}
// Bodily besiegement of the Moon between the two malefics (Bonatti/Lilly):
// the Moon stands on the zodiacal arc FROM one malefic TO the other with
// the enclosure tight (< 20°), and no benefic body inside the arc to break
// the siege ("intervention" lifts it). The old version compared raw
// longitudes with min/max and silently failed across 0° Aries; arcs are
// now computed with norm() in both directions. (The fuller by-rays form —
// separating from one malefic's ray, applying to the other's — remains a
// documented future refinement; this is the strict bodily case.)
export function checkBesiegement(jd){
  const ml=moonLon(jd),marl=planetLon("mars",jd),satl=planetLon("saturn",jd);
  const inArc=(x,from,to)=>norm(x-from)<=norm(to-from);
  const tryArc=(from,to)=>{
    const span=norm(to-from);
    if(span>=20)return false;
    if(!inArc(ml,from,to))return false;
    // benefic intervention: Venus or Jupiter bodily inside the enclosure
    for(const b of ["venus","jupiter"]){
      if(inArc(planetLon(b,jd),from,to))return false;
    }
    return true;
  };
  return tryArc(marl,satl)||tryArc(satl,marl);
}
export function getMoonAspects(jd){
  const mL=moonLon(jd),applying=[],separating=[];
  const aspA=[0,60,90,120,180],aspN={0:"Conjunction",60:"Sextile",90:"Square",120:"Trine",180:"Opposition"};
  const aspT={0:"variable",60:"harmony",90:"tension",120:"harmony",180:"tension"};
  ["sun","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    const pl=planetLon(pk,jd);
    aspA.forEach(asp=>{
      // Check both symmetric aspect positions (skip duplicate for 0° and 180°)
      const checks=asp===0||asp===180?[asp]:[asp,360-asp];
      checks.forEach(a=>{
        const exact=norm(pl+a);
        let fwd=norm(exact-mL);if(fwd>180)fwd-=360;
        const absOrb=Math.abs(fwd);
        if(absOrb<10){
          const info={planet:pk,aspect:aspN[asp],nature:aspT[asp],orb:absOrb.toFixed(1),hours:(absOrb/0.549).toFixed(1)};
          if(fwd<0)separating.push(info);else applying.push(info);
        }
      });
    });
  });
  applying.sort((a,b)=>a.orb-b.orb);separating.sort((a,b)=>a.orb-b.orb);
  return{applying,separating};
}
export function checkMaleficAffliction(pk,positions){
  const wp=positions[pk];if(!wp)return[];
  const aff=[];
  ["mars","saturn"].forEach(mp=>{
    if(mp===pk)return;
    const mpos=positions[mp];if(!mpos)return;
    let d=Math.abs(norm(wp.lon-mpos.lon));if(d>180)d=360-d;
    [90,180].forEach(asp=>{const o=Math.abs(d-asp);if(o<8)aff.push({malefic:mp,aspect:asp===90?"Square":"Opposition",orb:o.toFixed(1)});});
  });
  return aff;
}
export function getMoonSignRelation(pk,moonSign){
  const sym={sun:[4,0,8,2],moon:[3,1,7,11],mercury:[2,5,6,10],venus:[1,6,11,3],mars:[0,7,9,1],jupiter:[8,11,3,7],saturn:[9,10,6,0]};
  const hos={sun:[6,1],moon:[9,7],mercury:[8,11],venus:[0,5],mars:[6,3],jupiter:[2,5],saturn:[3,4]};
  if((sym[pk]||[]).includes(moonSign))return{rel:"sympathetic"};
  if((hos[pk]||[]).includes(moonSign))return{rel:"hostile"};
  return{rel:"neutral"};
}
export function checkTranslation(jd){
  const ml=moonLon(jd),aspA=[0,60,90,120,180];
  let lastSep=null,nextApp=null,minS=999,minA=999;
  ["sun","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    const pl=planetLon(pk,jd);
    aspA.forEach(asp=>{
      const ex=norm(pl+asp);
      const dB=norm(ml-ex),dF=norm(ex-ml);
      if(dB<8&&dB<minS){minS=dB;lastSep={planet:pk,orb:dB.toFixed(1)};}
      if(dF<8&&dF<minA){minA=dF;nextApp={planet:pk,orb:dF.toFixed(1)};}
    });
  });
  if(lastSep&&nextApp&&lastSep.planet!==nextApp.planet)return{from:lastSep.planet,to:nextApp.planet};
  return null;
}
export function checkProhibition(jd,targetPk){
  const ml=moonLon(jd),tl=planetLon(targetPk,jd);
  let degsToTarget=999;
  [0,60,90,120,180].forEach(asp=>{const d=norm(norm(tl+asp)-ml);if(d<degsToTarget&&d<15)degsToTarget=d;});
  if(degsToTarget>14)return null;
  let prohibitor=null;
  ["sun","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    if(pk===targetPk)return;
    const pl=planetLon(pk,jd);
    [0,60,90,120,180].forEach(asp=>{const d=norm(norm(pl+asp)-ml);if(d<degsToTarget&&d<12)prohibitor={planet:pk};});
  });
  return prohibitor;
}
export function getStarConj(lon,jd){
  return FIXED_STARS.filter(s=>{const sLon=jd?starLonAt(s,jd):s.lon;let d=Math.abs(norm(sLon-lon));if(d>180)d=360-d;return d<2.5;});
}
// The classical dividing line is the mean motion, ~13°10′35″ = 13.176°/day
// (Lilly's swift >13°11′; al-Biruni and the accidental-dignity tables put
// slow simply below the mean). The old <12° "slow" matched no source and
// under-reported one of Bonatti's ten impediments of the Moon.
export function getMoonSpeed(jd){const dm=dailyMotion("moon",jd);return{speed:dm.toFixed(2),fast:dm>13.176,slow:dm<13.176,label:dm>13.176?"Swift":"Slow"};}

// The 8 named moon phases, matching eph.moonPhase in calcPositions and the
// keys computeStats groups on — so electionFactors lines up with the record.
export const MOON_PHASE_NAMES=["New","Waxing Crescent","First Quarter","Waxing Gibbous","Full","Waning Gibbous","Last Quarter","Waning Crescent"];
export function electionBandKey(score){return score==null?null:score>=90?"90+ Talismanic":score>=75?"75–89 Excellent":score>=60?"60–74 Good":score>=45?"45–59 Acceptable":"< 45 Marginal";}
// Resolve a candidate election's condition-factors into the exact key strings
// castings.computeStats() groups on, so electiveMemory can match your history.
export function electionFactors(date,pk,score){
  const jd=dateToJD(date);
  const hour=getPlanetaryHour(date);
  const ml=moonLon(jd),sl=sunLon(jd);
  const phase=MOON_PHASE_NAMES[Math.floor(norm(ml-sl)/45)];
  const mans=getMansion(ml);
  return{planet:pk,hourPlanet:hour.planet,dayRuler:hour.dayRuler,moonPhase:phase,
    mansionKey:mans?`${mans.index}. ${mans.arabic}`:null,
    vocKey:checkVoC(jd).isVoC?"Void of Course":"Not Void",
    bandKey:electionBandKey(score)};
}

export function assessElection(date,pk,natalPos,location=null){
  const jd=dateToJD(date);
  const positions={};
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(p=>{
    const lon=planetLon(p,jd),dm=dailyMotion(p,jd);
    positions[p]={lon,dm,isRetro:dm<0&&p!=="sun"&&p!=="moon",zodiac:lonToZodiac(lon),dignity:getDignity(p,lon),combust:getCombustion(p,lon,sunLon(jd))};
  });
  const wPos=positions[pk],mPos=positions.moon;
  const voc=checkVoC(jd),moonAsp=getMoonAspects(jd),aff=checkMaleficAffliction(pk,positions);
  const viaCom=checkViaCombusta(mPos.lon),bes=checkBesiegement(jd);
  const mApplyGood=moonAsp.applying.find(a=>a.planet===pk&&["Conjunction","Trine","Sextile"].includes(a.aspect));
  const mApplyBad=moonAsp.applying.find(a=>["mars","saturn"].includes(a.planet)&&["Square","Opposition"].includes(a.aspect));
  const moonPh=norm(mPos.lon-positions.sun.lon),isWax=moonPh<180;
  const hour=getPlanetaryHour(date),dayMatch=DAY_RULERS[date.getDay()]===pk,hourMatch=hour.planet===pk;
  const stars=getStarConj(wPos.lon,jd);
  const trans=checkTranslation(jd),prohib=checkProhibition(jd,pk);
  const moonRel=getMoonSignRelation(pk,mPos.zodiac.signIndex);
  const speed=getMoonSpeed(jd);
  const criteria=[
    {id:"dignity",w:25,label:"Planet in Dignity",critical:true,pass:wPos.dignity==="domicile"||wPos.dignity==="exaltation",note:DIGNITY_LBL[wPos.dignity]},
    {id:"direct",w:18,label:"Planet Direct",critical:true,pass:!wPos.isRetro,note:wPos.isRetro?"Retrograde":"Direct"},
    {id:"combust",w:18,label:"Free from Combustion",critical:true,pass:!wPos.combust,note:wPos.combust?wPos.combust.type+" "+wPos.combust.diff+"° from Sun":"Clear"},
    {id:"voc",w:15,label:"Moon Not Void",critical:true,pass:!voc.isVoC,note:voc.isVoC?"Void — "+fmtTime(voc.hoursToIngress*3600)+" until "+voc.nextSign?.name:"Applying"},
    {id:"via",w:12,label:"Moon Not Via Combusta",critical:false,pass:!viaCom,note:viaCom?"Moon in Burnt Path (15° Lib–15° Sco)":"Clear"},
    {id:"bes",w:12,label:"Moon Not Besieged",critical:false,pass:!bes,note:bes?"Besieged between Mars and Saturn":"Clear"},
    {id:"mal",w:12,label:"No Malefic Affliction",critical:false,pass:aff.length===0,note:aff.length?aff.map(a=>P[a.malefic].name+" "+a.aspect).join(", "):"None"},
    {id:"mapply",w:10,label:"Moon Applies to Planet",critical:false,pass:!!mApplyGood,note:mApplyGood?"Moon "+mApplyGood.aspect+" "+P[pk].name+" in "+mApplyGood.hours+"h":"Not applying"},
    {id:"mbad",w:10,label:"Moon Next Aspect Safe",critical:false,pass:!mApplyBad,note:mApplyBad?"Moon applying "+mApplyBad.aspect+" "+P[mApplyBad.planet].name:"Safe"},
    {id:"speed",w:5,label:"Moon Fast",critical:false,pass:speed.fast,note:speed.label+" ("+speed.speed+"°/day)"},
    {id:"phase",w:9,label:"Moon Waxing",critical:false,pass:isWax,note:isWax?"Waxing — increasing light":"Waning (a standard corruption for works of increase)"},
    {id:"timing",w:6,label:"Day or Hour Aligned",critical:false,pass:dayMatch||hourMatch,note:dayMatch&&hourMatch?"Day + Hour":dayMatch?"Day":hourMatch?"Hour":"Neither"},
    // Weighted minor dignities: bound/triplicity/face now count toward the election.
    (()=>{const isDay=hour.isDayHour!==false;const ed=essentialDignity(pk,wPos.lon,isDay);
      const minors=ed.parts.filter(x=>["bound","triplicity","face"].includes(x));
      return{id:"minor",w:8,label:"Minor Dignities",critical:false,pass:minors.length>0,
        note:minors.length?`+${minors.map(m2=>m2==="bound"?"bound (+2)":m2==="triplicity"?"triplicity (+3)":"face (+1)").join(", ")}`:"None (bound/triplicity/face)"};})(),
    // ── Chart-based criteria (Dorotheus V, Sahl §9, Ramesey) — only when a
    //    place is known to raise the Ascendant ──
    ...(location?.lat!=null?(()=>{
      const asc=calcASC(jd,location.lat,location.lon);
      const ascSign=Math.floor(asc/30);
      const ascLord=SIGN_RULERS_EL[ascSign];
      const lordPos=positions[ascLord];
      const lordDig=lordPos?getDignity(ascLord,lordPos.lon):null;
      const lordOk=lordPos&&!lordPos.isRetro&&!lordPos.combust&&lordDig!=="detriment"&&lordDig!=="fall";
      // working planet angular? (house = quadrant from asc, whole-sign)
      const pHouse=((Math.floor(positions[pk].lon/30)-ascSign+12)%12)+1;
      const angular=[1,4,7,10].includes(pHouse);
      // Moon applying to the Asc lord, or Moon in the 1st
      const mHouse=((Math.floor(mPos.lon/30)-ascSign+12)%12)+1;
      const mToLord=moonAsp.applying.find(a2=>a2.planet===ascLord&&["Conjunction","Trine","Sextile"].includes(a2.aspect));
      return[
        {id:"asclord",w:15,label:"Lord of the Ascendant Fortified",critical:false,pass:!!lordOk,
          note:lordPos?`${ascLord} ${lordOk?"direct, clear, undamaged":"afflicted ("+[lordPos.isRetro&&"retrograde",lordPos.combust&&"combust",(lordDig==="detriment"||lordDig==="fall")&&lordDig].filter(Boolean).join(", ")+")"}`:"—"},
        {id:"angular",w:12,label:"Working Planet Angular",critical:false,pass:angular,
          note:`House ${pHouse} (whole-sign)${angular?" — rising or culminating":""}`},
        {id:"moonasclord",w:9,label:"Moon Joins the Ascendant's Lord",critical:false,pass:mHouse===1||!!mToLord,
          note:mHouse===1?"Moon in the 1st — Dorotheus' best":mToLord?`Moon ${mToLord.aspect} ${ascLord}`:"No application to the lord"},
      ];
    })():[]),
    // Reception: the day or hour ruler receiving the working planet is an alliance.
    (()=>{const dr=DAY_RULERS[date.getDay()];const hr=hour.planet;
      const recBy=[dr!==pk&&receives(dr,wPos.lon)?dr:null,hr!==pk&&hr!==dr&&receives(hr,wPos.lon)?hr:null].filter(Boolean);
      return{id:"reception",w:8,label:"Received by the Time-Lords",critical:false,pass:recBy.length>0,
        note:recBy.length?`Received by ${recBy.join(" & ")} (${recBy.map(r=>receives(r,wPos.lon)).join(", ")})`:"No reception from day/hour ruler"};})(),
    {id:"moonrel",w:4,label:"Moon in Sympathetic Sign",critical:false,pass:moonRel.rel==="sympathetic",note:moonRel.rel},
    (()=>{const mans=getMansion(mPos.lon);return{id:"mansion",w:6,label:"Lunar Mansion Favorable",critical:false,pass:mans.nature!=="unfavorable",note:`${mans.index}. ${mans.arabic} (${mans.nature})`};})(),
    {id:"stars",w:4,label:"Fixed Stars",critical:false,pass:stars.length>0,note:stars.length?stars.map(s=>s.name).join(", "):"None conjunct"},
  ];
  const critFail=criteria.filter(c=>c.critical&&!c.pass);
  const tw=criteria.reduce((a,c)=>a+c.w,0);
  const score=Math.round(criteria.reduce((a,c)=>a+(c.pass?c.w:0),0)/tw*100);
  const grade=critFail.length?"DISQUALIFIED":score>=90?"Talismanic Grade":score>=75?"Excellent":score>=60?"Good":score>=45?"Acceptable":"Marginal";
  return{criteria,score,grade,critFail,passCount:criteria.filter(c=>c.pass).length,moonAsp,positions,isWax,trans,prohib,stars,speed,voc};
}

export function scanElections(fromDate,days,pk,natalPos,location=null){
  const results=[];const step=2/24;const snap=new Date(fromDate);
  for(let d=0;d<days;d+=step){
    const date=new Date(snap.getTime()+d*86400000);const jd=dateToJD(date);
    const lon=planetLon(pk,jd),dm=dailyMotion(pk,jd);
    if((dm<0&&pk!=="sun"&&pk!=="moon"))continue;
    const dig=getDignity(pk,lon);if(dig!=="domicile"&&dig!=="exaltation")continue;
    const com=getCombustion(pk,lon,sunLon(jd));if(com)continue;
    const ml=moonLon(jd);if(checkViaCombusta(ml))continue;
    const voc=checkVoC(jd);if(voc.isVoC)continue;
    if(checkBesiegement(jd))continue;
    const assess=assessElection(date,pk,natalPos,location);
    if(assess.critFail.length===0&&assess.score>=55){
      const wk=Math.floor(d*6);
      const ex=results.find(r=>Math.floor((r.date-snap)/(86400000)*6)===wk);
      if(!ex||assess.score>ex.assess.score){if(ex)results.splice(results.indexOf(ex),1);results.push({date,assess,zodiac:lonToZodiac(lon),dignity:dig});}
    }
    if(results.length>=40)break;
  }
  return results.slice(0,16).sort((a,b)=>a.date-b.date);
}

// ── Mansion windows: when does the Moon next occupy mansion n? ─────────
// Bisection on the real lunar longitude (same technique the Mansions
// screen uses for its "next entries" list, promoted here so elections
// can be committed against a window and tested against the engine).
export function nextMoonCrossing(targetLon,jd){
  const gap0=norm(targetLon-moonLon(jd));
  let lo=jd+gap0/15.5;             // moon max ~15.4°/day
  let hi=jd+gap0/11.7+0.05;        // moon min ~11.8°/day
  for(let i=0;i<40;i++){
    const mid=(lo+hi)/2;
    const g=norm(targetLon-moonLon(mid));
    if(g>180)hi=mid;else lo=mid;   // passed target when gap wraps past 180
  }
  return (lo+hi)/2;
}

// The next full occupation of mansion n (1..28) at or after jd. If the
// Moon is already inside, the window starts NOW (you cannot elect the
// past) and runs to her exit.
export function nextMansionWindow(n,jd){
  const startLon=(n-1)*(360/28),endLon=(n%28)*(360/28);
  const inside=norm(moonLon(jd)-startLon)<360/28;
  const startJd=inside?jd:nextMoonCrossing(startLon,jd);
  const endJd=nextMoonCrossing(endLon,startJd);
  return{startJd,endJd,hours:(endJd-startJd)*24,alreadyIn:inside};
}
