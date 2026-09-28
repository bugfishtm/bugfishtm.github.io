/* ============================================================
   BUGFISH TOOLS — network.js
   DNS lookup + mail DNS checker (DNS-over-HTTPS) and the
   IPv4 / IPv6 subnet calculator (fully offline).

   Privacy (GDPR): the two DNS tools contact the resolver the
   visitor picks (Cloudflare or Google, USA) ONLY after the visitor
   has ticked the consent box for that provider (Art. 6 (1) lit. a
   GDPR). Consent lives in memory for the current visit — nothing is
   stored on the device — and unticking withdraws it. DOH.query()
   refuses to send anything without consent, whatever the UI does.
   ============================================================ */

const DOH_CONSENT = new Set();
const DOH_PROVIDERS = {
  cloudflare: { name: "Cloudflare, Inc.", where: "USA", privacy: "https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/" },
  google: { name: "Google LLC", where: "USA", privacy: "https://developers.google.com/speed/public-dns/privacy" },
};
const consentHtml = id => `<div class="tk-consent" id="${id}">
    <label class="tk-check"><input type="checkbox" data-consent> <span data-consent-text></span></label>
    <p class="tk-note" data-consent-links></p></div>`;
/* providers() → the resolver ids the tool is about to use;
   onChange(ok) → enable / disable the tool's buttons. */
function bindConsent(root, sel, providers, onChange) {
  const box = root.querySelector(sel), cb = box.querySelector("[data-consent]");
  const ok = () => providers().every(p => DOH_CONSENT.has(p));
  function paint() {
    const ps = providers().map(p => DOH_PROVIDERS[p]);
    box.querySelector("[data-consent-text]").textContent =
      `I consent to my browser sending the domain or IP address I look up — together with my IP address and the usual ` +
      `technical request data — to ${ps.map(p => `${p.name} (${p.where})`).join(" and ")} so that my DNS queries can be answered. ` +
      `This means a transfer of data to the USA.`;
    box.querySelector("[data-consent-links]").innerHTML =
      `Voluntary and only for this visit — nothing is stored on your device. Untick the box to withdraw your consent at any time. ` +
      ps.map(p => `<a href="${p.privacy}" target="_blank" rel="noopener noreferrer">${esc(p.name)} privacy notice</a>`).join(" · ") +
      ` · <a href="privacy.html#tools">our privacy policy, section 5</a>`;
    cb.checked = ok();
    box.classList.toggle("given", cb.checked);
    onChange(cb.checked);
  }
  cb.addEventListener("change", () => { providers().forEach(p => (cb.checked ? DOH_CONSENT.add(p) : DOH_CONSENT.delete(p))); paint(); });
  paint();
  return { paint, ok };
}

const DOH = {
  resolvers: {
    cloudflare: { label: "Cloudflare (1.1.1.1)", url: (n, t) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(n)}&type=${t}` },
    google: { label: "Google (8.8.8.8)", url: (n, t) => `https://dns.google/resolve?name=${encodeURIComponent(n)}&type=${t}` },
  },
  TYPES: { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 13: "HINFO", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV", 35: "NAPTR", 43: "DS", 46: "RRSIG", 47: "NSEC", 48: "DNSKEY", 50: "NSEC3", 52: "TLSA", 64: "SVCB", 65: "HTTPS", 99: "SPF", 257: "CAA" },
  STATUS: { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED" },
  async query(name, type, resolver = "cloudflare") {
    if (!DOH_CONSENT.has(resolver)) throw new Error("no consent for this resolver — tick the consent box first");
    const t0 = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(this.resolvers[resolver].url(name, type), { headers: { accept: "application/dns-json" }, signal: ctrl.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!res.ok) throw new Error(`resolver answered HTTP ${res.status}`);
      const j = await res.json();
      j.ms = Math.round(performance.now() - t0);
      return j;
    } catch (e) {
      throw new Error(e.name === "AbortError" ? "resolver timed out" : `could not reach the resolver (${e.message}) — offline or blocked by an extension?`);
    } finally { clearTimeout(timer); }
  },
  /* TXT data arrives as one or more quoted chunks; join them. */
  txt(data) {
    const s = String(data);
    const chunks = s.match(/"((?:[^"\\]|\\.)*)"/g);
    return chunks ? chunks.map(c => c.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\")).join("") : s;
  },
  async txtRecords(name, resolver) {
    const j = await this.query(name, "TXT", resolver);
    return { status: j.Status, records: (j.Answer || []).filter(a => a.type === 16).map(a => this.txt(a.data)) };
  },
  ascii(name) {
    const n = String(name).trim().replace(/^[a-z]+:\/\//i, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
    if (!/[^\x00-\x7f]/.test(n)) return n.toLowerCase();
    try { return new URL(`http://${n}`).hostname; } catch (e) { return n; }
  },
};

function ptrName(ip) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.split(".").reverse().join(".") + ".in-addr.arpa";
  const full = IP6.expand(ip);
  return full ? full.replace(/:/g, "").split("").reverse().join(".") + ".ip6.arpa" : null;
}
const fmtTTL = s => {
  const parts = [[86400, "d"], [3600, "h"], [60, "m"], [1, "s"]].map(([k, u]) => { const v = Math.floor(s / k); s %= k; return v ? `${v}${u}` : ""; }).filter(Boolean);
  return parts.slice(0, 2).join(" ") || "0s";
};

/* ============================================================
   DNS lookup
   ============================================================ */
Toolbox.define("dns", root => {
  const TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA", "SRV", "PTR", "DS", "DNSKEY", "HTTPS"];
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <input class="tk-input tk-grow" id="dn-name" value="bugfish.eu" placeholder="domain, subdomain or IP address" spellcheck="false" autocomplete="off">
        <select class="tk-select" id="dn-type" style="width:auto"><option value="ALL">all common types</option>${TYPES.map(t => `<option>${t}</option>`).join("")}</select>
        <select class="tk-select" id="dn-res" style="width:auto"><option value="cloudflare">Cloudflare</option><option value="google">Google</option><option value="both">compare both</option></select>
        <button class="btn" id="dn-go" type="button">Lookup</button>
      </div>
      <div style="margin-top:12px">${consentHtml("dn-consent")}</div>
      <p class="tk-note" style="margin-top:10px">Your browser asks the chosen DNS-over-HTTPS resolver directly — this website never sees your queries.
        IP addresses are turned into PTR (reverse DNS) queries automatically; umlaut domains are converted to punycode.</p>
    </section>
    <section class="tk-panel"><div id="dn-out"><p class="tk-note">tick the consent box, then press Lookup</p></div></section>`;
  const $ = s => root.querySelector(s);
  let seq = 0;
  const providers = () => ($("#dn-res").value === "both" ? ["cloudflare", "google"] : [$("#dn-res").value]);
  const consent = bindConsent(root, "#dn-consent", providers, ok => { $("#dn-go").disabled = !ok; });
  $("#dn-res").addEventListener("change", consent.paint);

  function table(j) {
    const rows = (j.Answer || []).concat((j.Answer ? [] : j.Authority || []).map(a => ({ ...a, auth: true })));
    if (!rows.length) return `<p class="tk-note">${j.Status === 3 ? "NXDOMAIN — the name does not exist" : "no records of this type"}</p>`;
    return `<table class="tk-table"><thead><tr><th>name</th><th>type</th><th>TTL</th><th>data</th></tr></thead><tbody>` +
      rows.map(a => `<tr><td class="mono">${esc(a.name)}</td><td><span class="tk-badge${a.auth ? "" : " info"}">${esc(DOH.TYPES[a.type] || a.type)}${a.auth ? " (authority)" : ""}</span></td>
        <td class="tk-dim">${fmtTTL(a.TTL)}</td><td class="mono">${esc(a.type === 16 ? DOH.txt(a.data) : a.data)}</td></tr>`).join("") + `</tbody></table>`;
  }
  const head = (j, label) => `<div class="tk-row" style="margin:6px 0 10px"><b style="color:var(--text-bright)">${esc(label)}</b>
    <span class="tk-badge ${j.Status === 0 ? "ok" : "err"}">${DOH.STATUS[j.Status] || j.Status}</span>
    ${j.AD ? `<span class="tk-badge ok" title="the resolver validated DNSSEC">DNSSEC ✓</span>` : `<span class="tk-badge" title="answer not DNSSEC-validated">DNSSEC –</span>`}
    <span class="tk-note">${j.ms} ms</span></div>`;
  const key = j => (j.Answer || []).map(a => `${a.type}|${a.type === 16 ? DOH.txt(a.data) : a.data}`).sort().join("\n");

  async function go() {
    if (!consent.ok()) { $("#dn-out").innerHTML = `<div class="tk-msg warn">please tick the consent box first — no data is sent without it</div>`; return; }
    const my = ++seq;
    let name = DOH.ascii($("#dn-name").value);
    if (!name) return;
    let type = $("#dn-type").value;
    const ptr = ptrName(name);
    if (ptr) { name = ptr; type = "PTR"; }
    const res = $("#dn-res").value;
    const resolvers = res === "both" ? ["cloudflare", "google"] : [res];
    const types = type === "ALL" ? ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA"] : [type];
    $("#dn-out").innerHTML = `<p class="tk-note">querying ${esc(name)}…</p>`;
    const blocks = await Promise.all(types.map(async t => {
      const answers = await Promise.all(resolvers.map(r => DOH.query(name, t, r).then(j => ({ r, j }), e => ({ r, e }))));
      if (my !== seq) return "";
      const err = answers.find(a => a.e);
      if (err && answers.every(a => a.e)) return `<h3 class="tk-h">// ${t}</h3><div class="tk-msg err">${esc(err.e.message)}</div>`;
      const same = answers.length === 2 && !answers.some(a => a.e) && key(answers[0].j) === key(answers[1].j);
      const hasData = answers.some(a => a.j && (a.j.Answer || []).length);
      if (type === "ALL" && !hasData) return "";
      return `<h3 class="tk-h">// ${t}${answers.length === 2 ? (same ? ` <span class="tk-badge ok">resolvers agree</span>` : ` <span class="tk-badge warn">answers differ — propagation or geo-DNS?</span>`) : ""}</h3>
        <div class="${answers.length === 2 ? "tk-grid two" : ""}">${answers.map(a => `<div>${a.e ? `<div class="tk-msg err">${esc(a.e.message)}</div>` : head(a.j, DOH.resolvers[a.r].label) + `<div class="tk-scroll">${table(a.j)}</div>`}</div>`).join("")}</div>`;
    }));
    if (my !== seq) return;
    const html = blocks.join("");
    $("#dn-out").innerHTML = html || `<p class="tk-note">no records found for ${esc(name)}</p>`;
  }
  $("#dn-go").addEventListener("click", go);
  $("#dn-name").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
});

/* ============================================================
   Mail DNS checker
   ============================================================ */
Toolbox.define("mailcheck", root => {
  const SELECTORS = ["default", "google", "selector1", "selector2", "k1", "k2", "mail", "dkim", "s1", "s2", "smtp", "mandrill", "zoho", "protonmail", "fm1", "key1", "mxvault", "sig1", "mailjet", "sendgrid", "ses", "amazonses"];
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row">
        <input class="tk-input tk-grow" id="mc-dom" value="bugfish.eu" placeholder="example.com" spellcheck="false" autocomplete="off">
        <select class="tk-select" id="mc-res" style="width:auto"><option value="cloudflare">Cloudflare</option><option value="google">Google</option></select>
        <button class="btn" id="mc-go" type="button">Check domain</button>
      </div>
      <div style="margin-top:12px">${consentHtml("mc-consent")}</div>
      <label class="tk-field" style="margin-top:12px"><span class="tk-label">DKIM selectors to probe (comma separated)</span>
        <input class="tk-input" id="mc-sel" value="${SELECTORS.join(", ")}" spellcheck="false"></label>
      <p class="tk-note" style="margin-top:8px">Only public DNS records are queried (via DNS-over-HTTPS) — no mail is sent. Your DKIM selector is in the <code>s=</code> tag of the DKIM-Signature header of a mail you sent.</p>
    </section>
    <section class="tk-panel" id="mc-sum" hidden><h3 class="tk-h">// summary</h3><div class="tk-list" id="mc-list"></div></section>
    <div id="mc-out"></div>`;
  const $ = s => root.querySelector(s);
  const consent = bindConsent(root, "#mc-consent", () => [$("#mc-res").value], ok => { $("#mc-go").disabled = !ok; });
  $("#mc-res").addEventListener("change", consent.paint);
  let seq = 0;
  const badge = (k, t) => `<span class="tk-badge ${k}">${t}</span>`;
  const finding = (lvl, text) => `<div><span class="${lvl === "ok" ? "tk-ok" : lvl === "err" ? "tk-err" : lvl === "warn" ? "tk-warn" : "tk-dim"}">${lvl === "ok" ? "✓" : lvl === "err" ? "✗" : lvl === "warn" ? "⚠" : "ℹ"} ${text}</span></div>`;
  const panel = (title, status, body) => `<section class="tk-panel" style="margin-bottom:16px"><div class="tk-row" style="justify-content:space-between"><h3 class="tk-h" style="margin:0">// ${title}</h3>${status}</div><div style="margin-top:12px">${body}</div></section>`;

  /* Recursively count the DNS lookups an SPF record causes (RFC 7208 limit: 10). */
  async function spfWalk(domain, res, depth = 0, path = []) {
    // Only the current include chain counts as a loop — the same include in
    // two different branches is legal (and counts twice towards the limit).
    if (depth > 10 || path.includes(domain)) return { lookups: 0, tree: [], errors: [`include loop or nesting too deep at ${domain}`] };
    const { records } = await DOH.txtRecords(domain, res);
    const spf = records.filter(r => /^v=spf1(\s|$)/i.test(r));
    if (!spf.length) return { lookups: 0, tree: [], errors: [`${domain} has no SPF record`], missing: true };
    const out = { lookups: 0, tree: [], errors: [], record: spf[0], multiple: spf.length > 1 };
    for (const term of spf[0].split(/\s+/).slice(1)) {
      // The mechanism must end at ":", "=", "/" or the end of the term, otherwise
      // "all" would be read as the "a" mechanism.
      const m = /^([+?~-]?)(include|a|mx|ptr|exists|redirect|ip4|ip6|all|exp)(?:[:=/](.*))?$/i.exec(term);
      if (!m) { if (term) out.errors.push(`unknown term "${term}"`); continue; }
      const mech = m[2].toLowerCase(), arg = m[3] || "";
      const item = { term, mech, children: null };
      if (["include", "a", "mx", "ptr", "exists", "redirect"].includes(mech)) out.lookups++;
      if ((mech === "include" || mech === "redirect") && arg) {
        const sub = await spfWalk(arg.toLowerCase(), res, depth + 1, path.concat(domain));
        item.children = sub;
        out.lookups += sub.lookups;
        out.errors.push(...sub.errors.filter(e => !e.includes("has no SPF")).map(e => e));
        if (sub.missing) out.errors.push(`include:${arg} does not publish SPF (permerror)`);
      }
      out.tree.push(item);
    }
    return out;
  }
  const treeHtml = (t, ind = 0) => (t.tree || []).map(i => `<div style="margin-left:${ind * 18}px" class="mono">${esc(i.term)}${i.children ? ` <span class="tk-dim">(${i.children.lookups} nested)</span>` : ""}</div>${i.children ? treeHtml(i.children, ind + 1) : ""}`).join("");

  function dkimBits(p) {
    try { const der = TK.unb64(p); const n = der.length; return n > 500 ? 4096 : n > 380 ? 3072 : n > 250 ? 2048 : n > 150 ? 1024 : n > 30 ? 0 : -1; } catch (e) { return -1; }
  }

  async function go() {
    if (!consent.ok()) { $("#mc-out").innerHTML = `<div class="tk-msg warn">please tick the consent box first — no data is sent without it</div>`; return; }
    const my = ++seq;
    const dom = DOH.ascii($("#mc-dom").value);
    const res = $("#mc-res").value;
    if (!dom) return;
    const out = $("#mc-out");
    const sum = [];
    out.innerHTML = `<p class="tk-note">checking ${esc(dom)}…</p>`;
    $("#mc-sum").hidden = true;
    try {
      const [mx, root, dmarc, sts, tls, bimi] = await Promise.all([
        DOH.query(dom, "MX", res), DOH.txtRecords(dom, res), DOH.txtRecords(`_dmarc.${dom}`, res), DOH.txtRecords(`_mta-sts.${dom}`, res),
        DOH.txtRecords(`_smtp._tls.${dom}`, res), DOH.txtRecords(`default._bimi.${dom}`, res)]);
      if (my !== seq) return;
      let html = "";

      /* MX */
      const mxs = (mx.Answer || []).filter(a => a.type === 15).map(a => { const [p, h] = a.data.split(/\s+/); return { p: +p, h: h.replace(/\.$/, "") }; }).sort((a, b) => a.p - b.p);
      let mxBody = "", mxStat;
      if (mx.Status === 3) { mxStat = badge("err", "domain does not exist"); sum.push(finding("err", "domain does not exist (NXDOMAIN)")); }
      else if (!mxs.length) { mxStat = badge("warn", "no MX"); mxBody = finding("warn", "no MX record — mail falls back to the A record (RFC 5321). Publish MX or a null MX (0 .) if the domain sends no mail."); sum.push(finding("warn", "no MX record")); }
      else if (mxs.length === 1 && (mxs[0].h === "" || mxs[0].h === ".")) { mxStat = badge("info", "null MX"); mxBody = finding("info", "null MX — this domain explicitly accepts no mail"); sum.push(finding("info", "null MX: domain accepts no mail")); }
      else {
        const hostInfo = await Promise.all(mxs.map(async m => { const [a, c] = await Promise.all([DOH.query(m.h, "A", res), DOH.query(m.h, "CNAME", res)]); return { ...m, a: (a.Answer || []).filter(x => x.type === 1).map(x => x.data), cname: (c.Answer || []).some(x => x.type === 5) }; }));
        if (my !== seq) return;
        mxBody = `<table class="tk-table"><thead><tr><th>priority</th><th>host</th><th>resolves to</th></tr></thead><tbody>${hostInfo.map(m => `<tr><td>${m.p}</td><td class="mono">${esc(m.h)}</td><td class="mono">${m.a.length ? esc(m.a.join(", ")) : `<span class="tk-err">no A record</span>`}${m.cname ? ` <span class="tk-warn">(CNAME — not allowed for MX)</span>` : ""}</td></tr>`).join("")}</tbody></table>`;
        const broken = hostInfo.filter(m => !m.a.length);
        mxStat = broken.length ? badge("err", `${broken.length} host(s) without address`) : badge("ok", `${mxs.length} host${mxs.length > 1 ? "s" : ""}`);
        sum.push(broken.length ? finding("err", "an MX host does not resolve") : finding("ok", `MX: ${mxs.map(m => m.h).join(", ")}`));
      }
      html += panel("MX", mxStat, mxBody);

      /* SPF */
      const spfRecs = root.records.filter(r => /^v=spf1(\s|$)/i.test(r));
      let spfBody = "", spfStat;
      if (!spfRecs.length) { spfStat = badge("err", "missing"); spfBody = finding("err", "no SPF record. Publish e.g. <code>v=spf1 mx -all</code> (adjust to your senders)."); sum.push(finding("err", "SPF missing")); }
      else {
        const walk = await spfWalk(dom, res);
        if (my !== seq) return;
        const rec = spfRecs[0];
        const all = (/(?:^|\s)([+?~-]?)all(?:\s|$)/i.exec(rec) || [])[1];
        const f = [];
        if (spfRecs.length > 1) f.push(finding("err", `${spfRecs.length} SPF records — only one is allowed (permerror)`));
        f.push(walk.lookups > 10 ? finding("err", `${walk.lookups} DNS lookups — above the limit of 10 (permerror, SPF fails)`) : finding(walk.lookups > 8 ? "warn" : "ok", `${walk.lookups} / 10 DNS lookups`));
        if (all === undefined && !/redirect=/i.test(rec)) f.push(finding("warn", "no all mechanism — ends neutral"));
        else if (all === "+" || all === "") f.push(finding("err", "+all lets the whole internet send as you"));
        else if (all === "?") f.push(finding("warn", "?all (neutral) gives no protection"));
        else if (all === "~") f.push(finding("ok", "~all (softfail) — fine together with DMARC; -all is stricter"));
        else if (all === "-") f.push(finding("ok", "-all (hard fail)"));
        if (/\bptr\b/i.test(rec)) f.push(finding("warn", "ptr mechanism is deprecated (RFC 7208) and slow"));
        if (rec.length > 255) f.push(finding("info", `${rec.length} characters — must be split into 255-byte strings in the zone file`));
        walk.errors.forEach(e => f.push(finding("err", esc(e))));
        spfStat = f.some(x => x.includes("tk-err")) ? badge("err", "problems") : f.some(x => x.includes("tk-warn")) ? badge("warn", "warnings") : badge("ok", "valid");
        spfBody = `<pre class="tk-out">${esc(rec)}</pre><div class="tk-list" style="margin-top:10px">${f.join("")}</div>
          <details style="margin-top:10px"><summary class="tk-label" style="cursor:pointer;display:list-item">lookup tree</summary><div style="margin-top:8px;font-size:12px">${treeHtml(walk)}</div></details>`;
        sum.push(spfStat.includes("err") ? finding("err", "SPF has problems") : spfStat.includes("warn") ? finding("warn", "SPF has warnings") : finding("ok", "SPF valid"));
      }
      html += panel("SPF", spfStat, spfBody);

      /* DMARC */
      const dm = dmarc.records.filter(r => /^v=DMARC1/i.test(r));
      let dmBody = "", dmStat;
      if (!dm.length) { dmStat = badge("err", "missing"); dmBody = finding("err", `no DMARC record at <code>_dmarc.${esc(dom)}</code>. Start with <code>v=DMARC1; p=none; rua=mailto:dmarc@${esc(dom)}</code>, then tighten to quarantine / reject.`); sum.push(finding("err", "DMARC missing")); }
      else {
        const tags = Object.fromEntries(dm[0].split(";").map(x => x.trim().split("=").map(s => s && s.trim())).filter(x => x[0]));
        const f = [];
        if (dm.length > 1) f.push(finding("err", "more than one DMARC record — receivers ignore all of them"));
        const p = (tags.p || "").toLowerCase();
        f.push(p === "reject" ? finding("ok", "p=reject — spoofed mail is rejected") : p === "quarantine" ? finding("ok", "p=quarantine — spoofed mail goes to spam")
          : p === "none" ? finding("warn", "p=none — monitoring only, spoofed mail is still delivered") : finding("err", "missing or invalid p= tag"));
        if (tags.pct && +tags.pct < 100) f.push(finding("info", `pct=${tags.pct} — policy applies to ${tags.pct} % of failing mail`));
        f.push(tags.rua ? finding("ok", `aggregate reports to ${esc(tags.rua)}`) : finding("warn", "no rua= — you receive no reports"));
        if (tags.sp) f.push(finding("info", `subdomain policy sp=${esc(tags.sp)}`));
        f.push(finding("info", `alignment: DKIM ${tags.adkim === "s" ? "strict" : "relaxed"}, SPF ${tags.aspf === "s" ? "strict" : "relaxed"}`));
        dmStat = p === "reject" || p === "quarantine" ? badge("ok", `p=${p}`) : badge(p === "none" ? "warn" : "err", `p=${p || "?"}`);
        dmBody = `<pre class="tk-out">${esc(dm[0])}</pre><div class="tk-list" style="margin-top:10px">${f.join("")}</div>`;
        sum.push(finding(p === "reject" || p === "quarantine" ? "ok" : "warn", `DMARC p=${p || "?"}`));
      }
      html += panel("DMARC", dmStat, dmBody);

      /* DKIM */
      const sels = [...new Set($("#mc-sel").value.split(/[\s,]+/).map(s => s.trim()).filter(Boolean))].slice(0, 40);
      const found = (await Promise.all(sels.map(async s => {
        try { const r = await DOH.txtRecords(`${s}._domainkey.${dom}`, res); const rec = r.records.find(x => /(^|;)\s*(v=DKIM1|k=|p=)/i.test(x)); return rec ? { s, rec } : null; }
        catch (e) { return null; }
      }))).filter(Boolean);
      if (my !== seq) return;
      let dkBody, dkStat;
      if (!found.length) { dkStat = badge("warn", "none found"); dkBody = finding("warn", `no DKIM key under the ${sels.length} probed selectors. That does not prove there is none — add your provider's selector.`); sum.push(finding("warn", "no DKIM key found (selector unknown?)")); }
      else {
        dkBody = `<table class="tk-table"><thead><tr><th>selector</th><th>key</th><th>record</th></tr></thead><tbody>${found.map(({ s, rec }) => {
          const p = (/(?:^|;)\s*p=([^;]*)/i.exec(rec) || [])[1] || "";
          const k = ((/(?:^|;)\s*k=([^;]*)/i.exec(rec) || [])[1] || "rsa").trim();
          const bits = k === "ed25519" ? "ed25519" : dkimBits(p.replace(/\s/g, ""));
          const info = !p.trim() ? `<span class="tk-err">revoked (empty p=)</span>` : bits === "ed25519" ? `<span class="tk-ok">Ed25519</span>`
            : bits >= 2048 ? `<span class="tk-ok">RSA ${bits}</span>` : bits === 1024 ? `<span class="tk-warn">RSA 1024 — upgrade to 2048</span>` : `<span class="tk-dim">RSA ?</span>`;
          return `<tr><td class="mono">${esc(s)}</td><td>${info}</td><td class="mono" style="max-width:420px">${esc(rec.length > 140 ? rec.slice(0, 140) + "…" : rec)}</td></tr>`;
        }).join("")}</tbody></table>`;
        dkStat = badge("ok", `${found.length} key${found.length > 1 ? "s" : ""}`);
        sum.push(finding("ok", `DKIM: ${found.map(f => f.s).join(", ")}`));
      }
      html += panel("DKIM", dkStat, dkBody);

      /* MTA-STS, TLS-RPT, BIMI */
      const stsRec = sts.records.find(r => /^v=STSv1/i.test(r));
      const tlsRec = tls.records.find(r => /^v=TLSRPTv1/i.test(r));
      const bimiRec = bimi.records.find(r => /^v=BIMI1/i.test(r));
      html += panel("transport security &amp; branding", "", `<div class="tk-list">${[
        stsRec ? finding("ok", `MTA-STS: <code>${esc(stsRec)}</code> — policy must be served at https://mta-sts.${esc(dom)}/.well-known/mta-sts.txt`) : finding("info", "no MTA-STS — optional, enforces TLS for incoming mail"),
        tlsRec ? finding("ok", `TLS-RPT: <code>${esc(tlsRec)}</code>`) : finding("info", "no TLS-RPT (_smtp._tls) — optional TLS failure reports"),
        bimiRec ? finding("ok", `BIMI: <code>${esc(bimiRec)}</code>`) : finding("info", "no BIMI — optional brand logo in supporting inboxes (needs DMARC enforcement)"),
      ].join("")}</div>`);

      out.innerHTML = html;
      $("#mc-list").innerHTML = sum.join("");
      $("#mc-sum").hidden = false;
    } catch (e) {
      if (my === seq) out.innerHTML = `<div class="tk-msg err">${esc(e.message)}</div>`;
    }
  }
  $("#mc-go").addEventListener("click", go);
  $("#mc-dom").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
});

/* ============================================================
   Subnet calculator (IPv4 + IPv6)
   ============================================================ */
const IP6 = {
  /* "2001:db8::1" → "2001:0db8:0000:…:0001" or null */
  expand(s) {
    let a = String(s).trim().toLowerCase();
    if (!/^[0-9a-f:.]+$/.test(a) || !a.includes(":")) return null;
    const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(a);
    if (v4) {
      const p = v4[1].split(".").map(Number);
      if (p.some(x => x > 255)) return null;
      a = a.replace(v4[1], `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`);
    }
    const parts = a.split("::");
    if (parts.length > 2) return null;
    const head = parts[0] ? parts[0].split(":") : [];
    const tail = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
    const fill = parts.length === 2 ? 8 - head.length - tail.length : 0;
    if (fill < 0 || (parts.length === 1 && head.length !== 8)) return null;
    const groups = [...head, ...new Array(fill).fill("0"), ...tail];
    if (groups.length !== 8 || groups.some(g => !/^[0-9a-f]{1,4}$/.test(g))) return null;
    return groups.map(g => g.padStart(4, "0")).join(":");
  },
  toBig(s) { const e = this.expand(s); return e ? BigInt("0x" + e.replace(/:/g, "")) : null; },
  fromBig(n) { return n.toString(16).padStart(32, "0").match(/.{4}/g).join(":"); },
  compress(full) {
    const g = full.split(":").map(x => x.replace(/^0+(?=.)/, ""));
    let best = -1, len = 0;
    for (let i = 0; i < 8;) {
      if (g[i] !== "0") { i++; continue; }
      let j = i;
      while (j < 8 && g[j] === "0") j++;
      if (j - i > len && j - i > 1) { best = i; len = j - i; }
      i = j;
    }
    if (best < 0) return g.join(":");
    return `${g.slice(0, best).join(":")}::${g.slice(best + len).join(":")}`;
  },
};

Toolbox.define("subnet", root => {
  root.innerHTML = `
    <section class="tk-panel">
      <div class="tk-row"><input class="tk-input tk-grow" id="sn-in" value="192.168.10.37/26" placeholder="192.168.1.0/24 · 10.0.0.1 255.255.255.0 · 2001:db8::/48" spellcheck="false">
        <label class="tk-field" style="width:170px"><span class="tk-label">Split into /<em id="sn-split-v"></em></span><input type="range" id="sn-split" min="1" max="32" value="28"></label></div>
      <div class="tk-row tight" style="margin-top:10px">${["192.168.1.0/24", "10.0.0.0/8", "172.16.5.4/20", "100.64.0.0/10", "2001:db8:abcd::/48", "fe80::1/64"].map(x => `<button class="tk-copy" type="button" data-ex="${x}">${x}</button>`).join("")}</div>
      <div class="tk-msg" id="sn-msg" style="margin-top:10px"></div>
    </section>
    <section class="tk-panel"><h3 class="tk-h">// network</h3><div id="sn-out"></div><div id="sn-bin" style="margin-top:12px;font-family:var(--mono);font-size:13px;overflow-x:auto"></div></section>
    <section class="tk-panel"><h3 class="tk-h" id="sn-split-h">// subnets</h3><div class="tk-scroll" id="sn-subs" style="max-height:420px;overflow:auto"></div></section>`;
  const $ = s => root.querySelector(s);
  const ip4 = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  const parse4 = s => { const p = s.split("."); if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) return null; return p.reduce((n, x) => n * 256 + +x, 0) >>> 0; };
  const maskBits = m => { const n = parse4(m); if (n == null) return null; const b = n.toString(2).padStart(32, "0"); return /^1*0*$/.test(b) ? b.indexOf("0") < 0 ? 32 : b.indexOf("0") : null; };
  function kind4(n) {
    const inR = (a, p) => (n >>> (32 - p)) === (parse4(a) >>> (32 - p));
    if (inR("10.0.0.0", 8) || inR("172.16.0.0", 12) || inR("192.168.0.0", 16)) return "private (RFC 1918)";
    if (inR("100.64.0.0", 10)) return "carrier-grade NAT (RFC 6598)";
    if (inR("127.0.0.0", 8)) return "loopback";
    if (inR("169.254.0.0", 16)) return "link-local (APIPA)";
    if (inR("192.0.2.0", 24) || inR("198.51.100.0", 24) || inR("203.0.113.0", 24)) return "documentation (TEST-NET)";
    if (inR("224.0.0.0", 4)) return "multicast";
    if (inR("240.0.0.0", 4)) return "reserved";
    if (n === 0) return "unspecified";
    return "public";
  }
  function kind6(n) {
    const top = p => n >> BigInt(128 - p);
    if (n === 1n) return "loopback";
    if (n === 0n) return "unspecified";
    if (top(7) === 0x7en) return "unique local (ULA, fc00::/7)";
    if (top(10) === 0x3fan) return "link-local (fe80::/10)";
    if (top(8) === 0xffn) return "multicast";
    if (top(32) === 0x20010db8n) return "documentation (2001:db8::/32)";
    if (top(96) === 0xffffn) return "IPv4-mapped";
    if (top(3) === 1n) return "global unicast";
    return "reserved / other";
  }
  function run() {
    const raw = $("#sn-in").value.trim();
    const msg = $("#sn-msg");
    TK.msg(msg, "");
    let [addr, pre] = raw.split(/\s*\/\s*|\s+/);
    if (raw.includes(":")) return run6(addr, pre);
    const n = parse4(addr || "");
    let p = pre == null ? 32 : /^\d+$/.test(pre) ? +pre : maskBits(pre);
    if (n == null || p == null || p < 0 || p > 32) { TK.msg(msg, "enter an IPv4 address with /prefix or netmask, or an IPv6 address", "err"); return; }
    const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
    const net = (n & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
    const total = 2 ** (32 - p);
    const hosts = p >= 31 ? total : total - 2;
    const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
    const cls = n < 0x80000000 ? "A" : n < 0xc0000000 ? "B" : n < 0xe0000000 ? "C" : n < 0xf0000000 ? "D (multicast)" : "E";
    $("#sn-out").innerHTML = TK.kv([["address", ip4(n)], ["CIDR", `${ip4(net)}/${p}`], ["netmask", ip4(mask)], ["wildcard", ip4(~mask >>> 0)],
      ["network", ip4(net)], ["broadcast", p >= 31 ? "— (point-to-point / host route)" : ip4(bc)], ["host range", `${ip4(first)} – ${ip4(last)}`],
      ["usable hosts", TK.num(hosts)], ["total addresses", TK.num(total)], ["type", kind4(n)], ["class (historic)", cls],
      ["hex / integer", `0x${n.toString(16).padStart(8, "0")} / ${n}`], ["reverse zone", `${ip4(net).split(".").slice(0, Math.max(1, Math.floor(p / 8))).reverse().join(".")}.in-addr.arpa`]]);
    const bits = n.toString(2).padStart(32, "0");
    $("#sn-bin").innerHTML = `<div class="tk-dim" style="margin-bottom:4px">network bits in orange</div>` + [0, 8, 16, 24].map(o => [...bits.slice(o, o + 8)].map((b, i) => `<span style="color:${o + i < p ? "var(--orange)" : "var(--text-mid)"}">${b}</span>`).join("")).join(`<span class="tk-dim">.</span>`);
    subnets4(net, p);
  }
  function subnets4(net, p) {
    const sp = $("#sn-split");
    sp.min = Math.min(32, p); sp.max = 32;
    if (+sp.value < p) sp.value = Math.min(32, p + 2);
    const np = +sp.value;
    $("#sn-split-v").textContent = np;
    const count = 2 ** (np - p);
    const size = 2 ** (32 - np);
    const shown = Math.min(count, 256);
    $("#sn-split-h").textContent = `// ${TK.num(count)} × /${np} subnet${count === 1 ? "" : "s"}${count > shown ? ` (first ${shown})` : ""} — ${TK.num(np >= 31 ? size : size - 2)} hosts each`;
    let rows = "";
    for (let i = 0; i < shown; i++) {
      const s = net + i * size, e = s + size - 1;
      rows += `<tr><td class="tk-dim">${i + 1}</td><td class="mono">${ip4(s)}/${np}</td><td class="mono">${np >= 31 ? ip4(s) : ip4(s + 1)} – ${np >= 31 ? ip4(e) : ip4(e - 1)}</td><td class="mono">${np >= 31 ? "—" : ip4(e)}</td></tr>`;
    }
    $("#sn-subs").innerHTML = `<table class="tk-table"><thead><tr><th>#</th><th>subnet</th><th>hosts</th><th>broadcast</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function run6(addr, pre) {
    const n = IP6.toBig(addr || "");
    const p = pre == null ? 128 : +pre;
    if (n == null || !(p >= 0 && p <= 128)) { TK.msg($("#sn-msg"), "invalid IPv6 address or prefix", "err"); return; }
    const host = 128n - BigInt(p);
    const mask = ((1n << 128n) - 1n) ^ ((1n << host) - 1n);
    const net = n & mask, end = net | ((1n << host) - 1n);
    const full = IP6.fromBig(n);
    $("#sn-out").innerHTML = TK.kv([["address", IP6.compress(full)], ["expanded", full], ["CIDR", `${IP6.compress(IP6.fromBig(net))}/${p}`],
      ["first address", IP6.compress(IP6.fromBig(net))], ["last address", IP6.compress(IP6.fromBig(end))],
      ["addresses", host > 64n ? `2^${host} (${(2 ** Number(host)).toExponential(3)})` : TK.num(Number(1n << host))], ["/64 networks", p <= 64 ? (64 - p > 40 ? `2^${64 - p}` : TK.num(2 ** (64 - p))) : "—"],
      ["type", kind6(n)], ["reverse (ip6.arpa)", full.replace(/:/g, "").split("").reverse().join(".") + ".ip6.arpa"]]);
    $("#sn-bin").innerHTML = `<div class="tk-dim" style="margin-bottom:4px">prefix nibbles in orange</div>` + [...full.replace(/:/g, "")].map((c, i) => `<span style="color:${i * 4 < p ? "var(--orange)" : "var(--text-mid)"}">${c}</span>${i % 4 === 3 && i < 31 ? '<span class="tk-dim">:</span>' : ""}`).join("");
    const sp = $("#sn-split");
    sp.min = Math.min(128, p); sp.max = Math.min(128, p + 16);
    if (+sp.value < p || +sp.value > +sp.max) sp.value = Math.min(128, p + 8);
    const np = +sp.value;
    $("#sn-split-v").textContent = np;
    const count = 1n << BigInt(np - p);
    const shown = count > 256n ? 256 : Number(count);
    $("#sn-split-h").textContent = `// ${count} × /${np} subnets${count > 256n ? " (first 256)" : ""}`;
    let rows = "";
    for (let i = 0; i < shown; i++) {
      const s = net + (BigInt(i) << BigInt(128 - np));
      rows += `<tr><td class="tk-dim">${i + 1}</td><td class="mono">${IP6.compress(IP6.fromBig(s))}/${np}</td></tr>`;
    }
    $("#sn-subs").innerHTML = `<table class="tk-table"><thead><tr><th>#</th><th>subnet</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  $("#sn-in").addEventListener("input", run);
  $("#sn-split").addEventListener("input", run);
  root.addEventListener("click", e => { const b = e.target.closest("[data-ex]"); if (b) { $("#sn-in").value = b.dataset.ex; run(); } });
  run();
});
