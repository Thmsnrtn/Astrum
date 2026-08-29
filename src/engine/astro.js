// ═══════════════════════════════════════════════════════════════════════
// ASTRO — the astronomy/astrology engine core (extracted from App.jsx)
// Pure math + tables: positions, dignities, hours, VoC, angles, houses.
// ═══════════════════════════════════════════════════════════════════════
import { GOLD } from "../ui/theme.js";
import { swPlanetLon, swDailyMotion, swTrueNode, swChiron, swLilith, swFixstar } from "./sweph.js";
import { DECANS } from "../data/decans.js";
import { computeLots } from "./lots.js";

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const norm = a => ((a % 360) + 360) % 360;

export function dateToJD(d) {
  let Y=d.getUTCFullYear(),M=d.getUTCMonth()+1;
  const D=d.getUTCDate()+(d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600)/24;
  if(M<=2){Y--;M+=12;}
  const A=Math.floor(Y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(Y+4716))+Math.floor(30.6001*(M+1))+D+B-1524.5;
}
export function sunLon(jd){
  const sw=swPlanetLon("sun",jd);if(sw!=null)return sw;
  const T=(jd-2451545)/36525,L0=norm(280.46646+36000.76983*T);
  const M=norm(357.52911+35999.05029*T),Mr=M*D2R;
  const C=(1.914602-0.004817*T)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
  return norm(L0+C-0.00569-0.00478*Math.sin(norm(125.04-1934.136*T)*D2R));
}
export function moonLon(jd){
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
export const EL={
  mercury:{L0:252.250906,Lr:149472.6746358,e0:0.20563175,de:-0.000000261,w0:77.45611904,dw:0.15940013,a:0.387098},
  venus:  {L0:181.979801,Lr:58517.8156760, e0:0.00677188,de:-0.000047766,w0:131.563707, dw:1.4022812, a:0.723330},
  mars:   {L0:355.433275,Lr:19140.2993313, e0:0.09341233,de:0.000090484, w0:336.060234, dw:1.8410331, a:1.523679},
  jupiter:{L0:34.351484, Lr:3034.9056746,  e0:0.04849485,de:0.000163244, w0:14.331309,  dw:1.6126170, a:5.202603},
  saturn: {L0:50.077471, Lr:1222.1137943,  e0:0.05550825,de:-0.000346641,w0:93.056787,  dw:1.9637613, a:9.554909},
};
// Full equation of center to order e^5 (Meeus Ch 27 generalised)
export function equationOfCenter(e,M){
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
export const SIGNS=[{name:"Aries",sym:"♈",el:"fire",mod:"cardinal"},{name:"Taurus",sym:"♉",el:"earth",mod:"fixed"},{name:"Gemini",sym:"♊",el:"air",mod:"mutable"},{name:"Cancer",sym:"♋",el:"water",mod:"cardinal"},{name:"Leo",sym:"♌",el:"fire",mod:"fixed"},{name:"Virgo",sym:"♍",el:"earth",mod:"mutable"},{name:"Libra",sym:"♎",el:"air",mod:"cardinal"},{name:"Scorpio",sym:"♏",el:"water",mod:"fixed"},{name:"Sagittarius",sym:"♐",el:"fire",mod:"mutable"},{name:"Capricorn",sym:"♑",el:"earth",mod:"cardinal"},{name:"Aquarius",sym:"♒",el:"air",mod:"fixed"},{name:"Pisces",sym:"♓",el:"water",mod:"mutable"}];
export function lonToZodiac(lon){const l=norm(lon),si=Math.floor(l/30),deg=l%30;return{...SIGNS[si],signIndex:si,degree:Math.floor(deg),minutes:Math.floor((deg%1)*60)};}

export const DOMICILE={sun:[4],moon:[3],mercury:[2,5],venus:[1,6],mars:[0,7],jupiter:[8,11],saturn:[9,10]};
export const EXALT={sun:{s:0},moon:{s:1},mercury:{s:5},venus:{s:11},mars:{s:9},jupiter:{s:3},saturn:{s:6}};
export function getDignity(planet,lon){
  const si=Math.floor(norm(lon)/30);
  if(DOMICILE[planet]?.includes(si))return"domicile";
  if(EXALT[planet]?.s===si)return"exaltation";
  if(DOMICILE[planet]?.map(s=>(s+6)%12).includes(si))return"detriment";
  if(EXALT[planet]&&(EXALT[planet].s+6)%12===si)return"fall";
  return"peregrine";
}
export function dignityScore(d,r){return Math.max(15,Math.min(99,{domicile:92,exaltation:97,peregrine:58,detriment:28,fall:20}[d]-(r?18:0)));}

export function getCombustion(planet,planetLon,sunL){
  if(planet==="sun")return null;
  let diff=Math.abs(norm(planetLon-sunL));if(diff>180)diff=360-diff;
  if(diff<0.2834)return{type:"cazimi",diff:diff.toFixed(2),penalty:-20}; // within 17' = maximum dignity
  if(diff<8)return{type:"combust",diff:diff.toFixed(1),penalty:40};
  if(diff<17)return{type:"sunbeams",diff:diff.toFixed(1),penalty:15};
  return null;
}

// ── Egyptian (Ptolemaic) Bounds ──────────────────────────────────────
// [sign0..11] each entry: array of {planet, from, to}
export const BOUNDS=[
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
export function getBound(lon){
  const l=norm(lon),si=Math.floor(l/30),deg=l%30;
  const bs=BOUNDS[si]||[];
  const b=bs.find(b=>deg>=b.f&&deg<b.t);
  return b?b.p:null;
}

// ── Antiscia ─────────────────────────────────────────────────────────
// Mirror around 0°Cancer/0°Capricorn (solstice axis): antiscion = norm(180 - L)
// Contra-antiscia (equinox axis): contra = norm(-L)
export function antiscionOf(lon){return norm(180-lon);}
export function contraAntiscionOf(lon){return norm(-lon);}
export function getAntisciaAspects(pos){
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
export function getPlanetPhase(planet,planetLon,sunLon){
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

export function nextIngress(planet,jd){
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

export const HOUR_ORDER=["saturn","jupiter","mars","sun","venus","mercury","moon"];
export const DAY_RULERS={0:"sun",1:"moon",2:"mars",3:"mercury",4:"jupiter",5:"venus",6:"saturn"};
export const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export function getPlanetaryHour(date){
  const dow=date.getDay(),dr=DAY_RULERS[dow],ri=HOUR_ORDER.indexOf(dr);
  const mn=new Date(date);mn.setHours(0,0,0,0);
  const hn=Math.floor((date-mn)/3600000)%24,pi=(ri+hn)%7;
  return{planet:HOUR_ORDER[pi],hourNum:hn,msRemaining:new Date(mn.getTime()+(hn+1)*3600000)-date,nextPlanet:HOUR_ORDER[(pi+1)%7],dayRuler:dr};
}
// Precess a J2000.0 star longitude to current epoch (~50.29"/year = 1.3969°/century)
export function precessStar(lon0,jd){return norm(lon0+1.396971*(jd-2451545)/36525);}
// True star position: Swiss Ephemeris catalog lookup when loaded, linear precession otherwise
export function starLonAt(star,jd){const sw=star?.name?swFixstar(star.name,jd):null;return sw?sw.lon:precessStar(star.lon,jd);}
// Mean lunar node (True Node uses additional ~±1.5° perturbation; mean is sufficient for electional)
export function meanNode(jd){const T=(jd-2451545)/36525;return norm(125.04452-1934.136261*T+0.0020708*T*T+T*T*T/450000);}

// ═══════════════════════════════════════════════════════════════════════
// LOCATION-BASED ASTRONOMY (Phase 1c)
// ═══════════════════════════════════════════════════════════════════════
// Sunrise/Sunset in UTC — USNO algorithm, ~5 min accuracy for 0°-60° lat
export function sunriseSetUTC(date,lat,lon){
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
export function gstDeg(jd){
  const jd0=Math.floor(jd-0.5)+0.5,t=(jd0-2451545)/36525;
  const th0=norm(100.4606184+36000.770004*t+0.000387933*t*t);
  return norm(th0+360.985647*(jd-jd0)*24/24);
}
// Local Sidereal Time in degrees
export function lstDeg(jd,lon){return norm(gstDeg(jd)+lon);}
// Obliquity of ecliptic (Meeus Ch.22)
export function obliquity(jd){const T=(jd-2451545)/36525;return 23.4392911-0.0130042*T-0.00000164*T*T+0.000000504*T*T*T;}
// True Ascendant (Meeus Ch.24)
export function calcASC(jd,lat,lon){
  const RAMC=lstDeg(jd,lon)*D2R,e=obliquity(jd)*D2R,phi=lat*D2R;
  return norm(Math.atan2(-Math.cos(RAMC),Math.sin(RAMC)*Math.cos(e)+Math.tan(phi)*Math.sin(e))*R2D);
}
// Midheaven (MC)
export function calcMC(jd,lon){
  const RAMC=lstDeg(jd,lon)*D2R,e=obliquity(jd)*D2R;
  return norm(Math.atan2(Math.sin(RAMC),Math.cos(RAMC)*Math.cos(e))*R2D);
}
// Part of Fortune: day chart = ASC + Moon - Sun; night chart = ASC + Sun - Moon
export function calcPOF(asc,moonL,sunL,isDayChart){return norm(isDayChart?asc+moonL-sunL:asc+sunL-moonL);}
// Part of Spirit: day chart = ASC + Sun - Moon; night chart = ASC + Moon - Sun
export function calcPOS(asc,moonL,sunL,isDayChart){return norm(isDayChart?asc+sunL-moonL:asc+moonL-sunL);}
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

export const YEAR_SEC = 31557600;
export const L_DUR = [YEAR_SEC/36,YEAR_SEC/1296,YEAR_SEC/46656,YEAR_SEC/1679616];
export function calcFractal(date,mode){
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

export function fmtTime(s){
  if(s>=86400){const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600);return`${d}d ${h}h`;}
  if(s>=3600){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return`${h}h ${m}m`;}
  if(s>=60){const m=Math.floor(s/60),sc=Math.floor(s%60);return`${m}m ${sc}s`;}
  return`${s.toFixed(1)}s`;
}
export function fmtWindowTime(d,level){
  if(level<=2)return d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  if(level===3)return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"});
  return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"});
}
export function calcWindowBounds(fractal,now){
  return fractal.levels.map(lev=>({
    start:new Date(now.getTime()-lev.secIn*1000),
    end:new Date(now.getTime()+(lev.dur-lev.secIn)*1000),
  }));
}
export function calcL2Forecast(fractal,now,mode){
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
export const OUTER_EPOCHS={
  uranus: {lon0:316.5,rate:360/30589},
  neptune:{lon0:304.3,rate:360/60190},
  pluto:  {lon0:250.1,rate:360/90582},
};
export const J2000_MS=946728000000;
export function outerPlanetLon(planet,date){
  const sw=swPlanetLon(planet,dateToJD(date));if(sw!=null)return sw;
  const days=(date.getTime()-J2000_MS)/86400000;
  const ep=OUTER_EPOCHS[planet];
  return norm(ep.lon0+ep.rate*days);
}
// Jupiter-Saturn conjunctions (historical + projected)
export const JS_CONJUNCTIONS=[
  {date:"2000-05-28",sign:"Taurus",   lon:22.8, label:"Earth Mutation ends"},
  {date:"2020-12-21",sign:"Aquarius", lon:0.5,  label:"Air Mutation begins"},
  {date:"2040-10-31",sign:"Libra",    lon:17.6, label:"Air continues"},
  {date:"2060-04-07",sign:"Gemini",   lon:10.2, label:"Air continues"},
];
// Pre-computed outer planet sign ingresses 2024-2035
export const DECADE_FORECAST=[
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
export function getAspectsAll(pos){
  const pks=Object.keys(pos),asps=[];
  const ADefs=[
    {n:"Conjunction",a:0,o:8,nat:"variable",col:GOLD,s:"☌"},
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

export function meanLilith(jd){const sw=swLilith(jd);if(sw!=null)return sw;return norm(83.353+40.6726*(jd-2451545)/36525*365.25);}
export function chironLon(jd){
  const sw=swChiron(jd);if(sw!=null)return sw;
  const T=(jd-2451545)/36525;
  const n=360/50.7;
  const M=norm(76.5+n*T*100);
  const e=0.382;
  const Erad=M*D2R+e*Math.sin(M*D2R)*(1+e*Math.cos(M*D2R));
  const v=2*Math.atan2(Math.sqrt(1+e)*Math.sin(Erad/2),Math.sqrt(1-e)*Math.cos(Erad/2))*R2D;
  return norm(v+339.0+209.7);
}
export function trueNode(jd){
  const sw=swTrueNode(jd);if(sw!=null)return sw;
  const Mprime=norm(134.96298+477198.867398*(jd-2451545)/36525);
  const F=norm(93.27191+483202.017538*(jd-2451545)/36525);
  const mn=meanNode(jd);
  const osc=1.274*Math.sin((Mprime-2*F)*D2R);
  return norm(mn+osc);
}
// ── 5c: Dorotheus triplicities ────────────────────────────────────────
export const TRIPLICITIES={
  fire: {day:"sun",night:"jupiter",part:"saturn"},
  earth:{day:"venus",night:"moon",part:"mars"},
  air:  {day:"saturn",night:"mercury",part:"jupiter"},
  water:{day:"venus",night:"mars",part:"moon"},
};
export const ELEMENT_BY_SIGN=["fire","earth","air","water","fire","earth","air","water","fire","earth","air","water"];
export function getTriplicity(lon,isDayChart){
  const t=TRIPLICITIES[ELEMENT_BY_SIGN[Math.floor(norm(lon)/30)]];
  return isDayChart?t.day:t.night;
}

export function calcHouses(jd,lat,lon,system="whole"){
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
export function getHouseNum(lon,cusps){
  for(let i=0;i<12;i++){
    const c1=cusps[i],c2=cusps[(i+1)%12];
    // Handle wrap-around
    if(c1<=c2){if(lon>=c1&&lon<c2)return i+1;}
    else{if(lon>=c1||lon<c2)return i+1;}
  }
  return 1;
}
export const HOUSE_NAMES=["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
export const HOUSE_MEANINGS=["Self, body, life orientation","Possessions, resources, values","Communication, siblings, local travel","Home, family, roots, private self","Creativity, romance, children, joy","Health, work, service, daily rhythm","Partners, open enemies, contracts","Shared resources, transformation, occult","Higher mind, philosophy, long journeys","Career, public role, authority","Community, hopes, friends, groups","Hidden matters, spirituality, retreat"];
