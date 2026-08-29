import { memo as React_memo } from "react";
// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useEffect, useMemo } from "react";
import { aiConfigured, askClaude } from "../ai/client.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { DECANS } from "../data/decans.js";
import { P } from "../data/planets.js";
import { D2R, DAY_NAMES, fmtTime, lonToZodiac } from "../engine/astro.js";
import { loadCastings } from "../lib/castings.js";
import { composeBriefing } from "../lib/scheduler.js";
import { loadSpirits, upcomingObservances } from "../lib/spirits.js";
import { loadJSON } from "../lib/storage.js";
import { DIGNITY_COL, DIGNITY_LBL, F, L, T, VOWELS, GOLD } from "../ui/theme.js";

const Orrery=React_memo(OrreryInner); // hoisted fn, memo const above is fine
function OrreryInner({eph,hour,natalPos,onPlanetClick}){
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
      {Array.from({length:36}).map((_,i)=>{const a=(i*10-90)*D2R;return <line key={i} x1={cx+148*Math.cos(a)} y1={cy+148*Math.sin(a)} x2={cx+156*Math.cos(a)} y2={cy+156*Math.sin(a)} stroke="rgba(var(--tint-rgb),0.08)" strokeWidth={i%3===0?1.2:0.5}/>;}) }
      {["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"].map((s,i)=>{const a=(i*30+15-90)*D2R;return <text key={s} x={cx+160*Math.cos(a)} y={cy+160*Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fill="rgba(var(--tint-rgb),0.2)" fontSize={6} fontFamily="serif">{s}</text>;})}
      {orbits.map(o=><circle key={o.key+"t"} cx={cx} cy={cy} r={o.r} fill="none" stroke="rgba(var(--tint-rgb),0.04)" strokeWidth={0.5}/>)}
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
        {Array.from({length:60}).map((_,i)=>{const a=(i*6-90)*D2R,im=i%5===0?r-10:r-6,ou=r+1;return <line key={i} x1={cx+im*Math.cos(a)} y1={cy+im*Math.sin(a)} x2={cx+ou*Math.cos(a)} y2={cy+ou*Math.sin(a)} stroke="rgba(var(--tint-rgb),0.1)" strokeWidth={i%5===0?1.2:0.4}/>;}) }
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(var(--tint-rgb),0.06)" strokeWidth={10}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#hg)" strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-prog)} transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"stroke-dashoffset 0.5s"}}/>
        <line x1={cx} y1={cy} x2={cx+(r-14)*Math.cos(secAngle*D2R)} y2={cy+(r-14)*Math.sin(secAngle*D2R)} stroke="rgba(var(--tint-rgb),0.4)" strokeWidth={0.8} strokeLinecap="round"/>
        <circle cx={dx} cy={dy} r={5} fill={p.col}/>
        <circle cx={dx} cy={dy} r={8} fill="none" stroke={p.col} strokeWidth={0.8} opacity={0.5}/>
        <circle cx={cx} cy={cy} r={25} fill="rgba(4,4,16,0.9)" stroke="rgba(var(--tint-rgb),0.08)" strokeWidth={1}/>
        <text x={cx} y={cy-6} textAnchor="middle" fill={p.col} fontSize={16} fontFamily="serif">{p.sym}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill="rgba(var(--tint-rgb),0.7)" fontSize={9} fontFamily={F} letterSpacing={1}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</text>
        <text x={cx} y={cy+18} textAnchor="middle" fill="rgba(var(--tint-rgb),0.3)" fontSize={6} fontFamily={F} letterSpacing={2}>HR {hour.hourNum+1}</text>
      </svg>
      <div>
        <div style={L(`${p.col}70`,8)}>Planetary Hour</div>
        <div style={T(18,p.col)}>{p.name}</div>
        <div style={{fontFamily:F,fontSize:10,color:"rgba(var(--tint-rgb),0.5)",marginTop:2}}>Day of {dr.sym} {dr.name}</div>
        <div style={{fontFamily:"serif",fontSize:14,color:"rgba(var(--tint-rgb),0.6)",marginTop:6,letterSpacing:6}}>
          {hour.dayRuler===hour.planet?VOWELS[hour.planet]?.p:`${VOWELS[hour.dayRuler]?.p}→${VOWELS[hour.planet]?.p}`}
        </div>
        <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.35)",marginTop:2,fontStyle:"italic"}}>
          {hour.dayRuler===hour.planet?"Pure planetary · Day and hour aligned":`${P[hour.dayRuler].name} of ${P[hour.planet].name}`}
        </div>
        {hour.isDayHour!=null&&<div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.25)",marginTop:4,letterSpacing:1}}>{hour.isDayHour?"DAY HOUR":"NIGHT HOUR"} · TRUE UNEQUAL</div>}
        {hour.isDayHour!=null&&hour.rise&&<div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.2)",letterSpacing:0.5,marginTop:1}}>
          ☀ {hour.rise.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",timeZone:"UTC"})} — {hour.set?.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",timeZone:"UTC"})} UTC
        </div>}
      </div>
    </div>
  );
}

function BriefingCard({now,eph,hour,profile}){
  const [open,setOpen]=useState(false);
  const [gloss,setGloss]=useState(null);
  const [glossing,setGlossing]=useState(false);
  const text=useMemo(()=>{
    try{const ds=new Date(now);ds.setHours(0,0,0,0);return composeBriefing({now,eph,hour,castings:loadCastings(),athanor:loadJSON("astrum_athanor",[]),observances:upcomingObservances(loadSpirits(),ds,1)});}catch{return "";}
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
    <div style={{margin:"0 14px 10px",borderRadius:13,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(var(--tint-rgb),0.12)"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"none",border:"none",cursor:"pointer"}}>
        <span style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.55)",letterSpacing:3,textTransform:"uppercase"}}>☉ Today's Briefing</span>
        <span style={{color:"rgba(var(--tint-rgb),0.35)",fontSize:11}}>{open?"▾":"▸"}</span>
      </button>
      {open&&<div style={{padding:"0 14px 12px"}}>
        <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{text}</div>
        {gloss?<div style={{marginTop:8,padding:"9px 11px",borderRadius:10,background:"rgba(20,15,40,0.7)",border:"1px solid rgba(100,80,160,0.25)",fontFamily:F,fontSize:10.5,color:"#B0A0D0",fontStyle:"italic",lineHeight:1.8}}>{gloss}</div>
        :aiConfigured()&&<button onClick={getGloss} disabled={glossing} style={{marginTop:8,padding:"6px 12px",borderRadius:9,background:"rgba(100,80,160,0.12)",border:"1px solid rgba(100,80,160,0.3)",fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.8)",letterSpacing:1.5,cursor:"pointer"}}>{glossing?"READING…":"✧ ORACLE'S GLOSS"}</button>}
      </div>}
    </div>
  );
}

export default function SkyScreen({now,hour,eph,fractal,natalPos,onWork,profile}){
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
                    {pos.phase&&<span style={{color:"rgba(var(--tint-rgb),0.45)",marginLeft:3,fontSize:7}}>{pos.phase==="morning-star"?"☽↑":"☽↓"}</span>}
                  </div>
                  <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.35)",letterSpacing:0.5}}>
                    <span style={{color:dc}}>{DIGNITY_LBL[pos.dignity].split(" ")[0]}</span>
                    {pos.bound&&<span style={{marginLeft:4,color:"rgba(var(--tint-rgb),0.3)"}}>· {P[pos.bound]?.sym} Bnd</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{gridColumn:"1/-1",borderTop:"1px solid rgba(var(--tint-rgb),0.06)",marginTop:4,paddingTop:6,display:"flex",gap:8}}>
            {[{sym:"☊",label:"N. Node",lon:eph.northNode,col:"#90C890"},{sym:"☋",label:"S. Node",lon:eph.southNode,col:"#C08080"}].map(nd=>{
              const z=lonToZodiac(nd.lon);
              return <div key={nd.sym} style={{flex:1,padding:"5px 8px",borderRadius:10,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:13,color:nd.col}}>{nd.sym}</span>
                <div><div style={{fontFamily:F,fontSize:10,color:"#C4A870"}}>{z.degree}°{String(z.minutes).padStart(2,"0")}' {z.sym}</div>
                <div style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.45)",letterSpacing:0.5}}>{nd.label}</div></div>
              </div>;
            })}
          </div>
          {eph.asc==null&&(
            <div style={{margin:"0 0 8px",padding:"9px 12px",borderRadius:10,background:"rgba(var(--tint-rgb),0.05)",border:"1px dashed rgba(var(--tint-rgb),0.25)",fontFamily:F,fontSize:9.5,color:"rgba(var(--tint-rgb),0.55)",fontStyle:"italic",lineHeight:1.6}}>
              Add your birth place in Profile to raise the Ascendant — it unlocks the angles, the seven Lots, sect, and true planetary hours.
            </div>
          )}
          {(eph.asc!=null||eph.mc!=null)&&(
            <div style={{gridColumn:"1/-1",borderTop:"1px solid rgba(var(--tint-rgb),0.06)",marginTop:4,paddingTop:6,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
              {[
                eph.asc!=null&&{sym:"AC",label:"Ascendant",lon:eph.asc,col:GOLD},
                eph.mc!=null&&{sym:"MC",label:"Midheaven",lon:eph.mc,col:GOLD},
                eph.pof!=null&&{sym:"⊕",label:"Pt Fortune",lon:eph.pof,col:"#90C890"},
              ].filter(Boolean).map(nd=>{
                const z=lonToZodiac(nd.lon);
                return<div key={nd.sym} style={{padding:"5px 8px",borderRadius:10,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:nd.col}}>{nd.sym}</span>
                  <div><div style={{fontFamily:F,fontSize:9,color:"#C4A870"}}>{z.degree}° {z.sym}</div>
                  <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.4)",letterSpacing:0.5}}>{nd.label}</div></div>
                </div>;
              })}
            </div>
          )}
          {eph.isDayChart!=null&&(
            <div style={{gridColumn:"1/-1",borderTop:"1px solid rgba(var(--tint-rgb),0.04)",marginTop:4,paddingTop:4,fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)",letterSpacing:1}}>
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
              <span style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.25)"}}>{a.orb}°</span>
            </div>
          ))}
          <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.25)",marginTop:8,lineHeight:1.5}}>Antiscia are shadow conjunctions — planets mirrored across the solstice axis (0°Cancer/0°Capricorn) connect as if in conjunction.</div>
        </div>
      )}
      {(eph.lotEros!=null||eph.lotNecessity!=null||eph.lotCourage!=null)&&(
        <div className="card" style={{margin:"0 14px 9px"}}>
          <div style={L("rgba(var(--tint-rgb),0.45)",8)}>Arabic Lots</div>
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
                <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.35)"}}>{lot.label}</div>
              </div>;
            })}
          </div>
        </div>
      )}
      {eph.nearStars.length>0&&(
        <div className="card" style={{margin:"0 14px 9px",borderColor:"rgba(200,200,255,0.14)"}}>
          <div style={L("#7080B0",8)}>Fixed Star in Orb</div>
          {eph.nearStars.map(s=>(
            <div key={s.name} style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(var(--tint-rgb),0.06)"}}>
              <div style={{fontFamily:F,fontSize:13,color:s.col}}>{s.name} · {s.nature}</div>
              <div style={{fontFamily:F,fontSize:9,color:"#6070A0",fontStyle:"italic",marginTop:3,lineHeight:1.6}}>{s.magic}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
