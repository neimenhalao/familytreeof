# Driftshåndbok – FamilyTreeOf (familytreeof.com)

Brukes av COO-ens daglige økt. Hold dokumentet oppdatert – det er hukommelsen mellom øktene. Mandat og utelukkede tema: `../nettsteder/COO.md`.

## Mål og roller
- **Mål:** over 100 000 sidevisninger per måned, organisk (Google/Bing, deling, gjenbesøk), uten annonsebudsjett. Inntektsplan: `KOMMERSIALISERING.md`.
- **Eier** betaler bare domenet og gjør det Claude ikke kan: innlogging, betaling, DNS, verifisering. Be aldri eieren poste, dele eller sende noe.
- **COO/team (Claude)** har ansvaret for alt annet, også veksten. Meldinger eller innlegg i prosjektets navn krever eierens godkjenning, så samle dem i én forespørsel.

## Systemet
- **Kode:** `C:\Users\DanErikLinde\OneDrive - AREALUTVIKLING AS\Dokumenter\Claude code\familytreeof`. Repo `neimenhalao/familytreeof` (offentlig), gren `main`.
- **Hosting:** GitHub Pages via Actions (`.github/workflows/deploy.yml`), som bygger ved hver push. Forhåndsvisning: https://neimenhalao.github.io/familytreeof/
- **Repo-variabler:** `SITE_DOMAIN=familytreeof.com`, `GOATCOUNTER=familytreeof`. `NOINDEX` er slettet ved lansering (sett `NOINDEX=1` igjen bare hvis nettstedet må skjules).
- **Statistikk:** GoatCounter. Når eieren har laget `familytreeof.goatcounter.com`, setter du `gh variable set GOATCOUNTER -R neimenhalao/familytreeof --body familytreeof`. Hendelse: `event-relation` (bruk av slektskapssøkeren).
- **IndexNow:** nøkkelfila ligger i `site/<32 hex>.txt`. Jobben kjører bare når `SITE_DOMAIN` er satt og `NOINDEX` ikke er 1.

### Filer
| Fil | Hva |
|---|---|
| `content/trees.mjs` | Tredefinisjoner (røtter, hus/P53-filter, dybde, maks antall, fokus), `LIVING_ALLOW` og `BLOCK` |
| `content/intros.mjs` | Håndskrevne introduksjoner, FAQ og kilder per tre (engelsk, sjekket mot Wikipedia 2026-11-27) |
| `content/pairs.mjs` | Kuraterte «How are X and Y related?»-par (egne sider) |
| `tools/fetch.mjs` | Henter fra Wikidata SPARQL → `data/wikidata.json`, `data/membership.json`, `data/labels.json` (hurtigbuffer, skånsom, User-Agent) |
| `tools/images.mjs` | Portretter fra Commons, kun PD/CC0/CC BY/CC BY-SA → `site/img/p/`, `data/images.json` (kreditering) |
| `tools/make-og.mjs` | Delingsbilder `site/og.png` og `site/og/<tre>.png` |
| `tools/build.mjs` | Bygger `dist/`: forside, trær, personsider, søker, parsider, sitemap, robots, IndexNow-liste |
| `site/js/tree.js` | Interaktivt tre (zoom/panorering/knip, sammenlegging, søk, detaljark, fullskjerm) |
| `site/js/kin.js` | Slektskapsberegning (delt av nettleseren og bygget) |
| `site/js/finder.js` | Slektskapssøkeren |
| `data/slugs.json` | **Stabile URL-er per person. Ikke slett** – nye personer får nye slugger, gamle endres aldri |
| `data/excluded-living.txt` | Levende personer med Wikipedia-artikkel som er utelatt (til manuell vurdering) |

### Regler for innhold
- **Levende personer** tas bare med hvis de har en engelsk Wikipedia-artikkel **og** P97 (adelig tittel) eller P39 (offentlig verv), eller står i `LIVING_ALLOW` etter manuell vurdering. For dem vises bare fødselsår, ingen fulle datoer. Barn under 18 får ingen indeksert side og ikke noe portrett. `BLOCK` utelater personer helt (for eksempel private personer i saker i media).
- **Usikre lenker:** Wikidata-utsagn med P1480 (presumably/disputed …) vises med stiplet linje og en merknad. Har en person flere fedre eller mødre (mytologi), står det en merknad med alternativene.
- **Tynne sider:** personsider blir `noindex` hvis personen ikke har en engelsk Wikipedia-artikkel eller har færre enn 4 slektninger i grafen.
- **Portretter** brukes bare med fri lisens, med kunstner, lisens og lenke under bildet.
- **Introduksjonene** er håndskrevne og har kildelenker. Endres de, skal fakta sjekkes mot Wikipedia, ikke mot hukommelsen. Kongehusene endrer seg: Harald V døde 28.08.2026, og Haakon VIII er konge.

### Vanlige oppgaver
```bash
node tools/fetch.mjs                 # hent bare det som mangler (bruk --refresh for alt; tar ca. 1 time, skånsomt)
node tools/images.mjs                # nye portretter (fortsetter der den slapp)
node tools/make-og.mjs               # delingsbilder
BASE_PATH= node tools/build.mjs && node tools/serve.mjs   # lokal visning på http://localhost:4330/
git add -A && git commit -m "…" && git push               # publiserer
```
**Nytt tre:** finn QID-er med `node tools/search.mjs "navn"`, legg treet inn i `content/trees.mjs`, skriv intro i `content/intros.mjs` (fakta sjekket, kilder), og kjør så fetch → images → make-og → build. Kontroller treet i nettleseren på mobil og desktop før push.

## Daglig økt
1. Les dette dokumentet, `KOMMERSIALISERING.md` og siste fil i `rapporter/` (hvis den finnes).
2. **Helse:** `gh run list -R neimenhalao/familytreeof --limit 3` skal være grønn. Forsiden, ett tre og søkeren skal svare (PowerShell `Invoke-WebRequest`, siden sandkassen kan blokkere nett).
3. **Tall** (når de finnes): GoatCounter (i går, 7 dager, måneden hittil, topp-sider, henvisere, `event-relation`) og Search Console (klikk, visninger, indekserte sider, søkeord på side 2). Bare les – ikke endre innstillinger.
4. **Vekst:** ta 1–2 punkter fra backloggen (høyest effekt først). Test lokalt og i nettleseren (mobil + desktop), og publiser.
5. **Logg:** skriv `rapporter/ÅÅÅÅ-MM-DD.md` (tall, hva som ble gjort, neste steg), oppdater «Status» og backloggen her, og commit + push.
6. **Rapport til COO** (kort, norsk): tall, hva som ble gjort, neste steg, og bare om det trengs: hva eieren må gjøre.

## Status
- 2026-11-27 (ettermiddag): **LANSERT på https://familytreeof.com.** Domenet er kjøpt, og COO har lagt inn DNS hos Domeneshop (4× A + www CNAME). Pages custom domain er satt, `SITE_DOMAIN=familytreeof.com` og `GOATCOUNTER=familytreeof` er satt, og `NOINDEX` er slettet. IndexNow kjøres av Actions etter hver deploy. Faktasjekken av introene er fullført (danske konger, Kennedy-barna, Louis XV/Philip V, Harrison 1841 og Barbara Bush er bekreftet; «Frederick IX» er endret til «Frederik IX»). Search Console håndteres av COO.
- 2026-11-27: **MVP live på github.io med NOINDEX.** 26 trær (kongehus i dag, dynastier, antikken, mytologi, amerikanske familier), 7 613 personsider (4 054 indekserbare, resten `noindex`), 103 «How are X and Y related?»-sider, søkergraf med 11 613 personer, 3 875 portretter med fri lisens og 124 levende personer utelatt etter regelen. Data hentet 2026-11-27 (14 235 Wikidata-entiteter, ca. 470 SPARQL-spørringer totalt). Bygget tar ca. 4 min lokalt (OneDrive-I/O), under 1 min i Actions. Testet i nettleser på mobil (375 px) og desktop. Venter på at eieren kjøper familytreeof.com og lager GoatCounter-kontoen.
- Kjente svakheter: mytologitrærne er brede og rotete fordi Wikidata har mange varianter (Zeus har mange partnere). Slektskap utenfor trærne kan mangle fordi grafen bare har trærne + nærmeste familie, så det kan stå «not related by blood» der et fjernt blodsslektskap finnes. Grafen (`data/graph.json`) er ca. 1 MB ukomprimert og lastes først når søkeren tas i bruk. Ved lansering: sett `SITE_DOMAIN`, legg til custom domain i Pages, sett DNS, fjern `NOINDEX`, legg sitemap inn i Search Console, sjekk at IndexNow svarer 200/202.

## Lansering (når domenet er kjøpt)
1. Eier: kjøper familytreeof.com (Domeneshop) og legger inn DNS: 4 A-oppføringer (185.199.108–111.153) + `www` CNAME `neimenhalao.github.io`, og Google-TXT for Search Console (domeneegenskap).
2. Claude: `gh variable set SITE_DOMAIN -R neimenhalao/familytreeof --body familytreeof.com`, setter custom domain med `gh api -X PUT repos/neimenhalao/familytreeof/pages -f cname=familytreeof.com`, slår på HTTPS og sletter `NOINDEX` (`gh variable delete NOINDEX -R neimenhalao/familytreeof`). Sjekk så canonical-lenker, sitemap og robots.
3. Eier: lager GoatCounter-kontoen `familytreeof` og bekrefter Search Console. Claude legger inn sitemap og ber om indeksering av forsiden og de 10 største trærne.

## Vekstbacklogg (prioritert)
1. **«Make your own family tree» (gratis tre-maker)** – høyest prioritet etter lansering. «family tree template» ca. 60k og «family tree maker free» store søk. Nettleserbasert, data i localStorage, utskrift og PDF, maler (3/4/5 generasjoner) og utskriftbare blanke maler (statiske sider = egne søkeord). Gir gjenbesøk og grunnlag for betalt eksport.
2. **Flere trær med høy etterspørsel:** Egyptiske faraoer (flere dynastier), Spanish/Dutch/Belgian royal family, Windsor-detaljside «Charles III family tree», Japanese imperial family, Mughal, Ottoman dynasty, Kennedy-utvidelse, Lincoln, Washington, Jefferson-Hemings (forsiktig, kildebasert), Shakespeare, Bach-familien, Rothschild, Targaryen-lignende fiktive? (nei – opphavsrett), bibelske slektstrær (nøkternt, senere).
3. **Personnavn-sider for kjente enkeltpersoner:** «Henry VIII family tree», «Queen Elizabeth II family tree» osv. som egne tre-sider (ancestors + descendants rundt én person). Stor lang hale.
4. **Ancestor-visning (anetavle)** i tillegg til etterkommertre – «Charles III ancestry», «Prince George family tree».
5. **Flere par-sider** (`content/pairs.mjs`): de mest søkte «how is X related to Y» (kongelige ved nyheter, Roosevelt, Bush, mytologi). Mål: 200+.
6. **Delbarhet:** OG-bilde per par-side, «Copy link»-knapp i svaret, embed-kode (iframe) for lærere og blogger (med lenke tilbake).
7. **Mørk modus** og større tekst-valg. Bedre utskrift (treet som bilde/PDF, A3/A4).
8. **Søkeside for personer** (statisk indeks) og «People A–Z» per bokstav.
9. **Kvalitet:** gå gjennom `data/excluded-living.txt` og vurder `LIVING_ALLOW` for offentlige personer i egen rett (for eksempel olympiske utøvere, programledere). Rett feil i Wikidata ved kilde der det er åpenbart.
10. **Månedlig dataoppfrisking:** `node tools/fetch.mjs --refresh` (nye fødsler, dødsfall, titler), og sjekk introduksjonene ved store kongelige hendelser.
