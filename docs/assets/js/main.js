/* ============================================================
   BUGFISH — main.js
   Shared: navigation, footer year, JSON loader, helpers.
   ============================================================ */

/* BASE = path prefix from the current page to the site root.
   Root pages use "", pages inside /projects/ use "../".
   It is set via <body data-base="..."> in each HTML file. */
const BASE = document.body.dataset.base || "";

/* ---- Safe JSON loader ------------------------------------- */
async function loadJSON(path) {
  const res = await fetch(BASE + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  return res.json();
}

/* ---- Escape helper (JSON content is treated as plain text) - */
function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Resolve an asset path from JSON (always written relative to
   the site root, e.g. "assets/img/software/docker.png"). */
function assetPath(p) {
  if (!p) return "";
  if (/^(https?:)?\/\//i.test(p)) return p; // absolute urls untouched
  return BASE + p.replace(/^\.?\//, "");
}

function showLoadError(el, what) {
  if (!el) return;
  el.innerHTML = `<div class="load-error">// could not load ${esc(what)} — ` +
    `if you opened this page directly from disk, run a local server ` +
    `(e.g. <b>python -m http.server</b>) or view it on GitHub Pages.</div>`;
}

/* ---- Navigation ------------------------------------------- */
function initNav() {
  const burger = document.getElementById("nav-burger");
  const menu = document.getElementById("nav-menu");

  if (burger && menu) {
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.classList.toggle("active", open);
      if (!open) closeAllDropdowns();
    });
  }

  function closeAllDropdowns(except) {
    document.querySelectorAll(".nav-item.has-dropdown").forEach(item => {
      if (item !== except) item.classList.remove("open");
    });
  }

  document.querySelectorAll(".nav-item.has-dropdown > .nav-link").forEach(trigger => {
    trigger.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const item = trigger.parentElement;
      const willOpen = !item.classList.contains("open");
      closeAllDropdowns(item);
      item.classList.toggle("open", willOpen);
    });
  });

  // Desktop: also open dropdown on hover
  const mqDesktop = window.matchMedia("(min-width: 901px)");
  document.querySelectorAll(".nav-item.has-dropdown").forEach(item => {
    item.addEventListener("mouseenter", () => { if (mqDesktop.matches) item.classList.add("open"); });
    item.addEventListener("mouseleave", () => { if (mqDesktop.matches) item.classList.remove("open"); });
  });

  // Click outside closes dropdowns
  document.addEventListener("click", e => {
    if (!e.target.closest(".nav-item.has-dropdown")) closeAllDropdowns();
  });

  // Escape closes menu + dropdowns
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeAllDropdowns();
      if (menu) menu.classList.remove("open");
      if (burger) burger.classList.remove("active");
    }
  });
}

/* ---- Footer year ------------------------------------------ */
function initFooter() {
  const el = document.getElementById("footer-year");
  if (el) el.textContent = `© ${new Date().getFullYear()} BUGFISH`;
}

/* ---- Deep links to a section --------------------------------
   The home sections (#explore, #news, ...) are filled from JSON
   after the browser already jumped to the anchor, which leaves
   the target in the wrong place. Re-align it once the content
   is in — instantly, so it reads as part of the page load.
   Any manual scroll cancels the correction. */
function initHashTarget() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;

  let active = true;
  const cancel = () => { active = false; };
  ["wheel", "touchstart", "keydown"].forEach(ev =>
    window.addEventListener(ev, cancel, { passive: true, once: true }));

  const align = () => { if (active) target.scrollIntoView({ behavior: "instant", block: "start" }); };

  align();
  window.addEventListener("load", () => { align(); setTimeout(align, 500); });
}

/* ---- Legacy search links ------------------------------------
   Search used to live on the home page, then on its own search
   page; both are gone now — the projects page carries the search.
   Old links/bookmarks like "/?q=term" are handed over instead of
   dropped. Pages that carry the search input handle ?q= themselves. */
function forwardLegacySearch() {
  if (document.getElementById("project-search")) return;
  const q = new URLSearchParams(window.location.search).get("q");
  if (!q) return;
  window.location.replace(`${BASE}projects.html?q=${encodeURIComponent(q)}`);
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initFooter();
  forwardLegacySearch();
  initHashTarget();
});
