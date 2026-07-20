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
  var STORE_KEY = "nari.settings.v1";
  var RING_LEN = 2 * Math.PI * 110; // matches r=110 in the SVG

  // ---- persistent settings ------------------------------------------------
  var settings = {
    focusMin: 20, focusMax: 30,
    restMin: 5, restMax: 10,
    autoCycle: true,
    focusSound: "marimba",
    breakSound: "chime",
    scene: "meadow",
    customBg: null,
  };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) Object.assign(settings, saved);
  } catch (e) { /* ignore corrupt storage */ }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  // ---- element refs -------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    body: document.body,
    scene: $("scene"),
    phase: $("phaseLabel"),
    clock: $("clock"),
    note: $("clockNote"),
    ring: $("ringProgress"),
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
    autoCycle: $("autoCycle"),
    focusSound: $("focusSound"), breakSound: $("breakSound"),
    bgUpload: $("bgUpload"), clearCustom: $("clearCustom"),
  };

  // ---- timer state --------------------------------------------------------
  var state = {
    phase: "idle",     // idle | focus | rest
    running: false,
    endAt: 0,          // timestamp the current phase ends
    remaining: 0,      // ms left when paused
    total: 0,          // ms of the current phase
    sessions: 0,       // completed focus blocks
    tick: null,
  };

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

  function humanMinutes(ms) {
    var m = Math.round(ms / 60000);
    var s = Math.round(ms / 1000) % 60;
    if (s === 0) return m + " min";
    return m + " min " + s + " s";
  }

  // ---- phase control ------------------------------------------------------
  function beginPhase(phase) {
    state.phase = phase;
    if (phase === "focus") {
      state.total = randMinutes(settings.focusMin, settings.focusMax);
      el.phase.textContent = "Focus";
      el.note.textContent = "A " + humanMinutes(state.total) + " focus, drawn from " +
        settings.focusMin + "–" + settings.focusMax + " min";
      Sounds.play(settings.focusSound);
    } else {
      state.total = randMinutes(settings.restMin, settings.restMax);
      el.phase.textContent = "Rest";
      el.note.textContent = "A " + humanMinutes(state.total) + " break, drawn from " +
        settings.restMin + "–" + settings.restMax + " min";
      Sounds.play(settings.breakSound);
    }
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
    var next = wasFocus ? "rest" : "focus";
    if (settings.autoCycle) {
      beginPhase(next); // this plays the appropriate sound for the new phase
    } else {
      // stop and let the user start the next phase manually
      state.running = false;
      state.phase = "idle";
      state.pendingNext = next;
      el.phase.textContent = wasFocus ? "Break time" : "Ready";
      el.note.textContent = wasFocus
        ? "Nice work. Start when you're ready to rest."
        : "Rested. Start your next focus block.";
      el.clock.textContent = fmt(0);
      el.start.textContent = "Start";
      setRing(0);
      Sounds.play(wasFocus ? settings.breakSound : settings.focusSound);
    }
  }

  function render() {
    el.clock.textContent = fmt(state.remaining);
    var frac = state.total > 0 ? state.remaining / state.total : 0;
    setRing(frac);
  }

  function setRing(frac) {
    el.ring.style.strokeDashoffset = RING_LEN * (1 - frac);
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
    if (state.phase === "idle") { beginPhase("focus"); return; }
    completePhase();
  });

  el.reset.addEventListener("click", function () {
    if (state.phase === "idle") {
      // full reset back to a fresh focus block
      state.sessions = 0;
      state.pendingNext = null;
      el.phase.textContent = "Ready";
      el.note.textContent = "Press start to begin";
      el.clock.textContent = fmt(0);
      setRing(1);
      updateSessionUI();
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
  el.autoCycle.addEventListener("change", function () { settings.autoCycle = el.autoCycle.checked; persist(); });

  el.focusSound.addEventListener("change", function () { settings.focusSound = el.focusSound.value; persist(); Sounds.play(settings.focusSound); });
  el.breakSound.addEventListener("change", function () { settings.breakSound = el.breakSound.value; persist(); Sounds.play(settings.breakSound); });

  document.querySelectorAll("[data-preview]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      Sounds.warmup();
      var which = btn.getAttribute("data-preview");
      Sounds.play(which === "focus" ? settings.focusSound : settings.breakSound);
    });
  });

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
  function fillSounds(selectEl, current) {
    Sounds.list().forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      if (s.id === current) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function init() {
    // reflect saved settings into the form
    el.focusMin.value = settings.focusMin;
    el.focusMax.value = settings.focusMax;
    el.restMin.value = settings.restMin;
    el.restMax.value = settings.restMax;
    el.autoCycle.checked = settings.autoCycle;
    fillSounds(el.focusSound, settings.focusSound);
    fillSounds(el.breakSound, settings.breakSound);

    buildSceneChoosers();
    if (settings.scene === "__custom" && settings.customBg) {
      applyScene("__custom");
    } else {
      applyScene(settings.scene);
    }

    el.session.textContent = "Session 1";
    setRing(1);
    el.clock.textContent = fmt(randMinutes(settings.focusMin, settings.focusMax));
    el.note.textContent = "Press start to begin";

    // keep the countdown honest after the tab returns to the foreground
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && state.running) loop();
    });
  }

  init();
})();
