/* ============================================================
   sounds.js — alarm tones synthesized with the Web Audio API.
   No audio files to download; every chime is generated live,
   so the app stays self-contained and instant.
   ============================================================ */

(function () {
  "use strict";

  var ctx = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // one voice: oscillator -> gain envelope -> (optional) filter -> out
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
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C D E G A C

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
        voice(ac, {
          start: t + i * 0.14,
          freq: PENTA[order[i]],
          dur: 1.6,
          gain: 0.22,
          type: "triangle",
        });
      }
    },
    birds: function (ac, t) {
      // little chirps sweeping up
      var offsets = [0, 0.13, 0.22, 0.4, 0.52, 0.66];
      for (var i = 0; i < offsets.length; i++) {
        var base = 1700 + (i % 3) * 260;
        voice(ac, {
          start: t + offsets[i],
          freq: base,
          glideTo: base + 900,
          dur: 0.11,
          gain: 0.18,
          attack: 0.005,
          type: "sine",
        });
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
        voice(ac, {
          start: t + offs[i],
          freq: 1100 - i * 120,
          glideTo: 520 - i * 60,
          dur: 0.34,
          gain: 0.26,
          attack: 0.004,
          type: "sine",
        });
      }
    },
    digital: function (ac, t) {
      // gentle three-note ready tone
      var seq = [784, 784, 1046];
      for (var i = 0; i < seq.length; i++) {
        voice(ac, { start: t + i * 0.16, freq: seq[i], dur: 0.13, gain: 0.2, attack: 0.004, type: "triangle" });
      }
    },
  };

  var ORDER = ["chime", "bell", "birds", "marimba", "droplet", "gong", "digital"];
  var LABELS = {
    bell: "Temple bell",
    chime: "Wind chime",
    birds: "Birdsong",
    gong: "Deep gong",
    marimba: "Marimba",
    droplet: "Water drops",
    digital: "Soft tone",
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
    // let the browser unlock audio on the first user gesture
    warmup: function () { audio(); },
  };
})();
