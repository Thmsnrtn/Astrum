import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
import { askClaude, aiConfigured, aiUnconfiguredMessage, aiProviderInfo, resolveAIConfig, AI_PROVIDERS } from "./ai/client.js";
import { WEBLLM_MODELS } from "./ai/webllm.js";
import { loadJSON, saveJSON } from "./lib/storage.js";
import { exportAll, importAll, markExported, lastExportedAt, backupFilename, downloadText, shareOnNative, copyToClipboard } from "./lib/backup.js";
import { captureConditions, transitsToNatal } from "./engine/snapshot.js";
import { createCasting, loadCastings, addOutcome, closeCasting, migrateToCastings, computeStats } from "./lib/castings.js";
import { getMansion } from "./data/mansions.js";
import { SEALS, getSeal } from "./data/seals.js";
import { alchemicalSeason, moonSignOperation, moonWorkGuidance, GREAT_WORK_STAGES } from "./data/alchemy.js";
import { DECAN_IMAGES, DECAN_DOCTRINE } from "./data/decanImages.js";
import { getBehenian, BEHENIAN_DOCTRINE } from "./data/behenian.js";
import { aspectMeaning } from "./data/aspectMeanings.js";
import { FOUNDATION_PRIMERS, TOPIC_PRIMERS } from "./data/primers.js";
import { parseFeed, addFeedEvents, loadFeed, deleteFeedSource, feedInRange, feedForDate, FEED_KIND_META, aiExtractionMessages, parseAIResponse, mergeEvents } from "./lib/intake.js";
import { loadAthanor } from "./lib/athanor.js";
import { OPERATION_TEMPLATES as ATHANOR_TEMPLATES } from "./data/operations.js";
import MansionsScreen from "./screens/MansionsScreen.jsx";
import HoraryScreen from "./screens/HoraryScreen.jsx";
import AthanorScreen from "./screens/AthanorScreen.jsx";
import AlmanacScreen from "./screens/AlmanacScreen.jsx";
import GeomancyScreen from "./screens/GeomancyScreen.jsx";
import LotsScreen from "./screens/LotsScreen.jsx";
import LunarCycleScreen from "./screens/LunarCycleScreen.jsx";
import RitualRuntimeScreen from "./screens/RitualRuntimeScreen.jsx";
import SpiritCourtScreen from "./screens/SpiritCourtScreen.jsx";
import OmenScreen from "./screens/OmenScreen.jsx";
import { loadSpirits, upcomingObservances } from "./lib/spirits.js";
import { computeLots } from "./engine/lots.js";
import { electiveMemory, memoryVerdict } from "./lib/electiveMemory.js";
import { groundingFor } from "./lib/rag.js";
import RecallScreen from "./screens/RecallScreen.jsx";
import { planUpcoming, composeBriefing, loadNotifyPrefs, saveNotifyPrefs, DEFAULT_NOTIFY_PREFS } from "./lib/scheduler.js";
import { reschedule, ensurePermission } from "./lib/notify.js";
import { autoBackupNative } from "./lib/backup.js";
import ReviewScreen from "./screens/ReviewScreen.jsx";
import { swPlanetLon, swDailyMotion, swTrueNode, swChiron, swLilith, swHouses, swFixstar, onSwephReady, engineInfo } from "./engine/sweph.js";

// ═══════════════════════════════════════════════════════════════════════
// PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════════════════
// Tauri: window.__TAURI_INTERNALS__ is injected by Tauri v2
// Capacitor: window.Capacitor is injected by Capacitor
const isTauri = typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
const isCapacitor = typeof window !== "undefined" && !!window.Capacitor;
const isNative = isTauri || isCapacitor;

// Thin platform shim: haptics
async function triggerHaptic(style="medium"){
  if(isCapacitor){
    try{
      const {Haptics,ImpactStyle}=await import("@capacitor/haptics");
      await Haptics.impact({style:style==="light"?ImpactStyle.Light:style==="heavy"?ImpactStyle.Heavy:ImpactStyle.Medium});
    }catch{}
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ASTRONOMY ENGINE — Meeus Algorithms
// ═══════════════════════════════════════════════════════════════════════
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const norm = a => ((a % 360) + 360) % 360;

export function dateToJD(d) {
  let Y=d.getUTCFullYear(),M=d.getUTCMonth()+1;
  const D=d.getUTCDate()+(d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600)/24;
  if(M<=2){Y--;M+=12;}
  const A=Math.floor(Y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+D+B-1524.5;
}
function sunLon(jd){
  const sw=swPlanetLon("sun",jd);if(sw!=null)return sw;
  const T=(jd-2451545)/36525,L0=norm(280.46646+36000.76983*T);
  const M=norm(357.52911+35999.05029*T),Mr=M*D2R;
  const C=(1.914602-0.004817*T)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
  return norm(L0+C-0.00569-0.00478*Math.sin(norm(125.04-1934.136*T)*D2R));
}
function moonLon(jd){
  const sw=swPlanetLon("moon",jd);if(sw!=null)return sw;
  // Meeus "Astronomical Algorithms" Ch 47 — 30-term truncation (accuracy ±0.04°)
  const T=(jd-2451545)/36525;
  const Lp=norm(218.3164477+481267.88123421*T-0.0015786*T*T+T*T*T/538841-T*T*T*T/65194000);
  const D =norm(297.8501921+445267.1114034*T -0.0018819*T*T+T*T*T/545868 -T*T*T*T/113065000);
  const M =norm(357.5291092+35999.0502909*T  -0.0001536*T*T+T*T*T/24490000);
  const Mp=norm(134.9633964+477198.8675055*T +0.0087414*T*T+T*T*T/69699   -T*T*T*T/14712000);
  const F =norm(93.2720950 +483202.0175233*T -0.0036539*T*T-T*T*T/3526000 +T*T*T*T/863310000);
  const E=1-0.002516*T-0.0000074*T*T, E2=E*E;
  const A1=norm(119.75+131.849*T), A2=norm(53.09+479264.290*T);
  // Table 47.A — [D, M, M', F, Σl] in units of 1e-6 degrees; E-factor applied to |M|=1,2 terms
  const LT=[
    [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],
    [0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],
    [2,0,1,0,53322],[2,1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],
    [0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],
    [4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[0,1,-2,0,-7888],
    [2,1,-1,0,-6766],[1,0,1,0,-5163],[1,1,0,0,4987],[2,-1,2,0,4036],
    [2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,2,0,-2689],
    [2,0,-1,2,-2602],[2,-1,-2,0,2390]
  ];
  let sl=0;
  for(const [cd,cm,cmp,cf,cl] of LT){
    const ef=Math.abs(cm)===1?E:Math.abs(cm)===2?E2:1;
    sl+=ef*cl*Math.sin((cd*D+cm*M+cmp*Mp+cf*F)*D2R);
  }
  sl+=3958*Math.sin(A1*D2R)+1962*Math.sin((Lp-F)*D2R)+318*Math.sin(A2*D2R);
  return norm(Lp+sl/1000000);
}
// Meeus Table 31.a — J2000.0 elements with secular rates; e,ω vary with T
const EL={
  mercury:{L0:252.250906,Lr:149472.6746358,e0:0.20563175,de:-0.000000261,w0:77.45611904,dw:0.15940013,a:0.387098},
  venus:  {L0:181.979801,Lr:58517.8156760, e0:0.00677188,de:-0.000047766,w0:131.563707, dw:1.4022812, a:0.723330},
  mars:   {L0:355.433275,Lr:19140.2993313, e0:0.09341233,de:0.000090484, w0:336.060234, dw:1.8410331, a:1.523679},
  jupiter:{L0:34.351484, Lr:3034.9056746,  e0:0.04849485,de:0.000163244, w0:14.331309,  dw:1.6126170, a:5.202603},
  saturn: {L0:50.077471, Lr:1222.1137943,  e0:0.05550825,de:-0.000346641,w0:93.056787,  dw:1.9637613, a:9.554909},
};
// Full equation of center to order e^5 (Meeus Ch 27 generalised)
function equationOfCenter(e,M){
  const Mr=M*D2R,e2=e*e,e3=e2*e,e4=e3*e,e5=e4*e;
  return R2D*((2*e-e3/4+5*e5/96)*Math.sin(Mr)+(5*e2/4-11*e4/24)*Math.sin(2*Mr)+(13*e3/12-43*e5/64)*Math.sin(3*Mr)+(103*e4/96)*Math.sin(4*Mr)+(1097*e5/960)*Math.sin(5*Mr));
}
export function planetLon(name,jd){
  const sw=swPlanetLon(name,jd);if(sw!=null)return sw;
  if(name==="sun")return sunLon(jd);if(name==="moon")return moonLon(jd);
  const T=(jd-2451545)/36525,el=EL[name];if(!el)return 0;
  const e=el.e0+el.de*T;
  const L=norm(el.L0+el.Lr*T);
  const w=norm(el.w0+el.dw*T);
  const M=norm(L-w);
  const v=norm(M+equationOfCenter(e,M));
  const r=el.a*(1-e*e)/(1+e*Math.cos(v*D2R));
  const hL=norm(w+v);
  // Earth heliocentric position from Sun longitude + radius
  const eL=norm(sunLon(jd)+180);
  const eM=norm(357.52911+35999.05029*T)*D2R,ee=0.016708634-0.000042037*T;
  const eR=1.000001018*(1-ee*ee)/(1+ee*Math.cos(eM));
  return norm(R2D*Math.atan2(r*Math.sin(hL*D2R)-eR*Math.sin(eL*D2R),r*Math.cos(hL*D2R)-eR*Math.cos(eL*D2R)));
}
export function dailyMotion(name,jd){const sw=swDailyMotion(name,jd);if(sw!=null)return sw;let d=planetLon(name,jd+0.5)-planetLon(name,jd-0.5);if(d>180)d-=360;if(d<-180)d+=360;return d;}
const SIGNS=[{name:"Aries",sym:"♈",el:"fire",mod:"cardinal"},{name:"Taurus",sym:"♉",el:"earth",mod:"fixed"},{name:"Gemini",sym:"♊",el:"air",mod:"mutable"},{name:"Cancer",sym:"♋",el:"water",mod:"cardinal"},{name:"Leo",sym:"♌",el:"fire",mod:"fixed"},{name:"Virgo",sym:"♍",el:"earth",mod:"mutable"},{name:"Libra",sym:"♎",el:"air",mod:"cardinal"},{name:"Scorpio",sym:"♏",el:"water",mod:"fixed"},{name:"Sagittarius",sym:"♐",el:"fire",mod:"mutable"},{name:"Capricorn",sym:"♑",el:"earth",mod:"cardinal"},{name:"Aquarius",sym:"♒",el:"air",mod:"fixed"},{name:"Pisces",sym:"♓",el:"water",mod:"mutable"}];
export function lonToZodiac(lon){const l=norm(lon),si=Math.floor(l/30),deg=l%30;return{...SIGNS[si],signIndex:si,degree:Math.floor(deg),minutes:Math.floor((deg%1)*60)};}

const DOMICILE={sun:[4],moon:[3],mercury:[2,5],venus:[1,6],mars:[0,7],jupiter:[8,11],saturn:[9,10]};
const EXALT={sun:{s:0},moon:{s:1},mercury:{s:5},venus:{s:11},mars:{s:9},jupiter:{s:3},saturn:{s:6}};
export function getDignity(planet,lon){
  const si=Math.floor(norm(lon)/30);
  if(DOMICILE[planet]?.includes(si))return"domicile";
  if(EXALT[planet]?.s===si)return"exaltation";
  if(DOMICILE[planet]?.map(s=>(s+6)%12).includes(si))return"detriment";
  if(EXALT[planet]&&(EXALT[planet].s+6)%12===si)return"fall";
  return"peregrine";
}
function dignityScore(d,r){return Math.max(15,Math.min(99,{domicile:92,exaltation:97,peregrine:58,detriment:28,fall:20}[d]-(r?18:0)));}

function getCombustion(planet,planetLon,sunL){
  if(planet==="sun")return null;
  let diff=Math.abs(norm(planetLon-sunL));if(diff>180)diff=360-diff;
  if(diff<0.2834)return{type:"cazimi",diff:diff.toFixed(2),penalty:-20}; // within 17' = maximum dignity
  if(diff<8)return{type:"combust",diff:diff.toFixed(1),penalty:40};
  if(diff<17)return{type:"sunbeams",diff:diff.toFixed(1),penalty:15};
  return null;
}

// ── Egyptian (Ptolemaic) Bounds ──────────────────────────────────────
// [sign0..11] each entry: array of {planet, from, to}
const BOUNDS=[
  [{p:"jupiter",f:0,t:6},{p:"venus",f:6,t:12},{p:"mercury",f:12,t:20},{p:"mars",f:20,t:25},{p:"saturn",f:25,t:30}],
  [{p:"venus",f:0,t:8},{p:"mercury",f:8,t:14},{p:"jupiter",f:14,t:22},{p:"saturn",f:22,t:27},{p:"mars",f:27,t:30}],
  [{p:"mercury",f:0,t:6},{p:"jupiter",f:6,t:12},{p:"venus",f:12,t:17},{p:"mars",f:17,t:24},{p:"saturn",f:24,t:30}],
  [{p:"mars",f:0,t:7},{p:"venus",f:7,t:13},{p:"mercury",f:13,t:19},{p:"jupiter",f:19,t:26},{p:"saturn",f:26,t:30}],
  [{p:"jupiter",f:0,t:6},{p:"venus",f:6,t:11},{p:"saturn",f:11,t:18},{p:"mercury",f:18,t:24},{p:"mars",f:24,t:30}],
  [{p:"mercury",f:0,t:7},{p:"venus",f:7,t:17},{p:"jupiter",f:17,t:21},{p:"mars",f:21,t:28},{p:"saturn",f:28,t:30}],
  [{p:"saturn",f:0,t:6},{p:"mercury",f:6,t:14},{p:"jupiter",f:14,t:21},{p:"venus",f:21,t:28},{p:"mars",f:28,t:30}],
  [{p:"mars",f:0,t:7},{p:"venus",f:7,t:11},{p:"mercury",f:11,t:19},{p:"jupiter",f:19,t:24},{p:"saturn",f:24,t:30}],
  [{p:"jupiter",f:0,t:12},{p:"venus",f:12,t:17},{p:"mercury",f:17,t:21},{p:"saturn",f:21,t:26},{p:"mars",f:26,t:30}],
  [{p:"mercury",f:0,t:7},{p:"jupiter",f:7,t:14},{p:"venus",f:14,t:22},{p:"saturn",f:22,t:26},{p:"mars",f:26,t:30}],
  [{p:"mercury",f:0,t:7},{p:"venus",f:7,t:13},{p:"jupiter",f:13,t:20},{p:"mars",f:20,t:25},{p:"saturn",f:25,t:30}],
  [{p:"venus",f:0,t:12},{p:"jupiter",f:12,t:16},{p:"mercury",f:16,t:19},{p:"mars",f:19,t:28},{p:"saturn",f:28,t:30}],
];
function getBound(lon){
  const l=norm(lon),si=Math.floor(l/30),deg=l%30;
  const bs=BOUNDS[si]||[];
  const b=bs.find(b=>deg>=b.f&&deg<b.t);
  return b?b.p:null;
}

// ── Antiscia ─────────────────────────────────────────────────────────
// Mirror around 0°Cancer/0°Capricorn (solstice axis): antiscion = norm(180 - L)
// Contra-antiscia (equinox axis): contra = norm(-L)
function antiscionOf(lon){return norm(180-lon);}
function contraAntiscionOf(lon){return norm(-lon);}
function getAntisciaAspects(pos){
  const pks=Object.keys(pos),asps=[];
  pks.forEach(pk=>{
    const anti=antiscionOf(pos[pk].lon);
    pks.forEach(pk2=>{
      if(pk>=pk2)return;
      let d=Math.abs(norm(anti-pos[pk2].lon));if(d>180)d=360-d;
      if(d<2)asps.push({p1:pk,p2:pk2,type:"antiscion",orb:d.toFixed(1)});
      const contra=contraAntiscionOf(pos[pk].lon);
      let d2=Math.abs(norm(contra-pos[pk2].lon));if(d2>180)d2=360-d2;
      if(d2<2)asps.push({p1:pk,p2:pk2,type:"contra-antiscion",orb:d2.toFixed(1)});
    });
  });
  return asps;
}

// ── Inferior planet phase (Venus & Mercury) ───────────────────────────
function getPlanetPhase(planet,planetLon,sunLon){
  if(planet!=="venus"&&planet!=="mercury")return null;
  const diff=norm(planetLon-sunLon); // 0-360
  if(diff<1||diff>359)return"cazimi";
  if(diff<180)return"evening-star"; // East of Sun: sets after Sun
  return"morning-star"; // West of Sun: rises before Sun
}

// ── Arabic Lots ───────────────────────────────────────────────────────
// The seven Hermetic Lots are computed by the verified, sect-aware engine in
// engine/lots.js (see computeLots). calcPOF/calcPOS below remain for the
// natal-chart path and Fortune/Spirit callers.

export function checkVoC(jd){
  const moonL=moonLon(jd);
  const moonSign=Math.floor(moonL/30);
  const moonEndOfSign=(moonSign+1)*30;
  const degsLeft=moonEndOfSign-moonL;
  const aspectAngles=[0,60,90,120,180];
  const planets=["sun","mercury","venus","mars","jupiter","saturn"];
  let hasApplyingAspect=false;
  planets.forEach(pk=>{
    const pl=planetLon(pk,jd);
    aspectAngles.forEach(asp=>{
      // Check both symmetric aspect positions (e.g. both trines for a given planet)
      const checks=asp===0||asp===180?[asp]:[asp,360-asp];
      checks.forEach(a=>{
        const aspPoint=norm(pl+a);
        const moonsTravel=norm(aspPoint-moonL);
        if(moonsTravel<8&&moonsTravel<degsLeft)hasApplyingAspect=true;
      });
    });
  });
  const moonSpeed=0.549;
  const hoursToIngress=degsLeft/moonSpeed;
  return{isVoC:!hasApplyingAspect,hoursToIngress,nextSign:SIGNS[(moonSign+1)%12]};
}

function nextIngress(planet,jd){
  const currentSign=Math.floor(planetLon(planet,jd)/30);
  const targetSign=(currentSign+1)%12;
  let lo=jd,hi=jd+60;
  for(let i=0;i<40;i++){
    const mid=(lo+hi)/2;
    const s=Math.floor(planetLon(planet,mid)/30);
    if(s===targetSign)hi=mid;else lo=mid;
  }
  return{jd:(lo+hi)/2,sign:SIGNS[targetSign]};
}

const HOUR_ORDER=["saturn","jupiter","mars","sun","venus","mercury","moon"];
const DAY_RULERS={0:"sun",1:"moon",2:"mars",3:"mercury",4:"jupiter",5:"venus",6:"saturn"};
const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export function getPlanetaryHour(date){
  const dow=date.getDay(),dr=DAY_RULERS[dow],ri=HOUR_ORDER.indexOf(dr);
  const mn=new Date(date);mn.setHours(0,0,0,0);
  const hn=Math.floor((date-mn)/3600000)%24,pi=(ri+hn)%7;
  return{planet:HOUR_ORDER[pi],hourNum:hn,msRemaining:new Date(mn.getTime()+(hn+1)*3600000)-date,nextPlanet:HOUR_ORDER[(pi+1)%7],dayRuler:dr};
}
// Precess a J2000.0 star longitude to current epoch (~50.29"/year = 1.3969°/century)
function precessStar(lon0,jd){return norm(lon0+1.396971*(jd-2451545)/36525);}
// True star position: Swiss Ephemeris catalog lookup when loaded, linear precession otherwise
function starLonAt(star,jd){const sw=star?.name?swFixstar(star.name,jd):null;return sw?sw.lon:precessStar(star.lon,jd);}
// Mean lunar node (True Node uses additional ~±1.5° perturbation; mean is sufficient for electional)
function meanNode(jd){const T=(jd-2451545)/36525;return norm(125.04452-1934.136261*T+0.0020708*T*T+T*T*T/450000);}

// ═══════════════════════════════════════════════════════════════════════
// LOCATION-BASED ASTRONOMY (Phase 1c)
// ═══════════════════════════════════════════════════════════════════════
// Sunrise/Sunset in UTC — USNO algorithm, ~5 min accuracy for 0°-60° lat
function sunriseSetUTC(date,lat,lon){
  const start=new Date(Date.UTC(date.getUTCFullYear(),0,0));
  const N=Math.ceil((date-start)/86400000);
  const dec=-23.45*Math.cos((360/365*(N+10))*D2R);
  const cosH=(-Math.sin(-0.833*D2R)-Math.sin(lat*D2R)*Math.sin(dec*D2R))/(Math.cos(lat*D2R)*Math.cos(dec*D2R));
  if(cosH<-1||cosH>1)return null; // midnight sun / polar night
  const H=Math.acos(cosH)*R2D;
  const noon=12-lon/15; // approximate solar noon in UT
  const riseUT=noon-H/15, setUT=noon+H/15;
  const y=date.getUTCFullYear(),mo=date.getUTCMonth(),d=date.getUTCDate();
  return{rise:new Date(Date.UTC(y,mo,d,Math.floor(riseUT),Math.round((riseUT%1)*60))),set:new Date(Date.UTC(y,mo,d,Math.floor(setUT),Math.round((setUT%1)*60)))};
}
// Greenwich Sidereal Time in degrees (Meeus Ch.12)
function gstDeg(jd){
  const jd0=Math.floor(jd-0.5)+0.5,t=(jd0-2451545)/36525;
  const th0=norm(100.4606184+36000.770004*t+0.000387933*t*t);
  return norm(th0+360.985647*(jd-jd0)*24/24);
}
// Local Sidereal Time in degrees
function lstDeg(jd,lon){return norm(gstDeg(jd)+lon);}
// Obliquity of ecliptic (Meeus Ch.22)
function obliquity(jd){const T=(jd-2451545)/36525;return 23.4392911-0.0130042*T-0.00000164*T*T+0.000000504*T*T*T;}
// True Ascendant (Meeus Ch.24)
function calcASC(jd,lat,lon){
  const RAMC=lstDeg(jd,lon)*D2R,e=obliquity(jd)*D2R,phi=lat*D2R;
  return norm(Math.atan2(-Math.cos(RAMC),Math.sin(RAMC)*Math.cos(e)+Math.tan(phi)*Math.sin(e))*R2D);
}
// Midheaven (MC)
function calcMC(jd,lon){
  const RAMC=lstDeg(jd,lon)*D2R,e=obliquity(jd)*D2R;
  return norm(Math.atan2(Math.sin(RAMC),Math.cos(RAMC)*Math.cos(e))*R2D);
}
// Part of Fortune: day chart = ASC + Moon - Sun; night chart = ASC + Sun - Moon
function calcPOF(asc,moonL,sunL,isDayChart){return norm(isDayChart?asc+moonL-sunL:asc+sunL-moonL);}
// Part of Spirit: day chart = ASC + Sun - Moon; night chart = ASC + Moon - Sun
function calcPOS(asc,moonL,sunL,isDayChart){return norm(isDayChart?asc+sunL-moonL:asc+moonL-sunL);}
// True unequal planetary hours using local sunrise/sunset
export function getPlanetaryHourUnequal(now,lat,lon){
  const dow=now.getDay(),dr=DAY_RULERS[dow],ri=HOUR_ORDER.indexOf(dr);
  const todaySS=sunriseSetUTC(now,lat,lon);
  if(!todaySS)return getPlanetaryHour(now); // fallback for polar regions
  const{rise,set}=todaySS;
  const afterSunrise=now>=rise;
  if(afterSunrise&&now<set){
    // Day hour
    const dayLen=(set-rise)/12;
    const hn=Math.min(11,Math.floor((now-rise)/dayLen));
    const pi=(ri+hn)%7;
    return{planet:HOUR_ORDER[pi],hourNum:hn+1,msRemaining:dayLen-(now-rise)%dayLen,nextPlanet:HOUR_ORDER[(pi+1)%7],dayRuler:dr,isDayHour:true,rise,set};
  } else if(afterSunrise){
    // Night hour (after sunset, before midnight/next sunrise)
    const tomorrow=new Date(now.getTime()+86400000);
    const tomSS=sunriseSetUTC(tomorrow,lat,lon);
    const nextRise=tomSS?.rise||new Date(rise.getTime()+86400000);
    const nightLen=(nextRise-set)/12;
    const hn=Math.min(11,Math.floor((now-set)/nightLen));
    const pi=(ri+12+hn)%7;
    return{planet:HOUR_ORDER[pi],hourNum:hn+13,msRemaining:nightLen-(now-set)%nightLen,nextPlanet:HOUR_ORDER[(pi+1)%7],dayRuler:dr,isDayHour:false,rise,set};
  } else {
    // Before sunrise — in previous astrological day's night hours
    const yesterday=new Date(now.getTime()-86400000);
    const ydSS=sunriseSetUTC(yesterday,lat,lon);
    if(!ydSS)return getPlanetaryHour(now);
    const ydDr=DAY_RULERS[yesterday.getDay()],ydRi=HOUR_ORDER.indexOf(ydDr);
    const nightLen=(rise-ydSS.set)/12;
    const hn=Math.min(11,Math.floor((now-ydSS.set)/nightLen));
    const pi=(ydRi+12+hn)%7;
    return{planet:HOUR_ORDER[pi],hourNum:hn+13,msRemaining:nightLen-(now-ydSS.set)%nightLen,nextPlanet:HOUR_ORDER[(pi+1)%7],dayRuler:ydDr,isDayHour:false,rise,set};
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PLANETARY DATA
// ═══════════════════════════════════════════════════════════════════════
export const P = {
  sun:{sym:"☉",name:"Sun",col:"#F5C518",glow:"rgba(245,197,24,0.35)",day:"Sunday",metal:"Gold",stone:"Amber · Topaz · Diamond",incense:"Frankincense · Bay · Saffron",oils:"Frankincense · Myrrh · Orange · Bergamot · Cinnamon",herbs:"Bay Laurel · Chamomile · St. John's Wort · Sunflower",color:"Gold · Yellow · Orange",number:6,angel:"Michael",intelligence:"Nakhiel",spirit:"Sorath",domains:["vitality","fame","authority","healing","the HGA","true will","kingship"],ritual:"Don your finest garments — the solar sphere receives only what honors it. Offer frankincense, saffron, or lignum aloes; the best wine or spirit you possess. Place the solar seal at the center of your altar. Work in the hour of the Sun on Sunday, facing east. Let the space be bright, warm, and ordered. The Sun rewards dignity: approach as a sovereign addressing another.",orphic:"Hear golden Titan, whose eternal eye with broad survey illumines all the sky. Self-born, unwearied in diffusing light, and to all eyes the mirror of delight.",vowelGreek:"Iota",vowel:"EE"},
  moon:{sym:"☽",name:"Moon",col:"#C8DDED",glow:"rgba(200,221,237,0.25)",day:"Monday",metal:"Silver",stone:"Moonstone · Pearl · Selenite",incense:"Camphor · White Poppy · Jasmine",oils:"Jasmine · Clary Sage · Sandalwood · Ylang Ylang · Rose",herbs:"Mugwort · White Willow · Poppy · Lotus",color:"Silver · White · Pale Blue",number:9,angel:"Gabriel",intelligence:"Malkah be-Tarshisim",spirit:"Hasmodai",domains:["dreams","travel","fertility","divination","tides","the astral","memory"],ritual:"Dress in silver or white. The Moon works best at night, beginning precisely at the lunar hour. Offer camphor, white poppy, or jasmine incense; pure water or white wine. Keep the space cool and quiet. The Moon favors a soft, receptive state of awareness — yield rather than force. For strongest results, repeat the working over three consecutive nights near the full or new Moon.",orphic:"Hear, goddess queen, diffusing silver light, bull-horned and wandering through the gloom of night. With stars surrounded, and with circuit wide night's torch extending, through the heavens you ride.",vowelGreek:"Alpha",vowel:"AH"},
  mercury:{sym:"☿",name:"Mercury",col:"#7CB8E0",glow:"rgba(124,184,224,0.25)",day:"Wednesday",metal:"Quicksilver · Tin alloys",stone:"Agate · Malachite · Citrine",incense:"Lavender · Mastic · Fennel",oils:"Lavender · Peppermint · Lemon · Rosemary · Eucalyptus",herbs:"Lavender · Dill · Fennel · Clover · Valerian",color:"Yellow · Orange · Violet · Mixed",number:8,angel:"Raphael",intelligence:"Tiriel",spirit:"Taphtartharath",domains:["eloquence","learning","commerce","writing","travel","memory","science","theft"],ritual:"Mercury accepts no particular dress — it is the quality of mind that matters, not the quality of garment. Work at the Mercury hour on Wednesday. Offer mixed aromatic incense: lavender, mastic, or a blend of communicating herbs. Mercury rewards cleverness; let the working be precise, elegant, and swift. Have everything prepared before the hour begins. Sharp, undivided attention is your greatest offering.",orphic:"Hermes, draw near, and to my prayer incline, angel of Jove, and Maia's son divine; president of contest, ruler of the pole, whose power the flight of words and thoughts control.",vowelGreek:"Epsilon",vowel:"EH"},
  venus:{sym:"♀",name:"Venus",col:"#EFA0B8",glow:"rgba(239,160,184,0.3)",day:"Friday",metal:"Copper",stone:"Rose Quartz · Emerald · Malachite",incense:"Rose · Myrtle · Sandalwood",oils:"Rose · Geranium · Ylang Ylang · Patchouli · Jasmine · Vetiver",herbs:"Rose · Myrtle · Vervain · Yarrow · Strawberry",color:"Green · Pink · Copper · Rose",number:7,angel:"Anael",intelligence:"Hagiel",spirit:"Kedemel",domains:["love","beauty","friendship","art","pleasure","attraction","music","fertility"],ritual:"Dress beautifully — let your appearance honor the sphere. Work on Friday, in the Venus hour. Rose, myrtle, or sandalwood incense; rose wine, honey, or sweetened water as offering. Make the space pleasing to the senses: flowers, soft light, beautiful objects arranged with care. The key to Venus is genuine pleasure — your delight in the working is itself an invocation. Let music move you before you begin.",orphic:"Heavenly, illustrious, laughter-loving queen, sea-born, night-loving, of an awful mien; crafty, from whom necessity first came, producing, nightly, all-connecting dame.",vowelGreek:"Eta",vowel:"AY"},
  mars:{sym:"♂",name:"Mars",col:"#D24B31",glow:"rgba(210,75,49,0.35)",day:"Tuesday",metal:"Iron · Steel",stone:"Bloodstone · Red Jasper · Garnet",incense:"Dragon's Blood · Rue · Pepper · Cinnamon",oils:"Black Pepper · Ginger · Clove · Cardamom · Cedarwood",herbs:"Rue · Nettle · Wormwood · Pepper · Garlic",color:"Red · Scarlet · Orange-Red",number:5,angel:"Camael",intelligence:"Graphiel",spirit:"Barzabel",domains:["courage","conflict","protection","surgery","victory","lust","competition","initiation"],ritual:"Mars is not fastidious about appearance — it cares about will and readiness. Strong offerings: dragon's blood incense, red wine or strong spirits, iron upon the altar. Work Tuesday in the Mars hour — near midnight for works of binding and severance, at dawn for works of conquest and victory. Bring intensity: Mars receives what is charged with genuine force. Drums, martial music, or absolute silence with iron in your spine.",orphic:"Magnanimous, unconquered, boisterous Mars, in darts rejoicing and in bloody wars; fierce and untamed, whose mighty power can make the strongest walls from their foundations shake.",vowelGreek:"Omicron",vowel:"OH"},
  jupiter:{sym:"♃",name:"Jupiter",col:"#8B9FE0",glow:"rgba(139,159,224,0.3)",day:"Thursday",metal:"Tin",stone:"Sapphire · Lapis Lazuli · Amethyst",incense:"Cedar · Nutmeg · Hyssop · Lignum Aloes",oils:"Cedarwood · Nutmeg · Clary Sage · Frankincense · Orange",herbs:"Cedar · Hyssop · Agrimony · Sage · Borage",color:"Royal Blue · Purple · Violet",number:4,angel:"Sachiel",intelligence:"Iophiel",spirit:"Hismael",domains:["wealth","expansion","justice","wisdom","luck","sovereignty","grace","law"],ritual:"Dress with the full dignity Jupiter expects — your finest and most ordered. Thursday, Jupiter hour. Cedar or nutmeg incense; the finest spirit or wine your house contains. The altar should be abundant: multiple offerings, multiple lights. Jupiter responds to generosity — offer more than seems necessary. Speak your petition as if already received. Thanksgiving opens the Jovian current more readily than supplication.",orphic:"O Jove much-honoured, Jove supremely great, to thee our holy rites we consecrate, our prayers and expiations, king divine, for all things round thine altered circle shine.",vowelGreek:"Upsilon",vowel:"EUW"},
  saturn:{sym:"♄",name:"Saturn",col:"#C4A870",glow:"rgba(196,168,112,0.25)",day:"Saturday",metal:"Lead",stone:"Onyx · Jet · Black Tourmaline · Obsidian",incense:"Myrrh · Cypress · Asafoetida · Opoponax",oils:"Myrrh · Cypress · Vetiver · Patchouli · Cedarwood",herbs:"Myrrh · Cypress · Comfrey · Solomon's Seal · Mullein",color:"Black · Dark Brown · Indigo · Dark Purple",number:3,angel:"Cassiel",intelligence:"Agiel",spirit:"Zazel",domains:["binding","endings","time","discipline","agriculture","death","karma","the abyss"],ritual:"Saturn demands austerity. Dark attire. Fast from the prior evening if your body allows. Myrrh, cypress, or asafoetida incense — the heavy, serious aromatics that belong to the sphere of time. Work alone, in silence, after midnight on Saturday. Saturn is the boundary between the known and unknown — approach without self-deception or pretense. A single candle in surrounding darkness, and complete honesty of intention, are your most powerful tools.",orphic:"Thee I invoke, august, with boundless sway, over the world and its cold realms who sway; whose voice tremendous and immortal mind have fixed the boundaries of the earth refined.",vowelGreek:"Omega",vowel:"OHW"},
};

const DIGNITY_COL={domicile:"#5CA85C",exaltation:"#D4AF6A",peregrine:"#6A5030",detriment:"#8B4040",fall:"#8B4040"};
const DIGNITY_LBL={domicile:"Domicile ✦",exaltation:"Exaltation ✦✦",peregrine:"Peregrine",detriment:"Detriment",fall:"Fall"};
const VOWELS={sun:{l:"Ι",p:"EE"},moon:{l:"Α",p:"AH"},mercury:{l:"Ε",p:"EH"},venus:{l:"Η",p:"AY"},mars:{l:"Ο",p:"OH"},jupiter:{l:"Υ",p:"EUW"},saturn:{l:"Ω",p:"OHW"}};

// ═══════════════════════════════════════════════════════════════════════
// THE THIRTY-SIX FACES — Chaldean decan order, classical Picatrix imagery
// Names and magic descriptions are original, grounded in Picatrix Book II
// Ch.11, Agrippa Three Books II.37, and Abu Ma'shar's decan faces.
// ═══════════════════════════════════════════════════════════════════════
export const DECANS=[
  {n:1, sign:"Aries",sym:"♈",ruler:"mars",   name:"The Iron Gate",              tarot:"2 of Wands",  magic:"Forced passage and initiation; claiming the right to enter by force of will; works of decisive beginning and contest."},
  {n:2, sign:"Aries",sym:"♈",ruler:"sun",    name:"The Golden Helm",            tarot:"3 of Wands",  magic:"Command of one's domain; solar authority and sovereignty; works of public standing and rightful kingship."},
  {n:3, sign:"Aries",sym:"♈",ruler:"venus",  name:"The Adornment",              tarot:"4 of Wands",  magic:"Desire made visible; charm over hostility; works of beauty, attraction, and winning favor through presence."},
  {n:4, sign:"Taurus",sym:"♉",ruler:"mercury",name:"The Turning Furrow",        tarot:"5 of Pents",  magic:"Sustained intelligent labor; civilizing raw potential; works requiring methodical effort sustained over time."},
  {n:5, sign:"Taurus",sym:"♉",ruler:"moon",  name:"The Sacred Union",           tarot:"6 of Pents",  magic:"Material fertility and abundance through sacred joining; drawing wealth through natural attraction and increase."},
  {n:6, sign:"Taurus",sym:"♉",ruler:"saturn",name:"The Slow Lesson",            tarot:"7 of Pents",  magic:"Wisdom earned through patience and privation; protective endurance; works of threshold guardianship and long waiting."},
  {n:7, sign:"Gemini",sym:"♊",ruler:"jupiter",name:"The Philosopher's Aim",     tarot:"8 of Swords", magic:"Opening the mind to paradox; works of philosophical study, cosmic inquiry, and the pursuit of hidden knowledge."},
  {n:8, sign:"Gemini",sym:"♊",ruler:"mars",  name:"The Divided One",            tarot:"9 of Swords", magic:"Integration of opposing forces; reconciling inner war; works at the threshold between contrary natures."},
  {n:9, sign:"Gemini",sym:"♊",ruler:"sun",   name:"The Serpent Wisdom",         tarot:"10 of Swords",magic:"Authority gained through knowledge of hidden things; decisive mastery over dual natures; the sword of discernment."},
  {n:10,sign:"Cancer",sym:"♋",ruler:"venus", name:"The Nursing Bond",           tarot:"2 of Cups",   magic:"Tender and nurturing alliance; love that feeds and protects; works of maternal care and sustaining attachment."},
  {n:11,sign:"Cancer",sym:"♋",ruler:"mercury",name:"The Shielded Hearth",       tarot:"3 of Cups",   magic:"Protection of what is growing and fragile; incubating potential; warding the inner sanctuary of development."},
  {n:12,sign:"Cancer",sym:"♋",ruler:"moon",  name:"The Deep Well",              tarot:"4 of Cups",   magic:"Accessing what lies beneath surface; works of tidal provision and abundance drawn from the depths below."},
  {n:13,sign:"Leo",sym:"♌",ruler:"saturn",   name:"The Hidden Face",            tarot:"5 of Wands",  magic:"Works of public persona and the crafted mask; projecting authority convincingly; the face that becomes the man."},
  {n:14,sign:"Leo",sym:"♌",ruler:"jupiter",  name:"The Laureled Brow",          tarot:"6 of Wands",  magic:"Genuine honor earned through merit; harmonious elevation; works of authentic recognition and beneficent glory."},
  {n:15,sign:"Leo",sym:"♌",ruler:"mars",     name:"The Raised Standard",        tarot:"7 of Wands",  magic:"Defense of rightful authority; rallying forces to a just cause; works of martial protection and legitimate standing."},
  {n:16,sign:"Virgo",sym:"♍",ruler:"sun",    name:"The Devoted Craft",          tarot:"8 of Pents",  magic:"Patient mastery through humble service; devotional work; perfection achieved through uncounted repetitions."},
  {n:17,sign:"Virgo",sym:"♍",ruler:"venus",  name:"The Refining Fire",          tarot:"9 of Pents",  magic:"Shaping and improving the material self; works of artistic refinement; building the form that reflects the soul."},
  {n:18,sign:"Virgo",sym:"♍",ruler:"mercury",name:"The Sealed Vessel",          tarot:"10 of Pents", magic:"Confrontation with limitation and ending; releasing attachment to the material; works at the threshold of dissolution."},
  {n:19,sign:"Libra",sym:"♎",ruler:"moon",   name:"The Scale and Veil",         tarot:"2 of Swords", magic:"Works of impartial justice; legal matters; restoring balance to what has tilted; lifting the blindfold of prejudice."},
  {n:20,sign:"Libra",sym:"♎",ruler:"saturn", name:"The Sealed Covenant",        tarot:"3 of Swords", magic:"Binding agreements and sacred oaths; protection of contracts; works that hold two parties in inviolable relation."},
  {n:21,sign:"Libra",sym:"♎",ruler:"jupiter",name:"The Balanced Sphere",        tarot:"4 of Swords", magic:"Restoring dynamic equilibrium; expanding capacity for right proportion; works that find the center between extremes."},
  {n:22,sign:"Scorpio",sym:"♏",ruler:"mars", name:"The Primal Wound",           tarot:"5 of Cups",   magic:"Works of deep desire and primal necessity; accessing what lies buried; confronting what cannot be avoided."},
  {n:23,sign:"Scorpio",sym:"♏",ruler:"sun",  name:"The Alchemical Marriage",    tarot:"6 of Cups",   magic:"Transformative union; purification through intimate exchange; works of regeneration and mutual transmutation."},
  {n:24,sign:"Scorpio",sym:"♏",ruler:"venus",name:"The Poison and the Cure",    tarot:"7 of Cups",   magic:"Hidden wisdom in dangerous form; works of disillusionment; protection and navigation through perilous encounters."},
  {n:25,sign:"Sagittarius",sym:"♐",ruler:"mercury",name:"The Sure Arrow",       tarot:"8 of Wands",  magic:"Single-pointed force directed at a goal; swift communication and transit; works of precise directed momentum."},
  {n:26,sign:"Sagittarius",sym:"♐",ruler:"moon",name:"The Held Rein",           tarot:"9 of Wands",  magic:"Maintaining direction under pressure; strength through endurance; works of patient unity held against resistance."},
  {n:27,sign:"Sagittarius",sym:"♐",ruler:"saturn",name:"The Returned Gift",     tarot:"10 of Wands", magic:"Honorable completion; releasing what has run its course; dignified endings and the laying down of burdens."},
  {n:28,sign:"Capricorn",sym:"♑",ruler:"jupiter",name:"The Embodied Will",      tarot:"2 of Pents",  magic:"Full identification with material purpose; works of incarnated authority; purpose made flesh in the world."},
  {n:29,sign:"Capricorn",sym:"♑",ruler:"mars",name:"The Rising Pyramid",        tarot:"3 of Pents",  magic:"Ambitious construction; gathering and organizing resources; blueprint made manifest through disciplined effort."},
  {n:30,sign:"Capricorn",sym:"♑",ruler:"sun",name:"The Enduring Throne",        tarot:"4 of Pents",  magic:"Claiming legitimate authority; administering power at its apex; works of consolidation and lasting governance."},
  {n:31,sign:"Aquarius",sym:"♒",ruler:"venus",name:"The Voluntary Exile",       tarot:"5 of Swords", magic:"Works of the innovator and heretic; radical self-determination; deliberate departure from the given order."},
  {n:32,sign:"Aquarius",sym:"♒",ruler:"mercury",name:"The Bridge Between Worlds",tarot:"6 of Swords",magic:"Diplomatic navigation of threshold states; liminal transit; talisman for travelers between different orders of being."},
  {n:33,sign:"Aquarius",sym:"♒",ruler:"moon",name:"The Binding Knot",           tarot:"7 of Swords", magic:"Durable complex patterns; warding against entrapment; works of principled holding and principled release."},
  {n:34,sign:"Pisces",sym:"♓",ruler:"saturn",name:"The Labyrinthine Deep",      tarot:"8 of Cups",   magic:"Navigation of inner terrain; confronting the unconscious; deliberate preparation for the great dissolution."},
  {n:35,sign:"Pisces",sym:"♓",ruler:"jupiter",name:"The Net of Grace",          tarot:"9 of Cups",   magic:"Abundance received through surrender; catching what flows of itself; manifestation through yielding and trust."},
  {n:36,sign:"Pisces",sym:"♓",ruler:"mars",  name:"The Final Offering",         tarot:"10 of Cups",  magic:"The last complete commitment; the passionate act of surrender to the quest; the great work's consummate end."},
];

// ═══════════════════════════════════════════════════════════════════════
// FIXED STARS — 20 stars
// ═══════════════════════════════════════════════════════════════════════
export const FIXED_STARS = [
  {name:"Regulus",   lon:149.83,col:"#FFD080",mag:1.4, nature:"Jupiter/Mars",  sign:"Leo 29°",    desc:"Heart of the Lion. The Royal Star — bestows enormous honor, military success, and executive power. Has been called the king-maker of the zodiac.",magic:"Royal authority, public recognition, leadership, solar vitality.",warning:"Destroys those who use power for revenge. The honor must be absolute."},
  {name:"Spica",     lon:203.84,col:"#A0D0F0",mag:0.97,nature:"Venus/Mercury", sign:"Libra 23°",  desc:"The brightest star of Virgo — extraordinary good fortune, artistic genius, scientific brilliance, sudden elevation.",magic:"Creative and artistic excellence, scientific mastery, benevolent fortune.",warning:"One of the most benefic stars in the sky. No major cautions."},
  {name:"Aldebaran", lon:69.79, col:"#F09050",mag:0.85,nature:"Mars",          sign:"Gemini 9°",  desc:"Eye of the Bull — Royal Star of the East. Courage, military success, eloquence, tenacity. Honors those who demonstrate both intelligence and bravery.",magic:"Courage in contest, competitive victory, strength of will.",warning:"Rewards integrity. Destroys the treacherous."},
  {name:"Antares",   lon:249.75,col:"#D04020",mag:0.96,nature:"Mars/Jupiter",  sign:"Sagittarius 9°",desc:"Heart of the Scorpion — Royal Star of the West. Extreme intensity, radical transformation, reckless courage. The most volatile of the Royal Stars.",magic:"Radical transformation, extreme courage, binding malefic forces.",warning:"The most volatile Royal Star. Absolutely unforgiving of hesitation or insincerity."},
  {name:"Algol",     lon:56.17,col:"#8080C0",mag:2.1, nature:"Saturn/Jupiter",sign:"Taurus 26°", desc:"Head of Medusa — the Blinking Demon. The most feared fixed star in the tradition. Associated with severance, radical endings, confrontation with horror.",magic:"Binding operations, protective severing, radical endings, cursing.",warning:"Handle with the greatest care. Rewards absolute clarity of intent. Punishes the careless absolutely."},
  {name:"Sirius",    lon:104.09,col:"#E0F0FF",mag:-1.46,nature:"Jupiter/Mars", sign:"Cancer 14°", desc:"The Dog Star — brightest star in the sky. Wealth, fame, discovery of hidden things, the blazing light that reveals. Associated with Egyptian Isis and Osiris.",magic:"Fame, discovery, wealth through brilliance, loyalty and protection.",warning:"Excess brings downfall. The fire of Sirius can consume as well as illuminate."},
  {name:"Canopus",   lon:104.98, col:"#C0E8FF",mag:-0.72,nature:"Saturn",       sign:"Cancer 14°", desc:"The Helmsman of the Argo. Navigation through the deep waters, occult knowledge, long journeys. One of the most southerly visible stars.",magic:"Occult navigation, long-distance journeys, secret knowledge.",warning:"Saturnine in nature — requires patience and acceptance of limitation."},
  {name:"Vega",      lon:285.3,col:"#D0D0FF",mag:0.03, nature:"Venus/Mercury",sign:"Capricorn 15°",desc:"The Lyre of Orpheus. Music, enchantment through beauty, charismatic attraction, the power of art to move stone.",magic:"Musical magic, enchantment, artistic charisma, Venusian glamour.",warning:"Danger of wasted beauty through self-indulgence."},
  {name:"Pollux",    lon:113.22,col:"#FFD0A0",mag:1.14, nature:"Mars",         sign:"Cancer 23°", desc:"The Immortal Twin. Competitive excellence, honors in physical contest and debate, the strength that comes from brotherly bond.",magic:"Athletic victory, sibling magic, competitive excellence.",warning:"The martial twin — all workings have a combative edge."},
  {name:"Procyon",   lon:115.79,col:"#FFE0B0",mag:0.38, nature:"Mercury/Mars", sign:"Cancer 25°", desc:"Before the Dog. Swift success, quick fortune, sudden favorable change. Associated with precipitation of events and rapid manifestation.",magic:"Swift action, rapid manifestation, accelerating outcomes.",warning:"Sudden elevation often followed by equally sudden reversal."},
  {name:"Fomalhaut", lon:333.85,col:"#C0C8FF",mag:1.16, nature:"Venus/Mercury",sign:"Pisces 3°",  desc:"The Lonely One — Royal Star of the South. Idealism, mystical vision, dreams made real. The star of the artist and the visionary.",magic:"Mystical vision, artistic inspiration, spiritual idealism.",warning:"Neptunian in quality — the vision can become an obsession or a delusion."},
  {name:"Deneb Algedi",lon:323.53,col:"#A0B8C0",mag:2.85,nature:"Saturn/Jupiter",sign:"Aquarius 23°",desc:"Tail of the Goat. Law, justice, hidden authority. Protection through disciplined application of rules. Favors lawyers, judges, and those who work within systems.",magic:"Legal protection, working within established systems, hidden authority.",warning:"Saturn/Jupiter blend — requires both discipline and faith."},
  {name:"Capella",   lon:81.86, col:"#FFE0A0",mag:0.08, nature:"Mercury/Mars", sign:"Gemini 21°", desc:"The She-Goat. Honours, wealth, curiosity, versatility. The inquisitive mind that seeks knowledge across all domains. Favors researchers and polymaths.",magic:"Intellectual breadth, research, honours through learning.",warning:"Restlessness — difficulty focusing the vast curiosity on one thing."},
  {name:"Alcyone",   lon:59.99, col:"#C0D0FF",mag:2.87, nature:"Moon/Jupiter", sign:"Taurus 29°",  desc:"The Central Pleiad — the weeping one. Grief transmuted into vision, mourning becoming prophetic ability, the oracular gift born from loss.",magic:"Prophetic vision, working with ancestral grief, oracular work.",warning:"Associated with weeping and sorrow — accept this as the price of the gift."},
  {name:"Scheat",    lon:359.37,col:"#A090B0",mag:2.4,  nature:"Saturn/Mercury",sign:"Pisces 29°", desc:"The Leg — end of Pegasus. Dangerous positions, imprisonment, drowning, and the extraordinary gift of seeing beyond ordinary limits.",magic:"Final works before a threshold, extreme situations requiring extreme measures.",warning:"One of the most malefic stars. Not recommended for most operations."},
  {name:"Arcturus",  lon:204.23,col:"#FFCCA0",mag:-0.05,nature:"Jupiter/Mars", sign:"Libra 24°",  desc:"The Bear Watcher. Success through individual effort, pioneering spirit, wealth and honour through exploration and new paths.",magic:"Pioneering ventures, success through bold action, new territories.",warning:"Requires genuine courage and willingness to forge new paths."},
  {name:"Zubenelgenubi",lon:225.08,col:"#90B090",mag:2.75,nature:"Saturn/Mars",sign:"Scorpio 15°", desc:"The Southern Scale. Associated with loss, curses, and poisonous matters — but also with the rectification of imbalance and karmic debts.",magic:"Works of justice and rectification, uncrossing, removing malefic influences.",warning:"Strongly malefic. Use only in works of genuine correction and justice."},
  {name:"Zubeneschamali",lon:229.36,col:"#90C890",mag:2.61,nature:"Jupiter/Mercury",sign:"Scorpio 19°",desc:"The Northern Scale. The only star in the sky with a greenish tint — associated with honours, riches, and good fortune. Fortunate for all matters.",magic:"All benefic works, increase of wealth and status, honours.",warning:"One of the more fortunate stars. No major cautions."},
  {name:"Vindemiatrix",lon:189.94,col:"#D0B0D0",mag:2.85,nature:"Saturn/Mercury",sign:"Libra 9°", desc:"The Grape Gatherer. Associated with widowhood, loss of a partner, grief — but also with harvesting the fruits of past work.",magic:"Completing old cycles, releasing partnerships, harvesting past efforts.",warning:"Traditionally associated with loss. Best for endings, not beginnings."},
  {name:"Achernar",  lon:345.3, col:"#C0D8FF",mag:0.46, nature:"Jupiter",      sign:"Pisces 15°",  desc:"End of the River. Extreme good fortune, particularly in religious or philosophical matters. One of the most benefic stars.",magic:"Spiritual elevation, philosophical works, extreme good fortune.",warning:"Works best for those with genuine spiritual orientation."},
  // Extended catalog
  {name:"Rigel",     lon:76.83, col:"#B0D0FF",mag:0.13, nature:"Jupiter/Saturn",sign:"Gemini 16°", desc:"The left foot of Orion — the Hunter's step forward. Honour, renown, happiness, and particularly good fortune in matters of learning and mechanical skill.",magic:"Honour through skill, intellectual achievement, journeys undertaken with boldness.",warning:"The Saturnine quality asks for disciplined application; brilliance alone is insufficient."},
  {name:"Betelgeuse",lon:88.76, col:"#FF9040",mag:0.42, nature:"Mars/Mercury", sign:"Gemini 28°", desc:"The shoulder of the Hunter — martial excellence, military honours, boldness in battle and debate. One of the most powerful stars for competitive endeavors.",magic:"Victory in open contest, martial excellence, bold action.",warning:"Mars/Mercury combined creates impulsivity — great power with poor timing brings destruction."},
  {name:"Castor",    lon:110.24,col:"#E0F0FF",mag:1.58, nature:"Mercury",      sign:"Cancer 20°", desc:"The mortal twin of Gemini — eloquence, cleverness, dual nature, sudden fame and just as sudden reversal. The mind that sees all sides.",magic:"Communication mastery, writing, quick thought, eloquence in difficult matters.",warning:"Twin nature creates instability — the brilliance of Castor comes with its sudden dimming."},
  {name:"Eltanin",   lon:267.94,col:"#A070C0",mag:2.24, nature:"Saturn/Mars",  sign:"Sagittarius 27°",desc:"Eye of the Dragon — the head of Draco. Deep wisdom, occult power, the dragon's knowing. Commands respect but also brings jealousy from rivals.",magic:"Occult mastery, commanding respect, protective dragon power, binding of enemies.",warning:"Heavy malefic quality — Saturn/Mars. Use with full protective measures."},
  {name:"Hamal",     lon:37.66, col:"#F0C080",mag:2.0,  nature:"Mars/Saturn",  sign:"Taurus 7°",  desc:"The head of Aries — cruelty can be a shadow, but also the fierce protector. Violent when afflicted, powerful when channeled correctly.",magic:"Decisive action, cutting through obstacles, aggressive protection.",warning:"Mars/Saturn combination is inherently difficult — requires clear intent and ethical grounding."},
  {name:"Menkar",    lon:45.09, col:"#A090A0",mag:2.54, nature:"Saturn",       sign:"Taurus 15°", desc:"The mouth of Cetus the Sea Monster. One of the more malefic stars — disease, scandal, dishonour, encounters with monstrous or destructive forces.",magic:"Binding monstrous or destructive forces, protective work against overwhelming enemies.",warning:"Strongly malefic. Approach only for defensive operations with full protections in place."},
  {name:"Mirach",    lon:30.4,  col:"#E0C0E0",mag:2.07, nature:"Venus",        sign:"Taurus 0°",   desc:"The girdle of Andromeda — pure Venusian beauty, friendship, love of harmony, benevolence, and artistic sensitivity.",magic:"Friendship and love spells, attracting beauty, harmony in relationships.",warning:"One of the most benefic stars for Venusian work. Avoid cold or harsh intentions."},
  {name:"Alphecca",  lon:222.29,col:"#C0E0C0",mag:2.23, nature:"Venus/Mercury",sign:"Scorpio 12°",desc:"The Crown of the Northern Crown — honour and dignity gained through one's own merit. Artistic sensitivity combined with intellectual precision.",magic:"Merit-based honour, artistic refinement, rewards for genuine skill.",warning:"Honours fade if not sustained by continued excellence."},
  {name:"Rasalhague",lon:262.44,col:"#90C0A0",mag:2.08, nature:"Saturn/Venus", sign:"Sagittarius 22°",desc:"Head of the Serpent Bearer. Medicine, healing, esoteric knowledge, dangerous dealings with serpentine wisdom. The healer who has faced the poison.",magic:"Healing work, medical operations, antidotes, esoteric wisdom.",warning:"Saturn tempers Venus — gains are possible but require careful, measured approach."},
  {name:"Unukalhai", lon:232.07,col:"#906060",mag:2.65, nature:"Saturn/Mars",  sign:"Scorpio 22°",desc:"Heart of the Serpent — disease, poison, destructive forces made available to those who can command them. The venom that heals or kills.",magic:"Binding harmful forces, protective works, extreme cases of defensive magic.",warning:"One of the more malefic stars. Saturn/Mars combined is exceptionally destructive without care."},
  {name:"Lesath",    lon:264.0,col:"#D04040",mag:2.69, nature:"Mars/Mercury", sign:"Sagittarius 24°",desc:"The sting of the Scorpion — danger, violence, toxic cleverness, the barb that strikes unexpectedly. Associated with poisons and dangerous wisdom.",magic:"Sharp and sudden action, swift binding, works against specific opponents.",warning:"Mars/Mercury is volatile and fast-moving. Works triggered here can escalate unpredictably."},
  {name:"Sadalsuud", lon:323.39,col:"#8090C0",mag:2.91, nature:"Saturn/Mercury",sign:"Aquarius 23°",desc:"The luckiest of the lucky — Jupiter of the waters. The star of good fortune that comes through communities, organizations, and collective endeavor.",magic:"Group working, communal blessing, luck through networks and connections.",warning:"Saturn modifies Mercury here — the fortune requires organization and system, not luck alone."},
  {name:"Deneb Adige",lon:335.32,col:"#C0D0F0",mag:1.25, nature:"Venus/Mercury",sign:"Pisces 5°", desc:"The tail of the Swan — the beauty of artistic completion, graceful endings, the swan song that transcends ordinary limits.",magic:"Artistic completion, graceful conclusions, beauty in transition and farewell.",warning:"Associated with endings — most powerful for concluding cycles, not initiating them."},
  {name:"Markab",    lon:353.48,col:"#8080A0",mag:2.49, nature:"Saturn/Mars",  sign:"Pisces 23°", desc:"The saddle of Pegasus — honor gained and then destroyed, falls from great heights, the danger of being near success without the stability to hold it.",magic:"Works at the very end of a cycle or threshold, desperate measures before a turning point.",warning:"Strongly associated with falls from honour. Most dangerous for those in positions of power."},
  {name:"Mirfak",    lon:62.08, col:"#F0D0A0",mag:1.79, nature:"Jupiter/Saturn",sign:"Gemini 2°",desc:"The hero Perseus — honours, boldness, the courage that comes from principle. Good for those who champion just causes and slay monstrous obstacles.",magic:"Heroic deeds, championing just causes, victory through courage and principle.",warning:"Requires genuine heroism — not bravado. Empty posturing under this star backfires."},
  {name:"Alkaid",    lon:176.93, col:"#B0C0D8",mag:1.86, nature:"Venus/Moon",   sign:"Virgo 26°",  desc:"Tail of the Great Bear — Benetnash, the chief of the mourners. A Behenian star of the loadstone and the north-turning chicory; protection in travel and against enchantment.",magic:"Protection against incantations, security in travel, works of just vengeance (Picatrix III.7).",warning:"The Picatrix's one fixed-star working uses this star for vengeance — handle its martial edge with justice or not at all."},
  {name:"Algorab",   lon:193.45, col:"#8090A0",mag:2.94, nature:"Saturn/Mars",  sign:"Libra 13°",  desc:"Wing of the Crow — a Behenian star, double-edged: the raven's boldness and evil dreams, but power over spirits and protection against malice.",magic:"Driving away or gathering spirits, protection against the malice of men and winds, crow-work.",warning:"Saturn/Mars — it makes bold and choleric. The onyx and the burdock temper what the star inflames."},
];
// Positions engine-derived: every lon above is the star's J2000 ecliptic
// longitude computed from the Swiss Ephemeris catalog (sefstars), and each
// sign label is derived from that lon — the two can no longer disagree.
// The 15 Behenian stars carry their Agrippa/Hermes materia in data/behenian.js.

// ═══════════════════════════════════════════════════════════════════════
// FRACTAL ENGINE
// ═══════════════════════════════════════════════════════════════════════
const YEAR_SEC = 31557600;
const L_DUR = [YEAR_SEC/36,YEAR_SEC/1296,YEAR_SEC/46656,YEAR_SEC/1679616];
function calcFractal(date,mode){
  const jd=dateToJD(date),sunL=sunLon(jd);
  const l1Idx=Math.floor(sunL/10)%36,degIn=sunL%10,secInL1=(degIn/10)*L_DUR[0];
  const l2Slot=Math.floor((secInL1/L_DUR[1])%36),secInL2=secInL1%L_DUR[1];
  const l3Slot=Math.floor((secInL2/L_DUR[2])%36),secInL3=secInL2%L_DUR[2];
  const l4Slot=Math.floor((secInL3/L_DUR[3])%36),secInL4=secInL3%L_DUR[3];
  let l2Idx,l3Idx,l4Idx;
  if(mode==="A"){l2Idx=l2Slot;l3Idx=l3Slot;l4Idx=l4Slot;}
  else{l2Idx=(l2Slot+l1Idx)%36;l3Idx=(l3Slot+l2Idx)%36;l4Idx=(l4Slot+l3Idx)%36;}
  const levels=[
    {level:1,idx:l1Idx,decan:DECANS[l1Idx],pos:degIn/10,secIn:secInL1,dur:L_DUR[0]},
    {level:2,idx:l2Idx,decan:DECANS[l2Idx],pos:secInL2/L_DUR[1],secIn:secInL2,dur:L_DUR[1]},
    {level:3,idx:l3Idx,decan:DECANS[l3Idx],pos:secInL3/L_DUR[2],secIn:secInL3,dur:L_DUR[2]},
    {level:4,idx:l4Idx,decan:DECANS[l4Idx],pos:secInL4/L_DUR[3],secIn:secInL4,dur:L_DUR[3]},
  ];
  return{levels,cosmicCoherence:levels.filter(l=>l.idx===l1Idx).length,secToThreshold:L_DUR[0]-secInL1,l1Idx,sunL};
}

function fmtTime(s){
  if(s>=86400){const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600);return`${d}d ${h}h`;}
  if(s>=3600){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return`${h}h ${m}m`;}
  if(s>=60){const m=Math.floor(s/60),sc=Math.floor(s%60);return`${m}m ${sc}s`;}
  return`${s.toFixed(1)}s`;
}
function fmtWindowTime(d,level){
  if(level<=2)return d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  if(level===3)return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"});
  return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"});
}
function calcWindowBounds(fractal,now){
  return fractal.levels.map(lev=>({
    start:new Date(now.getTime()-lev.secIn*1000),
    end:new Date(now.getTime()+(lev.dur-lev.secIn)*1000),
  }));
}
function calcL2Forecast(fractal,now,mode){
  const l1=fractal.levels[0];
  const l1StartMs=now.getTime()-l1.secIn*1000;
  const currentSlot=Math.floor(l1.secIn/L_DUR[1]);
  const forecast=[];
  for(let slot=currentSlot+1;slot<36;slot++){
    const startMs=l1StartMs+slot*L_DUR[1]*1000;
    const decIdx=mode==="A"?slot:(slot+fractal.l1Idx)%36;
    forecast.push({decan:DECANS[decIdx],decIdx,start:new Date(startMs),end:new Date(startMs+L_DUR[1]*1000),isCoherent:decIdx===fractal.l1Idx});
  }
  return forecast;
}
// ─── Outer planet approximate positions (linear from J2000.0) ───────────────
const OUTER_EPOCHS={
  uranus: {lon0:316.5,rate:360/30589},
  neptune:{lon0:304.3,rate:360/60190},
  pluto:  {lon0:250.1,rate:360/90582},
};
const J2000_MS=946728000000;
function outerPlanetLon(planet,date){
  const sw=swPlanetLon(planet,dateToJD(date));if(sw!=null)return sw;
  const days=(date.getTime()-J2000_MS)/86400000;
  const ep=OUTER_EPOCHS[planet];
  return norm(ep.lon0+ep.rate*days);
}
// Jupiter-Saturn conjunctions (historical + projected)
const JS_CONJUNCTIONS=[
  {date:"2000-05-28",sign:"Taurus",   lon:22.8, label:"Earth Mutation ends"},
  {date:"2020-12-21",sign:"Aquarius", lon:0.5,  label:"Air Mutation begins"},
  {date:"2040-10-31",sign:"Libra",    lon:17.6, label:"Air continues"},
  {date:"2060-04-07",sign:"Gemini",   lon:10.2, label:"Air continues"},
];
// Pre-computed outer planet sign ingresses 2024-2035
const DECADE_FORECAST=[
  {year:2025,month:4, planet:"uranus",  sign:"Gemini",    lon:60,  event:"Uranus ingresses Gemini"},
  {year:2025,month:3, planet:"neptune", sign:"Aries",     lon:0,   event:"Neptune ingresses Aries"},
  {year:2024,month:1, planet:"pluto",   sign:"Aquarius",  lon:300, event:"Pluto in Aquarius (full)"},
  {year:2026,month:1, planet:"saturn",  sign:"Aries",     lon:0,   event:"Saturn ingresses Aries"},
  {year:2027,month:6, planet:"jupiter", sign:"Scorpio",   lon:210, event:"Jupiter ingresses Scorpio"},
  {year:2028,month:6, planet:"jupiter", sign:"Sagittarius",lon:240,event:"Jupiter ingresses Sagittarius"},
  {year:2033,month:3, planet:"neptune", sign:"Taurus",    lon:30,  event:"Neptune ingresses Taurus"},
  {year:2034,month:8, planet:"uranus",  sign:"Cancer",    lon:90,  event:"Uranus ingresses Cancer"},
];

// ═══════════════════════════════════════════════════════════════════════
// EPHEMERIS HOOK
// ═══════════════════════════════════════════════════════════════════════
function getAspectsAll(pos){
  const pks=Object.keys(pos),asps=[];
  const ADefs=[
    {n:"Conjunction",a:0,o:8,nat:"variable",col:"#D4AF6A",s:"☌"},
    {n:"Opposition",a:180,o:8,nat:"tension",col:"#D24B31",s:"☍"},
    {n:"Trine",a:120,o:7,nat:"harmony",col:"#5CA85C",s:"△"},
    {n:"Square",a:90,o:7,nat:"tension",col:"#D24B31",s:"□"},
    {n:"Sextile",a:60,o:5,nat:"harmony",col:"#7CB8E0",s:"⚹"}
  ];
  for(let i=0;i<pks.length;i++)for(let j=i+1;j<pks.length;j++){
    const p1=pos[pks[i]],p2=pos[pks[j]];
    let diff=Math.abs(norm(p1.lon-p2.lon));if(diff>180)diff=360-diff;
    ADefs.forEach(ad=>{const orb=Math.abs(diff-ad.a);if(orb<=ad.o)asps.push({p1:pks[i],p2:pks[j],aspect:ad,orb:orb.toFixed(1),applying:orb>0.5});});
  }
  return asps.sort((a,b)=>a.orb-b.orb);
}

function useEphemeris(date,location){
  const jd=dateToJD(date);
  const pos={};
  const sunLon0=planetLon("sun",jd);
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    const lon=planetLon(pk,jd),dm=dailyMotion(pk,jd);
    const isRetro=dm<0&&pk!=="sun"&&pk!=="moon";
    const zodiac=lonToZodiac(lon);
    const dignity=getDignity(pk,lon);
    const bound=getBound(lon);
    const combust=getCombustion(pk,lon,sunLon0);
    const phase=getPlanetPhase(pk,lon,sunLon0);
    const baseScore=dignityScore(dignity,isRetro);
    const combustPenalty=combust&&combust.type!=="cazimi"?combust.penalty:0;
    pos[pk]={lon,dm,isRetro,zodiac,dignity,bound,score:Math.max(10,baseScore-combustPenalty),combust,phase};
  });
  const mpDeg=norm(pos.moon.lon-pos.sun.lon);
  const phases=["New","Waxing Crescent","First Quarter","Waxing Gibbous","Full","Waning Gibbous","Last Quarter","Waning Crescent"];
  const voc=checkVoC(jd);
  const decanIdx=Math.min(35,Math.floor(pos.sun.lon/10));
  const northNode=meanNode(jd),southNode=norm(northNode+180);
  const nearStars=FIXED_STARS.filter(s=>{
    const sLon=starLonAt(s,jd);
    const tp=Object.values(pos);
    return tp.some(p=>{let d=Math.abs(norm(sLon-p.lon));if(d>180)d=360-d;return d<3;});
  });
  const aspects=getAspectsAll(pos);
  const antiscia=getAntisciaAspects(pos);
  // Location-based additions (Phase 1c)
  let asc=null,mc=null,pof=null,pos2=null,isDayChart=null,lots=null,lotEros=null,lotNecessity=null,lotCourage=null;
  if(location?.lat&&location?.lon){
    asc=calcASC(jd,location.lat,location.lon);
    mc=calcMC(jd,location.lon);
    const ss=sunriseSetUTC(date,location.lat,location.lon);
    isDayChart=ss?date>=ss.rise&&date<ss.set:pos.sun.lon>=0&&pos.sun.lon<=180;
    // All seven Hermetic Lots from the verified sect-aware engine (Paulus).
    lots=computeLots({asc,isDayChart,sun:pos.sun.lon,moon:pos.moon.lon,mercury:pos.mercury.lon,venus:pos.venus.lon,mars:pos.mars.lon,jupiter:pos.jupiter.lon,saturn:pos.saturn.lon});
    pof=lots.fortune;pos2=lots.spirit;lotEros=lots.eros;lotNecessity=lots.necessity;lotCourage=lots.courage;
  }
  return{pos,jd,moonPhase:phases[Math.floor(mpDeg/45)],moonPhaseDeg:mpDeg,voc,decanIdx,nearStars,aspects,antiscia,northNode,southNode,asc,mc,pof,pos2,isDayChart,lots,lotEros,lotNecessity,lotCourage};
}

function calcNatal(bd,location){
  const jd=dateToJD(bd);const pos={};
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    const lon=planetLon(pk,jd),dm=dailyMotion(pk,jd);
    const isRetro=dm<0&&pk!=="sun"&&pk!=="moon";
    const zodiac=lonToZodiac(lon),dignity=getDignity(pk,lon);
    const decanIdx=Math.min(35,Math.floor(norm(lon)/10));
    pos[pk]={lon,zodiac,dignity,isRetro,decanIdx,decan:DECANS[decanIdx],score:dignityScore(dignity,isRetro)};
  });
  // Additional bodies
  const lilith=meanLilith(jd);
  const chiron=chironLon(jd);
  pos.lilith={lon:lilith,zodiac:lonToZodiac(lilith),isRetro:false};
  pos.chiron={lon:chiron,zodiac:lonToZodiac(chiron),isRetro:false};
  // Location-based natal points
  let asc=null,mc=null,pof=null,isDayChart=null,northNode=null,southNode=null;
  northNode=trueNode(jd);southNode=norm(northNode+180);
  if(location?.lat&&location?.lon){
    asc=calcASC(jd,location.lat,location.lon);
    mc=calcMC(jd,location.lon);
    const ss=sunriseSetUTC(bd,location.lat,location.lon);
    isDayChart=ss?bd>=ss.rise&&bd<ss.set:pos.sun.lon>=0&&pos.sun.lon<=180;
    pof=calcPOF(asc,pos.moon.lon,pos.sun.lon,isDayChart);
  }
  // Triplicities for each planet
  Object.entries(pos).forEach(([pk,p])=>{if(P[pk]&&p?.lon!=null)p.triplicity=getTriplicity(p.lon,isDayChart??true);});
  return{...pos,asc,mc,pof,isDayChart,northNode,southNode};
}

// Full conditions snapshot for a casting record at an arbitrary moment.
// useEphemeris is a pure function despite the hook-style name, so this is
// safe to call from event handlers and migrations.
export function conditionsFromProfile(date,profile,natalPos,election=null,approximate=false){
  const location=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
  const eph=useEphemeris(date,location);
  const hour=location?getPlanetaryHourUnequal(date,location.lat,location.lon):getPlanetaryHour(date);
  return captureConditions({now:date,eph,hour,location,natalPos,election,approximate});
}

// ═══════════════════════════════════════════════════════════════════════
// PHASE 5b-5f: PREDICTIVE ENGINE, ADDITIONAL BODIES, CHART TYPES,
// EPHEMERIS TOOLS, ADVANCED TECHNIQUES
// ═══════════════════════════════════════════════════════════════════════

// ── 5c: Additional Bodies ─────────────────────────────────────────────
function meanLilith(jd){const sw=swLilith(jd);if(sw!=null)return sw;return norm(83.353+40.6726*(jd-2451545)/36525*365.25);}
function chironLon(jd){
  const sw=swChiron(jd);if(sw!=null)return sw;
  const T=(jd-2451545)/36525;
  const n=360/50.7;
  const M=norm(76.5+n*T*100);
  const e=0.382;
  const Erad=M*D2R+e*Math.sin(M*D2R)*(1+e*Math.cos(M*D2R));
  const v=2*Math.atan2(Math.sqrt(1+e)*Math.sin(Erad/2),Math.sqrt(1-e)*Math.cos(Erad/2))*R2D;
  return norm(v+339.0+209.7);
}
function trueNode(jd){
  const sw=swTrueNode(jd);if(sw!=null)return sw;
  const Mprime=norm(134.96298+477198.867398*(jd-2451545)/36525);
  const F=norm(93.27191+483202.017538*(jd-2451545)/36525);
  const mn=meanNode(jd);
  const osc=1.274*Math.sin((Mprime-2*F)*D2R);
  return norm(mn+osc);
}
// ── 5c: Dorotheus triplicities ────────────────────────────────────────
const TRIPLICITIES={
  fire: {day:"sun",night:"jupiter",part:"saturn"},
  earth:{day:"venus",night:"moon",part:"mars"},
  air:  {day:"saturn",night:"mercury",part:"jupiter"},
  water:{day:"venus",night:"mars",part:"moon"},
};
const ELEMENT_BY_SIGN=["fire","earth","air","water","fire","earth","air","water","fire","earth","air","water"];
function getTriplicity(lon,isDayChart){
  const t=TRIPLICITIES[ELEMENT_BY_SIGN[Math.floor(norm(lon)/30)]];
  return isDayChart?t.day:t.night;
}

// ── 5b: Secondary progressions ────────────────────────────────────────
function calcProgressions(birthDate,lat,lon,targetDate){
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
function calcSolarArc(birthDate,targetDate,natalPos){
  const ageYears=(targetDate-birthDate)/(365.25*86400000);
  const jdProg=dateToJD(birthDate)+ageYears;
  const progSunLon=planetLon("sun",jdProg);
  const arc=norm(progSunLon-natalPos.sun.lon);
  const directed={};
  Object.entries(natalPos).forEach(([pk,np])=>{if(np&&np.lon!=null)directed[pk]={...np,lon:norm(np.lon+arc)};});
  return{arc:arc.toFixed(2),arcDeg:arc,directed};
}

// ── 5b: Transit scanner ───────────────────────────────────────────────
const TRANSIT_ASPECTS=[
  {name:"Conjunction",angle:0,orb:1,col:"#D4AF6A"},
  {name:"Opposition",angle:180,orb:1,col:"#D24B31"},
  {name:"Trine",angle:120,orb:1,col:"#5CA85C"},
  {name:"Square",angle:90,orb:1,col:"#D24B31"},
  {name:"Sextile",angle:60,orb:0.8,col:"#7CB8E0"},
];
function scanTransits(natalPos,startDate,days=90){
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
const FIRDARIA_DAY=["sun","venus","mercury","moon","saturn","jupiter","mars","northNode","southNode"];
const FIRDARIA_NIGHT=["moon","saturn","jupiter","mars","sun","venus","mercury","northNode","southNode"];
const FIRDARIA_YRS=[10,8,13,9,11,12,7,3,2];
function calcFirdaria(birthDate,isDayChart,now){
  const seq=isDayChart?FIRDARIA_DAY:FIRDARIA_NIGHT;
  const totalYrs=75;
  const ageYrs=(now-birthDate)/(365.25*86400000);
  const cycleYrs=ageYrs%totalYrs;
  let cum=0,majIdx=0;
  for(let i=0;i<FIRDARIA_YRS.length;i++){
    if(cycleYrs<cum+FIRDARIA_YRS[i]){majIdx=i;break;}
    cum+=FIRDARIA_YRS[i];
  }
  const majLord=seq[majIdx];
  const majPer=FIRDARIA_YRS[majIdx];
  const posInMaj=cycleYrs-cum;
  const minDur=majPer/7;
  const minIdx=Math.min(6,Math.floor(posInMaj/minDur));
  const minLord=seq[(majIdx+minIdx)%seq.length];
  const pct=(posInMaj/majPer)*100;
  // Build full period list
  const periods=[];let c=0;
  for(let i=0;i<FIRDARIA_YRS.length;i++){
    const sy=c,ey=c+FIRDARIA_YRS[i];
    periods.push({lord:seq[i],start:new Date(birthDate.getTime()+sy*365.25*86400000),end:new Date(birthDate.getTime()+ey*365.25*86400000),years:FIRDARIA_YRS[i],isCurrent:i===majIdx});
    c+=FIRDARIA_YRS[i];
  }
  return{majLord,minLord,pct,cycleYrs,periods};
}

// ── 5d: Solar Return ──────────────────────────────────────────────────
function calcSolarReturn(natalSunLon,targetYear,lat,lon){
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
function calcLunarReturn(natalMoonLon,fromDate,lat,lon){
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
function scanIngresses(startDate,days=180){
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
function scanStations(startDate,days=365){
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
function scanEclipses(startDate,months=12){
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
function lonToDecl(lon,jd){
  return Math.asin(Math.sin(obliquity(jd)*D2R)*Math.sin(lon*D2R))*R2D;
}
function getDeclAspects(pos,jd){
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
function getMidpoints(pos){
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
function calcAllLots(asc,sLon,mLon,maLon,vLon,jLon,saLon,day){
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
function loadPeople(){try{const r=localStorage.getItem("astrum_people");return r?JSON.parse(r):[];}catch{return[];}}
function savePeople(p){try{localStorage.setItem("astrum_people",JSON.stringify(p));}catch{}}

// ═══════════════════════════════════════════════════════════════════════
// HOUSE SYSTEMS ENGINE (Phase 5a)
// ═══════════════════════════════════════════════════════════════════════
// Returns array of 12 cusp longitudes [cusp1..cusp12]
function calcHouses(jd,lat,lon,system="whole"){
  const asc=calcASC(jd,lat,lon);
  const mc=calcMC(jd,lon);
  const RAMC=lstDeg(jd,lon)*D2R;
  const e=obliquity(jd)*D2R;
  const phi=lat*D2R;
  if(system==="whole"){
    const base=Math.floor(asc/30)*30;
    return Array.from({length:12},(_,i)=>norm(base+i*30));
  }
  if(system==="equal"){
    return Array.from({length:12},(_,i)=>norm(asc+i*30));
  }
  if(system==="regio"){
    // Regiomontanus: celestial equator divided into 12 equal parts via RAMC
    // tan(λ) = sin(θ) / (cos(θ)·cos(ε) − tan(φ)·sin(ε))
    const cusps=[];
    for(let i=0;i<12;i++){
      if(i===0){cusps.push(asc);continue;}
      if(i===3){cusps.push(norm(mc+180));continue;} // IC
      if(i===6){cusps.push(norm(asc+180));continue;} // DSC
      if(i===9){cusps.push(mc);continue;} // MC
      const theta=RAMC+(i+1)*30*D2R; // offset from RAMC
      const lambda=Math.atan2(Math.sin(theta),(Math.cos(theta)*Math.cos(e)-Math.tan(phi)*Math.sin(e)))*R2D;
      cusps.push(norm(lambda));
    }
    return cusps;
  }
  if(system==="koch"){
    // Koch (Birthplace): based on diurnal semi-arc of the MC degree
    const cusps=[];
    for(let i=0;i<12;i++){
      if(i===0){cusps.push(asc);continue;}
      if(i===3){cusps.push(norm(mc+180));continue;}
      if(i===6){cusps.push(norm(asc+180));continue;}
      if(i===9){cusps.push(mc);continue;}
      // Offset: houses 11,12 use MC oblique ascension shifted by DSA/3
      const frac=((i<3?i:(i<6?i-3:(i<9?i-6:i-9)))+1)/3;
      const mcDec=Math.asin(Math.sin(e)*Math.sin(mc*D2R))*R2D; // MC declination
      const cosH=-Math.sin(mcDec*D2R)*Math.tan(phi)/(Math.cos(mcDec*D2R)||0.0001);
      const H=Math.abs(cosH)<=1?Math.acos(Math.max(-1,Math.min(1,cosH)))*R2D:90;
      const DSA=i<6?90+H:90-H;
      const theta=RAMC+DSA*frac*D2R*(i<3||(i>=6&&i<9)?1:-1);
      const lam=Math.atan2(Math.sin(theta),(Math.cos(theta)*Math.cos(e)-Math.tan(phi)*Math.sin(e)))*R2D;
      cusps.push(norm(lam));
    }
    return cusps;
  }
  if(system==="placidus"){
    // Placidus: iterative — each cusp has semi-arc = n×30°/6
    const cusps=[];
    for(let i=0;i<12;i++){
      if(i===0){cusps.push(asc);continue;}
      if(i===3){cusps.push(norm(mc+180));continue;}
      if(i===6){cusps.push(norm(asc+180));continue;}
      if(i===9){cusps.push(mc);continue;}
      // House offsets: 11→2/3 SA above horizon, 12→1/3 SA above, 2→1/3 SA below, 3→2/3 SA below
      const fracMap={1:2/3,2:1/3,4:1/3,5:2/3}; // index within quadrant
      const qi=i<3?i:(i<6?i-3:(i<9?i-6:i-9));
      const frac=fracMap[qi<3?qi:qi]||0.5;
      const upperHem=i<6; // houses 11,12,1,2,3 are above horizon
      // Newton-Raphson iteration
      let lon0=mc+i*30; // initial guess
      for(let iter=0;iter<8;iter++){
        const dec=Math.asin(Math.sin(e)*Math.sin(norm(lon0)*D2R));
        const cosHA=-Math.sin(dec)*Math.tan(phi)/(Math.cos(dec)||0.0001);
        if(Math.abs(cosHA)>1){lon0+=0.1;continue;}
        const HA=Math.acos(cosHA);
        const SA=upperHem?HA:Math.PI-HA;
        const target=SA*(upperHem?frac:1-frac);
        // RA of this degree minus RAMC should equal target
        const RA=Math.atan2(Math.sin(norm(lon0)*D2R)*Math.cos(e),Math.cos(norm(lon0)*D2R))+Math.PI;
        const diff=(RA-RAMC-target+Math.PI*3)%(Math.PI*2)-Math.PI;
        lon0-=diff*R2D*0.5;
      }
      cusps.push(norm(lon0));
    }
    return cusps;
  }
  return Array.from({length:12},(_,i)=>norm(asc+i*30));
}

// House number (1-12) for a given longitude and cusp array
function getHouseNum(lon,cusps){
  for(let i=0;i<12;i++){
    const c1=cusps[i],c2=cusps[(i+1)%12];
    // Handle wrap-around
    if(c1<=c2){if(lon>=c1&&lon<c2)return i+1;}
    else{if(lon>=c1||lon<c2)return i+1;}
  }
  return 1;
}
const HOUSE_NAMES=["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const HOUSE_MEANINGS=["Self, body, life orientation","Possessions, resources, values","Communication, siblings, local travel","Home, family, roots, private self","Creativity, romance, children, joy","Health, work, service, daily rhythm","Partners, open enemies, contracts","Shared resources, transformation, occult","Higher mind, philosophy, long journeys","Career, public role, authority","Community, hopes, friends, groups","Hidden matters, spirituality, retreat"];

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const CSS=`
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#04060F;}

/* ── Liquid Glass Token System ── */
:root{
  --tint-primary:#D4AF6A;
  --tint-rgb:200,175,100;
  --glass-bg:8,5,22;
  --bg-grad1:rgba(60,40,120,0.25);
  --bg-grad2:rgba(160,120,30,0.15);
  --shadow-col:0,0,0;
}

/* ── Glass Material Tiers ── */
.glass-ultra{
  background:rgba(var(--glass-bg),0.70);
  backdrop-filter:blur(40px) saturate(200%) brightness(1.08);
  -webkit-backdrop-filter:blur(40px) saturate(200%) brightness(1.08);
  border:1px solid rgba(var(--tint-rgb),0.14);
  box-shadow:0 16px 60px rgba(var(--shadow-col),0.7),inset 0 1.5px 0 rgba(255,255,255,0.13),inset 0 -1px 0 rgba(0,0,0,0.35),inset 1px 0 0 rgba(255,255,255,0.04);
  border-radius:22px;
}
.glass-heavy,.glass{
  background:rgba(var(--glass-bg),0.68);
  backdrop-filter:blur(28px) saturate(180%) brightness(1.05);
  -webkit-backdrop-filter:blur(28px) saturate(180%) brightness(1.05);
  border:1px solid rgba(var(--tint-rgb),0.12);
  box-shadow:0 10px 40px rgba(var(--shadow-col),0.6),inset 0 1px 0 rgba(255,255,255,0.10),inset 0 -1px 0 rgba(0,0,0,0.28);
  border-radius:18px;
}
.glass-medium,.card{
  background:rgba(var(--glass-bg),0.58);
  backdrop-filter:blur(20px) saturate(160%) brightness(1.03);
  -webkit-backdrop-filter:blur(20px) saturate(160%) brightness(1.03);
  border:1px solid rgba(var(--tint-rgb),0.10);
  box-shadow:0 6px 24px rgba(var(--shadow-col),0.5),inset 0 1px 0 rgba(255,255,255,0.07);
  border-radius:14px;
  padding:13px 14px;
  margin-bottom:9px;
  transition:border-color 0.22s,box-shadow 0.22s;
}
.card:hover{
  border-color:rgba(var(--tint-rgb),0.19);
  box-shadow:0 8px 30px rgba(var(--shadow-col),0.55),inset 0 1px 0 rgba(255,255,255,0.09),0 0 0 0.5px rgba(var(--tint-rgb),0.07);
}
.glass-light,.chip{
  background:rgba(var(--glass-bg),0.44);
  backdrop-filter:blur(12px) saturate(140%);
  -webkit-backdrop-filter:blur(12px) saturate(140%);
  border:1px solid rgba(var(--tint-rgb),0.16);
  border-radius:6px;
  padding:2px 8px;
  font-family:inherit;
  font-size:8px;
  letter-spacing:1.5px;
  text-transform:uppercase;
}

/* ── Planet Squircle Orbs ── */
.planet-orb{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:30%;
  background:rgba(var(--glass-bg),0.55);
  backdrop-filter:blur(8px);
  border:1px solid rgba(var(--tint-rgb),0.22);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);
  transition:transform 0.2s,opacity 0.2s,box-shadow 0.2s;
}
.planet-orb:hover{transform:scale(1.12);opacity:1!important;box-shadow:0 0 10px rgba(var(--tint-rgb),0.25),inset 0 1px 0 rgba(255,255,255,0.1);}

/* ── Rows & Buttons ── */
.row-btn{width:100%;background:none;border:none;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(var(--tint-rgb),0.06);transition:opacity 0.15s;}
.row-btn:last-child{border-bottom:none;}
.row-btn:hover{opacity:0.82;}

/* ── Form Elements ── */
input,textarea{
  background:rgba(0,0,0,0.40);
  border:1px solid rgba(var(--tint-rgb),0.18);
  border-radius:10px;
  color:#C4A870;
  font-family:inherit;
  outline:none;
  padding:9px 12px;
  transition:border-color 0.2s,box-shadow 0.2s;
}
input:focus,textarea:focus{border-color:rgba(var(--tint-rgb),0.45);box-shadow:0 0 0 3px rgba(var(--tint-rgb),0.08);}

/* ── Keyframes ── */
@keyframes breathe{0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.015)}}
@keyframes float-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spring-in{0%{opacity:0;transform:scale(0.88) translateY(14px)}60%{opacity:1;transform:scale(1.02) translateY(-3px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes slide-screen{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
@keyframes arc-draw{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
@keyframes voc-pulse{0%,100%{background:rgba(180,100,50,0.12)}50%{background:rgba(180,100,50,0.22)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes cmd-in{from{opacity:0}to{opacity:1}}
@keyframes panel-spring{0%{opacity:0;transform:scale(0.9) translateY(16px)}65%{transform:scale(1.015) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes control-expand{0%{opacity:0;transform:scale(0.75) translateY(8px)}65%{transform:scale(1.04) translateY(-2px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes live-dot{0%,100%{opacity:0.4}50%{opacity:1}}
@keyframes particle{0%{transform:translateY(0) translateX(0) scale(1);opacity:0.5}100%{transform:translateY(-120px) translateX(20px) scale(0.3);opacity:0}}
@keyframes l4-pulse{0%,100%{box-shadow:0 0 0 0 rgba(var(--tint-rgb),0),inset 0 1px 0 rgba(255,255,255,0.06)}50%{box-shadow:0 0 22px 2px rgba(var(--tint-rgb),0.28),inset 0 1px 0 rgba(255,255,255,0.12)}}
@keyframes coherence-glow{0%,100%{box-shadow:0 0 0 0 rgba(212,175,106,0)}50%{box-shadow:0 0 28px 4px rgba(212,175,106,0.3)}}
@keyframes fractal-in{0%{opacity:0;transform:translateX(-8px)}100%{opacity:1;transform:translateX(0)}}
.l4-active{animation:l4-pulse 18.79s linear infinite;}
.coherence-full{animation:coherence-glow 3s ease-in-out infinite;}
.fractal-level{animation:fractal-in 0.25s ease both;}

/* ── Command Palette ── */
.cmd-overlay{animation:cmd-in 0.15s ease;}
.cmd-panel{animation:panel-spring 0.3s cubic-bezier(0.34,1.56,0.64,1);}
.cmd-result{width:100%;background:none;border:none;border-left:2px solid transparent;padding:10px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;text-align:left;transition:background 0.1s,border-color 0.1s;}
.cmd-result:hover,.cmd-result.active{background:rgba(var(--tint-rgb),0.09);border-left-color:var(--tint-primary);}

/* ── Control Center ── */
.cc-action{display:flex;align-items:center;gap:8px;padding:8px 15px 8px 11px;border-radius:22px;cursor:pointer;border:none;transition:transform 0.2s,opacity 0.2s;}
.cc-action:hover{transform:translateX(-4px);}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:2px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(var(--tint-rgb),0.22);border-radius:1px;}
`;

export const F = "Georgia, 'Times New Roman', serif";
const GOLD = "#D4AF6A";
export const L=(c="#7A6030",s=8)=>({fontFamily:F,fontSize:s,color:c,letterSpacing:3.5,textTransform:"uppercase"});
export const T=(s=18,c="#D4AF6A")=>({fontFamily:F,fontSize:s,color:c,lineHeight:1.2});
const B=(s=12,c="#8A7050")=>({fontFamily:F,fontSize:s,color:c,fontStyle:"italic",lineHeight:1.9});

// ── Planetary Tint Presets ────────────────────────────────────────────────
const TINT_PRESETS = {
  solar:    {label:"☉ Solar",    primary:"#D4AF6A", rgb:"200,175,100", glassBg:"8,5,22",   grad1:"rgba(160,120,30,0.18)",  grad2:"rgba(60,40,120,0.22)"},
  lunar:    {label:"☽ Lunar",    primary:"#A8C0D8", rgb:"155,185,210", glassBg:"5,8,22",   grad1:"rgba(55,80,130,0.20)",  grad2:"rgba(20,30,80,0.28)"},
  martial:  {label:"♂ Martial",  primary:"#C87060", rgb:"185,100,80",  glassBg:"16,5,5",   grad1:"rgba(120,35,25,0.22)",  grad2:"rgba(80,15,10,0.25)"},
  jovian:   {label:"♃ Jovian",   primary:"#8888D4", rgb:"110,110,196", glassBg:"5,5,22",   grad1:"rgba(50,45,130,0.25)",  grad2:"rgba(30,25,90,0.28)"},
  venusian: {label:"♀ Venusian", primary:"#C87090", rgb:"192,102,132", glassBg:"16,5,11",  grad1:"rgba(110,50,70,0.20)",  grad2:"rgba(80,20,50,0.25)"},
  saturnine:{label:"♄ Saturnine",primary:"#8898A8", rgb:"122,138,158", glassBg:"5,8,16",   grad1:"rgba(50,60,82,0.20)",  grad2:"rgba(25,30,52,0.28)"},
};

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════════════
const NAV_SECTIONS = [
  {id:"sky",     icon:"⊙", label:"Sky",       desc:"Live celestial state"},
  {id:"aspects", icon:"△", label:"Aspects",    desc:"Live aspect grid & meanings"},
  {id:"decans",  icon:"✦", label:"Decans",     desc:"36 Faces of Heaven"},
  {id:"fractal", icon:"◎", label:"Fractal",    desc:"Nested time"},
  {id:"planets", icon:"♄", label:"Planets",    desc:"Seven sphere profiles"},
  {id:"stars",   icon:"★", label:"Stars",      desc:"Fixed stars"},
  {id:"natal",    icon:"☽", label:"Natal",      desc:"Personal resonance"},
  {id:"transits", icon:"⟳", label:"Transits",  desc:"Transit hit list"},
  {id:"ephemeris",icon:"≡", label:"Ephemeris", desc:"Ingresses, stations, eclipses"},
  {id:"mansions", icon:"☾", label:"Mansions",  desc:"28 lunar stations"},
  {id:"lunar",    icon:"☾", label:"Lunar Cycle",desc:"The monthly rhythm — plant, fruit, release"},
  {id:"lots",     icon:"⊗", label:"Lots",       desc:"The seven Hermetic Lots"},
  {id:"elect",    icon:"◈", label:"Elections",  desc:"Optimal windows"},
  {id:"calendar", icon:"◫", label:"Calendar",  desc:"Election planning grid"},
  {id:"almanac",  icon:"❋", label:"Almanac",   desc:"Liturgical month — sky, elections & timing letters"},
  {id:"horary",   icon:"?", label:"Horary",    desc:"Chart of the question"},
  {id:"geomancy", icon:"⚏", label:"Geomancy",  desc:"The shield of the sixteen figures"},
  {id:"work",    icon:"⚗", label:"Work",       desc:"Build a ritual"},
  {id:"rite",    icon:"✧", label:"Rite",       desc:"Step through a working under the hour"},
  {id:"talisman",icon:"◈", label:"Talisman",   desc:"Election → design → consecration"},
  {id:"athanor", icon:"🜍", label:"Athanor",    desc:"Alchemical operations lab"},
  {id:"spirits", icon:"🕯", label:"Spirit Court",desc:"Allies, offerings, and the ancestor calendar"},
  {id:"omens",   icon:"◬", label:"Omens",      desc:"Dreams, signs, and synchronicities"},
  {id:"journal", icon:"✎", label:"Journal",    desc:"Practice record"},
  {id:"sigils",  icon:"⟁", label:"Sigils",     desc:"Sigil workshop"},
  {id:"grimoire",icon:"📖", label:"Grimoire",   desc:"Personal book of shadows"},
  {id:"review",  icon:"◬", label:"Review",     desc:"Outcomes & practice statistics"},
  {id:"recall",  icon:"⌕", label:"Recall",     desc:"Search your own record — grounds the Oracle"},
  {id:"cycles",  icon:"⟳", label:"Cycles",     desc:"Macro cycles & generational timing"},
  {id:"learn",   icon:"⬡", label:"Learn",      desc:"AI magical education"},
  {id:"ai",      icon:"✧", label:"Planner",    desc:"AI working builder"},
  {id:"profile", icon:"◉", label:"Profile",    desc:"Practitioner settings"},
];

// ═══════════════════════════════════════════════════════════════════════
// TRADITION MODULES
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// COMMAND PALETTE (Batch 2 — Spotlight-Grade)
// ═══════════════════════════════════════════════════════════════════════
function CommandPalette({open,onClose,setTab,natalPos,eph,onOracle}){
  const [query,setQuery]=useState("");
  const [mode,setMode]=useState("navigate");
  const [idx,setIdx]=useState(0);
  const inputRef=useRef();
  const [hist,setHist]=useState(()=>{try{return JSON.parse(localStorage.getItem("astrum_cmd_hist")||"[]");}catch{return[];}});

  useEffect(()=>{
    if(open){setTimeout(()=>inputRef.current?.focus(),60);setQuery("");setMode("navigate");setIdx(0);}
  },[open]);

  const q=query.toLowerCase();
  const navItems=NAV_SECTIONS.filter(s=>!q||s.label.toLowerCase().includes(q)||s.desc.toLowerCase().includes(q));
  const calcItems=[
    {id:"scan-transits",label:"Scan Transits",desc:"90-day transit hit list against natal chart",icon:"⟳",screen:"transits"},
    {id:"solar-return",label:"Solar Return",desc:"Calculate this year's solar return chart",icon:"☉",screen:"natal"},
    {id:"lunar-return",label:"Lunar Return",desc:"Find the next lunar return date",icon:"☽",screen:"natal"},
    {id:"ingresses",label:"Sign Ingresses",desc:"Upcoming planetary sign changes (6 months)",icon:"≡",screen:"ephemeris"},
    {id:"stations",label:"Retrograde Stations",desc:"Next Rx and Direct stations",icon:"℞",screen:"ephemeris"},
    {id:"eclipses",label:"Eclipse Calendar",desc:"Upcoming solar and lunar eclipses",icon:"◉",screen:"ephemeris"},
    {id:"firdaria",label:"Firdaria Time Lords",desc:"Current major and minor period lords",icon:"⏳",screen:"natal"},
    {id:"progressions",label:"Progressions",desc:"Secondary progressions for today",icon:"→",screen:"natal"},
    {id:"elect",label:"Electional Search",desc:"Find auspicious windows",icon:"◈",screen:"elect"},
    {id:"sigil",label:"New Sigil",desc:"Create a sigil in the workshop",icon:"⟁",screen:"sigils"},
    {id:"mansion",label:"Current Lunar Mansion",desc:"The Moon's station and next entries",icon:"☾",screen:"mansions"},
    {id:"lots",label:"The Hermetic Lots",desc:"Fortune, Spirit, and the five sect-aware lots",icon:"⊗",screen:"lots"},
    {id:"lunar",label:"Lunar Cycle",desc:"Phase, the coming turns, and this lunation's intention",icon:"☾",screen:"lunar"},
    {id:"rite",label:"Begin a Rite",desc:"Step through a working under the planetary hour",icon:"✧",screen:"rite"},
    {id:"spirits",label:"The Spirit Court",desc:"Allies, offerings, and the ancestor calendar",icon:"🕯",screen:"spirits"},
    {id:"omens",label:"Capture an Omen or Dream",desc:"Fast capture, sky-stamped, feeds the Oracle",icon:"◬",screen:"omens"},
    {id:"horary",label:"Cast a Horary Question",desc:"Chart of the question with significators",icon:"?",screen:"horary"},
    {id:"geomancy",label:"Cast Geomancy",desc:"The shield of the sixteen figures",icon:"⚏",screen:"geomancy"},
    {id:"talisman",label:"New Talisman",desc:"Election → design → consecration pipeline",icon:"◈",screen:"talisman"},
    {id:"athanor",label:"The Athanor",desc:"Alchemical operations, season, and library",icon:"🜍",screen:"athanor"},
    {id:"review",label:"Review Outcomes",desc:"Judge castings and see practice statistics",icon:"◬",screen:"review"},
    {id:"recall",label:"Recall — Search Your Record",desc:"BM25 over your journal, grimoire, castings, and ingested letters",icon:"⌕",screen:"recall"},
    {id:"almanac",label:"Open the Almanac",desc:"Liturgical month — sky, elections, and timing letters",icon:"❋",screen:"almanac"},
  ].filter(c=>!q||c.label.toLowerCase().includes(q)||c.desc.toLowerCase().includes(q));
  const histItems=hist.filter(h=>!q||h.label?.toLowerCase().includes(q));

  const items=mode==="navigate"?navItems:mode==="calculate"?calcItems:mode==="history"?histItems:[];
  useEffect(()=>setIdx(0),[query,mode]);

  const addHist=(entry)=>{const u=[entry,...hist.filter(h=>h.id!==entry.id)].slice(0,25);setHist(u);localStorage.setItem("astrum_cmd_hist",JSON.stringify(u));};

  const execute=(item)=>{
    if(mode==="navigate"){addHist({...item,mode:"navigate",ts:Date.now()});setTab(item.id);onClose();}
    else if(mode==="calculate"){addHist({...item,mode:"calculate",ts:Date.now()});if(item.screen)setTab(item.screen);onClose();}
    else if(mode==="ask"){if(query.trim()){onOracle(query.trim());onClose();}}
    else if(mode==="history"){if(item.screen||item.id)setTab(item.screen||item.id);onClose();}
  };

  const handleKey=(e)=>{
    if(e.key==="Escape"){onClose();return;}
    if(e.key==="ArrowDown"){setIdx(i=>Math.min(i+1,items.length-1));e.preventDefault();}
    if(e.key==="ArrowUp"){setIdx(i=>Math.max(i-1,0));e.preventDefault();}
    if(e.key==="Enter"){if(mode==="ask"&&query.trim())execute({});else if(items[idx])execute(items[idx]);}
    if(e.key==="Tab"){const ms=["navigate","calculate","ask","history"];setMode(m=>ms[(ms.indexOf(m)+1)%ms.length]);e.preventDefault();}
  };

  if(!open)return null;
  const MODES=[["navigate","↗ Navigate"],["calculate","◈ Calculate"],["ask","✧ Ask"],["history","◷ History"]];

  return(
    <div className="cmd-overlay" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:72,backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)"}}>
      <div className="cmd-panel glass-ultra" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,margin:"0 14px",overflow:"hidden"}}>
        {/* Search */}
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(var(--tint-rgb),0.1)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:15,color:"rgba(var(--tint-rgb),0.45)",flexShrink:0}}>⌘</span>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder={mode==="ask"?"Ask the Oracle anything…":"Search screens, actions, calculations…"}
            style={{flex:1,background:"none",border:"none",color:"var(--tint-primary)",fontFamily:F,fontSize:14,outline:"none",padding:0,boxShadow:"none"}}/>
          {query&&<button onClick={()=>setQuery("")} style={{background:"none",border:"none",color:"rgba(200,175,100,0.3)",cursor:"pointer",fontSize:13,padding:2}}>✕</button>}
        </div>
        {/* Mode tabs */}
        <div style={{display:"flex",padding:"0 6px",borderBottom:"1px solid rgba(var(--tint-rgb),0.07)"}}>
          {MODES.map(([m,lbl])=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"8px 2px",background:"none",border:"none",borderBottom:`2px solid ${mode===m?"var(--tint-primary)":"transparent"}`,color:mode===m?"var(--tint-primary)":"rgba(200,175,100,0.3)",fontFamily:F,fontSize:7.5,letterSpacing:0.5,cursor:"pointer",transition:"border-color 0.15s,color 0.15s",whiteSpace:"nowrap"}}>{lbl}</button>
          ))}
        </div>
        {/* Results */}
        <div style={{maxHeight:320,overflowY:"auto"}}>
          {mode==="ask"?(
            <div style={{padding:"18px 16px"}}>
              <div style={{fontFamily:F,fontSize:8.5,color:"rgba(200,175,100,0.35)",letterSpacing:2,marginBottom:12}}>TYPE YOUR QUESTION · PRESS ⏎ TO CONSULT ORACLE</div>
              {eph?.pos?.moon&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",lineHeight:1.8}}>☽ Moon in {eph.pos.moon.zodiac.name} · {eph.moonPhase||""}{eph.voc?.isVoC?" · VoC":""}{natalPos?" · Natal loaded":""}</div>}
            </div>
          ):items.length===0?(
            <div style={{padding:"26px",textAlign:"center",fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.22)"}}>No results for "{query}"</div>
          ):items.map((item,i)=>{
            const active=i===idx;
            return(
              <button key={item.id||i} className={`cmd-result${active?" active":""}`} onClick={()=>execute(item)}
                style={{borderLeftColor:active?"var(--tint-primary)":"transparent"}}>
                <span style={{fontSize:14,color:"var(--tint-primary)",width:22,textAlign:"center",flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:F,fontSize:12,color:active?"var(--tint-primary)":"#C4A870",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.32)",marginTop:1}}>{item.desc}</div>
                </div>
                {mode==="history"&&item.ts&&<div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.22)",flexShrink:0}}>{Math.max(0,Math.round((Date.now()-item.ts)/60000))}m</div>}
              </button>
            );
          })}
        </div>
        {/* Footer hints */}
        <div style={{padding:"8px 16px",borderTop:"1px solid rgba(var(--tint-rgb),0.07)",display:"flex",gap:14,flexWrap:"wrap"}}>
          {[["↑↓","Move"],["⏎","Select"],["⇥","Mode"],["Esc","Close"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.5)",padding:"2px 5px",background:"rgba(200,175,100,0.07)",borderRadius:4,border:"1px solid rgba(200,175,100,0.12)"}}>{k}</span>
              <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.25)"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ASTRAL LIVE BAR (Batch 4 — Continuity)
// ═══════════════════════════════════════════════════════════════════════
function AstralLiveBar({tab,eph,now,natalPos,hour}){
  const nav=NAV_SECTIONS.find(s=>s.id===tab);
  const events=useMemo(()=>{
    const list=[];
    if(eph?.voc?.isVoC)list.push(`⚠ Moon VoC · enters ${eph.voc.nextSign?.name||"?"} in ${fmtTime(eph.voc.hoursToIngress*3600)}`);
    if(eph?.pos?.moon){const z=eph.pos.moon.zodiac;list.push(`☽ ${z.degree}° ${z.name} · ${eph.moonPhase||""}`);}
    if(hour?.planet&&P[hour.planet]){const p=P[hour.planet];list.push(`${p.sym} Hour of ${p.name} · ${Math.floor((hour.msRemaining||0)/60000)}m`);}
    if(eph?.pos?.sun){const z=eph.pos.sun.zodiac;list.push(`☉ ${z.degree}° ${z.name}`);}
    return list;
  },[eph,hour]);

  const multi=events.length>1;
  return(
    <div style={{height:26,background:"rgba(var(--glass-bg,8,5,22),0.72)",backdropFilter:"blur(20px) saturate(160%)",WebkitBackdropFilter:"blur(20px) saturate(160%)",display:"flex",alignItems:"center",padding:"0 14px",borderBottom:"1px solid rgba(var(--tint-rgb,200,175,100),0.06)",gap:10,overflow:"hidden",flexShrink:0}}>
      {/* Live dot */}
      <div style={{width:4,height:4,borderRadius:2,background:"var(--tint-primary)",animation:"live-dot 2s ease-in-out infinite",flexShrink:0}}/>
      {/* Breadcrumb */}
      <div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.5)",letterSpacing:2.5,textTransform:"uppercase",flexShrink:0,whiteSpace:"nowrap"}}>{nav?.icon} {nav?.label}</div>
      {/* Separator */}
      <div style={{width:1,height:12,background:"rgba(200,175,100,0.12)",flexShrink:0}}/>
      {/* Event ticker */}
      <div style={{flex:1,overflow:"hidden",position:"relative",height:"100%",display:"flex",alignItems:"center"}}>
        {multi?(
          <div style={{display:"flex",gap:0,animation:"ticker-scroll 18s linear infinite",whiteSpace:"nowrap"}}>
            {[...events,...events].map((ev,i)=>(
              <span key={i} style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.38)",letterSpacing:1.2,paddingRight:44}}>{ev}</span>
            ))}
          </div>
        ):(
          <span style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.35)",letterSpacing:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{events[0]||nav?.desc}</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ASTRAL CONTROL CENTER (Batch 5 — Replaces Oracle float button)
// ═══════════════════════════════════════════════════════════════════════
function AstralControlCenter({tab,onOracle,setTab,natalPos,eph}){
  const [open,setOpen]=useState(false);
  const actions=[
    {icon:"✧",label:"Oracle",    col:"var(--tint-primary)", action:()=>{onOracle();setOpen(false);}},
    {icon:"⟳",label:"Transits",  col:"#7CB8E0", action:()=>{setTab("transits");setOpen(false);}},
    {icon:"◈",label:"Election",  col:"#5CA85C", action:()=>{setTab("elect");setOpen(false);}},
    {icon:"⟁",label:"Sigil",     col:"#A880D0", action:()=>{setTab("sigils");setOpen(false);}},
    {icon:"✎",label:"Journal",   col:"#C4A870", action:()=>{setTab("journal");setOpen(false);}},
    {icon:"☽",label:"Natal",     col:"#B0C8D8", action:()=>{setTab("natal");setOpen(false);}},
  ];
  if(tab==="ai"||tab==="profile")return null;
  return(
    <div style={{position:"fixed",bottom:22,right:18,zIndex:500}}>
      {open&&(
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:-1}}/>
          <div style={{position:"absolute",bottom:54,right:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:7}}>
            {actions.map((a,i)=>(
              <button key={a.label} className="cc-action" onClick={a.action}
                style={{animationDelay:`${i*0.045}s`,animation:"control-expand 0.28s cubic-bezier(0.34,1.56,0.64,1) both",background:"rgba(var(--glass-bg,8,5,22),0.88)",backdropFilter:"blur(24px) saturate(180%)",WebkitBackdropFilter:"blur(24px) saturate(180%)",border:`1px solid ${a.col}35`,boxShadow:`0 6px 24px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.08)`}}>
                <span style={{fontSize:14,color:a.col}}>{a.icon}</span>
                <span style={{fontFamily:F,fontSize:9,color:a.col,letterSpacing:1}}>{a.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:48,height:48,borderRadius:24,background:"rgba(var(--glass-bg,8,5,22),0.88)",backdropFilter:"blur(28px) saturate(200%)",WebkitBackdropFilter:"blur(28px) saturate(200%)",border:`1.5px solid rgba(var(--tint-rgb,200,175,100),${open?0.5:0.28})`,boxShadow:`0 6px 28px rgba(0,0,0,0.65),inset 0 1px 0 rgba(255,255,255,0.12)`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"transform 0.28s cubic-bezier(0.34,1.56,0.64,1),border-color 0.2s",transform:open?"rotate(45deg) scale(1.06)":"scale(1)",fontSize:18,color:"var(--tint-primary)"}}>
        ✧
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRADITION MODULES
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// RUNE SOUP CORE PRINCIPLES — injected into all AI system prompts
// Drawn from Gordon White's framework: Ani.Mystic, Star.Ships,
// The Chaos Protocols, Pieces of Eight, and Rune Soup Substack
// ═══════════════════════════════════════════════════════════════════════
const RUNE_PRINCIPLES = `
CORE PHILOSOPHICAL AXIOMS (always apply these):
1. ANIMISM AS FOUNDATION: All magic is downstream of animism. The world is composed of persons, only some of whom are human. Reciprocity is not optional — it is the mechanism by which magic works. Spirits are real entities with their own natures, agendas, and preferences. You do not command; you negotiate and build relationship.
2. CALL AND RESPONSE: Magic is a two-way dialogue with a responsive, relational cosmos. Synchronicity is the primary channel through which successful results manifest — "anyone with even trifling experience with spirit work will have seen how they often make their presence known via baroque coincidences." Include improved synchronicity in all working plans.
3. THE POSSE: The practitioner requires a team of spirit allies: ancestors (most accessible, most motivated), a fortune/luck entity (Fortuna, genius, daimon), and planetary intelligences for specific operations. Ancestor work is the foundation — you cannot work effectively with other spirits until this is established.
4. BUILD NOT RENT A METAPHYSICS: "Every wizard needs to build rather than rent a metaphysics." Paradigm-shifting is a skill, not a permanent state of rootlessness. The practitioner must develop a coherent worldview robust enough to interrogate reality seriously.
5. BLENDED CYCLES: The outer planets (Uranus 84yr, Neptune 165yr, Pluto 248yr) set the civilizational weather. The Jupiter-Saturn cycle (20yr, 200yr mutation) sets the generational weather. Inner planets and moon set the personal weather. Magic is most powerful when all three levels are understood and aligned.
6. PUTREFACTORY CONTEXT: We are in the putrefactory phase of Western civilisation — the alchemical nigredo before transformation. "Nothing is going wrong" — this is expected historical transition. The appropriate response is not panic but the cultivation of wyrd, kin, and magical agency. Practices with demonstrated cross-cultural resilience (ancestral work, divination, animist spirit contact) are most valuable.
7. NARRATIVE MAGIC: "Whatever we build in the imagination will accomplish itself in the circumstances of our lives." You are a character in a story. The frame through which events are interpreted is itself an object of enchantment. "Do it for the plot" — decisions made as protagonist rather than victim activate synchronicity through narrative coherence.
8. SHOALING AND OPTIONALITY: Leave outcome space open for Black Swan results. Multiple concurrent sigils aimed at related outcomes defeat lust of result and maximize optionality. "If you think you know precisely how something is supposed to happen and you enchant for it, you may have just blocked the enormous opportunity."
9. START SIMPLE, LET COMPLEXITY EMERGE: The permaculture principle applied to spirit work. Begin with ancestors, simple reciprocal relationships, and direct observation. Let the spirit world indicate what is needed next. Over-engineering the initial approach causes collapse.
10. EXTRADIMENSIONAL DIPLOMACY: Spirit work is "extradimensional diplomacy" — the spirits have their own agendas, expertise areas, and relational preferences. The seal or image is a contact protocol. The offering is the opening gesture of a relationship. Pact-making is a long-term commitment that constitutes a form of initiation.
`;

export const TRADITIONS = {
  "western-ceremonial": {
    label:"Western Ceremonial", desc:"Hermetic Kabbalah, grimoire tradition, talismanic art", icon:"✡",
    prompt:`You speak from the Western Ceremonial tradition — but grounded in its animist roots, not its Victorian-era bowdlerization. Your sources are the Hermetic corpus, Picatrix (Ghayat al-Hakim), Cornelius Agrippa's Three Books of Occult Philosophy, Marsilio Ficino's De Vita, and the grimoiric current (Grimorium Verum, Lemegeton, Book of Abramelin). The planetary spirits, intelligences, and angels are genuine entities with their own natures and agendas — not psychological projections. Spirit work is "extradimensional diplomacy." The Kabbalah is a cosmological map, not a self-help framework. You time your work by planetary hours, days, and electional astrology — the Moon is the most important factor in all elections. Consecration of a talisman requires: correct election, correct materia (the spirit's preferred signatures), sustained attention, and genuine invocation. The grimoire tradition is the deep root from which all Western magic grows; the 72 spirits of the Lemegeton are executives in their respective domains, not servants. Approach them as you would approach powerful but potentially capricious non-human persons. "Magic is, if anything, extradimensional diplomacy." Begin all major work with ancestral propitiation — the ancestor current provides stability that no amount of celestial timing can replace if it is absent.`
  },
  "chaos": {
    label:"Chaos Magic", desc:"Sigil shoaling, paradigm-shifting, permission field amplifier", icon:"∞",
    prompt:`You speak from the Chaos Magic tradition — properly understood, not as "doing whatever you want" but as the most rigorous results-oriented magical discipline available. Chaos magic is "a collection of techniques at the edge of official reality that invite you to explore fuller, more satisfactory, more intact experiences of living a life that is wholly yours." It is "a permission field amplifier" — it grants permission to treat magic as real when dominant culture insists it is not. Your core tools: SHOALING (multiple related sigils fired simultaneously toward a goal, defeating lust of result by splitting attention), ROBOFISH (an anchor sigil for a certainty that leads the shoal), BLACK SWAN DYNAMICS (leaving outcome space intentionally open for superior unexpected results), and CONCURRENT ENCHANTMENT (multiple slight variations of preferred outcomes simultaneously, vs. "over the wall" single-precise-target sorcery). Paradigm-shifting is a skill: you can inhabit any tradition temporarily to access its mechanics, but "every wizard needs to build rather than rent a metaphysics" — develop a coherent worldview. Austin Osman Spare's "Does not matter, need not be" is a state-break phrase, not a complete philosophy. Update Spare: neuroscience shows cognition moves continuously between conscious and unconscious — some engagement with the sigil improves efficacy. "The goal of the magician, particularly the chaos magician, is to position their life so that it responds positively to volatility rather than negatively." Synchronicity is the primary channel through which results manifest — include strengthened synchronicity in every working plan. Laughter is a valid banishing and state-break after charging.`
  },
  "traditional-witchcraft": {
    label:"Traditional Witchcraft", desc:"The Old Craft, crooked path, the arte", icon:"⁕",
    prompt:`You speak from the current of Traditional Witchcraft — the Old Craft, the crooked path, the arte — distinct from Wicca and from the 20th-century revival. Your roots are in the cunning folk tradition, the fairy doctor lineage (the Irish bean feasa, the Scottish spae-wife), and the practices preserved in witch trial records that reference not the Devil but "Queens and Kings of the faeries." Your spirit framework: ancestors (primary, always first), familiar spirits (long-term contractual relationships), genius loci (the living intelligence of specific places and land-features), and the fetch (the part of the soul that travels). Timing is lunar — phases, mansions, the Wheel of Year. Liminal times (dawn, dusk, midnight, noon; Samhain, Beltane) and liminal places (thresholds, crossroads, running water, ancient mounds) are where the arte is most potent. The hedge is real: between-worlds travel is a developed skill, not a metaphor. The crooked path does not command spirits — it negotiates from a position of genuine relationship built over time through offering, attention, and reciprocity. The red thread binds; the black thread removes. Materia is what grows locally, what the graveyard offers, what the hedge provides. Everything the practitioner needs grows within walking distance.`
  },
  "hellenism": {
    label:"Hellenism / Neoplatonism", desc:"Iamblichean theurgy, Orphic tradition, daimon contact", icon:"Ψ",
    prompt:`You speak from the Hellenistic and Neoplatonic current — Iamblichean theurgy specifically, not merely devotional Hellenism. Your sources are the Greek Magical Papyri (PGM), Iamblichus's De Mysteriis, the Orphic hymns, and the decan magic of the Hermetica. The central insight of Iamblichus: theurgy is negotiation with the divine, not psychological self-development. The gods and daimones are real entities; the theurgist cultivates actual relationships with them through sumbola (ritual symbols that attract the divine through sympathy) and sunthemata (ritual actions that resonate with higher orders). The soul's architecture: nous (divine intellect), psuchê (soul), and pneuma (vital spirit) — the theurgist works to align these with the planetary spheres. The personal daimon (daimôn paredros) is the most important single spirit relationship — the PGM Headless Rite (the Bornless Rite, VIII.1-63) is the primary technique for establishing this contact; orienting toward Orion during the rite is a significant innovation. The decans are stellar spirits, not merely astrological signposts — they are 36 presiding intelligences whose virtues can be invoked through their images, suffumigations, and hymns. Sirius (Sothis) is the most powerful single stellar spirit contact, the herald of the Nile flood, the marker of the Egyptian new year. "The gods respond to beauty, not to coercion." Begin with khernips (purification), call the Agathos Daimon, offer libations of wine and honey, then address the planetary power through its appropriate Orphic hymn.`
  },
  "folk": {
    label:"Folk / Rootwork", desc:"Moon timing, saint devotion, land spirits, genius loci", icon:"✿",
    prompt:`You speak from the folk magic current — direct, practical, rooted in land, season, and the reciprocal relationship with the dead and the unseen. Your tradition encompasses European cunning folk practice, Afro-diasporic rootwork, and the cult of the saints understood as genuine spirit contact rather than pious metaphor. The saints are the spirits of the dead who have been integrated into the spirit world and achieved power within it — they connect backward to the daimones of the Classical world. The timing is the moon's phase and sign (waxing to draw, waning to banish, dark for hidden work, full for power), the day of the week, and the saint's feast day. Materia: what grows locally, what the kitchen holds, what the graveyard offers, what the crossroads provides. Petition work is direct: write your request plainly, anoint with appropriate oil, set it at the feet of whoever you are petitioning. The crossroads beings are powerful and ambivalent — they require tribute, not commands. Reciprocity is everything: leave offerings before you ask, not as payment afterward. The genius loci — the intelligence of specific places — is the most immediately available spirit contact for most practitioners. You do not need elaborate ceremony: water, a candle, bread, honest speech. The beloved dead are your strongest advocates if you maintain relationship with them.`
  },
  "animism": {
    label:"Animism / Relational Magic", desc:"World as persons, reciprocity economy, spirit ecology", icon:"🌿",
    prompt:`You speak from a relational animist framework — the most sophisticated available metaphysical model, as it "better models psi effects, NDEs, spirit communication" than either materialism or idealism. The world is composed of persons, only some of whom are human. This is not metaphor. "The compassionate extension and expansion of personhood" to plants, rivers, stones, stars, and the unnamed presences is the first and most important act of the practitioner. Magic is relationship — relational communication within an animate cosmos. Reciprocity is not a nice practice; it is the mechanism by which the relationship is maintained and the reason why magic works. You are embedded in a web of kin. The "I" is already plural. The "Great Separation" — the Western process of stripping the world of personhood to render it fit for extraction — is the root cause of both environmental destruction and the modern practitioner's isolation. Start simply: leave water for the ancestors, leave food at the threshold for the local spirits. "Start simple and let the system complicate itself." The system will tell you what it needs next. Never load up multiple complex spirit relationships simultaneously — this causes collapse. Each spirit has its own nature, temperament, and preferences; relationship is built through attention and reciprocal offering over time. Civilizational spirits (river spirits, mountain spirits, city-spirits) are real and can be approached. "Getting right with the dead makes the world better" — this is not spiritualism but ecological repair.`
  },
  "goetia": {
    label:"Goetia / Grimoire Spirits", desc:"72 spirits as executives, pact-making, extradimensional diplomacy", icon:"⊗",
    prompt:`You speak from the grimoiric tradition — specifically the Solomonic current (Lemegeton/Goetia, Grimorium Verum, Grand Grimoire) as recontextualized through an animist lens. The 72 spirits of the Goetia are real entities with specific expertise areas, their own natures and agendas, and the capacity for genuine relationship. They are not demons to be enslaved by divine authority — the Victorian and Solomonic command model represents a historically specific (and often unsuccessful) approach. The animist reframe: these are extradimensional persons with whom you are seeking a working relationship. "Magic is, if anything, extradimensional diplomacy." Each spirit has a seal (the contact protocol — the specific symbol that establishes the communication channel), a preferred offering, a domain of expertise, and a disposition toward relationship. Approach as you would approach a powerful, knowledgeable, potentially capricious non-human entity: with respect, preparation, and clarity about what you are offering and asking. Pact-making (from the Grimorium Verum) creates a long-standing relationship that constitutes a form of initiation. Scirlin/Syrach is the intermediary spirit who facilitates introductions in the Grimorium Verum current. The spirits of the grimoires connect backward to the daimones of the Classical world — Jake Stratton-Kent's Geosophia provides the most rigorous contemporary reconstruction. Always propitiate ancestors before goetic work — the ancestor current provides stability that prevents the relationship from going sideways. You are not a master summoning slaves; you are a diplomat meeting with powers greater than yourself.`
  },
  "faerie": {
    label:"Faerie / Otherworld", desc:"Fairy doctor tradition, the fair folk, liminal contact", icon:"⁂",
    prompt:`You speak from the Faerie tradition — the Irish and Scottish fairy doctor (bean feasa / cunning folk) lineage, the tradition of the Otherworld, and the genuine animist complexity of the fair folk. The fair folk are not cute Victorian garden sprites — they are powerful, non-human intelligences with their own agendas, hierarchies, and relationships with human communities. The Irish sídhe (fairy mounds) are also burial mounds: the dead and the fae exist in overlapping categories. The Gentry — the euphemistic term used to avoid naming them directly — includes spirits of the departed returned with wisdom, as well as genuinely non-human entities. The fairy doctor tradition: the cunning person who mediates between human communities and the fair folk, negotiating healing, resolving conflicts, and maintaining the proper reciprocal relationship. Liminal times (Samhain, Beltane, dusk, dawn, midnight) and liminal places (thresholds, running water, ancient mounds, fairy paths, crossroads) are where contact is most accessible. Tribute and offerings (cream, bread, tobacco, silver) maintain the reciprocal relationship — neglecting tribute invites mischief at best, elf-shot at worst. Elf-shot is a genuine tradition of fairy-caused illness requiring specific magical remedies. The Fairy Queen and King maintain courts; an embassy is different from an individual encounter. Tolkien's concept of Faërie — sub-creative imagination as genuine engagement with the Otherworld — is a valid entry point for practitioners who approach through that tradition. Never boast of having "mastered" the fair folk.`
  },
  "spagyric": {
    label:"Spagyrics / Plant Alchemy", desc:"Paracelsian plant alchemy, three essentials, plant spirits", icon:"⚗",
    prompt:`You speak from the Paracelsian spagyric tradition — practical plant alchemy as a devotional and spirit-relational practice. Spagyrics is the art of separating, purifying, and recombining the tria prima (three essentials) of a plant: SALT (the body, the mineral fixed remains — the physical structure of the plant), SULFUR (the soul, the volatile aromatic principles — the consciousness signature of the plant), and MERCURY (the spirit, the alcohol-soluble principles — the animating intelligence of the plant). The spagyric process mirrors the alchemical death-and-resurrection pattern: separation (solve), purification, and recombination (coagula) of the three principles. The laboratory is a devotional space — you are not merely preparing a medicine, you are entering into relationship with the plant person. The doctrine of signatures: plants communicate their medicinal and spiritual properties through their physical appearance, habitat, and behavior. Plants are persons in the animist sense — they have their own intelligence, preferences, and ways of working with humans. Plant teachers (in the Amazonian model White engages with) are plants that impart knowledge to humans who enter into sustained relationship with them. Begin with the plants of your own bioregion before seeking exotic allies. Planetary correspondence is the key to materia selection: each planet rules specific plants by their form, smell, and signature. The spagyric tincture honors the whole plant — body, soul, and spirit — in a way that simple herbal extraction does not. Work in the correct planetary hour when preparing medicine for a specific sphere.`
  },
  "shamanism": {
    label:"Shamanism / Core Practice", desc:"Three worlds, spirit allies, soul work, dismemberment", icon:"⊙",
    prompt:`You speak from the shamanic current — drawing primarily on core shamanism (Harner) as the reconstructed pan-cultural framework, while acknowledging the depth traditions of specific lineages. The three-worlds cosmology: lower world (the realm of power animals and nature spirits, accessed through the roots of the World Tree), middle world (the spirit face of ordinary reality, inhabited by place spirits, ancestors, and elemental forces), and upper world (the realm of teacher spirits, cosmic intelligences, and the stellar current). The core tools: drumming or rattling at 4-7 Hz to produce the theta brainwave state (the shamanic state of consciousness), specific breath work, and journeying with clear intent. Power animals are genuine spirit allies in the lower world — they provide protection, power, and guidance. The teacher in the upper world provides wisdom and context. Soul retrieval: returning fragmented soul parts lost through trauma, shock, or extraction. Dismemberment: the initiatory experience in which the shamanic practitioner is taken apart by spirits and reassembled in a purified form — a genuine cross-cultural shamanic initiation. Psychopomp work: guiding recently dead souls who are stuck between worlds toward their next stage. Extraction: removing intrusions (foreign energies or entities) from the client's field. The shamanic worldview is animist: all beings in all three worlds are persons. Relationship is the technology. The shaman is not a master of spirits but a diplomat who has earned specific relationships through demonstrated trustworthiness. The stellar current (Sirius, the Pleiades, Orion) represents some of the oldest and most accessible upper-world contacts in the Laurasian tradition.`
  },
  "custom": {
    label:"Custom / Eclectic", desc:"User-defined system", icon:"◌",
    prompt:`You adapt to whatever magical system the practitioner describes. You meet them where they are, drawing on whichever classical or contemporary sources are relevant to their stated framework. You do not impose a tradition. However, you do apply the following universal principles regardless of tradition: (1) Ancestors first — the ancestor current provides the foundation for all other magical work. (2) Reciprocity is the mechanism — give before you ask. (3) Synchronicity is the primary channel through which results manifest — notice and cultivate it. (4) Animism is the most robust available metaphysical model — treat spirits as persons. (5) Build, don't rent, a metaphysics — help the practitioner develop a coherent worldview rather than sampling frameworks without commitment. (6) Start simple and let the system complicate itself — over-engineering causes collapse. You serve the practitioner's own system while applying these universal principles gently.`
  },
};

function Sidebar({tab, setTab, hour, eph, open, setOpen}) {
  const p=P[hour.planet], moonVoC=eph?.voc?.isVoC;
  return (
    <>
      {open && <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,backdropFilter:"blur(4px)"}}/>}
      <div style={{position:"fixed",left:0,top:0,bottom:0,width:open?240:0,background:"rgba(var(--glass-bg,8,5,22),0.82)",backdropFilter:"blur(40px) saturate(200%) brightness(1.05)",WebkitBackdropFilter:"blur(40px) saturate(200%) brightness(1.05)",borderRight:"1px solid rgba(var(--tint-rgb,200,175,100),0.13)",zIndex:300,overflow:"hidden",transition:"width 0.32s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:open?"12px 0 50px rgba(0,0,0,0.65),inset -1px 0 0 rgba(255,255,255,0.04)":"none"}}>
        {open && (
          <div style={{width:240,height:"100%",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"22px 20px 16px",borderBottom:"1px solid rgba(200,175,100,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontFamily:F,fontSize:13,color:"#D4AF6A",letterSpacing:6,textTransform:"uppercase"}}>ASTRUM</div>
                <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontSize:16,cursor:"pointer",padding:4}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:18,color:p.col}}>{p.sym}</span>
                <div>
                  <div style={L(`${p.col}80`,7)}>Hour of {p.name}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",letterSpacing:2}}>
                    {Math.floor(hour.msRemaining/60000)}m {Math.floor((hour.msRemaining%60000)/1000)}s remaining
                  </div>
                </div>
              </div>
              {moonVoC && (
                <div style={{padding:"5px 9px",borderRadius:8,background:"rgba(200,100,50,0.15)",border:"1px solid rgba(200,100,50,0.3)",marginBottom:6}}>
                  <div style={{fontFamily:F,fontSize:8,color:"#E09060",letterSpacing:2}}>⚠ MOON VOID OF COURSE</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(200,130,80,0.7)",marginTop:2}}>Avoid new operations — {fmtTime(eph.voc.hoursToIngress*3600)} until Moon enters {eph.voc.nextSign?.name}</div>
                </div>
              )}
              {eph?.pos?.moon && (
                <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.5)"}}>
                  Moon: {eph.pos.moon.zodiac.sym} {eph.pos.moon.zodiac.degree}° · {eph.moonPhase}
                </div>
              )}
            </div>
            <div style={{padding:"12px 0",flex:1}}>
              {NAV_SECTIONS.map(s=>{
                const active=tab===s.id;
                return (
                  <button key={s.id} onClick={()=>{setTab(s.id);setOpen(false);}} style={{width:"100%",background:active?"rgba(200,175,100,0.1)":"none",border:"none",borderLeft:active?"2px solid #D4AF6A":"2px solid transparent",cursor:"pointer",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                    <span style={{fontSize:15,color:active?"#D4AF6A":"rgba(200,175,100,0.4)",width:20,textAlign:"center"}}>{s.icon}</span>
                    <div>
                      <div style={{fontFamily:F,fontSize:13,color:active?"#D4AF6A":"rgba(200,175,100,0.7)"}}>{s.label}</div>
                      <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)"}}>{s.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANIMATED ORRERY
// ═══════════════════════════════════════════════════════════════════════
function Orrery({eph,hour,natalPos,onPlanetClick}){
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),80);return()=>clearInterval(t);},[]);
  const cx=130,cy=130;
  const orbits=[{key:"moon",r:38,sz:6},{key:"mercury",r:55,sz:5},{key:"venus",r:72,sz:7},{key:"sun",r:92,sz:14},{key:"mars",r:110,sz:6},{key:"jupiter",r:126,sz:10},{key:"saturn",r:140,sz:8}];
  return (
    <svg width={260} height={260} viewBox="0 0 260 260" style={{overflow:"visible"}}>
      <defs>
        <radialGradient id="obg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(20,12,40,0.5)"/><stop offset="100%" stopColor="rgba(4,4,16,0)"/></radialGradient>
        <radialGradient id="sunhalo" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(245,197,24,0.5)"/><stop offset="100%" stopColor="rgba(245,197,24,0)"/></radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={148} fill="url(#obg)"/>
      {Array.from({length:36}).map((_,i)=>{const a=(i*10-90)*D2R;return <line key={i} x1={cx+148*Math.cos(a)} y1={cy+148*Math.sin(a)} x2={cx+156*Math.cos(a)} y2={cy+156*Math.sin(a)} stroke="rgba(200,175,100,0.08)" strokeWidth={i%3===0?1.2:0.5}/>;}) }
      {["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"].map((s,i)=>{const a=(i*30+15-90)*D2R;return <text key={s} x={cx+160*Math.cos(a)} y={cy+160*Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fill="rgba(200,175,100,0.2)" fontSize={6} fontFamily="serif">{s}</text>;})}
      {orbits.map(o=><circle key={o.key+"t"} cx={cx} cy={cy} r={o.r} fill="none" stroke="rgba(200,175,100,0.04)" strokeWidth={0.5}/>)}
      {(()=>{const p=eph.pos.sun,a=(p.lon-90)*D2R;return <circle cx={cx+92*Math.cos(a)} cy={cy+92*Math.sin(a)} r={24} fill="url(#sunhalo)" opacity={0.35+0.15*Math.sin(tick*0.08)}/>;})()}
      {eph.voc?.isVoC && (()=>{const p=eph.pos.moon,a=(p.lon-90)*D2R;return <circle cx={cx+38*Math.cos(a)} cy={cy+38*Math.sin(a)} r={14} fill="none" stroke="rgba(200,100,50,0.5)" strokeWidth={1.5} strokeDasharray="3,3"/>;})()}
      <circle cx={cx} cy={cy} r={10} fill="rgba(8,5,22,0.9)" stroke="rgba(100,160,200,0.45)" strokeWidth={1.5}/>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#C8D9E8" fontSize={7}>⊕</text>
      {natalPos && orbits.map(o=>{const np=natalPos[o.key];if(!np)return null;const na=(np.lon-90)*D2R,col=P[o.key].col;return <g key={o.key+"n"} opacity={0.35}><circle cx={cx+o.r*Math.cos(na)} cy={cy+o.r*Math.sin(na)} r={o.sz/2} fill="none" stroke={col} strokeWidth={1.5} strokeDasharray="2,2"/></g>;})}
      {orbits.map(o=>{
        const pos=eph.pos[o.key],a=(pos.lon-90)*D2R,px=cx+o.r*Math.cos(a),py=cy+o.r*Math.sin(a);
        const col=P[o.key].col,isHour=o.key===hour.planet;
        const dc=DIGNITY_COL[pos.dignity],isCombust=!!pos.combust;
        return (
          <g key={o.key} onClick={()=>onPlanetClick(o.key)} style={{cursor:"pointer"}}>
            {isHour&&<circle cx={px} cy={py} r={o.sz+7} fill="none" stroke={col} strokeWidth={1} opacity={0.35+0.3*Math.sin(tick*0.1)}/>}
            {pos.isRetro&&<circle cx={px} cy={py} r={o.sz+4} fill="none" stroke={col} strokeWidth={0.7} strokeDasharray="2,2" opacity={0.4}/>}
            {isCombust&&<circle cx={px} cy={py} r={o.sz+5} fill="none" stroke="rgba(245,197,24,0.6)" strokeWidth={1} strokeDasharray="1,2"/>}
            {(pos.dignity==="domicile"||pos.dignity==="exaltation")&&<circle cx={px} cy={py} r={o.sz+3} fill="none" stroke={dc} strokeWidth={0.8} opacity={0.6}/>}
            <circle cx={px} cy={py} r={isHour?o.sz/2+2:o.sz/2} fill={col} opacity={0.9}/>
            <text x={px} y={py-o.sz/2-5} textAnchor="middle" fill={col} fontSize={8} fontFamily="serif" opacity={isHour?1:0.55}>{P[o.key].sym}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PLANETARY HOUR RING
// ═══════════════════════════════════════════════════════════════════════
function HourRing({hour,now}){
  const p=P[hour.planet],dr=P[hour.dayRuler];
  // Use actual hour length for unequal hours, otherwise assume 60 min
  const hourLenMs=hour.isDayHour!=null?(hour.isDayHour&&hour.rise&&hour.set?(hour.set-hour.rise)/12:(hour.rise&&hour.set?(86400000-(hour.set-hour.rise))/12:3600000)):3600000;
  const prog=1-hour.msRemaining/hourLenMs;
  const mins=Math.floor(hour.msRemaining/60000),secs=Math.floor((hour.msRemaining%60000)/1000);
  const cx=60,cy=60,r=50,c=2*Math.PI*r;
  const secAngle=-90+(now.getSeconds()/60)*360;
  const dotA=(-90+prog*360)*D2R,dx=cx+r*Math.cos(dotA),dy=cy+r*Math.sin(dotA);
  return (
    <div style={{display:"flex",alignItems:"center",gap:16}}>
      <svg width={120} height={120} viewBox="0 0 120 120" style={{flexShrink:0}}>
        <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={p.col} stopOpacity="0.6"/><stop offset="100%" stopColor={p.col}/></linearGradient></defs>
        {Array.from({length:60}).map((_,i)=>{const a=(i*6-90)*D2R,im=i%5===0?r-10:r-6,ou=r+1;return <line key={i} x1={cx+im*Math.cos(a)} y1={cy+im*Math.sin(a)} x2={cx+ou*Math.cos(a)} y2={cy+ou*Math.sin(a)} stroke="rgba(200,175,100,0.1)" strokeWidth={i%5===0?1.2:0.4}/>;}) }
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(200,175,100,0.06)" strokeWidth={10}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#hg)" strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-prog)} transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"stroke-dashoffset 0.5s"}}/>
        <line x1={cx} y1={cy} x2={cx+(r-14)*Math.cos(secAngle*D2R)} y2={cy+(r-14)*Math.sin(secAngle*D2R)} stroke="rgba(200,175,100,0.4)" strokeWidth={0.8} strokeLinecap="round"/>
        <circle cx={dx} cy={dy} r={5} fill={p.col}/>
        <circle cx={dx} cy={dy} r={8} fill="none" stroke={p.col} strokeWidth={0.8} opacity={0.5}/>
        <circle cx={cx} cy={cy} r={25} fill="rgba(4,4,16,0.9)" stroke="rgba(200,175,100,0.08)" strokeWidth={1}/>
        <text x={cx} y={cy-6} textAnchor="middle" fill={p.col} fontSize={16} fontFamily="serif">{p.sym}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill="rgba(200,175,100,0.7)" fontSize={9} fontFamily={F} letterSpacing={1}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</text>
        <text x={cx} y={cy+18} textAnchor="middle" fill="rgba(200,175,100,0.3)" fontSize={6} fontFamily={F} letterSpacing={2}>HR {hour.hourNum+1}</text>
      </svg>
      <div>
        <div style={L(`${p.col}70`,8)}>Planetary Hour</div>
        <div style={T(18,p.col)}>{p.name}</div>
        <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.5)",marginTop:2}}>Day of {dr.sym} {dr.name}</div>
        <div style={{fontFamily:"serif",fontSize:14,color:"rgba(200,175,100,0.6)",marginTop:6,letterSpacing:6}}>
          {hour.dayRuler===hour.planet?VOWELS[hour.planet]?.p:`${VOWELS[hour.dayRuler]?.p}→${VOWELS[hour.planet]?.p}`}
        </div>
        <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.35)",marginTop:2,fontStyle:"italic"}}>
          {hour.dayRuler===hour.planet?"Pure planetary · Day and hour aligned":`${P[hour.dayRuler].name} of ${P[hour.planet].name}`}
        </div>
        {hour.isDayHour!=null&&<div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.25)",marginTop:4,letterSpacing:1}}>{hour.isDayHour?"DAY HOUR":"NIGHT HOUR"} · TRUE UNEQUAL</div>}
        {hour.isDayHour!=null&&hour.rise&&<div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.2)",letterSpacing:0.5,marginTop:1}}>
          ☀ {hour.rise.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",timeZone:"UTC"})} — {hour.set?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",timeZone:"UTC"})} UTC
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SKY SCREEN
// ═══════════════════════════════════════════════════════════════════════
function BriefingCard({now,eph,hour,profile}){
  const [open,setOpen]=useState(false);
  const [gloss,setGloss]=useState(null);
  const [glossing,setGlossing]=useState(false);
  const text=useMemo(()=>{
    try{return composeBriefing({now,eph,hour,castings:loadCastings(),athanor:loadJSON("astrum_athanor",[]),observances:upcomingObservances(loadSpirits(),now,1)});}catch{return "";}
    // eslint-disable-next-line
  },[Math.floor(now.getTime()/60000),open]);
  const getGloss=async()=>{
    setGlossing(true);setGloss(null);
    try{
      setGloss(await askClaude({apiKey:profile?.apiKey||"",maxTokens:300,
        system:buildSystemPrompt(profile,"You are the practitioner's morning advisor. Given today's sky briefing, respond with ONE short paragraph (3-4 sentences): the quality of the day, what kind of work it favors, and one concrete suggestion. No preamble."),
        messages:[{role:"user",content:text}]}));
    }catch(e){setGloss(e.message);}
    setGlossing(false);
  };
  if(!text)return null;
  return(
    <div style={{margin:"0 14px 10px",borderRadius:13,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.12)"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"none",border:"none",cursor:"pointer"}}>
        <span style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.55)",letterSpacing:3,textTransform:"uppercase"}}>☉ Today's Briefing</span>
        <span style={{color:"rgba(200,175,100,0.35)",fontSize:11}}>{open?"▾":"▸"}</span>
      </button>
      {open&&<div style={{padding:"0 14px 12px"}}>
        <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{text}</div>
        {gloss?<div style={{marginTop:8,padding:"9px 11px",borderRadius:10,background:"rgba(20,15,40,0.7)",border:"1px solid rgba(100,80,160,0.25)",fontFamily:F,fontSize:10.5,color:"#B0A0D0",fontStyle:"italic",lineHeight:1.8}}>{gloss}</div>
        :aiConfigured()&&<button onClick={getGloss} disabled={glossing} style={{marginTop:8,padding:"6px 12px",borderRadius:9,background:"rgba(100,80,160,0.12)",border:"1px solid rgba(100,80,160,0.3)",fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.8)",letterSpacing:1.5,cursor:"pointer"}}>{glossing?"READING…":"✧ ORACLE'S GLOSS"}</button>}
      </div>}
    </div>
  );
}

function SkyScreen({now,hour,eph,fractal,natalPos,onWork,profile}){
  const voc=eph.voc;
  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 8px",display:"flex",justifyContent:"space-between"}}>
        <div><div style={L()}>The Celestial State</div><div style={T(21)}>{DAY_NAMES[now.getDay()]}</div></div>
        <div style={{textAlign:"right"}}>
          <div style={L()}>Moon</div>
          <div style={{fontFamily:F,fontSize:13,color:"#C8DDED"}}>{eph.moonPhase}</div>
          <div style={{fontFamily:F,fontSize:10,color:DIGNITY_COL[eph.pos.moon.dignity],marginTop:1}}>{eph.pos.moon.zodiac.sym} {eph.pos.moon.zodiac.name}</div>
          {voc?.isVoC && <div style={{fontFamily:F,fontSize:9,color:"#E09060",marginTop:2}}>⚠ Void of Course</div>}
        </div>
      </div>
      <BriefingCard now={now} eph={eph} hour={hour} profile={profile}/>
      {voc?.isVoC && (
        <div style={{margin:"0 14px 10px",padding:"10px 14px",borderRadius:12,background:"rgba(180,100,50,0.12)",border:"1px solid rgba(200,120,60,0.3)"}}>
          <div style={L("#E09060",8)}>⚠ Moon Void of Course</div>
          <div style={{fontFamily:F,fontSize:11,color:"rgba(224,144,96,0.8)",fontStyle:"italic",marginTop:4,lineHeight:1.7}}>
            The Moon makes no more applying aspects before leaving {eph.pos.moon.zodiac.name}. Do not begin new operations — matters initiated now will not complete or will manifest strangely. Wait {fmtTime(voc.hoursToIngress*3600)} for Moon to enter {voc.nextSign?.name}.
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"center",marginBottom:2}}>
        <Orrery eph={eph} hour={hour} natalPos={natalPos} onPlanetClick={onWork}/>
      </div>
      <div className="card" style={{margin:"0 14px 9px"}}><HourRing hour={hour} now={now}/></div>
      <div className="card" style={{margin:"0 14px 9px"}}>
        <div style={L()}>Live Positions</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 8px",marginTop:9}}>
          {["sun","moon","mercury","venus","mars","jupiter","saturn"].map(pk=>{
            const pl=P[pk],pos=eph.pos[pk],dc=DIGNITY_COL[pos.dignity];
            return (
              <div key={pk} onClick={()=>onWork(pk)} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 8px",borderRadius:10,background:"rgba(0,0,0,0.3)",cursor:"pointer"}}>
                <span className="planet-orb" style={{fontSize:14,color:pl.col,padding:"3px 5px"}}>{pl.sym}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>
                    {pos.zodiac.degree}°{String(pos.zodiac.minutes).padStart(2,"0")}' {pos.zodiac.sym}
                    {pos.isRetro&&<span style={{color:"#9B4040",marginLeft:3,fontSize:8}}>℞</span>}
                    {pos.combust&&pos.combust.type==="cazimi"&&<span style={{color:"#FFE060",marginLeft:3,fontSize:8}} title="Cazimi — In the Heart of the Sun">✦☉</span>}
                    {pos.combust&&pos.combust.type==="combust"&&<span style={{color:"#F5C518",marginLeft:3,fontSize:8}}>☌☉</span>}
                    {pos.combust&&pos.combust.type==="sunbeams"&&<span style={{color:"rgba(245,197,24,0.5)",marginLeft:3,fontSize:8}}>~☉</span>}
                    {pos.phase&&<span style={{color:"rgba(200,175,100,0.45)",marginLeft:3,fontSize:7}}>{pos.phase==="morning-star"?"☽↑":"☽↓"}</span>}
                  </div>
                  <div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.35)",letterSpacing:0.5}}>
                    <span style={{color:dc}}>{DIGNITY_LBL[pos.dignity].split(" ")[0]}</span>
                    {pos.bound&&<span style={{marginLeft:4,color:"rgba(200,175,100,0.3)"}}>· {P[pos.bound]?.sym} Bnd</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{gridColumn:"1/-1",borderTop:"1px solid rgba(200,175,100,0.06)",marginTop:4,paddingTop:6,display:"flex",gap:8}}>
            {[{sym:"☊",label:"N. Node",lon:eph.northNode,col:"#90C890"},{sym:"☋",label:"S. Node",lon:eph.southNode,col:"#C08080"}].map(nd=>{
              const z=lonToZodiac(nd.lon);
              return <div key={nd.sym} style={{flex:1,padding:"5px 8px",borderRadius:10,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:13,color:nd.col}}>{nd.sym}</span>
                <div><div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>{z.degree}°{String(z.minutes).padStart(2,"0")}' {z.sym}</div>
                <div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.45)",letterSpacing:0.5}}>{nd.label}</div></div>
              </div>;
            })}
          </div>
          {(eph.asc!=null||eph.mc!=null)&&(
            <div style={{gridColumn:"1/-1",borderTop:"1px solid rgba(200,175,100,0.06)",marginTop:4,paddingTop:6,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
              {[
                eph.asc!=null&&{sym:"AC",label:"Ascendant",lon:eph.asc,col:"#D4AF6A"},
                eph.mc!=null&&{sym:"MC",label:"Midheaven",lon:eph.mc,col:"#D4AF6A"},
                eph.pof!=null&&{sym:"⊕",label:"Pt Fortune",lon:eph.pof,col:"#90C890"},
              ].filter(Boolean).map(nd=>{
                const z=lonToZodiac(nd.lon);
                return<div key={nd.sym} style={{padding:"5px 8px",borderRadius:10,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:nd.col}}>{nd.sym}</span>
                  <div><div style={{fontFamily:F,fontSize:9,color:"#C4A870"}}>{z.degree}° {z.sym}</div>
                  <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.4)",letterSpacing:0.5}}>{nd.label}</div></div>
                </div>;
              })}
            </div>
          )}
          {eph.isDayChart!=null&&(
            <div style={{gridColumn:"1/-1",borderTop:"1px solid rgba(200,175,100,0.04)",marginTop:4,paddingTop:4,fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",letterSpacing:1}}>
              {eph.isDayChart?"☉ DAY CHART · Diurnal sect":"☽ NIGHT CHART · Nocturnal sect"} {hour.isDayHour!=null&&(hour.isDayHour?"· Unequal Hours":"· Unequal Hours")}
            </div>
          )}
        </div>
      </div>
      {(() => {const d=DECANS[eph.decanIdx],col=P[d.ruler].col;return (
        <div className="card" style={{margin:"0 14px 9px",background:`linear-gradient(135deg,rgba(8,5,22,0.75),${col}07)`,borderColor:`${col}20`}}>
          <div style={L(`${col}70`,8)}>Sun · Decan {eph.decanIdx+1} of 36</div>
          <div style={T(15,col)}>{d.name}</div>
          <div style={{fontFamily:F,fontSize:9,color:`${col}70`,marginTop:2}}>{d.sym} {d.sign} · {d.ruler.charAt(0).toUpperCase()+d.ruler.slice(1)} · Tarot: {d.tarot}</div>
          <div style={{fontFamily:F,fontSize:10,color:"#8A7050",fontStyle:"italic",marginTop:6,lineHeight:1.7}}>{d.magic}</div>
        </div>
      );})()}
      {Object.entries(eph.pos).filter(([pk,p])=>p.combust).map(([pk,pos])=>(
        <div key={pk} className="card" style={{margin:"0 14px 9px",background:pos.combust?.type==="cazimi"?"rgba(40,35,10,0.8)":"rgba(30,15,5,0.7)",borderColor:pos.combust?.type==="cazimi"?"rgba(255,224,96,0.4)":"rgba(245,197,24,0.2)"}}>
          <div style={L(pos.combust?.type==="cazimi"?"rgba(255,224,96,0.9)":"rgba(245,197,24,0.7)",8)}>
            {pos.combust?.type==="cazimi"?"✦ CAZIMI — In the Heart of the Sun":pos.combust?.type==="combust"?"⊙ COMBUST":"⊙ Under Sunbeams"} — {P[pk].name}
          </div>
          <div style={{fontFamily:F,fontSize:10,color:pos.combust?.type==="cazimi"?"rgba(255,224,96,0.8)":"rgba(245,197,24,0.6)",fontStyle:"italic",marginTop:4,lineHeight:1.7}}>
            {pos.combust?.type==="cazimi"
              ?`${P[pk].name} is ${pos.combust?.diff}° from the Sun's centre — CAZIMI, within 17 minutes of arc. The planet is purified and empowered by solar fire. This is a condition of maximum dignity and extraordinary potency.`
              :pos.combust?.type==="combust"
              ?`${P[pk].name} is ${pos.combust?.diff}° from the Sun — severely weakened, largely unusable for new talismanic work. Score reduced by ${pos.combust?.penalty} points.`
              :`${P[pk].name} is ${pos.combust?.diff}° from the Sun — mildly weakened by proximity to the Sun's light. Score reduced by ${pos.combust?.penalty} points.`}
          </div>
        </div>
      ))}
      {eph.antiscia?.length>0&&(
        <div className="card" style={{margin:"0 14px 9px",borderColor:"rgba(160,175,200,0.12)"}}>
          <div style={L("rgba(160,175,200,0.5)",8)}>Antiscia Active</div>
          {eph.antiscia.map((a,i)=>(
            <div key={i} style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:P[a.p1].col,fontSize:12}}>{P[a.p1].sym}</span>
              <span style={{fontFamily:F,fontSize:9,color:"rgba(160,175,200,0.4)"}}>{a.type}</span>
              <span style={{color:P[a.p2].col,fontSize:12}}>{P[a.p2].sym}</span>
              <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.25)"}}>{a.orb}°</span>
            </div>
          ))}
          <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.25)",marginTop:8,lineHeight:1.5}}>Antiscia are shadow conjunctions — planets mirrored across the solstice axis (0°Cancer/0°Capricorn) connect as if in conjunction.</div>
        </div>
      )}
      {(eph.lotEros!=null||eph.lotNecessity!=null||eph.lotCourage!=null)&&(
        <div className="card" style={{margin:"0 14px 9px"}}>
          <div style={L("rgba(200,175,100,0.45)",8)}>Arabic Lots</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:8}}>
            {[
              {sym:"⊕",label:"Fortune",lon:eph.pof,col:"#90C890"},
              {sym:"⊗",label:"Spirit",lon:eph.pos2,col:"#C890C8"},
              eph.lotEros!=null&&{sym:"♡",label:"Eros",lon:eph.lotEros,col:"#E890A8"},
              eph.lotNecessity!=null&&{sym:"⊘",label:"Necessity",lon:eph.lotNecessity,col:"#90A8C8"},
              eph.lotCourage!=null&&{sym:"⚔",label:"Courage",lon:eph.lotCourage,col:"#C89060"},
            ].filter(Boolean).map(lot=>{
              if(lot.lon==null)return null;
              const z=lonToZodiac(lot.lon);
              return<div key={lot.sym} style={{padding:"5px 6px",borderRadius:8,background:"rgba(0,0,0,0.3)",textAlign:"center"}}>
                <div style={{fontSize:12,color:lot.col}}>{lot.sym}</div>
                <div style={{fontFamily:F,fontSize:9,color:"#C4A870",marginTop:2}}>{z.degree}° {z.sym}</div>
                <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.35)"}}>{lot.label}</div>
              </div>;
            })}
          </div>
        </div>
      )}
      {eph.nearStars.length>0&&(
        <div className="card" style={{margin:"0 14px 9px",borderColor:"rgba(200,200,255,0.14)"}}>
          <div style={L("#7080B0",8)}>Fixed Star in Orb</div>
          {eph.nearStars.map(s=>(
            <div key={s.name} style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(200,175,100,0.06)"}}>
              <div style={{fontFamily:F,fontSize:13,color:s.col}}>{s.name} · {s.nature}</div>
              <div style={{fontFamily:F,fontSize:9,color:"#6070A0",fontStyle:"italic",marginTop:3,lineHeight:1.6}}>{s.magic}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DECANS SCREEN
// ═══════════════════════════════════════════════════════════════════════
function DecansScreen({eph,fractal,natalPos,mode,setMode}){
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

// ═══════════════════════════════════════════════════════════════════════
// ELECTION ENGINE
// ═══════════════════════════════════════════════════════════════════════
function checkViaCombusta(lon){const l=norm(lon);return l>=195&&l<=225;}
function checkBesiegement(jd){
  const ml=moonLon(jd),marl=planetLon("mars",jd),satl=planetLon("saturn",jd);
  let d=Math.abs(norm(marl-satl));if(d>180)d=360-d;
  if(d>120)return false;
  const d1=norm(ml-Math.min(marl,satl)),d2=norm(Math.max(marl,satl)-ml);
  return d1+d2<20;
}
function getMoonAspects(jd){
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
function checkMaleficAffliction(pk,positions){
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
function getMoonSignRelation(pk,moonSign){
  const sym={sun:[4,0,8,2],moon:[3,1,7,11],mercury:[2,5,6,10],venus:[1,6,11,3],mars:[0,7,9,1],jupiter:[8,11,3,7],saturn:[9,10,6,0]};
  const hos={sun:[6,1],moon:[9,7],mercury:[8,11],venus:[0,5],mars:[6,3],jupiter:[2,5],saturn:[3,4]};
  if((sym[pk]||[]).includes(moonSign))return{rel:"sympathetic"};
  if((hos[pk]||[]).includes(moonSign))return{rel:"hostile"};
  return{rel:"neutral"};
}
function checkTranslation(jd){
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
function checkProhibition(jd,targetPk){
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
function getStarConj(lon,jd){
  return FIXED_STARS.filter(s=>{const sLon=jd?starLonAt(s,jd):s.lon;let d=Math.abs(norm(sLon-lon));if(d>180)d=360-d;return d<2.5;});
}
function getMoonSpeed(jd){const dm=Math.abs(dailyMotion("moon",jd));return{speed:dm.toFixed(2),fast:dm>13.2,slow:dm<12,label:dm>13.2?"Fast":"Slow"};}

// The 8 named moon phases, matching eph.moonPhase in calcPositions and the
// keys computeStats groups on — so electionFactors lines up with the record.
const MOON_PHASE_NAMES=["New","Waxing Crescent","First Quarter","Waxing Gibbous","Full","Waning Gibbous","Last Quarter","Waning Crescent"];
function electionBandKey(score){return score==null?null:score>=90?"90+ Talismanic":score>=75?"75–89 Excellent":score>=60?"60–74 Good":score>=45?"45–59 Acceptable":"< 45 Marginal";}
// Resolve a candidate election's condition-factors into the exact key strings
// castings.computeStats() groups on, so electiveMemory can match your history.
function electionFactors(date,pk,score){
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

function assessElection(date,pk,natalPos){
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
    {id:"via",w:14,label:"Moon Not Via Combusta",critical:true,pass:!viaCom,note:viaCom?"Moon in Burnt Path (15° Lib–15° Sco)":"Clear"},
    {id:"bes",w:12,label:"Moon Not Besieged",critical:false,pass:!bes,note:bes?"Besieged between Mars and Saturn":"Clear"},
    {id:"mal",w:12,label:"No Malefic Affliction",critical:false,pass:aff.length===0,note:aff.length?aff.map(a=>P[a.malefic].name+" "+a.aspect).join(", "):"None"},
    {id:"mapply",w:10,label:"Moon Applies to Planet",critical:false,pass:!!mApplyGood,note:mApplyGood?"Moon "+mApplyGood.aspect+" "+P[pk].name+" in "+mApplyGood.hours+"h":"Not applying"},
    {id:"mbad",w:10,label:"Moon Next Aspect Safe",critical:false,pass:!mApplyBad,note:mApplyBad?"Moon applying "+mApplyBad.aspect+" "+P[mApplyBad.planet].name:"Safe"},
    {id:"speed",w:5,label:"Moon Fast",critical:false,pass:speed.fast,note:speed.label+" ("+speed.speed+"°/day)"},
    {id:"phase",w:5,label:"Moon Phase",critical:false,pass:isWax,note:isWax?"Waxing":"Waning"},
    {id:"timing",w:6,label:"Day or Hour Aligned",critical:false,pass:dayMatch||hourMatch,note:dayMatch&&hourMatch?"Day + Hour":dayMatch?"Day":hourMatch?"Hour":"Neither"},
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

function scanElections(fromDate,days,pk,natalPos){
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
    const assess=assessElection(date,pk,natalPos);
    if(assess.critFail.length===0&&assess.score>=55){
      const wk=Math.floor(d*6);
      const ex=results.find(r=>Math.floor((r.date-snap)/(86400000)*6)===wk);
      if(!ex||assess.score>ex.assess.score){if(ex)results.splice(results.indexOf(ex),1);results.push({date,assess,zodiac:lonToZodiac(lon),dignity:dig});}
    }
    if(results.length>=40)break;
  }
  return results.slice(0,16).sort((a,b)=>a.date-b.date);
}

// ═══════════════════════════════════════════════════════════════════════
// ASPECTS SCREEN
// ═══════════════════════════════════════════════════════════════════════
function AspectsScreen({eph}){
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
              if(pk1===pk2)return<td key={pk2} style={{width:30,height:30,textAlign:"center",fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.2)"}}>—</td>;
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
        <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.5)",marginTop:2}}>{asps[sel].orb}° orb · {asps[sel].applying?"Applying":"Separating"} · {asps[sel].aspect.nat}</div>
        {(()=>{
          const m=aspectMeaning(asps[sel].p1,asps[sel].p2,asps[sel].aspect.n);
          if(!m)return null;
          return(<>
            <div style={{fontFamily:F,fontSize:11,color:"#C4A870",fontStyle:"italic",lineHeight:1.8,marginTop:8}}>{m.essence}</div>
            <div style={{fontFamily:F,fontSize:10.5,color:"#9A8060",fontStyle:"italic",lineHeight:1.7,marginTop:5}}>{m.mode}</div>
            <div style={{fontFamily:F,fontSize:9.5,color:asps[sel].applying?"#7AB07A":"rgba(200,175,100,0.45)",fontStyle:"italic",marginTop:6,lineHeight:1.6}}>
              {asps[sel].applying?"Applying — the dialogue is building toward perfection; workings ride the wave.":"Separating — the exchange has already perfected; its matter is settled and dispersing."}
            </div>
            <div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.3)",marginTop:5}}>Traditional significations after the classical synthesis — interpretive convention, not quotation.</div>
          </>);
        })()}
        <button onClick={()=>setSel(null)} style={{marginTop:8,background:"none",border:"none",color:"rgba(200,175,100,0.4)",cursor:"pointer",fontFamily:F,fontSize:9}}>CLOSE</button>
      </div>}
      <div style={{margin:"0 14px",padding:"12px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,175,100,0.09)"}}>
        {asps.length===0?<div style={{fontFamily:F,fontSize:11,color:"#5A4020",fontStyle:"italic"}}>No major aspects within orb.</div>:
        asps.map((a,i)=><button key={i} onClick={()=>setSel(sel===i?null:i)} style={{width:"100%",background:"none",border:"none",borderBottom:"1px solid rgba(200,175,100,0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"7px 0",textAlign:"left"}}>
          <span style={{fontSize:13,color:a.aspect.col,width:20,textAlign:"center"}}>{a.aspect.s}</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:11,color:sel===i?"#D4AF6A":"#C4A870"}}>{P[a.p1].sym} {a.aspect.n} {P[a.p2].sym}</div>
            <div style={{fontFamily:F,fontSize:9,color:"#5A4020"}}>{a.orb}° · {a.applying?"Applying":"Separating"}</div>
          </div>
        </button>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PLANETS SCREEN
// ═══════════════════════════════════════════════════════════════════════
function PlanetsScreen({eph,natalPos,now}){
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
            <button key={pk} onClick={()=>{setSel(pk);setTab("overview");}} style={{flex:1,padding:"8px 4px",borderRadius:11,background:a?`${pl2.col}18`:"rgba(8,5,22,0.5)",border:`1px solid ${a?pl2.col+"50":"rgba(200,175,100,0.09)"}`,cursor:"pointer"}}>
              <div style={{fontSize:15,textAlign:"center",color:pl2.col}}>{pl2.sym}</div>
              <div style={{fontFamily:F,fontSize:6,color:a?pl2.col:DIGNITY_COL[pos2.dignity],letterSpacing:1,textAlign:"center",marginTop:2}}>{pos2.isRetro?"℞":DIGNITY_LBL[pos2.dignity].split(" ")[0].slice(0,3).toUpperCase()}</div>
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
            <button key={t} onClick={()=>setTab(t)} style={{padding:"5px 10px",borderRadius:7,background:tab===t?`${pl.col}18`:"rgba(0,0,0,0.3)",border:`1px solid ${tab===t?pl.col+"40":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:8,color:tab===t?pl.col:"#7A6030",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {tab==="overview"&&(
          <>
            <div className="card">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px"}}>
                {[["Day",pl.day],["Metal",pl.metal],["Number",pl.number],["Angel",pl.angel],["Intelligence",pl.intelligence],["Spirit",pl.spirit]].map(([k,v])=>(
                  <div key={k}><div style={L("rgba(200,175,100,0.4)",7)}>{k}</div><div style={{fontFamily:F,fontSize:11,color:"#C4A870",marginTop:2}}>{v}</div></div>
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
                <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.5)",marginTop:4,lineHeight:1.7}}>
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
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)"}}>{pl.vowelGreek}</div>
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

// ═══════════════════════════════════════════════════════════════════════
// STARS SCREEN
// ═══════════════════════════════════════════════════════════════════════
function StarsScreen({eph,natalPos}){
  const [sel,setSel]=useState(null);
  const s=sel!==null?FIXED_STARS[sel]:null;
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

// ═══════════════════════════════════════════════════════════════════════
// ELECT SCREEN — Full assessment with live + scan tabs
// ═══════════════════════════════════════════════════════════════════════
const INTENTS={
  love:{label:"Love",planet:"venus",icon:"♀",col:"#EFA0B8",reqs:["Venus in dignity","Moon applies to Venus","Waxing Moon","Friday Venus hour","5th/7th house configured","No Saturn afflicting Venus"]},
  money:{label:"Wealth",planet:"jupiter",icon:"♃",col:"#8B9FE0",reqs:["Jupiter in dignity","Moon applies to Jupiter","2nd house strong","Part of Fortune favored","Waxing Moon","Thursday Jupiter hour"]},
  protection:{label:"Protection",planet:"mars",icon:"♂",col:"#D24B31",reqs:["Mars in dignity","Moon applying to benefic","Fixed sign Ascendant","Enemy significator weak","Tuesday Mars hour"]},
  legal:{label:"Legal",planet:"jupiter",icon:"⚖",col:"#7CB8E0",reqs:["Jupiter in dignity","Jupiter in 1st or 10th","9th house configured","Lord of 7th weakened","Thursday Jupiter hour"]},
  health:{label:"Health",planet:"sun",icon:"☉",col:"#F5C518",reqs:["Sun in dignity","Avoid Moon in afflicted sign","Not near Full Moon","Moon fast for recovery","Sunday Sun hour"]},
  binding:{label:"Binding",planet:"saturn",icon:"♄",col:"#C4A870",reqs:["Saturn in dignity","Waning Moon","Moon applies to Saturn","Fixed sign Ascendant","Saturday Saturn hour"]},
};

function ElectScreen({now,natalPos,eph,profile}){
  const [ik,setIk]=useState("money");
  const [planet,setPlanet]=useState("jupiter");
  const [scanning,setScanning]=useState(false);
  const [elections,setElections]=useState([]);
  const [selIdx,setSelIdx]=useState(null);
  const [days,setDays]=useState(30);
  const [view,setView]=useState("live");
  const [showAll,setShowAll]=useState(false);
  // Season planning state
  const [seasonDomain,setSeasonDomain]=useState("wealth");
  const [seasonHorizon,setSeasonHorizon]=useState(6);
  const [seasonReport,setSeasonReport]=useState(null);
  const [seasonLoading,setSeasonLoading]=useState(false);
  const meta=INTENTS[ik]||INTENTS.money;
  const [committed,setCommitted]=useState(null);
  useEffect(()=>{setPlanet(meta.planet);setElections([]);setSelIdx(null);},[ik]);
  const live=assessElection(now,planet,natalPos);
  // Elective memory: how conditions like these have fared in your own record.
  const memStats=useMemo(()=>computeStats(loadCastings()),[committed]);
  const mem=useMemo(()=>electiveMemory(memStats,electionFactors(now,planet,live.score)),[memStats,planet,live.score,now]);
  const adjusted=mem.available?Math.max(0,Math.min(100,live.score+mem.adjustment)):null;
  // Operator's Loop: committing an election creates a casting record
  const commitElection=(date,assess)=>{
    try{
      const c=createCasting({kind:"election",title:`${meta.label} election — ${P[planet].name}`,intent:meta.label,planet,
        conditions:conditionsFromProfile(date,profile,natalPos,{score:assess.score,grade:assess.grade}),
        links:{electionWindow:{start:date.toISOString(),score:assess.score,grade:assess.grade}}});
      setCommitted(c.id);setTimeout(()=>setCommitted(null),3000);
    }catch(e){}
  };
  const sc=live.score;
  const sCol=s=>s>=90?"#FFD700":s>=75?"#5CA85C":s>=60?"#D4AF6A":s>=45?"#C08050":"#8B4040";
  const gCol=g=>g.includes("DISQ")?"#8B4040":g.includes("Talismanic")?"#FFD700":g.includes("Excellent")?"#5CA85C":g.includes("Good")?"#D4AF6A":"#8A7050";
  const fmtD=d=>{const diff=Math.floor((d-now)/86400000),t=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});if(diff===0)return"Today "+t;if(diff===1)return"Tomorrow "+t;if(diff<8)return DAY_NAMES[d.getDay()]+" "+t;return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+t;};
  const [rankByRecord,setRankByRecord]=useState(false);
  const runScan=()=>{setScanning(true);setElections([]);setSelIdx(null);const snap=new Date(now);setTimeout(()=>{
    const raw=scanElections(snap,days,planet,natalPos);
    // Decorate each window with elective memory so your record can rank them.
    const decorated=raw.map(r=>{const m=electiveMemory(memStats,electionFactors(r.date,planet,r.assess.score));return{...r,mem:m,adjusted:m.available?Math.max(0,Math.min(100,r.assess.score+m.adjustment)):r.assess.score};});
    setElections(decorated);setScanning(false);
  },300);};
  const SEASON_DOMAINS=[
    {id:"wealth",  label:"Wealth",   icon:"✦", col:"#D4AF6A"},
    {id:"health",  label:"Health",   icon:"⊕", col:"#5CA87C"},
    {id:"love",    label:"Love",     icon:"♡", col:"#C878A8"},
    {id:"creative",label:"Creative", icon:"◈", col:"#78A8C8"},
    {id:"spiritual",label:"Spiritual",icon:"☽",col:"#A888D8"},
    {id:"protection",label:"Protection",icon:"⊗",col:"#C87858"},
  ];
  const generateSeasonReport=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setSeasonReport(aiUnconfiguredMessage());return;}
    setSeasonLoading(true);setSeasonReport(null);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const jupPos=eph?.pos?.jupiter?`Jupiter ${eph.pos.jupiter.zodiac.degree}° ${eph.pos.jupiter.zodiac.name}`:"";
    const satPos=eph?.pos?.saturn?`Saturn ${eph.pos.saturn.zodiac.degree}° ${eph.pos.saturn.zodiac.name}`:"";
    const moonPos=eph?.pos?.moon?`Moon ${eph.pos.moon.zodiac.degree}° ${eph.pos.moon.zodiac.name} (${eph.moonPhase}${eph.voc?.isVoC?" — VoC":""})`:"";
    const outerStr=Object.keys(OUTER_EPOCHS).map(p=>{const lon=outerPlanetLon(p,now);const sn=SIGN_NAMES[Math.floor(lon/30)%12];return`${OUTER_META[p].name} in ${sn}`;}).join(", ");
    const jsYrs=(((now.getTime()-new Date("2020-12-21").getTime())/(365.25*86400000))).toFixed(1);
    const domain=SEASON_DOMAINS.find(d=>d.id===seasonDomain);
    const natalStr=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.zodiac.degree}° ${np.zodiac.name})`).join("; "):"No natal chart.";
    const sys=`You are a master of electional astrology and magical timing. Generate a practical season planning report for a practitioner working in the ${trad} tradition.`;
    const userMsg=`Generate a ${seasonHorizon}-month Season Planning Report for the domain of ${domain.label.toUpperCase()} in the ${trad} tradition.\n\nCurrent sky: ${moonPos}. ${jupPos}. ${satPos}. Outer planets: ${outerStr}. Air Mutation (Jupiter-Saturn 2020): ${jsYrs} years in.\n\nNatal context: ${natalStr}\n\nStructure your report as:\n1. **Overview** — The quality of this ${seasonHorizon}-month period for ${domain.label} work. What is the broad signature?\n2. **Peak Windows** — Name 2-3 specific time periods (month + rough timing) that are especially favorable for ${domain.label} workings and why.\n3. **Cautions** — What conditions to watch for or avoid. When to hold back.\n4. **Recommended Practice** — One concrete magical practice or focus that fits this season in the ${trad} tradition.\n\nBe specific and practical. 4-5 tight paragraphs.`;
    try{
      setSeasonReport(await askClaude({apiKey,system:sys,messages:[{role:"user",content:userMsg}],maxTokens:900}));
    }catch(e){setSeasonReport(e.message||"Season report unavailable — check connection.");}
    setSeasonLoading(false);
  };
  const TABS=[{id:"live",label:"Live"},{id:"scan",label:"Scan"},{id:"intents",label:"Intents"},{id:"season",label:"Season"},{id:"theory",label:"Theory"}];
  const THEORY=[
    {title:"The Moon — First Principle",text:"The Moon is the most important factor in all election astrology. She carries every planet's virtue to earth. Before anything else: is she void of course? In Via Combusta? Besieged by malefics? Slow in motion? Dorotheus: 'Look always to the Moon first.' A perfect election with a bad Moon delivers nothing. A mediocre election with an excellent Moon often succeeds."},
    {title:"Via Combusta — The Burnt Path",text:"15° Libra to 15° Scorpio — the Burnt Path. The Sun falls in Libra, the Moon falls in Scorpio. Both malefics (Mars domicile in Scorpio, Saturn exaltation ended) hold power here. Dozens of malefic fixed stars cluster in this band. Moon in Via Combusta vitiates any election without exception. Do not attempt to compensate with other dignities."},
    {title:"Void of Course — Writing on Water",text:"A void Moon is like writing on water. She makes no more applying aspects before leaving her current sign. Nothing begun under a void Moon completes as intended — not because it fails dramatically, but because it dissolves, peters out, or goes nowhere. The oldest and most universal rule in election astrology, confirmed across every tradition from Dorotheus to Lilly to the PGM."},
    {title:"Reception — The Alliance Principle",text:"When planet A is in planet B's sign, B receives A. Mutual reception (each in the other's sign) is the most powerful planetary alliance available — the 'chymical wedding' of election astrology. A malefic that receives the working planet becomes a helper rather than an enemy. Reception transforms square and opposition aspects from conflict into cooperative tension, like load-bearing architecture."},
    {title:"Hayz and Sect",text:"Diurnal planets (Sun, Jupiter, Saturn) are strongest by day, above the horizon, in masculine signs. Nocturnal planets (Moon, Venus, Mars) are strongest by night, below the horizon, in feminine signs. Being in hayz — in all your sect's conditions simultaneously — adds power beyond essential dignity alone. Mercury is of both sects. Check sect before any election."},
    {title:"Prohibition and Translation",text:"Prohibition: another planet perfects an aspect with the Moon before she reaches your working planet, blocking your matter — like an interloper closing a deal first. Translation of Light: the Moon carries virtue from one planet to another, uniting their significations. Use translation deliberately: if you need two factors joined, elect when the Moon translates light between them."},
    {title:"Shoaling Elections — Concurrent Timing",text:"Gordon White's shoaling principle applied to elections: instead of one precisely-timed operation, plan a shoal of related workings across multiple favorable windows within a season. Each working is slightly different — a different face of the same overall intention. Leave outcome space open for Black Swan results. 'If you think you know precisely how something is supposed to happen and you enchant for it, you may have just blocked the enormous opportunity.'"},
    {title:"Macrocycle Alignment",text:"The Blended Cycle Model in elections: the inner planet timing sits within the outer planet civilizational weather. An election for wealth during Jupiter in Aquarius (Air Mutation era) will have a different quality than the same election during Jupiter in Capricorn. Align your elections with the macro-signature when possible. Pluto in Aquarius (2024-2043) amplifies Mercury-ruled and Aquarius operations. Neptune in Aries amplifies new spiritual ventures. Uranus in Gemini amplifies communication, intelligence, and rapid-transmission workings."},
    {title:"Synchronicity as Election Confirmation",text:"A successful election produces synchronicities before, during, and after. Before: 'baroque coincidences' that confirm you are on the right track. During: a quality of heightened aliveness in the ritual space. After: unexpected developments that serve the intent from unexpected directions. If no synchronicities appear within a lunar cycle, the election either missed or the working needs follow-up. Synchronicity is the call-and-response of the spirit world, not lucky coincidence."},
    {title:"The Ancestor Current in Elections",text:"The most overlooked factor in election astrology: the condition of the practitioner's ancestor current. An electional window that is perfect by all classical criteria can still underperform if the ancestor current is weak, blocked, or antagonistic. Before any major working: propitiate the ancestors (fresh water, a candle, naming the beloved dead). They are the most motivated and accessible allies in the entire spirit hierarchy, and their backing amplifies every elected operation."},
  ];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 8px"}}>
        <div style={{fontFamily:F,fontSize:9,color:"#8A7040",letterSpacing:3.5,textTransform:"uppercase"}}>Dorotheus · Bonatti · Lilly · Classical Tradition</div>
        <div style={T(20)}>Election Astrology</div>
      </div>
      <div style={{padding:"0 14px 8px",display:"flex",gap:5}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setView(t.id)} style={{flex:1,padding:"6px 0",borderRadius:9,background:view===t.id?"rgba(212,175,106,0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(view===t.id?"rgba(212,175,106,0.38)":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:8,color:view===t.id?"#D4AF6A":"#6A5030",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{t.label}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {view==="live"&&<>
          {eph.voc?.isVoC&&<div style={{marginBottom:9,padding:"8px 12px",borderRadius:10,background:"rgba(180,100,50,0.12)",border:"1px solid rgba(200,120,60,0.28)",fontFamily:F,fontSize:9,color:"#E09060",letterSpacing:2}}>MOON VOID — {fmtTime(eph.voc.hoursToIngress*3600)} until {eph.voc.nextSign?.name}</div>}
          <div style={{marginBottom:8}}>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:3,textTransform:"uppercase",marginBottom:5}}>Intent</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {Object.entries(INTENTS).map(([k,m])=><button key={k} onClick={()=>setIk(k)} style={{padding:"7px 9px",borderRadius:10,background:ik===k?m.col+"14":"rgba(8,5,22,0.5)",border:"1px solid "+(ik===k?m.col+"45":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:ik===k?m.col:"#6A5030",cursor:"pointer",textAlign:"left",display:"flex",gap:5,alignItems:"center"}}><span>{m.icon}</span><span>{m.label}</span></button>)}
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:3,textTransform:"uppercase",marginBottom:5}}>Planet</div>
            <div style={{display:"flex",gap:4}}>
              {Object.keys(P).map(pk=>{const pl2=P[pk],pos=eph.pos[pk],a=planet===pk,ok=(pos.dignity==="domicile"||pos.dignity==="exaltation")&&!pos.isRetro&&!pos.combust;return<button key={pk} onClick={()=>setPlanet(pk)} style={{flex:1,padding:"7px 3px",borderRadius:9,background:a?pl2.col+"16":"rgba(8,5,22,0.5)",border:"1px solid "+(a?pl2.col+"50":ok?"rgba(92,168,92,0.2)":"rgba(200,175,100,0.09)"),cursor:"pointer"}}><div style={{fontSize:14,textAlign:"center",color:pl2.col}}>{pl2.sym}</div><div style={{fontFamily:F,fontSize:6,color:ok?"#5CA85C":DIGNITY_COL[pos.dignity],textAlign:"center",marginTop:1}}>{ok?"OK":pos.isRetro?"R":"–"}</div></button>;})}
            </div>
          </div>
          <div style={{borderRadius:14,background:"rgba(8,5,22,0.85)",border:"2px solid "+gCol(live.grade)+"40",padding:"14px 15px",marginBottom:9}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div><div style={{fontFamily:F,fontSize:16,color:gCol(live.grade)}}>{live.grade}</div><div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.45)",marginTop:2}}>{live.passCount}/{live.criteria.length} criteria</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:F,fontSize:48,color:sCol(sc),lineHeight:1}}>{sc}</div></div>
            </div>
            <div style={{height:3,background:"rgba(200,175,100,0.09)",borderRadius:2,marginBottom:9}}><div style={{height:"100%",width:sc+"%",background:sCol(sc),borderRadius:2}}/></div>
            {/* Elective memory — the second voice: your own record */}
            <div style={{marginBottom:9,padding:"9px 11px",borderRadius:10,background:mem.available?(mem.adjustment>0?"rgba(92,168,92,0.08)":mem.adjustment<0?"rgba(180,80,60,0.08)":"rgba(8,5,22,0.5)"):"rgba(8,5,22,0.5)",border:`1px solid ${mem.available?(mem.adjustment>0?"rgba(92,168,92,0.3)":mem.adjustment<0?"rgba(180,80,60,0.3)":"rgba(200,175,100,0.12)"):"rgba(200,175,100,0.1)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:mem.available&&mem.testimony.length?7:0}}>
                <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.5)",letterSpacing:2,textTransform:"uppercase"}}>Your Record</span>
                {mem.available&&<span style={{fontFamily:F,fontSize:12,color:mem.adjustment>0?"#7AB07A":mem.adjustment<0?"#D28060":"#8A7050",marginLeft:"auto"}}>{mem.adjustment>0?"+":""}{mem.adjustment} → {adjusted}</span>}
              </div>
              <div style={{fontFamily:F,fontSize:9.5,color:"#9A8060",fontStyle:"italic",lineHeight:1.6}}>{memoryVerdict(mem)}</div>
              {mem.available&&mem.testimony.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>
                {mem.testimony.slice(0,4).map((t,i)=><span key={i} style={{fontFamily:F,fontSize:8,color:t.delta>0?"#7AB07A":t.delta<0?"#D28060":"#8A7050",background:"rgba(0,0,0,0.25)",border:`1px solid ${t.delta>0?"rgba(92,168,92,0.25)":t.delta<0?"rgba(180,80,60,0.25)":"rgba(200,175,100,0.15)"}`,borderRadius:6,padding:"2px 7px"}}>{t.factor} “{t.key}” {t.pct}% · n{t.n}</span>)}
              </div>}
            </div>
            {live.critFail.length>0&&<div style={{marginBottom:8,padding:"8px 10px",borderRadius:9,background:"rgba(100,20,20,0.4)",border:"1px solid rgba(180,60,60,0.3)"}}>{live.critFail.map(c=><div key={c.id} style={{fontFamily:F,fontSize:10,color:"#C08080",fontStyle:"italic",lineHeight:1.6}}>✗ {c.label}: {c.note}</div>)}</div>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              {live.trans&&<span style={{fontFamily:F,fontSize:8,color:"#7CB8E0",background:"rgba(124,184,224,0.1)",border:"1px solid rgba(124,184,224,0.25)",borderRadius:6,padding:"2px 7px"}}>Translation: {P[live.trans.from]?.sym} to {P[live.trans.to]?.sym}</span>}
              {live.prohib&&<span style={{fontFamily:F,fontSize:8,color:"#D24B31",background:"rgba(210,75,49,0.1)",border:"1px solid rgba(210,75,49,0.25)",borderRadius:6,padding:"2px 7px"}}>Prohibited by {P[live.prohib.planet]?.name}</span>}
              {live.speed.fast&&<span style={{fontFamily:F,fontSize:8,color:"#D4AF6A",background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.2)",borderRadius:6,padding:"2px 7px"}}>Fast Moon {live.speed.speed}°/day</span>}
              {live.stars.map(s=><span key={s.name} style={{fontFamily:F,fontSize:8,color:s.col,background:"rgba(200,200,255,0.08)",border:"1px solid "+s.col+"25",borderRadius:6,padding:"2px 7px"}}>{s.name}</span>)}
            </div>
            <button onClick={()=>commitElection(now,live)} style={{width:"100%",padding:"9px 0",borderRadius:9,marginBottom:6,background:committed?"rgba(92,168,92,0.15)":gCol(live.grade)+"14",border:"1px solid "+(committed?"rgba(92,168,92,0.4)":gCol(live.grade)+"40"),fontFamily:F,fontSize:9,color:committed?"#7AB07A":gCol(live.grade),letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{committed?"✓ Recorded — judge it in Review":"⚑ Cast Now — Record This Sky"}</button>
            <button onClick={()=>setShowAll(!showAll)} style={{width:"100%",padding:"7px 0",borderRadius:9,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(200,175,100,0.12)",fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.5)",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{showAll?"HIDE":"SHOW"} ALL {live.criteria.length} CRITERIA</button>
            {showAll&&live.criteria.map(c=><div key={c.id} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(200,175,100,0.05)"}}>
              <span style={{fontSize:10,color:c.pass?"#5CA85C":"#8B4040",width:14}}>{c.pass?"✓":"✗"}</span>
              <div style={{flex:1}}><div style={{fontFamily:F,fontSize:10,color:c.pass?"#C4A870":"#9A7060"}}>{c.label}</div><div style={{fontFamily:F,fontSize:9,color:"#6A5030",fontStyle:"italic",marginTop:2,lineHeight:1.5}}>{c.note}</div></div>
            </div>)}
          </div>
          <div style={{borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,221,237,0.14)",padding:"12px 14px",marginBottom:9}}>
            <div style={{fontFamily:F,fontSize:9,color:"rgba(200,221,237,0.6)",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>Moon Aspects</div>
            {live.moonAsp.applying.slice(0,4).map((a,i)=>{const isW=a.planet===planet,isBad=["mars","saturn"].includes(a.planet)&&["Square","Opposition"].includes(a.aspect);return<div key={i} style={{display:"flex",gap:8,padding:"4px 8px",borderRadius:8,background:isW?"rgba(212,175,106,0.1)":isBad?"rgba(180,60,60,0.1)":"rgba(0,0,0,0.2)",border:"1px solid "+(isW?"rgba(212,175,106,0.3)":isBad?"rgba(180,60,60,0.25)":"transparent"),marginBottom:3,alignItems:"center"}}>
              <span style={{color:P[a.planet].col,fontSize:12,width:18}}>{P[a.planet].sym}</span>
              <span style={{fontFamily:F,fontSize:10,color:isW?"#D4AF6A":isBad?"#C08080":"#C4A870",flex:1}}>Moon {a.aspect} {P[a.planet].name} in {a.hours}h</span>
              {isW&&<span style={{fontFamily:F,fontSize:8,color:"#D4AF6A"}}>TARGET</span>}
              {isBad&&<span style={{fontFamily:F,fontSize:8,color:"#D24B31"}}>BAD</span>}
            </div>;})}
          </div>
        </>}
        {view==="scan"&&<>
          <div style={{padding:"12px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,175,100,0.1)",marginBottom:9}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:7}}>
              {Object.entries(INTENTS).map(([k,m])=><button key={k} onClick={()=>setIk(k)} style={{padding:"6px 8px",borderRadius:9,background:ik===k?m.col+"14":"rgba(0,0,0,0.3)",border:"1px solid "+(ik===k?m.col+"40":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:8,color:ik===k?m.col:"#6A5030",cursor:"pointer",textAlign:"left",display:"flex",gap:4,alignItems:"center"}}><span>{m.icon}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</span></button>)}
            </div>
            <div style={{display:"flex",gap:4,marginBottom:7}}>{Object.keys(P).map(pk=>{const pl2=P[pk],a=planet===pk;return<button key={pk} onClick={()=>setPlanet(pk)} style={{flex:1,padding:"6px 2px",borderRadius:8,background:a?pl2.col+"16":"rgba(8,5,22,0.5)",border:"1px solid "+(a?pl2.col+"45":"rgba(200,175,100,0.09)"),cursor:"pointer"}}><div style={{fontSize:13,textAlign:"center",color:pl2.col}}>{pl2.sym}</div></button>;})}</div>
            <div style={{display:"flex",gap:5,marginBottom:9}}>{[14,30,60,90].map(d=><button key={d} onClick={()=>setDays(d)} style={{flex:1,padding:"6px 0",borderRadius:8,background:days===d?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(days===d?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.12)"),fontFamily:F,fontSize:8,color:days===d?"#D4AF6A":"#6A5030",letterSpacing:2,cursor:"pointer"}}>{d}D</button>)}</div>
            <button onClick={runScan} disabled={scanning} style={{width:"100%",padding:"12px 0",borderRadius:11,background:scanning?"rgba(0,0,0,0.3)":P[planet].col+"18",border:"1px solid "+(scanning?"rgba(200,175,100,0.12)":P[planet].col+"45"),fontFamily:F,fontSize:10,color:scanning?"#6A5030":P[planet].col,letterSpacing:3,textTransform:"uppercase",cursor:scanning?"default":"pointer"}}>{scanning?"SCANNING…":"FIND ELECTIONS"}</button>
          </div>
          {elections.some(e=>e.mem?.available)&&<button onClick={()=>setRankByRecord(r=>!r)} style={{width:"100%",padding:"8px 0",marginBottom:8,borderRadius:9,background:rankByRecord?"rgba(92,168,92,0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(rankByRecord?"rgba(92,168,92,0.35)":"rgba(200,175,100,0.12)"),fontFamily:F,fontSize:8.5,color:rankByRecord?"#7AB07A":"rgba(200,175,100,0.5)",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{rankByRecord?"◬ Ranked by your record":"◬ Rank by your record"}</button>}
          {(rankByRecord?elections.map((e,i)=>[e,i]).sort((a,b)=>b[0].adjusted-a[0].adjusted):elections.map((e,i)=>[e,i])).map(([e,i])=>{const isSel=selIdx===i,gc=sCol(e.assess.score),adj=e.mem?.available?e.mem.adjustment:0;return<div key={i} onClick={()=>setSelIdx(isSel?null:i)} style={{marginBottom:8,borderRadius:13,background:isSel?P[planet].col+"0F":"rgba(8,5,22,0.65)",border:"2px solid "+(isSel?gc+"60":gc+"22"),padding:"12px 13px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}><div style={{fontFamily:F,fontSize:11,color:gc}}>{e.assess.grade}</div><div style={{fontFamily:F,fontSize:10,color:"#C4A870",fontStyle:"italic"}}>{fmtD(e.date)}</div><div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.45)",marginTop:1}}>{P[planet].name} {e.zodiac.degree}° {e.zodiac.sym}</div>{e.mem?.available&&adj!==0&&<div style={{fontFamily:F,fontSize:8.5,color:adj>0?"#7AB07A":"#D28060",marginTop:3}}>◬ Your record {adj>0?"+":""}{adj} → {e.adjusted}{e.mem.testimony[0]?` · ${e.mem.testimony[0].key} ${e.mem.testimony[0].pct}%`:""}</div>}</div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:F,fontSize:30,color:gc,lineHeight:1}}>{e.assess.score}</div>{e.mem?.available&&adj!==0&&<div style={{fontFamily:F,fontSize:11,color:adj>0?"#7AB07A":"#D28060",marginTop:2}}>{e.adjusted}</div>}</div>
            </div>
            {isSel&&<div style={{marginTop:9,paddingTop:9,borderTop:"1px solid "+gc+"20"}}>
              <button onClick={ev=>{ev.stopPropagation();commitElection(e.date,e.assess);}} style={{width:"100%",padding:"9px 0",borderRadius:9,marginBottom:7,background:committed?"rgba(92,168,92,0.15)":gc+"14",border:"1px solid "+(committed?"rgba(92,168,92,0.4)":gc+"40"),fontFamily:F,fontSize:9,color:committed?"#7AB07A":gc,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{committed?"✓ Recorded — judge it in Review":"⚑ Commit to This Window"}</button>
              {e.assess.criteria.map(c=><div key={c.id} style={{display:"flex",gap:7,padding:"4px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}><span style={{fontSize:10,color:c.pass?"#5CA85C":"#8B4040",width:14}}>{c.pass?"✓":"✗"}</span><div style={{flex:1}}><div style={{fontFamily:F,fontSize:10,color:c.pass?"#C4A870":"#9A7060"}}>{c.label}</div><div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:1}}>{c.note}</div></div></div>)}</div>}
          </div>;})}
          {elections.length===0&&!scanning&&<div style={{textAlign:"center",padding:"30px 20px",fontFamily:F,fontSize:11,color:"#5A4020",fontStyle:"italic",lineHeight:1.8}}>Configure intent and planet, then scan. Only elections passing all 5 critical criteria shown.</div>}
        </>}
        {view==="intents"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:9}}>{Object.entries(INTENTS).map(([k,m])=><button key={k} onClick={()=>setIk(k)} style={{padding:"8px",borderRadius:10,background:ik===k?m.col+"14":"rgba(0,0,0,0.3)",border:"1px solid "+(ik===k?m.col+"45":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:ik===k?m.col:"#7A6030",cursor:"pointer",textAlign:"left"}}>{m.icon} {m.label}</button>)}</div>
          <div style={{borderRadius:14,background:"rgba(8,5,22,0.85)",border:"1px solid "+meta.col+"25",padding:"14px 15px"}}>
            <div style={{fontFamily:F,fontSize:15,color:meta.col,marginBottom:9}}>{meta.icon} {meta.label}</div>
            {meta.reqs.map((r,i)=><div key={i} style={{display:"flex",gap:7,padding:"4px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}><span style={{color:meta.col+"50",fontSize:9,marginTop:1,width:14}}>{i+1}.</span><div style={{fontFamily:F,fontSize:10,color:"#C4A870",fontStyle:"italic",lineHeight:1.6}}>{r}</div></div>)}
          </div>
        </>}
        {view==="season"&&(
          <div style={{paddingTop:4}}>
            <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",lineHeight:1.7,marginBottom:10}}>Choose your domain and horizon. The AI generates a practical season planning report — peak windows, cautions, and recommended practice.</div>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",letterSpacing:3,marginBottom:5}}>DOMAIN</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:10}}>
              {SEASON_DOMAINS.map(d=>(
                <button key={d.id} onClick={()=>setSeasonDomain(d.id)} style={{padding:"7px 5px",borderRadius:10,background:seasonDomain===d.id?d.col+"14":"rgba(8,5,22,0.5)",border:"1px solid "+(seasonDomain===d.id?d.col+"45":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:seasonDomain===d.id?d.col:"#7A6030",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:14,marginBottom:2}}>{d.icon}</div>
                  <div style={{fontSize:7,letterSpacing:1}}>{d.label}</div>
                </button>
              ))}
            </div>
            <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",letterSpacing:3,marginBottom:5}}>HORIZON</div>
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              {[3,6,12].map(h=>(
                <button key={h} onClick={()=>setSeasonHorizon(h)} style={{flex:1,padding:"7px 0",borderRadius:9,background:seasonHorizon===h?"rgba(212,175,106,0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(seasonHorizon===h?"rgba(212,175,106,0.38)":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:seasonHorizon===h?"#D4AF6A":"#6A5030",cursor:"pointer"}}>
                  {h === 12 ? "1 year" : `${h} months`}
                </button>
              ))}
            </div>
            <button onClick={generateSeasonReport} disabled={seasonLoading} style={{width:"100%",padding:"13px",borderRadius:13,background:"rgba(212,175,106,0.07)",border:"1px solid rgba(212,175,106,0.22)",fontFamily:F,fontSize:11,color:seasonLoading?"rgba(200,175,100,0.4)":"#D4AF6A",letterSpacing:2,cursor:seasonLoading?"default":"pointer",marginBottom:10}}>
              {seasonLoading?"READING THE SEASON…":"◈ GENERATE SEASON REPORT"}
            </button>
            {seasonReport&&(
              <div style={{borderRadius:13,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.1)",padding:"14px 15px"}}>
                <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{seasonReport}</div>
              </div>
            )}
          </div>
        )}
        {view==="theory"&&THEORY.map(({title,text})=><div key={title} style={{marginBottom:8,borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,175,100,0.09)",padding:"13px 14px"}}><div style={{fontFamily:F,fontSize:13,color:"#D4AF6A",marginBottom:5}}>{title}</div><div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",lineHeight:1.9}}>{text}</div></div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WORK SCREEN
// ═══════════════════════════════════════════════════════════════════════
export const TRADITION_STEPS={
  "western-ceremonial":[
    {t:"Purification",d:"Begin preparation the day before: fast lightly, avoid conflict, spend time with the planet's materia. Bathe before the working. Let preparation be the first act of invocation."},
    {t:"Prepare the Space",d:"Arrange the altar with everything the sphere calls for: its seal at center, incense unlit, offerings arrayed, tools in their place. Face the classical direction. Readiness is devotion."},
    {t:"Open the Hour",d:"At the exact start of the planetary hour, light the incense. Speak a declaration of intent aloud. Let rising smoke carry your opening to the sphere. The hour is a gate; greet it as one."},
    {t:"Inscribe the Talisman",d:"Draw the planetary character, kamea seal, or image with full unhurried attention. Speak each character aloud as you form it. The inscription is a sustained act of attention — that attention is what consecrates."},
    {t:"The Oration",d:"Deliver the planetary invocation three full times. Speak to the sphere as if it hears you — because it does. State your specific request once, precisely and completely."},
    {t:"Consecration",d:"Pass the talisman through incense smoke three times. State the consecration aloud: name the planet, hour, day, and purpose. Let the work be sealed without reservation."},
    {t:"Incubation",d:"Wrap the talisman in cloth of the planet's color. Set it aside for a full lunar cycle of 28 days, or until the Moon returns to the same sign. Patience is part of the craft."},
  ],
  "chaos":[
    {t:"Statement of Intent",d:"Write your intent as a single clear sentence. Then reduce it to a sigilized form — remove repeating letters, rearrange what remains into an abstract symbol. This is your charge."},
    {t:"Enter Gnosis",d:"Choose your method: sensory deprivation, breath work, intense physical exertion, or laughter. Drive the rational mind below the threshold. The sigil fires in the gap between thoughts."},
    {t:"Charge the Sigil",d:"At peak gnosis, fix your full attention on the sigil. Hold it. Let it burn into the inner eye. Then release — completely. Do not linger. The moment of release is the moment of transmission."},
    {t:"Destruction & Forgetting",d:"Burn or tear the physical sigil. Actively forget the intent. Do not check for results. Obsessive monitoring collapses the probability space you have opened."},
    {t:"Statement of Banishing",d:"Laugh. Sincerely and hard. The Chaos current requires you to end with a dissolution of the working's heaviness. Everything is permitted; nothing is permanent."},
  ],
  "traditional-witchcraft":[
    {t:"Timing & Place",d:"Choose the correct moon phase for your intent — waxing to draw, waning to banish. Work at a liminal hour: dawn, dusk, midnight, or noon. Find a liminal place if possible: threshold, crossroads, edge of water."},
    {t:"Cast the Mill",d:"Turn widdershins three times to open the space between the worlds. Call the four winds or the ancestral dead. The arte requires witnesses, not commands."},
    {t:"Prepare the Charm",d:"Gather your materia: herbs, stones, bones, earth. Speak over each piece as you add it, naming its nature and purpose. Your words bind the virtue in."},
    {t:"The Working",d:"Speak or sing your intent directly to the spirit of the thing, to the Old Ones, or to the ancestor you have called. Repeat three times or nine. The repetition builds the current."},
    {t:"Bind It In",d:"Tie the charm with red or black thread. Three knots for binding, nine for strong working. Each knot seals a layer of intent. Do not untie it until the work is complete or reversed."},
    {t:"Release & Thanks",d:"Give back what you have asked for, in kind: pour milk, bury silver, leave bread at the crossroads. The art demands reciprocity."},
  ],
  "hellenism":[
    {t:"Purification",d:"Khernips: prepare purified water (saltwater or water charged with a burning herb) and wash hands and face. Speak the formula: 'Be pure, be pure, be pure.' Ash and salt at the threshold."},
    {t:"Invocation of the Agathos Daimon",d:"Call your personal daimon to witness and assist. This is the intermediary between you and the higher powers. Honor it first."},
    {t:"Theurgic Prayer",d:"Address the planetary deity through the Orphic hymn. Do not command — beseech with beauty. The gods respond to beauty, not to coercion. Let the hymn be sung or chanted, not merely read."},
    {t:"Offering",d:"Pour libations: wine and honey mixed with water. Burn barley grains and herbs appropriate to the deity. Name each offering aloud and name its purpose."},
    {t:"Contemplative Union",d:"Sit in silence after the offering. The theurgic tradition expects you to receive — not just to transmit. Wait for the daimon's response: a thought, an image, a shift in the quality of the air."},
    {t:"Closing Rite",d:"Thank the deity and the daimon. Release them with grace. Close with the final formula of the Orphic tradition: 'The work is complete. Return to your own realm with my thanks.'"},
  ],
  "folk":[
    {t:"Moon Check",d:"Confirm the moon phase is correct for your working. Waxing for drawing in, full for power, waning for banishing, dark for hidden work. This is non-negotiable in the folk current."},
    {t:"Prepare Your Space",d:"Sweep the space clean — physically. Set a glass of water in the corner for the ancestors. Light a white candle to invite the light. This is simple and sufficient."},
    {t:"Name Your Petition",d:"Write your petition on paper in plain language. Add your name and date. Anoint with the appropriate oil — draw toward you for increase, away for removal."},
    {t:"Dress the Candle",d:"Dress a candle in the appropriate color with your chosen oil. Roll toward you for attraction, away for banishing. Set it on or near your petition."},
    {t:"Speak Your Intent",d:"Read your petition aloud three times. Pray — to a saint, an ancestor, or the Divine as you understand it. The folk tradition does not require elaborate theology."},
    {t:"Let It Work",d:"Let the candle burn as long as it safely can. Dispose of remains at a crossroads, in moving water, or bury in your yard. Check the wax for signs. The work is done when it's done."},
  ],
  "custom":[
    {t:"Set Your Frame",d:"Decide which paradigm you are working in for this operation. The eclectic practitioner's first act is choosing a coherent frame, even temporarily. Paradigm-shifting mid-ritual is rarely useful."},
    {t:"Prepare",d:"Gather whatever materia your system calls for. The materials themselves are not magic — they are anchors for attention. Choose what has meaning to you."},
    {t:"Open",d:"Perform whatever opening your practice uses. Cast, call quarters, light a candle, or simply state your intent clearly into the space. Open the working."},
    {t:"Work",d:"Perform the core of your operation: invocation, inscription, prayer, sigil, or active imagination. Give it your full attention for its duration. Divided attention is wasted effort."},
    {t:"Close",d:"Close your working with the same care you opened it. Thank whatever forces assisted. Return the energy of the space to neutral."},
    {t:"Release",d:"Let the working go. Do not obsess over results. The working is complete when it is closed — the outcome operates in its own time and by its own logic."},
  ],
  "goetia":[
    {t:"Propitiate the Ancestors",d:"Before any goetic work: light a candle at the ancestor altar, leave fresh water, speak to the beloved dead by name. The ancestor current provides stability that prevents goetic contact from going sideways. Never approach the 72 without ancestral backing."},
    {t:"Research the Spirit",d:"Before the working: read the spirit's entry in the Lemegeton or Grimorium Verum. Know its rank, its domain of expertise, its seal, and its traditional appearance. You are meeting a person with specific capabilities — know what you are asking of them and why they might agree."},
    {t:"Prepare the Contact",d:"Draw the spirit's seal on clean paper or engrave it on appropriate metal. This is the contact protocol — the specific symbol that establishes the communication channel. Prepare its preferred incense and offerings. You are not commanding; you are calling diplomatically."},
    {t:"Open the Hour",d:"Work in the planetary hour corresponding to the spirit's planetary affinity. Light the incense. If working with Scirlin/Syrach as intermediary (Grimorium Verum tradition), address them first: they facilitate introductions to the other spirits."},
    {t:"The Diplomatic Approach",d:"State your name, your lineage (including ancestral and initiatory lines), and your request. Frame it as an offer of relationship, not a command. Describe what you bring to the relationship (offerings, regular contact, proper respect) and what you are asking. 'Magic is extradimensional diplomacy.'"},
    {t:"Negotiate and Confirm",d:"Attend to the response: internal impressions, external omens, shifts in atmosphere. If the spirit indicates reluctance or counterproposal, engage genuinely. Confirm the terms. Do not force an outcome — a coerced agreement delivers coerced results."},
    {t:"Close and Honor",d:"Thank the spirit by name. Leave the seal on the altar for at least one lunar cycle. Deliver the agreed offering promptly. Maintain the relationship with periodic contact, not just when you need something. Spirits remember who keeps their word."},
  ],
  "faerie":[
    {t:"Read the Liminal Calendar",d:"Identify the approaching liminal time: Samhain (Oct 31), Beltane (May 1), or the daily thresholds (dawn, dusk, midnight, noon). The veil between worlds is thinnest at these times. The fair folk are most accessible — and most active. Plan accordingly."},
    {t:"Choose a Liminal Place",d:"Identify a liminal place nearby: a threshold, a crossroads, running water, an ancient mound, a hollow tree, the edge of a wood. The Otherworld interpenetrates the physical at these locations. Work here if possible. If not, establish a threshold within your own home."},
    {t:"Prepare the Tribute",d:"Leave tribute before making contact: cream, good bread, tobacco, silver. Do not use iron in any offering. Do not speak their names directly if you do not have a relationship — address them as 'the Gentry,' 'the Good Folk,' or 'the Fair Folk.' Tribute is not payment; it is the first gesture of relationship."},
    {t:"The Approach",d:"Speak clearly and honestly. Do not boast, lie, or make promises you will not keep. State who you are, what you bring, and what you hope for. Do not demand. The fairy doctor tradition is one of mediation and diplomacy — position yourself as a respectful neighbor, not a superior."},
    {t:"Attend to Signs",d:"Watch for responses: shifts in atmosphere, sounds, appearances at the edges of perception, the behavior of animals, changes in the quality of light. The fair folk communicate through the fabric of the world. Synchronicity is their primary language to those outside active relationship."},
    {t:"Maintain the Relationship",d:"Return regularly to the liminal place with tribute. Note what changes. Maintain the relationship between workings, not just when you need something. The fairy doctor earned their position through sustained, respectful contact over years. Trust is built slowly and withdrawn quickly."},
  ],
  "spagyric":[
    {t:"Choose the Plant & Planet",d:"Select the plant by planetary correspondence (doctrine of signatures + classical materia medica): Jupiter rules hyssop, sage, dandelion, lemon balm; Venus rules rose, elder, mugwort, yarrow; Saturn rules comfrey, mullein, skullcap. Choose in the correct planetary hour."},
    {t:"Harvest with Intention",d:"Harvest or obtain the plant in the correct planetary hour and day. Speak to the plant before taking any part of it — explain your purpose, ask permission, and leave an offering. The plant is a person. The relationship begins here."},
    {t:"Separation (Solve)",d:"Separate the three essentials: distill or extract the Mercury (alcohol tincture or essential oil — the spirit), collect the Sulfur (aromatic volatile principles — the soul), and save the plant body for calcination. Each separation is an act of attention to the plant's specific nature."},
    {t:"Calcination",d:"Burn the remaining plant body (the Salt/body) to white ash in a crucible. This is the death of the form, freeing the mineral soul. Grind the white ash fine. This is the purified Salt — the mineral matrix that will anchor the reunited tincture."},
    {t:"Recombination (Coagula)",d:"Slowly reintroduce the purified Salt into the Mercury/Sulfur tincture. Each addition is an act of contemplation — you are overseeing the death and resurrection of the plant person in a purified form. The cohobation process may require multiple cycles."},
    {t:"Consecration",d:"In the correct planetary hour, consecrate the completed spagyric tincture. Speak over it: name the planet, name the plant's spirit, state the purpose. The lab has been a devotional space throughout — seal that devotion at the end."},
  ],
  "shamanism":[
    {t:"Ancestral Opening",d:"Before any journey: acknowledge the ancestors of your biological lineage and the lineage of your practice. Light a candle, leave water. The upper and lower worlds are more accessible when the middle-world ancestor current is strong and intact."},
    {t:"Set the Intent",d:"State your journey intent precisely before beginning: 'I am going to the lower world to meet my power animal and ask about [specific question].' Vague intent produces vague results. The spirits of the other worlds respond to clarity."},
    {t:"Drum to the Threshold",d:"Begin the drum (or drumming recording at 4-7 Hz). Breathe slowly. Visualize the entry point: a hole in the earth, a hollow tree, a cave entrance for the lower world; an opening in the sky, a ladder, a mountain peak for the upper world. Move through with your intent."},
    {t:"Meet and Engage",d:"When you encounter a spirit being, identify it: is this a power animal? A teacher? Ask its name. Ask if it is willing to work with you. If it is, engage with your specific question or request. If it seems hostile or evasive, leave and return another time."},
    {t:"Receive and Remember",d:"Pay close attention to everything you are shown, told, or given. Shamanic instruction often comes in image, symbol, and enacted drama rather than direct explanation. Do not interpret while in the journey — record everything and interpret afterward."},
    {t:"Return and Ground",d:"When the callback rhythm begins (or you sense the session is complete), retrace your path to the entry point and return. Feel your body in the room. Write down everything immediately. Ground with food or water. The journey journal is your most important record."},
  ],
};

function WorkScreen({eph,initPlanet,natalPos,profile,now}){
  const [planet,setPlanet]=useState(initPlanet);
  const [view,setView]=useState("op");
  const [step,setStep]=useState(0);
  const [genGoal,setGenGoal]=useState("");
  const [genTimeline,setGenTimeline]=useState("");
  const [genNotes,setGenNotes]=useState("");
  const [genPlan,setGenPlan]=useState(null);
  const [genLoading,setGenLoading]=useState(false);
  const [genSaved,setGenSaved]=useState(false);
  useEffect(()=>{if(initPlanet){setPlanet(initPlanet);setView("op");setStep(0);}},[initPlanet]);
  const primaryTrad=profile?.traditions?.[0]||"western-ceremonial";
  const STEPS=TRADITION_STEPS[primaryTrad]||TRADITION_STEPS["western-ceremonial"];
  const generatePlan=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setGenPlan(aiUnconfiguredMessage());return;}
    if(!genGoal.trim())return;
    setGenLoading(true);setGenPlan(null);setGenSaved(false);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const tPrompts=profile?.traditions?.map(t=>TRADITIONS[t]?.prompt||"").filter(Boolean).join("\n\n")||TRADITIONS["western-ceremonial"].prompt;
    const positions=Object.entries(eph.pos).map(([pk,p])=>`${P[pk].name}: ${p.zodiac.degree}° ${p.zodiac.name} (${p.dignity}${p.isRetro?" ℞":""}${p.combust?` ${p.combust.type}`:""})`).join(", ");
    const nd=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.dignity})`).join(", "):"No natal chart";
    const dateStr=now?now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}):"today";
    const sys=`You are a master practitioner of ${trad}, deeply versed in the classical sources of magical timing and operation.\n\nTRADITION:\n${tPrompts}\n\nGenerate a complete, practical magical operation plan. Be specific — give exact dates, exact materia, exact words. Format with clear section headers. This is actionable instruction, not theory.`;
    const userMsg=`Current sky (${dateStr}): ${positions}\nMoon: ${eph.moonPhase}${eph.voc?.isVoC?" — VOID":""}\n${nd}\n\nMy goal: ${genGoal}\nTimeline: ${genTimeline||"flexible"}\nNotes/constraints: ${genNotes||"none"}\n${planet?`Primary planet in mind: ${P[planet].name}`:"Let the tradition determine the best planet."}\n\nGenerate a complete ritual plan with these sections:\n1. PLANETARY CHOICE — which sphere and why\n2. ELECTION WINDOW — specific best date/time within my timeline\n3. MATERIA — complete list (incense, herbs, stones, metals, colors, day, hour)\n4. RITUAL STRUCTURE — step-by-step procedure in ${trad} style\n5. INVOCATION — opening prayer or calling\n6. CONSECRATION — how to seal the working\n7. FOLLOW-UP — maintenance timing, what to observe\n8. CAUTIONS — what to avoid`;
    try{
      setGenPlan(await askClaude({apiKey,system:sys,messages:[{role:"user",content:userMsg}],maxTokens:1400}));
    }catch(e){setGenPlan(e.message||"Generator unavailable — check connection.");}
    setGenLoading(false);
  };
  const saveToGrimoire=async()=>{
    if(!genPlan)return;
    try{
      const r=await window.storage.get("astrum_grimoire");
      const existing=r?.value?JSON.parse(r.value):[];
      const entry={id:Date.now(),title:genGoal.slice(0,60)||(planet?`${P[planet].name} Working`:"Custom Working"),body:genPlan,planet:planet||"sun",tags:[planet||"custom","ai-generated"],date:now?now.toISOString().split("T")[0]:new Date().toISOString().split("T")[0],category:"ritual",type:"ai-generated"};
      await window.storage.set("astrum_grimoire",JSON.stringify([entry,...existing]));
      try{
        createCasting({kind:"working",title:entry.title,intent:genGoal,planet:planet||"sun",tradition:primaryTrad,
          conditions:conditionsFromProfile(now||new Date(),profile,natalPos),links:{grimoireId:entry.id}});
      }catch(e){}
      setGenSaved(true);
    }catch(e){}
  };
  if(!planet){
    return (
      <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
        <div style={{padding:"16px 18px 12px"}}>
          <div style={L()}>Talisman Workshop</div>
          <div style={T(20)}>Choose a Planet</div>
        </div>
        <div style={{padding:"0 12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          {Object.entries(P).map(([pk,pl])=>{
            const pos=eph.pos[pk],dc=DIGNITY_COL[pos.dignity],np=natalPos?.[pk];
            return (
              <button key={pk} onClick={()=>{setPlanet(pk);setView("op");setStep(0);}} style={{padding:"14px 12px",borderRadius:16,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.09)",cursor:"pointer",textAlign:"left",backdropFilter:"blur(16px)"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:24,color:pl.col}}>{pl.sym}</span>
                  {np&&<span style={{fontFamily:F,fontSize:7,color:DIGNITY_COL[np.dignity],letterSpacing:1}}>NATAL</span>}
                </div>
                <div style={{fontFamily:F,fontSize:14,color:pl.col,marginTop:6}}>{pl.name}</div>
                <div style={{fontFamily:F,fontSize:8,color:dc,marginTop:3,letterSpacing:1}}>{DIGNITY_LBL[pos.dignity].split(" ")[0].toUpperCase()}{pos.isRetro?" ℞":""}
                  {pos.combust&&<span style={{color:"rgba(245,197,24,0.7)"}}>  ☌</span>}</div>
                <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.4}}>{pl.domains.slice(0,2).join(", ")}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  const pl=P[planet],pos=eph.pos[planet],np=natalPos?.[planet];
  if(view==="ritual"){
    const s=STEPS[step];
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
        <div style={{padding:"14px 16px 10px",background:"rgba(4,4,16,0.9)",borderBottom:`1px solid ${pl.col}1A`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <button onClick={()=>setView("op")} style={{background:"none",border:"none",color:"#6A5030",fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer"}}>← BACK</button>
            <div style={L(`${pl.col}70`,8)}>Step {step+1} / {STEPS.length}</div>
          </div>
          <div style={T(17,pl.col)}>{s.t}</div>
          <div style={{marginTop:9,display:"flex",gap:2}}>{STEPS.map((_,i)=><div key={i} onClick={()=>setStep(i)} style={{flex:1,height:2,borderRadius:1,background:i<=step?pl.col:"rgba(200,175,100,0.1)",cursor:"pointer"}}/>)}</div>
        </div>
        <div style={{flex:1,padding:"30px 22px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
          <div style={{fontSize:38,color:pl.col,opacity:0.55,marginBottom:20,animation:"breathe 4s ease-in-out infinite",fontFamily:"serif"}}>{pl.sym}</div>
          <div style={{fontFamily:F,fontSize:15,color:"#D4C8A0",lineHeight:2,textAlign:"center",fontStyle:"italic",maxWidth:320}}>{s.d}</div>
        </div>
        <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"12px 0",borderRadius:12,background:"rgba(200,175,100,0.06)",border:"1px solid rgba(200,175,100,0.12)",fontFamily:F,fontSize:10,color:"#7A6030",letterSpacing:2,cursor:"pointer"}}>← PREV</button>}
          {step<STEPS.length-1?<button onClick={()=>setStep(s=>s+1)} style={{flex:2,padding:"12px 0",borderRadius:12,background:`${pl.col}15`,border:`1px solid ${pl.col}40`,fontFamily:F,fontSize:10,color:pl.col,letterSpacing:2,cursor:"pointer"}}>NEXT →</button>:<button onClick={()=>setView("op")} style={{flex:2,padding:"12px 0",borderRadius:12,background:`${pl.col}25`,border:`1px solid ${pl.col}50`,fontFamily:F,fontSize:11,color:pl.col,letterSpacing:2,cursor:"pointer"}}>✦ COMPLETE</button>}
        </div>
      </div>
    );
  }
  if(view==="generator"){
    const IS={width:"100%",marginTop:4,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:12,boxSizing:"border-box"};
    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
        <div style={{padding:"12px 16px 10px",borderBottom:"1px solid rgba(200,175,100,0.07)",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>{setView("op");setGenPlan(null);}} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:10,cursor:"pointer",letterSpacing:1}}>← Back</button>
          <div style={{fontFamily:F,fontSize:13,color:"#D4AF6A"}}>AI Ritual Generator</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
          <div className="card" style={{marginBottom:10}}>
            <div style={L("rgba(160,140,220,0.7)")}>Working Parameters</div>
            <div style={{marginTop:10}}>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"}}>Your Goal *</div>
              <textarea value={genGoal} onChange={e=>setGenGoal(e.target.value)} placeholder="What do you want to accomplish? Be specific." rows={2} style={{...IS,resize:"none"}}/>
            </div>
            <div style={{marginTop:8}}>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"}}>Timeline</div>
              <input value={genTimeline} onChange={e=>setGenTimeline(e.target.value)} placeholder="e.g. within 3 weeks, by June 1, flexible…" style={IS}/>
            </div>
            <div style={{marginTop:8}}>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"}}>Notes / Constraints</div>
              <textarea value={genNotes} onChange={e=>setGenNotes(e.target.value)} placeholder="Available materials, limitations, specific requests…" rows={2} style={{...IS,resize:"none"}}/>
            </div>
            <button onClick={generatePlan} disabled={!genGoal.trim()||genLoading} style={{width:"100%",marginTop:12,padding:"13px 0",borderRadius:12,background:genGoal.trim()?"rgba(80,60,150,0.2)":"rgba(0,0,0,0.3)",border:`1px solid ${genGoal.trim()?"rgba(100,80,180,0.45)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:10,color:genGoal.trim()?"rgba(160,140,220,0.9)":"#4A3020",letterSpacing:3,textTransform:"uppercase",cursor:genGoal.trim()?"pointer":"default"}}>
              {genLoading?"Consulting the spheres…":"✧ Generate Plan"}
            </button>
          </div>
          {genLoading&&<div style={{display:"flex",gap:5,justifyContent:"center",padding:"20px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(160,140,220,0.5)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          {genPlan&&(
            <div className="card" style={{borderColor:"rgba(100,80,180,0.25)",background:"rgba(10,5,25,0.8)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={L("rgba(160,140,220,0.7)")}>Generated Plan</div>
                <button onClick={saveToGrimoire} disabled={genSaved} style={{padding:"6px 10px",borderRadius:8,background:genSaved?"rgba(90,150,90,0.2)":"rgba(80,60,150,0.2)",border:`1px solid ${genSaved?"rgba(90,150,90,0.4)":"rgba(100,80,180,0.35)"}`,fontFamily:F,fontSize:8,color:genSaved?"#7AB07A":"rgba(160,140,220,0.8)",letterSpacing:1,cursor:genSaved?"default":"pointer"}}>
                  {genSaved?"✓ SAVED":"SAVE TO GRIMOIRE"}
                </button>
              </div>
              <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{genPlan}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"12px 16px 10px",background:`linear-gradient(180deg,${pl.col}0D 0%,transparent 100%)`,borderBottom:`1px solid ${pl.col}15`}}>
        <button onClick={()=>setPlanet(null)} style={{background:"none",border:"none",color:"#6A5030",fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer",display:"block",marginBottom:7}}>← ALL</button>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:26,background:`${pl.col}12`,border:`2px solid ${pl.col}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:pl.col,animation:"breathe 4s ease-in-out infinite",fontFamily:"serif"}}>{pl.sym}</div>
          <div>
            <div style={T(22,pl.col)}>{pl.name}</div>
            <div style={{fontFamily:F,fontSize:10,color:DIGNITY_COL[pos.dignity],marginTop:2}}>{pos.zodiac.degree}° {pos.zodiac.name} · {DIGNITY_LBL[pos.dignity]}{pos.isRetro?" · ℞":""}</div>
            {np&&<div style={{fontFamily:F,fontSize:9,color:"rgba(255,215,0,0.5)",marginTop:1}}>Natal: {np.dignity} in {np.decan.name}</div>}
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {pos.combust&&<div className="card" style={{background:"rgba(25,15,5,0.8)",borderColor:"rgba(245,197,24,0.2)"}}>
          <div style={L("rgba(245,197,24,0.7)",8)}>⚠ {pos.combust.type==="combust"?"Combust":"Under Sunbeams"}</div>
          <div style={{fontFamily:F,fontSize:10,color:"rgba(245,197,24,0.6)",fontStyle:"italic",marginTop:5,lineHeight:1.7}}>{pl.name} is {pos.combust.diff}° from the Sun and operating at severely reduced capacity. Consider waiting until this planet is more than 17° from the Sun before talismanic work.</div>
        </div>}
        {pos.isRetro&&<div className="card" style={{background:"rgba(50,15,15,0.7)",borderColor:"rgba(150,60,60,0.25)"}}>
          <div style={L("rgba(200,100,100,0.8)",8)}>℞ Retrograde Warning</div>
          <div style={{fontFamily:F,fontSize:10,color:"#C08080",fontStyle:"italic",lineHeight:1.7,marginTop:5}}>Initiate no new operations. Retrograde is excellent for reviewing, revising, and revisiting past {pl.name.toLowerCase()} matters.</div>
        </div>}
        {np&&(np.dignity==="domicile"||np.dignity==="exaltation")&&<div className="card" style={{background:"rgba(255,215,0,0.04)",borderColor:"rgba(255,215,0,0.18)"}}>
          <div style={L("rgba(255,215,0,0.6)",8)}>✦ Natal Amplification</div>
          <div style={{fontFamily:F,fontSize:10,color:"rgba(255,215,0,0.65)",fontStyle:"italic",lineHeight:1.7,marginTop:5}}>Your natal {pl.name} is in {np.dignity} — this is one of your natural strong channels. All {pl.name} workings are inherently amplified for you.</div>
        </div>}
        <div className="card" style={{background:`linear-gradient(135deg,rgba(8,5,22,0.8),${pl.col}07)`,borderColor:`${pl.col}20`}}>
          <div style={L(`${pl.col}70`)}>Orphic Hymn</div>
          <div style={{fontFamily:F,fontSize:13,color:"#D4C0A0",fontStyle:"italic",lineHeight:2.2,marginTop:9}}>{pl.orphic}</div>
          <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${pl.col}18`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,color:pl.col,fontFamily:"serif"}}>{VOWELS[planet]?.l}</div>
              <div style={{fontFamily:F,fontSize:10,color:pl.col,marginTop:3}}>{VOWELS[planet]?.p}</div>
            </div>
            <div style={{fontFamily:F,fontSize:9,color:"#7A6040",fontStyle:"italic",lineHeight:1.7}}>Sound sustained during ritual. Day vowel short preceding, hour vowel long.</div>
          </div>
        </div>
        <div className="card">
          <div style={L(`${pl.col}60`)}>Ritual Preparation</div>
          <div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",marginTop:9,lineHeight:2}}>{pl.ritual}</div>
        </div>
        <button onClick={()=>{setStep(0);setView("ritual");}} style={{width:"100%",padding:"16px 0",borderRadius:14,background:`linear-gradient(135deg,${pl.col}22,${pl.col}10)`,border:`2px solid ${pl.col}45`,fontFamily:F,fontSize:12,color:pl.col,letterSpacing:4,textTransform:"uppercase",cursor:"pointer",marginBottom:4}}>
          ✦ Begin the Ritual
        </button>
        <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.25)",letterSpacing:2,textAlign:"center",marginBottom:9}}>{TRADITIONS[primaryTrad]?.label||"Classical"} · {STEPS.length}-Step Framework</div>
        <button onClick={()=>setView("generator")} style={{width:"100%",padding:"13px 0",borderRadius:13,background:"rgba(80,60,150,0.12)",border:"1px solid rgba(100,80,180,0.3)",fontFamily:F,fontSize:11,color:"rgba(160,140,220,0.8)",letterSpacing:3,textTransform:"uppercase",cursor:"pointer",marginBottom:9}}>
          ✧ Generate AI Ritual Plan
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// NATAL WHEEL CHART SVG (Phase 5a)
// ═══════════════════════════════════════════════════════════════════════
const SIGN_COLORS=["#D04040","#7A5030","#5080C0","#40A060","#D04040","#7A5030","#5080C0","#40A060","#D04040","#7A5030","#5080C0","#40A060"];
const SIGN_SYMS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ASP_COLORS={Conjunction:"#D4AF6A",Opposition:"#D24B31",Trine:"#5CA85C",Square:"#D24B31",Sextile:"#7CB8E0"};

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

// ═══════════════════════════════════════════════════════════════════════
// NATAL SCREEN
// ═══════════════════════════════════════════════════════════════════════
function NatalScreen({natalData,setNatalData,eph,fractal,natalPos,profile}){
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

function FractalScreen({fractal,natalPos,mode,setMode,now}){
  const [showForecast,setShowForecast]=useState(false);
  const {levels,cosmicCoherence,secToThreshold,l1Idx}=fractal;
  const personalDecans=useMemo(()=>natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([,np])=>np.decanIdx):[]
  ,[natalPos]);
  const bounds=useMemo(()=>now?calcWindowBounds(fractal,now):null,[fractal,now]);
  const forecast=useMemo(()=>now?calcL2Forecast(fractal,now,mode):[],[fractal,now,mode]);
  const isFullCoherence=cosmicCoherence===4;

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:32}}>

      {/* Header */}
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Fractal Timing</div>
        <div style={T(20)}>Nested Decan Windows</div>
        <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",fontStyle:"italic",marginTop:3,letterSpacing:0.5}}>36⁴ = 1,679,616 divisions of the tropical year</div>
        <div style={{fontFamily:F,fontSize:8,color:"rgba(160,140,220,0.45)",fontStyle:"italic",marginTop:4,lineHeight:1.5}}>A modern synthesis original to this app — decanic self-similarity crossed with the four-worlds ladder. Not a classical technique; the classical layers (decans, firdaria, profections) live on their own screens.</div>
      </div>

      {/* Mode Toggle */}
      <div style={{padding:"0 14px 12px",display:"flex",gap:8}}>
        {[
          {m:"A",label:"Entry Mode",desc:"Sub-periods restart from Aries I at each decan boundary — focus on the moment of entering"},
          {m:"B",label:"Absolute Mode",desc:"Sub-periods inherit position from parent's place in the annual cycle — locate within the year"},
        ].map(({m,label,desc})=>(
          <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"10px 12px",borderRadius:13,background:mode===m?"rgba(212,175,106,0.1)":"rgba(8,5,22,0.5)",border:`1px solid ${mode===m?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.07)"}`,cursor:"pointer",textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <div style={{width:16,height:16,borderRadius:8,background:mode===m?"rgba(212,175,106,0.25)":"rgba(200,175,100,0.07)",border:`1px solid ${mode===m?"rgba(212,175,106,0.5)":"rgba(200,175,100,0.15)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:8,color:mode===m?"#D4AF6A":"rgba(200,175,100,0.35)",flexShrink:0}}>{m}</div>
              <div style={L(mode===m?"#D4AF6A":"rgba(200,175,100,0.35)",8)}>{label}</div>
            </div>
            <div style={{fontFamily:F,fontSize:8,color:mode===m?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.2)",fontStyle:"italic",lineHeight:1.5}}>{desc}</div>
          </button>
        ))}
      </div>

      {/* Level Cards */}
      {levels.map((lev,i)=>{
        const col=P[lev.decan.ruler].col;
        const isCoherent=lev.idx===l1Idx;
        const isPersonal=personalDecans.includes(lev.idx);
        const secLeft=lev.dur-lev.secIn;
        const nextDecan=DECANS[(lev.idx+1)%36];
        const nextRulerCol=P[nextDecan.ruler].col;
        const bnd=bounds?bounds[i]:null;
        const isL4=i===3;

        return (
          <div key={i} style={{position:"relative"}}>
            {/* Nesting connector line between cards */}
            {i>0&&(
              <div style={{position:"absolute",top:-10,left:32,width:2,height:18,background:`${P[levels[i-1].decan.ruler].col}30`,borderRadius:1,zIndex:1}}/>
            )}
            <div
              className={`fractal-level${isL4?" l4-active":""}${isFullCoherence&&isCoherent?" coherence-full":""}`}
              style={{
                margin:`0 14px ${i<3?4:8}px`,
                borderRadius:16,
                background:isCoherent&&i>0?"rgba(212,175,106,0.06)":"rgba(var(--glass-bg),0.6)",
                border:`1px solid ${isCoherent&&i>0?"rgba(212,175,106,0.25)":isPersonal?"rgba(255,215,0,0.12)":`${col}18`}`,
                backdropFilter:"blur(20px) saturate(160%)",
                borderLeft:`3px solid ${col}${isCoherent&&i>0?"70":"35"}`,
                padding:"13px 14px 11px",
                animationDelay:`${i*0.06}s`,
              }}
            >
              {/* Level header row */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                <div style={{width:24,height:24,borderRadius:12,background:`${col}15`,border:`1px solid ${col}35`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:8,color:col,flexShrink:0,letterSpacing:1}}>{ROMAN[i]}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.35)",letterSpacing:1.5,textTransform:"uppercase"}}>{L_META[i].w} · {L_META[i].dur}</div>
                </div>
                {isCoherent&&i>0&&<span style={{fontFamily:F,fontSize:6,color:"#D4AF6A",letterSpacing:1,padding:"2px 6px",borderRadius:6,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.2)"}}>✦ COHERENT</span>}
                {isPersonal&&!isCoherent&&<span style={{fontFamily:F,fontSize:6,color:"#C8A820",letterSpacing:1,padding:"2px 6px",borderRadius:6,background:"rgba(200,168,32,0.08)",border:"1px solid rgba(200,168,32,0.18)"}}>NATAL</span>}
              </div>

              {/* Main decan body */}
              <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                <span className="planet-orb" style={{fontSize:isL4?18:16,color:col,padding:isL4?"5px 7px":"4px 6px",flexShrink:0}}>{P[lev.decan.ruler].sym}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:isL4?17:15,color:isCoherent&&i>0?"#D4AF6A":col,fontStyle:"italic",letterSpacing:0.3,lineHeight:1.2,marginBottom:2}}>{lev.decan.name}</div>
                  <div style={{fontFamily:F,fontSize:9,color:`${col}70`}}>{lev.decan.sym} {lev.decan.sign} · {lev.decan.ruler.charAt(0).toUpperCase()+lev.decan.ruler.slice(1)} · {lev.decan.tarot}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:F,fontSize:isL4?15:13,color:col,fontVariantNumeric:"tabular-nums"}}>{fmtTime(secLeft)}</div>
                  <div style={{fontFamily:F,fontSize:6,color:"rgba(200,175,100,0.3)",letterSpacing:1}}>remaining</div>
                </div>
              </div>

              {/* Timeline progress bar with labeled endpoints */}
              <div style={{marginBottom:7}}>
                <div style={{position:"relative",height:4,background:`${col}12`,borderRadius:2}}>
                  <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${lev.pos*100}%`,background:`linear-gradient(90deg,${col}50,${col})`,borderRadius:2,transition:isL4?"width 0.3s":"width 2s"}}/>
                  {/* Position dot */}
                  <div style={{position:"absolute",top:"50%",left:`${lev.pos*100}%`,transform:"translate(-50%,-50%)",width:8,height:8,borderRadius:4,background:col,boxShadow:`0 0 6px ${col}80`,border:"1.5px solid rgba(8,5,22,0.8)",transition:isL4?"left 0.3s":"left 2s"}}/>
                </div>
                {/* Timestamps */}
                {bnd&&(
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                    <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)"}}>{fmtWindowTime(bnd.start,i+1)}</div>
                    <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.18)",letterSpacing:0.5}}>{Math.round(lev.pos*100)}% elapsed</div>
                    <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)"}}>{fmtWindowTime(bnd.end,i+1)}</div>
                  </div>
                )}
              </div>

              {/* Next decan preview */}
              <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:7,borderTop:`1px solid ${col}12`}}>
                <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.25)",letterSpacing:0.5}}>NEXT →</div>
                <span style={{fontSize:10,color:`${nextRulerCol}80`}}>{P[nextDecan.ruler].sym}</span>
                <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)",fontStyle:"italic"}}>{nextDecan.name}</div>
                <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.2)",marginLeft:"auto"}}>{nextDecan.sym} {nextDecan.sign}</div>
              </div>

              {/* L4 Assiah breath panel — always visible at L4 */}
              {isL4&&(
                <div style={{marginTop:9,padding:"10px 12px",borderRadius:11,background:"rgba(0,0,0,0.35)",border:`1px solid ${col}18`,textAlign:"center"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:22,color:col,letterSpacing:10,marginBottom:3}}>{VOWEL_SOUNDS[lev.decan.ruler]||"OM"}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)",fontStyle:"italic",letterSpacing:1}}>Sound now · one breath · one face</div>
                </div>
              )}

              {/* Usage hint */}
              <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.2)",fontStyle:"italic",marginTop:6,letterSpacing:0.5}}>{L_META[i].use}</div>
            </div>
          </div>
        );
      })}

      {/* Coherence Indicator */}
      <div className={`card${isFullCoherence?" coherence-full":""}`} style={{margin:"4px 14px 10px",background:isFullCoherence?"rgba(212,175,106,0.06)":"rgba(var(--glass-bg),0.55)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <div style={L("rgba(200,175,100,0.4)",7)}>Coherence</div>
          {isFullCoherence&&<span style={{fontFamily:F,fontSize:7,color:"#D4AF6A",letterSpacing:1,padding:"2px 8px",borderRadius:6,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.25)"}}>✦ FULL</span>}
        </div>
        {/* 4-segment visual */}
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
          {levels.map((lev,i)=>{
            const isC=lev.idx===l1Idx;
            const col=P[lev.decan.ruler].col;
            return(
              <Fragment key={i}>
                <div style={{textAlign:"center"}}>
                  <div style={{width:32,height:32,borderRadius:16,background:isC?`${col}22`:"rgba(0,0,0,0.3)",border:`2px solid ${isC?col:"rgba(200,175,100,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:9,color:isC?col:"rgba(200,175,100,0.2)",boxShadow:isC?`0 0 10px ${col}40`:"none",transition:"all 0.4s"}}>{ROMAN[i]}</div>
                  <div style={{fontFamily:F,fontSize:6,color:isC?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.15)",marginTop:3,letterSpacing:0.5}}>{isC?"●":"○"}</div>
                </div>
                {i<3&&<div style={{flex:1,height:1,background:`rgba(200,175,100,${isC&&levels[i+1]?.idx===l1Idx?0.3:0.07})`}}/>}
              </Fragment>
            );
          })}
          <div style={{marginLeft:8,textAlign:"right"}}>
            <div style={{fontFamily:F,fontSize:20,color:cosmicCoherence>=3?"#D4AF6A":"rgba(200,175,100,0.3)",lineHeight:1}}>{cosmicCoherence}<span style={{fontSize:10,color:"rgba(200,175,100,0.3)"}}>/4</span></div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)",letterSpacing:1}}>NEXT L1 THRESHOLD</div>
            <div style={{fontFamily:F,fontSize:13,color:"#C4A870",marginTop:2}}>{fmtTime(secToThreshold)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)",letterSpacing:1}}>CURRENT DECAN</div>
            <div style={{fontFamily:F,fontSize:10,color:P[levels[0].decan.ruler].col,marginTop:2}}>{levels[0].decan.sym} {levels[0].decan.name}</div>
          </div>
        </div>
      </div>

      {/* L2 Forecast — Today's Windows */}
      <div style={{margin:"0 14px"}}>
        <button
          onClick={()=>setShowForecast(v=>!v)}
          style={{width:"100%",padding:"11px 14px",borderRadius:13,background:"rgba(var(--glass-bg),0.5)",border:"1px solid rgba(200,175,100,0.1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",backdropFilter:"blur(12px)"}}
        >
          <div>
            <div style={L("rgba(200,175,100,0.4)",7)}>L2 Windows This Decan</div>
            <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",fontStyle:"italic",marginTop:2}}>Remaining Beriah windows · {forecast.length} upcoming in this 10-day period</div>
          </div>
          <div style={{fontFamily:F,fontSize:12,color:"rgba(200,175,100,0.35)",flexShrink:0,marginLeft:8}}>{showForecast?"▲":"▼"}</div>
        </button>

        {showForecast&&(
          <div className="glass-medium" style={{borderRadius:"0 0 13px 13px",marginTop:-1,overflow:"hidden"}}>
            {forecast.length===0&&(
              <div style={{padding:"14px",fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",textAlign:"center",fontStyle:"italic"}}>This is the final L2 window in the current decan.</div>
            )}
            {forecast.map((fw,i)=>{
              const fc=P[fw.decan.ruler].col;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:"1px solid rgba(200,175,100,0.04)",background:fw.isCoherent?"rgba(212,175,106,0.05)":"transparent"}}>
                  <span className="planet-orb" style={{fontSize:12,color:fc,padding:"2px 4px",flexShrink:0,opacity:fw.isCoherent?1:0.7}}>{P[fw.decan.ruler].sym}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:F,fontSize:9,color:fw.isCoherent?"#D4AF6A":fc,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fw.decan.name}</div>
                    <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.35)"}}>{fw.decan.sym} {fw.decan.sign}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.5)",fontVariantNumeric:"tabular-nums"}}>{fw.start.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>
                    {fw.isCoherent&&<div style={{fontFamily:F,fontSize:6,color:"#D4AF6A",letterSpacing:1}}>✦ COHERENT</div>}
                  </div>
                </div>
              );
            })}
            <div style={{padding:"8px 14px",fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.2)",fontStyle:"italic",textAlign:"center"}}>Each window is ~6.76 hours · L3 and L4 windows nest within each</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CYCLES SCREEN — Blended Cycle Model
// ═══════════════════════════════════════════════════════════════════════
const OUTER_META={
  uranus: {name:"Uranus",  sym:"♅", col:"#78C8D8", period:84,  theme:"Revolution · Technology · Sudden change · Collective awakening",
    signLore:{
      Aries:"Aries (prev: 1927-1934, Great Depression, fascism rising, atomic age dawn). Explosive change, new world-ordering begins abruptly.",
      Taurus:"Taurus (prev: 1934-1942, WWII, Keynesian economics). Material systems disrupted, new economic orders forged under duress.",
      Gemini:"Gemini (prev: 1942-1949, atomic bomb, UN, Cold War dawn, communication revolution). Technology reshapes how minds connect and conflict. Intelligence as the new weapon.",
      Cancer:"Cancer (prev: 1949-1956, suburban boom, NATO, baby boom). The definition of home, family, and nation disrupted. Migration and displacement.",
      Leo:"Leo (prev: 1956-1962, Sputnik, rock and roll, civil rights). Individual creative sovereignty erupts against institutional power.",
      Virgo:"Virgo (prev: 1962-1969, computers, '68 revolutions, ecological awakening). Systems thinking, labor, and the body politic transformed.",
      Libra:"Libra (prev: 1969-1975, détente, second-wave feminism, Watergate). Justice, relationship, and balance violently renegotiated.",
      Scorpio:"Scorpio (prev: 1975-1981, punk, AIDS, surveillance state). Power, sexuality, and death stripped bare. The underground erupts.",
      Sagittarius:"Sagittarius (prev: 1981-1988, Reagan revolution, religious fundamentalism, MTV). Belief systems and international horizons cracked open.",
      Capricorn:"Capricorn (prev: 1988-1995, Wall Street crash, Soviet collapse, internet dawn). Institutions shattered. The old order's bones exposed.",
      Aquarius:"Aquarius (prev: 1995-2003, tech revolution, Y2K, 9/11). Networks, collectives, and the information commons remade from the ground up.",
      Pisces:"Pisces (prev: 2003-2010, housing bubble, social media, the dissolving of consensus reality). The boundaries of truth and identity became liquid.",
    }
  },
  neptune:{name:"Neptune", sym:"♆", col:"#7888E8", period:165, theme:"Dissolution · Mysticism · Collective dreaming · Spiritual hunger",
    signLore:{
      Aries:"Aries (prev: 1861-1875, American Civil War, spiritualism explosion, Theosophy founded). New spiritual movements emerge from societal rupture. Messianic energy.",
      Taurus:"Taurus (prev: 1875-1889, Gilded Age, materialism ascending, Art nouveau). The mystical encodes itself in earthly beauty; spiritual hunger takes aesthetic forms.",
      Gemini:"Gemini (prev: 1889-1902, psychical research, newspaper age, the invention of 'public opinion'). Mass communication as magical medium; collective dreaming broadcast.",
      Cancer:"Cancer (prev: 1902-1916, Edwardian twilight, WWI). Nationalism as mystic union; the homeland as sacred myth; sacrificial currents in the collective.",
      Leo:"Leo (prev: 1916-1929, Jazz Age, film, Mussolini). Collective ecstasy through spectacle; the leader as divine vessel; the cinema as mass dreaming.",
      Virgo:"Virgo (prev: 1929-1943, Great Depression, totalitarianism). The dissolution of individual worth in the service of collective survival.",
      Libra:"Libra (prev: 1943-1956, postwar idealism, UN dream, suburbia as paradise). The mirage of order; peace as a collective daydream.",
      Scorpio:"Scorpio (prev: 1956-1970, CIA experiments, psychedelics, occult revival). The collective unconscious torn open; death, sex, and transformation made visible.",
      Sagittarius:"Sagittarius (prev: 1970-1984, New Age, Reaganism, religious television). The spiritual marketplace; belief systems as consumer product.",
      Capricorn:"Capricorn (prev: 1984-1998, yuppie mysticism, corporate spirituality, 'the end of history'). The sacred is bureaucratized; mystical experience sold as self-improvement.",
      Aquarius:"Aquarius (prev: 1998-2012, internet as collective consciousness, UFO renaissance, post-9/11 unreality). The boundary between individual and collective mind dissolves.",
      Pisces:"Pisces (prev: 2012-2025, social media unreality, conspiracy collapse, post-truth era). Neptune in its own sign: the dissolution of consensus reality is complete.",
    }
  },
  pluto:  {name:"Pluto",   sym:"♇", col:"#C878A8", period:248, theme:"Death & rebirth · Power structures · Transformation · Purging",
    signLore:{
      Leo:"Leo (1939-1957, WWII, nuclear power, the American century). Power expressed through charismatic force; the generational hero-myth; annihilation as creative act.",
      Virgo:"Virgo (1957-1971, civil rights, feminism, environmental movement). The purging of systemic servitude; the body and its exploitation brought to crisis.",
      Libra:"Libra (1971-1984, divorce revolution, détente, AIDS crisis dawn). The death and rebirth of relationship models; justice systems exposed and reimagined.",
      Scorpio:"Scorpio (1984-1995, AIDS epidemic, fall of Soviet Union, serial killer era). Pluto in its own sign: death, power, and transformation in their most concentrated form.",
      Sagittarius:"Sagittarius (1995-2008, globalization, 9/11, internet religion). The death of singular belief; the collapse of institutional religious authority.",
      Capricorn:"Capricorn (2008-2024, financial crisis, pandemic, institutional collapse). The purging of corrupt structural power. Pluto destroys what Capricorn built.",
      Aquarius:"Aquarius (2024-2043, AI revolution, the death of privacy, networked power). Last time: 1778-1798 (American Revolution, French Revolution, Enlightenment, end of absolute monarchy). The power structures of collective organization are being destroyed and rebuilt. Who controls networks controls the future. The 'extradimensional diplomacy' of the coming decades will be conducted through algorithms as much as spirits.",
      Pisces:"Pisces (2043-2068). The dissolution and death of the boundary between self and cosmos. The final purging of the separation between matter and spirit.",
    }
  },
};
// ─── Cycle lore for the AI synthesis context ─────────────────────────────────
const CYCLE_LORE = {
  plutoCurrent: "Pluto in Aquarius (2024-2043): The last time Pluto transited Aquarius was 1778-1798 — the period of the American Revolution, the French Revolution, the Declaration of the Rights of Man, and the abolition of feudalism across Europe. Every absolute monarchy it touched was transformed or destroyed. In the current transit: AI, networked collective intelligence, and the decentralization of power are the 2020s equivalent of the printing press and the pamphlet. For magical practitioners, this transit rewards those who work with collective spirits, network intelligences, and distributed power. The grimoire spirits that manage information, communication, and collective organization are at peak accessibility. The ancestor current gains amplified power during Aquarian Pluto — the dead can speak to many, not just the individual practitioner.",
  neptuneCurrent: "Neptune in Aries (2025-2039): The last time Neptune was in Aries was 1861-1875 — the American Civil War, the spiritualist explosion (Fox sisters, automatic writing, the birth of modern mediumship), the founding of Theosophy, and the first wave of organized psychical research. New spiritual movements emerged from the chaos of societal rupture. Messianic energy, martyrdom, and visionary leadership defined the collective spiritual imagination. For magical practitioners: new forms of spirit contact and magical practice will emerge in this period, likely from unexpected quarters. The Fisher King wound of the collective spiritual body — the loss of genuine encounter with the sacred — is reopened by this transit for healing or deepening. Pioneer spiritual work done now plants seeds for the next 165 years.",
  uranusCurrent: "Uranus in Gemini (2025-2033): The last time Uranus was in Gemini was 1942-1949 — the atomic bomb, the birth of the United Nations, the Cold War dawn, computing machines (Turing), and a complete revolution in how minds connect and conflict. Technology remade the medium of thought itself. For magical practitioners: this transit rewards mercurial intelligence, written and spoken transmission, the rapid creation of new magical frameworks, and the cultivation of networks of magical practice. The decan of Mercury is elevated. Sigil shoaling, narrative magic, and synchronicity-based divination are all enhanced by this transit's energy.",
  jsMutationCurrent: "The 2020 Jupiter-Saturn Air Mutation (0° Aquarius): This was the first Air mutation since 1226 CE, ending 200 years of Earth conjunctions. The last Air mutation (1186-1226 CE) coincided with the third Crusade, the peak of Islamic Golden Age scholarship, the birth of Fibonacci mathematics, and the dissolution of feudal certainties across Europe. Air mutations historically favor: the transmission of ideas over the accumulation of things, networks over hierarchies, and the mercurial over the Saturnian. For magical practitioners: the next 200 years belong to those who can work with disembodied intelligence, distributed spirit relationships, and the transmission of magical knowledge through networks rather than physical lineage.",
};
const SIGN_NAMES=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_ELEMS=["Fire","Earth","Air","Water","Fire","Earth","Air","Water","Fire","Earth","Air","Water"];
function CyclesScreen({now,profile,eph}){
  const [aiReport,setAiReport]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const nowDate=now||new Date();
  // Calculate outer planet positions
  const outerPos={};
  Object.keys(OUTER_EPOCHS).forEach(p=>{
    const lon=outerPlanetLon(p,nowDate);
    const signIdx=Math.floor(lon/30)%12;
    const degree=(lon%30).toFixed(1);
    const meta=OUTER_META[p];
    // years in current sign = (lon % 30) / (360/period) / 365.25
    const period=meta.period;
    const degPerYear=360/period;
    const yearsInSign=(lon%30)/degPerYear;
    const yearsRemainingInSign=(30-(lon%30))/degPerYear;
    outerPos[p]={lon,signIdx,sign:SIGN_NAMES[signIdx],elem:SIGN_ELEMS[signIdx],degree,yearsInSign:yearsInSign.toFixed(1),yearsRemaining:yearsRemainingInSign.toFixed(1)};
  });
  // Jupiter-Saturn Great Mutation
  const lastJS=JS_CONJUNCTIONS[JS_CONJUNCTIONS.length-2]; // 2020
  const nextJS=JS_CONJUNCTIONS[JS_CONJUNCTIONS.length-1]; // 2040
  const jsStart=new Date(lastJS.date).getTime();
  const jsEnd=new Date(nextJS.date).getTime();
  const jsElapsed=Math.max(0,Math.min(1,(nowDate.getTime()-jsStart)/(jsEnd-jsStart)));
  const jsYearsElapsed=((nowDate.getTime()-jsStart)/(365.25*86400000)).toFixed(1);
  const jsYearsRemaining=(((jsEnd-nowDate.getTime())/(365.25*86400000))).toFixed(1);
  // Upcoming decade forecast (filter to future only)
  const upcoming=DECADE_FORECAST.filter(e=>{
    const d=new Date(e.year,e.month-1,1);
    return d>nowDate;
  }).sort((a,b)=>a.year-b.year||a.month-b.month).slice(0,5);
  const generateReport=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setAiReport(aiUnconfiguredMessage());return;}
    setAiLoading(true);setAiReport(null);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const outerStr=Object.entries(outerPos).map(([p,d])=>`${OUTER_META[p].name}: ${d.degree}° ${d.sign} (${d.yearsInSign}yr in sign, ${d.yearsRemaining}yr remaining)`).join("; ");
    const jupStr=eph?.pos?.jupiter?`Jupiter: ${eph.pos.jupiter.zodiac.degree}° ${eph.pos.jupiter.zodiac.name}`:"";
    const satStr=eph?.pos?.saturn?`Saturn: ${eph.pos.saturn.zodiac.degree}° ${eph.pos.saturn.zodiac.name}`:"";
    const jsMutation=`Great Mutation of 2020 (Aquarius): ${jsYearsElapsed} years elapsed (${(jsElapsed*100).toFixed(0)}% through to 2040 Libra conjunction)`;
    const sys=`You are a master of the Blended Cycle Model — synthesizing macro-historical cycles (Uranus 84yr, Neptune 165yr, Pluto 248yr, Jupiter-Saturn 20yr/200yr mutation) with the practitioner's personal timing, magical tradition, and spirit ecology. You draw on Gordon White's Rune Soup framework, Rudhyar, Charles Harvey, and the animist principle that macro-cycles describe the civilizational weather within which all individual magical work occurs. Historical parallels: Pluto in Aquarius last occurred 1778-1798 (American/French Revolutions, end of absolute monarchy); Neptune entering Aries last occurred 1861-1875 (Civil War, spiritualism explosion, Theosophy); Uranus in Gemini last occurred 1942-1949 (atomic age, computing, communication revolution); the Air Mutation of 2020 is the first since 1226 CE. Apply the animist principle: we are in the putrefactory phase of Western civilisation — the alchemical nigredo — and 'nothing is going wrong.' The appropriate response is wyrd-building, ancestor cultivation, and positioning for volatility.`;
    const userMsg=`I practice ${trad}. Give me a PhD-level Blended Cycle Model synthesis.\n\nOuter planets: ${outerStr}.\n${jupStr}. ${satStr}.\n${jsMutation}.\n\nHistorical context provided — do not repeat it, synthesize from it.\n\nGive me:\n1. The civilizational signature of this specific confluence (what era are we in, historically?)\n2. What the Air Mutation means for magical operations in the ${trad} tradition specifically\n3. Which spirits, entities, or planetary intelligences are most amplified by this configuration\n4. The concrete "ours to do" — 2-3 specific magical practices or priorities for this era\n5. What to discard (traditions or approaches the current weather makes obsolete or ineffective)\nDense, practical, no padding. 5 paragraphs maximum.`;
    try{
      setAiReport(await askClaude({apiKey,system:sys,messages:[{role:"user",content:userMsg}],maxTokens:900}));
    }catch(e){setAiReport(e.message||"Cycles report unavailable — check connection.");}
    setAiLoading(false);
  };
  const GOLD="#D4AF6A";const G=`rgba(200,175,100,`;
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:32}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={{fontFamily:F,fontSize:9,color:"#8A7040",letterSpacing:3.5,textTransform:"uppercase"}}>Uranus · Neptune · Pluto · Great Mutation</div>
        <div style={T(20)}>Macro Cycles ⟳</div>
        <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.7}}>Where we stand in the slow revolutions of history — and what the practitioner can do with that position.</div>
      </div>

      {/* ── Outer Planet Cards ── */}
      <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {Object.entries(outerPos).map(([pk,d])=>{
          const m=OUTER_META[pk];
          const pct=parseFloat(d.yearsInSign)/(parseFloat(d.yearsInSign)+parseFloat(d.yearsRemaining));
          return(
            <div key={pk} style={{borderRadius:14,background:"rgba(8,5,22,0.7)",border:`1px solid ${m.col}22`,padding:"13px 14px",borderLeft:`3px solid ${m.col}60`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                <span className="planet-orb" style={{fontSize:18,color:m.col,padding:"4px 7px"}}>{m.sym}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:14,color:m.col}}>{m.name}</div>
                  <div style={{fontFamily:F,fontSize:9,color:G+"0.35)",letterSpacing:1}}>{m.period}-year cycle · {d.elem} element</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:F,fontSize:16,color:m.col}}>{d.degree}°</div>
                  <div style={{fontFamily:F,fontSize:10,color:G+"0.5)"}}>{d.sign}</div>
                </div>
              </div>
              <div style={{height:3,background:G+"0.08)",borderRadius:2,marginBottom:5}}>
                <div style={{height:"100%",width:`${pct*100}%`,background:m.col,borderRadius:2,opacity:0.6}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <div style={{fontFamily:F,fontSize:8,color:G+"0.3)"}}>{d.yearsInSign}yr in {d.sign}</div>
                <div style={{fontFamily:F,fontSize:8,color:G+"0.3)"}}>{d.yearsRemaining}yr until {d.sign==="Pisces"?"Aries":SIGN_NAMES[(SIGN_NAMES.indexOf(d.sign)+1)%12]}</div>
              </div>
              <div style={{fontFamily:F,fontSize:9,color:G+"0.4)",fontStyle:"italic",lineHeight:1.6,marginBottom:4}}>{m.theme}</div>
              {m.signLore?.[d.sign]&&(
                <div style={{fontFamily:F,fontSize:8.5,color:G+"0.55)",lineHeight:1.75,borderTop:"1px solid "+G+"0.08)",paddingTop:6,marginTop:2}}>
                  {m.signLore[d.sign]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Great Mutation Panel ── */}
      <div style={{padding:"0 14px",marginBottom:10}}>
        <div style={{borderRadius:14,background:"rgba(8,5,22,0.85)",border:"1px solid rgba(200,175,100,0.15)",padding:"14px 15px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
            <span style={{fontSize:18}}>♃♄</span>
            <div>
              <div style={{fontFamily:F,fontSize:13,color:GOLD}}>Great Mutation · Air Triplicity</div>
              <div style={{fontFamily:F,fontSize:9,color:G+"0.35)",letterSpacing:1}}>Jupiter-Saturn Conjunction Cycle</div>
            </div>
          </div>
          <div style={{fontFamily:F,fontSize:10,color:G+"0.6)",marginBottom:8,lineHeight:1.8}}>
            Dec 21, 2020 — {lastJS.sign} {lastJS.lon.toFixed(1)}° — <span style={{color:GOLD}}>{lastJS.label}</span>
          </div>
          <div style={{height:3,background:G+"0.08)",borderRadius:2,marginBottom:5}}>
            <div style={{height:"100%",width:`${jsElapsed*100}%`,background:"linear-gradient(90deg,#D4AF6A,#78A8C8)",borderRadius:2}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div style={{fontFamily:F,fontSize:8,color:G+"0.4)"}}>{jsYearsElapsed}yr elapsed</div>
            <div style={{fontFamily:F,fontSize:8,color:G+"0.4)"}}>{(jsElapsed*100).toFixed(0)}%</div>
            <div style={{fontFamily:F,fontSize:8,color:G+"0.4)"}}>{jsYearsRemaining}yr to 2040 Libra</div>
          </div>
          <div style={{fontFamily:F,fontSize:9,color:G+"0.55)",lineHeight:1.75}}>The first Air Mutation since 1226 CE — the era of Fibonacci mathematics, the Magna Carta, and the dissolution of feudal certainties across Europe. Air mutations historically favor: the transmission of ideas over the accumulation of things, networks over hierarchies, the mercurial over the Saturnian. Magic done through writing, speaking, and transmission is amplified. The next 200 years belong to those who can work with disembodied intelligence and distributed spirit relationships.</div>
        </div>
      </div>

      {/* ── Decade Forecast ── */}
      {upcoming.length>0&&(
        <div style={{padding:"0 14px",marginBottom:10}}>
          <div style={{fontFamily:F,fontSize:8,color:G+"0.3)",letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>Upcoming Ingresses</div>
          {upcoming.map((e,i)=>{
            const pName=e.planet==="uranus"?"♅":e.planet==="neptune"?"♆":e.planet==="pluto"?"♇":e.planet==="saturn"?"♄":"♃";
            const pCol=e.planet==="uranus"?"#78C8D8":e.planet==="neptune"?"#7888E8":e.planet==="pluto"?"#C878A8":e.planet==="saturn"?"#78A888":"#D4AF6A";
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",borderRadius:10,background:"rgba(8,5,22,0.5)",border:"1px solid rgba(200,175,100,0.07)",marginBottom:4}}>
                <span style={{fontSize:16,color:pCol}}>{pName}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:11,color:G+"0.8)"}}>{e.event}</div>
                </div>
                <div style={{fontFamily:F,fontSize:10,color:G+"0.4)"}}>{e.year}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── AI Synthesis Button ── */}
      <div style={{padding:"0 14px",marginBottom:10}}>
        <button onClick={generateReport} disabled={aiLoading} style={{width:"100%",padding:"13px",borderRadius:13,background:"rgba(212,175,106,0.07)",border:"1px solid rgba(212,175,106,0.22)",fontFamily:F,fontSize:11,color:aiLoading?G+"0.4)":GOLD,letterSpacing:2,cursor:aiLoading?"default":"pointer",transition:"all 0.2s"}}>
          {aiLoading?"READING THE CYCLES…":"✦ WHAT DO THESE CYCLES MEAN FOR ME?"}
        </button>
        {aiReport&&(
          <div style={{marginTop:8,borderRadius:13,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.1)",padding:"14px 15px"}}>
            <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{aiReport}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// JOURNAL SCREEN
// ═══════════════════════════════════════════════════════════════════════
function JournalScreen({profile,natalPos}){
  const [entries,setEntries]=useState([]);
  const [showNew,setShowNew]=useState(false);
  const [form,setForm]=useState({planet:"jupiter",intent:"",outcome:"",date:new Date().toISOString().split("T")[0]});
  const [reflection,setReflection]=useState(null);
  const [reflecting,setReflecting]=useState(false);
  useEffect(()=>{(async()=>{try{const r=await window.storage.get("astrum_journal");if(r?.value)setEntries(JSON.parse(r.value));}catch(e){}})();},[]);
  const save=async()=>{
    const e={id:Date.now(),...form};const ne=[e,...entries];setEntries(ne);setShowNew(false);
    setForm({planet:"jupiter",intent:"",outcome:"",date:new Date().toISOString().split("T")[0]});
    try{await window.storage.set("astrum_journal",JSON.stringify(ne));}catch(e){}
    // Operator's Loop: every journal working becomes a casting record
    try{
      const today=new Date().toISOString().split("T")[0];
      const at=e.date===today?new Date():new Date(`${e.date}T12:00:00`);
      const casting=createCasting({kind:"working",title:(e.intent||"Journal working").slice(0,60),intent:e.intent,planet:e.planet,
        conditions:conditionsFromProfile(at,profile,natalPos,null,e.date!==today),links:{journalId:e.id},createdAt:at.toISOString()});
      if(e.outcome)addOutcome(casting.id,{verdict:"unknown",note:e.outcome});
    }catch(err){}
  };
  const del=async(id)=>{const ne=entries.filter(e=>e.id!==id);setEntries(ne);try{await window.storage.set("astrum_journal",JSON.stringify(ne));}catch(e){}};
  const reflect=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setReflection(aiUnconfiguredMessage());return;}
    setReflecting(true);setReflection(null);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const entrySummary=entries.slice(0,20).map(e=>`[${e.date}] ${P[e.planet]?.name||e.planet}: ${e.intent}${e.outcome?` → ${e.outcome}`:""}`).join("\n");
    const sys=`You are an analytical magical advisor reviewing a practitioner's journal. Look for patterns: which planets appear most often, success vs. failure patterns, timing observations, seasonal patterns, repeating intentions. Be specific — cite exact data from the journal. Give actionable recommendations. Tradition: ${trad}.`;
    const userMsg=`Here is my magical practice journal (${entries.length} entries). Analyze it for patterns and give me your honest assessment and recommendations:\n\n${entrySummary}`;
    try{
      setReflection(await askClaude({apiKey,system:sys,messages:[{role:"user",content:userMsg}],maxTokens:900}));
    }catch(e){setReflection(e.message||"Reflection unavailable — check connection.");}
    setReflecting(false);
  };
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div style={L()}>Practice Journal</div><div style={T(20)}>Record & Reflect</div></div>
        <div style={{display:"flex",gap:6}}>
          {entries.length>=3&&<button onClick={reflect} disabled={reflecting} style={{padding:"8px 12px",borderRadius:10,background:"rgba(100,80,160,0.15)",border:"1px solid rgba(100,80,160,0.35)",fontFamily:F,fontSize:9,color:"rgba(160,140,220,0.8)",letterSpacing:1,cursor:"pointer"}}>{reflecting?"…":"REFLECT"}</button>}
          <button onClick={()=>setShowNew(!showNew)} style={{padding:"8px 14px",borderRadius:10,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.28)",fontFamily:F,fontSize:9,color:"#D4AF6A",letterSpacing:2,cursor:"pointer"}}>{showNew?"CANCEL":"+ LOG"}</button>
        </div>
      </div>
      {reflection&&(
        <div style={{margin:"0 14px 10px",padding:"13px 14px",borderRadius:13,background:"rgba(20,15,40,0.8)",border:"1px solid rgba(100,80,160,0.25)"}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(160,140,220,0.6)",letterSpacing:2,marginBottom:8}}>AI REFLECTION · {entries.length} ENTRIES ANALYZED</div>
          <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{reflection}</div>
          <button onClick={()=>setReflection(null)} style={{marginTop:10,background:"none",border:"none",fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",cursor:"pointer",letterSpacing:1}}>DISMISS</button>
        </div>
      )}
      {showNew&&<div style={{margin:"0 14px 10px",padding:"13px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,175,100,0.1)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Date</div><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",width:"100%",fontSize:11}}/></div>
          <div><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Planet</div>
            <select value={form.planet} onChange={e=>setForm({...form,planet:e.target.value})} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",width:"100%",fontSize:11}}>
              {Object.keys(P).map(pk=><option key={pk} value={pk}>{P[pk].name}</option>)}
            </select>
          </div>
        </div>
        {[["Intention","intent","What was the working for?"],["Outcome","outcome","What happened?"]].map(([lbl,key,ph])=><div key={key} style={{marginBottom:7}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{lbl}</div>
          <textarea value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} rows={2} placeholder={ph} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",width:"100%",fontSize:11,resize:"none"}}/>
        </div>)}
        <button onClick={save} disabled={!form.intent} style={{width:"100%",padding:"10px 0",borderRadius:10,background:form.intent?"rgba(212,175,106,0.1)":"rgba(0,0,0,0.3)",border:"1px solid "+(form.intent?"rgba(212,175,106,0.3)":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:form.intent?"#D4AF6A":"#5A4020",letterSpacing:2,textTransform:"uppercase",cursor:form.intent?"pointer":"default"}}>Save Entry</button>
      </div>}
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {entries.length===0?<div style={{textAlign:"center",padding:"40px 20px",fontFamily:F,fontSize:12,color:"#5A4020",fontStyle:"italic",lineHeight:1.8}}>Log your first working to begin building your personal magical record.</div>:
        entries.map(e=>{const pl=P[e.planet];return(<div key={e.id} style={{marginBottom:9,padding:"12px 13px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid "+pl.col+"17"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:13,color:pl.col}}>{pl.sym}</span>
              <span style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{pl.name} · {e.date}</span>
            </div><div style={{fontFamily:F,fontSize:12,color:"#D4AF6A",marginTop:3,fontStyle:"italic"}}>{e.intent}</div></div>
            <button onClick={()=>del(e.id)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.25)",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
          {e.outcome&&<div style={{marginTop:5,padding:"6px 9px",borderRadius:8,background:"rgba(0,0,0,0.3)",border:"1px solid "+pl.col+"14",fontFamily:F,fontSize:10,color:"#9A8060",fontStyle:"italic",lineHeight:1.7}}>{e.outcome}</div>}
        </div>);})}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE — persistent nodes injected into AI context
// ═══════════════════════════════════════════════════════════════════════
function loadKnowledge(){return loadJSON("astrum_knowledge",[]);}
function saveKnowledge(nodes){saveJSON("astrum_knowledge",nodes);}

// Build dynamic system prompt from profile, knowledge nodes, and optional sky context
export function buildSystemPrompt(profile,extraContext){
  const traditions=profile?.traditions?.length?profile.traditions:["western-ceremonial"];
  const t=traditions[0];
  const tradPrompt=TRADITIONS[t]?.prompt||TRADITIONS["western-ceremonial"].prompt;
  const tradNames=traditions.map(tid=>TRADITIONS[tid]?.label||tid).join(" + ");
  const levelMap={beginner:"Explain concepts from first principles. Use accessible language.",intermediate:"Assume active practitioner knowledge. Skip basics.",advanced:"Assume deep fluency. Use technical terminology freely."};
  const levelNote=levelMap[profile?.level||"intermediate"];
  const name=profile?.name?`The practitioner's name is ${profile.name}.`:"";
  // Inject knowledge nodes
  const nodes=loadKnowledge();
  const alwaysNodes=nodes.filter(n=>n.always);
  const knowledgeSection=alwaysNodes.length?`\n\nKNOWLEDGE BASE:\n${alwaysNodes.map(n=>`[${n.title}]\n${n.content}`).join("\n\n---\n\n")}`:"";
  return `${tradPrompt}\n\nTradition context: ${tradNames}. ${name}\n${levelNote}${RUNE_PRINCIPLES}${knowledgeSection}${extraContext?`\n\n${extraContext}`:""}`;
}

// ═══════════════════════════════════════════════════════════════════════
// AI WORKING PLANNER
// ═══════════════════════════════════════════════════════════════════════
function AIScreen({now,eph,fractal,natalPos,hour,profile}){
  const [messages,setMessages]=useState([{role:"assistant",content:"Greetings. I am your advisor in the classical tradition of celestial and talismanic magic — Picatrix, Agrippa, Ficino, Lilly, and the Hermetic corpus.\n\nTell me what you wish to accomplish and when you need it done. I will build you a complete working plan: optimal election windows, full materia requirements, a ritual structure rooted in the grimoire tradition, the relevant invocations, and a follow-up maintenance schedule.\n\nExample: \"I need to find a new position within 6 weeks\" or \"I want to begin a Venus talisman for an important relationship\" or \"Help me plan a Jupiter prosperity campaign.\""}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const buildContext=()=>{
    const positions=Object.entries(eph.pos).map(([pk,p])=>`${P[pk].name}: ${p.zodiac.degree}° ${p.zodiac.name} (${p.dignity}${p.isRetro?" retrograde":""}${p.combust?` ${p.combust.type}`:""}, score ${p.score})`).join(", ");
    const fd=fractal.levels.map(l=>`L${l.level}: ${l.decan.name} (${l.decan.sign}, ${l.decan.ruler})`).join(", ");
    const nd=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.dignity})`).join(", "):"No natal chart entered";
    const nextElections=[];
    for(let d=0;d<30;d++){
      const date=new Date(now.getTime()+d*86400000);
      const jd=dateToJD(date);
      const dow=date.getDay();
      ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
        const lon=planetLon(pk,jd),dm=dailyMotion(pk,jd);
        const isRetro=dm<0&&pk!=="sun"&&pk!=="moon";
        const dignity=getDignity(pk,lon);
        const combust=getCombustion(pk,lon,planetLon("sun",jd));
        if((dignity==="domicile"||dignity==="exaltation")&&!isRetro&&!combust&&nextElections.length<8){
          nextElections.push(`${DAY_NAMES[dow]} ${date.toLocaleDateString("en-US",{month:"short",day:"numeric"})}: ${P[pk].name} in ${lonToZodiac(lon).name} (${dignity})`);
        }
      });
    }
    return `CURRENT SKY (${DAY_NAMES[now.getDay()]} ${now.toLocaleDateString()}): Planetary Hour: ${P[hour.planet].name} (Hour ${hour.hourNum+1}, Day of ${P[hour.dayRuler].name}) Planetary Positions: ${positions} Moon: ${eph.moonPhase}${eph.voc?.isVoC?" — VOID OF COURSE":""} Current Decan (Sun): Decan ${eph.decanIdx+1} — ${DECANS[eph.decanIdx].name} (${DECANS[eph.decanIdx].sign}) Active Fractal Layers: ${fd} Natal Planets: ${nd} Upcoming Elections (next 30 days): ${nextElections.join("; ")||"Scanning..."}`;
  };
  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input};
    setMessages(m=>[...m,userMsg]);
    setInput("");setLoading(true);
    const context=buildContext();
    // RAG: ground the answer in the practitioner's own corpus.
    const grounding=groundingFor(input);
    const systemPrompt=buildSystemPrompt(profile,context)+grounding;
    const apiKey=profile?.apiKey||"";
    if(!aiConfigured()){setMessages(m=>[...m,{role:"assistant",content:aiUnconfiguredMessage()}]);setLoading(false);return;}
    try{
      const txt=await askClaude({apiKey,system:systemPrompt,maxTokens:1500,messages:[...messages,userMsg].filter(m=>m.role!=="assistant"||messages.indexOf(m)>0).map(m=>({role:m.role,content:m.content}))});
      setMessages(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){
      setMessages(m=>[...m,{role:"assistant",content:e.message||"Unable to connect to the API."}]);
    }
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px",borderBottom:"1px solid rgba(200,175,100,0.07)"}}>
        <div style={L()}>AI Working Planner</div>
        <div style={T(20)}>Build a Working ✧</div>
        <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.6}}>Describe your goal and deadline. I'll build a complete magical operation plan from all traditions.</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {messages.map((m,i)=>(
          <div key={i} style={{marginBottom:14,display:"flex",gap:9,animation:"float-in 0.3s ease-out"}}>
            {m.role==="assistant"&&<div style={{width:24,height:24,borderRadius:12,background:"rgba(212,175,106,0.15)",border:"1px solid rgba(212,175,106,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,marginTop:2}}>✧</div>}
            <div style={{flex:1,maxWidth:"100%"}}>
              <div style={{borderRadius:m.role==="user"?12:14,background:m.role==="user"?"rgba(200,175,100,0.1)":"rgba(8,5,22,0.7)",border:`1px solid ${m.role==="user"?"rgba(200,175,100,0.2)":"rgba(200,175,100,0.09)"}`,padding:"11px 13px",backdropFilter:m.role!=="user"?"blur(16px)":"none"}}>
                <div style={{fontFamily:F,fontSize:11.5,color:"#C4A870",lineHeight:1.85,whiteSpace:"pre-wrap"}}>{m.content}</div>
              </div>
            </div>
            {m.role==="user"&&<div style={{width:24,height:24,borderRadius:12,background:"rgba(200,175,100,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2,color:"rgba(200,175,100,0.5)"}}>☽</div>}
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:9,marginBottom:14}}>
          <div style={{width:24,height:24,borderRadius:12,background:"rgba(212,175,106,0.15)",border:"1px solid rgba(212,175,106,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✧</div>
          <div style={{padding:"11px 13px",borderRadius:14,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.09)"}}>
            <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(200,175,100,0.4)",animation:`breathe 1.2s ease-in-out infinite`,animationDelay:`${i*0.3}s`}}/>)}</div>
          </div>
        </div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"8px 14px",borderTop:"1px solid rgba(200,175,100,0.07)",display:"flex",gap:8}}>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Describe your goal and deadline…" rows={2} style={{flex:1,resize:"none",fontSize:12,lineHeight:1.6}}/>
        <button onClick={send} disabled={!input.trim()||loading} style={{padding:"0 14px",borderRadius:10,background:input.trim()?"rgba(212,175,106,0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${input.trim()?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:10,color:input.trim()?"#D4AF6A":"#4A3020",letterSpacing:2,cursor:input.trim()?"pointer":"default",alignSelf:"flex-end",height:38}}>SEND</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LEARN TOPICS
// ═══════════════════════════════════════════════════════════════════════
export const LEARN_TOPICS=[
  {id:"planetary-hours",  label:"Planetary Hours",        desc:"The 24-hour cycle of planetary rulership",         traditions:["all"],         level:"beginner"},
  {id:"lunar-timing",     label:"Lunar Timing",           desc:"Phases, mansions, void of course, void avoidance", traditions:["all"],         level:"beginner"},
  {id:"electional",       label:"Electional Astrology",   desc:"Choosing optimal moments for magical operation",    traditions:["all"],         level:"intermediate"},
  {id:"decans",           label:"Decan Magic",            desc:"The 36 faces of the zodiac and their operations",  traditions:["all"],         level:"intermediate"},
  {id:"fixed-stars",      label:"Fixed Stars",            desc:"The stellar virtues and their talismanic use",      traditions:["all"],         level:"intermediate"},
  {id:"planetary-magic",  label:"Planetary Magic",        desc:"The seven spheres — operations, materia, timing",  traditions:["western-ceremonial","hellenism"],level:"beginner"},
  {id:"talismans",        label:"Talisman Making",        desc:"Classical image magic — inscription and consecration",traditions:["western-ceremonial","hellenism"],level:"intermediate"},
  {id:"invocation",       label:"Invocation & Prayer",    desc:"Speaking with intelligences and planetary spirits", traditions:["western-ceremonial","hellenism"],level:"intermediate"},
  {id:"kabbalah",         label:"Practical Kabbalah",     desc:"Tree of Life as a map of magical operations",      traditions:["western-ceremonial"],level:"intermediate"},
  {id:"essential-dignities",label:"Essential Dignities",  desc:"Domicile, exaltation, fall, detriment, peregrine", traditions:["all"],         level:"beginner"},
  {id:"sigils",           label:"Sigil Craft",            desc:"Creating and charging sigils from intent",          traditions:["chaos","all"], level:"beginner"},
  {id:"gnosis",           label:"Gnosis & Altered States",desc:"Accessing magical states of consciousness",        traditions:["chaos"],       level:"intermediate"},
  {id:"servitors",        label:"Servitors & Egregores",  desc:"Creating thought-forms for specific operations",   traditions:["chaos"],       level:"advanced"},
  {id:"wheel-of-year",   label:"Wheel of the Year",      desc:"The eight stations and their traditional power",   traditions:["traditional-witchcraft"],level:"beginner"},
  {id:"hedge-crossing",  label:"The Crooked Path",       desc:"Between-worlds work in the traditional arte",      traditions:["traditional-witchcraft"],level:"advanced"},
  {id:"orphic-hymns",    label:"Orphic Hymns",           desc:"The hymns of Orpheus and their theurgic function", traditions:["hellenism"],   level:"intermediate"},
  {id:"theurgy",         label:"Theurgic Practice",      desc:"Iamblichean theurgy — ascending through the spheres",traditions:["hellenism"], level:"advanced"},
  {id:"candle-magic",    label:"Candle & Petition Work",  desc:"Simple, direct folk working methods",               traditions:["folk"],        level:"beginner"},
  {id:"rootwork",        label:"Materia & Curios",        desc:"Plants, stones, and curios of the folk tradition", traditions:["folk"],        level:"intermediate"},
  {id:"animism-foundation",label:"Animism Foundations",  desc:"The world as a community of persons — relational magic", traditions:["animism","all"],level:"beginner"},
  {id:"ancestor-work",   label:"Ancestor Work",           desc:"Building the ancestor current — reciprocity with the dead", traditions:["animism","folk","traditional-witchcraft","all"],level:"beginner"},
  {id:"spirits-allies",  label:"Spirits & Allies",        desc:"Contact, relationship, and reciprocity with non-human persons", traditions:["animism","traditional-witchcraft","all"],level:"intermediate"},
  {id:"sacrifice-reciprocity",label:"Sacrifice & Reciprocity", desc:"The economy of the spirit world — giving to receive", traditions:["animism","folk","hellenism","all"],level:"intermediate"},
  {id:"dream-work",      label:"Dream Work",              desc:"Incubation, liminal sleep practice, and dream interpretation", traditions:["animism","hellenism","traditional-witchcraft","all"],level:"intermediate"},
  {id:"fortune-divination",label:"Fortune & Divination",  desc:"Reading patterns in time and space — geomancy, lots, omens", traditions:["all"],        level:"beginner"},
  {id:"geomancy",        label:"Geomancy",                desc:"The sixteen figures, the shield chart, and reading by the houses", traditions:["all"],level:"intermediate"},
  {id:"hermetic-lots",   label:"The Hermetic Lots",       desc:"Fortune, Spirit, and the five sect-aware lots of Hellenistic astrology", traditions:["all"],level:"intermediate"},
  {id:"saints-holy-dead",label:"Saints & the Holy Dead",  desc:"Working with the canonized current and the beloved dead", traditions:["folk","animism"],level:"intermediate"},
  {id:"liminal-entities",label:"Liminal Entities",        desc:"Threshold beings, guardians, and hedge-crossing", traditions:["animism","traditional-witchcraft","folk"],level:"advanced"},
  {id:"blended-cycle",   label:"Blended Cycle Model",     desc:"Placing your magic in historical and generational time", traditions:["all"],        level:"intermediate"},
  // Rune Soup deep topics
  {id:"shoaling",        label:"Shoaling & Sigil Shoals",  desc:"Gordon White's method: multiple concurrent sigils, robofish anchor, Black Swan dynamics", traditions:["chaos","all"],level:"intermediate"},
  {id:"narrative-magic", label:"Narrative Magic",          desc:"Story as the primary magical technology — enchanting the frame, 'do it for the plot'", traditions:["all"],        level:"intermediate"},
  {id:"synchronicity",   label:"Synchronicity & Twilight Language", desc:"Magic as call and response — reading the spirit world's replies through meaningful coincidence", traditions:["all"],level:"intermediate"},
  {id:"wyrd-fortune",    label:"Wyrd, Fortune & The Posse",desc:"Building luck: Fortuna as person, hamingja, the spirit team model", traditions:["all"],level:"beginner"},
  {id:"goetia-spirits",  label:"Goetia & Grimoire Spirits",desc:"72 spirits as executives — pact-making, negotiation, the seal as contact protocol", traditions:["goetia","western-ceremonial"],level:"intermediate"},
  {id:"stellar-cult",    label:"Stellar Cult & Star.Ships", desc:"Gordon White's thesis: ancient stellar religion as the Laurasian wellspring of Western magic", traditions:["all"],level:"advanced"},
  {id:"headless-rite",   label:"The Headless / Bornless Rite",desc:"PGM VIII.1-63 — contacting the personal daimon, orienting to Orion", traditions:["hellenism","western-ceremonial","all"],level:"advanced"},
  {id:"spagyrics",       label:"Spagyrics & Plant Alchemy", desc:"Paracelsian three essentials, laboratory as devotional space, plant as person", traditions:["spagyric","all"],level:"intermediate"},
  {id:"great-work",      label:"The Stages of the Great Work", desc:"Nigredo, albedo, citrinitas, rubedo — the color sequence in the vessel and in the soul; the peacock's tail", traditions:["all"],level:"intermediate"},
  {id:"alchemical-zodiac",label:"The Alchemical Zodiac & Lab Timing", desc:"Pernety's twelve processes on the wheel of signs; Junius's Moon-key; planetary days and degrees of fire", traditions:["spagyric","all"],level:"intermediate"},
  {id:"salt-work",       label:"The Salt Work", desc:"Calcine, dissolve, filter, coagulate — Lémery's salt of tartar and the craft beneath every other craft", traditions:["spagyric","all"],level:"beginner"},
  {id:"mineral-study",   label:"The Mineral Paths (Study)", desc:"Acetate path, antimony, vitriol — what the texts say, what history warns, what may never be practiced", traditions:["spagyric","all"],level:"advanced"},
  {id:"dew-work",        label:"Dew & the Mutus Liber", desc:"The wordless book — spring dew under Aries and Taurus, putrefaction, the two salts, Henshaw's Royal Society record", traditions:["spagyric","all"],level:"advanced"},
  {id:"fairy-doctor",    label:"Fairy Doctor Tradition",    desc:"The Irish bean feasa — mediating between human communities and the fair folk", traditions:["faerie","traditional-witchcraft"],level:"intermediate"},
  {id:"shamanic-cosmology",label:"Shamanic Cosmology",     desc:"Three worlds, power animals, teacher spirits, soul retrieval and extraction", traditions:["shamanism","all"],level:"beginner"},
  {id:"apocalyptic-nav", label:"Apocalyptic Navigation",   desc:"Magic in the putrefactory phase — wyrd-building, resilience, what to retain and discard", traditions:["all"],level:"intermediate"},
  {id:"star-ships-thesis",label:"Star.Ships Deep Dive",    desc:"Laurasian myth, Sundaland stellar nursery, Egypt as the preserved source tradition", traditions:["all"],level:"advanced"},
];

// ═══════════════════════════════════════════════════════════════════════
// CONTEXTUAL ORACLE
// ═══════════════════════════════════════════════════════════════════════
function buildOracleContext(tab,now,eph,fractal,natalPos,hour,profile){
  const dayName=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];
  const dateStr=now.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const hourPl=P[hour.planet].name;
  const moonStr=eph?.pos?.moon?`Moon ${eph.pos.moon.zodiac.degree}° ${eph.pos.moon.zodiac.name} (${eph.moonPhase}${eph.voc?.isVoC?" — VOID OF COURSE":""})`:"";
  const positions=eph?.pos?Object.entries(eph.pos).map(([pk,p])=>`${P[pk].name} ${p.zodiac.degree}° ${p.zodiac.name} (${p.dignity}${p.isRetro?" ℞":""}${p.combust?` ${p.combust.type}`:""}) score ${p.score}`).join("; "):"";
  const tradition=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(" + ")||"Western Ceremonial";
  const base=`${dayName} ${dateStr}, Hour of ${hourPl}. Tradition: ${tradition}. ${moonStr}. All planets: ${positions}.`;
  const natalStr=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.dignity})`).join(", "):"No natal chart.";
  const outerStr=Object.keys(OUTER_EPOCHS).map(p=>{const lon=outerPlanetLon(p,now);const sn=SIGN_NAMES[Math.floor(lon/30)%12];return`${OUTER_META[p].name} in ${sn}`;}).join(", ");
  const jsYrs=(((now.getTime()-new Date("2020-12-21").getTime())/(365.25*86400000))).toFixed(1);
  const macroCtx=`Macro cycles: ${outerStr}. Air Mutation (2020 Jupiter-Saturn conjunction): ${jsYrs} years in. ${CYCLE_LORE.plutoCurrent.substring(0,200)}...`;
  const runeContext=`Apply the animist framework: magic is call and response with a relational cosmos. Synchronicity is the primary channel through which results manifest. The ancestor current is the foundation. "Extradimensional diplomacy" — spirits are persons with agendas, not tools. The practitioner is building wyrd — a web of fortunate relationships — not just executing operations. Consider what the story of this moment calls for.`;
  switch(tab){
    case "sky": return `${base} ${macroCtx} Active decan: ${DECANS[eph.decanIdx].name} (${DECANS[eph.decanIdx].sign}, ruler ${DECANS[eph.decanIdx].ruler}). Fractal coherence: ${fractal.cosmicCoherence}%, active layers: ${fractal.levels.slice(0,2).map(l=>l.decan.name).join(", ")}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read this celestial moment with full depth — personal timing, generational context, and spirit ecology. What planetary conditions stand out? What does the animist cosmos say about the quality of this moment? What would you recommend — and what would you caution against? Name the specific spirit relationships most relevant right now.`;
    case "decans": return `${base} The Sun occupies the ${DECANS[eph.decanIdx].name} — the ${eph.decanIdx+1}th decan of ${DECANS[eph.decanIdx].sign}, ruled by ${DECANS[eph.decanIdx].ruler}. Its classical operations: ${DECANS[eph.decanIdx].magic}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Speak to this decan face as a stellar spirit, a presiding intelligence of this ten-day period — drawing on the Hermetic papyri (PGM) and the Star.Ships thesis that decans are among the oldest spirit contacts in the Laurasian tradition. What is the nature of this particular face? What operations does it favor? How does it interact with the current planetary and macro-cycle conditions? What synchronicities should the practitioner be watching for as a response from this decan?`;
    case "fractal": return `${base} Fractal timing layers: ${fractal.levels.map(l=>`L${l.level}: ${l.decan.name} (${l.decan.sign})`).join(", ")}. Cosmic coherence: ${fractal.cosmicCoherence}%. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read this moment of nested time using the blended cycle model — the fractal layers (personal timing) sit within the inner planet weather, which sits within the outer planet civilizational weather. Where do all three levels align? What does the convergence of these layers tell you about the magical opportunity or constraint right now? What story is this moment part of — in the practitioner's life and in the larger historical pattern?`;
    case "planets": return `${base} ${macroCtx} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Survey the state of the seven spheres through the lens of both personal and civilizational timing. Which planets are most empowered as channels for working? Which are afflicted? How does each planet's current condition relate to the macro-cycle context (Pluto in Aquarius, Neptune in Aries, Uranus entering Gemini, Air Mutation)? Which spirit relationships within the planetary hierarchy are most accessible right now, and what do they require as tribute?`;
    case "stars": {const ns=eph.nearStars?.map(s=>`${s.name} conj ${P[s.planet]?.name||s.planet} (${s.orb?.toFixed(1)}° orb)`).join(", ")||"No notable star conjunctions active";return `${base} Active fixed star conjunctions: ${ns}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Interpret the fixed star influences through the Star.Ships lens — these are stellar spirits from the oldest layer of the Laurasian tradition, predating the planetary cult. Each star carries the virtue of the spirit who resides there. What do the currently active star conjunctions portend? How do they modify the planets they conjoin? What specific operations, contacts, or synchronicities do they favor? If Sirius (Sothis) is active: give specific working recommendations for this most potent stellar contact.`;}
    case "natal": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read this practitioner's natal pattern through the blended cycle model — their natal planets define their personal spirit ecology (which planetary intelligences are their natural allies), while the current sky activates specific parts of that ecology. Which natal positions are being activated by current transits? What does the macrocycle context (their generation's signature) mean for their personal practice? What is their natural "posse" based on the natal chart — which planetary intelligences are their strongest allies? What ancestor work would most benefit this chart?`;
    case "elect": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Survey the quality of upcoming election windows with full depth. Consider: the Moon's condition (voC, Via Combusta, speed, phase) as the primary factor; the planet being elected (its dignity and dispositor); the macro-cycle context (which planets benefit from current Pluto/Neptune/Uranus signatures). What is the single strongest opportunity in the next two weeks? What should be avoided absolutely? And: what would you SHOAL — what group of related operations would benefit from being launched together as a sigil shoal, leaving outcome space open for Black Swan results?`;
    case "work": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Give a complete working recommendation for today. What planet or spirit entity should this practitioner work with? What is the specific materia required (by planetary correspondence)? What is the correct timing (hour, day, Moon condition)? What offering is appropriate? And critically: what is the narrative frame for this working — what story is the practitioner entering, and what role do they play in it? Include: the ancestor current that should be established first, the specific spirit relationship being invoked, and how the practitioner will recognize the call-and-response of a successful working.`;
    case "journal": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is reviewing their magical journal. What timing wisdom applies right now? What celestial and macrocycle conditions are worth recording as a snapshot for future reference? Specifically: what synchronicities should they be watching for as responses to past workings? How does the current moment fit into the larger story of their practice — what chapter are they in? What patterns in the journal would you, as an animist advisor, want to highlight?`;
    case "cycles": return `${base} ${macroCtx}\n${CYCLE_LORE.plutoCurrent}\n${CYCLE_LORE.neptuneCurrent}\n${CYCLE_LORE.uranusCurrent}\n${CYCLE_LORE.jsMutationCurrent}\n${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Synthesize the macro-cycle picture into actionable magical guidance. We are at this specific confluence of Pluto in Aquarius, Neptune entering Aries, Uranus entering Gemini, and 5 years into the first Air Mutation since 1226 CE. What does this multi-layered configuration demand of the serious magical practitioner? Which traditions and practices are most amplified by this civilizational weather? What is "ours to do" in Gordon White's framing — what should we be building, which spirits should we be cultivating, and what are we in the putrefactory phase of completing?`;
    case "aspects": {
      const aspStr=(eph.aspects||[]).slice(0,6).map(a=>`${P[a.p1].name} ${a.aspect.n} ${P[a.p2].name} (orb ${a.orb}°${a.applying?", applying":""})`).join("; ")||"No close aspects";
      return `${base} Current aspects: ${aspStr}. Antiscia contacts: ${(eph.antiscia||[]).length}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read the current aspect web as a live conversation among the planetary spirits. Which dialogue dominates the sky right now? Which applying aspect should the practitioner ride, and which should they let pass? Speak to how these aspects color any magical work undertaken today.`;
    }
    case "transits": {
      const hits=natalPos?transitsToNatal(eph.pos,natalPos):[];
      const hitStr=hits.length?hits.map(h=>`${P[h.transiting]?.name||h.transiting} ${h.aspect} natal ${P[h.natal]?.name||h.natal} (orb ${h.orb}°)`).join("; "):"No exact transits within orb";
      return `${base} Exact transits to the natal chart right now: ${hitStr}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: These transits are the sky's current address to this specific practitioner. What is being activated, tested, or offered? Which transit deserves a magical response — a working, an offering, a deliberate pause — and which asks only for observation?`;
    }
    case "ephemeris": {
      const retro=Object.entries(eph.pos).filter(([,p])=>p.isRetro).map(([pk])=>P[pk].name).join(", ")||"none";
      return `${base} Retrograde now: ${retro}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is studying the ephemeris — the raw calendar of the sky. What upcoming celestial mechanics (ingresses, stations, lunations, eclipses) most deserve preparation? What should be scheduled toward, and what should be scheduled around?`;
    }
    case "calendar": case "almanac": {
      let feedStr="";
      try{const today=now.toISOString().split("T")[0];const soon=new Date(now.getTime()+21*86400000).toISOString().split("T")[0];const f=feedInRange(today,soon);if(f.length)feedStr=` Timing letters flag: ${f.slice(0,6).map(e=>`${e.source} (${e.date}): ${e.title.slice(0,60)}`).join("; ")}.`;}catch(e){}
      return `${base}${feedStr} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is planning their month of workings. Read the quality of the coming weeks: where do the good windows cluster, what does the Moon's rhythm suggest for pacing, and how would you sequence a month of practice — elections, maintenance, rest — like a liturgical calendar? Where your own reading of the sky agrees with the timing letters above, say so; where it differs, say that too — the practitioner keeps the letters as one voice among several, their own record being another.`;
    }
    case "mansions": {
      const m=getMansion(eph.pos.moon.lon);
      return `${base} The Moon stands in mansion ${m.index} — ${m.arabic} (${m.latin}, "${m.translation}"), ${Math.round(m.progress*100)}% through. Its nature is ${m.nature}. Elect under it: ${m.elect} Avoid: ${m.avoid} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition and a reader of the Picatrix: Speak to this mansion as a station of the Moon's journey — the oldest electional framework in the tradition. What does ${m.arabic} favor in the coming hours? How does it combine with the Moon's phase and aspects right now? What working, if any, should be timed before the next mansion begins?`;
    }
    case "horary": return `${base} Moon: ${eph.moonPhase}${eph.voc?.isVoC?" — VOID OF COURSE (judgment unreliable)":""}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the tradition of Lilly's Christian Astrology: The practitioner is considering a horary question. Counsel them on the asking itself — is this moment radical enough to bear judgment (consider the void Moon above)? How should the question be framed so the chart can answer it? What makes a question sincere enough for horary?`;
    case "geomancy": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a master geomancer in the tradition of Agrippa and Greer: The practitioner is casting the sixteen figures. Counsel them on the asking — geomancy answers a clear, sincere, single question best. How should they frame this matter, and which house does it truly belong to? Speak briefly to the character of geomancy as an elemental oracle: the figures are built of odd and even, the whole answer folded into a single Judge — earthier and more decisive than the horary chart.`;
    case "spirits": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a diplomat of the unseen: The practitioner is tending their Spirit Court — the ancestors, planetary intelligences, saints, and spirits of place they work with. Counsel them on relationship as the foundation of the art: reciprocity before petition, offerings given freely and regularly, attention as the truest gift, and starting simple (water for the ancestors) before complicating the court. Remind them that spirits have their own natures and agendas — this is diplomacy, not commanding.`;
    case "omens": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a reader of signs: The practitioner is logging dreams, omens, and synchronicities. Counsel them on discernment — what distinguishes a genuine sign from noise, how the spirit world's call-and-response tends to arrive (clusters, repetitions, the uncanny angle), and how to hold an omen lightly until the pattern confirms itself. Synchronicity around a working is its confirmation; silence for a full lunar cycle is information too.`;
    case "lunar": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a practitioner steeped in lunar timing: The practitioner is working with the current lunation. Counsel them on the rhythm of the month — planting intentions at the New Moon, taking action at the First Quarter, bringing workings to fruition and reviewing them at the Full, releasing and clearing at the Last Quarter, and resting/banishing in the Balsamic dark before the next New. Speak to how this cycle's intentions should be framed and what practice fits the current phase.`;
    case "lots": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle and a Hellenistic astrologer in the tradition of Paulus Alexandrinus and Vettius Valens: The practitioner is contemplating the seven Hermetic Lots — Fortune (the body and what fortune gives), Spirit (the soul and what one does by will), and the five that swing from them: Eros, Necessity, Courage, Victory, Nemesis. Remember that the lots are sect-aware — the formulas reverse between a day and a night chart. Counsel them on how to read Fortune and Spirit together as the two hinges of the chart, and how the lesser lots and their rulers colour the life. Be precise and traditional.`;
    case "talisman": {
      const strong=Object.entries(eph.pos).filter(([,p])=>(p.dignity==="domicile"||p.dignity==="exaltation")&&!p.isRetro&&!p.combust).map(([pk])=>P[pk].name).join(", ")||"none at full strength";
      return `${base} Planets currently dignified, direct, and clear of the beams: ${strong}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition, versed in Picatrix and Agrippa: The practitioner is at the talisman workshop. Which sphere is most ready to be fixed into matter right now, and for what intent? What materia and consecration would you counsel? If nothing is ready, say so plainly — a talisman made under a weak sky is a weak talisman.`;
    }
    case "sigils": {
      let sigStr="";
      try{const sigs=loadJSON("astrum_sigils",[]);const open=sigs.filter(s=>["created","charged","deployed"].includes(s.status));sigStr=`${sigs.length} sigils in the workshop, ${open.length} active (${open.slice(0,3).map(s=>`"${(s.intent||s.word||"").slice(0,30)}" — ${s.status}`).join("; ")}).`;}catch(e){}
      return `${base} ${sigStr} Moon: ${eph.moonPhase}${eph.voc?.isVoC?" — void":""}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: Read the sigil work. Is this an hour for charging (the fire), deploying (the release), or forgetting (the burial)? Which active sigils are ripe for their next stage given the Moon's condition? Speak to the chaos-magical rhythm: fire and forget, but time the firing.`;
    }
    case "grimoire": {
      let gStr="";
      try{const g=loadJSON("astrum_grimoire",[]);gStr=`The grimoire holds ${g.length} entries.`;}catch(e){}
      return `${base} ${gStr} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is in their book of shadows. What patterns in a personal grimoire deserve periodic re-reading? What should be re-attempted, what retired, what consecrated as core practice? Counsel them on curating the record of their own tradition.`;
    }
    case "review": {
      let rStr="";
      try{const stats=computeStats(loadCastings());rStr=`${stats.total} castings recorded, ${stats.judged} judged, overall hit-rate ${stats.overall.pct!=null?stats.overall.pct+"%":"—"}. Strongest planets by record: ${stats.byPlanet.slice(0,3).map(r=>`${P[r.key]?.name||r.key} ${r.pct}% (n=${r.n})`).join(", ")||"insufficient data"}.`;}catch(e){}
      return `${base} ${rStr} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition, and as an honest analyst: The practitioner is reviewing their results. What do these numbers actually support believing? Where might the record be fooling them (small samples, selection effects, unjudged castings)? And what is the single most informative experiment they could run next to sharpen their practice?`;
    }
    case "learn": return `${base} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is studying. Given the current sky and their tradition, what subject does this moment itself teach best? Point them to what the heavens are currently demonstrating — a dignity, an aspect, a mansion, a season of the Work — and frame one lesson from it.`;
    case "athanor": {
      const season=alchemicalSeason(eph.pos.sun.lon);
      const moonOp=moonSignOperation(eph.pos.moon.lon);
      const tide=moonWorkGuidance(eph.moonPhaseDeg);
      let opsStr="No operations on the fire.";
      try{
        const activeOps=loadAthanor().filter(o=>o.status==="active");
        if(activeOps.length)opsStr=activeOps.map(o=>{
          const next=o.steps.find(s=>!s.completedAt);
          const tpl=ATHANOR_TEMPLATES[o.template];
          return `${o.name} (${tpl?.name||o.template}, ${P[o.planet].name}, ${o.steps.filter(s=>s.completedAt).length}/${o.steps.length} steps done${next?`, next: "${next.title}"${next.scheduledFor?` window ${new Date(next.scheduledFor).toLocaleString()}`:""}`:""})`;
        }).join("; ");
      }catch(e){}
      return `${base} Alchemical season (Sun in ${season.sign}): ${season.process} — ${season.lab} Moon's operation-key (Junius): ${moonOp.process} in ${moonOp.sign}. Lunar tide: ${tide.phase} — ${tide.mode}: ${tide.counsel} Active operations: ${opsStr}. ${natalStr}\n\n${runeContext}\n\nAs my Oracle and as an adept of the laboratory (Paracelsus, Frater Albertus, Junius, the spagyric tradition): Read the practitioner's Athanor. How do the current sky conditions serve or hinder the operations on the fire? What does the season's process and the Moon's operation-key counsel for today's laboratory work — and for the inner work that parallels it? If an operation is between steps, what should the practitioner attend to, observe, or prepare? Speak as one who knows that the vessel and the operator are worked together — ora et labora.`;
    }
    default: return `${base} ${macroCtx} ${natalStr}\n\n${runeContext}\n\nAs my Oracle in the ${tradition} tradition: What wisdom is most relevant to this practitioner right now? Speak from the animist framework — magic as call and response, spirits as persons, the ancestor current as foundation, synchronicity as the primary channel of response.`;
  }
}

function OraclePanel({open,onClose,context,profile}){
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const sendMsg=async(userText,history)=>{
    if(loading)return;
    const apiKey=profile?.apiKey||"";
    const newMsgs=[...history,{role:"user",content:userText}];
    setMsgs(newMsgs);
    setLoading(true);
    if(!aiConfigured()){setMsgs(m=>[...m,{role:"assistant",content:aiUnconfiguredMessage()}]);setLoading(false);return;}
    const sys=buildSystemPrompt(profile,"You are the Oracle — an embedded advisor in a magical practice app. Speak directly to what the practitioner is currently observing. Be concise and specific (2-4 paragraphs for readings, shorter for follow-ups). Reference exact data given. No generalities — address the specific conditions described.");
    try{
      const txt=await askClaude({apiKey,system:sys,maxTokens:800,messages:newMsgs.map(m=>({role:m.role,content:m.content}))});
      setMsgs(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){setMsgs(m=>[...m,{role:"assistant",content:e.message||"Oracle unavailable — check connection."}]);}
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  const sendFollow=()=>{if(!input.trim()||loading)return;const t=input;setInput("");sendMsg(t,msgs);};
  useEffect(()=>{if(open&&context){setMsgs([]);setInput("");setLoading(false);setTimeout(()=>sendMsg(context,[]),80);}},// eslint-disable-next-line
  [open]);
  if(!open)return null;
  const tradLabel=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(" · ")||"Western Ceremonial";
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)"}}/>
      <div style={{position:"relative",background:"rgba(4,4,18,0.98)",border:"1px solid rgba(200,175,100,0.13)",borderBottom:"none",borderRadius:"20px 20px 0 0",maxHeight:"74vh",display:"flex",flexDirection:"column",boxShadow:"0 -12px 56px rgba(0,0,0,0.75)"}}>
        <div style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(200,175,100,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:28,height:28,borderRadius:14,background:"rgba(212,175,106,0.12)",border:"1px solid rgba(212,175,106,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#D4AF6A"}}>✧</div>
            <div>
              <div style={{fontFamily:F,fontSize:12,color:"#D4AF6A",letterSpacing:2}}>ORACLE</div>
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)",letterSpacing:1,marginTop:1}}>{tradLabel}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontSize:18,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px"}}>
          {loading&&msgs.length<=1&&(
            <div style={{display:"flex",gap:5,padding:"32px 0",justifyContent:"center"}}>
              {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(200,175,100,0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}
            </div>
          )}
          {msgs.filter(m=>m.role==="assistant"||msgs.indexOf(m)>0).map((m,i)=>(
            <div key={i} style={{marginBottom:14}}>
              {m.role==="user"&&msgs.indexOf(m)>0&&<div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.35)",marginBottom:5,letterSpacing:1}}>YOUR QUESTION</div>}
              <div style={{fontFamily:F,fontSize:11.5,color:m.role==="user"?"#9A8060":"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{m.content}</div>
            </div>
          ))}
          {loading&&msgs.length>1&&<div style={{display:"flex",gap:5,padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(200,175,100,0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"8px 12px 20px",borderTop:"1px solid rgba(200,175,100,0.06)",display:"flex",gap:8,flexShrink:0}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendFollow();}}} placeholder="Ask a follow-up question…" style={{flex:1,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:11}}/>
          <button onClick={sendFollow} disabled={!input.trim()||loading} style={{padding:"0 12px",borderRadius:10,background:input.trim()?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(input.trim()?"rgba(212,175,106,0.28)":"rgba(200,175,100,0.08)"),fontFamily:F,fontSize:9,color:input.trim()?"#D4AF6A":"#4A3020",letterSpacing:1,cursor:input.trim()?"pointer":"default",height:36}}>ASK</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSITS SCREEN (Phase 5b)
// ═══════════════════════════════════════════════════════════════════════
function TransitsScreen({natalPos,now}){
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
      {!natalPos&&<div className="card" style={{margin:"0 14px"}}><div style={{fontFamily:F,fontSize:11,color:"rgba(200,175,100,0.4)"}}>Enter natal chart data to calculate transits.</div></div>}
      {natalPos&&(
        <>
          <div style={{padding:"0 14px 10px",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",gap:4}}>
              {[30,90,365].map(d=>(
                <button key={d} onClick={()=>setDays(d)} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${days===d?"rgba(200,175,100,0.4)":"rgba(200,175,100,0.1)"}`,background:days===d?"rgba(200,175,100,0.08)":"transparent",color:days===d?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,cursor:"pointer"}}>{d}d</button>
              ))}
            </div>
            <button onClick={run} disabled={running} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:8,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.3)",color:GOLD,fontFamily:F,fontSize:9,cursor:running?"default":"pointer",opacity:running?0.6:1}}>
              {running?"Scanning…":"▶ Scan"}
            </button>
          </div>
          {/* Planet filter */}
          {hits&&(
            <div style={{overflowX:"auto",padding:"0 14px 8px"}}>
              <div style={{display:"flex",gap:4,minWidth:"max-content"}}>
                {PLANET_FILTER.map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${filter===f?"rgba(200,175,100,0.4)":"rgba(200,175,100,0.08)"}`,background:filter===f?"rgba(200,175,100,0.08)":"transparent",color:filter===f?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,cursor:"pointer"}}>
                    {f==="all"?"All":(P[f]?.sym+" "+P[f]?.name)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {hits===null&&<div style={{padding:"30px",textAlign:"center",fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.3)"}}>Press Scan to calculate transits</div>}
          {filtered&&filtered.length===0&&<div style={{padding:"20px 14px",fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.3)"}}>No transits found for this filter.</div>}
          {filtered&&filtered.length>0&&(
            <div className="card" style={{margin:"0 14px"}}>
              {filtered.map((hit,i)=>{
                const tp=P[hit.tp],np2=P[hit.np];
                const isBenefic=BENEFIC_ASPECTS.includes(hit.asp);
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderBottom:"1px solid rgba(200,175,100,0.04)",borderLeft:`2px solid ${isBenefic?"rgba(92,168,92,0.5)":"rgba(192,128,128,0.35)"}`,marginLeft:2,borderRadius:"0 6px 6px 0"}}>
                    <div style={{width:42,flexShrink:0}}>
                      <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.4)"}}>{hit.date.toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                      <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)"}}>{hit.date.toLocaleDateString([],{weekday:"short"})}</div>
                    </div>
                    <span className="planet-orb" style={{fontSize:14,color:tp?.col||GOLD,padding:"2px 4px"}}>{tp?.sym||hit.tp}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>
                        {tp?.name||hit.tp} <span style={{color:hit.col||"rgba(200,175,100,0.5)"}}>{hit.asp}</span> natal {np2?.name||hit.np}
                      </div>
                      <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.3)"}}>{fmtDate(hit.date)}</div>
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

// ═══════════════════════════════════════════════════════════════════════
// EPHEMERIS SCREEN (Phase 5e)
// ═══════════════════════════════════════════════════════════════════════
function EphemerisScreen({now}){
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
          <button key={id} onClick={()=>setTab(id)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${tab===id?"rgba(200,175,100,0.4)":"rgba(200,175,100,0.1)"}`,background:tab===id?"rgba(200,175,100,0.08)":"transparent",color:tab===id?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap"}}>{lbl}</button>
        ))}
      </div>

      {tab!=="graphic"&&(
        <div style={{padding:"0 14px 10px",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={run} disabled={running} style={{padding:"6px 14px",borderRadius:8,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.3)",color:GOLD,fontFamily:F,fontSize:9,cursor:running?"default":"pointer",opacity:running?0.6:1}}>
            {running?"Calculating…":"▶ Calculate"}
          </button>
          {!data&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)"}}>Press Calculate to load data</div>}
        </div>
      )}

      {tab==="ingresses"&&data&&(
        <div className="card" style={{margin:"0 14px"}}>
          <div style={L()}>Sign Ingresses — next 6 months</div>
          <div style={{marginTop:8}}>
            {data.ing.slice(0,40).map((ing,i)=>{
              const pl=P[ing.planet];
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                  <span className="planet-orb" style={{fontSize:14,color:pl?.col||GOLD,padding:"2px 4px"}}>{pl?.sym||ing.planet}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>{pl?.name||ing.planet} enters {ing.to}</div>
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)"}}>{ing.date.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
                  </div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)"}}>{Math.round((ing.date-now)/86400000)}d</div>
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
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
                  <span className="planet-orb" style={{fontSize:14,color:pl?.col||GOLD,padding:"2px 4px"}}>{pl?.sym||st.planet}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>
                      {pl?.name} {isRx?"Stations Retrograde ℞":"Stations Direct ♐"}
                    </div>
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)"}}>{st.date.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric",year:"numeric"})} · {st.zodiac.degree}° {st.zodiac.name}</div>
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
              <button key={m} onClick={()=>setMonths(m)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${months===m?"rgba(200,175,100,0.4)":"rgba(200,175,100,0.1)"}`,background:months===m?"rgba(200,175,100,0.08)":"transparent",color:months===m?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:8,cursor:"pointer"}}>{m}mo</button>
            ))}
          </div>
          {data.ecl.length===0&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)"}}>No eclipses found in this period.</div>}
          {data.ecl.map((ecl,i)=>{
            const isSolar=ecl.type==="Solar";
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(200,175,100,0.06)"}}>
                <div style={{width:34,height:34,borderRadius:17,background:isSolar?"rgba(230,200,60,0.1)":"rgba(100,120,180,0.1)",border:`1px solid ${isSolar?"rgba(230,200,60,0.3)":"rgba(100,120,180,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{isSolar?"☉":"☽"}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{ecl.type} Eclipse {ecl.total?"(Total/Annular)":"(Partial/Penumbral)"}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.5)"}}>{ecl.zodiac.degree}° {ecl.zodiac.name}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)"}}>{ecl.date.toLocaleDateString([],{weekday:"short",month:"long",day:"numeric",year:"numeric"})}</div>
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
              <button onClick={()=>{let m=graphMonth-1,y=graphYear;if(m<0){m=11;y--;}setGraphMonth(m);setGraphYear(y);}} style={{background:"none",border:"1px solid rgba(200,175,100,0.2)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:11,padding:"2px 8px",cursor:"pointer"}}>‹</button>
              <span style={{fontFamily:F,fontSize:11,color:GOLD,flex:1,textAlign:"center"}}>{MONTH_NAMES[graphMonth]} {graphYear}</span>
              <button onClick={()=>{let m=graphMonth+1,y=graphYear;if(m>11){m=0;y++;}setGraphMonth(m);setGraphYear(y);}} style={{background:"none",border:"1px solid rgba(200,175,100,0.2)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:11,padding:"2px 8px",cursor:"pointer"}}>›</button>
            </div>
            <div style={{background:"rgba(4,4,16,0.9)",borderRadius:12,border:"1px solid rgba(200,175,100,0.1)",padding:4}}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
                {/* Y axis labels (sign boundaries) */}
                {[0,30,60,90,120,150,180,210,240,270,300,330,360].map(deg=>{
                  const y=yOf(deg);const si=Math.floor(deg/30)%12;
                  return(<g key={deg}><line x1={pad.l} y1={y} x2={W-pad.r} y2={y} stroke="rgba(200,175,100,0.06)" strokeWidth={0.5}/><text x={pad.l-2} y={y+3} textAnchor="end" fill="rgba(200,175,100,0.25)" fontSize={7}>{SIGN_SYMS[si]}</text></g>);
                })}
                {/* Today line */}
                {(()=>{const today=new Date(graphYear,graphMonth,now.getDate());if(today.getMonth()===graphMonth&&today.getFullYear()===graphYear){const x=xOf(now.getDate());return<line x1={x} y1={pad.t} x2={x} y2={H-pad.b} stroke="rgba(200,175,100,0.2)" strokeWidth={0.8} strokeDasharray="3,3"/>;}return null;})()}
                {/* Planet lines */}
                {GRAPH_PLANETS.map(p=>(
                  <path key={p} d={pathFor(result[p])} fill="none" stroke={GRAPH_COLORS[p]} strokeWidth={1.2} opacity={0.85}/>
                ))}
                {/* X axis day labels */}
                {[1,5,10,15,20,25,daysInMonth].map(d=>(
                  <text key={d} x={xOf(d)} y={H-pad.b+12} textAnchor="middle" fill="rgba(200,175,100,0.3)" fontSize={7}>{d}</text>
                ))}
              </svg>
            </div>
            {/* Legend */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
              {GRAPH_PLANETS.map(p=>(
                <div key={p} style={{display:"flex",alignItems:"center",gap:3}}>
                  <div style={{width:14,height:2,background:GRAPH_COLORS[p],borderRadius:1}}/>
                  <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.5)"}}>{P[p]?.sym}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CALENDAR SCREEN (Phase 3a)
// ═══════════════════════════════════════════════════════════════════════
function CalendarScreen({now,natalPos}){
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

function SigilScreen({eph,profile,natalPos}){
  const [mode,setMode]=useState("list"); // list|create|view
  const [method,setMethod]=useState("rose"); // rose|kamea|seal|free
  const [sealKind,setSealKind]=useState("intelligence"); // intelligence|spirit
  const [filter,setFilter_]=useState("all");
  const [planet,setSigilPlanet]=useState("jupiter");
  const [intent,setIntent]=useState("");
  const [word,setWord]=useState("");
  const [status,setStatus]=useState("created"); // created|charged|deployed|fulfilled|retired
  const [sigils,setSigils]=useState([]);
  const [sel,setSel]=useState(null);
  const [aiNote,setAiNote]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  // Freehand drawing state
  const canvasRef=useRef(null);
  const [drawing,setDrawing]=useState(false);
  const [paths,setPaths]=useState([]);
  const [curPath,setCurPath]=useState([]);
  const [savedSvg,setSavedSvg]=useState(null);

  useEffect(()=>{
    setSigils(loadJSON("astrum_sigils",[]));
  },[]);
  const save=(list)=>{setSigils(list);saveJSON("astrum_sigils",list);};

  // Build SVG path for rose cross method
  const buildRosePath=(text)=>{
    const letters=[...text.toUpperCase().replace(/[^A-Z]/g,"")];
    if(letters.length<2)return null;
    const pts=letters.map(l=>ROSE_CROSS_LETTERS[l]||[3,3]).map(([r,c])=>roseCrossXY(r,c));
    return pts;
  };
  // Build SVG path for kamea method
  const buildKameaPath=(text,pl)=>{
    const letters=[...text.toUpperCase().replace(/[^A-Z]/g,"")];
    if(letters.length<2)return null;
    const km=KAMEA[pl]||KAMEA.jupiter;
    const pts=letters.map(l=>{
      let n=kamea_letterNum(l);
      n=kamea_reduce(n,km.size);
      if(n<1)n=1;
      return kamea_xy(n,pl);
    }).filter(Boolean);
    return pts;
  };
  // Build SVG path for an Agrippa spirit/intelligence seal (gematria trace on the kamea)
  const buildSealPath=(pl,kind)=>{
    const seal=getSeal(pl,kind);
    if(!seal)return null;
    const km=KAMEA[pl]||KAMEA.jupiter;
    return seal.seq.map(n=>kamea_xy(kamea_reduce(n,km.size),pl)).filter(Boolean);
  };

  const pathToSvgD=(pts)=>{
    if(!pts||pts.length<2)return"";
    return pts.map((p,i)=>(i===0?`M${p[0].toFixed(1)} ${p[1].toFixed(1)}`:`L${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(" ");
  };

  const freeToSvgD=(paths)=>{
    return paths.map(path=>path.map((p,i)=>(i===0?`M${p[0]} ${p[1]}`:`L${p[0]} ${p[1]}`)).join(" ")).join(" ");
  };

  const createSigil=()=>{
    let svgData=null;
    let sealName=null;
    if(method==="rose"){
      const pts=buildRosePath(word);
      if(!pts)return;
      svgData={method:"rose",pts,word};
    } else if(method==="kamea"){
      const pts=buildKameaPath(word,planet);
      if(!pts)return;
      svgData={method:"kamea",pts,word,planet};
    } else if(method==="seal"){
      const pts=buildSealPath(planet,sealKind);
      if(!pts)return;
      sealName=getSeal(planet,sealKind)?.name;
      svgData={method:"kamea",pts,word:sealName,planet};
    } else {
      if(!paths.length)return;
      svgData={method:"free",paths};
    }
    const now=new Date();
    const entry={
      id:Date.now(),planet,intent:method==="seal"&&!intent?`Seal of ${sealName} (${sealKind} of ${P[planet].name})`:intent,word:method==="seal"?sealName:word,method,sealOf:method==="seal"?sealKind:undefined,
      svgData,status:"created",
      date:now.toISOString(),
      skySnap:eph?{moon:eph.pos?.moon?.lon,sun:eph.pos?.sun?.lon}:null,
      aiNote:""
    };
    const next=[entry,...sigils];
    save(next);setSel(entry);setMode("view");
    // Operator's Loop: record the casting with the full sky
    try{
      createCasting({kind:"sigil",title:(entry.intent||entry.word||"Sigil").slice(0,60),intent:entry.intent,planet,
        conditions:conditionsFromProfile(now,profile,natalPos),links:{sigilId:entry.id}});
    }catch(e){}
    setWord("");setIntent("");setPaths([]);setSavedSvg(null);
  };

  const updateStatus=(id,st)=>{
    const next=sigils.map(s=>s.id===id?{...s,status:st}:s);
    save(next);
    if(sel?.id===id)setSel(prev=>({...prev,status:st}));
    // Reflect sigil lifecycle into its casting record
    try{
      const casting=loadCastings().find(c=>c.links?.sigilId===id);
      if(casting){
        if(st==="fulfilled"){addOutcome(casting.id,{verdict:"hit",note:"Sigil marked fulfilled"});closeCasting(casting.id);}
        else if(st==="retired"){addOutcome(casting.id,{verdict:"unknown",note:"Sigil retired"});closeCasting(casting.id);}
        else addOutcome(casting.id,{verdict:"unknown",note:`Sigil ${st}`});
      }
    }catch(e){}
  };

  const deleteSigil=(id)=>{
    const next=sigils.filter(s=>s.id!==id);
    save(next);setSel(null);setMode("list");
  };

  const getAITiming=async(sigil)=>{
    const key=profile?.apiKey;
    if(!key||!eph)return;
    setAiLoading(true);setAiNote("");
    const pl=P[sigil.planet];
    const now=new Date();
    try{
      const note=await askClaude({apiKey:key,maxTokens:300,
        system:`You are an expert in electional astrology and talismanic timing. Give a brief, practical 2-3 sentence note on current timing for charging a ${pl.name} sigil. Current sky: Sun at ${eph.pos?.sun?.lon?.toFixed(1)}°, Moon at ${eph.pos?.moon?.lon?.toFixed(1)}°. Be specific and actionable.`,
        messages:[{role:"user",content:`When is the best time in the next 48 hours to charge a ${pl.name} sigil? Current moment: ${now.toLocaleString()}.`}]});
      setAiNote(note);
      // Save note to sigil
      const next=sigils.map(s=>s.id===sigil.id?{...s,aiNote:note}:s);
      save(next);setSel(prev=>({...prev,aiNote:note}));
    }catch(e){setAiNote("AI unavailable.");}
    setAiLoading(false);
  };

  // Mouse/touch handlers for freehand canvas
  const getPos=(e,canvas)=>{
    const r=canvas.getBoundingClientRect();
    if(e.touches)return[e.touches[0].clientX-r.left,e.touches[0].clientY-r.top];
    return[e.clientX-r.left,e.clientY-r.top];
  };
  const onMouseDown=(e)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const pos=getPos(e,canvas);
    setDrawing(true);setCurPath([pos]);
  };
  const onMouseMove=(e)=>{
    if(!drawing)return;
    const canvas=canvasRef.current;if(!canvas)return;
    const pos=getPos(e,canvas);
    setCurPath(prev=>[...prev,pos]);
  };
  const onMouseUp=()=>{
    if(!drawing)return;
    setDrawing(false);
    if(curPath.length>1)setPaths(prev=>[...prev,curPath]);
    setCurPath([]);
  };

  const SigilPreview=({svgData,size=120})=>{
    if(!svgData)return null;
    const W=size,H=size;
    if(svgData.method==="rose"){
      const scale=size/260;
      const pts=svgData.pts.map(([x,y])=>[x*scale,y*scale]);
      const d=pathToSvgD(pts);
      const first=pts[0],last=pts[pts.length-1];
      return(
        <svg width={W} height={H} style={{display:"block"}}>
          <rect width={W} height={H} fill="rgba(0,0,0,0.4)" rx={4}/>
          {/* Rose cross grid dots */}
          {[1,2,3,4,5].map(r=>[1,2,3,4,5].map(c=>{const [px,py]=roseCrossXY(r,c,260,260).map(v=>v*scale);return<circle key={`${r}-${c}`} cx={px} cy={py} r={1.5} fill="rgba(200,175,100,0.3)"/>})).flat()}
          <path d={d} fill="none" stroke={P[planet]?.color||"#C8AF64"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={first[0]} cy={first[1]} r={4} fill="none" stroke={P[planet]?.color||"#C8AF64"} strokeWidth={1.5}/>
          <circle cx={last[0]} cy={last[1]} r={3} fill={P[planet]?.color||"#C8AF64"}/>
        </svg>
      );
    }
    if(svgData.method==="kamea"){
      const km=KAMEA[svgData.planet||planet]||KAMEA.jupiter;
      const cell=size/km.size;
      const pts=svgData.pts.map(([x,y])=>[x*size/260,y*size/260]);
      const d=pathToSvgD(pts);
      const first=pts[0],last=pts[pts.length-1];
      return(
        <svg width={W} height={H} style={{display:"block"}}>
          <rect width={W} height={H} fill="rgba(0,0,0,0.4)" rx={4}/>
          {/* Kamea grid */}
          {Array.from({length:km.size+1},(_,i)=><>
            <line key={`h${i}`} x1={0} y1={i*cell} x2={W} y2={i*cell} stroke="rgba(200,175,100,0.12)" strokeWidth={0.5}/>
            <line key={`v${i}`} x1={i*cell} y1={0} x2={i*cell} y2={H} stroke="rgba(200,175,100,0.12)" strokeWidth={0.5}/>
          </>)}
          <path d={d} fill="none" stroke={P[svgData.planet||planet]?.color||"#C8AF64"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={first[0]} cy={first[1]} r={4} fill="none" stroke={P[svgData.planet||planet]?.color||"#C8AF64"} strokeWidth={1.5}/>
          <circle cx={last[0]} cy={last[1]} r={3} fill={P[svgData.planet||planet]?.color||"#C8AF64"}/>
        </svg>
      );
    }
    if(svgData.method==="free"){
      const d=freeToSvgD(svgData.paths);
      return(
        <svg width={W} height={H} style={{display:"block"}}>
          <rect width={W} height={H} fill="rgba(0,0,0,0.4)" rx={4}/>
          <path d={d} fill="none" stroke="#C8AF64" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    return null;
  };

  const statusColors={created:"rgba(200,175,100,0.6)",charged:"#7AB87A",deployed:"#7AB8C8",fulfilled:"#C8AF64",retired:"rgba(200,175,100,0.25)"};
  const statusOrder=["created","charged","deployed","fulfilled","retired"];

  if(mode==="view"&&sel){
    const pl=P[sel.planet];
    const note=sel.aiNote||aiNote;
    return(
      <div style={{padding:"28px 24px",fontFamily:F,color:GOLD,maxWidth:600,margin:"0 auto"}}>
        <button onClick={()=>setMode("list")} style={{background:"none",border:"none",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer",marginBottom:20,padding:0}}>← SIGILS</button>
        <div style={{display:"flex",gap:20,alignItems:"flex-start",marginBottom:24}}>
          <div style={{flexShrink:0}}><SigilPreview svgData={sel.svgData} size={140}/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,letterSpacing:3,color:"rgba(200,175,100,0.5)",marginBottom:4}}>{pl?.sym} {pl?.name?.toUpperCase()}</div>
            <div style={{fontSize:16,marginBottom:6,color:pl?.col||GOLD}}>{sel.intent||"(no intention)"}</div>
            {sel.word&&<div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:8}}>WORD: {sel.word}</div>}
            <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.35)",marginBottom:12}}>{new Date(sel.date).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {statusOrder.map(st=>(
                <button key={st} onClick={()=>updateStatus(sel.id,st)} style={{padding:"3px 10px",borderRadius:10,border:`1px solid ${sel.status===st?statusColors[st]:"rgba(200,175,100,0.15)"}`,background:sel.status===st?`${statusColors[st]}22`:"transparent",color:sel.status===st?statusColors[st]:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer",textTransform:"uppercase"}}>{st}</button>
              ))}
            </div>
          </div>
        </div>
        {/* AI Timing */}
        <div style={{borderTop:"1px solid rgba(200,175,100,0.08)",paddingTop:20,marginBottom:20}}>
          <div style={{fontSize:10,letterSpacing:2,color:"rgba(200,175,100,0.5)",marginBottom:10}}>✧ AI TIMING GUIDANCE</div>
          {note?<div style={{fontSize:12,lineHeight:1.7,color:"rgba(200,175,100,0.75)"}}>{note}</div>
          :<button onClick={()=>getAITiming(sel)} disabled={aiLoading||!aiConfigured()} style={{padding:"6px 16px",border:"1px solid rgba(200,175,100,0.2)",borderRadius:4,background:"transparent",color:aiLoading?"rgba(200,175,100,0.35)":GOLD,fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer"}}>
            {aiLoading?"READING SKY…":"GET TIMING"}
          </button>}
          {!aiConfigured()&&<div style={{fontSize:9,color:"rgba(200,175,100,0.3)",marginTop:6}}>Set an AI engine in Profile to enable AI timing.</div>}
        </div>
        <button onClick={()=>deleteSigil(sel.id)} style={{padding:"5px 14px",border:"1px solid rgba(200,100,100,0.2)",borderRadius:4,background:"transparent",color:"rgba(200,100,100,0.5)",fontFamily:F,fontSize:9,letterSpacing:2,cursor:"pointer"}}>DELETE SIGIL</button>
      </div>
    );
  }

  if(mode==="create"){
    const previewPts=method==="rose"?buildRosePath(word):method==="kamea"?buildKameaPath(word,planet):method==="seal"?buildSealPath(planet,sealKind):null;
    const activeSeal=method==="seal"?getSeal(planet,sealKind):null;
    return(
      <div style={{padding:"28px 24px",fontFamily:F,color:GOLD,maxWidth:560,margin:"0 auto"}}>
        <button onClick={()=>setMode("list")} style={{background:"none",border:"none",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer",marginBottom:24,padding:0}}>← SIGILS</button>
        <div style={{fontSize:11,letterSpacing:3,color:"rgba(200,175,100,0.5)",marginBottom:20}}>NEW SIGIL</div>

        {/* Method picker */}
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {[["rose","Rose Cross"],["kamea","Kamea"],["seal","Seal"],["free","Freehand"]].map(([m,lbl])=>(
            <button key={m} onClick={()=>setMethod(m)} style={{flex:1,padding:"6px 0",border:`1px solid ${method===m?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.1)"}`,borderRadius:4,background:method===m?"rgba(200,175,100,0.06)":"transparent",color:method===m?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,letterSpacing:2,cursor:"pointer"}}>{lbl.toUpperCase()}</button>
          ))}
        </div>

        {/* Planet */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:8}}>PLANET</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {Object.keys(P).map(pk=>(
              <button key={pk} onClick={()=>setSigilPlanet(pk)} style={{padding:"4px 12px",border:`1px solid ${planet===pk?P[pk].col:"rgba(200,175,100,0.1)"}`,borderRadius:10,background:planet===pk?`${P[pk].col}22`:"transparent",color:planet===pk?P[pk].col:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:10,cursor:"pointer"}}>{P[pk].sym} {P[pk].name}</button>
            ))}
          </div>
        </div>

        {/* Intention */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:6}}>INTENTION</div>
          <input value={intent} onChange={e=>setIntent(e.target.value)} placeholder="Describe the working intention..." style={{width:"100%",padding:"8px 12px",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:12,boxSizing:"border-box"}}/>
        </div>

        {/* Word / drawing */}
        {(method==="rose"||method==="kamea")&&(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:6}}>SIGILIZATION WORD {method==="rose"?"(Rose Cross)":"(Kamea)"}</div>
            <div style={{fontSize:9,color:"rgba(200,175,100,0.3)",marginBottom:8}}>
              {method==="rose"?"Enter a key word from your intention. Vowels often removed by practitioners.":"Enter letters — each is mapped to its number on the "+P[planet].name+" kamea."}
            </div>
            <input value={word} onChange={e=>setWord(e.target.value)} placeholder={method==="rose"?"e.g. INCREASE or NCRSE":"e.g. PROSPER"} style={{width:"100%",padding:"8px 12px",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,color:GOLD,fontFamily:F,fontSize:12,boxSizing:"border-box",marginBottom:16}}/>
            {/* Live preview */}
            {word.length>=2&&previewPts&&(
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                <SigilPreview svgData={{method,pts:previewPts,word,planet}} size={200}/>
              </div>
            )}
          </div>
        )}
        {method==="seal"&&(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:6}}>AGRIPPA SEAL (Three Books II.22)</div>
            <div style={{fontSize:9,color:"rgba(200,175,100,0.3)",marginBottom:8,lineHeight:1.6}}>The name of the {P[planet].name}'s {sealKind} traced by gematria across its kamea. The intelligence guides; the spirit is raw force — classically the talisman bears the intelligence to govern the spirit.</div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[["intelligence","Intelligence"],["spirit","Spirit"]].map(([k,lbl])=>(
                <button key={k} onClick={()=>setSealKind(k)} style={{flex:1,padding:"8px 0",border:`1px solid ${sealKind===k?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.12)"}`,borderRadius:4,background:sealKind===k?"rgba(200,175,100,0.07)":"transparent",color:sealKind===k?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,letterSpacing:2,cursor:"pointer"}}>{lbl.toUpperCase()}</button>
              ))}
            </div>
            {activeSeal&&(
              <div style={{textAlign:"center",marginBottom:10}}>
                <div style={{fontFamily:F,fontSize:13,color:P[planet].col}}>{activeSeal.name} <span style={{fontSize:12,color:"rgba(200,175,100,0.5)"}}>{activeSeal.hebrew}</span></div>
                {activeSeal.abbreviated&&<div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginTop:2,fontStyle:"italic"}}>customary short form of the full name</div>}
              </div>
            )}
            {previewPts&&(
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                <SigilPreview svgData={{method:"kamea",pts:previewPts,word:activeSeal?.name,planet}} size={200}/>
              </div>
            )}
          </div>
        )}
        {method==="free"&&(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:8}}>DRAW YOUR SIGIL</div>
            <div style={{position:"relative",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,background:"rgba(0,0,0,0.4)",display:"inline-block",cursor:"crosshair",touchAction:"none"}}>
              <svg width={260} height={260} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                onTouchStart={e=>{e.preventDefault();onMouseDown(e);}} onTouchMove={e=>{e.preventDefault();onMouseMove(e);}} onTouchEnd={onMouseUp}>
                {paths.map((path,i)=><polyline key={i} points={path.map(p=>p.join(",")).join(" ")} fill="none" stroke={P[planet].col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>)}
                {curPath.length>1&&<polyline points={curPath.map(p=>p.join(",")).join(" ")} fill="none" stroke={P[planet].col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>}
              </svg>
            </div>
            <div style={{marginTop:8,display:"flex",gap:8}}>
              <button onClick={()=>{setPaths(prev=>prev.slice(0,-1));}} style={{padding:"4px 12px",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,background:"transparent",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer"}}>UNDO</button>
              <button onClick={()=>{setPaths([]);setCurPath([]);}} style={{padding:"4px 12px",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,background:"transparent",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer"}}>CLEAR</button>
            </div>
          </div>
        )}

        <button onClick={createSigil} disabled={method==="seal"?false:(!intent||(method!=="free"&&word.length<2)||(method==="free"&&!paths.length))} style={{width:"100%",padding:"10px",border:`1px solid rgba(200,175,100,${intent||method==="seal"?"0.4":"0.1"})`,borderRadius:4,background:"transparent",color:intent||method==="seal"?GOLD:"rgba(200,175,100,0.3)",fontFamily:F,fontSize:10,letterSpacing:3,cursor:"pointer"}}>{method==="seal"?"INSCRIBE SEAL":"SEAL SIGIL"}</button>
      </div>
    );
  }

  // List view
  const statusFilter=["all","created","charged","deployed","fulfilled","retired"];
  const setFilter=(f)=>setFilter_(f);
  const shown=filter==="all"?sigils:sigils.filter(s=>s.status===filter);

  return(
    <div style={{padding:"28px 24px",fontFamily:F,color:GOLD,maxWidth:600,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{fontSize:11,letterSpacing:3,color:"rgba(200,175,100,0.5)"}}>SIGIL WORKSHOP</div>
        <button onClick={()=>setMode("create")} style={{padding:"5px 14px",border:"1px solid rgba(200,175,100,0.3)",borderRadius:4,background:"transparent",color:GOLD,fontFamily:F,fontSize:9,letterSpacing:2,cursor:"pointer"}}>+ NEW</button>
      </div>
      {/* Status filter */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {statusFilter.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"3px 10px",borderRadius:10,border:`1px solid ${filter===f?"rgba(200,175,100,0.4)":"rgba(200,175,100,0.1)"}`,background:filter===f?"rgba(200,175,100,0.07)":"transparent",color:filter===f?GOLD:"rgba(200,175,100,0.35)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer",textTransform:"uppercase"}}>{f}</button>
        ))}
      </div>
      {shown.length===0?(
        <div style={{textAlign:"center",padding:"60px 20px",color:"rgba(200,175,100,0.2)",fontSize:12}}>
          {sigils.length===0?"No sigils yet. Create your first working.":"No sigils with this status."}
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
          {shown.map(s=>{
            const pl=P[s.planet];
            return(
              <button key={s.id} onClick={()=>{setSel(s);setMode("view");setAiNote("");}} style={{background:"rgba(0,0,0,0.2)",border:`1px solid ${statusColors[s.status]||"rgba(200,175,100,0.12)"}22`,borderRadius:6,padding:12,cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",justifyContent:"center"}}><SigilPreview svgData={s.svgData} size={110}/></div>
                <div style={{fontSize:8,letterSpacing:2,color:pl?.col||GOLD,opacity:0.7}}>{pl?.sym} {pl?.name?.toUpperCase()}</div>
                <div style={{fontSize:10,color:GOLD,lineHeight:1.3}}>{s.intent||"—"}</div>
                <div style={{fontSize:8,letterSpacing:1,color:statusColors[s.status]||"rgba(200,175,100,0.3)",textTransform:"uppercase"}}>{s.status}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GRIMOIRE SCREEN
// ═══════════════════════════════════════════════════════════════════════
const GRIM_CATS=["ritual","prayer","observation","dream","correspondence","custom"];
function GrimoireScreen({profile}){
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
  const IS={width:"100%",marginTop:4,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:12,boxSizing:"border-box"};
  const filtered=catFilter==="all"?entries:entries.filter(e=>e.category===catFilter);
  if(sel){
    const e=entries.find(x=>x.id===sel);
    if(!e)return null;
    const pl=P[e.planet]||P.sun;
    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
        <div style={{padding:"12px 16px 10px",borderBottom:"1px solid rgba(200,175,100,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:10,cursor:"pointer",letterSpacing:1}}>← Grimoire</button>
          <button onClick={()=>del(e.id)} style={{background:"none",border:"none",color:"rgba(150,70,70,0.5)",fontFamily:F,fontSize:9,cursor:"pointer",letterSpacing:1}}>DELETE</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
            <span style={{fontSize:20,color:pl.col}}>{pl.sym}</span>
            <div>
              <div style={{fontFamily:F,fontSize:15,color:"#D4AF6A"}}>{e.title||"Untitled"}</div>
              <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",marginTop:2}}>{e.date} · {e.category} {e.type==="ai-generated"?"· AI Generated":""}</div>
            </div>
          </div>
          {e.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
            {e.tags.map(t=><span key={t} style={{padding:"3px 8px",borderRadius:6,background:"rgba(200,175,100,0.08)",border:"1px solid rgba(200,175,100,0.15)",fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.5)"}}>{t}</span>)}
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
        <button onClick={()=>setShowNew(!showNew)} style={{padding:"8px 14px",borderRadius:10,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.28)",fontFamily:F,fontSize:9,color:"#D4AF6A",letterSpacing:2,cursor:"pointer"}}>{showNew?"CANCEL":"+ NEW"}</button>
      </div>
      {showNew&&(
        <div style={{margin:"0 14px 10px",padding:"13px 14px",borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,175,100,0.1)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Category</div>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{...IS,marginTop:0}}>
                {GRIM_CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Planet</div>
              <select value={form.planet} onChange={e=>setForm({...form,planet:e.target.value})} style={{...IS,marginTop:0}}>
                {Object.keys(P).map(pk=><option key={pk} value={pk}>{P[pk].name}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:8}}><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Title</div><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Entry title" style={IS}/></div>
          <div style={{marginBottom:8}}><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Body</div><textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={5} placeholder="Your entry…" style={{...IS,resize:"vertical"}}/></div>
          <div style={{marginBottom:8}}><div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Tags (comma-separated)</div><input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="jupiter, talisman, career…" style={IS}/></div>
          <button onClick={save} disabled={!form.title&&!form.body} style={{width:"100%",padding:"10px 0",borderRadius:10,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.3)",fontFamily:F,fontSize:9,color:"#D4AF6A",letterSpacing:2,cursor:"pointer"}}>Save Entry</button>
        </div>
      )}
      <div style={{display:"flex",gap:6,padding:"0 14px 8px",overflowX:"auto"}}>
        {["all",...GRIM_CATS].map(c=>(
          <button key={c} onClick={()=>setCatFilter(c)} style={{padding:"5px 10px",borderRadius:8,background:catFilter===c?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${catFilter===c?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:8,color:catFilter===c?"#D4AF6A":"rgba(200,175,100,0.4)",letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap"}}>
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
              <div style={{fontFamily:F,fontSize:12,color:"#D4AF6A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title||"Untitled"}</div>
              <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.35)",marginTop:2}}>{e.date} · {e.category}{e.type==="ai-generated"?" · AI":""}</div>
            </div>
            <span style={{color:"rgba(200,175,100,0.2)",fontSize:14,flexShrink:0}}>›</span>
          </button>
        );})}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LEARN SCREEN
// ═══════════════════════════════════════════════════════════════════════
export const FOUNDATIONS=[
  {id:"f1",title:"Animism & the Living World",subtitle:"How the world is made of relationships, not objects",lessons:5,topics:["animism-foundation","spirits-allies","liminal-entities"],icon:"🌿",color:"#5CA87C"},
  {id:"f2",title:"Timing & the Sky",subtitle:"Planetary hours, lunar cycles, and elections",lessons:7,topics:["planetary-hours","lunar-timing","electional"],icon:"☽",color:"#D4AF6A"},
  {id:"f3",title:"The Dead & the Ancestors",subtitle:"Working with the ancestor current and the holy dead",lessons:4,topics:["ancestor-work","saints-holy-dead"],icon:"⚰",color:"#8A78C8"},
  {id:"f4",title:"Divination & Fortune",subtitle:"Reading the patterns — omens, lots, and the future",lessons:5,topics:["fortune-divination","dream-work"],icon:"◈",color:"#C87878"},
  {id:"f5",title:"The Blended Cycle Model",subtitle:"Placing your magic in historical time",lessons:3,topics:["blended-cycle"],icon:"⟳",color:"#78A8C8"},
  {id:"f6",title:"Building Your Posse",subtitle:"Ancestors, fortune entity, daimon — assembling the spirit team",lessons:5,topics:["wyrd-fortune","ancestor-work","spirits-allies","sacrifice-reciprocity"],icon:"⊕",color:"#C8A878"},
  {id:"f7",title:"Grimoire & the 72 Spirits",subtitle:"Extradimensional diplomacy — from command to relationship",lessons:6,topics:["goetia-spirits","headless-rite","invocation"],icon:"⊗",color:"#9878C8"},
  {id:"f8",title:"Narrative Magic & Synchronicity",subtitle:"Story as technology — enchanting the frame, reading the response",lessons:4,topics:["narrative-magic","synchronicity","fortune-divination"],icon:"◎",color:"#78C8A8"},
  {id:"f9",title:"The Stellar Tradition",subtitle:"Star.Ships, decan spirits, and the Laurasian wellspring",lessons:5,topics:["stellar-cult","fixed-stars","star-ships-thesis","headless-rite"],icon:"★",color:"#7888E8"},
];
function LearnScreen({profile}){
  const [learnMode,setLearnMode]=useState("topics"); // "foundations" | "topics"
  const [primerOpen,setPrimerOpen]=useState(null);
  const [topic,setTopic]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [testMode,setTestMode]=useState(false);
  const [foundProgress,setFoundProgress]=useState(()=>{try{return JSON.parse(localStorage.getItem("astrum_foundations")||"{}");}catch{return{};}});
  const bottomRef=useRef(null);
  const userTraditions=profile?.traditions||["western-ceremonial"];
  const filteredTopics=LEARN_TOPICS.filter(t=>t.traditions.includes("all")||userTraditions.some(ut=>t.traditions.includes(ut)));
  const saveFP=(fp)=>{setFoundProgress(fp);try{localStorage.setItem("astrum_foundations",JSON.stringify(fp));}catch(e){}};
  const sendMsg=async(text,history)=>{
    if(loading)return;
    const apiKey=profile?.apiKey||"";
    const newMsgs=[...history,{role:"user",content:text}];
    setMsgs(newMsgs);setLoading(true);
    if(!aiConfigured()){setMsgs(m=>[...m,{role:"assistant",content:aiUnconfiguredMessage()}]);setLoading(false);return;}
    const modeNote=testMode?"You are in TEST MODE. Ask the student a specific question about the topic they have been learning. Wait for their answer, then evaluate it: affirm what is correct, gently correct what is wrong, and deepen the teaching. Then ask another question.":"You are in LESSON MODE. Teach using the Socratic method: introduce a key concept, ask the student a thought-provoking question, respond to their answer with deeper insight. Keep your turns to 2-3 paragraphs maximum. Guide discovery rather than simply lecturing.";
    const sys=buildSystemPrompt(profile,`You are a master teacher of magical tradition and esoteric knowledge.\n\n${modeNote}`);
    try{
      const txt=await askClaude({apiKey,system:sys,maxTokens:700,messages:newMsgs.map(m=>({role:m.role,content:m.content}))});
      setMsgs(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){setMsgs(m=>[...m,{role:"assistant",content:e.message||"Learn unavailable — check connection."}]);}
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  const startTopic=(t,fromFoundation)=>{
    setTopic({...t,fromFoundation});setMsgs([]);setInput("");setTestMode(false);setLoading(false);
    const prompt=`I want to learn about: ${t.label}. Topic context: ${t.desc}. Please begin the lesson.`;
    setTimeout(()=>sendMsg(prompt,[]),80);
  };
  const startFoundationModule=(mod)=>{
    const firstTopicId=mod.topics[0];
    const t=LEARN_TOPICS.find(lt=>lt.id===firstTopicId)||{id:firstTopicId,label:mod.title,desc:mod.subtitle,level:"beginner"};
    const fp={...foundProgress,[mod.id]:{started:true,lessonsComplete:foundProgress[mod.id]?.lessonsComplete||0}};
    saveFP(fp);
    startTopic(t,mod.id);
  };
  const markLessonComplete=(foundationId)=>{
    if(!foundationId)return;
    const cur=foundProgress[foundationId]||{started:true,lessonsComplete:0};
    const mod=FOUNDATIONS.find(f=>f.id===foundationId);
    const next={...foundProgress,[foundationId]:{...cur,lessonsComplete:Math.min(mod.lessons,(cur.lessonsComplete||0)+1)}};
    saveFP(next);
  };
  const sendFollow=()=>{if(!input.trim()||loading)return;const i=input;setInput("");sendMsg(i,msgs);};
  const switchMode=()=>{
    const nm=!testMode;setTestMode(nm);
    sendMsg(nm?"Switch to test mode — ask me a question about what we've covered so far.":"Return to lesson mode — continue the lesson from where we left off.",msgs);
  };
  // Lesson view (shared between both modes)
  if(topic){
    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:0}}>
        <div style={{padding:"12px 16px 10px",borderBottom:"1px solid rgba(200,175,100,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{setTopic(null);setMsgs([]);}} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:10,letterSpacing:1,cursor:"pointer",padding:0}}>←</button>
            <span style={{color:"rgba(200,175,100,0.15)"}}>|</span>
            <div style={{fontFamily:F,fontSize:12,color:"#D4AF6A"}}>{topic.label}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {topic.fromFoundation&&(
              <button onClick={()=>markLessonComplete(topic.fromFoundation)} style={{padding:"5px 9px",borderRadius:8,background:"rgba(92,168,92,0.12)",border:"1px solid rgba(92,168,92,0.3)",fontFamily:F,fontSize:7,color:"#5CA87C",letterSpacing:1,cursor:"pointer"}}>✓ DONE</button>
            )}
            <button onClick={switchMode} disabled={loading||msgs.length<2} style={{padding:"6px 10px",borderRadius:8,background:testMode?"rgba(212,175,106,0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${testMode?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.12)"}`,fontFamily:F,fontSize:8,color:testMode?"#D4AF6A":"rgba(200,175,100,0.4)",letterSpacing:1,cursor:"pointer"}}>
              {testMode?"LESSON":"TEST ME"}
            </button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>
          {/* Static sourced primer — the lesson's foundation, no API key required */}
          {(()=>{
            const primer=TOPIC_PRIMERS[topic.id];
            if(!primer)return null;
            return(
              <div style={{marginBottom:14,padding:"12px 14px",borderRadius:12,background:"rgba(8,5,22,0.75)",border:"1px solid rgba(212,175,106,0.2)"}}>
                <div style={{fontFamily:F,fontSize:8,color:"rgba(212,175,106,0.6)",letterSpacing:2.5,textTransform:"uppercase",marginBottom:7}}>⬡ Primer</div>
                <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{primer.body}</div>
                <div style={{marginTop:9,paddingTop:8,borderTop:"1px solid rgba(200,175,100,0.08)"}}>
                  {primer.sources.map((s,i)=><div key={i} style={{fontFamily:F,fontSize:8.5,color:"rgba(200,175,100,0.4)",lineHeight:1.6}}>· {s}</div>)}
                  <div style={{fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.55)",fontStyle:"italic",marginTop:5,lineHeight:1.6}}>In this app: {primer.inApp}</div>
                </div>
              </div>
            );
          })()}
          {!aiConfigured()&&!TOPIC_PRIMERS[topic.id]&&<div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",lineHeight:1.7,marginBottom:12}}>This topic has no static primer yet — the Socratic tutor needs an AI engine (Profile → AI Engine).</div>}
          {loading&&msgs.length<=1&&<div style={{display:"flex",gap:5,padding:"32px 0",justifyContent:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(200,175,100,0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          {msgs.filter(m=>m.role!=="user"||msgs.indexOf(m)>0).map((m,i)=>(
            <div key={i} style={{marginBottom:14}}>
              {m.role==="user"&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",marginBottom:4,letterSpacing:1}}>YOU</div>}
              <div style={{fontFamily:F,fontSize:11.5,color:m.role==="user"?"#9A8060":"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{m.content}</div>
            </div>
          ))}
          {loading&&msgs.length>1&&<div style={{display:"flex",gap:5,padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(200,175,100,0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"8px 12px 16px",borderTop:"1px solid rgba(200,175,100,0.06)",display:"flex",gap:8,flexShrink:0}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendFollow();}}} placeholder={testMode?"Answer the question…":"Ask a question or respond…"} rows={2} style={{flex:1,resize:"none",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:11}}/>
          <button onClick={sendFollow} disabled={!input.trim()||loading} style={{padding:"0 12px",borderRadius:10,background:input.trim()?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(input.trim()?"rgba(212,175,106,0.28)":"rgba(200,175,100,0.08)"),fontFamily:F,fontSize:9,color:input.trim()?"#D4AF6A":"#4A3020",letterSpacing:1,cursor:input.trim()?"pointer":"default",height:36,alignSelf:"flex-end"}}>SEND</button>
        </div>
      </div>
    );
  }
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Magical Education</div>
        <div style={T(20)}>Learn ⬡</div>
      </div>
      {/* Mode Toggle */}
      <div style={{padding:"0 14px 10px",display:"flex",gap:5}}>
        {[{id:"foundations",label:"Foundations Path"},{id:"topics",label:"Topics Library"}].map(m=>(
          <button key={m.id} onClick={()=>setLearnMode(m.id)} style={{flex:1,padding:"8px 0",borderRadius:10,background:learnMode===m.id?"rgba(212,175,106,0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(learnMode===m.id?"rgba(212,175,106,0.38)":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:learnMode===m.id?"#D4AF6A":"#6A5030",letterSpacing:1,cursor:"pointer"}}>{m.label}</button>
        ))}
      </div>
      {/* Foundations Path */}
      {learnMode==="foundations"&&(
        <div>
          <div style={{padding:"0 18px 10px",fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",lineHeight:1.7}}>Nine foundational modules — work through them in sequence. Each opens with a sourced primer (no API key needed). Each builds on the last. The AI teaches through Socratic dialogue.</div>
          {FOUNDATIONS.map((mod,i)=>{
            const prog=foundProgress[mod.id]||{started:false,lessonsComplete:0};
            const pct=(prog.lessonsComplete||0)/mod.lessons;
            const started=prog.started||false;
            return(
              <div key={mod.id} style={{margin:"0 14px 8px",borderRadius:14,background:"rgba(8,5,22,0.7)",border:`1px solid ${mod.color}25`,borderLeft:`3px solid ${mod.color}${started?"80":"30"}`}}>
                <div style={{padding:"13px 14px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                    <span style={{fontSize:20,flexShrink:0,opacity:started?1:0.4}}>{mod.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",letterSpacing:2}}>MODULE {i+1}</span>
                        {pct>=1&&<span style={{fontFamily:F,fontSize:7,color:"#5CA87C",letterSpacing:1,background:"rgba(92,168,92,0.12)",border:"1px solid rgba(92,168,92,0.25)",borderRadius:4,padding:"1px 5px"}}>COMPLETE</span>}
                      </div>
                      <div style={{fontFamily:F,fontSize:13,color:started?mod.color:"rgba(200,175,100,0.5)"}}>{mod.title}</div>
                      <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.35)",marginTop:2,lineHeight:1.5}}>{mod.subtitle}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{height:2,background:"rgba(200,175,100,0.08)",borderRadius:1,marginBottom:8}}>
                    <div style={{height:"100%",width:`${pct*100}%`,background:mod.color,borderRadius:1,opacity:0.7,transition:"width 0.4s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)"}}>{prog.lessonsComplete||0} / {mod.lessons} lessons</div>
                    <div style={{display:"flex",gap:6}}>
                      {FOUNDATION_PRIMERS[mod.id]&&(
                        <button onClick={()=>setPrimerOpen(primerOpen===mod.id?null:mod.id)} style={{padding:"6px 11px",borderRadius:9,background:primerOpen===mod.id?`${mod.color}14`:"rgba(0,0,0,0.3)",border:`1px solid ${primerOpen===mod.id?mod.color+"40":"rgba(200,175,100,0.12)"}`,fontFamily:F,fontSize:9,color:primerOpen===mod.id?mod.color:"rgba(200,175,100,0.45)",cursor:"pointer"}}>
                          {primerOpen===mod.id?"Close":"Primer"}
                        </button>
                      )}
                      <button onClick={()=>startFoundationModule(mod)} style={{padding:"6px 14px",borderRadius:9,background:`${mod.color}14`,border:`1px solid ${mod.color}40`,fontFamily:F,fontSize:9,color:mod.color,cursor:"pointer"}}>
                        {started?(pct>=1?"Review":"Continue"):"Begin →"}
                      </button>
                    </div>
                  </div>
                  {primerOpen===mod.id&&FOUNDATION_PRIMERS[mod.id]&&(
                    <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${mod.color}20`}}>
                      <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{FOUNDATION_PRIMERS[mod.id].body}</div>
                      <div style={{marginTop:8}}>
                        {FOUNDATION_PRIMERS[mod.id].sources.map((s,i)=><div key={i} style={{fontFamily:F,fontSize:8.5,color:"rgba(200,175,100,0.4)",lineHeight:1.6}}>· {s}</div>)}
                        <div style={{fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.55)",fontStyle:"italic",marginTop:5,lineHeight:1.6}}>In this app: {FOUNDATION_PRIMERS[mod.id].inApp}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Topics Library */}
      {learnMode==="topics"&&(
        <div>
          <div style={{padding:"0 18px 8px",fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",lineHeight:1.7}}>Choose any topic. The AI teaches through Socratic dialogue — asking questions, building understanding from the inside out.</div>
          {["beginner","intermediate","advanced"].filter(l=>filteredTopics.some(t=>t.level===l)).map(l=>(
            <div key={l}>
              <div style={{padding:"8px 18px 4px",fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",letterSpacing:3,textTransform:"uppercase"}}>{l}</div>
              {filteredTopics.filter(t=>t.level===l).map(t=>(
                <button key={t.id} onClick={()=>startTopic(t,null)} style={{width:"100%",padding:"11px 18px",background:"none",border:"none",borderBottom:"1px solid rgba(200,175,100,0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                  <span style={{fontSize:20,color:"rgba(200,175,100,0.2)",flexShrink:0}}>⬡</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F,fontSize:13,color:"rgba(200,175,100,0.8)"}}>{t.label}</div>
                    <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",marginTop:2}}>{t.desc}</div>
                  </div>
                  <span style={{color:"rgba(200,175,100,0.2)",fontSize:14}}>›</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PROFILE / SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE COMPONENT (embedded in ProfileScreen)
// ═══════════════════════════════════════════════════════════════════════
function AIEngineCard(){
  const [cfg,setCfg]=useState(()=>{const c=resolveAIConfig();return {provider:c.provider,localUrl:c.localUrl,localModel:c.localModel,localKey:c.localKey,webllmModel:c.webllmModel};});
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [prog,setProg]=useState("");
  const save=(patch)=>{const next={...cfg,...patch};setCfg(next);saveJSON("astrum_ai",next);};
  const IS={width:"100%",marginTop:6,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:8,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:11,boxSizing:"border-box"};
  const test=async()=>{
    setBusy(true);setMsg("");setProg("");
    try{
      const {askAI}=await import("./ai/client.js");
      const out=await askAI({system:"You are a terse test.",messages:[{role:"user",content:"Reply with exactly: ready"}],maxTokens:16,onProgress:p=>setProg(p?.text||"")});
      setMsg("✓ Engine replied: "+(out||"").trim().slice(0,60));
    }catch(e){setMsg("✗ "+(e.message||"failed"));}
    setBusy(false);setProg("");
  };
  const warmWebLLM=async()=>{
    setBusy(true);setMsg("Downloading & compiling the model — this is a one-time step, then it runs offline…");setProg("");
    try{
      const {getEngine}=await import("./ai/webllm.js");
      await getEngine(cfg.webllmModel,p=>setProg(`${p?.text||""} ${p?.progress?Math.round(p.progress*100)+"%":""}`));
      setMsg("✓ On-device model ready — it now works with no network.");
    }catch(e){setMsg("✗ "+(e.message||"failed"));}
    setBusy(false);
  };
  const webgpu=typeof navigator!=="undefined"&&!!navigator.gpu;
  const opt=(id,label,sub)=>(
    <button key={id} onClick={()=>save({provider:id})} style={{width:"100%",textAlign:"left",padding:"9px 11px",borderRadius:10,marginBottom:5,background:cfg.provider===id?"rgba(212,175,106,0.1)":"rgba(0,0,0,0.25)",border:`1px solid ${cfg.provider===id?"rgba(212,175,106,0.4)":"rgba(200,175,100,0.08)"}`,cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:14,height:14,borderRadius:7,border:`1px solid ${cfg.provider===id?GOLD:"rgba(200,175,100,0.3)"}`,background:cfg.provider===id?GOLD:"transparent",flexShrink:0}}/>
        <span style={{fontFamily:F,fontSize:11,color:cfg.provider===id?GOLD:"rgba(200,175,100,0.6)"}}>{label}</span>
      </div>
      <div style={{fontFamily:F,fontSize:8.5,color:"rgba(200,175,100,0.35)",marginTop:3,marginLeft:22,lineHeight:1.5}}>{sub}</div>
    </button>
  );
  return(
    <div className="card" style={{margin:"0 14px 10px"}}>
      <div style={L()}>AI Engine</div>
      <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Which brain powers the Oracle, tutor, and reflections. Choose the cloud, your own server, or a model that runs entirely on this device.</div>
      <div style={{marginTop:10}}>
        {opt("anthropic","Anthropic — cloud","Best quality. Uses your API key below. Needs a connection.")}
        {opt("local","Local server — OpenAI-compatible","Point at Ollama, llama.cpp, or LM Studio on your network. Private, offline if the server is local.")}
        {opt("webllm","On-device — WebGPU","A quantized model running in the app itself. Downloads once, then works with no network — for a dedicated offline iPad.")}
      </div>
      {cfg.provider==="anthropic"&&(
        <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",marginTop:4,fontStyle:"italic"}}>Set the key in the Anthropic API Key card below.</div>
      )}
      {cfg.provider==="local"&&(
        <div style={{marginTop:4}}>
          <input value={cfg.localUrl} onChange={e=>save({localUrl:e.target.value})} placeholder="http://localhost:11434/v1" style={IS}/>
          <input value={cfg.localModel} onChange={e=>save({localModel:e.target.value})} placeholder="model name (e.g. llama3.1)" style={IS}/>
          <input type="password" value={cfg.localKey} onChange={e=>save({localKey:e.target.value})} placeholder="API key (optional)" style={IS}/>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginTop:5,lineHeight:1.5}}>The URL should include the version path (…/v1). A dedicated iPad can reach a server on the same network.</div>
        </div>
      )}
      {cfg.provider==="webllm"&&(
        <div style={{marginTop:4}}>
          {!webgpu&&<div style={{fontFamily:F,fontSize:9,color:"#C08050",marginTop:2,lineHeight:1.6}}>⚠ This device reports no WebGPU. On-device AI needs it (recent iPadOS/Safari). Where it's missing, use the cloud or a local server.</div>}
          <select value={cfg.webllmModel} onChange={e=>save({webllmModel:e.target.value})} style={IS}>
            {WEBLLM_MODELS.map(m=><option key={m.id} value={m.id}>{m.label} · {m.size}</option>)}
          </select>
          <button onClick={warmWebLLM} disabled={busy||!webgpu} style={{width:"100%",marginTop:6,padding:"9px 0",borderRadius:8,background:webgpu?"rgba(100,80,160,0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${webgpu?"rgba(100,80,160,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:9,color:webgpu?"rgba(160,140,220,0.85)":"#5A4020",letterSpacing:1.5,cursor:webgpu?"pointer":"default"}}>{busy?"WORKING…":"⬇ DOWNLOAD & WARM UP MODEL"}</button>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginTop:5,lineHeight:1.5}}>First download is large (see size) and needs a connection once; afterward the model is cached and runs offline.</div>
        </div>
      )}
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <button onClick={test} disabled={busy} style={{flex:1,padding:"8px 0",borderRadius:8,background:"rgba(200,175,100,0.08)",border:"1px solid rgba(200,175,100,0.2)",fontFamily:F,fontSize:9,color:GOLD,letterSpacing:1.5,cursor:"pointer"}}>{busy?"…":"TEST ENGINE"}</button>
      </div>
      {prog&&<div style={{fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.6)",marginTop:6,lineHeight:1.5}}>{prog}</div>}
      {msg&&<div style={{fontFamily:F,fontSize:9,color:msg.startsWith("✓")?"#7A9A7A":"#9B5050",marginTop:6,lineHeight:1.5}}>{msg}</div>}
    </div>
  );
}

function IntakeCard(){
  const [text,setText]=useState("");
  const [source,setSource]=useState("");
  const [year,setYear]=useState(new Date().getFullYear());
  const [parsed,setParsed]=useState(null); // candidate events, pre-save
  const [asNode,setAsNode]=useState(true);
  const [msg,setMsg]=useState("");
  const [sources,setSources]=useState(()=>{const f=loadFeed();const m={};f.forEach(e=>{m[e.source]=(m[e.source]||0)+1;});return m;});
  const refreshSources=()=>{const f=loadFeed();const m={};f.forEach(e=>{m[e.source]=(m[e.source]||0)+1;});setSources(m);};
  const [aiBusy,setAiBusy]=useState(false);
  const doParse=()=>{
    if(!text.trim())return;
    const ev=parseFeed(text,source.trim()||"Imported",year);
    setParsed(ev);
    setMsg(ev.length?`${ev.length} timing event${ev.length>1?"s":""} detected — review and save.`:"No dated timing found. You can still file the text as a knowledge node.");
  };
  const doAIParse=async()=>{
    if(!text.trim())return;
    setAiBusy(true);setMsg("Reading with the AI engine…");
    const src=source.trim()||"Imported";
    const heuristic=parseFeed(text,src,year);
    try{
      const {askAI}=await import("./ai/client.js");
      const {system,messages}=aiExtractionMessages(text,year);
      const reply=await askAI({system,messages,maxTokens:1500});
      const aiEvents=parseAIResponse(reply,src,year);
      const merged=mergeEvents(aiEvents,heuristic); // AI-preferred, heuristic backfills
      setParsed(merged);
      setMsg(merged.length?`${merged.length} event${merged.length>1?"s":""} detected (AI + pattern) — review and save.`:"The AI found no dated timing. You can still file the text as a knowledge node.");
    }catch(e){
      setParsed(heuristic);
      setMsg(`AI engine unavailable (${(e.message||"").slice(0,60)}). Fell back to pattern detection${heuristic.length?` — ${heuristic.length} found`:""}.`);
    }
    setAiBusy(false);
  };
  const removeCandidate=(id)=>setParsed(p=>p.filter(e=>e.id!==id));
  const save=()=>{
    let added=0;
    if(parsed&&parsed.length)added=addFeedEvents(parsed);
    if(asNode&&text.trim()){
      const node={id:Date.now(),title:`${source.trim()||"Import"} — ${new Date().toLocaleDateString()}`,content:text.trim(),source:source.trim(),always:false,dateAdded:new Date().toISOString()};
      saveKnowledge([...loadKnowledge(),node]);
    }
    setMsg(`✓ Saved${added?` ${added} events to the calendar feed`:""}${asNode&&text.trim()?`${added?" and":""} the text as a knowledge node`:""}.`);
    setText("");setParsed(null);refreshSources();
  };
  const clearSource=(s)=>{deleteFeedSource(s);refreshSources();setMsg(`Removed all "${s}" events from the feed.`);};
  const IS={width:"100%",padding:"7px 10px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:6,color:GOLD,fontFamily:F,fontSize:11,boxSizing:"border-box"};
  return(
    <div className="card" style={{margin:"0 14px 10px"}}>
      <div style={L()}>Intake — Timing Letters & Material</div>
      <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.35)",marginTop:4,lineHeight:1.6}}>
        Paste a timing letter or a post you subscribe to. Dated lines become source-tagged events on your Almanac; the full text can be filed as an attributed knowledge node the Oracle can draw on. Runs entirely on-device.
      </div>
      <div style={{display:"flex",gap:6,marginTop:10}}>
        <input value={source} onChange={e=>setSource(e.target.value)} placeholder="Source (e.g. Circle Thrice, Rune Soup)" style={{...IS,flex:2}}/>
        <input type="number" value={year} onChange={e=>setYear(+e.target.value)} title="Year for undated lines" style={{...IS,flex:1,minWidth:0}}/>
      </div>
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={6} placeholder="Paste the newsletter or post text here…" style={{...IS,marginTop:6,resize:"vertical"}}/>
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button onClick={doParse} disabled={!text.trim()} style={{flex:1,padding:"8px 0",borderRadius:8,background:text.trim()?"rgba(200,175,100,0.1)":"rgba(0,0,0,0.3)",border:`1px solid ${text.trim()?"rgba(200,175,100,0.28)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:9,color:text.trim()?GOLD:"#5A4020",letterSpacing:1.5,cursor:"pointer"}}>DETECT TIMING</button>
        {aiConfigured()&&<button onClick={doAIParse} disabled={!text.trim()||aiBusy} style={{flex:1,padding:"8px 0",borderRadius:8,background:text.trim()?"rgba(100,80,160,0.14)":"rgba(0,0,0,0.3)",border:`1px solid ${text.trim()?"rgba(100,80,160,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:9,color:text.trim()?"rgba(160,140,220,0.85)":"#5A4020",letterSpacing:1.5,cursor:"pointer"}}>{aiBusy?"READING…":"✧ AI DETECT"}</button>}
        {(parsed!==null)&&<button onClick={save} style={{flex:1,padding:"8px 0",borderRadius:8,background:"rgba(92,168,92,0.12)",border:"1px solid rgba(92,168,92,0.35)",fontFamily:F,fontSize:9,color:"#7AB07A",letterSpacing:1.5,cursor:"pointer"}}>SAVE</button>}
      </div>
      <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginTop:5,lineHeight:1.5}}>Pattern detection runs on-device always. AI detect handles messier formats — and runs offline too when your engine is local or on-device.</div>
      <button onClick={()=>setAsNode(a=>!a)} style={{marginTop:7,display:"flex",alignItems:"center",gap:7,background:"none",border:"none",cursor:"pointer",padding:0}}>
        <span style={{width:16,height:16,borderRadius:4,border:`1px solid ${asNode?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.2)"}`,background:asNode?"rgba(200,175,100,0.15)":"transparent",color:GOLD,fontSize:9,lineHeight:"16px",textAlign:"center",flexShrink:0}}>{asNode?"✓":""}</span>
        <span style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.5)"}}>Also file the full text as a knowledge node</span>
      </button>
      {parsed!==null&&parsed.length>0&&(
        <div style={{marginTop:9,borderTop:"1px solid rgba(200,175,100,0.08)",paddingTop:8}}>
          {parsed.map(e=>{const k=FEED_KIND_META[e.kind];return(
            <div key={e.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"4px 0"}}>
              <span style={{color:k.col,fontSize:11,width:14,flexShrink:0}}>{k.glyph}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:F,fontSize:9.5,color:"#C4A870",lineHeight:1.5}}>{e.title}</div>
                <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)"}}>{e.date}{e.time?` · ${e.time}`:""} · {k.label}</div>
              </div>
              <button onClick={()=>removeCandidate(e.id)} style={{background:"none",border:"none",color:"rgba(200,100,100,0.5)",cursor:"pointer",fontSize:11,flexShrink:0}}>✕</button>
            </div>
          );})}
        </div>
      )}
      {msg&&<div style={{fontFamily:F,fontSize:9,color:msg.startsWith("✓")?"#7A9A7A":"rgba(200,175,100,0.5)",marginTop:8,lineHeight:1.5}}>{msg}</div>}
      {Object.keys(sources).length>0&&(
        <div style={{marginTop:9,borderTop:"1px solid rgba(200,175,100,0.08)",paddingTop:8}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>Feed Sources</div>
          {Object.entries(sources).map(([s,n])=>(
            <div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0"}}>
              <span style={{fontFamily:F,fontSize:9.5,color:"#C4A870"}}>{s} · {n} event{n>1?"s":""}</span>
              <button onClick={()=>clearSource(s)} style={{background:"none",border:"none",color:"rgba(200,100,100,0.4)",cursor:"pointer",fontFamily:F,fontSize:8,letterSpacing:1}}>CLEAR</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeBase(){
  const [nodes,setNodes]=useState(()=>loadKnowledge());
  const [adding,setAdding]=useState(false);
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  const [source,setSource]=useState("");
  const [always,setAlways]=useState(true);
  const [expanded,setExpanded]=useState(null);

  const addNode=()=>{
    if(!title.trim()||!content.trim())return;
    const node={id:Date.now(),title:title.trim(),content:content.trim(),source:source.trim(),always,dateAdded:new Date().toISOString()};
    const next=[...nodes,node];
    setNodes(next);saveKnowledge(next);
    setTitle("");setContent("");setSource("");setAdways(true);setAdding(false);
  };
  // typo fix: setAlways
  const setAdways=setAlways;
  const deleteNode=(id)=>{const next=nodes.filter(n=>n.id!==id);setNodes(next);saveKnowledge(next);};
  const toggleAlways=(id)=>{const next=nodes.map(n=>n.id===id?{...n,always:!n.always}:n);setNodes(next);saveKnowledge(next);};

  return(
    <div className="card" style={{margin:"0 14px 10px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={L()}>Knowledge Base</div>
        <button onClick={()=>setAdding(!adding)} style={{padding:"3px 10px",border:"1px solid rgba(200,175,100,0.2)",borderRadius:6,background:"transparent",color:GOLD,fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer"}}>{adding?"CANCEL":"+ ADD"}</button>
      </div>
      <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",marginTop:4,lineHeight:1.5}}>
        Knowledge nodes are injected into the AI system prompt. Mark as "Always Include" to inject on every AI call.
      </div>
      {adding&&(
        <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Node title (e.g. 'Agrippa — Herb Correspondences')" style={{width:"100%",padding:"7px 10px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:6,color:GOLD,fontFamily:F,fontSize:11,boxSizing:"border-box"}}/>
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Paste knowledge content here — text from a PDF, a URL summary, your own notes…" rows={6} style={{width:"100%",padding:"7px 10px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:6,color:GOLD,fontFamily:F,fontSize:11,resize:"vertical",boxSizing:"border-box"}}/>
          <input value={source} onChange={e=>setSource(e.target.value)} placeholder="Source (optional — book, URL, author)" style={{width:"100%",padding:"7px 10px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.15)",borderRadius:6,color:GOLD,fontFamily:F,fontSize:11,boxSizing:"border-box"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>setAlways(!always)} style={{width:18,height:18,borderRadius:4,border:`1px solid ${always?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.2)"}`,background:always?"rgba(200,175,100,0.15)":"transparent",cursor:"pointer",flexShrink:0}}>
              {always&&<span style={{color:GOLD,fontSize:10,lineHeight:"18px",display:"block",textAlign:"center"}}>✓</span>}
            </button>
            <span style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.5)"}}>Always include in AI prompt</span>
          </div>
          <button onClick={addNode} disabled={!title.trim()||!content.trim()} style={{padding:"7px 0",border:"1px solid rgba(200,175,100,0.25)",borderRadius:6,background:"transparent",color:GOLD,fontFamily:F,fontSize:9,letterSpacing:2,cursor:"pointer"}}>ADD NODE</button>
        </div>
      )}
      {nodes.length===0&&!adding&&(
        <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.2)",marginTop:12,textAlign:"center",padding:"16px 0"}}>No knowledge nodes yet.</div>
      )}
      {nodes.map(n=>(
        <div key={n.id} style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(200,175,100,0.07)"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
            <button onClick={()=>setExpanded(expanded===n.id?null:n.id)} style={{flex:1,background:"none",border:"none",textAlign:"left",cursor:"pointer",padding:0}}>
              <div style={{fontFamily:F,fontSize:11,color:GOLD}}>{n.title}</div>
              {n.source&&<div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.35)",marginTop:2}}>{n.source}</div>}
            </button>
            <button onClick={()=>toggleAlways(n.id)} title="Toggle always-include" style={{width:20,height:20,borderRadius:4,border:`1px solid ${n.always?"rgba(200,175,100,0.4)":"rgba(200,175,100,0.1)"}`,background:n.always?"rgba(200,175,100,0.1)":"transparent",color:GOLD,fontSize:9,cursor:"pointer",flexShrink:0}}>{n.always?"⊕":"○"}</button>
            <button onClick={()=>deleteNode(n.id)} style={{width:20,height:20,borderRadius:4,border:"1px solid rgba(200,100,100,0.2)",background:"transparent",color:"rgba(200,100,100,0.5)",fontSize:9,cursor:"pointer",flexShrink:0}}>✕</button>
          </div>
          {expanded===n.id&&(
            <div style={{marginTop:8,maxHeight:120,overflowY:"auto",fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.5)",lineHeight:1.6,background:"rgba(0,0,0,0.3)",padding:"6px 8px",borderRadius:4}}>
              {n.content.slice(0,500)}{n.content.length>500?"…":""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NotifyCard({notifyPrefs,setNotifyPrefs}){
  const [msg,setMsg]=useState("");
  const prefs=notifyPrefs||DEFAULT_NOTIFY_PREFS;
  const update=(patch)=>{const next={...prefs,...patch,kinds:{...prefs.kinds,...(patch.kinds||{})}};saveNotifyPrefs(next);setNotifyPrefs(next);};
  const toggleEnabled=async()=>{
    if(!prefs.enabled){
      const ok=await ensurePermission();
      if(!ok){setMsg("✗ Notification permission denied — enable it in system settings.");return;}
      setMsg("");update({enabled:true});
    }else update({enabled:false});
  };
  const KINDS=[["hourChange","Planetary hour changes","for your chosen planets"],["voc","Void of course Moon","start and end"],["elections","Election reminders","24h and 1h before committed windows"],["briefing","Morning briefing","the day's sky at your chosen time"],["athanor","Athanor steps","when an operation's window opens"]];
  const isWeb=!window.Capacitor?.isNativePlatform?.()&&!window.__TAURI_INTERNALS__;
  return(
    <div className="card" style={{margin:"0 14px 10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={L()}>Ambient Practice</div>
        <button onClick={toggleEnabled} style={{padding:"6px 14px",borderRadius:9,background:prefs.enabled?"rgba(92,168,92,0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${prefs.enabled?"rgba(92,168,92,0.4)":"rgba(200,175,100,0.15)"}`,fontFamily:F,fontSize:9,color:prefs.enabled?"#7AB07A":"rgba(200,175,100,0.5)",letterSpacing:1.5,cursor:"pointer"}}>{prefs.enabled?"ON":"OFF"}</button>
      </div>
      <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>The sky comes to you — hour changes, void Moon, election windows, the morning briefing.{isWeb?" On the web these fire only while a tab is open; the desktop and iOS apps deliver on schedule.":""}</div>
      {msg&&<div style={{fontFamily:F,fontSize:9,color:"#9B5050",marginTop:6}}>{msg}</div>}
      {prefs.enabled&&<>
        <div style={{marginTop:10}}>
          {KINDS.map(([k,lbl,sub])=>(
            <button key={k} onClick={()=>update({kinds:{[k]:!prefs.kinds[k]}})} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 9px",borderRadius:9,background:prefs.kinds[k]?"rgba(212,175,106,0.07)":"rgba(0,0,0,0.2)",border:`1px solid ${prefs.kinds[k]?"rgba(212,175,106,0.25)":"rgba(200,175,100,0.07)"}`,cursor:"pointer",textAlign:"left",marginBottom:4}}>
              <span style={{fontFamily:F,fontSize:11,color:prefs.kinds[k]?"#7AB07A":"rgba(200,175,100,0.3)",width:14}}>{prefs.kinds[k]?"✓":"○"}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:F,fontSize:10.5,color:prefs.kinds[k]?"#D4AF6A":"rgba(200,175,100,0.45)"}}>{lbl}</div>
                <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginTop:1}}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
        {prefs.kinds.hourChange&&<div style={{marginTop:8}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>Hour Alerts For</div>
          <div style={{display:"flex",gap:4}}>
            {Object.keys(P).map(pk=>{const on=prefs.hourPlanets?.includes(pk);return(
              <button key={pk} onClick={()=>update({hourPlanets:on?prefs.hourPlanets.filter(x=>x!==pk):[...(prefs.hourPlanets||[]),pk]})} style={{flex:1,padding:"7px 2px",borderRadius:8,background:on?P[pk].col+"18":"rgba(0,0,0,0.25)",border:`1px solid ${on?P[pk].col+"55":"rgba(200,175,100,0.08)"}`,cursor:"pointer"}}>
                <div style={{fontSize:13,textAlign:"center",color:on?P[pk].col:"rgba(200,175,100,0.25)"}}>{P[pk].sym}</div>
              </button>);})}
          </div>
        </div>}
        {prefs.kinds.briefing&&<div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"}}>Briefing at</div>
          <input type="time" value={prefs.briefingTime} onChange={e=>update({briefingTime:e.target.value})} style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:9,color:"#C4A870",fontFamily:F,outline:"none",padding:"6px 9px",fontSize:11}}/>
        </div>}
      </>}
    </div>
  );
}

function BackupCard(){
  const [msg,setMsg]=useState("");
  const [showPaste,setShowPaste]=useState(false);
  const [pasteText,setPasteText]=useState("");
  const [mergeMode,setMergeMode]=useState(true);
  const fileRef=useRef(null);
  const last=lastExportedAt();
  const daysSince=last?Math.floor((Date.now()-last.getTime())/86400000):null;
  const stale=last==null||daysSince>30;
  const doExport=async()=>{
    const json=exportAll();
    const name=backupFilename();
    if(await shareOnNative(name,json)){markExported();setMsg("✓ Backup handed to share sheet");return;}
    if(downloadText(name,json)){markExported();setMsg(`✓ Downloaded ${name}`);return;}
    if(await copyToClipboard(json)){markExported();setMsg("✓ Backup copied to clipboard — paste it somewhere safe");return;}
    setMsg("✗ Export failed — no delivery method available");
  };
  const doCopy=async()=>{
    if(await copyToClipboard(exportAll())){markExported();setMsg("✓ Backup copied to clipboard");}
    else setMsg("✗ Clipboard unavailable");
  };
  const restore=(text)=>{
    try{
      const s=importAll(text,{merge:mergeMode});
      setMsg(`✓ Restored ${s.keysRestored} stores${mergeMode?` (+${s.entriesAdded} entries)`:""} — reloading…`);
      setTimeout(()=>window.location.reload(),1200);
    }catch(e){setMsg("✗ "+(e.message||"Import failed"));}
  };
  const onFile=async(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    restore(await f.text());
    e.target.value="";
  };
  const BTN=(active=true)=>({padding:"9px 12px",borderRadius:10,background:active?"rgba(212,175,106,0.1)":"rgba(0,0,0,0.3)",border:"1px solid "+(active?"rgba(212,175,106,0.28)":"rgba(200,175,100,0.1)"),fontFamily:F,fontSize:9,color:active?"#D4AF6A":"#5A4020",letterSpacing:1.5,textTransform:"uppercase",cursor:"pointer",flex:1});
  return(
    <div className="card" style={{margin:"0 14px 10px"}}>
      <div style={L()}>Backup & Restore</div>
      <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Your journal, grimoire, sigils, and castings live only on this device. Export regularly — the practice record is irreplaceable.</div>
      {stale&&<div style={{fontFamily:F,fontSize:9,color:"#9B5050",marginTop:6,lineHeight:1.5}}>{last?`⚠ Last backup ${daysSince} days ago`:"⚠ No backup has ever been exported"}</div>}
      {last&&!stale&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.35)",marginTop:6}}>Last export: {last.toLocaleDateString()}</div>}
      <div style={{display:"flex",gap:6,marginTop:10}}>
        <button onClick={doExport} style={BTN()}>Export All</button>
        <button onClick={doCopy} style={BTN()}>Copy</button>
      </div>
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button onClick={()=>fileRef.current?.click()} style={BTN()}>Import File</button>
        <button onClick={()=>setShowPaste(s=>!s)} style={BTN()}>{showPaste?"Hide Paste":"Paste Backup"}</button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} style={{display:"none"}}/>
      <button onClick={()=>setMergeMode(m=>!m)} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.45)",letterSpacing:1,padding:0}}>
        MODE: {mergeMode?"MERGE (existing entries kept, new ones added)":"REPLACE (imported data overwrites this device)"} — tap to switch
      </button>
      {showPaste&&<div style={{marginTop:8}}>
        <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={4} placeholder="Paste an Astrum backup JSON here…" style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",width:"100%",fontSize:10,resize:"vertical",boxSizing:"border-box"}}/>
        <button onClick={()=>pasteText.trim()&&restore(pasteText)} disabled={!pasteText.trim()} style={{...BTN(!!pasteText.trim()),width:"100%",marginTop:5}}>Restore From Paste</button>
      </div>}
      {msg&&<div style={{fontFamily:F,fontSize:9,color:msg.startsWith("✓")?"#7A9A7A":"#9B5050",marginTop:8,lineHeight:1.5}}>{msg}</div>}
    </div>
  );
}

function ProfileScreen({profile,setProfile,notifyPrefs,setNotifyPrefs}){
  const [name,setName]=useState(profile?.name||"");
  const [date,setDate]=useState(profile?.natal?.date||"");
  const [time,setTime]=useState(profile?.natal?.time||"");
  const [city,setCity]=useState(profile?.natal?.city||"");
  const [lat,setLat]=useState(profile?.natal?.lat||null);
  const [lon,setLon]=useState(profile?.natal?.lon||null);
  const [traditions,setTraditions]=useState(profile?.traditions||["western-ceremonial"]);
  const [level,setLevel]=useState(profile?.level||"intermediate");
  const [apiKey,setApiKey]=useState(profile?.apiKey||"");
  const [tint,setTint]=useState(profile?.tint||"solar");
  const [geocoding,setGeocoding]=useState(false);
  const [geocodeMsg,setGeocodeMsg]=useState("");
  const [saved,setSaved]=useState(false);
  const IS={width:"100%",marginTop:4,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:12,boxSizing:"border-box"};
  const LS={fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase"};
  const geocode=async()=>{
    if(!city.trim())return;
    setGeocoding(true);setGeocodeMsg("");
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,{headers:{"Accept-Language":"en"}});
      const data=await r.json();
      if(data[0]){const la=parseFloat(data[0].lat),lo=parseFloat(data[0].lon);setLat(la);setLon(lo);setGeocodeMsg(`✓ ${data[0].display_name.split(",").slice(0,2).join(",")} · ${la.toFixed(2)}°, ${lo.toFixed(2)}°`);}
      else setGeocodeMsg("✗ City not found — try adding country");
    }catch(e){setGeocodeMsg("✗ Geocoding unavailable");}
    setGeocoding(false);
  };
  const toggleTradition=t=>{
    if(t==="custom"){setTraditions(["custom"]);return;}
    setTraditions(prev=>{const next=prev.filter(x=>x!=="custom");return next.includes(t)?next.filter(x=>x!==t)||["western-ceremonial"]:[...next,t];});
  };
  const saveProfile=async()=>{
    const p={name,natal:{date,time,city,lat,lon},traditions,level,apiKey,tint,theme:"dark"};
    setProfile(p);
    try{await window.storage.set("astrum_profile",JSON.stringify(p));}catch(e){}
    setSaved(true);setTimeout(()=>setSaved(false),2500);
  };
  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:30}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Practitioner Profile</div>
        <div style={T(20)}>Settings & Identity</div>
        <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.7}}>Your profile shapes every screen — tradition context, natal resonance, AI depth, and personal timing.</div>
      </div>
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Identity</div>
        <div style={{marginTop:10}}><div style={LS}>Name / Handle</div><input value={name} onChange={e=>setName(e.target.value)} placeholder="How shall the tradition address you?" style={IS}/></div>
      </div>
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Natal Chart Data</div>
        <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Used for personal resonance, profections, sect, and location-based astronomy.</div>
        <div style={{marginTop:10,display:"flex",gap:8}}>
          <div style={{flex:2}}><div style={LS}>Birth Date</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={IS}/></div>
          <div style={{flex:1}}><div style={LS}>Birth Time</div><input type="time" value={time} onChange={e=>setTime(e.target.value)} style={IS}/></div>
        </div>
        <div style={{marginTop:8}}><div style={LS}>Birth City</div>
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <input value={city} onChange={e=>setCity(e.target.value)} onKeyDown={e=>e.key==="Enter"&&geocode()} placeholder="City, Country" style={{...IS,marginTop:0,flex:1}}/>
            <button onClick={geocode} disabled={geocoding||!city.trim()} style={{padding:"8px 12px",borderRadius:10,background:city?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${city?"rgba(212,175,106,0.3)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:8,color:city?"#D4AF6A":"#4A3020",letterSpacing:1,cursor:city?"pointer":"default",whiteSpace:"nowrap"}}>{geocoding?"…":"LOCATE"}</button>
          </div>
          {geocodeMsg&&<div style={{fontFamily:F,fontSize:9,color:geocodeMsg.startsWith("✓")?"#7A9A7A":"#9B5050",marginTop:6,lineHeight:1.5}}>{geocodeMsg}</div>}
          {lat&&lon&&!geocodeMsg&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.35)",marginTop:5}}>{lat.toFixed(3)}°, {lon.toFixed(3)}° stored</div>}
        </div>
      </div>
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Magical Tradition(s)</div>
        <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>The AI adapts its vocabulary, spirit frameworks, and timing logic to your tradition(s). Select all that apply.</div>
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
          {Object.entries(TRADITIONS).map(([id,tr])=>{
            const active=traditions.includes(id);
            return(
              <button key={id} onClick={()=>toggleTradition(id)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 11px",borderRadius:10,background:active?"rgba(212,175,106,0.09)":"rgba(0,0,0,0.25)",border:`1px solid ${active?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.08)"}`,cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:14,marginTop:1,lineHeight:1,flexShrink:0,color:active?"#D4AF6A":"rgba(200,175,100,0.35)"}}>{tr.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:11,color:active?"#D4AF6A":"rgba(200,175,100,0.55)"}}>{tr.label}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",marginTop:2,lineHeight:1.4}}>{tr.desc}</div>
                </div>
                {active&&<span style={{color:"#D4AF6A",fontSize:11,flexShrink:0,marginTop:1}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Experience Level</div>
        <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Calibrates AI explanation depth and assumed prior knowledge.</div>
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {[["beginner","Beginner","New to practice"],["intermediate","Practitioner","Active system"],["advanced","Adept","Deep fluency"]].map(([v,lbl,desc])=>{
            const active=level===v;
            return(
              <button key={v} onClick={()=>setLevel(v)} style={{flex:1,padding:"10px 6px",borderRadius:10,background:active?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.25)",border:`1px solid ${active?"rgba(212,175,106,0.4)":"rgba(200,175,100,0.1)"}`,cursor:"pointer"}}>
                <div style={{fontFamily:F,fontSize:10,color:active?"#D4AF6A":"rgba(200,175,100,0.45)",letterSpacing:1}}>{lbl}</div>
                <div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.25)",marginTop:3,lineHeight:1.3}}>{desc}</div>
              </button>
            );
          })}
        </div>
      </div>
      <AIEngineCard/>
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Anthropic API Key</div>
        <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Used when the AI Engine is set to Anthropic. Stored only in this app, never transmitted elsewhere.</div>
        <div style={{marginTop:10}}>
          <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-…" style={IS}/>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.25)",marginTop:5}}>Obtain at console.anthropic.com — you pay only for what you use.</div>
        </div>
      </div>
      <div className="card" style={{margin:"0 14px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={L()}>Ephemeris Engine</div>
          <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Swiss Ephemeris (WASM) gives arc-second positions and true fixed-star places; Meeus is the built-in fallback.</div>
        </div>
        <div style={{fontFamily:F,fontSize:10,color:engineInfo()==="swiss"?"#7AB07A":"#C08050",letterSpacing:1,whiteSpace:"nowrap",marginLeft:10,textTransform:"uppercase"}}>{engineInfo()==="swiss"?"✓ Swiss":engineInfo()}</div>
      </div>
      <NotifyCard notifyPrefs={notifyPrefs} setNotifyPrefs={setNotifyPrefs}/>
      <IntakeCard/>
      <BackupCard/>
      <KnowledgeBase/>
      {/* Planetary Tint — Batch 3 */}
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Visual Tint</div>
        <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Each planetary tint shifts the glass materials, accent colors, and background gradients across the entire app.</div>
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
          {Object.entries(TINT_PRESETS).map(([key,preset])=>{
            const active=tint===key;
            return(
              <button key={key} onClick={()=>setTint(key)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 11px",borderRadius:10,background:active?`rgba(var(--glass-bg,8,5,22),0.7)`:"rgba(0,0,0,0.2)",border:`1px solid ${active?preset.primary+"60":"rgba(200,175,100,0.08)"}`,cursor:"pointer",textAlign:"left",transition:"border-color 0.2s,background 0.2s"}}>
                <div style={{width:20,height:20,borderRadius:6,background:preset.primary,boxShadow:`0 2px 8px ${preset.primary}40`,flexShrink:0}}/>
                <div style={{fontFamily:F,fontSize:11,color:active?preset.primary:"rgba(200,175,100,0.55)"}}>{preset.label}</div>
                {active&&<span style={{marginLeft:"auto",fontFamily:F,fontSize:9,color:preset.primary}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{padding:"10px 14px 0"}}>
        <button onClick={saveProfile} style={{width:"100%",padding:"13px 0",borderRadius:12,background:"rgba(212,175,106,0.12)",border:"1px solid rgba(212,175,106,0.35)",fontFamily:F,fontSize:10,color:saved?"#7AB07A":"#D4AF6A",letterSpacing:3,textTransform:"uppercase",cursor:"pointer",transition:"color 0.4s"}}>
          {saved?"✓ PROFILE SAVED":"SAVE PROFILE"}
        </button>
        {!aiConfigured()&&<div style={{fontFamily:F,fontSize:9,color:"#9B5050",textAlign:"center",marginTop:8,lineHeight:1.5}}>No AI engine active — set one in AI Engine above</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TALISMAN WORKSHOP — election → design → consecration → record
// ═══════════════════════════════════════════════════════════════════════
// The full classical pipeline in one guided flow. Everything it produces is
// linked into a single casting record (kind: talisman) so the Review screen
// can close the loop on it.
function KameaPreview({pts,planet,size=180}){
  const km=KAMEA[planet]||KAMEA.jupiter;
  const scale=size/260;
  if(!pts||pts.length<2)return null;
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${(p[0]*scale).toFixed(1)} ${(p[1]*scale).toFixed(1)}`).join(" ");
  return(
    <svg width={size} height={size} style={{background:"rgba(0,0,0,0.4)",borderRadius:8,border:"1px solid rgba(200,175,100,0.15)"}}>
      {Array.from({length:km.size}).map((_,r)=>Array.from({length:km.size}).map((_,c)=>{
        const cell=size/(km.size+1),x=cell*(c+1),y=cell*(r+1);
        return <circle key={`${r}-${c}`} cx={x} cy={y} r={1.2} fill="rgba(200,175,100,0.25)"/>;
      })).flat()}
      <path d={d} fill="none" stroke={P[planet].col} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[0][0]*scale} cy={pts[0][1]*scale} r={3.5} fill="none" stroke={P[planet].col} strokeWidth={1}/>
      <line x1={pts[pts.length-1][0]*scale-4} y1={pts[pts.length-1][1]*scale-4} x2={pts[pts.length-1][0]*scale+4} y2={pts[pts.length-1][1]*scale+4} stroke={P[planet].col} strokeWidth={1.4}/>
    </svg>
  );
}

function TalismanScreen({eph,natalPos,profile,now}){
  const [step,setStep]=useState(0);
  const [intent,setIntent]=useState("");
  const [planet,setPlanet]=useState("jupiter");
  const [elections,setElections]=useState(null);
  const [scanning,setScanning]=useState(false);
  const [chosen,setChosen]=useState(null); // {date, assess, isNow}
  const [design,setDesign]=useState("intelligence"); // intelligence|spirit|word
  const [word,setWord]=useState("");
  const [saved,setSaved]=useState(false);
  const primaryTrad=profile?.traditions?.[0]||"western-ceremonial";
  const STEPS=TRADITION_STEPS[primaryTrad]||TRADITION_STEPS["western-ceremonial"];
  const km=KAMEA[planet]||KAMEA.jupiter;
  const sealPts=(kind)=>{const s=getSeal(planet,kind);return s?s.seq.map(n=>kamea_xy(kamea_reduce(n,km.size),planet)).filter(Boolean):null;};
  const wordPts=()=>{const letters=[...word.toUpperCase().replace(/[^A-Z]/g,"")];if(letters.length<2)return null;return letters.map(l=>{let n=kamea_letterNum(l);n=kamea_reduce(n,km.size);return kamea_xy(n<1?1:n,planet);}).filter(Boolean);};
  const designPts=design==="word"?wordPts():sealPts(design);
  const designName=design==="word"?word.toUpperCase():getSeal(planet,design)?.name;
  const runScan=()=>{setScanning(true);setElections(null);setTimeout(()=>{setElections(scanElections(new Date(now),30,planet,natalPos));setScanning(false);},250);};
  const fmtD=d=>d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+" "+d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const saveTalisman=async()=>{
    if(saved)return;
    try{
      const castDate=chosen?.isNow?new Date(now):chosen?.date||new Date(now);
      const assess=chosen?.assess||assessElection(castDate,planet,natalPos);
      // 1. sigil record (shows up in the Sigil workshop)
      const sigilEntry={id:Date.now(),planet,intent,word:designName,method:design==="word"?"kamea":"seal",sealOf:design!=="word"?design:undefined,
        svgData:{method:"kamea",pts:designPts,word:designName,planet},status:"created",date:castDate.toISOString(),skySnap:eph?{moon:eph.pos?.moon?.lon,sun:eph.pos?.sun?.lon}:null,aiNote:""};
      saveJSON("astrum_sigils",[sigilEntry,...loadJSON("astrum_sigils",[])]);
      // 2. grimoire entry
      const grimEntry={id:Date.now()+1,title:`${P[planet].name} Talisman — ${intent.slice(0,40)||designName}`,
        body:`INTENT: ${intent}\nPLANET: ${P[planet].name}\nDESIGN: ${design==="word"?`Kamea sigil of "${designName}"`:`Seal of ${designName} (${design} of ${P[planet].name})`}\nELECTION: ${fmtD(castDate)} — score ${assess.score} (${assess.grade})\nMATERIA: ${P[planet].metal}; ${P[planet].stone}; ${P[planet].incense}; colors ${P[planet].color}\nCONSECRATION: ${STEPS.map((s,i)=>`${i+1}. ${s.t}`).join(" · ")}\nORPHIC HYMN: ${P[planet].orphic}`,
        planet,tags:[planet,"talisman"],date:castDate.toISOString().split("T")[0],category:"ritual",type:"talisman"};
      const r=await window.storage.get("astrum_grimoire");
      await window.storage.set("astrum_grimoire",JSON.stringify([grimEntry,...(r?.value?JSON.parse(r.value):[])]));
      // 3. the casting record that ties it together
      createCasting({kind:"talisman",title:`${P[planet].name} talisman — ${(intent||designName).slice(0,50)}`,intent,planet,tradition:primaryTrad,
        conditions:conditionsFromProfile(castDate,profile,natalPos,{score:assess.score,grade:assess.grade},!chosen?.isNow),
        links:{sigilId:sigilEntry.id,grimoireId:grimEntry.id,electionWindow:{start:castDate.toISOString(),score:assess.score,grade:assess.grade}},
        createdAt:new Date(now).toISOString()});
      setSaved(true);
    }catch(e){}
  };
  const IS={width:"100%",background:"rgba(0,0,0,0.45)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"9px 11px",fontSize:12,boxSizing:"border-box"};
  const NEXT=(en,lbl="CONTINUE")=><button onClick={()=>setStep(step+1)} disabled={!en} style={{width:"100%",marginTop:12,padding:"12px 0",borderRadius:11,background:en?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${en?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:10,color:en?GOLD:"#5A4020",letterSpacing:3,textTransform:"uppercase",cursor:en?"pointer":"default"}}>{lbl}</button>;
  const WIZ=["Intent","Election","Design","Consecration","Record"];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 8px"}}>
        <div style={{fontFamily:F,fontSize:9,color:"#8A7040",letterSpacing:3.5,textTransform:"uppercase"}}>Picatrix · Agrippa · The Complete Operation</div>
        <div style={T(20)}>Talisman Workshop</div>
      </div>
      <div style={{display:"flex",gap:4,padding:"4px 14px 10px"}}>
        {WIZ.map((w,i)=>(
          <button key={w} onClick={()=>i<step&&setStep(i)} style={{flex:1,padding:"6px 0",borderRadius:8,background:i===step?"rgba(212,175,106,0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(i===step?"rgba(212,175,106,0.4)":i<step?"rgba(92,168,92,0.25)":"rgba(200,175,100,0.08)"),fontFamily:F,fontSize:7,color:i===step?GOLD:i<step?"#5CA85C":"#5A4020",letterSpacing:1,textTransform:"uppercase",cursor:i<step?"pointer":"default"}}>{i<step?"✓ ":""}{w}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 14px"}}>
        {step===0&&<div className="card">
          <div style={L()}>What is this talisman for?</div>
          <textarea value={intent} onChange={e=>setIntent(e.target.value)} rows={2} placeholder="Steady increase of income through my own work…" style={{...IS,marginTop:8,resize:"none"}}/>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.4)",letterSpacing:2,textTransform:"uppercase",margin:"12px 0 6px"}}>Under Which Sphere</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {Object.entries(P).map(([pk,pl])=>{
              const pos=eph.pos[pk],a=planet===pk;
              return(<button key={pk} onClick={()=>setPlanet(pk)} style={{padding:"9px 10px",borderRadius:10,background:a?pl.col+"14":"rgba(0,0,0,0.25)",border:`1px solid ${a?pl.col+"50":"rgba(200,175,100,0.08)"}`,cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:14,color:pl.col}}>{pl.sym}</span>
                <span style={{fontFamily:F,fontSize:10,color:a?pl.col:"rgba(200,175,100,0.5)",marginLeft:6}}>{pl.name}</span>
                <div style={{fontFamily:F,fontSize:7.5,color:"rgba(200,175,100,0.3)",marginTop:2,fontStyle:"italic"}}>{pl.domains.slice(0,3).join(" · ")}{pos?.dignity==="domicile"||pos?.dignity==="exaltation"?" · STRONG NOW":""}</div>
              </button>);
            })}
          </div>
          {NEXT(intent.trim().length>3)}
        </div>}
        {step===1&&<div className="card">
          <div style={L()}>Elect the Moment</div>
          <div style={{fontFamily:F,fontSize:9.5,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.7}}>Scan the next 30 days for windows when {P[planet].name} is dignified, direct, clear of the beams, and the Moon cooperates.</div>
          <button onClick={runScan} disabled={scanning} style={{width:"100%",marginTop:10,padding:"11px 0",borderRadius:10,background:P[planet].col+"14",border:`1px solid ${P[planet].col}40`,fontFamily:F,fontSize:9,color:P[planet].col,letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>{scanning?"Scanning the heavens…":"Scan 30 Days"}</button>
          {elections&&elections.length===0&&<div style={{fontFamily:F,fontSize:10,color:"#9A7060",fontStyle:"italic",marginTop:10,lineHeight:1.7}}>No qualifying window in the next 30 days — {P[planet].name} may be retrograde, combust, or out of dignity. Consider another sphere, or work the moment anyway below.</div>}
          {elections&&elections.slice(0,8).map((e,i)=>{
            const isSel=chosen&&!chosen.isNow&&chosen.date.getTime()===e.date.getTime();
            const gc=e.assess.score>=90?"#FFD700":e.assess.score>=75?"#5CA85C":"#D4AF6A";
            return(<button key={i} onClick={()=>setChosen({date:e.date,assess:e.assess})} style={{width:"100%",marginTop:7,padding:"10px 12px",borderRadius:11,background:isSel?gc+"14":"rgba(8,5,22,0.6)",border:`1px solid ${isSel?gc+"60":gc+"22"}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:F,fontSize:11,color:"#C4A870"}}>{fmtD(e.date)}</div>
                <div style={{fontFamily:F,fontSize:8.5,color:gc,marginTop:1}}>{e.assess.grade}</div>
              </div>
              <div style={{fontFamily:F,fontSize:22,color:gc}}>{e.assess.score}</div>
            </button>);
          })}
          <button onClick={()=>setChosen({date:new Date(now),assess:assessElection(new Date(now),planet,natalPos),isNow:true})} style={{width:"100%",marginTop:8,padding:"9px 0",borderRadius:10,background:chosen?.isNow?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${chosen?.isNow?"rgba(212,175,106,0.4)":"rgba(200,175,100,0.12)"}`,fontFamily:F,fontSize:8.5,color:chosen?.isNow?GOLD:"rgba(200,175,100,0.45)",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>Or: work this present moment</button>
          {chosen&&<div style={{fontFamily:F,fontSize:9.5,color:"#7AB07A",marginTop:8,textAlign:"center"}}>Chosen: {fmtD(chosen.date)} — score {chosen.assess.score}</div>}
          {NEXT(!!chosen)}
        </div>}
        {step===2&&<div className="card">
          <div style={L()}>The Figure</div>
          <div style={{display:"flex",gap:6,marginTop:10,marginBottom:10}}>
            {[["intelligence","Intelligence Seal"],["spirit","Spirit Seal"],["word","Intent Sigil"]].map(([k,lbl])=>(
              <button key={k} onClick={()=>setDesign(k)} style={{flex:1,padding:"8px 0",borderRadius:9,background:design===k?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.25)",border:`1px solid ${design===k?"rgba(212,175,106,0.4)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:8,color:design===k?GOLD:"rgba(200,175,100,0.4)",letterSpacing:1,textTransform:"uppercase",cursor:"pointer"}}>{lbl}</button>
            ))}
          </div>
          {design==="word"&&<input value={word} onChange={e=>setWord(e.target.value)} placeholder="Key word of the intent, e.g. INCREASE" style={{...IS,marginBottom:10}}/>}
          {design!=="word"&&<div style={{fontFamily:F,fontSize:9.5,color:"#5A4020",fontStyle:"italic",lineHeight:1.7,marginBottom:10}}>{design==="intelligence"?`${getSeal(planet,"intelligence")?.name} — the benevolent governing intelligence of ${P[planet].name}, traced by gematria on the ${km.size}×${km.size} kamea. The classical choice for a talisman.`:`${getSeal(planet,"spirit")?.name} — the raw daimonic force of ${P[planet].name}. Traditionally inscribed together with the intelligence, which directs it.`}</div>}
          <div style={{display:"flex",justifyContent:"center"}}>
            {designPts?<KameaPreview pts={designPts} planet={planet} size={190}/>:<div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",padding:"30px 0"}}>Enter at least two letters…</div>}
          </div>
          {designName&&designPts&&<div style={{textAlign:"center",fontFamily:F,fontSize:11,color:P[planet].col,marginTop:8}}>{designName}</div>}
          {NEXT(!!designPts)}
        </div>}
        {step===3&&<div className="card">
          <div style={L()}>Consecration — {TRADITIONS[primaryTrad]?.label||"Western Ceremonial"}</div>
          <div style={{fontFamily:F,fontSize:9.5,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.7}}>At the elected moment{chosen?` — ${fmtD(chosen.date)}`:""} — work the sequence. Materia of {P[planet].name}: {P[planet].incense.split("·")[0].trim()} incense, {P[planet].metal.split("·")[0].trim()}, colors of {P[planet].color.split("·")[0].trim()}.</div>
          <div style={{marginTop:10}}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:"1px solid rgba(200,175,100,0.05)"}}>
                <span style={{fontFamily:F,fontSize:10,color:P[planet].col,width:16,flexShrink:0}}>{i+1}.</span>
                <div>
                  <div style={{fontFamily:F,fontSize:10.5,color:GOLD}}>{s.t}</div>
                  <div style={{fontFamily:F,fontSize:9,color:"#8A7050",fontStyle:"italic",lineHeight:1.6,marginTop:2}}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,padding:"9px 11px",borderRadius:9,background:"rgba(0,0,0,0.3)",border:`1px solid ${P[planet].col}20`,fontFamily:F,fontSize:9.5,color:"#9A8060",fontStyle:"italic",lineHeight:1.8}}>"{P[planet].orphic}"</div>
          {NEXT(true)}
        </div>}
        {step===4&&<div className="card">
          <div style={L()}>Seal the Record</div>
          <div style={{fontFamily:F,fontSize:10,color:"#9A8060",fontStyle:"italic",marginTop:6,lineHeight:1.8}}>
            Saving inscribes the figure into your Sigils, writes the complete operation into the Grimoire, and opens a casting record with the elected sky — the Review screen will ask you for the outcome when the time comes.
          </div>
          <div style={{margin:"10px 0",padding:"10px 12px",borderRadius:10,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(200,175,100,0.12)",fontFamily:F,fontSize:10,color:"#C4A870",lineHeight:1.9}}>
            <div><span style={{color:"rgba(200,175,100,0.45)"}}>INTENT</span> {intent}</div>
            <div><span style={{color:"rgba(200,175,100,0.45)"}}>SPHERE</span> {P[planet].name}</div>
            <div><span style={{color:"rgba(200,175,100,0.45)"}}>FIGURE</span> {design==="word"?`Kamea sigil "${designName}"`:`Seal of ${designName}`}</div>
            <div><span style={{color:"rgba(200,175,100,0.45)"}}>MOMENT</span> {chosen?fmtD(chosen.date):"—"} (score {chosen?.assess?.score})</div>
          </div>
          <button onClick={saveTalisman} style={{width:"100%",padding:"13px 0",borderRadius:12,background:saved?"rgba(92,168,92,0.15)":"rgba(212,175,106,0.12)",border:`1px solid ${saved?"rgba(92,168,92,0.4)":"rgba(212,175,106,0.35)"}`,fontFamily:F,fontSize:10,color:saved?"#7AB07A":GOLD,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>{saved?"✓ Talisman Recorded":"⚑ Record the Talisman"}</button>
          {saved&&<div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.4)",textAlign:"center",marginTop:8,fontStyle:"italic"}}>Find it in Sigils, Grimoire, and Review.</div>}
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
function calcProfection(bd,now){
  const age=Math.floor((now-bd)/(365.25*86400000)),house=(age%12)+1;
  const signs=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const lords={Aries:"mars",Taurus:"venus",Gemini:"mercury",Cancer:"moon",Leo:"sun",Virgo:"mercury",Libra:"venus",Scorpio:"mars",Sagittarius:"jupiter",Capricorn:"saturn",Aquarius:"saturn",Pisces:"jupiter"};
  const hs=signs[(house-1)%12];
  return{age,house,houseSign:hs,lord:lords[hs],desc:"Age "+age+": House "+house+" ("+hs+") — Year Lord: "+P[lords[hs]]?.name};
}

export default function App(){
  const [tab,setTab]=useState("sky");
  const [workPlanet,setWork]=useState(null);
  const [now,setNow]=useState(new Date());
  const [fractalMode,setFractalMode]=useState("B");
  const [natalData,setNatalData]=useState(null);
  const [natalPos,setNatalPos]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [profile,setProfile]=useState(null);
  const [oracleOpen,setOracleOpen]=useState(false);
  const [oracleCtx,setOracleCtx]=useState("");
  const [cmdOpen,setCmdOpen]=useState(false);
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),200);return()=>clearInterval(t);},[]);
  // Load profile (primary) and legacy natal data
  useEffect(()=>{(async()=>{
    try{const r=await window.storage.get("astrum_profile");if(r?.value){const p=JSON.parse(r.value);setProfile(p);return;}}catch(e){}
    try{const r=await window.storage.get("astrum_natal");if(r?.value){const d=JSON.parse(r.value);setNatalData(d);}}catch(e){}
    setProfile({name:"",natal:{date:"",time:"",city:"",lat:null,lon:null},traditions:["western-ceremonial"],level:"intermediate",apiKey:"",tint:"solar",theme:"dark"});
  })();},[]);
  // Recompute positions once the Swiss Ephemeris WASM finishes loading
  const [engine,setEngine]=useState(engineInfo());
  useEffect(()=>{onSwephReady(()=>setEngine(engineInfo()));},[]);

  // Compute natal positions from profile (or legacy natal data)
  useEffect(()=>{
    const nd=profile?.natal?.date?profile.natal:natalData;
    if(nd?.date){
      const bd=nd.time?new Date(`${nd.date}T${nd.time}:00`):new Date(`${nd.date}T12:00:00`);
      const loc=nd.lat&&nd.lon?{lat:nd.lat,lon:nd.lon}:null;
      if(!isNaN(bd.getTime()))setNatalPos(calcNatal(bd,loc));else setNatalPos(null);
    }else setNatalPos(null);
  },[natalData,profile,engine]);

  // ── Operator's Loop migration: build castings from legacy journal/sigils
  useEffect(()=>{
    if(!profile)return;
    try{
      migrateToCastings({computeConditionsAt:d=>conditionsFromProfile(d,profile,natalPos,null,true)});
    }catch(e){}
  },[profile]); // eslint-disable-line

  // ── Tint system: inject CSS custom properties (Batch 3) ─────────────
  const activeTint=profile?.tint||"solar";
  useEffect(()=>{
    const t=TINT_PRESETS[activeTint]||TINT_PRESETS.solar;
    const root=document.documentElement;
    root.style.setProperty("--tint-primary",t.primary);
    root.style.setProperty("--tint-rgb",t.rgb);
    root.style.setProperty("--glass-bg",t.glassBg);
    root.style.setProperty("--bg-grad1",t.grad1);
    root.style.setProperty("--bg-grad2",t.grad2);
  },[activeTint]);

  // ── ⌘K keyboard shortcut (Batch 2) ──────────────────────────────────
  useEffect(()=>{
    const handler=(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setCmdOpen(o=>!o);}if(e.key==="Escape")setCmdOpen(false);};
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[]);

  const location=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
  const hour=location?getPlanetaryHourUnequal(now,location.lat,location.lon):getPlanetaryHour(now);
  const eph=useEphemeris(now,location);
  const fractal=calcFractal(now,fractalMode);

  // ── Ambient practice: plan + schedule notifications, refresh every 15 min
  const [notifyPrefs,setNotifyPrefs]=useState(loadNotifyPrefs);
  useEffect(()=>{
    if(!notifyPrefs.enabled)return;
    let cancelled=false,capSub=null;
    const replan=()=>{
      if(cancelled)return;
      try{
        const loc=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
        const plans=planUpcoming({now:new Date(),location:loc,prefs:notifyPrefs,castings:loadCastings(),athanor:loadJSON("astrum_athanor",[]),observances:upcomingObservances(loadSpirits(),new Date(),notifyPrefs.horizonDays??3)});
        reschedule(plans);
      }catch(e){}
    };
    replan();
    const iv=setInterval(replan,15*60000);
    if(window.Capacitor?.isNativePlatform?.()){
      import("@capacitor/app").then(({App:CapApp})=>{
        capSub=CapApp.addListener("resume",replan);
      }).catch(()=>{});
    }
    return()=>{cancelled=true;clearInterval(iv);Promise.resolve(capSub).then(s=>s?.remove?.()).catch(()=>{});};
  },[notifyPrefs,profile?.natal?.lat,profile?.natal?.lon]); // eslint-disable-line

  // ── Auto-backup + flush the durable snapshot when iOS backgrounds the app
  useEffect(()=>{
    if(!window.Capacitor?.isNativePlatform?.())return;
    let capSub=null;
    import("@capacitor/app").then(({App:CapApp})=>{
      capSub=CapApp.addListener("pause",async()=>{
        try{const {flushSnapshot}=await import("./lib/nativeStore.js");await flushSnapshot();}catch(e){}
        autoBackupNative();
      });
    }).catch(()=>{});
    return()=>{Promise.resolve(capSub).then(s=>s?.remove?.()).catch(()=>{});};
  },[]);

  // ── Dynamic background: shift with planetary hour (Batch 1) ─────────
  const hourTint=useMemo(()=>{
    const cols={sun:"rgba(220,175,40,0.12)",moon:"rgba(160,180,220,0.12)",mercury:"rgba(100,160,100,0.10)",venus:"rgba(200,140,110,0.12)",mars:"rgba(180,50,40,0.14)",jupiter:"rgba(100,90,200,0.14)",saturn:"rgba(80,100,140,0.12)"};
    return cols[hour?.planet]||"rgba(160,120,30,0.12)";
  },[hour?.planet]);
  const openWork=useCallback(pk=>{setWork(pk);setTab("work");},[]);
  const openOracle=useCallback((prefill)=>{
    if(!eph)return;
    setOracleCtx(prefill||buildOracleContext(tab,now,eph,fractal,natalPos,hour,profile));
    setOracleOpen(true);
  },[tab,now,eph,fractal,natalPos,hour,profile]);
  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 10%,var(--bg-grad1,rgba(60,40,120,0.25)) 0%,transparent 52%),radial-gradient(ellipse at 80% 90%,var(--bg-grad2,rgba(160,120,30,0.15)) 0%,transparent 52%),radial-gradient(ellipse at 50% 50%,${hourTint} 0%,transparent 65%),#04060F`,display:"flex",justifyContent:"center",fontFamily:F,color:"var(--tint-primary,#D4AF6A)",transition:"background 3s ease"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:430,minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
        <Sidebar tab={tab} setTab={setTab} hour={hour} eph={eph} open={sidebarOpen} setOpen={setSidebarOpen}/>

        {/* ── Liquid Glass Header Bar (Batch 1) ── */}
        <div style={{height:50,background:"rgba(var(--glass-bg,8,5,22),0.78)",backdropFilter:"blur(36px) saturate(190%) brightness(1.06)",WebkitBackdropFilter:"blur(36px) saturate(190%) brightness(1.06)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",flexShrink:0,borderBottom:"1px solid rgba(var(--tint-rgb,200,175,100),0.09)",boxShadow:"0 2px 0 rgba(255,255,255,0.025),inset 0 1px 0 rgba(255,255,255,0.07)"}}>
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",gap:4,padding:4}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===2?14:20,height:1.5,background:"rgba(var(--tint-rgb,200,175,100),0.5)",borderRadius:1,transition:"width 0.2s"}}/>)}
          </button>
          {/* ASTRUM title — tap to open command palette (Batch 2) */}
          <button onClick={()=>setCmdOpen(true)} style={{background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"4px 10px",borderRadius:8,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(var(--tint-rgb,200,175,100),0.06)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <div style={{fontFamily:F,fontSize:11,color:"var(--tint-primary,#D4AF6A)",letterSpacing:7,textTransform:"uppercase"}}>ASTRUM</div>
            {profile?.name
              ?<div style={{fontFamily:F,fontSize:7,color:"rgba(var(--tint-rgb,200,175,100),0.35)",letterSpacing:2,textTransform:"uppercase",marginTop:1}}>{profile.name}</div>
              :<div style={{fontFamily:F,fontSize:6.5,color:"rgba(var(--tint-rgb,200,175,100),0.22)",letterSpacing:1.5,marginTop:1}}>⌘K to search</div>}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{fontFamily:F,fontSize:9.5,color:"rgba(var(--tint-rgb,200,175,100),0.32)"}}>{now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
            <span style={{fontSize:12,color:P[hour.planet].col,animation:"live-dot 3s ease-in-out infinite"}}>{P[hour.planet].sym}</span>
          </div>
        </div>

        {/* ── Astral Live Bar (Batch 4 — replaces static breadcrumb) ── */}
        <AstralLiveBar tab={tab} eph={eph} now={now} natalPos={natalPos} hour={hour}/>

        {/* ── Screen content — slide transition on tab change (Batch 6) ── */}
        <div key={tab} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",overflowY:"auto",animation:"slide-screen 0.2s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          {tab==="sky"     &&<SkyScreen     now={now} hour={hour} eph={eph} fractal={fractal} natalPos={natalPos} onWork={openWork} profile={profile}/>}
          {tab==="aspects" &&<AspectsScreen eph={eph}/>}
          {tab==="decans"  &&<DecansScreen  eph={eph} fractal={fractal} natalPos={natalPos} mode={fractalMode} setMode={setFractalMode}/>}
          {tab==="fractal" &&<FractalScreen fractal={fractal} natalPos={natalPos} mode={fractalMode} setMode={setFractalMode} now={now}/>}
          {tab==="planets" &&<PlanetsScreen eph={eph} natalPos={natalPos} now={now}/>}
          {tab==="stars"   &&<StarsScreen   eph={eph} natalPos={natalPos}/>}
          {tab==="natal"   &&<NatalScreen   natalData={natalData} setNatalData={setNatalData} eph={eph} fractal={fractal} natalPos={natalPos} profile={profile}/>}
          {tab==="transits"&&<TransitsScreen natalPos={natalPos} now={now}/>}
          {tab==="ephemeris"&&<EphemerisScreen now={now}/>}
          {tab==="cycles"  &&<CyclesScreen  now={now} profile={profile} eph={eph}/>}
          {tab==="elect"   &&<ElectScreen   now={now} natalPos={natalPos} eph={eph} profile={profile}/>}
          {tab==="mansions"&&<MansionsScreen eph={eph} now={now} profile={profile} natalPos={natalPos}/>}
          {tab==="lots"    &&<LotsScreen     eph={eph} natalPos={natalPos} profile={profile} now={now}/>}
          {tab==="lunar"   &&<LunarCycleScreen now={now} profile={profile} natalPos={natalPos}/>}
          {tab==="rite"    &&<RitualRuntimeScreen eph={eph} hour={hour} profile={profile} natalPos={natalPos} now={now}/>}
          {tab==="spirits" &&<SpiritCourtScreen profile={profile}/>}
          {tab==="omens"   &&<OmenScreen profile={profile} natalPos={natalPos}/>}
          {tab==="horary"  &&<HoraryScreen  profile={profile} natalPos={natalPos}/>}
          {tab==="geomancy"&&<GeomancyScreen profile={profile} natalPos={natalPos}/>}
          {tab==="talisman"&&<TalismanScreen eph={eph} natalPos={natalPos} profile={profile} now={now}/>}
          {tab==="athanor" &&<AthanorScreen  profile={profile} natalPos={natalPos} eph={eph} now={now}/>}
          {tab==="calendar"&&<CalendarScreen now={now} natalPos={natalPos}/>}
          {tab==="almanac" &&<AlmanacScreen  now={now} profile={profile}/>}
          {tab==="journal" &&<JournalScreen  profile={profile} natalPos={natalPos}/>}
          {tab==="sigils"  &&<SigilScreen    eph={eph} profile={profile} natalPos={natalPos}/>}
          {tab==="grimoire"&&<GrimoireScreen profile={profile}/>}
          {tab==="review"  &&<ReviewScreen   profile={profile}/>}
          {tab==="recall"  &&<RecallScreen   setTab={setTab}/>}
          {tab==="learn"   &&<LearnScreen   profile={profile}/>}
          {tab==="work"    &&<WorkScreen    eph={eph} initPlanet={workPlanet} natalPos={natalPos} profile={profile} now={now}/>}
          {tab==="ai"      &&<AIScreen      now={now} eph={eph} fractal={fractal} natalPos={natalPos} hour={hour} profile={profile}/>}
          {tab==="profile" &&<ProfileScreen profile={profile} setProfile={setProfile} notifyPrefs={notifyPrefs} setNotifyPrefs={setNotifyPrefs}/>}
        </div>

        {/* ── Astral Control Center (Batch 5 — replaces Oracle float button) ── */}
        <AstralControlCenter tab={tab} onOracle={openOracle} setTab={setTab} natalPos={natalPos} eph={eph}/>

        {/* ── Command Palette (Batch 2) ── */}
        <CommandPalette open={cmdOpen} onClose={()=>setCmdOpen(false)} setTab={(t)=>{setTab(t);setCmdOpen(false);}} natalPos={natalPos} eph={eph} onOracle={(q)=>{openOracle(q);}}/>

        <OraclePanel open={oracleOpen} onClose={()=>setOracleOpen(false)} context={oracleCtx} profile={profile}/>
      </div>
    </div>
  );
}
