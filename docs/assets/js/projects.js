/* ============================================================
   BUGFISH — projects.js
   Renders full-width project cards for one category.
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

function projectButton(url, label) {
  if (url && String(url).trim() !== "") {
    return `<a class="btn ghost small" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }
  return `<span class="btn ghost small disabled" aria-disabled="true" title="Not available">${esc(label)}</span>`;
}

function renderProjects(items) {
  const list = document.getElementById("project-list");
  if (!list) return;

  if (!Array.isArray(items) || !items.length) {
    list.innerHTML = `<div class="news-empty">// no projects in this section yet</div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const license = item.license ? String(item.license).slice(0, 12) : "";
    const buttons = PROJECT_BUTTONS.map(b => projectButton(item[b.key], b.label)).join("");
    return `
      <article class="project-card">
        <div class="project-img">
          <img src="${esc(assetPath(item.image))}" alt="${esc(item.name)}" loading="lazy"
               onerror="this.style.visibility='hidden'">
        </div>
        <div class="project-body">
          <div class="project-head">
            <span class="project-name">${esc(item.name)}</span>
            ${license ? `<span class="license-badge">${esc(license)}</span>` : ""}
          </div>
          <p class="project-desc">${esc(item.description)}</p>
          <div class="project-actions">${buttons}</div>
        </div>
      </article>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const category = document.body.dataset.category;
  if (!category) return;
  try {
    const items = await loadJSON(`data/projects/${category}.json`);
    renderProjects(items);
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("project-list"), `data/projects/${category}.json`);
  }
});
