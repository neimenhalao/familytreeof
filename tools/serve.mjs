// Lokal forhåndsvisning av dist/ (bygg med BASE_PATH= for rot-stier): node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const port = Number(process.argv[2] || 4330);
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join('dist', p);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { f = join('dist', '404.html'); res.statusCode = 404; }
  try { const b = await readFile(f); res.setHeader('Content-Type', T[extname(f)] || 'application/octet-stream'); res.end(b); } catch { res.statusCode = 404; res.end('404'); }
}).listen(port, () => console.log(`http://localhost:${port}/`));
