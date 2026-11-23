/* Builds the static HTML of every page (used by scripts/prerender.mjs at build time and by the admin when it publishes a new article page). Pure JS, no DOM. */
import { SITE } from "./site.js";

export const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (h) => String(h || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const firstP = (a) => { const m = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(a.content || ""); return m ? strip(m[1]) : ""; };
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);
const NAV = [["/", "Home"], ["/guides", SITE.nav], ["/about", "About"], ["/contact", "Contact"]];
const href = (to) => (to === "/" ? "/" : to + "/");

const shell = (inner) =>
  '<header class="top"><div class="wrap bar"><a class="brand" href="/">' + esc(SITE.name) + "</a><nav>" +
  NAV.map(([to, l]) => '<a href="' + href(to) + '">' + esc(l) + "</a>").join("") + "</nav></div></header>" +
  '<main class="page">' + inner + "</main>" +
  '<footer><div class="wrap"><p>' + esc(SITE.footer) + "</p></div></footer>";

const cards = (list) => "<ul>" + list.map((a) => '<li><a href="' + href("/" + a.slug) + '">' + esc(a.title) + "</a></li>").join("") + "</ul>";

export function articlePage(a) {
  const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: a.title, datePublished: a.date, image: a.image && /^https?:/.test(a.image) ? a.image : undefined },
    ...((a.faqs || []).length ? [{ "@type": "FAQPage", mainEntity: a.faqs.filter((f) => f.q && f.a).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
  ] }).replace(/</g, "\\u003c");
  const faqs = (a.faqs || []).filter((f) => f.q && f.a).map((f) => "<h3>" + esc(f.q) + "</h3><p>" + esc(f.a) + "</p>").join("");
  const body = shell('<div class="wrap"><article><h1>' + esc(a.title) + "</h1>" + (a.image ? '<img src="' + esc(a.image) + '" alt="" />' : "") + (a.content || "") +
    (faqs ? "<h2>FAQ</h2>" + faqs : "") + (a.note ? "<p><b>" + esc(a.note) + "</b></p>" : "") + "</article></div>");
  return { path: "/" + a.slug, title: a.title, desc: clip(firstP(a), 155), body, ld };
}

export function staticPages(articles) {
  return [
    { path: "/", title: SITE.title, desc: SITE.description, body: shell('<div class="wrap"><h1>' + esc(SITE.hero.h1.join("")) + "</h1><p>" + esc(SITE.hero.lead) + "</p>" + cards(articles) + "</div>") },
    { path: "/guides", title: SITE.nav + " · " + SITE.name, desc: SITE.guides[1], body: shell('<div class="wrap"><h1>' + esc(SITE.guides[0]) + "</h1>" + cards(articles) + "</div>") },
    { path: "/about", title: "About · " + SITE.name, desc: SITE.about.desc, body: shell('<div class="wrap"><h1>About</h1><p>' + esc(SITE.about.sub) + "</p>" + SITE.about.html + "</div>") },
    { path: "/contact", title: "Contact · " + SITE.name, desc: "Contact " + SITE.name + ".", body: shell('<div class="wrap"><h1>Contact</h1><p>' + esc(SITE.contactSub) + "</p></div>") },
    { path: "/admin", title: "Admin · " + SITE.name, desc: "", body: "", noindex: true },
  ];
}

/* put a page's title, description, text and structured data into the built index.html */
export function renderPage(tpl, p) {
  let h = tpl;
  if (!/<!--ssr-start-->[\s\S]*?<!--ssr-end-->/.test(h)) throw new Error("template has no ssr markers");
  h = h.replace(/<title>[\s\S]*?<\/title>/, () => "<title>" + esc(p.title) + "</title>");
  const meta = '<meta name="description" content="' + esc(p.desc) + '" />';
  h = /<meta name="description"[^>]*>/.test(h) ? h.replace(/<meta name="description"[^>]*>/, () => meta) : h.replace("</head>", () => meta + "</head>");
  h = h.replace(/<meta name="robots"[^>]*>/g, "").replace(/<link rel="canonical"[^>]*>/g, "").replace(/<script id="ld"[\s\S]*?<\/script>/g, "");
  let extra = "";
  if (p.noindex) extra += '<meta name="robots" content="noindex" />';
  if (SITE.url) extra += '<link rel="canonical" href="' + esc(SITE.url.replace(/\/$/, "") + href(p.path)) + '" />';
  if (p.ld) extra += '<script id="ld" type="application/ld+json">' + p.ld + "</script>";
  h = h.replace("</head>", () => extra + "</head>");
  return h.replace(/<!--ssr-start-->[\s\S]*?<!--ssr-end-->/, () => "<!--ssr-start-->" + p.body + "<!--ssr-end-->");
}
