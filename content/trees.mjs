// Tre-definisjoner. Brukes av tools/fetch.mjs (innhenting) og tools/build.mjs (sider).
// roots: startpersoner (QID). houses: P53-verdier som gjør at en etterkommer utvides videre.
// houseless: utvid også barn uten P53. follow 'all' = utvid alle etterkommere (innenfor depth/max).
// focus: personer som skal være synlige når treet åpnes (stien dit foldes ut).
// Introtekster og kilder ligger i content/intros.mjs.

export const TREES = [
  // Kongehus i dag
  { slug: 'british-royal-family', name: 'British royal family', cat: 'royal', roots: ['Q9439'], houses: ['Q157217', 'Q1753846', 'Q109302959', 'Q81589', 'Q115453663', 'Q115453321', 'Q696647'], houseless: true, depth: 8, max: 420, focus: ['Q43274'] },
  { slug: 'queen-victoria-descendants', name: 'Queen Victoria’s descendants', cat: 'royal', roots: ['Q9439'], follow: 'all', depth: 3, max: 260, focus: [] },
  { slug: 'norwegian-royal-family', name: 'Norwegian royal family', cat: 'royal', roots: ['Q154927'], follow: 'all', depth: 4, max: 80, focus: ['Q165241'] },
  { slug: 'swedish-royal-family', name: 'Swedish royal family (Bernadotte)', cat: 'royal', roots: ['Q52927'], houses: ['Q201625'], houseless: true, depth: 9, max: 260, focus: ['Q45068'] },
  { slug: 'danish-royal-family', name: 'Danish royal family', cat: 'royal', roots: ['Q151305'], houses: ['Q155616', 'Q111201485'], houseless: true, depth: 7, max: 260, focus: ['Q1004037'] },
  // Historiske dynastier
  { slug: 'tudor', name: 'Tudor family', cat: 'dynasty', roots: ['Q361128'], houses: ['Q101978', 'Q7851349'], houseless: true, depth: 5, max: 120, focus: ['Q38370'] },
  { slug: 'hanover', name: 'House of Hanover', cat: 'dynasty', roots: ['Q57224'], houses: ['Q157217'], depth: 7, max: 200, focus: ['Q9439'] },
  { slug: 'plantagenet', name: 'Plantagenet family', cat: 'dynasty', roots: ['Q111490'], houses: ['Q106151', 'Q105278', 'Q105285', 'Q18341205'], depth: 14, max: 650, focus: ['Q129247'] },
  { slug: 'stuart', name: 'House of Stuart', cat: 'dynasty', roots: ['Q312592'], houses: ['Q179840', 'Q3973466'], depth: 16, max: 420, focus: ['Q81506'] },
  { slug: 'habsburg', name: 'Habsburg family', cat: 'dynasty', roots: ['Q76956'], houses: ['Q65968', 'Q645719', 'Q3624775', 'Q3624777', 'Q600093'], depth: 30, max: 1200, focus: ['Q32500','Q131706'] },
  { slug: 'medici', name: 'Medici family', cat: 'dynasty', roots: ['Q333393'], houses: ['Q170022'], depth: 12, max: 260, focus: ['Q177854'] },
  { slug: 'bourbon', name: 'House of Bourbon (France)', cat: 'dynasty', roots: ['Q936976'], houses: ['Q58389', 'Q3642350'], depth: 12, max: 420, focus: ['Q7742'] },
  { slug: 'romanov', name: 'Romanov family', cat: 'dynasty', roots: ['Q181915'], houses: ['Q112707', 'Q870568'], depth: 14, max: 420, focus: ['Q40787'] },
  // Antikken
  { slug: 'julio-claudian', name: 'Julio-Claudian dynasty', cat: 'ancient', roots: ['Q363084', 'Q342512'], follow: 'all', depth: 5, max: 160, focus: [] },
  { slug: 'constantinian', name: 'Constantinian dynasty', cat: 'ancient', roots: ['Q131195'], follow: 'all', depth: 4, max: 120, focus: ['Q8413'] },
  { slug: 'ptolemaic-dynasty', name: 'Ptolemaic dynasty', cat: 'ancient', roots: ['Q168261'], houses: ['Q131976'], houseless: true, depth: 14, max: 220, focus: ['Q635'] },
  { slug: 'tutankhamun', name: 'Tutankhamun and the 18th Dynasty', cat: 'ancient', roots: ['Q7222'], houses: ['Q146055'], houseless: true, depth: 14, max: 220, focus: ['Q12154'] },
  // Mytologi
  { slug: 'greek-gods', name: 'Greek gods', cat: 'myth', roots: ['Q131090'], wikiOnly: true, follow: 'all', depth: 5, max: 2400, focus: ['Q34201'] },
  { slug: 'norse-gods', name: 'Norse gods', cat: 'myth', roots: ['Q336145', 'Q1396283', 'Q193879'], wikiOnly: true, follow: 'all', depth: 6, max: 220, focus: ['Q43610'] },
  { slug: 'egyptian-gods', name: 'Egyptian gods', cat: 'myth', roots: ['Q276563'], wikiOnly: true, follow: 'all', depth: 6, max: 160, focus: ['Q46491'] },
  // Amerikanske presidentfamilier og kjente slekter
  { slug: 'adams-family', name: 'Adams family', cat: 'family', roots: ['Q11806'], follow: 'all', depth: 4, max: 120, focus: ['Q11816'] },
  { slug: 'harrison-family', name: 'Harrison family', cat: 'family', roots: ['Q387664'], follow: 'all', depth: 5, max: 120, focus: ['Q35678'] },
  { slug: 'roosevelt-family', name: 'Roosevelt family', cat: 'family', roots: ['Q85927197'], follow: 'all', depth: 11, max: 400, focus: ['Q33866','Q8007'] },
  { slug: 'kennedy-family', name: 'Kennedy family', cat: 'family', roots: ['Q313696'], follow: 'all', depth: 3, max: 160, focus: ['Q9696'] },
  { slug: 'bush-family', name: 'Bush family', cat: 'family', roots: ['Q1376227'], follow: 'all', depth: 4, max: 120, focus: ['Q207'] },
  { slug: 'darwin-wedgwood', name: 'Darwin–Wedgwood family', cat: 'family', roots: ['Q234050', 'Q319331'], follow: 'all', depth: 4, max: 200, focus: ['Q1035'] },
];

// Levende personer som er offentlige personer i egen rett, men som mangler P97/P39 i Wikidata.
// Legg bare til etter manuell vurdering (har egen Wikipedia-artikkel og er kjent for egen innsats).
export const LIVING_ALLOW = [
  'Q147663', // Zara Tindall – olympisk medaljevinner (ridning)
  'Q344908', // Peter Phillips – i tronfølgen, offentlig rolle
  'Q1386944', // Mike Tindall – verdensmester i rugby
  'Q547893', // Mark Phillips – olympisk mester (ridning)
  'Q2063224', // Timothy Laurence – viseadmiral, ektefelle til prinsesse Anne
  'Q153481', // Jenna Bush Hager – TV-programleder og forfatter
  'Q467912', // Kerry Kennedy – menneskerettighetsaktivist
  'Q273833', // Rory Kennedy – dokumentarfilmskaper
  'Q3529079', // Timothy Shriver – leder av Special Olympics
];
// Personer som aldri skal vises (private levende personer, sensitive saker).
export const BLOCK = ['Q5821013'];
