// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { OUTER_META, SIGN_ELEMS } from "../data/uiTables.jsx";
import { useState } from "react";
import { aiConfigured, aiUnconfiguredMessage, askClaude } from "../ai/client.js";
import { TRADITIONS } from "../data/traditions.js";
import { DECADE_FORECAST, JS_CONJUNCTIONS, OUTER_EPOCHS, outerPlanetLon } from "../engine/astro.js";
import { SIGN_NAMES } from "../engine/zr.js";
import { F, GOLD, T } from "../ui/theme.js";

export default function CyclesScreen({now,profile,eph}){
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
  const GOLD=GOLD;const G=`rgba(var(--tint-rgb),`;
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
        <div style={{borderRadius:14,background:"rgba(8,5,22,0.85)",border:"1px solid rgba(var(--tint-rgb),0.15)",padding:"14px 15px"}}>
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
            <div style={{height:"100%",width:`${jsElapsed*100}%`,background:`linear-gradient(90deg,${GOLD},#78A8C8)`,borderRadius:2}}/>
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
            const pCol=e.planet==="uranus"?"#78C8D8":e.planet==="neptune"?"#7888E8":e.planet==="pluto"?"#C878A8":e.planet==="saturn"?"#78A888":GOLD;
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",borderRadius:10,background:"rgba(8,5,22,0.5)",border:"1px solid rgba(var(--tint-rgb),0.07)",marginBottom:4}}>
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
        <button onClick={generateReport} disabled={aiLoading} style={{width:"100%",padding:"13px",borderRadius:13,background:"rgba(var(--tint-rgb),0.07)",border:"1px solid rgba(var(--tint-rgb),0.22)",fontFamily:F,fontSize:11,color:aiLoading?G+"0.4)":GOLD,letterSpacing:2,cursor:aiLoading?"default":"pointer",transition:"all 0.2s"}}>
          {aiLoading?"READING THE CYCLES…":"✦ WHAT DO THESE CYCLES MEAN FOR ME?"}
        </button>
        {aiReport&&(
          <div style={{marginTop:8,borderRadius:13,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(var(--tint-rgb),0.1)",padding:"14px 15px"}}>
            <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{aiReport}</div>
          </div>
        )}
      </div>
    </div>
  );
}
