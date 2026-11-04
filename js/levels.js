// Builds each chapter's timeline: waves, echoes, pickups, hazards, dialogue.
// Deterministic per chapter (seeded) so every run of a chapter feels authored.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Segment library. Each returns a list of [dt, waveSpec] relative to its start.
const SEG = {
  lineDrift: (r, W, k) => [[0, { kind: 'drifter', form: 'line', n: 3 + Math.floor(k * 2) }]],
  lineDrift2: (r, W, k) => [[0, { kind: 'drifter', form: 'line', n: 4 }], [2.2, { kind: 'drifter', form: 'line', n: 3 + Math.floor(k * 2), offset: 0.5 }]],
  vForm: (r, W, k) => [[0, { kind: 'drifter', form: 'v', n: 5 + Math.floor(k * 2) }]],
  swoopL: (r, W, k) => [[0, { kind: 'swoop', form: 'chain', n: 5 + Math.floor(k * 2), side: -1 }]],
  swoopR: (r, W, k) => [[0, { kind: 'swoop', form: 'chain', n: 5 + Math.floor(k * 2), side: 1 }]],
  swoopX: (r, W, k) => [[0, { kind: 'swoop', form: 'chain', n: 4 + Math.floor(k * 2), side: -1 }], [0.4, { kind: 'swoop', form: 'chain', n: 4 + Math.floor(k * 2), side: 1, y1: 0.45 }]],
  darts: (r, W, k) => [[0, { kind: 'dart', form: 'random', n: 3 + Math.floor(k * 2), gap: 0.5 }]],
  spinner: (r, W, k) => [[0, { kind: 'spinner', form: 'at', x: 0.3 + r() * 0.4 }], ...(k > 0.4 ? [[1.5, { kind: 'drifter', form: 'line', n: 3 }]] : [])],
  spinPair: (r, W, k) => [[0, { kind: 'spinner', form: 'at', x: 0.25 }], [0.6, { kind: 'spinner', form: 'at', x: 0.75 }]],
  heavy: (r, W, k) => [[0, { kind: 'heavy', form: 'at', x: 0.5 }], [2.5, { kind: 'swoop', form: 'chain', n: 4, side: r() < 0.5 ? -1 : 1 }]],
  mines: (r, W, k) => [[0, { kind: 'mine', form: 'random', n: 4 + Math.floor(k * 3), gap: 0.45 }]],
  column: (r, W, k) => [[0, { kind: 'drifter', form: 'column', n: 5, x: 0.2 + r() * 0.6, gap: 0.35, amp: 50 }]],
};

const POOLS = {
  coast:  { easy: ['lineDrift', 'swoopL', 'swoopR', 'vForm', 'column'], hard: ['lineDrift2', 'spinner', 'swoopX', 'darts'], big: ['heavy'] },
  city:   { easy: ['lineDrift', 'darts', 'swoopL', 'swoopR', 'column'], hard: ['spinPair', 'swoopX', 'lineDrift2', 'darts'], big: ['heavy'] },
  desert: { easy: ['swoopL', 'swoopR', 'darts', 'vForm', 'mines'], hard: ['spinner', 'swoopX', 'darts', 'lineDrift2'], big: ['heavy'] },
  forest: { easy: ['mines', 'lineDrift', 'vForm', 'swoopL', 'swoopR'], hard: ['spinPair', 'mines', 'column', 'swoopX'], big: ['heavy'] },
  aurora: { easy: ['swoopX', 'darts', 'vForm', 'lineDrift2'], hard: ['spinPair', 'darts', 'swoopX', 'mines'], big: ['heavy'] },
  hush:   { easy: ['lineDrift2', 'swoopX', 'darts', 'mines', 'column'], hard: ['spinPair', 'swoopX', 'darts', 'lineDrift2'], big: ['heavy'] },
};

export function buildLevel(ci, ch, W) {
  const r = rng(1234 + ci * 7919);
  const LEN = 84 + ci * 3; // seconds before the boss
  const ev = [];
  const pool = POOLS[ch.id];
  const diff = ci / 5;

  let t = 3.5, n = 0;
  while (t < LEN - 4) {
    const prog = t / LEN;
    const k = Math.min(1, diff * 0.6 + prog * 0.5);
    let name;
    if (n > 0 && n % 7 === 6) name = pool.big[0];
    else {
      const list = r() < 0.25 + prog * 0.5 ? pool.hard : pool.easy;
      name = list[Math.floor(r() * list.length)];
    }
    for (const [dt, spec] of SEG[name](r, W, k)) ev.push({ t: t + dt, type: 'wave', ...spec });
    const gap = name === 'heavy' ? 7.5 : name.startsWith('spin') ? 5.5 : 4.4 - k * 1.3;
    t += gap + r() * 1.2;
    n++;
  }
  // Echoes: four fragments of the chapter's song
  [0.14, 0.38, 0.62, 0.84].forEach((f, i) => ev.push({ t: LEN * f, type: 'echo', idx: i }));
  // power sparks + a heart
  [0.08, 0.3, 0.52, 0.74].forEach((f) => ev.push({ t: LEN * f + 1.7, type: 'spark' }));
  ev.push({ t: LEN * 0.56, type: 'heart' });
  // chapter-specific hazards
  if (ch.modifier === 'wind') for (let tt = 6; tt < LEN; tt += 7 + r() * 4) ev.push({ t: tt, type: 'wind', v: (r() < 0.5 ? -1 : 1) * (40 + r() * 50) });
  if (ch.modifier === 'spores') for (let tt = 8; tt < LEN; tt += 6 + r() * 4) ev.push({ t: tt, type: 'zone', x: 0.15 + r() * 0.7 });
  if (ch.modifier === 'gravity') for (let tt = 7; tt < LEN; tt += 9 + r() * 4) ev.push({ t: tt, type: 'well', x: 0.2 + r() * 0.6 });
  // chatter
  for (const [ct, who, text] of ch.chatter) ev.push({ t: ct, type: 'say', who, text });
  ev.push({ t: LEN, type: 'boss' });
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, length: LEN };
}
