// Hjelper: slå opp QID-er. node tools/search.mjs "Queen Victoria" "House of Tudor" ...
const UA = 'FamilyTreeOfBot/0.1 (https://neimenhalao.github.io/familytreeof/about/)';
for (const q of process.argv.slice(2)) {
  const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&format=json&limit=3`, { headers: { 'User-Agent': UA } });
  const j = await r.json();
  console.log(q + ' => ' + j.search.map((s) => `${s.id} [${s.label}: ${s.description || ''}]`).join(' | '));
  await new Promise((r) => setTimeout(r, 300));
}
