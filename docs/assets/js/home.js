/* ============================================================
   BUGFISH — home.js
   Start page (index.html) — the cyberpunk landing page:
   key-art hero with digital rain, live stats, skills ticker,
   featured banners, square features, a music deck with a real
   time Web Audio visualizer, the ID-card about section, a
   channels strip and the top status HUD.

   Content comes from data/home.json, data/featured.json (wide
   banners), data/features.json (square tiles) and
   data/explore.json (channels). See the *.example.json files for
   every field. Everything is served by this site — no network
   calls to third parties.
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
const safeColor = c => (/^#[0-9a-f]{3,8}$/i.test(String(c || "").trim()) ? String(c).trim() : "");
const safeFocus = f => (/^[a-z0-9 .%-]{1,40}$/i.test(String(f || "").trim()) ? String(f).trim() : "center");
const cssUrl = p => String(p).replace(/["'()\\\s]/g, c => encodeURIComponent(c));
const pad2 = n => String(n).padStart(2, "0");
const initials = name => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

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
   DIGITAL RAIN over the key art
   ============================================================ */
function initMatrix() {
  const canvas = document.getElementById("matrix-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const chars = "01ABCDEFabcdef!@#$%^&*<>/\\[]{}|=+-~`ΩΨΦΣΞΔΛΘαβγδεζηθι".split("");
  const fSize = 14;
  let cols = 0, drops = [];

  /* Only touch the canvas when its size really changed: mobile browsers
     fire resize on every URL-bar show/hide, which would restart the rain. */
  function resize() {
    const w = canvas.offsetWidth || canvas.parentElement.offsetWidth;
    const h = canvas.offsetHeight || canvas.parentElement.offsetHeight;
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    ctx.font = `${fSize}px monospace`; // resizing resets the context state
    const n = Math.floor(w / fSize);
    while (drops.length < n) drops.push(Math.floor(Math.random() * -50));
    drops.length = n;
    cols = n;
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
      ctx.fillText(ch, i * fSize, drops[i] * fSize);
      ctx.globalAlpha = 1;
      if (drops[i] * fSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener("resize", resize);

  // Reduced motion: paint a still frame of "rain" and stop there.
  if (REDUCED_MOTION) {
    for (let i = 0; i < 60; i++) draw();
    return;
  }

  // No work while the hero is scrolled away or the tab is in the background.
  let onScreen = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; }).observe(canvas);
  }
  setInterval(() => { if (onScreen && !document.hidden) draw(); }, 48);
}

/* Subtle depth: the key art and its blurred backdrop drift against each
   other with the mouse (mouse only, never with reduced motion). */
function initParallax() {
  const hero = document.getElementById("hero");
  const art = document.getElementById("hx-art");
  const bg = document.getElementById("hx-hero-bg");
  if (!hero || !art || !bg || REDUCED_MOTION || !FINE_POINTER) return;
  let tx = 0, ty = 0, raf = 0;
  const apply = () => {
    raf = 0;
    art.style.transform = `translate3d(${(tx * -12).toFixed(2)}px, ${(ty * -8).toFixed(2)}px, 0)`;
    bg.style.transform = `scale(1.12) translate3d(${(tx * 22).toFixed(2)}px, ${(ty * 14).toFixed(2)}px, 0)`;
  };
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5;
    ty = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  hero.addEventListener("pointerleave", () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(apply); });
}

/* ============================================================
   HERO copy, stats and skills ticker (data/home.json)
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
  if (cfg.heroImage) {
    const src = assetPath(cfg.heroImage);
    const img = $("hx-art-img");
  }
  renderStats(cfg.stats);
}

function renderStats(stats) {
  const box = document.getElementById("hx-stats");
  if (!box) return;
  if (!Array.isArray(stats) || !stats.length) { box.hidden = true; return; }
  box.innerHTML = stats.slice(0, 4).map(s => {
    let value = String(s.value == null ? "" : s.value);
    if (s.since) {
      const t = Date.parse(s.since);
      if (!isNaN(t)) value = String(Math.floor((Date.now() - t) / 86400000));
    }
    const m = /^(\d+)(.*)$/.exec(value);
    const href = homeHref(s.url);
    const inner = `<b${m ? ` data-count="${m[1]}" data-suffix="${esc(m[2])}"` : ""}>${esc(value)}</b><span>${esc(s.label)}</span>`;
    return href ? `<a class="hx-stat" href="${esc(href)}"${linkAttrs(href)}>${inner}${newTabHint(href)}</a>`
      : `<div class="hx-stat">${inner}</div>`;
  }).join("");
  countUpWhenVisible(box);
}

/* Numbers roll up from zero the first time the stats come into view. */
function countUpWhenVisible(root) {
  const nums = Array.from(root.querySelectorAll("b[data-count]"));
  if (!nums.length || REDUCED_MOTION || !("IntersectionObserver" in window)) return;
  const run = () => nums.forEach(el => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || "";
    const t0 = performance.now(), dur = 1400;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); run(); }
  }, { threshold: 0.4 });
  io.observe(root);
}

function renderMarquee(cfg) {
  const track = document.getElementById("hx-marquee");
  if (!track) return;
  const words = [];
  (cfg.aboutSkills || []).forEach(r => String(r.val || "").split(/[,/]/).forEach(w => {
    const t = w.trim();
    if (t && !words.includes(t)) words.push(t);
  }));
  if (!words.length) { track.parentElement.hidden = true; return; }
  // One "copy" must be wider than any screen; two copies loop seamlessly.
  let copy = words.slice();
  while (copy.length < 24) copy = copy.concat(words);
  const run = copy.map(w => `<span>${esc(w)}</span>`).join("");
  track.innerHTML = run + run;
}

/* ============================================================
   FEATURED banners + FEATURES tiles
   Both draw the background image when one is set; without it (or
   when it fails to load) a generated cyberpunk backdrop is shown:
   the icon blurred into an ambient glow, a grid and the icon as a
   floating "hologram" — or the glyph / initials instead of an icon.
   ============================================================ */
function cardVisual(item, i) {
  const acc = safeColor(item.accent) || ACCENTS[i % ACCENTS.length];
  const img = item.image ? assetPath(item.image) : "";
  const icon = item.icon ? assetPath(item.icon) : "";
  const glyph = `<span class="hx-ph-glyph">${esc(item.glyph || initials(item.name))}</span>`;
  const ph = `<span class="hx-ph${img ? " hx-ph-fallback" : ""}" aria-hidden="true">` +
    (icon ? `<span class="hx-ph-amb" style="background-image:url('${esc(cssUrl(icon))}')"></span>` : "") +
    `<span class="hx-ph-grid"></span>` +
    (icon ? `<img class="hx-ph-holo" src="${esc(icon)}" alt="" loading="lazy" decoding="async">` : glyph) +
    `</span>`;
  const bg = img ? `<img class="hx-bg" src="${esc(img)}" alt="" loading="lazy" decoding="async" style="object-position:${esc(safeFocus(item.focus))}">` : "";
  return { acc, html: bg + ph, glyph };
}

/* A broken background image falls back to the generated backdrop; a
   broken icon falls back to the glyph. */
function wireCardImages(root) {
  root.querySelectorAll("img.hx-bg").forEach(img => {
    const fail = () => { const card = img.closest(".hx-banner, .hx-tile"); if (card) card.classList.add("no-img"); img.remove(); };
    if (img.complete && !img.naturalWidth && img.getAttribute("src")) fail();
    else img.addEventListener("error", fail, { once: true });
  });
  root.querySelectorAll("img.hx-ph-holo").forEach(img => {
    const fail = () => {
      const card = img.closest(".hx-banner, .hx-tile");
      const g = document.createElement("span");
      g.className = "hx-ph-glyph";
      g.textContent = initials(card ? (card.querySelector(".hx-banner-title, .hx-tile-title") || {}).textContent : "");
      img.replaceWith(g);
    };
    if (img.complete && !img.naturalWidth && img.getAttribute("src")) fail();
    else img.addEventListener("error", fail, { once: true });
  });
}

function renderBanners(items) {
  const sec = document.getElementById("featured");
  const box = document.getElementById("hx-banners");
  if (!box) return;
  const list = (Array.isArray(items) ? items : []).filter(it => it && it.name);
  if (!list.length) { sec.hidden = true; return; }
  const total = pad2(list.length);
  box.innerHTML = list.map((it, i) => {
    const href = homeHref(it.url);
    const ext = href && isExternal(href);
    const { acc, html } = cardVisual(it, i);
    const tag = href ? "a" : "div";
    return `
      <${tag} class="hx-banner rv${i % 2 ? " alt" : ""}" style="--acc:${acc}"${href ? ` href="${esc(href)}"${linkAttrs(href)}` : ""}>
        ${html}
        <span class="hx-corner tl" aria-hidden="true"></span><span class="hx-corner br" aria-hidden="true"></span>
        <span class="hx-banner-body">
          <span class="hx-banner-idx">${pad2(i + 1)} / ${total}${it.tag ? ` · ${esc(it.tag)}` : ""}</span>
          <span class="hx-banner-title" data-text="${esc(it.name)}">${esc(it.name)}</span>
          ${it.description ? `<span class="hx-banner-desc">${esc(it.description)}</span>` : ""}
          ${href ? `<span class="hx-go">${esc(it.cta || (ext ? "Visit" : "Open"))} <i aria-hidden="true">${ext ? "↗" : "→"}</i></span>${newTabHint(href)}` : ""}
        </span>
      </${tag}>`;
  }).join("");
  wireCardImages(box);
  observeReveal(box);
}

function renderTiles(items) {
  const sec = document.getElementById("features");
  const box = document.getElementById("hx-tiles");
  if (!box) return;
  const list = (Array.isArray(items) ? items : []).filter(it => it && it.name);
  if (!list.length) { sec.hidden = true; return; }
  box.innerHTML = list.map((it, i) => {
    const href = homeHref(it.url);
    const ext = href && isExternal(href);
    const { acc, html } = cardVisual(it, i);
    const tag = href ? "a" : "div";
    return `
      <${tag} class="hx-tile rv" style="--acc:${acc};--d:${i % 4}"${href ? ` href="${esc(href)}"${linkAttrs(href)}` : ""}>
        ${html}
        <span class="hx-corner tl" aria-hidden="true"></span><span class="hx-corner br" aria-hidden="true"></span>
        <span class="hx-tile-body">
          ${it.tag ? `<span class="hx-tile-tag">${esc(it.tag)}</span>` : ""}
          <span class="hx-tile-title">${esc(it.name)}</span>
          ${it.description ? `<span class="hx-tile-desc">${esc(it.description)}</span>` : ""}
          ${href ? `<span class="hx-go">${ext ? "Visit" : "Open"} <i aria-hidden="true">${ext ? "↗" : "→"}</i></span>${newTabHint(href)}` : ""}
        </span>
      </${tag}>`;
  }).join("");
  wireCardImages(box);
  observeReveal(box);
}

/* ============================================================
   MUSIC DECK (tracks from home.json) with a Web Audio visualizer.
   Nothing is loaded before the visitor presses play.
   ============================================================ */
function initMusicPlayer(tracks, links) {
  const box = document.getElementById("music-player-container");
  if (!box || !Array.isArray(tracks) || !tracks.length) {
    const sec = document.getElementById("music");
    if (sec) sec.hidden = true;
    return null;
  }

  const streams = (Array.isArray(links) ? links : []).map(l => ({ name: l.name, href: homeHref(l.url) })).filter(l => l.href && l.name);
  box.innerHTML = `
    <div class="hx-deck">
      <div class="hx-deck-main">
        <div class="hx-deck-top">
          <span class="hx-kicker">// now playing</span>
          <span class="hx-deck-time"><span id="mp-cur">0:00</span> / <span id="mp-dur">0:00</span></span>
        </div>
        <div class="hx-deck-title" id="mp-name" aria-live="polite"></div>
		
        <ol class="hx-tracks" id="mp-tracklist">${tracks.map((t, i) => `
          <li${i === 0 ? ' class="on"' : ""}><button type="button" data-i="${i}">
            <span class="n">${pad2(i + 1)}</span><span>${esc(t.title)}</span>
            <span class="hx-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button></li>`).join("")}
        </ol>
		
		
        <div class="hx-prog" id="mp-prog" role="slider" tabindex="0" aria-label="Seek"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00"><span class="hx-prog-fill" id="mp-fill"></span></div>
        <div class="hx-deck-ctrl">
          <button class="hx-ctl" type="button" id="mp-prev" aria-label="Previous track">⏮</button>
          <button class="hx-ctl play" type="button" id="mp-play" aria-label="Play">▶</button>
          <button class="hx-ctl" type="button" id="mp-next" aria-label="Next track">⏭</button>
          <label class="hx-vol">VOL <input type="range" id="mp-vol" min="0" max="1" step="0.05" value="0.7" aria-label="Volume"></label>
        </div>
      </div>
      <div class="hx-deck-side">
        ${streams.length ? `<div class="hx-stream">${streams.map(l => `<a href="${esc(l.href)}"${linkAttrs(l.href)}>${esc(l.name)} ↗</a>`).join("")}</div>` : ""}
      </div>
    </div>`;

  const q = s => box.querySelector(s);
  const deck = q(".hx-deck"), nameEl = q("#mp-name"), curEl = q("#mp-cur"), durEl = q("#mp-dur");
  const fill = q("#mp-fill"), prog = q("#mp-prog"), playBtn = q("#mp-play"), list = q("#mp-tracklist"), canvas = q("#mp-viz");
  const audio = new Audio();
  audio.preload = "none";
  audio.volume = 0.7;
  let current = 0, playing = false, errorStreak = 0;
  const listeners = [];
  const state = () => ({ playing, title: tracks[current].title });
  const emit = () => listeners.forEach(fn => fn(state()));
  const fmt = s => (isFinite(s) ? `${Math.floor(s / 60)}:${pad2(Math.floor(s % 60))}` : "0:00");

  /* ---- visualizer: real spectrum when Web Audio works, a calm idle
          wave otherwise (and whenever the music is paused) ---- */
  let actx = null, analyser = null, bins = null, raf = 0;
  function graph() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      actx = new AC();
      const src = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      src.connect(analyser);
      analyser.connect(actx.destination);
      bins = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { analyser = null; }
  }
  function draw(t) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const n = Math.max(16, Math.min(64, Math.floor(w / 9)));
    const gap = 3, bw = (w - gap * (n - 1)) / n;
    const grad = c.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, "#b34700");
    grad.addColorStop(0.55, "#ff6600");
    grad.addColorStop(1, "#ff2a6d");
    c.fillStyle = grad;
    if (analyser && playing) analyser.getByteFrequencyData(bins);
    for (let i = 0; i < n; i++) {
      let v;
      if (analyser && playing) v = bins[Math.floor(Math.pow(i / n, 1.5) * (bins.length - 1))] / 255;
      else if (playing) v = 0.25 + 0.2 * Math.sin(t / 180 + i * 0.7) * Math.sin(t / 530 + i * 0.3);
      else v = 0.05 + 0.03 * Math.sin((t || 0) / 700 + i * 0.45);
      const bh = Math.max(2, v * h);
      c.fillRect(i * (bw + gap), h - bh, bw, bh);
    }
  }
  function frame(t) {
    draw(t);
    raf = playing ? requestAnimationFrame(frame) : 0;
  }

  function sync() {
    playBtn.textContent = playing ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    deck.classList.toggle("playing", playing);
    deck.classList.toggle("playing-on", playing);
    list.querySelectorAll("li").forEach((li, k) => li.classList.toggle("on", k === current));
    if (playing && !raf) raf = requestAnimationFrame(frame);
    if (!playing) draw(performance.now());
    emit();
  }
  function load(i) {
    current = (i + tracks.length) % tracks.length;
    audio.src = assetPath(tracks[current].file);
    nameEl.textContent = tracks[current].title;
    fill.style.width = "0%";
    curEl.textContent = "0:00";
    durEl.textContent = "0:00";
    prog.setAttribute("aria-valuenow", "0");
    sync();
  }
  async function play() {
    if (!audio.getAttribute("src")) load(current);
    //graph();
    if (actx && actx.state === "suspended") { try { await actx.resume(); } catch (e) { /* ignore */ } }
    try { await audio.play(); } catch (e) { /* autoplay blocked or file missing */ }
  }
  const pause = () => audio.pause();
  const toggle = () => (audio.paused ? play() : pause());

  audio.addEventListener("play", () => { playing = true; sync(); });
  audio.addEventListener("pause", () => { playing = false; sync(); });
  audio.addEventListener("playing", () => { errorStreak = 0; });
  audio.addEventListener("ended", () => { load(current + 1); play(); });
  // A missing file skips to the next track instead of getting stuck; stop after one full round.
  audio.addEventListener("error", () => {
    if (!audio.getAttribute("src")) return;
    errorStreak++;
    playing = false;
    if (errorStreak >= tracks.length) { sync(); return; }
    load(current + 1);
    play();
  });
  audio.addEventListener("loadedmetadata", () => { durEl.textContent = fmt(audio.duration); });
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    fill.style.width = `${pct}%`;
    curEl.textContent = fmt(audio.currentTime);
    prog.setAttribute("aria-valuenow", String(Math.round(pct)));
    prog.setAttribute("aria-valuetext", `${fmt(audio.currentTime)} of ${fmt(audio.duration)}`);
  });

  playBtn.addEventListener("click", toggle);
  q("#mp-prev").addEventListener("click", () => { const was = playing; load(current - 1); if (was) play(); });
  q("#mp-next").addEventListener("click", () => { const was = playing; load(current + 1); if (was) play(); });
  list.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) { load(+b.dataset.i); play(); } });
  q("#mp-vol").addEventListener("input", e => { audio.volume = parseFloat(e.target.value); });
  prog.addEventListener("click", e => {
    if (!audio.duration) return;
    const r = prog.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * audio.duration;
  });
  prog.addEventListener("keydown", e => {
    if (!audio.duration) return;
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 30, PageDown: -30 }[e.key];
    if (step) audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + step));
    else if (e.key === "Home") audio.currentTime = 0;
    else if (e.key === "End") audio.currentTime = Math.max(0, audio.duration - 1);
    else return;
    e.preventDefault();
  });

  nameEl.textContent = tracks[0].title;
  draw(0);
  return { toggle, onChange(fn) { listeners.push(fn); fn(state()); } };
}

/* The "play the soundtrack" button in the hero drives the same deck. */
function wireHeroPlay(player) {
  const buttons = document.querySelectorAll("[data-play]");
  if (!player) { buttons.forEach(b => { b.hidden = true; }); return; }
  buttons.forEach(b => b.addEventListener("click", () => player.toggle()));
  player.onChange(({ playing, title }) => buttons.forEach(b => {
    b.setAttribute("aria-pressed", String(playing));
    b.classList.toggle("playing-on", playing);
    const ico = b.querySelector("[data-play-ico]"), label = b.querySelector("[data-play-label]"), tr = b.querySelector("[data-play-track]");
    if (ico) ico.textContent = playing ? "❚❚" : "▶";
    if (label) label.textContent = playing ? "Now playing" : "Play the soundtrack";
    if (tr) tr.textContent = title;
  }));
}

/* ============================================================
   ABOUT — ID card, bio, skill modules, uptime meters, tags
   ============================================================ */
function renderAbout(cfg) {
  const box = document.getElementById("about-container");
  if (!box) return;
  const stats = Array.isArray(cfg.aboutStats) ? cfg.aboutStats : [];
  const find = k => (stats.find(s => String(s.key).toUpperCase() === k) || {}).val || "";
  const since = cfg.counters && cfg.counters[0] ? String(cfg.counters[0].date || "") : "";
  const year = since.slice(0, 4);
  const siteLink = v => {
    const s = String(v).trim();
    if (!/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+\/?$/i.test(s)) return esc(s);
    const href = /^https?:/i.test(s) ? s : `https://${s}`;
    return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(s)}</a>`;
  };
  const rows = stats.map(s => `<dt>${esc(s.key)}</dt><dd>${String(s.key).toUpperCase() === "SITE" ? siteLink(s.val) : esc(s.val)}</dd>`).join("") +
    (year ? `<dt>Online</dt><dd>since ${esc(year)}</dd>` : "") +
    `<dt>Status</dt><dd class="on">● active</dd>`;

  const id = `
    <aside class="hx-id rv" aria-label="Profile card">
      <div class="hx-id-top"><span>ident // <b>${esc(find("ALIAS") || "Bugfish")}</b></span><span class="hx-chip" aria-hidden="true"></span></div>
      <div class="hx-id-photo"><img src="${esc(assetPath("assets/img/logo.jpg"))}" alt="Bugfish logo" loading="lazy"></div>
      <dl class="hx-id-rows">${rows}</dl>
      <div class="hx-id-code" aria-hidden="true"><span class="hx-barcode"></span><span>BTM-${esc(year || "0000")}</span></div>
      <a class="cy-btn small" href="https://github.com/bugfishtm" target="_blank" rel="noopener noreferrer">Follow on GitHub <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>
    </aside>`;

  const bio = (Array.isArray(cfg.aboutBio) ? cfg.aboutBio : []).map(p => `<p>${esc(p)}</p>`).join("");
  const mods = (Array.isArray(cfg.aboutSkills) ? cfg.aboutSkills : []).map(s => {
    const chips = String(s.val || "").split(/[,/]/).map(x => x.trim()).filter(Boolean);
    return `<div class="hx-mod"><h3>${esc(s.key)} <span>${pad2(chips.length)} mods</span></h3>
      <div class="hx-chips">${chips.map(c => `<span>${esc(c)}</span>`).join("")}</div></div>`;
  }).join("");
  const meters = (Array.isArray(cfg.counters) ? cfg.counters : []).map((c, i) => `
    <div class="hx-meter"><span class="lbl">${esc(String(c.label || "").replace(/\s*SINCE\s*$/i, ""))}</span>
      <b id="hx-meter-${i}">—<small>days</small></b>
      <p>since ${esc(c.date)}${c.description ? ` · ${esc(c.description)}` : ""}</p></div>`).join("");
  const tags = (Array.isArray(cfg.tags) ? cfg.tags : []).map(t => `<span>${esc(t)}</span>`).join("");

  box.innerHTML = id + `
    <div class="hx-about-main rv" style="--d:1">
      <div class="hx-bio">${bio}</div>
      ${mods ? `<div class="hx-mods">${mods}</div>` : ""}
      ${meters ? `<div class="hx-meters">${meters}</div>` : ""}
      ${tags ? `<div class="hx-tagrow">${tags}</div>` : ""}
    </div>`;
  observeReveal(box);
}

/* ============================================================
   CHANNELS strip (data/explore.json — the full list lives on
   channels.html)
   ============================================================ */
async function initChannels() {
  const sec = document.getElementById("channels-strip");
  const box = document.getElementById("hx-channels");
  if (!sec || !box) return;
  try {
    const items = await loadJSON("data/explore.json");
    const html = (Array.isArray(items) ? items : []).map(it => {
      const href = homeHref(it.url);
      if (!href || !it.name) return "";
      return `<a href="${esc(href)}"${linkAttrs(href)} title="${esc(it.description || it.name)}">
        <img src="${esc(assetPath(it.image))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <span>${esc(it.name)}</span>${newTabHint(href)}</a>`;
    }).join("");
    if (!html) return;
    box.innerHTML = html;
    sec.hidden = false;
    observeReveal(sec);
  } catch (err) {
    console.warn("Channels strip skipped:", err.message); // optional section
  }
}

/* ============================================================
   TOP STATUS HUD — live day counters + wall clock (also drives
   the clock on the key art and the uptime meters in "about")
   ============================================================ */
function initTopHUD(counters) {
  const bar = document.getElementById("top-hud");
  const list = Array.isArray(counters) ? counters : [];
  if (bar) {
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
  }

  function tick() {
    list.forEach((c, i) => {
      const diff = Date.now() - new Date(c.date).getTime();
      if (isNaN(diff) || diff < 0) return;
      const days = Math.floor(diff / 86400000);
      const hud = document.getElementById(`th-c-${i}`);
      if (hud) hud.textContent = String(days);
      const meter = document.getElementById(`hx-meter-${i}`);
      if (meter && meter.firstChild) meter.firstChild.nodeValue = days.toLocaleString("en-US");
    });
    const n = new Date();
    const time = `${pad2(n.getHours())}:${pad2(n.getMinutes())}:${pad2(n.getSeconds())}`;
    const clock = document.getElementById("th-clock");
    if (clock) clock.textContent = time;
    const art = document.getElementById("hx-clock");
    if (art) art.textContent = time;
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  observeReveal(document);
  initMatrix();
  initParallax();

  const load = path => loadJSON(path).catch(err => { console.error(err); return null; });
  const [cfg, featured, features] = await Promise.all([
    load("data/home.json"), load("data/featured.json"), load("data/features.json"),
  ]);

  if (cfg) {
    renderHero(cfg);
    renderMarquee(cfg);
    renderAbout(cfg);
    initTopHUD(cfg.counters);
    wireHeroPlay(initMusicPlayer(cfg.music, cfg.musicLinks));
  } else {
    initTopHUD([]);
    wireHeroPlay(null);
    showLoadError(document.getElementById("about-container"), "data/home.json");
  }

  if (featured) renderBanners(featured);
  else showLoadError(document.getElementById("hx-banners"), "data/featured.json");
  if (features) renderTiles(features);
  else showLoadError(document.getElementById("hx-tiles"), "data/features.json");

  initChannels();
  observeReveal(document);
});
