/* ============================================================
   BUGFISH TOOLS — design.js
   Color converter & contrast, palette generator, CSS gradient
   and box-shadow builders, image converter and the QR code UI
   (encoder in qrlib.js).
   ============================================================ */

/* ------------------------------------------------------------
   Color math. Internal format: { r, g, b, a } with r/g/b in 0..255.
   OKLab / OKLCH after Björn Ottosson.
   ------------------------------------------------------------ */
const COLOR = (() => {
  const px = document.createElement("canvas");
  px.width = px.height = 1;
  const cx = px.getContext("2d", { willReadFrequently: true });
  const clamp = (v, a = 0, b = 255) => Math.min(b, Math.max(a, v));
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const gam = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

  function parse(str) {
    const s = String(str).trim();
    if (!s) return null;
    cx.fillStyle = "#010203";
    cx.fillStyle = s;
    const a1 = cx.fillStyle;
    cx.fillStyle = "#fefdfc";
    cx.fillStyle = s;
    if (a1 !== cx.fillStyle) return null; // invalid → both defaults survived
    const n = cx.fillStyle;
    let m;
    if ((m = /^#([0-9a-f]{6})$/i.exec(n))) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4), 16), a: 1 };
    if ((m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(n))) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
    // wide-gamut syntaxes (oklch(), color(), lab()) — let the canvas convert to sRGB
    cx.clearRect(0, 0, 1, 1);
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: Math.round((d[3] / 255) * 100) / 100 };
  }
  const hex2 = v => Math.round(clamp(v)).toString(16).padStart(2, "0");
  const hex = (c, alpha) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${alpha && c.a < 1 ? hex2(c.a * 255) : ""}`;
  function hsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h, s: s * 100, l: l * 100 };
  }
  function fromHsl(h, s, l, a = 1) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, f = n => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
  }
  function oklab(c) {
    const r = lin(c.r), g = lin(c.g), b = lin(c.b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s };
  }
  function fromOklabRaw(L, A, B) {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  const oklch = c => { const o = oklab(c); return { L: o.L, C: Math.hypot(o.A, o.B), H: ((Math.atan2(o.B, o.A) * 180) / Math.PI + 360) % 360 }; };
  /* OKLCH → sRGB, reducing chroma until the color fits the sRGB gamut. */
  function fromOklch(L, C, H, a = 1) {
    const h = (H * Math.PI) / 180;
    let lo = 0, hi = C, rgb = fromOklabRaw(L, C * Math.cos(h), C * Math.sin(h));
    const inGamut = v => v.every(x => x >= -0.0005 && x <= 1.0005);
    if (!inGamut(rgb)) {
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const t = fromOklabRaw(L, mid * Math.cos(h), mid * Math.sin(h));
        if (inGamut(t)) { lo = mid; rgb = t; } else hi = mid;
      }
      rgb = fromOklabRaw(L, lo * Math.cos(h), lo * Math.sin(h));
    }
    return { r: clamp(gam(clamp(rgb[0], 0, 1))), g: clamp(gam(clamp(rgb[1], 0, 1))), b: clamp(gam(clamp(rgb[2], 0, 1))), a };
  }
  const luminance = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const r1 = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
  function formats(c) {
    const h = hsl(c), ok = oklab(c), lch = oklch(c);
    const w = Math.min(c.r, c.g, c.b) / 2.55, bl = 100 - Math.max(c.r, c.g, c.b) / 2.55;
    const k = 1 - Math.max(c.r, c.g, c.b) / 255;
    const cm = x => (k >= 1 ? 0 : Math.round(((1 - x / 255 - k) / (1 - k)) * 100));
    const al = c.a < 1 ? ` / ${r1(c.a, 2)}` : "";
    return [
      ["HEX", hex(c, false)], ["HEX + alpha", hex(c, true)],
      ["RGB", `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)}${al})`], ["RGB (legacy)", c.a < 1 ? `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${r1(c.a, 2)})` : `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`],
      ["HSL", `hsl(${r1(h.h)} ${r1(h.s)}% ${r1(h.l)}%${al})`], ["HWB", `hwb(${r1(h.h)} ${r1(w)}% ${r1(bl)}%${al})`],
      ["OKLCH", `oklch(${r1(lch.L * 100, 2)}% ${r1(lch.C, 4)} ${r1(lch.H, 2)}${al})`], ["OKLab", `oklab(${r1(ok.L * 100, 2)}% ${r1(ok.A, 4)} ${r1(ok.B, 4)}${al})`],
      ["CMYK", `cmyk(${cm(c.r)}%, ${cm(c.g)}%, ${cm(c.b)}%, ${Math.round(k * 100)}%)`],
      ["Integer (ARGB)", `0x${hex2(c.a * 255)}${hex(c).slice(1)}`.toUpperCase().replace("0X", "0x")],
    ];
  }
  return { parse, hex, hsl, fromHsl, oklab, oklch, fromOklch, luminance, contrast, formats };
})();

/* ============================================================
   Color converter & contrast checker
   ============================================================ */
Toolbox.define("color", root => {
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <h3 class="tk-h">// convert</h3>
        <div class="tk-row">
          <input type="color" class="tk-input" id="co-pick" value="#ff6600" style="width:64px">
          <input class="tk-input tk-grow" id="co-in" value="#ff6600" spellcheck="false" placeholder="any CSS color: #f60, rgb(), hsl(), oklch(), tomato">
        </div>
        <label class="tk-field" style="margin-top:12px"><span class="tk-label">Alpha <em id="co-a-v">100%</em></span><input type="range" id="co-a" min="0" max="100" value="100"></label>
        <div class="tk-swatch" id="co-sw" style="margin-top:12px;background-image:linear-gradient(var(--c),var(--c)),repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%);background-size:auto,16px 16px"></div>
        <div class="tk-msg" id="co-msg" style="margin-top:10px"></div>
        <div id="co-out" style="margin-top:12px"></div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// WCAG contrast</h3>
        <div class="tk-grid two">
          <label class="tk-field"><span class="tk-label">Text</span><div class="tk-row tight"><input type="color" class="tk-input" id="ct-fgp" value="#ff8533" style="width:52px"><input class="tk-input tk-grow" id="ct-fg" value="#ff8533"></div></label>
          <label class="tk-field"><span class="tk-label">Background</span><div class="tk-row tight"><input type="color" class="tk-input" id="ct-bgp" value="#101115" style="width:52px"><input class="tk-input tk-grow" id="ct-bg" value="#101115"></div></label>
        </div>
        <div id="ct-demo" style="margin-top:14px;border-radius:9px;padding:18px;border:1px solid var(--border2)">
          <div style="font-size:24px;font-weight:700">Large heading 24px</div>
          <div style="font-size:15px">Normal body text at 15px — the quick brown fox jumps over the lazy dog.</div>
        </div>
        <div class="tk-out big" id="ct-ratio" style="margin-top:12px"></div>
        <div id="ct-res" style="margin-top:10px"></div>
        <div class="tk-row" style="margin-top:10px"><button class="btn ghost small" id="ct-fix" type="button">Fix text color (≥ 4.5)</button>
          <button class="btn ghost small" id="ct-swap" type="button">⇄ swap</button></div>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  let cur = COLOR.parse("#ff6600");

  function show(c, fromPicker) {
    if (!c) { TK.msg($("#co-msg"), "not a color this browser understands", "err"); return; }
    TK.msg($("#co-msg"), "");
    cur = c;
    if (!fromPicker) $("#co-pick").value = COLOR.hex(c);
    $("#co-a").value = Math.round(c.a * 100);
    $("#co-a-v").textContent = `${Math.round(c.a * 100)}%`;
    const f = COLOR.formats(c);
    $("#co-sw").style.setProperty("--c", f[3][1]);
    const vsW = COLOR.contrast(c, { r: 255, g: 255, b: 255 }), vsB = COLOR.contrast(c, { r: 0, g: 0, b: 0 });
    $("#co-out").innerHTML = TK.kv(f.concat([["CSS variable", `--color: ${f[0][1]};`], ["contrast vs white / black", `${vsW.toFixed(2)} : 1  /  ${vsB.toFixed(2)} : 1`, false]]));
  }
  $("#co-in").addEventListener("input", () => show(COLOR.parse($("#co-in").value)));
  $("#co-pick").addEventListener("input", () => { const c = COLOR.parse($("#co-pick").value); c.a = +$("#co-a").value / 100; $("#co-in").value = $("#co-pick").value; show(c, true); });
  $("#co-a").addEventListener("input", () => { cur.a = +$("#co-a").value / 100; show(cur); $("#co-in").value = COLOR.formats(cur)[cur.a < 1 ? 1 : 0][1]; });

  function contrast() {
    const fg = COLOR.parse($("#ct-fg").value), bg = COLOR.parse($("#ct-bg").value);
    if (!fg || !bg) { $("#ct-ratio").textContent = "invalid color"; return; }
    $("#ct-demo").style.color = COLOR.hex(fg);
    $("#ct-demo").style.background = COLOR.hex(bg);
    const r = COLOR.contrast(fg, bg);
    $("#ct-ratio").textContent = `${(Math.floor(r * 100) / 100).toFixed(2)} : 1`;
    const row = (label, need) => `<div class="tk-row" style="justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span>${label}</span><span class="tk-badge ${r >= need ? "ok" : "err"}">${r >= need ? "pass" : "fail"} · ${need}:1</span></div>`;
    $("#ct-res").innerHTML = row("AA normal text", 4.5) + row("AA large text (≥ 24px / 18.66px bold)", 3) + row("AAA normal text", 7) + row("AAA large text", 4.5) + row("UI components & graphics", 3);
  }
  const sync = (txt, pick) => {
    $(txt).addEventListener("input", () => { const c = COLOR.parse($(txt).value); if (c) $(pick).value = COLOR.hex(c); contrast(); });
    $(pick).addEventListener("input", () => { $(txt).value = $(pick).value; contrast(); });
  };
  sync("#ct-fg", "#ct-fgp");
  sync("#ct-bg", "#ct-bgp");
  $("#ct-swap").addEventListener("click", () => { const a = $("#ct-fg").value; $("#ct-fg").value = $("#ct-bg").value; $("#ct-bg").value = a; $("#ct-fgp").value = COLOR.hex(COLOR.parse($("#ct-fg").value)); $("#ct-bgp").value = COLOR.hex(COLOR.parse($("#ct-bg").value)); contrast(); });
  $("#ct-fix").addEventListener("click", () => {
    const fg = COLOR.parse($("#ct-fg").value), bg = COLOR.parse($("#ct-bg").value);
    if (!fg || !bg || COLOR.contrast(fg, bg) >= 4.5) { TK.toast("already passes AA"); return; }
    // move the text color's OKLCH lightness away from the background until 4.5:1
    const o = COLOR.oklch(fg), lighter = COLOR.luminance(bg) < 0.18;
    let lo = o.L, hi = lighter ? 1 : 0, best = null;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2, c = COLOR.fromOklch(mid, o.C, o.H);
      if (COLOR.contrast(c, bg) >= 4.55) { best = c; hi = mid; } else lo = mid;
    }
    best = best || COLOR.fromOklch(lighter ? 1 : 0, 0, 0);
    $("#ct-fg").value = COLOR.hex(best);
    $("#ct-fgp").value = COLOR.hex(best);
    contrast();
  });
  show(cur);
  contrast();
});

/* ============================================================
   Palette generator
   ============================================================ */
Toolbox.define("palette", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        ${TK.segHtml("pl-src", [["color", "From a color"], ["image", "From an image"]], "color")}
        <span id="pl-color-in" class="tk-row tight"><input type="color" class="tk-input" id="pl-pick" value="#ff6600" style="width:56px">
          <input class="tk-input" id="pl-base" value="#ff6600" style="width:140px" spellcheck="false">
          <button class="btn ghost small" id="pl-rand" type="button">random</button></span>
        <label class="tk-field" style="width:140px"><span class="tk-label">Name</span><input class="tk-input" id="pl-name" value="brand" spellcheck="false"></label>
      </div>
      <div id="pl-img-in" style="margin-top:14px" hidden><div class="tk-drop" id="pl-drop"><b>drop an image</b> — dominant colors are found with k-means in OKLab, locally</div></div>
    </section>
    <section class="tk-panel" id="pl-scale-p"><h3 class="tk-h">// tints &amp; shades (OKLCH)</h3><div class="tk-grid" id="pl-scale" style="grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:8px"></div></section>
    <section class="tk-panel" id="pl-harm-p"><h3 class="tk-h">// harmonies</h3><div id="pl-harm"></div></section>
    <section class="tk-panel" id="pl-img-p" hidden><h3 class="tk-h">// extracted palette</h3><div class="tk-grid" id="pl-img" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px"></div></section>
    <section class="tk-panel"><div class="tk-row">${TK.segHtml("pl-exp", [["css", "CSS variables"], ["scss", "SCSS"], ["tw", "Tailwind"], ["json", "JSON"]], "css")}${TK.copyBtn("#pl-out")}</div>
      <textarea class="tk-textarea" id="pl-out" readonly spellcheck="false" style="margin-top:12px"></textarea></section>`;
  const $ = s => root.querySelector(s);
  const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const LS = [0.975, 0.94, 0.885, 0.81, 0.72, 0.635, 0.55, 0.47, 0.39, 0.31, 0.23];
  let src = "color", exp = "css", scale = [], extracted = [];
  const sw = (hex, label, extra = "") => `<div><div class="tk-swatch" style="background:${hex};height:56px" data-hex="${hex}" title="click to copy ${hex}"></div>
    <div style="font-family:var(--mono);font-size:11px;margin-top:4px;display:flex;justify-content:space-between;gap:4px"><span class="tk-dim">${esc(label)}</span><span>${hex}</span></div>${extra}</div>`;

  function fromColor() {
    const base = COLOR.parse($("#pl-base").value);
    if (!base) return;
    const o = COLOR.oklch(base);
    scale = STEPS.map((s, i) => {
      const t = Math.abs(LS[i] - 0.6) / 0.4; // 0 in the middle, 1 at the ends
      return [s, COLOR.hex(COLOR.fromOklch(LS[i], o.C * (1 - 0.65 * t * t), o.H))];
    });
    $("#pl-scale").innerHTML = scale.map(([s, h]) => sw(h, s)).join("");
    const rot = d => COLOR.hex(COLOR.fromOklch(o.L, o.C, (o.H + d + 360) % 360));
    const harm = [["complementary", [0, 180]], ["analogous", [-30, 0, 30]], ["split complementary", [0, 150, 210]], ["triadic", [0, 120, 240]], ["tetradic", [0, 90, 180, 270]]];
    const mono = [0.3, 0.45, o.L, 0.75, 0.9].map(l => COLOR.hex(COLOR.fromOklch(l, o.C, o.H)));
    $("#pl-harm").innerHTML = harm.concat([["monochromatic", null]]).map(([n, ds]) => `<div style="margin-bottom:12px"><div class="tk-label" style="margin-bottom:6px">${n}</div>
      <div class="tk-grid" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px">${(ds ? ds.map(rot) : mono).map(h => sw(h, "")).join("")}</div></div>`).join("");
    exportIt();
  }

  function kmeans(img) {
    const c = document.createElement("canvas");
    const k = Math.min(1, 96 / Math.max(img.width, img.height));
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const pts = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 127) { const o = COLOR.oklab({ r: d[i], g: d[i + 1], b: d[i + 2] }); pts.push([o.L, o.A, o.B, d[i], d[i + 1], d[i + 2]]); }
    if (!pts.length) return [];
    const K = Math.min(6, pts.length);
    const dist = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    // k-means++ seeding (deterministic: farthest-point)
    const cent = [pts[Math.floor(pts.length / 2)].slice(0, 3)];
    while (cent.length < K) {
      let best = null, bd = -1;
      for (const p of pts) { const md = Math.min(...cent.map(q => dist(p, q))); if (md > bd) { bd = md; best = p; } }
      cent.push(best.slice(0, 3));
    }
    let assign = new Array(pts.length).fill(0);
    for (let it = 0; it < 12; it++) {
      assign = pts.map(p => { let bi = 0, bd = Infinity; cent.forEach((q, i) => { const dd = dist(p, q); if (dd < bd) { bd = dd; bi = i; } }); return bi; });
      cent.forEach((q, i) => {
        const mem = pts.filter((_, j) => assign[j] === i);
        if (mem.length) for (let z = 0; z < 3; z++) q[z] = mem.reduce((s, p) => s + p[z], 0) / mem.length;
      });
    }
    return cent.map((q, i) => {
      const mem = pts.filter((_, j) => assign[j] === i);
      if (!mem.length) return null;
      const avg = z => mem.reduce((s, p) => s + p[z], 0) / mem.length;
      return { hex: COLOR.hex({ r: avg(3), g: avg(4), b: avg(5) }), share: mem.length / pts.length };
    }).filter(Boolean).sort((a, b) => b.share - a.share);
  }

  function exportIt() {
    const name = $("#pl-name").value.trim().replace(/\W+/g, "-") || "brand";
    const entries = src === "color" ? scale.map(([s, h]) => [String(s), h]) : extracted.map((e, i) => [String(i + 1), e.hex]);
    const out = {
      css: `:root {\n${entries.map(([k, h]) => `  --${name}-${k}: ${h};`).join("\n")}\n}`,
      scss: entries.map(([k, h]) => `$${name}-${k}: ${h};`).join("\n"),
      tw: `// tailwind.config.js → theme.extend.colors\n${name.replace(/-/g, "_")}: {\n${entries.map(([k, h]) => `  ${/^\d+$/.test(k) ? k : `'${k}'`}: '${h}',`).join("\n")}\n},`,
      json: JSON.stringify({ [name]: Object.fromEntries(entries) }, null, 2),
    }[exp];
    $("#pl-out").value = out;
  }

  TK.seg($("#pl-src"), v => {
    src = v;
    $("#pl-color-in").hidden = v !== "color";
    $("#pl-img-in").hidden = v !== "image";
    $("#pl-scale-p").hidden = v !== "color";
    $("#pl-harm-p").hidden = v !== "color";
    $("#pl-img-p").hidden = v !== "image" || !extracted.length;
    exportIt();
  });
  TK.seg($("#pl-exp"), v => { exp = v; exportIt(); });
  $("#pl-base").addEventListener("input", () => { const c = COLOR.parse($("#pl-base").value); if (c) { $("#pl-pick").value = COLOR.hex(c); fromColor(); } });
  $("#pl-pick").addEventListener("input", () => { $("#pl-base").value = $("#pl-pick").value; fromColor(); });
  $("#pl-rand").addEventListener("click", () => { const h = COLOR.hex(COLOR.fromOklch(0.55 + Math.random() * 0.2, 0.08 + Math.random() * 0.14, Math.random() * 360)); $("#pl-base").value = h; $("#pl-pick").value = h; fromColor(); });
  $("#pl-name").addEventListener("input", exportIt);
  TK.drop($("#pl-drop"), files => {
    const img = new Image();
    img.onload = () => {
      extracted = kmeans(img);
      $("#pl-drop").innerHTML = `<b>${esc(files[0].name)}</b> — drop another image to replace`;
      $("#pl-img").innerHTML = extracted.map((e, i) => sw(e.hex, `#${i + 1}`, `<div class="tk-note">${Math.round(e.share * 100)} % of pixels</div>`)).join("");
      $("#pl-img-p").hidden = false;
      exportIt();
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(files[0]);
  }, "image/*");
  root.addEventListener("click", async e => {
    const s = e.target.closest("[data-hex]");
    if (s && await TK.copy(s.dataset.hex)) TK.toast(`copied ${s.dataset.hex}`);
  });
  fromColor();
});

/* ============================================================
   CSS gradient generator
   ============================================================ */
Toolbox.define("gradient", root => {
  const PRESETS = [
    ["Bugfish ember", "linear", 135, [["#ff6600", 0], ["#c0202a", 100]]],
    ["Night sky", "linear", 180, [["#0f2027", 0], ["#203a43", 50], ["#2c5364", 100]]],
    ["Aurora", "linear", 120, [["#00c9a7", 0], ["#845ec2", 60], ["#ff6f91", 100]]],
    ["Sunset", "linear", 90, [["#ff9a8b", 0], ["#ff6a88", 55], ["#ff99ac", 100]]],
    ["Spotlight", "radial", 0, [["#ffffff", 0], ["#35c9f0", 35], ["#0a0b0d", 100]]],
    ["Color wheel", "conic", 0, [["#ff0000", 0], ["#ffff00", 17], ["#00ff00", 33], ["#00ffff", 50], ["#0000ff", 67], ["#ff00ff", 83], ["#ff0000", 100]]],
  ];
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <div class="tk-row">${TK.segHtml("gr-type", [["linear", "Linear"], ["radial", "Radial"], ["conic", "Conic"]], "linear")}
          <label class="tk-check"><input type="checkbox" id="gr-rep"> repeating</label></div>
        <div class="tk-grid two" style="margin-top:14px">
          <label class="tk-field" id="gr-angle-f"><span class="tk-label">Angle <em id="gr-angle-v"></em></span><input type="range" id="gr-angle" min="0" max="360" value="135"></label>
          <label class="tk-field" id="gr-shape-f" hidden><span class="tk-label">Shape</span><select class="tk-select" id="gr-shape"><option value="circle">circle</option><option value="ellipse">ellipse</option></select></label>
          <label class="tk-field" id="gr-px-f" hidden><span class="tk-label">Center X <em id="gr-px-v"></em></span><input type="range" id="gr-px" min="0" max="100" value="50"></label>
          <label class="tk-field" id="gr-py-f" hidden><span class="tk-label">Center Y <em id="gr-py-v"></em></span><input type="range" id="gr-py" min="0" max="100" value="50"></label>
        </div>
        <h3 class="tk-h">// color stops</h3>
        <div id="gr-stops" class="tk-grid" style="grid-template-columns:1fr;gap:8px"></div>
        <div class="tk-row" style="margin-top:10px"><button class="btn ghost small" id="gr-add" type="button">+ stop</button>
          <select class="tk-select" id="gr-preset" style="width:auto"><option value="">presets…</option>${PRESETS.map((p, i) => `<option value="${i}">${p[0]}</option>`).join("")}</select></div>
      </section>
      <section class="tk-panel">
        <div id="gr-prev" style="height:260px;border-radius:10px;border:1px solid var(--border2)"></div>
        <h3 class="tk-h">// css</h3>
        <pre class="tk-out" id="gr-out"></pre>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#gr-out")}</div>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  let type = "linear", stops = [["#ff6600", 0], ["#c0202a", 100]];
  const typeSeg = TK.seg($("#gr-type"), v => { type = v; paintStops(); run(); });
  function paintStops() {
    $("#gr-stops").innerHTML = stops.map(([c, p], i) => `<div class="tk-row tight" style="flex-wrap:nowrap">
      <input type="color" class="tk-input" data-i="${i}" data-k="c" value="${c}" style="width:52px;flex-shrink:0">
      <input type="range" data-i="${i}" data-k="p" min="0" max="100" value="${p}" style="flex:1">
      <span class="tk-note" style="width:38px;text-align:right">${p}%</span>
      <button class="tk-copy" type="button" data-del="${i}" ${stops.length <= 2 ? "disabled" : ""}>✕</button></div>`).join("");
    $("#gr-angle-f").hidden = type === "radial";
    $("#gr-shape-f").hidden = type !== "radial";
    $("#gr-px-f").hidden = $("#gr-py-f").hidden = type === "linear";
  }
  function css() {
    const list = stops.slice().sort((a, b) => a[1] - b[1]).map(([c, p]) => `${c} ${p}%`).join(", ");
    const pos = `at ${$("#gr-px").value}% ${$("#gr-py").value}%`;
    const rep = $("#gr-rep").checked ? "repeating-" : "";
    if (type === "linear") return `${rep}linear-gradient(${$("#gr-angle").value}deg, ${list})`;
    if (type === "radial") return `${rep}radial-gradient(${$("#gr-shape").value} ${pos}, ${list})`;
    return `${rep}conic-gradient(from ${$("#gr-angle").value}deg ${pos}, ${list})`;
  }
  function run() {
    $("#gr-angle-v").textContent = `${$("#gr-angle").value}°`;
    $("#gr-px-v").textContent = `${$("#gr-px").value}%`;
    $("#gr-py-v").textContent = `${$("#gr-py").value}%`;
    const g = css();
    $("#gr-prev").style.background = g;
    $("#gr-out").textContent = `background-color: ${stops[0][0]}; /* fallback */\nbackground-image: ${g};`;
  }
  $("#gr-stops").addEventListener("input", e => {
    const t = e.target, i = +t.dataset.i;
    if (t.dataset.k === "c") stops[i][0] = t.value;
    else { stops[i][1] = +t.value; t.nextElementSibling.textContent = `${t.value}%`; }
    run();
  });
  $("#gr-stops").addEventListener("click", e => { const d = e.target.closest("[data-del]"); if (d && stops.length > 2) { stops.splice(+d.dataset.del, 1); paintStops(); run(); } });
  $("#gr-add").addEventListener("click", () => {
    const s = stops.slice().sort((a, b) => a[1] - b[1]);
    let gap = 0, at = 50;
    for (let i = 1; i < s.length; i++) if (s[i][1] - s[i - 1][1] > gap) { gap = s[i][1] - s[i - 1][1]; at = Math.round((s[i][1] + s[i - 1][1]) / 2); }
    stops.push(["#35c9f0", at]);
    paintStops(); run();
  });
  $("#gr-preset").addEventListener("change", () => {
    const p = PRESETS[+$("#gr-preset").value];
    if (!p) return;
    stops = p[3].map(s => s.slice());
    $("#gr-angle").value = p[2];
    typeSeg.set(p[1]);
    $("#gr-preset").value = "";
  });
  ["#gr-angle", "#gr-px", "#gr-py", "#gr-shape", "#gr-rep"].forEach(s => $(s).addEventListener("input", run));
  paintStops();
  run();
});

/* ============================================================
   CSS box-shadow generator
   ============================================================ */
Toolbox.define("shadow", root => {
  const PRESETS = {
    soft: [[0, 10, 30, -5, "#000000", 35, false]],
    layered: [[0, 1, 2, 0, "#000000", 30, false], [0, 4, 8, 0, "#000000", 22, false], [0, 12, 24, 0, "#000000", 18, false], [0, 24, 48, 0, "#000000", 14, false]],
    glow: [[0, 0, 24, 2, "#ff6600", 60, false], [0, 0, 4, 1, "#ff6600", 80, false]],
    hard: [[8, 8, 0, 0, "#ff6600", 100, false]],
    inset: [[0, 2, 6, 0, "#000000", 60, true]],
    neumorph: [[8, 8, 16, 0, "#000000", 55, false], [-8, -8, 16, 0, "#2a2c33", 60, false]],
  };
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <div class="tk-row"><div class="tk-row tight" id="sh-tabs"></div><button class="btn ghost small" id="sh-add" type="button">+ layer</button>
          <select class="tk-select" id="sh-preset" style="width:auto"><option value="">presets…</option>${Object.keys(PRESETS).map(k => `<option>${k}</option>`).join("")}</select></div>
        <div class="tk-grid two" style="margin-top:14px" id="sh-ctl">
          ${[["x", "Offset X", -100, 100], ["y", "Offset Y", -100, 100], ["blur", "Blur", 0, 150], ["spread", "Spread", -60, 60], ["op", "Opacity %", 0, 100]]
            .map(([k, l, a, b]) => `<label class="tk-field"><span class="tk-label">${l} <em data-v="${k}"></em></span><input type="range" data-k="${k}" min="${a}" max="${b}"></label>`).join("")}
          <label class="tk-field"><span class="tk-label">Color</span><input type="color" class="tk-input" data-k="color"></label>
          <label class="tk-check"><input type="checkbox" data-k="inset"> inset</label>
          <button class="btn ghost small" id="sh-del" type="button">remove layer</button>
        </div>
        <h3 class="tk-h">// preview</h3>
        <div class="tk-grid three">
          <label class="tk-field"><span class="tk-label">Box</span><input type="color" class="tk-input" id="sh-box" value="#1e2026"></label>
          <label class="tk-field"><span class="tk-label">Background</span><input type="color" class="tk-input" id="sh-bg" value="#16171c"></label>
          <label class="tk-field"><span class="tk-label">Radius <em id="sh-rad-v"></em></span><input type="range" id="sh-rad" min="0" max="120" value="16"></label>
        </div>
      </section>
      <section class="tk-panel">
        <div id="sh-stage" style="height:300px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border2)">
          <div id="sh-el" style="width:160px;height:160px"></div></div>
        <h3 class="tk-h">// css</h3>
        <pre class="tk-out" id="sh-out"></pre>
        <div class="tk-row" style="margin-top:8px">${TK.copyBtn("#sh-out")}</div>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  let layers = PRESETS.layered.map(l => l.slice()), sel = 0;
  const rgba = (hex, op) => { const c = COLOR.parse(hex); return `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.round(op) / 100})`; };
  const layerCss = ([x, y, b, s, c, op, ins]) => `${ins ? "inset " : ""}${x}px ${y}px ${b}px ${s}px ${rgba(c, op)}`;
  function tabs() {
    $("#sh-tabs").innerHTML = layers.map((_, i) => `<button type="button" class="btn small ${i === sel ? "" : "ghost"}" data-l="${i}">${i + 1}</button>`).join("");
    const L = layers[sel];
    const keys = ["x", "y", "blur", "spread", "color", "op", "inset"];
    const val = { x: L[0], y: L[1], blur: L[2], spread: L[3], color: L[4], op: L[5], inset: L[6] };
    keys.forEach(k => { const el = root.querySelector(`[data-k="${k}"]`); if (k === "inset") el.checked = val[k]; else el.value = val[k]; });
    $("#sh-del").disabled = layers.length < 2;
  }
  function run() {
    const L = layers[sel];
    ["x", "y", "blur", "spread", "op"].forEach((k, i) => { root.querySelector(`[data-v="${k}"]`).textContent = k === "op" ? `${L[5]}%` : `${L[[0, 1, 2, 3][i]]}px`; });
    const css = layers.map(layerCss).join(",\n            ");
    $("#sh-el").style.boxShadow = layers.map(layerCss).join(", ");
    $("#sh-el").style.background = $("#sh-box").value;
    $("#sh-el").style.borderRadius = `${$("#sh-rad").value}px`;
    $("#sh-stage").style.background = $("#sh-bg").value;
    $("#sh-rad-v").textContent = `${$("#sh-rad").value}px`;
    $("#sh-out").textContent = `box-shadow: ${css};\nborder-radius: ${$("#sh-rad").value}px;`;
  }
  $("#sh-ctl").addEventListener("input", e => {
    const k = e.target.dataset.k;
    if (!k) return;
    const L = layers[sel];
    const idx = { x: 0, y: 1, blur: 2, spread: 3, color: 4, op: 5, inset: 6 }[k];
    L[idx] = k === "inset" ? e.target.checked : k === "color" ? e.target.value : +e.target.value;
    run();
  });
  $("#sh-tabs").addEventListener("click", e => { const b = e.target.closest("[data-l]"); if (b) { sel = +b.dataset.l; tabs(); run(); } });
  $("#sh-add").addEventListener("click", () => { layers.push([0, 6, 18, 0, "#000000", 30, false]); sel = layers.length - 1; tabs(); run(); });
  $("#sh-del").addEventListener("click", () => { if (layers.length > 1) { layers.splice(sel, 1); sel = Math.max(0, sel - 1); tabs(); run(); } });
  $("#sh-preset").addEventListener("change", () => { const p = PRESETS[$("#sh-preset").value]; if (!p) return; layers = p.map(l => l.slice()); sel = 0; $("#sh-preset").value = ""; tabs(); run(); });
  ["#sh-box", "#sh-bg", "#sh-rad"].forEach(s => $(s).addEventListener("input", run));
  tabs();
  run();
});

/* ============================================================
   Image converter & compressor
   ============================================================ */
Toolbox.define("image", root => {
  const canEncode = type => { const c = document.createElement("canvas"); c.width = c.height = 1; return c.toDataURL(type).startsWith(`data:${type}`); };
  const formats = [["image/webp", "WebP"], ["image/jpeg", "JPEG"], ["image/png", "PNG"], ["image/avif", "AVIF"]].filter(([t]) => canEncode(t));
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-grid narrow">
        <label class="tk-field"><span class="tk-label">Format</span><select class="tk-select" id="im-fmt">${formats.map(([t, l]) => `<option value="${t}">${l}</option>`).join("")}</select></label>
        <label class="tk-field"><span class="tk-label">Quality <em id="im-q-v">82</em></span><input type="range" id="im-q" min="10" max="100" value="82"></label>
        <label class="tk-field"><span class="tk-label">Max width</span><input class="tk-input" id="im-w" type="number" min="0" placeholder="keep"></label>
        <label class="tk-field"><span class="tk-label">Max height</span><input class="tk-input" id="im-h" type="number" min="0" placeholder="keep"></label>
        <label class="tk-field"><span class="tk-label">JPEG background</span><input type="color" class="tk-input" id="im-bg" value="#ffffff"></label>
      </div>
      <div class="tk-drop" id="im-drop" style="margin-top:14px"><b>drop images</b> or click — they never leave your device. EXIF / GPS metadata is stripped on re-encode.</div>
      <div class="tk-row" style="margin-top:12px"><button class="btn" id="im-zip" type="button" disabled>Download all (.zip)</button><span class="tk-note" id="im-sum"></span></div>
    </section>
    <section class="tk-panel"><div class="tk-scroll"><table class="tk-table"><thead><tr><th>preview</th><th>file</th><th>original</th><th>result</th><th></th></tr></thead><tbody id="im-rows">
      <tr><td colspan="5" class="tk-dim">no images yet</td></tr></tbody></table></div></section>`;
  const $ = s => root.querySelector(s);
  let items = [];
  const urls = [];

  async function convert(it) {
    const type = $("#im-fmt").value, q = +$("#im-q").value / 100;
    const mw = +$("#im-w").value || Infinity, mh = +$("#im-h").value || Infinity;
    const bmp = it.bmp;
    const k = Math.min(1, mw / bmp.width, mh / bmp.height);
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    if (type === "image/jpeg") { x.fillStyle = $("#im-bg").value; x.fillRect(0, 0, w, h); }
    x.imageSmoothingQuality = "high";
    x.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(r => c.toBlob(r, type, q));
    const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/avif": "avif" }[type];
    Object.assign(it, { out: blob, w, h, outName: it.file.name.replace(/\.[^.]+$/, "") + "." + ext });
  }
  function paint() {
    if (!items.length) return;
    $("#im-rows").innerHTML = items.map((it, i) => {
      const saved = it.out ? 1 - it.out.size / it.file.size : 0;
      if (it.out && !it.url) { it.url = URL.createObjectURL(it.out); urls.push(it.url); }
      return `<tr><td>${it.url ? `<img src="${it.url}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:5px">` : ""}</td>
        <td class="mono">${esc(it.file.name)}</td><td>${it.bmp.width} × ${it.bmp.height}<br><span class="tk-dim">${TK.fmtBytes(it.file.size)}</span></td>
        <td>${it.out ? `${it.w} × ${it.h}<br><b class="${saved >= 0 ? "tk-ok" : "tk-err"}">${TK.fmtBytes(it.out.size)} (${saved >= 0 ? "−" : "+"}${Math.abs(Math.round(saved * 100))} %)</b>` : "…"}</td>
        <td>${it.out ? `<button class="tk-copy" type="button" data-dl="${i}">Download</button>` : ""}</td></tr>`;
    }).join("");
    const a = items.reduce((n, i) => n + i.file.size, 0), b = items.reduce((n, i) => n + (i.out ? i.out.size : 0), 0);
    $("#im-sum").textContent = `${items.length} image${items.length === 1 ? "" : "s"} · ${TK.fmtBytes(a)} → ${TK.fmtBytes(b)}`;
    $("#im-zip").disabled = !items.every(i => i.out);
  }
  let busy = null;
  async function all() {
    const my = busy = {};
    for (const it of items) {
      if (busy !== my) return;
      if (it.url) { URL.revokeObjectURL(it.url); it.url = null; }
      it.out = null;
      await convert(it);
      paint();
    }
  }
  TK.drop($("#im-drop"), async files => {
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      try { items.push({ file: f, bmp: await createImageBitmap(f) }); }
      catch (e) { TK.toast(`${f.name}: cannot decode this image`); }
    }
    paint();
    all();
  }, "image/*");
  if ($("#im-drop").nextElementSibling) $("#im-drop").nextElementSibling.multiple = true;
  ["#im-fmt", "#im-q", "#im-w", "#im-h", "#im-bg"].forEach(s => $(s).addEventListener("change", all));
  $("#im-q").addEventListener("input", () => { $("#im-q-v").textContent = $("#im-q").value; });
  $("#im-rows").addEventListener("click", e => { const b = e.target.closest("[data-dl]"); if (b) { const it = items[+b.dataset.dl]; TK.download(it.outName, it.out); } });
  $("#im-zip").addEventListener("click", async () => {
    const files = await Promise.all(items.map(async it => ({ name: it.outName, data: new Uint8Array(await it.out.arrayBuffer()) })));
    const seen = {};
    files.forEach(f => { if (seen[f.name]) f.name = f.name.replace(/(\.[^.]+)$/, `-${++seen[f.name]}$1`); else seen[f.name] = 1; });
    TK.download("images.zip", new Blob([ZIP(files)], { type: "application/zip" }));
  });
  return () => { busy = null; urls.forEach(u => URL.revokeObjectURL(u)); items.forEach(i => i.bmp && i.bmp.close && i.bmp.close()); };
});

/* ============================================================
   QR code generator
   ============================================================ */
Toolbox.define("qr", root => {
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        ${TK.segHtml("qr-type", [["text", "URL / text"], ["wifi", "Wi-Fi"], ["vcard", "Contact"], ["mail", "E-mail"], ["sms", "SMS"], ["geo", "Location"]], "text")}
        <div id="qr-f-text" style="margin-top:14px"><textarea class="tk-textarea short" id="qr-text" spellcheck="false">https://bugfishtm.github.io/tools.html</textarea></div>
        <div id="qr-f-wifi" class="tk-grid two" style="margin-top:14px" hidden>
          <label class="tk-field"><span class="tk-label">Network name (SSID)</span><input class="tk-input" id="qr-ssid" value="My Network"></label>
          <label class="tk-field"><span class="tk-label">Password</span><input class="tk-input" id="qr-wpass" value=""></label>
          <label class="tk-field"><span class="tk-label">Security</span><select class="tk-select" id="qr-enc"><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">none</option></select></label>
          <label class="tk-check" style="align-self:end"><input type="checkbox" id="qr-hidden"> hidden network</label>
        </div>
        <div id="qr-f-vcard" class="tk-grid two" style="margin-top:14px" hidden>
          <label class="tk-field"><span class="tk-label">First name</span><input class="tk-input" id="qr-fn"></label>
          <label class="tk-field"><span class="tk-label">Last name</span><input class="tk-input" id="qr-ln"></label>
          <label class="tk-field"><span class="tk-label">Organisation</span><input class="tk-input" id="qr-org"></label>
          <label class="tk-field"><span class="tk-label">Phone</span><input class="tk-input" id="qr-tel"></label>
          <label class="tk-field"><span class="tk-label">E-mail</span><input class="tk-input" id="qr-vmail"></label>
          <label class="tk-field"><span class="tk-label">Website</span><input class="tk-input" id="qr-web"></label>
        </div>
        <div id="qr-f-mail" class="tk-grid" style="margin-top:14px;grid-template-columns:1fr" hidden>
          <label class="tk-field"><span class="tk-label">To</span><input class="tk-input" id="qr-to"></label>
          <label class="tk-field"><span class="tk-label">Subject</span><input class="tk-input" id="qr-sub"></label>
          <label class="tk-field"><span class="tk-label">Body</span><textarea class="tk-textarea short" id="qr-body"></textarea></label>
        </div>
        <div id="qr-f-sms" class="tk-grid two" style="margin-top:14px" hidden>
          <label class="tk-field"><span class="tk-label">Number</span><input class="tk-input" id="qr-num"></label>
          <label class="tk-field"><span class="tk-label">Message</span><input class="tk-input" id="qr-msg"></label>
        </div>
        <div id="qr-f-geo" class="tk-grid two" style="margin-top:14px" hidden>
          <label class="tk-field"><span class="tk-label">Latitude</span><input class="tk-input" id="qr-lat" value="51.1805"></label>
          <label class="tk-field"><span class="tk-label">Longitude</span><input class="tk-input" id="qr-lng" value="6.4428"></label>
        </div>
        <h3 class="tk-h">// style</h3>
        <div class="tk-grid narrow">
          <label class="tk-field"><span class="tk-label">Error correction</span><select class="tk-select" id="qr-ecl"><option value="L">L · 7 %</option><option value="M" selected>M · 15 %</option><option value="Q">Q · 25 %</option><option value="H">H · 30 %</option></select></label>
          <label class="tk-field"><span class="tk-label">Pixels / module <em id="qr-sc-v">8</em></span><input type="range" id="qr-sc" min="2" max="20" value="8"></label>
          <label class="tk-field"><span class="tk-label">Quiet zone <em id="qr-m-v">4</em></span><input type="range" id="qr-m" min="0" max="10" value="4"></label>
          <label class="tk-field"><span class="tk-label">Dark</span><input type="color" class="tk-input" id="qr-dark" value="#000000"></label>
          <label class="tk-field"><span class="tk-label">Light</span><input type="color" class="tk-input" id="qr-light" value="#ffffff"></label>
        </div>
      </section>
      <section class="tk-panel">
        <div class="tk-preview" style="min-height:300px;padding:14px"><canvas id="qr-cv" class="tk-canvas" width="10" height="10" style="max-width:100%"></canvas></div>
        <div class="tk-msg" id="qr-info" style="margin-top:10px"></div>
        <div class="tk-row" style="margin-top:10px"><button class="btn" id="qr-png" type="button">PNG</button><button class="btn ghost" id="qr-svg" type="button">SVG</button>
          <button class="tk-copy" type="button" id="qr-copysvg">Copy SVG</button></div>
        <pre class="tk-out" id="qr-payload" style="margin-top:12px;font-size:12px"></pre>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  let type = "text";
  const wEsc = s => s.replace(/([\\;,:"])/g, "\\$1");
  const vEsc = s => s.replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n");
  function payload() {
    const v = id => $(id).value.trim();
    if (type === "wifi") return `WIFI:T:${v("#qr-enc")};S:${wEsc(v("#qr-ssid"))};${v("#qr-enc") !== "nopass" ? `P:${wEsc($("#qr-wpass").value)};` : ""}${$("#qr-hidden").checked ? "H:true;" : ""};`;
    if (type === "vcard") return ["BEGIN:VCARD", "VERSION:3.0", `N:${vEsc(v("#qr-ln"))};${vEsc(v("#qr-fn"))};;;`, `FN:${vEsc(`${v("#qr-fn")} ${v("#qr-ln")}`.trim())}`,
      v("#qr-org") && `ORG:${vEsc(v("#qr-org"))}`, v("#qr-tel") && `TEL;TYPE=CELL:${v("#qr-tel")}`, v("#qr-vmail") && `EMAIL:${v("#qr-vmail")}`, v("#qr-web") && `URL:${v("#qr-web")}`, "END:VCARD"].filter(Boolean).join("\n");
    if (type === "mail") { const p = new URLSearchParams(); if (v("#qr-sub")) p.set("subject", v("#qr-sub")); if ($("#qr-body").value) p.set("body", $("#qr-body").value); const q = p.toString().replace(/\+/g, "%20"); return `mailto:${v("#qr-to")}${q ? "?" + q : ""}`; }
    if (type === "sms") return `SMSTO:${v("#qr-num")}:${$("#qr-msg").value}`;
    if (type === "geo") return `geo:${v("#qr-lat")},${v("#qr-lng")}`;
    return $("#qr-text").value;
  }
  const opts = () => ({ ecl: $("#qr-ecl").value, scale: +$("#qr-sc").value, margin: +$("#qr-m").value, dark: $("#qr-dark").value, light: $("#qr-light").value });
  function run() {
    $("#qr-sc-v").textContent = $("#qr-sc").value;
    $("#qr-m-v").textContent = $("#qr-m").value;
    const p = payload();
    $("#qr-payload").textContent = p;
    try {
      const q = QR.toCanvas($("#qr-cv"), p, opts());
      const d = COLOR.parse($("#qr-dark").value), l = COLOR.parse($("#qr-light").value);
      const warn = [];
      if (COLOR.contrast(d, l) < 4) warn.push("low contrast — many scanners will fail");
      if (COLOR.luminance(d) > COLOR.luminance(l)) warn.push("inverted colors (light on dark) are not supported by every scanner");
      if (+$("#qr-m").value < 2) warn.push("a quiet zone below 2 modules can break scanning");
      TK.msg($("#qr-info"), `version ${q.version} · ${q.size} × ${q.size} modules · ${q.mode} mode · ECC ${q.ecl} · ${TK.utf8(p).length} bytes${warn.length ? " — ⚠ " + warn.join("; ") : ""}`, warn.length ? "warn" : "ok");
    } catch (e) { TK.msg($("#qr-info"), e.message, "err"); }
  }
  TK.seg($("#qr-type"), v => {
    type = v;
    ["text", "wifi", "vcard", "mail", "sms", "geo"].forEach(k => { $(`#qr-f-${k}`).hidden = k !== v; });
    run();
  });
  root.querySelectorAll("input, textarea, select").forEach(el => el.addEventListener("input", TK.debounce(run, 120)));
  $("#qr-png").addEventListener("click", () => $("#qr-cv").toBlob(b => TK.download("qr-code.png", b), "image/png"));
  $("#qr-svg").addEventListener("click", () => TK.download("qr-code.svg", QR.toSVG(payload(), opts()), "image/svg+xml"));
  $("#qr-copysvg").addEventListener("click", async e => { if (await TK.copy(QR.toSVG(payload(), opts()))) TK.flash(e.target); });
  run();
});
