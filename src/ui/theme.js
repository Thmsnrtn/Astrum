// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
export const CSS=`
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#04060F;}

/* ── Liquid Glass Token System ── */
:root{
  --tint-primary:#D4AF6A;
  --tint-rgb:200,175,100;
  --glass-bg:8,5,22;
  --bg-grad1:rgba(60,40,120,0.25);
  --bg-grad2:rgba(160,120,30,0.15);
  --shadow-col:0,0,0;
}

/* ── Glass Material Tiers ── */
.glass-ultra{
  background:rgba(var(--glass-bg),0.70);
  backdrop-filter:blur(40px) saturate(200%) brightness(1.08);
  -webkit-backdrop-filter:blur(40px) saturate(200%) brightness(1.08);
  border:1px solid rgba(var(--tint-rgb),0.14);
  box-shadow:0 16px 60px rgba(var(--shadow-col),0.7),inset 0 1.5px 0 rgba(255,255,255,0.13),inset 0 -1px 0 rgba(0,0,0,0.35),inset 1px 0 0 rgba(255,255,255,0.04);
  border-radius:22px;
}
.glass-heavy,.glass{
  background:rgba(var(--glass-bg),0.68);
  backdrop-filter:blur(28px) saturate(180%) brightness(1.05);
  -webkit-backdrop-filter:blur(28px) saturate(180%) brightness(1.05);
  border:1px solid rgba(var(--tint-rgb),0.12);
  box-shadow:0 10px 40px rgba(var(--shadow-col),0.6),inset 0 1px 0 rgba(255,255,255,0.10),inset 0 -1px 0 rgba(0,0,0,0.28);
  border-radius:18px;
}
.glass-medium,.card{
  background:rgba(var(--glass-bg),0.58);
  backdrop-filter:blur(20px) saturate(160%) brightness(1.03);
  -webkit-backdrop-filter:blur(20px) saturate(160%) brightness(1.03);
  border:1px solid rgba(var(--tint-rgb),0.10);
  box-shadow:0 6px 24px rgba(var(--shadow-col),0.5),inset 0 1px 0 rgba(255,255,255,0.07);
  border-radius:14px;
  padding:13px 14px;
  margin-bottom:9px;
  transition:border-color 0.22s,box-shadow 0.22s;
}
.card:hover{
  border-color:rgba(var(--tint-rgb),0.19);
  box-shadow:0 8px 30px rgba(var(--shadow-col),0.55),inset 0 1px 0 rgba(255,255,255,0.09),0 0 0 0.5px rgba(var(--tint-rgb),0.07);
}
.glass-light,.chip{
  background:rgba(var(--glass-bg),0.44);
  backdrop-filter:blur(12px) saturate(140%);
  -webkit-backdrop-filter:blur(12px) saturate(140%);
  border:1px solid rgba(var(--tint-rgb),0.16);
  border-radius:6px;
  padding:2px 8px;
  font-family:inherit;
  font-size:8px;
  letter-spacing:1.5px;
  text-transform:uppercase;
}

/* ── Planet Squircle Orbs ── */
.planet-orb{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:30%;
  background:rgba(var(--glass-bg),0.55);
  backdrop-filter:blur(8px);
  border:1px solid rgba(var(--tint-rgb),0.22);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);
  transition:transform 0.2s,opacity 0.2s,box-shadow 0.2s;
}
.planet-orb:hover{transform:scale(1.12);opacity:1!important;box-shadow:0 0 10px rgba(var(--tint-rgb),0.25),inset 0 1px 0 rgba(255,255,255,0.1);}

/* ── Rows & Buttons ── */
.row-btn{width:100%;background:none;border:none;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(var(--tint-rgb),0.06);transition:opacity 0.15s;}
.row-btn:last-child{border-bottom:none;}
.row-btn:hover{opacity:0.82;}

/* ── Form Elements ── */
input,textarea{
  background:rgba(0,0,0,0.40);
  border:1px solid rgba(var(--tint-rgb),0.18);
  border-radius:10px;
  color:#C4A870;
  font-family:inherit;
  outline:none;
  padding:9px 12px;
  transition:border-color 0.2s,box-shadow 0.2s;
}
input:focus,textarea:focus{border-color:rgba(var(--tint-rgb),0.45);box-shadow:0 0 0 3px rgba(var(--tint-rgb),0.08);}

/* ── Keyframes ── */
@keyframes breathe{0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.015)}}
@keyframes float-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spring-in{0%{opacity:0;transform:scale(0.88) translateY(14px)}60%{opacity:1;transform:scale(1.02) translateY(-3px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes slide-screen{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
@keyframes arc-draw{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
@keyframes voc-pulse{0%,100%{background:rgba(180,100,50,0.12)}50%{background:rgba(180,100,50,0.22)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes cmd-in{from{opacity:0}to{opacity:1}}
@keyframes panel-spring{0%{opacity:0;transform:scale(0.9) translateY(16px)}65%{transform:scale(1.015) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes control-expand{0%{opacity:0;transform:scale(0.75) translateY(8px)}65%{transform:scale(1.04) translateY(-2px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes live-dot{0%,100%{opacity:0.4}50%{opacity:1}}
@keyframes particle{0%{transform:translateY(0) translateX(0) scale(1);opacity:0.5}100%{transform:translateY(-120px) translateX(20px) scale(0.3);opacity:0}}
@keyframes l4-pulse{0%,100%{box-shadow:0 0 0 0 rgba(var(--tint-rgb),0),inset 0 1px 0 rgba(255,255,255,0.06)}50%{box-shadow:0 0 22px 2px rgba(var(--tint-rgb),0.28),inset 0 1px 0 rgba(255,255,255,0.12)}}
@keyframes coherence-glow{0%,100%{box-shadow:0 0 0 0 rgba(212,175,106,0)}50%{box-shadow:0 0 28px 4px rgba(212,175,106,0.3)}}
@keyframes fractal-in{0%{opacity:0;transform:translateX(-8px)}100%{opacity:1;transform:translateX(0)}}
.l4-active{animation:l4-pulse 18.79s linear infinite;}
.coherence-full{animation:coherence-glow 3s ease-in-out infinite;}
.fractal-level{animation:fractal-in 0.25s ease both;}

/* ── Command Palette ── */
.cmd-overlay{animation:cmd-in 0.15s ease;}
.cmd-panel{animation:panel-spring 0.3s cubic-bezier(0.34,1.56,0.64,1);}
.cmd-result{width:100%;background:none;border:none;border-left:2px solid transparent;padding:10px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;text-align:left;transition:background 0.1s,border-color 0.1s;}
.cmd-result:hover,.cmd-result.active{background:rgba(var(--tint-rgb),0.09);border-left-color:var(--tint-primary);}

/* ── Control Center ── */
.cc-action{display:flex;align-items:center;gap:8px;padding:8px 15px 8px 11px;border-radius:22px;cursor:pointer;border:none;transition:transform 0.2s,opacity 0.2s;}
.cc-action:hover{transform:translateX(-4px);}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:2px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(var(--tint-rgb),0.22);border-radius:1px;}
`;

export const F = "Georgia, 'Times New Roman', serif";
// GOLD is a LIVE BINDING: applyTintJs() rewrites it when the practitioner
// switches tint presets, so every screen that renders after a tint change
// (App re-renders on the profile update) picks up the themed primary —
// including SVG presentation attributes and hex+alpha concatenations,
// which CSS var() strings cannot serve.
export let GOLD = "#D4AF6A";
export function applyTintJs(presetId){
  const p = TINT_PRESETS[presetId] || TINT_PRESETS.solar;
  GOLD = p.primary;
}
export const L=(c="#7A6030",s=9)=>({fontFamily:F,fontSize:s,color:c,letterSpacing:3.5,textTransform:"uppercase"});
export const T=(s=18,c="#D4AF6A")=>({fontFamily:F,fontSize:s,color:c,lineHeight:1.2});
export const B=(s=12,c="#8A7050")=>({fontFamily:F,fontSize:s,color:c,fontStyle:"italic",lineHeight:1.9});

// ── Planetary Tint Presets ────────────────────────────────────────────────
export const TINT_PRESETS = {
  solar:    {label:"☉ Solar",    primary:"#D4AF6A", rgb:"200,175,100", glassBg:"8,5,22",   grad1:"rgba(160,120,30,0.18)",  grad2:"rgba(60,40,120,0.22)"},
  lunar:    {label:"☽ Lunar",    primary:"#A8C0D8", rgb:"155,185,210", glassBg:"5,8,22",   grad1:"rgba(55,80,130,0.20)",  grad2:"rgba(20,30,80,0.28)"},
  martial:  {label:"♂ Martial",  primary:"#C87060", rgb:"185,100,80",  glassBg:"16,5,5",   grad1:"rgba(120,35,25,0.22)",  grad2:"rgba(80,15,10,0.25)"},
  jovian:   {label:"♃ Jovian",   primary:"#8888D4", rgb:"110,110,196", glassBg:"5,5,22",   grad1:"rgba(50,45,130,0.25)",  grad2:"rgba(30,25,90,0.28)"},
  venusian: {label:"♀ Venusian", primary:"#C87090", rgb:"192,102,132", glassBg:"16,5,11",  grad1:"rgba(110,50,70,0.20)",  grad2:"rgba(80,20,50,0.25)"},
  saturnine:{label:"♄ Saturnine",primary:"#8898A8", rgb:"122,138,158", glassBg:"5,8,16",   grad1:"rgba(50,60,82,0.20)",  grad2:"rgba(25,30,52,0.28)"},
};

// Dignity presentation + Greek vowels (shared by screens and the election engine)
export const DIGNITY_COL={domicile:"#5CA85C",exaltation:"#D4AF6A",peregrine:"#6A5030",detriment:"#8B4040",fall:"#8B4040"};
export const DIGNITY_LBL={domicile:"Domicile ✦",exaltation:"Exaltation ✦✦",peregrine:"Peregrine",detriment:"Detriment",fall:"Fall"};
export const VOWELS={sun:{l:"Ι",p:"EE"},moon:{l:"Α",p:"AH"},mercury:{l:"Ε",p:"EH"},venus:{l:"Η",p:"AY"},mars:{l:"Ο",p:"OH"},jupiter:{l:"Υ",p:"EUW"},saturn:{l:"Ω",p:"OHW"}};
