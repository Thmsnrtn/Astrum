// ═══════════════════════════════════════════════════════════════════════
// CHART — full-moment and natal chart computation (extracted from App.jsx)
// ═══════════════════════════════════════════════════════════════════════
import { norm, dateToJD, planetLon, dailyMotion, lonToZodiac, getDignity, dignityScore, getCombustion, getBound, getAntisciaAspects, getPlanetPhase, checkVoC, getPlanetaryHour, starLonAt, meanNode, sunriseSetUTC, calcASC, calcMC, calcPOF, getPlanetaryHourUnequal, getAspectsAll, meanLilith, chironLon, trueNode, getTriplicity } from "./astro.js";
import { P } from "../data/planets.js";
import { essentialScore, essentialDignity } from "./reception.js";
import { DECANS } from "../data/decans.js";
import { FIXED_STARS } from "../data/fixedStars.js";
import { computeLots } from "./lots.js";
import { captureConditions } from "./snapshot.js";

export function computeEphemeris(date,location){
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
    // Sect known → upgrade every planet to the weighted Ptolemaic essential
    // score (bound/triplicity/face count; detriment/fall subtract), keeping
    // the combustion penalty the initial pass applied.
    Object.entries(pos).forEach(([pk,p])=>{if(p?.lon!=null&&p.dignity!=null){
      const combustPenalty=p.combust?(p.combust.type==="cazimi"?-8:p.combust.type==="combust"?22:12):0;
      p.essential=essentialDignity(pk,p.lon,isDayChart);
      p.score=Math.max(10,essentialScore(pk,p.lon,isDayChart,p.isRetro)-combustPenalty);
    }});
    pof=lots.fortune;pos2=lots.spirit;lotEros=lots.eros;lotNecessity=lots.necessity;lotCourage=lots.courage;
  }
  return{pos,jd,moonPhase:phases[Math.floor(mpDeg/45)],moonPhaseDeg:mpDeg,voc,decanIdx,nearStars,aspects,antiscia,northNode,southNode,asc,mc,pof,pos2,isDayChart,lots,lotEros,lotNecessity,lotCourage};
}

export function calcNatal(bd,location){
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
  Object.entries(pos).forEach(([pk,p])=>{if(P[pk]&&p?.lon!=null){
    p.triplicity=getTriplicity(p.lon,isDayChart??true);
    // Weighted Ptolemaic essential dignity replaces the old 5-value lookup:
    // bound/triplicity/face now count, detriment/fall subtract.
    const ed=essentialDignity(pk,p.lon,isDayChart??true);
    p.essential=ed; p.score=essentialScore(pk,p.lon,isDayChart??true,p.isRetro);
  }});
  return{...pos,asc,mc,pof,isDayChart,northNode,southNode};
}

// Full conditions snapshot for a casting record at an arbitrary moment.
// computeEphemeris is pure (renamed from the misleading useEphemeris), so it is
// safe to call from event handlers and migrations.
export function conditionsFromProfile(date,profile,natalPos,election=null,approximate=false){
  const location=profile?.natal?.lat&&profile?.natal?.lon?{lat:profile.natal.lat,lon:profile.natal.lon}:null;
  const eph=computeEphemeris(date,location);
  const hour=location?getPlanetaryHourUnequal(date,location.lat,location.lon):getPlanetaryHour(date);
  return captureConditions({now:date,eph,hour,location,natalPos,election,approximate});
}

// ═══════════════════════════════════════════════════════════════════════
// PHASE 5b-5f: PREDICTIVE ENGINE, ADDITIONAL BODIES, CHART TYPES,
// EPHEMERIS TOOLS, ADVANCED TECHNIQUES
// ═══════════════════════════════════════════════════════════════════════

// ── 5c: Additional Bodies ─────────────────────────────────────────────
