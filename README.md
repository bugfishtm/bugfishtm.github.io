# Bugfish — Project Website

> [!TIP]
> No new features are currently planned for this project. However, users are welcome to create issues or feature requests, which will be reviewed and responded to within 1–3 weeks.

## 🔍 Overview

This repository hosts my personal project website, served via **GitHub Pages** at [https://bugfishtm.github.io](https://bugfishtm.github.io). It is the central hub for my projects, channels and platforms.

**Please note:** This is a private project. The source code is public only because it is part of my project infrastructure — GitHub Pages requires the repository content to be accessible. This is not an open-source project, not a template, and not intended for reuse.

## 📁 Repository Structure

This table provides an overview of the key files and folders of the website.

|Path|Description|
|----|-----|
| index.html | Home page — hero with the ops monitor (live counters + countdown), soundtrack, skills ticker, featured bento, whoami terminal, gateways and the channel dock. |
| channels.html | All channels and platforms (websites, code, video, music, art, community) — cards from `data/explore.json`. |
| projects.html | All projects on one page — category tabs (incl. EspoCRM, Ciphers) + search. |
| tools.html | 50 self-coded browser tools (security, encoding, data, text, web, design, network, system, games) — searchable list with categories and tags; open one with `tools.html#<id>`. |
| assets/js/tools.js | Tools registry (the list lives in code, not JSON), search / tags / favourites, router and the shared `TK` helper kit. |
| assets/js/tools/ | Tool implementations, one file per category, loaded only when a tool of that category is opened (`qrlib.js` and `ziplib.js` are shared libraries). |
| data/ | JSON files driving the site content (home, featured, explore, projects). |
| data/home.json | Home page content — hero texts, about, soundtrack and `counters`: `since` counts days up, `until` (with time zone offset) counts down and switches its badge from `status` to `statusDone` when it ends. Field reference at the top of `assets/js/home.js`. |
| data/featured.json | Featured projects on the home page — the first one is the big card. |
| assets/ | Stylesheets, scripts, images and music — everything served locally. The only outgoing requests are made by the DNS Lookup / Mail DNS Checker tools, which query Cloudflare or Google DNS-over-HTTPS — only after the visitor ticks the consent box. |
| privacy.html | Privacy policy (GDPR). |
| impressum.html | Impressum (legal notice). |
| 404.html | Error page. |
| [LICENSE.md](LICENSE.md) | License of this project. |

## 👀 Looking Around

You are welcome to browse the code and see how the site is built. However:

- **All rights are reserved.** No permission is granted to copy, reuse, modify or redistribute any part of this repository — code, design, texts, images or music — unless explicitly stated otherwise in [LICENSE.md](LICENSE.md).
- This repository does not accept feature requests, and contributions are generally not expected — it exists to run my website.

## 📜 License Information

The license for this project can be found in the [LICENSE.md](LICENSE.md) file. The repository may also include additional licensed software or libraries.

🐟 Bugfish
