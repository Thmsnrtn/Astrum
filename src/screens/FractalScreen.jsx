// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useMemo, Fragment } from "react";
import { DECANS } from "../data/decans.js";
import { P } from "../data/planets.js";
import { calcFractal, calcL2Forecast, calcWindowBounds, fmtTime, fmtWindowTime } from "../engine/astro.js";
import { useClock } from "../ui/clock.jsx";
import { B, F, L, T } from "../ui/theme.js";

export default function FractalScreen({fractal:fractalProp,natalPos,mode,setMode,now:nowProp}){
  // Fractal windows at L3/L4 turn in under a minute — this screen runs on
  // the 1 Hz wall clock locally (pure math, no WASM) instead of the 30 s
  // astro cadence the rest of the app breathes at.
  const now=useClock();
  const fractal=useMemo(()=>calcFractal(now,mode),[Math.floor(now.getTime()/1000),mode]);
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
