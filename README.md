# FamilyTreeOf

Interactive, mobile-friendly and printable family trees of royal houses, dynasties, famous families and the gods of myth, plus a "How are X and Y related?" finder.

- Family data: [Wikidata](https://www.wikidata.org/) (CC0), fetched with `tools/fetch.mjs` (cached, few queries).
- Portraits: [Wikimedia Commons](https://commons.wikimedia.org/), freely licensed only, credited on each page.
- Static site built with `node tools/build.mjs` (no dependencies) and deployed to GitHub Pages by Actions.

Local preview: `BASE_PATH= node tools/build.mjs && node tools/serve.mjs` → http://localhost:4330/

Operations handbook (Norwegian): `DRIFT.md`. Code is MIT-licensed; data CC0; portraits under their own licences.
