/* ============================================================
   BUGFISH — home.js
   Home page: hero, matrix rain, terminal game, music player,
   about, uptime counters and the JSON-driven news section.
   Content comes from data/home.json and data/news.json.
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
    ctx.fillStyle = "rgba(26,27,30,0.06)";
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
   ZORK-STYLE TERMINAL GAME (cake.exe)
   ============================================================ */
const GAME = {
  currentRoom: "server_room",
  inventory: [],
  rooms: {
    server_room: {
      name: "HALLWAY",
      desc: "A dimly lit hallway. Orange LEDs blink across racks of humming equipment. You can see doors leading in different directions.",
      exits: { north: "code_vault", east: "music_studio", south: "art_gallery", west: "the_net" },
      items: [], visited: false,
    },
    code_vault: {
      name: "CODE VAULT",
      desc: "Rows of glowing monitors display cascading lines of PHP and JavaScript. Git commits stretch back to 2008.",
      exits: { south: "server_room" }, items: ["debugger"], visited: false,
    },
    music_studio: {
      name: "MUSIC STUDIO",
      desc: "Synthesizers and MIDI controllers cover every surface. The speakers crackle with a half-finished track.",
      exits: { west: "server_room" }, items: ["headphones"], visited: false,
    },
    art_gallery: {
      name: "ART GALLERY",
      desc: "Digital canvases cover the walls. Some pieces are dated 2012, others were rendered last night.",
      exits: { north: "server_room" }, items: ["pixel_brush"], visited: false,
    },
    the_net: {
      name: "TORTURE CHAMBER",
      desc: "You can hear screams of pain in the distance.",
      exits: { east: "server_room" }, items: ["rope"], visited: false,
    },
  },
  items: {
    debugger:   { name: "DEBUGGER",   desc: "A handheld debugger with a cracked screen. Still finds every bug on the first pass." },
    headphones: { name: "HEADPHONES", desc: "Over-ear headphones with warm pads. They play music." },
    pixel_brush:{ name: "PIXEL BRUSH",desc: "Paints one pixel at a time. Patience included." },
    rope:       { name: "ROPE",       desc: "Strong and resilient." },
  },
  cmdHistory: [],

  process(input) {
    const raw = input.trim();
    const lower = raw.toLowerCase();
    const parts = lower.split(/\s+/);
    const cmd = parts[0];
    const arg = parts.slice(1).join(" ");
    if (!cmd) return [];

    const dirMap = { n: "north", s: "south", e: "east", w: "west" };
    if (dirMap[cmd]) return this._go(dirMap[cmd]);

    switch (cmd) {
      case "help":      return this._help();
      case "look": case "l": return this._look();
      case "go":        return this._go(arg);
      case "take": case "get": return this._take(arg);
      case "drop":      return this._drop(arg);
      case "examine": case "x": return this._examine(arg);
      case "inventory": case "inv": case "i": return this._inventory();
      case "clear":     return [{ _clear: true }];
      case "ls":        return ["Hint: this isn't a real shell. Try 'look'."];
      case "pwd":       return [`/${this.currentRoom}`];
      case "sudo":      return ["Permission granted."];
      default:          return [`Command not found: '${cmd}'. Type 'help'.`];
    }
  },

  _help() {
    return [
      "─── COMMAND REFERENCE ───────────────────",
      "  look / l          examine surroundings",
      "  go [dir]          move: north south east west",
      "  n / s / e / w     shorthand directions",
      "  take [item]       pick up an item",
      "  drop [item]       drop an item",
      "  examine [item]    inspect an item",
      "  inventory / i     check your bag",
      "  clear             clear terminal",
      "─────────────────────────────────────────",
    ];
  },

  _look() {
    const room = this.rooms[this.currentRoom];
    const lines = [
      `╔═ ${room.name} ${"═".repeat(Math.max(0, 34 - room.name.length))}╗`,
      room.desc,
      `╚${"═".repeat(40)}╝`,
    ];
    lines.push(room.items.length
      ? `ITEMS    : ${room.items.map(k => this.items[k]?.name || k).join(", ")}`
      : "ITEMS    : None");
    return lines;
  },

  _go(dir) {
    const room = this.rooms[this.currentRoom];
    if (!dir) return ["Go where? Specify: north, south, east, west."];
    const dest = room.exits[dir];
    if (!dest) return [`No exit to the ${dir.toUpperCase()}.`];
    this.currentRoom = dest;
    const newRoom = this.rooms[dest];
    const out = [`> Moving ${dir.toUpperCase()}...`, ""];
    if (!newRoom.visited) {
      newRoom.visited = true;
      out.push(...this._look());
    } else {
      out.push(`[ ${newRoom.name} ]`);
      out.push(newRoom.items.length
        ? `ITEMS: ${newRoom.items.map(k => this.items[k]?.name || k).join(", ")}`
        : "ITEMS: None");
    }
    return out;
  },

  _take(name) {
    if (!name) return ["Take what?"];
    const room = this.rooms[this.currentRoom];
    const found = room.items.find(k =>
      k.includes(name) || (this.items[k]?.name || "").toLowerCase().includes(name));
    if (!found) return [`No '${name}' here.`];
    room.items = room.items.filter(k => k !== found);
    this.inventory.push(found);
    return [`Picked up: ${this.items[found]?.name || found}`];
  },

  _drop(name) {
    if (!name) return ["Drop what?"];
    const found = this.inventory.find(k =>
      k.includes(name) || (this.items[k]?.name || "").toLowerCase().includes(name));
    if (!found) return [`Not carrying '${name}'.`];
    this.inventory = this.inventory.filter(k => k !== found);
    this.rooms[this.currentRoom].items.push(found);
    return [`Dropped: ${this.items[found]?.name || found}`];
  },

  _examine(name) {
    if (!name) return ["Examine what?"];
    const all = [...this.inventory, ...this.rooms[this.currentRoom].items];
    const found = all.find(k =>
      k.includes(name) || (this.items[k]?.name || "").toLowerCase().includes(name));
    if (!found) return [`You don't see any '${name}' here.`];
    return [this.items[found]?.desc || "Nothing special."];
  },

  _inventory() {
    if (!this.inventory.length) return ["You're carrying nothing."];
    return ["CARRYING:", ...this.inventory.map(k => `  ▸ ${this.items[k]?.name || k}`)];
  },
};

function initGame() {
  const output = document.getElementById("game-output");
  const input = document.getElementById("game-input");
  const term = document.getElementById("zork-terminal");
  if (!output || !input || !term) return;

  let histIdx = -1;

  function addLine(text, type = "") {
    const d = document.createElement("div");
    d.className = text === "" ? "game-line empty" : `game-line ${type}`;
    if (text !== "") d.textContent = text;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
  }

  function printLines(lines, type = "") {
    if (!Array.isArray(lines)) lines = [lines];
    lines.forEach(ln => {
      if (typeof ln === "object" && ln._clear) { output.innerHTML = ""; return; }
      addLine(ln, type);
    });
  }

  const boot = ["Type 'help' for commands.", "Type 'look' to explore.", ""];
  let bi = 0;
  (function bootTick() {
    if (bi < boot.length) {
      addLine(boot[bi], "sys");
      bi++;
      setTimeout(bootTick, 100);
    } else {
      printLines(GAME._look());
      addLine("", "");
    }
  })();

  function submit() {
    const val = input.value.trim();
    if (!val) return;
    GAME.cmdHistory.unshift(val);
    histIdx = -1;
    addLine(`> ${val}`, "cmd");
    input.value = "";
    printLines(GAME.process(val));
    addLine("", "");
  }

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx < GAME.cmdHistory.length - 1) { histIdx++; input.value = GAME.cmdHistory[histIdx]; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) { histIdx--; input.value = GAME.cmdHistory[histIdx]; }
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
   NEWS (data/news.json) — newest first, max 50, paginated
   ============================================================ */
const NEWS_MAX = 50;
const NEWS_PER_PAGE = 10;

function initNews(newsItems) {
  const listEl = document.getElementById("news-list");
  const pagEl = document.getElementById("news-pagination");
  if (!listEl) return;

  const items = (newsItems || []).slice(0, NEWS_MAX);
  if (!items.length) {
    listEl.innerHTML = `<div class="news-empty">// no news yet</div>`;
    return;
  }

  const pages = Math.ceil(items.length / NEWS_PER_PAGE);
  let page = 1;

  function renderPage() {
    const start = (page - 1) * NEWS_PER_PAGE;
    const slice = items.slice(start, start + NEWS_PER_PAGE);
    listEl.innerHTML = slice.map(n => `
      <article class="news-item">
        <div class="news-top">
          <span class="news-title">${esc(n.title)}</span>
          ${n.category ? `<span class="news-cat">${esc(n.category)}</span>` : ""}
        </div>
        <div class="news-text">${esc(n.text)}</div>
      </article>`).join("");
    renderPagination();
  }

  function renderPagination() {
    if (!pagEl) return;
    if (pages <= 1) { pagEl.innerHTML = ""; return; }
    let html = `<button class="page-btn" data-p="${page - 1}" ${page === 1 ? "disabled" : ""}>‹</button>`;
    for (let p = 1; p <= pages; p++) {
      html += `<button class="page-btn ${p === page ? "current" : ""}" data-p="${p}">${p}</button>`;
    }
    html += `<button class="page-btn" data-p="${page + 1}" ${page === pages ? "disabled" : ""}>›</button>`;
    pagEl.innerHTML = html;
    pagEl.querySelectorAll(".page-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.dataset.p, 10);
        if (p >= 1 && p <= pages && p !== page) {
          page = p;
          renderPage();
          document.getElementById("news")?.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  renderPage();
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
    const news = await loadJSON("data/news.json");
    initNews(news);
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("news-list"), "data/news.json");
  }
});
