/* ============================================================
   BUGFISH — explore.js
   Renders the Explore link cards from data/explore.json.
   Card fields: name, image, url, description (all required).
   ============================================================ */

function renderExplore(items) {
  const list = document.getElementById("explore-list");
  if (!list) return;

  if (!Array.isArray(items) || !items.length) {
    list.innerHTML = `<div class="news-empty">// nothing to explore yet</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <a class="explore-card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
      <span class="explore-img">
        <img src="${esc(assetPath(item.image))}" alt="${esc(item.name)}" loading="lazy"
             onerror="this.style.visibility='hidden'">
      </span>
      <span class="explore-body">
        <span class="explore-name">${esc(item.name)}</span>
        <span class="explore-desc" style="display:block">${esc(item.description)}</span>
        <span class="explore-url" style="display:block">${esc(item.url)}</span>
      </span>
      <span class="explore-arrow">↗</span>
    </a>`).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const items = await loadJSON("data/explore.json");
    renderExplore(items);
  } catch (err) {
    console.error(err);
    showLoadError(document.getElementById("explore-list"), "data/explore.json");
  }
});
