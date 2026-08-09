# 🍃 Nari — a calm random pomodoro

A gentle, self-contained pomodoro timer. Instead of a fixed 25/5, Nari draws a
**random focus length and a random rest length** from ranges you choose — so no
two blocks feel quite the same. It's wrapped in hand-drawn, Ghibli-style nature
scenes that drift and twinkle while you work.

Open `index.html` in any browser. No build step, no dependencies, no server.

## Features

- **Randomized sessions** — set a min/max range for focus and for rest; each
  block picks a fresh duration (down to the second) inside that range.
- **Two modes** — *Random timer* (counts down to a surprise length and ends on
  its own) or *Open stopwatch* (counts **up** — you choose when to stop, with a
  **celebrate** cue at your minimum time and a **red warning** at your maximum,
  for focus and rest alike). Each cue sound is selectable from its own set, and
  the ring **fills up toward your minimum** — a complete circle means you've hit
  the goal, with a thin inner ring tracking the bonus time toward the cap.
- **Session history** — every finished focus/rest is logged with its actual
  duration; a History panel shows today's blocks plus focus/rest totals. It's
  today-only — yesterday's entries clear automatically.
- **Nine painterly scenes** — Meadow, Sunset, Cloud sea, Forest, Twilight,
  Starry night, Rain, Autumn (drifting golden leaves) and a Tropical garden
  (fronds that sway now and then), all drawn as inline SVG. No image files.
  Picked from a compact toggle in the top bar that expands into a grid.
- **Bring your own background** — upload any image to use as your backdrop.
- **Synthesized alarms** — thirteen soft tones (wind chime, marimba, singing
  bowl, koto, music box, temple bell, birdsong, water drops, rain stick, wood
  block, rising chime, deep gong, soft tone), generated live with the Web Audio
  API. Set one for **when focus ends** and one for **when a break ends**, each
  with a preview, plus an **alarm volume** slider.
- **Two-tier interface sounds** — a warm, rewarding "pop" only for the primary
  Start/Pause/Resume, and a low, unobtrusive "tock" for every other button
  (toggleable).
- **Four clock faces** — Rounded digital, a **live hourglass** (sand streams
  from the neck onto a growing pile; hover to reveal the exact time), an
  **analog** face, and a quiet **minimal** number.
- **A "?" panel** — a short "Why Nari works" explaining the method (focus in
  sprints, randomized intervals, calm on purpose, tiny rewards).
- **Independent auto-start** — separately choose whether focus sessions and
  breaks start on their own, or start each block yourself.
- **Color that follows the phase** — the clock and main button shift hue by state
  (focus green, rest gold, paused stone, ready moss), chosen for their feel.
- **Glanceable from another tab** — the remaining time and phase show live in the
  browser tab title.
- **Endlessly fresh prompts** — witty one-liners under the clock that *never*
  repeat back-to-back (a no-repeat shuffle bag) and mix in combinatorially
  generated reward lines, so it always surprises. Edit `js/prompts.js` to add more.
- **Surprise pop-ups** — every so often a little something (🍵 🧁 🌸 …) pops up
  and floats away, for a small hit of delight.
- Layout scales down cleanly to small windows and phones.
- Settings and your chosen scene persist between visits (localStorage).
- Respects `prefers-reduced-motion`; keyboard-friendly (Space starts/pauses,
  Esc closes settings).

## Structure

```
index.html      markup + layout
css/styles.css  theme, glass UI, ambient scene animations
js/scenes.js    the nine SVG nature scenes
js/sounds.js    Web Audio alarm synthesis (master volume, tap)
js/clocks.js    the four selectable clock faces
js/prompts.js   prompt pools + shuffle-bag/generator + surprise objects
js/app.js       the random pomodoro engine + UI wiring
```

## Tips

- Click the little circles at the bottom to switch scenes instantly.
- The dashed ring winds down as your block progresses.
- Everything is offline-first — the only network request is an optional
  Google Fonts load, with rounded system fonts as a fallback.
