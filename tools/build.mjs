// Bygger hele nettstedet til dist/ fra data/ (Wikidata-uttrekk) og content/ (håndskrevne tekster).
// Miljø: SITE_DOMAIN (tomt = github.io), BASE_PATH, NOINDEX=1, GOATCOUNTER=<kode>
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { TREES, LIVING_ALLOW, BLOCK } from '../content/trees.mjs';
import { INTROS } from '../content/intros.mjs';
import { PAIRS } from '../content/pairs.mjs';
import { prepare, explain, blood } from '../site/js/kin.js';

const DOMAIN = process.env.SITE_DOMAIN || 'neimenhalao.github.io';
const BP = (process.env.BASE_PATH ?? (DOMAIN.endsWith('github.io') ? '/familytreeof' : '')).replace(/\/$/, '');
const BASE = `https://${DOMAIN}${BP}`;
const NOINDEX = process.env.NOINDEX === '1';
const GOAT = process.env.GOATCOUNTER || '';
const NOW_YEAR = 2026;
const SITE = 'FamilyTreeOf';

const json = async (f, d) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return d; } };
const E = await json('data/wikidata.json', {});
const M = await json('data/membership.json', {});
const L = await json('data/labels.json', {});
const IMG = await json('data/images.json', {});
const SLUGS = await json('data/slugs.json', {});

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const u = (p) => BP + p;

// ---------- Personer ----------
const yearOf = (t) => { if (!t) return null; const m = t.t.match(/^(-?)(\d+)/); const y = Number(m[2]); return m[1] ? 1 - y : y; };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const yStr = (y) => (y <= 0 ? `${1 - y} BC` : String(y));
function dateStr(t, yearOnly) {
  if (!t) return null;
  const y = yearOf(t);
  if (t.p <= 7) { const c = Math.ceil(Math.abs(y <= 0 ? 1 - y : y) / 100); return `${c}${['th', 'st', 'nd', 'rd'][c % 10 > 3 || [11, 12, 13].includes(c % 100) ? 0 : c % 10]} century${y <= 0 ? ' BC' : ''}`; }
  if (t.p === 8) return `c. ${yStr(y)}`;
  if (t.p === 9 || yearOnly) return yStr(y);
  const [, mo, d] = t.t.replace(/^-/, '').split('T')[0].split('-').map(Number);
  if (t.p === 10) return `${MONTHS[mo - 1]} ${yStr(y)}`;
  return `${d} ${MONTHS[mo - 1]} ${yStr(y)}`;
}
const cleanTitle = (w) => w.replace(/_/g, ' ').replace(/\s*\([^)]*\)$/, '');
const name = (e) => { const n = e.wiki ? cleanTitle(e.wiki) : e.label; return n && !/^(N\.? ?N\.?|unknown\b.*|anonymous\b.*|unnamed\b.*)$/i.test(n.trim()) ? n : null; };

// relasjonsindekser
const parentsOf = new Map(), childrenOf = new Map(), spousesOf = new Map(), unc = new Set(), sibExtra = new Map();
const addSet = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
for (const e of Object.values(E)) {
  for (const [p, un] of [...e.P22, ...e.P25]) { addSet(parentsOf, e.id, p); addSet(childrenOf, p, e.id); if (un) unc.add(p + '>' + e.id); }
  for (const [c, un] of e.P40) { addSet(parentsOf, c, e.id); addSet(childrenOf, e.id, c); if (un) unc.add(e.id + '>' + c); }
  for (const [s] of e.P26) { addSet(spousesOf, e.id, s); addSet(spousesOf, s, e.id); }
  for (const [s] of e.P3373) { addSet(sibExtra, e.id, s); addSet(sibExtra, s, e.id); }
}
const get = (m, k) => [...(m.get(k) || [])];

// estimert fødselsår (for å avgjøre om noen kan være i live)
const est = new Map();
for (const e of Object.values(E)) { const y = yearOf(e.b); if (y !== null) est.set(e.id, y); else if (e.d) est.set(e.id, yearOf(e.d) - 60); }
for (let round = 0; round < 6; round++) {
  for (const e of Object.values(E)) {
    if (est.has(e.id)) continue;
    const cands = [];
    for (const p of get(parentsOf, e.id)) if (est.has(p)) cands.push(est.get(p) + 28);
    for (const c of get(childrenOf, e.id)) if (est.has(c)) cands.push(est.get(c) - 28);
    for (const s of get(spousesOf, e.id)) if (est.has(s)) cands.push(est.get(s));
    if (cands.length) est.set(e.id, Math.round(cands.reduce((a, b) => a + b) / cands.length));
  }
}
const isHuman = (e) => e.P31.includes('Q5');
const P = new Map(); // id -> person (bare godkjente)
const excludedLiving = [];
for (const e of Object.values(E)) {
  const nm = name(e);
  if (!nm || BLOCK.includes(e.id)) continue;
  const human = isHuman(e);
  const eb = est.get(e.id);
  const living = human && !e.d && (eb === undefined || eb > NOW_YEAR - 120);
  if (living) {
    const allowed = e.wiki && (e.P97.length || e.P39.length || LIVING_ALLOW.includes(e.id)) && eb !== undefined;
    if (!allowed) { if (e.wiki) excludedLiving.push(`${e.id} ${nm}`); continue; }
  }
  const by = yearOf(e.b), dy = yearOf(e.d);
  const minor = living && by !== null && by > NOW_YEAR - 18;
  P.set(e.id, { id: e.id, e, name: nm, sex: e.sex || '', living, minor, human, by, dy });
}
// slug per person (stabil)
const used = new Set(Object.values(SLUGS));
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'person';
function slugFor(p) {
  if (SLUGS[p.id]) return SLUGS[p.id];
  let s = slugify(p.name);
  if (used.has(s) && p.by !== null) s = `${s}-${p.by <= 0 ? 1 - p.by + '-bc' : p.by}`;
  if (used.has(s)) s = `${slugify(p.name)}-${p.id.toLowerCase()}`;
  used.add(s); SLUGS[p.id] = s;
  return s;
}
const yrs = (p) => {
  if (p.living) return p.by !== null ? `b. ${yStr(p.by)}` : '';
  const b = p.e.b ? dateStr(p.e.b, true) : null, d = p.e.d ? dateStr(p.e.d, true) : null;
  if (b && d) return `${b.replace(/ BC$/, d.endsWith('BC') ? '' : ' BC')}–${d}`.replace(/^c\. /, 'c. ');
  if (b) return `b. ${b}`; if (d) return `d. ${d}`; return '';
};
const R = {
  parents: (id) => get(parentsOf, id).filter((x) => P.has(x)),
  children: (id) => get(childrenOf, id).filter((x) => P.has(x)).sort(byBirth),
  spouses: (id) => get(spousesOf, id).filter((x) => P.has(x)).sort(byBirth),
  siblings: (id) => { const s = new Set(); for (const p of get(parentsOf, id)) for (const c of get(childrenOf, p)) s.add(c); for (const x of get(sibExtra, id)) s.add(x); s.delete(id); return [...s].filter((x) => P.has(x)).sort(byBirth); },
};
// hovedforeldre: én far og én mor, sikre lenker og foretrukket rang først
function mainParents(id) {
  const e = E[id]; const ps = R.parents(id);
  const st = e ? [...e.P22, ...e.P25] : [];
  const score = (x) => (unc.has(x + '>' + id) ? 0 : 4) + (st.some(([q, , pref]) => q === x && pref) ? 2 : 0) + (st.some(([q]) => q === x) ? 1 : 0);
  const pick = (s) => ps.filter((x) => P.get(x).sex === s).sort((a, c) => score(c) - score(a))[0];
  const res = [pick('m'), pick('f')].filter(Boolean);
  for (const x of ps) if (res.length < 2 && !res.includes(x) && !P.get(x).sex) res.push(x);
  return res;
}
const otherParent = (c, id) => { const s = P.get(id).sex; return mainParents(c).find((x) => x !== id && (!s || P.get(x).sex !== s)) || null; };
function byBirth(a, b) { const x = P.get(a)?.by ?? est.get(a) ?? 9999, y = P.get(b)?.by ?? est.get(b) ?? 9999; return x - y; }

// ---------- Trær ----------
const trees = [];
const pageIds = new Set();
const treesOf = new Map();
for (const t of TREES) {
  const mem = M[t.slug] || {};
  const cand = new Set(Object.keys(mem).filter((id) => P.has(id) && (!t.wikiOnly || P.get(id).e.wiki || t.roots.includes(id))));
  const k = {}, h = {}, cp = {}, pa = {}, dep = {};
  // barn vises bare under sine hovedforeldre (sikre lenker); varianter står på personsiden
  const kidsOf = (id) => (mem[id] && mem[id][1] ? R.children(id).filter((c) => cand.has(c) && mainParents(c).includes(id)) : []);
  const roots = t.roots.filter((r) => cand.has(r));
  let q = [...roots];
  roots.forEach((r) => (dep[r] = 0));
  while (q.length) {
    const nq = [];
    const houses = t.houses || [];
    const prio = (id) => (E[id].P53.some((x) => houses.includes(x)) ? 2 : 0) + (P.get(id).sex === 'm' ? 1 : 0);
    for (const id of q) {
      const ks = kidsOf(id);
      if (ks.length) k[id] = ks;
      for (const c of ks) {
        if (dep[c] === undefined) { dep[c] = dep[id] + 1; h[c] = id; nq.push(c); }
        else if (dep[c] === dep[id] + 1 && h[c] !== id && prio(id) > prio(h[c])) h[c] = id;
      }
    }
    q = nq;
  }
  // hjemmeforelder: medlem av huset først, deretter far (barn vises fullt under ham, som henvisning hos den andre)
  {
    const houses = t.houses || [];
    const prio = (id) => (E[id].P53.some((x) => houses.includes(x)) ? 2 : 0) + (P.get(id).sex === 'm' ? 1 : 0);
    const parentsIn = new Map();
    for (const [p, ks] of Object.entries(k)) for (const c of ks) { if (!parentsIn.has(c)) parentsIn.set(c, []); parentsIn.get(c).push(p); }
    const isAnc = (c, p) => { let x = p, g = 0; while (x && g++ < 200) { if (x === c) return true; x = h[x]; } return false; };
    for (const [c, ps] of parentsIn) {
      if (ps.length < 2 || !h[c]) continue;
      const best = ps.filter((p) => !isAnc(c, p)).sort((x, y) => prio(y) - prio(x))[0];
      if (best && prio(best) > prio(h[c])) h[c] = best;
    }
  }
  const nodes = Object.keys(dep);
  const nodeSet = new Set(nodes);
  const partners = new Set();
  for (const id of nodes) {
    const list = [];
    for (const s of R.spouses(id)) list.push([s, 1]);
    for (const c of k[id] || []) {
      const o = otherParent(c, id);
      if (o && !list.some(([q]) => q === o)) list.push([o, 0]);
    }
    if (list.length) pa[id] = list;
    list.forEach(([q]) => partners.add(q));
  }
  for (const id of nodes) { const hp = h[id]; if (!hp) continue; const o = otherParent(id, hp); cp[id] = o ? [hp, o] : [hp]; }
  const all = new Set([...nodes, ...partners]);
  for (const id of all) { pageIds.add(id); if (!treesOf.has(id)) treesOf.set(id, []); if (nodeSet.has(id)) treesOf.get(id).push(t.slug); }
  const un = [];
  for (const [pid, ks] of Object.entries(k)) for (const c of ks) if (unc.has(pid + '>' + c)) un.push(pid + '>' + c);
  const years = nodes.map((id) => P.get(id).by).filter((y) => y !== null);
  const gens = Math.max(0, ...nodes.map((id) => dep[id])) + 1;
  trees.push({ t, intro: INTROS[t.slug], nodes, nodeSet, partners, all, k, h, cp, pa, dep, un, gens, span: years.length ? [Math.min(...years), Math.max(...years)] : null });
}
// personer i partnere-listen som ikke er noder får likevel side; ring-personer får ikke egen side
const pageSlug = (id) => (pageIds.has(id) ? slugFor(P.get(id)) : null);
for (const id of [...pageIds].sort()) slugFor(P.get(id));
const purl = (id) => (pageIds.has(id) ? `/person/${SLUGS[id]}/` : null);
const relCount = (id) => R.parents(id).length + R.children(id).length + R.spouses(id).length + R.siblings(id).length;
const indexable = (id) => { const p = P.get(id); return !!p.e.wiki && !p.minor && relCount(id) >= 4; };

// bilder
const thumb = (id) => { const p = P.get(id); if (!p || p.minor || !IMG[id]) return null; return IMG[id].s; };
const imgMed = (id) => { const p = P.get(id); if (!p || p.minor || !IMG[id]) return null; return IMG[id]; };

// ---------- Graf for slektskapssøkeren ----------
const gIds = [...P.keys()].filter((id) => pageIds.has(id) || R.parents(id).some((x) => pageIds.has(x)) || R.children(id).some((x) => pageIds.has(x)) || R.spouses(id).some((x) => pageIds.has(x)));
const gIdx = new Map(gIds.map((id, i) => [id, i]));
const G = { u: [], n: gIds.map((id) => { const p = P.get(id); return [id, p.name, p.sex, p.living ? p.by : (p.by), p.dy, purl(id) || '', p.living ? 1 : 0]; }), par: [], sp: [] };
for (const id of gIds) {
  for (const pr of R.parents(id)) if (gIdx.has(pr)) { G.par.push(gIdx.get(id), gIdx.get(pr)); if (unc.has(pr + '>' + id)) G.u.push(gIdx.get(id), gIdx.get(pr)); }
  for (const s of R.spouses(id)) if (gIdx.has(s) && gIdx.get(s) > gIdx.get(id)) G.sp.push(gIdx.get(id), gIdx.get(s));
}
const K = prepare(G);

// ---------- HTML-ramme ----------
const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="6" r="4" fill="#9a6b22"/><circle cx="7" cy="24" r="4" fill="#3f5f86"/><circle cx="25" cy="24" r="4" fill="#a04e63"/><circle cx="16" cy="24" r="3" fill="#1c2230"/><path d="M16 10v6M7 20v-4h18v4M16 16v5" stroke="#1c2230" stroke-width="1.8" fill="none"/></svg>`;
function layout({ title, desc, path, body, noindex = false, jsonld = [], scripts = '', image = '/og.png', nav = '' }) {
  const canon = BASE + path;
  return `<!doctype html>
<html lang="en" data-bp="${BP}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
${noindex || NOINDEX ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${BASE}${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f6f1e6">
<link rel="icon" href="${u('/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${u('/css/style.css')}?v=${VERSION}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
${GOAT ? `<script data-goatcounter="https://${GOAT}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="brand" href="${u('/')}">${LOGO}<span class="wm">FamilyTree<b>Of</b></span></a>
<nav aria-label="Main"><a href="${u('/trees/')}"${nav === 'trees' ? ' aria-current="page"' : ''}>Trees</a><a href="${u('/how-are-they-related/')}"${nav === 'rel' ? ' aria-current="page"' : ''}>How related?</a><a href="${u('/make-your-own-family-tree/')}"${nav === 'maker' ? ' aria-current="page"' : ''}>Make yours</a><a class="hide-s" href="${u('/about/')}"${nav === 'about' ? ' aria-current="page"' : ''}>About</a></nav>
</div></header>
<main id="main">${body}</main>
<footer class="bottom"><div class="wrap">
<nav aria-label="Footer"><a href="${u('/trees/')}">All family trees</a><a href="${u('/how-are-they-related/')}">How are they related?</a><a href="${u('/make-your-own-family-tree/')}">Make your own family tree</a><a href="${u('/family-tree-template/')}">Printable templates</a><a href="${u('/about/')}">About &amp; sources</a><a href="${u('/privacy/')}">Privacy</a></nav>
<p>Family data from <a href="https://www.wikidata.org/">Wikidata</a> (CC0). Portraits from <a href="https://commons.wikimedia.org/">Wikimedia Commons</a>, credited on each page. Wikidata can contain errors – <a href="${u('/about/#corrections')}">how to correct them</a>.</p>
</div></footer>
${scripts}
</body>
</html>`;
}
const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, p], i) => (i < items.length - 1 ? `<a href="${u(p)}">${esc(n)}</a> › ` : `<span>${esc(n)}</span>`)).join('')}</nav>`;
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, p], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: BASE + p })) });

const VERSION = Date.now().toString(36);
const out = [];
async function write(path, html) {
  const f = 'dist' + (path.endsWith('/') ? path + 'index.html' : path);
  await mkdir(dirname(f), { recursive: true });
  await writeFile(f, html);
}
const sitemap = [];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('site', 'dist', { recursive: true });

// person-kort (mini)
function pc(id, extra = '', cls = '') {
  const p = P.get(id);
  if (!p) return '';
  const t = thumb(id);
  const inner = `${t ? `<img src="${u(t)}" alt="" loading="lazy" width="34" height="34">` : `<span class="ph" aria-hidden="true">${esc(p.name[0])}</span>`}<span>${esc(p.name)}<small>${esc([yrs(p), extra].filter(Boolean).join(' · '))}</small></span>`;
  const url = purl(id);
  return url ? `<a class="pc ${p.sex} ${cls}" href="${u(url)}">${inner}</a>` : `<span class="pc ${p.sex} ${cls}">${inner}</span>`;
}

// ---------- Tre-sider ----------
function outline(T) {
  const seen = new Set();
  const li = (id, from) => {
    const p = P.get(id);
    if (seen.has(id) || (from && T.h[id] && T.h[id] !== from)) return `<li><a href="#o-${id}">${esc(p.name)}</a> <span class="yrs">(see above)</span></li>`;
    seen.add(id);
    const url = purl(id);
    const nm = url ? `<a class="p" href="${u(url)}">${esc(p.name)}</a>` : `<span class="p">${esc(p.name)}</span>`;
    const sp = R.spouses(id).map((s) => P.get(s).name);
    let s = `<li id="o-${id}">${nm} <span class="yrs">${esc(yrs(p))}</span>${sp.length ? ` <span class="sp">· m. ${esc(sp.join(', '))}</span>` : ''}`;
    const kids = T.k[id] || [];
    if (kids.length) {
      const groups = new Map();
      for (const c of kids) { const o = otherParent(c, id) || ''; if (!groups.has(o)) groups.set(o, []); groups.get(o).push(c); }
      s += '<ul>';
      for (const [o, cs] of groups) {
        if (groups.size > 1 || o) s += `<li class="grp">${o ? `with ${esc(P.get(o).name)}` : 'other parent unknown'}</li>`;
        s += cs.map((c) => li(c, id)).join('');
      }
      s += '</ul>';
    }
    return s + '</li>';
  };
  return `<ul class="outline">${T.t.roots.filter((r) => P.has(r)).map((r) => li(r, null)).join('')}</ul>`;
}
const treeUrl = (slug) => `/${slug}/`;
const treeName = (T) => T.intro?.h1 || T.t.name + ' family tree';
const faces = (T, n = 4) => T.nodes.filter((id) => thumb(id)).sort((a, b) => T.dep[a] - T.dep[b]).slice(0, n);
const treeCard = (T) => `<a class="tcard" href="${u(treeUrl(T.t.slug))}"><span class="faces">${faces(T).map((id) => `<img src="${u(thumb(id))}" alt="" loading="lazy" width="34" height="34">`).join('')}</span><b>${esc(treeName(T))}</b><small>${T.nodes.length} people · ${T.gens} generations${T.span && T.t.cat !== 'myth' ? ` · ${yStr(T.span[0])}–${T.span[1] > NOW_YEAR - 40 ? 'today' : yStr(T.span[1])}` : ''}</small></a>`;
const CAT = { royal: 'Royal families today', dynasty: 'Royal dynasties', ancient: 'Ancient rulers', myth: 'Gods and mythology', family: 'Famous American and British families' };

const pairPages = [];
for (const [a, b] of PAIRS) {
  if (!K.idx.has(a) || !K.idx.has(b) || !pageIds.has(a) || !pageIds.has(b)) continue;
  const r = explain(K, a, b);
  if (!r.ok) continue;
  pairPages.push({ a, b, r, slug: `${SLUGS[a]}-and-${SLUGS[b]}` });
}
const pairsFor = (ids) => pairPages.filter((pp) => ids.has(pp.a) || ids.has(pp.b));
const pairLink = (pp) => `<li><a href="${u(`/how-are-they-related/${pp.slug}/`)}">How are ${esc(P.get(pp.a).name)} and ${esc(P.get(pp.b).name)} related?</a></li>`;

for (const T of trees) {
  const I = T.intro || { h1: T.t.name, title: T.t.name + ' Family Tree', desc: '', lede: '', intro: [], faq: [], sources: [] };
  const people = {};
  for (const id of T.all) {
    const p = P.get(id);
    people[id] = { n: p.name, y: yrs(p), s: p.sex, u: purl(id), i: thumb(id), d: p.e.desc || '' };
    for (const key of Object.keys(people[id])) if (!people[id][key]) delete people[id][key];
  }
  const data = { roots: T.t.roots.filter((r) => P.has(r)), focus: (T.t.focus || []).filter((f) => T.nodeSet.has(f)), open: T.t.open ?? 1, p: people, k: T.k, h: T.h, cp: T.cp, pa: T.pa, dep: T.dep, un: T.un };
  await write(`/data/tree/${T.t.slug}.json`, JSON.stringify(data));
  const path = treeUrl(T.t.slug);
  const cr = [['Home', '/'], ['Family trees', '/trees/'], [I.h1, path]];
  const related = trees.filter((o) => o !== T && (o.t.cat === T.t.cat || [...T.nodeSet].some((id) => o.nodeSet.has(id)))).slice(0, 8);
  const pp = pairsFor(T.nodeSet).slice(0, 8);
  const body = `<div class="wrap">${crumbs(cr)}
<div class="tree-head"><div><h1>${esc(I.h1)}</h1><p class="lede">${esc(I.lede)}</p></div>
<div class="no-print"><a class="btn" href="#text-version" onclick="document.getElementById('text-version').open=true">Text version</a> <button class="btn" type="button" onclick="document.getElementById('text-version').open=true;print()">Print</button></div></div>
<div class="legend no-print"><span><i style="background:var(--male)"></i>Male</span><span><i style="background:var(--female)"></i>Female</span><span><i class="dash"></i>Uncertain link</span><span>${T.nodes.length} people · ${T.gens} generations</span></div>
<div class="chart" data-src="${u(`/data/tree/${T.t.slug}.json`)}?v=${VERSION}" role="application" aria-label="Interactive family tree"><noscript><p class="noscript-msg">The interactive tree needs JavaScript. The full tree is in the text version below.</p></noscript></div>
<div class="intro">${(I.intro || []).join('\n')}</div>
${T.t.cat === 'myth' ? '<p class="note">Myths exist in many versions. Where ancient sources disagree about parents, the tree shows the version recorded first in Wikidata; the person pages list the alternatives.</p>' : ''}
<details class="textv" id="text-version"><summary>Full family tree – text version (printable)</summary>${outline(T)}</details>
${(I.faq || []).length ? `<h2>Questions</h2>${I.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}` : ''}
${pp.length ? `<h2>How are they related?</h2><ul>${pp.map(pairLink).join('')}</ul><p><a href="${u('/how-are-they-related/')}">Find how any two people are related →</a></p>` : ''}
${related.length ? `<h2>Related family trees</h2><div class="grid">${related.map(treeCard).join('')}</div>` : ''}
<h2>Sources</h2><ul class="sources">${(I.sources || []).map(([n, l]) => `<li><a href="${esc(l)}" rel="noopener">${esc(n)}</a></li>`).join('')}<li>Family links: <a href="https://www.wikidata.org/">Wikidata</a> (CC0), fetched ${new Date().toISOString().slice(0, 10)}. Portraits: Wikimedia Commons (credited on each person’s page).</li></ul>
</div>`;
  const ld = [crumbLd(cr), { '@context': 'https://schema.org', '@type': 'WebPage', name: I.title, description: I.desc, url: BASE + path, about: T.t.roots.filter((r) => P.has(r)).map((r) => ({ '@type': 'Thing', name: P.get(r).name, sameAs: `https://www.wikidata.org/wiki/${r}` })) }];
  if ((I.faq || []).length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: I.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  await write(path, layout({ title: I.title, desc: I.desc, path, body, jsonld: ld, nav: 'trees', image: existsSync(`site/og/${T.t.slug}.png`) ? `/og/${T.t.slug}.png` : '/og.png', scripts: `<script src="${u('/js/tree.js')}?v=${VERSION}" defer></script>` }));
  sitemap.push(path);
}

// ---------- Personsider ----------
const treeBySlug = Object.fromEntries(trees.map((T) => [T.t.slug, T]));
let nIndexed = 0, nPages = 0;
for (const id of pageIds) {
  const p = P.get(id), e = p.e;
  const path = purl(id);
  const ix = indexable(id);
  const parents = R.parents(id), spouses = R.spouses(id), children = R.children(id), siblings = R.siblings(id);
  const gp = [...new Set(parents.flatMap((x) => R.parents(x)))].sort(byBirth);
  const inTrees = treesOf.get(id) || [];
  const hostTrees = inTrees.length ? inTrees : trees.filter((T) => T.partners.has(id)).map((T) => T.t.slug);
  const T0 = treeBySlug[hostTrees[0]];
  // slektskap til kjente personer i samme tre (unik tekst per side)
  const stmts = [];
  if (T0) {
    const targets = [...T0.t.roots, ...(T0.t.focus || [])].filter((x) => x !== id && P.has(x) && K.idx.has(x));
    for (const x of targets.slice(0, 3)) { const bl = K.idx.has(id) && blood(K, K.idx.get(id), K.idx.get(x)); if (bl && bl.s > 1) { const r = explain(K, id, x); if (r.ok) stmts.push(r.lines[r.main]); } }
  }
  const varP = e.P22.length > 1 || e.P25.length > 1;
  const uncP = parents.filter((x) => unc.has(x + '>' + id));
  const titles = e.P97.map((x) => L[x]).filter(Boolean).slice(0, 6);
  const houses = e.P53.map((x) => L[x]).filter(Boolean).slice(0, 3);
  const positions = [...new Set(e.P39.map((x) => L[x]).filter(Boolean))].filter((x) => !titles.includes(x)).slice(0, 5);
  const im = imgMed(id);
  const facts = [];
  if (p.living) { if (p.by !== null) facts.push(['Born', yStr(p.by)]); }
  else { if (e.b) facts.push(['Born', dateStr(e.b)]); if (e.d) facts.push(['Died', dateStr(e.d)]); }
  if (titles.length) facts.push(['Titles', titles.join('; ')]);
  if (positions.length) facts.push(['Positions', positions.join('; ')]);
  if (houses.length) facts.push(['House', houses.join(', ')]);
  const kidsByOther = new Map();
  for (const c of children) { const o = otherParent(c, id) || ''; if (!kidsByOther.has(o)) kidsByOther.set(o, []); kidsByOther.get(o).push(c); }
  const sibLabel = (s) => { const a = R.parents(id), b = R.parents(s); return a.length >= 2 && b.length >= 2 && a.every((x) => b.includes(x)) ? '' : (a.some((x) => b.includes(x)) && a.length >= 2 && b.length >= 2 ? 'half-sibling' : ''); };
  const cr = [['Home', '/'], ...(T0 ? [[T0.intro?.h1 || T0.t.name, treeUrl(T0.t.slug)]] : [['Family trees', '/trees/']]), [p.name, path]];
  const desc = `${p.name}${yrs(p) ? ` (${yrs(p)})` : ''}${e.desc ? `, ${e.desc}` : ''}: parents, ${spouses.length ? 'spouses, ' : ''}children, siblings and family tree.`.slice(0, 158);
  const mini = `<div class="mini" aria-label="Family of ${esc(p.name)}">
${gp.length ? `<div class="row"><div class="lab">Grandparents</div>${gp.slice(0, 4).map((x) => pc(x)).join('')}</div>` : ''}
${parents.length ? `<div class="row"><div class="lab">Parents</div>${parents.slice(0, 4).map((x) => pc(x)).join('')}</div>` : ''}
<div class="row">${pc(id, '', 'me')}${spouses.slice(0, 3).map((x) => pc(x, 'spouse')).join('')}</div>
${children.length ? `<div class="row"><div class="lab">Children</div>${children.slice(0, 8).map((x) => pc(x)).join('')}${children.length > 8 ? `<span class="muted small">+${children.length - 8} more</span>` : ''}</div>` : ''}
</div>`;
  const sec = (h, ids, extraFn) => (ids.length ? `<h2>${h}</h2><div class="rel-list">${ids.map((x) => pc(x, extraFn ? extraFn(x) : '')).join('')}</div>` : '');
  const body = `<div class="wrap narrow">${crumbs(cr)}
<div class="person-head">${im ? `<figure class="portrait"><img src="${u(im.m)}" alt="${esc(p.name)}" width="150" height="180"><figcaption>${im.artist ? esc(im.artist) + ', ' : ''}<a href="${esc(im.page)}" rel="noopener">${esc(im.license)}</a>, via Wikimedia Commons</figcaption></figure>` : ''}
<div><h1>${esc(p.name)}</h1>${e.desc ? `<p class="lede">${esc(e.desc[0].toUpperCase() + e.desc.slice(1))}</p>` : ''}
${facts.length ? `<dl class="facts">${facts.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>` : ''}</div></div>
${mini}
${stmts.length ? `<p>${stmts.map(esc).join(' ')}</p>` : ''}
${varP ? `<p class="note">Sources disagree about ${esc(p.name)}’s parentage. Wikidata lists ${[...e.P22, ...e.P25].map(([x]) => P.get(x)?.name).filter(Boolean).map(esc).join(', ')} as parents in different traditions.</p>` : ''}
${uncP.length ? `<p class="note">The link to ${uncP.map((x) => esc(P.get(x).name)).join(' and ')} is marked as uncertain in the sources.</p>` : ''}
${sec('Parents', parents, (x) => (unc.has(x + '>' + id) ? 'uncertain' : ''))}
${sec(spouses.length === 1 ? 'Spouse' : 'Spouses', spouses)}
${children.length ? `<h2>Children</h2>${[...kidsByOther].map(([o, cs]) => `${kidsByOther.size > 1 || o ? `<h3>${o ? `With ${esc(P.get(o).name)}` : 'Other parent not recorded'}</h3>` : ''}<div class="rel-list">${cs.map((x) => pc(x, unc.has(id + '>' + x) ? 'uncertain' : '')).join('')}</div>`).join('')}` : ''}
${sec('Siblings', siblings, sibLabel)}
${hostTrees.length ? `<h2>Family trees</h2><div class="chips">${hostTrees.map((s) => `<a href="${u(treeUrl(s))}">${esc(treeBySlug[s].intro?.h1 || treeBySlug[s].t.name)}</a>`).join('')}</div>` : ''}
<h2>How is ${esc(p.name)} related to …?</h2><p><a class="btn primary" href="${u(`/how-are-they-related/?a=${id}`)}">Find the relationship to anyone else</a></p>
${pairsFor(new Set([id])).length ? `<ul>${pairsFor(new Set([id])).map(pairLink).join('')}</ul>` : ''}
<p class="sources">Data: <a href="https://www.wikidata.org/wiki/${id}" rel="noopener">Wikidata ${id}</a> (CC0)${e.wiki ? ` · <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(e.wiki)}" rel="noopener">Wikipedia article</a>` : ''}. Something wrong? <a href="${u('/about/#corrections')}">How to correct it</a>.</p>
</div>`;
  const ld = [crumbLd(cr)];
  if (p.human) {
    const ref = (x) => ({ '@type': 'Person', name: P.get(x).name, ...(purl(x) ? { url: BASE + purl(x) } : {}) });
    const person = { '@context': 'https://schema.org', '@type': 'Person', name: p.name, url: BASE + path, sameAs: [`https://www.wikidata.org/wiki/${id}`, ...(e.wiki ? [`https://en.wikipedia.org/wiki/${encodeURIComponent(e.wiki)}`] : [])] };
    if (e.desc) person.description = e.desc;
    if (!p.living && e.b && e.b.p >= 11 && yearOf(e.b) > 0) person.birthDate = e.b.t.slice(0, 10);
    if (!p.living && e.d && e.d.p >= 11 && yearOf(e.d) > 0) person.deathDate = e.d.t.slice(0, 10);
    if (parents.length) person.parent = parents.map(ref);
    if (children.length) person.children = children.map(ref);
    if (spouses.length) person.spouse = spouses.map(ref);
    if (siblings.length) person.sibling = siblings.slice(0, 20).map(ref);
    if (im) person.image = BASE + im.m;
    ld.push(person);
  }
  await write(path, layout({ title: `${p.name} – Family Tree, Parents, Children`, desc, path, body, noindex: !ix, jsonld: ld, nav: 'trees' }));
  nPages++;
  if (ix) { sitemap.push(path); nIndexed++; }
}

// ---------- Slektskapssøker ----------
await write('/data/graph.json', JSON.stringify(G));
const finderForm = (a = '', aId = '') => `<form class="finder" action="${u('/how-are-they-related/')}" method="get" data-finder>
<div class="ac"><label for="fa">First person</label><input id="fa" name="an" placeholder="e.g. Queen Victoria" autocomplete="off" value="${esc(a)}"><input type="hidden" name="a" value="${aId}"><ul hidden></ul></div>
<div class="and">and</div>
<div class="ac"><label for="fb">Second person</label><input id="fb" name="bn" placeholder="e.g. Charles III" autocomplete="off" value=""><input type="hidden" name="b"><ul hidden></ul></div>
</form>`;
const finderScript = `<script type="module" src="${u('/js/finder.js')}?v=${VERSION}"></script>`;
function answerHtml(r) {
  return `<div class="answer"><p class="big">${esc(r.lines[r.main])}</p>${r.lines.filter((_, i) => i !== r.main).map((l) => `<p>${esc(l)}</p>`).join('')}
<ol class="path">${r.path.map((s, i) => `<li>${s.rel ? `<span class="step">${esc(s.rel)}</span>` : ''}${pc(G.n[s.i][0])}</li>`).join('')}</ol></div>`;
}
{
  const path = '/how-are-they-related/';
  const body = `<div class="wrap narrow">${crumbs([['Home', '/'], ['How are they related?', path]])}
<h1>How are they related?</h1>
<p class="lede">Pick any two people from our family trees – kings, queens, presidents, gods – and see exactly how they are related, step by step.</p>
${finderForm()}
<div id="result" aria-live="polite"></div>
<h2>Popular questions</h2><ul>${pairPages.slice(0, 40).map(pairLink).join('')}</ul>
<p class="muted small">Relationships are worked out from parent, child and marriage links in Wikidata. Blood relationships are shown first; if there is none, we show the shortest link through marriages. Adoption is not included.</p>
</div>`;
  await write(path, layout({ title: 'How Are They Related? Royal & Historical Relationship Finder', desc: 'Find out how two historical figures, royals or gods are related. See the exact relationship – cousin, great-uncle, in-law – and the family path between them.', path, body, nav: 'rel', scripts: finderScript }));
  sitemap.push(path);
}
for (const pp of pairPages) {
  const A = P.get(pp.a), B = P.get(pp.b);
  const path = `/how-are-they-related/${pp.slug}/`;
  const cr = [['Home', '/'], ['How are they related?', '/how-are-they-related/'], [`${A.name} and ${B.name}`, path]];
  const main = pp.r.lines[pp.r.main];
  const others = pairPages.filter((o) => o !== pp && (o.a === pp.a || o.b === pp.b || o.a === pp.b || o.b === pp.a)).slice(0, 6);
  const body = `<div class="wrap narrow">${crumbs(cr)}
<h1>How are ${esc(A.name)} and ${esc(B.name)} related?</h1>
${answerHtml(pp.r)}
<p>The path above links ${esc(A.name)} to ${esc(B.name)} in ${pp.r.steps} step${pp.r.steps === 1 ? '' : 's'}${pp.r.blood ? '' : ', partly through marriage'}. Tap any name to see that person’s family.</p>
<h2>Try another pair</h2>${finderForm(A.name, pp.a)}<div id="result" aria-live="polite"></div>
${others.length ? `<h2>More questions</h2><ul>${others.map(pairLink).join('')}</ul>` : ''}
<p class="sources">Based on parent, child and marriage links in <a href="https://www.wikidata.org/">Wikidata</a> (CC0). Adoption is not included.</p>
</div>`;
  await write(path, layout({ title: `How Are ${A.name} and ${B.name} Related?`, desc: main.slice(0, 155), path, body, nav: 'rel', jsonld: [crumbLd(cr)], scripts: finderScript }));
  sitemap.push(path);
}

// ---------- Oversikt over trær ----------
{
  const path = '/trees/';
  const body = `<div class="wrap">${crumbs([['Home', '/'], ['Family trees', path]])}<h1>All family trees</h1>
<p class="lede">${trees.length} interactive family trees of royal houses, dynasties, mythologies and famous families – ${pageIds.size.toLocaleString('en')} people in all.</p>
${Object.entries(CAT).map(([c, h]) => { const ts = trees.filter((T) => T.t.cat === c); return ts.length ? `<h2>${h}</h2><div class="grid">${ts.map(treeCard).join('')}</div>` : ''; }).join('')}
<h2>People A–Z</h2><p class="muted">Everyone with their own page, by family tree.</p>
${trees.map((T) => `<h3>${esc(treeName(T))}</h3><ul class="plist">${T.nodes.filter((id) => indexable(id)).sort(byBirth).map((id) => `<li><a href="${u(purl(id))}">${esc(P.get(id).name)}</a></li>`).join('')}</ul>`).join('')}
</div>`;
  await write(path, layout({ title: 'Family Trees of Royals, Dynasties and Gods', desc: `Browse ${trees.length} interactive family trees: British and European royal families, Tudors, Habsburgs, Romanovs, Roman emperors, pharaohs and Greek, Norse and Egyptian gods.`, path, body, nav: 'trees' }));
  sitemap.push(path);
}

// ---------- Forside ----------
{
  const feat = ['british-royal-family', 'greek-gods', 'tudor', 'norse-gods', 'habsburg', 'romanov', 'egyptian-gods', 'julio-claudian'].map((s) => treeBySlug[s]).filter(Boolean);
  const heroArt = `<svg class="art" viewBox="0 0 400 270" role="img" aria-label="Illustration of a family tree: Queen Victoria, two of her children and four grandchildren"><g fill="none" stroke="#b4a383" stroke-width="2"><path d="M200 62v34M100 96h200M100 96v20M300 96v20M100 156v30M50 186h100M50 186v20M150 186v20M300 156v30M250 186h100M250 186v20M350 186v20"/></g><g fill="#fffdf8" stroke-width="2"><rect x="150" y="22" width="100" height="40" rx="9" stroke="#9a6b22"/><rect x="50" y="116" width="100" height="40" rx="9" stroke="#3f5f86"/><rect x="250" y="116" width="100" height="40" rx="9" stroke="#a04e63"/><rect x="7" y="206" width="86" height="36" rx="8" stroke="#a04e63"/><rect x="107" y="206" width="86" height="36" rx="8" stroke="#3f5f86"/><rect x="207" y="206" width="86" height="36" rx="8" stroke="#a04e63"/><rect x="307" y="206" width="86" height="36" rx="8" stroke="#a04e63"/></g><g fill="#1c2230" font-family="Georgia,serif" font-size="13" text-anchor="middle"><text x="200" y="47">Victoria</text><text x="100" y="141">Edward VII</text><text x="300" y="141">Alice</text><text x="50" y="229">Maud</text><text x="150" y="229">George V</text><text x="250" y="229">Ella</text><text x="350" y="229">Alix</text></g><g fill="#9a6b22"><circle cx="200" cy="96" r="4"/><circle cx="100" cy="186" r="4"/><circle cx="300" cy="186" r="4"/></g></svg>`;
  const body = `<div class="wrap">
<section class="hero"><div><p class="kicker">Interactive family trees</p><h1>The family trees of history, at your fingertips</h1>
<p class="lede">Royal houses, ancient dynasties, presidents’ families and the gods of myth – ${pageIds.size.toLocaleString('en')} people, linked parent to child. Zoom, tap and follow any branch, on your phone or in print.</p>
<p><a class="btn primary" href="${u('/british-royal-family/')}">British royal family tree</a> <a class="btn" href="${u('/trees/')}">All ${trees.length} trees</a></p></div>${heroArt}</section>
<section class="finder-box"><h2>How are they related?</h2><p>Queen Victoria and Nicholas II? Zeus and Heracles? Pick two people and see the family path between them.</p>${finderForm()}<div id="result" aria-live="polite"></div></section>
<section class="finder-box"><h2>Make your own family tree</h2><p>Fill in your parents, grandparents and great-grandparents online, then print it or save it as a PDF. Free, no sign-up – nothing leaves your device.</p><p><a class="btn primary" href="${u('/make-your-own-family-tree/')}">Start your family tree</a> <a class="btn" href="${u('/family-tree-template/')}">Printable blank templates</a></p></section>
<h2>Popular family trees</h2><div class="grid">${feat.map(treeCard).join('')}</div>
${Object.entries(CAT).map(([c, h]) => { const ts = trees.filter((T) => T.t.cat === c && !feat.includes(T)); return ts.length ? `<h2>${h}</h2><div class="grid">${ts.map(treeCard).join('')}</div>` : ''; }).join('')}
<h2>Surprising relationships</h2><ul>${pairPages.slice(0, 12).map(pairLink).join('')}</ul>
</div>`;
  await write('/', layout({ title: 'FamilyTreeOf – Interactive Family Trees of Royals, Dynasties & Gods', desc: 'Interactive family trees of the British royal family, Tudors, Habsburgs, Romanovs, Roman emperors, pharaohs and Greek, Norse and Egyptian gods. Free, mobile-friendly, printable.', path: '/', body, scripts: finderScript, jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: BASE + '/' }] }));
  sitemap.push('/');
}

// ---------- Lag ditt eget tre + utskriftbare maler ----------
const pedLabel = (n) => {
  if (n === 1) return 'You';
  const k = Math.floor(Math.log2(n)), male = n % 2 === 0;
  if (k === 1) return male ? 'Father' : 'Mother';
  if (k === 2) return (n < 6 ? 'Paternal ' : 'Maternal ') + (male ? 'grandfather' : 'grandmother');
  return 'Great-' + 'great-'.repeat(k - 3) + (male ? 'grandfather' : 'grandmother');
};
function blankPedigree(G) {
  const R = 2 ** (G - 1);
  let h = '';
  for (let k = 0; k < G; k++) {
    const span = R / 2 ** k;
    for (let i = 0; i < 2 ** k; i++) {
      const n = 2 ** k + i;
      const side = k === 0 ? '' : n % 2 === 0 ? ' fa' : ' mo';
      const sex = k === 0 ? '' : n % 2 === 0 ? ' male' : ' female';
      const lines = G === 5 && k === 4 ? '<span class="ln"></span>' : `<span class="ln"></span><span class="ln"><small>b.</small></span>${k < 3 ? '<span class="ln"><small>d.</small></span>' : ''}`;
      h += `<div class="pn g${k}${side}" style="grid-column:${k + 1};grid-row:${i * span + 1} / span ${span}"><div class="box${sex}"><span class="lbl">${pedLabel(n)}</span>${lines}</div></div>`;
    }
  }
  return `<div class="ped-scroll"><div class="ped" style="--g:${G};--rows:${R};grid-template-columns:repeat(${G},minmax(0,1fr));grid-template-rows:repeat(${R},minmax(${G === 5 ? 46 : 62}px,auto))">${h}</div></div>`;
}
const TMPL = [
  { g: 3, slug: '3-generations', people: 7, who: 'you, your parents and your four grandparents', use: 'school projects and young children' },
  { g: 4, slug: '4-generations', people: 15, who: 'you, your parents, grandparents and eight great-grandparents', use: 'most families – it fits comfortably on one page' },
  { g: 5, slug: '5-generations', people: 31, who: 'you and four generations of ancestors, up to sixteen great-great-grandparents', use: 'genealogy research and family history projects' },
];
const makerPath = '/make-your-own-family-tree/';
const tmplPath = '/family-tree-template/';
{
  const path = makerPath;
  const faq = [
    ['Is this family tree maker free?', 'Yes. You can fill in, print and save your family tree as a PDF for free. There is no account and no sign-up.'],
    ['Where are the names stored?', 'Only in your own browser (local storage on this device). Nothing you type is sent to us or anyone else. If you clear your browser data or switch device, the tree is gone – so print it or save it as a PDF.'],
    ['How do I save my family tree as a PDF?', 'Click “Print or save as PDF” and choose “Save as PDF” (or “Microsoft Print to PDF”) as the printer. The chart is laid out for one landscape page.'],
    ['How many generations should I choose?', 'Three generations (7 people) suits school projects. Four generations (15 people) is the classic family tree. Five generations (31 people) goes back to your great-great-grandparents, usually to the 1800s.'],
    ['What should I write in the dates field?', 'A common style is “b. 1932, Leeds – d. 2011”. Write what you know – a year alone, or “c. 1890” for an estimate, is fine.'],
  ];
  const body = `<div class="wrap ped-page" id="maker">${crumbs([['Home', '/'], ['Make your own family tree', path]])}
<h1>Make your own family tree</h1>
<p class="lede">Fill in your family tree right here – you, your parents, grandparents and great-grandparents. Free, no sign-up, and nothing leaves your device. Print it or save it as a PDF when you are done.</p>
<div class="ped-acts"><span class="seg" role="group" aria-label="Generations"><button type="button" data-g="3" aria-pressed="false">3 generations</button><button type="button" data-g="4" aria-pressed="true">4</button><button type="button" data-g="5" aria-pressed="false">5</button></span>
<button type="button" class="btn primary" data-print>Print or save as PDF</button><button type="button" class="btn" data-clear>Clear</button><span class="saved" data-status aria-live="polite"></span></div>
<div class="ped-sheet"><input class="ped-title" data-title placeholder="The … Family Tree" aria-label="Title of your family tree" maxlength="80"><div class="ped-scroll"><div class="ped" data-chart></div></div>
<noscript><p>The family tree maker needs JavaScript. You can <a href="${u(tmplPath)}">print a blank family tree template</a> instead.</p></noscript></div>
<p class="muted">Tip: on a phone, swipe sideways to reach the older generations. Your entries are saved automatically in this browser.</p>
<h2>How to make a family tree</h2>
<ol><li><b>Start with yourself</b> in the box on the left, then add your father and mother.</li>
<li><b>Work backwards</b> one generation at a time. Fathers are always the upper box of each pair, mothers the lower – write mothers under their birth (maiden) names.</li>
<li><b>Ask relatives</b> while you can. Grandparents often remember names and places that are in no record.</li>
<li><b>Check documents:</b> birth, marriage and death certificates, census records, gravestones and family Bibles.</li>
<li><b>Print it</b> or save it as a PDF and share it with the family.</li></ol>
<h2>Prefer pen and paper?</h2>
<p>Print a <a href="${u(tmplPath)}">blank family tree template</a>: ${TMPL.map((t) => `<a href="${u(tmplPath + t.slug + '/')}">${t.g} generations</a>`).join(', ')}.</p>
<h2>Questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}
<h2>See famous family trees</h2><p>Need inspiration? Explore the <a href="${u('/british-royal-family/')}">British royal family tree</a>, the <a href="${u('/tudor/')}">Tudors</a> or the <a href="${u('/greek-gods/')}">Greek gods</a>.</p>
</div>`;
  const ld = [crumbLd([['Home', '/'], ['Make your own family tree', path]]),
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Family tree maker', url: BASE + path, applicationCategory: 'LifestyleApplication', operatingSystem: 'Any (web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
  await write(path, layout({ title: 'Make Your Own Family Tree – Free Family Tree Maker, Print or PDF', desc: 'Free family tree maker: fill in your parents, grandparents and great-grandparents online, then print it or save it as a PDF. No sign-up – your data stays on your device.', path, body, nav: 'maker', jsonld: ld, scripts: `<script src="${u('/js/maker.js')}?v=${VERSION}" defer></script>` }));
  sitemap.push(path);
}
{
  const path = tmplPath;
  const body = `<div class="wrap">${crumbs([['Home', '/'], ['Family tree templates', path]])}
<h1>Free printable family tree templates</h1>
<p class="lede">Blank family tree charts to print and fill in by hand – for school projects, family gatherings and genealogy research. Each fits on one landscape A4 or US Letter page. Free, no sign-up.</p>
<ul class="tmpl-list">${TMPL.map((t) => `<li><a href="${u(path + t.slug + '/')}"><b>${t.g}-generation family tree</b><small>${t.people} people · ${esc(t.who)}</small></a></li>`).join('')}</ul>
<h2>Fill it in online instead</h2>
<p>With our <a href="${u(makerPath)}">family tree maker</a> you type the names straight into the chart, and print it or save it as a PDF when you are done. Nothing is uploaded – it stays in your browser.</p>
<h2>Which template should I choose?</h2>
${TMPL.map((t) => `<p><b><a href="${u(path + t.slug + '/')}">${t.g} generations</a></b> covers ${esc(t.who)} (${t.people} boxes). Good for ${esc(t.use)}.</p>`).join('')}
<h2>How to read a family tree chart</h2>
<p>These templates are <i>ancestor charts</i> (also called pedigree charts). You start on the left, and each person’s father is in the upper box and mother in the lower box to the right. Genealogists write women under their birth (maiden) names, so each family line can be followed back.</p>
<p>Want to see a finished family tree? Look at the <a href="${u('/british-royal-family/')}">British royal family tree</a> or the <a href="${u('/greek-gods/')}">Greek gods family tree</a>.</p>
</div>`;
  await write(path, layout({ title: 'Free Printable Family Tree Templates (3, 4 and 5 Generations)', desc: 'Free printable family tree templates: blank 3, 4 and 5 generation charts for school projects and genealogy. Print on one page, or fill them in online and save as PDF.', path, body, nav: 'maker', jsonld: [crumbLd([['Home', '/'], ['Family tree templates', path]])] }));
  sitemap.push(path);
  for (const t of TMPL) {
    const p2 = path + t.slug + '/';
    const cr = [['Home', '/'], ['Family tree templates', path], [`${t.g} generations`, p2]];
    const others = TMPL.filter((x) => x !== t).map((x) => `<a href="${u(path + x.slug + '/')}">${x.g} generations</a>`).join(' · ');
    const b2 = `<div class="wrap ped-page">${crumbs(cr)}
<h1>${t.g}-generation family tree template</h1>
<p class="lede">A blank ${t.g}-generation family tree with ${t.people} boxes: ${esc(t.who)}. Print it on one landscape page and fill it in by hand.</p>
<p class="ped-acts"><button type="button" class="btn primary" onclick="window.print()">Print this template</button> <a class="btn" href="${u(makerPath + '?generations=' + t.g)}">Fill it in online</a></p>
<div class="ped-sheet"><p class="ped-title">The ______________ Family Tree</p>${blankPedigree(t.g)}</div>
<p class="muted">Printing tip: choose landscape and “fit to page”. To save it as a PDF, pick “Save as PDF” as the printer. On a phone, swipe sideways to see the whole chart.</p>
<h2>How to fill in the template</h2>
<p>Write your own name in the box on the left. Your father goes in the upper box to the right and your mother in the lower box, and so on for each generation. Write “b.” for born and “d.” for died, with the year and place if you know them. Women are usually written under their birth (maiden) names.</p>
<p>Other sizes: ${others}. Or use the <a href="${u(makerPath)}">online family tree maker</a>.</p>
</div>`;
    await write(p2, layout({ title: `${t.g} Generation Family Tree Template – Free Printable`, desc: `Free printable ${t.g}-generation family tree template with ${t.people} boxes: ${t.who}. Blank, one page, ready to print – or fill it in online.`, path: p2, body: b2, nav: 'maker', jsonld: [crumbLd(cr)] }));
    sitemap.push(p2);
  }
}

// ---------- Om, personvern, 404 ----------
{
  const body = `<div class="wrap narrow">${crumbs([['Home', '/'], ['About', '/about/']])}<h1>About FamilyTreeOf</h1>
<p class="lede">FamilyTreeOf turns open data into family trees you can actually read – on a phone, on a big screen or on paper.</p>
<h2>Where the data comes from</h2>
<p>Every parent, child and marriage link comes from <a href="https://www.wikidata.org/">Wikidata</a>, the free knowledge base that supports Wikipedia. Wikidata’s structured data is published under <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>. We fetch it with a small number of cached queries and build static pages from it. Short descriptions under names are Wikidata descriptions.</p>
<p>The introductions to each family tree are written by us and checked against the Wikipedia articles listed under “Sources” on each page.</p>
<h2>Portraits</h2>
<p>Portraits come from <a href="https://commons.wikimedia.org/">Wikimedia Commons</a>. We only use images that are in the public domain or under a free licence that allows reuse (such as CC BY or CC BY-SA). The author and licence are shown under the portrait on each person’s page, with a link to the original file. If no suitable image exists, we show the person’s initial instead.</p>
<h2>Living people</h2>
<p>We only include living people who are public figures in their own right – such as reigning monarchs, heirs and holders of public office – and only facts found in public encyclopaedias: name, birth year, titles and family links. We never show addresses or private details. Children of public figures have no indexed profile pages. Private living relatives are left out entirely.</p>
<h2 id="uncertain">Uncertain and disputed links</h2>
<p>History and myth are full of uncertainty. When Wikidata marks a family link as uncertain (for example “presumably” or “disputed”), the tree shows it with a dashed line and the person page says so. When sources name different parents – common in mythology – the person page lists the alternatives.</p>
<h2 id="corrections">Corrections</h2>
<p>Because the data comes from Wikidata, the best way to fix an error is to correct it there: open the Wikidata link at the bottom of the person’s page, edit the statement and add a source. Our pages are rebuilt from Wikidata regularly, so the fix will appear here too – and in every other site that uses Wikidata.</p>
<h2>Who we are</h2>
<p>FamilyTreeOf is a small independent project. It is free to use and has no accounts and no tracking cookies.</p>
</div>`;
  await write('/about/', layout({ title: 'About FamilyTreeOf – Sources, Data and Credits', desc: 'Where our family tree data comes from (Wikidata, CC0), how portraits from Wikimedia Commons are credited, and how we handle living people and uncertain links.', path: '/about/', body, nav: 'about' }));
  sitemap.push('/about/');
  const priv = `<div class="wrap narrow">${crumbs([['Home', '/'], ['Privacy', '/privacy/']])}<h1>Privacy</h1>
<p>FamilyTreeOf has no user accounts, no forms and no advertising. We do not use cookies.</p>
<p>${GOAT ? 'We count page views with <a href="https://www.goatcounter.com/">GoatCounter</a>, a privacy-friendly analytics service. It does not use cookies, does not store IP addresses and does not track you across websites.' : 'We do not run any analytics at the moment. If we add privacy-friendly page view counting (without cookies) in the future, this page will say so.'}</p>
<p>All family trees and the relationship finder run in your browser. The names you search for are not sent anywhere.</p>
<p>The family tree maker stores what you type only in your own browser (local storage on your device). It is never sent to us. You can delete it with the “Clear” button or by clearing your browser data.</p>
<p>The site is hosted on GitHub Pages, which may log technical information such as IP addresses for security purposes. See <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub’s privacy statement</a>.</p>
<p>The people in our family trees are historical figures, mythological figures or living public figures. Read <a href="${u('/about/')}">how we handle living people</a>.</p>
</div>`;
  await write('/privacy/', layout({ title: 'Privacy – FamilyTreeOf', desc: 'FamilyTreeOf uses no cookies, no accounts and no tracking.', path: '/privacy/', body: priv }));
  sitemap.push('/privacy/');
  await write('/404.html', layout({ title: 'Page not found – FamilyTreeOf', desc: 'Page not found.', path: '/404.html', noindex: true, body: `<div class="wrap narrow"><h1>This branch doesn’t exist</h1><p>The page you were looking for isn’t here.</p><p><a class="btn primary" href="${u('/trees/')}">See all family trees</a></p></div>` }));
}

// ---------- sitemap, robots, IndexNow ----------
const today = new Date().toISOString().slice(0, 10);
await write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((p) => `<url><loc>${BASE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
await write('/robots.txt', NOINDEX ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
await write('/indexnow.json', JSON.stringify(sitemap.map((p) => BASE + p)));
await writeFile('data/slugs.json', JSON.stringify(SLUGS, null, 0));
await writeFile('data/excluded-living.txt', excludedLiving.sort().join('\n') + '\n');
console.log(`Bygget: ${trees.length} trær, ${nPages} personsider (${nIndexed} indekserbare), ${pairPages.length} par-sider, graf ${G.n.length} personer. ${excludedLiving.length} levende personer utelatt. Base ${BASE}${NOINDEX ? ' (NOINDEX)' : ''}`);
