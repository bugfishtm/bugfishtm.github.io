/* ============================================================
   BUGFISH — home.js
   Home page: hero, matrix rain, escape.exe horror minigame,
   music player, featured showcase, about and uptime counters.
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
   You wake locked in a basement room. The cops were called on
   you and will breach after 50 moves. There is exactly ONE way
   out (the trapdoor under the rug), everything else is a red
   herring, a joke — or lethal.

   True path (≈12 moves):
     move rug → open drawer → take screwdriver →
     unscrew trapdoor → examine poster → turn on radio (code!)
     → open safe 1987 → take flashlight → turn on flashlight →
     open trapdoor → enter trapdoor
   ============================================================ */
const GAME = {
  MAX_MOVES: 50,
  state: null,

  reset() {
    this.state = {
      moves: this.MAX_MOVES,
      over: false,
      won: false,
      attempt: (this.state ? this.state.attempt : 0) + 1,
      rugMoved: false,
      trapdoorUnscrewed: false,
      trapdoorOpen: false,
      posterMoved: false,
      safeOpen: false,
      wrongCodes: 0,
      drawerOpen: false,
      radioHeard: false,
      boxFound: false,
      boxOpen: false,
      maskOn: false,
      keyBroken: false,
      bulbDead: false,
      flashlightOn: false,
      inventory: [],
    };
  },

  intro() {
    const s = this.state;
    return [
      { t: `ATTEMPT #${s.attempt}`, c: "head" },
      { t: "───────────────────────────────────────", c: "sys" },
      { t: "You wake on cold concrete. Head pounding. You didn't do" },
      { t: "what they think you did — but the sirens don't care." },
      { t: "" },
      { t: "A voice hisses through the steel door:" },
      { t: '"They dispatched a unit. 50 moves until they breach.', c: "head" },
      { t: ' There IS a way out of that room. Find it."', c: "head" },
      { t: "Footsteps fade. Somewhere far away: sirens." },
      { t: "───────────────────────────────────────", c: "sys" },
      { t: "Type 'help' for commands. Every action costs time.", c: "sys" },
      { t: "" },
    ];
  },

  help() {
    return [
      { t: "─── COMMANDS (free) ─────────────────────", c: "sys" },
      { t: "  look / l              scan the room" },
      { t: "  examine [thing] / x   inspect closer" },
      { t: "  open / close [thing]  doors, drawers..." },
      { t: "  take [thing]          pick something up" },
      { t: "  move [thing]          shove things around" },
      { t: "  use [thing]           use an item" },
      { t: "  turn on/off [thing]   power things" },
      { t: "  unscrew [thing]       you'll need a tool" },
      { t: "  enter [thing]         squeeze into places" },
      { t: "  open safe [code]      if you find a safe..." },
      { t: "  inventory / i         check pockets (free)" },
      { t: "  restart               give up, start over" },
      { t: "─────────────────────────────────────────", c: "sys" },
      { t: "Everything else costs 1 move. Noise costs more.", c: "sys" },
    ];
  },

  /* ---- helpers -------------------------------------------- */
  has(item) { return this.state.inventory.includes(item); },

  _warn(m) {
    if (m === 40) return "Distant sirens. They're real.";
    if (m === 30) return "The sirens are getting closer.";
    if (m === 20) return "Tires screech somewhere outside.";
    if (m === 10) return "Car doors. Voices. Boots on gravel.";
    if (m === 5)  return "Heavy boots coming down the stairs.";
    if (m === 3)  return "Fists hammer the door: 'OPEN UP!'";
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
      out.push({ t: "Rough hands. Cold cuffs. It's over.", c: "err" });
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

  _win(out) {
    const s = this.state;
    s.over = true;
    s.won = true;
    out.push({ t: "" });
    out.push({ t: "You click the flashlight on and drop into the tunnel.", c: "" });
    out.push({ t: "Behind you, red and blue light floods the room you just left.", c: "" });
    out.push({ t: "The tunnel breathes cold air. You crawl. You don't look back.", c: "" });
    out.push({ t: "" });
    out.push({ t: "╔═══════════════════════════════════╗", c: "head" });
    out.push({ t: `║   YOU ESCAPED — ${String(s.moves).padStart(2, "0")} MOVES TO SPARE   ║`, c: "head" });
    out.push({ t: "╚═══════════════════════════════════╝", c: "head" });
    out.push({ t: "Type 'restart' to run it again.", c: "sys" });
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
    if (lower === "restart") {
      this.reset();
      return [{ t: "// rebooting simulation...", c: "sys" }, ...this.intro()];
    }
    if (["i", "inv", "inventory", "bag", "pockets"].includes(lower)) {
      if (!s.inventory.length) return [{ t: "Your pockets are empty. Like your alibi." }];
      return [{ t: "CARRYING:" }, ...s.inventory.map(k => ({ t: `  ▸ ${this._itemName(k)}` }))];
    }
    if (lower === "sudo" || lower.startsWith("sudo ")) {
      return [{ t: "Permission denied. Reality does not accept sudo.", c: "sys" }];
    }
    if (lower === "ls") return [{ t: "Hint: this isn't a shell. Try 'look'.", c: "sys" }];
    if (lower === "pwd") return [{ t: "/basement/room_you_should_leave", c: "sys" }];

    if (s.over) {
      return [{ t: s.won ? "You're already out. Type 'restart' to run it again."
                         : "Type 'restart'.", c: "sys" }];
    }

    /* costed actions */
    const result = this._action(lower, out);
    if (result === null) {
      out.push({ t: `You fumble ('${raw}' does nothing). Try 'help'.`, c: "sys" });
      return out; // unknown input costs nothing
    }
    if (s.over) return out;                 // died or won inside the action
    if (this._tick(out, result)) return out; // timer may kill
    return out;
  },

  _itemName(k) {
    return { screwdriver: "SCREWDRIVER", note: "CRUMPLED NOTE", flashlight: "FLASHLIGHT",
             key: "RUSTY KEY", mask: "CLOWN MASK" }[k] || k.toUpperCase();
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
      p("Concrete walls. A bare BULB flickers overhead.");
      p("A steel DOOR (locked). A WINDOW that looks... wrong.");
      p("A filthy BED. A wooden DESK. An old RADIO.");
      p("A cracked MIRROR. A cat POSTER. A moldy RUG.");
      p("A VENT near the ceiling. Exposed WIRES by the door.");
      p("╚════════════════════════════════════╝", "head");
      return 1;
    }
    if (V("look") && is("under bed")) rest = "under bed", cmd = "examine under bed";

    /* ---- door (careful: "trapdoor" contains "door") ---- */
    if (is("door") && !is("trapdoor", "trap door", "hatch")) {
      if (V("examine", "x", "inspect", "check")) {
        p("Reinforced steel. Deadbolt on the OUTSIDE. Deep scratch");
        p("marks near the floor — someone tried this before you.");
        p("Exposed WIRES run along the frame. They hum.");
        return 1;
      }
      if (V("open", "unlock")) { p("Locked from outside. The handle just laughs at you."); return 1; }
      if (V("kick", "hit", "punch", "break", "smash", "ram")) {
        p("BOOM. The steel doesn't move. The whole street heard that.", "err");
        p("(-3 extra moves: noise travels)", "err");
        return 4;
      }
      if (V("knock")) { p("You knock politely. Somewhere, a cop laughs."); return 1; }
      if (V("listen")) { p("Humming wires. Your own pulse. Distant sirens."); return 1; }
    }

    /* ---- window ---- */
    if (is("window")) {
      if (V("examine", "x", "inspect", "check")) {
        p("You step closer. Wait. The frame has no depth. The glass");
        p("has no reflection. Someone PAINTED a window on the wall.");
        p("Whoever kept you here has a sense of humor.");
        return 1;
      }
      if (V("open")) { p("You try to open a painting. It goes as well as expected."); return 1; }
      if (V("break", "punch", "hit", "smash", "kick")) {
        p("You punch the wall with confidence. The wall wins.", "err");
        p("Your knuckles are bleeding. Worth it? No.");
        return 1;
      }
    }

    /* ---- rug / trapdoor ---- */
    if (is("rug", "carpet", "mat") ) {
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
        p("Cold air rises. You can't see the bottom.");
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
        if (cmd.includes("off")) { s.flashlightOn = false; p("Click. Darkness feels closer now."); return 1; }
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
        p("someone used to listen to it a lot.");
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

    /* ---- bed / box / mask ---- */
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
        if (s.boxOpen) { p(this.has("mask") ? "Empty." : "The CLOWN MASK grins from inside."); return 1; }
        s.boxOpen = true;
        p("You lift the lid slowly... inside:");
        p("a rubber CLOWN MASK. It smiles. You don't.", "head");
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
        if (!this.has("mask") && !s.boxOpen) { p("What mask?"); return 1; }
        if (!this.has("mask")) { s.inventory.push("mask"); }
        s.maskOn = true;
        p("You put on the clown mask. Nothing about your situation");
        p("improves, but you feel 12% more mysterious.");
        return 1;
      }
      if (V("examine", "x")) { p("Red nose, dead eyes. It has seen things."); return 1; }
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

    /* ---- wires — LETHAL ---- */
    if (is("wires", "wire", "wiring", "cable", "cables")) {
      if (V("examine", "x", "inspect", "check", "look")) {
        p("Thick industrial cables, insulation peeled back, copper bare.");
        p("They hum with enough current to run a small village.");
        p("Touching these would be a spectacularly bad idea.", "err");
        return 1;
      }
      if (V("touch", "grab", "pull", "cut", "take", "use", "bite", "lick")) {
        this._die(out, [
          "Your hand closes around bare copper.",
          "Every muscle locks. The bulb flares white.",
          "For 1.21 seconds, you ARE the electrical grid.",
          "You light up like a christmas tree. Then: nothing.",
        ]);
        return 0;
      }
    }

    /* ---- bulb / switch (careful: "flashlight" contains "light") ---- */
    if (is("bulb", "lamp", "switch") || (is("light") && !is("flashlight"))) {
      if (V("turn", "flip", "use", "switch", "hit", "touch") ) {
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
    if (is("wall", "walls")) { if (V("examine", "x", "check", "search")) { p("Concrete. A painted window. A poster. Your growing despair."); return 1; } }
    if (is("ceiling")) { if (V("examine", "x", "check")) { p("A bulb and a VENT. No action movie escape hatch. Sorry."); return 1; } }

    /* ---- flavor / trolls / penalties ---- */
    if (V("scream", "yell", "shout") || cmd === "call for help" || cmd === "cry") {
      p("You scream your lungs out. Excellent. Now they know", "err");
      p("exactly which room you're in. (-5 extra moves)", "err");
      return 6;
    }
    if (V("sleep", "nap")) {
      p("You... take a nap?? With a SWAT team en route???", "err");
      p("You dream of open doors. (-10 extra moves)", "err");
      return 11;
    }
    if (V("dance")) { p("You bust out a move. The rat watches, unimpressed. 4/10."); return 1; }
    if (V("sing")) { p("You sing to calm your nerves. The mirror cracks a little more."); return 1; }
    if (V("pray")) { p("You pray. A voice answers: 'HAVE YOU TRIED THE RUG?' Wait, what?"); return 1; }
    if (V("hide")) { p("You hide under the bed. Solid plan. They definitely won't look there."); return 1; }
    if (V("wait")) { p("Time passes. That's literally all that happens."); return 1; }
    if (V("panic")) { p("You panic efficiently. Achievement unlocked. Nothing else unlocked."); return 1; }
    if (V("think")) { p("You think hard. The year... something about a year... a fire?"); return 1; }
    if (V("smell")) { p("Mold, dust, fear. Mostly fear."); return 1; }
    if (V("listen")) { p("Sirens. Closer than before. Always closer."); return 1; }

    return null; // not understood — costs nothing
  },

  _enterTunnel(out) {
    const s = this.state;
    if (!s.rugMoved) { out.push({ t: "Enter what? You'd have to find a way out first." }); return 1; }
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
    this._win(out);
    return 0;
  },
};

function initGame() {
  const output = document.getElementById("game-output");
  const input = document.getElementById("game-input");
  const term = document.getElementById("zork-terminal");
  if (!output || !input || !term) return;

  const history = [];
  let histIdx = -1;

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
    if (cfg.assessment) {
      bio.innerHTML += `
        <div class="bio-assessment">
          <div class="bio-assessment-label">// external_assessment.log</div>
          <p>${esc(cfg.assessment)}</p>
        </div>`;
    }
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
   BOOT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  initMatrix();
  initGame();

  try {
    const cfg = await loadJSON("data/home.json");
    renderHero(cfg);
    renderAbout(cfg);
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
