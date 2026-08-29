// ═══════════════════════════════════════════════════════════════════════
// SHARED UI TABLES — constants used by several screens (relocated here
// during the P1 screen decomposition; they had landed arbitrarily in
// whichever screen's cut region contained them).
// ═══════════════════════════════════════════════════════════════════════
import { P } from "./planets.js";
import { F } from "../ui/theme.js";

export const ROMAN=["I","II","III","IV"];

export const SIGN_COLORS=["#D04040","#7A5030","#5080C0","#40A060","#D04040","#7A5030","#5080C0","#40A060","#D04040","#7A5030","#5080C0","#40A060"];

export const KAMEA={
  saturn:   {size:3,sq:[2,7,6,9,5,1,4,3,8]},
  jupiter:  {size:4,sq:[16,3,2,13,5,10,11,8,9,6,7,12,4,15,14,1]},
  mars:     {size:5,sq:[11,24,7,20,3,4,12,25,8,16,17,5,13,21,9,10,18,1,14,22,23,6,19,2,15]},
  sun:      {size:6,sq:[6,32,3,34,35,1,7,11,27,28,8,30,19,14,16,15,23,24,18,20,22,21,17,13,25,29,10,9,26,12,36,5,33,4,2,31]},
  venus:    {size:7,sq:[22,47,16,41,10,35,4,5,23,48,17,42,11,29,30,6,24,49,18,36,12,13,31,7,25,43,19,37,38,14,32,1,26,44,20,21,39,8,33,2,27,45,46,15,40,9,34,3,28]},
  mercury:  {size:8,sq:[64,2,3,61,60,6,7,57,9,55,54,12,13,51,50,16,17,47,46,20,21,43,42,24,40,26,27,37,36,30,31,33,32,34,35,29,28,38,39,25,41,23,22,44,45,19,18,48,49,15,14,52,53,11,10,56,8,58,59,5,4,62,63,1]},
  moon:     {size:9,sq:[37,78,29,70,21,62,13,54,5,6,38,79,30,71,22,63,14,46,47,7,39,80,31,72,23,55,15,16,48,8,40,81,32,64,24,56,57,17,49,9,41,73,33,65,25,26,58,18,50,1,42,74,34,66,67,27,59,10,51,2,43,75,35,36,68,19,60,11,52,3,44,76,77,28,69,20,61,12,53,4,45]}
};

export const GRIM_CATS=["ritual","prayer","observation","dream","correspondence","custom"];

export const OUTER_META={
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

export const L_META=[
  {w:"Atziluth",dur:"~10.1 days",use:"Electional window · Talismanic harvest"},
  {w:"Beriah",dur:"~6.76 hours",use:"Ritual design · Working day"},
  {w:"Yetzirah",dur:"~11.3 min",use:"Single act · Focused meditation"},
  {w:"Assiah",dur:"~18.8 sec",use:"One vowel · One breath · One face"},
];

export const SIGN_ELEMS=["Fire","Earth","Air","Water","Fire","Earth","Air","Water","Fire","Earth","Air","Water"];

export function kamea_xy(num,planet,w=260,h=260){
  const km=KAMEA[planet]||KAMEA.jupiter;
  const idx=km.sq.indexOf(num);
  if(idx<0)return null;
  const row=Math.floor(idx/km.size),col=idx%km.size;
  const cell=Math.min(w,h)/km.size;
  return[col*cell+cell/2,row*cell+cell/2];
}

export const SIGN_SYMS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

export const fmtT = d => `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} ${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

export const VOWEL_SOUNDS={"moon":"AH","mercury":"EH","venus":"AY","sun":"EE","mars":"OH","jupiter":"EUW","saturn":"OHW"};

export function KameaPreview({pts,planet,size=180}){
  const km=KAMEA[planet]||KAMEA.jupiter;
  const scale=size/260;
  if(!pts||pts.length<2)return null;
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${(p[0]*scale).toFixed(1)} ${(p[1]*scale).toFixed(1)}`).join(" ");
  return(
    <svg width={size} height={size} style={{background:"rgba(0,0,0,0.4)",borderRadius:8,border:"1px solid rgba(200,175,100,0.15)"}}>
      {Array.from({length:km.size}).map((_,r)=>Array.from({length:km.size}).map((_,c)=>{
        const cell=size/(km.size+1),x=cell*(c+1),y=cell*(r+1);
        return <circle key={`${r}-${c}`} cx={x} cy={y} r={1.2} fill="rgba(200,175,100,0.25)"/>;
      })).flat()}
      <path d={d} fill="none" stroke={P[planet].col} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[0][0]*scale} cy={pts[0][1]*scale} r={3.5} fill="none" stroke={P[planet].col} strokeWidth={1}/>
      <line x1={pts[pts.length-1][0]*scale-4} y1={pts[pts.length-1][1]*scale-4} x2={pts[pts.length-1][0]*scale+4} y2={pts[pts.length-1][1]*scale+4} stroke={P[planet].col} strokeWidth={1.4}/>
    </svg>
  );
}

export const ROSE_CROSS_LETTERS={
  A:[2,1],B:[1,3],C:[3,2],D:[1,2],E:[2,3],F:[2,2],G:[3,3],H:[3,1],I:[2,4],J:[2,4],
  K:[1,4],L:[3,4],M:[1,5],N:[2,5],O:[4,1],P:[4,2],Q:[4,3],R:[4,4],S:[4,5],T:[5,1],
  U:[5,2],V:[5,2],W:[5,3],X:[5,4],Y:[5,5],Z:[1,1]
};

export function roseCrossXY(row,col,w=260,h=260){
  const cx=w/2,cy=h/2,dx=w/6,dy=h/6;
  const ox=(col-3)*dx,oy=(row-3)*dy;
  return[cx+ox,cy+oy];
}

export function kamea_letterNum(c){const v=c.toUpperCase().charCodeAt(0)-64;return v>=1&&v<=26?v:0;}

export function kamea_reduce(n,size){while(n>size*size)n-=size*size;return n;}

export const CYCLE_LORE = {
  plutoCurrent: "Pluto in Aquarius (2024-2043): The last time Pluto transited Aquarius was 1778-1798 — the period of the American Revolution, the French Revolution, the Declaration of the Rights of Man, and the abolition of feudalism across Europe. Every absolute monarchy it touched was transformed or destroyed. In the current transit: AI, networked collective intelligence, and the decentralization of power are the 2020s equivalent of the printing press and the pamphlet. For magical practitioners, this transit rewards those who work with collective spirits, network intelligences, and distributed power. The grimoire spirits that manage information, communication, and collective organization are at peak accessibility. The ancestor current gains amplified power during Aquarian Pluto — the dead can speak to many, not just the individual practitioner.",
  neptuneCurrent: "Neptune in Aries (2025-2039): The last time Neptune was in Aries was 1861-1875 — the American Civil War, the spiritualist explosion (Fox sisters, automatic writing, the birth of modern mediumship), the founding of Theosophy, and the first wave of organized psychical research. New spiritual movements emerged from the chaos of societal rupture. Messianic energy, martyrdom, and visionary leadership defined the collective spiritual imagination. For magical practitioners: new forms of spirit contact and magical practice will emerge in this period, likely from unexpected quarters. The Fisher King wound of the collective spiritual body — the loss of genuine encounter with the sacred — is reopened by this transit for healing or deepening. Pioneer spiritual work done now plants seeds for the next 165 years.",
  uranusCurrent: "Uranus in Gemini (2025-2033): The last time Uranus was in Gemini was 1942-1949 — the atomic bomb, the birth of the United Nations, the Cold War dawn, computing machines (Turing), and a complete revolution in how minds connect and conflict. Technology remade the medium of thought itself. For magical practitioners: this transit rewards mercurial intelligence, written and spoken transmission, the rapid creation of new magical frameworks, and the cultivation of networks of magical practice. The decan of Mercury is elevated. Sigil shoaling, narrative magic, and synchronicity-based divination are all enhanced by this transit's energy.",
  jsMutationCurrent: "The 2020 Jupiter-Saturn Air Mutation (0° Aquarius): This was the first Air mutation since 1226 CE, ending 200 years of Earth conjunctions. The last Air mutation (1186-1226 CE) coincided with the third Crusade, the peak of Islamic Golden Age scholarship, the birth of Fibonacci mathematics, and the dissolution of feudal certainties across Europe. Air mutations historically favor: the transmission of ideas over the accumulation of things, networks over hierarchies, and the mercurial over the Saturnian. For magical practitioners: the next 200 years belong to those who can work with disembodied intelligence, distributed spirit relationships, and the transmission of magical knowledge through networks rather than physical lineage.",
};

export const fmtD = d => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

export const ASP_COLORS={Conjunction:"#D4AF6A",Opposition:"#D24B31",Trine:"#5CA85C",Square:"#D24B31",Sextile:"#7CB8E0"};
