// Tick-cadence check: 1 Hz header clock, live fractal windows, calm root.
import { launch } from './_browser.mjs';
const b = await launch();
const p = await b.newPage();
await p.goto('http://127.0.0.1:4174/Astrum/', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => { localStorage.setItem('astrum_profile', JSON.stringify({ name: 'T', traditions: ['western-ceremonial'], natal: { date: '1990-06-15', time: '12:00', lat: 51.5, lon: -0.12 } })); localStorage.setItem('astrum_schema', '2'); });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
const t1 = await p.evaluate(() => document.body.innerText.match(/\d{1,2}:\d{2}:\d{2}/)?.[0]);
await p.waitForTimeout(2300);
const t2 = await p.evaluate(() => document.body.innerText.match(/\d{1,2}:\d{2}:\d{2}/)?.[0]);
console.log('clock ticking:', t1, '→', t2, t1 !== t2 ? '✓' : '✗ FROZEN');
await p.mouse.click(511, 23); await p.waitForTimeout(500);
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Nested time')); g && g.click(); });
await p.waitForTimeout(800);
const f1 = await p.evaluate(() => document.body.innerText.slice(0, 900));
await p.waitForTimeout(2500);
const f2 = await p.evaluate(() => document.body.innerText.slice(0, 900));
console.log('fractal live:', f1 !== f2 ? '✓ updating' : '✗ static');
await b.close();
