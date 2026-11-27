// Lager delingsbilder (1200x630): site/og.png og site/og/<tre>.png med portretter fra treet.
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { TREES } from '../content/trees.mjs';
import { INTROS } from '../content/intros.mjs';

const M = JSON.parse(await readFile('data/membership.json', 'utf8'));
const IMG = JSON.parse(await readFile('data/images.json', 'utf8').catch(() => '{}'));
await mkdir('site/og', { recursive: true });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(title, sub) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><pattern id="d" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="#9a6b22" opacity=".18"/></pattern></defs>
  <rect width="1200" height="630" fill="#f6f1e6"/><rect width="1200" height="630" fill="url(#d)"/>
  <rect x="0" y="560" width="1200" height="70" fill="#1c2230"/>
  <g transform="translate(70 70)"><circle cx="16" cy="6" r="5" fill="#9a6b22"/><circle cx="6" cy="26" r="5" fill="#3f5f86"/><circle cx="26" cy="26" r="5" fill="#a04e63"/><path d="M16 11v7M6 21v-3h20v3" stroke="#1c2230" stroke-width="2.4" fill="none"/></g>
  <text x="118" y="100" font-family="Georgia, 'Palatino Linotype', serif" font-size="34" fill="#1c2230">FamilyTree<tspan fill="#9a6b22">Of</tspan></text>
  <text x="70" y="250" font-family="Georgia, 'Palatino Linotype', serif" font-size="${title.length > 26 ? 64 : 78}" font-weight="bold" fill="#1c2230">${esc(title)}</text>
  <text x="70" y="315" font-family="Segoe UI, Arial, sans-serif" font-size="32" fill="#4b5263">${esc(sub)}</text>
  <text x="70" y="605" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#f6f1e6">Interactive · mobile-friendly · printable</text>
  </svg>`);
}
async function make(file, title, sub, faces) {
  const comps = [];
  let x = 70;
  for (const f of faces.slice(0, 6)) {
    const circle = Buffer.from('<svg width="130" height="130"><circle cx="65" cy="65" r="65"/></svg>');
    const img = await sharp(`site${f}`).resize(130, 130).composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
    comps.push({ input: img, left: x, top: 375 });
    x += 150;
  }
  await sharp(svg(title, sub)).composite(comps).png({ compressionLevel: 9, palette: true }).toFile(file);
}
await make('site/og.png', 'Family trees of history', 'Royals, dynasties, presidents and the gods of myth', ['british-royal-family', 'tudor', 'greek-gods', 'romanov', 'habsburg', 'ptolemaic-dynasty'].map((s) => Object.entries(M[s] || {}).sort((a, b) => a[1][0] - b[1][0]).map(([id]) => id).find((id) => IMG[id])).filter(Boolean).map((id) => IMG[id].m));
for (const t of TREES) {
  const ids = Object.entries(M[t.slug] || {}).sort((a, b) => a[1][0] - b[1][0]).map(([id]) => id).filter((id) => IMG[id] && existsSync(`site${IMG[id].m}`));
  const h1 = INTROS[t.slug]?.h1 || t.name;
  await make(`site/og/${t.slug}.png`, h1, 'Interactive family tree · tap any name to explore', ids.map((id) => IMG[id].m));
}
console.log('OG-bilder laget');
