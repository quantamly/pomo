/* ============================================================
   prompts.js — the words (and little surprises) under the clock.

   HOW TO KEEP THESE FRESH (the efficient way):
   • To add lines, just append to CURATED.focus / CURATED.rest below —
     nothing else to touch. Keep them short and one line.
   • A no-repeat "shuffle bag" shows every line once before any repeat,
     so the message always changes (never twice in a row).
   • Templates × the TREATS word bank generate near-infinite extra lines
     for free — combinatorial variety without hand-writing each one.
   • OBJECTS are the emoji that occasionally pop up for a hit of surprise.
   ============================================================ */

(function () {
  "use strict";

  var CURATED = {
    focus: [
      // calm
      "Settle in.", "One gentle block.", "You've got this.", "Ease into the work.",
      "Small steps count.", "Just this one thing.", "Begin softly.", "Follow the thread.",
      "Stay with it.", "One breath, then start.", "Quiet mind, steady hands.", "Let the rest wait.",
      "Curiosity over pressure.", "Progress, not perfection.",
      // witty
      "Plot twist: you actually do the thing.",
      "Future-you is watching. Impress them.",
      "The tabs can wait. All 47 of them.",
      "Do it badly, then do it better.",
      "Your phone will survive without you.",
      "One task enters. One task leaves.",
      "Procrastination is not a personality.",
      "Be the deadline you wish to see.",
      "Deep work, shallow snacks.",
      "Make Past-you's to-do list nervous.",
      "Focus now, flex later.",
      "The muse respects a start button.",
      "Channel your inner very-online monk.",
      "Less doomscroll, more do-scroll.",
      "Pretend the wifi is watching.",
      "Great things start slightly annoyed.",
      "You vs. the task. You win.",
      "Momentum is just showing up, twice.",
      "Bribe yourself with a future snack.",
      "This block sponsored by sheer willpower.",
      "Turn 'ugh' into 'huh, done.'",
      "Small brain, big focus. Let's go.",
      "The notifications are not your friends.",
      "Aim for done, not divine.",
      "Your attention, please — literally.",
      "Silence the goblin of distraction.",
      "Type like nobody's judging (they're not).",
      "Progress bar: you, moving forward.",
      "Be suspiciously productive.",
      "Ready, set, minimal chaos.",
      "The couch will still be there. Promise.",
      "Outwork your excuses, gently.",
      "Enter beast mode, calmly.",
      "Do the boring bit first. Trap sprung.",
      "One brick. Then the wall builds itself.",
      "Your ideas want out. Let them.",
      "Concentrate like it's a competitive sport.",
      "The task fears your focus.",
      "Fewer tabs, fewer tears.",
      "Be the calm in your own to-do storm.",
      "Start ugly, finish proud.",
      "Trust the boring magic of just starting.",
      "Give this block your least distracted self.",
      "Make it happen, then make tea.",
      "Focus: it's basically a superpower.",
      "The scroll can wait. Greatness can't.",
      "Do the thing, ignore the ping.",
      "Quietly become unstoppable.",
      "Attention is a gift. Regift it here.",
      "You've got one job. Adore it briefly.",
    ],
    rest: [
      // calm
      "Breathe.", "Let it drift.", "Rest well.", "Unclench your shoulders.",
      "Look out a window.", "Stretch, softly.", "Sip some water.", "Rest your eyes.",
      "Let your mind wander.", "Roll your neck slowly.", "Stand and sway a little.", "Nothing to do now.",
      "Soften your jaw.", "You earned this pause.",
      // witty
      "Go stare at something that isn't a screen.",
      "Hydrate like a houseplant with ambitions.",
      "Do absolutely nothing, expertly.",
      "Blink. Yes, on purpose.",
      "Touch grass. Or at least a plant.",
      "Your eyes filed a complaint. Rest them.",
      "Be gloriously unproductive for a bit.",
      "Stretch like a cat who owns the place.",
      "Snack responsibly. Or don't. Live.",
      "Look out the window like a music video.",
      "Let your brain buffer.",
      "Wander off. Come back wiser.",
      "Stand up. Yes, all the way up.",
      "Rest is productive. Science-ish says so.",
      "Refill your cup. And the mug too.",
      "Give your shoulders a vacation.",
      "Nap-adjacent activities encouraged.",
      "Do a lap around the kitchen.",
      "Breathe like you mean it.",
      "Close your eyes and pretend it's a spa.",
      "Aggressively relax.",
      "Reward: doing nothing, guilt-free.",
      "Let the to-do list gather dust.",
      "Stare into the middle distance, dramatically.",
      "Yawn without shame.",
      "Pet something soft, real or imagined.",
      "Unclench everything. Yes, that too.",
      "Go be a person, not a productivity unit.",
      "Daydream: officially on the clock.",
      "Wiggle. It counts as movement.",
      "Water: the original energy drink.",
      "Rest now, brag about it later.",
      "Let the silence do the talking.",
      "Recharge like the phone you keep ignoring.",
      "Take five, keep four for later.",
      "Be a cloud for a minute.",
      "Stretch toward the ceiling, greet it.",
      "Sip something warm and smug.",
      "Give the future a rested you.",
      "Look 20 feet away. Your eyes: relieved.",
      "Do the least. Master it.",
      "Permission to flop granted.",
      "Marinate in a little peace.",
      "Your brain deserves a snack too.",
      "Slow down; the work will keep.",
      "Idle hands, happy mind.",
      "Roll your neck like you're unbothered.",
      "A tiny walk fixes surprising things.",
      "Rest is not a plot hole. It's the story.",
      "Come back when you're a little softer.",
    ],
  };

  // small reward nouns, grammatical after "then / enjoy / for / and"
  var TREATS = [
    "tea", "a cupcake", "a little walk", "a good stretch", "a flower for your desk",
    "a biscuit", "some sunshine", "your favourite song", "a cup of coffee",
    "a square of chocolate", "a deep breath", "a quick doodle", "a cat cuddle",
    "a glass of water", "a fresh playlist", "five lazy minutes", "a snack you like",
    "a tiny dance break", "a warm drink", "a good stretch by the window",
  ];

  var TEMPLATES = {
    focus: [
      function (t) { return "Finish this block, then " + t + "."; },
      function (t) { return "One block between you and " + t + "."; },
      function (t) { return "Do the thing. Reward: " + t + "."; },
      function (t) { return "Focus now, " + t + " later."; },
      function (t) { return "Earn " + t + " — one block at a time."; },
    ],
    rest: [
      function (t) { return "Go enjoy " + t + "."; },
      function (t) { return "You've earned " + t + "."; },
      function (t) { return "Time for " + t + "."; },
      function (t) { return "Treat yourself to " + t + "."; },
      function (t) { return "How about " + t + "?"; },
    ],
  };

  // the little things that pop up for a hit of surprise
  var OBJECTS = [
    "🍵", "🧁", "🌸", "🍰", "🍡", "🍄", "🌷", "🫖", "🍓", "⭐",
    "🪴", "🐌", "🍋", "🐝", "🎈", "🍪", "🐈", "🍯", "🌈", "🍊",
    "🧋", "🍒", "🌻", "🪷", "🦋", "🍩", "🌿", "🕊️", "🍇", "🐞",
  ];

  function rand(a) { return a[Math.floor(Math.random() * a.length)]; }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // no-repeat "shuffle bag": draw the whole pool before any repeat
  var bags = {};
  function fromBag(kind) {
    if (!bags[kind] || !bags[kind].length) bags[kind] = shuffle(CURATED[kind]);
    return bags[kind].pop();
  }

  function generate(kind) {
    return rand(TEMPLATES[kind])(rand(TREATS));
  }

  window.NariPrompts = {
    // ~30% freshly generated, ~70% curated (no-repeat) — always changing
    next: function (kind) {
      if (!CURATED[kind]) kind = "focus";
      return Math.random() < 0.3 ? generate(kind) : fromBag(kind);
    },
    randomObject: function () { return rand(OBJECTS); },
    _curated: CURATED, // exposed for tests / counts
  };
})();
