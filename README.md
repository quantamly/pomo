# 🍃 Nari — a calm random pomodoro

A gentle, self-contained pomodoro timer. Instead of a fixed 25/5, Nari draws a
**random focus length and a random rest length** from ranges you choose — so no
two blocks feel quite the same. It's wrapped in hand-drawn, Ghibli-style nature
scenes that drift and twinkle while you work.

Open `index.html` in any browser. No build step, no dependencies, no server.

## Features

- **Randomized sessions** — set a min/max range for focus and for rest; each
  block picks a fresh duration (down to the second) inside that range.
- **Nine painterly scenes** — Meadow, Sunset, Cloud sea, Forest, Twilight,
  Starry night, Rain, Autumn (drifting golden leaves) and a Tropical garden
  (fronds that sway now and then), all drawn as inline SVG. No image files.
- **Bring your own background** — upload any image to use as your backdrop.
- **Synthesized alarms** — thirteen soft tones (wind chime, marimba, singing
  bowl, koto, music box, temple bell, birdsong, water drops, rain stick, wood
  block, rising chime, deep gong, soft tone), generated live with the Web Audio
  API. Set one for **when focus ends** and one for **when a break ends**, each
  with a preview, plus an **alarm volume** slider.
- **Soft interface sounds** — a gentle low tap on button presses (toggleable).
- **Five clock faces** — Rounded digital, a **live hourglass** (sand streams
  from the neck onto a growing pile; hover to reveal the exact time), an
  **analog** face, a quiet **minimal** number, and a retro **LCD segment**.
- **Independent auto-start** — separately choose whether focus sessions and
  breaks start on their own, or start each block yourself.
- **Glanceable from another tab** — the remaining time and phase show live in the
  browser tab title.
- Settings and your chosen scene persist between visits (localStorage).
- Respects `prefers-reduced-motion`; keyboard-friendly (Space starts/pauses,
  Esc closes settings).

## Structure

```
index.html      markup + layout
css/styles.css  theme, glass UI, ambient scene animations
js/scenes.js    the nine SVG nature scenes
js/sounds.js    Web Audio alarm synthesis (master volume, tap)
js/clocks.js    the five selectable clock faces
js/app.js       the random pomodoro engine + UI wiring
```

## Tips

- Click the little circles at the bottom to switch scenes instantly.
- The dashed ring winds down as your block progresses.
- Everything is offline-first — the only network request is an optional
  Google Fonts load, with rounded system fonts as a fallback.
