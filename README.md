# 🔥 EMBERSONG

> *Once, the world of Aster was sung into being. Then the Hush came.*

**Embersong** is a story-driven, music-reactive shoot-'em-up made for phones. You play **Lio**, a living ember from the last lighthouse. Lio's journey crosses six hand-crafted worlds to bring back the song the world has forgotten.

Everything in the game is generated in code: the graphics, the characters, and the **entire original soundtrack**. There are no image or audio files, nothing to license, and the whole thing weighs about 150 KB.

---

## ✨ What makes it special

| | |
|---|---|
| 🎵 **You play the music** | Lio fires *on the beat*, and every shot is a note in the current chord. Boss attacks are synced to the rhythm. |
| 🎼 **The song grows as you play** | Each chapter hides 4 **Echoes**. Every one you collect brings a new instrument (bass, drums, arpeggios, melody) back into the soundtrack. |
| 📖 **A real story** | 6 chapters, 7 characters with animated portraits, typewriter dialogue with per-character "voices", a twist, and **two endings** decided by one choice. |
| 🌍 **Six genres in one** | Melancholic piano on the Drowned Coast, synthwave in a neon city, Middle-Eastern scales in the Glass Desert, lo-fi in a fungal forest, epic orchestral among the auroras, and a finale that runs on silence itself. |
| 🎨 **Procedural art** | Glowing additive-blend visuals, parallax backgrounds that pulse with the beat, bespoke bosses (a drowned bell, a TV tyrant, a glass sandworm, a mushroom queen, a cosmic eye…). |
| 📱 **Built for one thumb** | Relative drag steering (your finger never covers your ship), auto-fire, generous hitbox, haptics, safe-area aware, installable as an app, works offline. |

## 🗺️ The chapters

| # | Chapter | Genre / Music | Mechanic | Guardian |
|---|---------|---------------|----------|----------|
| I | **The Drowned Coast** | Rain-soaked ambient piano (A minor) | The tutorial: rain and lighthouse beams | The Tidewarden |
| II | **Velvet Static** | Synthwave (E minor) | Bullets surge **on the beat** | The Static King |
| III | **The Glass Desert** | Phrygian-dominant hand drums & reed | **Wind** pushes you *and* bullets | The Hourglass Wyrm |
| IV | **The Rootdeep** | Lo-fi swing with kalimba & flute | **Spore clouds** slow you down | The Rot Queen |
| V | **The Aurora Spire** | Epic arps & brass (C minor) | **Gravity wells** bend bullets | The Starless Eye |
| VI | **The Hush** | Your song vs. silence | A grey world where colour returns verse by verse | The Hush |

Each friend you save joins your **Choir**: a glowing companion that orbits you and fires homing notes.

## 🎮 How to play

- **Drag anywhere** to steer. Movement is relative, so put your thumb wherever it's comfortable.
- You **fire automatically on the beat**.
- Only the **white core** of your flame can be hit.
- **Graze** bullets (pass close without touching) to charge your **Crescendo**. When the ♪ button glows, tap it (or two-finger tap / Space) to unleash a wave that clears every bullet on screen.
- Catch **golden sparks** to power up (4 levels). Lose a flame and you lose a power level.
- Collect all **4 Echoes** per chapter to restore the full song.

**Keyboard:** WASD / arrows to move · Shift for precise movement · Space or X for Crescendo · P / Esc to pause.

**Difficulty:** *Story* (9 flames, gentle patterns), *Normal* (6 flames), *Fortissimo* (4 flames, denser and faster).

## 🚀 Run it

It's a static site with no build step and no dependencies.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` (or `http://<your-computer's-LAN-IP>:8000` on your phone). Turn the sound on 🎧.

### Put it on your phone
- **Deploy free on GitHub Pages:** in the repo, go to *Settings → Pages → Deploy from branch*, then pick the branch and the `/ (root)` folder.
- Open the URL on your phone, then choose **Add to Home Screen**. It installs as a full-screen app and works offline (service worker + web manifest included).
- **Native app stores:** wrap it with [Capacitor](https://capacitorjs.com/):
  ```bash
  npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
  ```
  ```bash
  npx cap init Embersong com.example.embersong --web-dir .
  ```
  ```bash
  npx cap add android
  ```
  ```bash
  npx cap open android
  ```

## 🧩 Project structure

```
index.html            UI layers (HUD, dialog, menus)
css/style.css         Styling (glass panels, safe areas, animations)
js/main.js            App shell: canvas sizing, loop, menus, story flow, save
js/game.js            Gameplay: player, beat-synced shooting, bullets, bosses, FX, rendering
js/audio.js           Web Audio engine: look-ahead sequencer, synth voices, drum machine, SFX
js/songs.js           The original soundtrack, written as data (chords, patterns, melodies)
js/story.js           Characters, chapters, full script, endings, credits
js/levels.js          Seeded level generator (waves, echoes, hazards, dialogue timing)
js/enemies.js         Enemy behaviours + six visual skins
js/bosses.js          Six bosses: movement, phased beat-synced attacks, bespoke drawing
js/backgrounds.js     Six animated, parallax, beat-reactive worlds
js/gfx.js             Glow sprites, colour utils, procedural character portraits
js/input.js           Touch / mouse / keyboard
js/ui.js              Dialog typewriter, subtitles, HUD, results, credits
sw.js, manifest.webmanifest, icons/   Installable, offline-ready PWA
```

## 🎼 How the music works

`songs.js` holds the score: chord progressions, bass/drum patterns, arpeggio sequences and melodies, written in note names. `audio.js` performs it live. A look-ahead scheduler queues notes on the Web Audio clock. A small subtractive synth builds each note from oscillators, a filter, an envelope, vibrato, a shared convolution reverb and a delay. Drums are synthesized too: kick, snare, clap, hats, shaker, toms.

Every track has a **layer** number. The game raises the active layer each time you collect an Echo, so the arrangement builds up as you play. The sequencer also reports every 16th-note step back to the game, which is how your shots, enemy fire and boss attacks land on the beat.

---

*Made with HTML5 Canvas and the Web Audio API. Use headphones.* 🎧
