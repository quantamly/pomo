# 🍃 Nari — a calm random pomodoro

A gentle, self-contained pomodoro timer. Instead of a fixed 25/5, Nari draws a
**random focus length and a random rest length** from ranges you choose — so no
two blocks feel quite the same. It's wrapped in hand-drawn, Ghibli-style nature
scenes that drift and twinkle while you work.

Open `index.html` in any browser. No build step, no dependencies, no server.

## Features

- **Randomized sessions** — set a min/max range for focus and for rest; each
  block picks a fresh duration (down to the second) inside that range.
- **Six painterly scenes** — Meadow, Sunset, Cloud sea, Forest, Twilight and
  Starry night, all drawn as inline SVG (drifting clouds, twinkling stars,
  swaying trees, fireflies). No image files to load.
- **Bring your own background** — upload any image to use as your backdrop.
- **Synthesized alarms** — seven soft tones (wind chime, temple bell, birdsong,
  marimba, water drops, deep gong, soft tone), generated live with the Web Audio
  API. Pick one for when focus begins and another for when a break begins, with
  a preview button for each.
- **Auto-flow or manual** — let focus and rest cycle automatically, or start each
  block yourself.
- Settings and your chosen scene persist between visits (localStorage).
- Respects `prefers-reduced-motion`; keyboard-friendly (Space starts/pauses,
  Esc closes settings).

## Structure

```
index.html      markup + layout
css/styles.css  theme, glass UI, ambient scene animations
js/scenes.js    the six SVG nature scenes
js/sounds.js    Web Audio alarm synthesis
js/app.js       the random pomodoro engine + UI wiring
```

## Tips

- Click the little circles at the bottom to switch scenes instantly.
- The dashed ring winds down as your block progresses.
- Everything is offline-first — the only network request is an optional
  Google Fonts load, with rounded system fonts as a fallback.
