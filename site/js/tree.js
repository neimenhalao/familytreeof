// Interaktivt slektstre: sammenleggbart, zoom/panorering med mus, hjul og fingre.
(function () {
  const chart = document.querySelector('.chart[data-src]');
  if (!chart) return;
  const BP = document.documentElement.dataset.bp || '';
  const W = 172, PW = 150, G = 18, H = 56, HG = 16, GENH = H + 84, PAD = 40;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  chart.innerHTML = `
    <div class="tsearch"><input type="search" placeholder="Find a person in this tree" aria-label="Find a person in this tree" autocomplete="off"><ul hidden></ul></div>
    <div class="tools">
      <button type="button" data-a="in" title="Zoom in" aria-label="Zoom in">+</button>
      <button type="button" data-a="out" title="Zoom out" aria-label="Zoom out">&minus;</button>
      <button type="button" data-a="fit" title="Fit whole tree" aria-label="Fit whole tree"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
      <button type="button" data-a="all" title="Expand all" aria-label="Expand all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v6m0 0-3-3m3 3 3-3M12 21v-6m0 0-3 3m3-3 3 3M4 12h16"/></svg></button>
      <button type="button" data-a="none" title="Collapse to start view" aria-label="Collapse to start view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9V3m0 6-3-3m3 3 3-3M12 15v6m0-6-3 3m3-3 3 3M4 12h16"/></svg></button>
      <button type="button" data-a="full" title="Full screen" aria-label="Full screen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg></button>
    </div>
    <div class="canvas"><svg class="lines"></svg><div class="cards"></div></div>
    <div class="hint">Drag to move · pinch or scroll to zoom · tap a person</div>
    <div class="sheet" hidden></div>`;
  const canvas = chart.querySelector('.canvas');
  const svg = chart.querySelector('svg.lines');
  const cards = chart.querySelector('.cards');
  const sheet = chart.querySelector('.sheet');
  let D, open = new Set(), view = { x: 0, y: 0, k: 1 }, boxes = new Map(), layoutRoots = [];

  fetch(chart.dataset.src).then((r) => r.json()).then((d) => { D = d; init(); }).catch(() => { cards.innerHTML = '<p class="noscript-msg">Could not load the tree. The text version below has the same people.</p>'; });

  function init() {
    D.ppl = D.p; // id -> {n,y,s,u,i,d}
    resetOpen();
    render();
    const f = (D.focus || []).find((id) => boxes.has(id));
    if (f) centerOn(f, mobile() ? .6 : .9, true); else startView();
    setupSearch();
  }
  const mobile = () => chart.clientWidth < 640;
  function resetOpen() {
    open = new Set();
    const total = Object.keys(D.dep).length;
    for (const [id, dep] of Object.entries(D.dep)) if (D.k[id] && (total <= 40 || dep < (D.open ?? 1))) open.add(id);
    for (const f of D.focus || []) { revealPath(f); if (D.k[f]) { open.add(f); for (const c of D.k[f]) if (D.k[c]) open.add(c); } }
  }
  function revealPath(id) {
    let cur = D.h[id], guard = 0;
    while (cur && guard++ < 80) { open.add(cur); cur = D.h[cur]; }
  }

  // --- bygg synlig struktur ---
  function partnersOf(id) {
    const list = [];
    const groups = new Map();
    for (const kid of D.k[id] || []) {
      const ps = D.cp[kid] || [];
      const other = ps.find((p) => p !== id) || null;
      if (!groups.has(other)) groups.set(other, []);
      groups.get(other).push(kid);
    }
    for (const o of groups.keys()) if (o && D.ppl[o] && !list.includes(o)) list.push(o);
    for (const [pid] of D.pa[id] || []) if (D.ppl[pid] && !list.includes(pid)) list.push(pid);
    return { list, groups };
  }
  function makeNode(id, from, seen) {
    if (seen.has(id) || (from && D.h[id] && D.h[id] !== from)) return { id, ref: true };
    seen.add(id);
    const { list, groups } = partnersOf(id);
    const n = { id, partners: list, groups: [], open: open.has(id), hasKids: !!(D.k[id] && D.k[id].length) };
    if (n.open) {
      const order = [...groups.keys()].sort((a, b) => (a === null) - (b === null) || list.indexOf(a) - list.indexOf(b));
      for (const o of order) n.groups.push({ other: o, kids: groups.get(o).map((k) => makeNode(k, id, seen)) });
    }
    return n;
  }
  const blockW = (n) => (n.ref ? PW : W + n.partners.length * (G + PW));
  function measure(n) {
    n.bw = blockW(n);
    const kids = n.groups ? n.groups.flatMap((g) => g.kids) : [];
    n.cw = 0;
    kids.forEach((k, i) => { measure(k); n.cw += k.w + (i ? HG : 0); });
    n.w = Math.max(n.bw, n.cw);
  }
  function place(n, x, y, out) {
    const kids = n.groups ? n.groups.flatMap((g) => g.kids) : [];
    let bx;
    if (kids.length) {
      let cx = x + (n.w - n.cw) / 2;
      for (const k of kids) { place(k, cx, y + GENH, out); cx += k.w + HG; }
      const first = kids[0], last = kids[kids.length - 1];
      const mid = (first.bx + W / 2 + last.bx + W / 2) / 2;
      bx = Math.min(Math.max(mid - W / 2 - (n.partners.length ? (G + PW) / 2 : 0), x), x + n.w - n.bw);
    } else bx = x + (n.w - n.bw) / 2;
    n.bx = bx; n.y = y;
    out.push(n);
  }

  function render() {
    const seen = new Set();
    layoutRoots = D.roots.filter((r) => D.ppl[r]).map((r) => makeNode(r, null, seen));
    let x = PAD;
    const all = [];
    for (const r of layoutRoots) { measure(r); place(r, x, PAD, all); x += r.w + HG * 3; }
    let maxY = 0;
    const html = [], paths = [];
    boxes = new Map();
    for (const n of all) {
      maxY = Math.max(maxY, n.y + H);
      if (n.ref) { html.push(card(n.id, n.bx, n.y, 'ref', PW)); if (!boxes.has(n.id)) boxes.set(n.id + ':ref', [n.bx, n.y, PW]); continue; }
      boxes.set(n.id, [n.bx, n.y, W]);
      html.push(card(n.id, n.bx, n.y, '', W));
      n.partners.forEach((p, j) => {
        const px = n.bx + W + G + j * (PW + G);
        html.push(card(p, px, n.y, 'partner', PW));
        if (!boxes.has(p)) boxes.set(p, [px, n.y, PW]);
        const married = (D.pa[n.id] || []).some(([q, m]) => q === p && m);
        paths.push(`<path class="mar"${married ? '' : ' stroke-dasharray="2 4"'} d="M${px - G} ${n.y + H / 2}h${G}"/>`);
      });
      if (n.hasKids) {
        const tx = n.bx + W / 2, ty = n.y + H + 16;
        html.push(`<button type="button" class="tog" data-t="${n.id}" style="left:${tx}px;top:${ty - 12}px" aria-expanded="${n.open}" title="${n.open ? 'Hide' : 'Show'} children (${D.k[n.id].length})">${n.open ? '&minus;' : '+'}</button>`);
      }
      n.groups.forEach((g, gi) => {
        const j = g.other ? n.partners.indexOf(g.other) : -1;
        const ux = j >= 0 ? n.bx + W + j * (PW + G) + G / 2 : n.bx + W / 2;
        const uy = j >= 0 ? n.y + H / 2 : n.y + H;
        const busY = n.y + H + 44 + Math.min(gi, 5) * 6;
        const xs = g.kids.map((k) => k.bx + (k.ref ? PW : W) / 2);
        const lo = Math.min(ux, ...xs), hi = Math.max(ux, ...xs);
        let d = `M${ux} ${uy}V${busY}M${lo} ${busY}H${hi}`;
        const unc = [];
        for (let i = 0; i < g.kids.length; i++) {
          const seg = `M${xs[i]} ${busY}V${n.y + GENH}`;
          if (D.un && (D.un.includes(n.id + '>' + g.kids[i].id))) unc.push(seg); else d += seg;
        }
        paths.push(`<path d="${d}"/>`);
        if (unc.length) paths.push(`<path class="unc" d="${unc.join('')}"/>`);
      });
    }
    const width = x + PAD, height = maxY + PAD + 20;
    cards.innerHTML = html.join('');
    svg.setAttribute('width', width); svg.setAttribute('height', height);
    svg.innerHTML = paths.join('');
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    D.size = [width, height];
  }
  function card(id, x, y, cls, w) {
    const p = D.ppl[id] || { n: id };
    const img = p.i ? `<img src="${BP}${p.i}" alt="" loading="lazy" width="40" height="40">` : `<span class="ph" aria-hidden="true">${esc((p.n || '?').replace(/^(Saint|St\.|Prince|Princess|King|Queen|Emperor|Empress|Lady|Lord|Sir)\s+/, '')[0] || '?')}</span>`;
    return `<button type="button" class="node ${p.s || ''} ${cls}" data-id="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${H}px">${img}<span class="t"><span class="n">${esc(p.n)}</span><span class="y">${esc(cls === 'ref' ? '↑ shown elsewhere' : p.y || '')}</span></span></button>`;
  }

  // --- visning ---
  function apply() { canvas.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`; }
  function startView() {
    const [w, h] = D.size;
    const vw = chart.clientWidth, vh = chart.clientHeight;
    const fit = Math.min(vw / w, vh / h);
    if (fit >= .55) { view.k = Math.min(fit, 1); view.x = (vw - w * view.k) / 2; view.y = Math.max(10, (vh - h * view.k) / 2); }
    else {
      const r = boxes.get(D.roots[0]);
      const kids = (D.k[D.roots[0]] || []).map((c) => boxes.get(c)).filter(Boolean);
      view.k = mobile() ? .6 : .9;
      let cx = r ? r[0] + r[2] / 2 : w / 2;
      if (kids.length) { const lo = Math.min(...kids.map((b) => b[0])), hi = Math.max(...kids.map((b) => b[0] + b[2])); view.k = Math.max(mobile() ? .45 : .55, Math.min(view.k, vw / (hi - lo + 60))); cx = (lo + hi) / 2; }
      view.x = vw / 2 - cx * view.k;
      view.y = 54;
    }
    apply();
  }
  function fitAll() {
    const [w, h] = D.size;
    const vw = chart.clientWidth, vh = chart.clientHeight;
    view.k = Math.max(.08, Math.min(vw / w, vh / h, 1.2));
    view.x = (vw - w * view.k) / 2; view.y = (vh - h * view.k) / 2;
    apply();
  }
  function centerOn(id, k, hit) {
    const b = boxes.get(id);
    if (!b) return;
    if (k) view.k = k;
    view.x = chart.clientWidth / 2 - (b[0] + b[2] / 2) * view.k;
    view.y = chart.clientHeight * .38 - (b[1] + H / 2) * view.k;
    apply();
    if (hit) {
      cards.querySelectorAll('.hit').forEach((e) => e.classList.remove('hit'));
      const el = cards.querySelector(`.node[data-id="${id}"]:not(.ref)`);
      if (el) el.classList.add('hit');
    }
  }
  function zoomAt(f, cx, cy) {
    const k = Math.min(2.5, Math.max(.08, view.k * f));
    view.x = cx - (cx - view.x) * (k / view.k);
    view.y = cy - (cy - view.y) * (k / view.k);
    view.k = k;
    apply();
  }
  function toggle(id) {
    const b = boxes.get(id);
    const sx = b ? view.x + b[0] * view.k : 0, sy = b ? view.y + b[1] * view.k : 0;
    if (open.has(id)) open.delete(id); else open.add(id);
    render();
    const nb = boxes.get(id);
    if (b && nb) { view.x = sx - nb[0] * view.k; view.y = sy - nb[1] * view.k; apply(); }
  }

  // --- pekere: panorering, knip, klikk ---
  const pts = new Map();
  let moved = false, pinch0 = null, last = null;
  chart.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tools,.tsearch,.sheet')) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    moved = false;
    last = [e.clientX, e.clientY];
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: view.k }; }
  });
  window.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch0) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const r = chart.getBoundingClientRect();
      zoomAt((pinch0.k * d / pinch0.d) / view.k, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      moved = true;
      return;
    }
    const dx = e.clientX - last[0], dy = e.clientY - last[1];
    if (!moved && Math.hypot(dx, dy) < 6) return;
    moved = true;
    view.x += dx; view.y += dy; last = [e.clientX, e.clientY];
    apply();
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null; if (pts.size === 1) last = [...pts.values()][0]; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  chart.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = chart.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? .05 : .0016)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  chart.addEventListener('click', (e) => {
    if (moved) { moved = false; return; }
    const t = e.target.closest('.tog');
    if (t) { toggle(t.dataset.t); return; }
    const n = e.target.closest('.node');
    if (n) {
      if (n.classList.contains('ref')) {
        const id = n.dataset.id;
        if (!boxes.has(id)) { revealPath(id); render(); }
        centerOn(id, null, true); showSheet(id); return;
      }
      showSheet(n.dataset.id);
      return;
    }
    const a = e.target.closest('.tools button');
    if (a) tool(a.dataset.a);
  });
  function tool(a) {
    const r = { x: chart.clientWidth / 2, y: chart.clientHeight / 2 };
    if (a === 'in') zoomAt(1.3, r.x, r.y);
    if (a === 'out') zoomAt(1 / 1.3, r.x, r.y);
    if (a === 'fit') fitAll();
    if (a === 'all') { open = new Set(Object.keys(D.k)); render(); fitAll(); }
    if (a === 'none') { resetOpen(); render(); startView(); }
    if (a === 'full') { chart.classList.toggle('full'); document.body.style.overflow = chart.classList.contains('full') ? 'hidden' : ''; startView(); }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!sheet.hidden) sheet.hidden = true; else if (chart.classList.contains('full')) tool('full'); } });

  function showSheet(id) {
    const p = D.ppl[id];
    if (!p) return;
    const hasKids = D.k[id] && D.k[id].length && boxes.has(id);
    sheet.innerHTML = `<button type="button" class="x" aria-label="Close">&times;</button>
      <div class="who">${p.i ? `<img src="${BP}${p.i}" alt="">` : ''}<div><h3>${esc(p.n)}</h3><div class="muted small">${esc(p.y || '')}</div></div></div>
      ${p.d ? `<p>${esc(p.d)}</p>` : ''}
      <div class="acts">${p.u ? `<a class="btn primary" href="${BP}${p.u}">Family &amp; profile</a>` : ''}
      ${hasKids ? `<button type="button" class="btn" data-tg="${id}">${open.has(id) ? 'Hide' : 'Show'} children</button>` : ''}
      <a class="btn" href="${BP}/how-are-they-related/?a=${id}">How related to…?</a></div>`;
    sheet.hidden = false;
    sheet.querySelector('.x').onclick = () => (sheet.hidden = true);
    const tg = sheet.querySelector('[data-tg]');
    if (tg) tg.onclick = () => { toggle(id); showSheet(id); };
  }

  // --- søk i treet ---
  function setupSearch() {
    const inp = chart.querySelector('.tsearch input'), ul = chart.querySelector('.tsearch ul');
    const ids = Object.keys(D.ppl);
    let hits = [], sel = 0;
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const idx = ids.map((id) => [id, norm(D.ppl[id].n || '')]);
    inp.addEventListener('input', () => {
      const q = norm(inp.value.trim());
      if (q.length < 2) { ul.hidden = true; return; }
      hits = idx.filter(([, n]) => n.includes(q)).sort((a, b) => a[1].indexOf(q) - b[1].indexOf(q)).slice(0, 12).map(([id]) => id);
      sel = 0;
      ul.innerHTML = hits.map((id, i) => `<li><button type="button" data-id="${id}" class="${i ? '' : 'on'}">${esc(D.ppl[id].n)} <span class="muted small">${esc(D.ppl[id].y || '')}</span></button></li>`).join('') || '<li class="muted small" style="padding:6px 9px">No match</li>';
      ul.hidden = false;
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); go(hits[sel]); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % Math.max(hits.length, 1); ul.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === sel)); }
    });
    ul.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.id); });
    function go(id) {
      ul.hidden = true; inp.value = D.ppl[id].n; inp.blur();
      let target = id;
      if (!D.dep[id]) { // partner: vis personen de er gift med
        const host = Object.keys(D.pa).find((h) => D.pa[h].some(([q]) => q === id));
        if (host) revealPath(host);
      } else revealPath(id);
      render();
      centerOn(target, Math.max(view.k, .85), true);
      showSheet(id);
    }
  }
  window.addEventListener('beforeprint', () => document.querySelectorAll('details.textv').forEach((d) => (d.open = true)));
})();
