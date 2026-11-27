// «How are they related?» – søk opp to personer og vis slektskapet.
import { prepare, explain } from './kin.js';

const BP = document.documentElement.dataset.bp || '';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const form = document.querySelector('[data-finder]');
const out = document.getElementById('result');
let K = null, loading = null, IDX = [];
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ys = (y) => (y === null || y === undefined ? '' : y <= 0 ? `${1 - y} BC` : String(y));
const years = (r) => (r[6] ? (r[3] !== null ? `b. ${ys(r[3])}` : '') : r[3] !== null && r[4] !== null ? `${ys(r[3])}–${ys(r[4])}` : r[3] !== null ? `b. ${ys(r[3])}` : r[4] !== null ? `d. ${ys(r[4])}` : '');

function load() {
  if (!loading) loading = fetch(BP + '/data/graph.json').then((r) => r.json()).then((G) => {
    K = prepare(G);
    IDX = G.n.map((r, i) => [i, norm(r[1]), r[5] ? 1 : 0]);
  });
  return loading;
}

function setupAc(box) {
  const inp = box.querySelector('input:not([type=hidden])');
  const hid = box.querySelector('input[type=hidden]');
  const ul = box.querySelector('ul');
  let hits = [], sel = 0;
  inp.addEventListener('focus', load);
  inp.addEventListener('input', async () => {
    hid.value = '';
    await load();
    const q = norm(inp.value.trim());
    if (q.length < 2) { ul.hidden = true; return; }
    const words = q.split(/\s+/);
    hits = IDX.filter(([, n]) => words.every((w) => n.includes(w)))
      .sort((a, b) => (b[1].startsWith(q) - a[1].startsWith(q)) || (b[2] - a[2]) || a[1].length - b[1].length)
      .slice(0, 10).map(([i]) => i);
    sel = 0;
    ul.innerHTML = hits.map((i, k) => { const r = K.G.n[i]; return `<li><button type="button" data-i="${i}" class="${k ? '' : 'on'}">${esc(r[1])} <span class="muted small">${esc(years(r))}</span></button></li>`; }).join('') || '<li class="muted small" style="padding:6px 9px">No match in our trees yet</li>';
    ul.hidden = false;
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (!ul.hidden && hits[sel] !== undefined) pick(hits[sel]); }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && hits.length) { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length; ul.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === sel)); }
    if (e.key === 'Escape') ul.hidden = true;
  });
  ul.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pick(Number(b.dataset.i)); });
  inp.addEventListener('blur', () => setTimeout(() => (ul.hidden = true), 200));
  function pick(i) {
    const r = K.G.n[i];
    inp.value = r[1]; hid.value = r[0]; ul.hidden = true;
    run();
  }
  return { inp, hid };
}

const card = (r) => {
  const inner = `<span class="ph" aria-hidden="true">${esc(r[1][0])}</span><span>${esc(r[1])}<small>${esc(years(r))}</small></span>`;
  return r[5] ? `<a class="pc ${r[2]}" href="${BP}${r[5]}">${inner}</a>` : `<span class="pc ${r[2]}">${inner}</span>`;
};

let A, B;
async function run(push = true) {
  if (!A.hid.value || !B.hid.value) return;
  await load();
  const res = explain(K, A.hid.value, B.hid.value);
  if (!res.ok) { out.innerHTML = `<div class="answer"><p>${esc(res.msg)}</p></div>`; return; }
  const mainIdx = res.main;
  out.innerHTML = `<div class="answer"><p class="big">${esc(res.lines[mainIdx])}</p>${res.lines.filter((_, i) => i !== mainIdx).map((l) => `<p>${esc(l)}</p>`).join('')}
    <ol class="path">${res.path.map((s) => `<li>${s.rel ? `<span class="step">${esc(s.rel)}</span>` : ''}${card(K.G.n[s.i])}</li>`).join('')}</ol>
    <p class="small muted">Share: <a href="${BP}/how-are-they-related/?a=${A.hid.value}&b=${B.hid.value}">link to this answer</a></p></div>`;
  if (push && location.pathname.endsWith('/how-are-they-related/')) history.replaceState(null, '', `?a=${A.hid.value}&b=${B.hid.value}`);
  if (window.goatcounter?.count) window.goatcounter.count({ path: 'event-relation', title: 'relation', event: true });
}

if (form) {
  const boxes = form.querySelectorAll('.ac');
  A = setupAc(boxes[0]); B = setupAc(boxes[1]);
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  const q = new URLSearchParams(location.search);
  const qa = q.get('a'), qb = q.get('b');
  if (qa || qb) {
    load().then(() => {
      const byId = (id) => K.idx.get(id);
      if (qa && byId(qa) !== undefined) { A.hid.value = qa; A.inp.value = K.G.n[byId(qa)][1]; }
      if (qb && byId(qb) !== undefined) { B.hid.value = qb; B.inp.value = K.G.n[byId(qb)][1]; }
      if (A.hid.value && B.hid.value) run(false); else if (A.hid.value) B.inp.focus();
    });
  }
}
