/* ============================================================
   BUGFISH — home.js
   Home page: hero, matrix rain, escape.exe horror minigame,
   music player, featured showcase, about and uptime counters,
   plus the top status HUD (live day-counters + wall clock).
   Content comes from data/home.json and data/featured.json.
   ============================================================ */

/* ============================================================
   MATRIX RAIN
   ============================================================ */
function initMatrix() {
  const canvas = document.getElementById("matrix-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const chars = "01ABCDEFabcdef!@#$%^&*<>/\\[]{}|=+-~`ΩΨΦΣΞΔΛΘαβγδεζηθι".split("");
  const fSize = 14;
  let cols, drops;

  function resize() {
    canvas.width = canvas.offsetWidth || canvas.parentElement.offsetWidth;
    canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight;
    cols = Math.floor(canvas.width / fSize);
    drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -50));
  }

  function draw() {
    ctx.fillStyle = "rgba(18,19,22,0.06)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < cols; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const bright = Math.random() > 0.92;
      ctx.fillStyle = bright ? "#ff8c00" : "#8a4a1a";
      ctx.globalAlpha = Math.random() * 0.5 + 0.1;
      ctx.font = `${fSize}px monospace`;
      ctx.fillText(ch, i * fSize, drops[i] * fSize);
      ctx.globalAlpha = 1;
      if (drops[i] * fSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  resize();
  window.addEventListener("resize", resize);
  setInterval(draw, 48);
}

/* ============================================================
   ESCAPE.EXE — single-room horror escape
   ------------------------------------------------------------
   You wake locked in a basement. A unit is rolling; they breach
   after MAX_MOVES moves. The wall clock is REAL and always shown.
   There are TWO real ways out — most everything else lies, jokes,
   or kills you.

   Escape A (trapdoor tunnel):
     move rug → open drawer → take screwdriver → unscrew trapdoor
     → turn on radio (year 1987) / read mirror → move poster
     → open safe 1987 → take flashlight → turn on flashlight
     → open trapdoor → enter trapdoor
   Escape B (coal chute):
     move tarp → take crowbar → examine boards → pry boards
     → climb chute
   Surrender ending, plus many creative deaths in between.
   ============================================================ */
const GAME = {
  MAX_MOVES: 60,
  state: null,

  reset() {
    this.state = {
      moves: this.MAX_MOVES,
      over: false,
      won: false,
      status: "alive",                 // alive | won | cuffed
      attempt: (this.state ? this.state.attempt : 0) + 1,
      /* escape A */
      rugMoved: false,
      trapdoorUnscrewed: false,
      trapdoorOpen: false,
      posterMoved: false,
      safeOpen: false,
      wrongCodes: 0,
      drawerOpen: false,
      radioHeard: false,
      keyBroken: false,
      flashlightOn: false,
      /* escape B */
      tarpMoved: false,
      boardsFound: false,
      boardsPried: false,
      /* items / props */
      boxFound: false,
      boxOpen: false,
      maskOn: false,
      bulbDead: false,
      pipeBroken: false,
      inventory: [],
    };
  },

  intro() {
    const s = this.state;
    return [
      { t: `ATTEMPT #${s.attempt} — ESCAPE.EXE`, c: "head" },
      { t: "─────────────────────────────────────────", c: "sys" },
      { t: "You wake face-down on cold concrete. Blood in your mouth." },
      { t: "You don't remember the last hour. You remember the sirens." },
      { t: "" },
      { t: "One dying bulb. The air stinks of gas, mold, and something dead." },
      { t: "A voice rasps through the steel door, lips against the metal:" },
      { t: '"They\'re coming for you. A unit is already rolling.', c: "head" },
      { t: `  ${this.MAX_MOVES} moves before they breach this room.`, c: "head" },
      { t: '  There is a way out. More than one. Most of them lie."', c: "head" },
      { t: "The slot slides shut. Footsteps climb away into the dark." },
      { t: "─────────────────────────────────────────", c: "sys" },
      { t: "Every action burns time. Noise burns more. The clock is real.", c: "sys" },
      { t: "Type 'help' for commands. Type 'time' to check the clock.", c: "sys" },
      { t: "" },
    ];
  },

  help() {
    return [
      { t: "─── COMMANDS (free) ─────────────────────", c: "sys" },
      { t: "  look / l              scan the room" },
      { t: "  examine [thing] / x   inspect closer" },
      { t: "  search [thing]        rummage / dig" },
      { t: "  open / close [thing]  doors, drawers..." },
      { t: "  take [thing]          pick something up" },
      { t: "  move / pry [thing]    shove or force things" },
      { t: "  use [thing]           use a held item" },
      { t: "  turn on/off [thing]   power things" },
      { t: "  unscrew [thing]       you'll need a tool" },
      { t: "  enter / climb [thing] squeeze into places" },
      { t: "  open safe [code]      if you find a safe..." },
      { t: "  surrender             give yourself up" },
      { t: "  inventory / i         check pockets (free)" },
      { t: "  time                  check the clock (free)" },
      { t: "  restart               give up, start over" },
      { t: "─────────────────────────────────────────", c: "sys" },
      { t: "TWO ways out of this room exist. Find one. Live.", c: "sys" },
    ];
  },

  /* ---- helpers -------------------------------------------- */
  has(item) { return this.state.inventory.includes(item); },

  _warn(m) {
    if (m === 50) return "Upstairs a radio crackles: 'unit en route, stand by.'";
    if (m === 40) return "Distant sirens. They're real.";
    if (m === 30) return "The sirens are close now. Too close.";
    if (m === 20) return "Tires screech on the street above.";
    if (m === 10) return "Car doors slam. Voices. Boots on gravel.";
    if (m === 5)  return "Heavy boots come down the stairs. Slowly.";
    if (m === 3)  return "Fists hammer the steel: 'OPEN UP! NOW!'";
    if (m === 1)  return "The handle rattles. A shoulder slams the door.";
    return null;
  },

  /* Apply time cost, append counter + threshold warnings.
     Returns true if the timer ran out (breach death). */
  _tick(out, cost) {
    const s = this.state;
    const before = s.moves;
    s.moves = Math.max(0, s.moves - cost);
    for (let m = before - 1; m >= s.moves; m--) {
      const w = this._warn(m);
      if (w) out.push({ t: w, c: "err" });
    }
    if (s.moves <= 0) {
      out.push({ t: "", c: "" });
      out.push({ t: "The door explodes inward. Flashbang. White. Ringing.", c: "err" });
      out.push({ t: "Rough hands. Cold cuffs. Concrete against your cheek.", c: "err" });
      if (s.maskOn) out.push({ t: "(Arrested wearing a clown mask. The mugshot is legendary.)", c: "sys" });
      this._restart(out);
      return true;
    }
    out.push({ t: `[BREACH IN: ${s.moves} MOVES]`, c: "sys" });
    return false;
  },

  _die(out, lines) {
    lines.forEach(l => out.push({ t: l, c: "err" }));
    this._restart(out);
  },

  _restart(out) {
    out.push({ t: "", c: "" });
    out.push({ t: "░░░░░░░░░░ YOU ARE DEAD ░░░░░░░░░░", c: "err" });
    out.push({ t: "", c: "" });
    this.reset();
    this.intro().forEach(l => out.push(l));
  },

  _cuff(out) {
    const s = this.state;
    s.over = true;
    s.won = false;
    s.status = "cuffed";
    out.push({ t: "" });
    out.push({ t: "You put your hands where they can see them and wait." });
    out.push({ t: "The door caves in. Lights. Screaming. A knee on your neck.", c: "err" });
    out.push({ t: "The cuffs bite. You're alive. For now. That has to count.", c: "err" });
    out.push({ t: "" });
    out.push({ t: "╔═══════════════════════════════════╗", c: "head" });
    out.push({ t: "║   TAKEN ALIVE — YOU DIDN'T RUN    ║", c: "head" });
    out.push({ t: "╚═══════════════════════════════════╝", c: "head" });
    out.push({ t: "Type 'restart' to try the way that isn't a door.", c: "sys" });
  },

  _win(out, route) {
    const s = this.state;
    s.over = true;
    s.won = true;
    s.status = "won";
    out.push({ t: "" });
    if (route === "chute") {
      out.push({ t: "You haul yourself up the coal chute, filth in your teeth." });
      out.push({ t: "Metal groans, then gives — and night air hits you. Cold. Free." });
      out.push({ t: "You surface in the alley. A cruiser idles at the curb, empty." });
      out.push({ t: "You don't run. Running is what the guilty do. You walk." });
    } else {
      out.push({ t: "You click the flashlight on and lower into the tunnel." });
      out.push({ t: "Behind you, red and blue light floods the room you just left." });
      out.push({ t: "The tunnel breathes cold air. You crawl. You don't look back." });
    }
    out.push({ t: "" });
    out.push({ t: "╔═══════════════════════════════════╗", c: "head" });
    out.push({ t: `║   YOU ESCAPED — ${String(s.moves).padStart(2, "0")} MOVES TO SPARE   ║`, c: "head" });
    out.push({ t: "╚═══════════════════════════════════╝", c: "head" });
    out.push({ t: `route: ${route === "chute" ? "coal chute" : "trapdoor tunnel"}`, c: "sys" });
    out.push({ t: "Type 'restart' to run it again — the other way out.", c: "sys" });
  },

  /* ---- main dispatcher ------------------------------------- */
  process(input) {
    const raw = input.trim();
    const lower = raw.toLowerCase().replace(/\s+/g, " ");
    if (!lower) return [];
    const out = [];
    const s = this.state;

    /* free commands, always available */
    if (lower === "help") return this.help();
    if (lower === "clear") return [{ _clear: true }];
    if (lower === "restart" || lower === "reset") {
      this.reset();
      return [{ t: "// rebooting simulation...", c: "sys" }, ...this.intro()];
    }
    if (["i", "inv", "inventory", "bag", "pockets"].includes(lower)) {
      if (!s.inventory.length) return [{ t: "Your pockets are empty. Like your alibi." }];
      return [{ t: "CARRYING:" }, ...s.inventory.map(k => ({ t: `  ▸ ${this._itemName(k)}` }))];
    }
    if (["time", "clock", "watch", "check time", "check watch", "check clock"].includes(lower)) {
      const n = new Date();
      const pd = x => String(x).padStart(2, "0");
      return [
        { t: `WALL CLOCK ${pd(n.getHours())}:${pd(n.getMinutes())}:${pd(n.getSeconds())}`, c: "head" },
        { t: `BREACH IN ${s.moves} moves.`, c: "sys" },
        { t: "The clock doesn't care whether you're ready.", c: "sys" },
      ];
    }
    if (lower === "surrender" || lower === "give up" || lower === "hands up" || lower === "give in") {
      if (s.over) return [{ t: s.won ? "You're already out." : "It's over. Type 'restart'.", c: "sys" }];
      const o = [];
      this._cuff(o);
      return o;
    }
    if (lower === "sudo" || lower.startsWith("sudo ")) {
      return [{ t: "Permission denied. Reality does not accept sudo.", c: "sys" }];
    }
    if (lower === "ls") return [{ t: "Hint: this isn't a shell. Try 'look'.", c: "sys" }];
    if (lower === "pwd") return [{ t: "/basement/room_you_should_leave", c: "sys" }];

    if (s.over) {
      return [{ t: s.won ? "You're already out. Type 'restart' to run it again."
                         : "It's over. Type 'restart'.", c: "sys" }];
    }

    /* costed actions */
    const result = this._action(lower, out);
    if (result === null) {
      out.push({ t: `You fumble ('${raw}' does nothing). Try 'help'.`, c: "sys" });
      return out; // unknown input costs nothing
    }
    if (s.over) return out;                 // won / surrendered inside the action
    if (result === 0) return out;           // death restarted the run, or free-cost handling — don't tick
    if (this._tick(out, result)) return out; // timer may kill
    return out;
  },

  _itemName(k) {
    return { screwdriver: "SCREWDRIVER", note: "CRUMPLED NOTE", flashlight: "FLASHLIGHT",
             key: "RUSTY KEY", mask: "CLOWN MASK", crowbar: "CROWBAR", matches: "MATCHBOOK" }[k] || k.toUpperCase();
  },

  /* Executes one action. Returns the time cost (number) or null
     if the input wasn't understood. May set s.over via win/die. */
  _action(cmd, out) {
    const s = this.state;
    const p = (t, c = "") => out.push({ t, c });
    const w = cmd.split(" ");
    const verb = w[0];
    let rest = w.slice(1).join(" ").replace(/^(the|a|an|at|on|in|into|to|up|down|with)\s+/g, "");

    const is = (...names) => names.some(n => rest.includes(n));
    const V = (...names) => names.includes(verb);

    /* ---- look ---- */
    if (V("look", "l", "scan") && (!rest || is("room", "around"))) {
      p("╔═ THE ROOM ═════════════════════════╗", "head");
      p("Concrete walls, sweating damp. A bare BULB gutters overhead.");
      p("A steel DOOR, bolted from OUTSIDE. A WINDOW that looks wrong.");
      p("A filthy BED. A wooden DESK. A dead RADIO. A cracked MIRROR.");
      p("A cat POSTER. A moldy RUG. A rusted PIPE hissing faint gas.");
      p("A VENT near the ceiling. Bare WIRES humming by the door.");
      p("A stiff TARP heaped in the corner. BOARDS nailed to the far wall.");
      p("A rusted BUCKET. A tipped plastic BOTTLE against the skirting.");
      p("╚════════════════════════════════════╝", "head");
      return 1;
    }
    if (V("look") && is("under bed")) rest = "under bed", cmd = "examine under bed";

    /* ---- door (careful: "trapdoor" contains "door") ---- */
    if (is("door") && !is("trapdoor", "trap door", "hatch")) {
      if (V("examine", "x", "inspect", "check")) {
        p("Reinforced steel. Deadbolt on the OUTSIDE. Deep gouges near the");
        p("floor — someone before you clawed at it, and never got out.");
        p("Bare WIRES run along the frame. They hum.");
        return 1;
      }
      if (V("open", "unlock", "answer")) {
        if (s.moves <= 6) {
          this._die(out, [
            "You throw the door open to meet them head-on.",
            "You never hear the shot. Just white — then cold — then nothing.",
          ]);
          return 0;
        }
        p("Locked from outside. The handle just laughs at you.");
        return 1;
      }
      if (V("kick", "hit", "punch", "break", "smash", "ram", "shoulder")) {
        p("BOOM. The steel doesn't move. The whole street heard that.", "err");
        p("(-3 extra moves: noise travels)", "err");
        return 4;
      }
      if (V("knock")) { p("You knock politely. Somewhere upstairs, a cop laughs."); return 1; }
      if (V("listen")) { p("Humming wires. Your own pulse. Boots, maybe. Nearer."); return 1; }
    }

    /* ---- window ---- */
    if (is("window")) {
      if (V("examine", "x", "inspect", "check")) {
        p("You step closer. Wait. The frame has no depth. The glass");
        p("has no reflection. Someone PAINTED a window on the wall.");
        p("Whoever kept you here has a sense of humor. A cruel one.");
        return 1;
      }
      if (V("open")) { p("You try to open a painting. It goes as well as expected."); return 1; }
      if (V("break", "punch", "hit", "smash", "kick")) {
        p("You punch the wall with confidence. The wall wins.", "err");
        p("Your knuckles split. Worth it? No.");
        return 1;
      }
    }

    /* ---- rug / trapdoor (escape A floor route) ----
       NB: no "mat" synonym — it substring-collides with
       "matches" / "mattress" in the includes() matcher. */
    if (is("rug", "carpet")) {
      if (V("move", "lift", "pull", "push", "shift", "slide", "take", "remove", "flip")) {
        if (s.rugMoved) { p("The rug is already shoved aside, revealing the TRAPDOOR."); return 1; }
        s.rugMoved = true;
        p("You drag the moldy rug aside and freeze.");
        p("A TRAPDOOR. Bolted shut with four rusted screws.", "head");
        return 1;
      }
      if (V("examine", "x", "inspect", "check")) {
        p(s.rugMoved ? "Moldy, rolled up in the corner now."
                     : "Moldy, damp... and oddly bulging in the middle.");
        return 1;
      }
      if (V("smell")) { p("You regret this immediately."); return 1; }
    }
    if (is("trapdoor", "hatch", "trap")) {
      if (!s.rugMoved) { p("What trapdoor? You see a door, a window, furniture..."); return 1; }
      if (V("examine", "x", "inspect", "check")) {
        if (!s.trapdoorUnscrewed) p("Four rusted screws hold it down. You'd need a tool.");
        else if (!s.trapdoorOpen) p("Unscrewed. Ready to be opened.");
        else p("Open. Below: a tunnel, black as a closed browser tab.");
        return 1;
      }
      if (V("unscrew", "unbolt")) {
        if (s.trapdoorUnscrewed) { p("Already done."); return 1; }
        if (!this.has("screwdriver")) { p("With your fingernails? You need a tool."); return 1; }
        s.trapdoorUnscrewed = true;
        p("One... two... three... four. The screws surrender.", "head");
        return 1;
      }
      if (V("open", "lift")) {
        if (!s.trapdoorUnscrewed) { p("It's bolted down tight. Four screws."); return 1; }
        if (s.trapdoorOpen) { p("It's open. The darkness below says hello."); return 1; }
        s.trapdoorOpen = true;
        p("The trapdoor creaks open. A tunnel. Pitch black.", "head");
        p("Cold air rises from it. You can't see the bottom.");
        return 1;
      }
      if (V("enter", "go", "crawl", "climb", "jump", "descend", "use")) return this._enterTunnel(out);
      if (V("kick", "hit", "break", "smash")) { p("You stomp on it. It's sturdier than your plan."); return 1; }
    }
    if (is("tunnel", "hole", "shaft", "darkness") || cmd === "go down" || cmd === "jump in" || cmd === "crawl down") {
      if (V("enter", "go", "crawl", "climb", "jump", "descend")) return this._enterTunnel(out);
      if (V("examine", "x", "look")) {
        if (!s.trapdoorOpen) { p("There's no tunnel. Yet."); return 1; }
        p("Black. Deep. Breathing. Entering blind would be brave. Or final.");
        return 1;
      }
    }

    /* ---- tarp / corpse / crowbar (escape B: discovery) ---- */
    if (is("tarp", "tarpaulin", "sheet", "corner")) {
      if (V("move", "lift", "pull", "remove", "examine", "x", "look", "search", "check")) {
        if (!s.tarpMoved) {
          s.tarpMoved = true;
          p("You drag the stiff tarp off the shape in the corner.");
          p("A CORPSE. Weeks gone. The last guest they kept down here.", "err");
          p("Its gray fingers are locked around a CROWBAR.", "head");
          return 1;
        }
        p("The body stares at the ceiling. The CROWBAR is still in its grip.");
        return 1;
      }
    }
    if (is("corpse", "body", "dead", "remains", "skeleton", "guest")) {
      if (!s.tarpMoved) { p("You don't see a body. Just a lump under a TARP in the corner."); return 1; }
      if (V("examine", "x", "search", "check", "loot")) {
        p("Cold. Rigid. Whatever it knew died with it. It clutches a CROWBAR.");
        return 1;
      }
      if (V("talk", "ask", "pet")) { p("You leave the dead their silence. Take the CROWBAR instead."); return 1; }
      if (V("eat")) { p("No. Absolutely not. Whatever you are, you're not that yet."); return 1; }
    }
    if (is("crowbar", "prybar", "pry bar", "lever")) {
      if (!s.tarpMoved) { p("You haven't found anything like that. Yet."); return 1; }
      if (V("take", "get", "grab", "pick")) {
        if (this.has("crowbar")) { p("Already in your hands. Heavy. Good for prying."); return 1; }
        s.inventory.push("crowbar");
        p("You peel the dead fingers back and take the CROWBAR. Sorry, friend.");
        return 1;
      }
      if (V("use", "pry", "wedge", "force", "swing")) {
        if (!this.has("crowbar")) { p("Take the crowbar first."); return 1; }
        if (s.boardsFound) return this._action("pry boards", out);
        p("You heft it. Pry something with it — the BOARDS on the far wall, maybe.");
        return 1;
      }
      if (V("examine", "x")) { p("A rusted crowbar. Opens a lot of things. Or a skull."); return 1; }
    }

    /* ---- boards / coal chute (escape B: the way UP) ---- */
    if (is("boards", "board", "planks", "plank", "chute")) {
      if (V("examine", "x", "inspect", "check", "look")) {
        s.boardsFound = true;
        if (s.boardsPried) { p("The boards are off. A COAL CHUTE slopes UP into the dark, toward the street."); return 1; }
        p("Thick planks nailed over an opening in the far wall.");
        p("Behind them: a draft, and the smell of the street. A COAL CHUTE —");
        p("a way UP and OUT. You'd have to PRY the planks off. Fingers won't do.");
        return 1;
      }
      if (V("pry", "force", "wedge", "remove", "open", "move", "pull", "rip", "kick", "break")) {
        s.boardsFound = true;
        if (s.boardsPried) { p("Already off. CLIMB the chute."); return 1; }
        if (!this.has("crowbar")) {
          p("You claw at the planks. A nail opens your palm. They don't move.", "err");
          p("You need something to pry with.");
          return 1;
        }
        s.boardsPried = true;
        p("You jam the crowbar behind the planks and heave. CRACK.", "head");
        p("Nails scream out. A black chute yawns open, sloping upward.", "head");
        return 1;
      }
      if (V("enter", "climb", "go", "crawl", "use", "ascend")) return this._climbChute(out);
    }

    /* ---- desk / drawer / note ---- */
    if (is("desk", "table")) {
      if (V("examine", "x", "inspect", "check", "search")) {
        p("A wooden desk, older than you. It has a single DRAWER.");
        return 1;
      }
      if (V("move", "push", "pull")) { p("You shove the desk around. The floor under it is just floor."); return 1; }
    }
    if (is("drawer")) {
      if (V("open", "examine", "x", "check", "search")) {
        if (s.drawerOpen) { p(this.has("screwdriver") ? "Empty now." : "A SCREWDRIVER and a crumpled NOTE."); return 1; }
        s.drawerOpen = true;
        p("The drawer sticks, then gives. Inside:");
        p("a SCREWDRIVER and a crumpled NOTE.", "head");
        return 1;
      }
      if (V("close")) { p("Sure. Tidiness first."); return 1; }
    }
    if (is("note", "paper") && s.drawerOpen) {
      if (V("read", "examine", "x", "take", "check")) {
        if (V("take") && !this.has("note")) { s.inventory.push("note"); p("You pocket the note."); }
        p('Shaky handwriting: "REMEMBER THE YEAR IT ALL BURNED DOWN."', "head");
        return 1;
      }
    }
    if (is("screwdriver", "driver") && s.drawerOpen) {
      if (V("take", "get", "grab", "pick")) {
        if (this.has("screwdriver")) { p("It's already in your pocket."); return 1; }
        s.inventory.push("screwdriver");
        p("Taken. A classic flathead. Trusty.");
        return 1;
      }
      if (V("use")) {
        if (!this.has("screwdriver")) { p("Take it first."); return 1; }
        if (s.rugMoved && !s.trapdoorUnscrewed) { return this._action("unscrew trapdoor", out); }
        p("Point it at what? Try 'unscrew [thing]'.");
        return 1;
      }
      if (V("stab", "jam", "insert", "stick")) {
        p("You wave a screwdriver around like a knife. The room is unimpressed.");
        return 1;
      }
    }

    /* ---- poster / safe ---- */
    if (is("poster", "cat")) {
      if (V("examine", "x", "inspect", "check")) {
        if (s.posterMoved) { p("The poster lies on the floor. The SAFE stares at you."); return 1; }
        p('A cat dangles from a branch: "HANG IN THERE!"');
        p("It hangs suspiciously flat against the wall. Almost... too flat.");
        return 1;
      }
      if (V("move", "lift", "pull", "take", "remove", "rip", "tear", "flip")) {
        if (s.posterMoved) { p("Already down."); return 1; }
        s.posterMoved = true;
        p("You tear the cat down. Sorry, cat.");
        p("Behind it: a small STEEL SAFE with a 4-digit dial.", "head");
        return 1;
      }
    }
    if (is("safe", "vault")) {
      if (!s.posterMoved) { p("You don't remember seeing a safe. The walls are bare... mostly."); return 1; }
      const code = cmd.match(/(\d{4})/);
      if (code) {
        if (s.safeOpen) { p("It's already open."); return 1; }
        if (code[1] === "1987") {
          s.safeOpen = true;
          p("CLUNK. The safe swings open.", "head");
          p("Inside: a FLASHLIGHT and a RUSTY KEY.", "head");
          return 1;
        }
        s.wrongCodes++;
        if (s.wrongCodes >= 3) {
          p("BEEP BEEP BEEP — the safe screams like a car alarm.", "err");
          p("(-5 extra moves. The whole neighborhood heard it.)", "err");
          s.wrongCodes = 0;
          return 6;
        }
        p(`"${code[1]}" — the dial spits it back out. Wrong.`);
        return 1;
      }
      if (V("open", "unlock", "crack", "use")) { p("It wants 4 digits: 'open safe 0000'."); return 1; }
      if (V("examine", "x", "inspect", "check")) {
        p(s.safeOpen ? (this.has("flashlight") ? "Open and empty." : "Open. FLASHLIGHT and RUSTY KEY inside.")
                     : "Cold steel, 4-digit dial. It's older than it looks.");
        return 1;
      }
      if (V("hit", "kick", "break", "punch", "smash")) { p("You attack a safe with your body. The safe remains unmoved. Literally."); return 1; }
    }

    /* ---- flashlight / key ---- */
    if (is("flashlight", "torch") && s.safeOpen) {
      if (V("take", "get", "grab", "pick")) {
        if (this.has("flashlight")) { p("Already got it."); return 1; }
        s.inventory.push("flashlight");
        p("Taken. Heavy. Reassuring.");
        return 1;
      }
      if (V("use", "turn", "switch") || cmd === "turn on flashlight") {
        if (!this.has("flashlight")) { p("Take it first."); return 1; }
        if (cmd.includes("off")) { s.flashlightOn = false; p("Click. The darkness leans in closer."); return 1; }
        s.flashlightOn = true;
        p("Click. A strong white beam. Now we're talking.", "head");
        return 1;
      }
    }
    if (is("key") && s.safeOpen) {
      if (V("take", "get", "grab", "pick")) {
        if (s.keyBroken) { p("The key is dead. You killed it."); return 1; }
        if (this.has("key")) { p("It's in your pocket, rusting quietly."); return 1; }
        s.inventory.push("key");
        p("Taken. A rusty key. For the door...? Surely!");
        return 1;
      }
      if (V("use", "put", "insert", "try")) {
        if (!this.has("key")) { p("Take it first."); return 1; }
        if (s.keyBroken) { p("What's left of it is decoration now."); return 1; }
        s.keyBroken = true;
        s.inventory = s.inventory.filter(k => k !== "key");
        p("You jam the key toward the door... there's NO KEYHOLE on");
        p("this side. You try a gap in the frame anyway. SNAP.", "err");
        p("The key breaks. It was probably for a diary.", "sys");
        return 1;
      }
      if (V("examine", "x")) { p("Rusty, small, hopeful-looking. Suspiciously hopeful."); return 1; }
    }

    /* ---- radio ---- */
    if (is("radio")) {
      if (V("turn", "switch", "use", "play", "listen") || cmd === "turn on radio") {
        if (cmd.includes("off")) { p("Click. Silence. Heavier than before."); return 1; }
        if (!s.radioHeard) {
          s.radioHeard = true;
          p("Static... static... then a voice:", "sys");
          p('"...marking the anniversary of the GREAT FIRE OF 1987,', "head");
          p(' the night this whole district burned to the ground..."', "head");
          p("The signal drowns in static again.");
          return 1;
        }
        p("Static. Then an ad for mattresses. The horror continues.");
        return 1;
      }
      if (V("examine", "x", "inspect", "check")) {
        p("An ancient transistor radio. The power knob is worn shiny —");
        p("someone used to listen to it a lot, down here, waiting.");
        return 1;
      }
      if (V("hit", "kick", "break", "smash")) { p("You smack the radio. It plays half a polka note in protest."); return 1; }
    }

    /* ---- mirror ---- */
    if (is("mirror")) {
      if (V("examine", "x", "inspect", "check", "look")) {
        p("Your reflection looks terrible. Behind the grime, someone");
        p('scratched into the glass: "THE RADIO KNOWS THE YEAR."', "head");
        if (s.maskOn) p("Also: a clown is staring at you. You scream a little.", "err");
        return 1;
      }
      if (V("break", "smash", "hit", "punch")) {
        p("CRASH. Seven years of bad luck, effective immediately.", "err");
        p("(-2 extra moves picking glass out of your sleeve)", "err");
        return 3;
      }
    }

    /* ---- bed / box / mask / matches ---- */
    if (is("under bed") || (is("bed") && V("search"))) {
      if (s.boxFound) { p("Just dust bunnies the size of actual bunnies now."); return 1; }
      s.boxFound = true;
      p("You reach into the dark under the bed... and pull out");
      p("a dusty SHOEBOX.", "head");
      return 1;
    }
    if (is("bed", "mattress")) {
      if (V("examine", "x", "inspect", "check")) {
        p("A mattress with historical stains. You could LOOK UNDER it.");
        return 1;
      }
      if (V("move", "lift", "push", "flip")) { p("You flip the mattress. Nothing. Now the room smells worse."); return 1; }
      if (V("sleep", "lie", "rest")) { p("This is not the time and DEFINITELY not the mattress."); return 1; }
    }
    if (is("box", "shoebox") && s.boxFound) {
      if (V("open", "examine", "x", "check", "search")) {
        if (s.boxOpen) { p("Inside: whatever you haven't pocketed yet."); return 1; }
        s.boxOpen = true;
        p("You lift the lid slowly. Inside, side by side:");
        p("a rubber CLOWN MASK, and a damp MATCHBOOK.", "head");
        return 1;
      }
    }
    if (is("mask", "clown") && s.boxOpen) {
      if (V("take", "get", "grab")) {
        if (this.has("mask")) { p("Already in your pocket. It's watching."); return 1; }
        s.inventory.push("mask");
        p("You take the clown mask. Why? Nobody knows.");
        return 1;
      }
      if (V("wear", "put", "use")) {
        if (!this.has("mask")) { s.inventory.push("mask"); }
        s.maskOn = true;
        p("You put on the clown mask. Nothing about your situation");
        p("improves, but you feel 12% more mysterious.");
        return 1;
      }
      if (V("eat", "swallow", "chew")) {
        this._die(out, [
          "You cram the rubber mask into your mouth. Panic isn't logic.",
          "It lodges. Your throat shuts. The clown gets the last laugh.",
        ]);
        return 0;
      }
      if (V("examine", "x")) { p("Red nose, dead eyes. It has seen things."); return 1; }
    }
    if (is("match", "matches", "matchbook", "lighter", "flame")) {
      if (V("take", "get", "grab", "pick")) {
        if (!s.boxOpen) { p("What matches? You haven't found any."); return 1; }
        if (this.has("matches")) { p("Already in your pocket. Three left."); return 1; }
        s.inventory.push("matches");
        p("A damp matchbook. Three matches left. In THIS air... careful.", "sys");
        return 1;
      }
      if (V("light", "strike", "use", "burn")) {
        if (!this.has("matches")) { p("You've nothing to light. And that's probably lucky."); return 1; }
        this._die(out, [
          "You strike a match. It flares orange in the dark —",
          "— and the gas in the air catches all at once.",
          "The room becomes a fireball. You are standing inside it.",
          "They'll identify you from dental records. History rhymes: 1987.",
        ]);
        return 0;
      }
      if (V("examine", "x")) { p("A matchbook. In a room that reeks of gas. Do the math."); return 1; }
    }

    /* ---- pipe / gas ---- */
    if (is("pipe", "pipes", "radiator", "gas", "valve")) {
      if (V("examine", "x", "inspect", "check", "smell", "listen")) {
        p("A corroded pipe runs floor to ceiling. Somewhere it's cracked —");
        p("a thin hiss, and that sweet, dizzy stink of gas fills the room.", "err");
        p("One spark and none of this matters. Keep flames away.", "err");
        return 1;
      }
      if (V("break", "hit", "kick", "smash", "open", "turn", "twist")) {
        s.pipeBroken = true;
        p("You wrench the valve. The hiss becomes a roar of gas.", "err");
        p("Your head swims. The whole room is a bomb now. Don't light anything.", "err");
        return 1;
      }
      if (V("touch", "grab")) { p("Cold, greasy metal. Doing nothing for you."); return 1; }
    }

    /* ---- bottle / chemicals — LETHAL if drunk ---- */
    if (is("bottle", "jug", "chemical", "chemicals", "bleach", "acid", "jar")) {
      if (V("examine", "x", "read", "inspect", "check")) {
        p("A plastic jug, label half torn: '...URIC ACID — DO NOT ______'.");
        p("The liquid inside is the color of nothing good.");
        return 1;
      }
      if (V("drink", "sip", "swallow", "taste", "chug")) {
        this._die(out, [
          "Thirst beats sense. You drink.",
          "It goes down like fire and comes back up like broken glass.",
          "You fold onto the concrete. The room tilts, then empties out.",
        ]);
        return 0;
      }
      if (V("take", "pour", "throw", "empty", "use")) { p("You'd rather not carry acid in your pocket, thanks."); return 1; }
    }

    /* ---- bucket ---- */
    if (is("bucket", "pail")) {
      if (V("examine", "x", "look", "inspect", "check")) { p("A rusted bucket, half-full of water that moves on its own. Larvae."); return 1; }
      if (V("drink", "sip", "taste")) { p("You gag on the first mouthful and stop. (-1 move retching)", "err"); return 2; }
      if (V("kick", "tip", "empty", "spill", "throw")) { p("You tip the bucket. Now the smell is everywhere. Great work."); return 1; }
    }

    /* ---- vent ---- */
    if (is("vent", "grate", "grille")) {
      if (V("examine", "x", "inspect", "check")) {
        p("A vent near the ceiling, barely bigger than your head.");
        p("Two tiny eyes reflect back at you. A RAT lives here.");
        return 1;
      }
      if (V("open", "unscrew", "remove")) {
        p("You pry at the grate — the RAT explodes out of it and", "err");
        p("parkours off your face into the shadows.", "err");
        p("(-1 extra move recovering your dignity)", "sys");
        return 2;
      }
      if (V("enter", "go", "crawl", "climb")) {
        p("You get your head and one arm in. Then physics happens.", "err");
        p("You're stuck like a cartoon burglar. (-2 extra moves wiggling free)", "err");
        return 3;
      }
    }
    if (is("rat")) {
      if (V("pet", "take", "grab", "catch", "touch")) { p("The rat declines. With prejudice."); return 1; }
      if (V("examine", "x", "talk", "ask")) { p("The rat knows the way out. The rat will never tell."); return 1; }
      if (V("eat")) { p("No."); return 1; }
    }

    /* ---- wires / outlet — LETHAL ---- */
    if (is("wires", "wire", "wiring", "cable", "cables")) {
      if (V("examine", "x", "inspect", "check", "look")) {
        p("Thick industrial cables, insulation peeled back, copper bare.");
        p("They hum with enough current to run a whole street.");
        p("Touching them would be a spectacularly bad way to die.", "err");
        return 1;
      }
      if (V("touch", "grab", "pull", "cut", "take", "use", "bite", "lick", "hold", "jam", "insert", "stick", "poke")) {
        this._die(out, [
          "Your hand closes around bare copper.",
          "Every muscle locks rigid. The bulb flares white, then bursts.",
          "For one long second, you ARE the current.",
          "Then the breaker in your chest trips. Dark. Done.",
        ]);
        return 0;
      }
    }
    if (is("outlet", "socket", "plug")) {
      if (V("examine", "x", "inspect", "check")) { p("A cracked wall socket, wires poking out. Live, almost certainly."); return 1; }
      if (V("touch", "use", "put", "insert", "stick", "jam", "poke")) {
        this._die(out, [
          "You feed metal into the socket. The room flashes white.",
          "Your jaw locks. Your heart forgets its rhythm — then forgets everything.",
        ]);
        return 0;
      }
    }

    /* ---- bulb / switch (careful: "flashlight" contains "light") ---- */
    if (is("bulb", "lamp", "switch") || (is("light") && !is("flashlight"))) {
      if (V("turn", "flip", "use", "switch", "hit", "touch")) {
        if (s.bulbDead) { p("The bulb is dead. You did that."); return 1; }
        s.bulbDead = true;
        p("You flip the crusty switch. POP — the bulb dies dramatically.", "err");
        p("Great. Now the flickering is gone AND it's darker.");
        return 1;
      }
      if (V("examine", "x")) { p("A bare bulb doing its best. Its best is flickering."); return 1; }
    }

    /* ---- floor / walls / ceiling ---- */
    if (is("floor", "ground")) { if (V("examine", "x", "check", "search")) { p(s.rugMoved ? "Concrete, and that TRAPDOOR you found." : "Concrete. A moldy RUG covers part of it."); return 1; } }
    if (is("wall", "walls")) { if (V("examine", "x", "check", "search")) { p("Concrete. A painted window. A poster. BOARDS on the far wall. Despair."); return 1; } }
    if (is("ceiling")) { if (V("examine", "x", "check")) { p("A bulb and a VENT. No action-movie escape hatch. Sorry."); return 1; } }

    /* ---- flavor / trolls / penalties ---- */
    if (V("scream", "yell", "shout") || cmd === "call for help" || cmd === "cry for help") {
      p("You scream your lungs out. Excellent. Now they know", "err");
      p("exactly which room you're in. (-5 extra moves)", "err");
      return 6;
    }
    if (V("sleep", "nap")) {
      p("You... take a nap?? With a unit en route???", "err");
      p("You dream of open doors. (-10 extra moves)", "err");
      return 11;
    }
    if (V("dance")) { p("You bust out a move. The rat watches, unimpressed. 4/10."); return 1; }
    if (V("sing")) { p("You sing to steady your nerves. The mirror cracks a little more."); return 1; }
    if (V("pray")) { p("You pray. A voice you don't know whispers: 'THE RUG. THE TARP. PICK ONE.'"); return 1; }
    if (V("hide")) { p("You hide under the bed. Solid plan. They definitely won't look there."); return 1; }
    if (V("wait")) { p("Time passes. That's literally all that happens. The clock keeps eating."); return 1; }
    if (V("panic")) { p("You panic efficiently. Achievement unlocked. Nothing else unlocked."); return 1; }
    if (V("think")) { p("You think hard. A year... a fire... a rug... a body in the corner..."); return 1; }
    if (V("smell")) { p("Gas, mold, rot, and fear. Mostly the gas. Mostly the fear."); return 1; }
    if (V("listen")) { p("Sirens. Closer than before. Always closer."); return 1; }
    if (V("cry", "weep", "sob")) { p("You cry, quietly. It changes nothing, but you needed it."); return 1; }
    if (V("beg", "plead")) { p("You beg the door for mercy. The door has heard it all before."); return 1; }
    if (V("laugh")) { p("You laugh. It comes out wrong. Somewhere the rat goes still."); return 1; }
    if (V("count")) { p("You count your breaths. The number keeps getting smaller."); return 1; }
    if (V("spit", "curse", "swear")) { p("You spit at the floor and swear. 3% braver. 0% freer."); return 1; }

    return null; // not understood — costs nothing
  },

  _enterTunnel(out) {
    const s = this.state;
    if (!s.rugMoved) { out.push({ t: "Enter what? You'd have to find a way down first." }); return 1; }
    if (!s.trapdoorUnscrewed) { out.push({ t: "The trapdoor is bolted shut. Four rusty screws." }); return 1; }
    if (!s.trapdoorOpen) { out.push({ t: "It's unscrewed but still closed. Open it." }); return 1; }
    if (!this.has("flashlight") || !s.flashlightOn) {
      this._die(out, [
        "You lower yourself into the pitch-black tunnel.",
        "Your foot finds a rung. Then it doesn't.",
        "The fall takes long enough to regret everything.",
        "Next time, bring a light.",
      ]);
      return 0;
    }
    this._win(out, "tunnel");
    return 0;
  },

  _climbChute(out) {
    const s = this.state;
    if (!s.boardsFound) { out.push({ t: "Climb what? The walls are solid concrete... mostly." }); return 1; }
    if (!s.boardsPried) { out.push({ t: "The chute is boarded over. Thick planks, nailed deep. Pry them." }); return 1; }
    this._win(out, "chute");
    return 0;
  },
};

function initGame() {
  const output = document.getElementById("game-output");
  const input = document.getElementById("game-input");
  const term = document.getElementById("zork-terminal");
  if (!output || !input || !term) return;

  const clockEl = document.getElementById("term-clock");
  const movesEl = document.getElementById("hud-moves");
  const elapsedEl = document.getElementById("hud-elapsed");
  const statusEl = document.getElementById("hud-status");

  const history = [];
  let histIdx = -1;
  let elapsedStart = Date.now();
  let lastAttempt = 0;

  const pad = n => String(n).padStart(2, "0");

  function updateHUD() {
    const s = GAME.state;
    if (!s) return;
    if (s.attempt !== lastAttempt) { lastAttempt = s.attempt; elapsedStart = Date.now(); }

    if (clockEl) {
      const n = new Date();
      clockEl.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    }
    if (movesEl) {
      movesEl.textContent = pad(s.moves);
      movesEl.classList.toggle("low", s.moves <= 10);
    }
    if (elapsedEl && !s.over) {
      const sec = Math.floor((Date.now() - elapsedStart) / 1000);
      elapsedEl.textContent = `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
    }
    if (statusEl) {
      let t = "● ONLINE", c = "alive";
      if (s.over && s.won) { t = "✓ ESCAPED"; c = "won"; }
      else if (s.over && s.status === "cuffed") { t = "✗ IN CUSTODY"; c = "cuffed"; }
      statusEl.textContent = t;
      statusEl.className = "hud-status " + c;
    }
  }

  function addLine(line) {
    if (typeof line === "object" && line._clear) { output.innerHTML = ""; return; }
    const text = typeof line === "string" ? line : line.t;
    const cls = typeof line === "string" ? "" : (line.c || "");
    const d = document.createElement("div");
    d.className = text === "" ? "game-line empty" : `game-line ${cls}`;
    if (text !== "") d.textContent = text;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
  }

  function printLines(lines) {
    (Array.isArray(lines) ? lines : [lines]).forEach(addLine);
  }

  GAME.reset();
  lastAttempt = GAME.state.attempt;
  const boot = GAME.intro();
  let bi = 0;
  (function bootTick() {
    if (bi < boot.length) {
      addLine(boot[bi]);
      bi++;
      setTimeout(bootTick, 70);
    }
  })();

  function submit() {
    const val = input.value.trim();
    if (!val) return;
    history.unshift(val);
    histIdx = -1;
    addLine({ t: `> ${val}`, c: "cmd" });
    input.value = "";
    printLines(GAME.process(val));
    addLine({ t: "", c: "" });
    updateHUD();
  }

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) { histIdx--; input.value = history[histIdx]; }
      else { histIdx = -1; input.value = ""; }
    }
  });

  term.addEventListener("click", () => input.focus());

  updateHUD();
  setInterval(updateHUD, 1000);
}

/* ============================================================
   MUSIC PLAYER (tracks from home.json)
   ============================================================ */
function initMusicPlayer(tracks) {
  const container = document.getElementById("music-player-container");
  if (!container || !tracks || !tracks.length) return;

  let current = 0;
  let playing = false;
  const audio = new Audio();
  audio.volume = 0.7;

  container.innerHTML = `
    <div class="music-player">
      <div class="mp-header">
        <span class="mp-label">// MUSIC</span>
        <span class="mp-track-name" id="mp-name">${esc(tracks[0].title)}</span>
        <span class="mp-time"><span id="mp-cur">0:00</span>&nbsp;/&nbsp;<span id="mp-dur">0:00</span></span>
      </div>
      <div class="mp-progress-wrap" id="mp-prog-wrap">
        <div class="mp-progress-bar"><div class="mp-progress-fill" id="mp-fill"></div></div>
      </div>
      <div class="mp-controls">
        <button class="mp-btn" id="mp-prev" title="Previous">⏮</button>
        <button class="mp-btn" id="mp-play" title="Play/Pause">▶</button>
        <button class="mp-btn" id="mp-next" title="Next">⏭</button>
        <div class="mp-vol">
          <span class="mp-vol-label">VOL</span>
          <input type="range" class="mp-vol-slider" id="mp-vol" min="0" max="1" step="0.05" value="0.7">
        </div>
      </div>
      <ul class="mp-tracklist" id="mp-tracklist"></ul>
    </div>`;

  const nameEl = document.getElementById("mp-name");
  const curEl = document.getElementById("mp-cur");
  const durEl = document.getElementById("mp-dur");
  const fillEl = document.getElementById("mp-fill");
  const playBtn = document.getElementById("mp-play");
  const listEl = document.getElementById("mp-tracklist");
  const progWrap = document.getElementById("mp-prog-wrap");

  tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "mp-track-item" + (i === 0 ? " active" : "");
    li.innerHTML = `
      <span class="mp-track-num">${String(i + 1).padStart(2, "0")}</span>
      <span class="mp-track-title">${esc(t.title)}</span>
      <span class="mp-eq paused"><span></span><span></span><span></span></span>`;
    li.addEventListener("click", () => loadTrack(i, true));
    listEl.appendChild(li);
  });

  function fmtTime(s) {
    if (isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  function updateTrackList() {
    listEl.querySelectorAll(".mp-track-item").forEach((el, i) => {
      el.classList.toggle("active", i === current);
      const eq = el.querySelector(".mp-eq");
      if (eq) eq.classList.toggle("paused", !playing);
    });
  }

  function loadTrack(idx, autoplay = false) {
    current = idx;
    audio.src = assetPath(tracks[idx].file);
    nameEl.textContent = tracks[idx].title;
    fillEl.style.width = "0%";
    curEl.textContent = "0:00";
    durEl.textContent = "0:00";
    if (autoplay) {
      audio.play().catch(() => {});
      playing = true;
      playBtn.textContent = "⏸";
      playBtn.classList.add("play-active");
    }
    updateTrackList();
  }

  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      if (!audio.src) loadTrack(current, true);
      else audio.play().catch(() => {});
      playing = true;
      playBtn.textContent = "⏸";
      playBtn.classList.add("play-active");
    } else {
      audio.pause();
      playing = false;
      playBtn.textContent = "▶";
      playBtn.classList.remove("play-active");
    }
    updateTrackList();
  });

  document.getElementById("mp-prev").addEventListener("click", () =>
    loadTrack((current - 1 + tracks.length) % tracks.length, playing));
  document.getElementById("mp-next").addEventListener("click", () =>
    loadTrack((current + 1) % tracks.length, playing));

  audio.addEventListener("ended", () => loadTrack((current + 1) % tracks.length, true));

  // If a track file fails to load, skip to the next one instead of
  // getting stuck in "playing" state. Stop after one full cycle.
  let errorStreak = 0;
  audio.addEventListener("playing", () => { errorStreak = 0; });
  audio.addEventListener("error", () => {
    if (!playing) return;
    errorStreak++;
    if (errorStreak >= tracks.length) {
      playing = false;
      playBtn.textContent = "▶";
      playBtn.classList.remove("play-active");
      updateTrackList();
      return;
    }
    loadTrack((current + 1) % tracks.length, true);
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    fillEl.style.width = (audio.currentTime / audio.duration) * 100 + "%";
    curEl.textContent = fmtTime(audio.currentTime);
    durEl.textContent = fmtTime(audio.duration);
  });

  progWrap.addEventListener("click", e => {
    const rect = progWrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });

  document.getElementById("mp-vol").addEventListener("input", function () {
    audio.volume = parseFloat(this.value);
  });

  loadTrack(0, false); // no autoplay — browser policy
}

/* ============================================================
   FEATURED SHOWCASE (data/featured.json)
   Auto-advancing slider; arrows, dots, pause on hover.
   ============================================================ */
const SHOWCASE_INTERVAL = 6000;

function initShowcase(items) {
  const box = document.getElementById("showcase-box");
  if (!box || !Array.isArray(items) || !items.length) return;

  box.innerHTML = `
    <div class="showcase" id="showcase-root">
      <div class="showcase-slides">
        ${items.map((it, i) => `
        <a class="showcase-slide${i === 0 ? " active" : ""}"
           href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
          <span class="showcase-img">
            <img src="${esc(assetPath(it.image))}" alt="${esc(it.name)}" loading="lazy"
                 onerror="this.style.visibility='hidden'">
          </span>
          <span class="showcase-body">
            <span class="showcase-head">
              <span class="showcase-name">${esc(it.name)}</span>
              ${it.tag ? `<span class="cat-badge">${esc(it.tag)}</span>` : ""}
            </span>
            <span class="showcase-desc">${esc(it.description)}</span>
            <span class="showcase-link">${esc(it.url)} ↗</span>
          </span>
        </a>`).join("")}
      </div>
      <div class="showcase-nav">
        <button class="showcase-arrow" id="sc-prev" aria-label="Previous project">‹</button>
        <div class="showcase-dots">
          ${items.map((_, i) => `<button class="showcase-dot${i === 0 ? " active" : ""}"
             data-i="${i}" aria-label="Go to slide ${i + 1}"></button>`).join("")}
        </div>
        <button class="showcase-arrow" id="sc-next" aria-label="Next project">›</button>
      </div>
      <div class="showcase-progress"><div class="showcase-progress-fill" id="sc-fill"></div></div>
    </div>`;

  const root = document.getElementById("showcase-root");
  const slides = root.querySelectorAll(".showcase-slide");
  const dots = root.querySelectorAll(".showcase-dot");
  const fill = document.getElementById("sc-fill");
  let current = 0;
  let timer = null;

  function restartFill() {
    fill.style.animation = "none";
    void fill.offsetWidth; // reflow to restart the animation
    fill.style.animation = `sc-progress ${SHOWCASE_INTERVAL}ms linear`;
  }

  function goTo(i) {
    current = (i + items.length) % items.length;
    slides.forEach((el, idx) => el.classList.toggle("active", idx === current));
    dots.forEach((el, idx) => el.classList.toggle("active", idx === current));
    restartFill();
  }

  function play() {
    stop();
    timer = setInterval(() => goTo(current + 1), SHOWCASE_INTERVAL);
    restartFill();
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    fill.style.animation = "none";
  }

  document.getElementById("sc-prev").addEventListener("click", () => { goTo(current - 1); play(); });
  document.getElementById("sc-next").addEventListener("click", () => { goTo(current + 1); play(); });
  dots.forEach(d => d.addEventListener("click", () => { goTo(parseInt(d.dataset.i, 10)); play(); }));

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", play);

  play();
}

/* ============================================================
   HERO / ABOUT / COUNTERS from home.json
   ============================================================ */
function renderHero(cfg) {
  const tagEl = document.getElementById("hero-tagline");
  const descEl = document.getElementById("hero-desc");
  if (tagEl) tagEl.textContent = cfg.tagline || "";
  if (descEl) descEl.textContent = cfg.description || "";

  const pillsEl = document.getElementById("hero-pills");
  if (pillsEl && Array.isArray(cfg.tags)) {
    pillsEl.innerHTML = "";
    cfg.tags.forEach(tag => {
      const s = document.createElement("span");
      s.className = "pill";
      s.textContent = tag;
      pillsEl.appendChild(s);
    });
  }
}

function renderAbout(cfg) {
  const container = document.getElementById("about-container");
  if (!container) return;
  container.innerHTML = "";

  function block(title, rows) {
    const div = document.createElement("div");
    div.className = "panel accent-left";
    div.innerHTML = `<div class="panel-title">${esc(title)}</div>`;
    (rows || []).forEach(r => {
      const row = document.createElement("div");
      row.className = "about-row";
      row.innerHTML = `<span class="about-key">${esc(r.key)}</span><span class="about-val">${esc(r.val)}</span>`;
      div.appendChild(row);
    });
    return div;
  }

  container.appendChild(block("// profile.dat", cfg.aboutStats));
  container.appendChild(block("// skills.dat", cfg.aboutSkills));

  if (Array.isArray(cfg.aboutBio) && cfg.aboutBio.length) {
    const bio = document.createElement("div");
    bio.className = "panel about-bio";
    bio.innerHTML = `<div class="panel-title">// bio.txt</div>` +
      cfg.aboutBio.map(p => `<p>${esc(p)}</p>`).join("");
    container.appendChild(bio);
  }
}

function initCounters(counters) {
  const grid = document.getElementById("counters-grid");
  if (!grid || !Array.isArray(counters)) return;
  grid.innerHTML = "";

  counters.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "counter-card";
    card.innerHTML = `
      <div class="counter-card-label">${esc(c.label)}</div>
      <div class="counter-card-since">SINCE ${esc(c.date)}</div>
      <div class="counter-num" id="c-d-${idx}">0000</div>
      <div class="counter-unit">DAYS</div>
      <div class="counter-card-desc">${esc(c.description)}</div>`;
    grid.appendChild(card);
  });

  function tick() {
    counters.forEach((c, idx) => {
      const diff = Date.now() - new Date(c.date).getTime();
      const el = document.getElementById(`c-d-${idx}`);
      if (!el || isNaN(diff) || diff < 0) return;
      el.textContent = String(Math.floor(diff / 86400000)).padStart(4, "0");
    });
  }
  tick();
  setInterval(tick, 60000);
}

/* ============================================================
   TOP STATUS HUD — live day-counters + wall clock, hacker style.
   Sits under the navbar at the top of the page. Data reused from
   home.json counters (no new site copy invented).
   ============================================================ */
function initTopHUD(counters) {
  const bar = document.getElementById("top-hud");
  if (!bar) return;

  const list = Array.isArray(counters) ? counters : [];
  const items = list.map((c, i) => {
    const key = String(c.label || "").replace(/\s*SINCE\s*$/i, "").trim() || `NODE ${i + 1}`;
    return `<span class="th-item">
        <span class="th-key">${esc(key)}</span>
        <b class="th-val" id="th-c-${i}">----</b>
        <span class="th-unit">days</span>
      </span>`;
  }).join("");

  bar.innerHTML = `
    <span class="th-prompt">root@bugfish:~$</span>
    <div class="th-scroll">${items}
      <span class="th-item th-sys">
        <span class="th-key">SYS</span>
        <b class="th-val" id="th-clock">--:--:--</b>
      </span>
    </div>
    <span class="th-item th-online"><span class="th-dot"></span>ONLINE</span>`;

  const pad = n => String(n).padStart(2, "0");

  function tick() {
    list.forEach((c, i) => {
      const el = document.getElementById(`th-c-${i}`);
      if (!el) return;
      const diff = Date.now() - new Date(c.date).getTime();
      if (isNaN(diff) || diff < 0) return;
      el.textContent = String(Math.floor(diff / 86400000));
    });
    const clock = document.getElementById("th-clock");
    if (clock) {
      const n = new Date();
      clock.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    }
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  initMatrix();
  initGame();

  try {
    const cfg = await loadJSON("data/home.json");
    renderHero(cfg);
    renderAbout(cfg);
    initTopHUD(cfg.counters);
    initCounters(cfg.counters);
    initMusicPlayer(cfg.music);
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("about-container"), "data/home.json");
  }

  try {
    const featured = await loadJSON("data/featured.json");
    initShowcase(featured);
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("showcase-box"), "data/featured.json");
  }
});
