/* ============================================================
   BUGFISH TOOLS — ziplib.js
   Minimal ZIP writer (store method, no compression) with CRC32.
   Used by the favicon generator and the image converter.

   ZIP([{ name: "a.png", data: Uint8Array }, ...]) → Uint8Array
   ============================================================ */
const ZIP = (() => {
  const T = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c; }
  const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  return function zip(files) { // [{name, data: Uint8Array}]
    const parts = [], central = [];
    let off = 0;
    for (const f of files) {
      const name = TK.utf8(f.name), c = crc(f.data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, c, true); h.setUint32(18, f.data.length, true);
      h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
      cd.setUint16(12, 0, true); cd.setUint16(14, 0x21, true); cd.setUint32(16, c, true); cd.setUint32(20, f.data.length, true); cd.setUint32(24, f.data.length, true);
      cd.setUint16(28, name.length, true); cd.setUint32(42, off, true);
      central.push(new Uint8Array(cd.buffer), name);
      off += 30 + name.length + f.data.length;
    }
    const cdSize = central.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    return TK.concat(...parts, ...central, new Uint8Array(end.buffer));
  };
})();
