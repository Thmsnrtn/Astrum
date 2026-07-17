// ═══════════════════════════════════════════════════════════════════════
// THE BOOK OF RESULTS — the year, bound
// ═══════════════════════════════════════════════════════════════════════
// The inverse of the Almanac: where the almanac plans the season ahead, the
// Book binds the season behind — castings and their verdicts, the practice
// statistics, chosen grimoire entries, and the omen record, composed as a
// printable annual. Pure composer: takes the data, returns the document.

import { effectiveVerdict, computeStats } from "./castings.js";

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtD = d => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const VERDICT_LABEL = { hit: "✦ Hit", partial: "◐ Partial", miss: "✗ Miss" };

export function composeBook({ from, to, castings = [], grimoire = [], omens = [], title = "The Book of Results" }) {
  const inRange = d => { const t = new Date(d).getTime(); return t >= new Date(from).getTime() && t < new Date(to).getTime(); };
  const cs = castings.filter(c => inRange(c.createdAt));
  const gs = grimoire.filter(g => g.date && inRange(g.date));
  const os = omens.filter(o => inRange(o.at));
  const stats = computeStats(cs);

  const statRows = (rows = []) => rows.slice(0, 8).map(r =>
    `<tr><td>${esc(r.key)}</td><td>${r.n}</td><td>${r.pct != null ? r.pct + "%" : "—"}</td></tr>`).join("");

  const castingBlocks = cs.map(c => {
    const v = effectiveVerdict(c);
    const notes = (c.outcomes || []).filter(o => o.note).map(o => `<div class="note">${fmtD(o.date)} — ${esc(o.note)}</div>`).join("");
    const cond = c.conditions ? [c.conditions.moonPhase, c.conditions.mansion && `mansion ${c.conditions.mansion.n}`, c.conditions.hourPlanet && `hour of ${c.conditions.hourPlanet}`, c.conditions.voc?.isVoC && "VoC"].filter(Boolean).join(" · ") : "";
    return `<div class="casting">
      <div class="chead"><span class="kind">${esc(c.kind)}</span> <strong>${esc(c.title)}</strong>
        <span class="verdict">${v ? VERDICT_LABEL[v] || v : c.status === "open" ? "…open" : ""}</span></div>
      <div class="cmeta">${fmtD(c.createdAt)}${cond ? " · " + esc(cond) : ""}${c.planet ? " · " + esc(c.planet) : ""}</div>
      ${c.intent && c.intent !== c.title ? `<div class="intent">${esc(c.intent)}</div>` : ""}
      ${notes}
    </div>`;
  }).join("\n");

  const omenBlocks = os.slice(0, 60).map(o =>
    `<div class="omen"><span class="okind">${esc(o.kind)}</span> ${fmtD(o.at)} — ${esc(o.text)}</div>`).join("\n");

  const grimoireBlocks = gs.slice(0, 30).map(g =>
    `<div class="gentry"><strong>${esc(g.title)}</strong> <span class="cmeta">${g.date ? fmtD(g.date) : ""}</span></div>`).join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;background:#f7f2e6;color:#3a2f1e;max-width:720px;margin:0 auto;padding:40px 28px;line-height:1.65}
  h1{font-size:30px;letter-spacing:2px;text-align:center;margin-bottom:2px}
  .sub{text-align:center;font-style:italic;color:#8a7040;margin-bottom:34px}
  h2{font-size:15px;letter-spacing:3px;text-transform:uppercase;color:#8a6a30;border-bottom:1px solid #d8c8a0;padding-bottom:5px;margin-top:36px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}
  td,th{padding:4px 8px;border-bottom:1px solid #e6dcc2;text-align:left}
  .bignum{font-size:38px;text-align:center;letter-spacing:2px;margin:4px 0}
  .statline{text-align:center;color:#6a5a38;font-size:13px}
  .casting{margin:14px 0;padding:10px 14px;border-left:3px solid #c8b070;background:#fbf7ec;page-break-inside:avoid}
  .chead{font-size:14px}.kind{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a6a30;margin-right:6px}
  .verdict{float:right;font-size:12px;color:#5a7a4a}
  .cmeta{font-size:11px;color:#9a8560;margin-top:2px}
  .intent,.note{font-size:12.5px;font-style:italic;margin-top:5px;color:#5a4a30}
  .omen{font-size:12.5px;margin:7px 0}.okind{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8a6a30;margin-right:4px}
  .gentry{font-size:13px;margin:7px 0}
  .foot{margin-top:44px;text-align:center;font-size:11px;color:#9a8560;font-style:italic}
  @media print{body{background:#fff}}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="sub">${fmtD(from)} — ${fmtD(to)} · the record of the work</div>

<h2>The Year in Number</h2>
<div class="bignum">${stats.judged}/${cs.length}</div>
<div class="statline">castings judged · overall ${stats.overall.pct != null ? stats.overall.pct + "%" : "—"} (${stats.overall.hits} hits, ${stats.overall.partial} partial) · ${os.length} omens &amp; dreams · ${gs.length} grimoire entries</div>
${stats.byPlanet.length ? `<table><tr><th>By planet</th><th>n</th><th>rate</th></tr>${statRows(stats.byPlanet)}</table>` : ""}
${stats.byMoonPhase.length ? `<table><tr><th>By moon phase</th><th>n</th><th>rate</th></tr>${statRows(stats.byMoonPhase)}</table>` : ""}
${stats.byAlly?.length ? `<table><tr><th>By ally</th><th>n</th><th>rate</th></tr>${statRows(stats.byAlly)}</table>` : ""}

<h2>The Castings</h2>
${castingBlocks || "<div class='cmeta'>No castings in this span.</div>"}

${os.length ? `<h2>Omens &amp; Dreams</h2>\n${omenBlocks}` : ""}

${gs.length ? `<h2>From the Grimoire</h2>\n${grimoireBlocks}` : ""}

<div class="foot">Bound by Astrum · sub specie aeternitatis</div>
</body></html>`;
}
