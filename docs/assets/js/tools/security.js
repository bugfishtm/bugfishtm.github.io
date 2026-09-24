/* ============================================================
   BUGFISH TOOLS — security.js
   bcrypt, .htpasswd, hashes, passwords, secrets, AES, key pairs,
   TOTP and JWT. All primitives are either WebCrypto (SHA-*, HMAC,
   AES, PBKDF2, key generation) or self-coded below (bcrypt /
   Blowfish, MD5, CRC32, APR1-MD5). Nothing leaves the browser.
   ============================================================ */

/* ------------------------------------------------------------
   bcrypt (eksblowfish) — compatible with PHP password_hash(),
   OpenBSD bcrypt and crypt_blowfish ($2a$ / $2b$ / $2y$).
   The Blowfish P-array and S-boxes are the hex digits of pi; they
   are computed once with Machin's formula instead of shipping a
   4 KB constant table.
   ------------------------------------------------------------ */
const BCRYPT = (() => {
  const ALPHA = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let INIT = null;

  function piWords() {
    const words = 18 + 1024;
    const digits = words * 8;
    const guard = 64n;
    const one = 1n << (BigInt(digits * 4) + guard);
    const atanInv = x => {
      const X = BigInt(x), x2 = X * X;
      let term = one / X, sum = term, k = 1n, neg = true;
      while (term !== 0n) {
        term /= x2;
        const t = term / (2n * k + 1n);
        sum = neg ? sum - t : sum + t;
        neg = !neg;
        k++;
      }
      return sum;
    };
    const pi = 16n * atanInv(5) - 4n * atanInv(239);
    const hex = ((pi - 3n * one) >> guard).toString(16).padStart(digits, "0");
    const out = new Int32Array(words);
    for (let i = 0; i < words; i++) out[i] = parseInt(hex.substr(i * 8, 8), 16) | 0;
    return out;
  }

  function encipher(P, S, lr, off) {
    let l = lr[off], r = lr[off + 1];
    l ^= P[0];
    for (let i = 1; i <= 16; i += 2) {
      r ^= (((S[l >>> 24] + S[0x100 | ((l >>> 16) & 0xff)]) ^ S[0x200 | ((l >>> 8) & 0xff)]) + S[0x300 | (l & 0xff)]) ^ P[i];
      l ^= (((S[r >>> 24] + S[0x100 | ((r >>> 16) & 0xff)]) ^ S[0x200 | ((r >>> 8) & 0xff)]) + S[0x300 | (r & 0xff)]) ^ P[i + 1];
    }
    lr[off] = r ^ P[17];
    lr[off + 1] = l;
  }

  /* Blowfish_expandstate / expand0state in one. salt === null → expand0. */
  function expand(P, S, key, salt) {
    let kp = 0;
    for (let i = 0; i < 18; i++) {
      let w = 0;
      for (let j = 0; j < 4; j++) { w = (w << 8) | key[kp]; kp = (kp + 1) % key.length; }
      P[i] ^= w;
    }
    const lr = new Int32Array(2);
    let sp = 0;
    const sw = () => {
      let w = 0;
      for (let j = 0; j < 4; j++) { w = (w << 8) | salt[sp]; sp = (sp + 1) % salt.length; }
      return w;
    };
    for (let i = 0; i < 18; i += 2) {
      if (salt) { lr[0] ^= sw(); lr[1] ^= sw(); }
      encipher(P, S, lr, 0);
      P[i] = lr[0]; P[i + 1] = lr[1];
    }
    for (let i = 0; i < 1024; i += 2) {
      if (salt) { lr[0] ^= sw(); lr[1] ^= sw(); }
      encipher(P, S, lr, 0);
      S[i] = lr[0]; S[i + 1] = lr[1];
    }
  }

  function b64enc(d, len) {
    let off = 0, s = "";
    while (off < len) {
      let c1 = d[off++];
      s += ALPHA[c1 >> 2];
      c1 = (c1 & 0x03) << 4;
      if (off >= len) { s += ALPHA[c1]; break; }
      let c2 = d[off++];
      c1 |= c2 >> 4;
      s += ALPHA[c1];
      c1 = (c2 & 0x0f) << 2;
      if (off >= len) { s += ALPHA[c1]; break; }
      c2 = d[off++];
      c1 |= c2 >> 6;
      s += ALPHA[c1] + ALPHA[c2 & 0x3f];
    }
    return s;
  }

  function b64dec(s, len) {
    const out = [];
    const ix = c => ALPHA.indexOf(c);
    let off = 0;
    while (off < s.length - 1 && out.length < len) {
      const c1 = ix(s[off++]), c2 = ix(s[off++]);
      if (c1 < 0 || c2 < 0) break;
      out.push(((c1 << 2) | ((c2 & 0x30) >> 4)) & 0xff);
      if (out.length >= len || off >= s.length) break;
      const c3 = ix(s[off++]);
      if (c3 < 0) break;
      out.push((((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2)) & 0xff);
      if (out.length >= len || off >= s.length) break;
      const c4 = ix(s[off++]);
      if (c4 < 0) break;
      out.push((((c3 & 0x03) << 6) | c4) & 0xff);
    }
    return Uint8Array.from(out);
  }

  const tick = () => new Promise(r => setTimeout(r, 0));

  /* Hashes `password` with a 16-byte salt. Runs the 2^cost loop in
     slices so the page stays responsive; onProgress gets 0..1. */
  async function raw(password, cost, salt, onProgress) {
    if (!INIT) INIT = piWords();
    const P = INIT.slice(0, 18), S = INIT.slice(18);
    let key = TK.concat(TK.utf8(password), new Uint8Array([0]));
    if (key.length > 72) key = key.slice(0, 72);
    expand(P, S, key, salt);
    const rounds = 2 ** cost;
    let last = performance.now();
    for (let r = 0; r < rounds; r++) {
      expand(P, S, key, null);
      expand(P, S, salt, null);
      if ((r & 7) === 7 && performance.now() - last > 40) {
        if (onProgress) onProgress((r + 1) / rounds);
        await tick();
        last = performance.now();
      }
    }
    const magic = TK.utf8("OrpheanBeholderScryDoubt");
    const ct = new Int32Array(6);
    for (let i = 0; i < 6; i++) ct[i] = (magic[i * 4] << 24) | (magic[i * 4 + 1] << 16) | (magic[i * 4 + 2] << 8) | magic[i * 4 + 3];
    for (let i = 0; i < 64; i++) for (let j = 0; j < 6; j += 2) encipher(P, S, ct, j);
    const out = new Uint8Array(24);
    for (let i = 0; i < 6; i++) {
      out[i * 4] = (ct[i] >>> 24) & 0xff; out[i * 4 + 1] = (ct[i] >>> 16) & 0xff;
      out[i * 4 + 2] = (ct[i] >>> 8) & 0xff; out[i * 4 + 3] = ct[i] & 0xff;
    }
    if (onProgress) onProgress(1);
    return out;
  }

  async function hash(password, cost = 10, prefix = "2y", onProgress, saltBytes) {
    if (cost < 4 || cost > 31) throw new Error("cost must be between 4 and 31");
    const salt = saltBytes || TK.rand(16);
    const out = await raw(password, cost, salt, onProgress);
    return `$${prefix}$${String(cost).padStart(2, "0")}$${b64enc(salt, 16)}${b64enc(out, 23)}`;
  }

  const RE = /^\$2([abxy])\$(\d\d)\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})$/;
  function parse(h) {
    const m = RE.exec(String(h).trim());
    return m ? { variant: m[1], cost: +m[2], salt: m[3], sum: m[4] } : null;
  }

  async function verify(password, h, onProgress) {
    const p = parse(h);
    if (!p) throw new Error("not a bcrypt hash ($2a$ / $2b$ / $2y$, 60 characters)");
    if (p.variant === "x") throw new Error("$2x$ hashes use the legacy broken algorithm and are not supported");
    const out = await raw(password, p.cost, b64dec(p.salt, 16), onProgress);
    return b64enc(out, 23) === p.sum;
  }

  return { hash, verify, parse, raw, b64enc, b64dec };
})();

/* ------------------------------------------------------------
   MD5, CRC32, APR1-MD5 (md5crypt) — self-coded
   ------------------------------------------------------------ */
const MD5 = (() => {
  const K = new Int32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  const R = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  return function md5(bytes) {
    const len = bytes.length;
    const nblk = ((len + 8) >>> 6) + 1;
    const buf = new Uint8Array(nblk * 64);
    buf.set(bytes);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(nblk * 64 - 8, (len * 8) >>> 0, true);
    dv.setUint32(nblk * 64 - 4, Math.floor(len / 0x20000000), true);
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    const M = new Int32Array(16);
    for (let off = 0; off < buf.length; off += 64) {
      for (let i = 0; i < 16; i++) M[i] = dv.getInt32(off + i * 4, true);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
        else { F = C ^ (B | ~D); g = (7 * i) & 15; }
        const s = R[(i >> 4) * 4 + (i & 3)];
        F = (F + A + K[i] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + ((F << s) | (F >>> (32 - s)))) | 0;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    const out = new Uint8Array(16);
    const o = new DataView(out.buffer);
    o.setInt32(0, a0, true); o.setInt32(4, b0, true); o.setInt32(8, c0, true); o.setInt32(12, d0, true);
    return out;
  };
})();

const CRC32 = (() => {
  const T = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    T[n] = c;
  }
  return bytes => {
    let c = -1;
    for (let i = 0; i < bytes.length; i++) c = T[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

/* Apache APR1 / FreeBSD md5crypt. magic "$apr1$" or "$1$". */
function md5crypt(password, salt, magic = "$apr1$") {
  const itoa = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const pw = TK.utf8(password);
  const sl = TK.utf8(salt.slice(0, 8));
  const mg = TK.utf8(magic);
  const alt = MD5(TK.concat(pw, sl, pw));
  const parts = [pw, mg, sl];
  for (let pl = pw.length; pl > 0; pl -= 16) parts.push(alt.slice(0, Math.min(16, pl)));
  for (let i = pw.length; i; i >>= 1) parts.push(i & 1 ? new Uint8Array(1) : pw.slice(0, 1));
  let fin = MD5(TK.concat(...parts));
  for (let i = 0; i < 1000; i++) {
    const c = [];
    c.push(i & 1 ? pw : fin);
    if (i % 3) c.push(sl);
    if (i % 7) c.push(pw);
    c.push(i & 1 ? fin : pw);
    fin = MD5(TK.concat(...c));
  }
  const to64 = (v, n) => { let s = ""; while (n--) { s += itoa[v & 0x3f]; v >>= 6; } return s; };
  const f = fin;
  return magic + salt.slice(0, 8) + "$" +
    to64((f[0] << 16) | (f[6] << 8) | f[12], 4) + to64((f[1] << 16) | (f[7] << 8) | f[13], 4) +
    to64((f[2] << 16) | (f[8] << 8) | f[14], 4) + to64((f[3] << 16) | (f[9] << 8) | f[15], 4) +
    to64((f[4] << 16) | (f[10] << 8) | f[5], 4) + to64(f[11], 2);
}

async function shaDigest(alg, bytes) {
  return new Uint8Array(await crypto.subtle.digest(alg, bytes));
}

async function hmacSign(alg, keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes.length ? keyBytes : new Uint8Array(1),
    { name: "HMAC", hash: alg }, false, ["sign"]);
  // An empty HMAC key is legal; WebCrypto refuses zero-length raw keys, and a
  // single zero byte is equivalent (keys are zero-padded to the block size).
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
}

function randomSaltChars(n, alphabet = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
  let s = "";
  for (let i = 0; i < n; i++) s += TK.pick(alphabet);
  return s;
}

function fmtDuration(sec) {
  if (!isFinite(sec)) return "forever";
  if (sec < 1) return "instantly";
  const units = [["year", 31557600], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
  if (sec >= 31557600 * 1e6) return `${(sec / 31557600).toExponential(1).replace("e+", " × 10^")} years`;
  for (const [u, s] of units) {
    if (sec >= s) { const v = Math.floor(sec / s); return `${TK.num(v)} ${u}${v === 1 ? "" : "s"}`; }
  }
  return "instantly";
}

/* ============================================================
   bcrypt tool
   ============================================================ */
Toolbox.define("bcrypt", root => {
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <h3 class="tk-h">// generate</h3>
        <div class="tk-grid" style="grid-template-columns:1fr">
          <label class="tk-field"><span class="tk-label">Password <em id="bc-bytes"></em></span>
            <input class="tk-input" id="bc-pw" type="text" autocomplete="off" spellcheck="false" placeholder="enter a password"></label>
          <label class="tk-field"><span class="tk-label">Cost factor <em id="bc-cost-v">10</em></span>
            <input type="range" id="bc-cost" min="4" max="15" value="10"></label>
          <div class="tk-row">
            <label class="tk-field" style="flex:1 1 140px"><span class="tk-label">Prefix</span>
              <select class="tk-select" id="bc-prefix">
                <option value="2y" selected>$2y$ — PHP password_hash()</option>
                <option value="2b">$2b$ — OpenBSD / Node / Python</option>
                <option value="2a">$2a$ — legacy</option>
              </select></label>
            <button class="btn" id="bc-go" style="align-self:flex-end">Generate hash</button>
          </div>
          <div class="tk-meter" id="bc-meter" hidden><span></span></div>
          <div class="tk-out" id="bc-out" aria-live="polite"></div>
          <div class="tk-row">${TK.copyBtn("#bc-out", "Copy hash")}<span class="tk-note" id="bc-time"></span></div>
          <p class="tk-note" id="bc-warn"></p>
        </div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// verify</h3>
        <div class="tk-grid" style="grid-template-columns:1fr">
          <label class="tk-field"><span class="tk-label">Password</span>
            <input class="tk-input" id="bv-pw" type="text" autocomplete="off" spellcheck="false"></label>
          <label class="tk-field"><span class="tk-label">bcrypt hash</span>
            <input class="tk-input" id="bv-hash" type="text" autocomplete="off" spellcheck="false" placeholder="$2y$10$..."></label>
          <div class="tk-row"><button class="btn" id="bv-go">Verify</button></div>
          <div class="tk-msg" id="bv-msg" aria-live="polite"></div>
          <div id="bv-info"></div>
        </div>
      </section>
    </div>
    <section class="tk-panel">
      <h3 class="tk-h">// use it in code</h3>
      <div class="tk-out nowrap" id="bc-code"></div>
      <p class="tk-note" style="margin-top:10px">bcrypt only uses the first <b>72 bytes</b> of a password.
        Cost 10–12 is the usual sweet spot; every +1 doubles the work for you <em>and</em> for an attacker.
        <code>$2y$</code>, <code>$2b$</code> and <code>$2a$</code> hashes are interchangeable for normal passwords —
        <code>password_verify()</code> accepts all of them.</p>
    </section>`;

  const $ = s => root.querySelector(s);
  const pw = $("#bc-pw"), cost = $("#bc-cost"), prefix = $("#bc-prefix");
  let busy = false;

  function code() {
    const c = cost.value;
    $("#bc-code").textContent =
`// PHP
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => ${c}]);
if (password_verify($password, $hash)) { /* ok */ }
if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => ${c}])) { /* re-hash */ }

// Laravel
Hash::make($password, ['rounds' => ${c}]);

# Python (bcrypt)
bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=${c}))

// Node (bcryptjs)
await bcrypt.hash(password, ${c});`;
  }

  function meta() {
    const n = TK.utf8(pw.value).length;
    $("#bc-bytes").textContent = n ? `${n} bytes` : "";
    const w = [];
    if (n > 72) w.push(`⚠ ${n} bytes — everything after byte 72 is ignored by bcrypt.`);
    if (+cost.value >= 14) w.push("⚠ cost 14+ takes several seconds in the browser (and on your server).");
    $("#bc-warn").textContent = w.join(" ");
    $("#bc-cost-v").textContent = cost.value;
  }

  async function run(fn, meterEl) {
    if (busy) return;
    busy = true;
    const bar = meterEl.querySelector("span");
    meterEl.hidden = false;
    bar.style.width = "0";
    bar.style.background = "var(--orange)";
    try { return await fn(p => { bar.style.width = `${Math.round(p * 100)}%`; }); }
    finally { busy = false; setTimeout(() => { meterEl.hidden = true; }, 400); }
  }

  $("#bc-go").addEventListener("click", async () => {
    const t0 = performance.now();
    $("#bc-out").textContent = "hashing...";
    try {
      const h = await run(p => BCRYPT.hash(pw.value, +cost.value, prefix.value, p), $("#bc-meter"));
      if (h) {
        $("#bc-out").textContent = h;
        $("#bc-time").textContent = `${Math.round(performance.now() - t0)} ms in this browser`;
        $("#bv-hash").value = h;
        $("#bv-pw").value = pw.value;
      }
    } catch (e) { $("#bc-out").textContent = e.message; }
  });

  $("#bv-go").addEventListener("click", async () => {
    const msg = $("#bv-msg");
    const p = BCRYPT.parse($("#bv-hash").value);
    $("#bv-info").innerHTML = p ? TK.kv([["variant", `$2${p.variant}$`], ["cost", `${p.cost} (${TK.num(2 ** p.cost)} rounds)`],
      ["salt", p.salt], ["checksum", p.sum]]) : "";
    if (p && p.cost > 16) { TK.msg(msg, "cost above 16 would take minutes in a browser — not verified.", "warn"); return; }
    TK.msg(msg, "checking...");
    try {
      const ok = await run(pr => BCRYPT.verify($("#bv-pw").value, $("#bv-hash").value, pr), $("#bc-meter"));
      if (ok === undefined) return;
      TK.msg(msg, ok ? "✓ MATCH — the password fits this hash." : "✗ NO MATCH — wrong password or different hash.", ok ? "ok" : "err");
    } catch (e) { TK.msg(msg, e.message, "err"); }
  });

  pw.addEventListener("input", meta);
  cost.addEventListener("input", () => { meta(); code(); });
  pw.addEventListener("keydown", e => { if (e.key === "Enter") $("#bc-go").click(); });
  $("#bv-hash").addEventListener("keydown", e => { if (e.key === "Enter") $("#bv-go").click(); });
  meta();
  code();
});

/* ============================================================
   .htpasswd generator
   ============================================================ */
Toolbox.define("htpasswd", root => {
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <h3 class="tk-h">// create entry</h3>
        <div class="tk-grid" style="grid-template-columns:1fr">
          <label class="tk-field"><span class="tk-label">Username</span>
            <input class="tk-input" id="hp-user" value="admin" autocomplete="off" spellcheck="false"></label>
          <label class="tk-field"><span class="tk-label">Password</span>
            <div class="tk-row tight"><input class="tk-input tk-grow" id="hp-pw" autocomplete="off" spellcheck="false">
            <button class="btn ghost small" id="hp-rand" type="button">Random</button></div></label>
          <label class="tk-field"><span class="tk-label">Algorithm</span>
            <select class="tk-select" id="hp-alg">
              <option value="bcrypt" selected>bcrypt ($2y$, cost 10) — recommended</option>
              <option value="apr1">APR1-MD5 ($apr1$) — Apache default</option>
              <option value="sha">SHA-1 ({SHA}) — legacy, no salt</option>
            </select></label>
          <button class="btn" id="hp-go">Add to file</button>
          <div class="tk-msg" id="hp-msg"></div>
        </div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// .htpasswd</h3>
        <textarea class="tk-textarea" id="hp-file" spellcheck="false" placeholder="entries appear here — one user per line"></textarea>
        <div class="tk-row" style="margin-top:10px">${TK.copyBtn("#hp-file", "Copy file")}
          <button class="tk-copy" id="hp-dl" type="button">Download</button>
          <button class="tk-copy" id="hp-clear" type="button">Clear</button></div>
        <h3 class="tk-h">// verify a line</h3>
        <div class="tk-grid" style="grid-template-columns:1fr">
          <input class="tk-input" id="hv-line" placeholder="user:$apr1$..." spellcheck="false">
          <div class="tk-row tight"><input class="tk-input tk-grow" id="hv-pw" placeholder="password" spellcheck="false">
            <button class="btn ghost small" id="hv-go" type="button">Check</button></div>
          <div class="tk-msg" id="hv-msg"></div>
        </div>
      </section>
    </div>
    <section class="tk-panel">
      <h3 class="tk-h">// server config</h3>
      <div class="tk-grid two">
        <label class="tk-field"><span class="tk-label">Apache (.htaccess)</span>
          <textarea class="tk-textarea short" id="hp-apache" readonly></textarea></label>
        <label class="tk-field"><span class="tk-label">Nginx (server / location block)</span>
          <textarea class="tk-textarea short" id="hp-nginx" readonly></textarea></label>
      </div>
      <p class="tk-note" style="margin-top:10px">Store the file <b>outside</b> the web root and use an absolute path.
        Nginx understands bcrypt only when linked against a libc that supports it — APR1 works everywhere.</p>
    </section>`;

  const $ = s => root.querySelector(s);
  $("#hp-apache").value = `AuthType Basic\nAuthName "Restricted"\nAuthUserFile /absolute/path/to/.htpasswd\nRequire valid-user`;
  $("#hp-nginx").value = `location / {\n    auth_basic           "Restricted";\n    auth_basic_user_file /etc/nginx/.htpasswd;\n}`;

  $("#hp-rand").addEventListener("click", () => {
    const cs = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 18; i++) s += TK.pick(cs);
    $("#hp-pw").value = s;
  });

  async function entry(user, pass, alg) {
    if (alg === "bcrypt") return BCRYPT.hash(pass, 10, "2y");
    if (alg === "apr1") return md5crypt(pass, randomSaltChars(8));
    return "{SHA}" + TK.b64(await shaDigest("SHA-1", TK.utf8(pass)));
  }

  $("#hp-go").addEventListener("click", async () => {
    const user = $("#hp-user").value.trim(), pass = $("#hp-pw").value;
    const msg = $("#hp-msg");
    if (!user || /[:\s]/.test(user)) { TK.msg(msg, "username must not be empty or contain ':' / spaces", "err"); return; }
    if (!pass) { TK.msg(msg, "enter a password", "err"); return; }
    TK.msg(msg, "hashing...");
    const h = await entry(user, pass, $("#hp-alg").value);
    const lines = $("#hp-file").value.split("\n").filter(l => l.trim() && !l.startsWith(user + ":"));
    lines.push(`${user}:${h}`);
    $("#hp-file").value = lines.join("\n") + "\n";
    TK.msg(msg, `✓ ${user} added (existing entry for this user replaced)`, "ok");
  });
  $("#hp-dl").addEventListener("click", () => TK.download(".htpasswd", $("#hp-file").value, "text/plain"));
  $("#hp-clear").addEventListener("click", () => { $("#hp-file").value = ""; });

  $("#hv-go").addEventListener("click", async () => {
    const msg = $("#hv-msg");
    const line = $("#hv-line").value.trim(), pass = $("#hv-pw").value;
    const i = line.indexOf(":");
    const h = i >= 0 ? line.slice(i + 1) : line;
    let ok;
    try {
      if (/^\$2[aby]\$/.test(h)) ok = await BCRYPT.verify(pass, h);
      else if (h.startsWith("$apr1$") || h.startsWith("$1$")) {
        const magic = h.startsWith("$1$") ? "$1$" : "$apr1$";
        const salt = h.slice(magic.length).split("$")[0];
        ok = md5crypt(pass, salt, magic) === h;
      } else if (h.startsWith("{SHA}")) ok = "{SHA}" + TK.b64(await shaDigest("SHA-1", TK.utf8(pass))) === h;
      else { TK.msg(msg, "unknown format (supported: $2y$ / $2b$, $apr1$, $1$, {SHA})", "err"); return; }
      TK.msg(msg, ok ? "✓ password matches" : "✗ password does not match", ok ? "ok" : "err");
    } catch (e) { TK.msg(msg, e.message, "err"); }
  });
});

/* ============================================================
   Hash & checksum generator
   ============================================================ */
function identifyHash(h) {
  const s = String(h).trim();
  const out = [];
  const add = x => out.push(x);
  if (!s) return out;
  if (/^\$2[abxy]\$\d\d\$[./A-Za-z0-9]{53}$/.test(s)) add("bcrypt (PHP password_hash, Laravel, OpenBSD)");
  if (/^\$wp\$2y\$/.test(s)) add("WordPress 6.8+ bcrypt (pre-hashed with HMAC-SHA384)");
  if (/^\$argon2(id|i|d)\$/.test(s)) add("Argon2 (PHP PASSWORD_ARGON2ID / libsodium)");
  if (/^\$apr1\$/.test(s)) add("APR1-MD5 (Apache .htpasswd)");
  if (/^\$1\$/.test(s)) add("md5crypt (old Linux /etc/shadow)");
  if (/^\$5\$/.test(s)) add("sha256crypt (Linux /etc/shadow)");
  if (/^\$6\$/.test(s)) add("sha512crypt (Linux /etc/shadow)");
  if (/^\$y\$/.test(s)) add("yescrypt (modern Linux /etc/shadow)");
  if (/^\$[PH]\$[./0-9A-Za-z]{31}$/.test(s)) add("phpass portable hash (WordPress < 6.8, phpBB)");
  if (/^\$S\$/.test(s)) add("Drupal 7 SHA-512");
  if (/^pbkdf2_sha(1|256)\$/.test(s)) add("Django PBKDF2");
  if (/^\{SHA\}[A-Za-z0-9+/]{27}=$/.test(s)) add("SHA-1 Base64 (.htpasswd / LDAP {SHA})");
  if (/^\{SSHA\}/.test(s)) add("Salted SHA-1 (LDAP {SSHA})");
  if (/^\*[0-9A-F]{40}$/i.test(s)) add("MySQL 4.1+ PASSWORD() — double SHA-1");
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(s) && s.startsWith("eyJ")) add("JSON Web Token — use the JWT Debugger");
  if (/^[0-9a-f]+$/i.test(s)) {
    const n = s.length;
    const map = { 8: "CRC32 / Adler-32", 16: "MySQL 3.x OLD_PASSWORD / half MD5 / CRC64", 32: "MD5 · NTLM · MD4",
      40: "SHA-1 · RIPEMD-160", 56: "SHA-224 · SHA3-224", 64: "SHA-256 · SHA3-256 · BLAKE2s",
      96: "SHA-384 · SHA3-384", 128: "SHA-512 · SHA3-512 · BLAKE2b · Whirlpool" };
    if (map[n]) add(`${map[n]} (hex, ${n * 4} bit)`);
  }
  if (!out.length && /^[A-Za-z0-9+/]+=*$/.test(s) && s.length % 4 === 0) {
    const bits = Math.floor(s.replace(/=+$/, "").length * 6 / 8) * 8;
    add(`Base64 data, ${bits} bit${bits === 256 ? " (SHA-256?)" : bits === 160 ? " (SHA-1?)" : bits === 128 ? " (MD5?)" : ""}`);
  }
  return out;
}

Toolbox.define("hash", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row" style="justify-content:space-between">
        ${TK.segHtml("hs-mode", [["text", "Text"], ["file", "File"]], "text")}
        <label class="tk-check"><input type="checkbox" id="hs-upper"> uppercase</label>
      </div>
      <div id="hs-text-in" style="margin-top:14px">
        <textarea class="tk-textarea short" id="hs-text" spellcheck="false" placeholder="type or paste text — hashes update live (UTF-8)"></textarea>
      </div>
      <div id="hs-file-in" style="margin-top:14px" hidden>
        <div class="tk-drop" id="hs-drop"><b>drop a file</b> or click to choose — it is read locally, never uploaded</div>
      </div>
      <details style="margin-top:12px"><summary class="tk-label" style="cursor:pointer;display:list-item">HMAC key (optional)</summary>
        <div class="tk-row" style="margin-top:8px">
          <input class="tk-input tk-grow" id="hs-key" placeholder="secret key — switches SHA outputs to HMAC" spellcheck="false">
          <select class="tk-select" id="hs-keyenc" style="width:auto"><option value="utf8">UTF-8</option><option value="hex">hex</option><option value="b64">Base64</option></select>
        </div>
        <p class="tk-note" style="margin-top:6px">Tip: GitHub webhooks send <code>X-Hub-Signature-256: sha256=&lt;HMAC-SHA256 of the raw body&gt;</code>. Paste the body above, the secret here and compare.</p>
      </details>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h" id="hs-title">// digests</h3>
      <div id="hs-out"></div>
      <div class="tk-row" style="margin-top:14px">
        <input class="tk-input tk-grow" id="hs-cmp" placeholder="paste an expected checksum to compare (any of the above)" spellcheck="false">
      </div>
      <div class="tk-msg" id="hs-cmp-msg" style="margin-top:8px"></div>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h">// identify a hash</h3>
      <input class="tk-input" id="hs-id" placeholder="paste any hash — e.g. $2y$10$..., 5f4dcc3b5aa765d61d8327deb882cf99" spellcheck="false">
      <div class="tk-list" id="hs-id-out" style="margin-top:10px"></div>
    </section>`;

  const $ = s => root.querySelector(s);
  let mode = "text", fileBytes = null, fileName = "", results = [];
  TK.seg($("#hs-mode"), v => {
    mode = v;
    $("#hs-text-in").hidden = v !== "text";
    $("#hs-file-in").hidden = v !== "file";
    compute();
  });

  function keyBytes() {
    const k = $("#hs-key").value;
    if (!k) return null;
    const e = $("#hs-keyenc").value;
    return e === "hex" ? TK.unhex(k) : e === "b64" ? TK.unb64(k) : TK.utf8(k);
  }

  let seq = 0;
  async function compute() {
    const my = ++seq;
    const data = mode === "text" ? TK.utf8($("#hs-text").value) : fileBytes;
    const out = $("#hs-out");
    if (!data) { out.innerHTML = `<p class="tk-note">choose a file to hash.</p>`; results = []; return; }
    let key = null;
    try { key = keyBytes(); } catch (e) { out.innerHTML = `<div class="tk-msg err">HMAC key: ${esc(e.message)}</div>`; return; }
    const up = $("#hs-upper").checked;
    const f = b => (up ? TK.hex(b).toUpperCase() : TK.hex(b));
    const rows = [];
    if (key) {
      for (const a of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) rows.push([`HMAC-${a}`, f(await hmacSign(a, key, data))]);
      const b = await hmacSign("SHA-256", key, data);
      rows.push(["HMAC-SHA256 (Base64)", TK.b64(b)]);
    } else {
      rows.push(["MD5", f(MD5(data))]);
      for (const a of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) rows.push([a, f(await shaDigest(a, data))]);
      const c = CRC32(data).toString(16).padStart(8, "0");
      rows.push(["CRC32", up ? c.toUpperCase() : c]);
      rows.push(["SHA-256 (Base64)", TK.b64(await shaDigest("SHA-256", data))]);
    }
    if (my !== seq) return;
    results = rows;
    $("#hs-title").textContent = `// ${key ? "hmac" : "digests"} — ${mode === "file" ? `${fileName}, ` : ""}${TK.fmtBytes(data.length)}`;
    out.innerHTML = TK.kv(rows);
    compare();
  }

  function compare() {
    const v = $("#hs-cmp").value.trim().toLowerCase().replace(/^sha256=|^sha1=/, "");
    const m = $("#hs-cmp-msg");
    if (!v) { TK.msg(m, ""); return; }
    const hit = results.find(r => r[1].toLowerCase() === v);
    TK.msg(m, hit ? `✓ matches ${hit[0]}` : "✗ does not match any digest above", hit ? "ok" : "err");
  }

  TK.drop($("#hs-drop"), async files => {
    const file = files[0];
    fileName = file.name;
    $("#hs-drop").innerHTML = `reading <b>${esc(file.name)}</b>...`;
    fileBytes = await TK.readFile(file, "bytes");
    $("#hs-drop").innerHTML = `<b>${esc(file.name)}</b> · ${TK.fmtBytes(file.size)} — click or drop to replace`;
    compute();
  });

  const deb = TK.debounce(compute, 120);
  $("#hs-text").addEventListener("input", deb);
  $("#hs-key").addEventListener("input", deb);
  $("#hs-keyenc").addEventListener("change", compute);
  $("#hs-upper").addEventListener("change", compute);
  $("#hs-cmp").addEventListener("input", compare);
  $("#hs-id").addEventListener("input", () => {
    const r = identifyHash($("#hs-id").value);
    $("#hs-id-out").innerHTML = $("#hs-id").value.trim()
      ? (r.length ? r.map(x => `<div><span>${esc(x)}</span></div>`).join("") : `<div><span class="tk-dim">unknown format</span></div>`)
      : "";
  });
  compute();
});

/* ============================================================
   Password generator + strength analyzer
   ============================================================ */
const PW_COMMON = ("123456 password 123456789 12345678 12345 qwerty 1234567 111111 1234567890 123123 abc123 1234 password1 iloveyou 1q2w3e4r 000000 qwerty123 zaq12wsx dragon sunshine princess letmein 654321 monkey 27653 1qaz2wsx 123321 qwertyuiop superman asdfghjkl trustno1 hallo passwort master welcome shadow ashley football jesus michael ninja mustang password123 baseball whatever freedom starwars hello charlie donald admin login secret root toor changeme default test guest pass 666666 121212 flower hottie loveme zxcvbnm 7777777 batman access master123 killer pepper jordan hunter buster soccer harley ranger daniel thomas tigger robert computer summer winter spring autumn hannah joshua cheese matrix anthony nicole jennifer andrew michelle love secret123 schatz ficken fussball schalke").split(" ");
const PW_WORDS = ("love pass word admin user test hello secret dragon monkey master shadow summer winter sunshine princess football baseball soccer hockey batman superman star wars money king queen angel devil hunter tiger lion bear eagle computer internet google apple samsung windows linux house home family mother father baby girl boy blue red green black white orange purple yellow").split(" ");
const KEY_ROWS = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./", "qwertzuiopü+", "asdfghjklöä#", "yxcvbnm,.-"];

function analyzePassword(pw) {
  const n = pw.length;
  const res = { length: n, pool: 0, naive: 0, bits: 0, findings: [] };
  if (!n) return res;
  const has = { lower: /[a-z]/.test(pw), upper: /[A-Z]/.test(pw), digit: /\d/.test(pw), symbol: /[^A-Za-z0-9\s]/.test(pw), space: /\s/.test(pw), uni: /[^\x00-\x7f]/.test(pw) };
  res.pool = (has.lower ? 26 : 0) + (has.upper ? 26 : 0) + (has.digit ? 10 : 0) + (has.symbol ? 33 : 0) + (has.space ? 1 : 0) + (has.uni ? 100 : 0);
  res.naive = n * Math.log2(Math.max(res.pool, 2));
  res.has = has;

  const low = pw.toLowerCase();
  const unleet = low.replace(/[4@]/g, "a").replace(/3/g, "e").replace(/[1!|]/g, "i").replace(/0/g, "o").replace(/[5$]/g, "s").replace(/7/g, "t");
  if (PW_COMMON.includes(low) || PW_COMMON.includes(unleet)) {
    res.bits = Math.log2(PW_COMMON.indexOf(PW_COMMON.includes(low) ? low : unleet) + 2) + 1;
    res.findings.push("this is one of the most common passwords — it is in every attack list");
    return res;
  }

  // Mark low-entropy segments; everything left costs log2(pool) per char.
  const cost = new Array(n).fill(null);
  const mark = (s, e, bits, why) => {
    for (let i = s; i < e; i++) if (cost[i] !== null) return;
    for (let i = s; i < e; i++) cost[i] = 0;
    cost[s] = bits;
    res.findings.push(why);
  };
  // dictionary words (incl. leet) — longest first
  const dict = PW_COMMON.concat(PW_WORDS).filter(w => w.length >= 4 && /^[a-z]+$/.test(w)).sort((a, b) => b.length - a.length);
  for (const w of dict) {
    let i = unleet.indexOf(w);
    while (i >= 0) { mark(i, i + w.length, Math.log2(dict.length) + 1, `contains the common word "${pw.substr(i, w.length)}"`); i = unleet.indexOf(w, i + 1); }
  }
  // repeats: aaa / 1212
  let m;
  const rep = /(.+?)\1{2,}|(.{2,})\2+/g;
  while ((m = rep.exec(pw))) mark(m.index, m.index + m[0].length, Math.log2(res.pool * (m[1] || m[2]).length + 1) + Math.log2(m[0].length), `repeated pattern "${m[0]}"`);
  // sequences abc / 321 / keyboard rows
  const seqAt = i => {
    let j = i + 1;
    const d = pw.charCodeAt(i + 1) - pw.charCodeAt(i);
    if (Math.abs(d) !== 1) return i;
    while (j + 1 < n && pw.charCodeAt(j + 1) - pw.charCodeAt(j) === d) j++;
    return j;
  };
  for (let i = 0; i < n - 2; i++) {
    const j = seqAt(i);
    if (j - i >= 2) { mark(i, j + 1, Math.log2(26 * 2) + Math.log2(j - i + 1), `sequence "${pw.slice(i, j + 1)}"`); i = j; }
  }
  const walks = [];
  for (const row of KEY_ROWS) {
    for (let len = Math.min(row.length, n); len >= 4; len--) {
      for (let s = 0; s + len <= row.length; s++) {
        const i = low.indexOf(row.substr(s, len));
        if (i >= 0) walks.push([i, len]);
      }
    }
  }
  walks.sort((a, b) => b[1] - a[1]).forEach(([i, len]) =>
    mark(i, i + len, Math.log2(KEY_ROWS.length * 40) + Math.log2(len), `keyboard walk "${pw.substr(i, len)}"`));
  // years and dates
  const yr = /(19[0-9]{2}|20[0-4][0-9])/g;
  while ((m = yr.exec(pw))) mark(m.index, m.index + 4, Math.log2(150), `looks like a year (${m[0]})`);
  const dt = /\b\d{1,2}[./-]?\d{1,2}[./-]?\d{2,4}\b/g;
  while ((m = dt.exec(pw))) if (m[0].length >= 6) mark(m.index, m.index + m[0].length, Math.log2(365 * 100), `looks like a date (${m[0]})`);

  const per = Math.log2(Math.max(res.pool, 2));
  let bits = 0;
  for (let i = 0; i < n; i++) bits += cost[i] === null ? per : cost[i];
  // Capitalised first letter / digits appended at the end are the first things crackers try.
  if (/^[A-Z][^A-Z]*$/.test(pw)) { bits -= 1; res.findings.push("only the first letter is uppercase — a classic pattern"); }
  if (/^[a-z]+[0-9]{1,4}[!.?]?$/i.test(pw) && n > 5) res.findings.push("word followed by digits — the most predictable pattern there is");
  // "correct horse battery staple": count words, not letters. Assume each
  // word comes from a ~20k word dictionary (≈14.3 bits).
  const words = pw.split(/[\s\-_.]+/).filter(Boolean);
  if (words.length >= 2 && words.every(w => /^[a-z]{2,10}$/i.test(w))) {
    const est = words.length * Math.log2(20000) + (words.length - 1) * 0.5;
    if (est < bits) { bits = est; res.findings.push(`looks like a ${words.length}-word passphrase — rated as dictionary words (~14 bits each)`); }
  }
  res.bits = Math.max(0, Math.min(bits, res.naive));
  if (n < 12) res.findings.push(`only ${n} characters — use 14 or more`);
  if (Object.values(has).filter(Boolean).length === 1) res.findings.push("uses a single character class");
  return res;
}

Toolbox.define("password", root => {
  root.innerHTML = `
    <section class="tk-panel">
      ${TK.segHtml("pw-mode", [["password", "Password"], ["passphrase", "Passphrase"]], "password")}
      <div id="pw-opts" style="margin-top:16px">
        <label class="tk-field"><span class="tk-label">Length <em id="pw-len-v">20</em></span>
          <input type="range" id="pw-len" min="6" max="128" value="20"></label>
        <div class="tk-row" style="margin-top:12px">
          <label class="tk-check"><input type="checkbox" id="pw-lower" checked> a–z</label>
          <label class="tk-check"><input type="checkbox" id="pw-upper" checked> A–Z</label>
          <label class="tk-check"><input type="checkbox" id="pw-digit" checked> 0–9</label>
          <label class="tk-check"><input type="checkbox" id="pw-symbol" checked> !@#$</label>
          <label class="tk-check"><input type="checkbox" id="pw-amb"> no look-alikes (Il1O0)</label>
        </div>
        <div class="tk-row" style="margin-top:12px">
          <label class="tk-field tk-grow"><span class="tk-label">Symbols to use</span>
            <input class="tk-input" id="pw-symset" value="!@#$%^&*()-_=+[]{};:,.<>?/~" spellcheck="false"></label>
        </div>
      </div>
      <div id="pp-opts" style="margin-top:16px" hidden>
        <div class="tk-grid narrow">
          <label class="tk-field"><span class="tk-label">Words <em id="pp-n-v">5</em></span><input type="range" id="pp-n" min="3" max="10" value="5"></label>
          <label class="tk-field"><span class="tk-label">Separator</span>
            <select class="tk-select" id="pp-sep"><option value="-">dash -</option><option value=".">dot .</option><option value="_">underscore _</option><option value=" ">space</option><option value="">none</option></select></label>
          <label class="tk-check" style="align-self:end"><input type="checkbox" id="pp-cap" checked> Capitalize</label>
          <label class="tk-check" style="align-self:end"><input type="checkbox" id="pp-num" checked> add a number</label>
        </div>
        <p class="tk-note" style="margin-top:8px">Words are random pronounceable syllable chains (no dictionary download needed), e.g. <code>Tokami-Veruso</code>. Entropy is exact.</p>
      </div>
      <div class="tk-row" style="margin-top:16px">
        <label class="tk-field" style="width:110px"><span class="tk-label">Count</span><input class="tk-input" id="pw-count" type="number" min="1" max="50" value="5"></label>
        <button class="btn" id="pw-go" style="align-self:flex-end">Generate</button>
        <span class="tk-note" id="pw-bits" style="align-self:flex-end"></span>
      </div>
      <div class="tk-list" id="pw-list" style="margin-top:14px"></div>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h">// strength check — analysed only on this page</h3>
      <input class="tk-input" id="st-pw" type="text" autocomplete="off" spellcheck="false" placeholder="type a password to analyse">
      <div class="tk-meter" style="margin-top:12px"><span id="st-bar"></span></div>
      <div id="st-out" style="margin-top:14px"></div>
    </section>`;

  const $ = s => root.querySelector(s);
  let mode = "password";
  TK.seg($("#pw-mode"), v => { mode = v; $("#pw-opts").hidden = v !== "password"; $("#pp-opts").hidden = v !== "passphrase"; gen(); });

  const CONS = "bdfghjklmnprstvz", VOW = "aeiou";
  function sets() {
    const amb = $("#pw-amb").checked;
    const strip = s => (amb ? s.replace(/[Il1O0o|]/g, "") : s);
    const out = [];
    if ($("#pw-lower").checked) out.push(strip("abcdefghijklmnopqrstuvwxyz"));
    if ($("#pw-upper").checked) out.push(strip("ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
    if ($("#pw-digit").checked) out.push(strip("0123456789"));
    if ($("#pw-symbol").checked) out.push(strip([...new Set($("#pw-symset").value.replace(/\s/g, ""))].join("")));
    return out.filter(Boolean);
  }
  function password(len) {
    const ss = sets();
    if (!ss.length) return { v: "", bits: 0 };
    const all = ss.join("");
    let v;
    // Rejection sampling keeps the distribution uniform while guaranteeing every chosen class.
    do {
      v = "";
      for (let i = 0; i < len; i++) v += TK.pick(all);
    } while (len >= ss.length && !ss.every(s => [...v].some(c => s.includes(c))));
    return { v, bits: len * Math.log2(all.length) };
  }
  function passphrase(nw) {
    const sep = $("#pp-sep").value, cap = $("#pp-cap").checked, num = $("#pp-num").checked;
    const words = [];
    let bits = 0;
    for (let i = 0; i < nw; i++) {
      let w = "";
      for (let s = 0; s < 3; s++) w += TK.pick(CONS) + TK.pick(VOW);
      bits += 3 * Math.log2(CONS.length * VOW.length);
      words.push(cap ? w[0].toUpperCase() + w.slice(1) : w);
    }
    if (num) {
      const i = TK.randInt(nw);
      words[i] += String(TK.randInt(100));
      bits += Math.log2(nw * 100);
    }
    return { v: words.join(sep), bits };
  }
  function gen() {
    const count = Math.min(50, Math.max(1, +$("#pw-count").value || 1));
    const items = [];
    for (let i = 0; i < count; i++) items.push(mode === "password" ? password(+$("#pw-len").value) : passphrase(+$("#pp-n").value));
    const bits = items[0] ? items[0].bits : 0;
    $("#pw-bits").innerHTML = bits ? `≈ <b style="color:var(--orange)">${Math.floor(bits)} bits</b> of entropy each` : "select at least one character set";
    $("#pw-list").innerHTML = items.filter(x => x.v).map(x =>
      `<div><span>${esc(x.v)}</span><button class="tk-copy" type="button" data-copy-text="${esc(x.v)}">Copy</button></div>`).join("");
  }
  ["#pw-len", "#pp-n"].forEach(id => $(id).addEventListener("input", () => {
    $("#pw-len-v").textContent = $("#pw-len").value;
    $("#pp-n-v").textContent = $("#pp-n").value;
    gen();
  }));
  root.querySelectorAll("#pw-opts input[type=checkbox], #pp-opts input, #pp-opts select, #pw-symset").forEach(el => el.addEventListener("change", gen));
  $("#pw-go").addEventListener("click", gen);
  gen();

  $("#st-pw").addEventListener("input", () => {
    const pw = $("#st-pw").value;
    const r = analyzePassword(pw);
    const bar = $("#st-bar");
    const pct = Math.min(100, r.bits / 1.1);
    const [label, color] = r.bits < 28 ? ["very weak", "var(--red)"] : r.bits < 40 ? ["weak", "var(--blood)"]
      : r.bits < 60 ? ["fair", "var(--orange-soft)"] : r.bits < 80 ? ["strong", "var(--green)"] : ["very strong", "var(--cyan)"];
    bar.style.width = pw ? `${Math.max(4, pct)}%` : "0";
    bar.style.background = color;
    if (!pw) { $("#st-out").innerHTML = ""; return; }
    const guesses = Math.pow(2, Math.max(0, r.bits - 1));
    const scen = [["online, throttled (100 / hour)", 100 / 3600], ["online, unthrottled (10 / s)", 10],
      ["offline bcrypt cost 10 (10k / s)", 1e4], ["offline fast hash, GPU rig (100 billion / s)", 1e11]];
    $("#st-out").innerHTML =
      `<p style="margin-bottom:10px">Rating: <b style="color:${color}">${label}</b> — about <b>${Math.round(r.bits)} bits</b>
        <span class="tk-note">(naive ${Math.round(r.naive)} bits · ${r.length} chars · pool ${r.pool})</span></p>` +
      TK.kv(scen.map(([k, rate]) => [k, fmtDuration(guesses / rate), false]), false) +
      (r.findings.length ? `<div class="tk-list" style="margin-top:12px">${[...new Set(r.findings)].map(f => `<div><span class="tk-warn">⚠ ${esc(f)}</span></div>`).join("")}</div>`
        : `<p class="tk-note tk-ok" style="margin-top:12px">✓ no common patterns found</p>`);
  });
});

/* ============================================================
   Secret key & salt generator
   ============================================================ */
Toolbox.define("secrets", root => {
  const WP_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_ []{}<>~`+=,.;:/?|";
  const DJ_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)";
  const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const randStr = (n, cs) => { let s = ""; for (let i = 0; i < n; i++) s += TK.pick(cs); return s; };

  const presets = {
    wordpress: { label: "WordPress wp-config.php salts", make() {
      const keys = ["AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY", "AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT"];
      return keys.map(k => `define( '${k}',${" ".repeat(17 - k.length)}'${randStr(64, WP_CHARS)}' );`).join("\n");
    } },
    laravel: { label: "Laravel APP_KEY (.env)", make: () => `APP_KEY=base64:${TK.b64(TK.rand(32))}` },
    symfony: { label: "Symfony APP_SECRET (.env)", make: () => `APP_SECRET=${TK.hex(TK.rand(16))}` },
    django: { label: "Django SECRET_KEY (settings.py)", make: () => `SECRET_KEY = '${randStr(50, DJ_CHARS)}'` },
    jwt: { label: "JWT HS256 secret (256 bit)", make: () => TK.b64(TK.rand(32), true) },
    nextauth: { label: "NEXTAUTH_SECRET / AUTH_SECRET", make: () => `AUTH_SECRET=${TK.b64(TK.rand(32))}` },
    custom: { label: "Custom token", make: null },
  };

  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-grid">
        <label class="tk-field"><span class="tk-label">Preset</span>
          <select class="tk-select" id="sc-preset">${Object.entries(presets).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join("")}</select></label>
      </div>
      <div class="tk-grid narrow" id="sc-custom" style="margin-top:14px" hidden>
        <label class="tk-field"><span class="tk-label">Format</span>
          <select class="tk-select" id="sc-fmt"><option value="hex">hex</option><option value="b64">Base64</option><option value="b64url">Base64URL</option><option value="b62">Base62 (A-Z a-z 0-9)</option><option value="uuid">UUID v4</option></select></label>
        <label class="tk-field"><span class="tk-label">Size (bytes / chars)</span><input class="tk-input" id="sc-size" type="number" min="4" max="512" value="32"></label>
        <label class="tk-field"><span class="tk-label">Prefix</span><input class="tk-input" id="sc-prefix" placeholder="e.g. sk_live_" spellcheck="false"></label>
        <label class="tk-field"><span class="tk-label">Count</span><input class="tk-input" id="sc-count" type="number" min="1" max="100" value="1"></label>
      </div>
      <div class="tk-row" style="margin-top:14px"><button class="btn" id="sc-go">Regenerate</button> ${TK.copyBtn("#sc-out")} <span class="tk-note" id="sc-bits"></span></div>
      <pre class="tk-out" id="sc-out" style="margin-top:12px"></pre>
      <p class="tk-note" style="margin-top:10px">All values come from <code>crypto.getRandomValues()</code>. Rotating WordPress salts logs every user out — that is the point when you suspect a leak.</p>
    </section>`;

  const $ = s => root.querySelector(s);
  function gen() {
    const p = $("#sc-preset").value;
    $("#sc-custom").hidden = p !== "custom";
    let out, bits = "";
    if (p !== "custom") {
      out = presets[p].make();
      bits = { wordpress: "8 × 64 chars ≈ 8 × 420 bits", laravel: "256 bit", symfony: "128 bit", django: "≈ 283 bit", jwt: "256 bit", nextauth: "256 bit" }[p];
    } else {
      const f = $("#sc-fmt").value, n = Math.min(512, Math.max(4, +$("#sc-size").value || 32));
      const count = Math.min(100, Math.max(1, +$("#sc-count").value || 1));
      const pre = $("#sc-prefix").value;
      const one = () => pre + (f === "hex" ? TK.hex(TK.rand(n)) : f === "b64" ? TK.b64(TK.rand(n)) : f === "b64url" ? TK.b64(TK.rand(n), true)
        : f === "b62" ? randStr(n, B62) : crypto.randomUUID());
      out = Array.from({ length: count }, one).join("\n");
      bits = f === "uuid" ? "122 bit" : f === "b62" ? `${Math.floor(n * Math.log2(62))} bit` : `${n * 8} bit`;
    }
    $("#sc-out").textContent = out;
    $("#sc-bits").textContent = bits ? `entropy: ${bits}` : "";
  }
  root.querySelectorAll("select, input").forEach(el => el.addEventListener("input", gen));
  $("#sc-go").addEventListener("click", gen);
  gen();
});

/* ============================================================
   AES text encryption
   ============================================================ */
Toolbox.define("aes", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row" style="justify-content:space-between">
        ${TK.segHtml("ae-fmt", [["gcm", "AES-256-GCM"], ["openssl", "OpenSSL CBC"]], "gcm")}
        <label class="tk-field" id="ae-iter-f" style="width:170px" hidden><span class="tk-label">PBKDF2 iterations</span>
          <input class="tk-input" id="ae-iter" type="number" min="1000" step="1000" value="100000"></label>
      </div>
      <p class="tk-note" id="ae-desc" style="margin-top:10px"></p>
      <div class="tk-grid two" style="margin-top:14px">
        <label class="tk-field"><span class="tk-label">Plain text</span>
          <textarea class="tk-textarea" id="ae-plain" spellcheck="false" placeholder="secret message"></textarea></label>
        <label class="tk-field"><span class="tk-label">Encrypted (Base64)</span>
          <textarea class="tk-textarea" id="ae-cipher" spellcheck="false" placeholder="paste ciphertext to decrypt"></textarea></label>
      </div>
      <div class="tk-row" style="margin-top:14px">
        <input class="tk-input tk-grow" id="ae-pass" type="password" placeholder="passphrase" autocomplete="new-password">
        <label class="tk-check"><input type="checkbox" id="ae-show"> show</label>
        <button class="btn" id="ae-enc">Encrypt →</button>
        <button class="btn outline" id="ae-dec">← Decrypt</button>
      </div>
      <div class="tk-msg" id="ae-msg" style="margin-top:12px"></div>
      <div class="tk-row" style="margin-top:10px">${TK.copyBtn("#ae-cipher", "Copy ciphertext")} ${TK.copyBtn("#ae-plain", "Copy plain text")}</div>
      <pre class="tk-out" id="ae-cli" style="margin-top:12px" hidden></pre>
    </section>`;

  const $ = s => root.querySelector(s);
  let fmt = "gcm";
  const GCM_ITER = 600000;
  function desc() {
    $("#ae-iter-f").hidden = fmt !== "openssl";
    $("#ae-cli").hidden = fmt !== "openssl";
    $("#ae-desc").innerHTML = fmt === "gcm"
      ? `Authenticated encryption. Key = PBKDF2-SHA256(passphrase, random 16 B salt, ${TK.num(GCM_ITER)} iterations).
         Output layout: <code>0x01 | salt(16) | iv(12) | ciphertext + tag(16)</code>, Base64. Wrong passphrases are detected.`
      : `Same format as <code>openssl enc -aes-256-cbc -pbkdf2 -salt -a</code>: <code>Salted__ | salt(8) | ciphertext</code>,
         key + IV from PBKDF2-SHA256. Decrypt on any machine with the command below.`;
    $("#ae-cli").textContent = `# save the Base64 text as secret.txt, then:\nopenssl enc -d -aes-256-cbc -pbkdf2 -iter ${+$("#ae-iter").value || 10000} -a -in secret.txt\n\n# encrypt the same way:\nopenssl enc -aes-256-cbc -pbkdf2 -iter ${+$("#ae-iter").value || 10000} -salt -a -in plain.txt`;
  }
  TK.seg($("#ae-fmt"), v => { fmt = v; desc(); });
  $("#ae-iter").addEventListener("input", desc);
  $("#ae-show").addEventListener("change", () => { $("#ae-pass").type = $("#ae-show").checked ? "text" : "password"; });

  async function pbkdf2(pass, salt, iter, bits) {
    const base = await crypto.subtle.importKey("raw", TK.utf8(pass), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, bits));
  }
  const wrap64 = s => s.replace(/(.{64})/g, "$1\n").trim();

  async function encrypt() {
    const pass = $("#ae-pass").value, msg = $("#ae-msg");
    if (!pass) { TK.msg(msg, "enter a passphrase", "err"); return; }
    TK.msg(msg, "deriving key...");
    const data = TK.utf8($("#ae-plain").value);
    if (fmt === "gcm") {
      const salt = TK.rand(16), iv = TK.rand(12);
      const key = await crypto.subtle.importKey("raw", await pbkdf2(pass, salt, GCM_ITER, 256), "AES-GCM", false, ["encrypt"]);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
      $("#ae-cipher").value = TK.b64(TK.concat(new Uint8Array([1]), salt, iv, ct));
    } else {
      const iter = Math.max(1000, +$("#ae-iter").value || 10000);
      const salt = TK.rand(8);
      const kiv = await pbkdf2(pass, salt, iter, 384);
      const key = await crypto.subtle.importKey("raw", kiv.slice(0, 32), "AES-CBC", false, ["encrypt"]);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv: kiv.slice(32, 48) }, key, data));
      $("#ae-cipher").value = wrap64(TK.b64(TK.concat(TK.utf8("Salted__"), salt, ct)));
    }
    TK.msg(msg, "✓ encrypted", "ok");
  }

  async function decrypt() {
    const pass = $("#ae-pass").value, msg = $("#ae-msg");
    if (!pass) { TK.msg(msg, "enter the passphrase", "err"); return; }
    let raw;
    try { raw = TK.unb64($("#ae-cipher").value); } catch (e) { TK.msg(msg, "ciphertext is not valid Base64", "err"); return; }
    TK.msg(msg, "deriving key...");
    try {
      let pt;
      const isOpenssl = TK.unutf8(raw.slice(0, 8)) === "Salted__";
      if (isOpenssl) {
        const iter = Math.max(1, +$("#ae-iter").value || 10000);
        const kiv = await pbkdf2(pass, raw.slice(8, 16), iter, 384);
        const key = await crypto.subtle.importKey("raw", kiv.slice(0, 32), "AES-CBC", false, ["decrypt"]);
        pt = await crypto.subtle.decrypt({ name: "AES-CBC", iv: kiv.slice(32, 48) }, key, raw.slice(16));
      } else {
        if (raw[0] !== 1 || raw.length < 45) throw new Error("format");
        const key = await crypto.subtle.importKey("raw", await pbkdf2(pass, raw.slice(1, 17), GCM_ITER, 256), "AES-GCM", false, ["decrypt"]);
        pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(17, 29) }, key, raw.slice(29));
      }
      $("#ae-plain").value = TK.unutf8(new Uint8Array(pt));
      TK.msg(msg, `✓ decrypted (${isOpenssl ? "OpenSSL format" : "AES-256-GCM"})`, "ok");
    } catch (e) {
      TK.msg(msg, e.message === "format" ? "unknown format — not produced by this tool or OpenSSL"
        : "✗ decryption failed — wrong passphrase" + (fmt === "openssl" ? " or iteration count" : "") + " or damaged data", "err");
    }
  }
  $("#ae-enc").addEventListener("click", encrypt);
  $("#ae-dec").addEventListener("click", decrypt);
  desc();
});

/* ============================================================
   Key pair generator
   ============================================================ */
Toolbox.define("keypair", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <label class="tk-field" style="flex:1 1 220px"><span class="tk-label">Key type</span>
          <select class="tk-select" id="kp-type">
            <option value="rsa-2048">RSA 2048</option>
            <option value="rsa-3072">RSA 3072</option>
            <option value="rsa-4096" selected>RSA 4096</option>
            <option value="ec-P-256">ECDSA P-256</option>
            <option value="ec-P-384">ECDSA P-384</option>
            <option value="ec-P-521">ECDSA P-521</option>
            <option value="ed25519">Ed25519</option>
          </select></label>
        <label class="tk-field" style="flex:1 1 220px"><span class="tk-label">Comment (OpenSSH)</span>
          <input class="tk-input" id="kp-comment" value="user@host" spellcheck="false"></label>
        <button class="btn" id="kp-go" style="align-self:flex-end">Generate</button>
      </div>
      <div class="tk-msg" id="kp-msg" style="margin-top:12px"></div>
    </section>
    <div class="tk-grid two" id="kp-out" hidden>
      <section class="tk-panel">
        <h3 class="tk-h">// private key (PKCS#8 PEM)</h3>
        <textarea class="tk-textarea tall" id="kp-priv" readonly spellcheck="false"></textarea>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#kp-priv")}<button class="tk-copy" type="button" data-dl="kp-priv">Download</button></div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// public key (SPKI PEM)</h3>
        <textarea class="tk-textarea" id="kp-pub" readonly spellcheck="false"></textarea>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#kp-pub")}<button class="tk-copy" type="button" data-dl="kp-pub">Download</button></div>
        <h3 class="tk-h">// OpenSSH public key</h3>
        <textarea class="tk-textarea short" id="kp-ssh" readonly spellcheck="false"></textarea>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#kp-ssh")}<span class="tk-note" id="kp-fp"></span></div>
      </section>
      <section class="tk-panel" style="grid-column:1/-1">
        <h3 class="tk-h">// JWK</h3>
        <div class="tk-grid two">
          <textarea class="tk-textarea" id="kp-jwk-pub" readonly spellcheck="false"></textarea>
          <textarea class="tk-textarea" id="kp-jwk-priv" readonly spellcheck="false"></textarea>
        </div>
      </section>
    </div>`;

  const $ = s => root.querySelector(s);
  const pem = (label, bytes) => `-----BEGIN ${label}-----\n${TK.b64(bytes).replace(/(.{64})/g, "$1\n").trim()}\n-----END ${label}-----\n`;
  const sshStr = b => { const l = new Uint8Array(4); new DataView(l.buffer).setUint32(0, b.length); return TK.concat(l, b); };
  const mpint = b => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; b = b.slice(i); return sshStr(b[0] & 0x80 ? TK.concat(new Uint8Array([0]), b) : b); };

  $("#kp-go").addEventListener("click", async () => {
    const t = $("#kp-type").value, msg = $("#kp-msg");
    TK.msg(msg, t.startsWith("rsa") ? "generating (RSA 4096 can take a few seconds)..." : "generating...");
    $("#kp-go").disabled = true;
    try {
      let alg, usages = ["sign", "verify"];
      if (t.startsWith("rsa")) alg = { name: "RSASSA-PKCS1-v1_5", modulusLength: +t.split("-")[1], publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
      else if (t.startsWith("ec")) alg = { name: "ECDSA", namedCurve: t.slice(3) };
      else alg = { name: "Ed25519" };
      const kp = await crypto.subtle.generateKey(alg, true, usages);
      const priv = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
      const spki = new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey));
      const jwkPub = await crypto.subtle.exportKey("jwk", kp.publicKey);
      const jwkPriv = await crypto.subtle.exportKey("jwk", kp.privateKey);
      let blob, name;
      if (t.startsWith("rsa")) {
        name = "ssh-rsa";
        blob = TK.concat(sshStr(TK.utf8(name)), mpint(TK.unb64(jwkPub.e)), mpint(TK.unb64(jwkPub.n)));
      } else if (t.startsWith("ec")) {
        const curve = { "P-256": "nistp256", "P-384": "nistp384", "P-521": "nistp521" }[alg.namedCurve];
        name = `ecdsa-sha2-${curve}`;
        const q = TK.concat(new Uint8Array([4]), TK.unb64(jwkPub.x), TK.unb64(jwkPub.y));
        blob = TK.concat(sshStr(TK.utf8(name)), sshStr(TK.utf8(curve)), sshStr(q));
      } else {
        name = "ssh-ed25519";
        blob = TK.concat(sshStr(TK.utf8(name)), sshStr(TK.unb64(jwkPub.x)));
      }
      const comment = $("#kp-comment").value.trim();
      const fp = TK.b64(await shaDigest("SHA-256", blob)).replace(/=+$/, "");
      $("#kp-priv").value = pem("PRIVATE KEY", priv);
      $("#kp-pub").value = pem("PUBLIC KEY", spki);
      $("#kp-ssh").value = `${name} ${TK.b64(blob)}${comment ? " " + comment : ""}`;
      $("#kp-fp").textContent = `SHA256:${fp}`;
      delete jwkPub.key_ops; delete jwkPriv.key_ops; delete jwkPub.ext; delete jwkPriv.ext;
      $("#kp-jwk-pub").value = JSON.stringify(jwkPub, null, 2);
      $("#kp-jwk-priv").value = JSON.stringify(jwkPriv, null, 2);
      $("#kp-out").hidden = false;
      TK.msg(msg, "✓ key pair generated in this browser — keep the private key secret", "ok");
    } catch (e) {
      TK.msg(msg, t === "ed25519" ? "this browser does not support Ed25519 in WebCrypto yet — try RSA or ECDSA" : `failed: ${e.message}`, "err");
    } finally { $("#kp-go").disabled = false; }
  });
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-dl]");
    if (!b) return;
    const id = b.dataset.dl;
    TK.download(id === "kp-priv" ? "private_key.pem" : "public_key.pem", $("#" + id).value, "application/x-pem-file");
  });
});

/* ============================================================
   TOTP
   ============================================================ */
const BASE32 = {
  A: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  enc(bytes) {
    let bits = 0, val = 0, s = "";
    for (const b of bytes) {
      val = (val << 8) | b; bits += 8;
      while (bits >= 5) { s += this.A[(val >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits) s += this.A[(val << (5 - bits)) & 31];
    return s;
  },
  dec(str) {
    const s = String(str).toUpperCase().replace(/[\s=-]/g, "");
    let bits = 0, val = 0;
    const out = [];
    for (const c of s) {
      const i = this.A.indexOf(c);
      if (i < 0) throw new Error(`invalid Base32 character '${c}'`);
      val = ((val << 5) | i) & 0xffff; bits += 5;
      if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; }
    }
    return Uint8Array.from(out);
  },
};

async function totpCode(secretBytes, counter, digits = 6, alg = "SHA-1") {
  const msg = new Uint8Array(8);
  const dv = new DataView(msg.buffer);
  dv.setUint32(0, Math.floor(counter / 0x100000000));
  dv.setUint32(4, counter >>> 0);
  const h = await hmacSign(alg, secretBytes, msg);
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

Toolbox.define("totp", root => {
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <h3 class="tk-h">// secret</h3>
        <div class="tk-grid" style="grid-template-columns:1fr">
          <label class="tk-field"><span class="tk-label">Base32 secret</span>
            <div class="tk-row tight"><input class="tk-input tk-grow" id="tp-secret" spellcheck="false" autocomplete="off">
            <button class="btn ghost small" id="tp-new" type="button">New</button></div></label>
          <div class="tk-grid two">
            <label class="tk-field"><span class="tk-label">Issuer</span><input class="tk-input" id="tp-issuer" value="Bugfish"></label>
            <label class="tk-field"><span class="tk-label">Account</span><input class="tk-input" id="tp-account" value="user@example.com"></label>
          </div>
          <div class="tk-grid three">
            <label class="tk-field"><span class="tk-label">Digits</span><select class="tk-select" id="tp-digits"><option>6</option><option>8</option></select></label>
            <label class="tk-field"><span class="tk-label">Period</span><select class="tk-select" id="tp-period"><option value="30">30 s</option><option value="60">60 s</option></select></label>
            <label class="tk-field"><span class="tk-label">Algorithm</span><select class="tk-select" id="tp-alg"><option value="SHA-1">SHA1</option><option value="SHA-256">SHA256</option><option value="SHA-512">SHA512</option></select></label>
          </div>
          <label class="tk-field"><span class="tk-label">otpauth URI</span>
            <textarea class="tk-textarea short" id="tp-uri" readonly spellcheck="false"></textarea></label>
          <div class="tk-row">${TK.copyBtn("#tp-uri", "Copy URI")}</div>
        </div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// current code</h3>
        <div class="tk-out big" id="tp-code">------</div>
        <div class="tk-meter" style="margin-top:10px"><span id="tp-bar" style="background:var(--orange)"></span></div>
        <p class="tk-note" id="tp-around" style="margin-top:8px"></p>
        <div class="tk-row" style="margin-top:6px">${TK.copyBtn("#tp-code", "Copy code")}</div>
        <div class="tk-preview" style="min-height:0;padding:14px;margin-top:14px;background:#fff"><canvas id="tp-qr" class="tk-canvas" width="10" height="10"></canvas></div>
        <p class="tk-note" style="margin-top:8px">Scan with Google Authenticator, Aegis, 1Password, Bitwarden... <b>Only use test secrets here</b> for real accounts, generate secrets on the server.</p>
        <h3 class="tk-h">// verify a code</h3>
        <div class="tk-row tight"><input class="tk-input tk-grow" id="tp-check" inputmode="numeric" placeholder="123456" autocomplete="one-time-code">
          <button class="btn ghost small" id="tp-check-go" type="button">Check</button></div>
        <div class="tk-msg" id="tp-check-msg" style="margin-top:8px"></div>
      </section>
    </div>`;

  const $ = s => root.querySelector(s);
  $("#tp-secret").value = BASE32.enc(TK.rand(20));
  let secret = null;

  function uri() {
    const iss = $("#tp-issuer").value.trim(), acc = $("#tp-account").value.trim();
    const label = encodeURIComponent(iss ? `${iss}:${acc}` : acc).replace(/%3A/, ":");
    const p = new URLSearchParams({ secret: $("#tp-secret").value.replace(/\s/g, "").toUpperCase() });
    if (iss) p.set("issuer", iss);
    p.set("algorithm", $("#tp-alg").value.replace("-", ""));
    p.set("digits", $("#tp-digits").value);
    p.set("period", $("#tp-period").value);
    return `otpauth://totp/${label}?${p.toString()}`;
  }

  function refresh() {
    try { secret = BASE32.dec($("#tp-secret").value); if (!secret.length) throw new Error("empty secret"); }
    catch (e) { secret = null; $("#tp-code").textContent = "invalid"; $("#tp-around").textContent = e.message; return; }
    const u = uri();
    $("#tp-uri").value = u;
    try { QR.toCanvas($("#tp-qr"), u, { ecl: "M", scale: 5, margin: 3, dark: "#000", light: "#fff" }); }
    catch (e) { console.error(e); }
    tick();
  }

  async function tick() {
    if (!secret) return;
    const period = +$("#tp-period").value, digits = +$("#tp-digits").value, alg = $("#tp-alg").value;
    const now = Date.now() / 1000;
    const ctr = Math.floor(now / period);
    const [prev, cur, next] = await Promise.all([ctr - 1, ctr, ctr + 1].map(c => totpCode(secret, c, digits, alg)));
    $("#tp-code").textContent = cur;
    const left = period - (now % period);
    $("#tp-bar").style.width = `${(left / period) * 100}%`;
    $("#tp-around").textContent = `previous ${prev} · next ${next} · ${Math.ceil(left)} s left`;
  }

  $("#tp-new").addEventListener("click", () => { $("#tp-secret").value = BASE32.enc(TK.rand(20)); refresh(); });
  root.querySelectorAll("input:not(#tp-check), select").forEach(el => el.addEventListener("input", TK.debounce(refresh, 200)));
  $("#tp-check-go").addEventListener("click", async () => {
    const m = $("#tp-check-msg"), code = $("#tp-check").value.replace(/\s/g, "");
    if (!secret) return;
    const period = +$("#tp-period").value, digits = +$("#tp-digits").value, alg = $("#tp-alg").value;
    const ctr = Math.floor(Date.now() / 1000 / period);
    for (const d of [0, -1, 1]) {
      if (await totpCode(secret, ctr + d, digits, alg) === code) {
        TK.msg(m, d === 0 ? "✓ valid for the current window" : `✓ valid for the ${d < 0 ? "previous" : "next"} window (clock drift ±${period}s)`, "ok");
        return;
      }
    }
    TK.msg(m, "✗ not valid now (±1 window checked)", "err");
  });
  refresh();
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
});

/* ============================================================
   JWT debugger
   ============================================================ */
Toolbox.define("jwt", root => {
  const SAMPLE_SECRET = "your-256-bit-secret";
  root.innerHTML = `
    <section class="tk-panel">
      <label class="tk-field"><span class="tk-label">Encoded token <em id="jw-state"></em></span>
        <textarea class="tk-textarea short" id="jw-token" spellcheck="false" placeholder="eyJhbGciOi..."></textarea></label>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel">
        <h3 class="tk-h">// header</h3>
        <textarea class="tk-textarea short" id="jw-head" spellcheck="false"></textarea>
        <h3 class="tk-h">// payload</h3>
        <textarea class="tk-textarea" id="jw-body" spellcheck="false"></textarea>
        <p class="tk-note" style="margin-top:6px">Edit header or payload and press <b>Sign</b> to build a new HS token.</p>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// claims</h3>
        <div id="jw-claims"></div>
        <h3 class="tk-h">// signature</h3>
        <label class="tk-field"><span class="tk-label">Secret (HS*) or public key PEM / JWK (RS*, PS*, ES*)</span>
          <textarea class="tk-textarea short" id="jw-key" spellcheck="false">${SAMPLE_SECRET}</textarea></label>
        <div class="tk-row" style="margin-top:10px">
          <label class="tk-check"><input type="checkbox" id="jw-b64"> secret is Base64</label>
          <button class="btn small" id="jw-verify" type="button">Verify</button>
          <button class="btn outline small" id="jw-sign" type="button">Sign (HS)</button>
        </div>
        <div class="tk-msg" id="jw-msg" style="margin-top:10px"></div>
      </section>
    </div>`;

  const $ = s => root.querySelector(s);
  const b64u = s => TK.unb64(s);
  const enc64u = o => TK.b64(TK.utf8(typeof o === "string" ? o : JSON.stringify(o)), true);
  const HS = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" };
  const hashOf = alg => `SHA-${alg.slice(2)}`;

  function decode() {
    const t = $("#jw-token").value.trim();
    const st = $("#jw-state");
    $("#jw-msg").className = "tk-msg"; $("#jw-msg").textContent = "";
    const parts = t.split(".");
    if (!t) { st.textContent = ""; return; }
    if (parts.length !== 3) { st.innerHTML = `<span class="tk-err">needs 3 dot-separated parts (got ${parts.length})</span>`; return; }
    try {
      const head = JSON.parse(TK.unutf8(b64u(parts[0])));
      const body = JSON.parse(TK.unutf8(b64u(parts[1])));
      $("#jw-head").value = JSON.stringify(head, null, 2);
      $("#jw-body").value = JSON.stringify(body, null, 2);
      st.innerHTML = `<span class="tk-ok">decoded · ${esc(head.alg || "?")}</span>`;
      claims(body, head);
    } catch (e) { st.innerHTML = `<span class="tk-err">not decodable: ${esc(e.message)}</span>`; }
  }

  function claims(body, head) {
    const now = Date.now() / 1000;
    const rows = [];
    const date = v => (typeof v === "number" ? `${new Date(v * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC")}` : String(v));
    const names = { iss: "issuer", sub: "subject", aud: "audience", exp: "expires", nbf: "not before", iat: "issued at", jti: "token id" };
    Object.keys(body).forEach(k => {
      let v = body[k];
      if (["exp", "nbf", "iat"].includes(k)) {
        let rel = "";
        if (typeof v === "number") {
          const d = Math.round(v - now);
          rel = d >= 0 ? ` (in ${fmtDuration(d)})` : ` (${fmtDuration(-d)} ago)`;
        }
        v = date(v) + rel;
      } else if (typeof v === "object") v = JSON.stringify(v);
      rows.push([`${k}${names[k] ? " · " + names[k] : ""}`, String(v), false]);
    });
    let status = "";
    if (typeof body.exp === "number" && body.exp < now) status = `<div class="tk-msg err" style="margin-bottom:10px">✗ token is EXPIRED</div>`;
    else if (typeof body.nbf === "number" && body.nbf > now) status = `<div class="tk-msg warn" style="margin-bottom:10px">⚠ token is not valid yet (nbf)</div>`;
    else if (typeof body.exp === "number") status = `<div class="tk-msg ok" style="margin-bottom:10px">✓ not expired</div>`;
    if (head && String(head.alg).toLowerCase() === "none") status += `<div class="tk-msg err" style="margin-bottom:10px">✗ alg "none" — unsigned token. Never accept these.</div>`;
    $("#jw-claims").innerHTML = status + (rows.length ? TK.kv(rows, false) : `<p class="tk-note">no claims</p>`);
  }

  async function importVerifyKey(alg, text) {
    const t = text.trim();
    let params;
    if (alg.startsWith("RS")) params = { name: "RSASSA-PKCS1-v1_5", hash: hashOf(alg) };
    else if (alg.startsWith("PS")) params = { name: "RSA-PSS", hash: hashOf(alg) };
    else if (alg.startsWith("ES")) params = { name: "ECDSA", namedCurve: { ES256: "P-256", ES384: "P-384", ES512: "P-521" }[alg] };
    else throw new Error(`unsupported alg ${alg}`);
    if (t.startsWith("{")) return crypto.subtle.importKey("jwk", JSON.parse(t), params, false, ["verify"]);
    const m = /-----BEGIN PUBLIC KEY-----([\s\S]+?)-----END PUBLIC KEY-----/.exec(t);
    if (!m) throw new Error("paste the public key as SPKI PEM (BEGIN PUBLIC KEY) or JWK");
    return crypto.subtle.importKey("spki", TK.unb64(m[1]), params, false, ["verify"]);
  }

  function secretBytes() {
    const k = $("#jw-key").value;
    return $("#jw-b64").checked ? TK.unb64(k.trim()) : TK.utf8(k);
  }

  $("#jw-verify").addEventListener("click", async () => {
    const m = $("#jw-msg");
    const parts = $("#jw-token").value.trim().split(".");
    if (parts.length !== 3) { TK.msg(m, "no valid token", "err"); return; }
    try {
      const head = JSON.parse(TK.unutf8(b64u(parts[0])));
      const alg = head.alg;
      const data = TK.utf8(`${parts[0]}.${parts[1]}`);
      const sig = b64u(parts[2]);
      let ok;
      if (HS[alg]) {
        const mac = await hmacSign(HS[alg], secretBytes(), data);
        ok = mac.length === sig.length && mac.every((b, i) => b === sig[i]);
      } else {
        const key = await importVerifyKey(alg, $("#jw-key").value);
        const p = alg.startsWith("ES") ? { name: "ECDSA", hash: hashOf(alg) } : alg.startsWith("PS") ? { name: "RSA-PSS", saltLength: +alg.slice(2) / 8 } : { name: "RSASSA-PKCS1-v1_5" };
        ok = await crypto.subtle.verify(p, key, sig, data);
      }
      TK.msg(m, ok ? `✓ signature verified (${alg})` : `✗ invalid signature (${alg})`, ok ? "ok" : "err");
    } catch (e) { TK.msg(m, e.message, "err"); }
  });

  $("#jw-sign").addEventListener("click", async () => {
    const m = $("#jw-msg");
    try {
      const head = JSON.parse($("#jw-head").value || "{}");
      const body = JSON.parse($("#jw-body").value || "{}");
      if (!HS[head.alg]) head.alg = "HS256";
      head.typ = head.typ || "JWT";
      const input = `${enc64u(head)}.${enc64u(body)}`;
      const sig = await hmacSign(HS[head.alg], secretBytes(), TK.utf8(input));
      $("#jw-token").value = `${input}.${TK.b64(sig, true)}`;
      decode();
      TK.msg(m, `✓ signed with ${head.alg}`, "ok");
    } catch (e) { TK.msg(m, `cannot sign: ${e.message}`, "err"); }
  });

  $("#jw-token").addEventListener("input", decode);
  // Sample token signed with the sample secret.
  (async () => {
    const now = Math.floor(Date.now() / 1000);
    const head = { alg: "HS256", typ: "JWT" };
    const body = { sub: "1234567890", name: "Bugfish", role: "admin", iat: now, exp: now + 3600 };
    const input = `${enc64u(head)}.${enc64u(body)}`;
    const sig = await hmacSign("SHA-256", TK.utf8(SAMPLE_SECRET), TK.utf8(input));
    if (!$("#jw-token").value) { $("#jw-token").value = `${input}.${TK.b64(sig, true)}`; decode(); }
  })();
});
