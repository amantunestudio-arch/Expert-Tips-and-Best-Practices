# Expert Tips & Best Practices

## Run it
1. `git pull` (admin saves are committed to GitHub, so always pull first)
2. `npm install`
3. `npm run dev` to test, `npm run build` to create `dist`.
`npm run build` makes one real HTML file per page: `dist/about/index.html`, `dist/guides/index.html`, `dist/contact/index.html`, `dist/admin/index.html` and `dist/<article-slug>/index.html`.
Deploy the `dist` folder (never the repo root).

## Change names, texts and the admin login
Everything is in `src/site.js`: site name, wording, email and the admin login.
Default login: user `admin`, password `Tips-Change-2026`. Change it before you go live.
This login is a front-end gate only. It keeps casual visitors out, it is not real security.

## Admin dashboard (`/admin/`)
Title, feature image, text editor (link, image, headings, highlighted box), FAQs, one Note, and a Related-articles ON/OFF switch.
Start an H2 heading with `1.` `2.` `3.` to get a numbered badge and an entry in "at a glance".

## Making changes live (GitHub sync)
Articles live in the GitHub repo (`content/articles.json`, images in `content/img/`). The public site reads them from GitHub, so admin changes go live in about a minute with no rebuild or redeploy.
One-time setup:
1. GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.
2. Repository access: only this repo. Permissions: Contents = Read and write.
3. Open `/admin/`, log in, paste the token in "Live sync with GitHub", press Save settings and Test connection.
Code or design changes (App.jsx, CSS, site.js) still need `npm run build`, then push `dist` and redeploy on DeploySnap.
DeploySnap only accepts web files, so deploy the `dist` folder (never the repo root, it contains README.md).

## New articles and their own page
Saving an article in the admin writes `content/articles.json` and also `dist/<slug>/index.html` to GitHub.
Edits to existing articles show on the live site by themselves. A brand-new article appears in Home/Guides at once, but its direct link (/new-slug/) works after the next DeploySnap deploy of the `dist` folder.
Set `url` in `src/site.js` to your live address so every page gets a canonical link.
