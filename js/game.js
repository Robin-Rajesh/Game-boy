// Core gameplay: player, beat-synced shooting, enemies, bullets, bosses, FX.
import { audio } from './audio.js';
import { CHAPTERS, COMPANIONS } from './story.js';
import { makeBackground } from './backgrounds.js';
import { KINDS, drawEnemy } from './enemies.js';
import { BOSSES } from './bosses.js';
import { buildLevel } from './levels.js';
import { TAU, clamp, lerp, rand, ease, glow, bulletSprite, glowSprite, rgba, drawVignette } from './gfx.js';

export const DIFF = {
  story:  { hp: 9, bspd: 0.72, dens: 0.5, bossHp: 0.65, label: 'Story' },
  normal: { hp: 6, bspd: 0.88, dens: 0.82, bossHp: 0.85, label: 'Normal' },
  hard:   { hp: 4, bspd: 1.05, dens: 1.1, bossHp: 1.05, label: 'Fortissimo' },
};

const ROMAN = ['I', 'II', 'III', 'IV'];

export class Game {
  constructor(app) {
    this.app = app;
    this.W = 360; this.H = 640;
    this.time = 0; this.beat = 0; this.shake = 0; this.flash = null; this.slowmo = 1;
    this.colorAmt = 1; this.colorTarget = 1;
    this.mode = 'title'; this.running = false;
    this.bg = makeBackground('title', this.W, this.H);
    this.clear();
  }

  clear() {
    this.bullets = []; this.shots = []; this.enemies = []; this.parts = []; this.pickups = [];
    this.timers = []; this.zones = []; this.wells = []; this.beams = []; this.rings = []; this.texts = [];
    this.boss = null; this.player = null; this.companions = [];
    this.wind = 0; this.windTarget = 0; this.stepCount = 0; this.halfShot = -1; this.shotIdx = 0;
  }

  resize(H) { this.H = H; if (this.bg) this.bg.H = H; }

  // ------------------------------------------------------------ scenes
  showTitle() {
    this.clear(); this.mode = 'title'; this.running = false;
    this.bg = makeBackground('title', this.W, this.H);
    this.colorAmt = this.colorTarget = 1;
    this.ch = null;
  }

  // Story scene: chapter background with Lio idling (no simulation)
  showScene(ci, companions = []) {
    this.clear(); this.mode = 'story'; this.running = false;
    this.ci = ci; this.ch = CHAPTERS[ci];
    this.bg = makeBackground(this.ch.bg, this.W, this.H);
    this.colorAmt = this.colorTarget = this.ch.modifier === 'grey' ? 0.15 : 1;
    this.player = this.makePlayer(5, 1);
    this.player.y = this.H * 0.62;
    this.setCompanions(companions);
  }

  setScene(id) {
    this.bg = makeBackground(id, this.W, this.H);
    this.colorAmt = this.colorTarget = 1;
    this.flash = { col: '#ffffff', a: 0.9 };
  }

  makePlayer(hp, power) {
    return { x: this.W / 2, y: this.H * 0.8, hp, maxHp: hp, inv: 2.5, power, cres: 0, alive: true, fire: true };
  }

  setCompanions(ids) {
    this.companions = ids.map((id, i) => ({ id, color: COMPANIONS[id].color, i, x: this.W / 2, y: this.H, trail: [] }));
  }

  addCompanion(id) {
    if (this.companions.some((c) => c.id === id)) return;
    const p = this.player || { x: this.W / 2, y: this.H * 0.7 };
    this.companions.push({ id, color: COMPANIONS[id].color, i: this.companions.length, x: p.x, y: p.y, trail: [] });
    this.burst(p.x, p.y, COMPANIONS[id].color, 50, 260, 8);
    this.ringFx(p.x, p.y, COMPANIONS[id].color, 160);
    audio.sfx('echo');
  }

  start(ci, opt = {}) {
    this.clear();
    this.ci = ci; this.ch = CHAPTERS[ci];
    this.diffKey = opt.difficulty || 'normal';
    this.diff = DIFF[this.diffKey];
    this.level = buildLevel(ci, this.ch, this.W);
    this.evIdx = 0; this.levelT = 0;
    this.bg = makeBackground(this.ch.bg, this.W, this.H);
    this.colorAmt = this.colorTarget = this.ch.modifier === 'grey' ? 0.12 : 1;
    this.player = this.makePlayer(this.diff.hp, opt.power || 1);
    this.setCompanions(opt.companions || []);
    this.echoes = 0; audio.layers = 0;
    this.score = 0; this.mult = 1; this.chain = 0; this.maxMult = 1;
    this.grazes = 0; this.hits = 0; this.kills = 0; this.playTime = 0;
    this.mode = 'play'; this.running = true;
    this.scrollSpeed = 70;
    this.reachedBoss = false;
    this.baseTempo = 1;
    audio.playSong(this.ch.song, { restart: true });
    audio.muffle(0);
    if (opt.checkpoint) {
      // resume right before the boss
      this.evIdx = this.level.events.findIndex((e) => e.type === 'boss');
      this.levelT = this.level.length;
      this.echoes = 4; audio.layers = 4;
      this.player.power = Math.max(3, opt.power || 1);
      this.score = opt.score || 0;
      if (this.ch.modifier === 'grey') this.colorAmt = this.colorTarget = 1;
    }
  }

  timer(t, fn) { this.timers.push({ t, fn }); }

  // ------------------------------------------------------------ update
  update(dt) {
    this.time += dt;
    audio.update();
    const steps = audio.poll();
    this.beat = Math.max(0, this.beat - dt * 3.2);
    for (const s of steps) {
      if (s % 4 === 0) this.beat = 1;
      if (this.running) this.onStep(s);
    }
    const gdt = dt * this.slowmo;
    this.colorAmt += (this.colorTarget - this.colorAmt) * Math.min(1, dt * 0.8);
    this.shake = Math.max(0, this.shake - dt * 30);
    if (this.flash) { this.flash.a -= dt * 1.4; if (this.flash.a <= 0) this.flash = null; }

    this.bg.update(gdt, this.running ? this.scrollSpeed : 26);
    if ('wind' in this.bg) this.bg.wind = this.wind;

    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i]; tm.t -= dt;
      if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
    }

    this.updateCompanions(dt);
    if (!this.running) { this.updateParticles(gdt); this.idlePlayer(dt); return; }

    this.playTime += dt;
    if (this.mode === 'play') this.levelT += gdt;
    while (this.mode === 'play' && this.evIdx < this.level.events.length && this.level.events[this.evIdx].t <= this.levelT) {
      this.runEvent(this.level.events[this.evIdx++]);
    }

    if (this.halfShot > 0) { this.halfShot -= gdt; if (this.halfShot <= 0) this.firePlayer(); }

    this.wind += (this.windTarget - this.wind) * Math.min(1, gdt * 1.5);
    this.updatePlayer(gdt);
    this.updateShots(gdt);
    this.updateEnemies(gdt);
    if (this.boss) this.updateBoss(gdt);
    this.updateBullets(gdt);
    this.updateRings(gdt);
    this.updatePickups(gdt);
    this.updateHazards(gdt);
    this.updateParticles(gdt);
  }

  idlePlayer(dt) {
    const p = this.player;
    if (!p) return;
    p.inv = 0;
    p.x += (this.W / 2 + Math.sin(this.time * 0.8) * 18 - p.x) * dt * 2;
    if (Math.random() < 0.7) this.parts.push({ x: p.x + rand(-3, 3), y: p.y + 8, vx: rand(-10, 10), vy: rand(30, 70), life: 0.5, max: 0.5, size: rand(4, 8), col: '#ff8a2a', drag: 0.97 });
  }

  runEvent(ev) {
    switch (ev.type) {
      case 'wave': this.wave(ev); break;
      case 'echo': this.pickups.push({ type: 'echo', x: rand(this.W * 0.25, this.W * 0.75), x0: 0, y: -30, t: 0, idx: ev.idx }); { const pk = this.pickups[this.pickups.length - 1]; pk.x0 = pk.x; } break;
      case 'spark': if (this.player.power < 4) this.pickups.push({ type: 'spark', x: rand(60, this.W - 60), y: -20, t: 0 }); break;
      case 'heart': if (this.player.hp < this.player.maxHp) this.pickups.push({ type: 'heart', x: rand(60, this.W - 60), y: -20, t: 0 }); break;
      case 'say': this.app.say(ev.who, ev.text); break;
      case 'wind': this.windTarget = ev.v; this.app.toast(ev.v < 0 ? '« WIND «' : '» WIND »', '', 1.2); this.timer(4.5, () => { this.windTarget = 0; }); break;
      case 'zone': this.zones.push({ x: this.W * ev.x, y: -60, r: rand(46, 70), t: 0, ph: rand(TAU) }); break;
      case 'well': this.wells.push({ x: this.W * ev.x, y: -60, r: 120, str: 150, t: 0 }); break;
      case 'boss': this.startBoss(); break;
    }
  }

  wave(ev) {
    const { kind, form, n = 1 } = ev, W = this.W, H = this.H;
    const p = { ...ev };
    if (p.y1 && p.y1 <= 1) p.y1 *= H;
    const sp = (x, y) => this.spawn(kind, x, y, p);
    switch (form) {
      case 'line': for (let i = 0; i < n; i++) sp(W * (i + 1) / (n + 1) + (ev.offset ? W / (n + 1) / 2 - W / (n + 1) / 4 : 0), -20 - (i % 2) * 14); break;
      case 'v': { const m = (n - 1) / 2; for (let i = 0; i < n; i++) sp(W / 2 + (i - m) * 36, -20 - Math.abs(i - m) * 26); break; }
      case 'chain': for (let i = 0; i < n; i++) this.timer(i * 0.32, () => this.spawn(kind, ev.side < 0 ? -30 : W + 30, 0, { ...p })); break;
      case 'random': for (let i = 0; i < n; i++) this.timer(i * (ev.gap || 0.5), () => sp(rand(30, W - 30), -20)); break;
      case 'column': for (let i = 0; i < n; i++) this.timer(i * (ev.gap || 0.4), () => sp(W * ev.x, -20)); break;
      case 'at': sp(W * ev.x, -40); break;
    }
  }

  spawn(kind, x, y, p = {}) {
    const K = KINDS[kind];
    const hpm = 1 + this.ci * 0.1;
    const e = { kind, x, y, r: K.r, hp: K.hp * hpm, maxHp: K.hp * hpm, t: 0, ph: rand(TAU), off: Math.floor(rand(16)), flash: 0, alt: Math.random() < 0.5 };
    K.init(e, p, this);
    this.enemies.push(e);
    return e;
  }

  // ------------------------------------------------------- bullet helpers
  shoot(x, y, ang, spd, o = {}) {
    if (this.bullets.length > 1000) return;
    const s = spd * this.diff.bspd;
    this.bullets.push({
      x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, r: o.r || 4,
      col: o.col || (o.c === 2 ? this.ch.colors.bullet2 : this.ch.colors.bullet),
      curve: o.curve || 0, accel: o.accel || 0, min: o.min || 0, bounce: o.bounce ? 1 : 0,
      t: 0, grazed: false, dim: !!o.dim,
    });
  }
  aim(x, y) { const p = this.player; return Math.atan2(p.y - y, p.x - x); }
  ring(x, y, n, spd, rot = 0, o) { for (let i = 0; i < n; i++) this.shoot(x, y, rot + (i * TAU) / n, spd, o); }
  fan(x, y, ang, n, spread, spd, o) {
    if (n <= 1) return this.shoot(x, y, ang, spd, o);
    for (let i = 0; i < n; i++) this.shoot(x, y, ang - spread / 2 + (spread * i) / (n - 1), spd, o);
  }
  n(count) { return Math.max(1, Math.round(count * this.diff.dens)); }
  period(base) { return this.diff.dens < 0.8 ? base * 2 : base; }

  // ------------------------------------------------------------ the beat
  onStep(s) {
    this.stepCount = s;
    const p = this.player;
    const live = p && p.alive && p.fire && (this.mode === 'play' || this.mode === 'boss' || this.mode === 'bossWarn');
    if (live) {
      this.firePlayer();
      if (audio.song && audio.song.sub === 2) this.halfShot = audio.stepDur / 2;
      this.companions.forEach((c, i) => { if ((s + i) % 2 === 0) this.fireCompanion(c); });
    }
    for (const e of this.enemies) { const K = KINDS[e.kind]; if (K.step && !e.dead) K.step(e, s, this); }
    if (this.boss && !this.boss.entering && !this.boss.dying) this.bossStep(s);
    for (const b of this.beams) if (!b.fired && s >= b.fireStep) this.fireBeam(b);
    this.beams = this.beams.filter((b) => !b.fired);
  }

  firePlayer() {
    const p = this.player;
    if (!p || !p.alive || !p.fire) return;
    const sub = (audio.song && audio.song.sub) || 1;
    const dmg = 10 * (audio.stepDur / sub);
    const add = (dx, ang, col = '#fff1c4', m = 1) => this.shots.push({ x: p.x + dx, y: p.y - 10, vx: Math.sin(ang) * 700, vy: -Math.cos(ang) * 700, dmg: dmg * m, col, w: 3 });
    switch (p.power) {
      case 1: add(0, 0); break;
      case 2: add(-5, 0); add(5, 0); break;
      case 3: add(0, 0); add(-8, -0.09); add(8, 0.09); break;
      default: add(-4, 0); add(4, 0); add(-10, -0.12); add(10, 0.12); add(-13, -0.28, '#ffb35c', 0.6); add(13, 0.28, '#ffb35c', 0.6);
    }
    audio.sfx('shot', this.shotIdx++);
  }

  fireCompanion(c) {
    const dmg = 5.5 * audio.stepDur * 2;
    this.shots.push({ x: c.x, y: c.y, vx: rand(-60, 60), vy: -430, dmg, col: c.color, w: 2.5, homing: true, life: 2.2 });
  }

  // ------------------------------------------------------------ player
  updatePlayer(dt) {
    const p = this.player;
    const inp = this.app.input;
    const d = inp.consume();
    if (!p.alive) return;
    let slow = 1;
    for (const z of this.zones) if ((p.x - z.x) ** 2 + (p.y - z.y) ** 2 < z.r * z.r) slow = 0.45;
    p.slow = slow;
    p.x += d.x * inp.sens * slow; p.y += d.y * inp.sens * slow;
    const k = inp.axis();
    const spd = (inp.focus ? 120 : 250) * slow;
    p.x += k.x * spd * dt; p.y += k.y * spd * dt;
    p.x += this.wind * 0.55 * dt;
    for (const w of this.wells) {
      const dx = w.x - p.x, dy = w.y - p.y, dd = Math.hypot(dx, dy);
      if (dd < w.r * 1.2 && dd > 1) { p.x += (dx / dd) * 40 * dt; p.y += (dy / dd) * 40 * dt; }
    }
    p.x = clamp(p.x, 10, this.W - 10); p.y = clamp(p.y, 24, this.H - 16);
    p.inv -= dt;
    if (this.parts.length < 900) this.parts.push({ x: p.x + rand(-3, 3), y: p.y + 8, vx: rand(-14, 14), vy: rand(60, 110), life: 0.45, max: 0.45, size: rand(4, 8), col: slow < 1 ? '#8dff9a' : '#ff8a2a', drag: 0.96 });
    if (this.app.input.wantsCres()) this.crescendo();
  }

  updateCompanions(dt) {
    const p = this.player;
    if (!p) return;
    const n = this.companions.length;
    this.companions.forEach((c, i) => {
      const a = this.time * 1.7 + (i * TAU) / Math.max(1, n);
      const tx = p.x + Math.cos(a) * 30, ty = p.y + Math.sin(a) * 18 + 6;
      c.x += (tx - c.x) * Math.min(1, dt * 10); c.y += (ty - c.y) * Math.min(1, dt * 10);
      c.trail.unshift([c.x, c.y]); if (c.trail.length > 8) c.trail.pop();
    });
  }

  hurt() {
    const p = this.player;
    if (p.inv > 0 || !p.alive) return;
    p.hp--; this.hits++; p.inv = 2.7;
    this.chain = 0; this.mult = 1;
    p.power = Math.max(1, p.power - 1);
    this.shake = 12; this.flash = { col: '#ff3050', a: 0.45 };
    audio.sfx('hurt'); this.app.vibrate(120);
    this.clearBullets(p.x, p.y, 100, false);
    this.burst(p.x, p.y, '#ff8a2a', 40, 260, 7);
    if (p.hp <= 0) this.die();
  }

  die() {
    const p = this.player;
    p.alive = false; this.running = true;
    this.burst(p.x, p.y, '#ffd27a', 90, 380, 9);
    this.ringFx(p.x, p.y, '#ffd27a', 200);
    audio.sfx('bigboom'); audio.muffle(0.8, 1.5);
    this.shake = 20;
    this.timer(2, () => { this.running = false; this.app.onDeath(); });
  }

  crescendo() {
    const p = this.player;
    if (!p || !p.alive || p.cres < 100 || !this.running) return;
    p.cres = 0; p.inv = Math.max(p.inv, 1.6);
    this.rings.push({ x: p.x, y: p.y, r: 0, max: Math.hypot(this.W, this.H) * 1.1, hit: new Set(), bossHit: false });
    audio.sfx('crescendo'); this.flash = { col: '#fff3c0', a: 0.35 }; this.shake = 8; this.app.vibrate(60);
    this.app.toast('CRESCENDO!', '', 1);
  }

  // ------------------------------------------------------------ shots
  updateShots(dt) {
    const targets = this.enemies;
    const b = this.boss && !this.boss.entering && !this.boss.dying ? this.boss : null;
    const bc = b ? b.def.hit(b) : [];
    for (const s of this.shots) {
      if (s.homing) {
        s.life -= dt;
        let best = null, bd = 1e9;
        for (const e of targets) { const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2; if (d < bd && e.y > -10) { bd = d; best = e; } }
        if (b && bc.length) { const d = (bc[0][0] - s.x) ** 2 + (bc[0][1] - s.y) ** 2; if (d < bd) best = { x: bc[0][0], y: bc[0][1] }; }
        if (best) {
          const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx), ta = Math.atan2(best.y - s.y, best.x - s.x);
          let da = ta - a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          const na = a + clamp(da, -7 * dt, 7 * dt);
          s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
        }
        if (s.life <= 0) s.dead = true;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -30 || s.y > this.H + 30 || s.x < -30 || s.x > this.W + 30) { s.dead = true; continue; }
      for (const e of targets) {
        if (e.dead) continue;
        const rr = e.r + 4;
        if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < rr * rr) {
          s.dead = true; e.hp -= s.dmg; e.flash = 0.06;
          if (Math.random() < 0.5) this.spark(s.x, s.y, s.col);
          audio.sfx('hit');
          if (e.hp <= 0) this.kill(e);
          break;
        }
      }
      if (!s.dead && b) {
        for (const [x, y, r] of bc) {
          if ((x - s.x) ** 2 + (y - s.y) ** 2 < r * r) {
            s.dead = true;
            if (this.damageBoss(s.dmg)) { if (Math.random() < 0.4) this.spark(s.x, s.y, s.col); audio.sfx('hit'); }
            else if (Math.random() < 0.3) this.spark(s.x, s.y, '#888899');
            break;
          }
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }

  spark(x, y, col) {
    if (this.parts.length > 900) return;
    this.parts.push({ x, y, vx: rand(-90, 90), vy: rand(-140, 20), life: 0.25, max: 0.25, size: 5, col, drag: 0.9 });
  }

  kill(e) {
    if (e.dead) return;
    e.dead = true; this.kills++; this.chain++;
    this.mult = Math.min(8, 1 + Math.floor(this.chain / 10));
    this.maxMult = Math.max(this.maxMult, this.mult);
    const K = KINDS[e.kind];
    this.score += K.score * this.mult;
    const big = e.r > 15, col = e.alt && this.ch.skin === 'cube' ? '#4ff3ff' : this.ch.colors.enemy;
    this.burst(e.x, e.y, col, big ? 46 : 16, big ? 240 : 150, big ? 9 : 6);
    this.ringFx(e.x, e.y, col, e.r * (big ? 5 : 3));
    if (K.die) K.die(e, this);
    const nn = big ? 12 : 3;
    for (let i = 0; i < nn; i++) this.pickups.push({ type: 'note', x: e.x, y: e.y, vx: rand(-90, 90), vy: rand(-140, -20), t: 0 });
    if (K.drop === 'spark' && this.player.power < 4) this.pickups.push({ type: 'spark', x: e.x, y: e.y, t: 0 });
    this.player.cres = Math.min(100, this.player.cres + (big ? 8 : 2.5));
    audio.sfx(big ? 'boom' : 'kill');
    if (big) { this.shake = Math.max(this.shake, 7); this.text(e.x, e.y, `+${K.score * this.mult}`, '#fff'); }
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt; e.flash -= dt;
      KINDS[e.kind].update(e, dt, this);
      const p = this.player;
      if (p.alive && p.inv <= 0 && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r * 0.7 + 3) ** 2) { this.hurt(); e.hp -= 10; if (e.hp <= 0) this.kill(e); }
      if (e.gone || (e.t > 1.5 && (e.y > this.H + 60 || e.y < -140 || e.x < -100 || e.x > this.W + 100))) e.dead = true;
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  // ------------------------------------------------------------ bullets
  updateBullets(dt) {
    const p = this.player, W = this.W, H = this.H;
    const pulse = this.ch.modifier === 'pulse' ? 0.55 + this.beat * 0.9 : 1;
    const hasWells = this.wells.length > 0;
    for (const b of this.bullets) {
      b.t += dt;
      if (b.curve) {
        const c = Math.cos(b.curve * dt), s = Math.sin(b.curve * dt);
        const vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx;
      }
      if (b.accel) {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        let ns = sp + b.accel * dt;
        if (b.accel < 0 && ns <= b.min) { ns = b.min; b.accel = 110; }
        ns = Math.min(ns, 240);
        b.vx *= ns / sp; b.vy *= ns / sp;
      }
      if (this.wind) b.vx += this.wind * 0.5 * dt;
      if (hasWells) for (const w of this.wells) {
        const dx = w.x - b.x, dy = w.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < w.r * w.r && d2 > 100) { const d = Math.sqrt(d2), f = (w.str * dt) / (d / 40 + 1); b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
      }
      b.x += b.vx * dt * pulse; b.y += b.vy * dt * pulse;
      if (b.bounce && (b.x < 4 || b.x > W - 4)) { b.vx *= -1; b.bounce = 0; b.x = clamp(b.x, 4, W - 4); }
      if (b.x < -30 || b.x > W + 30 || b.y < -40 || b.y > H + 30) { b.dead = true; continue; }
      if (!p.alive) continue;
      const dx = b.x - p.x, dy = b.y - p.y, d2 = dx * dx + dy * dy;
      const hr = b.r * 0.55 + 1.8;
      if (d2 < hr * hr) { if (p.inv <= 0) { b.dead = true; this.hurt(); } }
      else if (!b.grazed && d2 < (b.r + 15) ** 2) {
        b.grazed = true; this.grazes++;
        p.cres = Math.min(100, p.cres + 1.5); this.score += 20 * this.mult;
        audio.sfx('graze');
        this.parts.push({ x: (b.x + p.x) / 2, y: (b.y + p.y) / 2, vx: rand(-40, 40), vy: rand(-40, 40), life: 0.3, max: 0.3, size: 6, col: '#ffffff', drag: 0.9 });
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  clearBullets(x, y, rad, toNotes = true) {
    for (const b of this.bullets) {
      if (rad && (b.x - x) ** 2 + (b.y - y) ** 2 > rad * rad) continue;
      b.dead = true;
      if (toNotes && Math.random() < 0.5) this.pickups.push({ type: 'note', x: b.x, y: b.y, vx: rand(-30, 30), vy: rand(-40, 0), t: 0.3, small: true });
      if (this.parts.length < 900) this.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 8, col: b.col, drag: 1 });
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  updateRings(dt) {
    for (const R of this.rings) {
      R.r += 720 * dt;
      const r2 = R.r * R.r;
      for (const b of this.bullets) if ((b.x - R.x) ** 2 + (b.y - R.y) ** 2 < r2) {
        b.dead = true;
        this.pickups.push({ type: 'note', x: b.x, y: b.y, vx: 0, vy: 0, t: 0.4, small: true });
      }
      for (const e of this.enemies) if (!R.hit.has(e) && (e.x - R.x) ** 2 + (e.y - R.y) ** 2 < r2) { R.hit.add(e); e.hp -= 45; e.flash = 0.1; if (e.hp <= 0) this.kill(e); }
      if (this.boss && !R.bossHit && (this.boss.x - R.x) ** 2 + (this.boss.y - R.y) ** 2 < r2) { R.bossHit = true; this.damageBoss(160); }
      if (R.r > R.max) R.done = true;
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.rings = this.rings.filter((r) => !r.done);
  }

  // ------------------------------------------------------------ pickups
  updatePickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      k.t += dt;
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
      if (k.type === 'note') {
        if (k.t < 0.45) { k.vx *= 0.93; k.vy = k.vy * 0.93 + 40 * dt; k.x += k.vx * dt; k.y += k.vy * dt; }
        else if (p.alive) { const sp = 380 + k.t * 300; k.x += (dx / d) * sp * dt; k.y += (dy / d) * sp * dt; }
        if (p.alive && d < 16) { k.dead = true; this.score += (k.small ? 5 : 10) * this.mult; audio.sfx('pickup', Math.floor(Math.random() * 3) * 4); }
      } else {
        if (k.type === 'echo') { k.y += 30 * dt; k.x = k.x0 + Math.sin(k.t * 1.4) * 45; if (k.y > this.H + 40) k.y = -30; }
        else { k.y += 55 * dt; k.x += Math.sin(k.t * 3) * 20 * dt; if (k.y > this.H + 30) k.dead = true; }
        const mag = k.type === 'echo' ? 90 : 70;
        if (p.alive && d < mag) { k.x += (dx / d) * 300 * dt; k.y += (dy / d) * 300 * dt; }
        if (p.alive && d < 18) { k.dead = true; this.collect(k); }
      }
    }
    this.pickups = this.pickups.filter((k) => !k.dead);
  }

  collect(k) {
    const p = this.player;
    if (k.type === 'spark') {
      if (p.power < 4) { p.power++; this.text(p.x, p.y - 24, p.power === 4 ? 'MAX POWER' : 'POWER UP', '#ffd27a'); }
      else { this.score += 2000; this.text(p.x, p.y - 24, '+2000', '#ffd27a'); }
      audio.sfx('power');
      this.ringFx(p.x, p.y, '#ffd27a', 60);
    } else if (k.type === 'heart') {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      this.text(p.x, p.y - 24, '+1 FLAME', '#ff9a6a'); audio.sfx('power');
    } else if (k.type === 'echo') {
      this.echoes++;
      audio.layers = Math.max(audio.layers, this.echoes);
      audio.sfx('echo');
      this.flash = { col: this.ch.colors.accent, a: 0.3 };
      p.cres = Math.min(100, p.cres + 25);
      this.score += 5000;
      this.burst(p.x, p.y, this.ch.colors.accent, 60, 300, 8);
      this.ringFx(p.x, p.y, this.ch.colors.accent, 220);
      if (this.ch.modifier === 'grey') this.colorTarget = 0.12 + this.echoes * 0.22;
      const who = this.ch.id === 'hush' ? ['maren', 'juno', 'sefa', 'vesper'][this.echoes - 1] : this.ch.companion;
      this.app.toast(`VERSE ${ROMAN[this.echoes - 1]} RESTORED`, `${this.echoes}/4 Echoes`, 2);
      this.app.say(who, this.ch.echoLines[this.echoes - 1]);
    }
  }

  // ------------------------------------------------------------ hazards
  updateHazards(dt) {
    for (const z of this.zones) { z.t += dt; z.y += 28 * dt; if (z.y > this.H + 100) z.dead = true; }
    this.zones = this.zones.filter((z) => !z.dead);
    for (const w of this.wells) { w.t += dt; w.y += 22 * dt; if (w.y > this.H + 130) w.dead = true; }
    this.wells = this.wells.filter((w) => !w.dead);
  }

  // ------------------------------------------------------------ boss
  startBoss() {
    this.mode = 'bossWarn';
    this.reachedBoss = true;
    const def = BOSSES[this.ch.boss];
    audio.sfx('warn');
    this.app.warning(def.name, def.sub);
    for (const l of this.ch.preBoss) this.app.say(l.who, l.t);
    this.timer(3.4, () => this.spawnBoss());
  }

  spawnBoss() {
    const def = BOSSES[this.ch.boss];
    const hp = def.hp * this.diff.bossHp;
    const b = { def, t: 0, hp, max: hp, phase: 0, entering: true, enterT: 0, spin: 0, flash: 0, x: this.W / 2, y: -150, speedMul: 1 };
    def.init(b, this);
    b.sy = b.y;
    this.boss = b; this.mode = 'boss';
    if (def.final) { audio.layers = 4; this.baseTempo = 1.25; audio.setTempo(1.25); this.colorTarget = Math.max(this.colorTarget, 0.8); }
    else { audio.layers = 5; this.baseTempo = 1.06; audio.setTempo(1.06); }
    this.app.bossBar(def.name, 1);
  }

  updateBoss(dt) {
    const b = this.boss, d = b.def;
    b.t += dt; b.flash -= dt;
    if (b.entering) {
      b.enterT += dt;
      if (d.id === 'wyrm' || d.segments) {
        d.move.call(d, b, dt, this);
        if (b.y >= this.H * 0.2) { b.entering = false; b.t = 0; }
      } else {
        const u = ease(Math.min(1, b.enterT / 2.6));
        b.x = this.W / 2; b.y = lerp(b.sy, b.ty, u);
        b.ox = b.x; b.oy = b.y;
        if (u >= 1) { b.entering = false; b.t = 0; }
      }
    } else if (!b.dying) {
      d.move.call(d, b, dt, this);
    }
    if (b.cracks !== undefined && b.phase >= 3) b.cracks = Math.min(1, b.cracks + dt * 0.3);
    if (b.silentT > 0) { b.silentT -= dt; if (b.silentT <= 0) this.endSilence(); }
    if (b.dying) {
      b.dieT += dt;
      if (!d.final && Math.random() < dt * 14) {
        const [x, y, r] = d.hit(b)[0];
        const ex = x + rand(-r, r), ey = y + rand(-r, r);
        this.burst(ex, ey, Math.random() < 0.5 ? this.ch.colors.enemy : '#ffffff', 20, 220, 8);
        audio.sfx('boom');
      }
      return;
    }
    const p = this.player;
    if (p.alive && p.inv <= 0 && !b.entering) {
      const circles = d.hit(b).concat(d.body ? d.body(b) : []);
      for (const [x, y, r] of circles) if ((x - p.x) ** 2 + (y - p.y) ** 2 < (r * 0.8) ** 2) { this.hurt(); break; }
    }
    this.app.bossBar(d.name, Math.max(0, b.hp / b.max));
  }

  bossStep(s) {
    const b = this.boss, ph = b.def.phases[b.phase];
    for (const [every, off, name, a] of ph.pats) {
      if ((((s - off) % every) + every) % every === 0) this.pattern(b, name, a, s);
    }
  }

  pattern(b, name, a, s) {
    const x = b.ox ?? b.x, y = b.oy ?? b.y, o = { r: a.r || 4.5, c: a.c, curve: a.curve, accel: a.accel, min: a.min, bounce: a.bounce, dim: a.dim };
    if (a.dim) o.col = '#6a6a7a';
    switch (name) {
      case 'ring': {
        const rot = a.rot === 'spin' ? (b.spin += 0.21) : (a.rot || 0) + s * 0.05;
        if (a.alt) { const n = this.n(a.n); for (let i = 0; i < n; i++) this.shoot(x, y, rot + (i * TAU) / n, a.spd, { ...o, c: i % 2 ? 2 : 1 }); }
        else this.ring(x, y, this.n(a.n), a.spd, rot, o);
        break;
      }
      case 'fan': this.fan(x, y, this.aim(x, y), this.n(a.n), a.spread, a.spd, o); break;
      case 'spiral': {
        const dir = a.flipBar && Math.floor(s / 16) % 2 ? -1 : 1;
        b.spin += a.inc * dir;
        for (let k = 0; k < a.arms; k++) this.shoot(x, y, b.spin + (k * TAU) / a.arms, a.spd, o);
        break;
      }
      case 'flower': {
        const n = this.n(a.n), rot = s * 0.09;
        for (let i = 0; i < n; i++) { const ang = rot + (i * TAU) / n; this.shoot(x, y, ang, a.spd, o); this.shoot(x, y, ang + Math.PI / n, a.spd * 1.35, { ...o, c: 2 }); }
        break;
      }
      case 'rain': for (let i = 0; i < this.n(a.n); i++) this.shoot(rand(10, this.W - 10), -10, Math.PI / 2 + rand(-0.15, 0.15), a.spd * rand(0.85, 1.15), { ...o, r: 4 }); break;
      case 'wall': {
        const n = a.n, gap = this.player.x + rand(-40, 40), gw = 62;
        for (let i = 0; i < n; i++) { const bx = (i + 0.5) * (this.W / n); if (Math.abs(bx - gap) < gw / 2 + 6) continue; this.shoot(bx, -10, Math.PI / 2, a.spd, { ...o, r: 5, c: 2 }); }
        break;
      }
      case 'beam': {
        const base = this.aim(x, y), n = a.n || 1;
        for (let i = 0; i < n; i++) {
          const ang = n === 1 ? base : base - a.spread + (2 * a.spread * i) / (n - 1);
          this.beams.push({ x, y, ang, fireStep: s + 6, born: this.time });
        }
        break;
      }
      case 'summon': for (let i = 0; i < a.n; i++) this.spawn(a.kind, rand(40, this.W - 40), -20, { ty: rand(60, 160) }); break;
      case 'zone': this.zones.push({ x: rand(60, this.W - 60), y: -60, r: rand(50, 70), t: 0, ph: rand(TAU) }); break;
      case 'segs': {
        const segs = b.segs || [];
        segs.forEach((sg, i) => {
          if (a.mode === 'alt' && (i + Math.floor(s / 4)) % 2) return;
          if (i % 2) return;
          const ang = a.mode === 'aim' ? this.aim(sg.x, sg.y) : Math.atan2(sg.y - b.y, sg.x - b.x) + (i % 4 ? 1.57 : -1.57);
          this.shoot(sg.x, sg.y, ang, a.spd, { r: 4, c: 2 });
        });
        break;
      }
      case 'mirror': {
        const mx = this.W - this.player.x, my = 30;
        this.fan(mx, my, this.aim(mx, my), this.n(a.n), 0.3, 140, { r: 4, col: '#ffd27a' });
        this.parts.push({ x: mx, y: my, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 22, col: '#ffd27a', drag: 1 });
        break;
      }
    }
  }

  fireBeam(bm) {
    bm.fired = true;
    for (let i = 0; i < 16; i++) this.shoot(bm.x, bm.y, bm.ang, 150 + i * 15, { r: 3.6, c: 2 });
    audio.sfx('hit');
  }

  damageBoss(dmg) {
    const b = this.boss;
    if (!b || b.entering || b.inv || b.dying) return false;
    b.hp -= dmg; b.flash = 0.05;
    const phs = b.def.phases;
    let np = b.phase;
    while (np + 1 < phs.length && b.hp / b.max <= phs[np + 1].hp) { np++; if (phs[np].silence) break; }
    if (np !== b.phase) this.enterPhase(np);
    if (b.hp <= 0 && !b.inv) this.bossDefeated();
    return true;
  }

  enterPhase(i) {
    const b = this.boss, ph = b.def.phases[i];
    b.phase = i;
    this.clearBullets(0, 0, 0, true);
    this.flash = { col: '#ffffff', a: 0.4 }; this.shake = 10;
    audio.sfx('boom');
    if (ph.say) this.app.say(ph.say[0], ph.say[1]);
    if (ph.tempo) audio.setTempo(this.baseTempo * ph.tempo);
    if (ph.speed) b.speedMul = ph.speed;
    if (ph.eyes) b.eyes = ph.eyes;
    if (ph.silence) {
      b.hp = b.max * ph.hp; b.inv = true; b.silent = true; b.silentT = ph.silence;
      audio.silenced = true; audio.heartbeat = true;
      this.player.fire = false; this.colorTarget = 0;
      this.app.silence(true);
    }
    if (ph.song) {
      b.inv = false; b.silent = false; b.cracks = 0.01;
      audio.playSong(ph.song, { fade: 0.4 });
      audio.layers = 5; this.baseTempo = 1; audio.setTempo(1);
      this.player.fire = true; this.colorTarget = 1;
      this.app.silence(false);
      this.flash = { col: '#ffd27a', a: 0.7 };
      for (const c of this.companions) this.burst(c.x, c.y, c.color, 30, 200, 7);
      audio.sfx('swell');
    }
  }

  endSilence() {
    const b = this.boss;
    b.hp = b.max * b.def.phases[3].hp;
    this.enterPhase(3);
  }

  bossDefeated() {
    const b = this.boss, d = b.def;
    b.dying = true; b.dieT = 0;
    this.clearBullets(0, 0, 0, true);
    for (const e of this.enemies) this.kill(e);
    this.beams = [];
    this.app.bossBar(null);
    if (d.final) {
      this.mode = 'finale';
      this.player.fire = false;
      this.player.inv = 999;
      audio.playSong('hush', { fade: 2 }); audio.layers = 0;
      this.flash = { col: '#ffffff', a: 0.6 };
      this.timer(2.4, () => { this.running = false; this.app.onFinaleChoice(); });
      return;
    }
    this.mode = 'bossDeath'; this.slowmo = 0.35;
    this.player.inv = 999;
    audio.sfx('bigboom'); this.shake = 18; this.flash = { col: '#ffffff', a: 0.8 };
    const bonus = 20000 + (this.hits === 0 ? 30000 : 0);
    this.score += bonus;
    this.timer(1.1, () => {
      this.slowmo = 1;
      const [x, y] = d.hit(b)[0];
      this.burst(x, y, '#ffffff', 120, 420, 10); this.burst(x, y, this.ch.colors.enemy, 120, 300, 9);
      this.ringFx(x, y, '#ffffff', 300); this.ringFx(x, y, this.ch.colors.accent, 200);
      audio.sfx('bigboom'); this.shake = 24; this.flash = { col: '#ffffff', a: 1 };
      this.boss = null;
      this.mode = 'clear';
      for (let i = 0; i < 40; i++) this.pickups.push({ type: 'note', x, y, vx: rand(-200, 200), vy: rand(-200, 50), t: 0 });
    });
    this.timer(3.6, () => { this.running = false; this.app.onChapterClear(this.stats()); });
  }

  // final choice resolution (called by app)
  resolveFinale(choice) {
    const b = this.boss;
    if (choice === 'burn') {
      if (b) {
        this.burst(b.x, b.y, '#ffffff', 200, 500, 11); this.ringFx(b.x, b.y, '#ffd27a', 400);
        this.boss = null;
      }
      audio.sfx('bigboom'); this.shake = 30; this.flash = { col: '#ffffff', a: 1 };
      this.colorTarget = 1;
    } else {
      if (b) {
        this.burst(b.x, b.y, '#e8e8ff', 80, 160, 8);
        this.boss = null;
      }
      this.colorTarget = 1;
      this.flash = { col: '#e8e8ff', a: 0.8 };
    }
  }

  stats() {
    const rankScore = this.score / (1 + this.hits * 0.35);
    const target = 120000 + this.ci * 40000;
    const rank = rankScore > target * 1.15 ? 'S' : rankScore > target * 0.8 ? 'A' : rankScore > target * 0.5 ? 'B' : 'C';
    return { score: Math.floor(this.score), hits: this.hits, grazes: this.grazes, kills: this.kills, maxMult: this.maxMult, time: this.playTime, rank, power: this.player.power };
  }

  // ------------------------------------------------------------ FX
  burst(x, y, col, n, spd, size = 6) {
    for (let i = 0; i < n && this.parts.length < 1100; i++) {
      const a = rand(TAU), s = rand(0.15, 1) * spd, l = rand(0.35, 0.9);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, size: rand(size * 0.5, size * 1.4), col, drag: 0.92 });
    }
  }
  ringFx(x, y, col, r) { this.parts.push({ ring: true, x, y, r: 2, rmax: r, life: 0.55, max: 0.55, col }); }
  text(x, y, txt, col) { this.texts.push({ x, y, txt, col, t: 0 }); }

  updateParticles(dt) {
    for (const p of this.parts) {
      p.life -= dt;
      if (p.ring) { p.r = p.rmax * (1 - p.life / p.max); continue; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < 1.2);
  }

  // ============================================================ RENDER
  shakeOffset() {
    if (this.shake > 0 && this.app.settings.shake) return [rand(-1, 1) * this.shake * 0.5, rand(-1, 1) * this.shake * 0.5];
    return [0, 0];
  }

  drawBackground(c, v) { this.bg.draw(c, v.x0, v.y0, v.w, v.h, this.beat); }

  draw(c, v, sx = 0, sy = 0) {
    const { x0, y0, w, h } = v;
    c.save();
    c.translate(sx, sy);

    if (this.mode === 'title') { this.drawTitleEmber(c); }

    this.drawHazards(c);
    this.drawPickups(c);
    const skin = this.ch ? this.ch.skin : 'moth', ecol = this.ch ? this.ch.colors.enemy : '#9ec9ff';
    for (const e of this.enemies) drawEnemy(c, e, skin, this.time, this.beat, ecol);
    if (this.boss) this.drawBoss(c);
    this.drawBeams(c);
    this.drawShots(c);
    this.drawCompanions(c);
    this.drawPlayer(c);
    this.drawBullets(c);
    this.drawParticles(c);
    this.drawRings(c);
    this.drawTexts(c);
    c.restore();

    if (this.colorAmt < 0.985) {
      c.globalCompositeOperation = 'saturation';
      c.fillStyle = `rgba(128,128,128,${clamp(1 - this.colorAmt, 0, 1)})`;
      c.fillRect(x0, y0, w, h);
      c.globalCompositeOperation = 'source-over';
    }
    if (this.flash) { c.globalAlpha = clamp(this.flash.a, 0, 1); c.fillStyle = this.flash.col; c.fillRect(x0, y0, w, h); c.globalAlpha = 1; }
    drawVignette(c, x0, y0, w, h, this.boss && this.boss.silent ? 0.95 : 0.6);
    // side curtains on wide screens
    if (x0 < -1) {
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillRect(x0, y0, -x0, h); c.fillRect(this.W, y0, x0 + w - this.W, h);
      c.fillStyle = 'rgba(255,210,122,0.18)'; c.fillRect(-1, y0, 1, h); c.fillRect(this.W, y0, 1, h);
    }
  }

  drawTitleEmber(c) {
    const x = this.W / 2, y = this.H * 0.37 + Math.sin(this.time * 1.2) * 8;
    c.globalCompositeOperation = 'lighter';
    glow(c, x, y, 150 + this.beat * 30, '#ff7a1a', 0.35);
    glow(c, x, y, 60, '#ffd27a', 0.7);
    c.globalCompositeOperation = 'source-over';
    this.drawFlame(c, x, y, 1.8, 1);
    if (Math.random() < 0.9) this.parts.push({ x: x + rand(-8, 8), y: y + 10, vx: rand(-20, 20), vy: rand(-80, -30), life: 1.4, max: 1.4, size: rand(4, 9), col: Math.random() < 0.5 ? '#ff8a2a' : '#ffd27a', drag: 0.99 });
  }

  drawFlame(c, x, y, s, a) {
    const t = this.time, fl = Math.sin(t * 11) * 1.5 + Math.sin(t * 17) * 1;
    c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = a;
    const g = c.createLinearGradient(0, -16, 0, 10);
    g.addColorStop(0, '#fffbe6'); g.addColorStop(0.45, '#ffd27a'); g.addColorStop(1, '#ff6a1a');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(fl * 0.6, -17);
    c.bezierCurveTo(9, -6, 10, 9, 0, 10); c.bezierCurveTo(-10, 9, -9, -6, fl * 0.6, -17);
    c.fill();
    c.fillStyle = 'rgba(255,255,240,0.9)'; c.beginPath(); c.ellipse(0, 3, 4, 5, 0, 0, TAU); c.fill();
    c.restore(); c.globalAlpha = 1;
  }

  drawPlayer(c) {
    const p = this.player;
    if (!p || !p.alive) return;
    const a = p.inv > 0 && p.inv < 50 && this.running && Math.floor(this.time * 16) % 2 === 0 ? 0.35 : 1;
    c.globalCompositeOperation = 'lighter';
    glow(c, p.x, p.y, 56 + this.beat * 16, p.slow < 1 ? '#5aff7a' : '#ff7a1a', 0.5 * a);
    glow(c, p.x, p.y, 26, '#ffd27a', 0.95 * a);
    if (p.cres >= 100) glow(c, p.x, p.y, 60 + Math.sin(this.time * 8) * 8, '#fff3c0', 0.25);
    c.globalCompositeOperation = 'source-over';
    this.drawFlame(c, p.x, p.y, 1.3, a);
    if (!this.running) return;
    // hitbox
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(p.x, p.y + 1, 2.6, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,90,60,0.9)'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y + 1, 4, 0, TAU); c.stroke();
  }

  drawCompanions(c) {
    if (!this.player || (!this.player.alive && this.mode !== 'story')) return;
    c.globalCompositeOperation = 'lighter';
    for (const m of this.companions) {
      for (let i = 0; i < m.trail.length; i++) glow(c, m.trail[i][0], m.trail[i][1], 8 - i * 0.7, m.color, 0.25 * (1 - i / m.trail.length));
      glow(c, m.x, m.y, 16 + this.beat * 5, m.color, 0.7);
      glow(c, m.x, m.y, 5, '#ffffff', 1);
    }
    c.globalCompositeOperation = 'source-over';
  }

  drawShots(c) {
    c.globalCompositeOperation = 'lighter';
    for (const s of this.shots) {
      const spr = glowSprite(s.col);
      c.globalAlpha = 0.75;
      if (s.homing) { c.drawImage(spr, s.x - 8, s.y - 8, 16, 16); c.drawImage(glowSprite('#ffffff'), s.x - 3, s.y - 3, 6, 6); }
      else {
        c.drawImage(spr, s.x - s.w * 2.2, s.y - 16, s.w * 4.4, 32);
        c.globalAlpha = 0.95; c.fillStyle = '#fffaf0';
        c.fillRect(s.x - 1, s.y - 8, 2, 14);
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  drawBullets(c) {
    c.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) {
      const s = b.r * 6.2, spr = bulletSprite(b.col);
      c.globalAlpha = b.dim ? 0.55 : 1;
      c.drawImage(spr, b.x - s / 2, b.y - s / 2, s, s);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  drawBeams(c) {
    for (const b of this.beams) {
      const age = this.time - b.born, L = 900;
      c.strokeStyle = rgba(this.ch.colors.bullet2, 0.25 + 0.35 * Math.abs(Math.sin(age * 18)));
      c.lineWidth = 1 + age * 3;
      c.setLineDash([10, 6]);
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + Math.cos(b.ang) * L, b.y + Math.sin(b.ang) * L); c.stroke();
      c.setLineDash([]);
    }
  }

  drawPickups(c) {
    c.globalCompositeOperation = 'lighter';
    for (const k of this.pickups) {
      if (k.type === 'note') { glow(c, k.x, k.y, k.small ? 5 : 7, '#ffe9a8', 0.9); continue; }
      if (k.type === 'spark') {
        glow(c, k.x, k.y, 26, '#ffb347', 0.6);
        c.globalAlpha = 1; c.fillStyle = '#fff3c0';
        c.save(); c.translate(k.x, k.y); c.rotate(k.t * 3); c.fillRect(-5, -5, 10, 10); c.restore();
      } else if (k.type === 'heart') {
        glow(c, k.x, k.y, 26, '#ff5a5a', 0.6);
        c.globalCompositeOperation = 'source-over'; this.drawFlame(c, k.x, k.y, 0.75, 1); c.globalCompositeOperation = 'lighter';
      } else if (k.type === 'echo') {
        const col = this.ch.colors.accent, pul = 1 + Math.sin(k.t * 6) * 0.12;
        glow(c, k.x, k.y, 60 * pul, col, 0.5);
        for (let i = 0; i < 5; i++) { const a = k.t * 2 + i * TAU / 5; glow(c, k.x + Math.cos(a) * 24, k.y + Math.sin(a) * 24, 6, '#ffffff', 0.8); }
        c.globalCompositeOperation = 'source-over';
        // eighth note glyph
        c.save(); c.translate(k.x, k.y); c.scale(pul, pul);
        c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 2.5;
        c.beginPath(); c.ellipse(-4, 7, 6, 4.5, -0.4, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(1.5, 6); c.lineTo(1.5, -12); c.quadraticCurveTo(9, -8, 8, 0); c.stroke();
        c.restore();
        c.globalCompositeOperation = 'lighter';
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  drawHazards(c) {
    for (const z of this.zones) {
      c.globalCompositeOperation = 'lighter';
      glow(c, z.x, z.y, z.r * 1.4, '#5aff7a', 0.28 + this.beat * 0.08);
      for (let i = 0; i < 6; i++) { const a = z.t * 0.6 + i + z.ph; glow(c, z.x + Math.cos(a) * z.r * 0.6, z.y + Math.sin(a * 1.3) * z.r * 0.5, z.r * 0.45, '#8dff9a', 0.12); }
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = 'rgba(141,255,154,0.25)'; c.setLineDash([4, 6]); c.lineWidth = 1.5;
      c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke(); c.setLineDash([]);
    }
    for (const w of this.wells) {
      c.globalCompositeOperation = 'lighter';
      glow(c, w.x, w.y, w.r, '#8a5bff', 0.22);
      c.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 5; i++) {
        const rr = ((i / 5 + w.t * 0.5) % 1) * w.r;
        c.strokeStyle = `rgba(185,164,255,${0.5 * (rr / w.r)})`; c.lineWidth = 1.5;
        c.beginPath(); c.arc(w.x, w.y, w.r - rr, w.t * 2 + i, w.t * 2 + i + 4); c.stroke();
      }
      c.fillStyle = '#000'; c.beginPath(); c.arc(w.x, w.y, 9, 0, TAU); c.fill();
      c.strokeStyle = '#b9a4ff'; c.lineWidth = 1.5; c.stroke();
    }
  }

  drawBoss(c) {
    const b = this.boss, d = b.def;
    c.save();
    if (b.dying) {
      const k = d.final ? Math.min(1, b.dieT / 2) : Math.min(1, b.dieT / 1.1);
      c.translate(rand(-4, 4) * (1 - k * 0.5), rand(-4, 4));
      c.globalAlpha = d.final ? 1 - k * 0.6 : 1;
    }
    d.draw(c, b, this, this.time, this.beat, b.phase);
    if (b.flash > 0) {
      c.globalCompositeOperation = 'lighter';
      const [x, y, r] = d.hit(b)[0];
      glow(c, x, y, r * 1.6, '#ffffff', 0.35);
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
    c.globalAlpha = 1;
  }

  drawParticles(c) {
    c.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      if (p.ring) continue;
      const k = p.life / p.max;
      glow(c, p.x, p.y, p.size * (0.4 + k * 0.8), p.col, k);
    }
    c.globalAlpha = 1;
    for (const p of this.parts) {
      if (!p.ring) continue;
      const k = p.life / p.max;
      c.strokeStyle = rgba(p.col, k * 0.8); c.lineWidth = 1 + k * 3;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }

  drawRings(c) {
    for (const R of this.rings) {
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = 'rgba(255,230,160,0.7)'; c.lineWidth = 10;
      c.beginPath(); c.arc(R.x, R.y, R.r, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2;
      c.beginPath(); c.arc(R.x, R.y, R.r - 4, 0, TAU); c.stroke();
      c.globalCompositeOperation = 'source-over';
    }
  }

  drawTexts(c) {
    c.textAlign = 'center'; c.font = '800 13px Nunito, sans-serif';
    for (const t of this.texts) {
      c.globalAlpha = 1 - t.t / 1.2;
      c.fillStyle = t.col;
      c.fillText(t.txt, t.x, t.y - t.t * 30);
    }
    c.globalAlpha = 1;
  }
}
