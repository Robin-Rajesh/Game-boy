// Input: relative-drag touch steering (thumb never covers the ember),
// keyboard (WASD/arrows, Shift = focus, Space/X = Crescendo), multi-touch tap.
export class Input {
  constructor(el, app) {
    this.app = app;
    this.el = el;
    this.keys = new Set();
    this.drag = null;
    this.dx = 0; this.dy = 0;
    this.sens = 1.25;
    this.cres = false;
    this.touches = new Map();

    el.addEventListener('pointerdown', (e) => this.down(e), { passive: false });
    window.addEventListener('pointermove', (e) => this.move(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key.toLowerCase() === 'x') this.cres = true;
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') this.app.togglePause();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.drag = null; });
  }

  down(e) {
    e.preventDefault();
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (this.touches.size >= 2) this.cres = true; // two-finger tap = Crescendo
    if (!this.drag) this.drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
    this.app.onAnyInput();
  }
  move(e) {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const s = this.app.view.cssScale || 1;
    // coalesced events give smoother drags on high-rate touch screens
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    const last = evs && evs.length ? evs[evs.length - 1] : e;
    this.dx += (last.clientX - this.drag.lx) / s;
    this.dy += (last.clientY - this.drag.ly) / s;
    this.drag.lx = last.clientX; this.drag.ly = last.clientY;
  }
  up(e) {
    this.touches.delete(e.pointerId);
    if (this.drag && e.pointerId === this.drag.id) {
      this.drag = null;
      // hand steering to another finger still on screen
      for (const [id, t] of this.touches) { this.drag = { id, lx: t.x, ly: t.y }; break; }
    }
  }

  consume() { const d = { x: this.dx, y: this.dy }; this.dx = 0; this.dy = 0; return d; }
  axis() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('arrowleft') || k.has('a')) x -= 1;
    if (k.has('arrowright') || k.has('d')) x += 1;
    if (k.has('arrowup') || k.has('w')) y -= 1;
    if (k.has('arrowdown') || k.has('s')) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }
  get focus() { return this.keys.has('shift'); }
  wantsCres() { const c = this.cres; this.cres = false; return c; }
  reset() { this.dx = this.dy = 0; this.cres = false; }
}
