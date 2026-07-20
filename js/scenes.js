/* ============================================================
   scenes.js — hand-drawn, self-contained nature backdrops.
   Every scene is inline SVG (no external images), so the app
   works offline and never waits on a network request.
   Ambient motion (drifting clouds, twinkling stars, swaying
   trees) is driven by CSS classes defined in styles.css.
   ============================================================ */

(function () {
  "use strict";

  // --- little SVG helpers -------------------------------------------------
  function cloud(x, y, s, dur, fill, delay) {
    fill = fill || "rgba(255,255,255,0.92)";
    delay = delay || 0;
    // one puffy cloud built from overlapping ellipses
    return (
      '<g class="scene-cloud" style="animation-duration:' + dur + 's;animation-delay:-' + delay + 's">' +
      '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')" opacity="0.96">' +
      '<ellipse cx="0"  cy="10" rx="60" ry="26" fill="' + fill + '"/>' +
      '<ellipse cx="-38" cy="18" rx="34" ry="20" fill="' + fill + '"/>' +
      '<ellipse cx="34" cy="20" rx="40" ry="22" fill="' + fill + '"/>' +
      '<ellipse cx="-6" cy="-8" rx="34" ry="26" fill="' + fill + '"/>' +
      '<ellipse cx="26" cy="-2" rx="30" ry="22" fill="' + fill + '"/>' +
      "</g></g>"
    );
  }

  function roundTree(x, y, s, palette) {
    return (
      '<g class="scene-tree" style="animation-duration:' + (5 + (x % 5)) + 's;animation-delay:-' + (x % 4) + 's" ' +
      'transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      '<rect x="-7" y="0" width="14" height="70" rx="6" fill="' + palette.trunk + '"/>' +
      '<ellipse cx="0" cy="-34" rx="54" ry="50" fill="' + palette.leafDark + '"/>' +
      '<ellipse cx="-22" cy="-20" rx="34" ry="32" fill="' + palette.leaf + '"/>' +
      '<ellipse cx="24" cy="-24" rx="30" ry="30" fill="' + palette.leaf + '"/>' +
      '<ellipse cx="4" cy="-52" rx="30" ry="28" fill="' + palette.leafLight + '"/>' +
      "</g>"
    );
  }

  function pine(x, y, s, c1, c2) {
    return (
      '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      '<polygon points="0,-120 46,-30 -46,-30" fill="' + c1 + '"/>' +
      '<polygon points="0,-90 54,10 -54,10" fill="' + c2 + '"/>' +
      '<polygon points="0,-58 60,50 -60,50" fill="' + c1 + '"/>' +
      '<rect x="-9" y="46" width="18" height="34" fill="#4a3b2c"/>' +
      "</g>"
    );
  }

  function stars(count, w, h, maxY) {
    var out = "";
    // deterministic pseudo-random so the sky is stable per render
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < count; i++) {
      var x = rnd() * w;
      var y = rnd() * maxY;
      var r = 0.6 + rnd() * 1.8;
      var dur = 2.2 + rnd() * 3.4;
      var delay = rnd() * 4;
      out +=
        '<circle class="scene-star" cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="' + r.toFixed(1) +
        '" fill="#fff" style="animation-duration:' + dur.toFixed(1) + 's;animation-delay:-' + delay.toFixed(1) + 's"/>';
    }
    return out;
  }

  function fireflies(count, w, h) {
    var out = "";
    var seed = 42;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < count; i++) {
      var x = 120 + rnd() * (w - 240);
      var y = h * 0.5 + rnd() * (h * 0.42);
      var dur = 4 + rnd() * 4;
      out +=
        '<circle class="scene-fly" cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="2.6" fill="#fff2ab" ' +
        'style="animation-duration:' + dur.toFixed(1) + 's;animation-delay:-' + (rnd() * dur).toFixed(1) + 's"/>';
    }
    return out;
  }

  function frame(defs, body) {
    return (
      '<svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      "<defs>" + defs + "</defs>" + body + "</svg>"
    );
  }

  // --- the scenes ---------------------------------------------------------
  var SCENES = [
    {
      id: "meadow",
      name: "Meadow",
      mood: "light",
      svg: function () {
        var defs =
          '<linearGradient id="mSky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#8fd0f2"/><stop offset="0.7" stop-color="#cfeefb"/></linearGradient>' +
          '<linearGradient id="mHillA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7cf7e"/><stop offset="1" stop-color="#8bbb63"/></linearGradient>' +
          '<linearGradient id="mHillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#84b95f"/><stop offset="1" stop-color="#6ba24a"/></linearGradient>' +
          '<linearGradient id="mHillC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e934146"/><stop offset="1" stop-color="#4f8637"/></linearGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#mSky)"/>' +
          '<circle class="scene-sun" cx="965" cy="150" r="66" fill="#fff3c4"/>' +
          '<circle class="scene-sun" cx="965" cy="150" r="90" fill="#fff3c4" opacity="0.28"/>' +
          cloud(300, 150, 1.2, 70, "rgba(255,255,255,0.95)", 8) +
          cloud(720, 100, 0.9, 95, "rgba(255,255,255,0.9)", 40) +
          cloud(150, 250, 0.75, 80, "rgba(255,255,255,0.85)", 60) +
          '<path d="M0,560 Q300,470 620,540 T1200,520 V800 H0 Z" fill="url(#mHillA)"/>' +
          '<path d="M0,650 Q360,560 760,640 T1200,620 V800 H0 Z" fill="url(#mHillB)"/>' +
          roundTree(940, 610, 1.05, { trunk: "#7c5a3a", leafDark: "#3f7a33", leaf: "#5da146", leafLight: "#7cc061" }) +
          '<path d="M0,720 Q400,660 820,720 T1200,700 V800 H0 Z" fill="url(#mHillC)"/>';
        return frame(defs, body);
      },
    },
    {
      id: "sunset",
      name: "Sunset",
      mood: "light",
      svg: function () {
        var defs =
          '<linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffd08a"/><stop offset="0.45" stop-color="#ffb27a"/>' +
          '<stop offset="0.8" stop-color="#f5896f"/><stop offset="1" stop-color="#e8767e"/></linearGradient>' +
          '<radialGradient id="sGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff4d0"/><stop offset="1" stop-color="#fff4d0" stop-opacity="0"/></radialGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#sSky)"/>' +
          '<circle cx="600" cy="470" r="300" fill="url(#sGlow)"/>' +
          '<circle class="scene-sun" cx="600" cy="470" r="96" fill="#fff1c9"/>' +
          cloud(260, 180, 1.1, 110, "rgba(255,214,170,0.85)", 10) +
          cloud(830, 140, 0.85, 130, "rgba(255,200,160,0.8)", 55) +
          '<path d="M0,540 Q300,500 600,540 T1200,540 V800 H0 Z" fill="#c96b6f"/>' +
          '<path d="M0,600 Q300,555 620,600 T1200,590 V800 H0 Z" fill="#9c5262"/>' +
          '<path d="M0,680 Q360,630 760,680 T1200,670 V800 H0 Z" fill="#6f3b52"/>' +
          pine(180, 690, 0.7, "#4a2c44", "#3d2439") +
          pine(1030, 700, 0.85, "#4a2c44", "#3d2439");
        return frame(defs, body);
      },
    },
    {
      id: "sky",
      name: "Cloud sea",
      mood: "light",
      svg: function () {
        var defs =
          '<linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#4fa3e0"/><stop offset="0.6" stop-color="#a9dcf5"/><stop offset="1" stop-color="#e7f7ff"/></linearGradient>' +
          '<linearGradient id="cSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfeef2"/><stop offset="1" stop-color="#7fcfd6"/></linearGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#cSky)"/>' +
          '<circle class="scene-sun" cx="240" cy="150" r="54" fill="#fffbe6"/>' +
          cloud(200, 300, 1.9, 120, "rgba(255,255,255,0.98)", 20) +
          cloud(680, 220, 1.5, 150, "rgba(255,255,255,0.95)", 70) +
          cloud(980, 340, 1.7, 100, "rgba(255,255,255,0.96)", 45) +
          cloud(430, 120, 1.0, 130, "rgba(255,255,255,0.9)", 10) +
          '<path d="M0,560 Q300,520 600,560 T1200,560 V800 H0 Z" fill="url(#cSea)"/>' +
          '<g opacity="0.5" fill="#fff">' +
          '<path d="M120,640 q30,-14 60,0 t60,0" stroke="#fff" stroke-width="3" fill="none"/>' +
          '<path d="M760,700 q30,-14 60,0 t60,0" stroke="#fff" stroke-width="3" fill="none"/>' +
          '<path d="M420,720 q30,-14 60,0 t60,0" stroke="#fff" stroke-width="3" fill="none"/>' +
          "</g>";
        return frame(defs, body);
      },
    },
    {
      id: "forest",
      name: "Forest",
      mood: "light",
      svg: function () {
        var defs =
          '<linearGradient id="fSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdeccf"/><stop offset="1" stop-color="#eef7e6"/></linearGradient>' +
          '<linearGradient id="fMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#f4fbef" stop-opacity="0.9"/></linearGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#fSky)"/>' +
          '<circle class="scene-sun" cx="380" cy="120" r="60" fill="#ffffff" opacity="0.75"/>' +
          '<g opacity="0.9">' +
          pine(120, 560, 1.3, "#4f8f57", "#3f7a48") +
          pine(300, 600, 1.6, "#478450", "#376f41") +
          pine(520, 560, 1.2, "#4f8f57", "#3f7a48") +
          pine(700, 610, 1.7, "#3f7a48", "#2f6339") +
          pine(920, 570, 1.4, "#478450", "#376f41") +
          pine(1090, 600, 1.5, "#3f7a48", "#2f6339") +
          "</g>" +
          '<rect x="0" y="500" width="1200" height="300" fill="url(#fMist)"/>' +
          '<g opacity="0.55">' +
          cloud(300, 470, 1.6, 150, "rgba(255,255,255,0.7)", 20) +
          cloud(820, 500, 1.4, 170, "rgba(255,255,255,0.65)", 80) +
          "</g>";
        return frame(defs, body);
      },
    },
    {
      id: "dusk",
      name: "Twilight",
      mood: "dark",
      svg: function () {
        var defs =
          '<linearGradient id="dSky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#2c2a5e"/><stop offset="0.5" stop-color="#5b4a86"/>' +
          '<stop offset="0.8" stop-color="#c07aa0"/><stop offset="1" stop-color="#efa98f"/></linearGradient>' +
          '<radialGradient id="dMoon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff8e6"/><stop offset="1" stop-color="#fff8e6" stop-opacity="0"/></radialGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#dSky)"/>' +
          stars(70, 1200, 800, 360) +
          '<circle cx="880" cy="200" r="130" fill="url(#dMoon)"/>' +
          '<circle class="scene-sun" cx="880" cy="200" r="62" fill="#fdf3d0"/>' +
          cloud(300, 250, 1.3, 150, "rgba(120,96,150,0.55)", 20) +
          cloud(760, 300, 1.1, 170, "rgba(150,110,140,0.5)", 70) +
          '<path d="M0,560 Q300,510 620,560 T1200,550 V800 H0 Z" fill="#3a2f5c"/>' +
          '<path d="M0,640 Q360,590 760,640 T1200,630 V800 H0 Z" fill="#2a2246"/>' +
          pine(200, 660, 0.8, "#211b39", "#181430") +
          pine(1000, 670, 0.95, "#211b39", "#181430") +
          fireflies(14, 1200, 800);
        return frame(defs, body);
      },
    },
    {
      id: "night",
      name: "Starry night",
      mood: "dark",
      svg: function () {
        var defs =
          '<linearGradient id="nSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1030"/><stop offset="0.6" stop-color="#1b2455"/><stop offset="1" stop-color="#2c3a63"/></linearGradient>' +
          '<radialGradient id="nMoon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#eaf1ff"/><stop offset="1" stop-color="#eaf1ff" stop-opacity="0"/></radialGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#nSky)"/>' +
          stars(150, 1200, 800, 520) +
          '<circle cx="260" cy="180" r="120" fill="url(#nMoon)"/>' +
          '<circle class="scene-sun" cx="260" cy="180" r="58" fill="#f4f7ff"/>' +
          '<circle cx="248" cy="168" r="58" fill="#e2e8fb" opacity="0.5"/>' +
          '<path d="M0,600 Q300,540 620,590 T1200,580 V800 H0 Z" fill="#14203f"/>' +
          '<path d="M0,680 Q360,620 760,680 T1200,660 V800 H0 Z" fill="#0d1730"/>' +
          pine(160, 700, 0.85, "#0a1226", "#070d1c") +
          pine(940, 710, 1.0, "#0a1226", "#070d1c") +
          fireflies(10, 1200, 800);
        return frame(defs, body);
      },
    },
  ];

  window.NariScenes = SCENES;
})();
