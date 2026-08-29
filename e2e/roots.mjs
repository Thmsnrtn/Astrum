// Roots-pass verification: the enriched primary-source material actually
// renders (mansion talismans, Picatrix decan significations, grown SRS
// deck) and the VoC doctrine toggle persists and takes effect.
import { launch } from './_browser.mjs';
const b = await launch();
const p = await (await b.newContext()).newPage();
await p.setViewportSize({ width: 1400, height: 1200 });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 120)));

// Seed a profile so the welcome flow doesn't gate navigation.
await p.goto('http://127.0.0.1:4174/', { waitUntil: 'load' });
await p.evaluate(() => {
  localStorage.setItem('astrum_profile', JSON.stringify({ name: 'T', natal: { date: '1990-06-15', lat: 51.5, lon: -0.12 }, traditions: ['western-ceremonial'], tint: 'solar', theme: 'dark' }));
  localStorage.setItem('astrum_welcomed', '1');
});
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2400);

const goRoom = async desc => {
  await p.mouse.click(511, 23); await p.waitForTimeout(400); // open nav (title tap)
  await p.evaluate(d => { const g = [...document.querySelectorAll('button')].find(x => x.textContent.includes(d)); g && g.click(); }, desc);
  await p.waitForTimeout(900);
};

// 1) Mansions: the Picatrix IV.9 talisman block renders for the live mansion
await goRoom('28 lunar stations');
const mans = await p.evaluate(() => { const t = document.body.innerText; return {
  talisman: /Talisman of the Mansion/i.test(t), source: /Picatrix IV\.9/i.test(t),
  lord: /Lord:/i.test(t), agrippa: /Agrippa II\.33/i.test(t),
  window: /Window Open Now|Next Window/i.test(t), commit: /Commit This Window/i.test(t) }; });
console.log('mansions talisman block:', JSON.stringify(mans));

// 2) Decans: second-witness image + signification render
await goRoom('36 Faces of Heaven');
const dec = await p.evaluate(() => { const t = document.body.innerText; return {
  sig: /Signification:/i.test(t), witness: /Greer\s*&\s*Warnock/i.test(t),
  first: /Attrell\s*&\s*Porreca/i.test(t) }; });
console.log('decan enrichment:', JSON.stringify(dec));

// 2b) Almanac: click today → the day's mansion talisman line renders
await goRoom('Liturgical month');
await p.evaluate(() => {
  const today = String(new Date().getDate());
  const cell = [...document.querySelectorAll('button')].find(b => {
    const first = b.querySelector('span');
    return first && first.textContent.trim() === today && b.style.aspectRatio;
  });
  cell && cell.click();
});
await p.waitForTimeout(700);
const alm = await p.evaluate(() => /Could be made today/i.test(document.body.innerText));
console.log('almanac talisman line:', alm);

// 2c) Stars: selecting a Behenian star shows Thebit's window
await goRoom('Fixed stars');
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Regulus/.test(x.textContent)); b && b.click(); });
await p.waitForTimeout(900);
const star = await p.evaluate(() => { const t = document.body.innerText; return {
  thebit: /Thebit's Window/i.test(t), commit: /as an Election/i.test(t) }; });
console.log('thebit window:', JSON.stringify(star));

// 3) Learn: the daily card runs over the grown deck without error
await goRoom('AI magical education');
const learn = await p.evaluate(() => /Daily Card|canon rests/i.test(document.body.innerText));
console.log('learn daily card:', learn);

// 4) Profile: doctrine toggle → hellenistic persists in the store
await goRoom('Practitioner settings');
const doct = await p.evaluate(() => /Doctrine · Void of Course/i.test(document.body.innerText));
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toUpperCase() === 'HELLENISTIC'); g && g.click(); });
await p.waitForTimeout(500);
const mode1 = await p.evaluate(() => JSON.parse(localStorage.getItem('astrum_practice_prefs') || '{}').vocMode);
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2400);
const mode2 = await p.evaluate(() => JSON.parse(localStorage.getItem('astrum_practice_prefs') || '{}').vocMode);
console.log('doctrine card:', doct, '· after click:', mode1, '· after reload:', mode2);

const ok = Object.values(mans).every(Boolean) && Object.values(dec).every(Boolean) && learn && alm && Object.values(star).every(Boolean)
  && doct && mode1 === 'hellenistic' && mode2 === 'hellenistic' && errs.length === 0;
console.log(ok ? '✓ ROOTS E2E PASS' : '✗ ROOTS E2E FAIL');
console.log('errors:', errs.length ? JSON.stringify([...new Set(errs)]) : 'none');
await b.close();
process.exit(ok ? 0 : 1);
