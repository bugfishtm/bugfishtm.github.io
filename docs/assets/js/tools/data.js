/* ============================================================
   BUGFISH TOOLS — data.js
   JSON formatter, JSON → code, CSV converter, PHP serialize,
   SQL formatter, lorem ipsum & test data.
   ============================================================ */

/* ------------------------------------------------------------
   Relaxed JSON parser (JSON5-ish): comments, trailing commas,
   single-quoted strings, unquoted keys, hex numbers, NaN /
   Infinity (→ null). Used by "Repair" — output is strict JSON.
   ------------------------------------------------------------ */
function parseLoose(src) {
  let i = 0;
  const err = m => { throw new Error(`${m} at position ${i}`); };
  const ws = () => {
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src.startsWith("//", i) || src[i] === "#") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (src.startsWith("/*", i)) { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
      break;
    }
  };
  const str = q => {
    i++;
    let s = "";
    while (i < src.length && src[i] !== q) {
      if (src[i] === "\\") {
        const c = src[++i];
        if (c === "u") { s += String.fromCharCode(parseInt(src.substr(i + 1, 4), 16)); i += 5; continue; }
        s += { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "\n": "" }[c] ?? c;
        i++;
        continue;
      }
      s += src[i++];
    }
    if (src[i] !== q) err("unterminated string");
    i++;
    return s;
  };
  const value = () => {
    ws();
    const c = src[i];
    if (c === "{") {
      i++;
      const o = {};
      for (;;) {
        ws();
        if (src[i] === "}") { i++; return o; }
        let k;
        if (src[i] === '"' || src[i] === "'") k = str(src[i]);
        else { const m = /^[A-Za-z_$][\w$-]*/.exec(src.slice(i)); if (!m) err("expected a key"); k = m[0]; i += k.length; }
        ws();
        if (src[i] !== ":") err("expected ':'");
        i++;
        o[k] = value();
        ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "}") { i++; return o; }
        err("expected ',' or '}'");
      }
    }
    if (c === "[") {
      i++;
      const a = [];
      for (;;) {
        ws();
        if (src[i] === "]") { i++; return a; }
        a.push(value());
        ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "]") { i++; return a; }
        err("expected ',' or ']'");
      }
    }
    if (c === '"' || c === "'") return str(c);
    const m = /^(?:[+-]?(?:0x[0-9a-f]+|(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|Infinity)|NaN|true|false|null|undefined|True|False|None)/i.exec(src.slice(i));
    if (!m) err("unexpected character");
    i += m[0].length;
    const t = m[0];
    if (/^(true|True)$/.test(t)) return true;
    if (/^(false|False)$/.test(t)) return false;
    if (/^(null|undefined|None|NaN|[+-]?Infinity)$/i.test(t)) return null;
    return /0x/i.test(t) ? parseInt(t, 16) : Number(t);
  };
  const v = value();
  ws();
  if (i < src.length) err("unexpected trailing content");
  return v;
}

/* Strict JSON walk that only exists to say WHERE parsing fails —
   browsers disagree on (or omit) positions in JSON.parse errors. */
function jsonStrictError(src) {
  let i = 0;
  const fail = m => { const e = new Error(m); e.pos = i; throw e; };
  const ws = () => { while (/[ \t\n\r]/.test(src[i])) i++; };
  const lit = w => { if (src.startsWith(w, i)) i += w.length; else fail(`unexpected ${src[i] ? `'${src[i]}'` : "end of input"}`); };
  const str = () => {
    i++;
    while (i < src.length && src[i] !== '"') {
      if (src[i] === "\\") { i++; if (!/["\\/bfnrtu]/.test(src[i] || "")) fail("invalid escape sequence"); if (src[i] === "u" && !/^[0-9a-f]{4}$/i.test(src.substr(i + 1, 4))) fail("invalid \\u escape"); }
      else if (src.charCodeAt(i) < 32) fail("control character in string (escape newlines as \\n)");
      i++;
    }
    if (src[i] !== '"') fail("unterminated string");
    i++;
  };
  const val = () => {
    ws();
    const c = src[i];
    if (c === "{") {
      i++; ws();
      if (src[i] === "}") { i++; return; }
      for (;;) {
        ws();
        if (src[i] !== '"') fail(src[i] === "}" ? "trailing comma before '}'" : "expected a double-quoted key");
        str(); ws();
        if (src[i] !== ":") fail("expected ':' after key");
        i++; val(); ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "}") { i++; return; }
        fail("expected ',' or '}'");
      }
    }
    if (c === "[") {
      i++; ws();
      if (src[i] === "]") { i++; return; }
      for (;;) {
        val(); ws();
        if (src[i] === ",") { i++; ws(); if (src[i] === "]") fail("trailing comma before ']'"); continue; }
        if (src[i] === "]") { i++; return; }
        fail("expected ',' or ']'");
      }
    }
    if (c === '"') return str();
    if (c === "t") return lit("true");
    if (c === "f") return lit("false");
    if (c === "n") return lit("null");
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i));
    if (m) { i += m[0].length; return; }
    fail(c === "'" ? "single quotes are not valid JSON" : c === "/" ? "comments are not valid JSON" : `unexpected ${c ? `'${c}'` : "end of input"}`);
  };
  try { val(); ws(); if (i < src.length) fail("unexpected content after the JSON value"); } catch (e) { return { msg: e.message, pos: e.pos }; }
  return null;
}

/* Locate a JSON.parse error as line / column. */
function jsonErrorPos(src, e) {
  const found = jsonStrictError(src);
  const msg = found ? found.msg : String(e.message).replace(/^JSON\.parse: /, "");
  const pos = found ? found.pos : -1;
  if (pos < 0) return { msg };
  const before = src.slice(0, pos);
  const line = before.split("\n").length;
  const col = pos - before.lastIndexOf("\n");
  const text = src.split("\n")[line - 1] || "";
  return { msg, line, col, snippet: `${text}\n${" ".repeat(Math.max(0, col - 1))}^` };
}

function sortKeysDeep(v) {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeysDeep(v[k]); return o; }, {});
  return v;
}

/* ============================================================
   JSON formatter & validator
   ============================================================ */
Toolbox.define("json", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <button class="btn small" data-act="format" type="button">Format</button>
        <button class="btn ghost small" data-act="minify" type="button">Minify</button>
        <button class="btn ghost small" data-act="sort" type="button">Sort keys</button>
        <button class="btn ghost small" data-act="repair" type="button" title="comments, trailing commas, single quotes, unquoted keys">Repair</button>
        <select class="tk-select" id="js-indent" style="width:auto"><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="\t">tabs</option></select>
        <span class="tk-grow"></span>
        ${TK.segHtml("js-view", [["text", "Text"], ["tree", "Tree"]], "text")}
      </div>
      <div class="tk-msg" id="js-msg" style="margin-top:12px"></div>
      <pre class="tk-out" id="js-snip" style="margin-top:8px" hidden></pre>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel">
        <label class="tk-field"><span class="tk-label">Input <em id="js-in-len"></em></span>
          <textarea class="tk-textarea tall" id="js-in" spellcheck="false"></textarea></label>
      </section>
      <section class="tk-panel">
        <div id="js-text-out"><label class="tk-field"><span class="tk-label">Output <em id="js-out-len"></em></span>
          <textarea class="tk-textarea tall" id="js-out" readonly spellcheck="false"></textarea></label>
          <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#js-out", "Copy")}<button class="tk-copy" type="button" id="js-dl">Download</button></div></div>
        <div id="js-tree-out" hidden>
          <div class="tk-row tight"><input class="tk-input tk-grow" id="js-path" placeholder="path, e.g. users[0].name — or click any value" spellcheck="false"></div>
          <div class="tk-out" id="js-path-val" style="margin-top:8px;min-height:0"></div>
          <div id="js-tree" style="margin-top:10px;font-family:var(--mono);font-size:13px;max-height:520px;overflow:auto"></div>
        </div>
      </section>
    </div>`;

  const $ = s => root.querySelector(s);
  $("#js-in").value = `{
  // comments and trailing commas are fine — press "Repair"
  "name": "Bugfish Tools",
  'version': 3,
  tags: ["json", "format", "validate",],
  "author": { "alias": "Bugfish", "since": 2008, "active": true },
  "tools": [ { "id": "bcrypt", "offline": true }, { "id": "dns", "offline": false } ]
}`;
  let data, view = "text";
  const indent = () => ($("#js-indent").value === "\t" ? "\t" : +$("#js-indent").value);

  function parse(loose) {
    const src = $("#js-in").value;
    const m = $("#js-msg"), snip = $("#js-snip");
    $("#js-in-len").textContent = `${TK.fmtBytes(TK.utf8(src).length)}`;
    snip.hidden = true;
    if (!src.trim()) { TK.msg(m, ""); data = undefined; return false; }
    try {
      data = loose ? parseLoose(src) : JSON.parse(src);
      const stats = { keys: 0, depth: 0 };
      (function walk(v, d) {
        stats.depth = Math.max(stats.depth, d);
        if (v && typeof v === "object") Object.entries(v).forEach(([, x]) => { if (!Array.isArray(v)) stats.keys++; walk(x, d + 1); });
      })(data, 0);
      TK.msg(m, `✓ ${loose ? "repaired — now " : ""}valid JSON · ${Array.isArray(data) ? `array[${data.length}]` : typeof data} · ${stats.keys} keys · depth ${stats.depth}`, "ok");
      return true;
    } catch (e) {
      if (loose) { TK.msg(m, `✗ could not repair: ${e.message}`, "err"); return false; }
      const p = jsonErrorPos(src, e);
      TK.msg(m, `✗ ${p.msg}${p.line ? ` — line ${p.line}, column ${p.col}` : ""}. Try "Repair" for comments / trailing commas / quotes.`, "err");
      if (p.snippet) { snip.textContent = p.snippet; snip.hidden = false; }
      data = undefined;
      return false;
    }
  }
  function out(text) {
    $("#js-out").value = text;
    $("#js-out-len").textContent = `${TK.fmtBytes(TK.utf8(text).length)}`;
    if (view === "tree") tree();
  }
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (!parse(act === "repair")) return;
    if (act === "minify") out(JSON.stringify(data));
    else if (act === "sort") { data = sortKeysDeep(data); out(JSON.stringify(data, null, indent())); }
    else out(JSON.stringify(data, null, indent()));
    if (act === "repair") { $("#js-in").value = JSON.stringify(data, null, indent()); }
  });
  $("#js-dl").addEventListener("click", () => TK.download("data.json", $("#js-out").value, "application/json"));

  const pathKey = (p, k) => (typeof k === "number" ? `${p}[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? `${p}${p ? "." : ""}${k}` : `${p}["${k.replace(/"/g, '\\"')}"]`);
  function node(v, p, k) {
    const label = k == null ? "" : `<span style="color:var(--cyan)">${esc(typeof k === "number" ? k : JSON.stringify(k))}</span>: `;
    if (v && typeof v === "object") {
      const arr = Array.isArray(v);
      const entries = arr ? v.map((x, i) => [i, x]) : Object.entries(v);
      return `<details open style="margin-left:${k == null ? 0 : 14}px"><summary style="cursor:pointer">${label}<span class="tk-dim">${arr ? `[${v.length}]` : `{${entries.length}}`}</span></summary>` +
        entries.map(([kk, x]) => node(x, pathKey(p, kk), kk)).join("") + `</details>`;
    }
    const color = typeof v === "string" ? "var(--green)" : typeof v === "number" ? "var(--orange-soft)" : "var(--text-mid)";
    return `<div style="margin-left:14px;cursor:pointer" data-path="${esc(p)}">${label}<span style="color:${color}">${esc(JSON.stringify(v))}</span></div>`;
  }
  function tree() {
    if (data === undefined && !parse(false)) { $("#js-tree").innerHTML = ""; return; }
    $("#js-tree").innerHTML = node(data, "", null);
  }
  function lookup(path) {
    const parts = [];
    path.replace(/^\$\.?/, "").replace(/\[(\d+)\]|\["((?:[^"\\]|\\.)*)"\]|([^.[\]]+)/g, (m, i, q, w) => { parts.push(i != null ? +i : q != null ? q.replace(/\\"/g, '"') : w); });
    return parts.reduce((v, k) => (v == null ? undefined : v[k]), data);
  }
  $("#js-tree").addEventListener("click", e => {
    const d = e.target.closest("[data-path]");
    if (!d) return;
    $("#js-path").value = d.dataset.path;
    $("#js-path-val").textContent = JSON.stringify(lookup(d.dataset.path), null, 2);
    TK.copy(d.dataset.path).then(ok => ok && TK.toast(`path copied: ${d.dataset.path}`));
  });
  $("#js-path").addEventListener("input", () => {
    if (data === undefined) parse(false);
    const v = lookup($("#js-path").value.trim());
    $("#js-path-val").textContent = v === undefined ? "(no value at this path)" : JSON.stringify(v, null, 2);
  });
  TK.seg($("#js-view"), v => {
    view = v;
    $("#js-text-out").hidden = v !== "text";
    $("#js-tree-out").hidden = v !== "tree";
    if (v === "tree") tree();
  });
  $("#js-in").addEventListener("input", TK.debounce(() => { if (parse(false)) out(JSON.stringify(data, null, indent())); }, 300));
  parse(false);
});

/* ============================================================
   JSON → code
   ============================================================ */
function inferType(values) {
  // Merge the shapes of all sample values into one descriptor.
  const t = { kinds: new Set(), fields: new Map(), count: 0, items: [] };
  for (const v of values) {
    if (v === null) t.kinds.add("null");
    else if (Array.isArray(v)) { t.kinds.add("array"); t.items.push(...v); }
    else if (typeof v === "object") {
      t.kinds.add("object");
      t.count++;
      for (const [k, x] of Object.entries(v)) {
        if (!t.fields.has(k)) t.fields.set(k, { vals: [], seen: 0 });
        const f = t.fields.get(k);
        f.vals.push(x);
        f.seen++;
      }
    } else if (typeof v === "number") t.kinds.add(Number.isInteger(v) ? "int" : "float");
    else t.kinds.add(typeof v);
  }
  return t;
}
const pascal = s => (String(s).replace(/[^A-Za-z0-9]+(.)?/g, (m, c) => (c ? c.toUpperCase() : "")).replace(/^./, c => c.toUpperCase()) || "Item").replace(/^\d/, "N$&");
function singular(s) { return s.replace(/ies$/, "y").replace(/([^s])s$/, "$1"); }

function toTS(data, rootName) {
  const out = [];
  const seen = new Map();
  function typeOf(vals, name) {
    const t = inferType(vals);
    const parts = [];
    if (t.kinds.has("string")) parts.push("string");
    if (t.kinds.has("int") || t.kinds.has("float")) parts.push("number");
    if (t.kinds.has("boolean")) parts.push("boolean");
    if (t.kinds.has("object")) parts.push(iface(t, name));
    if (t.kinds.has("array")) {
      const inner = t.items.length ? typeOf(t.items, singular(name)) : "unknown";
      parts.push(/[|]/.test(inner) ? `(${inner})[]` : `${inner}[]`);
    }
    if (t.kinds.has("null")) parts.push("null");
    return parts.join(" | ") || "unknown";
  }
  function iface(t, name) {
    let n = pascal(name);
    const body = [...t.fields].map(([k, f]) => {
      const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      return `  ${key}${f.seen < t.count ? "?" : ""}: ${typeOf(f.vals, k)};`;
    }).join("\n");
    const sig = body;
    if (seen.has(sig)) return seen.get(sig);
    while (out.some(o => o.startsWith(`export interface ${n} `))) n += "2";
    seen.set(sig, n);
    out.push(`export interface ${n} {\n${body}\n}`);
    return n;
  }
  const top = typeOf([data], rootName);
  if (!(data && typeof data === "object" && !Array.isArray(data))) out.push(`export type ${pascal(rootName)} = ${top};`);
  return out.join("\n\n");
}

function toGo(data, rootName) {
  const out = [];
  function typeOf(vals, name) {
    const t = inferType(vals);
    const k = [...t.kinds].filter(x => x !== "null");
    const nullable = t.kinds.has("null");
    let g;
    if (k.length !== 1 && !(k.length === 2 && k.includes("int") && k.includes("float"))) g = "interface{}";
    else if (k.includes("float")) g = "float64";
    else if (k[0] === "int") g = "int64";
    else if (k[0] === "string") g = "string";
    else if (k[0] === "boolean") g = "bool";
    else if (k[0] === "array") g = `[]${t.items.length ? typeOf(t.items, singular(name)) : "interface{}"}`;
    else if (k[0] === "object") g = struct(t, name);
    return nullable && g !== "interface{}" && !g.startsWith("[]") ? `*${g}` : g;
  }
  function struct(t, name) {
    const n = pascal(name);
    const fields = [...t.fields].map(([k, f]) => `\t${pascal(k)} ${typeOf(f.vals, k)} \`json:"${k}${f.seen < t.count ? ",omitempty" : ""}"\``);
    out.push(`type ${n} struct {\n${fields.join("\n")}\n}`);
    return n;
  }
  const top = typeOf([data], rootName);
  if (!(data && typeof data === "object" && !Array.isArray(data))) out.push(`type ${pascal(rootName)} ${top}`);
  return out.reverse().join("\n\n");
}

function toPHP(v, ind = "") {
  const next = ind + "    ";
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  const arr = Array.isArray(v);
  const entries = arr ? v.map((x, i) => [i, x]) : Object.entries(v);
  if (!entries.length) return "[]";
  return "[\n" + entries.map(([k, x]) => `${next}${arr ? "" : `${/^(0|[1-9]\d*)$/.test(k) ? k : toPHP(k)} => `}${toPHP(x, next)},`).join("\n") + `\n${ind}]`;
}

function toYAML(v, ind = "") {
  const scalar = x => {
    if (x === null) return "null";
    if (typeof x === "boolean" || typeof x === "number") return String(x);
    const s = String(x);
    if (s === "" || /^[\s-?:,[\]{}#&*!|>'"%@`]|: | #|\s$|^(true|false|null|yes|no|on|off|~|[-+]?[\d.]+(e[-+]?\d+)?)$/i.test(s) || s.includes("\n")) {
      if (s.includes("\n")) return `|-\n${s.split("\n").map(l => ind + "  " + l).join("\n")}`;
      return JSON.stringify(s);
    }
    return s;
  };
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return v.map(x => {
      if (x && typeof x === "object" && Object.keys(x).length) {
        const inner = toYAML(x, ind + "  ");
        return `${ind}- ${inner.trimStart()}`;
      }
      return `${ind}- ${x && typeof x === "object" ? (Array.isArray(x) ? "[]" : "{}") : scalar(x)}`;
    }).join("\n");
  }
  if (v && typeof v === "object") {
    const e = Object.entries(v);
    if (!e.length) return "{}";
    return e.map(([k, x]) => {
      const key = /^[\w.-]+$/.test(k) && !/^(true|false|null|yes|no)$/i.test(k) ? k : JSON.stringify(k);
      if (x && typeof x === "object" && (Array.isArray(x) ? x.length : Object.keys(x).length)) return `${ind}${key}:\n${toYAML(x, ind + "  ")}`;
      return `${ind}${key}: ${x && typeof x === "object" ? (Array.isArray(x) ? "[]" : "{}") : scalar(x)}`;
    }).join("\n");
  }
  return ind + scalar(v);
}

function toXML(v, name = "root", ind = "") {
  const tag = String(name).replace(/[^\w.-]/g, "_").replace(/^(\d|xml)/i, "_$1");
  const x = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (Array.isArray(v)) return v.map(i => toXML(i, singular(tag) === tag ? "item" : singular(tag), ind)).join("\n");
  if (v && typeof v === "object") {
    return `${ind}<${tag}>\n${Object.entries(v).map(([k, c]) => (Array.isArray(c) ? `${ind}  <${k.replace(/[^\w.-]/g, "_")}>\n${toXML(c, k, ind + "    ")}\n${ind}  </${k.replace(/[^\w.-]/g, "_")}>` : toXML(c, k, ind + "  "))).join("\n")}\n${ind}</${tag}>`;
  }
  return v === null ? `${ind}<${tag}/>` : `${ind}<${tag}>${x(v)}</${tag}>`;
}

function toQuery(v, prefix = "") {
  const parts = [];
  const walk = (x, p) => {
    if (x && typeof x === "object") Object.entries(x).forEach(([k, c]) => walk(c, p ? `${p}[${k}]` : k));
    else parts.push(`${encodeURIComponent(p)}=${encodeURIComponent(x === null ? "" : x === true ? "1" : x === false ? "0" : x)}`);
  };
  walk(v, prefix);
  return parts.join("&");
}

function toPython(v, ind = "") {
  const next = ind + "    ";
  if (v === null) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number" || typeof v === "string") return JSON.stringify(v);
  const arr = Array.isArray(v);
  const e = arr ? v : Object.entries(v);
  if (!e.length) return arr ? "[]" : "{}";
  return (arr ? "[\n" : "{\n") + e.map(x => (arr ? `${next}${toPython(x, next)},` : `${next}${JSON.stringify(x[0])}: ${toPython(x[1], next)},`)).join("\n") + `\n${ind}${arr ? "]" : "}"}`;
}

Toolbox.define("jsonconv", root => {
  const TARGETS = { php: "PHP array", ts: "TypeScript interfaces", yaml: "YAML", xml: "XML", go: "Go structs", python: "Python dict", query: "Query string (http_build_query)" };
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <label class="tk-field" style="flex:1 1 220px"><span class="tk-label">Convert to</span>
          <select class="tk-select" id="jc-to">${Object.entries(TARGETS).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
        <label class="tk-field" style="flex:1 1 160px"><span class="tk-label">Root name</span><input class="tk-input" id="jc-name" value="Root" spellcheck="false"></label>
      </div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel"><label class="tk-field"><span class="tk-label">JSON</span>
        <textarea class="tk-textarea tall" id="jc-in" spellcheck="false">{
  "id": 42,
  "name": "Bugfish",
  "email": null,
  "active": true,
  "score": 9.5,
  "tags": ["php", "js"],
  "projects": [
    { "title": "Suitefish CMS", "stars": 120, "license": "GPLv3" },
    { "title": "NIGHTFALL", "stars": 7 }
  ]
}</textarea></label></section>
      <section class="tk-panel"><label class="tk-field"><span class="tk-label">Output</span>
        <textarea class="tk-textarea tall" id="jc-out" readonly spellcheck="false"></textarea></label>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#jc-out")}</div>
        <div class="tk-msg" id="jc-msg" style="margin-top:8px"></div></section>
    </div>`;
  const $ = s => root.querySelector(s);
  function run() {
    let data;
    try { data = JSON.parse($("#jc-in").value); } catch (e) {
      try { data = parseLoose($("#jc-in").value); } catch (e2) { TK.msg($("#jc-msg"), `invalid JSON: ${e.message}`, "err"); return; }
    }
    TK.msg($("#jc-msg"), "");
    const name = $("#jc-name").value.trim() || "Root";
    const t = $("#jc-to").value;
    const out = {
      php: () => `<?php\n\n$${name.replace(/\W/g, "_").replace(/^\d/, "_$&").replace(/^./, c => c.toLowerCase())} = ${toPHP(data)};\n`,
      ts: () => toTS(data, name), yaml: () => toYAML(data) + "\n", xml: () => `<?xml version="1.0" encoding="UTF-8"?>\n${toXML(data, name.toLowerCase())}\n`,
      go: () => toGo(data, name), python: () => `${name.replace(/\W/g, "_").toLowerCase()} = ${toPython(data)}\n`, query: () => toQuery(data),
    }[t]();
    $("#jc-out").value = out;
  }
  $("#jc-in").addEventListener("input", TK.debounce(run, 200));
  $("#jc-to").addEventListener("change", run);
  $("#jc-name").addEventListener("input", run);
  run();
});

/* ============================================================
   CSV converter
   ============================================================ */
function parseCSV(text, delim) {
  if (!delim || delim === "auto") {
    const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
    const counts = [",", ";", "\t", "|"].map(d => [d, sample.split(d).length]);
    delim = counts.sort((a, b) => b[1] - a[1])[0][0];
  }
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"' && field === "") q = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return { rows: rows.filter(r => !(r.length === 1 && r[0] === "")), delim };
}
const csvField = (v, d) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /["\n\r]/.test(s) || s.includes(d) ? `"${s.replace(/"/g, '""')}"` : s; };
function flatten(o, p = "", out = {}) {
  if (o && typeof o === "object" && !Array.isArray(o)) Object.entries(o).forEach(([k, v]) => flatten(v, p ? `${p}.${k}` : k, out));
  else out[p] = o;
  return out;
}

Toolbox.define("csv", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        ${TK.segHtml("cv-dir", [["from", "CSV → …"], ["to", "JSON → CSV"]], "from")}
        <label class="tk-field" style="width:150px"><span class="tk-label">Delimiter</span>
          <select class="tk-select" id="cv-delim"><option value="auto">auto-detect</option><option value=",">comma ,</option><option value=";">semicolon ;</option><option value="\t">tab</option><option value="|">pipe |</option></select></label>
        <label class="tk-field" style="width:190px" id="cv-to-f"><span class="tk-label">Output</span>
          <select class="tk-select" id="cv-to"><option value="json">JSON (objects)</option><option value="jsonarr">JSON (arrays)</option><option value="sql">SQL INSERT</option><option value="md">Markdown table</option><option value="html">HTML table</option><option value="csv">CSV (re-delimit)</option></select></label>
        <label class="tk-check" style="align-self:flex-end"><input type="checkbox" id="cv-head" checked> first row is header</label>
      </div>
      <div class="tk-row" id="cv-sql" style="margin-top:12px">
        <label class="tk-field" style="width:180px"><span class="tk-label">Table</span><input class="tk-input" id="cv-table" value="my_table" spellcheck="false"></label>
        <label class="tk-field" style="width:150px"><span class="tk-label">Rows per INSERT</span><input class="tk-input" id="cv-batch" type="number" min="1" value="100"></label>
        <label class="tk-check" style="align-self:flex-end"><input type="checkbox" id="cv-null" checked> empty → NULL</label>
        <label class="tk-check" style="align-self:flex-end"><input type="checkbox" id="cv-create"> CREATE TABLE</label>
      </div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel">
        <label class="tk-field"><span class="tk-label">Input <em id="cv-in-info"></em></span>
          <textarea class="tk-textarea tall" id="cv-in" spellcheck="false">id;name;email;city;joined
1;Bugfish;hello@example.com;Mönchengladbach;2008-01-01
2;"Ada ""Countess"" Lovelace";ada@example.com;London;1843-07-10
3;Linus;;Helsinki;1991-08-25</textarea></label>
        <div class="tk-drop" id="cv-drop" style="margin-top:10px;padding:12px">or <b>drop a .csv / .json file</b></div>
      </section>
      <section class="tk-panel">
        <label class="tk-field"><span class="tk-label">Output</span><textarea class="tk-textarea tall" id="cv-out" readonly spellcheck="false"></textarea></label>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#cv-out")}<button class="tk-copy" type="button" id="cv-dl">Download</button></div>
        <div class="tk-msg" id="cv-msg" style="margin-top:8px"></div>
      </section>
    </div>
    <section class="tk-panel"><h3 class="tk-h">// preview</h3><div class="tk-scroll" id="cv-prev"></div></section>`;

  const $ = s => root.querySelector(s);
  let dir = "from";
  const sqlVal = (v, nul) => {
    if (v === "" && nul) return "NULL";
    if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(v)) return v;
    return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
  };
  const ident = s => "`" + String(s).replace(/`/g, "``") + "`";

  function table(head, rows) {
    return `<table class="tk-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` +
      rows.slice(0, 50).map(r => `<tr>${head.map((_, i) => `<td>${esc(r[i] ?? "")}</td>`).join("")}</tr>`).join("") + `</tbody></table>` +
      (rows.length > 50 ? `<p class="tk-note">… ${rows.length - 50} more rows</p>` : "");
  }

  function run() {
    const m = $("#cv-msg");
    $("#cv-to-f").hidden = dir !== "from";
    $("#cv-sql").hidden = dir !== "from" || $("#cv-to").value !== "sql";
    try {
      if (dir === "to") {
        let data = JSON.parse($("#cv-in").value);
        if (!Array.isArray(data)) data = [data];
        const flat = data.map(r => (r && typeof r === "object" && !Array.isArray(r) ? flatten(r) : { value: r }));
        const keys = [...new Set(flat.flatMap(Object.keys))];
        const d = $("#cv-delim").value === "auto" ? "," : $("#cv-delim").value;
        $("#cv-out").value = [keys.map(k => csvField(k, d)).join(d), ...flat.map(r => keys.map(k => csvField(r[k], d)).join(d))].join("\n");
        $("#cv-prev").innerHTML = table(keys, flat.map(r => keys.map(k => (r[k] == null ? "" : typeof r[k] === "object" ? JSON.stringify(r[k]) : String(r[k])))));
        $("#cv-in-info").textContent = `${data.length} records`;
        TK.msg(m, "");
        return;
      }
      const { rows, delim } = parseCSV($("#cv-in").value, $("#cv-delim").value);
      if (!rows.length) { $("#cv-out").value = ""; $("#cv-prev").innerHTML = ""; return; }
      const width = Math.max(...rows.map(r => r.length));
      const hasHead = $("#cv-head").checked;
      let head = hasHead ? rows[0].map((h, i) => h.trim() || `col${i + 1}`) : Array.from({ length: width }, (_, i) => `col${i + 1}`);
      while (head.length < width) head.push(`col${head.length + 1}`);
      const body = hasHead ? rows.slice(1) : rows;
      $("#cv-in-info").textContent = `${body.length} rows × ${width} cols · delimiter ${delim === "\t" ? "TAB" : `'${delim}'`}`;
      const to = $("#cv-to").value;
      const num = v => (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(v) ? Number(v) : v);
      let out = "";
      if (to === "json") out = JSON.stringify(body.map(r => Object.fromEntries(head.map((h, i) => [h, num(r[i] ?? "")]))), null, 2);
      else if (to === "jsonarr") out = JSON.stringify([head, ...body], null, 2);
      else if (to === "md") {
        const cell = s => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
        out = [`| ${head.map(cell).join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...body.map(r => `| ${head.map((_, i) => cell(r[i])).join(" | ")} |`)].join("\n");
      } else if (to === "html") {
        out = `<table>\n  <thead>\n    <tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr>\n  </thead>\n  <tbody>\n` +
          body.map(r => `    <tr>${head.map((_, i) => `<td>${esc(r[i] ?? "")}</td>`).join("")}</tr>`).join("\n") + `\n  </tbody>\n</table>`;
      } else if (to === "csv") {
        const d = delim === "," ? ";" : ",";
        out = [head, ...body].map(r => r.map(v => csvField(v, d)).join(d)).join("\n");
      } else {
        const tbl = ident($("#cv-table").value.trim() || "my_table");
        const batch = Math.max(1, +$("#cv-batch").value || 100);
        const nul = $("#cv-null").checked;
        const parts = [];
        if ($("#cv-create").checked) {
          const types = head.map((_, i) => {
            const vals = body.map(r => r[i] ?? "").filter(v => v !== "");
            if (vals.length && vals.every(v => /^-?\d{1,9}$/.test(v))) return "INT";
            if (vals.length && vals.every(v => /^-?\d+(\.\d+)?$/.test(v))) return "DECIMAL(15,4)";
            if (vals.length && vals.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) return "DATE";
            if (vals.length && vals.every(v => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(v))) return "DATETIME";
            const max = Math.max(1, ...vals.map(v => v.length));
            return max > 255 ? "TEXT" : `VARCHAR(${Math.min(255, Math.ceil(max * 1.5 / 10) * 10 || 10)})`;
          });
          parts.push(`CREATE TABLE ${tbl} (\n${head.map((h, i) => `  ${ident(h)} ${types[i]}${nul ? " NULL" : " NOT NULL"}`).join(",\n")}\n);\n`);
        }
        for (let i = 0; i < body.length; i += batch) {
          const chunk = body.slice(i, i + batch);
          parts.push(`INSERT INTO ${tbl} (${head.map(ident).join(", ")}) VALUES\n` + chunk.map(r => `  (${head.map((_, j) => sqlVal(r[j] ?? "", nul)).join(", ")})`).join(",\n") + ";");
        }
        out = parts.join("\n");
      }
      $("#cv-out").value = out;
      $("#cv-prev").innerHTML = table(head, body);
      const ragged = body.filter(r => r.length !== width).length;
      TK.msg(m, ragged ? `⚠ ${ragged} rows have a different number of columns` : "", ragged ? "warn" : "");
    } catch (e) { TK.msg(m, e.message, "err"); }
  }
  TK.seg($("#cv-dir"), v => {
    dir = v;
    if (v === "to" && !/^\s*[[{]/.test($("#cv-in").value)) $("#cv-in").value = JSON.stringify([{ id: 1, name: "Bugfish", address: { city: "Mönchengladbach", zip: "41065" } }, { id: 2, name: "Ada", address: { city: "London" } }], null, 2);
    run();
  });
  root.querySelectorAll("select, input").forEach(el => el.addEventListener("input", run));
  $("#cv-in").addEventListener("input", TK.debounce(run, 200));
  TK.drop($("#cv-drop"), async files => { $("#cv-in").value = await TK.readFile(files[0], "text"); run(); }, ".csv,.tsv,.txt,.json");
  $("#cv-dl").addEventListener("click", () => {
    const ext = { json: "json", jsonarr: "json", sql: "sql", md: "md", html: "html", csv: "csv" }[dir === "to" ? "csv" : $("#cv-to").value];
    TK.download(`converted.${ext}`, $("#cv-out").value, "text/plain");
  });
  run();
});

/* ============================================================
   PHP serialize ↔ JSON
   ============================================================ */
function phpUnserialize(str, lenient) {
  const bytes = TK.utf8(str);
  let i = 0;
  const dec = new TextDecoder();
  const err = m => { throw new Error(`${m} at byte ${i}`); };
  const readUntil = ch => {
    const s = i;
    while (i < bytes.length && bytes[i] !== ch.charCodeAt(0)) i++;
    if (i >= bytes.length) err(`expected '${ch}'`);
    return dec.decode(bytes.slice(s, i++));
  };
  const expect = ch => { if (bytes[i] !== ch.charCodeAt(0)) err(`expected '${ch}'`); i++; };
  const propName = (k, cls) => {
    if (typeof k !== "string" || k.charCodeAt(0) !== 0) return k;
    const parts = k.split("\0");
    return parts[1] === "*" ? `${parts[2]}:protected` : `${parts[2]}:${parts[1]}:private`;
  };
  const readString = len => {
    expect('"');
    let s = i + len;
    if (lenient && !(bytes[s] === 0x22 && (bytes[s + 1] === 0x3b || bytes[s + 1] === 0x3a))) {
      // broken length (search & replace on serialized data) — find the real end
      let j = i;
      while (j < bytes.length && !(bytes[j] === 0x22 && (bytes[j + 1] === 0x3b || bytes[j + 1] === 0x3a) && (j + 2 >= bytes.length || /[sibdaNOr}CE]/.test(String.fromCharCode(bytes[j + 2]))))) j++;
      s = j;
    }
    const v = dec.decode(bytes.slice(i, s));
    i = s;
    expect('"');
    return v;
  };
  function val() {
    const t = String.fromCharCode(bytes[i++]);
    if (t === "N") { expect(";"); return null; }
    expect(":");
    switch (t) {
      case "b": return readUntil(";") === "1";
      case "i": return Number(readUntil(";"));
      case "d": { const v = readUntil(";"); return v === "INF" ? Infinity : v === "-INF" ? -Infinity : v === "NAN" ? NaN : Number(v); }
      case "s": { const len = +readUntil(":"); const v = readString(len); expect(";"); return v; }
      case "S": { const len = +readUntil(":"); const v = readString(len); expect(";"); return v; }
      case "r": case "R": return { __ref: Number(readUntil(";")) };
      case "E": { const len = +readUntil(":"); const v = readString(len); expect(";"); return { __enum: v }; }
      case "a": {
        const n = +readUntil(":");
        expect("{");
        const entries = [];
        for (let k = 0; k < n; k++) entries.push([val(), val()]);
        expect("}");
        const isList = entries.every(([k], idx) => k === idx);
        return isList ? entries.map(e => e[1]) : Object.fromEntries(entries.map(([k, v]) => [String(k), v]));
      }
      case "O": {
        const len = +readUntil(":");
        const cls = readString(len);
        expect(":");
        const n = +readUntil(":");
        expect("{");
        const o = { __class: cls };
        for (let k = 0; k < n; k++) { const key = val(); o[propName(key, cls)] = val(); }
        expect("}");
        return o;
      }
      case "C": {
        const len = +readUntil(":");
        const cls = readString(len);
        expect(":");
        const n = +readUntil(":");
        expect("{");
        const data = dec.decode(bytes.slice(i, i + n));
        i += n;
        expect("}");
        return { __class: cls, __serialized: data };
      }
    }
    i--;
    return err(`unknown type '${t}'`);
  }
  const v = val();
  while (i < bytes.length && /\s/.test(String.fromCharCode(bytes[i]))) i++;
  if (i < bytes.length) err("unexpected trailing data");
  return v;
}

function phpSerialize(v) {
  const s = x => `s:${TK.utf8(x).length}:"${x}";`;
  const key = k => (/^-?(0|[1-9]\d*)$/.test(k) && Math.abs(+k) <= Number.MAX_SAFE_INTEGER ? `i:${k};` : s(k));
  if (v === null || v === undefined) return "N;";
  if (typeof v === "boolean") return `b:${v ? 1 : 0};`;
  if (typeof v === "number") return Number.isInteger(v) ? `i:${v};` : `d:${v};`;
  if (typeof v === "string") return s(v);
  if (Array.isArray(v)) return `a:${v.length}:{${v.map((x, i) => `i:${i};${phpSerialize(x)}`).join("")}}`;
  if (v.__ref !== undefined && Object.keys(v).length === 1) return `r:${v.__ref};`;
  if (v.__enum !== undefined) return `E:${TK.utf8(v.__enum).length}:"${v.__enum}";`;
  if (v.__class) {
    if (v.__serialized !== undefined) return `C:${TK.utf8(v.__class).length}:"${v.__class}":${TK.utf8(v.__serialized).length}:{${v.__serialized}}`;
    const props = Object.entries(v).filter(([k]) => k !== "__class");
    const pn = k => {
      let m = /^(.*):protected$/.exec(k);
      if (m) return `\0*\0${m[1]}`;
      m = /^(.*):(.+):private$/.exec(k);
      return m ? `\0${m[2]}\0${m[1]}` : k;
    };
    return `O:${TK.utf8(v.__class).length}:"${v.__class}":${props.length}:{${props.map(([k, x]) => s(pn(k)) + phpSerialize(x)).join("")}}`;
  }
  const e = Object.entries(v);
  return `a:${e.length}:{${e.map(([k, x]) => key(k) + phpSerialize(x)).join("")}}`;
}

Toolbox.define("phpserialize", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <button class="btn small" id="ps-un" type="button">Unserialize → JSON</button>
        <button class="btn ghost small" id="ps-fix" type="button" title="recalculate s:N: lengths after a search &amp; replace">Repair lengths</button>
        <button class="btn outline small" id="ps-ser" type="button">← Serialize JSON</button>
      </div>
      <div class="tk-msg" id="ps-msg" style="margin-top:12px"></div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel"><label class="tk-field"><span class="tk-label">PHP serialized <em id="ps-len"></em></span>
        <textarea class="tk-textarea tall" id="ps-in" spellcheck="false">a:4:{s:4:"name";s:7:"Bugfish";s:4:"city";s:15:"Mönchengladbach";s:4:"tags";a:2:{i:0;s:3:"php";i:1;s:2:"js";}s:6:"active";b:1;}</textarea></label>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#ps-in")}</div></section>
      <section class="tk-panel"><label class="tk-field"><span class="tk-label">JSON</span>
        <textarea class="tk-textarea tall" id="ps-json" spellcheck="false"></textarea></label>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#ps-json")}</div></section>
    </div>
    <section class="tk-panel"><p class="tk-note">String lengths in PHP serialization are <b>bytes</b>, not characters —
      <code>"Mönchengladbach"</code> is 15 characters but 16 bytes, so the example above is deliberately broken; try <b>Repair lengths</b>.
      Objects appear as <code>{"__class": "Name", ...}</code>; protected / private properties as <code>prop:protected</code> / <code>prop:Class:private</code>.
      Never <code>unserialize()</code> untrusted input in PHP — use <code>json_decode()</code> or <code>['allowed_classes' =&gt; false]</code>.</p></section>`;
  const $ = s => root.querySelector(s);
  const len = () => { $("#ps-len").textContent = `${TK.utf8($("#ps-in").value).length} bytes`; };
  function un(lenient) {
    try {
      const v = phpUnserialize($("#ps-in").value.trim(), lenient);
      $("#ps-json").value = JSON.stringify(v, null, 2);
      if (lenient) { $("#ps-in").value = phpSerialize(v); len(); }
      TK.msg($("#ps-msg"), lenient ? "✓ lengths recalculated — the left side is valid again" : "✓ unserialized", "ok");
    } catch (e) {
      TK.msg($("#ps-msg"), `✗ ${e.message}${lenient ? "" : " — if the data went through a search & replace, try Repair lengths"}`, "err");
    }
  }
  $("#ps-un").addEventListener("click", () => un(false));
  $("#ps-fix").addEventListener("click", () => un(true));
  $("#ps-ser").addEventListener("click", () => {
    try { $("#ps-in").value = phpSerialize(JSON.parse($("#ps-json").value)); len(); TK.msg($("#ps-msg"), "✓ serialized", "ok"); }
    catch (e) { TK.msg($("#ps-msg"), `✗ ${e.message}`, "err"); }
  });
  $("#ps-in").addEventListener("input", len);
  len();
  un(false);
});

/* ============================================================
   SQL formatter
   ============================================================ */
const SQL_KW = new Set(("select from where and or not in is null like between exists join inner left right full outer cross natural on using as distinct all any some " +
  "group by order having limit offset union intersect except insert into values update set delete create table alter drop truncate index view " +
  "primary key foreign references unique default check constraint if replace with recursive case when then else end asc desc returning " +
  "auto_increment engine charset collate varchar char text int integer bigint smallint tinyint decimal numeric float double boolean date datetime timestamp " +
  "true false interval cast convert coalesce count sum avg min max over partition window rows range unsigned zerofill comment add column modify change rename to " +
  "begin commit rollback transaction lock unlock grant revoke show describe explain use database schema procedure function trigger returns declare").split(" "));
const SQL_BREAK = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET", "UNION ALL", "UNION", "INTERSECT", "EXCEPT",
  "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "RETURNING", "ON DUPLICATE KEY UPDATE", "WITH",
  "LEFT OUTER JOIN", "RIGHT OUTER JOIN", "FULL OUTER JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "FULL JOIN", "NATURAL JOIN", "JOIN",
  "CREATE TABLE", "ALTER TABLE", "DROP TABLE", "WINDOW"];

function sqlTokens(src) {
  const re = /(--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.|'')*'|"(?:[^"\\]|\\.)*"|`[^`]*`)|(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([A-Za-z_][\w$]*(?:\.[A-Za-z_*][\w$]*)*)|(<=|>=|<>|!=|:=|\|\||[-+*/%=<>!~^&|])|([(),;.])|(\s+)|(\S)/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    if (m[7]) continue;
    const type = m[1] ? "comment" : m[2] ? "string" : m[3] ? "number" : m[4] ? "word" : m[5] ? "op" : m[6] ? m[6] : "other";
    out.push({ type, v: m[0] });
  }
  return out;
}

const SQL_PAREN_SPACE = new Set(("in exists values as on using and or not from join where select into table with union all any some " +
  "then else when case by set returning references over is like between").split(" "));
const SQL_LIST = ["SELECT", "SET", "GROUP BY", "ORDER BY", "VALUES", "WITH", "RETURNING"];

function formatSQL(src, o) {
  const toks = sqlTokens(src);
  const kc = w => (o.kcase === "upper" ? w.toUpperCase() : o.kcase === "lower" ? w.toLowerCase() : w);
  const word = t => (t.type === "word" && SQL_KW.has(t.v.toLowerCase()) ? kc(t.v) : t.v);
  // "name(" is a function call unless the name follows INTO / TABLE / JOIN / FROM (then it is a table).
  const isCall = (prev, prev2) => prev && prev.type === "word" && !SQL_PAREN_SPACE.has(prev.v.toLowerCase()) &&
    !(prev2 && prev2.type === "word" && /^(into|table|join|from|update|exists)$/i.test(prev2.v));

  if (o.minify) {
    let s = "", prev = null, prev2 = null;
    toks.forEach(t => {
      if (t.type === "comment") {
        if (!o.stripComments) s += (s ? " " : "") + (/^(--|#)/.test(t.v) ? `/* ${t.v.replace(/^(--|#)\s?/, "")} */` : t.v);
        return;
      }
      const tight = !s || /[(.]$/.test(s) || [")", ",", ";", "."].includes(t.type) || (t.type === "(" && isCall(prev, prev2));
      s += (tight ? "" : " ") + word(t);
      prev2 = prev;
      prev = t;
    });
    return s;
  }

  const IND = o.indent;
  const stack = [];
  let out = "", line = "", depth = 0, clause = "", prev = null, prev2 = null;
  const trim = () => { line = line.replace(/\s+$/, ""); };
  const nl = (extra = 0) => { if (line.trim()) out += line.replace(/\s+$/, "") + "\n"; line = IND.repeat(Math.max(0, depth + extra)); };
  const put = s => { if (line.trim() && !/[\s(.]$/.test(line)) line += " "; line += s; };
  const inExpr = () => stack.length && stack[stack.length - 1].kind === "expr";

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === "word") {
      let words = null;
      for (const kw of SQL_BREAK) {
        const w = kw.split(" ");
        if (w.every((x, j) => toks[i + j] && toks[i + j].type === "word" && toks[i + j].v.toUpperCase() === x)) { words = w; break; }
      }
      if (words) {
        nl();
        line += kc(toks.slice(i, i + words.length).map(x => x.v).join(" "));
        i += words.length - 1;
        clause = words.join(" ");
        if (SQL_LIST.includes(clause)) nl(1);
        prev2 = toks[i - 1] || null;
        prev = toks[i];
        continue;
      }
      const up = t.v.toUpperCase();
      if ((up === "AND" || up === "OR") && !inExpr() && /WHERE|HAVING|JOIN/.test(clause)) { nl(1); put(kc(t.v)); prev2 = prev; prev = t; continue; }
      if (up === "ON" && /JOIN/.test(clause) && !inExpr()) { nl(1); put(kc(t.v)); prev2 = prev; prev = t; continue; }
      put(word(t));
    } else if (t.type === "(") {
      const next = toks[i + 1];
      const sub = next && next.type === "word" && /^(SELECT|WITH)$/i.test(next.v);
      if (isCall(prev, prev2)) { trim(); line += "("; } else put("(");
      // A subquery is indented one level deeper than the line that opens it.
      const lead = Math.floor(line.match(/^\s*/)[0].length / Math.max(1, IND.length));
      stack.push({ kind: sub ? "sub" : "expr", clause, depth, lead });
      if (sub) depth = lead + 1;
    } else if (t.type === ")") {
      const top = stack.pop();
      if (top && top.kind === "sub") { depth = top.lead; nl(); line += ")"; depth = top.depth; clause = top.clause; }
      else { trim(); line += ")"; }
    } else if (t.type === ",") {
      trim(); line += ",";
      if (!inExpr() && SQL_LIST.includes(clause)) nl(1);
    } else if (t.type === ";") {
      trim(); line += ";";
      nl(); out += "\n";
      depth = 0; clause = ""; stack.length = 0; line = "";
    } else if (t.type === ".") { trim(); line += "."; }
    else if (t.type === "comment") {
      if (o.stripComments) continue;
      put(t.v);
      if (!t.v.startsWith("/*")) nl();
    } else put(t.v);
    prev2 = prev;
    prev = t;
  }
  nl();
  return out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim() + "\n";
}

Toolbox.define("sql", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        ${TK.segHtml("sq-mode", [["pretty", "Beautify"], ["min", "Minify"]], "pretty")}
        <label class="tk-field" style="width:140px"><span class="tk-label">Keywords</span>
          <select class="tk-select" id="sq-case"><option value="upper">UPPERCASE</option><option value="lower">lowercase</option><option value="keep">keep</option></select></label>
        <label class="tk-field" style="width:120px"><span class="tk-label">Indent</span>
          <select class="tk-select" id="sq-ind"><option value="  ">2 spaces</option><option value="    " selected>4 spaces</option><option value="\t">tab</option></select></label>
        <label class="tk-check" style="align-self:flex-end"><input type="checkbox" id="sq-strip"> strip comments</label>
      </div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel"><label class="tk-field"><span class="tk-label">SQL</span>
        <textarea class="tk-textarea tall" id="sq-in" spellcheck="false">select u.id, u.name, count(o.id) as orders, sum(o.total) as revenue from users u left join orders o on o.user_id = u.id and o.status = 'paid' where u.created_at >= '2024-01-01' and (u.country = 'DE' or u.country = 'AT') and u.id in (select user_id from newsletter where active = 1) group by u.id, u.name having count(o.id) > 3 order by revenue desc limit 20; -- top customers
update products set price = price * 1.19, updated_at = now() where category_id = 7;</textarea></label></section>
      <section class="tk-panel"><label class="tk-field"><span class="tk-label">Result</span>
        <textarea class="tk-textarea tall" id="sq-out" readonly spellcheck="false"></textarea></label>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#sq-out")}<span class="tk-note" id="sq-info"></span></div></section>
    </div>`;
  const $ = s => root.querySelector(s);
  let mode = "pretty";
  function run() {
    const src = $("#sq-in").value;
    const res = formatSQL(src, { minify: mode === "min", kcase: $("#sq-case").value, indent: $("#sq-ind").value === "\\t" ? "\t" : $("#sq-ind").value, stripComments: $("#sq-strip").checked });
    $("#sq-out").value = res;
    $("#sq-info").textContent = `${src.length} → ${res.length} chars`;
  }
  TK.seg($("#sq-mode"), v => { mode = v; run(); });
  root.querySelectorAll("select, input").forEach(el => el.addEventListener("change", run));
  $("#sq-in").addEventListener("input", TK.debounce(run, 200));
  run();
});

/* ============================================================
   Lorem ipsum & test data
   ============================================================ */
const LOREM = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud " +
  "exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint " +
  "occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius " +
  "turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu nibh euismod gravida duis ac tellus et risus vulputate " +
  "vehicula donec lobortis risus a elit etiam tempor ut ullamcorper ligula eu tempor congue eros est euismod turpis id tincidunt sapien risus a quam maecenas fermentum " +
  "consequat mi donec fermentum pellentesque malesuada nulla a mi duis sapien sem aliquet nec commodo eget consequat quis neque aliquam faucibus").split(" ");
const FAKE = {
  first: "Anna Ben Clara David Emma Felix Greta Hannah Ivan Jonas Karla Leon Mia Noah Olivia Paul Quinn Rosa Samuel Tessa Uwe Vera Wilhelm Xenia Yusuf Zoe Liam Sofia Lukas Ella Mateo Aisha Kenji Chen Priya Omar Nora Erik Lina Tobias".split(" "),
  last: "Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Koch Richter Klein Wolf Neumann Smith Johnson Brown Garcia Martin Rossi Dubois Novak Kowalski Jensen Silva Tanaka Kim Nguyen Ivanova Andersen Costa Lindqvist Moreau Horvat".split(" "),
  city: [["Berlin", "10115", "DE"], ["Hamburg", "20095", "DE"], ["München", "80331", "DE"], ["Köln", "50667", "DE"], ["Mönchengladbach", "41065", "DE"], ["Wien", "1010", "AT"], ["Zürich", "8001", "CH"], ["London", "EC1A 1BB", "GB"], ["Paris", "75001", "FR"], ["Amsterdam", "1012 JS", "NL"], ["New York", "10001", "US"], ["Toronto", "M5H 2N2", "CA"], ["Stockholm", "111 20", "SE"], ["Madrid", "28013", "ES"], ["Tokyo", "100-0001", "JP"]],
  street: ["Hauptstraße", "Bahnhofstraße", "Gartenweg", "Schillerstraße", "Goethestraße", "Lindenallee", "Main Street", "Oak Avenue", "Park Lane", "Rue de Rivoli", "Kingsway", "Birkenweg", "Mühlenweg", "Am Markt"],
  company: ["Acme GmbH", "Globex Corp", "Initech", "Umbrella Ltd", "Stark Industries", "Wayne Enterprises", "Hooli", "Vandelay Industries", "Bugfish Labs", "Cyberdyne Systems", "Soylent AG", "Tyrell Corp"],
  job: ["Software Engineer", "DevOps Engineer", "Product Manager", "Designer", "Data Analyst", "System Administrator", "Support Specialist", "CTO", "Marketing Lead", "QA Engineer", "Accountant", "Sales Manager"],
  domain: ["example.com", "example.org", "example.net", "test.local", "mail.test"],
};
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

Toolbox.define("fakedata", root => {
  const FIELDS = {
    id: "id", uuid: "uuid", first_name: "first name", last_name: "last name", name: "full name", email: "e-mail", username: "username",
    phone: "phone", street: "street", zip: "zip", city: "city", country: "country", company: "company", job: "job title",
    birthdate: "birth date", created_at: "created at", ip: "IPv4", url: "website", active: "boolean", amount: "amount", bio: "sentence",
  };
  root.innerHTML = `
    <section class="tk-panel">
      ${TK.segHtml("fk-mode", [["lorem", "Lorem ipsum"], ["data", "Test records"]], "lorem")}
      <div id="fk-lorem" style="margin-top:14px">
        <div class="tk-row">
          <label class="tk-field" style="width:110px"><span class="tk-label">Amount</span><input class="tk-input" id="lo-n" type="number" min="1" max="200" value="3"></label>
          <label class="tk-field" style="width:150px"><span class="tk-label">Unit</span><select class="tk-select" id="lo-unit"><option value="p">paragraphs</option><option value="s">sentences</option><option value="w">words</option></select></label>
          <label class="tk-check" style="align-self:flex-end"><input type="checkbox" id="lo-start" checked> start with "Lorem ipsum…"</label>
          <label class="tk-check" style="align-self:flex-end"><input type="checkbox" id="lo-html"> wrap in &lt;p&gt;</label>
        </div>
      </div>
      <div id="fk-data" style="margin-top:14px" hidden>
        <div class="tk-row" id="fk-fields">${Object.entries(FIELDS).map(([k, l]) =>
          `<label class="tk-check"><input type="checkbox" value="${k}" ${["id", "name", "email", "city", "created_at"].includes(k) ? "checked" : ""}> ${l}</label>`).join("")}</div>
        <div class="tk-row" style="margin-top:12px">
          <label class="tk-field" style="width:110px"><span class="tk-label">Rows</span><input class="tk-input" id="fk-n" type="number" min="1" max="10000" value="10"></label>
          <label class="tk-field" style="width:150px"><span class="tk-label">Format</span><select class="tk-select" id="fk-fmt"><option value="json">JSON</option><option value="csv">CSV</option><option value="sql">SQL INSERT</option></select></label>
          <label class="tk-field" style="width:140px"><span class="tk-label">Seed</span><input class="tk-input" id="fk-seed" type="number" value="2008" title="same seed = same data"></label>
        </div>
      </div>
      <div class="tk-row" style="margin-top:14px"><button class="btn" id="fk-go">Generate</button>${TK.copyBtn("#fk-out")}<button class="tk-copy" id="fk-dl" type="button">Download</button><span class="tk-note" id="fk-info"></span></div>
    </section>
    <section class="tk-panel"><textarea class="tk-textarea tall" id="fk-out" readonly spellcheck="false"></textarea></section>`;

  const $ = s => root.querySelector(s);
  let mode = "lorem";
  function lorem() {
    const n = Math.min(200, Math.max(1, +$("#lo-n").value || 1)), unit = $("#lo-unit").value;
    const r = mulberry32(Date.now());
    const word = () => LOREM[Math.floor(r() * LOREM.length)];
    const sentence = () => { const len = 6 + Math.floor(r() * 10); const w = Array.from({ length: len }, word); if (len > 9) w[Math.floor(len / 2)] += ","; const s = w.join(" "); return s[0].toUpperCase() + s.slice(1) + "."; };
    const para = () => Array.from({ length: 4 + Math.floor(r() * 4) }, sentence).join(" ");
    let parts;
    if (unit === "w") parts = [Array.from({ length: n }, word).join(" ")];
    else if (unit === "s") parts = [Array.from({ length: n }, sentence).join(" ")];
    else parts = Array.from({ length: n }, para);
    if ($("#lo-start").checked) {
      const lead = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";
      if (unit === "w") parts[0] = lead.replace(",", "").split(" ").concat(parts[0].split(" ")).slice(0, n).join(" ");
      else parts[0] = `${lead}, ${parts[0][0].toLowerCase()}${parts[0].slice(1)}`;
    }
    const out = $("#lo-html").checked ? parts.map(p => `<p>${p}</p>`).join("\n") : parts.join("\n\n");
    $("#fk-info").textContent = `${out.split(/\s+/).length} words · ${out.length} chars`;
    return out;
  }
  function records() {
    const fields = [...root.querySelectorAll("#fk-fields input:checked")].map(i => i.value);
    const n = Math.min(10000, Math.max(1, +$("#fk-n").value || 1));
    const r = mulberry32(+$("#fk-seed").value || 1);
    const pick = a => a[Math.floor(r() * a.length)];
    const pad = x => String(x).padStart(2, "0");
    const translit = s => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/ß/g, "ss").toLowerCase().replace(/[^a-z]/g, "");
    const rows = [];
    for (let i = 1; i <= n; i++) {
      const f = pick(FAKE.first), l = pick(FAKE.last), c = pick(FAKE.city);
      const user = `${translit(f)}.${translit(l)}${r() < 0.4 ? Math.floor(r() * 99) : ""}`;
      const born = new Date(Date.UTC(1950 + Math.floor(r() * 55), Math.floor(r() * 12), 1 + Math.floor(r() * 28)));
      const created = new Date(Date.UTC(2019 + Math.floor(r() * 7), Math.floor(r() * 12), 1 + Math.floor(r() * 28), Math.floor(r() * 24), Math.floor(r() * 60), Math.floor(r() * 60)));
      const hex = k => Array.from({ length: k }, () => Math.floor(r() * 16).toString(16)).join("");
      const all = {
        id: i, uuid: `${hex(8)}-${hex(4)}-4${hex(3)}-${"89ab"[Math.floor(r() * 4)]}${hex(3)}-${hex(12)}`, first_name: f, last_name: l, name: `${f} ${l}`,
        email: `${user}@${pick(FAKE.domain)}`, username: user.replace(".", "_"), phone: `+49 ${150 + Math.floor(r() * 30)} ${Math.floor(1000000 + r() * 8999999)}`,
        street: `${pick(FAKE.street)} ${1 + Math.floor(r() * 120)}`, zip: c[1], city: c[0], country: c[2], company: pick(FAKE.company), job: pick(FAKE.job),
        birthdate: `${born.getUTCFullYear()}-${pad(born.getUTCMonth() + 1)}-${pad(born.getUTCDate())}`,
        created_at: created.toISOString().slice(0, 19).replace("T", " "),
        ip: `${[10, 172, 192, 203][Math.floor(r() * 4)]}.${Math.floor(r() * 256)}.${Math.floor(r() * 256)}.${1 + Math.floor(r() * 254)}`,
        url: `https://www.${translit(l)}.example`, active: r() < 0.7, amount: Math.round(r() * 100000) / 100,
        bio: (() => { const w = Array.from({ length: 8 }, () => LOREM[Math.floor(r() * LOREM.length)]).join(" "); return w[0].toUpperCase() + w.slice(1) + "."; })(),
      };
      rows.push(Object.fromEntries(fields.map(k => [k, all[k]])));
    }
    const fmt = $("#fk-fmt").value;
    $("#fk-info").textContent = `${rows.length} rows · seed ${$("#fk-seed").value}`;
    if (fmt === "json") return JSON.stringify(rows, null, 2);
    if (fmt === "csv") return [fields.join(","), ...rows.map(o => fields.map(k => csvField(o[k], ",")).join(","))].join("\n");
    const v = x => (typeof x === "number" ? x : typeof x === "boolean" ? (x ? 1 : 0) : `'${String(x).replace(/'/g, "''")}'`);
    return `INSERT INTO \`users\` (${fields.map(f => `\`${f}\``).join(", ")}) VALUES\n` + rows.map(o => `  (${fields.map(k => v(o[k])).join(", ")})`).join(",\n") + ";";
  }
  const gen = () => { $("#fk-out").value = mode === "lorem" ? lorem() : records(); };
  TK.seg($("#fk-mode"), v => { mode = v; $("#fk-lorem").hidden = v !== "lorem"; $("#fk-data").hidden = v !== "data"; gen(); });
  root.querySelectorAll("#fk-lorem input, #fk-lorem select, #fk-data input, #fk-data select").forEach(el => el.addEventListener("change", gen));
  $("#fk-go").addEventListener("click", gen);
  $("#fk-dl").addEventListener("click", () => TK.download(mode === "lorem" ? "lorem.txt" : `data.${$("#fk-fmt").value}`, $("#fk-out").value, "text/plain"));
  gen();
});
