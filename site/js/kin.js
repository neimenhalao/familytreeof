// Slektskapsberegning. Delt mellom nettleseren (søkeren) og bygget (ferdige «How are X and Y related?»-sider).
// Graf: { n: [[qid, navn, kjønn, fødselsår|null, dødsår|null, url|'', levende 0/1]], par: [barnIdx, forelderIdx, ...], sp: [a, b, ...] }

export function prepare(G) {
  const N = G.n.length;
  const idx = new Map(G.n.map((r, i) => [r[0], i]));
  const parents = Array.from({ length: N }, () => []);
  const children = Array.from({ length: N }, () => []);
  const spouses = Array.from({ length: N }, () => []);
  for (let i = 0; i < G.par.length; i += 2) { const c = G.par[i], p = G.par[i + 1]; parents[c].push(p); children[p].push(c); }
  for (let i = 0; i < G.sp.length; i += 2) { const a = G.sp[i], b = G.sp[i + 1]; spouses[a].push(b); spouses[b].push(a); }
  const unc = new Set();
  for (let i = 0; i < (G.u || []).length; i += 2) unc.add(G.u[i] + ',' + G.u[i + 1]);
  return { G, N, idx, parents, children, spouses, unc };
}

const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const ordinal = (n) => ORD[n] || `${n}th`;
const ordNum = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const greats = (g, word) => (g <= 0 ? word : g <= 3 ? 'great-'.repeat(g) + word : `${ordNum(g)} great-${word}`);
const w = (sex, m, f, x) => (sex === 'm' ? m : sex === 'f' ? f : x);

// X er a generasjoner under felles stamfar, Y er b generasjoner under. Returnerer hva X er for Y.
export function term(a, b, sex, half) {
  const h = half ? 'half-' : '';
  if (a === 0 && b === 0) return 'same person';
  if (a === 0) return b === 1 ? w(sex, 'father', 'mother', 'parent') : greats(b - 2, w(sex, 'grandfather', 'grandmother', 'grandparent'));
  if (b === 0) return a === 1 ? w(sex, 'son', 'daughter', 'child') : greats(a - 2, w(sex, 'grandson', 'granddaughter', 'grandchild'));
  if (a === 1 && b === 1) return h + w(sex, 'brother', 'sister', 'sibling');
  if (a === 1) return greats(b - 2, w(sex, 'uncle', 'aunt', 'aunt or uncle'));
  if (b === 1) return greats(a - 2, w(sex, 'nephew', 'niece', 'niece or nephew'));
  const deg = Math.min(a, b) - 1, rem = Math.abs(a - b);
  return `${ordinal(deg)} cousin${rem ? ' ' + times(rem) + ' removed' : ''}`;
}

function ancestors(K, s, max = 40) {
  const dist = new Map([[s, 0]]), prev = new Map();
  let q = [s];
  for (let d = 1; d <= max && q.length; d++) {
    const nq = [];
    for (const x of q) for (const p of K.parents[x]) if (!dist.has(p)) { dist.set(p, d); prev.set(p, x); nq.push(p); }
    q = nq;
  }
  return { dist, prev };
}

// Blodsslektskap via nærmeste felles stamfar
export function blood(K, a, b) {
  if (a === b) return null;
  const A = ancestors(K, a), B = ancestors(K, b);
  let best = null;
  for (const [x, da] of A.dist) {
    const db = B.dist.get(x);
    if (db === undefined) continue;
    const s = da + db;
    if (!best || s < best.s || (s === best.s && Math.max(da, db) < Math.max(best.da, best.db))) best = { ca: x, da, db, s };
  }
  if (!best) return null;
  // prev: stamfar -> barnet stien kom fra, så vi går nedover fra felles stamfar
  const up = [best.ca]; let c = best.ca; while (c !== a) { c = A.prev.get(c); up.push(c); }
  const down = []; c = best.ca; while (c !== b) { c = B.prev.get(c); down.push(c); }
  const path = [...up.reverse(), ...down];
  // felles stamfar-par (begge foreldre) → helsøsken / ikke halv
  let half = false;
  if (best.da === 1 && best.db === 1) {
    const pa = K.parents[a], pb = K.parents[b];
    half = !(pa.length >= 2 && pa.every((p) => pb.includes(p)));
  }
  return { ...best, path, half };
}

// Korteste sti med ekteskap (blod foretrekkes: ekteskap koster litt mer)
export function anyPath(K, a, b, maxCost = 24) {
  const dist = new Map([[a, 0]]), prev = new Map();
  const heap = [[0, a]];
  const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let pops = 0;
  while (heap.length) {
    const [d, x] = pop();
    if (++pops > 60000) break;
    if (x === b) break;
    if (d > (dist.get(x) ?? Infinity) || d > maxCost) continue;
    const edges = [];
    for (const p of K.parents[x]) edges.push([p, 'up', 1]);
    for (const c of K.children[x]) edges.push([c, 'down', 1]);
    for (const s of K.spouses[x]) edges.push([s, 'sp', 1.6]);
    for (const [y, t, c] of edges) {
      const nd = d + c;
      if (nd < (dist.get(y) ?? Infinity)) { dist.set(y, nd); prev.set(y, [x, t]); push([nd, y]); }
    }
  }
  if (!prev.has(b)) return null;
  const steps = []; let c = b;
  while (c !== a) { const [p, t] = prev.get(c); steps.push([p, t, c]); c = p; }
  return steps.reverse(); // [fra, type, til]
}

function segments(steps) {
  const segs = [];
  let cur = null;
  for (const [from, t, to] of steps) {
    if (t === 'sp') { if (cur) segs.push(cur); segs.push({ from, to, sp: true }); cur = null; continue; }
    if (!cur || (t === 'up' && cur.b > 0)) { if (cur) segs.push(cur); cur = { from, to, a: 0, b: 0 }; }
    if (t === 'up') cur.a++; else cur.b++;
    cur.to = to;
  }
  if (cur) segs.push(cur);
  return segs;
}

export function explain(K, qa, qb) {
  const a = K.idx.get(qa), b = K.idx.get(qb);
  if (a === undefined || b === undefined) return { ok: false, msg: 'Unknown person.' };
  if (a === b) return { ok: false, msg: 'That is the same person.' };
  const P = (i) => K.G.n[i];
  const name = (i) => P(i)[1];
  const sex = (i) => P(i)[2];
  const verb = (i) => (P(i)[6] ? 'is' : 'was');
  const lines = [];
  let path = null;
  if (K.spouses[a].includes(b)) lines.push(`${name(a)} ${verb(a)} the ${w(sex(a), 'husband', 'wife', 'spouse')} of ${name(b)}.`);
  const bl = blood(K, a, b);
  if (bl) {
    const t = term(bl.da, bl.db, sex(a), bl.half);
    let ca = '';
    if (bl.ca !== a && bl.ca !== b && !(bl.da === 1 && bl.db === 1)) {
      const A2 = ancestors(K, a), B2 = ancestors(K, b);
      const mate = K.spouses[bl.ca].find((s) => A2.dist.get(s) === bl.da && B2.dist.get(s) === bl.db);
      ca = mate !== undefined ? ` Their nearest common ancestors are ${name(bl.ca)} and ${name(mate)}.` : ` Their nearest common ancestor is ${name(bl.ca)}.`;
    }
    lines.push(`${name(a)} ${verb(a)} the ${t} of ${name(b)}.${ca}`);
    path = bl.path.map((i, k) => {
      if (k === 0) return { i };
      const prevI = bl.path[k - 1];
      const isUp = K.parents[prevI].includes(i);
      return { i, rel: isUp ? w(sex(i), 'father', 'mother', 'parent') : w(sex(i), 'son', 'daughter', 'child') };
    });
  } else if (lines.length) {
    path = [{ i: a }, { i: b, rel: w(sex(b), 'husband', 'wife', 'spouse') }];
    return { ok: true, lines, main: 0, path, blood: false, steps: 1 };
  } else {
    const steps = anyPath(K, a, b);
    if (!steps) return { ok: false, msg: `We could not find a family connection between ${name(a)} and ${name(b)} in our data.` };
    const segs = segments(steps);
    const segTerm = (s) => (s.sp ? w(sex(s.from), 'husband', 'wife', 'spouse') : term(s.a, s.b, sex(s.from), false));
    let summary = null;
    if (segs.length === 2) {
      const [s1, s2] = segs;
      if (s1.sp && !s2.sp) {
        const rel = s2.a === 1 && s2.b === 0 ? w(sex(a), 'son-in-law', 'daughter-in-law', 'child-in-law') : s2.a === 1 && s2.b === 1 ? w(sex(a), 'brother-in-law', 'sister-in-law', 'sibling-in-law') : null;
        summary = rel ? `${name(a)} ${verb(a)} the ${rel} of ${name(b)}.` : `${name(a)} ${verb(a)} the ${segTerm(s1)} of ${name(s1.to)}, ${name(b)}’s ${term(s2.a, s2.b, sex(s1.to), false)}.`;
      } else if (!s1.sp && s2.sp) {
        const rel = s1.a === 0 && s1.b === 1 ? w(sex(a), 'father-in-law', 'mother-in-law', 'parent-in-law') : s1.a === 1 && s1.b === 1 ? w(sex(a), 'brother-in-law', 'sister-in-law', 'sibling-in-law') : s1.a === 1 && s1.b === 0 ? w(sex(a), 'stepson', 'stepdaughter', 'stepchild') : null;
        summary = rel ? `${name(a)} ${verb(a)} the ${rel} of ${name(b)}.` : `${name(a)} ${verb(a)} the ${segTerm(s1)} of ${name(s1.to)}, the ${w(sex(s1.to), 'husband', 'wife', 'spouse')} of ${name(b)}.`;
      }
    }
    if (!summary) {
      summary = `${name(a)} ${verb(a)} the ${segTerm(segs[0])} of ${name(segs[0].to)}` + segs.slice(1).map((s) => `, who ${verb(s.from)} the ${segTerm(s)} of ${name(s.to)}`).join('') + '.';
    }
    const nm = segs.filter((s) => s.sp).length;
    if (segs.length > 3) {
      lines.push(`${name(a)} and ${name(b)} ${verb(a) === 'is' && verb(b) === 'is' ? 'are' : 'were'} not related by blood, but they are linked through ${nm} marriage${nm === 1 ? '' : 's'}.`);
      lines.push(summary);
    } else {
      lines.push(summary);
      lines.push('They are related by marriage, not by blood (as far as our data shows).');
    }
    path = [{ i: a }, ...steps.map(([, t, to]) => ({ i: to, rel: t === 'sp' ? w(sex(to), 'husband', 'wife', 'spouse') : t === 'up' ? w(sex(to), 'father', 'mother', 'parent') : w(sex(to), 'son', 'daughter', 'child') }))];
  }
  const shaky = path.some((s, j) => j > 0 && (K.unc.has(path[j - 1].i + ',' + s.i) || K.unc.has(s.i + ',' + path[j - 1].i)));
  const main = bl ? lines.length - 1 : 0;
  if (shaky) lines.push('Note: at least one link in this chain is marked as uncertain or disputed in the sources.');
  return { ok: true, lines, main, path, blood: !!bl, steps: path.length - 1, shaky };
}
