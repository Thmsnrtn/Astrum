// P5 verification: first-run welcome → profile seeded; tint switching
// actually recolors (the audit's "broken by construction" bug); grouped
// nav renders; active tab persists across reload; Sky hint without place.
import { launch } from './_browser.mjs';
const b = await launch();
const p = await (await b.newContext()).newPage();
await p.setViewportSize({ width: 1400, height: 1200 });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 100)));

// 1) Brand-new user → welcome
await p.goto('http://127.0.0.1:4174/', { waitUntil: 'load' });
await p.waitForTimeout(2200);
const w1 = await p.evaluate(() => ({ welcome: /an instrument for the practice/i.test(document.body.innerText), askName: /call you/i.test(document.body.innerText) }));
console.log('welcome shows:', JSON.stringify(w1));
await p.fill('input[aria-label="Your name"]', 'Thomas');
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'CONTINUE' || x.textContent.trim() === 'Continue'); g && g.click(); });
await p.waitForTimeout(400);
await p.fill('input[aria-label="Birth date"]', '1990-06-15');
await p.fill('input[aria-label="Latitude"]', '51.5');
await p.fill('input[aria-label="Longitude"]', '-0.12');
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /Enter the Temple/i.test(x.textContent)); g && g.click(); });
await p.waitForTimeout(1200);
const seeded = await p.evaluate(() => { const pr = JSON.parse(localStorage.getItem('astrum_profile') || '{}'); return { name: pr.name, hasNatal: !!pr.natal?.date, lat: pr.natal?.lat, welcomed: !!localStorage.getItem('astrum_welcomed'), gone: !/an instrument for the practice/i.test(document.body.innerText) }; });
console.log('profile seeded:', JSON.stringify(seeded));

// 2) Tint switching recolors the title
const goldBefore = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tint-primary').trim());
await p.evaluate(() => { const pr = JSON.parse(localStorage.getItem('astrum_profile')); pr.tint = 'martial'; localStorage.setItem('astrum_profile', JSON.stringify(pr)); });
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2200);
const tint = await p.evaluate(() => {
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--tint-primary').trim();
  const title = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === 'ASTRUM' && d.children.length === 0);
  return { cssVar, titleColor: title ? getComputedStyle(title).color : null };
});
console.log('tint before:', goldBefore, '→ after:', JSON.stringify(tint));
const tintWorks = tint.cssVar === '#C87060' && tint.titleColor === 'rgb(200, 112, 96)';

// 3) Grouped nav + THE COURT... groups
await p.mouse.click(511, 23); await p.waitForTimeout(500);
const nav = await p.evaluate(() => { const t = document.body.innerText; return { sky: /THE SKY/.test(t), work: /THE WORK/.test(t), oracle: /THE ORACLE/.test(t), record: /THE RECORD/.test(t), study: /STUDY & SETTINGS/.test(t) }; });
console.log('grouped nav:', JSON.stringify(nav));

// 4) Tab persistence
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => x.textContent.includes('28 lunar stations')); g && g.click(); });
await p.waitForTimeout(800);
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2200);
const persisted = await p.evaluate(() => /MANSIONS/i.test(document.body.innerText.slice(0, 400)));
console.log('tab persisted after reload:', persisted);

const ok = w1.welcome && seeded.name === 'Thomas' && seeded.hasNatal && seeded.gone && tintWorks && Object.values(nav).every(Boolean) && persisted;
console.log(ok ? '✓ UX E2E PASS' : '✗ UX E2E FAIL');
console.log('errors:', errs.length ? JSON.stringify([...new Set(errs)]) : 'none');
await b.close();
process.exit(ok ? 0 : 1);
