/* ============================================================
   BUGFISH — news.js
   Renders the news feed from data/news.json on the home page.
   10 entries per page, with pagination for the older ones.

   Entry fields (all optional except title):
     title      — headline
     text       — body text; blank lines start a new paragraph
     date       — "YYYY-MM-DD"; newest first, undated entries last
     image_url  — thumbnail, relative to the site root
     link_url   — "Read More" button + makes the headline a link
     video_url  — a video file (.mp4/.webm/...) is played inline,
                  anything else becomes a "Watch Video" button

   Keep image_url / video_url local (assets/...): the privacy
   policy states that no third-party content is embedded.

   If data/news.json is missing or empty the whole section stays
   hidden, so the home page never shows an empty news box.
   ============================================================ */

const NEWS_PER_PAGE = 10;

/* Video files we can play inline — everything else is linked out. */
const NEWS_VIDEO_FILE = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i;

/* Only http(s), mailto and relative paths are allowed through, so a
   typo in the JSON can never turn into a "javascript:" link. */
function newsUrl(url) {
  const raw = String(url == null ? "" : url).trim();
  if (!raw) return "";
  if (/^(https?:|mailto:)/i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return "";  // unknown scheme → dropped
  return raw;                                       // relative path
}

/* Newest first. Entries without a usable date keep their JSON order
   and are listed after the dated ones. */
function sortNews(items) {
  return items.slice().sort((a, b) => {
    const ta = Date.parse(a.date), tb = Date.parse(b.date);
    const na = isNaN(ta), nb = isNaN(tb);
    if (na && nb) return 0;
    if (na) return 1;
    if (nb) return -1;
    return tb - ta;
  });
}

function newsParagraphs(text) {
  const t = String(text == null ? "" : text).trim();
  if (!t) return "";
  return t.split(/\n{2,}/)
    .map(p => `<p class="news-text">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function newsCard(item) {
  const title = String(item.title == null ? "" : item.title).trim();
  const link  = newsUrl(item.link_url);
  const video = newsUrl(item.video_url);
  const image = newsUrl(item.image_url);
  const inlineVideo = video && NEWS_VIDEO_FILE.test(video);

  const media = image ? `
      <div class="news-media">
        <img src="${esc(assetPath(image))}" alt="${esc(title || "News image")}" loading="lazy"
             onerror="this.closest('.news-media').remove()">
      </div>` : "";

  const head = link
    ? `<a class="news-title" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`
    : `<span class="news-title">${esc(title)}</span>`;

  const date = item.date
    ? `<time class="news-date" datetime="${esc(item.date)}">${esc(item.date)}</time>` : "";

  const player = inlineVideo ? `
      <video class="news-video" controls preload="metadata" playsinline
             src="${esc(assetPath(video))}"></video>` : "";

  const buttons = [];
  if (link) {
    buttons.push(`<a class="btn ghost small" href="${esc(link)}"
      target="_blank" rel="noopener noreferrer">Read More</a>`);
  }
  if (video && !inlineVideo) {
    buttons.push(`<a class="btn ghost small" href="${esc(video)}"
      target="_blank" rel="noopener noreferrer">Watch Video</a>`);
  }
  const actions = buttons.length ? `<div class="news-actions">${buttons.join("")}</div>` : "";

  return `
    <article class="news-card">
      ${media}
      <div class="news-body">
        <div class="news-head">${head}${date}</div>
        ${newsParagraphs(item.text)}
        ${player}
        ${actions}
      </div>
    </article>`;
}

/* Page numbers around the current one: 1 … 4 5 6 … 12 */
function newsPageWindow(current, total) {
  const nums = [];
  const add = n => { if (n >= 1 && n <= total && !nums.includes(n)) nums.push(n); };
  add(1);
  for (let i = current - 1; i <= current + 1; i++) add(i);
  add(total);
  nums.sort((a, b) => a - b);

  const out = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

function renderNewsPager(pager, current, total, count) {
  if (!pager) return;
  if (total <= 1) { pager.innerHTML = ""; pager.hidden = true; return; }
  pager.hidden = false;

  const pages = newsPageWindow(current, total).map(p => p === "gap"
    ? `<span class="pager-gap">…</span>`
    : `<button class="pager-btn num${p === current ? " active" : ""}" data-page="${p}"
         ${p === current ? 'aria-current="page"' : ""}>${p}</button>`).join("");

  pager.innerHTML = `
    <button class="pager-btn" data-page="${current - 1}"
      ${current === 1 ? "disabled" : ""} aria-label="Previous news page">‹</button>
    <div class="pager-pages">${pages}</div>
    <button class="pager-btn" data-page="${current + 1}"
      ${current === total ? "disabled" : ""} aria-label="Next news page">›</button>
    <span class="pager-info">PAGE ${current}/${total} — ${count} ENTRIES</span>`;
}

function initNews(items) {
  const section = document.getElementById("news");
  const list    = document.getElementById("news-list");
  const pager   = document.getElementById("news-pager");
  if (!section || !list) return;

  const all = sortNews(items);
  const total = Math.max(1, Math.ceil(all.length / NEWS_PER_PAGE));
  let current = 1;

  function show(page, scroll) {
    current = Math.min(Math.max(1, page), total);
    const start = (current - 1) * NEWS_PER_PAGE;
    list.innerHTML = all.slice(start, start + NEWS_PER_PAGE).map(newsCard).join("");
    renderNewsPager(pager, current, total, all.length);
    if (scroll) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (pager) {
    pager.addEventListener("click", e => {
      const btn = e.target.closest(".pager-btn");
      if (!btn || btn.disabled) return;
      show(parseInt(btn.dataset.page, 10), true);
    });
  }

  section.hidden = false;
  show(1, false);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("news-list")) return;
  try {
    const items = await loadJSON("data/news.json");
    if (Array.isArray(items) && items.length) initNews(items);
  } catch (err) {
    // News is optional — a missing file just leaves the section hidden.
    console.warn("No news loaded:", err.message);
  }
});
