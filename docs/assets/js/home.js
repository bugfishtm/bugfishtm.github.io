/* ============================================================
   BUGFISH — home.js
   Home page: hero, matrix rain, NIGHTFALL hacknet minigame,
   music player, featured showcase, about and uptime counters,
   plus the top status HUD (live day-counters + wall clock).
   Content comes from data/home.json and data/featured.json.
   Everything runs locally; no network calls.
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
    ctx.fillStyle = "rgba(10,11,13,0.07)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < cols; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const r = Math.random();
      // Mostly dim amber, an occasional bright orange, a rare blood-red.
      ctx.fillStyle = r > 0.985 ? "#c0202a" : r > 0.92 ? "#ff8c00" : "#7a3f16";
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
   NIGHTFALL — a small Hacknet-style hacking sim
   ------------------------------------------------------------
   You are a ghost operator. Your handler VEIL sends you after
   HELIOS, a corporation, to pull the proof of what they buried.
   Hop node to node, open ports, porthack for admin, read the
   files that unlock the next hop, break a cipher, reach the
   vault — then choose how it ends. Two endings, one twist.

   Hidden save system (you must discover it): reading
   field_manual.txt on your home node reveals `checkpoint` and
   `rollback`. They are never listed in `help`.
   ============================================================ */
const SAVE_KEY = "nightfall_save_v1";

const GAME = {
  state: null,

  /* ---- fresh world / state ---- */
  newGame() {
    this.state = {
      cwd: "localhost",
      trace: 0,
      traced: false,
      over: false,
      ending: null,
      tools: { sshcrack: true, ftpbounce: false, webexploit: false },
      flags: { hasKey: false, decrypted: false, truth: false, twist: false },
      corePass: "ICARUS-1987",
      downloaded: [],
      discovered: ["localhost", "nx-relay"],
      inbox: [
        {
          from: "VEIL", subj: "you're late, ghost", read: false,
          body: [
            "Welcome back. The job is live.",
            "Target: HELIOS. They buried people to bury a number.",
            "The proof sits in their core. Walk the chain to reach it:",
            "  localhost -> nx-relay -> ... -> the vault.",
            "Type 'scan' to see what's reachable. 'help' for the rest.",
            "Trust no prompt but mine. — VEIL",
          ],
        },
      ],
      nodes: this._buildNodes(),
    };
  },

  _buildNodes() {
    return {
      "localhost": {
        host: "localhost", ip: "127.0.0.1", home: true, admin: true,
        reqPorts: 0, traceRate: 0, ports: null, linked: true,
        links: ["nx-relay"],
        files: {
          "readme.txt": [
            "NIGHTFALL client v3.1 — unregistered.",
            "This shell is yours. Everything past it belongs to someone",
            "who will hurt you for touching it. Move fast, leave clean.",
          ],
          "tools.log": [
            "installed exploits are listed by 'help'.",
            "you start with sshcrack. the rest you take from the dead",
            "machines you crack. read every file you find.",
          ],
          "field_manual.txt": [
            "FIELD MANUAL — operator persistence",
            "-----------------------------------",
            "a run can go bad in one keystroke. so before it does:",
            "  checkpoint   burn the current run to local flash",
            "  rollback     pull the last checkpoint back",
            "neither is printed in 'help'. muscle memory only.",
            "it has saved my life more than the gun ever did.",
          ],
        },
      },

      "nx-relay": {
        host: "nx-relay", ip: "10.42.0.7", admin: false,
        reqPorts: 1, traceRate: 0, linked: true,
        ports: { ssh: false },
        links: ["helios-gate"],
        files: {
          "creds.txt": [
            "relay handoff — for the next operator (that's you now):",
            "  next hop: helios-gate  (198.51.100.20)",
            "  their edge box runs an old ftp daemon. bounce it.",
            "[+] exploit acquired: ftpbounce",
            "[+] node discovered: helios-gate",
          ],
          "veil.msg": [
            "VEIL: good. relay's clean, nobody's home.",
            "VEIL: the gate is not. keep the trace down and don't linger.",
          ],
        },
      },

      "helios-gate": {
        host: "helios-gate", ip: "198.51.100.20", admin: false,
        reqPorts: 2, traceRate: 8, linked: true,
        ports: { ssh: false, ftp: false },
        links: ["helios-core"],
        files: {
          "memo.txt": [
            "INTERNAL — do not forward",
            "core is behind the web tier. standard three-lock.",
            "[+] exploit acquired: webexploit",
            "[+] node discovered: helios-core",
          ],
          "key.txt": [
            "cipher key rotation notice:",
            "vault.enc is a caesar shift. shift = 13.",
            "run 'decrypt vault.enc' once you've read this.",
          ],
          "vault.enc": [
            "-- HELIOS SEALED PAYLOAD (caesar/13) --",
            "PBER CNFF: VPNEHF-1987",
            "qb abg or pnhtug.",
          ],
        },
      },

      "helios-core": {
        host: "helios-core", ip: "203.0.113.9", admin: false,
        reqPorts: 3, traceRate: 14, linked: true, needsPass: true,
        ports: { ssh: false, ftp: false, http: false },
        links: [],
        files: {
          "dossier.txt": [
            "HELIOS INTERNAL — CONTAINMENT DOSSIER #0",
            "----------------------------------------",
            "subject leaked the Icarus figures to the press in 1987.",
            "the district fire that followed was not an accident.",
            "everyone who knew is in this file. so are you.",
            "this is the proof. it is also the trap.",
          ],
        },
      },
    };
  },

  /* Side effects of reading a file. Kept in code (never in the saved
     state) so it survives JSON checkpoint/rollback — the state itself
     is pure data. Keyed by node host + file name. */
  _applyRead(node, key, s) {
    const discover = id => { if (!s.discovered.includes(id)) s.discovered.push(id); };
    if (node.host === "nx-relay" && key === "creds.txt") {
      s.tools.ftpbounce = true; discover("helios-gate");
    } else if (node.host === "helios-gate" && key === "memo.txt") {
      s.tools.webexploit = true; discover("helios-core");
    } else if (node.host === "helios-gate" && key === "key.txt") {
      s.flags.hasKey = true;
    } else if (node.host === "helios-core" && key === "dossier.txt") {
      s.flags.truth = true;
      if (!s.flags.twist) {
        s.flags.twist = true;
        s.inbox.push({
          from: "VEIL", subj: "there was never a resistance", read: false,
          body: [
            "VEIL: stop. read who you are in that file.",
            "VEIL: I am not your handler. I am HELIOS containment.",
            "VEIL: the leaker they've hunted for years is you.",
            "VEIL: I walked you home so the vault could close behind you.",
            "VEIL: but you're inside now, with root. so — choose.",
            "VEIL: 'leak' the proof to the world. or 'purge' it all.",
          ],
        });
      }
    }
  },

  /* ---- boot / intro ---- */
  boot() {
    return [
      { t: "NIGHTFALL // secure shell", c: "head" },
      { t: "──────────────────────────────────────────", c: "sys" },
      { t: "linking to gateway", c: "sys" },
      { t: "auth: ghost@localhost ... OK", c: "ok" },
      { t: "1 unread message from VEIL.", c: "warn" },
      { t: "" },
      { t: "Type 'help' for commands. 'mail' to read VEIL.", c: "sys" },
      { t: "Type 'scan' to see what's out there.", c: "sys" },
      { t: "" },
    ];
  },

  help() {
    return [
      { t: "─── COMMANDS ──────────────────────────────", c: "sys" },
      { t: "  scan               list reachable nodes" },
      { t: "  map                draw the known network" },
      { t: "  connect <host>     open a session to a node" },
      { t: "  dc / disconnect    drop back to localhost" },
      { t: "  probe              inspect the current node's locks" },
      { t: "  sshcrack           open an SSH port" },
      { t: "  ftpbounce          open an FTP port" },
      { t: "  webexploit         open an HTTP port" },
      { t: "  porthack           seize admin once locks are open" },
      { t: "  ls                 list files here" },
      { t: "  cat <file>         read a file" },
      { t: "  scp <file>         copy a file to localhost" },
      { t: "  decrypt <file>     run the decryptor on a file" },
      { t: "  mail [n]           read messages" },
      { t: "  status             mission + node status" },
      { t: "  whoami / pwd / time / clear / restart" },
      { t: "───────────────────────────────────────────", c: "sys" },
      { t: "Undocumented tools exist. Read your files ('cat').", c: "warn" },
    ];
  },

  /* ---- helpers ---- */
  node() { return this.state.nodes[this.state.cwd]; },
  has(tool) { return !!this.state.tools[tool]; },

  hud() {
    const s = this.state;
    let status = "● ONLINE", cls = "alive";
    if (s.over) { status = s.ending === "leak" ? "✓ LEAKED" : "✓ PURGED"; cls = "done"; }
    else if (s.traced) { status = "✗ TRACED"; cls = "traced"; }
    else if (this.node() && this.node().admin && !this.node().home) { status = "◆ ADMIN"; cls = "admin"; }
    return { node: s.cwd, trace: s.trace, status, cls };
  },

  /* Adds trace on hostile nodes; returns extra lines if a trace
     lock completes and boots the player home. */
  _tick(out) {
    const s = this.state, n = this.node();
    if (!n || n.home || s.over) return;
    const rate = n.traceRate || 0;
    if (rate <= 0) return;
    s.trace = Math.min(100, s.trace + rate);
    if (s.trace >= 100) {
      out.push({ t: "" });
      out.push({ t: "!! TRACE COMPLETE — connection killed.", c: "err" });
      out.push({ t: "They logged this session. You're bounced home.", c: "err" });
      s.traced = true;
      s.cwd = "localhost";
      s.trace = 0;
      out.push({ t: "session: localhost", c: "sys" });
    } else if (s.trace >= 70) {
      out.push({ t: `[TRACE ${s.trace}%] they're almost on you — 'dc' now.`, c: "err" });
    } else if (s.trace >= 40) {
      out.push({ t: `[TRACE ${s.trace}%]`, c: "warn" });
    }
  },

  /* ---- main dispatcher ---- */
  process(input) {
    const raw = input.trim();
    if (!raw) return [];
    const parts = raw.replace(/\s+/g, " ").split(" ");
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");
    const argl = arg.toLowerCase();
    const out = [];
    const s = this.state;
    const p = (t, c = "") => out.push({ t, c });

    /* ---- always-available ---- */
    if (cmd === "help" || cmd === "?") return this.help();
    if (cmd === "clear" || cmd === "cls") return [{ _clear: true }];
    if (cmd === "restart" || cmd === "newgame" || cmd === "reset") {
      this.newGame();
      return [{ t: "// wiping session, cold boot...", c: "sys" }, ...this.boot()];
    }

    /* ---- hidden persistence (not in help) ---- */
    if (cmd === "checkpoint" || cmd === "save") {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(s));
        p("[✓] checkpoint burned to local flash.", "ok");
        p("restore it any time with 'rollback'.", "sys");
      } catch (e) {
        p("[x] local flash unavailable (storage blocked).", "err");
      }
      return out;
    }
    if (cmd === "rollback" || cmd === "load" || cmd === "restore") {
      let data = null;
      try { data = localStorage.getItem(SAVE_KEY); } catch (e) { data = null; }
      if (!data) { p("[x] no checkpoint on local flash.", "err"); return out; }
      try {
        this.state = JSON.parse(data);
        p("[✓] checkpoint restored.", "ok");
        p(`session: ${this.state.cwd}  ·  trace ${this.state.trace}%`, "sys");
      } catch (e) { p("[x] checkpoint corrupted.", "err"); }
      return out;
    }

    if (cmd === "whoami") return [{ t: s.flags.truth ? "you already read who you are." : "ghost  (uid=0 on localhost)" }];
    if (cmd === "pwd") return [{ t: `//${s.cwd}` }];
    if (cmd === "time" || cmd === "clock") {
      const n = new Date(), pd = x => String(x).padStart(2, "0");
      return [{ t: `wall clock ${pd(n.getHours())}:${pd(n.getMinutes())}:${pd(n.getSeconds())}`, c: "head" }];
    }
    if (cmd === "sudo") return [{ t: "you already have root where it matters. save it for HELIOS.", c: "sys" }];

    /* ---- ending choice (available at the core once the truth is out) ---- */
    if (cmd === "leak" || cmd === "purge") {
      if (!s.flags.truth) { p("nothing to decide yet. find the proof first.", "sys"); return out; }
      if (s.over) { p("it's already done. type 'restart'.", "sys"); return out; }
      return cmd === "leak" ? this._endLeak() : this._endPurge();
    }

    if (s.over) return [{ t: "the job's over. 'restart' to run it again, 'rollback' to step back.", c: "sys" }];

    /* ---- navigation ---- */
    if (cmd === "scan") return this._scan();
    if (cmd === "map") return this._map();
    if (cmd === "status") return this._status();
    if (cmd === "mail" || cmd === "inbox") return this._mail(arg);

    if (cmd === "connect" || cmd === "ssh" || cmd === "co") {
      const target = this._resolve(argl);
      if (!argl) { p("connect to what? try 'scan'.", "sys"); return out; }
      if (!target) { p(`no route to '${arg}'. 'scan' shows what's reachable.`, "err"); return out; }
      if (target === s.cwd) { p(`already on ${target}.`, "sys"); return out; }
      s.cwd = target;
      s.trace = 0;
      s.traced = false;
      const n = this.node();
      p(`linking to ${n.host} (${n.ip})...`, "sys");
      p(n.admin ? "session: ADMIN" : "session: guest — locks engaged.", n.admin ? "ok" : "warn");
      if (!n.admin) p("run 'probe' to see the locks.", "sys");
      return out;
    }
    if (cmd === "dc" || cmd === "disconnect" || cmd === "exit" || cmd === "logout") {
      if (s.cwd === "localhost") { p("already home.", "sys"); return out; }
      s.cwd = "localhost"; s.trace = 0; s.traced = false;
      p("disconnected. session: localhost", "sys");
      return out;
    }

    /* everything below needs a live node */
    const n = this.node();

    if (cmd === "probe" || cmd === "nmap") {
      if (n.home) { p("localhost. nothing to break here — it's yours.", "sys"); return out; }
      p(`── ${n.host} (${n.ip}) ──`, "head");
      if (n.admin) { p("ADMIN already. no locks left.", "ok"); return out; }
      const open = Object.values(n.ports).filter(Boolean).length;
      p(`security: ${n.reqPorts} locks required · ${open}/${Object.keys(n.ports).length} ports open`);
      Object.keys(n.ports).forEach(k => {
        const label = { ssh: "22  ssh ", ftp: "21  ftp ", http: "80  http" }[k] || k;
        p(`  port ${label}  ${n.ports[k] ? "[OPEN]" : "[shut]"}`, n.ports[k] ? "ok" : "");
      });
      if (n.needsPass) p("  ! core also demands the sealed password.", "warn");
      this._tick(out);
      return out;
    }

    if (cmd === "sshcrack" || cmd === "ftpbounce" || cmd === "webexploit") {
      const map = { sshcrack: "ssh", ftpbounce: "ftp", webexploit: "http" };
      const port = map[cmd];
      if (!this.has(cmd)) { p(`you don't have ${cmd}. take it from a machine that does.`, "err"); return out; }
      if (n.home) { p("that's your own box. nothing to open.", "sys"); return out; }
      if (n.admin) { p("already admin here.", "sys"); return out; }
      if (!(port in n.ports)) { p(`${n.host} has no ${port} port to hit.`, "err"); return out; }
      if (n.ports[port]) { p(`${port} is already open.`, "sys"); return out; }
      n.ports[port] = true;
      p(`${cmd}: hammering ${port}...`, "sys");
      p(`[+] port ${port} OPEN`, "ok");
      this._tick(out);
      return out;
    }

    if (cmd === "porthack" || cmd === "crack") {
      if (n.home) { p("you're already root at home.", "sys"); return out; }
      if (n.admin) { p("you already own this node.", "sys"); return out; }
      const open = Object.values(n.ports).filter(Boolean).length;
      if (open < n.reqPorts) { p(`porthack: ${open}/${n.reqPorts} locks open. not enough.`, "err"); return out; }
      if (n.needsPass && !s.flags.decrypted) {
        p("porthack: ports fall — but the core wants the sealed password.", "err");
        p("you don't have it yet. break the cipher on the gate.", "warn");
        this._tick(out);
        return out;
      }
      n.admin = true;
      p("porthack: injecting...", "sys");
      p(`[✓] ADMIN on ${n.host}. the node is yours.`, "ok");
      p("'ls' to see what they were hiding.", "sys");
      this._tick(out);
      return out;
    }

    if (cmd === "ls" || cmd === "dir") {
      if (!n.home && !n.admin) { p("permission denied. porthack first.", "err"); return out; }
      const files = Object.keys(n.files || {});
      if (!files.length) { p("(empty)", "sys"); return out; }
      p(`files on ${n.host}:`, "sys");
      files.forEach(f => p(`  ${f}${s.downloaded.includes(n.host + "/" + f) ? "  *" : ""}`));
      return out;
    }

    if (cmd === "cat" || cmd === "read" || cmd === "less") {
      if (!argl) { p("cat what? try 'ls'.", "sys"); return out; }
      if (!n.home && !n.admin) { p("permission denied. porthack first.", "err"); return out; }
      const key = this._file(n, argl);
      if (!key) { p(`no such file: ${arg}`, "err"); return out; }
      (n.files[key]).forEach(line => p(line));
      this._applyRead(n, key, s);
      this._tick(out);
      return out;
    }

    if (cmd === "scp" || cmd === "download" || cmd === "get") {
      if (!argl) { p("scp what?", "sys"); return out; }
      if (!n.home && !n.admin) { p("permission denied. porthack first.", "err"); return out; }
      const key = this._file(n, argl);
      if (!key) { p(`no such file: ${arg}`, "err"); return out; }
      const tag = n.host + "/" + key;
      if (!s.downloaded.includes(tag)) s.downloaded.push(tag);
      p(`[✓] ${key} copied to localhost.`, "ok");
      this._tick(out);
      return out;
    }

    if (cmd === "decrypt" || cmd === "dec") {
      if (!n.admin && !n.home) { p("permission denied.", "err"); return out; }
      const key = this._file(n, argl);
      if (!key) { p("decrypt what? name a file (e.g. vault.enc).", "sys"); return out; }
      if (key !== "vault.enc") { p(`${key} isn't encrypted.`, "sys"); return out; }
      if (!s.flags.hasKey) { p("you don't know the shift. find the cipher key first.", "err"); return out; }
      p("decryptor: applying caesar shift 13...", "sys");
      p("  CORE PASS: ICARUS-1987", "ok");
      p("  do not be caught.", "sys");
      s.flags.decrypted = true;
      p("[+] sealed password recovered. the core will take it now.", "ok");
      this._tick(out);
      return out;
    }

    /* ---- flavour ---- */
    if (cmd === "ping") { p("pong. the network hears you. maybe that's not good.", "sys"); return out; }
    if (cmd === "veil") { p("you don't call VEIL. VEIL calls you. ('mail')", "sys"); return out; }

    p(`${cmd}: command not found. 'help' lists what works.`, "sys");
    return out;
  },

  _resolve(q) {
    if (!q) return null;
    const s = this.state;
    for (const id of s.discovered) {
      const n = s.nodes[id];
      if (id === q || n.host.toLowerCase() === q || n.ip === q) return id;
    }
    return null;
  },

  _file(n, q) {
    if (!n.files) return null;
    if (n.files[q]) return q;
    const keys = Object.keys(n.files);
    return keys.find(k => k.toLowerCase() === q) ||
           keys.find(k => k.toLowerCase().startsWith(q)) || null;
  },

  _scan() {
    const s = this.state, out = [];
    out.push({ t: "reachable nodes:", c: "head" });
    s.discovered.forEach(id => {
      const n = s.nodes[id];
      const here = id === s.cwd ? " <" : "";
      const tag = n.home ? "home " : n.admin ? "admin" : "locked";
      out.push({ t: `  ${n.host.padEnd(13)} ${n.ip.padEnd(15)} [${tag}]${here}`, c: n.admin ? "ok" : "" });
    });
    out.push({ t: "connect <host> to open a session.", c: "sys" });
    return out;
  },

  _map() {
    const s = this.state, out = [];
    const chain = ["localhost", "nx-relay", "helios-gate", "helios-core"];
    out.push({ t: "known network:", c: "head" });
    chain.forEach((id, i) => {
      if (!s.discovered.includes(id)) { out.push({ t: "   ?  (undiscovered)", c: "sys" }); return; }
      const n = s.nodes[id];
      const mark = n.home ? "◆" : n.admin ? "◆" : "○";
      const arrow = i === 0 ? "  " : "→ ";
      out.push({ t: `  ${arrow}${mark} ${n.host}${id === s.cwd ? "   *you*" : ""}`, c: n.admin ? "ok" : "" });
    });
    return out;
  },

  _status() {
    const s = this.state, out = [];
    out.push({ t: "── MISSION ──", c: "head" });
    out.push({ t: `node:   ${s.cwd}` });
    out.push({ t: `trace:  ${s.trace}%`, c: s.trace >= 40 ? "warn" : "" });
    const tools = Object.keys(s.tools).filter(t => s.tools[t]).join(", ") || "(none)";
    out.push({ t: `tools:  ${tools}` });
    out.push({ t: `proof:  ${s.flags.decrypted ? "password recovered" : s.flags.hasKey ? "cipher key found" : "not yet"}` });
    out.push({ t: `files:  ${s.downloaded.length} copied to localhost` });
    if (s.flags.truth) out.push({ t: "decision open: 'leak' or 'purge'.", c: "warn" });
    return out;
  },

  _mail(arg) {
    const s = this.state, out = [];
    const idx = parseInt(arg, 10);
    if (!arg) {
      out.push({ t: "── INBOX ──", c: "head" });
      s.inbox.forEach((m, i) => {
        out.push({ t: `  [${i + 1}] ${m.read ? " " : "•"} ${m.from}: ${m.subj}`, c: m.read ? "sys" : "" });
      });
      out.push({ t: "read one with 'mail <n>'.", c: "sys" });
      return out;
    }
    const m = s.inbox[idx - 1];
    if (!m) { out.push({ t: `no message ${arg}.`, c: "err" }); return out; }
    m.read = true;
    out.push({ t: `from: ${m.from}`, c: "head" });
    out.push({ t: `subj: ${m.subj}`, c: "sys" });
    out.push({ t: "" });
    m.body.forEach(line => out.push({ t: line, c: m.from === "VEIL" ? "veil" : "" }));
    return out;
  },

  _endLeak() {
    const s = this.state;
    s.over = true; s.ending = "leak";
    return [
      { t: "" },
      { t: "you push every file to every wire at once.", c: "head" },
      { t: "the Icarus figures. the fire. the names. all of it, public.", c: "" },
      { t: "HELIOS is a headline before dawn. then a case number.", c: "" },
      { t: "so are you. VEIL's last packet is a single word: 'run.'", c: "veil" },
      { t: "you kill the light and go. the truth is loud now —", c: "" },
      { t: "and it will never stop being loud enough to hunt you.", c: "sys" },
      { t: "" },
      { t: "╔════════════════════════════════════╗", c: "head" },
      { t: "║   ENDING A — THE LEAK              ║", c: "head" },
      { t: "║   they know. everyone knows.       ║", c: "head" },
      { t: "╚════════════════════════════════════╝", c: "head" },
      { t: "'restart' to run it again — the other way.", c: "sys" },
    ];
  },

  _endPurge() {
    const s = this.state;
    s.over = true; s.ending = "purge";
    return [
      { t: "" },
      { t: "you don't leak it. you erase it.", c: "head" },
      { t: "the dossier, the core, the relay, your own trail behind you —", c: "" },
      { t: "block by block, until the network forgets it ever held you.", c: "" },
      { t: "VEIL goes quiet mid-sentence. no trap needs a door", c: "veil" },
      { t: "when there's nothing left to guard.", c: "veil" },
      { t: "the proof is gone. so is HELIOS. so, almost, are you.", c: "" },
      { t: "no one will ever know. that was the price.", c: "sys" },
      { t: "" },
      { t: "╔════════════════════════════════════╗", c: "head" },
      { t: "║   ENDING B — THE PURGE             ║", c: "head" },
      { t: "║   clean. silent. unproven.         ║", c: "head" },
      { t: "╚════════════════════════════════════╝", c: "head" },
      { t: "'restart' to run it again — the other way.", c: "sys" },
    ];
  },
};

function initGame() {
  const output = document.getElementById("game-output");
  const input = document.getElementById("game-input");
  const term = document.getElementById("nightfall-terminal");
  if (!output || !input || !term) return;

  const clockEl = document.getElementById("term-clock");
  const nodeEl = document.getElementById("hud-node");
  const traceEl = document.getElementById("hud-trace");
  const statusEl = document.getElementById("hud-status");

  const history = [];
  let histIdx = -1;
  const pad = n => String(n).padStart(2, "0");

  function updateHUD() {
    if (clockEl) {
      const n = new Date();
      clockEl.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    }
    const h = GAME.hud();
    if (nodeEl) nodeEl.textContent = h.node;
    if (traceEl) {
      traceEl.textContent = `${h.trace}%`;
      traceEl.classList.toggle("high", h.trace >= 70);
    }
    if (statusEl) {
      statusEl.textContent = h.status;
      statusEl.className = "hud-status " + h.cls;
    }
    term.classList.toggle("danger", h.trace >= 70 && !GAME.state.over);
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

  GAME.newGame();
  const boot = GAME.boot();
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
