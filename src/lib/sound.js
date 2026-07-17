// ═══════════════════════════════════════════════════════════════════════
// SOUND — the temple's audio layer
// ═══════════════════════════════════════════════════════════════════════
// Synthesized offline with WebAudio — no files, no network. The shamanic
// drum runs at 4–7 beats/second (the journeying tempo the tradition steps
// prescribe); the bell is a struck-partial chime for hour boundaries and
// the sealing of a rite. Feature-detected: everything no-ops without
// AudioContext (or before a user gesture unlocks it).

let ctx = null;
function audio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

// One synthesized drum hit: a low thump + a short noise burst.
function drumHit(ac, t, gainNode) {
  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.09);
  og.gain.setValueAtTime(0.9, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(og); og.connect(gainNode);
  osc.start(t); osc.stop(t + 0.25);
  const len = Math.floor(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ac.createBufferSource(); noise.buffer = buf;
  const ng = ac.createGain(); ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.connect(ng); ng.connect(gainNode);
  noise.start(t);
}

// Start the journeying drum at `bps` beats per second (4–7 is the theta
// band). Returns a stop() function; null if audio is unavailable.
export function startDrum(bps = 4.5, volume = 0.5) {
  const ac = audio();
  if (!ac) return null;
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);
  let running = true;
  let next = ac.currentTime + 0.05;
  const tick = () => {
    if (!running) return;
    while (next < ac.currentTime + 0.5) { drumHit(ac, next, master); next += 1 / bps; }
    timer = setTimeout(tick, 120);
  };
  let timer = setTimeout(tick, 0);
  return () => { running = false; clearTimeout(timer); try { master.disconnect(); } catch {} };
}

// A struck bell: inharmonic partials with long decay. For hour boundaries
// and the sealing of a rite.
export function bell(baseHz = 432, volume = 0.4) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);
  [[1, 1], [2.0, 0.6], [2.98, 0.4], [4.2, 0.25], [5.4, 0.15]].forEach(([mult, amp]) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = baseHz * mult;
    g.gain.setValueAtTime(amp * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 2.6 - mult * 0.25);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 2.8);
  });
}

export function soundAvailable() {
  return typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext);
}
