// Henter portretter fra Wikimedia Commons – bare fri lisens (PD, CC0, CC BY, CC BY-SA) – og lager små webp-filer.
// Resultat: site/img/p/<QID>-s.webp (80px), -m.webp (300x360) og data/images.json (kreditering).
// Bruk: node tools/images.mjs [maks antall nye]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const UA = 'FamilyTreeOfBot/0.1 (https://neimenhalao.github.io/familytreeof/about/; portrait thumbnails)';
const MAX = Number(process.argv[2] || 5000);
const E = JSON.parse(await readFile('data/wikidata.json', 'utf8'));
const M = JSON.parse(await readFile('data/membership.json', 'utf8'));
let IMG = {};
try { IMG = JSON.parse(await readFile('data/images.json', 'utf8')); } catch {}
await mkdir('site/img/p', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const yearOf = (t) => { if (!t) return null; const m = t.t.match(/^(-?)(\d+)/); return m[1] ? 1 - Number(m[2]) : Number(m[2]); };

// kandidater: alle i trærne + ektefeller og andre foreldre til barna deres
const ids = new Set();
for (const tree of Object.values(M)) for (const id of Object.keys(tree)) {
  ids.add(id);
  const e = E[id]; if (!e) continue;
  for (const [s] of e.P26) ids.add(s);
  for (const [c] of e.P40) { const ce = E[c]; if (ce) for (const [p] of [...ce.P22, ...ce.P25]) ids.add(p); }
}
const cands = [...ids].filter((id) => {
  const e = E[id];
  if (!e || !e.img || IMG[id] !== undefined) return false;
  const by = yearOf(e.b);
  if (e.P31.includes('Q5') && !e.d && (by === null || by > 2008)) return false; // levende barn / ukjent
  return true;
}).slice(0, MAX);
console.log(`${cands.length} portretter å sjekke`);

const OK = /^(public domain|pd\b|pd-|cc0|cc[ -]by(-sa)?[ -]?[0-9.]+|cc[ -]by(-sa)?$|attribution|no restrictions)/i;
const BAD = /nc|nd|fair use|non-free/i;
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

for (let i = 0; i < cands.length; i += 40) {
  const batch = cands.slice(i, i + 40);
  const titles = batch.map((id) => 'File:' + E[id].img);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=330&iiextmetadatafilter=LicenseShortName|Artist|LicenseUrl&titles=${encodeURIComponent(titles.join('|'))}`;
  let j;
  for (let a = 0; a < 4; a++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (r.status === 429) { await sleep(30000); continue; } j = await r.json(); break; } catch (e) { await sleep(5000); }
  }
  if (!j) continue;
  const norm = Object.fromEntries((j.query.normalized || []).map((n) => [n.to, n.from]));
  const byTitle = {};
  for (const pg of Object.values(j.query.pages || {})) byTitle[norm[pg.title] || pg.title] = pg;
  for (const id of batch) {
    const pg = byTitle['File:' + E[id].img] || Object.values(j.query.pages).find((x) => x.title.replace(/_/g, ' ') === 'File:' + E[id].img);
    const ii = pg?.imageinfo?.[0];
    if (!ii) { IMG[id] = null; continue; }
    const md = ii.extmetadata || {};
    const lic = strip(md.LicenseShortName?.value);
    if (!lic || !OK.test(lic) || BAD.test(lic)) { IMG[id] = null; console.log(`  hopper over ${id}: ${lic}`); continue; }
    try {
      await sleep(250);
      const r = await fetch(ii.thumburl, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      await sharp(buf).resize(80, 80, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 70 }).toFile(`site/img/p/${id}-s.webp`);
      await sharp(buf).resize(300, 360, { fit: 'cover', position: 'north' }).webp({ quality: 72 }).toFile(`site/img/p/${id}-m.webp`);
      IMG[id] = { s: `/img/p/${id}-s.webp`, m: `/img/p/${id}-m.webp`, artist: strip(md.Artist?.value).slice(0, 90), license: lic, page: ii.descriptionurl };
    } catch (e) { console.log(`  feil ${id}: ${e.message}`); }
  }
  await writeFile('data/images.json', JSON.stringify(IMG));
  console.log(`  ${Math.min(i + 40, cands.length)}/${cands.length}`);
  await sleep(1000);
}
// fjern oppføringer uten fil
for (const [id, v] of Object.entries(IMG)) if (v && !existsSync(`site/img/p/${id}-s.webp`)) delete IMG[id];
await writeFile('data/images.json', JSON.stringify(IMG));
console.log('Ferdig:', Object.values(IMG).filter(Boolean).length, 'portretter');
