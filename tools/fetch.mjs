// Henter slektsdata fra Wikidata (CC0) via SPARQL, skånsomt og med hurtigbuffer.
// Resultat: data/wikidata.json (alle personer vi har hentet) og data/membership.json (hvem som er i hvilket tre).
// Bruk: node tools/fetch.mjs            (henter bare det som mangler)
//       node tools/fetch.mjs --refresh  (henter alt på nytt)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { TREES } from '../content/trees.mjs';

const UA = 'FamilyTreeOfBot/0.1 (https://neimenhalao.github.io/familytreeof/about/; data pipeline, cached)';
const ENDPOINT = 'https://query.wikidata.org/sparql';
const BATCH = 120;
const PAUSE = 1200;
const CACHE = 'data/wikidata.json';
const refresh = process.argv.includes('--refresh');

await mkdir('data', { recursive: true });
let cache = {};
if (!refresh) { try { cache = JSON.parse(await readFile(CACHE, 'utf8')); } catch {} }
let queries = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function sparql(q) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(PAUSE);
    queries++;
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
        body: 'query=' + encodeURIComponent(q),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get('retry-after') || 0) * 1000 || 5000 * (attempt + 1);
        console.log(`  ${res.status}, venter ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
      return (await res.json()).results.bindings;
    } catch (e) {
      console.log('  feil:', e.message.slice(0, 200));
      await sleep(5000 * (attempt + 1));
    }
  }
  throw new Error('SPARQL feilet gjentatte ganger');
}
const qid = (u) => u.replace('http://www.wikidata.org/entity/', '');
const values = (ids) => ids.map((i) => 'wd:' + i).join(' ');
const PREFIX = `PREFIX wd: <http://www.wikidata.org/entity/> PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/> PREFIX ps: <http://www.wikidata.org/prop/statement/> PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/> PREFIX wikibase: <http://wikiba.se/ontology#> PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX bd: <http://www.bigdata.com/rdf#>`;

const REL = ['P22', 'P25', 'P40', 'P26', 'P3373', 'P21', 'P53', 'P97', 'P39', 'P31', 'P18', 'P1038'];
const SEX = { Q6581097: 'm', Q6581072: 'f', Q44148: 'm', Q43445: 'f', Q2449503: 'm', Q1052281: 'f' };

async function fetchBatch(ids) {
  const ents = {};
  for (const id of ids) ents[id] = { id, label: null, desc: null, wiki: null, sex: null, b: null, d: null, P22: [], P25: [], P40: [], P26: [], P3373: [], P53: [], P97: [], P39: [], P31: [], P1038: [], img: null, rc: [] };
  // 1) relasjoner og enkle egenskaper (ikke foreldet rang), med P1480 (usikkerhet)
  const unions = REL.map((p) => `{ ?item p:${p} ?st . ?st ps:${p} ?val ; wikibase:rank ?rank . BIND("${p}" AS ?prop) OPTIONAL { ?st pq:P1480 ?circ } }`).join(' UNION ');
  const rows = (await sparql(`${PREFIX} SELECT ?item ?prop ?val ?rank ?circ WHERE { VALUES ?item { ${values(ids)} } ${unions} }`)).filter((r) => !r.rank.value.endsWith('DeprecatedRank'));
  for (const r of rows) {
    const e = ents[qid(r.item.value)];
    const p = r.prop.value;
    const v = r.val.value;
    if (p === 'P21') { e.sex = SEX[qid(v)] || e.sex; continue; }
    if (p === 'P18') { if (!e.img || r.rank.value.endsWith('PreferredRank')) e.img = decodeURIComponent(v.split('/Special:FilePath/')[1] || '').replace(/_/g, ' '); continue; }
    if (!v.startsWith('http://www.wikidata.org/entity/Q')) continue;
    const id = qid(v);
    if (['P22', 'P25', 'P40', 'P26', 'P3373', 'P1038'].includes(p)) {
      const ex = e[p].find((x) => x[0] === id);
      const unc = r.circ ? 1 : 0;
      const pref = r.rank.value.endsWith('PreferredRank') ? 1 : 0;
      if (ex) { ex[1] = ex[1] || unc; ex[2] = ex[2] || pref; } else e[p].push([id, unc, pref]);
    } else if (!e[p].includes(id)) e[p].push(id);
  }
  // 2) navn, beskrivelse, engelsk Wikipedia, datoer
  const meta = await sparql(`${PREFIX} SELECT ?item ?label ?desc ?article ?b ?bp ?brank ?d ?dp ?drank WHERE { VALUES ?item { ${values(ids)} }
    OPTIONAL { ?item schema:description ?desc FILTER(lang(?desc)="en") }
    OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
    OPTIONAL { ?item p:P569 ?bs . ?bs psv:P569 ?bv ; wikibase:rank ?brank . ?bv wikibase:timeValue ?b ; wikibase:timePrecision ?bp FILTER(?brank != wikibase:DeprecatedRank) }
    OPTIONAL { ?item p:P570 ?ds . ?ds psv:P570 ?dv ; wikibase:rank ?drank . ?dv wikibase:timeValue ?d ; wikibase:timePrecision ?dp FILTER(?drank != wikibase:DeprecatedRank) }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,en-gb,fr,de,es,it,nl,sv,nb,da,pt,la,ru,el". ?item rdfs:label ?label } }`);
  for (const r of meta) {
    const e = ents[qid(r.item.value)];
    if (r.label && !/^Q\d+$/.test(r.label.value)) e.label = r.label.value;
    if (r.desc) e.desc = r.desc.value;
    if (r.article) e.wiki = decodeURIComponent(r.article.value.replace('https://en.wikipedia.org/wiki/', ''));
    for (const k of ['b', 'd']) {
      if (!r[k] || !r[k].value) continue;
      const pref = r[k + 'rank'].value.endsWith('PreferredRank');
      const cand = { t: r[k].value, p: Number(r[k + 'p'].value), pref };
      // Foretrekk foretrukket rang, deretter høyest presisjon
      if (!e[k] || (pref && !e[k].pref) || (pref === e[k].pref && cand.p > e[k].p)) e[k] = cand;
    }
  }
  // 3) barn som peker tilbake (P22/P25), siden P40 ofte mangler
  const rev = await sparql(`${PREFIX} SELECT ?item ?child WHERE { VALUES ?item { ${values(ids)} } ?child wdt:P22|wdt:P25 ?item . }`);
  for (const r of rev) { const e = ents[qid(r.item.value)]; const c = qid(r.child.value); if (!e.rc.includes(c)) e.rc.push(c); }
  for (const e of Object.values(ents)) { for (const k of ['b', 'd']) if (e[k]) delete e[k].pref; }
  return ents;
}

async function ensure(ids) {
  const missing = [...new Set(ids)].filter((i) => /^Q\d+$/.test(i) && !cache[i]);
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    Object.assign(cache, await fetchBatch(batch));
    console.log(`  hentet ${Math.min(i + BATCH, missing.length)}/${missing.length} (totalt ${Object.keys(cache).length}, ${queries} spørringer)`);
    await writeFile(CACHE, JSON.stringify(cache));
  }
}

const kids = (e) => [...new Set([...e.P40.map((x) => x[0]), ...e.rc])];
const parents = (e) => [...e.P22, ...e.P25].map((x) => x[0]);

if (process.argv.includes('--test')) { const t0 = Date.now(); const r = await fetchBatch(TREES.flatMap((t) => t.roots)); console.log(Date.now() - t0, 'ms', JSON.stringify(r.Q9439).slice(0, 700)); process.exit(0); }

// --- Gjennomgang av alle trær, generasjon for generasjon ---
const state = TREES.map((t) => ({ t, nodes: new Map(), frontier: t.roots.map((r) => r) }));
for (const s of state) for (const r of s.t.roots) s.nodes.set(r, { depth: 0, expand: false });
for (let level = 0; level < 40; level++) {
  const all = state.flatMap((s) => s.frontier);
  if (!all.length) break;
  console.log(`Generasjon ${level}: ${all.length} personer i fronten`);
  await ensure(all);
  const childIds = [];
  for (const s of state) for (const id of s.frontier) { const e = cache[id]; if (e) childIds.push(...kids(e)); }
  await ensure(childIds); // trenger barnas P53 for å avgjøre utvidelse
  for (const s of state) {
    const next = [];
    for (const id of s.frontier) {
      const e = cache[id];
      const n = s.nodes.get(id);
      if (!e || n.depth >= s.t.depth) continue;
      const ks = kids(e);
      if (!ks.length) continue;
      n.expand = true;
      for (const k of ks) {
        if (s.nodes.has(k)) continue;
        if (s.nodes.size >= s.t.max) break;
        const ke = cache[k];
        let follow = s.t.follow === 'all';
        if (!follow && ke) follow = ke.P53.some((h) => s.t.houses.includes(h)) || (s.t.houseless && ke.P53.length === 0);
        s.nodes.set(k, { depth: n.depth + 1, expand: false });
        if (follow) next.push(k);
      }
    }
    s.frontier = next;
  }
}

// --- Partnere og «ringen» rundt hver person (foreldre, ektefeller, barn, søsken) ---
const core = new Set(state.flatMap((s) => [...s.nodes.keys()]));
console.log(`Kjerne: ${core.size} personer. Henter partnere og nærmeste familie …`);
const ring1 = [];
for (const id of core) { const e = cache[id]; if (!e) continue; ring1.push(...parents(e), ...e.P26.map((x) => x[0]), ...kids(e), ...e.P3373.map((x) => x[0])); }
await ensure(ring1);
// barnas andre forelder (partnere uten ekteskap)
const ring2 = [];
for (const id of core) { const e = cache[id]; if (!e) continue; for (const k of kids(e)) { const ke = cache[k]; if (ke) ring2.push(...parents(ke)); } }
await ensure(ring2);
// søsken via foreldre
const ring3 = [];
for (const id of core) { const e = cache[id]; if (!e) continue; for (const p of parents(e)) { const pe = cache[p]; if (pe) ring3.push(...kids(pe)); } }
await ensure(ring3);

// --- Navn på titler, hus, stillinger og klasser ---
const refIds = new Set();
for (const e of Object.values(cache)) for (const k of ['P53', 'P97', 'P39', 'P31']) for (const v of e[k] || []) refIds.add(v);
let labels = {};
try { labels = JSON.parse(await readFile('data/labels.json', 'utf8')); } catch {}
const needL = [...refIds].filter((i) => !labels[i]);
for (let i = 0; i < needL.length; i += 300) {
  const rows = await sparql(`${PREFIX} SELECT ?item ?label WHERE { VALUES ?item { ${values(needL.slice(i, i + 300))} } SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". ?item rdfs:label ?label } }`);
  for (const r of rows) labels[qid(r.item.value)] = r.label.value;
}
await writeFile('data/labels.json', JSON.stringify(labels));

const membership = {};
for (const s of state) membership[s.t.slug] = Object.fromEntries([...s.nodes].map(([id, n]) => [id, [n.depth, n.expand ? 1 : 0]]));
await writeFile('data/membership.json', JSON.stringify(membership));
await writeFile(CACHE, JSON.stringify(cache));
for (const s of state) console.log(`${s.t.slug}: ${s.nodes.size} personer`);
console.log(`Ferdig. ${Object.keys(cache).length} entiteter, ${queries} spørringer.`);
