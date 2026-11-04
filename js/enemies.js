// Enemy behaviours (kinds) and per-chapter visual skins.
import { TAU, glow, rgba, star, poly, rand, ease } from './gfx.js';

// Every kind: r, hp, score; init(e,p,g); update(e,dt,g); step(e,s,g)
export const KINDS = {
  drifter: {
    r: 11, hp: 4, score: 100,
    init(e, p) { e.x0 = e.x; e.amp = p.amp ?? rand(18, 40); e.freq = p.freq ?? rand(1.2, 2.2); e.vy = p.vy ?? rand(60, 85); e.period = 16; },
    update(e, dt) { e.y += e.vy * dt; e.x = e.x0 + Math.sin(e.t * e.freq + e.ph) * e.amp; },
    step(e, s, g) {
      if ((s + e.off) % g.period(e.period) === 0 && e.y > 10 && e.y < g.H * 0.6) g.shoot(e.x, e.y, g.aim(e.x, e.y), 105, { r: 4 });
    },
  },
  swoop: {
    r: 10, hp: 3, score: 120,
    init(e, p, g) {
      const side = p.side ?? (e.x < g.W / 2 ? -1 : 1);
      e.p0 = { x: side < 0 ? -30 : g.W + 30, y: p.y0 ?? rand(40, 120) };
      e.p1 = { x: g.W / 2 + side * -(p.bend ?? 40), y: p.y1 ?? g.H * 0.55 };
      e.p2 = { x: side < 0 ? g.W + 40 : -40, y: p.y2 ?? rand(60, 180) };
      e.dur = p.dur ?? 4.2; e.x = e.p0.x; e.y = e.p0.y; e.fired = false;
    },
    update(e, dt) {
      const u = Math.min(1, e.t / e.dur), a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      e.x = a * e.p0.x + b * e.p1.x + c * e.p2.x;
      e.y = a * e.p0.y + b * e.p1.y + c * e.p2.y;
      if (u >= 1) e.gone = true;
    },
    step(e, s, g) {
      if (!e.fired && e.t > e.dur * 0.35 && s % 4 === 0) { e.fired = true; g.fan(e.x, e.y, g.aim(e.x, e.y), g.n(2), 0.28, 120, { r: 3.5 }); }
    },
  },
  dart: {
    r: 10, hp: 5, score: 150,
    init(e, p, g) { e.ty = p.ty ?? rand(70, g.H * 0.35); e.y0 = e.y; e.state = 0; },
    update(e, dt, g) {
      if (e.state === 0) { const u = Math.min(1, e.t / 0.9); e.y = e.y0 + (e.ty - e.y0) * ease(u); if (u >= 1) { e.state = 1; e.t2 = 0; } }
      else if (e.state === 1) { e.t2 += dt; e.ang = g.aim(e.x, e.y); if (e.t2 > 0.7) { e.state = 2; e.vx = Math.cos(e.ang) * 300; e.vy = Math.sin(e.ang) * 300; } }
      else { e.x += e.vx * dt; e.y += e.vy * dt; }
    },
    step(e, s, g) { if (e.state === 1 && s % 4 === 0) g.shoot(e.x, e.y, g.aim(e.x, e.y), 140, { r: 3.5 }); },
  },
  spinner: {
    r: 16, hp: 26, score: 400,
    init(e, p, g) { e.ty = p.ty ?? rand(80, g.H * 0.3); e.y0 = e.y; e.stay = p.stay ?? 6; e.rot = rand(TAU); },
    update(e, dt) {
      const u = Math.min(1, e.t / 1.2);
      if (e.t < e.stay) e.y = e.y0 + (e.ty - e.y0) * ease(u);
      else e.y += 110 * dt;
      e.rot += dt * 1.5;
    },
    step(e, s, g) {
      if (e.t > 1 && e.t < e.stay && (s + e.off) % g.period(8) === 0) g.ring(e.x, e.y, g.n(10), 85, e.rot, { r: 4 });
    },
  },
  heavy: {
    r: 24, hp: 80, score: 1200, drop: 'spark',
    init(e, p, g) { e.ty = p.ty ?? g.H * 0.22; e.y0 = e.y; e.stay = p.stay ?? 8; e.spin = 0; e.dir = p.dir ?? (Math.random() < 0.5 ? 1 : -1); },
    update(e, dt) {
      const u = Math.min(1, e.t / 2);
      if (e.t < e.stay) { e.y = e.y0 + (e.ty - e.y0) * ease(u); e.x += Math.sin(e.t * 0.7) * 12 * dt; }
      else e.y += 70 * dt;
      e.spin += dt * 0.9 * e.dir;
    },
    step(e, s, g) {
      if (e.t < 1.6 || e.t > e.stay) return;
      if (s % 2 === 0) for (let k = 0; k < 3; k++) g.shoot(e.x, e.y, e.spin + k * TAU / 3 + s * 0.11 * e.dir, 95, { r: 4.5, c: 2 });
      if (s % 16 === 8) g.fan(e.x, e.y, g.aim(e.x, e.y), g.n(5), 0.7, 130, { r: 4 });
    },
  },
  mine: {
    r: 12, hp: 7, score: 200,
    init(e, p) { e.vy = p.vy ?? rand(35, 55); e.vx = p.vx ?? rand(-12, 12); e.rot = rand(TAU); },
    update(e, dt) { e.y += e.vy * dt; e.x += e.vx * dt; e.rot += dt; },
    step() {},
    die(e, g) { if (e.y < g.H * 0.75) g.ring(e.x, e.y, g.n(9), 70, e.rot, { r: 4, c: 2 }); },
  },
};

// ------------------------------------------------------------------ skins
const SKINS = {
  moth(c, e, t, beat, col) {
    const s = e.r / 11, flap = Math.sin(t * 14 + e.ph) * 0.35;
    c.save(); c.translate(e.x, e.y); c.scale(s, s);
    c.fillStyle = rgba(col, 0.28); c.strokeStyle = rgba(col, 0.85); c.lineWidth = 1.2;
    for (const sd of [-1, 1]) {
      c.save(); c.scale(sd, 1);
      c.save(); c.rotate(-0.5 - flap); c.beginPath(); c.ellipse(9, -2, 10, 6.5, 0, 0, TAU); c.fill(); c.stroke(); c.restore();
      c.save(); c.rotate(0.4 + flap * 0.6); c.beginPath(); c.ellipse(7, 4, 6.5, 4.5, 0, 0, TAU); c.fill(); c.stroke(); c.restore();
      c.fillStyle = rgba('#ffffff', 0.35); c.beginPath(); c.arc(9, -3, 2.2, 0, TAU); c.fill(); c.fillStyle = rgba(col, 0.28);
      c.restore();
    }
    c.fillStyle = '#1b2436'; c.beginPath(); c.ellipse(0, 1, 3, 8, 0, 0, TAU); c.fill();
    c.fillStyle = '#eaf4ff'; c.beginPath(); c.arc(-1.4, -5, 1.2, 0, TAU); c.arc(1.4, -5, 1.2, 0, TAU); c.fill();
    c.restore();
  },
  cube(c, e, t, beat, col) {
    const s = e.r, rot = t * 1.4 + e.ph;
    const cc = e.alt ? '#4ff3ff' : col;
    c.save(); c.translate(e.x + (Math.random() < 0.04 ? rand(-4, 4) : 0), e.y);
    c.rotate(rot);
    const pulse = 1 + beat * 0.18;
    c.fillStyle = rgba(cc, 0.18); c.strokeStyle = cc; c.lineWidth = 2;
    c.fillRect(-s * pulse, -s * pulse, s * 2 * pulse, s * 2 * pulse);
    c.strokeRect(-s * pulse, -s * pulse, s * 2 * pulse, s * 2 * pulse);
    c.rotate(-rot * 2);
    c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 1;
    c.strokeRect(-s * 0.5, -s * 0.5, s, s);
    c.restore();
    if (Math.random() < 0.08) { c.fillStyle = rgba(cc, 0.6); c.fillRect(e.x - s * 1.5, e.y + rand(-s, s), s * 3, 1.5); }
  },
  shard(c, e, t, beat, col) {
    const s = e.r, rot = t * 2 + e.ph;
    c.save(); c.translate(e.x, e.y); c.rotate(rot);
    const grd = c.createLinearGradient(-s, -s, s, s);
    grd.addColorStop(0, rgba('#bff9ff', 0.8)); grd.addColorStop(0.5, rgba(col, 0.35)); grd.addColorStop(1, rgba('#ff7a3c', 0.6));
    c.fillStyle = grd;
    c.beginPath(); c.moveTo(0, -s * 1.3); c.lineTo(s * 0.8, 0); c.lineTo(0, s * 1.3); c.lineTo(-s * 0.8, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.moveTo(0, -s * 1.3); c.lineTo(0, s * 1.3); c.moveTo(-s * 0.8, 0); c.lineTo(s * 0.8, 0); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.stroke();
    c.restore();
  },
  spore(c, e, t, beat, col) {
    const s = e.r;
    c.save(); c.translate(e.x, e.y);
    c.strokeStyle = rgba(col, 0.75); c.lineWidth = 1.6; c.lineCap = 'round';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.6 + e.ph, w = Math.sin(t * 5 + i) * 0.4;
      c.beginPath(); c.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
      c.quadraticCurveTo(Math.cos(a + w) * s * 1.3, Math.sin(a + w) * s * 1.3, Math.cos(a + w * 2) * s * 1.7, Math.sin(a + w * 2) * s * 1.7);
      c.stroke();
    }
    const grd = c.createRadialGradient(-s * 0.2, -s * 0.2, 1, 0, 0, s);
    grd.addColorStop(0, '#f0d0ff'); grd.addColorStop(0.5, rgba(col, 0.8)); grd.addColorStop(1, '#2a1240');
    c.fillStyle = grd; c.beginPath(); c.arc(0, 0, s * (0.75 + beat * 0.1), 0, TAU); c.fill();
    c.fillStyle = '#8dff9a'; c.beginPath(); c.arc(0, 0, s * 0.2, 0, TAU); c.fill();
    c.restore();
  },
  star(c, e, t, beat, col) {
    const s = e.r;
    c.save(); c.translate(e.x, e.y);
    c.fillStyle = rgba(col, 0.25); c.strokeStyle = col; c.lineWidth = 1.5;
    star(c, 0, 0, s * 1.35, s * 0.55, 5, t * 1.2 + e.ph); c.fill(); c.stroke();
    star(c, 0, 0, s * 0.9, s * 0.4, 5, -t * 2 + e.ph); c.strokeStyle = rgba('#ff8ae0', 0.7); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, s * 0.42, s * 0.26, 0, 0, TAU); c.fill();
    c.fillStyle = '#10103a'; c.beginPath(); c.arc(0, 0, s * 0.18, 0, TAU); c.fill();
    c.restore();
  },
  void(c, e, t, beat, col) {
    const s = e.r, a = 0.55 + 0.45 * Math.sin(t * 3 + e.ph);
    c.save(); c.translate(e.x, e.y); c.globalAlpha = a;
    c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(235,235,255,0.85)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(0, 0, s, 0, TAU); c.stroke();
    c.beginPath(); c.arc(0, 0, s * 1.35, t + e.ph, t + e.ph + 2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, s * 0.45, s * 0.14 + s * 0.12 * Math.abs(Math.sin(t * 1.3 + e.ph)), 0, 0, TAU); c.fill();
    c.restore();
  },
};

export function drawEnemy(c, e, skin, t, beat, col) {
  // under-glow
  c.globalCompositeOperation = 'lighter';
  glow(c, e.x, e.y, e.r * 3, e.alt && skin === 'cube' ? '#4ff3ff' : col, 0.28 + beat * 0.12);
  c.globalCompositeOperation = 'source-over';
  const fn = SKINS[skin] || SKINS.moth;
  fn(c, e, t, beat, col);
  if (e.kind === 'heavy' || e.kind === 'spinner') {
    // menace ring
    c.strokeStyle = rgba(col, 0.5); c.lineWidth = 1.5;
    c.beginPath(); c.arc(e.x, e.y, e.r * 1.55, t * 2, t * 2 + 4.2); c.stroke();
    if (e.kind === 'heavy') {
      poly(c, e.x, e.y, e.r * 1.9, 6, -t); c.strokeStyle = rgba(col, 0.25); c.stroke();
      // hp arc
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
      c.beginPath(); c.arc(e.x, e.y, e.r * 2.15, -Math.PI / 2, -Math.PI / 2 + TAU * (e.hp / e.maxHp)); c.stroke();
    }
  }
  if (e.flash > 0) {
    c.globalCompositeOperation = 'lighter';
    glow(c, e.x, e.y, e.r * 2.2, '#ffffff', e.flash * 6);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = 1;
}
