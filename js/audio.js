// Procedural audio engine: a look-ahead step sequencer + subtractive synth +
// drum machine + SFX, all built on the Web Audio API. No audio files.
import { SONGS } from './songs.js';

const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function midi(s) {
  if (typeof s === 'number') return s;
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(s);
  if (!m) throw new Error('bad note ' + s);
  return NOTE_IDX[m[1]] + (+m[2] + 1) * 12;
}
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Pre-parse songs once (note names -> midi, melodies -> events)
for (const s of Object.values(SONGS)) {
  s.chords = s.chords.map((c) => c.map(midi).sort((a, b) => a - b));
  for (const tr of s.tracks) {
    if (tr.type !== 'lead') continue;
    const res = tr.res || 8, spt = 16 / res;
    const toks = tr.mel.join(' ').trim().split(/\s+/);
    const ev = new Array(toks.length * spt).fill(null);
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (tk === '-' || tk === '.') continue;
      let hold = 1;
      while (toks[(i + hold) % toks.length] === '-' && hold < toks.length) hold++;
      ev[i * spt] = { m: midi(tk) + (tr.oct || 0), d: hold * spt };
    }
    tr._ev = ev;
  }
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.song = null; this.songName = '';
    this.layers = 0; this.step = 0; this.nextTime = 0; this.queue = [];
    this.musicVol = 0.8; this.sfxVol = 0.8;
    this.silenced = false; this.heartbeat = false;
    this.bpm = 100; this.tempo = 1;
    this.lastStep = { time: 0, step: 0 };
    this.clockSrc = 'perf';
    this._last = {};
  }

  get running() { return !!this.ctx && this.ctx.state === 'running'; }
  get time() { return this.running ? this.ctx.currentTime : performance.now() / 1000; }
  get stepDur() { return 60 / this.bpm / 4; }

  // Must be called from a user gesture (iOS/Chrome autoplay policy).
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
      this._build();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    // iOS: play a silent buffer inside the gesture
    try {
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    } catch (e) { /* ignore */ }
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  _build() {
    const ctx = this.ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.95;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.22;
    this.master.connect(comp); comp.connect(ctx.destination);

    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVol * 0.75;
    this.musicFilter = ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000; this.musicFilter.Q.value = 0.5;
    this.songGain = ctx.createGain(); this.songGain.gain.value = 1;
    this.songGain.connect(this.musicFilter); this.musicFilter.connect(this.musicBus); this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxVol * 0.6; this.sfxBus.connect(this.master);

    // shared reverb
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this._ir(3.0, 2.6);
    this.revIn = ctx.createGain(); this.revIn.gain.value = 0.5;
    this.revIn.connect(this.reverb); this.reverb.connect(this.songGain);
    this.sfxRev = ctx.createGain(); this.sfxRev.gain.value = 0.35;
    this.sfxRev.connect(this.reverb);

    // tempo-ish delay
    this.delay = ctx.createDelay(1.5); this.delay.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    this.delIn = ctx.createGain(); this.delIn.gain.value = 0.5;
    this.delIn.connect(this.delay); this.delay.connect(dlp); dlp.connect(fb); fb.connect(this.delay);
    dlp.connect(this.songGain);

    this.drumBus = ctx.createGain(); this.drumBus.gain.value = 0.9; this.drumBus.connect(this.songGain);

    // white noise
    const len = ctx.sampleRate * 1;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  _ir(sec, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * sec);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(music * 0.75, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx * 0.6, t, 0.05);
  }

  // Lowpass the whole soundtrack (pause menu, underwater, silence phase…)
  muffle(amount, time = 0.4) {
    if (!this.ctx) return;
    const f = amount <= 0 ? 20000 : 20000 * Math.pow(1 - amount, 3) + 250;
    this.musicFilter.frequency.setTargetAtTime(f, this.ctx.currentTime, time / 3);
  }

  // ------------------------------------------------------------- sequencer
  playSong(name, opts = {}) {
    const s = SONGS[name];
    if (!s) return;
    if (this.song === s && !opts.restart) { if (opts.tempo) this.tempo = opts.tempo, this.bpm = s.bpm * this.tempo; return; }
    this.song = s; this.songName = name;
    this.tempo = opts.tempo || 1;
    this.bpm = s.bpm * this.tempo;
    this.step = 0; this.queue.length = 0;
    this.nextTime = this.time + 0.08;
    this.silenced = false; this.heartbeat = false;
    if (this.ctx) {
      const t = this.ctx.currentTime, g = this.songGain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.0001, t);
      g.exponentialRampToValueAtTime(1, t + (opts.fade ?? 1.0));
    }
  }

  setTempo(m) { if (this.song) { this.tempo = m; this.bpm = this.song.bpm * m; } }
  stop() { this.song = null; this.queue.length = 0; }

  // call every frame
  update() {
    const src = this.running ? 'ctx' : 'perf';
    if (src !== this.clockSrc) { this.clockSrc = src; this.nextTime = this.time + 0.05; this.queue.length = 0; }
    if (!this.song) return;
    const now = this.time;
    if (this.nextTime < now - 0.5) this.nextTime = now + 0.02; // after stalls, don't burst
    const ahead = 0.16;
    while (this.nextTime < now + ahead) {
      if (this.running) this._schedule(this.step, this.nextTime);
      this.queue.push({ time: this.nextTime, step: this.step });
      let dur = this.stepDur;
      if (this.song.swing) dur *= this.step % 2 === 0 ? 1 + this.song.swing : 1 - this.song.swing;
      this.nextTime += dur;
      this.step++;
    }
    if (this.queue.length > 64) this.queue.splice(0, this.queue.length - 64);
  }

  // Steps whose time has arrived (game uses these for beat-synced action)
  poll() {
    const out = [], t = this.time;
    while (this.queue.length && this.queue[0].time <= t) {
      const e = this.queue.shift();
      this.lastStep = e; out.push(e.step);
    }
    return out;
  }

  // 0..1 phase within the current quarter note
  beatPhase() {
    const st = this.lastStep.step % 4;
    const el = (this.time - this.lastStep.time) / this.stepDur;
    return Math.min(1, (st + el) / 4);
  }

  chordAt(step = this.lastStep.step) {
    if (!this.song) return [62, 65, 69];
    const c = this.song.chords;
    return c[Math.floor(step / 16) % c.length];
  }

  _schedule(step, t) {
    const s = this.song, st = step % 16, bar = Math.floor(step / 16);
    const chord = s.chords[bar % s.chords.length];
    const sd = this.stepDur;
    if (this.silenced) {
      if (this.heartbeat && st === 0) { this.kick(t, 0.55, 70, this.drumBus); this.kick(t + 0.26, 0.38, 60, this.drumBus); }
      return;
    }
    for (const tr of s.tracks) {
      if ((tr.layer || 0) > this.layers) continue;
      switch (tr.type) {
        case 'pad':
          if (st === 0) for (const m of chord) this.voice(mtof(m + (tr.oct || 0)), t, sd * 16 * 0.97, tr.inst, this.songGain);
          break;
        case 'bass': {
          const c = tr.pat[st];
          if (c && c !== '.') {
            let m = chord[0] + (tr.oct ?? -12);
            if (c === 'o') m += 12; else if (c === '5') m += 7;
            this.voice(mtof(m), t, sd * (tr.len || 1) * 0.95, tr.inst, this.songGain);
          }
          break;
        }
        case 'arp': {
          const rate = tr.rate || 1;
          if (st % rate === 0) {
            const k = Math.floor(step / rate);
            const idx = tr.seq[k % tr.seq.length];
            const n = chord.length;
            const m = chord[idx % n] + 12 * Math.floor(idx / n) + (tr.oct || 0);
            this.voice(mtof(m), t, sd * rate * 0.9, tr.inst, this.songGain);
          }
          break;
        }
        case 'lead': {
          const ev = tr._ev[step % tr._ev.length];
          if (ev) this.voice(mtof(ev.m), t, ev.d * sd * 0.96, tr.inst, this.songGain);
          break;
        }
        case 'drums': {
          const v = tr.vol ?? 1;
          for (const k of DRUM_KEYS) {
            const c = tr[k] && tr[k][st];
            if (c && c !== '.') this.drum(k, t, (c === 'X' ? 1.25 : 1) * v);
          }
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------- synthesis
  voice(freq, t, dur, p, out) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = p.ftype || 'lowpass'; f.frequency.value = p.cutoff || 2000; f.Q.value = p.q || 0.7;
    const dets = p.detune || [0];
    const a = p.a ?? 0.005, dc = p.d ?? 0.1, s = p.s ?? 0.6, r = p.r ?? 0.2;
    const vol = (p.vol ?? 0.1) / Math.sqrt(dets.length);
    const end = t + Math.max(dur, a + 0.02);
    const stopAt = end + r * 3 + 0.05;
    let lfo = null;
    if (p.vib) {
      lfo = ctx.createOscillator(); lfo.frequency.value = p.vib[0];
      const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(p.vib[1], t + 0.25);
      lfo.connect(lg); lfo._g = lg; lfo.start(t); lfo.stop(stopAt);
    }
    for (const d of dets) {
      const o = ctx.createOscillator();
      o.type = p.wave || 'sawtooth';
      o.frequency.value = freq; o.detune.value = d;
      if (lfo) lfo._g.connect(o.detune);
      o.connect(f); o.start(t); o.stop(stopAt);
    }
    if (p.fenv) {
      f.frequency.setValueAtTime(p.cutoff + p.fenv, t);
      f.frequency.setTargetAtTime(p.cutoff, t, p.fdecay || 0.1);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setTargetAtTime(vol * s, t + a, Math.max(0.01, dc / 3));
    g.gain.setTargetAtTime(0, end, Math.max(0.01, r / 3));
    f.connect(g);
    let node = g;
    if (p.trem) {
      const tg = ctx.createGain(), to = ctx.createOscillator(), td = ctx.createGain();
      to.frequency.value = p.trem; td.gain.value = 0.25; tg.gain.value = 0.75;
      to.connect(td); td.connect(tg.gain); to.start(t); to.stop(stopAt);
      g.connect(tg); node = tg;
    }
    node.connect(out);
    if (p.rev && this.revIn) { const sg = ctx.createGain(); sg.gain.value = p.rev; node.connect(sg); sg.connect(out === this.sfxBus ? this.sfxRev : this.revIn); }
    if (p.del && this.delIn && out !== this.sfxBus) { const sg = ctx.createGain(); sg.gain.value = p.del; node.connect(sg); sg.connect(this.delIn); }
  }

  _noise(t, dur, type, freq, q, vol, out, attack = 0.001) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    return f;
  }

  kick(t, v = 1, f0 = 150, out = this.drumBus) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.45);
  }

  _tone(t, f0, f1, dur, vol, wave, out) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }

  drum(k, t, v) {
    const b = this.drumBus;
    switch (k) {
      case 'kick': this.kick(t, v); break;
      case 'snare':
        this._noise(t, 0.2, 'highpass', 1400, 0.7, 0.32 * v, b);
        this._tone(t, 220, 160, 0.1, 0.25 * v, 'triangle', b);
        { const sg = this.ctx.createGain(); sg.gain.value = 0.4; this._noise(t, 0.25, 'bandpass', 2500, 0.8, 0.2 * v, sg); sg.connect(this.revIn); }
        break;
      case 'clap':
        for (let i = 0; i < 3; i++) this._noise(t + i * 0.011, 0.09 + i * 0.03, 'bandpass', 1300, 1.2, 0.28 * v, b);
        break;
      case 'hat': this._noise(t, 0.045, 'highpass', 8000, 0.8, 0.1 * v, b); break;
      case 'ohat': this._noise(t, 0.26, 'highpass', 7500, 0.8, 0.09 * v, b); break;
      case 'shk': this._noise(t, 0.06, 'bandpass', 6500, 1.5, 0.07 * v, b, 0.012); break;
      case 'tom': this._tone(t, 420, 260, 0.16, 0.35 * v, 'sine', b); this._noise(t, 0.03, 'bandpass', 3000, 2, 0.1 * v, b); break;
      case 'ltom': this._tone(t, 170, 95, 0.32, 0.6 * v, 'sine', b); break;
    }
  }

  // ------------------------------------------------------------------- SFX
  _ok(name, gap) {
    if (!this.running) return false;
    const t = this.ctx.currentTime;
    if (gap && this._last[name] && t - this._last[name] < gap) return false;
    this._last[name] = t;
    return true;
  }

  sfx(name, arg) {
    if (!this._ok(name, SFX_GAP[name] || 0)) return;
    const ctx = this.ctx, t = ctx.currentTime, out = this.sfxBus;
    const chord = this.chordAt();
    switch (name) {
      case 'shot': {
        const m = chord[(arg || 0) % chord.length] + 36;
        this.voice(mtof(m), t, 0.03, { wave: 'triangle', cutoff: 5000, a: 0.001, d: 0.05, s: 0, r: 0.05, vol: 0.028 }, out);
        break;
      }
      case 'hit': this._noise(t, 0.035, 'highpass', 4000, 1, 0.05, out); break;
      case 'kill': {
        const m = chord[Math.floor(Math.random() * chord.length)] + 24;
        this.voice(mtof(m), t, 0.05, { wave: 'sine', detune: [0, 1902], cutoff: 6000, a: 0.002, d: 0.4, s: 0, r: 0.4, vol: 0.09, rev: 0.6 }, out);
        this._noise(t, 0.18, 'lowpass', 1800, 0.7, 0.12, out);
        break;
      }
      case 'boom': {
        const f = this._noise(t, 0.9, 'lowpass', 2400, 0.8, 0.5, out);
        f.frequency.exponentialRampToValueAtTime(120, t + 0.8);
        this.kick(t, 1, 110, out);
        break;
      }
      case 'bigboom': {
        const f = this._noise(t, 2.8, 'lowpass', 3000, 0.9, 0.7, out);
        f.frequency.exponentialRampToValueAtTime(60, t + 2.6);
        this.kick(t, 1.2, 90, out); this.kick(t + 0.18, 0.9, 70, out);
        for (let i = 0; i < 6; i++) {
          const m = chord[i % chord.length] + 24 + 12 * Math.floor(i / 3);
          this.voice(mtof(m), t + 0.3 + i * 0.09, 0.2, { wave: 'sine', detune: [0, 1200], a: 0.002, d: 1, s: 0, r: 1, vol: 0.08, rev: 0.8 }, out);
        }
        break;
      }
      case 'hurt':
        this._tone(t, 500, 70, 0.45, 0.25, 'sawtooth', out);
        this._noise(t, 0.3, 'lowpass', 900, 1, 0.3, out);
        break;
      case 'graze': this.voice(mtof(chord[2 % chord.length] + 48), t, 0.02, { wave: 'sine', a: 0.001, d: 0.04, s: 0, r: 0.04, vol: 0.03 }, out); break;
      case 'pickup': this.voice(mtof(chord[0] + 36 + (arg || 0)), t, 0.02, { wave: 'sine', a: 0.001, d: 0.08, s: 0, r: 0.08, vol: 0.035 }, out); break;
      case 'power':
        for (let i = 0; i < 5; i++) this.voice(mtof(chord[i % chord.length] + 24 + 12 * Math.floor(i / chord.length)), t + i * 0.05, 0.08, { wave: 'square', cutoff: 3000, a: 0.002, d: 0.12, s: 0.2, r: 0.15, vol: 0.04 }, out);
        break;
      case 'echo':
        for (let i = 0; i < 8; i++) {
          const m = chord[i % chord.length] + 24 + 12 * Math.floor(i / chord.length);
          this.voice(mtof(m), t + i * 0.07, 0.3, { wave: 'sine', detune: [0, 1200, 1902], a: 0.003, d: 1.2, s: 0, r: 1.4, vol: 0.09, rev: 0.9 }, out);
        }
        break;
      case 'crescendo': {
        const f = this._noise(t, 1.4, 'bandpass', 400, 1.2, 0.3, out, 0.4);
        f.frequency.exponentialRampToValueAtTime(6000, t + 1.0);
        for (const m of chord) this.voice(mtof(m + 12), t, 1.4, { wave: 'sawtooth', detune: [-10, 10], cutoff: 2400, a: 0.3, d: 1, s: 0.8, r: 1.2, vol: 0.09, rev: 0.8 }, out);
        this.kick(t + 0.45, 1, 120, out);
        break;
      }
      case 'warn':
        for (let i = 0; i < 3; i++) this.voice(mtof(chord[0] + 12), t + i * 0.5, 0.3, { wave: 'square', cutoff: 1200, a: 0.01, d: 0.3, s: 0.6, r: 0.2, vol: 0.06, rev: 0.6 }, out);
        break;
      case 'ui': this.voice(mtof(81), t, 0.03, { wave: 'triangle', a: 0.001, d: 0.08, s: 0, r: 0.08, vol: 0.06 }, out); break;
      case 'select':
        this.voice(mtof(76), t, 0.04, { wave: 'triangle', a: 0.001, d: 0.1, s: 0, r: 0.1, vol: 0.06 }, out);
        this.voice(mtof(83), t + 0.06, 0.06, { wave: 'triangle', a: 0.001, d: 0.15, s: 0, r: 0.15, vol: 0.06, rev: 0.5 }, out);
        break;
      case 'blip': this.voice(mtof(arg || 72) * (0.97 + Math.random() * 0.06), t, 0.02, { wave: 'square', cutoff: 2200, a: 0.001, d: 0.03, s: 0, r: 0.03, vol: 0.022 }, out); break;
      case 'swell':
        for (const m of chord) this.voice(mtof(m + 12), t, 2.5, { wave: 'triangle', detune: [-6, 6], a: 1.2, d: 1, s: 0.9, r: 2, vol: 0.08, rev: 0.9 }, out);
        break;
    }
  }
}

const DRUM_KEYS = ['kick', 'snare', 'clap', 'hat', 'ohat', 'shk', 'tom', 'ltom'];
const SFX_GAP = { shot: 0.05, hit: 0.04, kill: 0.03, graze: 0.05, pickup: 0.03, blip: 0.035, boom: 0.08 };

export const audio = new AudioEngine();
