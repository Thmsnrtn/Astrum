// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useEffect, useRef } from "react";
import { aiConfigured, askClaude } from "../ai/client.js";
import { P } from "../data/planets.js";
import { getSeal } from "../data/seals.js";
import { conditionsFromProfile } from "../engine/chart.js";
import { addOutcome, closeCasting, createCasting, loadCastings } from "../lib/castings.js";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { F, GOLD, L } from "../ui/theme.js";

export default function SigilScreen({eph,profile,natalPos}){
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
