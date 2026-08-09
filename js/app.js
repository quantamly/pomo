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
    mode: "stopwatch",        // default for new visitors; "timer" (random countdown) | "stopwatch" (count up)
    focusMin: 20, focusMax: 30,
    restMin: 5, restMax: 10,
    autoStartFocus: true,
    autoStartBreak: true,
    clockStyle: "digital",
    focusEndSound: "bowl",
    breakEndSound: "chime",
    celebrateSound: "fanfare",
    warnSound: "headsup",
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

  // ---- session record -----------------------------------------------------
  var LOG_KEY = "nari.log.v1";
  var sessionLog = [];
  try {
    var savedLog = JSON.parse(localStorage.getItem(LOG_KEY));
    if (Array.isArray(savedLog)) sessionLog = savedLog;
  } catch (e) { /* ignore */ }
  function startOfToday() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  }
  // history is today-only: drop anything from a previous day
  function pruneToday() {
    var cutoff = startOfToday();
    var before = sessionLog.length;
    sessionLog = sessionLog.filter(function (e) { return e.at >= cutoff; });
    if (sessionLog.length !== before) persistLog();
  }
  function persistLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(sessionLog.slice(-60))); } catch (e) {}
  }
  function logSession(kind, ms) {
    if (ms < 1000) return; // ignore accidental instant skips
    pruneToday();
    sessionLog.push({ kind: kind, ms: ms, at: Date.now() });
    if (sessionLog.length > 60) sessionLog = sessionLog.slice(-60);
    persistLog();
  }
  pruneToday(); // clear yesterday's entries on load

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
    scenePicker: $("scenePicker"),
    sceneToggle: $("sceneToggle"),
    grid: $("sceneGrid"),
    panel: $("panel"),
    scrim: $("scrim"),
    openSettings: $("openSettings"),
    closeSettings: $("closeSettings"),
    openInfo: $("openInfo"),
    closeInfo: $("closeInfo"),
    infoModal: $("infoModal"),
    infoScrim: $("infoScrim"),
    openHistory: $("openHistory"),
    closeHistory: $("closeHistory"),
    historyModal: $("historyModal"),
    historyScrim: $("historyScrim"),
    historyBody: $("historyBody"),
    historyTotals: $("historyTotals"),
    clearHistory: $("clearHistory"),
    modeTimer: $("modeTimer"),
    modeStopwatch: $("modeStopwatch"),
    modeHint: $("modeHint"),
    focusHint: $("focusHint"),
    restHint: $("restHint"),
    focusMin: $("focusMin"), focusMax: $("focusMax"),
    restMin: $("restMin"), restMax: $("restMax"),
    autoStartFocus: $("autoStartFocus"), autoStartBreak: $("autoStartBreak"),
    clockStyle: $("clockStyle"),
    focusEndSound: $("focusEndSound"), breakEndSound: $("breakEndSound"),
    celebrateSound: $("celebrateSound"), warnSound: $("warnSound"),
    alarmVolume: $("alarmVolume"), uiSounds: $("uiSounds"),
    bgUpload: $("bgUpload"), clearCustom: $("clearCustom"),
  };

  // ---- timer state (elapsed-based; shared by timer + stopwatch) -----------
  var state = {
    phase: "idle",       // idle | focus | rest
    running: false,
    total: 0,            // timer: target ms; stopwatch: the max window ms
    remaining: 0,        // timer only, derived
    elapsedBefore: 0,    // ms banked across pauses
    runStart: 0,         // ts the running segment began
    minMs: 0, maxMs: 0,  // stopwatch thresholds for the current phase
    minReached: false,
    maxReached: false,
    sessions: 0,         // completed focus blocks
    pendingNext: null,   // phase queued while idle
    tick: null,
  };

  function currentElapsed() {
    return state.elapsedBefore + (state.running ? Date.now() - state.runStart : 0);
  }

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
    var isFocus = phase === "focus";
    state.phase = phase;
    state.elapsedBefore = 0;
    state.minReached = false;
    state.maxReached = false;
    el.dial.classList.remove("warn");
    var mn = isFocus ? settings.focusMin : settings.restMin;
    var mx = isFocus ? settings.focusMax : settings.restMax;
    state.minMs = mn * 60000;
    state.maxMs = mx * 60000;
    state.total = settings.mode === "stopwatch" ? state.maxMs : randMinutes(mn, mx);
    state.remaining = state.total;
    el.phase.textContent = isFocus ? "Focus" : "Rest";
    el.note.textContent = Prompts.next(isFocus ? "focus" : "rest");
    maybeSurprise();
    // starting a phase is silent — cues come at the end (timer) or min/max (stopwatch)
    startClock();
  }

  function startClock() {
    state.running = true;
    state.runStart = Date.now();       // keeps elapsedBefore, so this also resumes
    el.start.textContent = "Pause";
    render();
    if (state.tick) clearInterval(state.tick);
    state.tick = setInterval(loop, 200);
  }

  function pauseClock() {
    state.elapsedBefore += Date.now() - state.runStart;
    state.running = false;
    el.start.textContent = "Resume";
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
    render();
  }

  function loop() {
    var elapsed = currentElapsed();
    if (settings.mode === "timer") {
      if (elapsed >= state.total) { completePhase(); return; }
    } else {
      checkThresholds(elapsed);
    }
    render();
  }

  // stopwatch: nudge at the min (celebrate) and max (warn), once each
  function checkThresholds(elapsed) {
    var isFocus = state.phase === "focus";
    if (!state.minReached && elapsed >= state.minMs) {
      state.minReached = true;
      Sounds.play(settings.celebrateSound);
      popObject("🎉");
      celebrateGlow();
      el.note.textContent = isFocus
        ? "You've done enough — rest whenever."
        : "Rested enough — go when you're ready.";
    }
    if (!state.maxReached && elapsed >= state.maxMs) {
      state.maxReached = true;
      Sounds.play(settings.warnSound);
      el.note.textContent = isFocus
        ? "Ease off — you're past your cap."
        : "Time to head back — don't over-rest.";
    }
  }

  function completePhase() {
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
    var wasFocus = state.phase === "focus";
    logSession(wasFocus ? "focus" : "rest", currentElapsed());
    if (wasFocus) {
      state.sessions += 1;
      updateSessionUI();
    }
    el.dial.classList.remove("warn");
    // in timer mode the end alarm marks completion; stopwatch already cued min/max
    if (settings.mode === "timer") {
      Sounds.play(wasFocus ? settings.focusEndSound : settings.breakEndSound);
    }

    var next = wasFocus ? "rest" : "focus";
    // stopwatch never auto-chains — you start each block yourself
    var autoStart = settings.mode === "stopwatch"
      ? false
      : (wasFocus ? settings.autoStartBreak : settings.autoStartFocus);
    if (autoStart) {
      beginPhase(next); // the next phase starts silently
    } else {
      goIdle(next, wasFocus ? "Break time" : "Ready",
        wasFocus ? "Nice work — rest when you're ready." : "Refreshed. Begin when ready.");
    }
  }

  // settle into an idle state that previews the upcoming phase
  function goIdle(next, label, note) {
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
    state.running = false;
    state.phase = "idle";
    state.pendingNext = next;
    state.elapsedBefore = 0;
    state.minReached = false;
    state.maxReached = false;
    var isFocus = next === "focus";
    var mn = isFocus ? settings.focusMin : settings.restMin;
    var mx = isFocus ? settings.focusMax : settings.restMax;
    state.total = settings.mode === "stopwatch" ? mx * 60000 : randMinutes(mn, mx);
    state.remaining = state.total;
    el.dial.classList.remove("warn");
    el.phase.textContent = label;
    el.note.textContent = note;
    el.start.textContent = "Start";
    render();
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  // what to display right now, per mode
  function computeView() {
    var stopwatch = settings.mode === "stopwatch";
    var v = {
      mode: settings.mode, phase: state.phase, running: state.running,
      frac: 1, bonusFrac: 0, drainFrac: 1, displayMs: 0,
      overtime: false, goalReached: false,
    };
    if (state.phase === "idle") {
      // stopwatch idle: empty ring, ready to fill up; timer idle: full ring
      v.frac = stopwatch ? 0 : 1;
      v.displayMs = stopwatch ? 0 : state.total;
      return v;
    }
    var elapsed = currentElapsed();
    if (!stopwatch) {
      var remaining = Math.max(0, state.total - elapsed);
      state.remaining = remaining;
      v.frac = state.total > 0 ? remaining / state.total : 0;
      v.drainFrac = v.frac;
      v.displayMs = remaining;
      return v;
    }
    // stopwatch: the ring FILLS toward the minimum goal; a thin inner ring
    // then tracks the min→max "bonus"; the hourglass keeps draining over max.
    var min = state.minMs || 1;
    var max = state.maxMs || 1;
    v.frac = clamp01(elapsed / min);
    v.bonusFrac = max > min ? clamp01((elapsed - min) / (max - min)) : (elapsed >= min ? 1 : 0);
    v.drainFrac = clamp01((max - elapsed) / max);
    v.displayMs = elapsed;
    v.goalReached = elapsed >= min;
    v.overtime = elapsed >= max;
    return v;
  }

  function render() {
    setStateAttr();
    var v = computeView();
    el.dial.classList.toggle("warn", v.overtime);
    el.dial.classList.toggle("goal", v.goalReached && !v.overtime);
    Clocks.update(el.dial, v);
    updateTitle(v);
  }

  function popObject(glyph) {
    var span = document.createElement("span");
    span.className = "surprise-pop";
    span.textContent = glyph;
    span.style.left = (36 + Math.random() * 28) + "%";
    el.card.appendChild(span);
    setTimeout(function () { span.remove(); }, 2400);
  }

  // every so often, a little something pops up and floats away — pure delight
  function maybeSurprise() {
    if (Math.random() > 0.3) return;
    popObject(Prompts.randomObject());
  }

  function celebrateGlow() {
    el.card.classList.add("celebrate");
    setTimeout(function () { el.card.classList.remove("celebrate"); }, 1300);
  }

  // colour the clock + primary button by the phase we're in
  function setStateAttr() {
    var s = state.phase === "idle" ? "idle" : (state.running ? state.phase : "paused");
    el.body.setAttribute("data-state", s);
  }

  function updateTitle(v) {
    if (state.phase === "idle") {
      document.title = BASE_TITLE;
      return;
    }
    var name = state.phase === "focus" ? "Focus" : "Rest";
    var prefix = v.overtime ? "⚠ " : (state.running ? "" : "⏸ ");
    document.title = prefix + fmt(v.displayMs) + " · " + name + " — Nari";
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
      state.sessions = 0;
      goIdle("focus", "Ready", "Whenever you're ready.");
      updateSessionUI();
      return;
    }
    // restart the current phase (fresh random draw in timer mode; back to 0 in stopwatch)
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

  // ---- mode (random timer vs open stopwatch) -----------------------------
  function updateModeHints() {
    var sw = settings.mode === "stopwatch";
    el.modeHint.textContent = sw
      ? "The clock counts up — you choose when to stop. Nari celebrates at the min and warns at the max."
      : "A surprise length counts down and ends on its own.";
    var rangeHint = sw
      ? "In stopwatch mode: celebrate at the min, warn (red) at the max."
      : null;
    el.focusHint.textContent = rangeHint || "Each focus block is drawn at random from this range.";
    el.restHint.textContent = rangeHint || "Breaks are drawn at random from this range too.";
    el.skip.title = sw ? "Stop this block and continue" : "Skip to the next phase";
    // show only the settings relevant to the current mode
    document.querySelectorAll("[data-mode]").forEach(function (elm) {
      elm.hidden = elm.getAttribute("data-mode") !== settings.mode;
    });
  }
  function applyMode(mode) {
    settings.mode = mode;
    persist();
    updateModeHints();
    goIdle("focus", "Ready", "Whenever you're ready.");
  }
  el.modeTimer.addEventListener("change", function () { if (el.modeTimer.checked) applyMode("timer"); });
  el.modeStopwatch.addEventListener("change", function () { if (el.modeStopwatch.checked) applyMode("stopwatch"); });

  el.clockStyle.addEventListener("change", function () { applyClockStyle(el.clockStyle.value); persist(); });

  el.focusEndSound.addEventListener("change", function () { settings.focusEndSound = el.focusEndSound.value; persist(); Sounds.play(settings.focusEndSound); });
  el.breakEndSound.addEventListener("change", function () { settings.breakEndSound = el.breakEndSound.value; persist(); Sounds.play(settings.breakEndSound); });
  el.celebrateSound.addEventListener("change", function () { settings.celebrateSound = el.celebrateSound.value; persist(); Sounds.play(settings.celebrateSound); });
  el.warnSound.addEventListener("change", function () { settings.warnSound = el.warnSound.value; persist(); Sounds.play(settings.warnSound); });

  el.alarmVolume.addEventListener("input", function () {
    settings.volume = (parseInt(el.alarmVolume.value, 10) || 0) / 100;
    Sounds.setVolume(settings.volume);
    persist();
  });
  el.uiSounds.addEventListener("change", function () { settings.uiSounds = el.uiSounds.checked; persist(); });

  var PREVIEW_SOUND = {
    focusEnd: "focusEndSound", breakEnd: "breakEndSound",
    celebrate: "celebrateSound", warn: "warnSound",
  };
  document.querySelectorAll("[data-preview]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      Sounds.warmup();
      var key = PREVIEW_SOUND[btn.getAttribute("data-preview")];
      if (key) Sounds.play(settings[key]);
    });
  });

  // interface sounds: the rewarding "pop" only for the primary action,
  // a low unobtrusive "tock" for every other button
  document.addEventListener("pointerdown", function (e) {
    if (!settings.uiSounds) return;
    var target = e.target.closest("button, .scene-cell, .dock-thumb, label.upload-btn");
    if (!target) return;
    Sounds.warmup();
    if (target.id === "startBtn") Sounds.tap();
    else Sounds.tock();
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
    // the compact toggle shows the active scene
    if (settings.scene === "__custom" && settings.customBg) {
      el.sceneToggle.style.backgroundImage = "url(" + settings.customBg + ")";
    } else {
      var sc = SCENES.find(function (s) { return s.id === settings.scene; }) || SCENES[0];
      el.sceneToggle.style.backgroundImage = thumbDataUri(sc);
    }
  }

  function collapsePicker() {
    el.scenePicker.classList.remove("open");
    el.sceneToggle.setAttribute("aria-expanded", "false");
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
      dot.addEventListener("click", function () { applyScene(sc.id); collapsePicker(); });
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

  // ---- compact scene picker open/close -----------------------------------
  el.sceneToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = el.scenePicker.classList.toggle("open");
    el.sceneToggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", function (e) {
    if (el.scenePicker.classList.contains("open") && !el.scenePicker.contains(e.target)) {
      collapsePicker();
    }
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

  // ---- info modal open/close ---------------------------------------------
  function openInfo() {
    el.infoModal.hidden = false;
    el.infoScrim.hidden = false;
    el.closeInfo.focus();
  }
  function closeInfo() {
    el.infoModal.hidden = true;
    el.infoScrim.hidden = true;
    el.openInfo.focus();
  }
  el.openInfo.addEventListener("click", openInfo);
  el.closeInfo.addEventListener("click", closeInfo);
  el.infoScrim.addEventListener("click", closeInfo);

  // ---- session history ---------------------------------------------------
  function humanDuration(ms) {
    var s = Math.round(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m";
    return s + "s";
  }
  function renderHistory() {
    pruneToday();
    var tf = 0, tr = 0;
    sessionLog.forEach(function (e) {
      if (e.kind === "focus") tf += e.ms; else tr += e.ms;
    });
    el.historyTotals.textContent = "Today — focus " + humanDuration(tf) + " · rest " + humanDuration(tr);
    if (!sessionLog.length) {
      el.historyBody.innerHTML = '<p class="history-empty">No sessions yet. Finished focus and rest blocks show up here.</p>';
      el.clearHistory.hidden = true;
      return;
    }
    el.clearHistory.hidden = false;
    el.historyBody.innerHTML = sessionLog.slice().reverse().map(function (e) {
      var t = new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      var isFocus = e.kind === "focus";
      return '<div class="history-row">' +
        '<span class="hr-emoji">' + (isFocus ? "🌱" : "🍵") + "</span>" +
        '<span class="hr-label">' + (isFocus ? "Focus" : "Rest") + "</span>" +
        '<span class="hr-dur">' + fmt(e.ms) + "</span>" +
        '<span class="hr-time">' + t + "</span>" +
        "</div>";
    }).join("");
  }
  function openHistory() {
    renderHistory();
    el.historyModal.hidden = false;
    el.historyScrim.hidden = false;
    el.closeHistory.focus();
  }
  function closeHistory() {
    el.historyModal.hidden = true;
    el.historyScrim.hidden = true;
    el.openHistory.focus();
  }
  el.openHistory.addEventListener("click", openHistory);
  el.closeHistory.addEventListener("click", closeHistory);
  el.historyScrim.addEventListener("click", closeHistory);
  el.clearHistory.addEventListener("click", function () {
    sessionLog = [];
    persistLog();
    renderHistory();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") collapsePicker();
    if (e.key === "Escape" && !el.infoModal.hidden) closeInfo();
    if (e.key === "Escape" && !el.historyModal.hidden) closeHistory();
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
    el.modeTimer.checked = settings.mode !== "stopwatch";
    el.modeStopwatch.checked = settings.mode === "stopwatch";
    updateModeHints();
    el.alarmVolume.value = Math.round(settings.volume * 100);
    Sounds.setVolume(settings.volume);
    fillOptions(el.focusEndSound, Sounds.list(), settings.focusEndSound);
    fillOptions(el.breakEndSound, Sounds.list(), settings.breakEndSound);
    fillOptions(el.celebrateSound, Sounds.celebrateList(), settings.celebrateSound);
    fillOptions(el.warnSound, Sounds.warnList(), settings.warnSound);
    fillOptions(el.clockStyle, Clocks.list(), settings.clockStyle);

    buildSceneChoosers();
    if (settings.scene === "__custom" && settings.customBg) {
      applyScene("__custom");
    } else {
      applyScene(settings.scene);
    }

    // seed an idle block so the chosen clock face shows a sensible time
    state.phase = "idle";
    state.total = settings.mode === "stopwatch"
      ? settings.focusMax * 60000
      : randMinutes(settings.focusMin, settings.focusMax);
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
