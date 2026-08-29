// Smoke: every nav room opens without a pageerror.
// Run: node e2e/smoke.mjs   (expects `vite preview` on :4174)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
await p.setViewportSize({ width: 1400, height: 1200 });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
await p.goto('http://127.0.0.1:4174/Astrum/', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => {
  localStorage.setItem('astrum_profile', JSON.stringify({ name: 'T', traditions: ['western-ceremonial'], natal: { date: '1990-06-15', time: '12:00', lat: 51.5, lon: -0.12 } }));
  localStorage.setItem('astrum_schema', '2');
});
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2600);

const openSidebar = async () => {
  const open = await p.evaluate(() => !![...document.querySelectorAll('button')].find(x => /Live celestial state/.test(x.textContent)));
  if (!open) { await p.mouse.click(511, 23); await p.waitForTimeout(400); }
};
await openSidebar();
const navLabels = await p.evaluate(() =>
  [...document.querySelectorAll('button')]
    .map(b => b.textContent.trim())
    .filter(t => t.length > 6 && t.length < 90)
);
// nav rows carry "IconLabelDesc" text; identify them by known descs
const rows = navLabels.filter(t => /celestial state|aspect grid|Faces of Heaven|Nested time|sphere profiles|Fixed stars|Personal resonance|Transit hit|Ingresses|lunar stations|monthly rhythm|Hermetic Lots|releasing|Optimal windows|planning grid|Liturgical|question|sixteen figures|Build a ritual|under the hour|design|operations lab|Practice record|Sigil workshop|book of shadows|practice statistics|own record|Macro cycles|education|working builder|settings|temple face|offerings|synchronicities/i.test(t));
let visited = 0; const failed = [];
for (const lbl of rows) {
  await openSidebar();
  const before = errs.length;
  const ok = await p.evaluate(l => { const g = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === l); if (g) { g.click(); return true; } return false; }, lbl);
  if (!ok) { failed.push('NOTFOUND:' + lbl.slice(0, 24)); continue; }
  visited++;
  await p.waitForTimeout(420);
  if (errs.length > before) failed.push(lbl.slice(0, 26) + ' → ' + errs[errs.length - 1].slice(0, 60));
  const disturbed = await p.evaluate(() => /This room is disturbed/.test(document.body.innerText));
  if (disturbed) {
    const why = await p.evaluate(() => document.body.innerText.match(/This room is disturbed\n([^\n]+)/)?.[1] || '?');
    failed.push(lbl.slice(0, 26) + ' → BOUNDARY: ' + why.slice(0, 60));
  }
}
console.log('nav rows:', rows.length, 'visited:', visited);
console.log(failed.length ? 'FAILURES: ' + JSON.stringify(failed, null, 1) : 'ALL ROOMS CLEAN');
console.log('unique errors:', JSON.stringify([...new Set(errs)].slice(0, 8)));
await b.close();
process.exit(failed.length ? 1 : 0);
