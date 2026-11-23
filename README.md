# Expert Tips & Best Practices

## Run it
1. `npm install`
2. `npm run dev` to test, `npm run build` to create the `dist` folder.
3. Upload the CONTENTS of `dist` to your host. Pages use hash links (`/#/guides`, `/#/admin`), so no server settings are needed.

## Change names, texts and the admin login
Everything is in `src/site.js`: site name, wording, email and the admin login.
Default login: user `admin`, password `Tips-Change-2026`. Change it before you go live.
This login is a front-end gate only. It keeps casual visitors out, it is not real security.

## Admin dashboard (`/#/admin`)
Title, feature image, text editor (link, image, headings, highlighted box), FAQs, one Note, and a Related-articles ON/OFF switch.
Start an H2 heading with `1.` `2.` `3.` to get a numbered badge and an entry in "at a glance".

## Making changes live
Saved articles live in the admin's browser. To publish them for everyone use **Download site file (index.html)** in the dashboard and upload that file on your host.
If your host has an update address that accepts the file with a key (for example deed.page), paste it in **Live site updates** and every Save will update the live site by itself.
