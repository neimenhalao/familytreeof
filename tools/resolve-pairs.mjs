// Hjelper: gjør navnepar om til QID-par fra data/wikidata.json (engelsk Wikipedia-tittel eller etikett).
// node tools/resolve-pairs.mjs > content/pairs.mjs
import { readFile } from 'node:fs/promises';
const E = JSON.parse(await readFile('data/wikidata.json', 'utf8'));
const M = JSON.parse(await readFile('data/membership.json', 'utf8'));
const inTree = new Set(Object.values(M).flatMap((t) => Object.keys(t)));
const by = new Map();
for (const e of Object.values(E)) if (e.label) { const l = e.label.toLowerCase(); if (!by.has(l) || (inTree.has(e.id) && !inTree.has(by.get(l)))) by.set(l, e.id); }
for (const e of Object.values(E)) if (e.wiki) by.set(e.wiki.replace(/_/g, ' ').toLowerCase(), e.id); // Wikipedia-tittel vinner
const NAMES = [
  ['Queen Victoria', 'Charles III'], ['Queen Victoria', 'Nicholas II of Russia'], ['Queen Victoria', 'Wilhelm II'], ['George V', 'Nicholas II of Russia'], ['George V', 'Wilhelm II'],
  ['Elizabeth II', 'Prince Philip, Duke of Edinburgh'], ['Charles III', 'Haakon VIII of Norway'], ['Charles III', 'Frederik X'], ['Charles III', 'Carl XVI Gustaf'], ['Elizabeth II', 'Harald V'],
  ['Christian IX of Denmark', 'Charles III'], ['Queen Victoria', 'Elizabeth II'], ['Queen Victoria', 'William, Prince of Wales'], ['Alexandra Feodorovna (Alix of Hesse)', 'Queen Victoria'], ['Haakon VII', 'George V'],
  ['Henry VIII', 'Elizabeth I'], ['Henry VII of England', 'Elizabeth I'], ['Mary, Queen of Scots', 'Elizabeth I'], ['Henry VIII', 'James VI and I'], ['Lady Jane Grey', 'Henry VIII'],
  ['Edward III of England', 'Richard III of England'], ['Henry II of England', 'Richard I of England'], ['Edward IV', 'Henry VII of England'], ['John of Gaunt', 'Henry VIII'], ['Eleanor of Aquitaine', 'John, King of England'],
  ['Charles I of England', 'Charles II of England'], ['James II of England', 'Anne, Queen of Great Britain'], ['Charles Edward Stuart', 'James II of England'],
  ['Maria Theresa', 'Marie Antoinette'], ['Charles V, Holy Roman Emperor', 'Philip II of Spain'], ['Franz Joseph I of Austria', 'Archduke Franz Ferdinand of Austria'], ['Charles II of Spain', 'Philip II of Spain'], ['Maximilian I, Holy Roman Emperor', 'Charles V, Holy Roman Emperor'],
  ['Louis XIV', 'Louis XVI'], ['Henry IV of France', 'Louis XIV'], ['Louis XIV', 'Philip V of Spain'], ['Marie Antoinette', 'Louis XVI'],
  ['Peter the Great', 'Nicholas II of Russia'], ['Catherine the Great', 'Nicholas II of Russia'], ['Peter the Great', 'Peter III of Russia'], ['Alexander II of Russia', 'Nicholas II of Russia'],
  ['Lorenzo de\' Medici', 'Catherine de\' Medici'], ['Cosimo de\' Medici', 'Lorenzo de\' Medici'], ['Pope Leo X', 'Lorenzo de\' Medici'], ['Catherine de\' Medici', 'Marie de\' Medici'],
  ['Augustus', 'Nero'], ['Augustus', 'Caligula'], ['Tiberius', 'Claudius'], ['Mark Antony', 'Nero'], ['Augustus', 'Claudius'], ['Constantine the Great', 'Julian (emperor)'],
  ['Cleopatra', 'Ptolemy I Soter'], ['Cleopatra', 'Caesarion'], ['Tutankhamun', 'Akhenaten'], ['Tutankhamun', 'Amenhotep III'], ['Nefertiti', 'Tutankhamun'], ['Hatshepsut', 'Thutmose III'],
  ['Zeus', 'Heracles'], ['Zeus', 'Hera'], ['Zeus', 'Poseidon'], ['Gaia', 'Zeus'], ['Uranus (mythology)', 'Aphrodite'], ['Cronus', 'Apollo'], ['Athena', 'Ares'], ['Hades', 'Persephone'], ['Zeus', 'Hermes'], ['Prometheus', 'Zeus'],
  ['Odin', 'Thor'], ['Thor', 'Loki'], ['Odin', 'Baldr'], ['Loki', 'Hel (being)'], ['Freyr', 'Freyja'], ['Loki', 'Fenrir'],
  ['Osiris', 'Horus'], ['Ra', 'Osiris'], ['Isis', 'Set (deity)'], ['Atum', 'Horus'], ['Geb', 'Anubis'],
  ['Theodore Roosevelt', 'Franklin D. Roosevelt'], ['Eleanor Roosevelt', 'Franklin D. Roosevelt'], ['Eleanor Roosevelt', 'Theodore Roosevelt'],
  ['John Adams', 'John Quincy Adams'], ['John Adams', 'Henry Adams'], ['William Henry Harrison', 'Benjamin Harrison'],
  ['John F. Kennedy', 'Robert F. Kennedy'], ['John F. Kennedy', 'Joseph P. Kennedy II'], ['Joseph P. Kennedy Sr.', 'John F. Kennedy'], ['Ted Kennedy', 'John F. Kennedy'], ['Rose Kennedy', 'Caroline Kennedy'],
  ['George H. W. Bush', 'George W. Bush'], ['Prescott Bush', 'George W. Bush'], ['Jeb Bush', 'George W. Bush'], ['Prescott Bush', 'George P. Bush'],
  ['Charles Darwin', 'Emma Darwin'], ['Erasmus Darwin', 'Charles Darwin'], ['Josiah Wedgwood', 'Charles Darwin'], ['Francis Galton', 'Charles Darwin'], ['Josiah Wedgwood', 'Emma Darwin'],
  ['Carl XVI Gustaf', 'Charles XIV John'], ['Victoria, Crown Princess of Sweden', 'Charles XIV John'], ['Margrethe II', 'Christian IX of Denmark'], ['Frederik X', 'Christian IX of Denmark'], ['Haakon VIII of Norway', 'Haakon VII'], ['Ingrid Alexandra, Crown Princess of Norway', 'Haakon VII'],
];
const out = [], miss = [];
for (const [a, b] of NAMES) { const qa = by.get(a.toLowerCase()), qb = by.get(b.toLowerCase()); if (qa && qb) out.push(`  ['${qa}', '${qb}'], // ${a} – ${b}`); else miss.push(`${a}${qa ? '' : ' (?)'} – ${b}${qb ? '' : ' (?)'}`); }
console.log(`// Kuraterte par for «How are X and Y related?»-sider. Lag på nytt: node tools/resolve-pairs.mjs > content/pairs.mjs\nexport const PAIRS = [\n${out.join('\n')}\n];`);
console.error('Mangler:\n' + miss.join('\n'));
