import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import bundled from "./articles.json";
/* when the site is published as one index.html, the articles are embedded in the page itself */
const seed = (() => { try { const e = document.getElementById("cs-data"); const j = e && JSON.parse(e.textContent); return Array.isArray(j) ? j : bundled; } catch { return bundled; } })();

import { SITE } from "./site.js";
/* All site names, colours' texts, passwords and wording live in src/site.js. Change ADMIN login there before you deploy. */
const ADMIN = SITE.admin, BRAND = SITE.name, CONTACT_EMAIL = SITE.email;
const KEY = SITE.id + "_articles_v1", TOK = SITE.id + "_token", THEME = SITE.id + "_theme";
const LV_URL = SITE.id + "_lv_url", LV_METHOD = SITE.id + "_lv_method", LV_HDR = SITE.id + "_lv_hdr";
const RESERVED = ["guides", "blogs", "about", "contact", "admin"];

/* ====== AUTO-PUBLISH (optional) ======
   Leave empty = articles are saved in this browser, export articles.json to publish.
   Paste your own Lambda Function URL (see AUTO-PUBLISH-SETUP.md) to publish live from the dashboard. */
const API_URL = "";
const LIVE = !!API_URL;
const getTok = () => { try { return localStorage.getItem(TOK) || ""; } catch { return ""; } };
const api = async (body) => {
  const r = await fetch(API_URL, { method: "POST", headers: { "content-type": "text/plain", "x-admin-token": getTok() }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || "Server error " + r.status); e.status = r.status; throw e; }
  return j;
};

/* ====== live update on deed.page: the site rebuilds its own index.html with the new articles and uploads it ====== */
const lget = (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const deedOn = () => !LIVE && /^https?:\/\//.test(lget(LV_URL));
const LT = String.fromCharCode(60); // "<" built at run time so these markers never appear inside the page's own code
const mk = (n, end) => LT + "!--" + (end ? "/" : "") + n + "-->";
const grab = (t, n) => { const a = t.indexOf(mk(n)), b = t.indexOf(mk(n, 1)); return a < 0 || b < 0 ? null : t.slice(a + mk(n).length, b); };
async function buildSite(list) {
  const r = await fetch(location.href.split("#")[0], { cache: "no-store", headers: { Accept: "text/html" } });
  const t = await r.text(), head = grab(t, "CSH"), body = grab(t, "CSB");
  if (head === null || body === null) throw new Error("open the published site, not the dev server");
  const data = JSON.stringify(list).replace(/</g, "\\u003c"), open = LT + 'script id="cs-data" type="application/json">', i = body.indexOf(open), j = body.indexOf(LT + "/script>", i);
  if (i < 0 || j < 0) throw new Error("site file has no data block");
  const nb = body.slice(0, i + open.length) + data + body.slice(j);
  return LT + "!doctype html>" + LT + 'html lang="en">' + LT + "head>" + mk("CSH") + head + mk("CSH", 1) + LT + "/head>" + LT + "body>" + LT + 'div id="root">' + LT + "/div>" + mk("CSB") + nb + mk("CSB", 1) + LT + "/body>" + LT + "/html>";
}
async function deedPublish(list) {
  const html = await buildSite(list), headers = { "Content-Type": "text/html" };
  lget(LV_HDR).split("\n").forEach((l) => { const k = l.indexOf(":"); if (k > 0) headers[l.slice(0, k).trim()] = l.slice(k + 1).trim(); });
  const r = await fetch(lget(LV_URL), { method: lget(LV_METHOD) || "PUT", headers, body: html });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || j.message || "the host said " + r.status); }
}
async function downloadSite(list) {
  const u = URL.createObjectURL(new Blob([await buildSite(list)], { type: "text/html" }));
  Object.assign(document.createElement("a"), { href: u, download: "index.html" }).click(); URL.revokeObjectURL(u);
}

const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(s) ? s : seed; } catch { return seed; } };
const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch { alert("Browser storage is full. Use smaller images, or paste an image URL instead."); return false; } };
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "article";
const text = (h) => { const d = document.createElement("div"); d.innerHTML = h || ""; return d.textContent.trim(); };
const blank = () => ({ id: "a" + Date.now(), slug: "", title: "", image: "", date: new Date().toISOString().slice(0, 10), content: "", faqs: [], note: "", showRelated: true });
const mins = (a) => Math.max(1, Math.round(text(a.content).split(/\s+/).length / 200));
const shortTitle = (t) => SITE.short(t);
const cleanH = (t) => t.replace(/^\d+\.\s*/, "");
const parse = (h) => new DOMParser().parseFromString("<body>" + (h || "") + "</body>", "text/html").body;
const heads = (a) => [...parse(a.content).querySelectorAll("h2")].map((h) => h.textContent.trim()).filter((t) => /^\d+\./.test(t)).map(cleanH);
const firstP = (a) => { const p = parse(a.content).querySelector("p"); return p ? p.textContent.trim() : ""; };
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);
const pairs = (list) => {
  const out = [];
  list.forEach((a) => {
    const b = parse(a.content); let h = "";
    for (const el of b.children) {
      if (el.tagName === "H2") h = cleanH(el.textContent.trim());
      else if (el.tagName === "BLOCKQUOTE" && h) {
        const p = (el.querySelector("p") || el).textContent.trim().replace(/^Solution:\s*/i, "");
        out.push({ c: h, s: clip(p.split(/(?<=\.)\s/)[0], 96) }); break;
      }
    }
  });
  return out.length ? out : [{ c: "Unpredictable monthly income", s: "Build a buffer that covers a few months of costs." }];
};
const rowsOf = (a) => [...parse(a.content).querySelectorAll("table tr")].map((tr) => [...tr.children].map((c) => c.textContent.trim())).filter((r) => r.length >= 3).slice(1);
const sides = (t) => { const m = t.split(":")[0].split(/\s+vs\.?\s+/i); return m.length === 2 ? m : [m[0], "the alternative"]; };
const versus = (list) => {
  const out = [];
  list.forEach((a) => { const [A, B] = sides(a.title); rowsOf(a).slice(0, 3).forEach((r) => out.push({ A, B, f: r[0], a: r[1], b: r[2] })); });
  return out.length ? out : [{ A: "Option A", B: "Option B", f: "Cost", a: "Lower upfront", b: "Higher upfront" }];
};
const toImg = (file, max = 1000) => new Promise((res) => {
  const r = new FileReader();
  r.onload = () => { const i = new Image(); i.onload = () => { const k = Math.min(1, max / i.width), c = document.createElement("canvas"); c.width = i.width * k; c.height = i.height * k; c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.78)); }; i.src = r.result; };
  r.readAsDataURL(file);
});
const pic = async (file, max) => { const d = await toImg(file, max); if (!LIVE) return d; const j = await api({ action: "upload", data: d }); return "./" + j.url; };

/* ====== hash router ====== */
const go = (to) => { location.hash = "#" + to; scrollTo(0, 0); };
const Link = ({ to, children, onClick, ...r }) => (
  <a href={"#" + to} {...r} onClick={(e) => { onClick && onClick(e); if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); if (location.hash !== "#" + to) location.hash = "#" + to; else scrollTo(0, 0); }}>{children}</a>
);
function useMeta(title, desc, ld) {
  useEffect(() => {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = desc;
    document.getElementById("ld")?.remove();
    if (ld) { const s = document.createElement("script"); s.id = "ld"; s.type = "application/ld+json"; s.textContent = ld; document.head.appendChild(s); }
  }, [title, desc, ld]);
}

/* ====== small helpers for motion ====== */
function useCycle(n, ms) {
  const [i, setI] = useState(0);
  useEffect(() => { if (n < 2) return; const t = setInterval(() => setI((x) => (x + 1) % n), ms); return () => clearInterval(t); }, [n, ms]);
  return [i, setI];
}
function Count({ to, suffix = "" }) {
  const ref = useRef(), [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current; let raf;
    const run = () => { const t0 = performance.now(), d = 1100; const f = (t) => { const k = Math.min(1, (t - t0) / d); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); };
    if (!("IntersectionObserver" in window)) { setV(to); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el); return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}>{v}{suffix}</span>;
}

/* ====== icons ====== */
const I = {
  sun: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  moon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
  arrow: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  lock: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>,
  clock: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};
const Mark = () => {
  const m = SITE.mark, g = (<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={SITE.logo[0]} /><stop offset="1" stopColor={SITE.logo[1]} /></linearGradient></defs>);
  return (<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">{g}<rect width="40" height="40" rx="12" fill="url(#lg)" />
    {m === "versus" && <><circle cx="15" cy="20" r="8.5" fill="#fff" opacity=".92" /><circle cx="25.5" cy="20" r="8.5" fill={SITE.logo[2]} opacity=".95" /><path d="M20.2 13.2a8.5 8.5 0 0 1 0 13.6a8.5 8.5 0 0 1 0-13.6z" fill={SITE.logo[0]} opacity=".9" /></>}
    {m === "spark" && <><path d="M20 7l3.2 8.1L31.5 18l-8.3 2.9L20 29l-3.2-8.1L8.5 18l8.3-2.9z" fill="#fff" /><circle cx="30" cy="10" r="3.4" fill={SITE.logo[2]} /><circle cx="10.5" cy="30" r="2.4" fill={SITE.logo[2]} opacity=".85" /></>}
    {m === "steps" && <><path d="M9 29h7v-6h7v-6h8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="31" cy="11" r="3.6" fill={SITE.logo[2]} /></>}
  </svg>);
};

function ThemeBtn() {
  const cur = () => document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const [t, setT] = useState(cur);
  const flip = () => { const n = t === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = n; try { localStorage.setItem(THEME, n); } catch {} setT(n); };
  return <button className="tg" onClick={flip} aria-label="Switch light or dark mode" title="Light / dark">{t === "dark" ? I.sun : I.moon}</button>;
}

const NAV = [["/", "Home"], ["/guides", SITE.nav], ["/about", "About"], ["/contact", "Contact"]];
const Logo = () => <Link to="/" className="brand"><span className="logo"><Mark /></span><span>{SITE.brand[0]} <i>&amp;</i> {SITE.brand[1]}</span></Link>;
function Shell({ children, path = "" }) {
  const [open, setOpen] = useState(false), [sc, setSc] = useState(false);
  useEffect(() => { const f = () => setSc(scrollY > 8); f(); addEventListener("scroll", f, { passive: true }); return () => removeEventListener("scroll", f); }, []);
  return (<>
    <header className={"top" + (sc ? " sc" : "")}><div className="wrap bar">
      <Logo />
      <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
        {NAV.map(([to, l]) => <Link key={to} to={to} className={path === to ? "on" : ""}>{l}</Link>)}
      </nav>
      <ThemeBtn />
      <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? "✕" : "☰"}</button>
    </div></header>
    <main className="page">{children}</main>
    <footer><div className="wrap foot">
      <div><Logo /><p>{SITE.footer}</p></div>
      <div className="fl">{NAV.map(([to, l]) => <Link key={to} to={to}>{l}</Link>)}</div>
      <div className="copy">© {new Date().getFullYear()} {BRAND} · {SITE.disclaimer} · <Link to="/admin">Admin</Link></div>
    </div></footer>
  </>);
}

function Cards({ list }) {
  return (<div className="grid">{list.map((a, i) => (
    <Link key={a.id} to={"/" + a.slug} className="card rv" style={{ "--d": i * 90 + "ms" }}>
      <div className="cover">{a.image ? <img src={a.image} alt={a.title} loading="lazy" /> : <span className="ph0">{SITE.initials}</span>}<b className="no">{String(i + 1).padStart(2, "0")}</b><small className="rt">{I.clock} {mins(a)} min</small></div>
      <div className="cb"><em>{SITE.eyebrow}</em><h3>{a.title}</h3><p>{clip(firstP(a), 118)}</p>
        <div className="cf"><span>{heads(a).length || "Several"} {SITE.cardNoun}</span><span className="go">{I.arrow}</span></div></div>
    </Link>))}</div>);
}

/* ====== hero visuals (one per site style) ====== */
function PairVis({ list }) {
  const ps = useMemo(() => pairs(list), [list]); const [pi] = useCycle(ps.length, 4200); const pr = ps[pi % ps.length];
  return (<><div className="pair" key={pi}>
    <div className="pc ch"><small>{SITE.hero.labelA}</small><b>{pr.c}</b></div>
    <svg className="flow" viewBox="0 0 24 60" width="24" height="60"><path d="M12 2v50" /><path d="M5 44l7 9 7-9" /></svg>
    <div className="pc so"><small>{SITE.hero.labelB}</small><b>{pr.s}</b></div></div>
    <div className="dotsnav">{ps.map((_, i) => <i key={i} className={i === pi % ps.length ? "on" : ""} />)}</div></>);
}
function VersusVis({ list }) {
  const v = useMemo(() => versus(list), [list]); const [i] = useCycle(v.length, 3800); const x = v[i % v.length];
  return (<><div className="vsw" key={i}>
    <div className="vsf">{x.f}</div>
    <div className="vs"><div className="vc a"><small>{clip(x.A, 26)}</small><b>{clip(x.a, 60)}</b></div><div className="vsb">VS</div><div className="vc b"><small>{clip(x.B, 26)}</small><b>{clip(x.b, 60)}</b></div></div></div>
    <div className="dotsnav">{v.map((_, k) => <i key={k} className={k === i % v.length ? "on" : ""} />)}</div></>);
}
function TipsVis({ list }) {
  const [i] = useCycle(list.length, 6800); const a = list[i % list.length]; const hs = heads(a).slice(0, 5);
  return (<><div className="tipcard" key={a.id}>
    <div className="tch"><span className="live" /><b>{clip(shortTitle(a.title), 40)}</b></div>
    <ul>{hs.map((h, k) => <li key={h} style={{ "--d": 350 + k * 700 + "ms" }}><i /><span>{h}</span></li>)}</ul>
    <div className="tbar"><u /></div></div>
    <div className="dotsnav">{list.map((_, k) => <i key={k} className={k === i % list.length ? "on" : ""} />)}</div></>);
}

/* ====== home ====== */
function Home({ articles }) {
  const H = SITE.hero, HM = SITE.home;
  useMeta(SITE.title, SITE.description, "");
  const all = useMemo(() => articles.flatMap(heads), [articles]);
  const ticks = useMemo(() => (SITE.visual === "versus" ? articles.map((a) => sides(a.title).join(" vs ")) : all), [articles, all]);
  const [ri] = useCycle(ticks.length || 1, 2600), [tab, setTab] = useState(0);
  const hero = useRef();
  const move = (e) => { const r = hero.current.getBoundingClientRect(); hero.current.style.setProperty("--mx", e.clientX - r.left + "px"); hero.current.style.setProperty("--my", e.clientY - r.top + "px"); };
  const cur = articles[Math.min(tab, articles.length - 1)];
  const ticker = ticks.length ? ticks : SITE.fallbackTicker;
  const avg = articles.length ? Math.round(articles.reduce((n, a) => n + mins(a), 0) / articles.length) : 5;
  const Vis = SITE.visual === "versus" ? VersusVis : SITE.visual === "tips" ? TipsVis : PairVis;
  const rows = cur && SITE.visual === "versus" ? rowsOf(cur).slice(0, 4) : [];
  return (<Shell path="/">
    <section className="hero" ref={hero} onMouseMove={move}><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="dots" /><div className="spot" />
      <div className="wrap hg">
        <div>
          <span className="pill"><i />{H.pill}</span>
          <h1>{H.h1[0]}<span className="hl">{H.h1[1]}</span>{H.h1[2]}</h1>
          <p className="lead">{H.lead}</p>
          <div className="ticker" aria-live="off"><span>{H.tickerLabel}</span><b key={ri}>{ticker[ri % ticker.length]}</b></div>
          <div className="row"><Link to="/guides" className="btn cor">{H.cta1} {I.arrow}</Link><Link to="/about" className="btn ghost">{H.cta2}</Link></div>
          <div className="stats"><div><b><Count to={articles.length} /></b><span>{H.stats[0]}</span></div><div><b><Count to={all.length} suffix="+" /></b><span>{H.stats[1]}</span></div><div><b><Count to={avg} suffix=" min" /></b><span>{H.stats[2]}</span></div></div>
        </div>
        <div className="vis" aria-hidden="true">
          <div className="fchip c1"><i />{H.chips[0]}</div>
          <div className="fchip c2">{H.chips[1]}</div>
          <Vis list={articles} />
        </div>
      </div></section>

    <div className="mq" aria-hidden="true"><div className="mqt">{[0, 1].map((k) => <div className="mqg" key={k}>{ticker.map((t, i) => <span key={i}>{t}<i /></span>)}</div>)}</div></div>

    <section className="wrap sec"><div className="sh rv"><div><h2>{HM.pick[0]}</h2><p>{HM.pick[1]}</p></div><Link to="/guides">{HM.all} →</Link></div><Cards list={articles.slice(0, 3)} /></section>

    {cur && <section className="band"><div className="wrap sec"><div className="sh rv"><div><h2>{HM.short[0]}</h2><p>{HM.short[1]}</p></div></div>
      <div className="ov rv">
        <div className="tabs" role="tablist">{articles.map((a, i) => <button key={a.id} role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => setTab(i)}>{shortTitle(a.title)}</button>)}</div>
        <div className="panel" key={cur.id}>
          <p className="sum">{clip(firstP(cur), 260)}</p>
          {rows.length > 0 ? <div className="mini"><table><thead><tr><th>Factor</th><th>{sides(cur.title)[0]}</th><th>{sides(cur.title)[1]}</th></tr></thead><tbody>{rows.map((r, k) => <tr key={k} style={{ "--d": k * 80 + "ms" }}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div>
            : <div className="chips">{heads(cur).map((h, i) => <span key={h} style={{ "--d": i * 60 + "ms" }}>{h}</span>)}</div>}
          <Link to={"/" + cur.slug} className="btn">{HM.read} {I.arrow}</Link>
        </div></div></div></section>}

    <section className="wrap sec"><div className="sh rv"><div><h2>{HM.steps[0]}</h2><p>{HM.steps[1]}</p></div></div>
      <div className="steps">{HM.steps[2].map(([h, p], i) => <div key={h} className={"st rv " + ["cor", "pri", "sun"][i]} style={{ "--d": i * 140 + "ms" }}><b>{i + 1}</b><h3>{h}</h3><p>{p}</p></div>)}</div></section>

    <section className="wrap"><div className="cta rv"><div><h2>{HM.cta[0]}</h2><p>{HM.cta[1]}</p></div>{articles[0] && <Link to={"/" + articles[0].slug} className="btn">{HM.cta[2]} {I.arrow}</Link>}</div></section>
  </Shell>);
}

function Guides({ articles }) {
  useMeta(`${SITE.nav} · ${BRAND}`, SITE.guides[1], "");
  return (<Shell path="/guides"><section className="ph"><div className="blob b2" /><div className="wrap"><h1>{SITE.guides[0]}</h1><p>{articles.length} {SITE.guides[1]}</p></div></section>
    <div className="wrap sec">{articles.length ? <Cards list={articles} /> : <p>Nothing here yet.</p>}</div></Shell>);
}

function About() {
  useMeta(`About · ${BRAND}`, SITE.about.desc, "");
  return (<Shell path="/about"><section className="ph"><div className="blob b2" /><div className="wrap"><h1>About {BRAND}</h1><p>{SITE.about.sub}</p></div></section>
    <div className="wrap sec"><div className="prose narrow" dangerouslySetInnerHTML={{ __html: SITE.about.html }} /></div></Shell>);
}

function Contact() {
  useMeta(`Contact · ${BRAND}`, `Contact ${BRAND}.`, "");
  const [f, setF] = useState({ n: "", e: "", m: "" });
  const send = () => { if (!f.n || !f.m) return alert("Please add your name and a message."); location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Message from " + f.n)}&body=${encodeURIComponent(f.m + "\n\n" + f.n + " (" + f.e + ")")}`; };
  return (<Shell path="/contact"><section className="ph"><div className="blob b2" /><div className="wrap"><h1>Contact us</h1><p>{SITE.contactSub}</p></div></section>
    <div className="adm" style={{ maxWidth: 600 }}><div className="box">
      <label>Your name</label><input type="text" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} />
      <label style={{ marginTop: 14 }}>Your email</label><input type="email" value={f.e} onChange={(e) => setF({ ...f, e: e.target.value })} />
      <label style={{ marginTop: 14 }}>Message</label><textarea value={f.m} onChange={(e) => setF({ ...f, m: e.target.value })} />
      <button className="btn cor" style={{ marginTop: 16 }} onClick={send}>Send message</button>
      <p className="hint">This opens your email app. You can also write to {CONTACT_EMAIL}.</p></div></div></Shell>);
}

/* ====== FAQ accordion (smooth open/close) ====== */
function Faq({ items }) {
  const [o, setO] = useState(0);
  return (<section className="faq rv"><h2>Frequently asked questions</h2>
    {items.map((f, i) => (<div key={i} className={"fq" + (o === i ? " open" : "")}>
      <button aria-expanded={o === i} onClick={() => setO(o === i ? -1 : i)}><span>{f.q}</span><i /></button>
      <div className="fa"><div><p>{f.a}</p></div></div></div>))}</section>);
}

/* ====== article page ====== */
function Article({ a, all }) {
  const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: a.title, datePublished: a.date, image: a.image && a.image.startsWith("http") ? a.image : undefined },
    ...(a.faqs.length ? [{ "@type": "FAQPage", mainEntity: a.faqs.filter((f) => f.q && f.a).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []) ] });
  useMeta(a.title, clip(firstP(a), 155), ld);
  const rel = all.filter((x) => x.id !== a.id).slice(0, 3);
  const { html, toc } = useMemo(() => {
    const d = parse(a.content), toc = [];
    d.querySelectorAll("h2").forEach((h, i) => {
      h.id = "s" + i; const t = h.textContent.trim(), m = /^(\d+)\.\s*(.*)$/.exec(t);
      if (m) { toc.push([h.id, m[2], m[1]]); h.textContent = ""; const n = document.createElement("span"); n.className = "num"; n.textContent = m[1].padStart(2, "0"); h.append(n, document.createTextNode(m[2])); }
    });
    d.querySelectorAll("a").forEach((l) => { l.target = "_blank"; l.rel = "noopener"; });
    d.querySelectorAll("table").forEach((t) => { const w = document.createElement("div"); w.className = "tw"; t.replaceWith(w); w.append(t); });
    [...d.children].forEach((el, i) => { el.classList.add("rv"); });
    return { html: d.innerHTML, toc };
  }, [a.content]);
  const bar = useRef(), body = useRef(), [act, setAct] = useState("");
  /* the article body is written into the page once (React never touches it again), then each block fades in as you scroll */
  useLayoutEffect(() => {
    const el = body.current; el.innerHTML = html;
    if (!("IntersectionObserver" in window)) { el.querySelectorAll(".rv").forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.05, rootMargin: "0px 0px -30px 0px" });
    el.querySelectorAll(".rv").forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [html]);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); if (bar.current) bar.current.style.width = Math.min(100, p * 100) + "%";
      let c = ""; toc.forEach(([id]) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 160) c = id; }); setAct(c);
    };
    f(); addEventListener("scroll", f, { passive: true }); return () => removeEventListener("scroll", f);
  }, [toc]);
  return (<Shell path="/guides"><div className="prog" ref={bar} /><article className="art">
    <Link to="/guides" className="back">← All guides</Link>
    <em className="eyebrow">{SITE.eyebrow}</em>
    <h1>{a.title}</h1>
    <div className="meta">{new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {mins(a)} min read{toc.length ? ` · ${toc.length} ${SITE.tocNoun}` : ""}</div>
    {a.image && <div className="featwrap"><img className="feat" src={a.image} alt={a.title} /></div>}
    {toc.length >= 3 && <div className="toc rv" role="navigation" aria-label="At a glance"><b>{SITE.toc}</b><ol>{toc.map(([id, t, n]) => <li key={id} className={act === id ? "on" : ""}><a href={"#/" + a.slug} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}><i>{n}</i>{t}</a></li>)}</ol></div>}
    <div className="prose" ref={body} />
    {a.note && <div className="note rv"><div><b>Note: </b>{a.note}</div></div>}
    {a.faqs.length > 0 && <Faq items={a.faqs} />}
    {a.showRelated && rel.length > 0 && <section className="rel"><h2 className="rv">Keep reading</h2><Cards list={rel} /></section>}
  </article></Shell>);
}

/* ====== rich text editor: links and images are one click ====== */
function Editor({ value, onChange, toast }) {
  const ref = useRef(), file = useRef(), saved = useRef(null);
  useEffect(() => { ref.current.innerHTML = value || ""; }, []);
  const out = () => onChange(ref.current.innerHTML);
  const keep = () => { const s = getSelection(); if (s.rangeCount && ref.current.contains(s.anchorNode)) saved.current = s.getRangeAt(0).cloneRange(); };
  const restore = () => { ref.current.focus(); if (saved.current) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved.current); } };
  const cmd = (c, v) => { restore(); document.execCommand(c, false, v); out(); keep(); };
  const link = () => {
    keep(); const s = getSelection(), has = saved.current && !saved.current.collapsed;
    const u = prompt(has ? "Paste the link for the selected text (https://...)" : "First select some text, then add the link.\nOr paste a link here to insert it as it is:", "https://");
    if (!u || u === "https://") return;
    const url = /^(https?:|mailto:|\/|#)/.test(u) ? u : "https://" + u;
    if (has) cmd("createLink", url); else cmd("insertHTML", `<a href="${url}">${url}</a>&nbsp;`);
  };
  const addRow = () => {
    restore(); const sel = getSelection(); let n = sel.anchorNode; while (n && n.nodeName !== "TR" && n !== ref.current) n = n.parentNode;
    if (!n || n.nodeName !== "TR") return toast("Click inside a table row first");
    const r = n.cloneNode(true); r.querySelectorAll("th,td").forEach((c) => { c.innerHTML = "…"; if (c.nodeName === "TH") { const d = document.createElement("td"); d.innerHTML = "…"; c.replaceWith(d); } });
    (n.parentNode.nodeName === "THEAD" ? n.parentNode.nextElementSibling || n.parentNode : n.parentNode).appendChild(r); out();
  };
  const addImg = async (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    try { toast("Uploading image…"); const u = await pic(f, 1000); cmd("insertImage", u); toast("Image added"); } catch (e) { toast("Image failed: " + e.message); }
  };
  const B = ({ c, v, t, f, title, hot }) => <button type="button" title={title || t} className={hot ? "hot" : ""} onMouseDown={(e) => { e.preventDefault(); keep(); }} onClick={f || (() => cmd(c, v))}>{t}</button>;
  return (<div>
    <div className="tb">
      <B c="formatBlock" v="h2" t="H2" title="Big heading. Start it with 1. 2. 3. to get a numbered badge" /><B c="formatBlock" v="h3" t="H3" title="Small heading" /><B c="formatBlock" v="p" t="Text" title="Normal paragraph" /><i />
      <B c="bold" t="B" title="Bold (Ctrl+B)" /><B c="italic" t="I" title="Italic (Ctrl+I)" /><B c="insertUnorderedList" t="• List" /><B c="insertOrderedList" t="1. List" /><B c="formatBlock" v="blockquote" t={SITE.box[0]} title={SITE.box[1]} /><i />
      <B hot t="🔗 Link" title="Select text, then click (Ctrl+K)" f={link} />
      <B hot t="🖼 Image" title="Upload from your device" f={() => file.current.click()} />
      <B t="Image URL" f={() => { keep(); const u = prompt("Paste the image address (https://...)"); if (u) cmd("insertImage", u); }} />{SITE.tables && <><B t="▦ Table" title="Insert a comparison table (3 columns)" f={() => cmd("insertHTML", "<table><thead><tr><th>Factor</th><th>Option A</th><th>Option B</th></tr></thead><tbody><tr><td>Cost</td><td>…</td><td>…</td></tr><tr><td>Time</td><td>…</td><td>…</td></tr><tr><td>Risk</td><td>…</td><td>…</td></tr></tbody></table><p><br></p>")} /><B t="+ Row" title="Add a row under the line where the cursor is" f={addRow} /></>}<i />
      <B c="unlink" t="Unlink" /><B c="removeFormat" t="Clear" />
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { addImg(e.target.files[0]); e.target.value = ""; }} />
    </div>
    <div ref={ref} className="ed prose" contentEditable suppressContentEditableWarning data-ph="Write or paste your article here. Select text and press Ctrl+K to add a link. Drag, paste or upload images."
      onInput={out} onBlur={keep} onKeyUp={keep} onMouseUp={keep}
      onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); link(); } }}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => { const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); addImg(f); } }}
      onPaste={(e) => {
        const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
        if (f) { e.preventDefault(); addImg(f); return; }
        const t = e.clipboardData.getData("text").trim(), s = getSelection();
        if (/^https?:\/\/\S+$/.test(t) && !s.isCollapsed) { e.preventDefault(); cmd("createLink", t); }
      }} />
  </div>);
}

/* ====== live-update settings ====== */
function DeedBox({ articles, toast, exportJson, onReset }) {
  const [url, setUrl] = useState(lget(LV_URL)), [me, setMe] = useState(lget(LV_METHOD) || "PUT"), [hd, setHd] = useState(lget(LV_HDR)), [on, setOn] = useState(deedOn());
  const put = () => { try { localStorage.setItem(LV_URL, url.trim()); localStorage.setItem(LV_METHOD, me); localStorage.setItem(LV_HDR, hd); } catch {} setOn(deedOn()); toast(deedOn() ? "Live update is ON" : "Live update is OFF"); };
  return (<div className="box">
    <label>Live site updates {on ? <span className="okp">ON</span> : <span className="offp">OFF</span>}</label>
    <p className="hint" style={{ marginTop: 0 }}>Optional. Paste the update address and key your hosting gave you. After that, every Save, edit or delete sends the new site file to your host. The key stays in this browser only. Leave empty to publish by hand with “Download site file”.</p>
    <div className="row"><input type="text" style={{ flex: 1, minWidth: 240 }} placeholder="Update address, e.g. https://deed.page/v1/sites?slug=your-site" value={url} onChange={(e) => setUrl(e.target.value)} />
      <select value={me} onChange={(e) => setMe(e.target.value)} style={{ padding: "12px 14px", borderRadius: 12, border: "2px solid var(--ln)", background: "var(--bg)", color: "var(--ink)", font: "inherit" }}><option>PUT</option><option>POST</option></select></div>
    <textarea style={{ marginTop: 10, minHeight: 64 }} placeholder={"Headers, one per line, e.g.\nAuthorization: Bearer your-key"} value={hd} onChange={(e) => setHd(e.target.value)} />
    <div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={put}>Save settings</button>
      <button className="btn ghost sm" onClick={() => { setUrl("https://deed.page/v1/sites?slug="); setMe("PUT"); setHd("Authorization: Bearer "); }}>Fill for deed.page</button></div>
    <div className="row" style={{ marginTop: 14 }}>
      <button className="btn ghost" onClick={async () => { try { await downloadSite(articles); toast("Site file downloaded"); } catch (e) { toast(e.message); } }}>Download site file (index.html)</button>
      <button className="btn ghost" onClick={exportJson}>Export articles.json</button>
      <button className="btn ghost" onClick={() => { if (confirm("Discard browser changes and show the published articles?")) onReset(); }}>Reset to published</button></div>
    <p className="hint">If a live update fails, download the site file and upload it on your host by hand.</p></div>);
}

/* ====== admin dashboard ====== */
function Admin({ articles, setArticles }) {
  const [authed, setAuthed] = useState(() => (LIVE ? !!getTok() : getTok() === ADMIN.token));
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ u: "", p: "" }), [err, setErr] = useState("");
  const [cur, setCur] = useState(null), [tm, setTm] = useState("");
  const up = (k, v) => setCur((c) => ({ ...c, [k]: v }));
  const imgFile = useRef();
  useMeta("Admin · " + BRAND, "", "");
  const toast = (m) => { setTm(m); setTimeout(() => setTm(""), 2400); };
  const T = tm && <div className="toast" role="status">{tm}</div>;

  if (!authed) return (<Shell><div className="adm" style={{ maxWidth: 440 }}><div className="box login" style={{ padding: 32 }}>
    <div className="lock">{I.lock}</div>
    <h1 style={{ textAlign: "center", fontSize: 28, marginBottom: 20 }}>Admin login</h1>
    <label>Username</label><input type="text" autoComplete="username" value={f.u} onChange={(e) => setF({ ...f, u: e.target.value })} />
    <label style={{ marginTop: 14 }}>Password</label>
    <input type="password" autoComplete="current-password" value={f.p} onChange={(e) => setF({ ...f, p: e.target.value })}
      onKeyDown={(e) => e.key === "Enter" && document.getElementById("login").click()} />
    {err && <p className="err">{err}</p>}
    <button id="login" className="btn" style={{ marginTop: 18, width: "100%", justifyContent: "center" }} onClick={async () => {
      if (LIVE) {
        try { setBusy(true); const j = await api({ action: "login", user: f.u, pass: f.p }); try { localStorage.setItem(TOK, j.token); } catch {} setErr(""); setAuthed(true); }
        catch (e) { setErr(e.status === 401 ? "Wrong username or password." : "Cannot reach the server: " + e.message); } finally { setBusy(false); }
      } else if (f.u === ADMIN.user && f.p === ADMIN.pass) { try { localStorage.setItem(TOK, ADMIN.token); } catch {} setAuthed(true); } else setErr("Wrong username or password.");
    }}>{busy ? "Please wait…" : "Log in"}</button></div></div></Shell>);

  const commit = async (list) => {
    if (!LIVE) {
      if (!save(list)) return false;
      setArticles(list);
      if (deedOn()) {
        try { toast("Updating your live site…"); await deedPublish(list); toast("Live site updated. Refresh the site in a minute to see it."); }
        catch (e) { toast("Live update failed: " + e.message + ". Use “Download site file” below and upload it."); }
      }
      return true;
    }
    try { toast("Publishing…"); await api({ action: "publish", articles: list }); setArticles(list); return true; }
    catch (e) { if (e.status === 401) { try { localStorage.removeItem(TOK); } catch {} setAuthed(false); } else toast("Publish failed: " + e.message); return false; }
  };
  const saveCur = async () => {
    if (!cur.title.trim()) return toast("Add a title first");
    let slug = cur.slug || slugify(cur.title);
    if (RESERVED.includes(slug) || articles.some((x) => x.slug === slug && x.id !== cur.id)) slug += "-" + Date.now().toString(36).slice(-4);
    const a = { ...cur, slug, faqs: cur.faqs.filter((q) => q.q.trim() && q.a.trim()) };
    const i = articles.findIndex((x) => x.id === a.id);
    if (await commit(i < 0 ? [a, ...articles] : articles.map((x) => (x.id === a.id ? a : x)))) { setCur(null); if (LIVE) toast("Published. It is live now."); else if (!deedOn()) toast("Article saved"); scrollTo(0, 0); }
  };
  const exportJson = () => {
    const u = URL.createObjectURL(new Blob([JSON.stringify(articles, null, 1)], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: u, download: "articles.json" }).click(); URL.revokeObjectURL(u);
  };

  if (cur) { const isNew = !articles.some((x) => x.id === cur.id); return (<Shell><div className="adm">
    <div className="row sp" style={{ marginBottom: 16 }}><h1 style={{ fontSize: 30 }}>{isNew ? "New article" : "Edit article"}</h1>
      <div className="row"><button className="btn ghost" onClick={() => setCur(null)}>Cancel</button><button className="btn cor" onClick={saveCur}>Save article</button></div></div>
    <div className="box"><label><span className="step">1</span>Title</label><input type="text" value={cur.title} onChange={(e) => up("title", e.target.value)} placeholder={SITE.titleHint} /></div>
    <div className="box"><label><span className="step">2</span>Feature image</label>
      <div className="row"><input type="url" style={{ flex: 1, minWidth: 200 }} placeholder="Paste image URL, or upload from your device" value={cur.image.startsWith("data:") ? "" : cur.image} onChange={(e) => up("image", e.target.value)} />
        <button className="btn ghost" onClick={() => imgFile.current.click()}>Upload</button>
        {cur.image && <button className="btn red" onClick={() => up("image", "")}>Remove</button>}</div>
      <input ref={imgFile} type="file" accept="image/*" hidden onChange={async (e) => { const x = e.target.files[0]; if (x) { try { toast("Uploading image…"); up("image", await pic(x, 1400)); toast("Image added"); } catch (er) { toast("Image failed: " + er.message); } } e.target.value = ""; }} />
      {cur.image && <img className="prev" src={cur.image} alt="" />}</div>
    <div className="box"><label><span className="step">3</span>Article</label><Editor value={cur.content} onChange={(v) => up("content", v)} toast={toast} />
      <p className="hint">{text(cur.content).split(/\s+/).filter(Boolean).length} words · about {mins(cur)} min read</p></div>
    <div className="box"><label><span className="step">4</span>FAQs</label>
      {cur.faqs.map((q, i) => (<div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px dashed var(--ln)" }}>
        <input type="text" placeholder={"Question " + (i + 1)} value={q.q} onChange={(e) => up("faqs", cur.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
        <textarea style={{ marginTop: 8 }} placeholder="Answer" value={q.a} onChange={(e) => up("faqs", cur.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
        <button className="btn red sm" style={{ marginTop: 8 }} onClick={() => up("faqs", cur.faqs.filter((_, j) => j !== i))}>Remove this FAQ</button></div>))}
      <button className="btn ghost" onClick={() => up("faqs", [...cur.faqs, { q: "", a: "" }])}>+ Add FAQ</button></div>
    <div className="box"><label><span className="step">5</span>Note (shown in a highlighted box)</label><textarea value={cur.note} onChange={(e) => up("note", e.target.value)} placeholder="One important thing the reader should not miss" /></div>
    <div className="box"><label className="switch"><input type="checkbox" checked={cur.showRelated} onChange={(e) => up("showRelated", e.target.checked)} /><i /><span><b>Related articles</b> are {cur.showRelated ? "ON" : "OFF"}</span></label></div>
    <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn ghost" onClick={() => setCur(null)}>Cancel</button><button className="btn cor" onClick={saveCur}>Save article</button></div>
    {T}
  </div></Shell>); }

  return (<Shell><div className="adm">
    <div className="row sp" style={{ marginBottom: 18 }}><h1 style={{ fontSize: 32 }}>Dashboard</h1>
      <div className="row"><button className="btn cor" onClick={() => setCur(blank())}>+ New article</button>
        <button className="btn ghost" onClick={() => { try { localStorage.removeItem(TOK); } catch {} setAuthed(false); }}>Log out</button></div></div>
    <div className="stat3"><div><b>{articles.length}</b><span>Articles</span></div><div><b>{articles.filter((a) => a.showRelated).length}</b><span>With related ON</span></div><div><b>{articles.reduce((n, a) => n + a.faqs.length, 0)}</b><span>FAQs in total</span></div></div>
    {LIVE ? <div className="box"><p style={{ marginTop: 0 }}>Auto-publish is <b>ON</b>. Every save, edit or delete goes live on the site straight away. You can still download a backup copy.</p>
      <div className="row"><button className="btn" onClick={exportJson}>Download backup (articles.json)</button></div></div>
      : <DeedBox articles={articles} toast={toast} exportJson={exportJson} onReset={() => { try { localStorage.removeItem(KEY); } catch {} setArticles(seed); toast("Reset done"); }} />}
    <div className="box">{articles.length === 0 && <p>No articles yet. Click “New article”.</p>}
      {articles.map((a) => (<div className="item" key={a.id}>
        {a.image ? <img className="th" src={a.image} alt="" /> : <div className="th" />}
        <div className="tx"><b>{a.title}</b><div className="hint" style={{ margin: 0 }}>/{a.slug} · {a.date} · {a.faqs.length} FAQs · related {a.showRelated ? "on" : "off"}</div></div>
        <div className="row"><button className="btn ghost sm" onClick={() => go("/" + a.slug)}>View</button>
          <button className="btn sm" onClick={() => setCur(JSON.parse(JSON.stringify(a)))}>Edit</button>
          <button className="btn red sm" onClick={async () => { if (confirm("Delete this article?") && (await commit(articles.filter((x) => x.id !== a.id)))) { if (LIVE) toast("Deleted and live"); else if (!deedOn()) toast("Deleted"); } }}>Delete</button></div></div>))}</div>
    {T}
  </div></Shell>);
}

export default function App() {
  const read = () => location.hash.replace(/^#/, "").split("?")[0] || "/";
  const [path, setPath] = useState(read);
  const [articles, setArticles] = useState(LIVE ? null : load);
  useEffect(() => {
    if (!LIVE) return;
    fetch("./articles.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : seed)).then((a) => setArticles(Array.isArray(a) ? a : seed)).catch(() => setArticles(seed));
  }, []);
  useEffect(() => { const f = () => { setPath(read()); scrollTo(0, 0); }; addEventListener("hashchange", f); addEventListener("popstate", f); return () => { removeEventListener("hashchange", f); removeEventListener("popstate", f); }; }, []);
  /* scroll reveal: anything with class "rv" fades up when it enters the screen */
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { document.querySelectorAll(".rv").forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    const t = setTimeout(() => document.querySelectorAll(".rv:not(.in)").forEach((e) => io.observe(e)), 30);
    return () => { clearTimeout(t); io.disconnect(); };
  });
  if (!articles) return <div className="boot"><i /><i /><i /></div>;
  if (path === "/admin") return <Admin articles={articles} setArticles={setArticles} />;
  if (path === "/guides" || path === "/blogs") return <Guides articles={articles} />;
  if (path === "/about") return <About />;
  if (path === "/contact") return <Contact />;
  const a = articles.find((x) => "/" + x.slug === path);
  return a ? <Article key={a.id} a={a} all={articles} /> : <Home articles={articles} />;
}
