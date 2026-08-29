// ═══════════════════════════════════════════════════════════════════════
// PROMPT — the Oracle's system prompt + knowledge base access
// ═══════════════════════════════════════════════════════════════════════
import { loadJSON, saveJSON } from "../lib/storage.js";
import { TRADITIONS, RUNE_PRINCIPLES } from "../data/traditions.js";

export function loadKnowledge(){return loadJSON("astrum_knowledge",[]);}
export function saveKnowledge(nodes){saveJSON("astrum_knowledge",nodes);}
export function buildSystemPrompt(profile,extraContext){
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
  return `${tradPrompt}\n\nTradition context: ${tradNames}. ${name}\n${levelNote}${RUNE_PRINCIPLES}${knowledgeSection}${extraContext?`\n\n${extraContext}`:""}`;
}
