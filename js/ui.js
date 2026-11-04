// DOM UI layer: dialog (typewriter + animated portraits), subtitles, HUD,
// toasts, boss bar, chapter cards, results, credits.
import { CAST } from './story.js';
import { drawPortrait } from './gfx.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Math.floor(n).toLocaleString('en-US');

export class UI {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.pCtx = $('portrait').getContext('2d');
    this.sCtx = $('sub-portrait').getContext('2d');
    this.dlg = null; this.skip = false;
    this.subs = []; this.sub = null;
    this.last = {};
    this.screens = ['screen-boot', 'screen-title', 'screen-chapters', 'screen-settings', 'screen-howto', 'screen-pause', 'screen-results', 'screen-over', 'screen-credits'];

    $('dialog').addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      this.advance();
    });
    $('btn-skip').addEventListener('click', (e) => { e.stopPropagation(); this.skip = true; this.advance(true); });
    window.addEventListener('keydown', (e) => { if (this.dlg && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.advance(); } });
  }

  // ---------------------------------------------------------- screens
  only(id) { for (const s of this.screens) $(s).classList.toggle('hidden', s !== id); }
  show(id) { $(id).classList.remove('hidden'); }
  hide(id) { $(id).classList.add('hidden'); }
  hud(on) {
    $('hud').classList.toggle('hidden', !on);
    this.bossBar(null); this.silence(false);
    this.subs = []; this.sub = null; $('subtitle').classList.add('hidden');
    this.last = {};
  }

  // ---------------------------------------------------------- dialog
  dialogLine(who, text) {
    return new Promise((resolve) => {
      const d = $('dialog');
      d.classList.remove('hidden');
      d.classList.toggle('narration', !who);
      $('choices').innerHTML = '';
      const cast = who ? CAST[who] : null;
      $('dlg-name').textContent = cast ? cast.name : '';
      $('dlg-name').style.color = cast ? cast.color : '';
      this.dlg = { who, text, shown: 0, done: false, resolve, lastBlip: 0, voice: cast ? cast.voice : 72 };
      this.renderText();
      $('dialog').querySelector('.dlg-box').classList.remove('done');
    });
  }

  renderText() {
    const d = this.dlg, n = Math.floor(d.shown);
    const el = $('dlg-text');
    el.textContent = '';
    const a = document.createElement('span'); a.textContent = d.text.slice(0, n);
    const b = document.createElement('span'); b.textContent = d.text.slice(n); b.style.opacity = '0';
    el.append(a, b);
  }

  advance(force) {
    const d = this.dlg;
    if (!d) return;
    if (!d.done && !force) { d.shown = d.text.length; d.done = true; this.renderText(); $('dialog').querySelector('.dlg-box').classList.add('done'); return; }
    this.dlg = null;
    audio.sfx('ui');
    d.resolve();
  }

  closeDialog() { $('dialog').classList.add('hidden'); this.dlg = null; this.skip = false; }

  choice(options) {
    return new Promise((resolve) => {
      const d = $('dialog');
      d.classList.remove('hidden', 'narration');
      $('btn-skip').classList.add('hidden');
      const box = $('choices');
      box.innerHTML = '';
      for (const o of options) {
        const b = document.createElement('button');
        b.className = 'btn' + (o.value === 'listen' ? ' primary' : '');
        b.textContent = o.label;
        b.addEventListener('click', (e) => {
          e.stopPropagation(); box.innerHTML = ''; $('btn-skip').classList.remove('hidden');
          audio.sfx('select'); resolve(o.value);
        });
        box.append(b);
      }
    });
  }

  // ---------------------------------------------------------- in-game chatter
  say(who, text) {
    if (!who || !text) return;
    this.subs.push({ who, text });
    if (this.subs.length > 3) this.subs.shift();
  }

  // ---------------------------------------------------------- overlays
  toast(t1, t2 = '', dur = 2) {
    const el = $('toast');
    el.querySelector('.t1').textContent = t1;
    el.querySelector('.t2').textContent = t2;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }

  warning(name, sub) {
    const el = $('warning');
    el.querySelector('.w1').textContent = name;
    el.querySelector('.w2').textContent = sub;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3200);
  }

  async card(num, title, tagline) {
    const el = $('card');
    el.querySelector('.c0').textContent = num ? `CHAPTER ${num}` : '';
    el.querySelector('.c1').textContent = title;
    el.querySelector('.c2').textContent = tagline;
    el.classList.add('show');
    await wait(2800);
    el.classList.remove('show');
    await wait(900);
  }

  silence(on) { $('silence').classList.toggle('show', on); }

  bossBar(name, frac) {
    const bar = $('bossbar');
    if (!name) { bar.classList.add('hidden'); this.last.boss = null; return; }
    if (this.last.boss !== name) { bar.classList.remove('hidden'); $('boss-name').textContent = name; this.last.boss = name; }
    const w = Math.round(frac * 1000) / 10;
    if (this.last.bossW !== w) { $('boss-fill').style.width = w + '%'; this.last.bossW = w; }
  }

  results(ch, st, best) {
    $('res-title').textContent = ch.title;
    const rank = $('res-rank');
    rank.textContent = st.rank;
    rank.style.animation = 'none'; void rank.offsetWidth; rank.style.animation = '';
    const m = Math.floor(st.time / 60), s = Math.floor(st.time % 60).toString().padStart(2, '0');
    const rows = [
      ['Score', fmt(st.score) + (best ? '  ★ NEW BEST' : '')],
      ['Flames lost', st.hits === 0 ? 'None. Flawless!' : st.hits],
      ['Bullets grazed', fmt(st.grazes)],
      ['Shadows lifted', fmt(st.kills)],
      ['Best harmony', '×' + st.maxMult],
      ['Time', `${m}:${s}`],
    ];
    $('res-stats').innerHTML = '';
    for (const [a, b] of rows) { const x = document.createElement('span'); x.textContent = a; const y = document.createElement('span'); y.textContent = b; $('res-stats').append(x, y); }
    this.only('screen-results');
  }

  credits(lines, onDone) {
    this.only('screen-credits');
    const roll = $('credits-roll');
    roll.innerHTML = '';
    lines.forEach(([a, b], i) => {
      const d = document.createElement('div'); d.className = 'cr' + (i === 0 ? ' big' : '');
      const x = document.createElement('div'); x.className = 'a'; x.textContent = a;
      const y = document.createElement('div'); y.className = 'b'; y.textContent = b;
      d.append(x, y); roll.append(d);
    });
    roll.style.transition = 'none'; roll.style.transform = 'translateY(0)';
    void roll.offsetWidth;
    const dist = roll.offsetHeight + window.innerHeight;
    const dur = Math.max(22, dist / 32);
    roll.style.transition = `transform ${dur}s linear`;
    roll.style.transform = `translateY(${-dist}px)`;
    clearTimeout(this._credT);
    this._credT = setTimeout(onDone, dur * 1000 + 500);
    $('btn-credits-done').onclick = () => { clearTimeout(this._credT); onDone(); };
  }

  // ---------------------------------------------------------- per-frame
  tick(dt, game) {
    this.t += dt;
    // typewriter
    const d = this.dlg;
    if (d) {
      if (!d.done) {
        const before = Math.floor(d.shown);
        d.shown = Math.min(d.text.length, d.shown + dt * 42);
        const now = Math.floor(d.shown);
        if (now !== before) {
          this.renderText();
          const ch = d.text[now - 1];
          if (ch && ch.trim() && now - d.lastBlip >= 2) { d.lastBlip = now; if (d.who) audio.sfx('blip', d.voice + (now % 5)); }
        }
        if (d.shown >= d.text.length) { d.done = true; $('dialog').querySelector('.dlg-box').classList.add('done'); }
      }
      if (d.who) drawPortrait(this.pCtx, d.who, 200, this.t);
    }
    // subtitles
    if (!this.sub && this.subs.length) {
      this.sub = this.subs.shift();
      this.sub.ttl = 2.2 + this.sub.text.length * 0.045;
      const cast = CAST[this.sub.who];
      $('sub-name').textContent = cast.name; $('sub-name').style.color = cast.color;
      $('sub-text').textContent = this.sub.text;
      const el = $('subtitle'); el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      audio.sfx('blip', cast.voice);
    }
    if (this.sub) {
      drawPortrait(this.sCtx, this.sub.who, 80, this.t);
      this.sub.ttl -= dt;
      if (this.sub.ttl <= 0) { this.sub = null; if (!this.subs.length) $('subtitle').classList.add('hidden'); }
    }
    // HUD
    const p = game.player;
    if (!p || $('hud').classList.contains('hidden')) return;
    const L = this.last;
    if (L.hp !== p.hp || L.maxHp !== p.maxHp) {
      L.hp = p.hp; L.maxHp = p.maxHp;
      const el = $('hp'); el.innerHTML = '';
      for (let i = 0; i < p.maxHp; i++) { const f = document.createElement('i'); if (i >= p.hp) f.className = 'off'; el.append(f); }
    }
    const sc = Math.floor(game.score || 0);
    if (L.score !== sc) { L.score = sc; $('score').textContent = fmt(sc); }
    if (L.mult !== game.mult) { L.mult = game.mult; const m = $('mult'); m.textContent = `HARMONY ×${game.mult}`; m.classList.toggle('hot', game.mult >= 4); }
    if (L.echoes !== game.echoes) {
      L.echoes = game.echoes;
      const el = $('echoes'); el.innerHTML = '';
      for (let i = 0; i < 4; i++) { const s = document.createElement('span'); s.textContent = '♪'; if (i < (game.echoes || 0)) s.className = 'on'; el.append(s); }
    }
    if (game.ch && L.ch !== game.ch.id) { L.ch = game.ch.id; $('chapter-label').textContent = `${game.ch.num} · ${game.ch.title}`; }
    const cr = Math.floor(p.cres);
    if (L.cres !== cr) { L.cres = cr; const b = $('btn-cres'); b.style.setProperty('--p', cr); b.classList.toggle('ready', cr >= 100); }
  }
}
