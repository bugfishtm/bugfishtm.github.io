/* ============================================================
   BUGFISH TOOLS — fun.js
   BPM tapper & metronome, Breach Protocol (hacking puzzle) and
   Snake. Game state is plain data.
   ============================================================ */

/* Game scores are kept in memory for this visit. They are written to
   the visitor's device only while "remember on this device" is ticked
   (an explicit request, § 25 (2) no. 2 TDDDG); unticking deletes the
   stored copy again. Keys are listed in STORAGE_KEYS (tools.js). */
const GAME_MEM = {};
function gameStore(key, def) {
  const saved = TK.store.get(key, null);
  if (!(key in GAME_MEM)) GAME_MEM[key] = saved !== null ? saved : def;
  return {
    remember: saved !== null,
    get data() { return GAME_MEM[key]; },
    set(v) { GAME_MEM[key] = v; if (this.remember) TK.store.set(key, v); },
    toggle(on) { this.remember = on; if (on) TK.store.set(key, GAME_MEM[key]); else TK.store.del(key); },
  };
}
const rememberHtml = (id, on) => `<label class="tk-check" title="Only while ticked, your score is saved in this browser — never sent anywhere. Untick to delete it.">
  <input type="checkbox" id="${id}"${on ? " checked" : ""}> remember on this device</label>`;

/* ============================================================
   BPM tapper & metronome (Web Audio lookahead scheduler)
   ============================================================ */
Toolbox.define("bpm", root => {
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <h3 class="tk-h">// tap tempo</h3>
        <button class="btn" id="bp-tap" type="button" style="width:100%;height:120px;font-size:22px;letter-spacing:4px">TAP</button>
        <p class="tk-note" style="margin-top:8px">Click, tap, or press <code>T</code> / <code>Space</code> on the beat. Pausing 2 seconds starts over.</p>
        <div class="tk-grid three" style="margin-top:12px">
          <div class="tk-stat"><b id="bp-bpm">—</b><span>BPM</span></div>
          <div class="tk-stat"><b id="bp-round">—</b><span>rounded</span></div>
          <div class="tk-stat"><b id="bp-taps">0</b><span>taps</span></div>
        </div>
        <div class="tk-row" style="margin-top:10px"><button class="btn ghost small" id="bp-use" type="button">use for metronome →</button><button class="tk-copy" id="bp-reset" type="button">reset</button><span class="tk-note" id="bp-stab"></span></div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// metronome</h3>
        <label class="tk-field"><span class="tk-label">Tempo <em id="mt-bpm-v">120 BPM</em></span><input type="range" id="mt-bpm" min="30" max="300" value="120"></label>
        <div class="tk-grid three" style="margin-top:12px">
          <label class="tk-field"><span class="tk-label">Beats / bar</span><input class="tk-input" id="mt-beats" type="number" min="1" max="16" value="4"></label>
          <label class="tk-field"><span class="tk-label">Subdivision</span><select class="tk-select" id="mt-sub"><option value="1">♩</option><option value="2">♪♪</option><option value="3">triplets</option><option value="4">16ths</option></select></label>
          <label class="tk-field"><span class="tk-label">Volume <em id="mt-vol-v">70%</em></span><input type="range" id="mt-vol" min="0" max="100" value="70"></label>
        </div>
        <div class="tk-row" id="mt-dots" style="margin:16px 0;justify-content:center;gap:10px"></div>
        <div class="tk-row"><button class="btn" id="mt-go" type="button" style="flex:1">▶ Start</button>
          <button class="btn ghost" data-nudge="-1" type="button">−1</button><button class="btn ghost" data-nudge="1" type="button">+1</button></div>
      </section>
    </div>
    <section class="tk-panel"><h3 class="tk-h">// delay times at <span id="dl-bpm">120</span> BPM</h3><div class="tk-scroll" id="dl-out"></div></section>`;
  const $ = s => root.querySelector(s);
  let taps = [], ctx = null, timer = null, nextTime = 0, tick = 0;
  const dots = () => { $("#mt-dots").innerHTML = Array.from({ length: +$("#mt-beats").value || 4 }, (_, i) => `<span data-dot="${i}" style="width:18px;height:18px;border-radius:50%;border:1px solid var(--border2);background:var(--bg)"></span>`).join(""); };

  function tap() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    if (taps.length > 24) taps.shift();
    $("#bp-taps").textContent = taps.length;
    if (taps.length < 2) { $("#bp-bpm").textContent = "…"; return; }
    const iv = taps.slice(1).map((t, i) => t - taps[i]);
    const avg = iv.reduce((a, b) => a + b, 0) / iv.length;
    const bpm = 60000 / avg;
    const sd = Math.sqrt(iv.reduce((a, b) => a + (b - avg) ** 2, 0) / iv.length);
    $("#bp-bpm").textContent = bpm.toFixed(1);
    $("#bp-round").textContent = Math.round(bpm);
    $("#bp-stab").textContent = taps.length > 3 ? `timing spread ±${Math.round(sd)} ms` : "";
    const b = $("#bp-tap");
    b.style.transform = "scale(0.97)";
    setTimeout(() => { b.style.transform = ""; }, 80);
  }
  function delays() {
    const bpm = +$("#mt-bpm").value;
    $("#dl-bpm").textContent = bpm;
    const q = 60000 / bpm;
    const notes = [["1/1", 4], ["1/2", 2], ["1/4", 1], ["1/8", 0.5], ["1/16", 0.25], ["1/32", 0.125]];
    $("#dl-out").innerHTML = `<table class="tk-table"><thead><tr><th>note</th><th>straight</th><th>dotted</th><th>triplet</th><th>LFO rate</th></tr></thead><tbody>` +
      notes.map(([n, f]) => { const ms = q * f; return `<tr><td class="mono">${n}</td><td class="mono">${ms.toFixed(1)} ms</td><td class="mono">${(ms * 1.5).toFixed(1)} ms</td><td class="mono">${(ms * 2 / 3).toFixed(1)} ms</td><td class="mono">${(1000 / ms).toFixed(3)} Hz</td></tr>`; }).join("") + `</tbody></table>`;
  }
  function schedule() {
    const bpm = +$("#mt-bpm").value, sub = +$("#mt-sub").value, beats = Math.max(1, +$("#mt-beats").value || 4);
    const step = 60 / bpm / sub;
    while (nextTime < ctx.currentTime + 0.12) {
      const beat = Math.floor(tick / sub) % beats, isBeat = tick % sub === 0;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.frequency.value = isBeat ? (beat === 0 ? 1600 : 1000) : 700;
      const vol = (+$("#mt-vol").value / 100) * (isBeat ? 1 : 0.45);
      g.gain.setValueAtTime(vol, nextTime);
      g.gain.exponentialRampToValueAtTime(0.0001, nextTime + 0.05);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(nextTime); osc.stop(nextTime + 0.06);
      if (isBeat) {
        const at = nextTime, b = beat;
        setTimeout(() => {
          root.querySelectorAll("[data-dot]").forEach(d => { const on = +d.dataset.dot === b; d.style.background = on ? (b === 0 ? "var(--orange)" : "var(--orange-dim)") : "var(--bg)"; d.style.boxShadow = on ? "0 0 12px var(--orange-glow)" : "none"; });
        }, Math.max(0, (at - ctx.currentTime) * 1000));
      }
      nextTime += step;
      tick++;
    }
  }
  function stop() {
    clearInterval(timer); timer = null;
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    $("#mt-go").textContent = "▶ Start";
    root.querySelectorAll("[data-dot]").forEach(d => { d.style.background = "var(--bg)"; d.style.boxShadow = "none"; });
  }
  $("#mt-go").addEventListener("click", () => {
    if (timer) { stop(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { TK.toast("Web Audio is not available in this browser"); return; }
    ctx = new AC();
    tick = 0; nextTime = ctx.currentTime + 0.06;
    timer = setInterval(schedule, 25);
    schedule();
    $("#mt-go").textContent = "■ Stop";
  });
  const setBpm = v => { $("#mt-bpm").value = Math.min(300, Math.max(30, Math.round(v))); $("#mt-bpm-v").textContent = `${$("#mt-bpm").value} BPM`; delays(); };
  $("#mt-bpm").addEventListener("input", () => setBpm(+$("#mt-bpm").value));
  root.addEventListener("click", e => { const n = e.target.closest("[data-nudge]"); if (n) setBpm(+$("#mt-bpm").value + +n.dataset.nudge); });
  $("#mt-vol").addEventListener("input", () => { $("#mt-vol-v").textContent = `${$("#mt-vol").value}%`; });
  $("#mt-beats").addEventListener("change", dots);
  $("#bp-tap").addEventListener("pointerdown", e => { e.preventDefault(); tap(); });
  $("#bp-use").addEventListener("click", () => { if (taps.length > 1) setBpm(+$("#bp-round").textContent); });
  $("#bp-reset").addEventListener("click", () => { taps = []; $("#bp-taps").textContent = 0; $("#bp-bpm").textContent = "—"; $("#bp-round").textContent = "—"; $("#bp-stab").textContent = ""; });
  const onKey = e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.repeat) return;
    if (e.key === "t" || e.key === "T" || (e.key === " " && !e.target.closest("button"))) { e.preventDefault(); tap(); }
  };
  document.addEventListener("keydown", onKey);
  dots();
  delays();
  return () => { stop(); document.removeEventListener("keydown", onKey); };
});

/* ============================================================
   Breach Protocol
   ------------------------------------------------------------
   Pick a code from the top row, then alternate: same column,
   same row, same column … Every pick lands in the buffer. Upload
   a daemon by getting its sequence into the buffer in order.
   Puzzles are generated from a hidden valid path, so all daemons
   are always solvable together.
   ============================================================ */
Toolbox.define("breach", root => {
  const CODES = ["1C", "55", "BD", "E9", "7A", "FF"];
  const LEVELS = {
    easy:   { size: 5, buffer: 6, daemons: [2, 3], time: 0 },
    normal: { size: 6, buffer: 7, daemons: [2, 3, 3], time: 60 },
    hard:   { size: 7, buffer: 8, daemons: [3, 3, 4], time: 45 },
  };
  const NAMES = ["DATAMINE_V1 — copy credentials", "ICEPICK — lower firewall", "DATAMINE_V3 — dump the vault", "CAMERA SHUTDOWN", "TRACE WIPE"];
  const store = gameStore("bf_game_breach", { played: 0, perfect: 0, daemons: 0 });
  const stats = store.data;
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        ${TK.segHtml("bp-lvl", [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]], "normal")}
        <button class="btn small" id="bp-new" type="button">New puzzle</button>
        <span class="tk-note" id="bp-stats"></span>
        ${rememberHtml("bp-remember", store.remember)}
      </div>
    </section>
    <div class="bp-wrap">
      <section class="tk-panel">
        <div class="tk-row" style="justify-content:space-between;margin-bottom:12px">
          <span class="tk-label" style="margin:0">// code matrix</span>
          <span class="tk-badge warn" id="bp-timer" hidden></span>
        </div>
        <div class="bp-grid" id="bp-grid" role="grid" aria-label="Code matrix"></div>
        <div class="tk-msg" id="bp-msg" style="margin-top:14px"></div>
      </section>
      <section class="tk-panel">
        <div class="tk-label" style="margin-bottom:8px">// buffer</div>
        <div class="bp-buffer" id="bp-buffer"></div>
        <div class="tk-label" style="margin:18px 0 8px">// daemons</div>
        <div class="tk-grid" id="bp-daemons" style="grid-template-columns:1fr;gap:8px"></div>
        <p class="tk-note" style="margin-top:14px">Start in the <b>top row</b>. Then alternate: pick from the highlighted <b>column</b>, then the <b>row</b>, and so on.
          A daemon uploads when its codes appear in the buffer in exactly that order.</p>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  let level = "normal", S = null, clock = null, hover = null;

  function makePuzzle(cfg) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const grid = Array.from({ length: cfg.size }, () => Array.from({ length: cfg.size }, () => CODES[TK.randInt(CODES.length)]));
      const used = new Set();
      const path = [];
      let axis = "row", idx = 0, ok = true;
      for (let k = 0; k < cfg.buffer; k++) {
        const opts = [];
        for (let i = 0; i < cfg.size; i++) {
          const [r, c] = axis === "row" ? [idx, i] : [i, idx];
          if (!used.has(`${r},${c}`)) opts.push([r, c]);
        }
        if (!opts.length) { ok = false; break; }
        const [r, c] = opts[TK.randInt(opts.length)];
        used.add(`${r},${c}`);
        path.push([r, c]);
        if (axis === "row") { axis = "col"; idx = c; } else { axis = "row"; idx = r; }
      }
      if (!ok) continue;
      const seq = path.map(([r, c]) => grid[r][c]);
      const daemons = [];
      for (const len of cfg.daemons) {
        let d, tries = 0;
        do { const s = TK.randInt(seq.length - len + 1); d = seq.slice(s, s + len); tries++; }
        while (tries < 30 && daemons.some(x => x.join() === d.join()));
        daemons.push(d);
      }
      // Reject puzzles where one daemon is inside another (it would be a free win).
      if (daemons.some((a, i) => daemons.some((b, j) => i !== j && b.join(" ").includes(a.join(" "))))) continue;
      return { grid, daemons, solution: path };
    }
    return null;
  }

  function newGame() {
    clearInterval(clock);
    const cfg = LEVELS[level];
    const p = makePuzzle(cfg);
    S = { cfg, grid: p.grid, daemons: p.daemons.map((seq, i) => ({ seq, name: NAMES[(i + TK.randInt(NAMES.length)) % NAMES.length], state: "open" })),
      buffer: [], used: [], axis: "row", idx: 0, over: false, left: cfg.time, started: false };
    TK.msg($("#bp-msg"), "pick any code in the highlighted top row to start");
    $("#bp-timer").hidden = !cfg.time;
    $("#bp-timer").textContent = cfg.time ? `${cfg.time}s` : "";
    render();
  }

  const inLane = (r, c) => (S.axis === "row" ? r === S.idx : c === S.idx);
  const isUsed = (r, c) => S.used.some(([a, b]) => a === r && b === c);
  function render() {
    const n = S.cfg.size;
    const grid = $("#bp-grid");
    grid.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
    let html = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const used = isUsed(r, c), lane = !S.over && inLane(r, c), pick = lane && !used;
      const next = hover && !S.over && !used && (S.axis === "row" ? c === hover[1] && r !== hover[0] : r === hover[0] && c !== hover[1]) && !(hover[0] === r && hover[1] === c);
      html += `<button type="button" class="bp-cell${lane ? " lane" : ""}${pick ? " pick" : ""}${used ? " used" : ""}${next ? " hint" : ""}" data-r="${r}" data-c="${c}"
        ${pick ? "" : "disabled"} aria-label="${S.grid[r][c]} row ${r + 1} column ${c + 1}">${used ? "[ ]" : S.grid[r][c]}</button>`;
    }
    grid.innerHTML = html;
    $("#bp-buffer").innerHTML = Array.from({ length: S.cfg.buffer }, (_, i) => `<span class="bp-slot${S.buffer[i] ? " filled" : ""}">${S.buffer[i] || ""}</span>`).join("");
    $("#bp-daemons").innerHTML = S.daemons.map(d => {
      const k = d.state === "open" ? overlap(d.seq) : 0;
      return `<div class="bp-daemon ${d.state === "done" ? "done" : d.state === "failed" ? "failed" : ""}"><span class="name">${esc(d.name)}${d.state === "done" ? " — uploaded" : d.state === "failed" ? " — failed" : ""}</span>
        <span class="seq">${d.seq.map((c, i) => `<span class="${i < k ? "hit" : ""}">${c}</span>`).join("")}</span></div>`;
    }).join("");
    $("#bp-stats").textContent = `played ${stats.played} · perfect ${stats.perfect} · daemons uploaded ${stats.daemons}`;
  }
  /* Longest suffix of the buffer that is a prefix of the daemon. */
  function overlap(seq) {
    for (let k = Math.min(seq.length - 1, S.buffer.length); k > 0; k--) {
      if (S.buffer.slice(-k).join() === seq.slice(0, k).join()) return k;
    }
    return 0;
  }
  const contains = seq => { const b = S.buffer.join(" "), s = seq.join(" "); return (` ${b} `).includes(` ${s} `); };

  function pick(r, c) {
    if (S.over || !inLane(r, c) || isUsed(r, c)) return;
    if (!S.started && S.cfg.time) startClock();
    S.started = true;
    S.used.push([r, c]);
    S.buffer.push(S.grid[r][c]);
    if (S.axis === "row") { S.axis = "col"; S.idx = c; } else { S.axis = "row"; S.idx = r; }
    const room = S.cfg.buffer - S.buffer.length;
    S.daemons.forEach(d => {
      if (d.state !== "open") return;
      if (contains(d.seq)) d.state = "done";
      else if (d.seq.length - overlap(d.seq) > room) d.state = "failed";
    });
    const lanesLeft = Array.from({ length: S.cfg.size }, (_, i) => (S.axis === "row" ? [S.idx, i] : [i, S.idx])).some(([a, b]) => !isUsed(a, b));
    if (!room || S.daemons.every(d => d.state !== "open") || !lanesLeft) end(!lanesLeft && room ? "no codes left in this lane" : "");
    else TK.msg($("#bp-msg"), `${room} buffer slot${room === 1 ? "" : "s"} left — next pick from the highlighted ${S.axis === "row" ? "row" : "column"}`);
    render();
  }
  function end(reason) {
    S.over = true;
    clearInterval(clock);
    S.daemons.forEach(d => { if (d.state === "open") d.state = "failed"; });
    const won = S.daemons.filter(d => d.state === "done").length;
    stats.played++;
    stats.daemons += won;
    if (won === S.daemons.length) stats.perfect++;
    store.set(stats);
    const all = won === S.daemons.length;
    TK.msg($("#bp-msg"), `${reason ? reason + " — " : ""}${all ? "✓ FULL BREACH — every daemon uploaded." : won ? `${won} of ${S.daemons.length} daemons uploaded.` : "✗ breach failed — nothing uploaded."} Press "New puzzle".`, all ? "ok" : won ? "warn" : "err");
    render();
  }
  function startClock() {
    const t0 = Date.now(), total = S.cfg.time;
    clock = setInterval(() => {
      S.left = Math.max(0, total - Math.floor((Date.now() - t0) / 1000));
      $("#bp-timer").textContent = `${S.left}s`;
      $("#bp-timer").className = `tk-badge ${S.left <= 10 ? "err" : "warn"}`;
      if (!S.left && !S.over) end("time's up");
    }, 250);
  }
  $("#bp-grid").addEventListener("click", e => { const b = e.target.closest("[data-r]"); if (b) pick(+b.dataset.r, +b.dataset.c); });
  $("#bp-grid").addEventListener("mouseover", e => {
    const b = e.target.closest(".bp-cell.pick");
    const h = b ? [+b.dataset.r, +b.dataset.c] : null;
    if (JSON.stringify(h) !== JSON.stringify(hover)) { hover = h; render(); }
  });
  $("#bp-grid").addEventListener("mouseleave", () => { if (hover) { hover = null; render(); } });
  TK.seg($("#bp-lvl"), v => { level = v; newGame(); });
  $("#bp-new").addEventListener("click", newGame);
  $("#bp-remember").addEventListener("change", e => store.toggle(e.target.checked));
  newGame();
  return () => clearInterval(clock);
});

/* ============================================================
   Snake // terminal edition
   ============================================================ */
Toolbox.define("snake", root => {
  const N = 20;
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row" style="justify-content:space-between;margin-bottom:12px">
        <span class="tk-row tight"><span class="tk-badge warn">score <b id="sn-score">0</b></span><span class="tk-badge">best <b id="sn-best">0</b></span><span class="tk-badge info">speed <b id="sn-speed">1</b></span></span>
        <span class="tk-row"><label class="tk-check"><input type="checkbox" id="sn-wrap"> walls wrap around</label>
          ${rememberHtml("sn-remember", TK.store.has("bf_game_snake"))}</span>
      </div>
      <div class="snake-stage">
        <canvas id="sn-cv" width="560" height="560" aria-label="Snake game board"></canvas>
        <div class="snake-overlay" id="sn-ov"><h3 id="sn-title">SNAKE.EXE</h3><p class="tk-note" id="sn-sub">arrows / WASD · swipe on touch screens · P to pause</p>
          <button class="btn" id="sn-start" type="button">Start</button></div>
      </div>
      <div class="snake-pad"><span class="sp"></span><button class="btn ghost" data-d="up" type="button" aria-label="up">▲</button><span class="sp"></span>
        <button class="btn ghost" data-d="left" type="button" aria-label="left">◀</button><button class="btn ghost" data-d="pause" type="button" aria-label="pause">❚❚</button><button class="btn ghost" data-d="right" type="button" aria-label="right">▶</button>
        <span class="sp"></span><button class="btn ghost" data-d="down" type="button" aria-label="down">▼</button><span class="sp"></span></div>
    </section>`;
  const $ = s => root.querySelector(s);
  const cv = $("#sn-cv"), cx = cv.getContext("2d");
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  let S = null, raf = 0, last = 0, acc = 0;
  const store = gameStore("bf_game_snake", 0);
  let best = store.data;
  $("#sn-best").textContent = best;
  $("#sn-remember").addEventListener("change", e => store.toggle(e.target.checked));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#ff6600";
  const COL = { orange: css("--orange"), soft: css("--orange-soft"), dim: css("--orange-dim"), cyan: css("--cyan"), grid: "#12131a", bg: "#07080a" };

  function reset() {
    S = { snake: [[9, 10], [8, 10], [7, 10]], dir: "right", queue: [], food: null, score: 0, rate: 7, state: "ready", grow: 0 };
    placeFood();
  }
  function placeFood() {
    const free = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (!S.snake.some(([a, b]) => a === x && b === y)) free.push([x, y]);
    S.food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }
  function turn(d) {
    if (!S || S.state !== "run") return;
    const lastDir = S.queue.length ? S.queue[S.queue.length - 1] : S.dir;
    const [a, b] = DIRS[d], [c, e] = DIRS[lastDir];
    if (a === -c && b === -e) return; // no 180° turns
    if (d !== lastDir && S.queue.length < 2) S.queue.push(d);
  }
  function step() {
    if (S.queue.length) S.dir = S.queue.shift();
    const [dx, dy] = DIRS[S.dir];
    let [x, y] = S.snake[0];
    x += dx; y += dy;
    if ($("#sn-wrap").checked) { x = (x + N) % N; y = (y + N) % N; }
    const body = S.snake.slice(0, S.grow ? S.snake.length : -1);
    if (x < 0 || y < 0 || x >= N || y >= N || body.some(([a, b]) => a === x && b === y)) return over();
    S.snake.unshift([x, y]);
    if (S.grow) S.grow--; else S.snake.pop();
    if (S.food && x === S.food[0] && y === S.food[1]) {
      S.score += 10 + Math.floor(S.rate - 7) * 2;
      S.grow += 2;
      S.rate = Math.min(20, S.rate + 0.35);
      placeFood();
      $("#sn-score").textContent = S.score;
      $("#sn-speed").textContent = Math.round((S.rate - 6) * 10) / 10;
    }
  }
  function over() {
    S.state = "over";
    if (S.score > best) { best = S.score; store.set(best); $("#sn-best").textContent = best; }
    overlay("CONNECTION LOST", `score ${S.score}${S.score && S.score === best ? " — new high score" : ""}`, "Play again");
  }
  function overlay(t, sub, btn) {
    $("#sn-title").textContent = t;
    $("#sn-sub").textContent = sub;
    $("#sn-start").textContent = btn;
    $("#sn-ov").hidden = false;
  }
  function draw(t) {
    const c = cv.width / N;
    cx.fillStyle = COL.bg;
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.strokeStyle = COL.grid;
    cx.lineWidth = 1;
    for (let i = 1; i < N; i++) { cx.beginPath(); cx.moveTo(i * c + 0.5, 0); cx.lineTo(i * c + 0.5, cv.height); cx.moveTo(0, i * c + 0.5); cx.lineTo(cv.width, i * c + 0.5); cx.stroke(); }
    if (S.food) {
      const p = 0.5 + 0.5 * Math.sin(t / 180);
      cx.shadowColor = COL.cyan; cx.shadowBlur = 10 + p * 10;
      cx.fillStyle = COL.cyan;
      cx.fillRect(S.food[0] * c + 5, S.food[1] * c + 5, c - 10, c - 10);
      cx.shadowBlur = 0;
    }
    S.snake.forEach(([x, y], i) => {
      cx.fillStyle = i === 0 ? COL.soft : i % 2 ? COL.orange : COL.dim;
      if (i === 0) { cx.shadowColor = COL.orange; cx.shadowBlur = 14; }
      cx.fillRect(x * c + 2, y * c + 2, c - 4, c - 4);
      cx.shadowBlur = 0;
    });
    const [hx, hy] = S.snake[0], [dx, dy] = DIRS[S.dir];
    cx.fillStyle = COL.bg;
    const ex = hx * c + c / 2 + dx * c * 0.18, ey = hy * c + c / 2 + dy * c * 0.18;
    cx.fillRect(ex - (dy ? c * 0.22 : 2) - 2, ey - (dx ? c * 0.22 : 2) - 2, 4, 4);
    cx.fillRect(ex + (dy ? c * 0.22 : -2) - 2, ey + (dx ? c * 0.22 : -2) - 2, 4, 4);
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(250, t - (last || t));
    last = t;
    if (S.state === "run") {
      acc += dt;
      const iv = 1000 / S.rate;
      while (acc >= iv && S.state === "run") { acc -= iv; step(); }
    }
    draw(t);
  }
  function start() {
    if (!S || S.state === "over" || S.state === "ready") reset();
    S.state = "run";
    acc = 0;
    $("#sn-ov").hidden = true;
    $("#sn-score").textContent = S.score;
    $("#sn-speed").textContent = Math.round((S.rate - 6) * 10) / 10;
    cv.focus && cv.focus();
  }
  function pause() {
    if (!S) return;
    if (S.state === "run") { S.state = "pause"; overlay("PAUSED", "press P, Space or the button to resume", "Resume"); }
    else if (S.state === "pause") { S.state = "run"; $("#sn-ov").hidden = true; }
  }
  const KEYS = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  const onKey = e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (KEYS[e.code] && S && S.state === "run") { e.preventDefault(); turn(KEYS[e.code]); }
    else if (e.code === "KeyP" || (e.code === "Space" && S && (S.state === "run" || S.state === "pause"))) { e.preventDefault(); pause(); }
    else if ((e.code === "Enter" || e.code === "Space") && S && S.state !== "run" && !$("#sn-ov").hidden && S.state !== "pause") { e.preventDefault(); start(); }
  };
  let touch = null;
  cv.addEventListener("touchstart", e => { const t = e.touches[0]; touch = [t.clientX, t.clientY]; }, { passive: true });
  cv.addEventListener("touchmove", e => { if (S && S.state === "run") e.preventDefault(); }, { passive: false });
  cv.addEventListener("touchend", e => {
    if (!touch) return;
    const t = e.changedTouches[0], dx = t.clientX - touch[0], dy = t.clientY - touch[1];
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  });
  root.querySelector(".snake-pad").addEventListener("click", e => {
    const b = e.target.closest("[data-d]");
    if (!b) return;
    if (b.dataset.d === "pause") pause(); else if (S && S.state === "run") turn(b.dataset.d); else start();
  });
  $("#sn-start").addEventListener("click", () => (S && S.state === "pause" ? pause() : start()));
  const onVis = () => { if (document.hidden && S && S.state === "run") pause(); };
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVis);
  reset();
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis); };
});
