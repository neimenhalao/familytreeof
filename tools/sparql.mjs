// Hjelper: kjør en SPARQL-spørring fra kommandolinjen. node tools/sparql.mjs "SELECT ..."
const UA = 'FamilyTreeOfBot/0.1 (https://neimenhalao.github.io/familytreeof/about/)';
const q = `PREFIX wd: <http://www.wikidata.org/entity/> PREFIX wdt: <http://www.wikidata.org/prop/direct/> ` + process.argv[2];
const r = await fetch('https://query.wikidata.org/sparql', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' }, body: 'query=' + encodeURIComponent(q) });
const j = await r.json();
for (const b of j.results.bindings) console.log(Object.entries(b).map(([k, v]) => `${k}=${v.value.replace('http://www.wikidata.org/entity/', '')}`).join('  '));
