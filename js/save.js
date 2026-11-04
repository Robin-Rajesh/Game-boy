// Local progress. Every storage access is guarded (private mode, blocked storage…)
const KEY = 'embersong.save.v1';

export const DEFAULTS = () => ({
  chapter: 0,          // next chapter to play
  unlocked: 1,         // chapters available in Chapter Select
  started: false,
  best: {},            // chapterId -> { score, rank }
  endings: {},         // 'listen' | 'burn' -> true
  settings: { music: 0.8, sfx: 0.8, sens: 1.25, difficulty: 'normal', shake: true, vibrate: true },
});

export function loadSave() {
  const d = DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, best: s.best || {}, endings: s.endings || {} };
  } catch (e) { return d; }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable: play on */ }
}

export function eraseSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  return DEFAULTS();
}
