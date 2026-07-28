/* ============================================================
   app.js — the random pomodoro engine + UI wiring.
   Focus and rest lengths are drawn at random from the ranges
   the user sets. Timing is anchored to a target end time so it
   never drifts, even if the tab is backgrounded.
   ============================================================ */

(function () {
  "use strict";

  var SCENES = window.NariScenes;
  var Sounds = window.NariSounds;
  var Clocks = window.NariClocks;
  var STORE_KEY = "nari.settings.v1";
  var BASE_TITLE = "Nari — a calm random pomodoro";

  // ---- persistent settings ------------------------------------------------
  var settings = {
    focusMin: 20, focusMax: 30,
    restMin: 5, restMax: 10,
    autoStartFocus: true,
    autoStartBreak: true,
    clockStyle: "digital",
    focusEndSound: "bowl",
    breakEndSound: "chime",
    volume: 0.8,
    uiSounds: true,
    scene: "meadow",
    customBg: null,
  };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) {
      Object.assign(settings, saved);
      // migrate the old single "flow automatically" toggle
      if (saved.autoCycle !== undefined &&
          saved.autoStartFocus === undefined && saved.autoStartBreak === undefined) {
        settings.autoStartFocus = saved.autoCycle;
        settings.autoStartBreak = saved.autoCycle;
      }
      delete settings.autoCycle;
      // migrate old phase-START alarm keys to the new phase-END keys
      if (saved.focusSound !== undefined && saved.focusEndSound === undefined) settings.focusEndSound = saved.focusSound;
      if (saved.breakSound !== undefined && saved.breakEndSound === undefined) settings.breakEndSound = saved.breakSound;
      delete settings.focusSound;
      delete settings.breakSound;
    }
  } catch (e) { /* ignore corrupt storage */ }
  if (!Clocks.has(settings.clockStyle)) settings.clockStyle = "digital";

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // ---- element refs -------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    body: document.body,
    card: document.querySelector(".timer-card"),
    scene: $("scene"),
    phase: $("phaseLabel"),
    dial: $("dial"),
    note: $("clockNote"),
    start: $("startBtn"),
    skip: $("skipBtn"),
    reset: $("resetBtn"),
    session: $("sessionCount"),
    leaf: $("leafTrail"),
    dock: $("sceneDock"),
    grid: $("sceneGrid"),
    panel: $("panel"),
    scrim: $("scrim"),
    openSettings: $("openSettings"),
    closeSettings: $("closeSettings"),
    focusMin: $("focusMin"), focusMax: $("focusMax"),
    restMin: $("restMin"), restMax: $("restMax"),
    autoStartFocus: $("autoStartFocus"), autoStartBreak: $("autoStartBreak"),
    clockStyle: $("clockStyle"),
    focusEndSound: $("focusEndSound"), breakEndSound: $("breakEndSound"),
    alarmVolume: $("alarmVolume"), uiSounds: $("uiSounds"),
    bgUpload: $("bgUpload"), clearCustom: $("clearCustom"),
  };

  // ---- timer state --------------------------------------------------------
  var state = {
    phase: "idle",     // idle | focus | rest
    running: false,
    endAt: 0,          // timestamp the current phase ends
    remaining: 0,      // ms left
    total: 0,          // ms of the current phase
    sessions: 0,       // completed focus blocks
    pendingNext: null, // phase queued while idle
    tick: null,
  };

  var Prompts = window.NariPrompts;

  function randMinutes(min, max) {
    min = Math.max(1, Math.min(min, max));
    max = Math.max(min, max);
    // random to the second within the range for a genuinely varied feel
    var lo = min * 60, hi = max * 60;
    var secs = lo + Math.floor(Math.random() * (hi - lo + 1));
    return secs * 1000;
  }

  function fmt(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  }

  // ---- phase control ------------------------------------------------------
  function beginPhase(phase) {
    state.phase = phase;
    if (phase === "focus") {
      state.total = randMinutes(settings.focusMin, settings.focusMax);
      el.phase.textContent = "Focus";
      el.note.textContent = Prompts.next("focus");
    } else {
      state.total = randMinutes(settings.restMin, settings.restMax);
      el.phase.textContent = "Rest";
      el.note.textContent = Prompts.next("rest");
    }
    maybeSurprise();
    // starting a phase is silent — the alarm sounds when a phase *ends*
    state.remaining = state.total;
    startClock();
  }

  function startClock() {
    state.running = true;
    state.endAt = Date.now() + state.remaining;
    el.start.textContent = "Pause";
    render();
    if (state.tick) clearInterval(state.tick);
    state.tick = setInterval(loop, 200);
  }

  function pauseClock() {
    state.running = false;
    state.remaining = Math.max(0, state.endAt - Date.now());
    el.start.textContent = "Resume";
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
    render();
  }

  function loop() {
    var left = state.endAt - Date.now();
    if (left <= 0) {
      completePhase();
      return;
    }
    state.remaining = left;
    render();
  }

  function completePhase() {
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
    var wasFocus = state.phase === "focus";
    if (wasFocus) {
      state.sessions += 1;
      updateSessionUI();
    }
    // the alarm marks the END of the phase that just finished
    Sounds.play(wasFocus ? settings.focusEndSound : settings.breakEndSound);

    var next = wasFocus ? "rest" : "focus";
    var autoStart = wasFocus ? settings.autoStartBreak : settings.autoStartFocus;
    if (autoStart) {
      beginPhase(next); // the next phase starts silently
    } else {
      // stop and let the user start the next phase manually
      state.running = false;
      state.phase = "idle";
      state.pendingNext = next;
      state.remaining = 0;
      el.phase.textContent = wasFocus ? "Break time" : "Ready";
      el.note.textContent = wasFocus
        ? "Nice work — rest when you're ready."
        : "Refreshed. Begin when ready.";
      el.start.textContent = "Start";
      render();
    }
  }

  function render() {
    setStateAttr();
    var frac = state.total > 0 ? state.remaining / state.total : 0;
    Clocks.update(el.dial, frac, state.remaining, state.running, state.phase);
    updateTitle();
  }

  // every so often, a little something pops up and floats away — pure delight
  function maybeSurprise() {
    if (Math.random() > 0.3) return;
    var span = document.createElement("span");
    span.className = "surprise-pop";
    span.textContent = Prompts.randomObject();
    span.style.left = (36 + Math.random() * 28) + "%";
    el.card.appendChild(span);
    setTimeout(function () { span.remove(); }, 2400);
  }

  // colour the clock + primary button by the phase we're in
  function setStateAttr() {
    var s = state.phase === "idle" ? "idle" : (state.running ? state.phase : "paused");
    el.body.setAttribute("data-state", s);
  }

  function updateTitle() {
    if (state.phase === "idle" || state.total === 0) {
      document.title = BASE_TITLE;
      return;
    }
    var name = state.phase === "focus" ? "Focus" : "Rest";
    var prefix = state.running ? "" : "⏸ ";
    document.title = prefix + fmt(state.remaining) + " · " + name + " — Nari";
  }

  function updateSessionUI() {
    // the block you're currently working toward
    el.session.textContent = "Session " + (state.sessions + 1);
    var leaves = "";
    for (var i = 0; i < Math.min(state.sessions, 8); i++) leaves += "🍃";
    el.leaf.textContent = leaves;
  }

  // ---- button handlers ----------------------------------------------------
  el.start.addEventListener("click", function () {
    Sounds.warmup();
    if (state.phase === "idle") {
      var next = state.pendingNext || "focus";
      state.pendingNext = null;
      beginPhase(next);
    } else if (state.running) {
      pauseClock();
    } else {
      startClock();
    }
    updateSessionUI();
  });

  el.skip.addEventListener("click", function () {
    Sounds.warmup();
    if (state.phase === "idle") { beginPhase(state.pendingNext || "focus"); return; }
    completePhase();
  });

  el.reset.addEventListener("click", function () {
    if (state.phase === "idle") {
      // full reset back to a fresh focus block
      state.sessions = 0;
      state.pendingNext = null;
      state.phase = "idle";
      state.total = randMinutes(settings.focusMin, settings.focusMax);
      state.remaining = state.total;
      el.phase.textContent = "Ready";
      el.note.textContent = "Whenever you're ready.";
      el.start.textContent = "Start";
      updateSessionUI();
      render();
      return;
    }
    // restart the current phase with a fresh random draw
    beginPhase(state.phase);
  });

  // ---- settings inputs ----------------------------------------------------
  function clampRange(minEl, maxEl, keyMin, keyMax, floor, ceil) {
    var mn = parseInt(minEl.value, 10);
    var mx = parseInt(maxEl.value, 10);
    if (isNaN(mn)) mn = floor;
    if (isNaN(mx)) mx = mn;
    mn = Math.max(floor, Math.min(mn, ceil));
    mx = Math.max(floor, Math.min(mx, ceil));
    if (mn > mx) mx = mn;
    minEl.value = mn; maxEl.value = mx;
    settings[keyMin] = mn; settings[keyMax] = mx;
    persist();
  }
  el.focusMin.addEventListener("change", function () { clampRange(el.focusMin, el.focusMax, "focusMin", "focusMax", 1, 180); });
  el.focusMax.addEventListener("change", function () { clampRange(el.focusMin, el.focusMax, "focusMin", "focusMax", 1, 180); });
  el.restMin.addEventListener("change", function () { clampRange(el.restMin, el.restMax, "restMin", "restMax", 1, 120); });
  el.restMax.addEventListener("change", function () { clampRange(el.restMin, el.restMax, "restMin", "restMax", 1, 120); });

  el.autoStartFocus.addEventListener("change", function () { settings.autoStartFocus = el.autoStartFocus.checked; persist(); });
  el.autoStartBreak.addEventListener("change", function () { settings.autoStartBreak = el.autoStartBreak.checked; persist(); });

  el.clockStyle.addEventListener("change", function () { applyClockStyle(el.clockStyle.value); persist(); });

  el.focusEndSound.addEventListener("change", function () { settings.focusEndSound = el.focusEndSound.value; persist(); Sounds.play(settings.focusEndSound); });
  el.breakEndSound.addEventListener("change", function () { settings.breakEndSound = el.breakEndSound.value; persist(); Sounds.play(settings.breakEndSound); });

  el.alarmVolume.addEventListener("input", function () {
    settings.volume = (parseInt(el.alarmVolume.value, 10) || 0) / 100;
    Sounds.setVolume(settings.volume);
    persist();
  });
  el.uiSounds.addEventListener("change", function () { settings.uiSounds = el.uiSounds.checked; persist(); });

  document.querySelectorAll("[data-preview]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      Sounds.warmup();
      var which = btn.getAttribute("data-preview");
      Sounds.play(which === "focusEnd" ? settings.focusEndSound : settings.breakEndSound);
    });
  });

  // soft, low tap on any button press — reassuring, not alerting
  document.addEventListener("pointerdown", function (e) {
    if (!settings.uiSounds) return;
    if (e.target.closest("button, .scene-cell, .dock-thumb, label.upload-btn")) {
      Sounds.warmup();
      Sounds.tap();
    }
  });

  // ---- clock style --------------------------------------------------------
  function applyClockStyle(id) {
    settings.clockStyle = Clocks.setStyle(id, el.dial);
    el.dial.setAttribute("data-style", settings.clockStyle);
    render();
  }

  // ---- background handling ------------------------------------------------
  function applyScene(id) {
    if (id === "__custom" && settings.customBg) {
      el.scene.classList.add("custom");
      el.scene.innerHTML = "";
      el.scene.style.backgroundImage = "url(" + settings.customBg + ")";
      el.body.setAttribute("data-mood", settings.customMood || "dark");
      settings.scene = "__custom";
    } else {
      var sc = SCENES.find(function (s) { return s.id === id; }) || SCENES[0];
      el.scene.classList.remove("custom");
      el.scene.style.backgroundImage = "";
      el.scene.innerHTML = sc.svg();
      el.body.setAttribute("data-mood", sc.mood);
      settings.scene = sc.id;
    }
    persist();
    syncSceneSelectionUI();
  }

  function syncSceneSelectionUI() {
    el.dock.querySelectorAll(".dock-thumb").forEach(function (t) {
      t.setAttribute("aria-pressed", String(t.dataset.scene === settings.scene));
    });
    el.grid.querySelectorAll(".scene-cell").forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.dataset.scene === settings.scene));
    });
    el.clearCustom.hidden = !settings.customBg;
  }

  // small static preview (no animation) for thumbnails
  function thumbDataUri(sc) {
    return "url('data:image/svg+xml;utf8," + encodeURIComponent(sc.svg()) + "')";
  }

  function buildSceneChoosers() {
    SCENES.forEach(function (sc) {
      var uri = thumbDataUri(sc);

      var dot = document.createElement("button");
      dot.className = "dock-thumb";
      dot.dataset.scene = sc.id;
      dot.style.backgroundImage = uri;
      dot.title = sc.name;
      dot.setAttribute("aria-label", "Scene: " + sc.name);
      dot.addEventListener("click", function () { applyScene(sc.id); });
      el.dock.appendChild(dot);

      var cell = document.createElement("button");
      cell.className = "scene-cell";
      cell.dataset.scene = sc.id;
      cell.style.backgroundImage = uri;
      cell.innerHTML = "<span>" + sc.name + "</span>";
      cell.addEventListener("click", function () { applyScene(sc.id); });
      el.grid.appendChild(cell);
    });
  }

  el.bgUpload.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      settings.customBg = reader.result;
      settings.customMood = "dark";
      persist();
      applyScene("__custom");
    };
    reader.readAsDataURL(file);
    el.bgUpload.value = "";
  });

  el.clearCustom.addEventListener("click", function () {
    settings.customBg = null;
    persist();
    applyScene(SCENES[0].id);
  });

  // ---- settings drawer open/close ----------------------------------------
  function openPanel() {
    el.panel.hidden = false;
    el.scrim.hidden = false;
    el.closeSettings.focus();
  }
  function closePanel() {
    el.panel.hidden = true;
    el.scrim.hidden = true;
    el.openSettings.focus();
  }
  el.openSettings.addEventListener("click", openPanel);
  el.closeSettings.addEventListener("click", closePanel);
  el.scrim.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !el.panel.hidden) closePanel();
    // space toggles start/pause when not typing in a field
    if (e.code === "Space" && document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "SELECT" && document.activeElement.tagName !== "BUTTON") {
      e.preventDefault();
      el.start.click();
    }
  });

  // ---- init ---------------------------------------------------------------
  function fillOptions(selectEl, items, current) {
    items.forEach(function (it) {
      var opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = it.label || it.name;
      if (it.id === current) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function init() {
    // reflect saved settings into the form
    el.focusMin.value = settings.focusMin;
    el.focusMax.value = settings.focusMax;
    el.restMin.value = settings.restMin;
    el.restMax.value = settings.restMax;
    el.autoStartFocus.checked = settings.autoStartFocus;
    el.autoStartBreak.checked = settings.autoStartBreak;
    el.uiSounds.checked = settings.uiSounds;
    el.alarmVolume.value = Math.round(settings.volume * 100);
    Sounds.setVolume(settings.volume);
    fillOptions(el.focusEndSound, Sounds.list(), settings.focusEndSound);
    fillOptions(el.breakEndSound, Sounds.list(), settings.breakEndSound);
    fillOptions(el.clockStyle, Clocks.list(), settings.clockStyle);

    buildSceneChoosers();
    if (settings.scene === "__custom" && settings.customBg) {
      applyScene("__custom");
    } else {
      applyScene(settings.scene);
    }

    // seed an idle focus block so the chosen clock face shows a full time
    state.phase = "idle";
    state.total = randMinutes(settings.focusMin, settings.focusMax);
    state.remaining = state.total;
    el.session.textContent = "Session 1";
    el.note.textContent = "Whenever you're ready.";
    applyClockStyle(settings.clockStyle); // builds the dial + first render

    // keep the countdown honest after the tab returns to the foreground
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && state.running) loop();
    });
  }

  init();
})();
