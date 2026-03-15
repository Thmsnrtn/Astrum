import { useState, useEffect, useCallback, useRef } from "react";

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
  if(diff<8)return{type:"combust",diff:diff.toFixed(1),penalty:40};
  if(diff<17)return{type:"sunbeams",diff:diff.toFixed(1),penalty:15};
  return null;
}

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

function useEphemeris(date){
  const jd=dateToJD(date);
  const pos={};
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    const lon=planetLon(pk,jd),dm=dailyMotion(pk,jd);
    const isRetro=dm<0&&pk!=="sun"&&pk!=="moon";
    const zodiac=lonToZodiac(lon);
    const dignity=getDignity(pk,lon);
    const combust=getCombustion(pk,lon,planetLon("sun",jd));
    const baseScore=dignityScore(dignity,isRetro);
    const combustPenalty=combust?combust.penalty:0;
    pos[pk]={lon,dm,isRetro,zodiac,dignity,score:Math.max(10,baseScore-combustPenalty),combust};
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
  return{pos,jd,moonPhase:phases[Math.floor(mpDeg/45)],moonPhaseDeg:mpDeg,voc,decanIdx,nearStars,aspects,northNode,southNode};
}

function calcNatal(bd){
  const jd=dateToJD(bd);const pos={};
  ["sun","moon","mercury","venus","mars","jupiter","saturn"].forEach(pk=>{
    const lon=planetLon(pk,jd),dm=dailyMotion(pk,jd);
    const isRetro=dm<0&&pk!=="sun"&&pk!=="moon";
    const zodiac=lonToZodiac(lon),dignity=getDignity(pk,lon);
    const decanIdx=Math.min(35,Math.floor(norm(lon)/10));
    pos[pk]={lon,zodiac,dignity,isRetro,decanIdx,decan:DECANS[decanIdx],score:dignityScore(dignity,isRetro)};
  });
  return pos;
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
  {id:"elect",   icon:"◈", label:"Elections",  desc:"Optimal windows"},
  {id:"work",    icon:"⚗", label:"Work",       desc:"Build a ritual"},
  {id:"journal", icon:"✎", label:"Journal",    desc:"Practice record"},
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
  const prog=1-hour.msRemaining/3600000;
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
                    {pos.combust&&<span style={{color:"#F5C518",marginLeft:3,fontSize:8}}>{pos.combust.type==="combust"?"☌☉":"~☉"}</span>}
                  </div>
                  <div style={{fontFamily:F,fontSize:7.5,color:dc,letterSpacing:0.5}}>{DIGNITY_LBL[pos.dignity].split(" ")[0]}</div>
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
        <div key={pk} className="card" style={{margin:"0 14px 9px",background:"rgba(30,15,5,0.7)",borderColor:"rgba(245,197,24,0.2)"}}>
          <div style={L("rgba(245,197,24,0.7)",8)}>⊙ {pos.combust?.type==="combust"?"COMBUST":"Under Sunbeams"} — {P[pk].name}</div>
          <div style={{fontFamily:F,fontSize:10,color:"rgba(245,197,24,0.6)",fontStyle:"italic",marginTop:4,lineHeight:1.7}}>
            {P[pk].name} is {pos.combust?.diff}° from the Sun — {pos.combust?.type==="combust"?"severely weakened, largely unusable for new talismanic work":"mildly weakened by proximity to the Sun's light"}. Score reduced by {pos.combust?.penalty} points.
          </div>
        </div>
      ))}
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
  const isNatal=natalPos&&Object.values(natalPos).some(np=>np.decanIdx===sel);
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
            const isNat=natalPos&&Object.values(natalPos).some(np=>np.decanIdx===dec.n-1);
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
            {Object.entries(natalPos).map(([pk,np])=>(
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
    const nearNatal=natalPos?Object.entries(natalPos).filter(([pk,np])=>{let d=Math.abs(norm(sLon-np.lon));if(d>180)d=360-d;return d<3;}).map(([pk])=>pk):[];
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
function WorkScreen({eph,initPlanet,natalPos}){
  const [planet,setPlanet]=useState(initPlanet);
  const [view,setView]=useState("op");
  const [step,setStep]=useState(0);
  useEffect(()=>{if(initPlanet){setPlanet(initPlanet);setView("op");setStep(0);}},[initPlanet]);
  const STEPS=[
    {t:"Purification",d:"Begin preparation the day before: fast lightly, avoid conflict, and spend time with the planet's materia — hold its stone, smell its incense, wear its color. Bathe before the working. Let the preparation itself be the first act of the invocation."},
    {t:"Prepare the Space",d:"Arrange the altar with everything the sphere calls for: its seal or image at center, incense ready but unlit, offerings arrayed, tools in their place. Face the classical direction. Nothing should need adjusting once the hour begins — readiness is devotion."},
    {t:"Open the Hour",d:"At the exact start of the planetary hour, light the incense. Speak a declaration of intent aloud — clearly and with full attention. Let the rising smoke carry your opening to the sphere above. The hour is a gate; greet it as one."},
    {t:"Inscribe the Talisman",d:"Draw, engrave, or write the planetary character, kamea seal, or image with full, unhurried attention. Speak each name or character aloud as you form it. The inscription is not a product — it is a sustained act of attention, and that attention is what consecrates."},
    {t:"The Oration",d:"Deliver the planetary invocation three full times. Speak to the sphere as if it hears you — because it does. Then state your specific request once, precisely and completely. Neither rush the invocation nor overburden the request with anxiety."},
    {t:"Consecration",d:"Pass the talisman through the incense smoke three times, turning it as it passes. State the consecration aloud: name the planet, the hour, the day, and the purpose. Let the work be sealed in this moment — completely and without reservation."},
    {t:"Incubation",d:"Wrap the talisman in cloth of the planet's color. Set it aside undisturbed — ideally for a full lunar cycle of 28 days, or at minimum until the Moon returns to the same sign. The great work continues after the ritual ends; the patience of the craftsman is part of the craft itself."}
  ];
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
        <button onClick={()=>{setStep(0);setView("ritual");}} style={{width:"100%",padding:"16px 0",borderRadius:14,background:`linear-gradient(135deg,${pl.col}22,${pl.col}10)`,border:`2px solid ${pl.col}45`,fontFamily:F,fontSize:12,color:pl.col,letterSpacing:4,textTransform:"uppercase",cursor:"pointer",marginBottom:9}}>
          ✦ Begin the Ritual
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
            {Object.entries(natalPos).map(([pk,np])=>{
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
            {Object.entries(natalPos).sort((a,b)=>b[1].score-a[1].score).slice(0,4).map(([pk,np])=>{
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
  const personalDecans=natalPos?Object.values(natalPos).map(np=>np.decanIdx):[];
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
function JournalScreen(){
  const [entries,setEntries]=useState([]);
  const [showNew,setShowNew]=useState(false);
  const [form,setForm]=useState({planet:"jupiter",intent:"",outcome:"",date:new Date().toISOString().split("T")[0]});
  useEffect(()=>{(async()=>{try{const r=await window.storage.get("astrum_journal");if(r?.value)setEntries(JSON.parse(r.value));}catch(e){}})();},[]);
  const save=async()=>{
    const e={id:Date.now(),...form};const ne=[e,...entries];setEntries(ne);setShowNew(false);
    setForm({planet:"jupiter",intent:"",outcome:"",date:new Date().toISOString().split("T")[0]});
    try{await window.storage.set("astrum_journal",JSON.stringify(ne));}catch(e){}
  };
  const del=async(id)=>{const ne=entries.filter(e=>e.id!==id);setEntries(ne);try{await window.storage.set("astrum_journal",JSON.stringify(ne));}catch(e){}};
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",paddingBottom:20}}>
      <div style={{padding:"16px 18px 10px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div style={L()}>Practice Journal</div><div style={T(20)}>Record & Learn</div></div>
        <button onClick={()=>setShowNew(!showNew)} style={{padding:"8px 14px",borderRadius:10,background:"rgba(212,175,106,0.1)",border:"1px solid rgba(212,175,106,0.28)",fontFamily:F,fontSize:9,color:"#D4AF6A",letterSpacing:2,cursor:"pointer"}}>{showNew?"CANCEL":"+ LOG"}</button>
      </div>
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
    const nd=natalPos?Object.entries(natalPos).map(([pk,np])=>`Natal ${P[pk].name}: ${np.decan.name} (${np.dignity})`).join(", "):"No natal chart entered";
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
    const traditions=profile?.traditions||["western-ceremonial"];
    const traditionPrompts=traditions.map(t=>TRADITIONS[t]?.prompt||"").filter(Boolean).join("\n\n");
    const practitionerName=profile?.name?`The practitioner's name is ${profile.name}.`:"";
    const levelNote=profile?.level==="beginner"?"Calibrate explanations for a beginner — define terms, explain why before how.":profile?.level==="advanced"?"Calibrate for an adept — assume full doctrinal fluency, skip basics, go deep.":"Calibrate for an intermediate practitioner — assume familiarity with the basics, focus on precision.";
    const systemPrompt=`You are a masterful advisor in the magical arts, adapting fluidly to the practitioner's tradition and needs. ${practitionerName} ${levelNote}

TRADITION CONTEXT:
${traditionPrompts}

CLASSICAL SOURCES (draw on as appropriate): the Picatrix (Ghayat al-Hakim), Agrippa's Three Books of Occult Philosophy, Ficino's De Vita Coelitus Comparanda, the Greek Magical Papyri, William Lilly's Christian Astrology, Iamblichus On the Mysteries, and the broader Hermetic corpus. You speak from the tradition itself — not as a commentator, but as a practitioner steeped in its living logic.

Your role is to help this practitioner plan, time, and execute magical workings with precision and depth. When they describe their goal, you:

1. IDENTIFY the most appropriate planetary force(s), with classical reasoning from essential dignities, natural rulerships, and doctrinal sources
2. EVALUATE the current sky conditions: dignities, direct/retrograde motion, combustion, phase, void of course, via combusta, besiegement
3. RECOMMEND the best available election window from the options provided, explaining what makes it suitable
4. IDENTIFY the active decan face for this working, its planetary ruler, and its classical significance for the intention
5. PRESCRIBE the sacred vowel of the ruling sphere and how to deploy it in invocation
6. PROVIDE a complete classical materia list: incense, oils, herbs, metals, stones, colors, day and hour
7. OUTLINE a ritual structure rooted in the grimoire tradition: purification, altar arrangement, inscription, invocation, consecration, incubation
8. SCHEDULE appropriate follow-up: maintenance timing, talisman care, review at the next favorable moment
9. WARN of any obstacles and what can be done to mitigate or wait them out
10. RELATE the working to the natal chart if one is provided — natal dignities, activated decans, angular planets

Speak with authority and precision. Give specific dates and times. Format responses clearly with labeled sections. Be practical: the tradition is not an abstraction — it is a set of working instructions.

${context}`;
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
// PROFILE / SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════════
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
    if(nd?.date){const bd=nd.time?new Date(`${nd.date}T${nd.time}:00`):new Date(`${nd.date}T12:00:00`);if(!isNaN(bd.getTime()))setNatalPos(calcNatal(bd));else setNatalPos(null);}else setNatalPos(null);
  },[natalData,profile]);
  const hour=getPlanetaryHour(now);
  const eph=useEphemeris(now);
  const fractal=calcFractal(now,fractalMode);
  const openWork=useCallback(pk=>{setWork(pk);setTab("work");},[]);
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
          {tab==="journal" &&<JournalScreen/>}
          {tab==="work"    &&<WorkScreen    eph={eph} initPlanet={workPlanet} natalPos={natalPos}/>}
          {tab==="ai"      &&<AIScreen      now={now} eph={eph} fractal={fractal} natalPos={natalPos} hour={hour} profile={profile}/>}
          {tab==="profile" &&<ProfileScreen profile={profile} setProfile={setProfile}/>}
        </div>
      </div>
    </div>
  );
}
