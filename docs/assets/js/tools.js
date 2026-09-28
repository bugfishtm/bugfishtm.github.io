/* ============================================================
   BUGFISH — tools.js
   The tools page (tools.html): registry of every tool, the
   searchable / taggable technical list, a tiny hash router and
   the shared helper kit (TK) the tools are built with.

   How it fits together
   --------------------
   - TOOLS below is the single source of truth for the list:
     id, name, category, tags, description, list icon. No JSON
     files — the registry lives in code.
   - The implementation of each tool lives in a category file
     under assets/js/tools/<group>.js and is only downloaded when
     a tool of that group is opened (tools.html#<id>). A group
     file registers its tools with Toolbox.define(id, render).
   - render(root, meta) builds the UI inside `root` and may
     return a cleanup function (timers, audio, key handlers) that
     runs when the visitor leaves the tool.
   - Everything runs in the browser. The only tools that touch
     the network are flagged `net: true` (DNS over HTTPS) and say
     so in their UI.

   Deep links
     tools.html#bcrypt             opens a tool
     tools.html?cat=web&tag=css    filtered list
     tools.html?q=json             prefilled search
   ============================================================ */

const TOOL_CATEGORIES = [
  { id: "security", label: "Security",  short: "sec"  },
  { id: "encoding", label: "Encoding",  short: "enc"  },
  { id: "data",     label: "Data",      short: "data" },
  { id: "text",     label: "Text",      short: "txt"  },
  { id: "web",      label: "Web Dev",   short: "web"  },
  { id: "design",   label: "Design",    short: "dsn"  },
  { id: "network",  label: "Network",   short: "net"  },
  { id: "system",   label: "System",    short: "sys"  },
  { id: "fun",      label: "Fun",       short: "fun"  },
];

/* group = the file in assets/js/tools/ that implements the tool,
   deps  = extra library files the tool needs first. */
const TOOLS = [
  // ---- security ------------------------------------------------
  { id: "bcrypt", cat: "security", group: "security", icon: "$2y", name: "bcrypt Hash Generator",
    tags: ["php", "password", "hash", "bcrypt", "laravel"],
    kw: "password_hash password_verify blowfish crypt 2y 2b 2a cost verify",
    desc: "Create and verify bcrypt hashes compatible with PHP password_hash() / password_verify(), Laravel and most frameworks. Adjustable cost." },
  { id: "htpasswd", cat: "security", group: "security", icon: "htp", name: ".htpasswd Generator",
    tags: ["apache", "nginx", "auth", "password"],
    kw: "basic auth htaccess apr1 md5 sha1 bcrypt authuserfile auth_basic",
    desc: "Generate and verify .htpasswd entries for HTTP Basic Auth — bcrypt, APR1-MD5 or SHA-1 — plus the matching Apache and Nginx config." },
  { id: "hash", cat: "security", group: "security", icon: "#", name: "Hash & Checksum Generator",
    tags: ["hash", "checksum", "md5", "sha256", "hmac", "file"],
    kw: "sha1 sha384 sha512 crc32 digest identify compare webhook signature",
    desc: "MD5, SHA-1, SHA-256/384/512 and CRC32 for text or files, HMAC signing, checksum comparison and hash type identification." },
  { id: "password", cat: "security", group: "security", icon: "***", name: "Password Generator & Strength Check",
    tags: ["password", "entropy", "generator", "security"],
    kw: "passphrase random secure strength analyzer crack time pronounceable",
    desc: "Cryptographically secure passwords and pronounceable passphrases with entropy readout — plus a local strength analyzer with crack-time estimates." },
  { id: "secrets", cat: "security", group: "security", icon: "key", name: "Secret Key & Salt Generator",
    tags: ["php", "wordpress", "laravel", "api", "generator"],
    kw: "wp-config salts app_key symfony app_secret django secret_key token hex base64 base62",
    desc: "One-click secrets for config files: WordPress salts, Laravel APP_KEY, Symfony APP_SECRET, Django SECRET_KEY and API tokens in hex, base64 or base62." },
  { id: "aes", cat: "security", group: "security", icon: "AES", name: "AES Text Encryption",
    tags: ["crypto", "aes", "openssl", "privacy"],
    kw: "encrypt decrypt passphrase gcm cbc pbkdf2 openssl enc",
    desc: "Encrypt and decrypt text with a passphrase — AES-256-GCM, or OpenSSL-compatible AES-256-CBC that you can decrypt with `openssl enc`." },
  { id: "keypair", cat: "security", group: "security", icon: "RSA", name: "RSA / EC / Ed25519 Key Generator",
    tags: ["crypto", "ssh", "pem", "jwk", "ssl"],
    kw: "keypair public private key generate ecdsa p-256 p-384 openssh authorized_keys pkcs8 spki",
    desc: "Generate key pairs locally with WebCrypto and export them as PEM, JWK and OpenSSH public key lines." },
  { id: "totp", cat: "security", group: "security", deps: ["qrlib"], icon: "2FA", name: "TOTP 2FA Generator",
    tags: ["2fa", "otp", "qr", "authenticator"],
    kw: "totp hotp google authenticator otpauth base32 secret one-time password rfc 6238 mfa",
    desc: "Create TOTP secrets with an otpauth:// QR code and compute live 6/8-digit codes to test your 2FA implementation (RFC 6238)." },
  { id: "jwt", cat: "security", group: "security", icon: "JWT", name: "JWT Debugger",
    tags: ["jwt", "auth", "api", "hmac", "rsa"],
    kw: "json web token decode verify sign hs256 rs256 es256 claims exp iat bearer",
    desc: "Decode JSON Web Tokens, read claims with human-readable dates, verify HS / RS / ES signatures and sign new HS256 tokens." },

  // ---- encoding ------------------------------------------------
  { id: "base64", cat: "encoding", group: "encoding", icon: "64", name: "Base64 Encoder / Decoder",
    tags: ["base64", "encoding", "file", "data-uri"],
    kw: "base64url atob btoa data url image to base64 decode file utf-8",
    desc: "Encode and decode Base64 / Base64URL with full UTF-8 support, turn files into data URIs and decode Base64 back into downloadable files." },
  { id: "encodings", cat: "encoding", group: "encoding", icon: "0x", name: "Encoding Workbench",
    tags: ["hex", "binary", "base32", "base58", "punycode", "encoding"],
    kw: "ascii85 octal decimal bytes quoted-printable idn unicode escape convert text to hex binary",
    desc: "Type once, see every encoding: hex, binary, octal, byte values, Base32, Base58, Ascii85, quoted-printable, punycode and escapes — and decode them back." },
  { id: "url", cat: "encoding", group: "encoding", icon: "%20", name: "URL Encoder & Parser",
    tags: ["url", "encoding", "query", "web"],
    kw: "percent encode decode urlencode rawurlencode encodeURIComponent query string parameters parse",
    desc: "Percent-encode or decode strings, split any URL into its parts and edit its query parameters in a table." },
  { id: "escape", cat: "encoding", group: "encoding", icon: "\\n", name: "String Escaper",
    tags: ["escape", "html", "json", "php", "sql", "regex", "shell"],
    kw: "html entities htmlspecialchars unescape javascript string csv quote addslashes",
    desc: "Escape and unescape strings for HTML, JavaScript, JSON, PHP, SQL, regular expressions, CSV and shell arguments." },
  { id: "unicode", cat: "encoding", group: "encoding", icon: "U+", name: "Unicode Inspector",
    tags: ["unicode", "utf8", "debug", "invisible"],
    kw: "code point zero width space bom homoglyph utf-16 character inspector hidden characters emoji",
    desc: "Reveal every character: code points, UTF-8 / UTF-16 bytes and HTML entities — and spot invisible or look-alike characters that break your code." },
  { id: "ciphers", cat: "encoding", group: "encoding", icon: "ROT", name: "Classic Cipher Workbench",
    tags: ["cipher", "caesar", "vigenere", "morse", "rot13"],
    kw: "rot47 atbash xor bacon morse code audio brute force crypto puzzle ctf",
    desc: "Caesar, ROT13, ROT47, Atbash, Vigenère, XOR, Bacon and Morse code (with audio) — plus a Caesar brute-force view for puzzles and CTFs." },

  // ---- data ----------------------------------------------------
  { id: "json", cat: "data", group: "data", icon: "{ }", name: "JSON Formatter & Validator",
    tags: ["json", "format", "validate", "minify", "api"],
    kw: "pretty print beautify lint sort keys tree view path error position",
    desc: "Pretty-print, minify, sort keys and validate JSON with exact error positions. Includes a collapsible tree view that shows the path of any value." },
  { id: "jsonconv", cat: "data", group: "data", icon: "→TS", name: "JSON to Code Converter",
    tags: ["json", "php", "typescript", "yaml", "xml"],
    kw: "json to php array typescript interface yaml xml go struct query string convert",
    desc: "Turn JSON into PHP arrays, TypeScript interfaces, YAML, XML, Go structs or a URL query string." },
  { id: "csv", cat: "data", group: "data", icon: "CSV", name: "CSV Converter",
    tags: ["csv", "json", "sql", "markdown", "table"],
    kw: "csv to json json to csv sql insert markdown table html table excel tsv delimiter",
    desc: "Convert CSV to JSON, SQL INSERT statements, Markdown or HTML tables — and JSON back to CSV. Detects the delimiter automatically." },
  { id: "phpserialize", cat: "data", group: "data", icon: "a:1", name: "PHP Serialize ↔ JSON",
    tags: ["php", "serialize", "json", "wordpress"],
    kw: "unserialize serialized string wp_options session byte length",
    desc: "Unserialize PHP serialize() strings (WordPress options, sessions) into readable JSON and serialize JSON back — with correct UTF-8 byte lengths." },
  { id: "sql", cat: "data", group: "data", icon: "SQL", name: "SQL Formatter",
    tags: ["sql", "mysql", "format", "minify"],
    kw: "beautify pretty print query uppercase keywords indent join subquery",
    desc: "Beautify or compact SQL queries — keyword casing, clause line breaks and indentation for SELECT, INSERT, UPDATE, JOINs and subqueries." },
  { id: "fakedata", cat: "data", group: "data", icon: "Lor", name: "Lorem Ipsum & Test Data",
    tags: ["lorem", "test-data", "json", "sql", "generator"],
    kw: "lorem ipsum dummy text placeholder fake names emails addresses mock data seed",
    desc: "Placeholder text as paragraphs, sentences or HTML — plus fake test records (names, e-mails, addresses, dates) as JSON, CSV or SQL." },

  // ---- text ----------------------------------------------------
  { id: "case", cat: "text", group: "text", icon: "Aa", name: "Case Converter & Slugify",
    tags: ["text", "camelcase", "snake-case", "slug", "seo"],
    kw: "pascalcase kebab-case constant title case sentence case uppercase lowercase url slug",
    desc: "Convert text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case and more, and create clean URL slugs." },
  { id: "counter", cat: "text", group: "text", icon: "123", name: "Word & Character Counter",
    tags: ["text", "seo", "count", "reading-time"],
    kw: "word count character count letters sentences paragraphs bytes keyword density meta length tweet",
    desc: "Characters, words, sentences, lines, bytes, reading time, keyword density and length checks for meta titles, descriptions and posts." },
  { id: "lines", cat: "text", group: "text", icon: "≡", name: "Line Tools",
    tags: ["text", "sort", "dedupe", "list"],
    kw: "sort lines remove duplicates unique trim reverse shuffle number filter join split empty lines",
    desc: "Sort, deduplicate, trim, reverse, shuffle, number, filter, split or join lines of text — chain as many steps as you like." },
  { id: "diff", cat: "text", group: "text", icon: "±", name: "Text Diff Checker",
    tags: ["diff", "compare", "text", "code"],
    kw: "compare two texts difference changes side by side inline patch",
    desc: "Compare two texts line by line with word-level highlights, side by side or inline, and export a unified diff." },
  { id: "regex", cat: "text", group: "text", icon: ".*", name: "Regex Tester",
    tags: ["regex", "javascript", "test", "replace"],
    kw: "regular expression match groups named capture replace flags cheat sheet pcre",
    desc: "Test JavaScript regular expressions live — highlighted matches, capture groups, replace preview and a quick syntax cheat sheet." },
  { id: "markdown", cat: "text", group: "text", icon: "MD", name: "Markdown Live Preview",
    tags: ["markdown", "html", "preview", "text"],
    kw: "md to html editor readme github flavored table task list",
    desc: "Write Markdown and see the result instantly, then copy the generated HTML. Tables, fenced code, task lists and more." },

  // ---- web -----------------------------------------------------
  { id: "meta", cat: "web", group: "web", icon: "<m>", name: "Meta & Open Graph Generator",
    tags: ["seo", "meta", "open-graph", "html"],
    kw: "meta tags og twitter card canonical description title serp preview social preview head",
    desc: "Generate title, description, canonical, Open Graph and Twitter Card tags with a live search-result and social-card preview." },
  { id: "serverconf", cat: "web", group: "web", icon: ".ht", name: ".htaccess & Nginx Config Generator",
    tags: ["apache", "nginx", "htaccess", "redirect", "headers"],
    kw: "https redirect www non-www cache control gzip compression security headers hsts csp error pages rewrite",
    desc: "Build HTTPS and www redirects, caching, compression, security headers and error pages — output for Apache .htaccess and Nginx side by side." },
  { id: "cssmin", cat: "web", group: "web", icon: "min", name: "CSS & HTML Minifier",
    tags: ["css", "html", "minify", "beautify"],
    kw: "compress css minify html beautify prettify format performance bytes saved",
    desc: "Minify or prettify CSS and HTML and see exactly how many bytes you saved." },
  { id: "httpstatus", cat: "web", group: "web", icon: "404", name: "HTTP Status Codes",
    tags: ["http", "reference", "api", "web"],
    kw: "status code 200 301 302 404 500 503 redirect error meaning rest",
    desc: "Searchable reference of all HTTP status codes with their meaning, typical use and gotchas." },
  { id: "browser", cat: "web", group: "web", icon: "UA", name: "Browser & Device Info",
    tags: ["browser", "user-agent", "screen", "debug"],
    kw: "what is my browser user agent viewport resolution pixel ratio timezone language features media queries",
    desc: "Everything your browser reveals: user agent, screen and viewport, pixel ratio, languages, time zone, supported features and media queries." },
  { id: "favicon", cat: "web", group: "web", deps: ["ziplib"], icon: "ico", name: "Favicon Generator",
    tags: ["favicon", "ico", "png", "image"],
    kw: "favicon.ico apple touch icon manifest png sizes emoji letter icon",
    desc: "Turn an image, emoji or letters into favicon.ico plus every PNG size and the matching HTML tags." },

  // ---- design --------------------------------------------------
  { id: "color", cat: "design", group: "design", icon: "#f60", name: "Color Converter & Contrast",
    tags: ["color", "css", "wcag", "a11y"],
    kw: "hex rgb hsl hwb cmyk oklch convert contrast ratio accessibility aa aaa",
    desc: "Convert between HEX, RGB, HSL, HWB, CMYK and OKLCH and check WCAG contrast ratios for text and UI." },
  { id: "palette", cat: "design", group: "design", icon: "▦", name: "Palette Generator",
    tags: ["color", "palette", "css", "image"],
    kw: "color scheme harmony complementary triadic analogous tints shades extract colors from image css variables",
    desc: "Color harmonies, tints and shades from one base color — or extract a palette from an image. Export as CSS variables." },
  { id: "gradient", cat: "design", group: "design", icon: "grd", name: "CSS Gradient Generator",
    tags: ["css", "gradient", "design"],
    kw: "linear-gradient radial-gradient conic-gradient color stops background",
    desc: "Design linear, radial and conic gradients visually with multiple color stops and copy the CSS." },
  { id: "shadow", cat: "design", group: "design", icon: "▢", name: "CSS Box Shadow Generator",
    tags: ["css", "shadow", "design"],
    kw: "box-shadow inset layered shadows elevation neumorphism",
    desc: "Layer multiple box-shadows with a live preview, inset support and copy-ready CSS." },
  { id: "image", cat: "design", group: "design", deps: ["ziplib"], icon: "img", name: "Image Converter & Compressor",
    tags: ["image", "webp", "jpeg", "png", "resize"],
    kw: "convert image compress resize webp jpg png quality optimize",
    desc: "Resize, convert (PNG, JPEG, WebP) and compress images right in your browser — nothing is uploaded." },
  { id: "qr", cat: "design", group: "design", deps: ["qrlib"], icon: "QR", name: "QR Code Generator",
    tags: ["qr", "generator", "wifi", "vcard"],
    kw: "qr code url text wlan wifi login contact vcard email sms svg png error correction",
    desc: "QR codes for URLs, text, Wi-Fi logins, contacts and e-mail. Pick error correction and colors, download as PNG or SVG." },

  // ---- network -------------------------------------------------
  { id: "dns", cat: "network", group: "network", net: true, icon: "DNS", name: "DNS Lookup",
    tags: ["dns", "network", "doh", "mx", "txt"],
    kw: "dns records a aaaa cname ns soa caa srv ptr reverse lookup dig nslookup propagation cloudflare google",
    desc: "Query A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, SRV and PTR records via DNS-over-HTTPS and compare the answers of Cloudflare and Google." },
  { id: "mailcheck", cat: "network", group: "network", net: true, icon: "@", name: "Mail DNS Checker",
    tags: ["mail", "dns", "spf", "dkim", "dmarc"],
    kw: "email deliverability mx spf dmarc dkim selector mta-sts tls-rpt bimi spam audit",
    desc: "Audit a domain's e-mail setup — MX, SPF with lookup count, DMARC, DKIM selectors, MTA-STS, TLS-RPT and BIMI — with actionable findings." },
  { id: "subnet", cat: "network", group: "network", icon: "/24", name: "Subnet Calculator",
    tags: ["network", "ip", "cidr", "ipv6"],
    kw: "ipv4 cidr netmask wildcard broadcast host range subnetting split ipv6 prefix",
    desc: "IPv4 and IPv6 CIDR calculator: network, broadcast, host range, masks, wildcard, binary view and subnet splitting." },

  // ---- system --------------------------------------------------
  { id: "numbase", cat: "system", group: "system", icon: "0b", name: "Number Base & Bitwise Calculator",
    tags: ["binary", "hex", "bitwise", "math"],
    kw: "base converter octal decimal hexadecimal radix two's complement and or xor shift bigint",
    desc: "Convert between binary, octal, decimal, hex and any base up to 36 at any size, and try AND, OR, XOR, shifts and two's complement." },
  { id: "timestamp", cat: "system", group: "system", icon: "epoch", name: "Unix Timestamp Converter",
    tags: ["time", "unix", "epoch", "timezone"],
    kw: "timestamp to date date to timestamp milliseconds iso 8601 rfc 2822 utc time zone converter world clock",
    desc: "Convert Unix timestamps (s / ms) to dates and back, see the moment in any time zone and get ISO 8601, RFC 2822 and relative formats." },
  { id: "cron", cat: "system", group: "system", icon: "*/5", name: "Cron Expression Explainer",
    tags: ["cron", "linux", "schedule", "sysadmin"],
    kw: "crontab schedule next run human readable every minute generator",
    desc: "Translate cron expressions into plain English and list the next run times. Presets and a field-by-field reference included." },
  { id: "chmod", cat: "system", group: "system", icon: "rwx", name: "chmod Calculator",
    tags: ["linux", "chmod", "permissions", "sysadmin"],
    kw: "file permissions octal symbolic 755 644 777 setuid setgid sticky umask",
    desc: "Toggle read / write / execute and get octal (755) and symbolic (rwxr-xr-x) notation, including setuid, setgid and sticky bits." },
  { id: "uuid", cat: "system", group: "system", icon: "uid", name: "UUID / ULID Generator",
    tags: ["uuid", "ulid", "nanoid", "generator"],
    kw: "guid v4 v7 time ordered unique id database primary key decode validate",
    desc: "Generate UUID v4 and time-ordered v7, ULIDs and NanoIDs in bulk — and decode any UUID to see its version and timestamp." },

  // ---- fun -----------------------------------------------------
  { id: "bpm", cat: "fun", group: "fun", icon: "♪", name: "BPM Tapper & Metronome",
    tags: ["music", "bpm", "metronome", "audio"],
    kw: "tap tempo beats per minute click track delay times producer",
    desc: "Tap along to find the tempo of any track, then keep time with an accurate Web Audio metronome with accents and a delay-time chart." },
  { id: "breach", cat: "fun", group: "fun", game: true, icon: "1C", name: "Breach Protocol",
    tags: ["game", "puzzle", "hacking"],
    kw: "hacking minigame matrix code sequence daemon buffer",
    desc: "Hacking puzzle: pick codes along rows and columns to upload daemon sequences before your buffer runs out." },
  { id: "snake", cat: "fun", group: "fun", game: true, icon: "~~", name: "Snake // Terminal Edition",
    tags: ["game", "arcade", "classic"],
    kw: "snake game retro arcade high score",
    desc: "Classic snake in terminal style — keyboard, swipe or on-screen pad. Speeds up as you grow; your high score stays in your browser." },
];

const TOOL_BY_ID = Object.fromEntries(TOOLS.map(t => [t.id, t]));
const CAT_BY_ID = Object.fromEntries(TOOL_CATEGORIES.map(c => [c.id, c]));

/* ============================================================
   TK — shared helper kit for the tool implementations
   ============================================================ */
const TK = {
  $: (root, sel) => root.querySelector(sel),
  $$: (root, sel) => Array.from(root.querySelectorAll(sel)),
  esc: s => esc(s),

  debounce(fn, ms = 150) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },

  /* ---- bytes & strings ---- */
  enc: new TextEncoder(),
  dec: new TextDecoder(),
  utf8(str) { return TK.enc.encode(String(str)); },
  unutf8(bytes, fatal = false) {
    return fatal ? new TextDecoder("utf-8", { fatal: true }).decode(bytes) : TK.dec.decode(bytes);
  },
  hex(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    return s;
  },
  unhex(str) {
    const clean = String(str).replace(/^0x/i, "").replace(/[\s:,-]|0x/gi, "");
    if (clean.length % 2 || /[^0-9a-f]/i.test(clean)) throw new Error("not valid hex");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  },
  b64(bytes, urlSafe = false) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const s = btoa(bin);
    return urlSafe ? s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : s;
  },
  unb64(str) {
    let s = String(str).replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (/[^A-Za-z0-9+/=]/.test(s)) throw new Error("invalid Base64 character");
    s = s.replace(/=+$/, "");
    if (s.length % 4 === 1) throw new Error("invalid Base64 length");
    s += "===".slice((s.length + 3) % 4);
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
  concat(...parts) {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    parts.forEach(p => { out.set(p, o); o += p.length; });
    return out;
  },

  /* ---- randomness (crypto only) ---- */
  rand(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return b; },
  /* Uniform integer in [0, max) without modulo bias. */
  randInt(max) {
    if (max <= 1) return 0;
    const lim = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= lim);
    return buf[0] % max;
  },
  pick(str) { return str[TK.randInt(str.length)]; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = TK.randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /* ---- formatting ---- */
  fmtBytes(n) {
    if (!isFinite(n)) return "-";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (Math.abs(n) >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${i ? n.toFixed(n < 10 ? 2 : 1) : n} ${u[i]}`;
  },
  num(n) { return Number(n).toLocaleString("en-US"); },

  /* ---- clipboard / files ---- */
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  },
  flash(btn, label = "Copied") {
    if (!btn) return;
    const old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old;
    btn.textContent = label;
    btn.classList.add("done");
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = old; btn.classList.remove("done"); }, 1300);
  },
  /* Any element with data-copy="<selector>" inside root copies the
     value / text of that target on click. data-copy-text copies a
     literal string instead. */
  bindCopy(root) {
    root.addEventListener("click", async e => {
      const btn = e.target.closest("[data-copy],[data-copy-text]");
      if (!btn || !root.contains(btn)) return;
      let text = btn.dataset.copyText;
      if (text == null) {
        const t = root.querySelector(btn.dataset.copy);
        if (!t) return;
        text = "value" in t && t.tagName !== "DIV" ? t.value : t.textContent;
      }
      if (!text) { TK.toast("nothing to copy"); return; }
      if (await TK.copy(text)) TK.flash(btn);
      else TK.toast("copy failed — select and copy manually");
    });
  },
  copyBtn(sel, label = "Copy") { return `<button type="button" class="tk-copy" data-copy="${esc(sel)}">${esc(label)}</button>`; },
  download(name, data, mime = "application/octet-stream") {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },
  readFile(file, as = "bytes") {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(r.error || new Error("could not read file"));
      r.onload = () => resolve(as === "bytes" ? new Uint8Array(r.result) : r.result);
      if (as === "bytes") r.readAsArrayBuffer(file);
      else if (as === "dataurl") r.readAsDataURL(file);
      else r.readAsText(file);
    });
  },
  /* Turns an element into a click-or-drop file target. */
  drop(el, onFiles, accept = "") {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.hidden = true;
    el.after(input);
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.addEventListener("click", () => input.click());
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", () => { if (input.files.length) onFiles(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove("over"); }));
    el.addEventListener("drop", e => { if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); });
  },

  /* ---- small UI builders ---- */
  toast(msg) {
    let t = document.getElementById("tk-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "tk-toast";
      t.className = "tk-toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 1900);
  },
  /* rows: [[key, value, copyable?], ...] → key/value grid */
  kv(rows, copy = true) {
    return `<div class="tk-kv${copy ? "" : " nocopy"}">` + rows.map(([k, v, c = true]) =>
      `<div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>` +
      (copy ? `<div class="c">${c && v !== "" && v != null ? `<button type="button" class="tk-copy" data-copy-text="${esc(v)}">Copy</button>` : ""}</div>` : "")
    ).join("") + `</div>`;
  },
  /* Segmented switch. Returns html; wire with TK.seg(el, cb). */
  segHtml(id, options, active) {
    return `<div class="tk-seg" id="${id}" role="tablist">` + options.map(([v, l]) =>
      `<button type="button" data-v="${esc(v)}" class="${v === active ? "on" : ""}" role="tab" aria-selected="${v === active}">${esc(l)}</button>`
    ).join("") + `</div>`;
  },
  seg(el, cb) {
    el.addEventListener("click", e => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      el.querySelectorAll("button").forEach(x => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      cb(b.dataset.v);
    });
    return { set(v) { const b = el.querySelector(`button[data-v="${v}"]`); if (b) b.click(); } };
  },
  msg(el, text, kind = "") {
    el.className = "tk-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  },

  /* ---- per-viewer storage (never required to work) ----
     Privacy rule (§ 25 TDDDG): tools only write here when the visitor
     explicitly asks for it (starring a favourite, ticking a "remember
     on this device" box). Everything else stays in memory for the
     current visit. All keys start with "bf_" and are listed in
     STORAGE_KEYS so the tools page can show and delete them. */
  store: {
    get(k, def) {
      try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
    has(k) { try { return localStorage.getItem(k) !== null; } catch (e) { return false; } },
  },
};

/* Everything the tools may keep on the visitor's device — and why. */
const STORAGE_KEYS = {
  bf_tools_fav: "favourite tools",
  bf_game_snake: "Snake high score",
  bf_game_breach: "Breach Protocol stats",
};

/* ============================================================
   Toolbox — lazy loading + registration of tool implementations
   ============================================================ */
const Toolbox = {
  impl: {},
  loading: {},
  define(id, render) { this.impl[id] = render; },
  load(file) {
    if (!this.loading[file]) {
      this.loading[file] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `${BASE}assets/js/tools/${file}.js`;
        s.onload = resolve;
        s.onerror = () => { delete this.loading[file]; reject(new Error(`could not load ${file}.js`)); };
        document.head.appendChild(s);
      });
    }
    return this.loading[file];
  },
  async get(meta) {
    for (const d of meta.deps || []) await this.load(d);
    await this.load(meta.group);
    const fn = this.impl[meta.id];
    if (!fn) throw new Error(`tool '${meta.id}' is not implemented`);
    return fn;
  },
};

/* ============================================================
   TOOLS PAGE — list, search, filters, favorites, router
   ============================================================ */
const FAV_KEY = "bf_tools_fav";
/* "Recently used" is only a convenience, so it lives in memory for this
   visit and is never written to the visitor's device. */
const RECENT = [];

function initToolsPage() {
  const indexEl  = document.getElementById("tools-index");
  const viewEl   = document.getElementById("tool-view");
  const listEl   = document.getElementById("tool-list");
  const catsEl   = document.getElementById("tool-cats");
  const tagsEl   = document.getElementById("tool-tags");
  const filterEl = document.getElementById("tool-filter");
  const recentEl = document.getElementById("tool-recent");
  const input    = document.getElementById("tool-search");
  const countEl  = document.getElementById("tool-count");
  const statsEl  = document.getElementById("tools-stats");
  const bodyEl   = document.getElementById("tool-body");
  if (!indexEl || !viewEl || !listEl) return;

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    cat: CAT_BY_ID[params.get("cat")] || params.get("cat") === "fav" ? params.get("cat") : "all",
    tag: params.get("tag") || "",
    showAllTags: false,
  };
  if (input) input.value = state.q;

  let favs = new Set(TK.store.get(FAV_KEY, []).filter(id => TOOL_BY_ID[id]));
  let cleanup = null;
  let openId = null;
  let listScroll = 0;

  /* ---- tag statistics ---- */
  const tagCount = {};
  TOOLS.forEach(t => t.tags.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; }));
  const allTags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a] || a.localeCompare(b));

  if (statsEl) {
    const net = TOOLS.filter(t => t.net).length;
    statsEl.innerHTML = `<b>${TOOLS.length}</b> tools · <b>${TOOLS.length - net}</b> fully offline`;
  }

  /* ---- search: every word must hit; hits are weighted ---- */
  function score(t, words) {
    let total = 0;
    const name = t.name.toLowerCase();
    const hay = { id: t.id, name, tags: t.tags.join(" "), kw: (t.kw || "").toLowerCase(), desc: t.desc.toLowerCase(),
                  cat: (CAT_BY_ID[t.cat] || {}).label.toLowerCase() };
    for (const w of words) {
      let s = 0;
      if (hay.id === w) s = 120;
      else if (name.startsWith(w)) s = 90;
      else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) s = 70;
      else if (name.includes(w)) s = 50;
      else if (t.tags.includes(w)) s = 45;
      else if (hay.tags.includes(w)) s = 35;
      else if (hay.kw.includes(w)) s = 25;
      else if (hay.cat.includes(w)) s = 15;
      else if (hay.desc.includes(w)) s = 10;
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function filtered() {
    const words = state.q.toLowerCase().split(/\s+/).map(w => w.replace(/^#/, "")).filter(Boolean);
    let items = TOOLS.slice();
    if (state.cat === "fav") items = items.filter(t => favs.has(t.id));
    else if (state.cat !== "all") items = items.filter(t => t.cat === state.cat);
    if (state.tag) items = items.filter(t => t.tags.includes(state.tag));
    if (words.length) {
      items = items.map(t => ({ t, s: score(t, words) })).filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s).map(x => x.t);
    }
    return items;
  }

  function tagBtn(tag, active, count) {
    return `<button type="button" class="tag${active ? " active" : ""}" data-tag="${esc(tag)}"
      aria-pressed="${!!active}">${esc(tag)}${count != null ? `<span class="tag-n">${count}</span>` : ""}</button>`;
  }

  function renderCats() {
    const counts = {};
    TOOLS.forEach(t => { counts[t.cat] = (counts[t.cat] || 0) + 1; });
    const tab = (id, label, n) =>
      `<button class="cat-tab${id === state.cat ? " active" : ""}" role="tab" aria-selected="${id === state.cat}"
        data-cat="${id}">${esc(label)}<span class="cat-count">${n}</span></button>`;
    catsEl.innerHTML = tab("all", "All", TOOLS.length) +
      TOOL_CATEGORIES.map(c => tab(c.id, c.label, counts[c.id] || 0)).join("") +
      (favs.size ? tab("fav", "★ Starred", favs.size) : "");
    if (state.cat === "fav" && !favs.size) state.cat = "all";
  }

  function renderTags() {
    const limit = state.showAllTags ? allTags.length : 22;
    const shown = allTags.slice(0, limit);
    if (state.tag && !shown.includes(state.tag)) shown.push(state.tag);
    tagsEl.innerHTML = shown.map(tag => tagBtn(tag, tag === state.tag, tagCount[tag])).join("") +
      (allTags.length > 22
        ? `<button type="button" class="tag tag-more" data-more="1">${state.showAllTags ? "less" : `+${allTags.length - 22} more`}</button>`
        : "");
  }

  function renderFilter() {
    const parts = [];
    if (state.tag) parts.push(`<span>filter:</span>${tagBtn(state.tag, true)}`);
    filterEl.hidden = !parts.length;
    filterEl.innerHTML = parts.join("");
  }

  function renderRecent() {
    const recent = RECENT.slice(0, 6);
    const show = recent.length && !state.q && !state.tag && state.cat === "all";
    recentEl.hidden = !show;
    recentEl.innerHTML = show ? `<span>recent:</span>` +
      recent.map(id => `<a href="#${id}" data-open="${id}">${esc(TOOL_BY_ID[id].name)}</a>`).join("") : "";
  }

  function rowHtml(t, i) {
    const cat = CAT_BY_ID[t.cat];
    const fav = favs.has(t.id);
    const flag = t.net ? `<span class="tool-flag net" title="Asks for your consent, then sends the looked-up name to a DNS-over-HTTPS resolver (Cloudflare or Google)">network · consent</span>`
      : t.game ? `<span class="tool-flag game">game</span>` : "";
    return `
      <div class="tool-row" role="listitem">
        <span class="tool-icon" aria-hidden="true">${esc(t.icon)}</span>
        <span class="tool-id">${String(i + 1).padStart(2, "0")} <b>${esc(cat.short)}/${esc(t.id)}</b></span>
        <span class="tool-main">
          <a class="tool-link" href="#${esc(t.id)}" data-open="${esc(t.id)}">${esc(t.name)}</a>${flag}
          <span class="tool-desc">${esc(t.desc)}</span>
        </span>
        <span class="tool-tags">${t.tags.map(tag => tagBtn(tag, tag === state.tag)).join("")}</span>
        <button type="button" class="tool-fav${fav ? " on" : ""}" data-fav="${esc(t.id)}"
          aria-pressed="${fav}" aria-label="${fav ? "Remove from" : "Add to"} favorites: ${esc(t.name)}"
          title="${fav ? "Unstar" : "Star — remembered in this browser only"}">${fav ? "★" : "☆"}</button>
      </div>`;
  }

  function renderList() {
    const items = filtered();
    const head = `<div class="tool-list-head" aria-hidden="true"><span></span><span>id</span><span>tool</span><span style="text-align:right">tags</span><span></span></div>`;
    listEl.innerHTML = items.length
      ? head + items.map(rowHtml).join("")
      : `<div class="tool-empty">// no tool matches${state.q ? ` '${esc(state.q)}'` : ""}${state.tag ? ` with #${esc(state.tag)}` : ""}.
          <br><br><button type="button" class="btn ghost small" data-reset="1">reset filters</button></div>`;
    const filteredNow = state.q || state.tag || state.cat !== "all";
    countEl.textContent = filteredNow ? `${items.length} FOUND` : "";
  }

  /* Transparency: say exactly what the tools keep on this device and
     offer a one-click delete (it is the visitor's data, not ours). */
  function renderStorage() {
    const el = document.getElementById("tool-storage");
    if (!el) return;
    const kept = Object.keys(STORAGE_KEYS).filter(k => TK.store.has(k));
    el.hidden = !kept.length;
    el.innerHTML = kept.length ? `saved in this browser only: ${kept.map(k => esc(STORAGE_KEYS[k])).join(", ")} —
      never sent anywhere. <button type="button" class="tk-copy" data-forget="1">forget all</button>` : "";
  }

  function renderIndex() {
    renderCats();
    renderTags();
    renderFilter();
    renderRecent();
    renderList();
    renderStorage();
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q.trim()) p.set("q", state.q.trim());
    if (state.cat !== "all") p.set("cat", state.cat);
    if (state.tag) p.set("tag", state.tag);
    const qs = p.toString();
    history.replaceState(history.state, "", (qs ? `?${qs}` : location.pathname) + location.hash);
  }

  function setTag(tag) {
    state.tag = state.tag === tag ? "" : tag;
    renderIndex();
    syncUrl();
  }

  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    if (favs.size) TK.store.set(FAV_KEY, [...favs]); else TK.store.del(FAV_KEY);
    if (openId === id) paintViewFav(id);
    renderIndex();
  }

  /* ---- index events ---- */
  indexEl.addEventListener("click", e => {
    const tagB = e.target.closest("[data-tag]");
    if (tagB) { e.preventDefault(); setTag(tagB.dataset.tag); return; }
    if (e.target.closest("[data-more]")) { state.showAllTags = !state.showAllTags; renderTags(); return; }
    const favB = e.target.closest("[data-fav]");
    if (favB) { e.preventDefault(); toggleFav(favB.dataset.fav); return; }
    const cat = e.target.closest("[data-cat]");
    if (cat) { state.cat = cat.dataset.cat; renderIndex(); syncUrl(); return; }
    if (e.target.closest("[data-reset]")) {
      state.q = ""; state.tag = ""; state.cat = "all";
      if (input) input.value = "";
      renderIndex(); syncUrl();
      return;
    }
    if (e.target.closest("[data-forget]")) {
      Object.keys(STORAGE_KEYS).forEach(k => TK.store.del(k));
      favs = new Set();
      if (state.cat === "fav") state.cat = "all";
      renderIndex(); syncUrl();
      TK.toast("all data stored by the tools was deleted from this browser");
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      navigate(open.dataset.open);
    }
  });

  if (input) {
    input.addEventListener("input", () => { state.q = input.value; renderFilter(); renderRecent(); renderList(); syncUrl(); });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const first = listEl.querySelector("[data-open]");
        if (first) navigate(first.dataset.open);
      } else if (e.key === "ArrowDown") {
        const first = listEl.querySelector(".tool-link");
        if (first) { e.preventDefault(); first.focus(); }
      } else if (e.key === "Escape" && input.value) {
        input.value = ""; state.q = ""; renderIndex(); syncUrl();
      }
    });
  }

  /* Arrow keys walk the result list; "/" jumps to the search box. */
  listEl.addEventListener("keydown", e => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = Array.from(listEl.querySelectorAll(".tool-link"));
    const i = links.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    if (e.key === "ArrowUp" && i === 0) { input.focus(); return; }
    const next = links[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) next.focus();
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!indexEl.hidden && input) { e.preventDefault(); input.focus(); input.select(); }
  });

  /* ---- tool view ---- */
  const viewFav = document.getElementById("tool-view-fav");
  function paintViewFav(id) {
    const on = favs.has(id);
    viewFav.textContent = on ? "★" : "☆";
    viewFav.classList.toggle("on", on);
    viewFav.setAttribute("aria-pressed", on);
    viewFav.setAttribute("aria-label", on ? "Remove from favorites" : "Add to favorites");
  }
  viewFav.addEventListener("click", () => { if (openId) toggleFav(openId); });

  document.getElementById("tool-back").addEventListener("click", e => {
    e.preventDefault();
    if (history.state && history.state.fromList) history.back();
    else { history.pushState(null, "", location.pathname + location.search); route(); }
  });

  viewEl.addEventListener("click", e => {
    const tagB = e.target.closest("[data-tag]");
    if (tagB) {
      e.preventDefault();
      state.tag = tagB.dataset.tag; state.q = ""; state.cat = "all";
      if (input) input.value = "";
      history.pushState(null, "", `${location.pathname}?tag=${encodeURIComponent(state.tag)}`);
      route();
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      navigate(open.dataset.open, true);
    }
  });

  function navigate(id, replace) {
    if (!TOOL_BY_ID[id]) return;
    if (replace) history.replaceState(history.state, "", `#${id}`);
    else history.pushState({ fromList: true }, "", `#${id}`);
    route();
  }

  function related(t) {
    return TOOLS.filter(o => o.id !== t.id)
      .map(o => ({ o, s: o.tags.filter(x => t.tags.includes(x)).length * 2 + (o.cat === t.cat ? 1 : 0) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(x => x.o);
  }

  async function openTool(id) {
    const t = TOOL_BY_ID[id];
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    if (!indexEl.hidden) listScroll = window.scrollY;
    openId = id;
    indexEl.hidden = true;
    viewEl.hidden = false;
    document.title = `Bugfish - ${t.name}`;

    const cat = CAT_BY_ID[t.cat];
    document.getElementById("tool-view-icon").textContent = t.icon;
    document.getElementById("tool-view-title").textContent = t.name;
    document.getElementById("tool-view-desc").textContent = t.desc;
    document.getElementById("tool-crumb-cat").textContent = cat.label.toLowerCase();
    document.getElementById("tool-crumb-id").textContent = t.id;
    document.getElementById("tool-view-tags").innerHTML =
      (t.net
        ? `<a class="tool-privacy net" href="privacy.html#tools" title="Nothing is sent until you consent. Then only the name you look up (plus your IP address) goes to the resolver you choose.">network · only with your consent</a>`
        : `<span class="tool-privacy" title="Nothing you enter leaves this page.">runs 100% locally</span>`) +
      t.tags.map(tag => tagBtn(tag, false)).join("");
    paintViewFav(id);

    const rel = related(t);
    const relEl = document.getElementById("tool-related");
    relEl.hidden = !rel.length;
    document.getElementById("tool-related-grid").innerHTML = rel.map(o =>
      `<a href="#${o.id}" data-open="${o.id}"><span class="tool-icon">${esc(o.icon)}</span><span>${esc(o.name)}</span></a>`).join("");

    const at = RECENT.indexOf(id);
    if (at >= 0) RECENT.splice(at, 1);
    RECENT.unshift(id);
    RECENT.length = Math.min(RECENT.length, 8);

    window.scrollTo({ top: 0, behavior: "instant" });
    bodyEl.innerHTML = `<div class="tool-loading">// loading ${esc(t.id)}...<span class="blink">_</span></div>`;
    try {
      const render = await Toolbox.get(t);
      if (openId !== id) return; // visitor moved on while loading
      bodyEl.innerHTML = "";
      const root = document.createElement("div");
      root.className = "tk";
      bodyEl.appendChild(root);
      TK.bindCopy(root);
      const res = render(root, t);
      cleanup = typeof res === "function" ? res : null;
    } catch (err) {
      console.error(err);
      if (openId !== id) return;
      bodyEl.innerHTML = `<div class="load-error">// could not start this tool: ${esc(err.message)}<br>
        If you opened the page from disk, run a local web server or view it on GitHub Pages.</div>`;
    }
  }

  function showIndex() {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    openId = null;
    bodyEl.innerHTML = "";
    viewEl.hidden = true;
    indexEl.hidden = false;
    document.title = "Bugfish - Tools";
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") || "";
    state.tag = p.get("tag") || "";
    state.cat = CAT_BY_ID[p.get("cat")] || p.get("cat") === "fav" ? p.get("cat") : "all";
    if (input) input.value = state.q;
    renderIndex();
    requestAnimationFrame(() => window.scrollTo({ top: listScroll, behavior: "instant" }));
  }

  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && TOOL_BY_ID[id]) { if (openId !== id) openTool(id); }
    else if (openId !== null || indexEl.hidden || !listEl.querySelector(".tool-row")) showIndex();
  }

  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);
  route();
}

document.addEventListener("DOMContentLoaded", initToolsPage);
