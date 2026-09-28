/* ============================================================
   BUGFISH TOOLS — encoding.js
   Base64, encoding workbench, URL encoder/parser, string
   escaper, Unicode inspector and the classic cipher workbench.
   ============================================================ */

/* ---- shared codecs ------------------------------------------ */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const CODEC = {
  base58enc(bytes) {
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    let n = 0n;
    for (const b of bytes) n = (n << 8n) | BigInt(b);
    let s = "";
    while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
    return "1".repeat(zeros) + s;
  },
  base58dec(str) {
    const s = str.trim();
    let zeros = 0;
    while (zeros < s.length && s[zeros] === "1") zeros++;
    let n = 0n;
    for (const c of s) {
      const i = B58.indexOf(c);
      if (i < 0) throw new Error(`invalid Base58 character '${c}'`);
      n = n * 58n + BigInt(i);
    }
    const out = [];
    while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
    return Uint8Array.from([...new Array(zeros).fill(0), ...out]);
  },
  base32enc(bytes) {
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0, val = 0, s = "";
    for (const b of bytes) {
      val = ((val << 8) | b) & 0xffff; bits += 8;
      while (bits >= 5) { s += A[(val >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits) s += A[(val << (5 - bits)) & 31];
    return s + "=".repeat((8 - (s.length % 8)) % 8);
  },
  base32dec(str) {
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0, val = 0;
    const out = [];
    for (const c of str.toUpperCase().replace(/[\s=]/g, "")) {
      const i = A.indexOf(c);
      if (i < 0) throw new Error(`invalid Base32 character '${c}'`);
      val = ((val << 5) | i) & 0xffff; bits += 5;
      if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
    }
    return Uint8Array.from(out);
  },
  a85enc(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 4) {
      const chunk = bytes.slice(i, i + 4);
      const pad = 4 - chunk.length;
      let n = 0;
      for (let j = 0; j < 4; j++) n = n * 256 + (chunk[j] || 0);
      if (n === 0 && !pad) { s += "z"; continue; }
      let g = "";
      for (let j = 0; j < 5; j++) { g = String.fromCharCode(33 + (n % 85)) + g; n = Math.floor(n / 85); }
      s += g.slice(0, 5 - pad);
    }
    return `<~${s}~>`;
  },
  a85dec(str) {
    let s = str.trim().replace(/^<~/, "").replace(/~>$/, "").replace(/\s/g, "").replace(/z/g, "!!!!!");
    const out = [];
    for (let i = 0; i < s.length; i += 5) {
      const g = s.slice(i, i + 5);
      const pad = 5 - g.length;
      let n = 0;
      for (let j = 0; j < 5; j++) {
        const c = j < g.length ? g.charCodeAt(j) - 33 : 84;
        if (c < 0 || c > 84) throw new Error("invalid Ascii85 character");
        n = n * 85 + c;
      }
      const b = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
      out.push(...b.slice(0, 4 - pad));
    }
    return Uint8Array.from(out);
  },
  qpenc(bytes) {
    let line = "", out = "";
    const flush = s => { if (line.length + s.length > 75) { out += line + "=\n"; line = ""; } line += s; };
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 10) { out += line.replace(/[ \t]$/, m => (m === " " ? "=20" : "=09")) + "\n"; line = ""; continue; }
      if (b === 13 && bytes[i + 1] === 10) continue;
      if ((b >= 33 && b <= 126 && b !== 61) || b === 32 || b === 9) flush(String.fromCharCode(b));
      else flush("=" + b.toString(16).toUpperCase().padStart(2, "0"));
    }
    return out + line.replace(/[ \t]$/, m => (m === " " ? "=20" : "=09"));
  },
  qpdec(str) {
    const s = str.replace(/=\r?\n/g, "");
    const out = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "=" && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else out.push(...TK.utf8(s[i]));
    }
    return Uint8Array.from(out);
  },
};

/* ---- Punycode (RFC 3492) ------------------------------------ */
const PUNY = (() => {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128;
  const adapt = (delta, num, first) => {
    delta = first ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / num);
    let k = 0;
    while (delta > ((base - tMin) * tMax) >> 1) { delta = Math.floor(delta / (base - tMin)); k += base; }
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
  };
  const digit = d => String.fromCharCode(d + 22 + 75 * (d < 26));
  function encode(input) {
    const cps = Array.from(input, c => c.codePointAt(0));
    let n = initialN, delta = 0, bias = initialBias;
    let out = cps.filter(c => c < 0x80).map(c => String.fromCharCode(c)).join("");
    const b = out.length;
    let h = b;
    if (b) out += "-";
    while (h < cps.length) {
      const m = Math.min(...cps.filter(c => c >= n));
      delta += (m - n) * (h + 1);
      n = m;
      for (const c of cps) {
        if (c < n) delta++;
        if (c === n) {
          let q = delta;
          for (let k = base; ; k += base) {
            const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
            if (q < t) break;
            out += digit(t + ((q - t) % (base - t)));
            q = Math.floor((q - t) / (base - t));
          }
          out += digit(q);
          bias = adapt(delta, h + 1, h === b);
          delta = 0;
          h++;
        }
      }
      delta++; n++;
    }
    return out;
  }
  function decode(input) {
    const out = [];
    let n = initialN, i = 0, bias = initialBias;
    let basic = input.lastIndexOf("-");
    if (basic < 0) basic = 0;
    for (let j = 0; j < basic; j++) out.push(input.charCodeAt(j));
    for (let idx = basic > 0 ? basic + 1 : 0; idx < input.length;) {
      const oldi = i;
      let w = 1;
      for (let k = base; ; k += base) {
        if (idx >= input.length) throw new Error("bad punycode input");
        const cp = input.charCodeAt(idx++);
        const d = cp - 48 < 10 ? cp - 22 : cp - 65 < 26 ? cp - 65 : cp - 97 < 26 ? cp - 97 : base;
        if (d >= base) throw new Error("bad punycode digit");
        i += d * w;
        const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (d < t) break;
        w *= base - t;
      }
      bias = adapt(i - oldi, out.length + 1, oldi === 0);
      n += Math.floor(i / (out.length + 1));
      i %= out.length + 1;
      out.splice(i++, 0, n);
    }
    return String.fromCodePoint(...out);
  }
  const toASCII = domain => domain.split(".").map(l => (/[^\x00-\x7f]/.test(l) ? "xn--" + encode(l.toLowerCase()) : l)).join(".");
  const toUnicode = domain => domain.split(".").map(l => (/^xn--/i.test(l) ? decode(l.slice(4).toLowerCase()) : l)).join(".");
  return { encode, decode, toASCII, toUnicode };
})();

/* ============================================================
   Base64
   ============================================================ */
function sniffMime(b) {
  const h = TK.hex(b.slice(0, 12));
  if (h.startsWith("89504e47")) return ["image/png", "png"];
  if (h.startsWith("ffd8ff")) return ["image/jpeg", "jpg"];
  if (h.startsWith("47494638")) return ["image/gif", "gif"];
  if (h.startsWith("52494646") && h.slice(16, 24) === "57454250") return ["image/webp", "webp"];
  if (h.startsWith("25504446")) return ["application/pdf", "pdf"];
  if (h.startsWith("504b0304")) return ["application/zip", "zip"];
  if (h.startsWith("1f8b")) return ["application/gzip", "gz"];
  if (h.startsWith("00000100")) return ["image/x-icon", "ico"];
  const head = TK.unutf8(b.slice(0, 200)).trim();
  if (/^<svg|^<\?xml[\s\S]*<svg/i.test(head)) return ["image/svg+xml", "svg"];
  return ["application/octet-stream", "bin"];
}

Toolbox.define("base64", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row" style="justify-content:space-between">
        ${TK.segHtml("b6-mode", [["text", "Text"], ["file", "File → Base64"], ["tofile", "Base64 → File"]], "text")}
        <div class="tk-row">
          <label class="tk-check"><input type="checkbox" id="b6-url"> URL-safe</label>
          <label class="tk-check"><input type="checkbox" id="b6-wrap"> wrap at 76</label>
        </div>
      </div>
    </section>
    <section class="tk-panel" id="b6-text">
      <div class="tk-grid two">
        <label class="tk-field"><span class="tk-label">Text (UTF-8) <em id="b6-tlen"></em></span>
          <textarea class="tk-textarea tall" id="b6-plain" spellcheck="false" placeholder="type here to encode"></textarea></label>
        <label class="tk-field"><span class="tk-label">Base64 <em id="b6-blen"></em></span>
          <textarea class="tk-textarea tall" id="b6-enc" spellcheck="false" placeholder="or paste Base64 here to decode"></textarea></label>
      </div>
      <div class="tk-row" style="margin-top:10px">${TK.copyBtn("#b6-plain", "Copy text")} ${TK.copyBtn("#b6-enc", "Copy Base64")}</div>
      <div class="tk-msg" id="b6-msg" style="margin-top:10px"></div>
    </section>
    <section class="tk-panel" id="b6-file" hidden>
      <div class="tk-drop" id="b6-drop"><b>drop a file</b> or click — it is converted locally</div>
      <div id="b6-file-out" style="margin-top:14px"></div>
    </section>
    <section class="tk-panel" id="b6-tofile" hidden>
      <label class="tk-field"><span class="tk-label">Base64 or data: URI</span>
        <textarea class="tk-textarea" id="b6-in" spellcheck="false" placeholder="data:image/png;base64,iVBOR... or plain Base64"></textarea></label>
      <div class="tk-row" style="margin-top:10px"><button class="btn" id="b6-dl">Decode &amp; download</button><span class="tk-note" id="b6-info"></span></div>
      <div class="tk-preview" id="b6-prev" style="margin-top:14px" hidden></div>
    </section>`;

  const $ = s => root.querySelector(s);
  const views = { text: $("#b6-text"), file: $("#b6-file"), tofile: $("#b6-tofile") };
  TK.seg($("#b6-mode"), v => Object.entries(views).forEach(([k, el]) => { el.hidden = k !== v; }));
  const wrap = s => ($("#b6-wrap").checked ? s.replace(/(.{76})/g, "$1\n").trim() : s);

  function encode() {
    const b = TK.utf8($("#b6-plain").value);
    $("#b6-enc").value = wrap(TK.b64(b, $("#b6-url").checked));
    $("#b6-tlen").textContent = `${b.length} bytes`;
    $("#b6-blen").textContent = `${$("#b6-enc").value.replace(/\s/g, "").length} chars`;
    TK.msg($("#b6-msg"), "");
  }
  function decode() {
    const m = $("#b6-msg");
    const raw = $("#b6-enc").value.replace(/^data:[^,]*,/, "");
    $("#b6-blen").textContent = `${raw.replace(/\s/g, "").length} chars`;
    if (!raw.trim()) { $("#b6-plain").value = ""; TK.msg(m, ""); return; }
    try {
      const b = TK.unb64(raw);
      $("#b6-tlen").textContent = `${b.length} bytes`;
      try {
        $("#b6-plain").value = TK.unutf8(b, true);
        TK.msg(m, "");
      } catch (e) {
        const [mime] = sniffMime(b);
        $("#b6-plain").value = TK.hex(b.slice(0, 512)).replace(/(..)/g, "$1 ").trim() + (b.length > 512 ? " ..." : "");
        TK.msg(m, `binary data (${mime}, ${TK.fmtBytes(b.length)}) — shown as hex. Use "Base64 → File" to download it.`, "warn");
      }
    } catch (e) { TK.msg(m, e.message, "err"); }
  }
  $("#b6-plain").addEventListener("input", encode);
  $("#b6-enc").addEventListener("input", decode);
  $("#b6-url").addEventListener("change", encode);
  $("#b6-wrap").addEventListener("change", encode);

  TK.drop($("#b6-drop"), async files => {
    const f = files[0];
    const b = await TK.readFile(f, "bytes");
    const mime = f.type || sniffMime(b)[0];
    const b64 = TK.b64(b);
    const uri = `data:${mime};base64,${b64}`;
    const isImg = mime.startsWith("image/");
    $("#b6-drop").innerHTML = `<b>${esc(f.name)}</b> · ${TK.fmtBytes(f.size)} → ${TK.fmtBytes(b64.length)} as Base64 (+${Math.round((b64.length / Math.max(1, f.size) - 1) * 100)}%)`;
    $("#b6-file-out").innerHTML = `
      ${isImg ? `<div class="tk-preview" style="min-height:120px;margin-bottom:14px"><img src="${uri}" alt="" style="max-height:200px;max-width:100%"></div>` : ""}
      <div class="tk-grid" style="grid-template-columns:1fr">
        <label class="tk-field"><span class="tk-label">Data URI</span><textarea class="tk-textarea short" id="b6-uri" readonly>${esc(uri)}</textarea></label>
        <div class="tk-row">${TK.copyBtn("#b6-uri", "Copy data URI")} ${TK.copyBtn("#b6-raw", "Copy raw Base64")}
          ${isImg ? `${TK.copyBtn("#b6-css", "Copy CSS")} ${TK.copyBtn("#b6-img", "Copy <img>")}` : ""}</div>
        <textarea id="b6-raw" hidden>${esc(b64)}</textarea>
        <textarea id="b6-css" hidden>background-image: url("${esc(uri)}");</textarea>
        <textarea id="b6-img" hidden>&lt;img src="${esc(uri)}" alt=""&gt;</textarea>
      </div>`;
  });

  function parseIn() {
    const v = $("#b6-in").value.trim();
    const m = /^data:([^;,]+)?(;base64)?,/.exec(v);
    const b = TK.unb64(m ? v.slice(m[0].length) : v);
    const [sm, ext] = sniffMime(b);
    return { b, mime: (m && m[1]) || sm, ext };
  }
  $("#b6-in").addEventListener("input", TK.debounce(() => {
    const prev = $("#b6-prev");
    try {
      const { b, mime } = parseIn();
      $("#b6-info").textContent = `${mime} · ${TK.fmtBytes(b.length)}`;
      if (mime.startsWith("image/")) {
        const url = URL.createObjectURL(new Blob([b], { type: mime }));
        prev.innerHTML = `<img src="${url}" alt="" style="max-height:260px;max-width:100%">`;
        prev.hidden = false;
      } else prev.hidden = true;
    } catch (e) { $("#b6-info").textContent = e.message; prev.hidden = true; }
  }, 250));
  $("#b6-dl").addEventListener("click", () => {
    try {
      const { b, mime, ext } = parseIn();
      TK.download(`decoded.${ext}`, new Blob([b], { type: mime }));
    } catch (e) { $("#b6-info").textContent = e.message; }
  });
});

/* ============================================================
   Encoding workbench
   ============================================================ */
Toolbox.define("encodings", root => {
  const FORMATS = [
    ["text", "Text (UTF-8)"], ["hex", "Hex"], ["bin", "Binary"], ["oct", "Octal bytes"], ["dec", "Decimal bytes"],
    ["b32", "Base32"], ["b58", "Base58"], ["a85", "Ascii85"], ["b64", "Base64"], ["qp", "Quoted-printable"],
    ["esc", "\\u / \\x escapes"], ["puny", "Punycode domain"],
  ];
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <label class="tk-field" style="flex:0 1 240px"><span class="tk-label">Input is</span>
          <select class="tk-select" id="ew-from">${FORMATS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></label>
        <span class="tk-note" id="ew-info" style="align-self:flex-end"></span>
      </div>
      <textarea class="tk-textarea short" id="ew-in" style="margin-top:12px" spellcheck="false" placeholder="Hello Bugfish 🐟"></textarea>
      <div class="tk-msg" id="ew-msg" style="margin-top:10px"></div>
    </section>
    <section class="tk-panel"><h3 class="tk-h">// every encoding</h3><div id="ew-out"></div></section>`;

  const $ = s => root.querySelector(s);
  const toBytes = (fmt, v) => {
    const s = v.trim();
    switch (fmt) {
      case "text": return TK.utf8(v);
      case "hex": return TK.unhex(s);
      case "bin": {
        const bits = s.replace(/[^01]/g, "");
        if (bits.length % 8) throw new Error("binary length must be a multiple of 8");
        return Uint8Array.from(bits.match(/.{8}/g) || [], x => parseInt(x, 2));
      }
      case "oct": return Uint8Array.from(s.split(/[\s,]+/).filter(Boolean), x => { const n = parseInt(x, 8); if (isNaN(n) || n > 255) throw new Error(`bad octal '${x}'`); return n; });
      case "dec": return Uint8Array.from(s.split(/[\s,]+/).filter(Boolean), x => { const n = +x; if (!Number.isInteger(n) || n < 0 || n > 255) throw new Error(`bad byte '${x}'`); return n; });
      case "b32": return CODEC.base32dec(s);
      case "b58": return CODEC.base58dec(s);
      case "a85": return CODEC.a85dec(s);
      case "b64": return TK.unb64(s);
      case "qp": return CODEC.qpdec(v);
      case "esc": return TK.utf8(s.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi,
        (m, a, b, c) => String.fromCodePoint(parseInt(a || b || c, 16))));
      case "puny": return TK.utf8(PUNY.toUnicode(s));
    }
    return new Uint8Array();
  };
  function render() {
    const m = $("#ew-msg");
    let bytes;
    try { bytes = toBytes($("#ew-from").value, $("#ew-in").value); TK.msg(m, ""); }
    catch (e) { TK.msg(m, e.message, "err"); return; }
    let text = "", textOk = true;
    try { text = TK.unutf8(bytes, true); } catch (e) { textOk = false; }
    const cps = textOk ? Array.from(text) : [];
    const rows = [
      ["Text", textOk ? text : "(not valid UTF-8)"],
      ["Hex", TK.hex(bytes).replace(/(..)(?!$)/g, "$1 ")],
      ["Hex compact", TK.hex(bytes)],
      ["Binary", Array.from(bytes, b => b.toString(2).padStart(8, "0")).join(" ")],
      ["Octal", Array.from(bytes, b => b.toString(8).padStart(3, "0")).join(" ")],
      ["Decimal", Array.from(bytes).join(" ")],
      ["Base32", CODEC.base32enc(bytes)],
      ["Base58", CODEC.base58enc(bytes)],
      ["Ascii85", CODEC.a85enc(bytes)],
      ["Base64", TK.b64(bytes)],
      ["Base64URL", TK.b64(bytes, true)],
      ["Quoted-printable", CODEC.qpenc(bytes)],
      ["JS \\u escapes", textOk ? cps.map(c => { const n = c.codePointAt(0); return n < 128 && n > 31 ? c : n > 0xffff ? `\\u{${n.toString(16)}}` : `\\u${n.toString(16).padStart(4, "0")}`; }).join("") : ""],
      ["\\x bytes (C / PHP)", Array.from(bytes, b => `\\x${b.toString(16).padStart(2, "0")}`).join("")],
      ["Code points", textOk ? cps.map(c => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`).join(" ") : ""],
      ["HTML entities", textOk ? cps.map(c => `&#${c.codePointAt(0)};`).join("") : ""],
      ["URL encoded", textOk ? encodeURIComponent(text) : Array.from(bytes, b => "%" + b.toString(16).toUpperCase().padStart(2, "0")).join("")],
    ];
    if (textOk && /\./.test(text) && !/\s/.test(text.trim())) {
      try { rows.push(["Punycode (IDN)", PUNY.toASCII(text.trim())]); } catch (e) { /* not a domain */ }
    }
    $("#ew-info").textContent = `${bytes.length} bytes · ${cps.length} code points`;
    $("#ew-out").innerHTML = TK.kv(rows.filter(r => r[1] !== ""));
  }
  $("#ew-in").addEventListener("input", TK.debounce(render, 120));
  $("#ew-from").addEventListener("change", render);
  $("#ew-in").value = "Hello Bugfish 🐟";
  render();
});

/* ============================================================
   URL encoder & parser
   ============================================================ */
Toolbox.define("url", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <h3 class="tk-h">// encode / decode</h3>
      <textarea class="tk-textarea short" id="ue-in" spellcheck="false" placeholder="text to encode — or %-encoded text to decode">Grüße & "Hallo" / 50% off? a+b=c</textarea>
      <div class="tk-row" style="margin-top:10px"><label class="tk-check"><input type="checkbox" id="ue-plus" checked> treat + as space when decoding</label></div>
      <div id="ue-out" style="margin-top:12px"></div>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h">// parse &amp; edit a URL</h3>
      <input class="tk-input" id="up-in" spellcheck="false" value="https://user:pass@bücher.example.com:8080/path/to/page.php?id=42&amp;tags[]=a&amp;tags[]=b&amp;q=hello%20world#section-2">
      <div class="tk-msg" id="up-msg" style="margin-top:10px"></div>
      <div id="up-parts" style="margin-top:12px"></div>
      <h3 class="tk-h">// query parameters</h3>
      <div class="tk-scroll"><table class="tk-table" id="up-q"><thead><tr><th>key</th><th>value (decoded)</th><th></th></tr></thead><tbody></tbody></table></div>
      <div class="tk-row" style="margin-top:10px"><button class="btn ghost small" id="up-add" type="button">+ parameter</button>
        ${TK.copyBtn("#up-in", "Copy URL")}</div>
    </section>`;

  const $ = s => root.querySelector(s);
  const rawurl = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  function codec() {
    const v = $("#ue-in").value;
    let dec = "", err = "";
    try { dec = decodeURIComponent($("#ue-plus").checked ? v.replace(/\+/g, " ") : v); }
    catch (e) { err = "malformed % sequence"; }
    $("#ue-out").innerHTML = TK.kv([
      ["encodeURIComponent", encodeURIComponent(v)],
      ["PHP rawurlencode (RFC 3986)", rawurl(v)],
      ["PHP urlencode / form (+)", rawurl(v).replace(/%20/g, "+")],
      ["encodeURI (keeps / ? & =)", encodeURI(v)],
      ["decoded", err || dec],
    ]);
  }
  $("#ue-in").addEventListener("input", codec);
  $("#ue-plus").addEventListener("change", codec);
  codec();

  let url = null;
  function parse() {
    const m = $("#up-msg");
    try { url = new URL($("#up-in").value.trim()); TK.msg(m, ""); }
    catch (e) { url = null; TK.msg(m, "not an absolute URL (include the scheme, e.g. https://)", "err"); $("#up-parts").innerHTML = ""; return; }
    let host = url.hostname;
    try { host = PUNY.toUnicode(url.hostname); } catch (e) { /* keep ascii */ }
    $("#up-parts").innerHTML = TK.kv([
      ["protocol", url.protocol], ["username", decodeURIComponent(url.username)], ["password", decodeURIComponent(url.password)],
      ["hostname", url.hostname], ["host (unicode)", host !== url.hostname ? host : ""], ["port", url.port || `(default ${{ "http:": 80, "https:": 443, "ftp:": 21 }[url.protocol] || "-"})`],
      ["path", decodeURIComponent(url.pathname)], ["query", url.search], ["fragment", url.hash], ["origin", url.origin],
    ].filter(r => r[1] !== ""));
    const body = $("#up-q tbody");
    body.innerHTML = [...url.searchParams].map(([k, v], i) =>
      `<tr><td><input class="tk-input sm" data-i="${i}" data-f="k" value="${esc(k)}"></td>
       <td><input class="tk-input sm" style="width:100%" data-i="${i}" data-f="v" value="${esc(v)}"></td>
       <td><button class="tk-copy" type="button" data-del="${i}">✕</button></td></tr>`).join("") ||
      `<tr><td colspan="3" class="tk-dim">no query parameters</td></tr>`;
  }
  function rebuild(pairs) {
    if (!url) return;
    url.search = "";
    pairs.forEach(([k, v]) => url.searchParams.append(k, v));
    $("#up-in").value = url.toString();
  }
  function pairsFromTable() {
    const rows = [...root.querySelectorAll("#up-q tbody tr")];
    return rows.map(r => [r.querySelector('[data-f="k"]'), r.querySelector('[data-f="v"]')]).filter(x => x[0]).map(([k, v]) => [k.value, v.value]);
  }
  $("#up-in").addEventListener("input", parse);
  $("#up-q").addEventListener("input", () => { rebuild(pairsFromTable()); const i = document.activeElement; const pos = [i.dataset.i, i.dataset.f]; parseKeepFocus(pos); });
  function parseKeepFocus([i, f]) {
    const start = document.activeElement.selectionStart;
    parse();
    const el = root.querySelector(`#up-q [data-i="${i}"][data-f="${f}"]`);
    if (el) { el.focus(); try { el.setSelectionRange(start, start); } catch (e) { /* ignore */ } }
  }
  $("#up-q").addEventListener("click", e => {
    const d = e.target.closest("[data-del]");
    if (!d) return;
    const p = pairsFromTable();
    p.splice(+d.dataset.del, 1);
    rebuild(p); parse();
  });
  $("#up-add").addEventListener("click", () => { const p = pairsFromTable(); p.push(["key", "value"]); rebuild(p); parse(); });
  parse();
});

/* ============================================================
   String escaper
   ============================================================ */
Toolbox.define("escape", root => {
  const HTML_NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", copy: "©", reg: "®", trade: "™", euro: "€",
    hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", deg: "°", times: "×", divide: "÷", para: "¶", sect: "§", middot: "·", bull: "•" };
  const jsEsc = (s, q) => s.replace(/[\\\n\r\t\b\f\v\0\u2028\u2029]/g, c => ({ "\\": "\\\\", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f", "\v": "\\v", "\0": "\\0", "\u2028": "\\u2028", "\u2029": "\\u2029" }[c]))
    .replace(q === "'" ? /'/g : q === "`" ? /`|\$\{/g : /"/g, m => "\\" + m);
  const MODES = {
    html: { label: "HTML text / attribute", esc: s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"),
      un: s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (HTML_NAMED[e] || m)) },
    htmlall: { label: "HTML — all non-ASCII as entities", esc: s => MODES.html.esc(s).replace(/[^\x00-\x7f]/gu, c => `&#${c.codePointAt(0)};`), un: s => MODES.html.un(s) },
    js: { label: "JavaScript string ('…')", esc: s => jsEsc(s, "'"), un: s => unJs(s) },
    json: { label: "JSON string", esc: s => JSON.stringify(s).slice(1, -1), un: s => JSON.parse(`"${s}"`) },
    phps: { label: "PHP single-quoted", esc: s => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'"), un: s => s.replace(/\\(['\\])/g, "$1") },
    phpd: { label: "PHP double-quoted", esc: s => s.replace(/[\\"$\n\r\t\v\f\x1b]/g, c => ({ "\\": "\\\\", '"': '\\"', "$": "\\$", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\v": "\\v", "\f": "\\f", "\x1b": "\\e" }[c])), un: s => unJs(s.replace(/\\\$/g, "$").replace(/\\e/g, "\x1b")) },
    sql: { label: "SQL string (MySQL)", esc: s => s.replace(/[\0\n\r\\'"\x1a]/g, c => ({ "\0": "\\0", "\n": "\\n", "\r": "\\r", "\\": "\\\\", "'": "\\'", '"': '\\"', "\x1a": "\\Z" }[c])),
      un: s => s.replace(/\\([0nrZ\\'"])/g, (m, c) => ({ 0: "\0", n: "\n", r: "\r", Z: "\x1a" }[c] || c)).replace(/''/g, "'") },
    sqlstd: { label: "SQL string (standard, doubled quotes)", esc: s => s.replace(/'/g, "''"), un: s => s.replace(/''/g, "'") },
    regex: { label: "Regular expression literal", esc: s => s.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&"), un: s => s.replace(/\\(.)/g, "$1") },
    csv: { label: "CSV field", esc: s => (/[",\n\r;]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s),
      un: s => (/^".*"$/s.test(s) ? s.slice(1, -1).replace(/""/g, '"') : s) },
    shell: { label: "Shell argument (POSIX)", esc: s => `'${s.replace(/'/g, `'\\''`)}'`, un: s => s.replace(/^'|'$/g, "").replace(/'\\''/g, "'") },
    xml: { label: "XML", esc: s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"), un: s => MODES.html.un(s) },
  };
  function unJs(s) {
    return s.replace(/\\(u\{[0-9a-f]+\}|u[0-9a-f]{4}|x[0-9a-f]{2}|[0-7]{1,3}|.)/gi, (m, e) => {
      if (e[0] === "u" && e[1] === "{") return String.fromCodePoint(parseInt(e.slice(2, -1), 16));
      if ((e[0] === "u" || e[0] === "x") && e.length > 1) return String.fromCharCode(parseInt(e.slice(1), 16));
      if (/^[0-7]+$/.test(e)) return String.fromCharCode(parseInt(e, 8));
      return { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v" }[e] ?? e;
    });
  }

  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <label class="tk-field" style="flex:1 1 260px"><span class="tk-label">Target</span>
          <select class="tk-select" id="es-mode">${Object.entries(MODES).map(([k, m]) => `<option value="${k}">${esc(m.label)}</option>`).join("")}</select></label>
        <div style="align-self:flex-end">${TK.segHtml("es-dir", [["esc", "Escape"], ["un", "Unescape"]], "esc")}</div>
      </div>
      <div class="tk-grid two" style="margin-top:14px">
        <label class="tk-field"><span class="tk-label">Input</span>
          <textarea class="tk-textarea tall" id="es-in" spellcheck="false">&lt;a href="/?q=it's"&gt;Tom &amp; Jerry — "quoted"&lt;/a&gt;
Line 2	with a tab \\ backslash $var</textarea></label>
        <label class="tk-field"><span class="tk-label">Output</span>
          <textarea class="tk-textarea tall" id="es-out" readonly spellcheck="false"></textarea></label>
      </div>
      <div class="tk-row" style="margin-top:10px">${TK.copyBtn("#es-out", "Copy output")}<button class="tk-copy" id="es-swap" type="button">⇄ use output as input</button></div>
      <div class="tk-msg" id="es-msg" style="margin-top:10px"></div>
    </section>`;

  const $ = s => root.querySelector(s);
  let dir = "esc";
  function run() {
    const m = MODES[$("#es-mode").value];
    try { $("#es-out").value = m[dir]($("#es-in").value); TK.msg($("#es-msg"), ""); }
    catch (e) { $("#es-out").value = ""; TK.msg($("#es-msg"), `cannot ${dir === "un" ? "unescape" : "escape"}: ${e.message}`, "err"); }
  }
  TK.seg($("#es-dir"), v => { dir = v; run(); });
  $("#es-mode").addEventListener("change", run);
  $("#es-in").addEventListener("input", run);
  $("#es-swap").addEventListener("click", () => { $("#es-in").value = $("#es-out").value; run(); });
  run();
});

/* ============================================================
   Unicode inspector
   ============================================================ */
Toolbox.define("unicode", root => {
  const NAMES = {
    0x0009: "CHARACTER TABULATION", 0x000a: "LINE FEED", 0x000d: "CARRIAGE RETURN", 0x0020: "SPACE", 0x00a0: "NO-BREAK SPACE",
    0x00ad: "SOFT HYPHEN", 0x034f: "COMBINING GRAPHEME JOINER", 0x061c: "ARABIC LETTER MARK", 0x115f: "HANGUL CHOSEONG FILLER",
    0x180e: "MONGOLIAN VOWEL SEPARATOR", 0x2000: "EN QUAD", 0x2001: "EM QUAD", 0x2002: "EN SPACE", 0x2003: "EM SPACE",
    0x2004: "THREE-PER-EM SPACE", 0x2005: "FOUR-PER-EM SPACE", 0x2006: "SIX-PER-EM SPACE", 0x2007: "FIGURE SPACE", 0x2008: "PUNCTUATION SPACE",
    0x2009: "THIN SPACE", 0x200a: "HAIR SPACE", 0x200b: "ZERO WIDTH SPACE", 0x200c: "ZERO WIDTH NON-JOINER", 0x200d: "ZERO WIDTH JOINER",
    0x200e: "LEFT-TO-RIGHT MARK", 0x200f: "RIGHT-TO-LEFT MARK", 0x2010: "HYPHEN", 0x2011: "NON-BREAKING HYPHEN", 0x2012: "FIGURE DASH",
    0x2013: "EN DASH", 0x2014: "EM DASH", 0x2018: "LEFT SINGLE QUOTATION MARK", 0x2019: "RIGHT SINGLE QUOTATION MARK",
    0x201a: "SINGLE LOW-9 QUOTATION MARK", 0x201c: "LEFT DOUBLE QUOTATION MARK", 0x201d: "RIGHT DOUBLE QUOTATION MARK",
    0x201e: "DOUBLE LOW-9 QUOTATION MARK", 0x2026: "HORIZONTAL ELLIPSIS", 0x2028: "LINE SEPARATOR", 0x2029: "PARAGRAPH SEPARATOR",
    0x202a: "LEFT-TO-RIGHT EMBEDDING", 0x202b: "RIGHT-TO-LEFT EMBEDDING", 0x202c: "POP DIRECTIONAL FORMATTING", 0x202d: "LEFT-TO-RIGHT OVERRIDE",
    0x202e: "RIGHT-TO-LEFT OVERRIDE", 0x202f: "NARROW NO-BREAK SPACE", 0x205f: "MEDIUM MATHEMATICAL SPACE", 0x2060: "WORD JOINER",
    0x2061: "FUNCTION APPLICATION", 0x2062: "INVISIBLE TIMES", 0x2063: "INVISIBLE SEPARATOR", 0x2064: "INVISIBLE PLUS",
    0x2066: "LEFT-TO-RIGHT ISOLATE", 0x2067: "RIGHT-TO-LEFT ISOLATE", 0x2068: "FIRST STRONG ISOLATE", 0x2069: "POP DIRECTIONAL ISOLATE",
    0x2212: "MINUS SIGN", 0x3000: "IDEOGRAPHIC SPACE", 0x3164: "HANGUL FILLER", 0xfeff: "ZERO WIDTH NO-BREAK SPACE (BOM)",
    0xfffc: "OBJECT REPLACEMENT CHARACTER", 0xfffd: "REPLACEMENT CHARACTER", 0x20ac: "EURO SIGN", 0x00df: "LATIN SMALL LETTER SHARP S",
  };
  const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\u3164\ufeff\u{e0000}-\u{e007f}]/u;
  const ODD_SPACE = /[\u00a0\u2000-\u200a\u202f\u205f\u3000]/;
  const cat = c => (/\p{L}/u.test(c) ? "letter" : /\p{N}/u.test(c) ? "number" : /\p{M}/u.test(c) ? "mark" : /\p{P}/u.test(c) ? "punctuation"
    : /\p{S}/u.test(c) ? "symbol" : /\p{Zs}/u.test(c) ? "space" : /\p{Cf}/u.test(c) ? "format" : /\p{C}/u.test(c) ? "control" : "other");
  const SCRIPTS = ["Latin", "Cyrillic", "Greek", "Armenian", "Hebrew", "Arabic", "Han", "Hiragana", "Katakana", "Hangul", "Thai", "Devanagari", "Common"];
  const script = c => SCRIPTS.find(s => new RegExp(`\\p{Script=${s}}`, "u").test(c)) || "";

  root.innerHTML = `
    <section class="tk-panel">
      <textarea class="tk-textarea short" id="un-in" spellcheck="false"></textarea>
      <div class="tk-grid narrow" id="un-stats" style="margin-top:12px"></div>
      <div class="tk-row" style="margin-top:12px">
        <button class="btn ghost small" data-clean="invisible" type="button">remove invisible</button>
        <button class="btn ghost small" data-clean="spaces" type="button">normalize spaces</button>
        <button class="btn ghost small" data-clean="quotes" type="button">smart quotes → ASCII</button>
        <button class="btn ghost small" data-clean="nfc" type="button">NFC</button>
        <button class="btn ghost small" data-clean="nfkc" type="button">NFKC</button>
        <button class="btn ghost small" data-clean="ascii" type="button">strip accents</button>
        ${TK.copyBtn("#un-in", "Copy text")}
      </div>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h">// characters</h3>
      <div class="tk-scroll"><table class="tk-table"><thead><tr><th>#</th><th>char</th><th>code point</th><th>UTF-8</th><th>UTF-16</th><th>type</th><th>name / note</th></tr></thead>
        <tbody id="un-rows"></tbody></table></div>
      <p class="tk-note" id="un-more" style="margin-top:8px"></p>
    </section>`;

  const $ = s => root.querySelector(s);
  $("#un-in").value = "Hello\u200b World — “smart” café\u00a0€ 🐟 раypal";

  function render() {
    const v = $("#un-in").value;
    const cps = Array.from(v);
    const bytes = TK.utf8(v).length;
    let graphemes = cps.length;
    if (window.Intl && Intl.Segmenter) graphemes = [...new Intl.Segmenter().segment(v)].length;
    const invis = cps.filter(c => INVISIBLE.test(c)).length;
    const odd = cps.filter(c => ODD_SPACE.test(c)).length;
    const scripts = new Set(cps.map(script).filter(s => s && s !== "Common"));
    const mixed = /\p{Script=Latin}/u.test(v) && (/\p{Script=Cyrillic}/u.test(v) || /\p{Script=Greek}/u.test(v));
    const stat = (n, l, cls = "") => `<div class="tk-stat"><b class="${cls}">${n}</b><span>${l}</span></div>`;
    $("#un-stats").innerHTML = stat(cps.length, "code points") + stat(graphemes, "graphemes") + stat(v.length, "UTF-16 units") +
      stat(bytes, "UTF-8 bytes") + stat(invis, "invisible", invis ? "tk-err" : "") + stat(odd, "odd spaces", odd ? "tk-warn" : "") +
      stat(scripts.size, "scripts", mixed ? "tk-err" : "");
    const shown = cps.slice(0, 1500);
    $("#un-rows").innerHTML = shown.map((c, i) => {
      const n = c.codePointAt(0);
      const u8 = TK.hex(TK.utf8(c)).toUpperCase().replace(/(..)(?!$)/g, "$1 ");
      const u16 = Array.from({ length: c.length }, (_, j) => c.charCodeAt(j).toString(16).toUpperCase().padStart(4, "0")).join(" ");
      const inv = INVISIBLE.test(c) || /\p{C}/u.test(c);
      const sc = script(c);
      let note = NAMES[n] || "";
      if (INVISIBLE.test(c)) note = `⚠ invisible — ${note || "format character"}`;
      else if (ODD_SPACE.test(c)) note = `⚠ not a normal space — ${note}`;
      else if (mixed && (sc === "Cyrillic" || sc === "Greek") && /\p{L}/u.test(c)) note = `⚠ ${sc} letter in Latin text — possible look-alike${note ? " · " + note : ""}`;
      const glyph = inv ? `<span class="tk-badge err">${esc(n < 32 ? "CTRL" : "INV")}</span>` : n === 32 ? `<span class="tk-dim">␠</span>` : esc(c);
      return `<tr><td class="tk-dim">${i + 1}</td><td style="font-size:18px">${glyph}</td><td class="mono">U+${n.toString(16).toUpperCase().padStart(4, "0")}</td>
        <td class="mono">${u8}</td><td class="mono">${u16}</td><td>${cat(c)}${sc && sc !== "Common" ? ` · ${sc}` : ""}</td><td class="${note.startsWith("⚠") ? "tk-warn" : ""}">${esc(note)}</td></tr>`;
    }).join("");
    $("#un-more").textContent = cps.length > shown.length ? `showing the first ${shown.length} of ${cps.length} characters` : "";
  }
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-clean]");
    if (!b) return;
    let v = $("#un-in").value;
    const k = b.dataset.clean;
    if (k === "invisible") v = v.replace(new RegExp(INVISIBLE.source, "gu"), "");
    if (k === "spaces") v = v.replace(new RegExp(ODD_SPACE.source, "g"), " ");
    if (k === "quotes") v = v.replace(/[\u2018\u2019\u201a\u2032]/g, "'").replace(/[\u201c\u201d\u201e\u2033]/g, '"').replace(/[\u2013\u2014\u2212]/g, "-").replace(/\u2026/g, "...");
    if (k === "nfc") v = v.normalize("NFC");
    if (k === "nfkc") v = v.normalize("NFKC");
    if (k === "ascii") v = v.normalize("NFD").replace(/\p{M}/gu, "");
    $("#un-in").value = v;
    render();
  });
  $("#un-in").addEventListener("input", TK.debounce(render, 150));
  render();
});

/* ============================================================
   Classic cipher workbench (+ Morse audio)
   ============================================================ */
const MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--",
  N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...",
  ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", _: "..--.-", '"': ".-..-.", $: "...-..-", "@": ".--.-.",
  Ä: ".-.-", Ö: "---.", Ü: "..--",
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const EN_FREQ = { E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0, D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0, P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.15, X: 0.15, Q: 0.1, Z: 0.07 };

Toolbox.define("ciphers", root => {
  const shift = (s, k) => s.replace(/[a-z]/gi, c => {
    const b = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - b + k) % 26 + 26) % 26 + b);
  });
  const CIPHERS = {
    caesar: { label: "Caesar", key: "number", def: 3, enc: (s, k) => shift(s, +k || 0), dec: (s, k) => shift(s, -(+k || 0)) },
    rot13: { label: "ROT13", enc: s => shift(s, 13), dec: s => shift(s, 13) },
    rot47: { label: "ROT47", enc: s => s.replace(/[!-~]/g, c => String.fromCharCode(33 + ((c.charCodeAt(0) + 14) % 94))), dec: s => CIPHERS.rot47.enc(s) },
    atbash: { label: "Atbash", enc: s => s.replace(/[a-z]/gi, c => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode(b + 25 - (c.charCodeAt(0) - b)); }), dec: s => CIPHERS.atbash.enc(s) },
    vigenere: { label: "Vigenère", key: "text", def: "BUGFISH", enc: (s, k) => vig(s, k, 1), dec: (s, k) => vig(s, k, -1) },
    rail: { label: "Rail fence", key: "number", def: 3, enc: (s, k) => rail(s, +k, true), dec: (s, k) => rail(s, +k, false) },
    a1z26: { label: "A1Z26 (A=1 … Z=26)", enc: s => s.toUpperCase().split(/\s+/).map(w => [...w].filter(c => /[A-Z]/.test(c)).map(c => c.charCodeAt(0) - 64).join("-")).join(" "),
      dec: s => s.split(/\s+/).map(w => w.split(/[-,.]/).filter(Boolean).map(n => String.fromCharCode(64 + (+n))).join("")).join(" ") },
    bacon: { label: "Bacon (26-letter)", enc: s => s.toUpperCase().replace(/[^A-Z]/g, "").split("").map(c => (c.charCodeAt(0) - 65).toString(2).padStart(5, "0").replace(/0/g, "A").replace(/1/g, "B")).join(" "),
      dec: s => (s.toUpperCase().replace(/[^AB]/g, "").match(/.{5}/g) || []).map(g => String.fromCharCode(65 + parseInt(g.replace(/A/g, "0").replace(/B/g, "1"), 2))).join("") },
    xor: { label: "XOR (key, hex output)", key: "text", def: "key", enc: (s, k) => TK.hex(xor(TK.utf8(s), TK.utf8(k))),
      dec: (s, k) => TK.unutf8(xor(TK.unhex(s), TK.utf8(k))) },
    morse: { label: "Morse code", enc: s => s.toUpperCase().split(/\s+/).filter(Boolean).map(w => [...w].map(c => MORSE[c] || "").filter(Boolean).join(" ")).join(" / "),
      dec: s => s.trim().split(/\s*[/|]\s*|\s{3,}/).map(w => w.split(/\s+/).map(c => MORSE_REV[c.replace(/_/g, "-").replace(/·/g, ".")] || (c ? "?" : "")).join("")).join(" ") },
  };
  function vig(s, key, dir) {
    const k = key.toUpperCase().replace(/[^A-Z]/g, "");
    if (!k) return s;
    let j = 0;
    return s.replace(/[a-z]/gi, c => shift(c, dir * (k.charCodeAt(j++ % k.length) - 65)));
  }
  function rail(s, n, enc) {
    n = Math.max(2, Math.min(n || 2, 50));
    const chars = [...s];
    const pattern = chars.map((_, i) => { const c = 2 * (n - 1); const m = i % c; return m < n ? m : c - m; });
    const order = pattern.map((r, i) => [r, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[1]);
    if (enc) return order.map(i => chars[i]).join("");
    const out = new Array(chars.length);
    order.forEach((i, k) => { out[i] = chars[k]; });
    return out.join("");
  }
  function xor(data, key) {
    if (!key.length) return data;
    return data.map((b, i) => b ^ key[i % key.length]);
  }

  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <label class="tk-field" style="flex:1 1 200px"><span class="tk-label">Cipher</span>
          <select class="tk-select" id="ci-type">${Object.entries(CIPHERS).map(([k, c]) => `<option value="${k}">${esc(c.label)}</option>`).join("")}</select></label>
        <label class="tk-field" id="ci-key-f" style="flex:1 1 160px"><span class="tk-label">Key</span><input class="tk-input" id="ci-key" spellcheck="false"></label>
        <div style="align-self:flex-end">${TK.segHtml("ci-dir", [["enc", "Encode"], ["dec", "Decode"]], "enc")}</div>
      </div>
      <div class="tk-grid two" style="margin-top:14px">
        <label class="tk-field"><span class="tk-label">Input</span><textarea class="tk-textarea" id="ci-in" spellcheck="false">The signal is lost</textarea></label>
        <label class="tk-field"><span class="tk-label">Output</span><textarea class="tk-textarea" id="ci-out" readonly spellcheck="false"></textarea></label>
      </div>
      <div class="tk-row" style="margin-top:10px">${TK.copyBtn("#ci-out", "Copy output")}
        <button class="tk-copy" id="ci-swap" type="button">⇄ swap</button>
        <span id="ci-morse" hidden class="tk-row tight">
          <button class="btn small" id="ci-play" type="button">▶ play Morse</button>
          <label class="tk-note">WPM <input class="tk-input sm" id="ci-wpm" type="number" min="5" max="40" value="18" style="width:70px"></label>
          <label class="tk-note">Hz <input class="tk-input sm" id="ci-hz" type="number" min="200" max="1200" value="650" style="width:80px"></label>
        </span>
      </div>
      <div class="tk-msg" id="ci-msg" style="margin-top:10px"></div>
    </section>
    <section class="tk-panel" id="ci-brute">
      <h3 class="tk-h">// Caesar brute force of the ciphertext — ranked by English letter frequency</h3>
      <div class="tk-list" id="ci-brute-out"></div>
    </section>`;

  const $ = s => root.querySelector(s);
  let dir = "enc", audio = null, stopAt = 0;
  function sync() {
    const c = CIPHERS[$("#ci-type").value];
    $("#ci-key-f").hidden = !c.key;
    if (c.key) { $("#ci-key").type = c.key; if ($("#ci-key").dataset.for !== $("#ci-type").value) { $("#ci-key").value = c.def; $("#ci-key").dataset.for = $("#ci-type").value; } }
    $("#ci-morse").hidden = $("#ci-type").value !== "morse";
    run();
  }
  function run() {
    const c = CIPHERS[$("#ci-type").value];
    try { $("#ci-out").value = c[dir]($("#ci-in").value, $("#ci-key").value); TK.msg($("#ci-msg"), ""); }
    catch (e) { $("#ci-out").value = ""; TK.msg($("#ci-msg"), e.message, "err"); }
    brute();
  }
  function brute() {
    // Brute force whichever side is the ciphertext; only meaningful for shift ciphers.
    const type = $("#ci-type").value;
    $("#ci-brute").hidden = !["caesar", "rot13"].includes(type);
    if ($("#ci-brute").hidden) return;
    const src = (dir === "enc" ? $("#ci-out").value : $("#ci-in").value).slice(0, 400);
    const letters = src.toUpperCase().replace(/[^A-Z]/g, "");
    if (!letters) { $("#ci-brute-out").innerHTML = `<div><span class="tk-dim">type some letters above</span></div>`; return; }
    const scored = [];
    for (let k = 1; k < 26; k++) {
      const t = shift(src, -k);
      const L = t.toUpperCase().replace(/[^A-Z]/g, "");
      let s = 0;
      for (const ch of L) s += EN_FREQ[ch] || 0;
      scored.push({ k, t, s: s / L.length });
    }
    scored.sort((a, b) => b.s - a.s);
    $("#ci-brute-out").innerHTML = scored.slice(0, 25).map((x, i) =>
      `<div><span${i === 0 ? ' style="color:var(--orange)"' : ""}>${esc(x.t.slice(0, 160))}</span><span class="tk-dim">key ${x.k}</span></div>`).join("");
  }
  function stopAudio() { if (audio) { try { audio.close(); } catch (e) { /* closed */ } audio = null; } $("#ci-play").textContent = "▶ play Morse"; }
  $("#ci-play").addEventListener("click", () => {
    if (audio) { stopAudio(); return; }
    const code = dir === "enc" ? $("#ci-out").value : $("#ci-in").value;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !code.trim()) return;
    audio = new AC();
    const unit = 1.2 / Math.max(5, +$("#ci-wpm").value || 18);
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.frequency.value = +$("#ci-hz").value || 650;
    osc.connect(gain); gain.connect(audio.destination);
    gain.gain.value = 0;
    let t = audio.currentTime + 0.05;
    const beep = len => { gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.5, t + 0.005); gain.gain.setValueAtTime(0.5, t + len - 0.005); gain.gain.linearRampToValueAtTime(0, t + len); t += len + unit; };
    for (const ch of code.trim()) {
      if (ch === ".") beep(unit);
      else if (ch === "-") beep(unit * 3);
      else if (ch === " ") t += unit * 2;
      else if (ch === "/") t += unit * 2;
    }
    osc.start();
    osc.stop(t + 0.1);
    stopAt = t;
    $("#ci-play").textContent = "■ stop";
    osc.onended = stopAudio;
  });
  TK.seg($("#ci-dir"), v => { dir = v; run(); });
  $("#ci-type").addEventListener("change", sync);
  $("#ci-key").addEventListener("input", run);
  $("#ci-in").addEventListener("input", run);
  $("#ci-swap").addEventListener("click", () => {
    $("#ci-in").value = $("#ci-out").value;
    root.querySelector(`#ci-dir button[data-v="${dir === "enc" ? "dec" : "enc"}"]`).click();
  });
  sync();
  return () => stopAudio();
});
