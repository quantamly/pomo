/* ============================================================
   sounds.js — alarm tones synthesized with the Web Audio API.
   No audio files to download; every chime is generated live,
   so the app stays self-contained and instant. Everything runs
   through a master gain so a single volume controls it all.
   ============================================================ */

(function () {
  "use strict";

  var ctx = null;
  var master = null;
  var volume = 0.8;

  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // one voice: oscillator -> gain envelope -> (optional) filter -> master
  function voice(ac, opts) {
    var t0 = opts.start;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.glideTo) {
      osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + opts.dur);
    }

    var peak = opts.gain == null ? 0.3 : opts.gain;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    var node = osc;
    if (opts.filter) {
      var f = ac.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.value = opts.filterFreq || 1200;
      node.connect(f);
      f.connect(gain);
    } else {
      node.connect(gain);
    }
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];      // C D E G A C
  var PENTA_HI = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0];  // one octave up

  var LIBRARY = {
    bell: function (ac, t) {
      // struck bell: fundamental + inharmonic partials, long decay
      voice(ac, { start: t, freq: 660, dur: 1.9, gain: 0.32, type: "sine" });
      voice(ac, { start: t, freq: 660 * 2.76, dur: 1.4, gain: 0.10, type: "sine" });
      voice(ac, { start: t, freq: 660 * 5.4, dur: 0.9, gain: 0.05, type: "sine" });
    },
    chime: function (ac, t) {
      // wind chimes: a scatter of pentatonic notes
      var order = [4, 2, 5, 3, 1];
      for (var i = 0; i < order.length; i++) {
        voice(ac, { start: t + i * 0.14, freq: PENTA[order[i]], dur: 1.6, gain: 0.22, type: "triangle" });
      }
    },
    birds: function (ac, t) {
      // little chirps sweeping up
      var offsets = [0, 0.13, 0.22, 0.4, 0.52, 0.66];
      for (var i = 0; i < offsets.length; i++) {
        var base = 1700 + (i % 3) * 260;
        voice(ac, { start: t + offsets[i], freq: base, glideTo: base + 900, dur: 0.11, gain: 0.18, attack: 0.005, type: "sine" });
      }
    },
    gong: function (ac, t) {
      // low, resonant, slow bloom
      voice(ac, { start: t, freq: 110, dur: 3.2, gain: 0.34, attack: 0.05, type: "sine", filter: "lowpass", filterFreq: 900 });
      voice(ac, { start: t, freq: 138, dur: 2.8, gain: 0.18, attack: 0.06, type: "triangle", filter: "lowpass", filterFreq: 900 });
      voice(ac, { start: t, freq: 220, dur: 2.0, gain: 0.10, attack: 0.05, type: "sine" });
    },
    marimba: function (ac, t) {
      // warm mallet arpeggio
      var notes = [0, 2, 4, 5];
      for (var i = 0; i < notes.length; i++) {
        voice(ac, { start: t + i * 0.12, freq: PENTA[notes[i]], dur: 0.5, gain: 0.28, attack: 0.004, type: "sine" });
        voice(ac, { start: t + i * 0.12, freq: PENTA[notes[i]] * 2, dur: 0.22, gain: 0.06, attack: 0.004, type: "sine" });
      }
    },
    droplet: function (ac, t) {
      // soft water drops, pitch bending down
      var offs = [0, 0.28, 0.5];
      for (var i = 0; i < offs.length; i++) {
        voice(ac, { start: t + offs[i], freq: 1100 - i * 120, glideTo: 520 - i * 60, dur: 0.34, gain: 0.26, attack: 0.004, type: "sine" });
      }
    },
    digital: function (ac, t) {
      // gentle three-note ready tone
      var seq = [784, 784, 1046];
      for (var i = 0; i < seq.length; i++) {
        voice(ac, { start: t + i * 0.16, freq: seq[i], dur: 0.13, gain: 0.2, attack: 0.004, type: "triangle" });
      }
    },
    bowl: function (ac, t) {
      // singing bowl: slow shimmering swell with beating partials
      voice(ac, { start: t, freq: 320, dur: 3.6, gain: 0.30, attack: 0.12, type: "sine" });
      voice(ac, { start: t, freq: 323, dur: 3.6, gain: 0.20, attack: 0.14, type: "sine" }); // slight detune -> beats
      voice(ac, { start: t, freq: 320 * 2.4, dur: 2.4, gain: 0.08, attack: 0.2, type: "sine" });
    },
    koto: function (ac, t) {
      // plucked string arpeggio, bright attack
      var notes = [1, 3, 4, 5];
      for (var i = 0; i < notes.length; i++) {
        voice(ac, { start: t + i * 0.15, freq: PENTA[notes[i]], dur: 0.9, gain: 0.24, attack: 0.002, type: "sawtooth", filter: "lowpass", filterFreq: 2200 });
      }
    },
    musicbox: function (ac, t) {
      // tinkling high melody, quick decays
      var mel = [2, 4, 5, 4, 2];
      for (var i = 0; i < mel.length; i++) {
        voice(ac, { start: t + i * 0.18, freq: PENTA_HI[mel[i]], dur: 0.6, gain: 0.16, attack: 0.003, type: "sine" });
        voice(ac, { start: t + i * 0.18, freq: PENTA_HI[mel[i]] * 2, dur: 0.2, gain: 0.03, attack: 0.003, type: "sine" });
      }
    },
    rainstick: function (ac, t) {
      // a soft cascade of tiny high ticks trickling down
      for (var i = 0; i < 22; i++) {
        var f = 1600 + Math.random() * 2200;
        voice(ac, { start: t + i * 0.045 + Math.random() * 0.02, freq: f, dur: 0.05, gain: 0.06, attack: 0.002, type: "triangle" });
      }
    },
    zenblock: function (ac, t) {
      // hollow wood block: two knocks
      [0, 0.22].forEach(function (o) {
        voice(ac, { start: t + o, freq: 300, glideTo: 180, dur: 0.14, gain: 0.28, attack: 0.002, type: "square", filter: "lowpass", filterFreq: 800 });
      });
    },
    sunrise: function (ac, t) {
      // ascending pentatonic run, gentle
      var run = [0, 1, 2, 3, 4, 5];
      for (var i = 0; i < run.length; i++) {
        voice(ac, { start: t + i * 0.11, freq: PENTA[run[i]], dur: 0.9, gain: 0.18, attack: 0.006, type: "triangle" });
      }
    },
  };

  var ORDER = [
    "chime", "marimba", "bowl", "koto", "musicbox", "bell",
    "birds", "droplet", "rainstick", "zenblock", "sunrise", "gong", "digital",
  ];
  var LABELS = {
    bell: "Temple bell", chime: "Wind chime", birds: "Birdsong",
    gong: "Deep gong", marimba: "Marimba", droplet: "Water drops",
    digital: "Soft tone", bowl: "Singing bowl", koto: "Koto pluck",
    musicbox: "Music box", rainstick: "Rain stick", zenblock: "Wood block",
    sunrise: "Rising chime",
  };

  window.NariSounds = {
    list: function () {
      return ORDER.map(function (id) { return { id: id, label: LABELS[id] }; });
    },
    play: function (id) {
      var fn = LIBRARY[id] || LIBRARY.chime;
      var ac = audio();
      fn(ac, ac.currentTime + 0.02);
    },
    // Warm, satisfying "pop" for the ONE primary action (Start/Pause/Resume).
    // A gentle rising contour still reads as positive/rewarding, but it's
    // lowpass-softened and low on bright harmonics so it feels pleasant rather
    // than alarming.
    tap: function () {
      var ac = audio();
      var t = ac.currentTime + 0.004;
      voice(ac, { start: t, freq: 360, glideTo: 500, dur: 0.14, gain: 0.26, attack: 0.003, type: "sine", filter: "lowpass", filterFreq: 1400 });
      // faint, mellow overtone for a touch of body (no bright sparkle)
      voice(ac, { start: t, freq: 720, glideTo: 1000, dur: 0.07, gain: 0.05, attack: 0.003, type: "sine", filter: "lowpass", filterFreq: 1400 });
    },

    // Low, dull "tock" for every other button — unobtrusive, not a reward.
    tock: function () {
      var ac = audio();
      var t = ac.currentTime + 0.004;
      voice(ac, { start: t, freq: 104, glideTo: 80, dur: 0.07, gain: 0.11, attack: 0.002, type: "sine", filter: "lowpass", filterFreq: 360 });
    },
    // bright ascending flourish — "you've done enough, well done"
    celebrate: function () {
      var ac = audio();
      var t = ac.currentTime + 0.02;
      var run = [0, 2, 4, 5, 4];
      for (var i = 0; i < run.length; i++) {
        voice(ac, { start: t + i * 0.1, freq: PENTA[run[i]], dur: 0.7, gain: 0.2, attack: 0.004, type: "triangle" });
        voice(ac, { start: t + i * 0.1, freq: PENTA[run[i]] * 2, dur: 0.35, gain: 0.06, attack: 0.004, type: "sine" });
      }
      // final sparkle up top
      voice(ac, { start: t + run.length * 0.1, freq: PENTA_HI[5], dur: 0.9, gain: 0.14, attack: 0.004, type: "sine" });
    },

    // gentle but insistent low double-tone — "heads up, don't overdo it"
    warn: function () {
      var ac = audio();
      var t = ac.currentTime + 0.02;
      [0, 0.34].forEach(function (o) {
        voice(ac, { start: t + o, freq: 392, glideTo: 300, dur: 0.3, gain: 0.26, attack: 0.006, type: "triangle", filter: "lowpass", filterFreq: 900 });
        voice(ac, { start: t + o, freq: 196, dur: 0.32, gain: 0.12, attack: 0.006, type: "sine" });
      });
    },

    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
    // let the browser unlock audio on the first user gesture
    warmup: function () { audio(); },
  };
})();
