// SW v3 verification: install → offline reload works; storage card renders.
import { launch } from './_browser.mjs';
const b = await launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.setViewportSize({ width: 1400, height: 1200 });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 100)));

// Base '/' build: hit the root so SW scope matches.
await p.goto('http://127.0.0.1:4174/', { waitUntil: 'load' });
await p.evaluate(() => { localStorage.setItem('astrum_profile', JSON.stringify({ name: 'T', traditions: ['western-ceremonial'], natal: { date: '1990-06-15', time: '12:00', lat: 51.5, lon: -0.12 } })); localStorage.setItem('astrum_schema', '2'); });
// wait for SW to control the page
const swState = await p.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return 'no-reg';
  for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 250));
  return navigator.serviceWorker.controller ? 'controlled' : 'active-not-controlling';
});
console.log('sw:', swState);
if (swState !== 'controlled') { await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500); }
const cacheInfo = await p.evaluate(async () => {
  const keys = await caches.keys();
  const c = await caches.open(keys[0]);
  return { caches: keys, entries: (await c.keys()).length };
});
console.log('cache:', JSON.stringify(cacheInfo));

// Offline reload
await ctx.setOffline(true);
await p.reload({ waitUntil: 'load' }).catch(e => console.log('offline reload failed:', e.message));
await p.waitForTimeout(2500);
const offlineOk = await p.evaluate(() => ({
  title: document.title.slice(0, 20),
  hasApp: !!document.querySelector('#root')?.textContent?.includes('ASTRUM'),
}));
console.log('offline:', JSON.stringify(offlineOk), offlineOk.hasApp ? '✓ WORKS OFFLINE' : '✗ BROKEN OFFLINE');
await ctx.setOffline(false);

// Storage health card
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2200);
await p.mouse.click(511, 23); await p.waitForTimeout(500);
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /Practitioner settings/.test(x.textContent)); g && g.click(); });
await p.waitForTimeout(3000);
const card = await p.evaluate(() => {
  const t = document.body.innerText;
  return { health: /STORAGE HEALTH/i.test(t), holds: /The record holds/.test(t), persistent: /Persistent storage/.test(t), vault: /Photo vault/.test(t) };
});
console.log('storage card:', JSON.stringify(card));
console.log('errors:', errs.length ? JSON.stringify([...new Set(errs)]) : 'none');
await b.close();
const pass = offlineOk.hasApp && card.health && card.holds && card.vault;
process.exit(pass ? 0 : 1);
