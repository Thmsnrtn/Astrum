import { useState, useEffect, useCallback, useRef } from "react";

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

function dateToJD(d) {
  let Y=d.getUTCFullYear(),M=d.getUTCMonth()+1;
  const D=d.getUTCDate()+(d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600)/24;
  if(M<=2){Y--;M+=12;}
  const A=Math.floor(Y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+D+B-1524.5;
}
function sunLon(jd){
  const T=(jd-2451545)/36525,L0=norm(280.46646+36000.76983*T);
  const M=norm(357.52911+35999.05029*T),Mr=M*D2R;
  const C=(1.914602-0.004817*T)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
  return norm(L0+C-0.00569-0.00478*Math.sin(norm(125.04-1934.136*T)*D2R));
}
function moonLon(jd){
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
function planetLon(name,jd){
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
function dailyMotion(name,jd){let d=planetLon(name,jd+0.5)-planetLon(name,jd-0.5);if(d>180)d-=360;if(d<-180)d+=360;return d;}
const SIGNS=[{name:"Aries",sym:"♈",el:"fire",mod:"cardinal"},{name:"Taurus",sym:"♉",el:"earth",mod:"fixed"},{name:"Gemini",sym:"♊",el:"air",mod:"mutable"},{name:"Cancer",sym:"♋",el:"water",mod:"cardinal"},{name:"Leo",sym:"♌",el:"fire",mod:"fixed"},{name:"Virgo",sym:"♍",el:"earth",mod:"mutable"},{name:"Libra",sym:"♎",el:"air",mod:"cardinal"},{name:"Scorpio",sym:"♏",el:"water",mod:"fixed"},{name:"Sagittarius",sym:"♐",el:"fire",mod:"mutable"},{name:"Capricorn",sym:"♑",el:"earth",mod:"cardinal"},{name:"Aquarius",sym:"♒",el:"air",mod:"fixed"},{name:"Pisces",sym:"♓",el:"water",mod:"mutable"}];
function lonToZodiac(lon){const l=norm(lon),si=Math.floor(l/30),deg=l%30;return{...SIGNS[si],signIndex:si,degree:Math.floor(deg),minutes:Math.floor((deg%1)*60)};}

const DOMICILE={sun:[4],moon:[3],mercury:[2,5],venus:[1,6],mars:[0,7],jupiter:[8,11],saturn:[9,10]};
const EXALT={sun:{s:0},moon:{s:1},mercury:{s:5},venus:{s:11},mars:{s:9},jupiter:{s:3},saturn:{s:6}};
function getDignity(planet,lon){
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

// ── Arabic Lots (expanded) ────────────────────────────────────────────
function calcLotEros(asc,venusL,fortuneL){return norm(asc+venusL-fortuneL);}
function calcLotNecessity(asc,marsL,fortuneL){return norm(asc+fortuneL-marsL);}
function calcLotCourage(asc,marsL,venusL){return norm(asc+marsL-venusL);}

function checkVoC(jd){
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
function getPlanetaryHour(date){
  const dow=date.getDay(),dr=DAY_RULERS[dow],ri=HOUR_ORDER.indexOf(dr);
  const mn=new Date(date);mn.setHours(0,0,0,0);
  const hn=Math.floor((date-mn)/3600000)%24,pi=(ri+hn)%7;
  return{planet:HOUR_ORDER[pi],hourNum:hn,msRemaining:new Date(mn.getTime()+(hn+1)*3600000)-date,nextPlanet:HOUR_ORDER[(pi+1)%7],dayRuler:dr};
}
// Precess a J2000.0 star longitude to current epoch (~50.29"/year = 1.3969°/century)
function precessStar(lon0,jd){return norm(lon0+1.396971*(jd-2451545)/36525);}
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
function getPlanetaryHourUnequal(now,lat,lon){
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
const P = {
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
const DECANS=[
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
const FIXED_STARS = [
  {name:"Regulus",   lon:149.8,col:"#FFD080",mag:1.4, nature:"Jupiter/Mars",  sign:"Leo 29°",    desc:"Heart of the Lion. The Royal Star — bestows enormous honor, military success, and executive power. Has been called the king-maker of the zodiac.",magic:"Royal authority, public recognition, leadership, solar vitality.",warning:"Destroys those who use power for revenge. The honor must be absolute."},
  {name:"Spica",     lon:203.9,col:"#A0D0F0",mag:0.97,nature:"Venus/Mercury", sign:"Libra 23°",  desc:"The brightest star of Virgo — extraordinary good fortune, artistic genius, scientific brilliance, sudden elevation.",magic:"Creative and artistic excellence, scientific mastery, benevolent fortune.",warning:"One of the most benefic stars in the sky. No major cautions."},
  {name:"Aldebaran", lon:69.7, col:"#F09050",mag:0.85,nature:"Mars",          sign:"Gemini 9°",  desc:"Eye of the Bull — Royal Star of the East. Courage, military success, eloquence, tenacity. Honors those who demonstrate both intelligence and bravery.",magic:"Courage in contest, competitive victory, strength of will.",warning:"Rewards integrity. Destroys the treacherous."},
  {name:"Antares",   lon:249.7,col:"#D04020",mag:0.96,nature:"Mars/Jupiter",  sign:"Sagittarius 9°",desc:"Heart of the Scorpion — Royal Star of the West. Extreme intensity, radical transformation, reckless courage. The most volatile of the Royal Stars.",magic:"Radical transformation, extreme courage, binding malefic forces.",warning:"The most volatile Royal Star. Absolutely unforgiving of hesitation or insincerity."},
  {name:"Algol",     lon:126.1,col:"#8080C0",mag:2.1, nature:"Saturn/Jupiter",sign:"Taurus 26°", desc:"Head of Medusa — the Blinking Demon. The most feared fixed star in the tradition. Associated with severance, radical endings, confrontation with horror.",magic:"Binding operations, protective severing, radical endings, cursing.",warning:"Handle with the greatest care. Rewards absolute clarity of intent. Punishes the careless absolutely."},
  {name:"Sirius",    lon:104.1,col:"#E0F0FF",mag:-1.46,nature:"Jupiter/Mars", sign:"Cancer 14°", desc:"The Dog Star — brightest star in the sky. Wealth, fame, discovery of hidden things, the blazing light that reveals. Associated with Egyptian Isis and Osiris.",magic:"Fame, discovery, wealth through brilliance, loyalty and protection.",warning:"Excess brings downfall. The fire of Sirius can consume as well as illuminate."},
  {name:"Canopus",   lon:96.4, col:"#C0E8FF",mag:-0.72,nature:"Saturn",       sign:"Cancer 14°", desc:"The Helmsman of the Argo. Navigation through the deep waters, occult knowledge, long journeys. One of the most southerly visible stars.",magic:"Occult navigation, long-distance journeys, secret knowledge.",warning:"Saturnine in nature — requires patience and acceptance of limitation."},
  {name:"Vega",      lon:285.2,col:"#D0D0FF",mag:0.03, nature:"Venus/Mercury",sign:"Capricorn 15°",desc:"The Lyre of Orpheus. Music, enchantment through beauty, charismatic attraction, the power of art to move stone.",magic:"Musical magic, enchantment, artistic charisma, Venusian glamour.",warning:"Danger of wasted beauty through self-indulgence."},
  {name:"Pollux",    lon:123.3,col:"#FFD0A0",mag:1.14, nature:"Mars",         sign:"Cancer 23°", desc:"The Immortal Twin. Competitive excellence, honors in physical contest and debate, the strength that comes from brotherly bond.",magic:"Athletic victory, sibling magic, competitive excellence.",warning:"The martial twin — all workings have a combative edge."},
  {name:"Procyon",   lon:115.8,col:"#FFE0B0",mag:0.38, nature:"Mercury/Mars", sign:"Cancer 25°", desc:"Before the Dog. Swift success, quick fortune, sudden favorable change. Associated with precipitation of events and rapid manifestation.",magic:"Swift action, rapid manifestation, accelerating outcomes.",warning:"Sudden elevation often followed by equally sudden reversal."},
  {name:"Fomalhaut", lon:333.9,col:"#C0C8FF",mag:1.16, nature:"Venus/Mercury",sign:"Pisces 3°",  desc:"The Lonely One — Royal Star of the South. Idealism, mystical vision, dreams made real. The star of the artist and the visionary.",magic:"Mystical vision, artistic inspiration, spiritual idealism.",warning:"Neptunian in quality — the vision can become an obsession or a delusion."},
  {name:"Deneb Algedi",lon:303.7,col:"#A0B8C0",mag:2.85,nature:"Saturn/Jupiter",sign:"Aquarius 23°",desc:"Tail of the Goat. Law, justice, hidden authority. Protection through disciplined application of rules. Favors lawyers, judges, and those who work within systems.",magic:"Legal protection, working within established systems, hidden authority.",warning:"Saturn/Jupiter blend — requires both discipline and faith."},
  {name:"Capella",   lon:81.7, col:"#FFE0A0",mag:0.08, nature:"Mercury/Mars", sign:"Gemini 21°", desc:"The She-Goat. Honours, wealth, curiosity, versatility. The inquisitive mind that seeks knowledge across all domains. Favors researchers and polymaths.",magic:"Intellectual breadth, research, honours through learning.",warning:"Restlessness — difficulty focusing the vast curiosity on one thing."},
  {name:"Alcyone",   lon:60.3, col:"#C0D0FF",mag:2.87, nature:"Moon/Jupiter", sign:"Taurus 0°",  desc:"The Central Pleiad — the weeping one. Grief transmuted into vision, mourning becoming prophetic ability, the oracular gift born from loss.",magic:"Prophetic vision, working with ancestral grief, oracular work.",warning:"Associated with weeping and sorrow — accept this as the price of the gift."},
  {name:"Scheat",    lon:349.1,col:"#A090B0",mag:2.4,  nature:"Saturn/Mercury",sign:"Pisces 29°", desc:"The Leg — end of Pegasus. Dangerous positions, imprisonment, drowning, and the extraordinary gift of seeing beyond ordinary limits.",magic:"Final works before a threshold, extreme situations requiring extreme measures.",warning:"One of the most malefic stars. Not recommended for most operations."},
  {name:"Arcturus",  lon:203.8,col:"#FFCCA0",mag:-0.05,nature:"Jupiter/Mars", sign:"Libra 23°",  desc:"The Bear Watcher. Success through individual effort, pioneering spirit, wealth and honour through exploration and new paths.",magic:"Pioneering ventures, success through bold action, new territories.",warning:"Requires genuine courage and willingness to forge new paths."},
  {name:"Zubenelgenubi",lon:225.0,col:"#90B090",mag:2.75,nature:"Saturn/Mars",sign:"Scorpio 15°", desc:"The Southern Scale. Associated with loss, curses, and poisonous matters — but also with the rectification of imbalance and karmic debts.",magic:"Works of justice and rectification, uncrossing, removing malefic influences.",warning:"Strongly malefic. Use only in works of genuine correction and justice."},
  {name:"Zubeneschamali",lon:229.3,col:"#90C890",mag:2.61,nature:"Jupiter/Mercury",sign:"Scorpio 19°",desc:"The Northern Scale. The only star in the sky with a greenish tint — associated with honours, riches, and good fortune. Fortunate for all matters.",magic:"All benefic works, increase of wealth and status, honours.",warning:"One of the more fortunate stars. No major cautions."},
  {name:"Vindemiatrix",lon:195.0,col:"#D0B0D0",mag:2.85,nature:"Saturn/Mercury",sign:"Libra 9°", desc:"The Grape Gatherer. Associated with widowhood, loss of a partner, grief — but also with harvesting the fruits of past work.",magic:"Completing old cycles, releasing partnerships, harvesting past efforts.",warning:"Traditionally associated with loss. Best for endings, not beginnings."},
  {name:"Achernar",  lon:15.3, col:"#C0D8FF",mag:0.46, nature:"Jupiter",      sign:"Aries 15°",  desc:"End of the River. Extreme good fortune, particularly in religious or philosophical matters. One of the most benefic stars.",magic:"Spiritual elevation, philosophical works, extreme good fortune.",warning:"Works best for those with genuine spiritual orientation."},
  // Extended catalog
  {name:"Rigel",     lon:78.5, col:"#B0D0FF",mag:0.13, nature:"Jupiter/Saturn",sign:"Gemini 18°", desc:"The left foot of Orion — the Hunter's step forward. Honour, renown, happiness, and particularly good fortune in matters of learning and mechanical skill.",magic:"Honour through skill, intellectual achievement, journeys undertaken with boldness.",warning:"The Saturnine quality asks for disciplined application; brilliance alone is insufficient."},
  {name:"Betelgeuse",lon:88.8, col:"#FF9040",mag:0.42, nature:"Mars/Mercury", sign:"Gemini 28°", desc:"The shoulder of the Hunter — martial excellence, military honours, boldness in battle and debate. One of the most powerful stars for competitive endeavors.",magic:"Victory in open contest, martial excellence, bold action.",warning:"Mars/Mercury combined creates impulsivity — great power with poor timing brings destruction."},
  {name:"Castor",    lon:113.0,col:"#E0F0FF",mag:1.58, nature:"Mercury",      sign:"Cancer 23°", desc:"The mortal twin of Gemini — eloquence, cleverness, dual nature, sudden fame and just as sudden reversal. The mind that sees all sides.",magic:"Communication mastery, writing, quick thought, eloquence in difficult matters.",warning:"Twin nature creates instability — the brilliance of Castor comes with its sudden dimming."},
  {name:"Eltanin",   lon:271.4,col:"#A070C0",mag:2.24, nature:"Saturn/Mars",  sign:"Sagittarius 27°",desc:"Eye of the Dragon — the head of Draco. Deep wisdom, occult power, the dragon's knowing. Commands respect but also brings jealousy from rivals.",magic:"Occult mastery, commanding respect, protective dragon power, binding of enemies.",warning:"Heavy malefic quality — Saturn/Mars. Use with full protective measures."},
  {name:"Hamal",     lon:37.8, col:"#F0C080",mag:2.0,  nature:"Mars/Saturn",  sign:"Taurus 7°",  desc:"The head of Aries — cruelty can be a shadow, but also the fierce protector. Violent when afflicted, powerful when channeled correctly.",magic:"Decisive action, cutting through obstacles, aggressive protection.",warning:"Mars/Saturn combination is inherently difficult — requires clear intent and ethical grounding."},
  {name:"Menkar",    lon:53.1, col:"#A090A0",mag:2.54, nature:"Saturn",       sign:"Taurus 23°", desc:"The mouth of Cetus the Sea Monster. One of the more malefic stars — disease, scandal, dishonour, encounters with monstrous or destructive forces.",magic:"Binding monstrous or destructive forces, protective work against overwhelming enemies.",warning:"Strongly malefic. Approach only for defensive operations with full protections in place."},
  {name:"Mirach",    lon:1.2,  col:"#E0C0E0",mag:2.07, nature:"Venus",        sign:"Aries 1°",   desc:"The girdle of Andromeda — pure Venusian beauty, friendship, love of harmony, benevolence, and artistic sensitivity.",magic:"Friendship and love spells, attracting beauty, harmony in relationships.",warning:"One of the most benefic stars for Venusian work. Avoid cold or harsh intentions."},
  {name:"Alphecca",  lon:231.0,col:"#C0E0C0",mag:2.23, nature:"Venus/Mercury",sign:"Scorpio 11°",desc:"The Crown of the Northern Crown — honour and dignity gained through one's own merit. Artistic sensitivity combined with intellectual precision.",magic:"Merit-based honour, artistic refinement, rewards for genuine skill.",warning:"Honours fade if not sustained by continued excellence."},
  {name:"Rasalhague",lon:261.9,col:"#90C0A0",mag:2.08, nature:"Saturn/Venus", sign:"Sagittarius 21°",desc:"Head of the Serpent Bearer. Medicine, healing, esoteric knowledge, dangerous dealings with serpentine wisdom. The healer who has faced the poison.",magic:"Healing work, medical operations, antidotes, esoteric wisdom.",warning:"Saturn tempers Venus — gains are possible but require careful, measured approach."},
  {name:"Unukalhai", lon:220.3,col:"#906060",mag:2.65, nature:"Saturn/Mars",  sign:"Scorpio 10°",desc:"Heart of the Serpent — disease, poison, destructive forces made available to those who can command them. The venom that heals or kills.",magic:"Binding harmful forces, protective works, extreme cases of defensive magic.",warning:"One of the more malefic stars. Saturn/Mars combined is exceptionally destructive without care."},
  {name:"Lesath",    lon:253.6,col:"#D04040",mag:2.69, nature:"Mars/Mercury", sign:"Sagittarius 23°",desc:"The sting of the Scorpion — danger, violence, toxic cleverness, the barb that strikes unexpectedly. Associated with poisons and dangerous wisdom.",magic:"Sharp and sudden action, swift binding, works against specific opponents.",warning:"Mars/Mercury is volatile and fast-moving. Works triggered here can escalate unpredictably."},
  {name:"Sadalsuud", lon:323.9,col:"#8090C0",mag:2.91, nature:"Saturn/Mercury",sign:"Aquarius 23°",desc:"The luckiest of the lucky — Jupiter of the waters. The star of good fortune that comes through communities, organizations, and collective endeavor.",magic:"Group working, communal blessing, luck through networks and connections.",warning:"Saturn modifies Mercury here — the fortune requires organization and system, not luck alone."},
  {name:"Deneb Adige",lon:355.1,col:"#C0D0F0",mag:1.25, nature:"Venus/Mercury",sign:"Pisces 5°", desc:"The tail of the Swan — the beauty of artistic completion, graceful endings, the swan song that transcends ordinary limits.",magic:"Artistic completion, graceful conclusions, beauty in transition and farewell.",warning:"Associated with endings — most powerful for concluding cycles, not initiating them."},
  {name:"Markab",    lon:349.7,col:"#8080A0",mag:2.49, nature:"Saturn/Mars",  sign:"Pisces 29°", desc:"The saddle of Pegasus — honor gained and then destroyed, falls from great heights, the danger of being near success without the stability to hold it.",magic:"Works at the very end of a cycle or threshold, desperate measures before a turning point.",warning:"Strongly associated with falls from honour. Most dangerous for those in positions of power."},
  {name:"Mirfak",    lon:41.6, col:"#F0D0A0",mag:1.79, nature:"Jupiter/Saturn",sign:"Taurus 11°",desc:"The hero Perseus — honours, boldness, the courage that comes from principle. Good for those who champion just causes and slay monstrous obstacles.",magic:"Heroic deeds, championing just causes, victory through courage and principle.",warning:"Requires genuine heroism — not bravado. Empty posturing under this star backfires."},
];

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
    const sLon=precessStar(s.lon,jd);
    const tp=Object.values(pos);
    return tp.some(p=>{let d=Math.abs(norm(sLon-p.lon));if(d>180)d=360-d;return d<3;});
  });
  const aspects=getAspectsAll(pos);
  const antiscia=getAntisciaAspects(pos);
  // Location-based additions (Phase 1c)
  let asc=null,mc=null,pof=null,pos2=null,isDayChart=null,lotEros=null,lotNecessity=null,lotCourage=null;
  if(location?.lat&&location?.lon){
    asc=calcASC(jd,location.lat,location.lon);
    mc=calcMC(jd,location.lon);
    const ss=sunriseSetUTC(date,location.lat,location.lon);
    isDayChart=ss?date>=ss.rise&&date<ss.set:pos.sun.lon>=0&&pos.sun.lon<=180;
    pof=calcPOF(asc,pos.moon.lon,pos.sun.lon,isDayChart);
    pos2=calcPOS(asc,pos.moon.lon,pos.sun.lon,isDayChart);
    lotEros=calcLotEros(asc,pos.venus.lon,pof);
    lotNecessity=calcLotNecessity(asc,pos.mars.lon,pof);
    lotCourage=calcLotCourage(asc,pos.mars.lon,pos.venus.lon);
  }
  return{pos,jd,moonPhase:phases[Math.floor(mpDeg/45)],moonPhaseDeg:mpDeg,voc,decanIdx,nearStars,aspects,antiscia,northNode,southNode,asc,mc,pof,pos2,isDayChart,lotEros,lotNecessity,lotCourage};
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
  // Location-based natal points
  let asc=null,mc=null,pof=null,isDayChart=null;
  if(location?.lat&&location?.lon){
    asc=calcASC(jd,location.lat,location.lon);
    mc=calcMC(jd,location.lon);
    const ss=sunriseSetUTC(bd,location.lat,location.lon);
    isDayChart=ss?bd>=ss.rise&&bd<ss.set:pos.sun.lon>=0&&pos.sun.lon<=180;
    pof=calcPOF(asc,pos.moon.lon,pos.sun.lon,isDayChart);
  }
  return{...pos,asc,mc,pof,isDayChart};
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const CSS=`*{box-sizing:border-box;margin:0;padding:0;} body{background:#04060F;} @keyframes breathe{0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.015)}} @keyframes float-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes arc-draw{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}} @keyframes voc-pulse{0%,100%{background:rgba(180,100,50,0.12)}50%{background:rgba(180,100,50,0.22)}} .glass{background:rgba(8,5,22,0.78);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border:1px solid rgba(200,175,100,0.11);box-shadow:0 8px 40px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.05),inset 0 -1px 0 rgba(0,0,0,0.3);border-radius:18px;} .card{background:rgba(8,5,22,0.65);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(200,175,100,0.09);box-shadow:0 4px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04);border-radius:14px;padding:13px 14px;margin-bottom:9px;} .chip{background:rgba(200,175,100,0.07);border:1px solid rgba(200,175,100,0.18);border-radius:6px;padding:2px 8px;font-family:inherit;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;} .row-btn{width:100%;background:none;border:none;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(200,175,100,0.06);} .row-btn:last-child{border-bottom:none;} input,textarea{background:rgba(0,0,0,0.45);border:1px solid rgba(200,175,100,0.18);border-radius:10px;color:#C4A870;font-family:inherit;outline:none;padding:9px 12px;} input:focus,textarea:focus{border-color:rgba(200,175,100,0.4);} ::-webkit-scrollbar{width:2px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(200,175,100,0.2);border-radius:1px;}`;

const F = "Georgia, 'Times New Roman', serif";
const L=(c="#7A6030",s=8)=>({fontFamily:F,fontSize:s,color:c,letterSpacing:3.5,textTransform:"uppercase"});
const T=(s=18,c="#D4AF6A")=>({fontFamily:F,fontSize:s,color:c,lineHeight:1.2});
const B=(s=12,c="#8A7050")=>({fontFamily:F,fontSize:s,color:c,fontStyle:"italic",lineHeight:1.9});

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════════════
const NAV_SECTIONS = [
  {id:"sky",     icon:"⊙", label:"Sky",       desc:"Live celestial state"},
  {id:"decans",  icon:"✦", label:"Decans",     desc:"36 Faces of Heaven"},
  {id:"fractal", icon:"◎", label:"Fractal",    desc:"Nested time"},
  {id:"planets", icon:"♄", label:"Planets",    desc:"Seven sphere profiles"},
  {id:"stars",   icon:"★", label:"Stars",      desc:"Fixed stars"},
  {id:"natal",   icon:"☽", label:"Natal",      desc:"Personal resonance"},
  {id:"elect",    icon:"◈", label:"Elections",  desc:"Optimal windows"},
  {id:"calendar", icon:"◫", label:"Calendar",  desc:"Election planning grid"},
  {id:"work",    icon:"⚗", label:"Work",       desc:"Build a ritual"},
  {id:"journal", icon:"✎", label:"Journal",    desc:"Practice record"},
  {id:"sigils",  icon:"⟁", label:"Sigils",     desc:"Sigil workshop"},
  {id:"grimoire",icon:"📖", label:"Grimoire",   desc:"Personal book of shadows"},
  {id:"learn",   icon:"⬡", label:"Learn",      desc:"AI magical education"},
  {id:"ai",      icon:"✧", label:"Planner",    desc:"AI working builder"},
  {id:"profile", icon:"◉", label:"Profile",    desc:"Practitioner settings"},
];

// ═══════════════════════════════════════════════════════════════════════
// TRADITION MODULES
// ═══════════════════════════════════════════════════════════════════════
const TRADITIONS = {
  "western-ceremonial": {label:"Western Ceremonial", desc:"Kabbalah, planetary magic, grimoire tradition", icon:"✡", prompt:"You speak from the Western Ceremonial tradition: Hermetic Kabbalah, the planetary grimoire current (Picatrix, Agrippa, Ficino), angelic hierarchies, and the classical talismanic art. Your spirit framework includes angels, intelligences, and planetary spirits. Time your work by planetary hours, days, and electional astrology."},
  "chaos":              {label:"Chaos Magic",         desc:"Sigil work, paradigm-shifting, servitors",      icon:"∞", prompt:"You speak from the Chaos Magic paradigm: belief as a tool, gnosis as the gateway, results as the measure. Your frameworks are flexible — you can work any paradigm effectively. You understand sigil craft, servitor creation, egregore dynamics, and the mechanics of paradigm-shifting."},
  "traditional-witchcraft": {label:"Traditional Witchcraft", desc:"Wheel of Year, lunar cycles, hedge-crossing", icon:"⁕", prompt:"You speak from the current of Traditional Witchcraft: the Old Craft, the crooked path, and the arte. Your timing is lunar — phases, mansions, the Wheel of the Year. Your spirit relationships are with genius loci, ancestors, and familiar spirits. You understand hedge-crossing, the fetch, and the red thread."},
  "hellenism":          {label:"Hellenism / Neoplatonism", desc:"Theurgic practice, Orphic hymns, decan magic", icon:"Ψ", prompt:"You speak from the Hellenistic and Neoplatonic current: Iamblichean theurgy, the Orphic hymns, the daimons of Plato, and the decan magic of the Hermetic papyri. Your spirit framework includes Olympic spirits, planetary daimons, and the Titan forces. The soul's ascent through the planetary spheres is your central metaphor."},
  "folk":               {label:"Folk / Rootwork",      desc:"Moon timing, saint devotion, ancestor work",    icon:"✿", prompt:"You speak from the folk magic current: simple and direct, rooted in land, season, and ancestor. Your timing is the moon's phase and sign, the day of the week, and the saint's feast day. Your materia are what grows locally, what the kitchen holds, what the churchyard offers. Ancestor reverence is your foundation."},
  "custom":             {label:"Custom / Eclectic",    desc:"User-defined system",                          icon:"◌", prompt:"You adapt to whatever magical system the practitioner describes. You meet them where they are, drawing on whichever classical or contemporary sources are relevant to their stated framework. You do not impose a tradition — you serve the practitioner's own system."},
};

function Sidebar({tab, setTab, hour, eph, open, setOpen}) {
  const p=P[hour.planet], moonVoC=eph?.voc?.isVoC;
  return (
    <>
      {open && <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,backdropFilter:"blur(4px)"}}/>}
      <div style={{position:"fixed",left:0,top:0,bottom:0,width:open?240:0,background:"rgba(4,4,16,0.97)",backdropFilter:"blur(28px)",borderRight:"1px solid rgba(200,175,100,0.1)",zIndex:300,overflow:"hidden",transition:"width 0.3s cubic-bezier(0.4,0,0.2,1)",boxShadow:open?"8px 0 40px rgba(0,0,0,0.6)":"none"}}>
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
function SkyScreen({now,hour,eph,fractal,natalPos,onWork}){
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
                <span style={{fontSize:14,color:pl.col}}>{pl.sym}</span>
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
  return FIXED_STARS.filter(s=>{const sLon=jd?precessStar(s.lon,jd):s.lon;let d=Math.abs(norm(sLon-lon));if(d>180)d=360-d;return d<2.5;});
}
function getMoonSpeed(jd){const dm=Math.abs(dailyMotion("moon",jd));return{speed:dm.toFixed(2),fast:dm>13.2,slow:dm<12,label:dm>13.2?"Fast":"Slow"};}

function getCurrentMansion(mlon){
  const MDATA=[
    {n:1,nm:"Al-Sharatain",lon:0,ruler:"saturn",op:"Begin new works, long journeys."},
    {n:2,nm:"Al-Butain",lon:12.9,ruler:"venus",op:"Love, hidden things, reconciliation."},
    {n:3,nm:"Al-Thurayya",lon:25.7,ruler:"moon",op:"Love, friendship, sea travel."},
    {n:4,nm:"Al-Dabaran",lon:38.6,ruler:"saturn",op:"Destruction, binding, protection."},
    {n:5,nm:"Al-Haqa",lon:51.4,ruler:"mercury",op:"Eloquence, secrets, safe travel."},
    {n:6,nm:"Al-Hana",lon:64.3,ruler:"moon",op:"Love, fertility, capture."},
    {n:7,nm:"Al-Dhira",lon:77.1,ruler:"jupiter",op:"Gain, friendship, trade."},
    {n:8,nm:"Al-Nathrah",lon:90.0,ruler:"saturn",op:"Victory, court, separating."},
    {n:9,nm:"Al-Tarf",lon:102.9,ruler:"mars",op:"Destruction, hindrance, banishing."},
    {n:10,nm:"Al-Jabha",lon:115.7,ruler:"jupiter",op:"Love, compassion, freedom."},
    {n:11,nm:"Al-Zubra",lon:128.6,ruler:"mars",op:"Binding, captivity, war."},
    {n:12,nm:"Al-Sarfah",lon:141.4,ruler:"sun",op:"Changing fortune, road opening."},
    {n:13,nm:"Al-Awwa",lon:154.3,ruler:"venus",op:"Love, union, travel. Most favorable."},
    {n:14,nm:"Al-Simak",lon:167.1,ruler:"mercury",op:"Favor, officials, with Spica: fortune."},
    {n:15,nm:"Al-Ghafr",lon:180.0,ruler:"saturn",op:"Buried things, ancestors, treasure."},
    {n:16,nm:"Al-Jubana",lon:192.9,ruler:"moon",op:"Destruction only."},
    {n:17,nm:"Al-Iklil",lon:205.7,ruler:"mars",op:"Victory, honor, all good things."},
    {n:18,nm:"Al-Qalb",lon:218.6,ruler:"sun",op:"Reconciliation, friendship."},
    {n:19,nm:"Al-Shawla",lon:231.4,ruler:"saturn",op:"Taming, compelling obedience."},
    {n:20,nm:"Al-Naam",lon:244.3,ruler:"jupiter",op:"Pursuit, destruction of enemies."},
    {n:21,nm:"Al-Baldah",lon:257.1,ruler:"venus",op:"Destroying enemies, causing flight."},
    {n:22,nm:"Saad al-Dhabih",lon:270.0,ruler:"moon",op:"Healing, escape from captivity."},
    {n:23,nm:"Saad Bula",lon:282.9,ruler:"saturn",op:"Healing all disease, restoration."},
    {n:24,nm:"Saad al-Suud",lon:295.7,ruler:"venus",op:"Marriage, union of lovers."},
    {n:25,nm:"Saad al-Akhbiya",lon:308.6,ruler:"mars",op:"Loosing prisoners, messengers."},
    {n:26,nm:"Al-Fargh al-Awwal",lon:321.4,ruler:"moon",op:"Building, foundations, childbirth."},
    {n:27,nm:"Al-Fargh al-Thani",lon:334.3,ruler:"saturn",op:"Increasing herds, healing wounds."},
    {n:28,nm:"Al-Batn al-Hut",lon:347.1,ruler:"mercury",op:"Acquiring wealth, completion."},
  ];
  const l=norm(mlon);let idx=0;
  for(let i=MDATA.length-1;i>=0;i--){if(l>=MDATA[i].lon){idx=i;break;}}
  const next=MDATA[(idx+1)%28];
  const degsLeft=(next.lon>MDATA[idx].lon?next.lon:next.lon+360)-l;
  return{mansion:MDATA[idx],idx,degsLeft,MDATA};
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
    const sLon=precessStar(star.lon,eph.jd);
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
            const x=10+((act?.sLon??precessStar(star.lon,eph.jd))/360)*260, y=80;
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

function ElectScreen({now,natalPos,eph}){
  const [ik,setIk]=useState("money");
  const [planet,setPlanet]=useState("jupiter");
  const [scanning,setScanning]=useState(false);
  const [elections,setElections]=useState([]);
  const [selIdx,setSelIdx]=useState(null);
  const [days,setDays]=useState(30);
  const [view,setView]=useState("live");
  const [showAll,setShowAll]=useState(false);
  const meta=INTENTS[ik]||INTENTS.money;
  useEffect(()=>{setPlanet(meta.planet);setElections([]);setSelIdx(null);},[ik]);
  const live=assessElection(now,planet,natalPos);
  const sc=live.score;
  const sCol=s=>s>=90?"#FFD700":s>=75?"#5CA85C":s>=60?"#D4AF6A":s>=45?"#C08050":"#8B4040";
  const gCol=g=>g.includes("DISQ")?"#8B4040":g.includes("Talismanic")?"#FFD700":g.includes("Excellent")?"#5CA85C":g.includes("Good")?"#D4AF6A":"#8A7050";
  const fmtD=d=>{const diff=Math.floor((d-now)/86400000),t=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});if(diff===0)return"Today "+t;if(diff===1)return"Tomorrow "+t;if(diff<8)return DAY_NAMES[d.getDay()]+" "+t;return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+t;};
  const runScan=()=>{setScanning(true);setElections([]);setSelIdx(null);const snap=new Date(now);setTimeout(()=>{setElections(scanElections(snap,days,planet,natalPos));setScanning(false);},300);};
  const TABS=[{id:"live",label:"Live"},{id:"scan",label:"Scan"},{id:"intents",label:"Intents"},{id:"theory",label:"Theory"}];
  const THEORY=[
    {title:"The Moon",text:"The Moon is the most important factor in all election astrology. She carries every planet's virtue to earth. Before anything else: is she void of course? In Via Combusta? Besieged? Dorotheus: Look always to the Moon."},
    {title:"Via Combusta",text:"15 Libra to 15 Scorpio — the Burnt Path. Sun falls in Libra, Moon falls in Scorpio. Both malefics hold power here. Multiple malefic fixed stars cluster here. Moon in Via Combusta vitiates any election."},
    {title:"Void of Course",text:"A void Moon is like writing on water. She makes no more applying aspects before leaving her sign. Nothing begun under a void Moon completes as intended. The oldest and most universal rule in election astrology."},
    {title:"Reception",text:"When planet A is in planet B's sign, B receives A. Mutual reception is the most powerful planetary alliance. A malefic that receives the working planet becomes a helper. Reception transforms square aspects into cooperative tensions."},
    {title:"Hayz and Sect",text:"Diurnal planets (Sun, Jupiter, Saturn) are strongest by day. Nocturnal planets (Moon, Venus, Mars) are strongest by night. Being in hayz — in your own sect's conditions — adds power beyond essential dignity."},
    {title:"Prohibition",text:"Another planet perfects an aspect with the Moon before she reaches your working planet — blocking your matter. Translation of Light: Moon carries virtue from one planet to another. Use translation deliberately to unite parties."},
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
            {live.critFail.length>0&&<div style={{marginBottom:8,padding:"8px 10px",borderRadius:9,background:"rgba(100,20,20,0.4)",border:"1px solid rgba(180,60,60,0.3)"}}>{live.critFail.map(c=><div key={c.id} style={{fontFamily:F,fontSize:10,color:"#C08080",fontStyle:"italic",lineHeight:1.6}}>✗ {c.label}: {c.note}</div>)}</div>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              {live.trans&&<span style={{fontFamily:F,fontSize:8,color:"#7CB8E0",background:"rgba(124,184,224,0.1)",border:"1px solid rgba(124,184,224,0.25)",borderRadius:6,padding:"2px 7px"}}>Translation: {P[live.trans.from]?.sym} to {P[live.trans.to]?.sym}</span>}
              {live.prohib&&<span style={{fontFamily:F,fontSize:8,color:"#D24B31",background:"rgba(210,75,49,0.1)",border:"1px solid rgba(210,75,49,0.25)",borderRadius:6,padding:"2px 7px"}}>Prohibited by {P[live.prohib.planet]?.name}</span>}
              {live.speed.fast&&<span style={{fontFamily:F,fontSize:8,color:"#D4AF6A",background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.2)",borderRadius:6,padding:"2px 7px"}}>Fast Moon {live.speed.speed}°/day</span>}
              {live.stars.map(s=><span key={s.name} style={{fontFamily:F,fontSize:8,color:s.col,background:"rgba(200,200,255,0.08)",border:"1px solid "+s.col+"25",borderRadius:6,padding:"2px 7px"}}>{s.name}</span>)}
            </div>
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
          {elections.map((e,i)=>{const isSel=selIdx===i,gc=sCol(e.assess.score);return<div key={i} onClick={()=>setSelIdx(isSel?null:i)} style={{marginBottom:8,borderRadius:13,background:isSel?P[planet].col+"0F":"rgba(8,5,22,0.65)",border:"2px solid "+(isSel?gc+"60":gc+"22"),padding:"12px 13px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}><div style={{fontFamily:F,fontSize:11,color:gc}}>{e.assess.grade}</div><div style={{fontFamily:F,fontSize:10,color:"#C4A870",fontStyle:"italic"}}>{fmtD(e.date)}</div><div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.45)",marginTop:1}}>{P[planet].name} {e.zodiac.degree}° {e.zodiac.sym}</div></div>
              <div style={{fontFamily:F,fontSize:30,color:gc,lineHeight:1}}>{e.assess.score}</div>
            </div>
            {isSel&&<div style={{marginTop:9,paddingTop:9,borderTop:"1px solid "+gc+"20"}}>{e.assess.criteria.map(c=><div key={c.id} style={{display:"flex",gap:7,padding:"4px 0",borderBottom:"1px solid rgba(200,175,100,0.04)"}}><span style={{fontSize:10,color:c.pass?"#5CA85C":"#8B4040",width:14}}>{c.pass?"✓":"✗"}</span><div style={{flex:1}}><div style={{fontFamily:F,fontSize:10,color:c.pass?"#C4A870":"#9A7060"}}>{c.label}</div><div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:1}}>{c.note}</div></div></div>)}</div>}
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
        {view==="theory"&&THEORY.map(({title,text})=><div key={title} style={{marginBottom:8,borderRadius:13,background:"rgba(8,5,22,0.65)",border:"1px solid rgba(200,175,100,0.09)",padding:"13px 14px"}}><div style={{fontFamily:F,fontSize:13,color:"#D4AF6A",marginBottom:5}}>{title}</div><div style={{fontFamily:F,fontSize:11,color:"#9A8060",fontStyle:"italic",lineHeight:1.9}}>{text}</div></div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WORK SCREEN
// ═══════════════════════════════════════════════════════════════════════
const TRADITION_STEPS={
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
    if(!apiKey){setGenPlan("Configure your Anthropic API key in Profile to generate ritual plans.");return;}
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
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1400,system:sys,messages:[{role:"user",content:userMsg}]})});
      const data=await resp.json();
      setGenPlan(data.content?.[0]?.text||data.error?.message||"An error occurred.");
    }catch(e){setGenPlan("Generator unavailable — check connection.");}
    setGenLoading(false);
  };
  const saveToGrimoire=async()=>{
    if(!genPlan)return;
    try{
      const r=await window.storage.get("astrum_grimoire");
      const existing=r?.value?JSON.parse(r.value):[];
      const entry={id:Date.now(),title:genGoal.slice(0,60)||(planet?`${P[planet].name} Working`:"Custom Working"),body:genPlan,planet:planet||"sun",tags:[planet||"custom","ai-generated"],date:now?now.toISOString().split("T")[0]:new Date().toISOString().split("T")[0],category:"ritual",type:"ai-generated"};
      await window.storage.set("astrum_grimoire",JSON.stringify([entry,...existing]));
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
// NATAL SCREEN
// ═══════════════════════════════════════════════════════════════════════
function NatalScreen({natalData,setNatalData,eph,fractal,natalPos}){
  const [bd,setBd]=useState(natalData?.date||"");
  const [bt,setBt]=useState(natalData?.time||"");
  const save=async()=>{if(!bd)return;const d={date:bd,time:bt};setNatalData(d);try{await window.storage.set("astrum_natal",JSON.stringify(d));}catch(e){}};
  const clear=async()=>{setNatalData(null);setBd("");setBt("");try{await window.storage.delete("astrum_natal");}catch(e){}};
  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Natal Chart</div>
        <div style={T(20)}>Personal Resonance</div>
        <div style={{fontFamily:F,fontSize:10,color:"#6A5030",fontStyle:"italic",marginTop:3,lineHeight:1.7}}>Your natal chart creates a personal frequency. When transiting planets or fractal layers align with your natal positions, your personal windows of power open.</div>
      </div>
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Birth Data</div>
        <div style={{marginTop:10,display:"flex",gap:10}}>
          <div style={{flex:2}}><div style={L("rgba(200,175,100,0.4)",7)}>Date</div><input type="date" value={bd} onChange={e=>setBd(e.target.value)} style={{width:"100%",marginTop:4,fontSize:12}}/></div>
          <div style={{flex:1}}><div style={L("rgba(200,175,100,0.4)",7)}>Time</div><input type="time" value={bt} onChange={e=>setBt(e.target.value)} style={{width:"100%",marginTop:4,fontSize:12}}/></div>
        </div>
        <div style={{marginTop:10,display:"flex",gap:8}}>
          <button onClick={save} disabled={!bd} style={{flex:2,padding:"10px 0",borderRadius:10,background:bd?"rgba(212,175,106,0.12)":"rgba(0,0,0,0.3)",border:`1px solid ${bd?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.1)"}`,fontFamily:F,fontSize:9,color:bd?"#D4AF6A":"#5A4020",letterSpacing:2,textTransform:"uppercase",cursor:bd?"pointer":"default"}}>Calculate Chart ✦</button>
          {natalPos&&<button onClick={clear} style={{flex:1,padding:"10px 0",borderRadius:10,background:"rgba(80,20,20,0.3)",border:"1px solid rgba(150,60,60,0.3)",fontFamily:F,fontSize:9,color:"#9B5050",letterSpacing:2,cursor:"pointer"}}>Clear</button>}
        </div>
      </div>
      {natalPos&&(
        <>
          <div className="card" style={{margin:"0 14px 10px"}}>
            <div style={L()}>Natal Decan Signatures</div>
            <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,marginBottom:10,lineHeight:1.6}}>These are the seven faces your planets occupied at birth. When the fractal system lands on these faces, or when transiting planets enter these decans, your personal frequency is activated.</div>
            {Object.entries(natalPos).filter(([pk])=>P[pk]).map(([pk,np])=>{
              const pl=P[pk],dc=DIGNITY_COL[np.dignity];
              const fractalActive=fractal.levels.some(l=>l.idx===np.decanIdx);
              const transitIn=eph.pos[pk]&&Math.floor(norm(eph.pos[pk].lon)/10)===np.decanIdx;
              return (
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
          <div className="card" style={{margin:"0 14px 10px"}}>
            <div style={L()}>Your Strong Channels</div>
            <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Planets in dignity at birth are your natural strong channels. Working with them in their day and hour produces amplified results specifically for you.</div>
            {Object.entries(natalPos).filter(([pk])=>P[pk]).sort((a,b)=>b[1].score-a[1].score).slice(0,4).map(([pk,np])=>{
              const pl=P[pk],transit=eph.pos[pk];
              return (
                <div key={pk} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(200,175,100,0.05)"}}>
                  <div style={{width:32,height:32,borderRadius:16,background:`${pl.col}12`,border:`1px solid ${pl.col}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:pl.col,flexShrink:0}}>{pl.sym}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F,fontSize:12,color:pl.col}}>{pl.name}</div>
                    <div style={{fontFamily:F,fontSize:9,color:DIGNITY_COL[np.dignity]}}>{np.dignity} at birth</div>
                    {transit&&<div style={{fontFamily:F,fontSize:8,color:"#5A4020",marginTop:1}}>Now: {transit.zodiac.name} · {DIGNITY_LBL[transit.dignity].split(" ")[0]}{transit.isRetro?" ℞":""}</div>}
                  </div>
                  <div style={{fontFamily:F,fontSize:20,color:pl.col}}>{np.score}</div>
                </div>
              );
            })}
          </div>
          {(natalPos?.asc!=null||natalPos?.mc!=null)&&(
            <div className="card" style={{margin:"0 14px 10px"}}>
              <div style={L()}>Angles & Parts</div>
              <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6,marginBottom:10}}>Calculated from birth time and location. The Ascendant is the mask and body; the MC is the social calling; the Part of Fortune is the body of luck.</div>
              {[
                natalPos.asc!=null&&{label:"Ascendant (ASC)",lon:natalPos.asc,sym:"AC",desc:"Rising sign — the bodily self and life orientation"},
                natalPos.mc!=null&&{label:"Midheaven (MC)",lon:natalPos.mc,sym:"MC",desc:"Career, public role, worldly calling"},
                natalPos.pof!=null&&{label:"Part of Fortune",lon:natalPos.pof,sym:"⊕",desc:natalPos.isDayChart?"Day chart: ASC + Moon − Sun":"Night chart: ASC + Sun − Moon"},
              ].filter(Boolean).map(({label,lon,sym,desc})=>{
                const z=lonToZodiac(lon);
                return(
                  <div key={sym} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(200,175,100,0.05)"}}>
                    <div style={{width:32,height:32,borderRadius:16,background:"rgba(200,175,100,0.08)",border:"1px solid rgba(200,175,100,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#D4AF6A",flexShrink:0}}>{sym}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:F,fontSize:12,color:"#C4A870"}}>{label}</div>
                      <div style={{fontFamily:F,fontSize:9,color:"#5A4020"}}>{z.degree}° {z.name} · {desc}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.2)",marginTop:8}}>
                {natalPos.isDayChart!=null&&`Sect: ${natalPos.isDayChart?"Day":"Night"} chart`}
                {natalPos.asc==null&&" · Enter birth location in Profile for angle calculations"}
              </div>
            </div>
          )}
          {natalPos?.asc==null&&(
            <div style={{margin:"0 14px 10px",padding:"12px 14px",borderRadius:12,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(200,175,100,0.08)"}}>
              <div style={{fontFamily:F,fontSize:9,color:"rgba(200,175,100,0.3)",lineHeight:1.6}}>✦ Enter your birth city in Profile to unlock Ascendant, MC, Part of Fortune, and true sect determination.</div>
            </div>
          )}
        </>
      )}
      {!natalPos&&<div style={{margin:"0 14px",padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:14,opacity:0.2}}>☽ ☉ ♄</div><div style={{fontFamily:F,fontSize:13,color:"#5A4020",fontStyle:"italic",lineHeight:1.9}}>Enter your birth date to unlock personal resonance — the layer where every timing system in this app is calibrated to your natal frequency.</div></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FRACTAL SCREEN
// ═══════════════════════════════════════════════════════════════════════
function FractalScreen({fractal,natalPos,mode,setMode}){
  const [selLevel,setSelLevel]=useState(null);
  const {levels,cosmicCoherence,secToThreshold}=fractal;
  const personalDecans=natalPos?Object.entries(natalPos).filter(([pk])=>P[pk]).map(([,np])=>np.decanIdx):[];
  const L_META=[
    {w:"Atziluth",p:"Election · Talismanic harvest"},
    {w:"Beriah",p:"Ritual design · Working day"},
    {w:"Yetzirah",p:"Single act · Meditation"},
    {w:"Assiah · The Breath",p:"One vowel · One breath"}
  ];
  const L_DUR_L=["~10.1 days","~6.76 hours","~11.3 min","~18.8 sec"];
  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px"}}>
        <div style={L()}>Fractal Decan System</div>
        <div style={T(20)}>The Nested Faces</div>
        <div style={{fontFamily:F,fontSize:10,color:"#6A5030",fontStyle:"italic",marginTop:3}}>36⁴ = 1,679,616 divisions of the year · Four Kabbalistic worlds</div>
      </div>
      <div style={{padding:"0 14px 10px",display:"flex",gap:8}}>
        {["A","B"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"10px 0",borderRadius:12,background:mode===m?"rgba(212,175,106,0.1)":"rgba(8,5,22,0.5)",border:`1px solid ${mode===m?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.09)"}`,cursor:"pointer"}}>
            <div style={L(mode===m?"#D4AF6A":"#5A4020",8)}>Option {m}</div>
            <div style={{fontFamily:F,fontSize:10,color:mode===m?"#C4A870":"#4A3020",fontStyle:"italic",marginTop:2}}>{m==="A"?"Wave · Navigator":"Particle · Initiator"}</div>
          </button>
        ))}
      </div>
      {levels.map((lev,i)=>{
        const col=P[lev.decan.ruler].col,isCoherent=lev.idx===levels[0].idx,isPersonal=personalDecans.includes(lev.idx),isActive=selLevel===i,secLeft=lev.dur-lev.secIn;
        return (
          <div key={i} onClick={()=>setSelLevel(isActive?null:i)} style={{margin:"0 14px 8px",borderRadius:15,background:isCoherent?"rgba(212,175,106,0.07)":"rgba(8,5,22,0.65)",border:`1px solid ${isCoherent?"rgba(212,175,106,0.28)":isPersonal?"rgba(255,215,0,0.12)":"rgba(200,175,100,0.09)"}`,padding:"12px 14px",cursor:"pointer",backdropFilter:"blur(16px)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:16,background:`${col}12`,border:`1px solid ${col}35`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:10,color:col,flexShrink:0}}>{"IIII".slice(0,i+1)}</div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={L("rgba(200,175,100,0.35)",7)}>{L_META[i].w} · {L_DUR_L[i]}</div>
                    {isCoherent&&i>0&&<span style={{fontFamily:F,fontSize:7,color:"#D4AF6A",letterSpacing:1}}>COSMIC ✦</span>}
                    {isPersonal&&!isCoherent&&<span style={{fontFamily:F,fontSize:7,color:"#FFD700",letterSpacing:1}}>NATAL ✦</span>}
                  </div>
                  <div style={T(14,isCoherent?"#D4AF6A":col)}>{lev.decan.name}</div>
                  <div style={{fontFamily:F,fontSize:9,color:`${col}70`,marginTop:1}}>{lev.decan.sym} {lev.decan.sign} · {lev.decan.ruler.charAt(0).toUpperCase()+lev.decan.ruler.slice(1)}</div>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:F,fontSize:12,color:col}}>{fmtTime(secLeft)}</div>
                <div style={{fontFamily:F,fontSize:6,color:"#4A3020",letterSpacing:1}}>remaining</div>
              </div>
            </div>
            <div style={{marginTop:9,height:2,background:"rgba(200,175,100,0.07)",borderRadius:1}}><div style={{height:"100%",width:`${lev.pos*100}%`,background:col,borderRadius:1,transition:i>=3?"width 0.2s":"width 1.5s"}}/></div>
            {isActive&&(
              <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${col}15`}}>
                <div style={{fontFamily:F,fontSize:9,color:`${col}60`,fontStyle:"italic",marginTop:3,lineHeight:1.7}}>{L_META[i].p}</div>
                <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:5,lineHeight:1.7}}>{mode==="A"?"Wave mode: The full zodiacal drama replays from Aries I through this container. Navigate the wave.":"Particle mode: This level opened on its parent's face. The threshold is the moment of maximum coherence."}</div>
                {i===3&&<div style={{marginTop:10,padding:"9px 11px",borderRadius:10,background:"rgba(0,0,0,0.3)",border:`1px solid ${col}15`,textAlign:"center"}}><div style={{fontFamily:"serif",fontSize:20,color:"#D4AF6A",letterSpacing:8,marginBottom:4}}>{{"moon":"AH","mercury":"EH","venus":"AY","sun":"EE","mars":"OH","jupiter":"EUW","saturn":"OHW"}[lev.decan.ruler]}</div><div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic"}}>Sound now · one breath · one face</div></div>}
              </div>
            )}
          </div>
        );
      })}
      <div className="card" style={{margin:"0 14px",display:"flex",gap:12,justifyContent:"space-between"}}>
        <div style={{textAlign:"center"}}><div style={L("rgba(200,175,100,0.4)",7)}>Cosmic Levels</div><div style={{fontFamily:F,fontSize:24,color:cosmicCoherence>=3?"#D4AF6A":"#6A5030",marginTop:4}}>{cosmicCoherence}</div></div>
        <div style={{textAlign:"center"}}><div style={L("rgba(200,175,100,0.4)",7)}>Next {mode==="B"?"Threshold":"Coherence"}</div><div style={{fontFamily:F,fontSize:16,color:"#C4A870",marginTop:4}}>{fmtTime(secToThreshold)}</div></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// JOURNAL SCREEN
// ═══════════════════════════════════════════════════════════════════════
function JournalScreen({profile}){
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
  };
  const del=async(id)=>{const ne=entries.filter(e=>e.id!==id);setEntries(ne);try{await window.storage.set("astrum_journal",JSON.stringify(ne));}catch(e){}};
  const reflect=async()=>{
    const apiKey=profile?.apiKey||"";
    if(!apiKey){setReflection("Configure your Anthropic API key in Profile to use AI reflection.");return;}
    setReflecting(true);setReflection(null);
    const trad=profile?.traditions?.map(t=>TRADITIONS[t]?.label||t).join(", ")||"Western Ceremonial";
    const entrySummary=entries.slice(0,20).map(e=>`[${e.date}] ${P[e.planet]?.name||e.planet}: ${e.intent}${e.outcome?` → ${e.outcome}`:""}`).join("\n");
    const sys=`You are an analytical magical advisor reviewing a practitioner's journal. Look for patterns: which planets appear most often, success vs. failure patterns, timing observations, seasonal patterns, repeating intentions. Be specific — cite exact data from the journal. Give actionable recommendations. Tradition: ${trad}.`;
    const userMsg=`Here is my magical practice journal (${entries.length} entries). Analyze it for patterns and give me your honest assessment and recommendations:\n\n${entrySummary}`;
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:900,system:sys,messages:[{role:"user",content:userMsg}]})});
      const data=await resp.json();
      setReflection(data.content?.[0]?.text||data.error?.message||"An error occurred.");
    }catch(e){setReflection("Reflection unavailable — check connection.");}
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
function loadKnowledge(){
  try{const raw=window.storage.getItem("astrum_knowledge");if(raw)return JSON.parse(raw);}catch{}
  return[];
}
function saveKnowledge(nodes){window.storage.setItem("astrum_knowledge",JSON.stringify(nodes));}

// Build dynamic system prompt from profile, knowledge nodes, and optional sky context
function buildSystemPrompt(profile,extraContext){
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
  return `${tradPrompt}\n\nTradition context: ${tradNames}. ${name}\n${levelNote}${knowledgeSection}${extraContext?`\n\n${extraContext}`:""}`;
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
    const systemPrompt=buildSystemPrompt(profile,context);
    const apiKey=profile?.apiKey||"";
    if(!apiKey){setMessages(m=>[...m,{role:"assistant",content:"No API key configured. Go to Profile → Anthropic API Key to enter your key from console.anthropic.com."}]);setLoading(false);return;}
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,system:systemPrompt,messages:[...messages,userMsg].filter(m=>m.role!=="assistant"||messages.indexOf(m)>0).map(m=>({role:m.role,content:m.content}))})});
      const data=await resp.json();
      const txt=data.content?.[0]?.text||data.error?.message||"An error occurred — check API key configuration.";
      setMessages(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){
      setMessages(m=>[...m,{role:"assistant",content:"Unable to connect to the API. This feature requires a valid Anthropic API key configured server-side."}]);
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
const LEARN_TOPICS=[
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
  switch(tab){
    case "sky": return `${base} Active decan: ${DECANS[eph.decanIdx].name} (${DECANS[eph.decanIdx].sign}, ruler ${DECANS[eph.decanIdx].ruler}). Fractal coherence: ${fractal.cosmicCoherence}%, active layers: ${fractal.levels.slice(0,2).map(l=>l.decan.name).join(", ")}. ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: Analyze this celestial moment fully. What is the quality of this moment for magical work? What planetary conditions stand out — for good or ill? What would you recommend working with right now, and what would you avoid?`;
    case "decans": return `${base} The Sun occupies the ${DECANS[eph.decanIdx].name} — the ${eph.decanIdx+1}th decan of ${DECANS[eph.decanIdx].sign}, ruled by ${DECANS[eph.decanIdx].ruler}. Its classical operations: ${DECANS[eph.decanIdx].magic}. ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: Speak to this decan face. What does it offer the practitioner right now? What kinds of workings align with its nature? How do the current planetary conditions interact with this face?`;
    case "fractal": return `${base} Fractal timing layers: ${fractal.levels.map(l=>`L${l.level}: ${l.decan.name} (${l.decan.sign})`).join(", ")}. Cosmic coherence: ${fractal.cosmicCoherence}%. ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: Read this moment of nested time. Where are the alignments? What do these converging layers mean for magical operation? What timing window opens or closes here?`;
    case "planets": return `${base} ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: Survey the state of the seven spheres right now. Which are most empowered? Which are most afflicted? Rank them as channels for work. Which planet would you most and least recommend working with today, and why?`;
    case "stars": const ns=eph.nearStars?.map(s=>`${s.name} conj ${P[s.planet]?.name||s.planet} (${s.orb?.toFixed(1)}° orb)`).join(", ")||"No notable star conjunctions active";return `${base} Active fixed star conjunctions: ${ns}. ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: Interpret the fixed star influences currently active. What do these stars portend? How do they modify the planets they conjoin? What operations do they favor or forbid?`;
    case "natal": return `${base} ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: Analyze how the current sky relates to this practitioner's natal chart. Which natal positions are being activated by transit? What does the current sky promise for this practitioner specifically? What is their strongest channel right now?`;
    case "elect": return `${base} ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: Survey the quality of upcoming election windows. Given the current planetary state, what are the best and worst planets to elect for over the coming days? What's the single strongest opportunity in the next two weeks, and why?`;
    case "work": return `${base} ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: What planet should this practitioner work with right now? Assess all seven spheres — their dignity, condition, and the materia available in this season. Give a direct recommendation with full classical reasoning.`;
    case "journal": return `${base} ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: The practitioner is reviewing their magical journal. What timing wisdom applies right now? What would make for a valuable entry today — what celestial conditions are worth recording for future reference?`;
    default: return `${base} ${natalStr}\n\nAs my Oracle in the ${tradition} tradition: What wisdom is most relevant to this practitioner right now?`;
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
    if(!apiKey){setMsgs(m=>[...m,{role:"assistant",content:"Configure your Anthropic API key in Profile → API Key to activate the Oracle."}]);setLoading(false);return;}
    const sys=buildSystemPrompt(profile,"You are the Oracle — an embedded advisor in a magical practice app. Speak directly to what the practitioner is currently observing. Be concise and specific (2-4 paragraphs for readings, shorter for follow-ups). Reference exact data given. No generalities — address the specific conditions described.");
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:800,system:sys,messages:newMsgs.map(m=>({role:m.role,content:m.content}))})});
      const data=await resp.json();
      const txt=data.content?.[0]?.text||data.error?.message||"An error occurred.";
      setMsgs(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){setMsgs(m=>[...m,{role:"assistant",content:"Oracle unavailable — check connection."}]);}
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

function SigilScreen({eph,profile}){
  const [mode,setMode]=useState("list"); // list|create|view
  const [method,setMethod]=useState("rose"); // rose|kamea|free
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
    try{const raw=window.storage.getItem("astrum_sigils");if(raw)setSigils(JSON.parse(raw));}catch{}
  },[]);
  const save=(list)=>{setSigils(list);window.storage.setItem("astrum_sigils",JSON.stringify(list));};

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

  const pathToSvgD=(pts)=>{
    if(!pts||pts.length<2)return"";
    return pts.map((p,i)=>(i===0?`M${p[0].toFixed(1)} ${p[1].toFixed(1)}`:`L${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(" ");
  };

  const freeToSvgD=(paths)=>{
    return paths.map(path=>path.map((p,i)=>(i===0?`M${p[0]} ${p[1]}`:`L${p[0]} ${p[1]}`)).join(" ")).join(" ");
  };

  const createSigil=()=>{
    let svgData=null;
    if(method==="rose"){
      const pts=buildRosePath(word);
      if(!pts)return;
      svgData={method:"rose",pts,word};
    } else if(method==="kamea"){
      const pts=buildKameaPath(word,planet);
      if(!pts)return;
      svgData={method:"kamea",pts,word,planet};
    } else {
      if(!paths.length)return;
      svgData={method:"free",paths};
    }
    const now=new Date();
    const entry={
      id:Date.now(),planet,intent,word,method,
      svgData,status:"created",
      date:now.toISOString(),
      skySnap:eph?{moon:eph.pos?.moon?.lon,sun:eph.pos?.sun?.lon}:null,
      aiNote:""
    };
    const next=[entry,...sigils];
    save(next);setSel(entry);setMode("view");
    setWord("");setIntent("");setPaths([]);setSavedSvg(null);
  };

  const updateStatus=(id,st)=>{
    const next=sigils.map(s=>s.id===id?{...s,status:st}:s);
    save(next);
    if(sel?.id===id)setSel(prev=>({...prev,status:st}));
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
    const body={model:"claude-sonnet-4-5",max_tokens:300,
      system:`You are an expert in electional astrology and talismanic timing. Give a brief, practical 2-3 sentence note on current timing for charging a ${pl.name} sigil. Current sky: Sun at ${eph.pos?.sun?.lon?.toFixed(1)}°, Moon at ${eph.pos?.moon?.lon?.toFixed(1)}°. Be specific and actionable.`,
      messages:[{role:"user",content:`When is the best time in the next 48 hours to charge a ${pl.name} sigil? Current moment: ${now.toLocaleString()}.`}]};
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body)});
      const data=await resp.json();
      const note=data.content?.[0]?.text||"";
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
            <div style={{fontSize:11,letterSpacing:3,color:"rgba(200,175,100,0.5)",marginBottom:4}}>{pl?.symbol} {pl?.name?.toUpperCase()}</div>
            <div style={{fontSize:16,marginBottom:6,color:pl?.color||GOLD}}>{sel.intent||"(no intention)"}</div>
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
          :<button onClick={()=>getAITiming(sel)} disabled={aiLoading||!profile?.apiKey} style={{padding:"6px 16px",border:"1px solid rgba(200,175,100,0.2)",borderRadius:4,background:"transparent",color:aiLoading?"rgba(200,175,100,0.35)":GOLD,fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer"}}>
            {aiLoading?"READING SKY…":"GET TIMING"}
          </button>}
          {!profile?.apiKey&&<div style={{fontSize:9,color:"rgba(200,175,100,0.3)",marginTop:6}}>Set API key in Profile to enable AI timing.</div>}
        </div>
        <button onClick={()=>deleteSigil(sel.id)} style={{padding:"5px 14px",border:"1px solid rgba(200,100,100,0.2)",borderRadius:4,background:"transparent",color:"rgba(200,100,100,0.5)",fontFamily:F,fontSize:9,letterSpacing:2,cursor:"pointer"}}>DELETE SIGIL</button>
      </div>
    );
  }

  if(mode==="create"){
    const previewPts=method==="rose"?buildRosePath(word):method==="kamea"?buildKameaPath(word,planet):null;
    return(
      <div style={{padding:"28px 24px",fontFamily:F,color:GOLD,maxWidth:560,margin:"0 auto"}}>
        <button onClick={()=>setMode("list")} style={{background:"none",border:"none",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:10,letterSpacing:2,cursor:"pointer",marginBottom:24,padding:0}}>← SIGILS</button>
        <div style={{fontSize:11,letterSpacing:3,color:"rgba(200,175,100,0.5)",marginBottom:20}}>NEW SIGIL</div>

        {/* Method picker */}
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {[["rose","Rose Cross"],["kamea","Kamea"],["free","Freehand"]].map(([m,lbl])=>(
            <button key={m} onClick={()=>setMethod(m)} style={{flex:1,padding:"6px 0",border:`1px solid ${method===m?"rgba(200,175,100,0.5)":"rgba(200,175,100,0.1)"}`,borderRadius:4,background:method===m?"rgba(200,175,100,0.06)":"transparent",color:method===m?GOLD:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:9,letterSpacing:2,cursor:"pointer"}}>{lbl.toUpperCase()}</button>
          ))}
        </div>

        {/* Planet */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:8}}>PLANET</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {Object.keys(P).map(pk=>(
              <button key={pk} onClick={()=>setSigilPlanet(pk)} style={{padding:"4px 12px",border:`1px solid ${planet===pk?P[pk].color:"rgba(200,175,100,0.1)"}`,borderRadius:10,background:planet===pk?`${P[pk].color}22`:"transparent",color:planet===pk?P[pk].color:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:10,cursor:"pointer"}}>{P[pk].symbol} {P[pk].name}</button>
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
        {method==="free"&&(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:9,letterSpacing:2,color:"rgba(200,175,100,0.4)",marginBottom:8}}>DRAW YOUR SIGIL</div>
            <div style={{position:"relative",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,background:"rgba(0,0,0,0.4)",display:"inline-block",cursor:"crosshair",touchAction:"none"}}>
              <svg width={260} height={260} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                onTouchStart={e=>{e.preventDefault();onMouseDown(e);}} onTouchMove={e=>{e.preventDefault();onMouseMove(e);}} onTouchEnd={onMouseUp}>
                {paths.map((path,i)=><polyline key={i} points={path.map(p=>p.join(",")).join(" ")} fill="none" stroke={P[planet].color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>)}
                {curPath.length>1&&<polyline points={curPath.map(p=>p.join(",")).join(" ")} fill="none" stroke={P[planet].color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>}
              </svg>
            </div>
            <div style={{marginTop:8,display:"flex",gap:8}}>
              <button onClick={()=>{setPaths(prev=>prev.slice(0,-1));}} style={{padding:"4px 12px",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,background:"transparent",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer"}}>UNDO</button>
              <button onClick={()=>{setPaths([]);setCurPath([]);}} style={{padding:"4px 12px",border:"1px solid rgba(200,175,100,0.15)",borderRadius:4,background:"transparent",color:"rgba(200,175,100,0.5)",fontFamily:F,fontSize:9,letterSpacing:1,cursor:"pointer"}}>CLEAR</button>
            </div>
          </div>
        )}

        <button onClick={createSigil} disabled={!intent||(method!=="free"&&word.length<2)||(method==="free"&&!paths.length)} style={{width:"100%",padding:"10px",border:`1px solid rgba(200,175,100,${intent?"0.4":"0.1"})`,borderRadius:4,background:"transparent",color:intent?GOLD:"rgba(200,175,100,0.3)",fontFamily:F,fontSize:10,letterSpacing:3,cursor:"pointer"}}>SEAL SIGIL</button>
      </div>
    );
  }

  // List view
  const statusFilter=["all","created","charged","deployed","fulfilled","retired"];
  const [filter,setFilter_]=useState("all");
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
                <div style={{fontSize:8,letterSpacing:2,color:pl?.color||GOLD,opacity:0.7}}>{pl?.symbol} {pl?.name?.toUpperCase()}</div>
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
function LearnScreen({profile}){
  const [topic,setTopic]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [testMode,setTestMode]=useState(false);
  const bottomRef=useRef(null);
  const userTraditions=profile?.traditions||["western-ceremonial"];
  const lvl=profile?.level||"intermediate";
  const filteredTopics=LEARN_TOPICS.filter(t=>t.traditions.includes("all")||userTraditions.some(ut=>t.traditions.includes(ut)));
  const sendMsg=async(text,history)=>{
    if(loading)return;
    const apiKey=profile?.apiKey||"";
    const newMsgs=[...history,{role:"user",content:text}];
    setMsgs(newMsgs);setLoading(true);
    if(!apiKey){setMsgs(m=>[...m,{role:"assistant",content:"Configure your Anthropic API key in Profile to use the Learn feature."}]);setLoading(false);return;}
    const modeNote=testMode?"You are in TEST MODE. Ask the student a specific question about the topic they have been learning. Wait for their answer, then evaluate it: affirm what is correct, gently correct what is wrong, and deepen the teaching. Then ask another question.":"You are in LESSON MODE. Teach using the Socratic method: introduce a key concept, ask the student a thought-provoking question, respond to their answer with deeper insight. Keep your turns to 2-3 paragraphs maximum. Guide discovery rather than simply lecturing.";
    const sys=buildSystemPrompt(profile,`You are a master teacher of magical tradition and esoteric knowledge.\n\n${modeNote}`);
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:700,system:sys,messages:newMsgs.map(m=>({role:m.role,content:m.content}))})});
      const data=await resp.json();
      const txt=data.content?.[0]?.text||data.error?.message||"An error occurred.";
      setMsgs(m=>[...m,{role:"assistant",content:txt}]);
    }catch(e){setMsgs(m=>[...m,{role:"assistant",content:"Learn unavailable — check connection."}]);}
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  const startTopic=(t)=>{
    setTopic(t);setMsgs([]);setInput("");setTestMode(false);setLoading(false);
    const prompt=`I want to learn about: ${t.label}. Topic context: ${t.desc}. Please begin the lesson.`;
    setTimeout(()=>sendMsg(prompt,[]),80);
  };
  const sendFollow=()=>{if(!input.trim()||loading)return;const i=input;setInput("");sendMsg(i,msgs);};
  const switchMode=()=>{
    const nm=!testMode;setTestMode(nm);
    sendMsg(nm?"Switch to test mode — ask me a question about what we've covered so far.":"Return to lesson mode — continue the lesson from where we left off.",msgs);
  };
  if(!topic){
    return(
      <div style={{flex:1,overflowY:"auto",paddingBottom:20}}>
        <div style={{padding:"16px 18px 10px"}}>
          <div style={L()}>Magical Education</div>
          <div style={T(20)}>Learn ⬡</div>
          <div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",marginTop:3,lineHeight:1.7}}>Choose a topic. The AI teaches through Socratic dialogue — asking questions, responding to your answers, building understanding from the inside out.</div>
        </div>
        {["beginner","intermediate","advanced"].filter(l=>filteredTopics.some(t=>t.level===l)).map(l=>(
          <div key={l}>
            <div style={{padding:"8px 18px 4px",fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",letterSpacing:3,textTransform:"uppercase"}}>{l}</div>
            {filteredTopics.filter(t=>t.level===l).map(t=>(
              <button key={t.id} onClick={()=>startTopic(t)} style={{width:"100%",padding:"11px 18px",background:"none",border:"none",borderBottom:"1px solid rgba(200,175,100,0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
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
    );
  }
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:0}}>
      <div style={{padding:"12px 16px 10px",borderBottom:"1px solid rgba(200,175,100,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>{setTopic(null);setMsgs([]);}} style={{background:"none",border:"none",color:"rgba(200,175,100,0.4)",fontFamily:F,fontSize:10,letterSpacing:1,cursor:"pointer",padding:0}}>← Topics</button>
          <span style={{color:"rgba(200,175,100,0.15)"}}>|</span>
          <div style={{fontFamily:F,fontSize:12,color:"#D4AF6A"}}>{topic.label}</div>
        </div>
        <button onClick={switchMode} disabled={loading||msgs.length<2} style={{padding:"6px 10px",borderRadius:8,background:testMode?"rgba(212,175,106,0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${testMode?"rgba(212,175,106,0.35)":"rgba(200,175,100,0.12)"}`,fontFamily:F,fontSize:8,color:testMode?"#D4AF6A":"rgba(200,175,100,0.4)",letterSpacing:1,cursor:"pointer"}}>
          {testMode?"LESSON":"TEST ME"}
        </button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>
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

// ═══════════════════════════════════════════════════════════════════════
// PROFILE / SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE COMPONENT (embedded in ProfileScreen)
// ═══════════════════════════════════════════════════════════════════════
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

function ProfileScreen({profile,setProfile}){
  const [name,setName]=useState(profile?.name||"");
  const [date,setDate]=useState(profile?.natal?.date||"");
  const [time,setTime]=useState(profile?.natal?.time||"");
  const [city,setCity]=useState(profile?.natal?.city||"");
  const [lat,setLat]=useState(profile?.natal?.lat||null);
  const [lon,setLon]=useState(profile?.natal?.lon||null);
  const [traditions,setTraditions]=useState(profile?.traditions||["western-ceremonial"]);
  const [level,setLevel]=useState(profile?.level||"intermediate");
  const [apiKey,setApiKey]=useState(profile?.apiKey||"");
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
    const p={name,natal:{date,time,city,lat,lon},traditions,level,apiKey,theme:"dark"};
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
      <div className="card" style={{margin:"0 14px 10px"}}>
        <div style={L()}>Anthropic API Key</div>
        <div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:4,lineHeight:1.6}}>Required for the AI Planner and all Oracle features. Stored only in this app, never transmitted elsewhere.</div>
        <div style={{marginTop:10}}>
          <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-…" style={IS}/>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.25)",marginTop:5}}>Obtain at console.anthropic.com — you pay only for what you use.</div>
        </div>
      </div>
      <KnowledgeBase/>
      <div style={{padding:"10px 14px 0"}}>
        <button onClick={saveProfile} style={{width:"100%",padding:"13px 0",borderRadius:12,background:"rgba(212,175,106,0.12)",border:"1px solid rgba(212,175,106,0.35)",fontFamily:F,fontSize:10,color:saved?"#7AB07A":"#D4AF6A",letterSpacing:3,textTransform:"uppercase",cursor:"pointer",transition:"color 0.4s"}}>
          {saved?"✓ PROFILE SAVED":"SAVE PROFILE"}
        </button>
        {!profile?.apiKey&&<div style={{fontFamily:F,fontSize:9,color:"#9B5050",textAlign:"center",marginTop:8,lineHeight:1.5}}>API key not set — AI features are inactive</div>}
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
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),200);return()=>clearInterval(t);},[]);
  // Load profile (primary) and legacy natal data
  useEffect(()=>{(async()=>{
    try{const r=await window.storage.get("astrum_profile");if(r?.value){const p=JSON.parse(r.value);setProfile(p);return;}}catch(e){}
    // No profile yet — try legacy natal, then set empty profile
    try{const r=await window.storage.get("astrum_natal");if(r?.value){const d=JSON.parse(r.value);setNatalData(d);}}catch(e){}
    setProfile({name:"",natal:{date:"",time:"",city:"",lat:null,lon:null},traditions:["western-ceremonial"],level:"intermediate",apiKey:"",theme:"dark"});
  })();},[]);
  // Compute natal positions from profile (or legacy natal data)
  useEffect(()=>{
    const nd=profile?.natal?.date?profile.natal:natalData;
    if(nd?.date){
      const bd=nd.time?new Date(`${nd.date}T${nd.time}:00`):new Date(`${nd.date}T12:00:00`);
      const loc=nd.lat&&nd.lon?{lat:nd.lat,lon:nd.lon}:null;
      if(!isNaN(bd.getTime()))setNatalPos(calcNatal(bd,loc));else setNatalPos(null);
    }else setNatalPos(null);
  },[natalData,profile]);
  const location=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
  const hour=location?getPlanetaryHourUnequal(now,location.lat,location.lon):getPlanetaryHour(now);
  const eph=useEphemeris(now,location);
  const fractal=calcFractal(now,fractalMode);
  const openWork=useCallback(pk=>{setWork(pk);setTab("work");},[]);
  const openOracle=useCallback(()=>{
    if(!eph)return;
    setOracleCtx(buildOracleContext(tab,now,eph,fractal,natalPos,hour,profile));
    setOracleOpen(true);
  },[tab,now,eph,fractal,natalPos,hour,profile]);
  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 10%,rgba(60,40,120,0.25) 0%,transparent 50%),radial-gradient(ellipse at 80% 90%,rgba(160,120,30,0.15) 0%,transparent 50%),#04060F",display:"flex",justifyContent:"center",fontFamily:F,color:"#D4AF6A"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:430,minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
        <Sidebar tab={tab} setTab={setTab} hour={hour} eph={eph} open={sidebarOpen} setOpen={setSidebarOpen}/>
        <div style={{height:50,background:"rgba(4,4,16,0.97)",backdropFilter:"blur(28px)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",flexShrink:0,borderBottom:"1px solid rgba(200,175,100,0.07)",boxShadow:"0 1px 0 rgba(255,255,255,0.02)"}}>
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",gap:4,padding:4}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===2?14:20,height:1.5,background:"rgba(200,175,100,0.45)",borderRadius:1}}/>)}
          </button>
          <div onClick={()=>setTab("profile")} style={{cursor:"pointer"}}>
            <div style={{fontFamily:F,fontSize:11,color:"#D4AF6A",letterSpacing:7,textTransform:"uppercase"}}>ASTRUM</div>
            {profile?.name&&<div style={{fontFamily:F,fontSize:7,color:"rgba(200,175,100,0.35)",letterSpacing:2,textTransform:"uppercase",textAlign:"center",marginTop:1}}>{profile.name}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{fontFamily:F,fontSize:10,color:"rgba(200,175,100,0.3)"}}>{now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
            <span style={{fontSize:11,color:P[hour.planet].col}}>{P[hour.planet].sym}</span>
          </div>
        </div>
        <div style={{height:28,background:"rgba(4,4,16,0.8)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",padding:"0 18px",borderBottom:"1px solid rgba(200,175,100,0.04)"}}>
          <div style={{fontFamily:F,fontSize:8,color:"rgba(200,175,100,0.3)",letterSpacing:3,textTransform:"uppercase"}}>
            {NAV_SECTIONS.find(s=>s.id===tab)?.icon} {NAV_SECTIONS.find(s=>s.id===tab)?.label} — {NAV_SECTIONS.find(s=>s.id===tab)?.desc}
          </div>
          {eph.voc?.isVoC&&<div style={{marginLeft:"auto",fontFamily:F,fontSize:7,color:"#E09060",letterSpacing:2}}>⚠ MOON VoC</div>}
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",overflowY:"auto"}}>
          {tab==="sky"     &&<SkyScreen     now={now} hour={hour} eph={eph} fractal={fractal} natalPos={natalPos} onWork={openWork}/>}
          {tab==="aspects" &&<AspectsScreen eph={eph}/>}
          {tab==="decans"  &&<DecansScreen  eph={eph} fractal={fractal} natalPos={natalPos} mode={fractalMode} setMode={setFractalMode}/>}
          {tab==="fractal" &&<FractalScreen fractal={fractal} natalPos={natalPos} mode={fractalMode} setMode={setFractalMode}/>}
          {tab==="planets" &&<PlanetsScreen eph={eph} natalPos={natalPos} now={now}/>}
          {tab==="stars"   &&<StarsScreen   eph={eph} natalPos={natalPos}/>}
          {tab==="natal"   &&<NatalScreen   natalData={natalData} setNatalData={setNatalData} eph={eph} fractal={fractal} natalPos={natalPos}/>}
          {tab==="elect"   &&<ElectScreen   now={now} natalPos={natalPos} eph={eph}/>}
          {tab==="calendar"&&<CalendarScreen now={now} natalPos={natalPos}/>}
          {tab==="journal" &&<JournalScreen  profile={profile}/>}
          {tab==="sigils"  &&<SigilScreen    eph={eph} profile={profile}/>}
          {tab==="grimoire"&&<GrimoireScreen profile={profile}/>}
          {tab==="learn"   &&<LearnScreen   profile={profile}/>}
          {tab==="work"    &&<WorkScreen    eph={eph} initPlanet={workPlanet} natalPos={natalPos} profile={profile} now={now}/>}
          {tab==="ai"      &&<AIScreen      now={now} eph={eph} fractal={fractal} natalPos={natalPos} hour={hour} profile={profile}/>}
          {tab==="profile" &&<ProfileScreen profile={profile} setProfile={setProfile}/>}
        </div>
        {/* Floating Oracle Button — visible on all screens except ai+profile */}
        {tab!=="ai"&&tab!=="profile"&&(
          <button onClick={openOracle} style={{position:"fixed",bottom:24,right:24,width:46,height:46,borderRadius:23,background:"rgba(4,4,18,0.92)",border:"1px solid rgba(200,175,100,0.25)",backdropFilter:"blur(16px)",boxShadow:"0 4px 24px rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:400,transition:"border-color 0.2s,transform 0.15s",fontSize:17,color:"#D4AF6A"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(212,175,106,0.55)";e.currentTarget.style.transform="scale(1.08)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(200,175,100,0.25)";e.currentTarget.style.transform="scale(1)";}}>
            ✧
          </button>
        )}
        <OraclePanel open={oracleOpen} onClose={()=>setOracleOpen(false)} context={oracleCtx} profile={profile}/>
      </div>
    </div>
  );
}
