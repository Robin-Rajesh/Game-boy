// EMBERSONG — original soundtrack, composed as data for the procedural synth.
// Chords are written as note names; tracks are gated by "layer" so the song
// literally grows as the player restores Echoes (layer 0 = always on).

const ch = (s) => s.split(/\s+/);

// ---------------------------------------------------------------- instruments
const I = {
  warmPad:   { wave: 'sawtooth', detune: [-9, 9], cutoff: 1100, q: 0.6, a: 0.7, d: 1.2, s: 0.85, r: 1.4, vol: 0.075, rev: 0.6 },
  glassPad:  { wave: 'triangle', detune: [-6, 6], cutoff: 1800, a: 1.2, d: 1.5, s: 0.8, r: 2.2, vol: 0.09, rev: 0.75 },
  neonPad:   { wave: 'sawtooth', detune: [-12, 0, 12], cutoff: 1500, a: 0.25, d: 0.8, s: 0.9, r: 0.7, vol: 0.055, rev: 0.45 },
  darkPad:   { wave: 'sawtooth', detune: [-14, 14], cutoff: 520, q: 1.2, a: 1.6, d: 2, s: 0.9, r: 2.5, vol: 0.09, rev: 0.8 },
  ePiano:    { wave: 'sine', detune: [0, 1200], cutoff: 3000, a: 0.008, d: 1.1, s: 0.22, r: 0.9, vol: 0.11, rev: 0.45, trem: 4.5 },
  piano:     { wave: 'triangle', detune: [0, 1202], cutoff: 3200, a: 0.003, d: 0.55, s: 0.0, r: 0.5, vol: 0.075, rev: 0.55, del: 0.25 },
  kalimba:   { wave: 'triangle', cutoff: 4000, a: 0.002, d: 0.32, s: 0, r: 0.3, vol: 0.075, rev: 0.4, del: 0.35 },
  pluckSq:   { wave: 'square', cutoff: 2400, fenv: 1800, fdecay: 0.06, a: 0.002, d: 0.12, s: 0.05, r: 0.12, vol: 0.04, del: 0.4, rev: 0.25 },
  pluckSaw:  { wave: 'sawtooth', cutoff: 1800, fenv: 2600, fdecay: 0.05, a: 0.002, d: 0.14, s: 0.05, r: 0.1, vol: 0.045, del: 0.35, rev: 0.2 },
  kanun:     { wave: 'triangle', detune: [0, 7], cutoff: 3000, a: 0.002, d: 0.25, s: 0, r: 0.25, vol: 0.08, del: 0.3, rev: 0.4 },
  subBass:   { wave: 'triangle', cutoff: 700, a: 0.01, d: 0.3, s: 0.7, r: 0.15, vol: 0.26 },
  sawBass:   { wave: 'sawtooth', cutoff: 260, fenv: 1300, fdecay: 0.07, q: 3, a: 0.003, d: 0.15, s: 0.55, r: 0.08, vol: 0.17 },
  roundBass: { wave: 'sine', detune: [0, 1200], cutoff: 900, a: 0.01, d: 0.4, s: 0.6, r: 0.2, vol: 0.22 },
  bell:      { wave: 'sine', detune: [0, 1200, 1902], cutoff: 6000, a: 0.004, d: 0.9, s: 0.12, r: 1.2, vol: 0.085, rev: 0.7, del: 0.3 },
  synLead:   { wave: 'square', detune: [-5, 5], cutoff: 2200, a: 0.02, d: 0.3, s: 0.7, r: 0.25, vol: 0.05, vib: [5.5, 14], del: 0.3, rev: 0.35 },
  reed:      { wave: 'sawtooth', ftype: 'bandpass', cutoff: 1300, q: 1.6, a: 0.06, d: 0.3, s: 0.8, r: 0.3, vol: 0.16, vib: [5, 18], rev: 0.5, del: 0.2 },
  flute:     { wave: 'sine', detune: [0, 1200], cutoff: 3000, a: 0.07, d: 0.3, s: 0.85, r: 0.35, vol: 0.085, vib: [4.5, 12], rev: 0.55, del: 0.25 },
  brass:     { wave: 'sawtooth', detune: [-7, 7], cutoff: 1500, fenv: 900, fdecay: 0.15, a: 0.04, d: 0.4, s: 0.75, r: 0.3, vol: 0.06, vib: [5, 10], rev: 0.45, del: 0.2 },
  choir:     { wave: 'sawtooth', ftype: 'bandpass', detune: [-10, 10], cutoff: 900, q: 2.2, a: 0.5, d: 1, s: 0.9, r: 1.5, vol: 0.13, rev: 0.85, vib: [4, 8] },
};

// The leitmotif — "the Embersong". It returns in the finale and the endings.
const MOTIF = [
  'D5 - F5 - A5 - G5 F5',
  'F5 - - - D5 - - -',
  'C5 - F5 - A5 - C6 -',
  'Bb5 - A5 - G5 - E5 -',
];

export const SONGS = {
  // ----------------------------------------------------------------- TITLE
  title: {
    bpm: 84, sub: 2,
    chords: [ch('D3 F3 A3'), ch('Bb2 D3 F3'), ch('F3 A3 C4'), ch('C3 E3 G3')],
    tracks: [
      { type: 'pad', inst: I.warmPad, oct: 12 },
      { type: 'bass', pat: 'x.......x.....x.', len: 6, inst: I.subBass, oct: -12 },
      { type: 'arp', rate: 2, seq: [0, 1, 2, 3, 4, 3, 2, 1], inst: I.piano, oct: 12 },
      { type: 'lead', res: 8, mel: MOTIF, inst: I.bell },
      { type: 'drums', kick: 'x.......x.......', shk: '..x...x...x...x.', vol: 0.7 },
    ],
  },

  // -------------------------------------------- I. THE DROWNED COAST (A min)
  coast: {
    bpm: 72, sub: 2,
    chords: [ch('A2 C3 E3'), ch('F2 A2 C3'), ch('C3 E3 G3'), ch('G2 B2 D3'),
             ch('A2 C3 E3'), ch('F2 A2 C3'), ch('G2 B2 D3'), ch('E2 G#2 B2')],
    tracks: [
      { type: 'pad', inst: I.glassPad, oct: 12 },
      { type: 'bass', layer: 1, pat: 'x.......x...x...', len: 6, inst: I.roundBass, oct: -12 },
      { type: 'arp', layer: 2, rate: 2, seq: [0, 1, 2, 3, 4, 3, 2, 1], inst: I.piano, oct: 12 },
      { type: 'drums', layer: 3, kick: 'x.......x.......', clap: '........x.......', shk: '..x...x...x...x.', vol: 0.65 },
      { type: 'lead', layer: 4, res: 8, inst: I.bell, mel: [
        'E5 - - - D5 C5 - B4', 'C5 - A4 - - - - -', 'G4 - C5 - E5 - G5 -', 'F5 - E5 - D5 - - -',
        'E5 - - - D5 C5 - B4', 'C5 - A4 - - - E5 -', 'D5 - - C5 B4 - G4 -', 'B4 - - - G#4 - - -'] },
      { type: 'drums', layer: 5, hat: 'x.x.x.x.x.x.x.x.', tom: '.............xxx', vol: 0.6 },
      { type: 'arp', layer: 5, rate: 1, seq: [0, 2, 4, 2], inst: I.pluckSq, oct: 24 },
    ],
  },

  // -------------------------------------------- II. VELVET STATIC (E min)
  city: {
    bpm: 108, sub: 1,
    chords: [ch('E3 G3 B3'), ch('C3 E3 G3'), ch('G2 B2 D3'), ch('D3 F#3 A3')],
    tracks: [
      { type: 'pad', inst: I.neonPad, oct: 12 },
      { type: 'bass', layer: 1, pat: 'xoxoxoxoxoxoxoxo', len: 1, inst: I.sawBass, oct: -12 },
      { type: 'drums', layer: 2, kick: 'x...x...x...x...', snare: '....x.......x...', clap: '....x.......x...', ohat: '..x...x...x...x.', vol: 0.9 },
      { type: 'arp', layer: 3, rate: 1, seq: [0, 2, 1, 3, 2, 4, 3, 5], inst: I.pluckSaw, oct: 12 },
      { type: 'lead', layer: 4, res: 8, inst: I.synLead, mel: [
        'B4 - E5 - G5 - F#5 E5', '- - G5 - E5 - D5 -', 'D5 - - - B4 - G4 -', 'A4 - - - F#4 - - -',
        'B4 - E5 - G5 - B5 -', 'A5 - G5 - E5 - G5 -', 'F#5 - - - D5 - B4 -', 'A4 - B4 - F#4 - - -'] },
      { type: 'drums', layer: 5, hat: 'xxxxxxxxxxxxxxxx', vol: 0.5 },
    ],
  },

  // ------------------------------- III. THE GLASS DESERT (E phrygian dom.)
  desert: {
    bpm: 96, sub: 1,
    chords: [ch('E3 G#3 B3'), ch('F3 A3 C4'), ch('D3 F3 A3'), ch('E3 G#3 B3')],
    tracks: [
      { type: 'pad', inst: I.darkPad, oct: 12 },
      { type: 'bass', layer: 1, pat: 'x..x..x.x..x..x.', len: 2, inst: I.subBass, oct: -12 },
      { type: 'drums', layer: 2, ltom: 'x.....x...x.....', tom: '...x.x..x..x.x.x', shk: 'x.xxx.xxx.xxx.xx', vol: 0.85 },
      { type: 'arp', layer: 3, rate: 2, seq: [0, 1, 2, 1, 3, 2, 1, 2], inst: I.kanun, oct: 12 },
      { type: 'lead', layer: 4, res: 8, inst: I.reed, mel: [
        'E5 - F5 - G#5 - A5 G#5', 'F5 - E5 - - - - -', 'D5 - F5 - A5 - F5 E5', 'E5 - - - - - - -',
        'B4 - C5 - B4 - G#4 A4', 'C5 - - - A4 - F4 -', 'F4 - G#4 - A4 - B4 C5', 'B4 - - - E4 - - -'] },
      { type: 'drums', layer: 5, kick: 'x...x...x...x...', clap: '....x.......x...', vol: 0.8 },
    ],
  },

  // ---------------------------------------------- IV. THE ROOTDEEP (C maj7, lo-fi)
  forest: {
    bpm: 82, sub: 2, swing: 0.16,
    chords: [ch('F3 A3 C4 E4'), ch('E3 G3 B3 D4'), ch('D3 F3 A3 C4'), ch('C3 E3 G3 B3')],
    tracks: [
      { type: 'pad', inst: I.ePiano },
      { type: 'bass', layer: 1, pat: 'x.....x...x.....', len: 4, inst: I.roundBass, oct: -12 },
      { type: 'drums', layer: 2, kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', vol: 0.75 },
      { type: 'arp', layer: 3, rate: 2, seq: [3, 2, 0, 1, 3, 4, 2, 1], inst: I.kalimba, oct: 12 },
      { type: 'lead', layer: 4, res: 8, inst: I.flute, mel: [
        'A5 - G5 E5 - - C5 -', 'D5 - - B4 - - G4 -', 'F5 - E5 - D5 - C5 -', 'E5 - - - - - - -',
        'C6 - B5 A5 - - E5 -', 'G5 - - E5 - D5 B4 -', 'A4 - C5 - D5 - F5 -', 'E5 - D5 - C5 - - -'] },
      { type: 'drums', layer: 5, shk: '..x...x...x...x.', tom: '..............xx', vol: 0.7 },
    ],
  },

  // ----------------------------------------------- V. THE AURORA SPIRE (C min)
  aurora: {
    bpm: 120, sub: 1,
    chords: [ch('C3 Eb3 G3'), ch('Ab2 C3 Eb3'), ch('Eb3 G3 Bb3'), ch('Bb2 D3 F3')],
    tracks: [
      { type: 'pad', inst: I.neonPad, oct: 12 },
      { type: 'arp', layer: 1, rate: 1, seq: [0, 1, 2, 3, 4, 5, 4, 3], inst: I.pluckSq, oct: 12 },
      { type: 'bass', layer: 2, pat: 'x.o.x.o.x.o.x.o.', len: 2, inst: I.sawBass, oct: -12 },
      { type: 'drums', layer: 3, kick: 'x...x...x...x...', snare: '....x.......x...', ohat: '..x...x...x...x.', vol: 0.9 },
      { type: 'lead', layer: 4, res: 8, inst: I.brass, mel: [
        'G5 - - - Eb5 - C5 -', 'Ab5 - - - G5 - Eb5 -', 'Bb5 - - - G5 - Eb5 -', 'F5 - - - D5 - Bb4 -',
        'C6 - Bb5 - G5 - Eb5 -', 'F5 - Eb5 - C5 - Eb5 -', 'G5 - - - Bb5 - - -', 'D6 - - - - - - -'] },
      { type: 'pad', layer: 4, inst: I.choir },
      { type: 'drums', layer: 5, hat: 'xxxxxxxxxxxxxxxx', tom: '............xxxx', vol: 0.55 },
    ],
  },

  // -------------------------------------------- VI. THE HUSH (D min, sparse)
  hush: {
    bpm: 66, sub: 2,
    chords: [ch('D3 F3 A3'), ch('Bb2 D3 F3 A3'), ch('G2 Bb2 D3'), ch('A2 C#3 E3')],
    tracks: [
      { type: 'pad', inst: I.darkPad, oct: 12 },
      { type: 'arp', layer: 1, rate: 2, seq: [0, 1, 2, 3, 2, 1], inst: I.piano, oct: 12 },
      { type: 'bass', layer: 2, pat: 'x.......x.......', len: 8, inst: I.roundBass, oct: -12 },
      { type: 'drums', layer: 2, kick: 'x.......x.......', clap: '........x.......', vol: 0.6 },
      { type: 'lead', layer: 3, res: 8, inst: I.reed, mel: [
        'A4 - - - C5 - D5 -', 'D5 - - - - - C5 -', 'Bb4 - - - A4 - G4 -', 'A4 - - - - - - -'] },
      { type: 'lead', layer: 4, res: 8, inst: I.bell, mel: [
        'D5 - F5 - A5 - G5 F5', 'F5 - - - D5 - - -', 'D5 - G5 - Bb5 - A5 G5', 'E5 - - - C#5 - - -'] },
    ],
  },

  // ---------------------------------------------------------- FINALE (D min)
  finale: {
    bpm: 132, sub: 1,
    chords: [ch('D3 F3 A3'), ch('Bb2 D3 F3'), ch('F3 A3 C4'), ch('C3 E3 G3'),
             ch('D3 F3 A3'), ch('Bb2 D3 F3'), ch('C3 E3 G3'), ch('A2 C#3 E3')],
    tracks: [
      { type: 'pad', inst: I.neonPad, oct: 12 },
      { type: 'pad', inst: I.choir },
      { type: 'bass', pat: 'xoxoxoxoxoxoxoxo', len: 1, inst: I.sawBass, oct: -12 },
      { type: 'drums', kick: 'x...x...x...x.x.', snare: '....x.......x...', clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', vol: 0.9 },
      { type: 'arp', rate: 1, seq: [0, 1, 2, 3, 4, 3, 2, 1], inst: I.pluckSaw, oct: 12 },
      { type: 'lead', res: 8, inst: I.brass, mel: [...MOTIF,
        'D6 - - - A5 - F5 -', 'Bb5 - A5 - G5 - F5 -', 'E5 - G5 - C6 - Bb5 -', 'A5 - - - C#6 - - -'] },
    ],
  },

  // ------------------------------------------------- TRUE ENDING (D major)
  ending: {
    bpm: 70, sub: 2,
    chords: [ch('D3 F#3 A3'), ch('B2 D3 F#3'), ch('G2 B2 D3'), ch('A2 C#3 E3')],
    tracks: [
      { type: 'pad', inst: I.glassPad, oct: 12 },
      { type: 'pad', inst: I.choir },
      { type: 'bass', pat: 'x.......x.......', len: 8, inst: I.roundBass, oct: -12 },
      { type: 'arp', rate: 2, seq: [0, 1, 2, 3, 4, 3, 2, 1], inst: I.piano, oct: 12 },
      { type: 'lead', res: 8, inst: I.bell, mel: [
        'D5 - F#5 - A5 - G5 F#5', 'F#5 - - - D5 - . .', 'D5 - G5 - B5 - A5 -', 'A5 - - - . . . .',
        'A5 - - - F#5 - D5 -', 'B4 - D5 - F#5 - . .', 'G5 - F#5 - E5 - D5 -', 'E5 - - - . . . .'] },
      { type: 'drums', shk: '..x...x...x...x.', vol: 0.5 },
    ],
  },

  // --------------------------------------- "FORTISSIMO" ENDING (never rests)
  fortissimo: {
    bpm: 150, sub: 1,
    chords: [ch('D3 F#3 A3'), ch('B2 D3 F#3'), ch('G2 B2 D3'), ch('A2 C#3 E3')],
    tracks: [
      { type: 'pad', inst: I.neonPad, oct: 12 },
      { type: 'bass', pat: 'xoxoxoxoxoxoxoxo', len: 1, inst: I.sawBass, oct: -12 },
      { type: 'drums', kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', vol: 0.85 },
      { type: 'arp', rate: 1, seq: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], inst: I.pluckSaw, oct: 12 },
      { type: 'lead', res: 8, inst: I.synLead, mel: [
        'D5 F#5 A5 F#5 D5 F#5 A5 D6', 'B4 D5 F#5 D5 B4 D5 F#5 B5', 'G4 B4 D5 B4 G4 B4 D5 G5', 'A4 C#5 E5 C#5 A4 C#5 E5 A5'] },
    ],
  },
};
