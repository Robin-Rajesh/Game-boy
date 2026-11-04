// Rendering helpers: colour utils, cached glow sprites, character portraits.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const ease = (t) => t * t * (3 - 2 * t);

export function hex(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(h, a = 1) { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; }
export function mix(h1, h2, t) {
  const a = hex(h1), b = hex(h2);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------------------------------------------------------------- glow cache
const glowCache = new Map();
export function glowSprite(color) {
  let s = glowCache.get(color);
  if (s) return s;
  const R = 64;
  s = makeCanvas(R * 2, R * 2);
  const g = s.getContext('2d');
  const grd = g.createRadialGradient(R, R, 0, R, R, R);
  grd.addColorStop(0, rgba(color, 1));
  grd.addColorStop(0.18, rgba(color, 0.6));
  grd.addColorStop(0.45, rgba(color, 0.18));
  grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, R * 2, R * 2);
  glowCache.set(color, s);
  return s;
}
export function glow(ctx, x, y, r, color, a = 1) {
  if (a <= 0.003 || r <= 0.3) return;
  ctx.globalAlpha = a;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
}

// bullet: hot white core + coloured rim + soft glow
const bulletCache = new Map();
export function bulletSprite(color) {
  let s = bulletCache.get(color);
  if (s) return s;
  const R = 32;
  s = makeCanvas(R * 2, R * 2);
  const g = s.getContext('2d');
  let grd = g.createRadialGradient(R, R, 0, R, R, R);
  grd.addColorStop(0, rgba(color, 0.55));
  grd.addColorStop(0.5, rgba(color, 0.18));
  grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, R * 2, R * 2);
  grd = g.createRadialGradient(R, R, 0, R, R, R * 0.36);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.75, rgba(color, 1));
  grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd; g.beginPath(); g.arc(R, R, R * 0.36, 0, TAU); g.fill();
  bulletCache.set(color, s);
  return s;
}

// --------------------------------------------------------------- vignette
let vignette = null, vKey = '';
export function drawVignette(ctx, x, y, w, h, strength = 0.65) {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  if (key !== vKey) {
    vKey = key;
    vignette = makeCanvas(256, 256 * (h / w));
    const g = vignette.getContext('2d');
    const cw = vignette.width, chh = vignette.height;
    const grd = g.createRadialGradient(cw / 2, chh / 2, Math.min(cw, chh) * 0.35, cw / 2, chh / 2, Math.max(cw, chh) * 0.75);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = grd; g.fillRect(0, 0, cw, chh);
  }
  ctx.globalAlpha = strength;
  ctx.drawImage(vignette, x, y, w, h);
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ shapes
export function star(ctx, x, y, r1, r2, n, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * TAU;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function poly(ctx, x, y, r, n, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ================================================================ PORTRAITS
// Each portrait is drawn into a square of size S, animated by time t.
function eye(g, x, y, rx, ry, look, blink, iris = '#1a1430', shine = true) {
  const h = ry * (1 - blink);
  g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(x, y, rx, Math.max(0.6, h), 0, 0, TAU); g.fill();
  if (h > 1.5) {
    g.save(); g.beginPath(); g.ellipse(x, y, rx, h, 0, 0, TAU); g.clip();
    g.fillStyle = iris; g.beginPath(); g.arc(x + look * rx * 0.3, y + ry * 0.1, rx * 0.62, 0, TAU); g.fill();
    if (shine) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + look * rx * 0.3 - rx * 0.22, y - ry * 0.18, rx * 0.2, 0, TAU); g.fill(); }
    g.restore();
  }
}

function blinkAt(t, seed) {
  const p = (t + seed) % 3.7;
  return p < 0.12 ? Math.sin((p / 0.12) * Math.PI) : 0;
}

function bgGrad(g, S, c1, c2) {
  const grd = g.createLinearGradient(0, 0, 0, S);
  grd.addColorStop(0, c1); grd.addColorStop(1, c2);
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
}

export const PORTRAITS = {
  lio(g, S, t) {
    bgGrad(g, S, '#2a1405', '#0b0610');
    g.globalCompositeOperation = 'lighter';
    glow(g, S / 2, S * 0.58, S * 0.6, '#ff8a2a', 0.6);
    g.globalCompositeOperation = 'source-over';
    const fl = Math.sin(t * 9) * 0.04 + Math.sin(t * 13.3) * 0.03;
    const cx = S / 2, by = S * 0.86;
    const grd = g.createLinearGradient(0, S * 0.15, 0, by);
    grd.addColorStop(0, '#fff6c8'); grd.addColorStop(0.5, '#ffc04d'); grd.addColorStop(1, '#ff6a1a');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(cx + S * fl, S * 0.1);
    g.bezierCurveTo(cx + S * 0.38, S * 0.42, cx + S * 0.36, by, cx, by);
    g.bezierCurveTo(cx - S * 0.36, by, cx - S * 0.38, S * 0.42, cx + S * fl, S * 0.1);
    g.fill();
    g.fillStyle = 'rgba(255,255,230,0.75)';
    g.beginPath(); g.ellipse(cx, S * 0.66, S * 0.14, S * 0.16, 0, 0, TAU); g.fill();
    const b = blinkAt(t, 0.3);
    eye(g, cx - S * 0.1, S * 0.56, S * 0.055, S * 0.075, Math.sin(t * 0.7), b, '#3b1a00');
    eye(g, cx + S * 0.1, S * 0.56, S * 0.055, S * 0.075, Math.sin(t * 0.7), b, '#3b1a00');
    g.fillStyle = 'rgba(255,120,80,0.5)';
    g.beginPath(); g.ellipse(cx - S * 0.17, S * 0.65, S * 0.04, S * 0.02, 0, 0, TAU); g.ellipse(cx + S * 0.17, S * 0.65, S * 0.04, S * 0.02, 0, 0, TAU); g.fill();
  },

  maren(g, S, t) {
    bgGrad(g, S, '#0e2238', '#060b16');
    g.globalCompositeOperation = 'lighter';
    glow(g, S * 0.78, S * 0.88, S * 0.45, '#ffb347', 0.55 + Math.sin(t * 5) * 0.06);
    g.globalCompositeOperation = 'source-over';
    // shoulders / cloak
    g.fillStyle = '#1d3b4f';
    g.beginPath(); g.moveTo(S * 0.05, S); g.quadraticCurveTo(S * 0.5, S * 0.55, S * 0.95, S); g.fill();
    // hood back
    g.fillStyle = '#25506a';
    g.beginPath(); g.ellipse(S / 2, S * 0.48, S * 0.3, S * 0.34, 0, 0, TAU); g.fill();
    // face
    g.fillStyle = '#e8b896';
    g.beginPath(); g.ellipse(S / 2, S * 0.5, S * 0.19, S * 0.23, 0, 0, TAU); g.fill();
    // white hair fringe
    g.fillStyle = '#eef2f7';
    g.beginPath(); g.ellipse(S / 2, S * 0.33, S * 0.2, S * 0.1, 0, Math.PI, TAU); g.fill();
    g.beginPath(); g.ellipse(S * 0.33, S * 0.47, S * 0.05, S * 0.14, 0.2, 0, TAU); g.ellipse(S * 0.67, S * 0.47, S * 0.05, S * 0.14, -0.2, 0, TAU); g.fill();
    // hood rim
    g.strokeStyle = '#3a7590'; g.lineWidth = S * 0.04;
    g.beginPath(); g.ellipse(S / 2, S * 0.48, S * 0.27, S * 0.31, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // eyes (kind, crinkled)
    const b = blinkAt(t, 1.4);
    eye(g, S * 0.42, S * 0.5, S * 0.035, S * 0.03, 0.2, Math.max(b, 0.35), '#2e5a6e', false);
    eye(g, S * 0.58, S * 0.5, S * 0.035, S * 0.03, 0.2, Math.max(b, 0.35), '#2e5a6e', false);
    // round glasses
    g.strokeStyle = '#c9a25a'; g.lineWidth = S * 0.012;
    g.beginPath(); g.arc(S * 0.42, S * 0.5, S * 0.055, 0, TAU); g.moveTo(S * 0.635, S * 0.5); g.arc(S * 0.58, S * 0.5, S * 0.055, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(S * 0.475, S * 0.49); g.lineTo(S * 0.525, S * 0.49); g.stroke();
    // smile
    g.strokeStyle = '#9b5d4a'; g.lineWidth = S * 0.014;
    g.beginPath(); g.arc(S / 2, S * 0.58, S * 0.05, 0.2, Math.PI - 0.2); g.stroke();
    // lantern
    g.fillStyle = '#3a2a10'; g.fillRect(S * 0.72, S * 0.8, S * 0.12, S * 0.16);
    g.fillStyle = '#ffd27a'; g.fillRect(S * 0.74, S * 0.83, S * 0.08, S * 0.1);
  },

  juno(g, S, t) {
    bgGrad(g, S, '#2a0838', '#08021a');
    g.strokeStyle = 'rgba(255,79,216,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 8; i++) { const y = S * 0.6 + i * i * S * 0.008 + ((t * 20) % 8); g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    // neck/shoulders
    g.fillStyle = '#3c3f5a'; g.beginPath(); g.moveTo(S * 0.15, S); g.quadraticCurveTo(S / 2, S * 0.72, S * 0.85, S); g.fill();
    g.fillStyle = '#5a5f80'; g.fillRect(S * 0.44, S * 0.7, S * 0.12, S * 0.12);
    // head
    const bob = Math.sin(t * 4.5) * S * 0.015;
    g.save(); g.translate(0, bob);
    const hg = g.createLinearGradient(0, S * 0.2, 0, S * 0.75);
    hg.addColorStop(0, '#d9dcef'); hg.addColorStop(1, '#8a8fb0');
    g.fillStyle = hg;
    g.beginPath(); g.roundRect(S * 0.26, S * 0.2, S * 0.48, S * 0.52, S * 0.16); g.fill();
    // antenna
    g.strokeStyle = '#8a8fb0'; g.lineWidth = S * 0.02;
    g.beginPath(); g.moveTo(S * 0.5, S * 0.2); g.lineTo(S * 0.5, S * 0.1); g.stroke();
    g.globalCompositeOperation = 'lighter'; glow(g, S * 0.5, S * 0.09, S * 0.08, '#ff4fd8', 0.9 + Math.sin(t * 8) * 0.1); g.globalCompositeOperation = 'source-over';
    // visor
    g.fillStyle = '#0b0420';
    g.beginPath(); g.roundRect(S * 0.3, S * 0.36, S * 0.4, S * 0.17, S * 0.08); g.fill();
    // equalizer eyes
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const h = (0.25 + 0.75 * Math.abs(Math.sin(t * 6 + i * 1.3))) * S * 0.12;
      g.fillStyle = i % 2 ? '#4ff3ff' : '#ff4fd8';
      g.fillRect(S * 0.335 + i * S * 0.047, S * 0.445 - h / 2, S * 0.03, h);
    }
    g.globalCompositeOperation = 'source-over';
    // smile
    g.strokeStyle = '#3c3f5a'; g.lineWidth = S * 0.018;
    g.beginPath(); g.arc(S / 2, S * 0.58, S * 0.06, 0.3, Math.PI - 0.3); g.stroke();
    // headphones
    g.fillStyle = '#ff4fd8';
    g.beginPath(); g.ellipse(S * 0.25, S * 0.46, S * 0.06, S * 0.11, 0, 0, TAU); g.ellipse(S * 0.75, S * 0.46, S * 0.06, S * 0.11, 0, 0, TAU); g.fill();
    g.strokeStyle = '#ff4fd8'; g.lineWidth = S * 0.035;
    g.beginPath(); g.arc(S / 2, S * 0.42, S * 0.27, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.restore();
  },

  sefa(g, S, t) {
    bgGrad(g, S, '#5a2a3a', '#1a0a18');
    g.globalCompositeOperation = 'lighter';
    glow(g, S * 0.2, S * 0.25, S * 0.4, '#ff9d3c', 0.35);
    g.globalCompositeOperation = 'source-over';
    // scarf flowing
    g.fillStyle = '#c4622d';
    const w = Math.sin(t * 2) * S * 0.04;
    g.beginPath(); g.moveTo(S * 0.6, S * 0.6); g.quadraticCurveTo(S * 0.85, S * 0.55 + w, S * 1.05, S * 0.62 - w); g.lineTo(S * 1.05, S * 0.78); g.quadraticCurveTo(S * 0.85, S * 0.7 + w, S * 0.62, S * 0.75); g.fill();
    // shoulders
    g.fillStyle = '#7a3a24'; g.beginPath(); g.moveTo(S * 0.1, S); g.quadraticCurveTo(S / 2, S * 0.62, S * 0.9, S); g.fill();
    // head wrap
    g.fillStyle = '#e0b07a';
    g.beginPath(); g.ellipse(S / 2, S * 0.45, S * 0.24, S * 0.28, 0, 0, TAU); g.fill();
    // face slit (skin)
    g.fillStyle = '#a8704f';
    g.beginPath(); g.roundRect(S * 0.32, S * 0.38, S * 0.36, S * 0.13, S * 0.06); g.fill();
    // veil over lower face
    g.fillStyle = '#d29a62';
    g.beginPath(); g.moveTo(S * 0.28, S * 0.5); g.quadraticCurveTo(S / 2, S * 0.48, S * 0.72, S * 0.5); g.quadraticCurveTo(S * 0.7, S * 0.72, S / 2, S * 0.76); g.quadraticCurveTo(S * 0.3, S * 0.72, S * 0.28, S * 0.5); g.fill();
    // eyes with kohl
    const b = blinkAt(t, 2.1);
    g.fillStyle = '#1a0a10';
    g.beginPath(); g.ellipse(S * 0.42, S * 0.445, S * 0.05, S * 0.03, 0, 0, TAU); g.ellipse(S * 0.58, S * 0.445, S * 0.05, S * 0.03, 0, 0, TAU); g.fill();
    eye(g, S * 0.42, S * 0.445, S * 0.038, S * 0.022, -0.2, b, '#6b3a12');
    eye(g, S * 0.58, S * 0.445, S * 0.038, S * 0.022, -0.2, b, '#6b3a12');
    // gold ornament
    g.globalCompositeOperation = 'lighter';
    glow(g, S / 2, S * 0.3, S * 0.06, '#ffd27a', 0.9);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#ffd27a'; poly(g, S / 2, S * 0.3, S * 0.025, 4, t); g.fill();
  },

  moss(g, S, t) {
    bgGrad(g, S, '#0c2a1c', '#04100a');
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) glow(g, (i * 0.19 * S + t * 6) % S, S * (0.2 + 0.6 * ((i * 0.37) % 1)), S * 0.05, '#8dff9a', 0.5);
    g.globalCompositeOperation = 'source-over';
    // trunk face
    const tg = g.createLinearGradient(S * 0.2, 0, S * 0.8, 0);
    tg.addColorStop(0, '#3b2615'); tg.addColorStop(0.5, '#6b4628'); tg.addColorStop(1, '#3b2615');
    g.fillStyle = tg;
    g.beginPath(); g.moveTo(S * 0.18, S); g.quadraticCurveTo(S * 0.2, S * 0.3, S * 0.5, S * 0.22); g.quadraticCurveTo(S * 0.8, S * 0.3, S * 0.82, S); g.fill();
    // bark lines
    g.strokeStyle = 'rgba(30,15,5,0.6)'; g.lineWidth = S * 0.012;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(S * (0.28 + i * 0.11), S); g.quadraticCurveTo(S * (0.3 + i * 0.1), S * 0.75, S * (0.3 + i * 0.1), S * 0.62); g.stroke(); }
    // moss cap
    g.fillStyle = '#4caa4a';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(S * (0.22 + i * 0.07), S * (0.28 + Math.sin(i * 2) * 0.03), S * 0.07, 0, TAU); g.fill(); }
    // sleepy eyes
    const lid = 0.55 + 0.35 * Math.max(0, Math.sin(t * 0.5));
    g.globalCompositeOperation = 'lighter';
    glow(g, S * 0.39, S * 0.5, S * 0.08, '#c7ff7a', 0.6);
    glow(g, S * 0.61, S * 0.5, S * 0.08, '#c7ff7a', 0.6);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#e8ffb0';
    g.beginPath(); g.ellipse(S * 0.39, S * 0.5, S * 0.05, S * 0.04 * (1 - lid) + 1, 0, 0, TAU); g.ellipse(S * 0.61, S * 0.5, S * 0.05, S * 0.04 * (1 - lid) + 1, 0, 0, TAU); g.fill();
    // mouth
    g.fillStyle = '#1e1008';
    g.beginPath(); g.ellipse(S / 2, S * 0.66, S * 0.07, S * 0.025 + Math.sin(t * 1.3) * S * 0.008, 0, 0, TAU); g.fill();
    // tiny mushroom
    g.fillStyle = '#e9e1d0'; g.fillRect(S * 0.76, S * 0.33, S * 0.025, S * 0.06);
    g.fillStyle = '#d94f6a'; g.beginPath(); g.ellipse(S * 0.772, S * 0.33, S * 0.05, S * 0.03, 0, Math.PI, TAU); g.fill();
  },

  vesper(g, S, t) {
    bgGrad(g, S, '#0a0f35', '#03030f');
    g.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) { const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i)); g.globalAlpha = a; g.fillRect((i * 53.7) % S, (i * 31.3) % (S * 0.6), 1.5, 1.5); }
    g.globalAlpha = 1;
    // shoulders, scarf
    g.fillStyle = '#2b2f6a'; g.beginPath(); g.moveTo(S * 0.1, S); g.quadraticCurveTo(S / 2, S * 0.64, S * 0.9, S); g.fill();
    g.fillStyle = '#e65d8c'; g.beginPath(); g.ellipse(S / 2, S * 0.76, S * 0.22, S * 0.06, 0, 0, TAU); g.fill();
    // hair back
    g.fillStyle = '#1b1238'; g.beginPath(); g.ellipse(S / 2, S * 0.46, S * 0.27, S * 0.29, 0, 0, TAU); g.fill();
    // face
    g.fillStyle = '#f0c8a8'; g.beginPath(); g.ellipse(S / 2, S * 0.5, S * 0.18, S * 0.21, 0, 0, TAU); g.fill();
    // bangs
    g.fillStyle = '#1b1238'; g.beginPath(); g.moveTo(S * 0.3, S * 0.45); g.quadraticCurveTo(S * 0.35, S * 0.22, S / 2, S * 0.22); g.quadraticCurveTo(S * 0.68, S * 0.22, S * 0.71, S * 0.45); g.quadraticCurveTo(S * 0.6, S * 0.34, S * 0.5, S * 0.36); g.quadraticCurveTo(S * 0.4, S * 0.33, S * 0.3, S * 0.45); g.fill();
    // big round glasses with star reflections
    const b = blinkAt(t, 0.9);
    eye(g, S * 0.42, S * 0.52, S * 0.04, S * 0.045, Math.sin(t), b, '#2a3a8a');
    eye(g, S * 0.58, S * 0.52, S * 0.04, S * 0.045, Math.sin(t), b, '#2a3a8a');
    g.strokeStyle = '#ffd27a'; g.lineWidth = S * 0.014;
    g.beginPath(); g.arc(S * 0.42, S * 0.52, S * 0.075, 0, TAU); g.moveTo(S * 0.655, S * 0.52); g.arc(S * 0.58, S * 0.52, S * 0.075, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(160,220,255,0.18)';
    g.beginPath(); g.arc(S * 0.42, S * 0.52, S * 0.07, 0, TAU); g.arc(S * 0.58, S * 0.52, S * 0.07, 0, TAU); g.fill();
    // smile + blush
    g.strokeStyle = '#a5505a'; g.lineWidth = S * 0.013;
    g.beginPath(); g.arc(S / 2, S * 0.6, S * 0.035, 0.3, Math.PI - 0.3); g.stroke();
    // star hair clip
    g.globalCompositeOperation = 'lighter'; glow(g, S * 0.68, S * 0.3, S * 0.07, '#ffe27a', 0.8); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#ffe27a'; star(g, S * 0.68, S * 0.3, S * 0.045, S * 0.02, 5, t * 0.5); g.fill();
  },

  hush(g, S, t) {
    g.fillStyle = '#050508'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(200,200,220,${0.05 + Math.random() * 0.06})`; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
    const r = S * (0.34 + Math.sin(t * 1.3) * 0.01);
    const grd = g.createRadialGradient(S / 2, S / 2, r * 0.6, S / 2, S / 2, r * 1.3);
    grd.addColorStop(0, '#000'); grd.addColorStop(0.7, 'rgba(180,180,200,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    g.fillStyle = '#000'; g.beginPath(); g.arc(S / 2, S / 2, r, 0, TAU); g.fill();
    const open = 0.5 + 0.5 * Math.sin(t * 0.8);
    g.fillStyle = '#f2f2ff';
    g.beginPath(); g.ellipse(S / 2, S / 2, S * 0.12, S * 0.05 * open + 0.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.03 * open, 0, TAU); g.fill();
  },

  rest(g, S, t) {
    bgGrad(g, S, '#1a1a2e', '#0a0a14');
    g.globalCompositeOperation = 'lighter';
    glow(g, S / 2, S * 0.55, S * 0.5, '#d8d8ff', 0.5 + Math.sin(t * 1.5) * 0.08);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#f4f4ff';
    g.beginPath(); g.arc(S / 2, S * 0.55, S * 0.22, 0, TAU); g.fill();
    g.strokeStyle = '#6a6a90'; g.lineWidth = S * 0.018; g.lineCap = 'round';
    g.beginPath(); g.arc(S * 0.43, S * 0.53, S * 0.035, Math.PI + 0.3, TAU - 0.3); g.stroke();
    g.beginPath(); g.arc(S * 0.57, S * 0.53, S * 0.035, Math.PI + 0.3, TAU - 0.3); g.stroke();
    g.beginPath(); g.arc(S / 2, S * 0.6, S * 0.03, 0.4, Math.PI - 0.4); g.stroke();
    g.fillStyle = 'rgba(255,150,180,0.4)';
    g.beginPath(); g.ellipse(S * 0.38, S * 0.6, S * 0.03, S * 0.017, 0, 0, TAU); g.ellipse(S * 0.62, S * 0.6, S * 0.03, S * 0.017, 0, 0, TAU); g.fill();
    g.lineCap = 'butt';
  },
};

export function drawPortrait(g, id, S, t) {
  const fn = PORTRAITS[id];
  g.save();
  g.clearRect(0, 0, S, S);
  if (fn) fn(g, S, t);
  g.restore();
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
