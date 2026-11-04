// EMBERSONG — app shell: canvas sizing, main loop, menus and story flow.
import { audio } from './audio.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { loadSave, writeSave, eraseSave } from './save.js';
import { CHAPTERS, COMPANIONS, FINALE_CHOICE, ENDING_LISTEN, ENDING_BURN, CREDITS } from './story.js';

// Canvas roundRect polyfill (older Safari)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
}

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class App {
  constructor() {
    this.canvas = $('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    // Backgrounds are soft and glowy: render them at 1x density and upscale.
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d', { alpha: false });
    this.save = loadSave();
    this.settings = this.save.settings;
    this.view = { x0: 0, y0: 0, w: 360, h: 640, cssScale: 1 };
    this.game = new Game(this);
    this.input = new Input(this.canvas, this);
    this.input.sens = this.settings.sens;
    this.ui = new UI(this);
    this.paused = false;
    this.state = 'boot';
    this.busy = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.isPlaying()) this.pause(); audio.suspend(); }
      else audio.resume();
    });
    this.bind();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---------------------------------------------------------- canvas
  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 360;
    const H = Math.max(560, Math.min(800, (ch / cw) * W));
    const scale = Math.min(cw / W, ch / H);
    const offX = (cw - W * scale) / 2, offY = (ch - H * scale) / 2;
    this.canvas.width = Math.round(cw * dpr); this.canvas.height = Math.round(ch * dpr);
    this.bgRes = Math.min(dpr, 1);
    this.bgCanvas.width = Math.round(cw * this.bgRes); this.bgCanvas.height = Math.round(ch * this.bgRes);
    this.dpr = dpr; this.scale = scale; this.offX = offX; this.offY = offY;
    this.view = { x0: -offX / scale, y0: -offY / scale, w: cw / scale, h: ch / scale, cssScale: scale };
    this.game.resize(H);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) this.game.update(dt);
    else audio.update();
    const c = this.ctx, bc = this.bgCtx, r = this.bgRes;
    const [sx, sy] = this.game.shakeOffset();
    bc.setTransform(r * this.scale, 0, 0, r * this.scale, (this.offX + sx * this.scale) * r, (this.offY + sy * this.scale) * r);
    bc.globalAlpha = 1; bc.globalCompositeOperation = 'source-over';
    this.game.drawBackground(bc, this.view);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(this.bgCanvas, 0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.offX * this.dpr, this.offY * this.dpr);
    this.game.draw(c, this.view, sx, sy);
    this.ui.tick(dt, this.game);
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---------------------------------------------------------- bindings
  bind() {
    const on = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('select'); fn(e); });
    $('screen-boot').addEventListener('pointerdown', () => this.awaken(), { once: true });
    on('btn-new', () => this.newGame());
    on('btn-continue', () => this.playChapter(Math.min(this.save.chapter, CHAPTERS.length - 1)));
    on('btn-chapters', () => this.openChapters());
    on('btn-settings', () => this.openSettings('screen-title'));
    on('btn-howto', () => { this.ui.only('screen-howto'); this.backTo = 'screen-title'; });
    document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('ui'); this.ui.only(this.backTo || 'screen-title'); this.saveSettings(); }));
    $('btn-pause').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.togglePause(); });
    $('btn-cres').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this.game.crescendo(); });
    on('btn-resume', () => this.resume());
    on('btn-restart', () => { this.resume(true); this.beginPlay(this.game.ci, false); });
    on('btn-pause-settings', () => this.openSettings('screen-pause'));
    on('btn-quit', () => { this.resume(true); this.toTitle(); });
    on('btn-retry', () => this.beginPlay(this.game.ci, this.game.reachedBoss));
    on('btn-over-quit', () => this.toTitle());
    on('btn-reset', (e) => {
      // two-tap confirmation (native confirm() dialogs are unavailable in some embeds)
      const btn = e.currentTarget;
      if (!btn.dataset.armed) {
        btn.dataset.armed = '1'; btn.textContent = 'Tap again to erase all progress';
        clearTimeout(this._resetT);
        this._resetT = setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'Erase save data'; }, 3000);
        return;
      }
      delete btn.dataset.armed; btn.textContent = 'Erase save data';
      const st = this.settings; this.save = eraseSave(); this.save.settings = st; this.settings = st; writeSave(this.save);
      this.ui.toast('Progress erased', '', 1.5);
    });

    // settings controls
    const s = this.settings;
    $('set-music').addEventListener('input', (e) => { s.music = +e.target.value; audio.setVolumes(s.music, s.sfx); });
    $('set-sfx').addEventListener('input', (e) => { s.sfx = +e.target.value; audio.setVolumes(s.music, s.sfx); audio.sfx('kill'); });
    $('set-sens').addEventListener('input', (e) => { s.sens = +e.target.value; this.input.sens = s.sens; });
    $('set-shake').addEventListener('change', (e) => { s.shake = e.target.checked; });
    $('set-vibe').addEventListener('change', (e) => { s.vibrate = e.target.checked; this.vibrate(40); });
    $('set-diff').querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation(); s.difficulty = b.dataset.v; audio.sfx('ui'); this.syncSettings();
    }));
  }

  syncSettings() {
    const s = this.settings;
    $('set-music').value = s.music; $('set-sfx').value = s.sfx; $('set-sens').value = s.sens;
    $('set-shake').checked = s.shake; $('set-vibe').checked = s.vibrate;
    $('set-diff').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === s.difficulty));
  }
  openSettings(back) { this.backTo = back; this.syncSettings(); this.ui.only('screen-settings'); }
  saveSettings() { this.save.settings = this.settings; writeSave(this.save); }

  // game -> UI bridges
  say(who, text) { this.ui.say(who, text); }
  toast(a, b, d) { this.ui.toast(a, b, d); }
  warning(a, b) { this.ui.warning(a, b); }
  bossBar(name, f) { this.ui.bossBar(name, f); }
  silence(on) { this.ui.silence(on); }

  vibrate(ms) { if (this.settings.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  onAnyInput() { if (this.state === 'boot') return; audio.resume(); }

  // ---------------------------------------------------------- flow
  awaken() {
    audio.unlock();
    audio.setVolumes(this.settings.music, this.settings.sfx);
    audio.playSong('title', { fade: 2.5 });
    audio.layers = 5;
    audio.sfx('swell');
    this.toTitle();
  }

  toTitle() {
    this.state = 'title';
    this.paused = false;
    this.ui.hud(false);
    this.ui.closeDialog();
    this.game.showTitle();
    audio.muffle(0);
    audio.playSong('title'); audio.layers = 5;
    $('btn-continue').classList.toggle('hidden', !this.save.started || this.save.chapter >= CHAPTERS.length);
    $('btn-continue').textContent = this.save.chapter < CHAPTERS.length ? `Continue: ${CHAPTERS[this.save.chapter].title}` : 'Continue';
    this.ui.only('screen-title');
  }

  newGame() {
    this.save.chapter = 0; this.save.started = true; writeSave(this.save);
    this.playChapter(0);
  }

  openChapters() {
    const list = $('chapter-list');
    list.innerHTML = '';
    CHAPTERS.forEach((ch, i) => {
      const b = document.createElement('button');
      const locked = i >= this.save.unlocked;
      b.className = 'chap' + (locked ? ' locked' : '');
      const best = this.save.best[ch.id];
      b.innerHTML = `<span class="num">${ch.num}</span><span><div class="t"></div><div class="s"></div></span><span class="best">${best ? `<b>${best.rank}</b>${best.score.toLocaleString('en-US')}` : locked ? '🔒' : ''}</span>`;
      b.querySelector('.t').textContent = locked ? '???' : ch.title;
      b.querySelector('.s').textContent = locked ? 'Restore the previous verse to unlock' : ch.tagline;
      if (!locked) b.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('select'); this.playChapter(i); });
      list.append(b);
    });
    this.backTo = 'screen-title';
    this.ui.only('screen-chapters');
  }

  companionsFor(ci) { return CHAPTERS.slice(0, ci).map((c) => c.companion).filter(Boolean); }

  async runScript(script) {
    this.ui.skip = false;
    let choice = null;
    for (const s of script) {
      if (s.music) { audio.playSong(s.music, { fade: 1.5 }); audio.layers = 1; continue; }
      if (s.fx) { this.fx(s.fx); if (!this.ui.skip) await wait(s.fx === 'whiteout' ? 900 : 200); continue; }
      if (s.companion) {
        this.game.addCompanion(s.companion);
        this.ui.toast(COMPANIONS[s.companion].name, 'joined your Choir', 2.6);
        if (!this.ui.skip) await wait(2700);
        continue;
      }
      if (s.choice) { choice = await this.ui.choice(s.choice); continue; }
      if (s.scene) { this.game.setScene(s.scene); continue; }
      if (s.wait) { if (!this.ui.skip) await wait(s.wait * 1000); continue; }
      if (this.ui.skip) continue;
      await this.ui.dialogLine(s.who || null, s.n || s.t);
    }
    this.ui.closeDialog();
    return choice;
  }

  fx(kind) {
    const g = this.game;
    if (kind === 'flash') g.flash = { col: '#ffffff', a: 0.7 };
    if (kind === 'whiteout') { g.flash = { col: '#fff6e0', a: 1.4 }; audio.sfx('swell'); }
    if (kind === 'shake') g.shake = 14;
  }

  async playChapter(ci) {
    if (this.busy) return;
    this.busy = true;
    this.state = 'story';
    this.ui.only(null); this.ui.hud(false);
    const ch = CHAPTERS[ci];
    this.save.chapter = Math.max(this.save.chapter, 0); this.save.started = true; writeSave(this.save);
    this.game.showScene(ci, this.companionsFor(ci));
    audio.playSong(ch.song, { fade: 2 }); audio.layers = 1;
    await this.ui.card(ch.num, ch.title, ch.tagline);
    await this.runScript(ch.intro);
    this.busy = false;
    this.beginPlay(ci, false);
  }

  beginPlay(ci, checkpoint) {
    this.state = 'play';
    this.paused = false;
    this.ui.only(null);
    this.ui.closeDialog();
    this.ui.hud(true);
    this.input.reset();
    const power = 1 + Math.min(2, Math.floor(ci / 2));
    this.game.start(ci, { companions: this.companionsFor(ci), difficulty: this.settings.difficulty, checkpoint, power });
    if (!checkpoint && ci === 0) this.ui.toast('Drag anywhere to move', 'your song plays on the beat', 3.2);
    if (checkpoint) this.ui.toast('Rekindled', 'the song resumes', 1.6);
  }

  isPlaying() { return this.state === 'play' && this.game.running && !this.paused; }

  togglePause() { if (this.paused) this.resume(); else if (this.isPlaying()) this.pause(); }
  pause() {
    this.paused = true;
    audio.muffle(0.85);
    this.ui.only('screen-pause');
    this.backTo = 'screen-pause';
  }
  resume(silent) {
    this.paused = false;
    audio.muffle(0);
    this.input.reset();
    if (!silent) this.ui.only(null);
    else this.ui.only(null);
  }

  onDeath() {
    this.state = 'over';
    this.ui.hud(false);
    $('over-text').textContent = this.game.reachedBoss ? 'Rekindle to face the guardian again.' : 'But a song is never truly over.';
    this.ui.only('screen-over');
  }

  onChapterClear(stats) {
    const ci = this.game.ci, ch = CHAPTERS[ci];
    this.state = 'results';
    this.ui.hud(false);
    const prev = this.save.best[ch.id];
    const isBest = !prev || stats.score > prev.score;
    if (isBest) this.save.best[ch.id] = { score: stats.score, rank: stats.rank };
    this.save.unlocked = Math.max(this.save.unlocked, Math.min(CHAPTERS.length, ci + 2));
    this.save.chapter = Math.max(this.save.chapter, ci + 1);
    writeSave(this.save);
    audio.playSong('title', { fade: 2 }); audio.layers = 5;
    this.ui.results(ch, stats, isBest && !!prev);
    $('btn-next').onclick = async (e) => {
      e.stopPropagation(); audio.sfx('select');
      this.ui.only(null);
      this.state = 'story';
      this.game.showScene(ci, this.companionsFor(ci));
      await this.runScript(ch.outro);
      if (ci + 1 < CHAPTERS.length) this.playChapter(ci + 1);
      else this.toTitle();
    };
  }

  async onFinaleChoice() {
    this.state = 'story';
    this.ui.hud(false);
    const choice = await this.runScript(FINALE_CHOICE);
    this.game.resolveFinale(choice);
    await wait(1200);
    await this.runScript(choice === 'listen' ? ENDING_LISTEN : ENDING_BURN);
    this.save.endings[choice] = true;
    this.save.unlocked = CHAPTERS.length;
    this.save.chapter = CHAPTERS.length;
    const st = this.game.stats();
    const ch = CHAPTERS[this.game.ci];
    if (!this.save.best[ch.id] || st.score > this.save.best[ch.id].score) this.save.best[ch.id] = { score: st.score, rank: st.rank };
    writeSave(this.save);
    const lines = CREDITS.slice();
    if (choice === 'burn' && !this.save.endings.listen) lines.push(['', 'Hint: next time… listen.']);
    if (this.save.endings.listen && this.save.endings.burn) lines.push(['Both endings found', 'Thank you for hearing the whole song.']);
    this.state = 'credits';
    this.ui.credits(lines, () => this.toTitle());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__app = new App();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && window.top === window.self) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
