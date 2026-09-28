/* ============================================================
   BUGFISH — projects.js
   Powers the single unified projects page (projects.html):
   category tabs at the top + a search box that filters the
   current scope. Each category's items come from
   data/projects/<category>.json.

   Item fields:
     name, image, description  — required
     license                   — short text (max 12 chars shown)
     ai                        — true ⇒ "AI ASSISTED" badge
     documentation, website, github, docker, video, contact
                               — optional urls; missing/empty ⇒
                                 the button is not rendered.

   Deep links:
     projects.html?cat=<category>   opens that tab
     projects.html?q=<term>         prefills the search (All scope)
   ============================================================ */

const PROJECT_BUTTONS = [
  { key: "documentation", label: "Docs" },
  { key: "website",       label: "Website" },
  { key: "github",        label: "GitHub" },
  { key: "docker",        label: "Docker" },
  { key: "video",         label: "Videos" },
  { key: "contact",       label: "Contact" },
];

/* Every category + its display label. The JSON file for each must
   exist at data/projects/<id>.json. Order here is the tab order. */
const PROJECT_CATEGORIES = [
  { id: "android",     label: "Android" },
  { id: "framework",   label: "Framework" },
  { id: "javascript",  label: "JavaScript" },
  { id: "games",       label: "Games" },
  { id: "windows",     label: "Windows" },
  { id: "websoftware", label: "Websoftware" },
  { id: "espocrm",     label: "EspoCRM" },
  { id: "ciphers",     label: "Ciphers" },
];

const CATEGORY_LABEL = Object.fromEntries(PROJECT_CATEGORIES.map(c => [c.id, c.label]));

async function loadCategory(cat) {
  const items = await loadJSON(`data/projects/${cat}.json`);
  return (Array.isArray(items) ? items : []).map(p => ({ ...p, category: cat }));
}

/* Load every category once, tolerating any single missing file. */
async function loadAllProjects() {
  const lists = await Promise.all(
    PROJECT_CATEGORIES.map(async c => {
      try { return await loadCategory(c.id); }
      catch (err) { console.error(`Could not load projects for '${c.id}':`, err); return []; }
    })
  );
  return lists.flat();
}

function projectButton(url, label) {
  if (!url || String(url).trim() === "") return ""; // hidden when unavailable
  return `<a class="btn ghost small" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}

function renderProjects(items, opts = {}) {
  const list = document.getElementById("project-list");
  if (!list) return;

  if (!Array.isArray(items) || !items.length) {
    list.innerHTML = opts.query
      ? `<div class="news-empty">// no projects match '${esc(opts.query)}'</div>`
      : `<div class="news-empty">// no projects in this section yet</div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const license = item.license ? String(item.license).slice(0, 12) : "";
    const buttons = PROJECT_BUTTONS.map(b => projectButton(item[b.key], b.label)).join("");
    const catBadge = opts.showCategory && item.category
      ? `<span class="cat-badge">${esc(CATEGORY_LABEL[item.category] || item.category)}</span>` : "";
    const aiBadge = item.ai === true
      ? `<span class="ai-badge" title="Built with the help of AI">AI ASSISTED</span>` : "";
    return `
      <article class="project-card">
        <div class="project-img">
          <img src="${esc(assetPath(item.image))}" alt="${esc(item.name)}" loading="lazy"
               onerror="this.style.visibility='hidden'">
        </div>
        <div class="project-body">
          <div class="project-head">
            <span class="project-name">${esc(item.name)}</span>
            ${catBadge}
            ${license ? `<span class="license-badge">${esc(license)}</span>` : ""}
            ${aiBadge}
          </div>
          <p class="project-desc">${esc(item.description)}</p>
          <div class="project-actions">${buttons}</div>
        </div>
      </article>`;
  }).join("");
}

/* ---- Unified projects page: tabs + search ------------------- */
function initProjectsPage() {
  const tabsEl  = document.getElementById("cat-tabs");
  const input   = document.getElementById("project-search");
  const countEl = document.getElementById("search-count");
  const list    = document.getElementById("project-list");
  if (!tabsEl || !list) return;

  list.innerHTML = `<div class="news-empty">// loading projects...</div>`;

  const params = new URLSearchParams(window.location.search);
  const validCats = new Set(PROJECT_CATEGORIES.map(c => c.id));
  let activeCat = params.get("cat");
  if (!activeCat || !validCats.has(activeCat)) activeCat = "all";
  let query = params.get("q") || "";
  if (input && query) input.value = query;

  let all = [];
  const countByCat = {};

  function buildTabs() {
    const total = all.length;
    const tab = (id, label, count) =>
      `<button class="cat-tab${id === activeCat ? " active" : ""}" role="tab"
         aria-selected="${id === activeCat}" data-cat="${id}">
         ${esc(label)}<span class="cat-count">${count}</span></button>`;
    tabsEl.innerHTML =
      tab("all", "All", total) +
      PROJECT_CATEGORIES.map(c => tab(c.id, c.label, countByCat[c.id] || 0)).join("");

    tabsEl.querySelectorAll(".cat-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        activeCat = btn.dataset.cat;
        tabsEl.querySelectorAll(".cat-tab").forEach(b => {
          const on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on);
        });
        render();
        syncUrl();
      });
    });
  }

  function render() {
    const q = query.trim().toLowerCase();
    let scope = activeCat === "all" ? all : all.filter(p => p.category === activeCat);
    if (q) {
      scope = scope.filter(p =>
        `${p.name} ${p.description} ${CATEGORY_LABEL[p.category] || p.category}`
          .toLowerCase().includes(q));
    }
    renderProjects(scope, { showCategory: activeCat === "all", query: q || undefined });
    if (countEl) countEl.textContent = q ? `${scope.length} FOUND` : "";
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (activeCat !== "all") p.set("cat", activeCat);
    if (query.trim()) p.set("q", query.trim());
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  if (input) {
    input.addEventListener("input", () => {
      query = input.value;
      render();
      syncUrl();
    });
  }

  loadAllProjects().then(items => {
    all = items;
    PROJECT_CATEGORIES.forEach(c => { countByCat[c.id] = 0; });
    all.forEach(p => { countByCat[p.category] = (countByCat[p.category] || 0) + 1; });
    buildTabs();
    render();
  }).catch(err => {
    console.error(err);
    showLoadError(list, "data/projects/*.json");
  });
}

document.addEventListener("DOMContentLoaded", initProjectsPage);
