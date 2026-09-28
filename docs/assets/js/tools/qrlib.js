/* ============================================================
   BUGFISH TOOLS — qrlib.js
   Self-coded QR Code encoder (ISO/IEC 18004), versions 1-40,
   error correction L/M/Q/H, numeric / alphanumeric / byte (UTF-8)
   mode, automatic mask selection. Used by the QR and TOTP tools.

   QR.encode(text, ecl)            → { size, version, mask, modules[y][x] }
   QR.toCanvas(canvas, text, opts) → draws it (opts: ecl, scale, margin, dark, light)
   QR.toSVG(text, opts)            → SVG markup string
   ============================================================ */
const QR = (() => {
  const LEVELS = ["L", "M", "Q", "H"];
  const FORMAT = { L: 1, M: 0, Q: 3, H: 2 };
  // Per version (index 1..40) and level: EC codewords per block / number of blocks.
  const ECC = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  ];
  const BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
  ];
  const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

  function rawModules(ver) {
    let r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  const dataCodewords = (ver, e) => Math.floor(rawModules(ver) / 8) - ECC[e][ver] * BLOCKS[e][ver];

  /* ---- Reed-Solomon over GF(2^8), polynomial 0x11D ---- */
  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  function rsDivisor(deg) {
    const r = new Array(deg).fill(0);
    r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) {
        r[j] = gfMul(r[j], root);
        if (j + 1 < deg) r[j] ^= r[j + 1];
      }
      root = gfMul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
  }

  /* ---- segment: whole text in the densest mode that fits it ---- */
  function segment(text) {
    const bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    if (/^\d*$/.test(text)) {
      for (let i = 0; i < text.length; i += 3) {
        const chunk = text.substr(i, 3);
        put(parseInt(chunk, 10), chunk.length * 3 + 1);
      }
      return { mode: 1, count: text.length, bits, cc: [10, 12, 14] };
    }
    if ([...text].every(c => ALNUM.includes(c))) {
      for (let i = 0; i + 1 < text.length; i += 2) put(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
      if (text.length % 2) put(ALNUM.indexOf(text[text.length - 1]), 6);
      return { mode: 2, count: text.length, bits, cc: [9, 11, 13] };
    }
    const bytes = new TextEncoder().encode(text);
    bytes.forEach(b => put(b, 8));
    return { mode: 4, count: bytes.length, bits, cc: [8, 16, 16] };
  }
  const ccBits = (seg, ver) => seg.cc[ver <= 9 ? 0 : ver <= 26 ? 1 : 2];

  function encode(text, eclName = "M") {
    const e = Math.max(0, LEVELS.indexOf(eclName));
    const seg = segment(String(text));
    let ver = 1;
    for (; ; ver++) {
      if (ver > 40) throw new Error("text is too long for a QR code at this error correction level");
      if (4 + ccBits(seg, ver) + seg.bits.length <= dataCodewords(ver, e) * 8) break;
    }

    /* data codewords */
    const bb = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bb.push((v >>> i) & 1); };
    put(seg.mode, 4);
    put(seg.count, ccBits(seg, ver));
    seg.bits.forEach(b => bb.push(b));
    const cap = dataCodewords(ver, e) * 8;
    put(0, Math.min(4, cap - bb.length));
    put(0, (8 - (bb.length % 8)) % 8);
    for (let pad = 0xec; bb.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bb.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | bb[i + j];
      data.push(v);
    }

    /* split into blocks, add EC, interleave */
    const nb = BLOCKS[e][ver], eccLen = ECC[e][ver];
    const raw = Math.floor(rawModules(ver) / 8);
    const nShort = nb - (raw % nb);
    const shortLen = Math.floor(raw / nb);
    const div = rsDivisor(eccLen);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) all.push(b[i]); });
    }

    /* matrix */
    const size = ver * 4 + 17;
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };

    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (ver > 1) {
      const na = Math.floor(ver / 7) + 2;
      const step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
      const pos = [6];
      for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
          set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const formatBits = mask => {
      const d = (FORMAT[LEVELS[e]] << 3) | mask;
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const bits = ((d << 10) | r) ^ 0x5412;
      const bit = i => ((bits >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    formatBits(0);
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const bits = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const dark = ((bits >>> i) & 1) !== 0, a = size - 11 + (i % 3), b = Math.floor(i / 3);
        set(a, b, dark); set(b, a, dark);
      }
    }

    /* codewords in the zig-zag order */
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fn[y][x] && bi < all.length * 8) {
          mod[y][x] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0;
          bi++;
        }
      }
    }

    const MASKS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];
    const applyMask = m => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
    };

    const penalty = () => {
      let score = 0;
      const lineScore = get => {
        for (let a = 0; a < size; a++) {
          let color = false, run = 0;
          const hist = [0, 0, 0, 0, 0, 0, 0];
          const addHist = len => { if (hist[0] === 0) len += size; hist.pop(); hist.unshift(len); };
          const count = () => {
            const n = hist[1];
            const core = n > 0 && hist[2] === n && hist[3] === n * 3 && hist[4] === n && hist[5] === n;
            return (core && hist[0] >= n * 4 && hist[6] >= n ? 1 : 0) + (core && hist[6] >= n * 4 && hist[0] >= n ? 1 : 0);
          };
          for (let b = 0; b < size; b++) {
            if (get(a, b) === color) {
              run++;
              if (run === 5) score += 3; else if (run > 5) score++;
            } else {
              addHist(run);
              if (!color) score += count() * 40;
              color = get(a, b);
              run = 1;
            }
          }
          if (color) { addHist(run); run = 0; }
          addHist(run + size);
          score += count() * 40;
        }
      };
      lineScore((a, b) => mod[a][b]);
      lineScore((a, b) => mod[b][a]);
      let dark = 0;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (mod[y][x]) dark++;
        if (x < size - 1 && y < size - 1) {
          const c = mod[y][x];
          if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) score += 3;
        }
      }
      const total = size * size;
      score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return score;
    };

    let best = 0, bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m);
      formatBits(m);
      const s = penalty();
      if (s < bestScore) { bestScore = s; best = m; }
      applyMask(m);
    }
    applyMask(best);
    formatBits(best);
    return { size, version: ver, mask: best, ecl: LEVELS[e], modules: mod, mode: ["", "numeric", "alphanumeric", "", "byte"][seg.mode] };
  }

  function toCanvas(canvas, text, o = {}) {
    const q = encode(text, o.ecl || "M");
    const scale = o.scale || 8, margin = o.margin == null ? 4 : o.margin;
    const dim = (q.size + margin * 2) * scale;
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = o.light || "#ffffff";
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = o.dark || "#000000";
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) {
      if (q.modules[y][x]) ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
    }
    return q;
  }

  function toSVG(text, o = {}) {
    const q = encode(text, o.ecl || "M");
    const margin = o.margin == null ? 4 : o.margin, dim = q.size + margin * 2;
    let path = "";
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) {
      if (q.modules[y][x]) path += `M${x + margin},${y + margin}h1v1h-1z`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
      `<rect width="100%" height="100%" fill="${o.light || "#ffffff"}"/><path d="${path}" fill="${o.dark || "#000000"}"/></svg>`;
  }

  return { encode, toCanvas, toSVG, _rs: { rsDivisor, rsRemainder, gfMul } };
})();
