/* ============================================================
   BUGFISH — projects.js
   Renders full-width project cards for one category and powers
   the search box that looks through ALL categories.
   The category is read from <body data-category="...">, and the
   items come from data/projects/<category>.json.

   Item fields:
     name, image, description  — required
     license                   — short text (max 12 chars shown)
     documentation, website, github, video, contact
                               — optional urls; missing/empty ⇒
                                 the button renders disabled.
   ============================================================ */

const PROJECT_BUTTONS = [
  { key: "documentation", label: "Docs" },
  { key: "website",       label: "Website" },
  { key: "github",        label: "GitHub" },
  { key: "video",         label: "Videos" },
  { key: "contact",       label: "Contact" },
];

/* All categories the search box can look through — must match
   the JSON files that exist in data/projects/. */
const PROJECT_CATEGORIES = [
  "docker", "android", "framework", "javascript",
  "suitefish", "games", "windows", "websoftware",
];

const projectCache = {};        // category -> items
let allProjectsPromise = null;  // lazy, fetched on first search

async function loadCategory(cat) {
  if (!projectCache[cat]) {
    projectCache[cat] = await loadJSON(`data/projects/${cat}.json`);
  }
  return projectCache[cat];
}

function loadAllProjects() {
  if (!allProjectsPromise) {
    allProjectsPromise = Promise.all(
      PROJECT_CATEGORIES.map(async cat => {
        try {
          const items = await loadCategory(cat);
          return (Array.isArray(items) ? items : []).map(p => ({ ...p, category: cat }));
        } catch (err) {
          console.error(`Could not load projects for '${cat}':`, err);
          return [];
        }
      })
    ).then(lists => lists.flat());
  }
  return allProjectsPromise;
}

function projectButton(url, label) {
  if (url && String(url).trim() !== "") {
    return `<a class="btn ghost small" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }
  return `<span class="btn ghost small disabled" aria-disabled="true" title="Not available">${esc(label)}</span>`;
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
      ? `<span class="cat-badge">${esc(item.category)}</span>` : "";
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
          </div>
          <p class="project-desc">${esc(item.description)}</p>
          <div class="project-actions">${buttons}</div>
        </div>
      </article>`;
  }).join("");
}

/* ---- Search across all categories --------------------------
   baseItems/baseOpts are what gets rendered when the box is
   empty: the category list on category pages, everything on the
   global search page. */
function initProjectSearch(baseItems, baseOpts = {}) {
  const input = document.getElementById("project-search");
  const countEl = document.getElementById("search-count");
  if (!input) return;

  async function runSearch() {
    const q = input.value.trim().toLowerCase();

    if (!q) {
      renderProjects(baseItems, baseOpts);
      if (countEl) countEl.textContent = "";
      return;
    }

    const all = await loadAllProjects();
    // Input may have changed while the JSONs were loading.
    if (input.value.trim().toLowerCase() !== q) return;

    const hits = all.filter(p =>
      `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q));

    renderProjects(hits, { showCategory: true, query: q });
    if (countEl) countEl.textContent = `${hits.length} FOUND`;
  }

  input.addEventListener("input", runSearch);
}

/* ---- Category page ----------------------------------------- */
async function initCategoryPage(category) {
  try {
    const items = await loadCategory(category);
    renderProjects(items);
    initProjectSearch(items);
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("project-list"), `data/projects/${category}.json`);
  }
}

/* ---- Global search page (search.html) -----------------------
   No data-category on <body>: show every project of every
   category, support ?q=… deep links (used by the JSON-LD
   SearchAction as well). */
async function initGlobalSearchPage() {
  const input = document.getElementById("project-search");
  try {
    const all = await loadAllProjects();
    renderProjects(all, { showCategory: true });
    initProjectSearch(all, { showCategory: true });

    const q = new URLSearchParams(window.location.search).get("q");
    if (input && q) {
      input.value = q;
      input.dispatchEvent(new Event("input"));
    }
    if (input) input.focus();
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("project-list"), "project data");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const category = document.body.dataset.category;
  if (category) initCategoryPage(category);
  else if (document.getElementById("project-list")) initGlobalSearchPage();
});
