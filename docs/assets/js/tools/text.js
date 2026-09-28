/* ============================================================
   BUGFISH TOOLS — text.js
   Case converter, word counter, line tools, diff, regex tester
   and a small self-coded Markdown renderer.
   ============================================================ */

/* ---- word splitting shared by the case converter ------------ */
function splitWords(s) {
  return String(s)
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")          // camelCase → camel Case
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")      // XMLHttp → XML Http
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
function slugify(s, sep = "-", max = 0, lower = true) {
  let t = String(s)
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss")
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").replace(/œ/g, "oe").replace(/đ/g, "d").replace(/ł/g, "l")
    .normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/&/g, " and ").replace(/@/g, " at ");
  if (lower) t = t.toLowerCase();
  t = t.replace(/[^A-Za-z0-9]+/g, sep).replace(new RegExp(`^${sep.replace(/\W/g, "\\$&")}+|${sep.replace(/\W/g, "\\$&")}+$`, "g"), "");
  if (max && t.length > max) {
    t = t.slice(0, max);
    const cut = t.lastIndexOf(sep);
    if (cut > max * 0.6) t = t.slice(0, cut);
  }
  return t;
}

Toolbox.define("case", root => {
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  const SMALL = new Set("a an and as at but by for from in into nor of on or over per the to up via vs with der die das und oder mit von zu im am".split(" "));
  const CASES = [
    ["camelCase", w => w.map((x, i) => (i ? cap(x) : x.toLowerCase())).join("")],
    ["PascalCase", w => w.map(cap).join("")],
    ["snake_case", w => w.map(x => x.toLowerCase()).join("_")],
    ["kebab-case", w => w.map(x => x.toLowerCase()).join("-")],
    ["CONSTANT_CASE", w => w.map(x => x.toUpperCase()).join("_")],
    ["dot.case", w => w.map(x => x.toLowerCase()).join(".")],
    ["path/case", w => w.map(x => x.toLowerCase()).join("/")],
    ["Train-Case", w => w.map(cap).join("-")],
    ["Title Case", (w, raw) => raw.toLowerCase().replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (m, i) => (i && SMALL.has(m) ? m : cap(m)))],
    ["Sentence case", (w, raw) => raw.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
    ["lower case", (w, raw) => raw.toLowerCase()],
    ["UPPER CASE", (w, raw) => raw.toUpperCase()],
    ["iNVERT cASE", (w, raw) => [...raw].map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("")],
    ["aLtErNaTiNg", (w, raw) => { let k = 0; return [...raw].map(c => (/\p{L}/u.test(c) ? (k++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c)).join(""); }],
  ];
  root.innerHTML = `
    <section class="tk-panel">
      <textarea class="tk-textarea short" id="cc-in" spellcheck="false">XMLHttpRequest handler for Über-cool user_profile Settings</textarea>
      <label class="tk-check" style="margin-top:10px"><input type="checkbox" id="cc-lines"> convert each line separately</label>
    </section>
    <section class="tk-panel"><h3 class="tk-h">// cases</h3><div id="cc-out"></div></section>
    <section class="tk-panel">
      <h3 class="tk-h">// url slug</h3>
      <div class="tk-row">
        <label class="tk-field" style="width:120px"><span class="tk-label">Separator</span><select class="tk-select" id="sl-sep"><option>-</option><option>_</option><option>.</option></select></label>
        <label class="tk-field" style="width:130px"><span class="tk-label">Max length</span><input class="tk-input" id="sl-max" type="number" min="0" value="60"></label>
        <label class="tk-check" style="align-self:flex-end"><input type="checkbox" id="sl-lower" checked> lowercase</label>
      </div>
      <div class="tk-out" id="sl-out" style="margin-top:12px"></div>
      <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#sl-out", "Copy slug")}<span class="tk-note">umlauts become ae / oe / ue, accents are stripped.</span></div>
    </section>`;
  const $ = s => root.querySelector(s);
  function run() {
    const v = $("#cc-in").value;
    const each = $("#cc-lines").checked;
    const conv = f => (each ? v.split("\n").map(l => f(splitWords(l), l)).join("\n") : f(splitWords(v), v));
    $("#cc-out").innerHTML = TK.kv(CASES.map(([n, f]) => [n, conv(f)]));
    const sl = x => slugify(x, $("#sl-sep").value, +$("#sl-max").value || 0, $("#sl-lower").checked);
    $("#sl-out").textContent = each ? v.split("\n").map(sl).join("\n") : sl(v);
  }
  root.querySelectorAll("textarea, input, select").forEach(el => el.addEventListener("input", run));
  run();
});

/* ============================================================
   Word & character counter
   ============================================================ */
Toolbox.define("counter", root => {
  const STOP = new Set(("the a an and or but if of to in on at by for with from as is are was were be been it its this that these those i you he she we they " +
    "not no do does did have has had will would can could should may might must so than then there here what which who whom how why when where all any " +
    "der die das und oder aber ein eine einer eines einem einen ist sind war waren zu im in am an auf mit von für nicht es sie er wir ihr ich du den dem des auch als wie so").split(" "));
  root.innerHTML = `
    <section class="tk-panel">
      <textarea class="tk-textarea tall" id="wc-in" placeholder="paste or type your text">Bugfish builds tools that run in your browser. No uploads, no tracking — just code.

Count words, characters and bytes, check meta description lengths and see which keywords you repeat most. Reading time is estimated at 230 words per minute.</textarea>
    </section>
    <div class="tk-grid narrow" id="wc-stats"></div>
    <div class="tk-grid two">
      <section class="tk-panel"><h3 class="tk-h">// length limits</h3><div id="wc-limits"></div></section>
      <section class="tk-panel"><h3 class="tk-h">// keyword density</h3>
        <label class="tk-check"><input type="checkbox" id="wc-stop" checked> ignore stop words (EN / DE)</label>
        <div id="wc-kw" style="margin-top:10px"></div></section>
    </div>`;
  const $ = s => root.querySelector(s);
  function run() {
    const t = $("#wc-in").value;
    const words = t.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) || [];
    const chars = [...t].length;
    const sentences = (t.match(/[^.!?…]+[.!?…]+(\s|$)/g) || []).length || (t.trim() ? 1 : 0);
    const paras = t.split(/\n\s*\n/).filter(p => p.trim()).length;
    const lines = t ? t.split("\n").length : 0;
    const bytes = TK.utf8(t).length;
    const uniq = new Set(words.map(w => w.toLowerCase())).size;
    const mins = x => (x < 1 ? `${Math.max(1, Math.round(x * 60))} s` : `${Math.floor(x)} min ${Math.round((x % 1) * 60)} s`);
    const stat = (n, l) => `<div class="tk-stat"><b>${n}</b><span>${l}</span></div>`;
    $("#wc-stats").innerHTML = stat(TK.num(words.length), "words") + stat(TK.num(chars), "characters") + stat(TK.num(t.replace(/\s/g, "").length), "no spaces") +
      stat(sentences, "sentences") + stat(paras, "paragraphs") + stat(lines, "lines") + stat(TK.num(bytes), "UTF-8 bytes") + stat(uniq, "unique words") +
      stat(words.length ? (words.join("").length / words.length).toFixed(1) : 0, "avg word") + stat(mins(words.length / 230), "reading") + stat(mins(words.length / 140), "speaking");
    const gsm = /^[\n\r A-Za-z0-9@£$¥èéùìòÇØøÅå_ÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(t);
    const smsLen = gsm ? (chars <= 160 ? 1 : Math.ceil(chars / 153)) : (chars <= 70 ? 1 : Math.ceil(chars / 67));
    const lim = [["SEO title", 60, chars], ["Meta description", 160, chars], ["X / Twitter post", 280, chars], ["Mastodon post", 500, chars],
      ["Instagram caption", 2200, chars], ["LinkedIn post", 3000, chars], ["YouTube title", 100, chars]];
    $("#wc-limits").innerHTML = lim.map(([n, max, v]) => {
      const pct = Math.min(100, (v / max) * 100);
      const col = v > max ? "var(--red)" : pct > 85 ? "var(--orange)" : "var(--green)";
      return `<div style="margin-bottom:10px"><div class="tk-label" style="margin-bottom:4px"><span>${n}</span><em style="color:${col}">${v} / ${max}</em></div>
        <div class="tk-meter"><span style="width:${pct}%;background:${col}"></span></div></div>`;
    }).join("") + `<p class="tk-note">SMS: ${smsLen} segment${smsLen === 1 ? "" : "s"} (${gsm ? "GSM-7" : "Unicode / UCS-2 — 70 chars per SMS"})</p>`;
    const stop = $("#wc-stop").checked;
    const freq = {};
    const list = words.map(w => w.toLowerCase()).filter(w => !(stop && STOP.has(w)) && w.length > 1);
    list.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const bi = {};
    for (let i = 0; i + 1 < list.length; i++) { const k = `${list[i]} ${list[i + 1]}`; bi[k] = (bi[k] || 0) + 1; }
    const top = (o, n) => Object.entries(o).filter(x => x[1] > 1 || n > 12).sort((a, b) => b[1] - a[1]).slice(0, n);
    const rows = top(freq, 15), rows2 = top(bi, 8).filter(x => x[1] > 1);
    $("#wc-kw").innerHTML = rows.length ? `<table class="tk-table"><thead><tr><th>keyword</th><th>count</th><th>density</th></tr></thead><tbody>` +
      rows.concat(rows2).map(([w, c]) => `<tr><td class="mono">${esc(w)}</td><td>${c}</td><td>${((c / Math.max(1, words.length)) * 100).toFixed(1)} %</td></tr>`).join("") + `</tbody></table>`
      : `<p class="tk-note">no words yet</p>`;
  }
  $("#wc-in").addEventListener("input", TK.debounce(run, 100));
  $("#wc-stop").addEventListener("change", run);
  run();
});

/* ============================================================
   Line tools
   ============================================================ */
Toolbox.define("lines", root => {
  const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const OPS = [
    ["sort", "Sort A→Z", l => l.slice().sort(coll.compare)],
    ["rsort", "Sort Z→A", l => l.slice().sort((a, b) => coll.compare(b, a))],
    ["len", "Sort by length", l => l.slice().sort((a, b) => a.length - b.length || coll.compare(a, b))],
    ["num", "Sort numeric", l => l.slice().sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0))],
    ["rev", "Reverse", l => l.slice().reverse()],
    ["shuffle", "Shuffle", l => TK.shuffle(l.slice())],
    ["dedupe", "Remove duplicates", (l, o) => { const s = new Set(); return l.filter(x => { const k = o.ci ? x.toLowerCase() : x; if (s.has(k)) return false; s.add(k); return true; }); }],
    ["dupes", "Only duplicates", (l, o) => { const c = {}; l.forEach(x => { const k = o.ci ? x.toLowerCase() : x; c[k] = (c[k] || 0) + 1; }); const s = new Set(); return l.filter(x => { const k = o.ci ? x.toLowerCase() : x; if (c[k] < 2 || s.has(k)) return false; s.add(k); return true; }); }],
    ["count", "Count (uniq -c)", (l, o) => { const c = new Map(); l.forEach(x => { const k = o.ci ? x.toLowerCase() : x; c.set(k, (c.get(k) || 0) + 1); }); return [...c].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${String(n).padStart(6)} ${k}`); }],
    ["empty", "Remove empty", l => l.filter(x => x.trim())],
    ["trim", "Trim whitespace", l => l.map(x => x.trim())],
    ["number", "Number lines", l => l.map((x, i) => `${String(i + 1).padStart(String(l.length).length, " ")}. ${x}`)],
    ["unnumber", "Strip numbering", l => l.map(x => x.replace(/^\s*(\d+[.):]|[-*•])\s+/, ""))],
    ["lower", "lowercase", l => l.map(x => x.toLowerCase())],
    ["upper", "UPPERCASE", l => l.map(x => x.toUpperCase())],
    ["quote", "Wrap in quotes", (l, o) => l.map(x => `${o.q}${x.replace(new RegExp(o.q.replace(/\W/g, "\\$&"), "g"), "\\" + o.q)}${o.q}`)],
    ["affix", "Add prefix / suffix", (l, o) => l.map(x => o.pre + x + o.suf)],
    ["keep", "Keep lines matching", (l, o) => l.filter(x => o.re.test(x))],
    ["drop", "Drop lines matching", (l, o) => l.filter(x => !o.re.test(x))],
    ["join", "Join lines", (l, o) => [l.join(o.sep)]],
    ["split", "Split by separator", (l, o) => l.flatMap(x => x.split(o.sep))],
  ];
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row tight">${OPS.map(([k, l]) => `<button class="btn ghost small" type="button" data-op="${k}">${esc(l)}</button>`).join("")}</div>
      <div class="tk-grid narrow" style="margin-top:14px">
        <label class="tk-field"><span class="tk-label">Filter (regex)</span><input class="tk-input" id="ln-re" placeholder="e.g. ^https?://" spellcheck="false"></label>
        <label class="tk-field"><span class="tk-label">Join / split separator</span><input class="tk-input" id="ln-sep" value=", " spellcheck="false"></label>
        <label class="tk-field"><span class="tk-label">Prefix</span><input class="tk-input" id="ln-pre" spellcheck="false"></label>
        <label class="tk-field"><span class="tk-label">Suffix</span><input class="tk-input" id="ln-suf" spellcheck="false"></label>
        <label class="tk-field"><span class="tk-label">Quote char</span><select class="tk-select" id="ln-q"><option value='"'>"</option><option value="'">'</option><option value="\`">\`</option></select></label>
        <label class="tk-check" style="align-self:end"><input type="checkbox" id="ln-ci"> ignore case</label>
      </div>
    </section>
    <section class="tk-panel">
      <div class="tk-row" style="justify-content:space-between;margin-bottom:10px">
        <span class="tk-note" id="ln-info"></span>
        <span class="tk-row tight"><button class="tk-copy" type="button" id="ln-undo">↶ undo</button>${TK.copyBtn("#ln-in")}</span>
      </div>
      <textarea class="tk-textarea tall" id="ln-in" spellcheck="false">banana
apple
Cherry
apple
item 10
item 2

https://bugfish.eu
  date
banana</textarea>
      <p class="tk-note" id="ln-log" style="margin-top:8px"></p>
    </section>`;
  const $ = s => root.querySelector(s);
  const undo = [], log = [];
  const info = () => {
    const l = $("#ln-in").value.split("\n");
    $("#ln-info").textContent = `${l.length} lines · ${new Set(l).size} unique · ${l.filter(x => !x.trim()).length} empty`;
  };
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-op]");
    if (!b) return;
    const op = OPS.find(o => o[0] === b.dataset.op);
    let re = /.*/;
    try { re = new RegExp($("#ln-re").value || ".*", $("#ln-ci").checked ? "i" : ""); } catch (err) { TK.toast(`bad regex: ${err.message}`); return; }
    const sep = $("#ln-sep").value.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    const o = { ci: $("#ln-ci").checked, re, sep, pre: $("#ln-pre").value, suf: $("#ln-suf").value, q: $("#ln-q").value };
    undo.push($("#ln-in").value);
    $("#ln-in").value = op[2]($("#ln-in").value.split("\n"), o).join("\n");
    log.push(op[1]);
    $("#ln-log").textContent = `pipeline: ${log.join(" → ")}`;
    info();
  });
  $("#ln-undo").addEventListener("click", () => {
    if (!undo.length) return;
    $("#ln-in").value = undo.pop();
    log.pop();
    $("#ln-log").textContent = log.length ? `pipeline: ${log.join(" → ")}` : "";
    info();
  });
  $("#ln-in").addEventListener("input", info);
  info();
});

/* ============================================================
   Diff (Myers O(ND))
   ============================================================ */
/* Returns [["=", a, b] | ["-", a, null] | ["+", null, b], ...].
   Common head / tail are stripped first and only the active band of
   diagonals is kept per step, so memory is O(D²) instead of O(D·N). */
function myersDiff(a, b, eq = (x, y) => x === y, maxD = 5000) {
  let pre = 0;
  while (pre < a.length && pre < b.length && eq(a[pre], b[pre])) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && eq(a[a.length - 1 - suf], b[b.length - 1 - suf])) suf++;
  const A = a.slice(pre, a.length - suf), B = b.slice(pre, b.length - suf);
  const n = A.length, m = B.length, off = n + m;
  const v = new Int32Array(2 * off + 2);
  const trace = [];
  let found = n === 0 && m === 0;
  for (let d = 0; d <= off && !found; d++) {
    if (d > maxD) throw new Error("too many differences to diff in the browser");
    trace.push(v.slice(off - d, off + d + 1)); // index k + d
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && eq(A[x], B[y])) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) { found = true; break; }
    }
  }
  const mid = [];
  let x = n, y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vv = trace[d], k = x - y;
    const pk = k === -d || (k !== d && vv[k - 1 + d] < vv[k + 1 + d]) ? k + 1 : k - 1;
    const px = vv[pk + d], py = px - pk;
    while (x > px && y > py) { mid.push(["=", A[x - 1], B[y - 1]]); x--; y--; }
    if (d > 0) { if (x === px) mid.push(["+", null, B[y - 1]]); else mid.push(["-", A[x - 1], null]); }
    x = px; y = py;
  }
  const head = a.slice(0, pre).map((s, i) => ["=", s, b[i]]);
  const tail = a.slice(a.length - suf).map((s, i) => ["=", s, b[b.length - suf + i]]);
  return head.concat(mid.reverse(), tail);
}

Toolbox.define("diff", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-grid two">
        <label class="tk-field"><span class="tk-label">Original</span><textarea class="tk-textarea" id="df-a" spellcheck="false">server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.php index.html;
}</textarea></label>
        <label class="tk-field"><span class="tk-label">Changed</span><textarea class="tk-textarea" id="df-b" spellcheck="false">server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    root /var/www/html;
    index index.php;
    ssl_certificate /etc/ssl/example.pem;
}</textarea></label>
      </div>
      <div class="tk-row" style="margin-top:12px">
        ${TK.segHtml("df-view", [["split", "Side by side"], ["inline", "Inline"]], "split")}
        <label class="tk-check"><input type="checkbox" id="df-ws"> ignore whitespace</label>
        <label class="tk-check"><input type="checkbox" id="df-case"> ignore case</label>
        <span class="tk-note" id="df-stat"></span>
        <button class="tk-copy" type="button" id="df-patch">Copy unified diff</button>
      </div>
    </section>
    <section class="tk-panel"><div class="tk-scroll" id="df-out"></div></section>`;
  const $ = s => root.querySelector(s);
  let view = "split", ops = [];
  const norm = s => { let t = s; if ($("#df-ws").checked) t = t.replace(/\s+/g, " ").trim(); if ($("#df-case").checked) t = t.toLowerCase(); return t; };
  function words(a, b) {
    const ta = a.split(/(\s+|\b)/).filter(Boolean), tb = b.split(/(\s+|\b)/).filter(Boolean);
    let w;
    try { w = myersDiff(ta, tb, undefined, 400); } catch (e) { return [esc(a), esc(b)]; }
    let l = "", r = "";
    w.forEach(([op, x, y]) => {
      if (op === "=") { l += esc(x); r += esc(y); }
      else if (op === "-") l += `<del>${esc(x)}</del>`;
      else r += `<ins>${esc(y)}</ins>`;
    });
    return [l, r];
  }
  function run() {
    const A = $("#df-a").value.split("\n"), B = $("#df-b").value.split("\n");
    try { ops = myersDiff(A, B, (x, y) => norm(x) === norm(y)); }
    catch (e) { $("#df-out").innerHTML = `<p class="tk-msg warn">${esc(e.message)}</p>`; ops = []; return; }
    // pair up adjacent -/+ runs so changed lines get word highlights
    const rows = [];
    for (let i = 0; i < ops.length;) {
      if (ops[i][0] === "=") { rows.push(["=", ops[i][1], ops[i][2]]); i++; continue; }
      const dels = [], adds = [];
      while (i < ops.length && ops[i][0] !== "=") { (ops[i][0] === "-" ? dels : adds).push(ops[i]); i++; }
      for (let k = 0; k < Math.max(dels.length, adds.length); k++) rows.push(["~", dels[k] ? dels[k][1] : null, adds[k] ? adds[k][2] : null]);
    }
    let la = 0, lb = 0, add = 0, del = 0;
    const num = n => `<td class="tk-dim" style="text-align:right;user-select:none;width:1%">${n || ""}</td>`;
    const body = rows.map(([op, a, b]) => {
      if (op === "=") { la++; lb++; return view === "split" ? `<tr>${num(la)}<td class="mono">${esc(a)}</td>${num(lb)}<td class="mono">${esc(b)}</td></tr>` : `<tr>${num(la)}${num(lb)}<td class="mono">  ${esc(a)}</td></tr>`; }
      const both = a != null && b != null;
      const [wa, wb] = both ? words(a, b) : [esc(a ?? ""), esc(b ?? "")];
      if (a != null) { la++; del++; }
      if (b != null) { lb++; add++; }
      if (view === "split") return `<tr>${num(a != null ? la : "")}<td class="mono ${a != null ? "tk-diff-del" : ""}">${a != null ? wa : ""}</td>${num(b != null ? lb : "")}<td class="mono ${b != null ? "tk-diff-add" : ""}">${b != null ? wb : ""}</td></tr>`;
      return (a != null ? `<tr>${num(la)}${num("")}<td class="mono tk-diff-del">- ${wa}</td></tr>` : "") + (b != null ? `<tr>${num("")}${num(lb)}<td class="mono tk-diff-add">+ ${wb}</td></tr>` : "");
    }).join("");
    $("#df-out").innerHTML = `<table class="tk-table" style="white-space:pre-wrap">${body}</table>`;
    $("#df-stat").innerHTML = add || del ? `<span class="tk-ok">+${add}</span> <span class="tk-err">−${del}</span>` : `<span class="tk-ok">✓ identical</span>`;
  }
  function unified() {
    const lines = [];
    let la = 1, lb = 1;
    const ctx = 3;
    const flat = ops.map(([op, a, b]) => ({ op, a, b }));
    for (let i = 0; i < flat.length;) {
      if (flat[i].op === "=") { la++; lb++; i++; continue; }
      const start = Math.max(0, i - ctx);
      let end = i;
      while (end < flat.length) {
        if (flat[end].op !== "=") { end++; continue; }
        let run = 0;
        while (end + run < flat.length && flat[end + run].op === "=") run++;
        if (run > ctx * 2 || end + run >= flat.length) { end = Math.min(flat.length, end + ctx); break; }
        end += run;
      }
      const pre = i - start;
      const sa = la - pre, sb = lb - pre;
      let ca = 0, cb = 0;
      const hunk = [];
      for (let k = start; k < end; k++) {
        const o = flat[k];
        if (o.op === "=") { hunk.push(" " + o.a); ca++; cb++; } else if (o.op === "-") { hunk.push("-" + o.a); ca++; } else { hunk.push("+" + o.b); cb++; }
      }
      lines.push(`@@ -${sa},${ca} +${sb},${cb} @@`, ...hunk);
      for (let k = i; k < end; k++) { if (flat[k].op !== "+") la++; if (flat[k].op !== "-") lb++; }
      i = end;
    }
    return lines.length ? `--- original\n+++ changed\n${lines.join("\n")}\n` : "";
  }
  TK.seg($("#df-view"), v => { view = v; run(); });
  ["#df-a", "#df-b"].forEach(s => $(s).addEventListener("input", TK.debounce(run, 250)));
  ["#df-ws", "#df-case"].forEach(s => $(s).addEventListener("change", run));
  $("#df-patch").addEventListener("click", async e => {
    const p = unified();
    if (!p) { TK.toast("no differences"); return; }
    if (await TK.copy(p)) TK.flash(e.target);
  });
  run();
});

/* ============================================================
   Regex tester — evaluated in a throw-away worker so a
   catastrophic pattern cannot freeze the page.
   ============================================================ */
const REGEX_WORKER = `onmessage = e => {
  const { p, f, t, r } = e.data;
  try {
    const re = new RegExp(p, f.includes("g") ? f : f + "g");
    const out = [];
    let m, n = 0;
    while ((m = re.exec(t)) && n < 5000) {
      out.push({ i: m.index, v: m[0], g: m.slice(1), n: m.groups || null });
      n++;
      if (!f.includes("g")) break;
      if (m[0] === "") re.lastIndex++;
    }
    let rep = null;
    if (r !== null) rep = t.replace(new RegExp(p, f), r);
    postMessage({ ok: true, out, rep, capped: n >= 5000 });
  } catch (err) { postMessage({ ok: false, err: err.message }); }
};`;

Toolbox.define("regex", root => {
  const PRESETS = {
    "": "— common patterns —",
    "[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+": "e-mail address",
    "https?:\\/\\/[^\\s/$.?#].[^\\s]*": "URL",
    "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b": "IPv4",
    "\\b\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b": "date YYYY-MM-DD",
    "#(?:[0-9a-fA-F]{3}){1,2}\\b": "hex color",
    "\\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\b": "UUID",
    "\\b\\d{5}\\b": "German postal code",
    "(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)": "semver (named groups)",
    "<([a-z][a-z0-9]*)\\b[^>]*>(.*?)<\\/\\1>": "HTML tag pair",
    "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{12,}$": "strong password (lookaheads)",
  };
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <label class="tk-field tk-grow"><span class="tk-label">Pattern</span>
          <div class="tk-row tight" style="flex-wrap:nowrap"><span class="tk-dim" style="font-family:var(--mono)">/</span>
          <input class="tk-input" id="rx-p" spellcheck="false" value="(?<user>[\\w.+-]+)@(?<domain>[\\w-]+(\\.[\\w-]+)+)">
          <span class="tk-dim" style="font-family:var(--mono)">/</span><input class="tk-input" id="rx-f" value="gi" style="width:70px" spellcheck="false"></div></label>
        <label class="tk-field" style="width:220px"><span class="tk-label">Presets</span>
          <select class="tk-select" id="rx-pre">${Object.entries(PRESETS).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select></label>
      </div>
      <div class="tk-row tight" style="margin-top:10px">${["g", "i", "m", "s", "u", "y"].map(f => `<label class="tk-check" title="${{ g: "global", i: "ignore case", m: "multiline ^$", s: "dotAll", u: "unicode", y: "sticky" }[f]}"><input type="checkbox" data-flag="${f}"> ${f}</label>`).join("")}
        <span class="tk-note" id="rx-stat" style="margin-left:auto"></span></div>
      <div class="tk-msg" id="rx-msg" style="margin-top:10px"></div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel">
        <label class="tk-field"><span class="tk-label">Test string</span>
          <textarea class="tk-textarea tall" id="rx-t" spellcheck="false">Contact: hello@bugfish.eu, admin@example.co.uk
Invalid: not-an-email@, @nothing.com
Support: support+tools@sub.domain.example</textarea></label>
        <h3 class="tk-h">// highlighted</h3>
        <div class="tk-out tk-hl-out" id="rx-hl"></div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// matches</h3>
        <div class="tk-scroll" id="rx-list" style="max-height:340px;overflow:auto"></div>
        <h3 class="tk-h">// replace</h3>
        <input class="tk-input" id="rx-r" placeholder="replacement — $1, $<name>, $&amp;" value="$<user> at $<domain>" spellcheck="false">
        <div class="tk-out" id="rx-rep" style="margin-top:8px"></div>
      </section>
    </div>
    <section class="tk-panel">
      <details><summary class="tk-h" style="cursor:pointer;margin:0">// cheat sheet</summary>
        <div class="tk-grid" style="margin-top:12px">${[
          [". any char", "\\d digit  \\D non-digit", "\\w word  \\W non-word", "\\s space  \\S non-space", "\\b word boundary"],
          ["[abc] one of", "[^abc] none of", "[a-z] range", "(x|y) alternative", "\\1 back-reference"],
          ["* 0+   + 1+   ? 0-1", "{3} exactly  {2,5} range", "*? +? lazy", "^ start  $ end", "(?:x) non-capturing"],
          ["(?<n>x) named group", "(?=x) lookahead", "(?!x) negative lookahead", "(?<=x) lookbehind", "\\p{L} unicode letter (u)"],
        ].map(col => `<div class="tk-list">${col.map(x => `<div><span>${esc(x)}</span></div>`).join("")}</div>`).join("")}</div>
      </details>
    </section>`;

  const $ = s => root.querySelector(s);
  let worker = null, timer = null;
  const url = URL.createObjectURL(new Blob([REGEX_WORKER], { type: "text/javascript" }));
  const syncFlags = () => root.querySelectorAll("[data-flag]").forEach(c => { c.checked = $("#rx-f").value.includes(c.dataset.flag); });

  function kill() { if (worker) { worker.terminate(); worker = null; } clearTimeout(timer); }
  function run() {
    kill();
    const p = $("#rx-p").value, f = $("#rx-f").value.replace(/[^dgimsuyv]/g, ""), t = $("#rx-t").value, r = $("#rx-r").value;
    const msg = $("#rx-msg");
    if (!p) { TK.msg(msg, ""); $("#rx-hl").textContent = t; $("#rx-list").innerHTML = ""; $("#rx-rep").textContent = ""; $("#rx-stat").textContent = ""; return; }
    try { new RegExp(p, f); } catch (e) { TK.msg(msg, e.message, "err"); return; }
    worker = new Worker(url);
    const t0 = performance.now();
    timer = setTimeout(() => { kill(); TK.msg(msg, "⏱ stopped after 1.5 s — the pattern is probably backtracking catastrophically (nested quantifiers like (a+)+)", "err"); }, 1500);
    worker.onmessage = e => {
      kill();
      const d = e.data;
      if (!d.ok) { TK.msg(msg, d.err, "err"); return; }
      TK.msg(msg, d.capped ? "showing the first 5000 matches" : "", d.capped ? "warn" : "");
      $("#rx-stat").textContent = `${d.out.length} match${d.out.length === 1 ? "" : "es"} · ${(performance.now() - t0).toFixed(1)} ms`;
      let html = "", last = 0;
      d.out.forEach((m, k) => {
        html += esc(t.slice(last, m.i)) + `<mark class="tk-mark${k % 2 ? " alt" : ""}">${esc(m.v) || "&#8203;"}</mark>`;
        last = m.i + m.v.length;
      });
      $("#rx-hl").innerHTML = html + esc(t.slice(last));
      $("#rx-list").innerHTML = d.out.length ? `<table class="tk-table"><thead><tr><th>#</th><th>at</th><th>match</th><th>groups</th></tr></thead><tbody>` +
        d.out.slice(0, 500).map((m, k) => `<tr><td class="tk-dim">${k + 1}</td><td class="tk-dim">${m.i}</td><td class="mono">${esc(m.v)}</td><td class="mono">${
          m.n ? Object.entries(m.n).map(([n, v]) => `<span class="tk-dim">${esc(n)}:</span> ${esc(v ?? "∅")}`).join("<br>")
            : m.g.map((v, i) => `<span class="tk-dim">$${i + 1}:</span> ${esc(v ?? "∅")}`).join("<br>")}</td></tr>`).join("") + `</tbody></table>`
        : `<p class="tk-note">no match</p>`;
      $("#rx-rep").textContent = d.rep ?? "";
    };
    worker.postMessage({ p, f, t, r });
  }
  const deb = TK.debounce(run, 180);
  ["#rx-p", "#rx-t", "#rx-r"].forEach(s => $(s).addEventListener("input", deb));
  $("#rx-f").addEventListener("input", () => { syncFlags(); deb(); });
  root.querySelectorAll("[data-flag]").forEach(c => c.addEventListener("change", () => {
    const fl = [...root.querySelectorAll("[data-flag]:checked")].map(x => x.dataset.flag).join("");
    $("#rx-f").value = fl;
    run();
  }));
  $("#rx-pre").addEventListener("change", () => { if ($("#rx-pre").value) { $("#rx-p").value = $("#rx-pre").value; run(); } });
  syncFlags();
  run();
  return () => { kill(); URL.revokeObjectURL(url); };
});

/* ============================================================
   Markdown → HTML (self-coded, safe by default)
   ============================================================ */
const MD = (() => {
  const safeUrl = u => { const s = String(u).trim(); return /^(javascript|vbscript|data):/i.test(s) && !/^data:image\/(png|jpe?g|gif|webp);/i.test(s) ? "#" : s; };
  function inline(src) {
    const codes = [];
    let s = src.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (m, t, c) => { codes.push(`<code>${esc(c.trim())}</code>`); return `\u0000${codes.length - 1}\u0000`; });
    const escapes = [];
    s = s.replace(/\\([\\`*_{}[\]()#+\-.!|~<>])/g, (m, c) => { escapes.push(esc(c)); return `\u0001${escapes.length - 1}\u0001`; });
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (m, alt, u, t) => `<img src="${safeUrl(u)}" alt="${alt}"${t ? ` title="${t}"` : ""}>`);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (m, txt, u, t) => `<a href="${safeUrl(u)}"${t ? ` title="${t}"` : ""}>${txt}</a>`);
    s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1">$1</a>');
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '$1<a href="$2">$2</a>');
    s = s.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>");
    s = s.replace(/(^|[^*\w])([*_])(?=\S)([\s\S]*?\S)\2(?![*\w])/g, "$1<em>$3</em>");
    s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
    s = s.replace(/ {2,}\n|\\\n/g, "<br>\n");
    s = s.replace(/\u0001(\d+)\u0001/g, (m, i) => escapes[i]).replace(/\u0000(\d+)\u0000/g, (m, i) => codes[i]);
    return s;
  }
  function render(md) {
    const lines = md.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
    const out = [];
    let i = 0;
    const isHr = l => /^ {0,3}([-*_])( *\1){2,} *$/.test(l);
    const listRe = /^( *)([-*+]|\d{1,9}[.)])\s+(.*)$/;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = /^ {0,3}(```+|~~~+)\s*([\w+-]*).*$/.exec(l))) {
        const fence = m[1], lang = m[2];
        const code = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++]);
        i++;
        out.push(`<pre><code${lang ? ` class="language-${esc(lang)}"` : ""}>${esc(code.join("\n"))}</code></pre>`);
        continue;
      }
      if ((m = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
      if (isHr(l)) { out.push("<hr>"); i++; continue; }
      if (/^ {4,}\S/.test(l)) {
        const code = [];
        while (i < lines.length && (/^ {4}/.test(lines[i]) || !lines[i].trim())) code.push(lines[i++].slice(4));
        out.push(`<pre><code>${esc(code.join("\n").replace(/\n+$/, ""))}</code></pre>`);
        continue;
      }
      if (/^ {0,3}>/.test(l)) {
        const q = [];
        while (i < lines.length && lines[i].trim() && (/^ {0,3}>/.test(lines[i]) || q.length)) { q.push(lines[i].replace(/^ {0,3}> ?/, "")); i++; }
        out.push(`<blockquote>${render(q.join("\n"))}</blockquote>`);
        continue;
      }
      if (/\|/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        const cells = r => r.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(c => c.trim());
        const head = cells(l), align = cells(lines[i + 1]).map(c => (/^:.*:$/.test(c) ? "center" : /:$/.test(c) ? "right" : /^:/.test(c) ? "left" : ""));
        i += 2;
        const body = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) body.push(cells(lines[i++]));
        const td = (tag, c, k) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ""}>${inline(c || "")}</${tag}>`;
        out.push(`<table><thead><tr>${head.map((c, k) => td("th", c, k)).join("")}</tr></thead><tbody>${body.map(r => `<tr>${head.map((_, k) => td("td", r[k], k)).join("")}</tr>`).join("")}</tbody></table>`);
        continue;
      }
      if ((m = listRe.exec(l))) {
        const ordered = /\d/.test(m[2]);
        const base = m[1].length;
        const items = [];
        while (i < lines.length) {
          const lm = listRe.exec(lines[i]);
          if (lm && lm[1].length === base && /\d/.test(lm[2]) === ordered) { items.push([lm[3]]); i++; continue; }
          if (lines[i].trim() && (lines[i].match(/^ */)[0].length > base) && items.length) { items[items.length - 1].push(lines[i].slice(Math.min(lines[i].match(/^ */)[0].length, base + 2))); i++; continue; }
          if (!lines[i].trim() && i + 1 < lines.length && (listRe.exec(lines[i + 1]) || /^ {2,}\S/.test(lines[i + 1])) && lines[i + 1].match(/^ */)[0].length >= base) { i++; continue; }
          break;
        }
        const start = ordered ? parseInt(m[2], 10) : 1;
        out.push(`<${ordered ? "ol" : "ul"}${ordered && start !== 1 ? ` start="${start}"` : ""}>` + items.map(([first, ...rest]) => {
          const task = /^\[([ xX])\]\s+(.*)$/.exec(first);
          const head = task ? `<input type="checkbox" disabled${task[1] !== " " ? " checked" : ""}> ${inline(task[2])}` : inline(first);
          const nested = rest.length ? render(rest.join("\n")) : "";
          return `<li${task ? ' class="task"' : ""}>${head}${nested}</li>`;
        }).join("") + `</${ordered ? "ol" : "ul"}>`);
        continue;
      }
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^ {0,3}(#{1,6}\s|```|~~~|>)/.test(lines[i]) && !isHr(lines[i]) && !(para.length && listRe.test(lines[i]))) {
        if (para.length && /^ {0,3}(=+|-+)\s*$/.test(lines[i])) { const lvl = lines[i].trim()[0] === "=" ? 1 : 2; out.push(`<h${lvl}>${inline(para.join("\n"))}</h${lvl}>`); para.length = 0; i++; break; }
        para.push(lines[i++]);
      }
      if (para.length) out.push(`<p>${inline(para.join("\n"))}</p>`);
    }
    return out.join("\n");
  }
  return { render };
})();

Toolbox.define("markdown", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">${TK.segHtml("md-view", [["split", "Editor + preview"], ["html", "HTML source"]], "split")}
        <span class="tk-note" id="md-info"></span><span class="tk-grow"></span>
        ${TK.copyBtn("#md-html", "Copy HTML")}<button class="tk-copy" type="button" id="md-dl">Download .html</button></div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel"><textarea class="tk-textarea" id="md-in" spellcheck="false" style="min-height:520px"># Markdown Live Preview

Write **bold**, *italic*, ~~strike~~ and \`inline code\`.
Links: [Bugfish](https://bugfishtm.github.io) or just https://github.com/bugfishtm

## Lists
- Item one
- Item two
  - nested item
1. First
2. Second

- [x] task done
- [ ] task open

> A quote.
> Still the quote.

\`\`\`php
&lt;?php echo password_hash($pw, PASSWORD_BCRYPT);
\`\`\`

| Tool | Offline | Category |
|:-----|:-------:|---------:|
| bcrypt | yes | security |
| DNS | no | network |

---
Raw HTML is escaped, so this is safe to paste: &lt;script&gt;alert(1)&lt;/script&gt;</textarea></section>
      <section class="tk-panel">
        <div class="md-out" id="md-prev"></div>
        <textarea class="tk-textarea" id="md-html" readonly spellcheck="false" style="min-height:520px" hidden></textarea>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  $("#md-in").value = $("#md-in").value.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  /* Privacy: an <img> pointing at another server would make the visitor's
     browser contact that server the moment the preview renders. The HTML
     is therefore parsed in an inert <template> (nothing loads there) and
     remote images become placeholders until the visitor asks for them. */
  let allowRemote = false;
  const isRemote = src => { try { return new URL(src, location.href).origin !== location.origin && !/^(data|blob):/i.test(src); } catch (e) { return false; } };
  function run() {
    const src = $("#md-in").value;
    const html = MD.render(src);
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    let blocked = 0;
    tpl.content.querySelectorAll("img").forEach(img => {
      if (allowRemote || !isRemote(img.getAttribute("src"))) return;
      blocked++;
      const ph = document.createElement("span");
      ph.className = "md-remote";
      ph.textContent = `🖼 ${img.getAttribute("alt") || "image"} — remote image not loaded`;
      ph.title = img.getAttribute("src");
      img.replaceWith(ph);
    });
    tpl.content.querySelectorAll("a[href]").forEach(a => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    $("#md-prev").replaceChildren(tpl.content);
    if (blocked) {
      const bar = document.createElement("p");
      bar.className = "tk-note";
      bar.innerHTML = `${blocked} remote image${blocked > 1 ? "s" : ""} blocked for your privacy. <button type="button" class="tk-copy" data-md-remote>load remote images</button>
        <span class="tk-dim">(your browser will then contact the servers in the image URLs)</span>`;
      $("#md-prev").prepend(bar);
    }
    $("#md-html").value = html;
    const words = (src.match(/[\p{L}\p{N}]+/gu) || []).length;
    $("#md-info").textContent = `${words} words · ${src.split("\n").length} lines`;
  }
  $("#md-prev").addEventListener("click", e => { if (e.target.closest("[data-md-remote]")) { allowRemote = true; run(); } });
  TK.seg($("#md-view"), v => { $("#md-prev").hidden = v !== "split"; $("#md-html").hidden = v !== "html"; });
  $("#md-in").addEventListener("input", TK.debounce(run, 120));
  $("#md-dl").addEventListener("click", () => TK.download("document.html",
    `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Document</title>\n</head>\n<body>\n${$("#md-html").value}\n</body>\n</html>\n`, "text/html"));
  run();
});
