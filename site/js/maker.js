// Family tree maker: an ancestor (pedigree) chart you fill in. Data stays in this browser (localStorage).
(function () {
  const root = document.getElementById('maker');
  if (!root) return;
  const KEY = 'fto-maker-v1';
  const chart = root.querySelector('[data-chart]');
  const title = root.querySelector('[data-title]');
  const status = root.querySelector('[data-status]');
  let state = { g: 4, title: '', p: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.p) state = Object.assign(state, s); } catch (e) {}
  const g0 = Number(new URLSearchParams(location.search).get('generations'));
  if (g0 >= 3 && g0 <= 5) state.g = g0;

  function label(n) {
    if (n === 1) return 'You';
    const k = Math.floor(Math.log2(n)), male = n % 2 === 0;
    if (k === 1) return male ? 'Father' : 'Mother';
    if (k === 2) return (n < 6 ? 'Paternal ' : 'Maternal ') + (male ? 'grandfather' : 'grandmother');
    return 'Great-' + 'great-'.repeat(k - 3) + (male ? 'grandfather' : 'grandmother');
  }
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let timer;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); status.textContent = 'Saved in this browser'; } catch (e) { status.textContent = 'Could not save (private browsing?) – print before you leave'; }
    }, 300);
  }

  function render() {
    const G = state.g, R = 2 ** (G - 1);
    let h = '';
    for (let k = 0; k < G; k++) {
      const span = R / 2 ** k;
      for (let i = 0; i < 2 ** k; i++) {
        const n = 2 ** k + i, d = state.p[n] || {};
        const side = k === 0 ? '' : n % 2 === 0 ? ' fa' : ' mo';
        const sex = k === 0 ? '' : n % 2 === 0 ? ' male' : ' female';
        h += `<div class="pn g${k}${side}" style="grid-column:${k + 1};grid-row:${i * span + 1} / span ${span}"><div class="box${sex}"><span class="lbl">${label(n)}</span><input class="nm" data-n="${n}" data-f="name" value="${esc(d.name)}" placeholder="Full name" aria-label="${label(n)}: name" autocomplete="off"><input class="dt" data-n="${n}" data-f="dates" value="${esc(d.dates)}" placeholder="Born – died, place" aria-label="${label(n)}: dates and place" autocomplete="off"></div></div>`;
      }
    }
    chart.style.setProperty('--g', G);
    chart.style.setProperty('--rows', R);
    chart.style.gridTemplateColumns = `repeat(${G}, minmax(0, 1fr))`;
    chart.style.gridTemplateRows = `repeat(${R}, minmax(${G === 5 ? 46 : 58}px, auto))`;
    chart.innerHTML = h;
    root.querySelectorAll('[data-g]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.g) === G)));
  }

  chart.addEventListener('input', (e) => {
    const t = e.target; if (!t.dataset.n) return;
    const d = state.p[t.dataset.n] || (state.p[t.dataset.n] = {});
    d[t.dataset.f] = t.value.slice(0, 120);
    save();
  });
  title.value = state.title || '';
  title.addEventListener('input', () => { state.title = title.value.slice(0, 80); save(); });
  root.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { state.g = Number(b.dataset.g); render(); save(); }));
  root.querySelector('[data-print]').addEventListener('click', () => {
    try { window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: 'event-maker-print', title: 'Maker: print ' + state.g, event: true }); } catch (e) {}
    window.print();
  });
  root.querySelector('[data-clear]').addEventListener('click', () => {
    if (!confirm('Clear all names in this family tree? This cannot be undone.')) return;
    state.p = {}; state.title = ''; title.value = ''; render(); save();
  });
  render();
})();
