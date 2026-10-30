// The room-aware Oracle opens from the control center in every kind of room
// without a page error. Its context builder once referenced a helper the
// shell never imported and a renamed template table, so the button threw
// inside its click handler and the Oracle never opened — invisible to every
// other suite. Seeds a place far from Greenwich and an Athanor operation in
// progress so the timekeeping and Athanor branches of the context run too.
import { launch } from './_browser.mjs';
const b = await launch();
const p = await (await b.newContext()).newPage();
await p.setViewportSize({ width: 1400, height: 1200 });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));

await p.goto('http://127.0.0.1:4174/', { waitUntil: 'load' });
await p.evaluate(() => {
  localStorage.setItem('astrum_profile', JSON.stringify({ name: 'T', traditions: ['western-ceremonial'],
    natal: { date: '1990-07-14', time: '19:30', lat: 34.05, lon: -118.24 } }));
  localStorage.setItem('astrum_welcomed', '1');
  localStorage.setItem('astrum_schema', '2');
  localStorage.setItem('astrum_athanor', JSON.stringify([{ id: 'op1', name: 'Mars Tincture', template: 'tincture', planet: 'mars',
    startedAt: new Date().toISOString(), status: 'active', castingId: null, labNotes: [],
    steps: [{ id: 's1', title: 'Macerate', instructions: '', dueRule: null, scheduledFor: new Date(Date.now() + 3600e3).toISOString(), completedAt: null, note: '' }] }]));
});

const ROOMS = ['sky', 'elect', 'natal', 'athanor', 'mansions', 'planets'];
const results = {};
for (const room of ROOMS) {
  await p.evaluate(r => localStorage.setItem('astrum_tab', r), room);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1800);
  const before = errs.length;
  await p.evaluate(() => { const fab = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === '✧').pop(); fab && fab.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const o = [...document.querySelectorAll('button.cc-action')].find(x => /Oracle/.test(x.textContent)); o && o.click(); });
  await p.waitForTimeout(700);
  const opened = await p.evaluate(() => [...document.querySelectorAll('div')].some(d => d.children.length === 0 && d.textContent.trim() === 'ORACLE'));
  results[room] = { opened, newErrors: errs.length - before };
}
console.log('oracle by room:', JSON.stringify(results));
console.log('errors:', errs.length ? JSON.stringify([...new Set(errs)]) : 'none');
await b.close();
const ok = Object.values(results).every(r => r.opened && r.newErrors === 0) && errs.length === 0;
console.log(ok ? '✓ ORACLE E2E PASS' : '✗ ORACLE E2E FAIL');
process.exit(ok ? 0 : 1);
