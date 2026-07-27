/* ============================================================
   clocks.js — selectable timer faces.
   Each style knows how to build its markup into the .dial and
   how to update itself from (frac, ms, running, phase) on every
   tick. Only one style is active at a time. All faces are inline
   SVG / CSS so the app stays offline and font-free.
   ============================================================ */

(function () {
  "use strict";

  var RING_R = 110;
  var RING_LEN = 2 * Math.PI * RING_R;      // digital / lcd progress ring
  var ARC_R = 104;
  var ARC_LEN = 2 * Math.PI * ARC_R;        // analog depleting arc

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  }

  // seven-segment lamp map: which segments (a..g) are lit per digit
  var SEG = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc",
    "5": "afgcd", "6": "afgecd", "7": "abc", "8": "abcdefg", "9": "abcdfg",
  };
  function segSpans() {
    return "abcdefg".split("").map(function (s) {
      return '<span class="seg seg-' + s + '"></span>';
    }).join("");
  }
  function setDigit(cell, ch) {
    var on = SEG[ch] || "";
    cell.querySelectorAll(".seg").forEach(function (span) {
      var name = span.className.match(/seg-([a-g])/)[1];
      span.classList.toggle("on", on.indexOf(name) !== -1);
    });
  }

  var ringSvg =
    '<svg class="face-ring" viewBox="0 0 240 240" aria-hidden="true">' +
    '<circle class="ring-track" cx="120" cy="120" r="' + RING_R + '"/>' +
    '<circle class="ring-progress" cx="120" cy="120" r="' + RING_R + '"/>' +
    "</svg>";

  function setRing(node, frac) {
    node.style.strokeDasharray = RING_LEN;
    node.style.strokeDashoffset = RING_LEN * (1 - frac);
  }

  // -------------------------------------------------------------------------
  var STYLES = {

    digital: {
      id: "digital", name: "Rounded",
      build: function (dial) {
        dial.innerHTML = ringSvg +
          '<div class="clock-wrap"><div class="clock" data-clock>25:00</div></div>';
        this.ring = dial.querySelector(".ring-progress");
        this.num = dial.querySelector("[data-clock]");
      },
      update: function (dial, frac, ms) {
        setRing(this.ring, frac);
        this.num.textContent = fmt(ms);
      },
    },

    lcd: {
      id: "lcd", name: "LCD segment",
      build: function (dial) {
        dial.innerHTML = ringSvg +
          '<div class="lcd" data-lcd>' +
          '<span class="lcd-digit">' + segSpans() + "</span>" +
          '<span class="lcd-digit">' + segSpans() + "</span>" +
          '<span class="lcd-colon"><i></i><i></i></span>' +
          '<span class="lcd-digit">' + segSpans() + "</span>" +
          '<span class="lcd-digit">' + segSpans() + "</span>" +
          "</div>";
        this.ring = dial.querySelector(".ring-progress");
        this.cells = dial.querySelectorAll(".lcd-digit");
      },
      update: function (dial, frac, ms) {
        setRing(this.ring, frac);
        var t = fmt(ms).replace(":", ""); // 4 chars MMSS
        for (var i = 0; i < 4; i++) setDigit(this.cells[i], t[i]);
      },
    },

    minimal: {
      id: "minimal", name: "Minimal",
      build: function (dial) {
        dial.innerHTML =
          '<div class="clock-wrap"><div class="clock clock-minimal" data-clock>25:00</div></div>';
        this.num = dial.querySelector("[data-clock]");
      },
      update: function (dial, frac, ms) {
        this.num.textContent = fmt(ms);
      },
    },

    analog: {
      id: "analog", name: "Analog face",
      build: function (dial) {
        var ticks = "";
        for (var i = 0; i < 60; i++) {
          var big = i % 5 === 0;
          var y2 = big ? 30 : 26;
          ticks += '<line class="tick ' + (big ? "tick-lg" : "") + '" x1="120" y1="18" x2="120" y2="' +
            y2 + '" transform="rotate(' + (i * 6) + ' 120 120)"/>';
        }
        dial.innerHTML =
          '<svg class="face-analog" viewBox="0 0 240 240" aria-hidden="true">' +
          '<circle class="analog-bg" cx="120" cy="120" r="112"/>' +
          '<circle class="analog-arc" cx="120" cy="120" r="' + ARC_R + '" transform="rotate(-90 120 120)"/>' +
          '<g class="ticks">' + ticks + "</g>" +
          '<line class="hand hand-min" data-min x1="120" y1="132" x2="120" y2="52"/>' +
          '<line class="hand hand-sec" data-sec x1="120" y1="140" x2="120" y2="40"/>' +
          '<circle class="analog-cap" cx="120" cy="120" r="6"/>' +
          "</svg>";
        this.arc = dial.querySelector(".analog-arc");
        this.min = dial.querySelector("[data-min]");
        this.sec = dial.querySelector("[data-sec]");
      },
      update: function (dial, frac, ms) {
        this.arc.style.strokeDasharray = ARC_LEN;
        this.arc.style.strokeDashoffset = ARC_LEN * (1 - frac);
        var secs = Math.max(0, ms / 1000);
        var minAngle = ((secs / 60) % 60) / 60 * 360;
        var secAngle = (secs % 60) / 60 * 360;
        this.min.setAttribute("transform", "rotate(" + minAngle + " 120 120)");
        this.sec.setAttribute("transform", "rotate(" + secAngle + " 120 120)");
      },
    },

    hourglass: {
      id: "hourglass", name: "Live hourglass",
      build: function (dial) {
        // top bulb drains through a funnel; grains stream onto a growing pile
        var grains = "";
        for (var i = 0; i < 5; i++) {
          grains += '<rect class="hg-grain" x="' + (118 + (i % 3)) + '" y="118" width="2.6" ' +
            'height="5" rx="1.2" style="animation-delay:-' + (i * 0.16).toFixed(2) + 's"/>';
        }
        dial.innerHTML =
          '<svg class="face-hg" viewBox="0 0 240 240" aria-hidden="true">' +
          "<defs>" +
          '<clipPath id="hgTop"><polygon points="52,26 188,26 120,120"/></clipPath>' +
          '<clipPath id="hgBot"><polygon points="120,120 52,214 188,214"/></clipPath>' +
          "</defs>" +
          '<polygon class="hg-glass" points="52,26 188,26 120,120"/>' +
          '<polygon class="hg-glass" points="120,120 52,214 188,214"/>' +
          '<polygon class="hg-sand" data-top clip-path="url(#hgTop)" points="" />' +
          '<g clip-path="url(#hgBot)">' +
          '<rect class="hg-sand" data-bot x="44" width="152" />' +
          '<polygon class="hg-sand hg-mound" data-mound points="" />' +
          "</g>" +
          '<rect class="hg-stream" data-stream x="119" width="2.4" />' +
          '<g class="hg-grains" data-grains>' + grains + "</g>" +
          '<rect class="hg-cap" x="40" y="18" width="160" height="10" rx="5"/>' +
          '<rect class="hg-cap" x="40" y="214" width="160" height="10" rx="5"/>' +
          "</svg>" +
          '<div class="hg-time" data-clock aria-hidden="true">25:00</div>' +
          '<span class="sr-only" data-sr></span>';
        this.top = dial.querySelector("[data-top]");
        this.bot = dial.querySelector("[data-bot]");
        this.mound = dial.querySelector("[data-mound]");
        this.stream = dial.querySelector("[data-stream]");
        this.grains = dial.querySelector("[data-grains]");
        this.time = dial.querySelector("[data-clock]");
        this.sr = dial.querySelector("[data-sr]");
      },
      update: function (dial, frac, ms, running) {
        var H = 94;                    // usable sand height per bulb
        var topH = frac * H;
        var botH = (1 - frac) * H;
        var topSurf = 120 - topH;      // y of the top sand surface
        var botSurf = 214 - botH;      // y of the pile surface

        // top sand with a funnel dip that deepens as it drains (clip keeps sides)
        var dip = Math.min(18, (1 - frac) * 22 + 2);
        this.top.setAttribute("points",
          "44," + topSurf + " 108," + (topSurf + dip * 0.35) + " 120," + (topSurf + dip) +
          " 132," + (topSurf + dip * 0.35) + " 196," + topSurf + " 196,120 44,120");

        // bottom pile: trapezoid (clipped) + a centered mound peak
        this.bot.setAttribute("y", botSurf);
        this.bot.setAttribute("height", botH);
        var mw = Math.min(48, botH * 0.75 + 4);
        var peak = Math.min(18, botH * 0.30);
        this.mound.setAttribute("points",
          (120 - mw) + "," + botSurf + " 120," + (botSurf - peak) + " " + (120 + mw) + "," + botSurf);

        // falling grains + guide stream whenever the sand is running down
        var streaming = running && frac > 0.004;
        var drop = Math.max(6, botSurf - 120);
        this.stream.setAttribute("y", 120);
        this.stream.setAttribute("height", drop);
        this.stream.style.opacity = streaming ? "0.7" : "0";
        this.grains.style.setProperty("--drop", drop + "px");
        this.grains.style.opacity = streaming ? "1" : "0";

        var t = fmt(ms);
        this.time.textContent = t;
        this.sr.textContent = t + " remaining";
      },
    },
  };

  var ORDER = ["digital", "hourglass", "analog", "minimal", "lcd"];
  var active = STYLES.digital;

  window.NariClocks = {
    list: function () {
      return ORDER.map(function (id) { return { id: id, name: STYLES[id].name }; });
    },
    has: function (id) { return !!STYLES[id]; },
    setStyle: function (id, dial) {
      active = STYLES[id] || STYLES.digital;
      active.build(dial);
      return active.id;
    },
    update: function (dial, frac, ms, running, phase) {
      active.update(dial, frac, ms, running, phase);
    },
  };
})();
