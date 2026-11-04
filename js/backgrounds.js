// Procedural, parallax, beat-reactive backgrounds for each chapter.
import { TAU, rand, glow, rgba, makeCanvas, star } from './gfx.js';

const wrap = (v, a, b) => { const r = b - a; while (v < a) v += r; while (v >= b) v -= r; return v; };

class BG {
  constructor(W, H) { this.W = W; this.H = H; this.t = 0; this.scroll = 0; }
  update(dt, speed) { this.t += dt; this.scroll += speed * dt; }
}

// --------------------------------------------------------- I. DROWNED COAST
class Coast extends BG {
  constructor(W, H) {
    super(W, H);
    this.waves = Array.from({ length: 80 }, () => ({ x: rand(-60, W + 60), y: rand(-40, 900), len: rand(14, 60), d: rand(0.2, 1) }));
    this.rain = Array.from({ length: 90 }, () => ({ x: rand(-100, W + 100), y: rand(-50, 900), s: rand(0.6, 1) }));
    this.flash = 0;
  }
  update(dt, speed) {
    super.update(dt, speed);
    for (const w of this.waves) w.y += speed * (0.3 + w.d * 0.9) * dt;
    for (const r of this.rain) { r.y += 620 * r.s * dt; r.x += 110 * r.s * dt; }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (Math.random() < dt * 0.04) this.flash = 1;
  }
  draw(c, x0, y0, w, h, beat) {
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#030a18'); g.addColorStop(0.55, '#08203a'); g.addColorStop(1, '#0c2e4c');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    c.globalCompositeOperation = 'lighter';
    // moon glow + reflection column
    glow(c, this.W * 0.66, y0 + h * 0.18, 180, '#5f8fc4', 0.35);
    for (let i = 0; i < 26; i++) {
      const yy = wrap(i * 34 + this.scroll * 0.6, y0 - 20, y0 + h + 20);
      const ww = 10 + Math.sin(this.t * 2 + i * 1.7) * 8 + 18;
      c.fillStyle = `rgba(190,215,255,${0.06 + 0.05 * Math.sin(this.t * 3 + i)})`;
      c.fillRect(this.W * 0.66 - ww / 2, yy, ww, 2);
    }
    // waves
    c.lineCap = 'round';
    for (const wv of this.waves) {
      wv.y = wrap(wv.y, y0 - 40, y0 + h + 40);
      const yy = wv.y + Math.sin(this.t * 1.2 + wv.x * 0.05) * 3;
      c.strokeStyle = `rgba(120,180,255,${0.04 + wv.d * 0.16 + beat * 0.03})`;
      c.lineWidth = 0.6 + wv.d * 1.6;
      c.beginPath(); c.moveTo(wv.x - wv.len / 2, yy); c.quadraticCurveTo(wv.x, yy - 4 * wv.d, wv.x + wv.len / 2, yy); c.stroke();
    }
    // lighthouse beam sweeping from behind
    const a = -Math.PI / 2 + Math.sin(this.t * 0.35) * 0.9;
    const ox = this.beamO ? this.beamO.x : x0 + w * 0.15, oy = this.beamO ? this.beamO.y : y0 + h + 60, L = h * 1.6, spread = 0.12;
    const bg = c.createRadialGradient(ox, oy, 0, ox, oy, L);
    bg.addColorStop(0, 'rgba(255,220,150,0.22)'); bg.addColorStop(1, 'rgba(255,220,150,0)');
    c.fillStyle = bg;
    c.beginPath(); c.moveTo(ox, oy);
    c.lineTo(ox + Math.cos(a - spread) * L, oy + Math.sin(a - spread) * L);
    c.lineTo(ox + Math.cos(a + spread) * L, oy + Math.sin(a + spread) * L);
    c.closePath(); c.fill();
    // rain
    c.strokeStyle = 'rgba(170,200,255,0.18)'; c.lineWidth = 1;
    c.beginPath();
    for (const r of this.rain) {
      if (r.y > y0 + h + 20) { r.y = y0 - rand(10, 60); r.x = rand(x0 - 100, x0 + w); }
      c.moveTo(r.x, r.y); c.lineTo(r.x - 4 * r.s, r.y - 16 * r.s);
    }
    c.stroke();
    if (this.flash > 0) { c.fillStyle = `rgba(160,190,255,${this.flash * this.flash * 0.18})`; c.fillRect(x0, y0, w, h); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
}

// --------------------------------------------------------- II. VELVET STATIC
const NEON = ['#ff4fd8', '#4ff3ff', '#ffe74f', '#8a5bff'];
function buildingSprite(bw, bh, near) {
  const s = 2, cv = makeCanvas(bw * s + 16, bh * s + 16), g = cv.getContext('2d');
  g.translate(8, 8); g.scale(s, s);
  const col = NEON[Math.floor(Math.random() * NEON.length)];
  g.fillStyle = near ? '#1b0a33' : '#130726';
  g.fillRect(0, 0, bw, bh);
  g.fillStyle = near ? '#24104a' : '#1a0b36';
  g.fillRect(3, 3, bw - 6, bh - 6);
  // windows / rooftop units
  for (let y = 6; y < bh - 6; y += 7) for (let x = 6; x < bw - 6; x += 7) {
    if (Math.random() < 0.45) { g.fillStyle = Math.random() < 0.15 ? col : 'rgba(255,220,255,0.18)'; g.fillRect(x, y, 3, 3); }
  }
  g.strokeStyle = col; g.lineWidth = near ? 1.4 : 0.9; g.globalAlpha = near ? 0.9 : 0.5;
  g.shadowColor = col; g.shadowBlur = 6;
  g.strokeRect(0.5, 0.5, bw - 1, bh - 1);
  return { cv, col };
}
class City extends BG {
  constructor(W, H) {
    super(W, H);
    this.layers = [0.45, 1].map((sp, li) => {
      const arr = [];
      let y = -100;
      while (y < 1400) {
        const bw = rand(40, 90) * (li ? 1 : 0.7), bh = rand(40, 110) * (li ? 1 : 0.7);
        const x = rand(-80, W + 40);
        const sp2 = buildingSprite(bw, bh, li === 1);
        arr.push({ x, y, bw, bh, ...sp2, ph: rand(TAU) });
        y += rand(20, 60);
      }
      return { sp, items: arr, span: 1500 };
    });
    // scanlines
    this.scan = makeCanvas(4, 4);
    const g = this.scan.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 4, 1);
    this.flick = 0;
  }
  draw(c, x0, y0, w, h, beat) {
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#07010f'); g.addColorStop(1, '#170429');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    // street grid
    c.strokeStyle = `rgba(255,79,216,${0.08 + beat * 0.1})`; c.lineWidth = 1;
    c.beginPath();
    for (let x = Math.floor(x0 / 60) * 60; x < x0 + w; x += 60) { c.moveTo(x + 0.5, y0); c.lineTo(x + 0.5, y0 + h); }
    for (let i = 0; i < h / 60 + 2; i++) { const y = wrap(i * 60 + this.scroll * 0.8, y0 - 60, y0 + h + 60); c.moveTo(x0, y); c.lineTo(x0 + w, y); }
    c.stroke();
    // buildings
    for (const L of this.layers) {
      for (const b of L.items) {
        const yy = wrap(b.y + this.scroll * L.sp, y0 - 200, y0 - 200 + L.span);
        if (yy > y0 + h + 10 || yy + b.bh < y0 - 10) continue;
        c.globalAlpha = L.sp < 1 ? 0.35 : 0.62;
        c.drawImage(b.cv, b.x - 4, yy - 4, b.bw + 8, b.bh + 8);
        if (L.sp === 1 && Math.sin(this.t * 2 + b.ph) > 0.6) {
          c.globalCompositeOperation = 'lighter';
          glow(c, b.x + b.bw / 2, yy + b.bh / 2, 40 + beat * 20, b.col, 0.12 + beat * 0.12);
          c.globalCompositeOperation = 'source-over';
        }
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'lighter';
    glow(c, x0 + w / 2, y0 + h * 0.5, h * 0.6, '#8a2bff', 0.12 + beat * 0.08);
    c.globalCompositeOperation = 'source-over';
    // static speckles + scanlines
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 18; i++) c.fillRect(x0 + Math.random() * w, y0 + Math.random() * h, 1.2, 1.2);
    c.fillStyle = c.createPattern(this.scan, 'repeat');
    c.fillRect(x0, y0, w, h);
  }
}

// ---------------------------------------------------------- III. GLASS DESERT
class Desert extends BG {
  constructor(W, H) {
    super(W, H);
    this.ridges = Array.from({ length: 14 }, (_, i) => ({ y: i * 70, amp: rand(10, 28), f: rand(0.008, 0.02), ph: rand(TAU), shade: rand(0.6, 1) }));
    this.glints = Array.from({ length: 40 }, () => ({ x: rand(-50, W + 50), y: rand(0, 1000), ph: rand(TAU), s: rand(0.5, 1) }));
    this.sand = Array.from({ length: 70 }, () => ({ x: rand(-50, W + 50), y: rand(0, 900), l: rand(8, 30), s: rand(0.5, 1) }));
    this.wind = 0;
  }
  draw(c, x0, y0, w, h, beat) {
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#0e0618'); g.addColorStop(0.5, '#25102c'); g.addColorStop(1, '#3a1730');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    c.globalCompositeOperation = 'lighter';
    glow(c, this.W * 0.22, y0 + 90, 160, '#ffcf8a', 0.22);
    glow(c, this.W * 0.22, y0 + 90, 34, '#fff1d0', 0.8);
    c.globalCompositeOperation = 'source-over';
    // dunes
    const span = 980;
    const sorted = this.ridges.map((r) => ({ r, y: wrap(r.y + this.scroll * 0.7, y0 - 120, y0 - 120 + span) })).sort((a, b) => a.y - b.y);
    for (const { r, y } of sorted) {
      c.beginPath();
      c.moveTo(x0, y + 140);
      for (let x = x0; x <= x0 + w + 12; x += 12) c.lineTo(x, y + Math.sin(x * r.f + r.ph) * r.amp + Math.sin(x * r.f * 2.3) * r.amp * 0.3);
      c.lineTo(x0 + w + 12, y + 140); c.closePath();
      const dg = c.createLinearGradient(0, y - r.amp, 0, y + 140);
      dg.addColorStop(0, `rgba(${Math.round(110 * r.shade)},${Math.round(50 * r.shade)},${Math.round(70 * r.shade)},1)`);
      dg.addColorStop(1, 'rgba(30,10,30,1)');
      c.fillStyle = dg; c.fill();
      c.strokeStyle = `rgba(255,190,130,${0.12 + beat * 0.08})`; c.lineWidth = 1.2;
      c.beginPath();
      for (let x = x0; x <= x0 + w + 12; x += 12) { const yy = y + Math.sin(x * r.f + r.ph) * r.amp + Math.sin(x * r.f * 2.3) * r.amp * 0.3; x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
      c.stroke();
    }
    // glass glints
    c.globalCompositeOperation = 'lighter';
    for (const gl of this.glints) {
      const yy = wrap(gl.y + this.scroll * 0.7, y0 - 20, y0 + h + 20);
      const a = Math.max(0, Math.sin(this.t * 2.5 * gl.s + gl.ph));
      if (a < 0.6) continue;
      c.fillStyle = `rgba(160,255,255,${(a - 0.6) * 2})`;
      star(c, gl.x, yy, 4 * gl.s, 0.8, 4, 0); c.fill();
    }
    // wind-blown sand
    c.strokeStyle = 'rgba(255,200,150,0.22)'; c.lineWidth = 1;
    c.beginPath();
    const wv = this.wind;
    for (const s of this.sand) {
      s.x += (wv * 2.5 + 20) * s.s * (1 / 60); s.y += this.scroll ? 0.5 : 0;
      s.x = wrap(s.x, x0 - 40, x0 + w + 40);
      const yy = wrap(s.y + this.scroll * 0.9, y0, y0 + h);
      const L = s.l * (0.4 + Math.abs(wv) / 80);
      c.moveTo(s.x, yy); c.lineTo(s.x - Math.sign(wv || 1) * L, yy + 1);
    }
    c.stroke();
    c.globalCompositeOperation = 'source-over';
  }
}

// ------------------------------------------------------------- IV. ROOTDEEP
class Forest extends BG {
  constructor(W, H) {
    super(W, H);
    const mk = (n, sz, sp) => Array.from({ length: n }, () => ({ x: rand(-60, W + 60), y: rand(0, 1200), r: rand(sz[0], sz[1]), hue: Math.random() < 0.5 ? '#b07bff' : '#4fffd2', ph: rand(TAU), sp }));
    this.far = mk(14, [18, 34], 0.4);
    this.near = mk(9, [34, 64], 1);
    this.roots = Array.from({ length: 10 }, (_, i) => ({ x: rand(-40, W + 40), y: i * 120, dx: rand(-120, 120), w: rand(4, 10) }));
    this.flies = Array.from({ length: 36 }, () => ({ x: rand(W), y: rand(900), vx: rand(-10, 10), vy: rand(-20, -5), ph: rand(TAU) }));
  }
  update(dt, speed) {
    super.update(dt, speed);
    for (const f of this.flies) { f.x += (f.vx + Math.sin(this.t + f.ph) * 15) * dt; f.y += (f.vy + speed * 0.5) * dt; }
  }
  _shroom(c, m, y, beat) {
    const grd = c.createRadialGradient(m.x - m.r * 0.3, y - m.r * 0.3, m.r * 0.1, m.x, y, m.r);
    grd.addColorStop(0, m.sp < 1 ? '#2a1d40' : '#3c2a5c'); grd.addColorStop(1, m.sp < 1 ? '#0f0b1c' : '#160f2a');
    c.fillStyle = grd; c.beginPath(); c.arc(m.x, y, m.r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(230,220,255,0.12)';
    for (let i = 0; i < 5; i++) { const a = m.ph + i * 1.3, d = m.r * 0.55; c.beginPath(); c.arc(m.x + Math.cos(a) * d, y + Math.sin(a) * d, m.r * 0.1, 0, TAU); c.fill(); }
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(m.hue, (m.sp < 1 ? 0.25 : 0.5) + beat * 0.3); c.lineWidth = m.sp < 1 ? 1.5 : 2.5;
    c.beginPath(); c.arc(m.x, y, m.r, 0, TAU); c.stroke();
    glow(c, m.x, y, m.r * 1.6, m.hue, 0.08 + beat * 0.1);
    c.globalCompositeOperation = 'source-over';
  }
  draw(c, x0, y0, w, h, beat) {
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#020c09'); g.addColorStop(1, '#06221a');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    // roots
    c.lineCap = 'round';
    for (const r of this.roots) {
      const yy = wrap(r.y + this.scroll * 0.55, y0 - 200, y0 - 200 + 1200);
      c.strokeStyle = 'rgba(40,90,60,0.45)'; c.lineWidth = r.w;
      c.beginPath(); c.moveTo(r.x, yy - 100); c.bezierCurveTo(r.x + r.dx, yy, r.x - r.dx, yy + 80, r.x + r.dx * 0.5, yy + 200); c.stroke();
      c.strokeStyle = `rgba(120,255,160,${0.06 + beat * 0.05})`; c.lineWidth = r.w * 0.3;
      c.stroke();
    }
    for (const m of this.far) { const yy = wrap(m.y + this.scroll * m.sp, y0 - 80, y0 - 80 + 1200); if (yy < y0 + h + 80) this._shroom(c, m, yy, beat * 0.5); }
    // fireflies
    c.globalCompositeOperation = 'lighter';
    for (const f of this.flies) {
      f.x = wrap(f.x, x0 - 10, x0 + w + 10); f.y = wrap(f.y, y0 - 10, y0 + h + 10);
      const a = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 2 + f.ph));
      glow(c, f.x, f.y, 7, '#c7ff7a', a * 0.8);
    }
    c.globalCompositeOperation = 'source-over';
    for (const m of this.near) { const yy = wrap(m.y + this.scroll * m.sp, y0 - 80, y0 - 80 + 1200); if (yy < y0 + h + 80) { c.globalAlpha = 0.85; this._shroom(c, m, yy, beat); c.globalAlpha = 1; } }
  }
}

// --------------------------------------------------------- V. AURORA SPIRE
function ribbonStrip(color) {
  const cv = makeCanvas(4, 128), g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, rgba(color, 0)); grd.addColorStop(0.7, rgba(color, 0.5)); grd.addColorStop(0.92, rgba(color, 0.9)); grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, 4, 128);
  return cv;
}
class Aurora extends BG {
  constructor(W, H) {
    super(W, H);
    this.stars = [0.15, 0.35, 0.7].map((sp) => ({ sp, s: Array.from({ length: 70 }, () => ({ x: rand(-80, W + 80), y: rand(0, 1000), b: rand(0.3, 1) })) }));
    this.ribbons = [['#4fffb0', 0.9, 0], ['#6fd8ff', 0.7, 2], ['#b06fff', 0.6, 4]].map(([c, a, ph]) => ({ strip: ribbonStrip(c), a, ph }));
    this.shoot = null;
  }
  update(dt, speed) {
    super.update(dt, speed);
    if (!this.shoot && Math.random() < dt * 0.25) this.shoot = { x: rand(this.W), y: rand(-50, 200), vx: rand(-300, 300), vy: rand(150, 300), life: 1 };
    if (this.shoot) { const s = this.shoot; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.2; if (s.life <= 0) this.shoot = null; }
  }
  draw(c, x0, y0, w, h, beat) {
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#01020a'); g.addColorStop(1, '#0a0d30');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    for (const L of this.stars) {
      for (const s of L.s) {
        const yy = wrap(s.y + this.scroll * L.sp, y0 - 5, y0 + h + 5);
        c.fillStyle = `rgba(220,230,255,${s.b * (0.6 + 0.4 * Math.sin(this.t * 3 + s.x))})`;
        const z = L.sp * 2.2;
        c.fillRect(s.x, yy, z, z);
      }
    }
    // planet
    const py = wrap(y0 + 150 + this.scroll * 0.05, y0 - 200, y0 + h + 200);
    const pg = c.createRadialGradient(this.W * 0.8 - 20, py - 20, 5, this.W * 0.8, py, 60);
    pg.addColorStop(0, '#5a4aa0'); pg.addColorStop(1, '#120a2a');
    c.fillStyle = pg; c.beginPath(); c.arc(this.W * 0.8, py, 55, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(200,180,255,0.35)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(this.W * 0.8, py, 95, 18, -0.3, 0, TAU); c.stroke();
    // aurora ribbons
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < this.ribbons.length; k++) {
      const R = this.ribbons[k];
      const base = y0 + h * (0.25 + k * 0.18) + Math.sin(this.t * 0.3 + k) * 30;
      c.globalAlpha = R.a * (0.45 + beat * 0.25);
      for (let x = x0; x < x0 + w; x += 5) {
        const yy = base + Math.sin(x * 0.012 + this.t * 0.7 + R.ph) * 40 + Math.sin(x * 0.031 - this.t * 1.1) * 14;
        const hh = 110 + Math.sin(x * 0.02 + this.t + R.ph) * 50;
        c.drawImage(R.strip, x, yy - hh, 6, hh);
      }
    }
    c.globalAlpha = 1;
    if (this.shoot) {
      const s = this.shoot;
      c.strokeStyle = `rgba(255,255,255,${s.life})`; c.lineWidth = 2;
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }
}

// --------------------------------------------------------------- VI. HUSH
class Hush extends BG {
  constructor(W, H) {
    super(W, H);
    this.motes = Array.from({ length: 80 }, () => ({ x: rand(-50, W + 50), y: rand(0, 900), s: rand(0.3, 1), ph: rand(TAU) }));
    this.holes = Array.from({ length: 7 }, (_, i) => ({ x: rand(-20, W + 20), y: i * 160, r: rand(30, 90) }));
  }
  draw(c, x0, y0, w, h, beat) {
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#060608'); g.addColorStop(1, '#14141c');
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    // slow rings
    const cx = this.W / 2, cy = y0 + h * 0.3;
    for (let i = 1; i < 9; i++) {
      c.strokeStyle = `rgba(200,200,230,${0.03 + (i % 3 === 0 ? 0.03 : 0) + beat * 0.02})`; c.lineWidth = 1;
      c.beginPath(); c.arc(cx, cy, i * 70 + Math.sin(this.t * 0.5 + i) * 6, 0, TAU); c.stroke();
    }
    for (const ho of this.holes) {
      const yy = wrap(ho.y + this.scroll * 0.4, y0 - 120, y0 - 120 + 1120);
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.arc(ho.x, yy, ho.r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(220,220,255,0.08)'; c.lineWidth = 2; c.stroke();
    }
    c.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const yy = wrap(m.y + this.scroll * m.s * 0.8 - this.t * 10, y0 - 10, y0 + h + 10);
      glow(c, m.x + Math.sin(this.t + m.ph) * 8, yy, 5 * m.s + 2, '#c9c9e0', 0.25 * m.s);
    }
    c.globalCompositeOperation = 'source-over';
  }
}

// Title screen: a calm starry sea with the lighthouse
class Title extends BG {
  constructor(W, H) { super(W, H); this.coast = new Coast(W, H); this.stars = Array.from({ length: 120 }, () => ({ x: rand(-200, W + 200), y: rand(0, 500), b: rand(0.2, 1) })); }
  update(dt) { super.update(dt, 0); this.coast.update(dt, 18); }
  draw(c, x0, y0, w, h, beat) {
    const lx = Math.max(x0 + 46, this.W * 0.13), base = y0 + h, top = base - 150;
    this.coast.beamO = { x: lx, y: top - 10 };
    this.coast.draw(c, x0, y0, w, h, beat);
    c.fillStyle = 'rgba(2,6,16,0.35)'; c.fillRect(x0, y0, w, h);
    for (const s of this.stars) {
      if (s.y > h * 0.5) continue;
      c.fillStyle = `rgba(230,235,255,${s.b * (0.5 + 0.5 * Math.sin(this.t * 2 + s.x))})`;
      c.fillRect(s.x, y0 + s.y, 1.4, 1.4);
    }
    // rocks
    c.fillStyle = '#03060d';
    c.beginPath(); c.moveTo(x0, base);
    c.lineTo(x0, base - 40); c.quadraticCurveTo(lx - 50, base - 70, lx - 20, base - 52);
    c.quadraticCurveTo(lx + 10, base - 62, lx + 40, base - 46); c.quadraticCurveTo(lx + 90, base - 30, lx + 130, base - 8);
    c.lineTo(lx + 160, base); c.closePath(); c.fill();
    // tower with stripes
    c.fillStyle = '#060b16';
    c.beginPath(); c.moveTo(lx - 16, base - 48); c.lineTo(lx - 10, top); c.lineTo(lx + 10, top); c.lineTo(lx + 16, base - 48); c.closePath(); c.fill();
    c.fillStyle = 'rgba(120,40,40,0.35)';
    for (let i = 0; i < 3; i++) { const y = base - 70 - i * 28; c.fillRect(lx - 14 + i * 1.2, y, 28 - i * 2.4, 9); }
    c.fillStyle = '#060b16'; c.fillRect(lx - 14, top - 4, 28, 5); c.fillRect(lx - 8, top - 22, 16, 18);
    c.beginPath(); c.moveTo(lx - 10, top - 22); c.lineTo(lx, top - 32); c.lineTo(lx + 10, top - 22); c.fill();
    c.globalCompositeOperation = 'lighter';
    glow(c, lx, top - 13, 46 + beat * 12, '#ffb347', 0.75);
    glow(c, lx, top - 13, 12, '#fff3c0', 1);
    c.globalCompositeOperation = 'source-over';
  }
}

export function makeBackground(id, W, H) {
  const M = { coast: Coast, city: City, desert: Desert, forest: Forest, aurora: Aurora, hush: Hush, title: Title };
  return new (M[id] || Coast)(W, H);
}
