// Melder sidene fra siste bygg (dist/indexnow.json) til IndexNow (Bing, Yandex, Seznam m.fl.).
// Hopper over så lenge nettstedet ligger på github.io eller NOINDEX=1.
import { readFile, readdir } from 'node:fs/promises';
const host = process.env.SITE_DOMAIN || '';
if (process.env.NOINDEX === '1' || !host || host.endsWith('github.io')) { console.log('Hopper over IndexNow (forhåndsvisning)'); process.exit(0); }
const key = (await readdir('site')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, 32);
const urls = JSON.parse(await readFile('dist/indexnow.json', 'utf8'));
if (!key || !urls.length) { console.log('Ingenting å melde'); process.exit(0); }
for (let i = 0; i < urls.length; i += 9000) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(i, i + 9000) }),
  });
  console.log(`IndexNow: ${res.status} for ${Math.min(9000, urls.length - i)} adresser`);
}
