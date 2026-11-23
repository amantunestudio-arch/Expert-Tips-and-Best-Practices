/* Runs after "vite build": writes one real HTML file per page into dist/ (about/index.html, guides/index.html, <article-slug>/index.html ...). */
import fs from "fs";
import path from "path";
import { renderPage, staticPages, articlePage } from "../src/pagegen.js";
import { SITE } from "../src/site.js";
const SITE_NAME = SITE.name;

const dist = path.resolve("dist");
const tpl = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const src = fs.existsSync("content/articles.json") ? "content/articles.json" : "src/articles.json";
const articles = JSON.parse(fs.readFileSync(src, "utf8"));
const pages = [...staticPages(articles), ...articles.map(articlePage)];
let n = 0;
for (const p of pages) {
  const file = p.path === "/" ? path.join(dist, "index.html") : path.join(dist, p.path.slice(1), "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderPage(tpl, p));
  n++;
}
/* fallback for a brand-new article link before the next deploy: the app starts, reads articles.json from GitHub and shows the article */
fs.writeFileSync(path.join(dist, "404.html"), renderPage(tpl, { path: "/", title: "Loading… · " + SITE_NAME, desc: "", body: "", noindex: true }));
console.log("prerender: wrote " + n + " pages from " + src);
