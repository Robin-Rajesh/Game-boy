// Bosses: movement, beat-synced attack phases, bespoke rendering.
// Pattern rows: [everySteps, offset, patternName, args]
import { TAU, glow, rgba, star, poly, rand } from './gfx.js';

export const BOSSES = {
  // ======================================================== THE TIDEWARDEN
  tidewarden: {
    name: 'THE TIDEWARDEN', sub: 'Bell of the Drowned Harbour', hp: 1300,
    init(b, g) { b.x = g.W / 2; b.y = -140; b.ty = g.H * 0.19; b.swing = 0; },
    move(b, dt, g) {
      b.x = g.W / 2 + Math.sin(b.t * 0.42) * g.W * 0.24;
      b.y = b.ty + Math.sin(b.t * 0.9) * 10;
      b.swing = Math.sin(b.t * 2.2);
      b.ox = b.x + b.swing * 5; b.oy = b.y + 40;
    },
    hit(b) { return [[b.x, b.y + 8, 42]]; },
    phases: [
      { hp: 1, pats: [[16, 0, 'ring', { n: 18, spd: 82 }], [4, 2, 'fan', { n: 3, spread: 0.3, spd: 130 }]] },
      { hp: 0.66, say: ['maren', 'It rings faster! Breathe, little one. Find the gaps.'],
        pats: [[8, 0, 'ring', { n: 20, spd: 88, rot: 'spin' }], [2, 1, 'spiral', { arms: 2, spd: 110, inc: 0.34, c: 2 }]] },
      { hp: 0.33, say: ['maren', 'Almost there! Let it hear your song!'], tempo: 1.12,
        pats: [[16, 0, 'ring', { n: 22, spd: 72 }], [16, 0, 'ring', { n: 22, spd: 112, rot: 0.14, c: 2 }],
               [4, 2, 'fan', { n: 5, spread: 0.55, spd: 140 }], [8, 4, 'rain', { n: 5, spd: 115 }]] },
    ],
    draw(c, b, g, t, beat) {
      c.save(); c.translate(b.x, b.y - 46); c.rotate(b.swing * 0.12);
      // chains
      c.strokeStyle = 'rgba(120,160,170,0.6)'; c.lineWidth = 3;
      c.setLineDash([6, 4]);
      c.beginPath(); c.moveTo(-6, -2); c.lineTo(-30, -300); c.moveTo(6, -2); c.lineTo(30, -300); c.stroke();
      c.setLineDash([]);
      // crown loop
      c.strokeStyle = '#3c7f78'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 9, Math.PI, TAU); c.stroke();
      // bell body
      const grd = c.createLinearGradient(-48, 0, 48, 0);
      grd.addColorStop(0, '#10292a'); grd.addColorStop(0.35, '#2f6f6a'); grd.addColorStop(0.6, '#1d4846'); grd.addColorStop(1, '#0b1d1e');
      c.fillStyle = grd;
      c.beginPath(); c.moveTo(-16, 4); c.bezierCurveTo(-22, 30, -30, 58, -52, 86); c.quadraticCurveTo(0, 100, 52, 86); c.bezierCurveTo(30, 58, 22, 30, 16, 4); c.closePath(); c.fill();
      c.strokeStyle = '#7fe0cf'; c.lineWidth = 1.5; c.stroke();
      // rim band
      c.strokeStyle = 'rgba(160,240,220,0.5)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-46, 78); c.quadraticCurveTo(0, 92, 46, 78); c.stroke();
      // glowing cracks
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba('#7ab8ff', 0.5 + beat * 0.5); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-10, 20); c.lineTo(-18, 40); c.lineTo(-12, 52); c.lineTo(-24, 70); c.moveTo(12, 30); c.lineTo(20, 48); c.lineTo(14, 64); c.stroke();
      glow(c, 0, 92, 70 + beat * 20, '#7ab8ff', 0.35 + beat * 0.25);
      c.globalCompositeOperation = 'source-over';
      // mouth & eye
      c.fillStyle = '#02080c'; c.beginPath(); c.ellipse(0, 88, 44, 9, 0, 0, TAU); c.fill();
      const look = g.player ? Math.max(-1, Math.min(1, (g.player.x - b.x) / 120)) : 0;
      c.fillStyle = '#e8f6ff'; c.beginPath(); c.ellipse(look * 6, 88, 13, 5 + beat * 2, 0, 0, TAU); c.fill();
      c.fillStyle = '#1a5ab8'; c.beginPath(); c.arc(look * 9, 88, 3.6, 0, TAU); c.fill();
      // clapper
      c.fillStyle = '#7fa0a0'; c.beginPath(); c.arc(Math.sin(t * 2.2 + 1) * 10, 104, 7, 0, TAU); c.fill();
      // seaweed
      c.strokeStyle = 'rgba(60,140,90,0.8)'; c.lineWidth = 2;
      for (let i = -3; i <= 3; i++) { const x = i * 13; c.beginPath(); c.moveTo(x, 90); c.quadraticCurveTo(x + Math.sin(t * 2 + i) * 6, 110, x + Math.sin(t * 1.5 + i) * 8, 124 + (i % 2) * 8); c.stroke(); }
      c.restore();
    },
  },

  // ======================================================== THE STATIC KING
  staticking: {
    name: 'THE STATIC KING', sub: 'Lord of Every Screen', hp: 2000,
    init(b, g) { b.x = g.W / 2; b.y = -140; b.ty = g.H * 0.18; },
    move(b, dt, g) {
      b.x = g.W / 2 + Math.sin(b.t * 0.55) * g.W * 0.26 + (Math.random() < 0.02 ? rand(-6, 6) : 0);
      b.y = b.ty + Math.sin(b.t * 1.3) * 8;
      b.ox = b.x; b.oy = b.y + 10;
    },
    hit(b) { return [[b.x, b.y, 52]]; },
    phases: [
      { hp: 1, pats: [[4, 0, 'fan', { n: 5, spread: 0.6, spd: 150 }], [16, 8, 'wall', { spd: 95, n: 16 }]] },
      { hp: 0.66, say: ['juno', 'He\'s switching channels! Watch the spirals!'],
        pats: [[2, 0, 'spiral', { arms: 4, spd: 115, inc: 0.27, c: 2, flipBar: true }], [32, 4, 'summon', { kind: 'drifter', n: 2 }], [8, 6, 'fan', { n: 3, spread: 0.2, spd: 170 }]] },
      { hp: 0.33, say: ['juno', 'Prime time\'s over, your Majesty!'], tempo: 1.08,
        pats: [[8, 0, 'ring', { n: 26, spd: 100, rot: 'spin', alt: true }], [16, 4, 'beam', { n: 2, spread: 0.5 }], [4, 2, 'fan', { n: 3, spread: 0.35, spd: 160 }]] },
    ],
    draw(c, b, g, t, beat, ph) {
      c.save(); c.translate(b.x, b.y);
      // cables
      c.strokeStyle = '#2a1a40'; c.lineWidth = 4;
      for (let i = -1; i <= 1; i += 2) { c.beginPath(); c.moveTo(i * 30, 40); c.bezierCurveTo(i * 40, 80, i * 10, 90, i * 26 + Math.sin(t * 2 + i) * 8, 130); c.stroke(); }
      // antennas
      c.strokeStyle = '#b8b8d8'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-14, -42); c.lineTo(-36, -78); c.moveTo(14, -42); c.lineTo(36, -78); c.stroke();
      c.globalCompositeOperation = 'lighter'; glow(c, -36, -78, 10, '#ff4fd8', 0.9); glow(c, 36, -78, 10, '#4ff3ff', 0.9); c.globalCompositeOperation = 'source-over';
      // body
      const grd = c.createLinearGradient(0, -44, 0, 44);
      grd.addColorStop(0, '#463a66'); grd.addColorStop(1, '#1d1530');
      c.fillStyle = grd; c.beginPath(); c.roundRect(-62, -44, 124, 88, 18); c.fill();
      c.strokeStyle = '#ff4fd8'; c.lineWidth = 2; c.stroke();
      // screen
      c.fillStyle = '#0a0f12'; c.beginPath(); c.roundRect(-50, -34, 86, 66, 14); c.fill();
      c.save(); c.beginPath(); c.roundRect(-50, -34, 86, 66, 14); c.clip();
      for (let i = 0; i < 60; i++) { const v = Math.floor(Math.random() * 200); c.fillStyle = `rgba(${v},${v},${v + 30},0.35)`; c.fillRect(-50 + Math.random() * 86, -34 + Math.random() * 66, 4, 2); }
      // pixel face
      const ang = ph >= 2, P = 6;
      c.fillStyle = ang ? '#ff4f6a' : '#4ff3ff';
      const eyes = ang ? [[-30, -18], [-24, -12], [10, -18], [4, -12]] : [[-30, -16], [-24, -16], [4, -16], [10, -16]];
      for (const [x, y] of eyes) c.fillRect(x, y, P, P);
      c.fillRect(-28, -10 + (beat > 0.5 ? 0 : 2), P, P); c.fillRect(6, -10 + (beat > 0.5 ? 0 : 2), P, P);
      const m = ang ? [[-22, 14], [-16, 10], [-10, 10], [-4, 10], [2, 14]] : [[-22, 10], [-16, 14], [-10, 14], [-4, 14], [2, 10]];
      for (const [x, y] of m) c.fillRect(x, y, P, P);
      c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = -34; y < 32; y += 3) c.fillRect(-50, y, 86, 1);
      c.restore();
      // knobs
      c.fillStyle = '#ffe74f'; c.beginPath(); c.arc(48, -14, 5, 0, TAU); c.arc(48, 6, 5, 0, TAU); c.fill();
      // crown
      c.fillStyle = '#ffcf3f';
      c.beginPath(); c.moveTo(-34, -44); c.lineTo(-30, -66); c.lineTo(-17, -52); c.lineTo(0, -72); c.lineTo(17, -52); c.lineTo(30, -66); c.lineTo(34, -44); c.closePath(); c.fill();
      c.globalCompositeOperation = 'lighter'; glow(c, 0, -72, 14 + beat * 6, '#ff4fd8', 0.9); glow(c, 0, 0, 90, '#8a2bff', 0.18 + beat * 0.15); c.globalCompositeOperation = 'source-over';
      c.restore();
    },
  },

  // ===================================================== THE HOURGLASS WYRM
  wyrm: {
    name: 'THE HOURGLASS WYRM', sub: 'Devourer of Caravans', hp: 2600, segments: 13,
    init(b, g) { b.x = g.W / 2; b.y = -80; b.trail = []; for (let i = 0; i < 400; i++) b.trail.push([g.W / 2, -80 - i]); b.speedMul = 1; },
    move(b, dt, g) {
      const s = b.speedMul;
      b.tm = (b.tm || 0) + dt * s;
      const tx = g.W / 2 + Math.sin(b.tm * 0.75) * g.W * 0.36;
      const ty = g.H * 0.28 + Math.sin(b.tm * 1.15) * g.H * 0.15;
      if (b.entering) { b.x += (g.W / 2 - b.x) * dt * 2; b.y += (g.H * 0.25 - b.y) * dt * 1.2; }
      else { b.x += (tx - b.x) * Math.min(1, dt * 3); b.y += (ty - b.y) * Math.min(1, dt * 3); }
      b.trail.unshift([b.x, b.y]); if (b.trail.length > 400) b.trail.pop();
      b.segs = [];
      let acc = 0, idx = 0;
      for (let i = 1; i < b.trail.length && b.segs.length < this.segments; i++) {
        const [x1, y1] = b.trail[i - 1], [x2, y2] = b.trail[i];
        acc += Math.hypot(x2 - x1, y2 - y1);
        if (acc >= 22) { acc = 0; idx++; b.segs.push({ x: x2, y: y2, r: 15 - idx * 0.6 }); }
      }
      b.ox = b.x; b.oy = b.y;
    },
    hit(b) { return [[b.x, b.y, 22]]; },
    body(b) { return (b.segs || []).map((s) => [s.x, s.y, s.r * 0.8]); },
    phases: [
      { hp: 1, pats: [[4, 0, 'fan', { n: 3, spread: 0.3, spd: 135 }], [16, 8, 'segs', { spd: 70, mode: 'out' }]] },
      { hp: 0.66, say: ['sefa', 'It quickens. Strike the head and keep moving!'], speed: 1.35,
        pats: [[2, 0, 'spiral', { arms: 2, spd: 105, inc: 0.4 }], [16, 8, 'segs', { spd: 90, mode: 'aim' }]] },
      { hp: 0.33, say: ['sefa', 'For my family. For every lost song!'], speed: 1.6, tempo: 1.08,
        pats: [[8, 0, 'ring', { n: 18, spd: 100, bounce: true, c: 2 }], [4, 2, 'segs', { spd: 80, mode: 'alt' }], [8, 4, 'fan', { n: 5, spread: 0.5, spd: 150 }]] },
    ],
    draw(c, b, g, t, beat) {
      const segs = b.segs || [];
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        c.globalCompositeOperation = 'lighter'; glow(c, s.x, s.y, s.r * 2.2, '#ff9d3c', 0.25 + beat * 0.15); c.globalCompositeOperation = 'source-over';
        const grd = c.createRadialGradient(s.x - s.r * 0.3, s.y - s.r * 0.3, 1, s.x, s.y, s.r);
        grd.addColorStop(0, 'rgba(220,255,255,0.9)'); grd.addColorStop(0.5, 'rgba(120,200,220,0.35)'); grd.addColorStop(1, 'rgba(255,160,90,0.55)');
        c.fillStyle = grd;
        // hourglass segment
        c.beginPath(); c.moveTo(s.x - s.r, s.y - s.r); c.lineTo(s.x + s.r, s.y - s.r); c.lineTo(s.x + s.r * 0.2, s.y); c.lineTo(s.x + s.r, s.y + s.r); c.lineTo(s.x - s.r, s.y + s.r); c.lineTo(s.x - s.r * 0.2, s.y); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,230,180,0.8)'; c.lineWidth = 1; c.stroke();
        c.fillStyle = '#ffc46b'; const sand = (Math.sin(t * 2 + i) + 1) / 2;
        c.fillRect(s.x - s.r * 0.6, s.y + s.r * (1 - sand * 0.8), s.r * 1.2, s.r * sand * 0.8);
      }
      // head
      const a = segs.length ? Math.atan2(b.y - segs[0].y, b.x - segs[0].x) : Math.PI / 2;
      c.save(); c.translate(b.x, b.y); c.rotate(a - Math.PI / 2);
      c.globalCompositeOperation = 'lighter'; glow(c, 0, 0, 60, '#ffb35c', 0.4 + beat * 0.2); c.globalCompositeOperation = 'source-over';
      // mandibles
      const op = 0.3 + Math.abs(Math.sin(t * 4)) * 0.4;
      c.fillStyle = '#ffe1b0';
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 10, 12); c.quadraticCurveTo(sd * (26 + op * 10), 30, sd * 8 * op, 40); c.lineTo(sd * 6, 18); c.fill(); }
      const hg = c.createRadialGradient(-6, -6, 2, 0, 0, 24);
      hg.addColorStop(0, '#fff3d6'); hg.addColorStop(0.6, '#d47a3a'); hg.addColorStop(1, '#5a2410');
      c.fillStyle = hg; c.beginPath(); c.ellipse(0, 0, 22, 26, 0, 0, TAU); c.fill();
      c.strokeStyle = '#7ff7ff'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#7ff7ff';
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 9, 8, 4, 6, sd * 0.3, 0, TAU); c.fill(); }
      c.restore();
    },
  },

  // ========================================================= THE ROT QUEEN
  rotqueen: {
    name: 'THE ROT QUEEN', sub: 'Monarch of Mould', hp: 3200,
    init(b, g) { b.x = g.W / 2; b.y = -150; b.ty = g.H * 0.19; },
    move(b, dt, g) {
      b.x = g.W / 2 + Math.sin(b.t * 0.35) * g.W * 0.2;
      b.y = b.ty + Math.sin(b.t * 0.8) * 14;
      b.ox = b.x; b.oy = b.y + 20;
    },
    hit(b) { return [[b.x, b.y, 50]]; },
    phases: [
      { hp: 1, pats: [[4, 0, 'flower', { n: 8, spd: 80 }], [32, 16, 'summon', { kind: 'mine', n: 3 }]] },
      { hp: 0.66, say: ['moss', 'She is shedding spores. How rude. Hmm.'],
        pats: [[2, 0, 'spiral', { arms: 5, spd: 75, inc: 0.17, curve: 0.25, c: 2 }], [8, 4, 'fan', { n: 5, spread: 0.6, spd: 135 }], [32, 0, 'zone', {}]] },
      { hp: 0.33, say: ['moss', 'Now, little ember. The roots are with you.'], tempo: 1.08,
        pats: [[8, 0, 'ring', { n: 30, spd: 70, rot: 'spin', curve: -0.2 }], [4, 2, 'fan', { n: 7, spread: 0.9, spd: 140 }], [32, 16, 'summon', { kind: 'mine', n: 2 }]] },
    ],
    draw(c, b, g, t, beat) {
      c.save(); c.translate(b.x, b.y);
      // orbiting spores
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const a = t * 0.8 + i * TAU / 7; glow(c, Math.cos(a) * 78, Math.sin(a) * 40 + 10, 10, '#8dff9a', 0.6); }
      glow(c, 0, 10, 110, '#b07bff', 0.2 + beat * 0.15);
      c.globalCompositeOperation = 'source-over';
      // stem/body
      c.fillStyle = '#d9cdb8';
      c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(-26, 50, -14, 70); c.lineTo(14, 70); c.quadraticCurveTo(26, 50, 20, 0); c.fill();
      // face
      c.fillStyle = '#2a1238';
      c.beginPath(); c.ellipse(-8, 22, 5, 3 + beat * 2, -0.3, 0, TAU); c.ellipse(8, 22, 5, 3 + beat * 2, 0.3, 0, TAU); c.fill();
      c.fillStyle = '#ff6ab0'; c.beginPath(); c.arc(-8, 22, 1.6, 0, TAU); c.arc(8, 22, 1.6, 0, TAU); c.fill();
      c.strokeStyle = '#2a1238'; c.lineWidth = 2; c.beginPath(); c.arc(0, 40, 7, Math.PI + 0.4, TAU - 0.4); c.stroke();
      // skirt gills
      c.strokeStyle = 'rgba(170,120,200,0.8)'; c.lineWidth = 1;
      for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * 9, 2); c.lineTo(i * 6, 12); c.stroke(); }
      // cap
      const cg = c.createRadialGradient(-20, -30, 5, 0, -10, 80);
      cg.addColorStop(0, '#b97bff'); cg.addColorStop(0.6, '#5a2a8a'); cg.addColorStop(1, '#22103a');
      c.fillStyle = cg;
      c.beginPath(); c.moveTo(-70, 4); c.bezierCurveTo(-70, -60, 70, -60, 70, 4); c.quadraticCurveTo(0, 16, -70, 4); c.fill();
      c.strokeStyle = '#d9a6ff'; c.lineWidth = 1.5; c.stroke();
      c.globalCompositeOperation = 'lighter';
      for (const [x, y, r] of [[-40, -14, 8], [-12, -32, 10], [22, -26, 7], [46, -8, 6], [4, -10, 5]]) glow(c, x, y, r * 2, '#8dff9a', 0.7 + beat * 0.3);
      c.globalCompositeOperation = 'source-over';
      // crown
      c.fillStyle = '#e8c45a';
      c.beginPath(); c.moveTo(-18, -40); c.lineTo(-14, -58); c.lineTo(-6, -46); c.lineTo(0, -62); c.lineTo(6, -46); c.lineTo(14, -58); c.lineTo(18, -40); c.closePath(); c.fill();
      c.restore();
    },
  },

  // ======================================================= THE STARLESS EYE
  starless: {
    name: 'THE STARLESS EYE', sub: 'Watcher at the Top of the Sky', hp: 3900,
    init(b, g) { b.x = g.W / 2; b.y = -140; b.ty = g.H * 0.22; b.blink = 0; },
    move(b, dt, g) {
      b.x = g.W / 2 + Math.sin(b.t * 0.45) * g.W * 0.22;
      b.y = b.ty + Math.sin(b.t * 0.9) * 22;
      b.ox = b.x; b.oy = b.y;
      b.blink = Math.max(0, b.blink - dt * 2);
    },
    hit(b) { return [[b.x, b.y, 44]]; },
    phases: [
      { hp: 1, pats: [[4, 0, 'ring', { n: 14, spd: 95, curve: 0.55, rot: 'spin' }], [8, 4, 'ring', { n: 14, spd: 95, curve: -0.55, c: 2 }]] },
      { hp: 0.66, say: ['vesper', 'It\'s bending light itself! Watch the beams!'],
        pats: [[16, 0, 'beam', { n: 3, spread: 0.45 }], [2, 1, 'spiral', { arms: 3, spd: 120, inc: 0.22 }]] },
      { hp: 0.33, say: ['vesper', 'Show it a star it can\'t put out!'], tempo: 1.06,
        pats: [[4, 0, 'ring', { n: 22, spd: 160, accel: -120, min: 40, rot: 'spin', c: 2 }], [8, 4, 'fan', { n: 9, spread: 1.1, spd: 145 }], [16, 8, 'beam', { n: 1, spread: 0 }]] },
    ],
    draw(c, b, g, t, beat) {
      c.save(); c.translate(b.x, b.y);
      // rays
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i++) {
        const a = i * TAU / 24 + t * 0.2, L = 62 + Math.sin(t * 3 + i) * 10 + beat * 12;
        c.strokeStyle = rgba(i % 2 ? '#6fd8ff' : '#b9a4ff', 0.5); c.lineWidth = 2;
        c.beginPath(); c.moveTo(Math.cos(a) * 46, Math.sin(a) * 46); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.stroke();
      }
      glow(c, 0, 0, 120, '#6fd8ff', 0.25 + beat * 0.2);
      c.globalCompositeOperation = 'source-over';
      // orbiting dark stars
      for (let i = 0; i < 3; i++) { const a = -t * 0.9 + i * TAU / 3; c.fillStyle = '#05051a'; star(c, Math.cos(a) * 86, Math.sin(a) * 86, 12, 5, 4, t); c.fill(); c.strokeStyle = '#b9a4ff'; c.lineWidth = 1; c.stroke(); }
      // eyeball
      const open = 1 - b.blink;
      c.save(); c.beginPath(); c.ellipse(0, 0, 46, 34 * open + 1, 0, 0, TAU); c.clip();
      const eg = c.createRadialGradient(0, 0, 4, 0, 0, 46);
      eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.7, '#cfe8ff'); eg.addColorStop(1, '#5a7ab0');
      c.fillStyle = eg; c.fillRect(-46, -36, 92, 72);
      const p = g.player || { x: b.x, y: b.y + 100 };
      const la = Math.atan2(p.y - b.y, p.x - b.x), ld = 12;
      const ix = Math.cos(la) * ld, iy = Math.sin(la) * ld;
      const ig = c.createRadialGradient(ix, iy, 2, ix, iy, 20);
      ig.addColorStop(0, '#05051a'); ig.addColorStop(0.45, '#4a2a9a'); ig.addColorStop(0.8, '#6fd8ff'); ig.addColorStop(1, '#203070');
      c.fillStyle = ig; c.beginPath(); c.arc(ix, iy, 20, 0, TAU); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.arc(ix, iy, 8 + beat * 3, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ix - 6, iy - 6, 3, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = '#e0d8ff'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 46, 34 * open + 1, 0, 0, TAU); c.stroke();
      c.restore();
    },
  },

  // =============================================================== THE HUSH
  hush: {
    name: 'THE HUSH', sub: 'The Silence Between', hp: 5600, final: true,
    init(b, g) { b.x = g.W / 2; b.y = -170; b.ty = g.H * 0.2; b.eyes = 1; b.cracks = 0; },
    move(b, dt, g) {
      b.x = g.W / 2 + Math.sin(b.t * 0.3) * g.W * 0.18;
      b.y = b.ty + Math.sin(b.t * 0.6) * 12;
      b.ox = b.x; b.oy = b.y + 10;
    },
    hit(b) { return [[b.x, b.y, 64]]; },
    phases: [
      { hp: 1, pats: [[8, 0, 'ring', { n: 20, spd: 85, rot: 'spin' }], [4, 2, 'fan', { n: 5, spread: 0.5, spd: 130 }]] },
      { hp: 0.72, say: ['hush', 'you sing so loudly i cannot speak.'], eyes: 3,
        pats: [[2, 0, 'spiral', { arms: 3, spd: 105, inc: 0.29 }], [16, 8, 'wall', { spd: 85, n: 15 }], [8, 4, 'mirror', { n: 3 }]] },
      { hp: 0.45, silence: 19, say: ['hush', 'listen.'], eyes: 5,
        pats: [[4, 0, 'ring', { n: 10, spd: 55, rot: 'spin', dim: true }], [16, 8, 'rain', { n: 6, spd: 70, dim: true }]] },
      { hp: 0.449, song: 'finale', say: ['lio', 'I hear it. The quiet between the notes. Everyone, SING!'], eyes: 7,
        pats: [[2, 0, 'spiral', { arms: 4, spd: 115, inc: 0.23, c: 2 }], [8, 4, 'ring', { n: 26, spd: 95 }], [16, 8, 'beam', { n: 2, spread: 0.7 }]] },
    ],
    draw(c, b, g, t, beat, ph) {
      c.save(); c.translate(b.x, b.y);
      const faint = b.silent ? 0.45 : 1;
      c.globalAlpha = faint;
      // tendrils
      c.strokeStyle = 'rgba(200,200,225,0.35)'; c.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const a = i * TAU / 14 + Math.sin(t * 0.4 + i) * 0.15;
        c.lineWidth = 3 + (i % 3);
        c.beginPath(); c.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
        c.quadraticCurveTo(Math.cos(a + 0.3) * 110, Math.sin(a + 0.3) * 110 + Math.sin(t + i) * 10, Math.cos(a + Math.sin(t * 0.7 + i) * 0.4) * 150, Math.sin(a) * 150 + 20);
        c.stroke();
      }
      // halo
      const hg = c.createRadialGradient(0, 0, 50, 0, 0, 110);
      hg.addColorStop(0, 'rgba(220,220,240,0.5)'); hg.addColorStop(1, 'rgba(220,220,240,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(0, 0, 110, 0, TAU); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, 66 + Math.sin(t * 1.3) * 2, 0, TAU); c.fill();
      c.strokeStyle = `rgba(240,240,255,${0.6 + beat * 0.4})`; c.lineWidth = 2; c.stroke();
      // golden cracks (being heard)
      if (b.cracks > 0) {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = rgba('#ffd27a', Math.min(1, b.cracks) * (0.6 + beat * 0.4)); c.lineWidth = 2;
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); c.lineTo(Math.cos(a + 0.2) * 64, Math.sin(a + 0.2) * 64); c.stroke(); }
        glow(c, 0, 0, 90 * b.cracks, '#ffd27a', 0.3);
        c.globalCompositeOperation = 'source-over';
      }
      // eyes
      const E = [[0, 0, 1], [-34, -22, 0.6], [34, -22, 0.6], [-40, 18, 0.5], [40, 18, 0.5], [-16, 40, 0.45], [16, 40, 0.45]];
      const n = Math.min(E.length, b.eyes || 1);
      for (let i = 0; i < n; i++) {
        const [x, y, s] = E[i];
        const open = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i * 1.7));
        c.fillStyle = '#f2f2ff'; c.beginPath(); c.ellipse(x, y, 16 * s, 7 * s * open + 0.5, 0, 0, TAU); c.fill();
        c.fillStyle = '#000'; c.beginPath(); c.arc(x, y, 4 * s * open, 0, TAU); c.fill();
      }
      c.restore();
      c.globalAlpha = 1;
    },
  },
};
