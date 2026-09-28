/* ============================================================
   BUGFISH TOOLS — system.js
   Number base & bitwise calculator, Unix timestamp converter,
   cron explainer, chmod calculator, UUID / ULID generator.
   ============================================================ */

/* ============================================================
   Number base & bitwise calculator (BigInt — any size)
   ============================================================ */
const DIGITS36 = "0123456789abcdefghijklmnopqrstuvwxyz";
function parseBig(str, base) {
  let s = String(str).trim().toLowerCase().replace(/[\s_']/g, "");
  let neg = false;
  if (s.startsWith("-")) { neg = true; s = s.slice(1); }
  const pre = { "0x": 16, "0b": 2, "0o": 8 }[s.slice(0, 2)];
  if (pre && (base === pre || base === 10)) { base = pre; s = s.slice(2); }
  if (!s) throw new Error("empty");
  let n = 0n;
  const B = BigInt(base);
  for (const c of s) {
    const d = DIGITS36.indexOf(c);
    if (d < 0 || d >= base) throw new Error(`'${c}' is not a base-${base} digit`);
    n = n * B + BigInt(d);
  }
  return neg ? -n : n;
}
const toBase = (n, b) => (n < 0n ? "-" + (-n).toString(b) : n.toString(b));
const group = (s, k, sep = " ") => { const neg = s.startsWith("-"); const t = neg ? s.slice(1) : s; const pad = t.padStart(Math.ceil(t.length / k) * k, "0"); return (neg ? "-" : "") + pad.match(new RegExp(`.{${k}}`, "g")).join(sep); };

Toolbox.define("numbase", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <input class="tk-input tk-grow" id="nb-in" value="0xFF6600" spellcheck="false">
        <label class="tk-field" style="width:150px"><span class="tk-label">Input base</span>
          <select class="tk-select" id="nb-base"><option value="10">decimal (auto 0x / 0b / 0o)</option><option value="2">binary</option><option value="8">octal</option><option value="16">hex</option>${Array.from({ length: 35 }, (_, i) => i + 2).filter(b => ![2, 8, 10, 16].includes(b)).map(b => `<option value="${b}">base ${b}</option>`).join("")}</select></label>
        <label class="tk-field" style="width:120px"><span class="tk-label">Width</span><select class="tk-select" id="nb-w"><option value="8">8 bit</option><option value="16">16 bit</option><option value="32" selected>32 bit</option><option value="64">64 bit</option><option value="128">128 bit</option></select></label>
      </div>
      <div class="tk-msg" id="nb-msg" style="margin-top:10px"></div>
      <div id="nb-out" style="margin-top:12px"></div>
      <h3 class="tk-h">// bits — click to flip</h3>
      <div id="nb-bits" style="display:flex;flex-wrap:wrap;gap:3px;font-family:var(--mono)"></div>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h">// bitwise</h3>
      <div class="tk-row">
        <input class="tk-input" id="bw-a" value="0b1100" style="width:170px" spellcheck="false">
        <select class="tk-select" id="bw-op" style="width:auto"><option>AND</option><option>OR</option><option>XOR</option><option>NAND</option><option>NOR</option><option value="SHL">&lt;&lt; shift left</option><option value="SHR">&gt;&gt; shift right (arith.)</option><option value="USHR">&gt;&gt;&gt; shift right (logical)</option><option value="ADD">+</option><option value="SUB">−</option><option value="MUL">×</option><option value="DIV">÷ (integer)</option><option value="MOD">mod</option></select>
        <input class="tk-input" id="bw-b" value="0b1010" style="width:170px" spellcheck="false">
        <span class="tk-note">inputs: decimal, 0x…, 0b…, 0o…</span>
      </div>
      <div id="bw-out" style="margin-top:12px"></div>
    </section>`;
  const $ = s => root.querySelector(s);
  let val = 0n;
  const width = () => BigInt($("#nb-w").value);
  const mask = () => (1n << width()) - 1n;
  const signed = u => { const w = width(); return u >> (w - 1n) ? u - (1n << w) : u; };
  function show() {
    const w = width(), u = val & mask();
    const rows = [["decimal", toBase(val, 10)], ["hex", toBase(val, 16).toUpperCase()], ["octal", toBase(val, 8)], ["binary", group(toBase(val, 2), 4)], ["base 36", toBase(val, 36)],
      [`unsigned ${w}-bit`, u.toString()], [`signed ${w}-bit (two's complement)`, signed(u).toString()], [`hex ${w}-bit`, `0x${u.toString(16).toUpperCase().padStart(Number(w) / 4, "0")}`],
      ["bit length", val === 0n ? "0" : String((val < 0n ? -val : val).toString(2).length)]];
    if (val >= 32n && val <= 0x10ffffn && val !== 127n) rows.push(["character", String.fromCodePoint(Number(val))]);
    if (val > mask() || val < -(1n << (w - 1n))) rows.push(["note", `value does not fit into ${w} bits — truncated in the ${w}-bit rows`, false]);
    $("#nb-out").innerHTML = TK.kv(rows);
    const bits = u.toString(2).padStart(Number(w), "0");
    $("#nb-bits").innerHTML = [...bits].map((b, i) => `<button type="button" data-bit="${Number(w) - 1 - i}" title="bit ${Number(w) - 1 - i}" style="width:22px;height:28px;border-radius:4px;border:1px solid ${b === "1" ? "var(--orange)" : "var(--border2)"};background:${b === "1" ? "var(--orange-faint)" : "var(--bg)"};color:${b === "1" ? "var(--orange)" : "var(--text-dim)"};cursor:pointer;font-family:var(--mono);${(Number(w) - 1 - i) % 8 === 0 && i < bits.length - 1 ? "margin-right:8px" : ""}">${b}</button>`).join("");
  }
  function read() {
    try { val = parseBig($("#nb-in").value, +$("#nb-base").value); TK.msg($("#nb-msg"), ""); show(); }
    catch (e) { TK.msg($("#nb-msg"), e.message, "err"); }
  }
  $("#nb-bits").addEventListener("click", e => {
    const b = e.target.closest("[data-bit]");
    if (!b) return;
    const u = (val & mask()) ^ (1n << BigInt(b.dataset.bit));
    val = u;
    $("#nb-base").value = "16";
    $("#nb-in").value = u.toString(16).toUpperCase();
    show();
  });
  function bitwise() {
    try {
      const a = parseBig($("#bw-a").value, 10), b = parseBig($("#bw-b").value, 10), m = mask(), op = $("#bw-op").value;
      const sh = Number(b);
      const r = { AND: a & b, OR: a | b, XOR: a ^ b, NAND: ~(a & b) & m, NOR: ~(a | b) & m, SHL: (a << b) & m, SHR: signed(a & m) >> b, USHR: (a & m) >> b,
        ADD: a + b, SUB: a - b, MUL: a * b, DIV: b === 0n ? null : a / b, MOD: b === 0n ? null : a % b }[op];
      if (r === null) { $("#bw-out").innerHTML = `<div class="tk-msg err">division by zero</div>`; return; }
      if ((op === "SHL" || op.endsWith("SHR")) && (sh < 0 || sh > 4096)) throw new Error("shift must be 0 … 4096");
      const u = r & m;
      const sym = { AND: "&", OR: "|", XOR: "^", NAND: "~&", NOR: "~|", SHL: "<<", SHR: ">>", USHR: ">>>", ADD: "+", SUB: "-", MUL: "*", DIV: "/", MOD: "%" }[op];
      const bin = x => group((x & m).toString(2).padStart(Number(width()), "0"), 4);
      const bLine = /SH/.test(op) ? `by ${b}` : bin(b);
      $("#bw-out").innerHTML = `<pre class="tk-out nowrap">${esc(`    ${bin(a)}   A\n${sym.padEnd(4)}${bLine}   B\n=   ${bin(u)}`)}</pre>` +
        TK.kv([["decimal", r.toString()], ["hex", toBase(r, 16).toUpperCase()], [`unsigned ${width()}-bit`, u.toString()], [`signed ${width()}-bit`, signed(u).toString()]]);
    } catch (e) { $("#bw-out").innerHTML = `<div class="tk-msg err">${esc(e.message)}</div>`; }
  }
  $("#nb-in").addEventListener("input", read);
  $("#nb-base").addEventListener("change", read);
  $("#nb-w").addEventListener("change", () => { read(); bitwise(); });
  ["#bw-a", "#bw-b", "#bw-op"].forEach(s => $(s).addEventListener("input", bitwise));
  read();
  bitwise();
});

/* ============================================================
   Unix timestamp converter
   ============================================================ */
function relTime(ms) {
  const d = (ms - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units = [["year", 31557600], ["month", 2629800], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
  for (const [u, s] of units) if (Math.abs(d) >= s || u === "second") return rtf.format(Math.round(d / s), u);
  return "";
}
function isoWeek(dt) {
  const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - y) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}

const TS_ZONES = [];

Toolbox.define("timestamp", root => {
  const ZONES_DEF = ["UTC", "Europe/Berlin", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Asia/Kolkata", "Australia/Sydney"];
  const allZones = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : ZONES_DEF;
  // The zone list is kept in memory for this visit only (never written to the device).
  if (!TS_ZONES.length) TS_ZONES.push(...ZONES_DEF.filter(z => z === "UTC" || allZones.includes(z)));
  const zones = TS_ZONES;
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-grid narrow">
        <div class="tk-stat"><b id="ts-now-s">—</b><span>unix seconds · now</span></div>
        <div class="tk-stat"><b id="ts-now-ms">—</b><span>milliseconds</span></div>
        <div class="tk-stat"><b id="ts-now-iso" style="font-size:15px">—</b><span>UTC</span></div>
      </div>
    </section>
    <section class="tk-panel">
      <div class="tk-row">
        <input class="tk-input tk-grow" id="ts-in" spellcheck="false" placeholder="timestamp (s / ms / µs / ns) or any date: 2026-09-23 14:00, Tue, 23 Sep 2026 …">
        <button class="btn ghost small" id="ts-now" type="button">now</button>
      </div>
      <div class="tk-row" style="margin-top:10px">
        <label class="tk-field"><span class="tk-label">or pick a date / time</span><input class="tk-input" type="datetime-local" id="ts-pick" step="1"></label>
        <label class="tk-field" style="flex:1 1 220px"><span class="tk-label">interpret picked time in</span><select class="tk-select" id="ts-pz">${allZones.map(z => `<option${z === local ? " selected" : ""}>${z}</option>`).join("")}</select></label>
      </div>
      <div class="tk-msg" id="ts-msg" style="margin-top:10px"></div>
      <div id="ts-out" style="margin-top:12px"></div>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h">// time zones</h3>
      <div id="ts-zones"></div>
      <div class="tk-row" style="margin-top:10px"><select class="tk-select" id="ts-add" style="width:auto;max-width:100%"><option value="">+ add time zone…</option>${allZones.map(z => `<option>${z}</option>`).join("")}</select>
        <button class="tk-copy" type="button" id="ts-reset">reset list</button></div>
    </section>`;
  const $ = s => root.querySelector(s);
  let ms = Date.now();

  /* Wall-clock time in zone → UTC ms (iterative offset correction handles DST). */
  function zonedToUtc(y, mo, d, h, mi, s, tz) {
    let guess = Date.UTC(y, mo - 1, d, h, mi, s);
    for (let i = 0; i < 3; i++) {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(guess).map(x => [x.type, x.value]));
      const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
      guess -= asUtc - Date.UTC(y, mo - 1, d, h, mi, s);
    }
    return guess;
  }
  function offsetOf(t, tz) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(t).find(x => x.type === "timeZoneName");
    return p ? p.value.replace("GMT", "UTC") : "";
  }
  function render() {
    const d = new Date(ms);
    if (isNaN(d)) { TK.msg($("#ts-msg"), "not a valid date", "err"); return; }
    const pad = x => String(x).padStart(2, "0");
    const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
    $("#ts-out").innerHTML = TK.kv([
      ["unix seconds", String(Math.floor(ms / 1000))], ["unix ms", String(ms)], ["ISO 8601 (UTC)", d.toISOString()],
      [`local (${local})`, `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${offsetOf(d, local)}`],
      ["RFC 2822 / HTTP", d.toUTCString()], ["relative", relTime(ms)], ["day of year · ISO week", `${doy} · ${isoWeek(d)}`],
      ["SQL DATETIME (UTC)", d.toISOString().slice(0, 19).replace("T", " ")], ["PHP", `date('Y-m-d H:i:s', ${Math.floor(ms / 1000)})`], ["JavaScript", `new Date(${ms})`],
    ]);
    $("#ts-zones").innerHTML = `<table class="tk-table"><tbody>${zones.map((z, i) => `<tr><td class="mono">${esc(z)}</td><td class="mono" style="color:var(--text-bright)">${esc(new Intl.DateTimeFormat("en-GB", { timeZone: z, dateStyle: "medium", timeStyle: "medium" }).format(d))}</td>
      <td class="tk-dim">${esc(offsetOf(d, z))}</td><td style="width:1%"><button class="tk-copy" type="button" data-rm="${i}">✕</button></td></tr>`).join("")}</tbody></table>`;
  }
  function parseInput() {
    const v = $("#ts-in").value.trim();
    const m = $("#ts-msg");
    if (!v) return;
    if (/^-?\d+(\.\d+)?$/.test(v)) {
      const n = Number(v), digits = v.replace(/^-|\..*$/g, "").length;
      const [div, unit] = digits > 17 ? [1e6, "nanoseconds"] : digits > 14 ? [1e3, "microseconds"] : digits > 11 ? [1, "milliseconds"] : [1e-3, "seconds"];
      ms = Math.round(n / div);
      TK.msg(m, `read as ${unit}`, "ok");
    } else {
      const t = Date.parse(v);
      if (isNaN(t)) { TK.msg(m, "could not parse that date — try ISO format 2026-09-23T14:00:00Z", "err"); return; }
      ms = t;
      TK.msg(m, /z|[+-]\d\d:?\d\d$|utc|gmt/i.test(v) ? "parsed with the given offset" : `parsed as local time (${local})`, "ok");
    }
    render();
  }
  function fromPick() {
    const v = $("#ts-pick").value;
    const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/.exec(v);
    if (!m) return;
    ms = zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0), $("#ts-pz").value);
    $("#ts-in").value = String(Math.floor(ms / 1000));
    TK.msg($("#ts-msg"), `${v.replace("T", " ")} in ${$("#ts-pz").value}`, "ok");
    render();
  }
  function tick() {
    const n = Date.now();
    $("#ts-now-s").textContent = Math.floor(n / 1000);
    $("#ts-now-ms").textContent = n;
    $("#ts-now-iso").textContent = new Date(n).toISOString().slice(0, 19).replace("T", " ");
  }
  $("#ts-in").addEventListener("input", TK.debounce(parseInput, 200));
  $("#ts-now").addEventListener("click", () => { ms = Date.now(); $("#ts-in").value = String(Math.floor(ms / 1000)); TK.msg($("#ts-msg"), ""); render(); });
  $("#ts-pick").addEventListener("change", fromPick);
  $("#ts-pz").addEventListener("change", fromPick);
  $("#ts-add").addEventListener("change", () => { const z = $("#ts-add").value; if (z && !zones.includes(z)) { zones.push(z); render(); } $("#ts-add").value = ""; });
  $("#ts-reset").addEventListener("click", () => { zones.splice(0, zones.length, ...ZONES_DEF.filter(z => z === "UTC" || allZones.includes(z))); render(); });
  $("#ts-zones").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { zones.splice(+b.dataset.rm, 1); render(); } });
  $("#ts-in").value = String(Math.floor(ms / 1000));
  tick();
  render();
  const t = setInterval(tick, 1000);
  return () => clearInterval(t);
});

/* ============================================================
   Cron expression explainer
   ============================================================ */
const CRON = (() => {
  const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MACROS = { "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *", "@weekly": "0 0 * * 0", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *" };
  const FIELDS = [
    { name: "minute", min: 0, max: 59 }, { name: "hour", min: 0, max: 23 }, { name: "day of month", min: 1, max: 31 },
    { name: "month", min: 1, max: 12, names: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], off: 1 },
    { name: "day of week", min: 0, max: 7, names: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], off: 0 },
  ];
  function field(str, f) {
    const set = new Set();
    for (const part of str.toLowerCase().split(",")) {
      const m = /^(\*|[a-z0-9]+(?:-[a-z0-9]+)?)(?:\/(\d+))?$/.exec(part);
      if (!m) throw new Error(`bad ${f.name} "${part}"`);
      const num = x => {
        if (f.names && f.names.includes(x)) return f.names.indexOf(x) + f.off;
        if (!/^\d+$/.test(x)) throw new Error(`bad ${f.name} value "${x}"`);
        const n = +x;
        if (n < f.min || n > f.max) throw new Error(`${f.name} ${n} out of range ${f.min}-${f.max}`);
        return n;
      };
      let lo, hi;
      if (m[1] === "*") { lo = f.min; hi = f.max; }
      else if (m[1].includes("-")) { [lo, hi] = m[1].split("-").map(num); if (lo > hi) throw new Error(`${f.name} range ${lo}-${hi} is reversed`); }
      else { lo = num(m[1]); hi = m[2] ? f.max : lo; }
      const step = m[2] ? +m[2] : 1;
      if (step < 1) throw new Error("step must be ≥ 1");
      for (let v = lo; v <= hi; v += step) set.add(f.name === "day of week" && v === 7 ? 0 : v);
    }
    return set;
  }
  function parse(expr) {
    let e = expr.trim().replace(/\s+/g, " ");
    if (e === "@reboot") return { reboot: true };
    if (MACROS[e.toLowerCase()]) e = MACROS[e.toLowerCase()];
    const parts = e.split(" ");
    if (parts.length !== 5) throw new Error(`expected 5 fields (minute hour day month weekday), got ${parts.length}`);
    const sets = parts.map((p, i) => field(p, FIELDS[i]));
    return { parts, sets, domStar: parts[2] === "*", dowStar: parts[4] === "*" };
  }
  function matchDay(c, d) {
    const dom = c.sets[2].has(d.getDate()), dow = c.sets[4].has(d.getDay());
    if (c.domStar && c.dowStar) return true;
    if (c.domStar) return dow;
    if (c.dowStar) return dom;
    return dom || dow; // classic cron: either field may match
  }
  function next(c, from, count = 10) {
    const out = [];
    const d = new Date(from);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);
    const limit = from + 5 * 366 * 86400000;
    while (out.length < count && d.getTime() < limit) {
      if (!c.sets[3].has(d.getMonth() + 1)) { d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0, 0, 0); continue; }
      if (!matchDay(c, d)) { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); continue; }
      if (!c.sets[1].has(d.getHours())) { d.setHours(d.getHours() + 1, 0, 0, 0); continue; }
      if (!c.sets[0].has(d.getMinutes())) { d.setMinutes(d.getMinutes() + 1, 0, 0); continue; }
      out.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    }
    return out;
  }
  const list = (arr, fmt) => { const a = arr.map(fmt); return a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0]; };
  const pad = n => String(n).padStart(2, "0");
  function describePart(p, f, fmt) {
    if (p === "*") return null;
    let m;
    if ((m = /^\*\/(\d+)$/.exec(p))) return `every ${m[1]} ${f}s`;
    if ((m = /^(\w+)-(\w+)$/.exec(p))) return `${f}s ${fmt(m[1])} through ${fmt(m[2])}`;
    if ((m = /^(\w+)-(\w+)\/(\d+)$/.exec(p))) return `every ${m[3]} ${f}s from ${fmt(m[1])} through ${fmt(m[2])}`;
    return `${f} ${list(p.split(","), fmt)}`;
  }
  function explain(c) {
    if (c.reboot) return "Once, when the cron daemon starts (after a reboot).";
    const [mi, h, dom, mon, dow] = c.parts;
    const mName = x => (/^\d+$/.test(x) ? MONTHS[+x] : x.slice(0, 1).toUpperCase() + x.slice(1));
    const dName = x => (/^\d+$/.test(x) ? DAYS[+x % 7] : { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" }[x] || x);
    const ord = n => `${n}${[, "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th"}`;
    let time, m;
    if (/^\d+$/.test(mi) && /^\d+(,\d+)*$/.test(h)) time = `At ${list(h.split(","), x => `${pad(x)}:${pad(mi)}`)}`;
    else if (/^\d+$/.test(mi) && h === "*") time = mi === "0" ? "At the start of every hour" : `At minute ${mi} of every hour`;
    else if (mi === "*" && h === "*") time = "Every minute";
    else {
      let a;
      if (mi === "*") a = "every minute";
      else if (/^\d+$/.test(mi)) a = `at minute ${mi}`;
      else if (/^[\d,]+$/.test(mi)) a = `at minutes ${list(mi.split(","), x => x)}`;
      else a = describePart(mi, "minute", x => x);
      let b = "";
      if ((m = /^\*\/(\d+)$/.exec(h))) b = `past every ${ord(+m[1])} hour`;
      else if ((m = /^(\d+)-(\d+)$/.exec(h))) b = `between ${pad(m[1])}:00 and ${pad(m[2])}:59`;
      else if (/^[\d,]+$/.test(h)) b = `during hour${h.includes(",") ? "s" : ""} ${list(h.split(","), x => pad(x))}`;
      else if (h !== "*") b = describePart(h, "hour", x => x);
      time = a[0].toUpperCase() + a.slice(1) + (b ? `, ${b}` : "");
    }
    const bits = [time];
    const d1 = describePart(dom, "day", x => x), d2 = describePart(dow, "weekday", dName), m1 = describePart(mon, "month", mName);
    if (d1 && d2) bits.push(`on ${d1.replace(/^day /, "day-of-month ")} or on ${d2.replace(/^weekday /, "")}`);
    else if (d1) bits.push(`on ${d1.replace(/^day /, "day-of-month ")}`);
    else if (d2) bits.push(`on ${d2.replace(/^weekday /, "").replace(/weekdays (\w+) through (\w+)/, "$1 through $2")}`);
    if (m1) bits.push(`in ${m1.replace(/^month /, "")}`);
    return bits.join(", ") + ".";
  }
  return { parse, next, explain };
})();

Toolbox.define("cron", root => {
  const PRESETS = [["*/5 * * * *", "every 5 minutes"], ["0 * * * *", "hourly"], ["0 3 * * *", "daily at 03:00"], ["30 8 * * 1-5", "weekdays 08:30"], ["0 0 * * 0", "weekly (Sunday)"],
    ["0 0 1 * *", "monthly"], ["0 4 1 1 *", "yearly"], ["*/15 9-17 * * mon-fri", "office hours, every 15 min"], ["0 2 * * 6,0", "weekends 02:00"], ["@reboot", "at boot"]];
  root.innerHTML = `
    <section class="tk-panel">
      <input class="tk-input" id="cr-in" value="*/15 9-17 * * mon-fri" spellcheck="false" style="font-size:20px;text-align:center;letter-spacing:2px">
      <div class="tk-row" style="justify-content:center;margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--text-dim);gap:22px"><span>minute</span><span>hour</span><span>day</span><span>month</span><span>weekday</span></div>
      <div class="tk-out big" id="cr-text" style="margin-top:14px;font-size:18px;letter-spacing:0.5px;color:var(--text-bright)"></div>
      <div class="tk-row tight" style="margin-top:12px">${PRESETS.map(([e, l]) => `<button class="tk-copy" type="button" data-cr="${e}" title="${e}">${l}</button>`).join("")}</div>
    </section>
    <div class="tk-grid two">
      <section class="tk-panel"><h3 class="tk-h">// next runs (your time zone)</h3><div class="tk-list" id="cr-next"></div></section>
      <section class="tk-panel"><h3 class="tk-h">// syntax</h3>
        <table class="tk-table"><thead><tr><th>field</th><th>values</th></tr></thead><tbody>
          <tr><td>minute</td><td class="mono">0-59</td></tr><tr><td>hour</td><td class="mono">0-23</td></tr><tr><td>day of month</td><td class="mono">1-31</td></tr>
          <tr><td>month</td><td class="mono">1-12 or JAN-DEC</td></tr><tr><td>day of week</td><td class="mono">0-7 or SUN-SAT (0 and 7 = Sunday)</td></tr></tbody></table>
        <div class="tk-list" style="margin-top:12px">
          <div><span><code>*</code> any · <code>,</code> list · <code>-</code> range · <code>/</code> step (<code>*/10</code>, <code>1-30/5</code>)</span></div>
          <div><span>If both day-of-month and day-of-week are set, the job runs when <b>either</b> matches.</span></div>
          <div><span>Macros: <code>@hourly @daily @weekly @monthly @yearly @reboot</code></span></div>
        </div></section>
    </div>`;
  const $ = s => root.querySelector(s);
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  function run() {
    try {
      const c = CRON.parse($("#cr-in").value);
      $("#cr-text").textContent = CRON.explain(c);
      $("#cr-text").style.color = "var(--text-bright)";
      if (c.reboot) { $("#cr-next").innerHTML = `<div><span class="tk-dim">runs once at startup</span></div>`; return; }
      const n = CRON.next(c, Date.now(), 12);
      $("#cr-next").innerHTML = n.length ? n.map(d => `<div><span>${esc(fmt.format(d))}</span><span class="tk-dim">${esc(relTime(d.getTime()))}</span></div>`).join("")
        : `<div><span class="tk-warn">never runs within the next 5 years (e.g. February 30th)</span></div>`;
    } catch (e) {
      $("#cr-text").textContent = e.message;
      $("#cr-text").style.color = "var(--red)";
      $("#cr-next").innerHTML = "";
    }
  }
  $("#cr-in").addEventListener("input", run);
  root.addEventListener("click", e => { const b = e.target.closest("[data-cr]"); if (b) { $("#cr-in").value = b.dataset.cr; run(); } });
  run();
});

/* ============================================================
   chmod calculator
   ============================================================ */
Toolbox.define("chmod", root => {
  const WHO = [["u", "Owner"], ["g", "Group"], ["o", "Others"]];
  const PRESETS = [["644", "files"], ["755", "dirs / scripts"], ["600", "private file"], ["700", "private dir"], ["664", "group-writable"], ["775", "shared dir"], ["400", "ssh key"], ["1777", "/tmp"], ["2775", "setgid dir"], ["4755", "setuid binary"]];
  root.innerHTML = `
    <div class="tk-grid two">
      <section class="tk-panel">
        <table class="tk-table" style="text-align:center"><thead><tr><th></th><th style="text-align:center">read</th><th style="text-align:center">write</th><th style="text-align:center">execute</th></tr></thead><tbody>
          ${WHO.map(([k, l]) => `<tr><td style="text-align:left">${l}</td>${["r", "w", "x"].map(p => `<td><input type="checkbox" data-p="${k}${p}" aria-label="${l} ${{ r: "read", w: "write", x: "execute" }[p]}"></td>`).join("")}</tr>`).join("")}
        </tbody></table>
        <div class="tk-row" style="margin-top:12px"><span class="tk-label" style="margin:0">special</span>
          <label class="tk-check"><input type="checkbox" data-p="suid"> setuid</label>
          <label class="tk-check"><input type="checkbox" data-p="sgid"> setgid</label>
          <label class="tk-check"><input type="checkbox" data-p="sticky"> sticky</label></div>
        <div class="tk-grid two" style="margin-top:14px">
          <label class="tk-field"><span class="tk-label">Octal</span><input class="tk-input" id="ch-oct" value="755" style="font-size:20px" spellcheck="false"></label>
          <label class="tk-field"><span class="tk-label">Symbolic</span><input class="tk-input" id="ch-sym" style="font-size:20px" spellcheck="false"></label>
        </div>
        <div class="tk-row tight" style="margin-top:12px">${PRESETS.map(([o, l]) => `<button class="tk-copy" type="button" data-pre="${o}" title="${l}">${o} <span class="tk-dim">${l}</span></button>`).join("")}</div>
      </section>
      <section class="tk-panel">
        <h3 class="tk-h">// commands</h3><div id="ch-out"></div>
        <h3 class="tk-h">// meaning</h3><div class="tk-list" id="ch-mean"></div>
        <h3 class="tk-h">// umask</h3>
        <div class="tk-row"><input class="tk-input" id="ch-umask" value="022" style="width:100px" spellcheck="false"><span class="tk-note" id="ch-um-out"></span></div>
      </section>
    </div>`;
  const $ = s => root.querySelector(s);
  const box = k => root.querySelector(`[data-p="${k}"]`);
  function fromBoxes() {
    let special = (box("suid").checked ? 4 : 0) + (box("sgid").checked ? 2 : 0) + (box("sticky").checked ? 1 : 0);
    const digit = w => (box(w + "r").checked ? 4 : 0) + (box(w + "w").checked ? 2 : 0) + (box(w + "x").checked ? 1 : 0);
    return (special ? String(special) : "") + WHO.map(([w]) => digit(w)).join("");
  }
  function setBoxes(oct) {
    const s = oct.padStart(4, "0");
    const sp = +s[0];
    box("suid").checked = !!(sp & 4); box("sgid").checked = !!(sp & 2); box("sticky").checked = !!(sp & 1);
    WHO.forEach(([w], i) => { const d = +s[i + 1]; box(w + "r").checked = !!(d & 4); box(w + "w").checked = !!(d & 2); box(w + "x").checked = !!(d & 1); });
  }
  function symbolic() {
    const t = w => `${box(w + "r").checked ? "r" : "-"}${box(w + "w").checked ? "w" : "-"}`;
    const x = (w, special, ch) => (box(special).checked ? (box(w + "x").checked ? ch : ch.toUpperCase()) : box(w + "x").checked ? "x" : "-");
    return t("u") + x("u", "suid", "s") + t("g") + x("g", "sgid", "s") + t("o") + x("o", "sticky", "t");
  }
  function render(skip) {
    const oct = fromBoxes(), sym = symbolic();
    if (skip !== "oct") $("#ch-oct").value = oct;
    if (skip !== "sym") $("#ch-sym").value = sym;
    const ug = WHO.map(([w]) => `${w}=${["r", "w", "x"].filter(p => box(w + p).checked).join("")}`).join(",");
    $("#ch-out").innerHTML = TK.kv([["numeric", `chmod ${oct} file`], ["symbolic", `chmod ${ug} file`], ["recursive dirs only", `find . -type d -exec chmod ${oct} {} +`], ["ls -l shows", `-${sym}`]]);
    const who = { u: "The owner", g: "The group", o: "Everyone else" };
    const mean = WHO.map(([w]) => {
      const p = ["r", "w", "x"].filter(x => box(w + x).checked).map(x => ({ r: "read", w: "write", x: "execute / enter" }[x]));
      return `<div><span>${who[w]} can ${p.length ? p.join(", ") : "do nothing"}</span></div>`;
    });
    if (box("suid").checked) mean.push(`<div><span class="tk-warn">setuid — runs with the owner's privileges</span></div>`);
    if (box("sgid").checked) mean.push(`<div><span class="tk-warn">setgid — runs with the group's privileges / new files inherit the directory's group</span></div>`);
    if (box("sticky").checked) mean.push(`<div><span>sticky — only the owner may delete files in this directory</span></div>`);
    if (box("ow").checked) mean.push(`<div><span class="tk-err">world-writable — anyone on the system can modify this</span></div>`);
    $("#ch-mean").innerHTML = mean.join("");
  }
  function umask() {
    const v = $("#ch-umask").value.trim();
    if (!/^[0-7]{3,4}$/.test(v)) { $("#ch-um-out").textContent = "enter 3–4 octal digits"; return; }
    const u = parseInt(v, 8) & 0o777;
    $("#ch-um-out").innerHTML = `new files: <b>${(0o666 & ~u).toString(8).padStart(3, "0")}</b> · new directories: <b>${(0o777 & ~u).toString(8).padStart(3, "0")}</b>`;
  }
  root.querySelectorAll("[data-p]").forEach(c => c.addEventListener("change", () => render()));
  $("#ch-oct").addEventListener("input", () => { const v = $("#ch-oct").value.trim(); if (/^[0-7]{3,4}$/.test(v)) { setBoxes(v); render("oct"); } });
  $("#ch-sym").addEventListener("input", () => {
    let v = $("#ch-sym").value.trim();
    if (v.length === 10) v = v.slice(1); // "-rwxr-xr-x" as printed by ls -l
    if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(v)) return;
    WHO.forEach(([w], i) => { box(w + "r").checked = v[i * 3] === "r"; box(w + "w").checked = v[i * 3 + 1] === "w"; box(w + "x").checked = /[xst]/.test(v[i * 3 + 2]); });
    box("suid").checked = /[sS]/.test(v[2]); box("sgid").checked = /[sS]/.test(v[5]); box("sticky").checked = /[tT]/.test(v[8]);
    render("sym");
  });
  root.addEventListener("click", e => { const b = e.target.closest("[data-pre]"); if (b) { setBoxes(b.dataset.pre); render(); } });
  $("#ch-umask").addEventListener("input", umask);
  setBoxes("755");
  render();
  umask();
});

/* ============================================================
   UUID / ULID / NanoID
   ============================================================ */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const UID = {
  v4: () => crypto.randomUUID ? crypto.randomUUID() : UID.fmt(UID.bits(TK.rand(16), 4)),
  v7() {
    const b = TK.rand(16), t = Date.now();
    for (let i = 0; i < 6; i++) b[i] = Math.floor(t / 2 ** (8 * (5 - i))) & 255;
    return UID.fmt(UID.bits(b, 7));
  },
  v1() {
    const b = TK.rand(16);
    const t = BigInt(Date.now()) * 10000n + 0x01b21dd213814000n; // 100-ns ticks since 1582-10-15
    const lo = Number(t & 0xffffffffn), mid = Number((t >> 32n) & 0xffffn), hi = Number((t >> 48n) & 0x0fffn);
    const dv = new DataView(b.buffer);
    dv.setUint32(0, lo); dv.setUint16(4, mid); dv.setUint16(6, hi | 0x1000);
    b[8] = (b[8] & 0x3f) | 0x80;
    b[10] |= 0x01; // multicast bit → random node, not a MAC address
    return UID.fmt(b);
  },
  bits(b, v) { b[6] = (b[6] & 0x0f) | (v << 4); b[8] = (b[8] & 0x3f) | 0x80; return b; },
  fmt(b) { const h = TK.hex(b); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; },
  ulid() {
    let t = Date.now(), s = "";
    for (let i = 0; i < 10; i++) { s = CROCKFORD[t % 32] + s; t = Math.floor(t / 32); }
    const r = TK.rand(16);
    for (let i = 0; i < 16; i++) s += CROCKFORD[r[i] & 31];
    return s;
  },
  nano(size, alphabet) { let s = ""; for (let i = 0; i < size; i++) s += alphabet[TK.randInt(alphabet.length)]; return s; },
  decode(str) {
    const s = str.trim();
    if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(s)) {
      const t = [...s.slice(0, 10).toUpperCase()].reduce((n, c) => n * 32 + CROCKFORD.indexOf(c), 0);
      return [["type", "ULID"], ["timestamp", new Date(t).toISOString()], ["randomness", s.slice(10)]];
    }
    const h = s.replace(/[{}-]/g, "").replace(/^urn:uuid:/i, "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(h)) return null;
    const v = parseInt(h[12], 16), varN = parseInt(h[16], 16);
    const variant = varN < 8 ? "NCS (legacy)" : varN < 12 ? "RFC 9562 / 4122" : varN < 14 ? "Microsoft GUID (legacy)" : "reserved";
    const rows = [["canonical", `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`], ["version", `${v} — ${{ 1: "time + node", 2: "DCE security", 3: "MD5 name-based", 4: "random", 5: "SHA-1 name-based", 6: "reordered time", 7: "Unix-time ordered", 8: "custom" }[v] || "unknown"}`], ["variant", variant]];
    if (h === "0".repeat(32)) rows.push(["note", "the nil UUID"]);
    if (v === 7) rows.push(["timestamp", new Date(parseInt(h.slice(0, 12), 16)).toISOString()]);
    if (v === 1 || v === 6) {
      const ticks = v === 1 ? BigInt("0x" + h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8)) : BigInt("0x" + h.slice(0, 12) + h.slice(13, 16));
      rows.push(["timestamp", new Date(Number((ticks - 0x01b21dd213814000n) / 10000n)).toISOString()]);
      rows.push(["node", h.slice(20).match(/../g).join(":") + (parseInt(h[21], 16) & 1 ? " (random)" : " (MAC address)")]);
    }
    return rows;
  },
};

Toolbox.define("uuid", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        ${TK.segHtml("uu-kind", [["v4", "UUID v4"], ["v7", "UUID v7"], ["v1", "UUID v1"], ["ulid", "ULID"], ["nano", "NanoID"]], "v4")}
        <label class="tk-field" style="width:100px"><span class="tk-label">Count</span><input class="tk-input" id="uu-n" type="number" min="1" max="1000" value="10"></label>
      </div>
      <div class="tk-row" style="margin-top:12px" id="uu-uuidopt">
        <label class="tk-check"><input type="checkbox" id="uu-up"> UPPERCASE</label>
        <label class="tk-check"><input type="checkbox" id="uu-dash" checked> hyphens</label>
        <label class="tk-check"><input type="checkbox" id="uu-brace"> {braces}</label>
      </div>
      <div class="tk-row" style="margin-top:12px" id="uu-nanoopt" hidden>
        <label class="tk-field" style="width:100px"><span class="tk-label">Size</span><input class="tk-input" id="uu-size" type="number" min="4" max="64" value="21"></label>
        <label class="tk-field tk-grow"><span class="tk-label">Alphabet</span><input class="tk-input" id="uu-alpha" value="_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" spellcheck="false"></label>
      </div>
      <div class="tk-row" style="margin-top:12px"><button class="btn" id="uu-go">Generate</button>${TK.copyBtn("#uu-out", "Copy all")}<span class="tk-note" id="uu-info"></span></div>
      <textarea class="tk-textarea tall" id="uu-out" readonly spellcheck="false" style="margin-top:12px"></textarea>
    </section>
    <section class="tk-panel">
      <h3 class="tk-h">// decode / validate</h3>
      <input class="tk-input" id="uu-dec" placeholder="paste a UUID or ULID" spellcheck="false">
      <div id="uu-dec-out" style="margin-top:10px"></div>
    </section>`;
  const $ = s => root.querySelector(s);
  let kind = "v4";
  const INFO = { v4: "122 random bits. The default choice.", v7: "48-bit millisecond timestamp + 74 random bits — sorts by creation time, great as a database primary key.",
    v1: "timestamp + random node (no MAC address is used). Legacy — prefer v7.", ulid: "26 chars, Crockford Base32, lexicographically sortable by time.", nano: "compact URL-safe random ID." };
  function gen() {
    const n = Math.min(1000, Math.max(1, +$("#uu-n").value || 1));
    $("#uu-uuidopt").hidden = !["v4", "v7", "v1"].includes(kind);
    $("#uu-nanoopt").hidden = kind !== "nano";
    const alpha = [...new Set($("#uu-alpha").value)].join("") || "_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const size = Math.min(64, Math.max(4, +$("#uu-size").value || 21));
    const out = [];
    for (let i = 0; i < n; i++) {
      let id = kind === "ulid" ? UID.ulid() : kind === "nano" ? UID.nano(size, alpha) : UID[kind]();
      if (["v4", "v7", "v1"].includes(kind)) {
        if ($("#uu-up").checked) id = id.toUpperCase();
        if (!$("#uu-dash").checked) id = id.replace(/-/g, "");
        if ($("#uu-brace").checked) id = `{${id}}`;
      }
      out.push(id);
    }
    $("#uu-out").value = out.join("\n");
    $("#uu-info").textContent = kind === "nano" ? `${INFO.nano} ≈ ${Math.round(size * Math.log2(alpha.length))} bits` : INFO[kind];
  }
  TK.seg($("#uu-kind"), v => { kind = v; gen(); });
  root.querySelectorAll("#uu-n, #uu-up, #uu-dash, #uu-brace, #uu-size, #uu-alpha").forEach(el => el.addEventListener("change", gen));
  $("#uu-go").addEventListener("click", gen);
  $("#uu-dec").addEventListener("input", () => {
    const v = $("#uu-dec").value;
    if (!v.trim()) { $("#uu-dec-out").innerHTML = ""; return; }
    const r = UID.decode(v);
    $("#uu-dec-out").innerHTML = r ? TK.kv(r) : `<div class="tk-msg err">not a valid UUID or ULID</div>`;
  });
  gen();
});
