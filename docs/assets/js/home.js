/* ============================================================
   BUGFISH — home.js
   Start page (index.html): hero with digital rain and the ops
   monitor (every counter on one clock — live day counters and
   the operation countdown), skills ticker, the featured bento
   grid, the whoami terminal + gateways and the key-art outro
   with the channel dock.

   Content comes from data/home.json (hero, counters, about,
   soundtrack), data/featured.json (featured cards),
   data/explore.json (channel dock) and data/projects/*.json
   (project count, loaded through projects.js). Everything is
   served by this site — no network calls to third parties.

   Counters (home.json → counters), all optional except label:
     key          — small tag above the value ("SEEDER")
     label        — what is counted ("days of code") — for a
                    countdown this is the operation name
     since        — date → live day counter counting up
     until        — date + time → countdown in hours/min/sec,
                    e.g. "2026-12-20T00:00:00+01:00" (always
                    give the offset, so every visitor counts to
                    the same moment)
     status       — countdown badge while running ("In Progress")
     statusDone   — badge once the target is reached ("Evaluating")
     description  — one line under a day counter
   ============================================================ */

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(pointer: fine)").matches;
const ACCENTS = ["#ff6600", "#35c9f0", "#ff2a6d"];

/* The NIGHTFALL terminal game used to live on this page and could keep
   a save game in the visitor's browser. The game is gone — so is its
   save (nothing else is read or written here). */
try { localStorage.removeItem("nightfall_save_v1"); } catch (e) { /* storage blocked */ }

/* ---- small helpers ------------------------------------------ */
/* Only http(s), mailto and relative links from the JSON files are
   used — a typo can never become a "javascript:" link. */
function homeHref(url) {
  const raw = String(url == null ? "" : url).trim();
  if (!raw) return "";
  if (/^(https?:|mailto:)/i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return "";
  return raw;
}
const isExternal = href => /^(https?:)?\/\//i.test(href);
const linkAttrs = href => (isExternal(href) ? ' target="_blank" rel="noopener noreferrer"' : "");
const newTabHint = href => (isExternal(href) ? '<span class="sr-only"> (opens in a new tab)</span>' : "");
const safeFocus = f => (/^[a-z0-9 .%-]{1,40}$/i.test(String(f || "").trim()) ? String(f).trim() : "center");
const pad2 = n => String(n).padStart(2, "0");
const fmtInt = n => Math.max(0, Math.floor(n)).toLocaleString("en-US");
const initials = name => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

/* Accent colours from the JSON drive borders, labels and glows. A
   near-black accent would make them invisible and pure white glares,
   so both are pulled into a readable steel tone. */
function accentFor(item, i) {
  const raw = String(item.accent || "").trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(raw);
  if (!m) return ACCENTS[i % ACCENTS.length];
  const hex = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
  const lin = k => { const c = parseInt(hex.substr(k, 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  if (lum < 0.04) return "#9aa3b4";
  if (lum > 0.8) return "#d3d7df";
  return "#" + hex;
}

/* ---- reveal on scroll ----------------------------------------- */
let revealIO = null;
function observeReveal(root) {
  const els = (root || document).querySelectorAll(".rv:not(.in)");
  if (REDUCED_MOTION || !("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("in")); return; }
  if (!revealIO) {
    revealIO = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
  }
  els.forEach(el => revealIO.observe(el));
}

/* ============================================================
   DIGITAL RAIN over the hero backdrop
   ============================================================ */
function initMatrix() {
  const canvas = document.getElementById("matrix-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const chars = "01ABCDEFabcdef!@#$%^&*<>/\\[]{}|=+-~ΩΨΦΣΞΔΛΘαβγδεζηθι".split("");
  const fSize = 15;
  let cols = 0, drops = [];

  /* Only touch the canvas when its size really changed: mobile browsers
     fire resize on every URL-bar show/hide, which would restart the rain. */
  function resize() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (!w || !h || (w === canvas.width && h === canvas.height)) return;
    canvas.width = w;
    canvas.height = h;
    ctx.font = `${fSize}px monospace`; // resizing resets the context state
    const n = Math.floor(w / fSize);
    while (drops.length < n) drops.push(Math.floor(Math.random() * -60));
    drops.length = n;
    cols = n;
  }

  function draw() {
    // Fade the old glyphs out to transparency, so the backdrop stays visible.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < cols; i++) {
      const r = Math.random();
      // Mostly dim amber, an occasional bright orange, a rare blood-red.
      ctx.fillStyle = r > 0.985 ? "#ff2a3c" : r > 0.9 ? "#ff8c00" : "#8a4718";
      ctx.globalAlpha = Math.random() * 0.6 + 0.2;
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fSize, drops[i] * fSize);
      ctx.globalAlpha = 1;
      if (drops[i] * fSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  // Reduced motion: paint a still frame of "rain" and stop there.
  if (REDUCED_MOTION) {
    for (let i = 0; i < 70; i++) draw();
    return;
  }

  // No work while the hero is scrolled away or the tab is in the background.
  let onScreen = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; }).observe(canvas);
  }
  setInterval(() => { if (onScreen && !document.hidden) draw(); }, 50);
}

/* ============================================================
   HERO copy (data/home.json)
   ============================================================ */
function renderHero(cfg) {
  const $ = id => document.getElementById(id);
  if (cfg.description) $("hero-desc").textContent = cfg.description;
  if (cfg.tagline) $("hero-tagline").textContent = cfg.tagline;
  else $("hero-tagline").hidden = true;
  if (cfg.headline) $("hx-headline").textContent = cfg.headline;
  if (cfg.headlineAccent) {
    $("hx-accent").textContent = cfg.headlineAccent;
    $("hx-accent").dataset.text = cfg.headlineAccent;
  }
  // The key art: blurred into the hero backdrop, shown in full in the outro.
  if (cfg.heroImage) {
    const src = assetPath(cfg.heroImage);
    ["hx-hero-img", "hx-outro-img"].forEach(id => {
      const img = $(id);
      if (img && img.getAttribute("src") !== src) img.src = src;
    });
  }
}

/* ============================================================
   OPS MONITOR — every counter runs on one clock. Countdowns
   ("until") get the big hours : minutes : seconds display plus a
   60-tick seconds bar; day counters ("since") show the days and
   the seconds ticking along underneath.
   ============================================================ */
function initOps(counters) {
  const opsBox = document.getElementById("hx-ops-ops");
  const cntBox = document.getElementById("hx-counters");
  const sys = document.getElementById("hx-sys");
  const list = Array.isArray(counters) ? counters : [];

  const ops = [], ups = [];
  list.forEach(c => {
    if (!c || !c.label) return;
    if (c.until && !isNaN(Date.parse(c.until))) ops.push({ c, t: Date.parse(c.until) });
    else if (c.since && !isNaN(Date.parse(c.since))) ups.push({ c, t: Date.parse(c.since) });
  });

  // "2026-12-20T00:00:00+01:00" → "20.12.2026 · 00:00"
  const stamp = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(s));
    return m ? `${m[3]}.${m[2]}.${m[1]}${m[4] ? ` · ${m[4]}:${m[5]}` : ""}` : String(s);
  };

  if (opsBox) {
    opsBox.innerHTML = ops.map(({ c }, i) => {
      const words = String(c.label).trim().split(/\s+/);
      // "Operation Blood Money" → "Operation" on top, the codename below in red.
      const name = words.length > 1
        ? `${esc(words[0])} <em>${esc(words.slice(1).join(" "))}</em>`
        : `<em>${esc(words[0])}</em>`;
      return `
        <div class="hx-op" id="hx-op-${i}">
          <div class="hx-op-top">
            <span class="hx-op-kicker">${esc(c.key || "classified")} // target lock</span>
            <span class="hx-op-badge"><i aria-hidden="true"></i><b data-op-status>${esc(c.status || "In Progress")}</b></span>
          </div>
          <h2 class="hx-op-name" data-text="${esc(c.label)}">${name}</h2>
          <div class="hx-clock" role="timer" aria-label="${esc(`Time left until ${stamp(c.until)}`)}">
            <span class="seg"><b data-op-h>--</b><span>hours</span></span><i aria-hidden="true">:</i>
            <span class="seg"><b data-op-m>--</b><span>min</span></span><i aria-hidden="true">:</i>
            <span class="seg"><b data-op-s>--</b><span>sec</span></span>
          </div>
          <div class="hx-op-eval" aria-hidden="true"><b data-text="${esc(c.statusDone || "Evaluating")}">${esc(c.statusDone || "Evaluating")}</b></div>
          <div class="hx-ticks" aria-hidden="true">${"<i></i>".repeat(60)}</div>
          <div class="hx-op-meta">
            <span data-op-left>T-<b>--</b> sec</span>
            <span>target <b>${esc(stamp(c.until))}</b></span>
          </div>
        </div>`;
    }).join("");
  }

  if (cntBox) {
    cntBox.innerHTML = ups.map(({ c }, i) => `
      <div class="hx-counter">
        <span class="k">${esc(c.key || `node ${pad2(i + 1)}`)} <span>// since ${esc(String(c.since).slice(0, 4))}</span></span>
        <b data-up-days="${i}">0</b>
        <span class="u">${esc(c.label)}</span>
        <span class="s"><b data-up-secs="${i}">0</b> sec</span>
        ${c.description ? `<span class="d">${esc(c.description)}</span>` : ""}
      </div>`).join("");
    cntBox.hidden = !ups.length;
  }

  const opEls = ops.map((o, i) => {
    const root = document.getElementById(`hx-op-${i}`);
    return {
      ...o, root, done: null,
      h: root.querySelector("[data-op-h]"), m: root.querySelector("[data-op-m]"), s: root.querySelector("[data-op-s]"),
      leftBox: root.querySelector("[data-op-left]"), status: root.querySelector("[data-op-status]"),
      ticks: Array.from(root.querySelectorAll(".hx-ticks i")),
    };
  });
  const upEls = ups.map((u, i) => ({
    ...u, days: cntBox.querySelector(`[data-up-days="${i}"]`), secs: cntBox.querySelector(`[data-up-secs="${i}"]`),
  }));

  const setText = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const flash = el => { el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); };

  /* k (0..1) rolls every number up from zero once on page load. */
  function render(now, k) {
    const nd = new Date(now);
    setText(sys, `${pad2(nd.getHours())}:${pad2(nd.getMinutes())}:${pad2(nd.getSeconds())}`);

    opEls.forEach(o => {
      const left = Math.max(0, Math.floor((o.t - now) / 1000));
      const done = left <= 0;
      if (done !== o.done) {
        o.done = done;
        o.root.classList.toggle("done", done);
        setText(o.status, done ? (o.c.statusDone || "Evaluating") : (o.c.status || "In Progress"));
        o.leftBox.innerHTML = done ? "<b>target reached</b>" : "T-<b>--</b> sec";
        o.left = o.leftBox.querySelector("b");
      }
      if (done) return;
      const s = Math.floor(left * k);
      const sec = pad2(s % 60);
      if (k === 1 && o.s.textContent !== sec && !REDUCED_MOTION) flash(o.s);
      setText(o.h, pad2(Math.floor(s / 3600)));
      setText(o.m, pad2(Math.floor((s % 3600) / 60)));
      setText(o.s, sec);
      setText(o.left, fmtInt(s));
      o.ticks.forEach((t, j) => t.classList.toggle("on", j < s % 60));
    });

    upEls.forEach(u => {
      const ms = Math.max(0, now - u.t) * k;
      setText(u.days, fmtInt(ms / 86400000));
      setText(u.secs, fmtInt(ms / 1000));
    });
  }

  // Tick right on the second boundary, so every counter flips together.
  function tick() {
    render(Date.now(), 1);
    setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
  }

  if (REDUCED_MOTION) { tick(); return; }
  const t0 = performance.now(), dur = 1500;
  const intro = t => {
    const p = Math.min(1, (t - t0) / dur);
    if (p < 1) { render(Date.now(), 1 - Math.pow(1 - p, 3)); requestAnimationFrame(intro); }
    else tick();
  };
  requestAnimationFrame(intro);
}

/* ============================================================
   SKILLS TICKER (home.json → aboutSkills)
   ============================================================ */
function skillWords(cfg) {
  const words = [];
  (cfg.aboutSkills || []).forEach(r => String(r.val || "").split(/[,/]/).forEach(w => {
    const t = w.trim();
    if (t && !words.includes(t)) words.push(t);
  }));
  return words;
}

function renderMarquee(cfg) {
  const track = document.getElementById("hx-marquee");
  if (!track) return;
  const words = skillWords(cfg);
  if (!words.length) { track.parentElement.hidden = true; return; }
  // One "copy" must be wider than any screen; two copies loop seamlessly.
  let copy = words.slice();
  while (copy.length < 24) copy = copy.concat(words);
  const run = copy.map(w => `<span>${esc(w)}</span>`).join("");
  track.innerHTML = run + run;
}

/* ============================================================
   FEATURED bento (data/featured.json). The first card is the big
   one. Every card shows its background image when one is set;
   without it (or when it fails to load) the icon floats as a
   hologram over a generated backdrop — or the initials instead.
   ============================================================ */
function renderFeatured(items) {
  const sec = document.getElementById("featured");
  const box = document.getElementById("hx-bento");
  if (!box) return;
  const list = (Array.isArray(items) ? items : []).filter(it => it && it.name);
  if (!list.length) { sec.hidden = true; return; }
  const total = pad2(list.length);

  box.innerHTML = list.map((it, i) => {
    const href = homeHref(it.url);
    const ext = href && isExternal(href);
    const acc = accentFor(it, i);
    const img = it.image ? assetPath(it.image) : "";
    const icon = it.icon ? assetPath(it.icon) : "";
    const tag = href ? "a" : "div";
    const big = i === 0 && list.length > 2;
    const bg = img ? `<img class="hx-card-bg" src="${esc(img)}" alt="" loading="lazy" decoding="async" style="object-position:${esc(safeFocus(it.focus))}">` : "";
    const holo = icon
      ? `<img class="hx-card-icon" src="${esc(icon)}" alt="" loading="lazy" decoding="async">`
      : `<span class="hx-card-glyph">${esc(it.glyph || initials(it.name))}</span>`;
    return `
      <${tag} class="hx-card rv${big ? " big" : ""}${img ? " has-img" : ""}" style="--acc:${acc};--d:${i % 3}"${href ? ` href="${esc(href)}"${linkAttrs(href)}` : ""}>
        <span class="hx-card-in">
          <span class="hx-card-art" aria-hidden="true">
            ${bg}
            <span class="hx-card-ph"><span class="hx-card-grid"></span><span class="hx-card-ring"></span><span class="hx-card-halo"></span>${holo}</span>
          </span>
          <span class="hx-card-body">
            <span class="hx-card-idx">${pad2(i + 1)} / ${total}${it.tag ? ` · ${esc(it.tag)}` : ""}</span>
            <span class="hx-card-title" data-text="${esc(it.name)}">${esc(it.name)}</span>
            ${it.description ? `<span class="hx-card-desc">${esc(it.description)}</span>` : ""}
            ${href ? `<span class="hx-go">${esc(it.cta || (ext ? "Visit" : "Open"))} <i aria-hidden="true">${ext ? "↗" : "→"}</i></span>${newTabHint(href)}` : ""}
          </span>
          <span class="hx-corner tl" aria-hidden="true"></span><span class="hx-corner br" aria-hidden="true"></span>
        </span>
      </${tag}>`;
  }).join("");

  wireCardImages(box);
  wireTilt(box);
  observeReveal(box);
}

/* A broken background image falls back to the generated backdrop; a
   broken icon falls back to the initials. */
function wireCardImages(root) {
  const onFail = (img, fn) => {
    if (img.complete && !img.naturalWidth && img.getAttribute("src")) fn();
    else img.addEventListener("error", fn, { once: true });
  };
  root.querySelectorAll("img.hx-card-bg").forEach(img => onFail(img, () => {
    const card = img.closest(".hx-card");
    if (card) card.classList.remove("has-img");
    img.remove();
  }));
  root.querySelectorAll("img.hx-card-icon").forEach(img => onFail(img, () => {
    const card = img.closest(".hx-card");
    const g = document.createElement("span");
    g.className = "hx-card-glyph";
    g.textContent = initials(card ? (card.querySelector(".hx-card-title") || {}).textContent : "");
    img.replaceWith(g);
  }));
}

/* Cards lean towards the mouse and a spotlight follows it
   (mouse only, never with reduced motion). */
function wireTilt(root) {
  if (REDUCED_MOTION || !FINE_POINTER) return;
  root.querySelectorAll(".hx-card").forEach(card => {
    const inner = card.querySelector(".hx-card-in");
    const max = card.classList.contains("big") ? 3 : 6;
    let px = 0.5, py = 0.5, raf = 0;
    const apply = () => {
      raf = 0;
      inner.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      inner.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      inner.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`);
      inner.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`);
    };
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    card.addEventListener("pointerleave", () => { px = py = 0.5; if (!raf) raf = requestAnimationFrame(apply); });
  });
}

/* ============================================================
   SOUNDTRACK chip in the hero (home.json → music)
   Nothing is loaded before the visitor presses play.
   ============================================================ */
function initSoundtrack(tracks) {
  const box = document.getElementById("hx-sound");
  const list = (Array.isArray(tracks) ? tracks : []).filter(t => t && t.title && t.file);
  if (!box || !list.length) return;

  const q = s => box.querySelector(s);
  const playBtn = q("[data-sound-play]"), ico = q("[data-sound-ico]"), title = q("[data-sound-title]");
  const audio = new Audio();
  audio.preload = "none";
  audio.volume = 0.7;
  let current = 0, errorStreak = 0;

  const load = i => {
    current = (i + list.length) % list.length;
    audio.src = assetPath(list[current].file);
    title.textContent = list[current].title;
  };
  const play = () => {
    if (!audio.getAttribute("src")) load(current);
    audio.play().catch(() => { /* autoplay blocked or file missing */ });
  };
  const sync = () => {
    const on = !audio.paused;
    box.classList.toggle("playing-on", on);
    playBtn.setAttribute("aria-pressed", String(on));
    playBtn.setAttribute("aria-label", on ? "Pause the soundtrack" : "Play the soundtrack");
    ico.textContent = on ? "❚❚" : "▶";
  };

  playBtn.addEventListener("click", () => (audio.paused ? play() : audio.pause()));
  q("[data-sound-next]").addEventListener("click", () => {
    const was = !audio.paused;
    load(current + 1);
    if (was) play();
  });
  audio.addEventListener("play", sync);
  audio.addEventListener("pause", sync);
  audio.addEventListener("playing", () => { errorStreak = 0; });
  audio.addEventListener("ended", () => { load(current + 1); play(); });
  // A missing file skips to the next track instead of getting stuck; stop after one full round.
  audio.addEventListener("error", () => {
    if (!audio.getAttribute("src")) return;
    if (++errorStreak >= list.length) { sync(); return; }
    load(current + 1);
    play();
  });

  title.textContent = list[0].title;
  box.hidden = false;
}

/* ============================================================
   WHOAMI terminal (home.json → aboutBio, aboutStats, aboutSkills,
   tags)
   ============================================================ */
function renderWhoami(cfg) {
  const body = document.getElementById("hx-term-body");
  if (!body) return;
  const cmd = c => `<p class="cmd"><span class="ps">$</span> ${esc(c)}</p>`;
  const siteLink = v => {
    const s = String(v).trim();
    if (!/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+\/?$/i.test(s)) return esc(s);
    const href = /^https?:/i.test(s) ? s : `https://${s}`;
    return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(s)}</a>`;
  };

  const bio = (Array.isArray(cfg.aboutBio) ? cfg.aboutBio : []).map(p => `<p class="out">${esc(p)}</p>`).join("");
  const id = (Array.isArray(cfg.aboutStats) ? cfg.aboutStats : []).map(s =>
    `<span class="kv">${esc(String(s.key).toLowerCase())}=<b>${String(s.key).toUpperCase() === "SITE" ? siteLink(s.val) : esc(s.val)}</b></span>`).join("");
  const stack = (Array.isArray(cfg.aboutSkills) ? cfg.aboutSkills : []).map(s => {
    const chips = String(s.val || "").split(/[,/]/).map(x => x.trim()).filter(Boolean);
    return `<dt>${esc(s.key)}</dt><dd>${chips.map(c => `<span>${esc(c)}</span>`).join("")}</dd>`;
  }).join("");
  const tags = (Array.isArray(cfg.tags) ? cfg.tags : []).map(t => `<span>${esc(t)}</span>`).join("");

  body.innerHTML =
    (bio ? cmd("whoami") + bio : "") +
    (id ? cmd("id") + `<p class="out hx-id">${id}</p>` : "") +
    (stack ? cmd("cat stack.txt") + `<dl class="hx-stack">${stack}</dl>` : "") +
    (tags ? cmd("echo $TAGS") + `<p class="out hx-tags">${tags}</p>` : "") +
    `<p class="cmd"><span class="ps">$</span> <span class="hx-cursor" aria-hidden="true"></span></p>`;
}

/* ============================================================
   GATEWAYS + CHANNEL DOCK (data/explore.json, data/projects/*.json)
   ============================================================ */
async function initNetwork() {
  const dock = document.getElementById("hx-dock");
  const chanGate = document.getElementById("hx-gate-channels");
  const projGate = document.getElementById("hx-gate-projects");

  loadJSON("data/explore.json").then(items => {
    const list = (Array.isArray(items) ? items : []).filter(it => it && it.name && homeHref(it.url));
    if (!list.length) return;
    if (chanGate) chanGate.textContent = `${list.length} platforms — code, video, music, art and community.`;
    if (!dock) return;
    dock.innerHTML = list.map((it, i) => {
      const href = homeHref(it.url);
      return `<a class="hx-dock-item" href="${esc(href)}"${linkAttrs(href)} title="${esc(it.description || it.name)}" style="--d:${i % 6}">
        <span class="hx-dock-ico"><img src="${esc(assetPath(it.image))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"></span>
        <span class="hx-dock-name">${esc(it.name)}</span>${newTabHint(href)}</a>`;
    }).join("");
  }).catch(err => console.warn("Channel dock skipped:", err.message)); // optional

  // Project count from the same JSON files the projects page uses (projects.js).
  if (projGate && typeof loadAllProjects === "function") {
    const all = await loadAllProjects();
    if (all.length) {
      const cats = new Set(all.map(p => p.category)).size;
      projGate.textContent = `${all.length} projects in ${cats} categories — software, games, web apps and plugins.`;
    }
  }
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  observeReveal(document);
  initMatrix();

  const load = path => loadJSON(path).catch(err => { console.error(err); return null; });
  const [cfg, featured] = await Promise.all([load("data/home.json"), load("data/featured.json")]);

  if (cfg) {
    renderHero(cfg);
    initOps(cfg.counters);
    renderMarquee(cfg);
    renderWhoami(cfg);
    initSoundtrack(cfg.music);
  } else {
    initOps([]);
    showLoadError(document.getElementById("hx-term-body"), "data/home.json");
  }

  if (featured) renderFeatured(featured);
  else showLoadError(document.getElementById("hx-bento"), "data/featured.json");

  initNetwork();
  observeReveal(document);
});
