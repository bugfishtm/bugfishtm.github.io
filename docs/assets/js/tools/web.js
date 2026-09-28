/* ============================================================
   BUGFISH TOOLS — web.js
   Meta / Open Graph generator, .htaccess + Nginx generator,
   CSS / HTML minifier, HTTP status codes, browser info and the
   favicon generator (self-coded ICO writer; ZIP comes from ziplib.js).
   ============================================================ */

const attr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/* Pixel width of a string in a given font — search engines cut
   titles by width, not by character count. */
const textWidth = (() => {
  const c = document.createElement("canvas").getContext("2d");
  return (s, font) => { c.font = font; return c.measureText(s).width; };
})();

/* ============================================================
   Meta & Open Graph generator
   ============================================================ */
Toolbox.define("meta", root => {
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <div class="tk-grid" style="grid-template-columns:1fr">
          <label class="tk-field"><span class="tk-label">Title <em id="mt-tl"></em></span><input class="tk-input" id="mt-title" value="Bugfish Tools — 50 free developer utilities"></label>
          <label class="tk-field"><span class="tk-label">Description <em id="mt-dl"></em></span><textarea class="tk-textarea short" id="mt-desc">bcrypt, JWT, DNS, JSON, regex and 45 more tools that run entirely in your browser. No uploads, no tracking.</textarea></label>
          <label class="tk-field"><span class="tk-label">Canonical URL</span><input class="tk-input" id="mt-url" value="https://example.com/tools/"></label>
          <div class="tk-grid two">
            <label class="tk-field"><span class="tk-label">Site name</span><input class="tk-input" id="mt-site" value="Example"></label>
            <label class="tk-field"><span class="tk-label">Type</span><select class="tk-select" id="mt-type"><option>website</option><option>article</option><option>product</option><option>profile</option></select></label>
          </div>
          <label class="tk-field"><span class="tk-label">Share image URL (1200 × 630)</span><input class="tk-input" id="mt-img" value="https://example.com/og-image.jpg"></label>
          <label class="tk-field"><span class="tk-label">Image alt text</span><input class="tk-input" id="mt-alt" value="Screenshot of the tools page"></label>
          <div class="tk-grid two">
            <label class="tk-field"><span class="tk-label">Locale</span><input class="tk-input" id="mt-loc" value="en_US"></label>
            <label class="tk-field"><span class="tk-label">X / Twitter @handle</span><input class="tk-input" id="mt-tw" placeholder="@yourhandle"></label>
            <label class="tk-field"><span class="tk-label">Author</span><input class="tk-input" id="mt-author"></label>
            <label class="tk-field"><span class="tk-label">Theme color</span><input class="tk-input" type="color" id="mt-color" value="#0a0b0d"></label>
          </div>
          <div class="tk-row">
            <label class="tk-check"><input type="checkbox" id="mt-index" checked> index</label>
            <label class="tk-check"><input type="checkbox" id="mt-follow" checked> follow</label>
            <label class="tk-check"><input type="checkbox" id="mt-ld" checked> JSON-LD</label>
          </div>
        </div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// search result preview</h3>
        <div style="background:#fff;border-radius:8px;padding:14px 16px;font-family:Arial,sans-serif">
          <div style="font-size:12px;color:#202124" id="pv-url"></div>
          <div style="font-size:20px;color:#1a0dab;line-height:1.3;margin:3px 0" id="pv-title"></div>
          <div style="font-size:14px;color:#4d5156;line-height:1.58" id="pv-desc"></div>
        </div>
        <h3 class="tk-h">// social card preview</h3>
        <div style="border:1px solid var(--border2);border-radius:10px;overflow:hidden;background:var(--bg)">
          <div id="pv-img" style="aspect-ratio:1.91/1;background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-family:var(--mono);font-size:12px;text-align:center;padding:10px;background-size:cover;background-position:center"></div>
          <div style="padding:10px 12px"><div class="tk-dim" style="font-size:12px;text-transform:uppercase" id="pv-host"></div>
            <div style="color:var(--text-bright);font-weight:700" id="pv-ctitle"></div><div class="tk-note" id="pv-cdesc"></div></div>
        </div>
        <div class="tk-row" style="margin-top:8px"><button class="tk-copy" type="button" id="mt-local">preview a local image</button>
          <span class="tk-note">the remote image URL is not loaded — this page makes no third-party requests.</span></div>
      </section>
    </div>
    <section class="tk-panel"><h3 class="tk-h">// &lt;head&gt; tags</h3>
      <textarea class="tk-textarea tall" id="mt-out" readonly spellcheck="false"></textarea>
      <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#mt-out")}</div></section>`;

  const $ = s => root.querySelector(s);
  const v = id => $(id).value.trim();
  const meter = (el, n, px, maxN, maxPx) => {
    const bad = n > maxN || px > maxPx;
    el.innerHTML = `<span class="${bad ? "tk-err" : n > maxN * 0.85 ? "tk-warn" : "tk-ok"}">${n} chars · ${Math.round(px)} / ${maxPx} px</span>`;
  };
  const cut = (s, maxPx, font) => { if (textWidth(s, font) <= maxPx) return s; let t = s; while (t && textWidth(t + " …", font) > maxPx) t = t.slice(0, -1); return t.replace(/\s+\S*$/, "") + " …"; };

  function run() {
    const title = v("#mt-title"), desc = v("#mt-desc"), url = v("#mt-url"), img = v("#mt-img");
    meter($("#mt-tl"), title.length, textWidth(title, "20px Arial"), 60, 580);
    meter($("#mt-dl"), desc.length, textWidth(desc, "14px Arial"), 160, 920);
    let host = url;
    try { const u = new URL(url); host = u.hostname; $("#pv-url").textContent = `${u.hostname}${u.pathname !== "/" ? " › " + u.pathname.split("/").filter(Boolean).join(" › ") : ""}`; } catch (e) { $("#pv-url").textContent = url; }
    $("#pv-title").textContent = cut(title || "Title", 580, "20px Arial");
    $("#pv-desc").textContent = cut(desc || "Description", 920 * 2 - 40, "14px Arial");
    $("#pv-host").textContent = host;
    $("#pv-ctitle").textContent = title;
    $("#pv-cdesc").textContent = desc.length > 120 ? desc.slice(0, 117) + "…" : desc;
    if (!$("#pv-img").dataset.local) $("#pv-img").textContent = img ? `image: ${img}` : "no image set";

    const robots = `${$("#mt-index").checked ? "index" : "noindex"},${$("#mt-follow").checked ? "follow" : "nofollow"}`;
    const L = [];
    L.push(`<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`);
    L.push(`<title>${attr(title)}</title>`);
    if (desc) L.push(`<meta name="description" content="${attr(desc)}">`);
    L.push(`<meta name="robots" content="${robots}">`);
    if (v("#mt-author")) L.push(`<meta name="author" content="${attr(v("#mt-author"))}">`);
    if (url) L.push(`<link rel="canonical" href="${attr(url)}">`);
    L.push(`<meta name="theme-color" content="${$("#mt-color").value}">`, "");
    L.push(`<!-- Open Graph -->`, `<meta property="og:type" content="${v("#mt-type")}">`, `<meta property="og:title" content="${attr(title)}">`);
    if (desc) L.push(`<meta property="og:description" content="${attr(desc)}">`);
    if (url) L.push(`<meta property="og:url" content="${attr(url)}">`);
    if (v("#mt-site")) L.push(`<meta property="og:site_name" content="${attr(v("#mt-site"))}">`);
    if (v("#mt-loc")) L.push(`<meta property="og:locale" content="${attr(v("#mt-loc"))}">`);
    if (img) {
      L.push(`<meta property="og:image" content="${attr(img)}">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`);
      if (v("#mt-alt")) L.push(`<meta property="og:image:alt" content="${attr(v("#mt-alt"))}">`);
    }
    L.push("", `<!-- X / Twitter -->`, `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">`);
    if (v("#mt-tw")) L.push(`<meta name="twitter:site" content="${attr(v("#mt-tw").replace(/^@?/, "@"))}">`);
    L.push(`<meta name="twitter:title" content="${attr(title)}">`);
    if (desc) L.push(`<meta name="twitter:description" content="${attr(desc)}">`);
    if (img) L.push(`<meta name="twitter:image" content="${attr(img)}">`);
    if ($("#mt-ld").checked) {
      const ld = { "@context": "https://schema.org", "@type": v("#mt-type") === "article" ? "Article" : "WebPage", name: title, description: desc || undefined, url: url || undefined, image: img || undefined };
      if (v("#mt-type") === "article") { ld.headline = title; delete ld.name; if (v("#mt-author")) ld.author = { "@type": "Person", name: v("#mt-author") }; }
      L.push("", `<script type="application/ld+json">`, JSON.stringify(ld, null, 2), `</script>`);
    }
    $("#mt-out").value = L.join("\n");
  }
  root.querySelectorAll("input, textarea, select").forEach(el => el.addEventListener("input", run));
  $("#mt-local").addEventListener("click", () => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = "image/*";
    i.onchange = () => {
      if (!i.files[0]) return;
      const box = $("#pv-img");
      box.dataset.local = "1";
      box.textContent = "";
      box.style.backgroundImage = `url("${URL.createObjectURL(i.files[0])}")`;
    };
    i.click();
  });
  run();
});

/* ============================================================
   .htaccess & Nginx generator
   ============================================================ */
Toolbox.define("serverconf", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-grid">
        <label class="tk-field"><span class="tk-label">Domain</span><input class="tk-input" id="sv-dom" value="example.com" spellcheck="false"></label>
        <label class="tk-field"><span class="tk-label">www</span><select class="tk-select" id="sv-www"><option value="none">leave as is</option><option value="non" selected>redirect www → non-www</option><option value="www">redirect non-www → www</option></select></label>
        <label class="tk-field"><span class="tk-label">Web root (Nginx)</span><input class="tk-input" id="sv-root" value="/var/www/example.com/public" spellcheck="false"></label>
        <label class="tk-field"><span class="tk-label">PHP-FPM socket (Nginx)</span><input class="tk-input" id="sv-fpm" value="unix:/run/php/php8.3-fpm.sock" spellcheck="false"></label>
      </div>
      <div class="tk-grid narrow" style="margin-top:14px">
        ${[["https", "force HTTPS", 1], ["hsts", "HSTS (1 year)", 1], ["front", "front controller → index.php", 1], ["ext", "hide .php / .html", 0], ["gzip", "compression", 1], ["cache", "browser caching", 1],
          ["sec", "security headers", 1], ["csp", "basic CSP (self only)", 0], ["dot", "block dotfiles (.git, .env)", 1], ["noidx", "no directory listing", 1], ["cors", "CORS for fonts", 0],
          ["xmlrpc", "block WordPress xmlrpc.php", 0], ["err", "custom 404 / 500 pages", 1]]
          .map(([k, l, on]) => `<label class="tk-check"><input type="checkbox" data-o="${k}" ${on ? "checked" : ""}> ${l}</label>`).join("")}
      </div>
      <div class="tk-grid two" style="margin-top:14px">
        <label class="tk-field"><span class="tk-label">301 redirects — one per line: <code>/old /new</code></span>
          <textarea class="tk-textarea short" id="sv-redir" spellcheck="false">/old-page /new-page
/blog/2019/hello /blog/hello</textarea></label>
        <label class="tk-field"><span class="tk-label">Max upload size (MB)</span><input class="tk-input" id="sv-up" type="number" min="1" value="64"></label>
      </div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel"><h3 class="tk-h">// apache .htaccess</h3><textarea class="tk-textarea tall" id="sv-ap" readonly spellcheck="false"></textarea>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#sv-ap")}<button class="tk-copy" type="button" data-dl="ap">Download</button></div></section>
      <section class="tk-panel"><h3 class="tk-h">// nginx server block</h3><textarea class="tk-textarea tall" id="sv-ng" readonly spellcheck="false"></textarea>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#sv-ng")}<button class="tk-copy" type="button" data-dl="ng">Download</button></div></section>
    </div>
    <p class="tk-note">Always test on staging first: <code>apachectl configtest</code> / <code>nginx -t</code>. Enable HSTS only once HTTPS works on every subdomain you include.</p>`;

  const $ = s => root.querySelector(s);
  const on = k => root.querySelector(`[data-o="${k}"]`).checked;
  function run() {
    const dom = $("#sv-dom").value.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") || "example.com";
    const www = $("#sv-www").value;
    const canonHost = www === "www" ? `www.${dom}` : dom;
    const scheme = on("https") ? "https" : "http";
    const esc2 = dom.replace(/\./g, "\\.");
    const redirs = $("#sv-redir").value.split("\n").map(l => l.trim().split(/\s+/)).filter(p => p.length === 2 && p[0].startsWith("/"));
    const up = Math.max(1, +$("#sv-up").value || 64);
    const A = ["# Generated with Bugfish Tools — review before deploying", "", "Options -MultiViews" + (on("noidx") ? " -Indexes" : ""), "", "<IfModule mod_rewrite.c>", "  RewriteEngine On", ""];
    if (on("https")) A.push("  # Force HTTPS", "  RewriteCond %{HTTPS} off", "  RewriteCond %{HTTP:X-Forwarded-Proto} !https", `  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`, "");
    if (www === "non") A.push("  # www → non-www", `  RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]`, `  RewriteRule ^ ${scheme}://%1%{REQUEST_URI} [L,R=301]`, "");
    if (www === "www") A.push("  # non-www → www", `  RewriteCond %{HTTP_HOST} ^${esc2}$ [NC]`, `  RewriteRule ^ ${scheme}://www.${dom}%{REQUEST_URI} [L,R=301]`, "");
    if (redirs.length) { A.push("  # 301 redirects"); redirs.forEach(([a, b]) => A.push(`  RewriteRule ^${a.slice(1).replace(/[.+?()[\]{}|$^]/g, "\\$&")}/?$ ${b} [L,R=301]`)); A.push(""); }
    if (on("xmlrpc")) A.push("  # Block XML-RPC (WordPress brute-force target)", "  RewriteRule ^xmlrpc\\.php$ - [F,L]", "");
    if (on("ext")) A.push("  # Serve /page for page.php and page.html", "  RewriteCond %{REQUEST_FILENAME} !-d", "  RewriteCond %{REQUEST_FILENAME}.php -f", "  RewriteRule ^(.+?)/?$ $1.php [L]", "  RewriteCond %{REQUEST_FILENAME} !-d", "  RewriteCond %{REQUEST_FILENAME}.html -f", "  RewriteRule ^(.+?)/?$ $1.html [L]", "");
    if (on("front")) A.push("  # Front controller", "  RewriteCond %{REQUEST_FILENAME} !-f", "  RewriteCond %{REQUEST_FILENAME} !-d", "  RewriteRule ^ index.php [L]");
    A.push("</IfModule>", "");
    if (on("dot")) A.push("# Deny access to hidden files (.git, .env, .htpasswd)", `<FilesMatch "^\\.">`, "  Require all denied", "</FilesMatch>", `RedirectMatch 404 /\\.git`, "");
    if (on("err")) A.push("ErrorDocument 404 /404.html", "ErrorDocument 500 /500.html", "");
    if (on("gzip")) A.push("<IfModule mod_deflate.c>", "  AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml application/javascript application/json application/xml image/svg+xml font/ttf font/otf", "</IfModule>", "");
    if (on("cache")) A.push("<IfModule mod_expires.c>", "  ExpiresActive On", '  ExpiresDefault "access plus 1 hour"', '  ExpiresByType text/html "access plus 0 seconds"',
      '  ExpiresByType text/css "access plus 1 year"', '  ExpiresByType application/javascript "access plus 1 year"', '  ExpiresByType image/webp "access plus 1 year"',
      '  ExpiresByType image/png "access plus 1 year"', '  ExpiresByType image/jpeg "access plus 1 year"', '  ExpiresByType image/svg+xml "access plus 1 year"', '  ExpiresByType font/woff2 "access plus 1 year"', "</IfModule>", "");
    const H = [];
    if (on("hsts") && on("https")) H.push('  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"');
    if (on("sec")) H.push('  Header always set X-Content-Type-Options "nosniff"', '  Header always set X-Frame-Options "SAMEORIGIN"', '  Header always set Referrer-Policy "strict-origin-when-cross-origin"', '  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"');
    if (on("csp")) H.push(`  Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"`);
    if (on("cors")) H.push('  <FilesMatch "\\.(woff2?|ttf|otf|eot)$">', '    Header set Access-Control-Allow-Origin "*"', "  </FilesMatch>");
    if (H.length) A.push("<IfModule mod_headers.c>", ...H, "</IfModule>", "");
    A.push("# Upload limit (mod_php only — with PHP-FPM set it in php.ini / .user.ini)", "<IfModule mod_php.c>", `  php_value upload_max_filesize ${up}M`, `  php_value post_max_size ${up + 8}M`, "</IfModule>");
    $("#sv-ap").value = A.join("\n") + "\n";

    const N = ["# Generated with Bugfish Tools — review before deploying"];
    const names = www === "none" ? `${dom} www.${dom}` : canonHost;
    const other = www === "non" ? `www.${dom}` : www === "www" ? dom : "";
    if (on("https")) {
      N.push("server {", "    listen 80;", "    listen [::]:80;", `    server_name ${dom} www.${dom};`, `    return 301 https://${www === "none" ? "$host" : canonHost}$request_uri;`, "}", "");
      if (other) N.push("server {", "    listen 443 ssl;", "    listen [::]:443 ssl;", "    http2 on;", `    server_name ${other};`, `    ssl_certificate     /etc/letsencrypt/live/${dom}/fullchain.pem;`, `    ssl_certificate_key /etc/letsencrypt/live/${dom}/privkey.pem;`, `    return 301 https://${canonHost}$request_uri;`, "}", "");
    } else if (other) N.push("server {", "    listen 80;", `    server_name ${other};`, `    return 301 http://${canonHost}$request_uri;`, "}", "");
    N.push("server {");
    if (on("https")) N.push("    listen 443 ssl;", "    listen [::]:443 ssl;", "    http2 on;"); else N.push("    listen 80;", "    listen [::]:80;");
    N.push(`    server_name ${names};`, `    root ${$("#sv-root").value.trim()};`, "    index index.php index.html;", `    client_max_body_size ${up}m;`);
    if (on("https")) N.push("", `    ssl_certificate     /etc/letsencrypt/live/${dom}/fullchain.pem;`, `    ssl_certificate_key /etc/letsencrypt/live/${dom}/privkey.pem;`);
    if (!on("noidx")) N.push("    autoindex on;");
    const NH = [];
    if (on("hsts") && on("https")) NH.push(`    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`);
    if (on("sec")) NH.push(`    add_header X-Content-Type-Options "nosniff" always;`, `    add_header X-Frame-Options "SAMEORIGIN" always;`, `    add_header Referrer-Policy "strict-origin-when-cross-origin" always;`, `    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`);
    if (on("csp")) NH.push(`    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" always;`);
    if (NH.length) N.push("", ...NH);
    if (on("gzip")) N.push("", "    gzip on;", "    gzip_vary on;", "    gzip_types text/plain text/css text/xml application/javascript application/json application/xml image/svg+xml font/ttf font/otf;");
    if (on("err")) N.push("", "    error_page 404 /404.html;", "    error_page 500 502 503 504 /500.html;");
    if (redirs.length) { N.push(""); redirs.forEach(([a, b]) => N.push(`    location = ${a} { return 301 ${b}; }`)); }
    if (on("dot")) N.push("", "    location ~ /\\.(?!well-known) { deny all; return 404; }");
    if (on("xmlrpc")) N.push("    location = /xmlrpc.php { deny all; }");
    if (on("cache")) N.push("", "    location ~* \\.(css|js|webp|png|jpe?g|gif|svg|ico|woff2?)$ {", "        expires 1y;", `        add_header Cache-Control "public, immutable";`, ...(on("cors") ? [`        add_header Access-Control-Allow-Origin "*";`] : []), "        access_log off;", "    }");
    else if (on("cors")) N.push("", "    location ~* \\.(woff2?|ttf|otf|eot)$ {", `        add_header Access-Control-Allow-Origin "*";`, "    }");
    N.push("", "    location / {", `        try_files $uri $uri/ ${on("ext") ? "$uri.php $uri.html " : ""}${on("front") ? "/index.php?$query_string" : "=404"};`, "    }");
    N.push("", "    location ~ \\.php$ {", "        try_files $uri =404;", "        include fastcgi_params;", `        fastcgi_pass ${$("#sv-fpm").value.trim()};`, "        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;", "    }", "}");
    $("#sv-ng").value = N.join("\n") + "\n";
  }
  root.querySelectorAll("input, select, textarea:not([readonly])").forEach(el => el.addEventListener("input", run));
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-dl]");
    if (b) TK.download(b.dataset.dl === "ap" ? ".htaccess" : "nginx-site.conf", $(b.dataset.dl === "ap" ? "#sv-ap" : "#sv-ng").value, "text/plain");
  });
  run();
});

/* ============================================================
   CSS & HTML minifier / beautifier
   ============================================================ */
/* Splits CSS into strings, comments and code so rewrites never
   touch the inside of a string or url(). */
function cssChunks(src) {
  const out = [];
  const re = /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\/\*[\s\S]*?\*\/|url\(\s*[^)'"]*\s*\))/g;
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: "code", v: src.slice(last, m.index) });
    out.push({ t: m[0].startsWith("/*") ? "comment" : "str", v: m[0] });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: "code", v: src.slice(last) });
  return out;
}
function minifyCSS(src) {
  let depth = 0; // parenthesis depth, carried across chunks
  // "0px" → "0" only outside of functions: calc(1px + 0px) must keep its unit,
  // and 0% is left alone (keyframe selectors need it).
  const zeroUnits = s => s.replace(/(^|[:\s,])0(?:px|em|rem|pt|pc|cm|mm|in|ex|ch|vw|vh|vmin|vmax)(?=[\s;}!,]|$)/g, (m, p) => `${p}0`);
  return cssChunks(src).map(c => {
    if (c.t === "comment") return c.v.startsWith("/*!") ? c.v : "";
    if (c.t === "str") return c.v;
    let v = c.v
      .replace(/\s+/g, " ")
      .replace(/\s*([{};,>~])\s*/g, "$1")
      .replace(/:\s+/g, ":")
      .replace(/;}/g, "}")
      .replace(/(^|[\s:,(])0+\.(\d)/g, "$1.$2")
      .replace(/(^|[:\s,(])#([0-9a-f])\2([0-9a-f])\3([0-9a-f])\4(?=[\s;,)!}]|$)/gi, "$1#$2$3$4");
    let out = "", seg = "";
    for (const ch of v) {
      if (ch === "(") { if (depth === 0) { out += zeroUnits(seg); seg = ""; } depth++; seg += ch; }
      else if (ch === ")") { depth = Math.max(0, depth - 1); seg += ch; if (depth === 0) { out += seg; seg = ""; } }
      else seg += ch;
    }
    return out + (depth === 0 ? zeroUnits(seg) : seg);
  }).join("").replace(/;;+/g, ";").replace(/;}/g, "}").trim();
}
function beautifyCSS(src, ind = "  ") {
  let out = "", depth = 0;
  const min = cssChunks(src).map(c => (c.t === "code" ? c.v.replace(/\s+/g, " ") : c.v));
  const text = min.join("");
  let i = 0, inStr = null, paren = 0;
  const nl = () => { out = out.replace(/[ \t]+$/, ""); out += "\n" + ind.repeat(depth); };
  while (i < text.length) {
    const c = text[i];
    if (inStr) { out += c; if (c === "\\") { out += text[++i] || ""; } else if (c === inStr) inStr = null; i++; continue; }
    if (c === '"' || c === "'") { inStr = c; out += c; i++; continue; }
    if (text.startsWith("/*", i)) { const e = text.indexOf("*/", i + 2); const end = e < 0 ? text.length : e + 2; out += text.slice(i, end); i = end; nl(); continue; }
    if (c === "(") paren++;
    if (c === ")") paren--;
    if (c === "{") { out = out.replace(/\s+$/, "") + " {"; depth++; nl(); }
    else if (c === "}") { depth = Math.max(0, depth - 1); out = out.replace(/\s+$/, ""); nl(); out += "}"; depth === 0 ? (out += "\n", nl()) : nl(); }
    else if (c === ";" && !paren) { out += ";"; nl(); }
    else if (c === "," && !paren && depth === 0) { out = out.replace(/\s+$/, "") + ","; nl(); }
    else if (c === ":" && depth > 0 && !paren) { out += ": "; while (text[i + 1] === " ") i++; }
    else if (c === " " && /[\s{;]$/.test(out)) { /* skip */ }
    else out += c;
    i++;
  }
  return out.replace(/\n\s*\n\s*\n/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim() + "\n";
}
const VOID_TAGS = new Set("area base br col embed hr img input link meta source track wbr".split(" "));
const RAW_TAGS = new Set(["script", "style", "pre", "textarea"]);
const INLINE_TAGS = new Set("a abbr b bdi bdo cite code data dfn em i kbd mark q s samp small span strong sub sup time u var label".split(" "));
function htmlTokens(src) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-zA-Z][\w:-]*)(?:\s+(?:[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?))*\s*\/?>|[^<]+|</gi;
  let m;
  while ((m = re.exec(src))) {
    const v = m[0];
    if (v.startsWith("<!--")) out.push({ t: "comment", v });
    else if (/^<!doctype/i.test(v)) out.push({ t: "doctype", v });
    else if (m[1]) {
      const name = m[1].toLowerCase();
      const close = v.startsWith("</");
      out.push({ t: close ? "close" : "open", name, v, self: VOID_TAGS.has(name) || /\/>$/.test(v) });
      if (!close && RAW_TAGS.has(name)) {
        const end = src.toLowerCase().indexOf(`</${name}`, re.lastIndex);
        const stop = end < 0 ? src.length : end;
        if (stop > re.lastIndex) out.push({ t: "raw", v: src.slice(re.lastIndex, stop), name });
        re.lastIndex = stop;
      }
    } else out.push({ t: "text", v });
  }
  return out;
}
function minifyHTML(src, inlineCss) {
  return htmlTokens(src).map((t, i, all) => {
    if (t.t === "comment") return /^<!--\[if|^<!--\s*!/.test(t.v) ? t.v : "";
    if (t.t === "raw") return t.name === "style" && inlineCss ? minifyCSS(t.v) : t.name === "script" ? t.v.trim() : t.v;
    if (t.t === "text") {
      const s = t.v.replace(/\s+/g, " ");
      const prev = all[i - 1], next = all[i + 1];
      const inlinePrev = prev && (prev.t === "text" || INLINE_TAGS.has(prev.name));
      const inlineNext = next && (next.t === "text" || INLINE_TAGS.has(next.name));
      if (!s.trim()) return inlinePrev && inlineNext ? " " : "";
      return (inlinePrev ? s : s.replace(/^ /, "")).replace(inlineNext ? /$^/ : / $/, "");
    }
    return t.v.replace(/\s+/g, " ").replace(/\s+(\/?>)$/, "$1");
  }).join("").trim();
}
function beautifyHTML(src, ind = "  ") {
  const toks = htmlTokens(src);
  let out = "", depth = 0;
  const line = s => { out += ind.repeat(Math.max(0, depth)) + s + "\n"; };
  let buf = "", skipTo = -1;
  const flush = () => { if (buf.trim()) line(buf.trim().replace(/\s+/g, " ")); buf = ""; };
  toks.forEach((t, i) => {
    if (i <= skipTo) return;
    if (t.t === "text" || (t.name && INLINE_TAGS.has(t.name) && t.t !== "raw")) { buf += t.v; return; }
    flush();
    if (t.t === "doctype" || t.t === "comment") line(t.v.trim());
    else if (t.t === "raw") {
      const body = t.v.replace(/^\n+|\s+$/g, "");
      if (!body) return;
      if (t.name === "pre" || t.name === "textarea") { out = out.replace(/\n$/, "") + t.v; return; }
      const lines = body.split("\n");
      const minIndent = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
      lines.forEach(l => line(l.slice(minIndent)));
    } else if (t.t === "open") {
      // <li>short text</li> stays on one line when it only holds text / inline tags.
      if (!t.self && !RAW_TAGS.has(t.name)) {
        let j = i + 1, inner = "";
        while (j < toks.length && (toks[j].t === "text" || (INLINE_TAGS.has(toks[j].name) && toks[j].t !== "raw"))) inner += toks[j++].v;
        if (toks[j] && toks[j].t === "close" && toks[j].name === t.name && inner.replace(/\s+/g, " ").trim().length <= 80 && !/\n\s*\n/.test(inner)) {
          line(t.v.replace(/\s+/g, " ") + inner.replace(/\s+/g, " ").trim() + toks[j].v);
          skipTo = j;
          return;
        }
      }
      line(t.v.replace(/\s+/g, " "));
      if (!t.self) depth++;
    } else if (t.t === "close") {
      depth--;
      const prev = toks[i - 1];
      if (prev && (prev.name === "pre" || prev.name === "textarea") && prev.t === "raw") { out += t.v + "\n"; return; }
      line(t.v);
    }
  });
  flush();
  return out;
}
async function gzipSize(text) {
  if (!window.CompressionStream) return null;
  const s = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(s).arrayBuffer()).byteLength;
}

Toolbox.define("cssmin", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        ${TK.segHtml("mn-lang", [["css", "CSS"], ["html", "HTML"]], "css")}
        ${TK.segHtml("mn-act", [["min", "Minify"], ["pretty", "Beautify"]], "min")}
        <label class="tk-check" id="mn-inl-f" hidden><input type="checkbox" id="mn-inl" checked> minify inline &lt;style&gt;</label>
        <span class="tk-note" id="mn-stat"></span>
      </div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel"><textarea class="tk-textarea tall" id="mn-in" spellcheck="false"></textarea></section>
      <section class="tk-panel"><textarea class="tk-textarea tall" id="mn-out" readonly spellcheck="false"></textarea>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#mn-out")}<button class="tk-copy" type="button" id="mn-dl">Download</button></div></section>
    </div>
    <p class="tk-note">CSS minification is conservative: comments (except <code>/*! … */</code>), whitespace, last semicolons, zero units and long hex colors.
      Strings and <code>url()</code> are never touched. JavaScript is not minified here — use a real bundler (esbuild, terser) for that.</p>`;
  const $ = s => root.querySelector(s);
  const SAMPLE_CSS = `/* Card component */
.card  ,  .panel > .title {
    color : #ffffff;
    margin: 0px 0px 10px 0px;
    padding: 0.5em 1.25rem;
    background: url( "data:image/svg+xml,%3Csvg%3E%3C/svg%3E" ) no-repeat , linear-gradient(to right, #ff6600, #aa3300);
    width: calc(100% - 20px);
}

@media (max-width: 700px) {
    .card { padding: 0.25em; }
}
/*! keep this license comment */`;
  const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- a comment -->
    <title>  Demo page </title>
    <style>
      body { margin: 0px; color: #333333; }
    </style>
  </head>
  <body>
    <h1>   Hello   <em>world</em> !  </h1>
    <p>Some    text with   spaces.</p>
    <pre>  keep
    this   </pre>
  </body>
</html>`;
  let lang = "css", act = "min";
  $("#mn-in").value = SAMPLE_CSS;
  async function run() {
    const src = $("#mn-in").value;
    let out;
    if (lang === "css") out = act === "min" ? minifyCSS(src) : beautifyCSS(src);
    else out = act === "min" ? minifyHTML(src, $("#mn-inl").checked) : beautifyHTML(src);
    $("#mn-out").value = out;
    const a = TK.utf8(src).length, b = TK.utf8(out).length;
    const [ga, gb] = await Promise.all([gzipSize(src), gzipSize(out)]);
    $("#mn-stat").innerHTML = `${TK.fmtBytes(a)} → <b style="color:var(--orange)">${TK.fmtBytes(b)}</b> (${a ? (b <= a ? "−" : "+") + Math.abs(Math.round((1 - b / a) * 100)) : 0} %)` +
      (ga != null ? ` · gzip ${TK.fmtBytes(ga)} → ${TK.fmtBytes(gb)}` : "");
  }
  TK.seg($("#mn-lang"), v => {
    lang = v;
    $("#mn-inl-f").hidden = v !== "html";
    const cur = $("#mn-in").value;
    if (!cur.trim() || cur === SAMPLE_CSS || cur === SAMPLE_HTML) $("#mn-in").value = v === "css" ? SAMPLE_CSS : SAMPLE_HTML;
    run();
  });
  TK.seg($("#mn-act"), v => { act = v; run(); });
  $("#mn-inl").addEventListener("change", run);
  $("#mn-in").addEventListener("input", TK.debounce(run, 200));
  $("#mn-dl").addEventListener("click", () => TK.download(`output.${act === "min" ? "min." : ""}${lang}`, $("#mn-out").value, "text/plain"));
  run();
});

/* ============================================================
   HTTP status codes
   ============================================================ */
const HTTP_CODES = [
  [100, "Continue", "Server received the request headers; the client may send the body (used with Expect: 100-continue)."],
  [101, "Switching Protocols", "Protocol upgrade accepted — typical for WebSocket handshakes."],
  [102, "Processing", "WebDAV: request received, still working on it."],
  [103, "Early Hints", "Preload hints (Link headers) sent before the final response."],
  [200, "OK", "Standard success response."],
  [201, "Created", "A resource was created — return its URL in the Location header."],
  [202, "Accepted", "Request queued for asynchronous processing; not finished yet."],
  [203, "Non-Authoritative Information", "Payload was modified by a transforming proxy."],
  [204, "No Content", "Success without a body — common for DELETE and PUT in APIs."],
  [205, "Reset Content", "Success; the client should reset the document view (e.g. a form)."],
  [206, "Partial Content", "Answer to a Range request — video seeking, resumable downloads."],
  [207, "Multi-Status", "WebDAV: several status codes for several operations."],
  [208, "Already Reported", "WebDAV: members already listed earlier in the response."],
  [226, "IM Used", "Delta encoding applied to the response."],
  [300, "Multiple Choices", "Several representations available; the client picks one."],
  [301, "Moved Permanently", "Resource has a new permanent URL. Search engines move ranking to it. Method may change to GET."],
  [302, "Found", "Temporary redirect. Browsers change POST to GET — use 307 to keep the method."],
  [303, "See Other", "Redirect to another URL with GET — the classic Post/Redirect/Get pattern."],
  [304, "Not Modified", "Cached copy is still valid (ETag / If-Modified-Since). No body."],
  [307, "Temporary Redirect", "Temporary redirect that keeps method and body."],
  [308, "Permanent Redirect", "Permanent redirect that keeps method and body (the strict 301)."],
  [400, "Bad Request", "Malformed request: invalid syntax, JSON or parameters."],
  [401, "Unauthorized", "Authentication missing or invalid. Must send WWW-Authenticate. (Means unauthenticated.)"],
  [402, "Payment Required", "Reserved; used by some APIs for exhausted quotas or billing."],
  [403, "Forbidden", "Authenticated (or not) but not allowed. Re-authenticating will not help."],
  [404, "Not Found", "Nothing at this URL. Also used to hide resources the client may not know about."],
  [405, "Method Not Allowed", "URL exists but not for this method. Send an Allow header."],
  [406, "Not Acceptable", "No representation matches the Accept headers."],
  [407, "Proxy Authentication Required", "Authenticate with the proxy first."],
  [408, "Request Timeout", "Client took too long to send the request."],
  [409, "Conflict", "Conflicts with the current state — edit conflicts, duplicate keys."],
  [410, "Gone", "Removed on purpose and will not come back. Search engines drop it faster than a 404."],
  [411, "Length Required", "Content-Length header is required."],
  [412, "Precondition Failed", "If-Match / If-Unmodified-Since condition failed — optimistic locking."],
  [413, "Content Too Large", "Body exceeds the server limit (client_max_body_size, post_max_size)."],
  [414, "URI Too Long", "URL longer than the server accepts — often a redirect loop appending parameters."],
  [415, "Unsupported Media Type", "Content-Type of the body is not supported."],
  [416, "Range Not Satisfiable", "Requested byte range is outside the file."],
  [417, "Expectation Failed", "The Expect header cannot be met."],
  [418, "I'm a teapot", "April-fools RFC 2324. Some servers use it to reject bots."],
  [421, "Misdirected Request", "Request sent to a server that cannot answer for this host (HTTP/2 connection reuse)."],
  [422, "Unprocessable Content", "Syntax is fine but validation failed — the usual API validation error."],
  [423, "Locked", "WebDAV: resource is locked."],
  [424, "Failed Dependency", "WebDAV: a previous request in the chain failed."],
  [425, "Too Early", "Server refuses to process a request that might be replayed (TLS early data)."],
  [426, "Upgrade Required", "Switch to another protocol, given in the Upgrade header."],
  [428, "Precondition Required", "Server requires conditional requests to avoid lost updates."],
  [429, "Too Many Requests", "Rate limit hit. Honour the Retry-After header."],
  [431, "Request Header Fields Too Large", "Headers too big — frequently oversized cookies."],
  [451, "Unavailable For Legal Reasons", "Blocked for legal reasons (censorship, court order)."],
  [500, "Internal Server Error", "Generic server-side failure — check the error log."],
  [501, "Not Implemented", "The server does not support the functionality (e.g. unknown method)."],
  [502, "Bad Gateway", "Proxy got an invalid answer from upstream — PHP-FPM or app server down or crashed."],
  [503, "Service Unavailable", "Overloaded or in maintenance. Send Retry-After; search engines retry later."],
  [504, "Gateway Timeout", "Upstream did not answer in time — slow queries, fastcgi_read_timeout / proxy_read_timeout."],
  [505, "HTTP Version Not Supported", "The HTTP version used is not supported."],
  [506, "Variant Also Negotiates", "Content negotiation configuration error."],
  [507, "Insufficient Storage", "WebDAV: no space left to store the representation."],
  [508, "Loop Detected", "WebDAV: infinite loop while processing."],
  [510, "Not Extended", "Further extensions to the request are required."],
  [511, "Network Authentication Required", "Captive portal — log in to the network first."],
  [520, "Web Server Returned an Unknown Error", "Cloudflare: origin returned something unexpected."],
  [521, "Web Server Is Down", "Cloudflare: origin refused the connection."],
  [522, "Connection Timed Out", "Cloudflare: TCP handshake with the origin timed out."],
  [524, "A Timeout Occurred", "Cloudflare: origin accepted the connection but did not reply in 100 s."],
];

Toolbox.define("httpstatus", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row"><input class="tk-input tk-grow" id="hc-q" placeholder="search code, name or meaning — e.g. 502, redirect, rate limit" spellcheck="false">
        ${TK.segHtml("hc-cls", [["all", "all"], ["1", "1xx"], ["2", "2xx"], ["3", "3xx"], ["4", "4xx"], ["5", "5xx"]], "all")}</div>
    </section>
    <section class="tk-panel"><div class="tk-scroll" id="hc-out"></div></section>`;
  const $ = s => root.querySelector(s);
  let cls = "all";
  const color = c => (c < 200 ? "info" : c < 300 ? "ok" : c < 400 ? "" : c < 500 ? "warn" : "err");
  function run() {
    const q = $("#hc-q").value.trim().toLowerCase();
    const rows = HTTP_CODES.filter(([c, n, d]) => (cls === "all" || String(c)[0] === cls) && (!q || `${c} ${n} ${d}`.toLowerCase().includes(q)));
    $("#hc-out").innerHTML = rows.length ? `<table class="tk-table"><tbody>${rows.map(([c, n, d]) =>
      `<tr><td style="width:1%"><span class="tk-badge ${color(c)}" style="font-size:13px">${c}</span></td><td style="white-space:nowrap;color:var(--text-bright);font-weight:600">${esc(n)}</td><td>${esc(d)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="tk-note">no status code matches</p>`;
  }
  TK.seg($("#hc-cls"), v => { cls = v; run(); });
  $("#hc-q").addEventListener("input", run);
  run();
});

/* ============================================================
   Browser & device info
   ============================================================ */
Toolbox.define("browser", root => {
  root.innerHTML = `
    <section class="tk-panel"><div class="tk-row"><span class="tk-note">Everything below is read locally by this page and never sent anywhere. Handy for bug reports:</span>
      <button class="btn small" id="bi-copy" type="button">Copy report</button></div></section>
    <div class="tk-grid two">
      <section class="tk-panel"><h3 class="tk-h">// browser</h3><div id="bi-browser"></div></section>
      <section class="tk-panel"><h3 class="tk-h">// screen &amp; viewport</h3><div id="bi-screen"></div></section>
      <section class="tk-panel"><h3 class="tk-h">// locale &amp; hardware</h3><div id="bi-locale"></div></section>
      <section class="tk-panel"><h3 class="tk-h">// media queries</h3><div id="bi-mq"></div></section>
    </div>
    <section class="tk-panel"><h3 class="tk-h">// feature support</h3><div class="tk-row tight" id="bi-feat"></div></section>`;
  const $ = s => root.querySelector(s);
  const report = {};
  function guess(ua) {
    const b = /Edg\/([\d.]+)/.exec(ua) ? ["Edge", RegExp.$1] : /OPR\/([\d.]+)/.exec(ua) ? ["Opera", RegExp.$1] : /Firefox\/([\d.]+)/.exec(ua) ? ["Firefox", RegExp.$1]
      : /Chrome\/([\d.]+)/.exec(ua) ? ["Chrome", RegExp.$1] : /Version\/([\d.]+).*Safari/.exec(ua) ? ["Safari", RegExp.$1] : ["unknown", ""];
    const os = /Windows NT 10/.test(ua) ? "Windows 10 / 11" : /Windows NT ([\d.]+)/.test(ua) ? `Windows NT ${RegExp.$1}` : /Android ([\d.]+)/.test(ua) ? `Android ${RegExp.$1}`
      : /iPhone OS ([\d_]+)/.test(ua) ? `iOS ${RegExp.$1.replace(/_/g, ".")}` : /iPad/.test(ua) ? "iPadOS" : /Mac OS X ([\d_]+)/.test(ua) ? `macOS ${RegExp.$1.replace(/_/g, ".")}`
      : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "unknown";
    return { browser: `${b[0]} ${b[1].split(".")[0]}`.trim(), os };
  }
  function section(id, rows) { report[id] = Object.fromEntries(rows); $(`#bi-${id}`).innerHTML = TK.kv(rows.map(([k, v]) => [k, String(v)]), false); }
  function run() {
    const n = navigator, ua = n.userAgent, g = guess(ua);
    const brands = n.userAgentData ? n.userAgentData.brands.map(b => `${b.brand} ${b.version}`).filter(x => !/Not.A.Brand/i.test(x)).join(", ") : "not exposed";
    section("browser", [["browser", g.browser], ["os", g.os], ["client hints", brands], ["mobile", n.userAgentData ? n.userAgentData.mobile : /Mobi/.test(ua)],
      ["user agent", ua], ["cookies", n.cookieEnabled ? "enabled" : "disabled"], ["do not track", n.doNotTrack === "1" ? "on" : "off"], ["online", n.onLine]]);
    const o = screen.orientation ? screen.orientation.type : "-";
    section("screen", [["screen", `${screen.width} × ${screen.height}`], ["available", `${screen.availWidth} × ${screen.availHeight}`],
      ["viewport", `${innerWidth} × ${innerHeight}`], ["document", `${document.documentElement.clientWidth} × ${document.documentElement.clientHeight}`],
      ["pixel ratio", devicePixelRatio], ["physical px", `${Math.round(innerWidth * devicePixelRatio)} × ${Math.round(innerHeight * devicePixelRatio)}`],
      ["color depth", `${screen.colorDepth} bit`], ["orientation", o]]);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const conn = n.connection;
    section("locale", [["languages", (n.languages || [n.language]).join(", ")], ["time zone", `${tz} (UTC${-new Date().getTimezoneOffset() >= 0 ? "+" : ""}${-new Date().getTimezoneOffset() / 60})`],
      ["number format", (1234567.891).toLocaleString()], ["date format", new Date().toLocaleString()],
      ["CPU threads", n.hardwareConcurrency || "-"], ["device memory", n.deviceMemory ? `≥ ${n.deviceMemory} GB` : "not exposed"],
      ["touch points", n.maxTouchPoints], ["connection", conn ? `${conn.effectiveType || "?"}${conn.downlink ? `, ~${conn.downlink} Mbit/s` : ""}${conn.rtt ? `, ${conn.rtt} ms RTT` : ""}` : "not exposed"]]);
    const mq = q => matchMedia(q).matches;
    section("mq", [["color scheme", mq("(prefers-color-scheme: dark)") ? "dark" : "light"], ["reduced motion", mq("(prefers-reduced-motion: reduce)") ? "reduce" : "no preference"],
      ["contrast", mq("(prefers-contrast: more)") ? "more" : mq("(prefers-contrast: less)") ? "less" : "no preference"],
      ["pointer", mq("(pointer: coarse)") ? "coarse (touch)" : mq("(pointer: fine)") ? "fine (mouse)" : "none"], ["hover", mq("(hover: hover)") ? "yes" : "no"],
      ["color gamut", mq("(color-gamut: rec2020)") ? "rec2020" : mq("(color-gamut: p3)") ? "P3" : "sRGB"], ["HDR", mq("(dynamic-range: high)") ? "yes" : "no"],
      ["forced colors", mq("(forced-colors: active)") ? "active" : "none"], ["display mode", mq("(display-mode: standalone)") ? "standalone (PWA)" : "browser"]]);
  }
  let gl = "-";
  try {
    const c = document.createElement("canvas").getContext("webgl");
    const d = c && c.getExtension("WEBGL_debug_renderer_info");
    gl = c ? (d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : "WebGL available") : "no WebGL";
  } catch (e) { gl = "no WebGL"; }
  const css = s => { try { return CSS.supports(s); } catch (e) { return false; } };
  const feats = [["WebGL", gl !== "no WebGL"], ["WebGPU", "gpu" in navigator], ["WebAssembly", typeof WebAssembly === "object"], ["Service Worker", "serviceWorker" in navigator],
    ["Web Crypto", !!(window.crypto && crypto.subtle)], ["Clipboard", !!navigator.clipboard], ["Web Share", "share" in navigator], ["Notifications", "Notification" in window],
    ["Web Bluetooth", "bluetooth" in navigator], ["WebUSB", "usb" in navigator], ["WebSerial", "serial" in navigator], ["Gamepad", "getGamepads" in navigator],
    ["IndexedDB", "indexedDB" in window], ["WebRTC", "RTCPeerConnection" in window], ["WebTransport", "WebTransport" in window], ["View Transitions", "startViewTransition" in document],
    ["CompressionStream", "CompressionStream" in window], ["Intl.Segmenter", !!(window.Intl && Intl.Segmenter)], ["CSS :has()", css("selector(:has(a))")], ["CSS nesting", css("selector(&)")],
    ["container queries", css("container-type: inline-size")], ["subgrid", css("grid-template-columns: subgrid")], ["color-mix()", css("color: color-mix(in srgb, red, blue)")], ["oklch()", css("color: oklch(50% 0.1 20)")]];
  $("#bi-feat").innerHTML = feats.map(([n, ok]) => `<span class="tk-badge ${ok ? "ok" : "err"}">${ok ? "✓" : "✗"} ${esc(n)}</span>`).join("");
  report.features = Object.fromEntries(feats);
  report.gpu = gl;
  run();
  const onResize = TK.debounce(run, 150);
  window.addEventListener("resize", onResize);
  $("#bi-copy").addEventListener("click", async e => { if (await TK.copy(JSON.stringify(report, null, 2))) TK.flash(e.target); });
  return () => window.removeEventListener("resize", onResize);
});

/* ============================================================
   Favicon generator — self-coded ICO writer (+ ZIP from ziplib.js)
   ============================================================ */
function buildIco(pngs) { // [{size, data}]
  const head = new DataView(new ArrayBuffer(6 + 16 * pngs.length));
  head.setUint16(2, 1, true);
  head.setUint16(4, pngs.length, true);
  let off = 6 + 16 * pngs.length;
  pngs.forEach((p, i) => {
    const o = 6 + i * 16;
    head.setUint8(o, p.size >= 256 ? 0 : p.size); head.setUint8(o + 1, p.size >= 256 ? 0 : p.size);
    head.setUint16(o + 4, 1, true); head.setUint16(o + 6, 32, true);
    head.setUint32(o + 8, p.data.length, true); head.setUint32(o + 12, off, true);
    off += p.data.length;
  });
  return TK.concat(new Uint8Array(head.buffer), ...pngs.map(p => p.data));
}

Toolbox.define("favicon", root => {
  const SIZES = [16, 32, 48, 180, 192, 512];
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        ${TK.segHtml("fv-src", [["text", "Text / emoji"], ["image", "Image"]], "text")}
        <div id="fv-text" style="margin-top:14px">
          <div class="tk-grid two">
            <label class="tk-field"><span class="tk-label">Text (1–3 chars or emoji)</span><input class="tk-input" id="fv-t" value="B" maxlength="6"></label>
            <label class="tk-field"><span class="tk-label">Shape</span><select class="tk-select" id="fv-shape"><option value="round">rounded</option><option value="square">square</option><option value="circle">circle</option></select></label>
            <label class="tk-field"><span class="tk-label">Background</span><input class="tk-input" type="color" id="fv-bg" value="#ff6600"></label>
            <label class="tk-field"><span class="tk-label">Text color</span><input class="tk-input" type="color" id="fv-fg" value="#0a0b0d"></label>
            <label class="tk-field"><span class="tk-label">Font</span><select class="tk-select" id="fv-font"><option value="700 {s}px 'Segoe UI', system-ui, sans-serif">Sans bold</option><option value="700 {s}px Consolas, 'Courier New', monospace">Mono bold</option><option value="700 {s}px Georgia, serif">Serif bold</option></select></label>
            <label class="tk-field"><span class="tk-label">Size <em id="fv-scale-v">62%</em></span><input type="range" id="fv-scale" min="30" max="95" value="62"></label>
          </div>
        </div>
        <div id="fv-image" style="margin-top:14px" hidden>
          <div class="tk-drop" id="fv-drop"><b>drop a square image</b> (PNG / SVG / JPG) or click</div>
          <label class="tk-check" style="margin-top:10px"><input type="checkbox" id="fv-pad"> add 10 % padding</label>
        </div>
        <label class="tk-field" style="margin-top:14px"><span class="tk-label">App name (manifest)</span><input class="tk-input" id="fv-name" value="My Site"></label>
        <div class="tk-row" style="margin-top:14px"><button class="btn" id="fv-zip">Download all (.zip)</button><button class="btn ghost" id="fv-ico">favicon.ico</button></div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// preview</h3>
        <div class="tk-row" id="fv-prev" style="align-items:flex-end"></div>
        <h3 class="tk-h">// html</h3>
        <textarea class="tk-textarea short" id="fv-html" readonly spellcheck="false"></textarea>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#fv-html")}</div>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  let src = "text", img = null;
  const canvases = {};

  function draw(size) {
    const c = canvases[size] || (canvases[size] = document.createElement("canvas"));
    c.width = c.height = size;
    const x = c.getContext("2d");
    x.clearRect(0, 0, size, size);
    if (src === "image" && img) {
      const pad = $("#fv-pad").checked ? size * 0.1 : 0;
      x.imageSmoothingQuality = "high";
      const s = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
      const sx = ((img.naturalWidth || img.width) - s) / 2, sy = ((img.naturalHeight || img.height) - s) / 2;
      x.drawImage(img, sx, sy, s, s, pad, pad, size - pad * 2, size - pad * 2);
    } else {
      const shape = $("#fv-shape").value;
      x.fillStyle = $("#fv-bg").value;
      x.beginPath();
      if (shape === "circle") x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      else if (shape === "round" && x.roundRect) x.roundRect(0, 0, size, size, size * 0.2);
      else x.rect(0, 0, size, size);
      x.fill();
      const t = $("#fv-t").value || "B";
      x.fillStyle = $("#fv-fg").value;
      x.textAlign = "center";
      x.textBaseline = "middle";
      const fs = size * (+$("#fv-scale").value / 100) * (t.length > 1 && !/\p{Extended_Pictographic}/u.test(t) ? 1.6 / Math.min(3, [...t].length) : 1);
      x.font = $("#fv-font").value.replace("{s}", Math.round(fs));
      x.fillText(t, size / 2, size / 2 + size * 0.04);
    }
    return c;
  }
  const png = c => new Promise(r => c.toBlob(b => b.arrayBuffer().then(a => r(new Uint8Array(a))), "image/png"));

  function render() {
    $("#fv-scale-v").textContent = `${$("#fv-scale").value}%`;
    const prev = $("#fv-prev");
    prev.innerHTML = "";
    SIZES.forEach(s => {
      const c = draw(s);
      const wrap = document.createElement("div");
      wrap.style.cssText = "text-align:center;font-family:var(--mono);font-size:10px;color:var(--text-dim)";
      const im = document.createElement("img");
      im.src = c.toDataURL();
      im.width = Math.min(s, 96); im.height = Math.min(s, 96);
      im.style.cssText = "display:block;margin-bottom:4px;image-rendering:" + (s < 64 ? "pixelated" : "auto");
      wrap.append(im, `${s}px`);
      prev.appendChild(wrap);
    });
    const name = $("#fv-name").value.trim() || "My Site";
    $("#fv-html").value = [`<link rel="icon" href="/favicon.ico" sizes="48x48">`, `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">`,
      `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
      `<link rel="manifest" href="/site.webmanifest">`, `<!-- site.webmanifest name: ${name} -->`].join("\n");
  }
  async function files() {
    const p = {};
    for (const s of SIZES) p[s] = await png(draw(s));
    const ico = buildIco([16, 32, 48].map(s => ({ size: s, data: p[s] })));
    const name = $("#fv-name").value.trim() || "My Site";
    const manifest = JSON.stringify({ name, short_name: name.slice(0, 12), icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }, { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }], theme_color: $("#fv-bg").value, background_color: "#ffffff", display: "standalone" }, null, 2);
    return { ico, list: [{ name: "favicon.ico", data: ico }, { name: "favicon-16x16.png", data: p[16] }, { name: "favicon-32x32.png", data: p[32] }, { name: "favicon-48x48.png", data: p[48] },
      { name: "apple-touch-icon.png", data: p[180] }, { name: "android-chrome-192x192.png", data: p[192] }, { name: "android-chrome-512x512.png", data: p[512] },
      { name: "site.webmanifest", data: TK.utf8(manifest) }, { name: "head-snippet.html", data: TK.utf8($("#fv-html").value.split("\n").slice(0, 5).join("\n") + "\n") }] };
  }
  TK.seg($("#fv-src"), v => { src = v; $("#fv-text").hidden = v !== "text"; $("#fv-image").hidden = v !== "image"; render(); });
  TK.drop($("#fv-drop"), fl => {
    const f = fl[0];
    const i = new Image();
    i.onload = () => { img = i; $("#fv-drop").innerHTML = `<b>${esc(f.name)}</b> · ${i.naturalWidth} × ${i.naturalHeight}${i.naturalWidth !== i.naturalHeight ? " (center-cropped to square)" : ""}`; render(); };
    i.onerror = () => TK.toast("could not read that image");
    i.src = URL.createObjectURL(f);
  }, "image/*");
  root.querySelectorAll("#fv-text input, #fv-text select, #fv-pad, #fv-name").forEach(el => el.addEventListener("input", render));
  $("#fv-ico").addEventListener("click", async () => TK.download("favicon.ico", new Blob([(await files()).ico], { type: "image/x-icon" })));
  $("#fv-zip").addEventListener("click", async () => TK.download("favicons.zip", new Blob([ZIP((await files()).list)], { type: "application/zip" })));
  render();
});
