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

  function rainStreaks(count) {
    var out = "", seed = 13;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < count; i++) {
      var x = rnd() * 1200;
      var dur = (0.55 + rnd() * 0.5).toFixed(2);
      var delay = (rnd() * 1.1).toFixed(2);
      out += '<line class="rain-drop" x1="' + x.toFixed(0) + '" y1="-30" x2="' + (x - 9).toFixed(0) +
        '" y2="8" style="animation-duration:' + dur + 's;animation-delay:-' + delay + 's"/>';
    }
    return out;
  }

  function fallingLeaves(count) {
    var out = "", seed = 91;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var cols = ["#e8952f", "#d86b2c", "#e6b93f", "#c0501f", "#d98a3a"];
    for (var i = 0; i < count; i++) {
      var x = rnd() * 1200;
      var dur = (6 + rnd() * 6).toFixed(1);
      var delay = (rnd() * dur).toFixed(1);
      var s = (0.7 + rnd() * 0.7).toFixed(2);
      var c = cols[i % cols.length];
      out += '<g transform="translate(' + x.toFixed(0) + ',0)">' +
        '<g class="leaf" style="animation-duration:' + dur + 's;animation-delay:-' + delay + 's">' +
        '<path transform="scale(' + s + ')" d="M0,-6 C6,-6 8,0 0,9 C-8,0 -6,-6 0,-6 Z" fill="' + c + '"/>' +
        "</g></g>";
    }
    return out;
  }

  // a big monstera-ish frond that rests still, then sways once in a while
  function frond(x, y, s, angle, c1, c2, delay) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + angle + ') scale(' + s + ')">' +
      '<g class="sway-leaf" style="animation-delay:-' + delay + 's">' +
      '<path d="M6,0 C-30,-60 -20,-150 6,-212 C34,-150 42,-60 6,0 Z" fill="' + c2 + '"/>' +
      '<path d="M6,-6 C-12,-60 -8,-142 6,-196 C22,-142 26,-60 6,-6 Z" fill="' + c1 + '"/>' +
      '<line x1="6" y1="-2" x2="6" y2="-198" stroke="' + c2 + '" stroke-width="2"/>' +
      '<path d="M6,-46 l-18,-12 M6,-92 l-20,-10 M6,-134 l-18,-9 M6,-46 l18,-12 M6,-92 l20,-10 M6,-134 l18,-9" ' +
      'stroke="' + c2 + '" stroke-width="6" stroke-linecap="round" opacity="0.55"/>' +
      "</g></g>";
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
    {
      id: "rain",
      name: "Rain",
      mood: "light",
      svg: function () {
        var defs =
          '<linearGradient id="rSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a9bb0"/><stop offset="0.6" stop-color="#aeb9c4"/><stop offset="1" stop-color="#cdd4d8"/></linearGradient>' +
          '<linearGradient id="rHillA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f9a83"/><stop offset="1" stop-color="#6a8670"/></linearGradient>' +
          '<linearGradient id="rHillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f7d68"/><stop offset="1" stop-color="#4e6b58"/></linearGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#rSky)"/>' +
          cloud(300, 150, 1.5, 90, "rgba(120,132,146,0.85)", 10) +
          cloud(760, 110, 1.7, 110, "rgba(108,120,134,0.82)", 50) +
          cloud(1010, 200, 1.2, 80, "rgba(130,142,156,0.8)", 30) +
          '<path d="M0,560 Q300,500 620,560 T1200,540 V800 H0 Z" fill="url(#rHillA)"/>' +
          '<path d="M0,660 Q360,600 760,660 T1200,640 V800 H0 Z" fill="url(#rHillB)"/>' +
          roundTree(940, 620, 0.9, { trunk: "#5c6b52", leafDark: "#3f5a3a", leaf: "#537a4a", leafLight: "#6a9060" }) +
          '<g>' + rainStreaks(60) + "</g>";
        return frame(defs, body);
      },
    },
    {
      id: "autumn",
      name: "Autumn",
      mood: "light",
      svg: function () {
        var defs =
          '<linearGradient id="aSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c98a"/><stop offset="0.55" stop-color="#f4b56f"/><stop offset="1" stop-color="#eecb96"/></linearGradient>' +
          '<radialGradient id="aGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff2cf"/><stop offset="1" stop-color="#fff2cf" stop-opacity="0"/></radialGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#aSky)"/>' +
          '<circle cx="900" cy="200" r="230" fill="url(#aGlow)"/>' +
          '<circle class="scene-sun" cx="900" cy="200" r="70" fill="#fff0c4"/>' +
          cloud(280, 150, 1.0, 110, "rgba(255,225,190,0.7)", 20) +
          '<path d="M0,580 Q300,520 620,580 T1200,560 V800 H0 Z" fill="#c98a4a"/>' +
          '<path d="M0,660 Q360,610 760,660 T1200,650 V800 H0 Z" fill="#a86a34"/>' +
          roundTree(200, 640, 1.1, { trunk: "#7a4a2a", leafDark: "#b85a1e", leaf: "#e0872b", leafLight: "#f0b53f" }) +
          roundTree(1000, 650, 1.2, { trunk: "#7a4a2a", leafDark: "#a84a1e", leaf: "#d8702b", leafLight: "#eaa53f" }) +
          '<path d="M0,730 Q400,680 820,730 T1200,715 V800 H0 Z" fill="#8a5628"/>' +
          "<g>" + fallingLeaves(16) + "</g>";
        return frame(defs, body);
      },
    },
    {
      id: "tropical",
      name: "Tropical garden",
      mood: "light",
      svg: function () {
        var defs =
          '<linearGradient id="tSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd6e0"/><stop offset="0.6" stop-color="#bfeede"/><stop offset="1" stop-color="#e7f7d9"/></linearGradient>' +
          '<linearGradient id="tHillA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f9e5a"/><stop offset="1" stop-color="#3d8a49"/></linearGradient>' +
          '<linearGradient id="tHillB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a7f47"/><stop offset="1" stop-color="#2c6a39"/></linearGradient>';
        var body =
          '<rect width="1200" height="800" fill="url(#tSky)"/>' +
          '<circle class="scene-sun" cx="960" cy="150" r="60" fill="#fff6d0"/>' +
          cloud(300, 140, 1.1, 120, "rgba(255,255,255,0.82)", 20) +
          '<path d="M0,560 Q300,500 620,560 T1200,540 V800 H0 Z" fill="url(#tHillA)"/>' +
          '<path d="M0,660 Q360,600 760,660 T1200,650 V800 H0 Z" fill="url(#tHillB)"/>' +
          frond(70, 800, 1.5, 16, "#3f9a50", "#2f7d3f", 0) +
          frond(1140, 800, 1.6, -20, "#3a8f49", "#2a713a", 3) +
          frond(30, 810, 1.1, 40, "#49a457", "#357f45", 6) +
          frond(1175, 815, 1.2, -44, "#409a52", "#2f7a40", 1.5) +
          '<circle cx="250" cy="700" r="11" fill="#ef7d9d"/><circle cx="250" cy="700" r="4" fill="#ffd94f"/>' +
          '<circle cx="980" cy="720" r="11" fill="#f2a24a"/><circle cx="980" cy="720" r="4" fill="#ffe27a"/>';
        return frame(defs, body);
      },
    },
  ];

  window.NariScenes = SCENES;
})();
