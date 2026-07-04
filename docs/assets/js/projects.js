/* ============================================================
   BUGFISH — projects.js
   Renders full-width project cards for one category and powers
   the home-page search that looks through ALL categories.
   The category is read from <body data-category="...">, and the
   items come from data/projects/<category>.json.

   Item fields:
     name, image, description  — required
     license                   — short text (max 12 chars shown)
     ai                        — true ⇒ "AI ASSISTED" badge
     documentation, website, github, video, contact
                               — optional urls; missing/empty ⇒
                                 the button is not rendered.
   ============================================================ */

const PROJECT_BUTTONS = [
  { key: "documentation", label: "Docs" },
  { key: "website",       label: "Website" },
  { key: "github",        label: "GitHub" },
  { key: "video",         label: "Videos" },
  { key: "contact",       label: "Contact" },
];

/* All categories the search looks through — must match the JSON
   files that exist in data/projects/. */
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
      ? `<span class="cat-badge">${esc(item.category)}</span>` : "";
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

/* ---- Home search: results appear only while typing ---------- */
function initHomeSearch() {
  const input = document.getElementById("project-search");
  const countEl = document.getElementById("search-count");
  const list = document.getElementById("project-list");
  if (!input || !list) return;

  const hint = `<div class="news-empty">// type to search all projects — name, description or category</div>`;
  list.innerHTML = hint;

  async function runSearch() {
    const q = input.value.trim().toLowerCase();

    if (!q) {
      list.innerHTML = hint;
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

  // Deep links: /?q=term (also used by the JSON-LD SearchAction)
  const q = new URLSearchParams(window.location.search).get("q");
  if (q) {
    input.value = q;
    runSearch();
    document.getElementById("search")?.scrollIntoView();
  }
}

/* ---- Category page ------------------------------------------ */
async function initCategoryPage(category) {
  try {
    const items = await loadCategory(category);
    renderProjects(items);
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("project-list"), `data/projects/${category}.json`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const category = document.body.dataset.category;
  if (category) initCategoryPage(category);
  else initHomeSearch();
});
