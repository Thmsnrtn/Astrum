// Extracted from App.jsx (P1 screen decomposition). Verbatim body; generated imports.
import { useState, useEffect, useRef, useMemo } from "react";
import { aiConfigured, aiUnconfiguredMessage, askClaude } from "../ai/client.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { FOUNDATIONS, LEARN_TOPICS } from "../data/learn.js";
import { FOUNDATION_PRIMERS, TOPIC_PRIMERS } from "../data/primers.js";
import { buildDeck, dueCards, gradeCard, loadSRS } from "../lib/srs.js";
import { F, L, T, GOLD } from "../ui/theme.js";

function DailyCard(){
  // Decan cards now ship in the deck itself with the Picatrix II.11 image
  // and signification (roots pass) — richer than the old d.magic gloss.
  const deck=useMemo(()=>buildDeck(),[]);
  const [states,setStates]=useState(loadSRS);
  const [card,setCard]=useState(null);
  const [flipped,setFlipped]=useState(false);
  useEffect(()=>{const due=dueCards(deck,states,new Date(),1);setCard(due[0]||null);setFlipped(false);},[deck,states]);
  const dueCount=deck.filter(c=>{const s=states[c.id];return !s||new Date(s.due)<=new Date();}).length;
  const grade=g=>{if(!card)return;gradeCard(card.id,g);setStates(loadSRS());};
  if(!card)return(
    <div style={{padding:"12px 14px",borderRadius:12,background:"rgba(8,5,22,0.5)",border:"1px solid rgba(var(--tint-rgb),0.1)",marginBottom:10,textAlign:"center"}}>
      <div style={{fontFamily:F,fontSize:10,color:"#7AB07A"}}>✓ The canon rests — no cards due today.</div>
    </div>);
  return(
    <div style={{padding:"13px 15px",borderRadius:13,background:"rgba(8,5,22,0.7)",border:"1px solid rgba(var(--tint-rgb),0.25)",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:7}}>
        <span style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.5)",letterSpacing:2,textTransform:"uppercase"}}>Daily Card · {card.topic}</span>
        <span style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.35)",marginLeft:"auto"}}>{dueCount} due</span>
      </div>
      <div onClick={()=>setFlipped(f=>!f)} style={{cursor:"pointer"}}>
        <div style={{fontFamily:F,fontSize:14,color:GOLD}}>{card.front}</div>
        {flipped
          ?<div style={{fontFamily:F,fontSize:10.5,color:"#9A8060",lineHeight:1.7,marginTop:6}}>{card.back}</div>
          :<div style={{fontFamily:F,fontSize:9,color:"#5A4020",fontStyle:"italic",marginTop:6}}>Tap to reveal, then judge your recall.</div>}
      </div>
      {flipped&&<div style={{display:"flex",gap:6,marginTop:9}}>
        {[["again","Again","#D28060"],["good","Good",GOLD],["easy","Easy","#7AB07A"]].map(([g,lbl,col])=>(
          <button key={g} onClick={()=>grade(g)} style={{flex:1,padding:"8px 0",borderRadius:9,background:col+"14",border:`1px solid ${col}45`,fontFamily:F,fontSize:9,color:col,letterSpacing:1.5,textTransform:"uppercase",cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>}
    </div>);
}

export default function LearnScreen({profile}){
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
        <div style={{padding:"12px 16px 10px",borderBottom:"1px solid rgba(var(--tint-rgb),0.07)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{setTopic(null);setMsgs([]);}} style={{background:"none",border:"none",color:"rgba(var(--tint-rgb),0.4)",fontFamily:F,fontSize:10,letterSpacing:1,cursor:"pointer",padding:0}}>←</button>
            <span style={{color:"rgba(var(--tint-rgb),0.15)"}}>|</span>
            <div style={{fontFamily:F,fontSize:12,color:GOLD}}>{topic.label}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {topic.fromFoundation&&(
              <button onClick={()=>markLessonComplete(topic.fromFoundation)} style={{padding:"5px 9px",borderRadius:8,background:"rgba(92,168,92,0.12)",border:"1px solid rgba(92,168,92,0.3)",fontFamily:F,fontSize:8,color:"#5CA87C",letterSpacing:1,cursor:"pointer"}}>✓ DONE</button>
            )}
            <button onClick={switchMode} disabled={loading||msgs.length<2} style={{padding:"6px 10px",borderRadius:8,background:testMode?"rgba(var(--tint-rgb),0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${testMode?"rgba(var(--tint-rgb),0.35)":"rgba(var(--tint-rgb),0.12)"}`,fontFamily:F,fontSize:8,color:testMode?GOLD:"rgba(var(--tint-rgb),0.4)",letterSpacing:1,cursor:"pointer"}}>
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
              <div style={{marginBottom:14,padding:"12px 14px",borderRadius:12,background:"rgba(8,5,22,0.75)",border:"1px solid rgba(var(--tint-rgb),0.2)"}}>
                <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.6)",letterSpacing:2.5,textTransform:"uppercase",marginBottom:7}}>⬡ Primer</div>
                <div style={{fontFamily:F,fontSize:11,color:"#C4A870",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{primer.body}</div>
                <div style={{marginTop:9,paddingTop:8,borderTop:"1px solid rgba(var(--tint-rgb),0.08)"}}>
                  {primer.sources.map((s,i)=><div key={i} style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.4)",lineHeight:1.6}}>· {s}</div>)}
                  <div style={{fontFamily:F,fontSize:8.5,color:"rgba(160,140,220,0.55)",fontStyle:"italic",marginTop:5,lineHeight:1.6}}>In this app: {primer.inApp}</div>
                </div>
              </div>
            );
          })()}
          {!aiConfigured()&&!TOPIC_PRIMERS[topic.id]&&<div style={{fontFamily:F,fontSize:10,color:"#5A4020",fontStyle:"italic",lineHeight:1.7,marginBottom:12}}>This topic has no static primer yet — the Socratic tutor needs an AI engine (Profile → AI Engine).</div>}
          {loading&&msgs.length<=1&&<div style={{display:"flex",gap:5,padding:"32px 0",justifyContent:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(var(--tint-rgb),0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          {msgs.filter(m=>m.role!=="user"||msgs.indexOf(m)>0).map((m,i)=>(
            <div key={i} style={{marginBottom:14}}>
              {m.role==="user"&&<div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.3)",marginBottom:4,letterSpacing:1}}>YOU</div>}
              <div style={{fontFamily:F,fontSize:11.5,color:m.role==="user"?"#9A8060":"#C4A870",lineHeight:1.95,whiteSpace:"pre-wrap"}}>{m.content}</div>
            </div>
          ))}
          {loading&&msgs.length>1&&<div style={{display:"flex",gap:5,padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:3,background:"rgba(var(--tint-rgb),0.4)",animation:"breathe 1.2s ease-in-out infinite",animationDelay:`${i*0.3}s`}}/>)}</div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"8px 12px 16px",borderTop:"1px solid rgba(var(--tint-rgb),0.06)",display:"flex",gap:8,flexShrink:0}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendFollow();}}} placeholder={testMode?"Answer the question…":"Ask a question or respond…"} rows={2} style={{flex:1,resize:"none",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(var(--tint-rgb),0.15)",borderRadius:10,color:"#C4A870",fontFamily:F,outline:"none",padding:"8px 10px",fontSize:11}}/>
          <button onClick={sendFollow} disabled={!input.trim()||loading} style={{padding:"0 12px",borderRadius:10,background:input.trim()?"rgba(var(--tint-rgb),0.12)":"rgba(0,0,0,0.3)",border:"1px solid "+(input.trim()?"rgba(var(--tint-rgb),0.28)":"rgba(var(--tint-rgb),0.08)"),fontFamily:F,fontSize:9,color:input.trim()?GOLD:"#4A3020",letterSpacing:1,cursor:input.trim()?"pointer":"default",height:36,alignSelf:"flex-end"}}>SEND</button>
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
      <div style={{padding:"0 14px"}}><DailyCard/></div>
      {/* Mode Toggle */}
      <div style={{padding:"0 14px 10px",display:"flex",gap:5}}>
        {[{id:"foundations",label:"Foundations Path"},{id:"topics",label:"Topics Library"}].map(m=>(
          <button key={m.id} onClick={()=>setLearnMode(m.id)} style={{flex:1,padding:"8px 0",borderRadius:10,background:learnMode===m.id?"rgba(var(--tint-rgb),0.13)":"rgba(8,5,22,0.5)",border:"1px solid "+(learnMode===m.id?"rgba(var(--tint-rgb),0.38)":"rgba(var(--tint-rgb),0.1)"),fontFamily:F,fontSize:9,color:learnMode===m.id?GOLD:"#6A5030",letterSpacing:1,cursor:"pointer"}}>{m.label}</button>
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
                        <span style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)",letterSpacing:2}}>MODULE {i+1}</span>
                        {pct>=1&&<span style={{fontFamily:F,fontSize:8,color:"#5CA87C",letterSpacing:1,background:"rgba(92,168,92,0.12)",border:"1px solid rgba(92,168,92,0.25)",borderRadius:4,padding:"1px 5px"}}>COMPLETE</span>}
                      </div>
                      <div style={{fontFamily:F,fontSize:13,color:started?mod.color:"rgba(var(--tint-rgb),0.5)"}}>{mod.title}</div>
                      <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.35)",marginTop:2,lineHeight:1.5}}>{mod.subtitle}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{height:2,background:"rgba(var(--tint-rgb),0.08)",borderRadius:1,marginBottom:8}}>
                    <div style={{height:"100%",width:`${pct*100}%`,background:mod.color,borderRadius:1,opacity:0.7,transition:"width 0.4s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)"}}>{prog.lessonsComplete||0} / {mod.lessons} lessons</div>
                    <div style={{display:"flex",gap:6}}>
                      {FOUNDATION_PRIMERS[mod.id]&&(
                        <button onClick={()=>setPrimerOpen(primerOpen===mod.id?null:mod.id)} style={{padding:"6px 11px",borderRadius:9,background:primerOpen===mod.id?`${mod.color}14`:"rgba(0,0,0,0.3)",border:`1px solid ${primerOpen===mod.id?mod.color+"40":"rgba(var(--tint-rgb),0.12)"}`,fontFamily:F,fontSize:9,color:primerOpen===mod.id?mod.color:"rgba(var(--tint-rgb),0.45)",cursor:"pointer"}}>
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
                        {FOUNDATION_PRIMERS[mod.id].sources.map((s,i)=><div key={i} style={{fontFamily:F,fontSize:8.5,color:"rgba(var(--tint-rgb),0.4)",lineHeight:1.6}}>· {s}</div>)}
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
              <div style={{padding:"8px 18px 4px",fontFamily:F,fontSize:8,color:"rgba(var(--tint-rgb),0.3)",letterSpacing:3,textTransform:"uppercase"}}>{l}</div>
              {filteredTopics.filter(t=>t.level===l).map(t=>(
                <button key={t.id} onClick={()=>startTopic(t,null)} style={{width:"100%",padding:"11px 18px",background:"none",border:"none",borderBottom:"1px solid rgba(var(--tint-rgb),0.05)",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                  <span style={{fontSize:20,color:"rgba(var(--tint-rgb),0.2)",flexShrink:0}}>⬡</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:F,fontSize:13,color:"rgba(var(--tint-rgb),0.8)"}}>{t.label}</div>
                    <div style={{fontFamily:F,fontSize:9,color:"rgba(var(--tint-rgb),0.3)",marginTop:2}}>{t.desc}</div>
                  </div>
                  <span style={{color:"rgba(var(--tint-rgb),0.2)",fontSize:14}}>›</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
