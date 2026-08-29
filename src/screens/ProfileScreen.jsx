// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { KAMEA, KameaPreview } from "../data/uiTables.jsx";
import { useState, useRef, useEffect } from "react";
import { aiConfigured, askAI, resolveAIConfig } from "../ai/client.js";
import { loadKnowledge, saveKnowledge } from "../ai/prompt.js";
import { WEBLLM_MODELS, getEngine } from "../ai/webllm.js";
import { P } from "../data/planets.js";
import { TRADITIONS } from "../data/traditions.js";
import { engineInfo } from "../engine/sweph.js";
import { backupFilename, copyToClipboard, downloadText, exportAll, importAll, lastExportedAt, markExported, shareOnNative } from "../lib/backup.js";
import { FEED_KIND_META, addFeedEvents, aiExtractionMessages, deleteFeedSource, loadFeed, mergeEvents, parseAIResponse, parseFeed } from "../lib/intake.js";
import { ensurePermission } from "../lib/notify.js";
import { search } from "../lib/retrieval.js";
import { DEFAULT_NOTIFY_PREFS, saveNotifyPrefs } from "../lib/scheduler.js";
import { review } from "../lib/srs.js";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { F, GOLD, L, T, TINT_PRESETS } from "../ui/theme.js";

function AIEngineCard(){
  const [cfg,setCfg]=useState(()=>{const c=resolveAIConfig();const stored=loadJSON("astrum_ai",{})||{};return {provider:c.provider,localUrl:c.localUrl,localModel:c.localModel,localKey:c.localKey,webllmModel:c.webllmModel,embedModel:stored.embedModel||""};});
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [prog,setProg]=useState("");
  const save=(patch)=>{const next={...cfg,...patch};setCfg(next);saveJSON("astrum_ai",next);};
  const IS={width:"100%",marginTop:6,background:"rgba(0,0,0,0.4)",border:"1px solid rgba(200,175,100,0.18)",borderRadius:8,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:11,boxSizing:"border-box"};
  const test=async()=>{
    setBusy(true);setMsg("");setProg("");
    try{
      const {askAI}=await import("../ai/client.js");
      const out=await askAI({system:"You are a terse test.",messages:[{role:"user",content:"Reply with exactly: ready"}],maxTokens:16,onProgress:p=>setProg(p?.text||"")});
      setMsg("✓ Engine replied: "+(out||"").trim().slice(0,60));
    }catch(e){setMsg("✗ "+(e.message||"failed"));}
    setBusy(false);setProg("");
  };
  const warmWebLLM=async()=>{
    setBusy(true);setMsg("Downloading & compiling the model — this is a one-time step, then it runs offline…");setProg("");
    try{
      const {getEngine}=await import("../ai/webllm.js");
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
          <input value={cfg.embedModel} onChange={e=>save({embedModel:e.target.value})} placeholder="embedding model (optional — e.g. nomic-embed-text; upgrades Recall/Oracle to semantic search)" style={IS}/>
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
      const {askAI}=await import("../ai/client.js");
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


// ── Storage health: quota, persistence, the photo vault, orphan sweep ──
function StorageHealthCard(){
  const [est,setEst]=useState(null);
  const [persisted,setPersisted]=useState(null);
  const [photoCount,setPhotoCount]=useState(null);
  const [orphans,setOrphans]=useState(null);
  const [swept,setSwept]=useState(false);
  useEffect(()=>{(async()=>{
    try{if(navigator.storage?.estimate)setEst(await navigator.storage.estimate());}catch{}
    try{if(navigator.storage?.persisted)setPersisted(await navigator.storage.persisted());}catch{}
    try{
      const {listPhotoIds}=await import("../lib/photos.js");
      const ids=await listPhotoIds();setPhotoCount(ids.length);
      const referenced=new Set();
      const {loadCastings}=await import("../lib/castings.js");
      loadCastings().forEach(c=>(c.photoIds||[]).forEach(id=>referenced.add(id)));
      const {loadAthanor}=await import("../lib/athanor.js");
      loadAthanor().forEach(op=>(op.photoIds||[]).forEach(id=>referenced.add(id)));
      setOrphans(ids.filter(id=>!referenced.has(id)));
    }catch{}
  })();},[swept]);
  const sweep=async()=>{
    try{
      const {deletePhoto}=await import("../lib/photos.js");
      for(const id of orphans||[])await deletePhoto(id);
      setSwept(true);
    }catch{}
  };
  const fmt=b=>b==null?"—":b>1048576?`${(b/1048576).toFixed(1)} MB`:`${Math.round(b/1024)} KB`;
  const pct=est?.quota?Math.round((est.usage/est.quota)*100):null;
  return(
    <div className="card" style={{marginBottom:10}}>
      <div style={L()}>Storage Health</div>
      <div style={{marginTop:8,fontFamily:F,fontSize:10.5,color:"#C4A870",lineHeight:1.9}}>
        {est&&<div>The record holds {fmt(est.usage)} of {fmt(est.quota)} granted{pct!=null?` (${pct}%)`:""}.</div>}
        {pct!=null&&<div style={{height:3,background:"rgba(200,175,100,0.09)",borderRadius:2,margin:"4px 0 6px"}}><div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:pct>80?"#D28060":"#7AB07A",borderRadius:2}}/></div>}
        <div>Persistent storage: {persisted==null?"unknown":persisted?<span style={{color:"#7AB07A"}}>granted — the browser will not evict the record</span>:<span style={{color:"#D2A060"}}>not granted — keep backups current</span>}</div>
        <div>Photo vault: {photoCount==null?"—":`${photoCount} photo${photoCount===1?"":"s"}`}{orphans?.length>0&&<> · <span style={{color:"#D2A060"}}>{orphans.length} orphaned</span></>}</div>
      </div>
      {orphans?.length>0&&<button onClick={sweep} style={{width:"100%",marginTop:8,padding:"9px 0",borderRadius:9,background:"rgba(180,120,60,0.1)",border:"1px solid rgba(180,120,60,0.3)",fontFamily:F,fontSize:9,color:"#D2A060",letterSpacing:2,textTransform:"uppercase",cursor:"pointer"}}>Sweep {orphans.length} orphaned photo{orphans.length===1?"":"s"}</button>}
      {swept&&<div style={{fontFamily:F,fontSize:9,color:"#7AB07A",marginTop:6,textAlign:"center"}}>✓ The vault is clean.</div>}
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

export default function ProfileScreen({profile,setProfile,notifyPrefs,setNotifyPrefs}){
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
      <StorageHealthCard/>
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
