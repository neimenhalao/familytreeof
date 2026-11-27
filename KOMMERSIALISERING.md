# Kommersialiseringsplan – FamilyTreeOf (familytreeof.com)

**Utgangspunkt ved målet:** 100 000 sidevisninger/mnd ≈ 30 000–40 000 økter (2,5–3,5 sider per økt fordi folk klikker seg fra person til person). Trafikken er engelskspråklig, med anslagsvis 45–55 % fra USA, 15–20 % fra Storbritannia og resten fra Canada, Australia og Europa. Temaet er historie, utdanning og slekt. Det gir høy annonseverdi (RPM), særlig i USA. Toppene kommer ved skolestart (gresk mytologi står på pensum), ved kongelige hendelser, og når nye serier og filmer kommer (The Crown, Vikings, Percy Jackson).

**Prinsipp:** Trærne skal være raske og lesbare på mobil. Annonser plasseres aldri inne i treet. De står rundt det: i introduksjonen, mellom seksjoner på personsider og i bunnen av slektskapssvaret. Før vi har samtykkeløsning, bruker vi ingen sporingscookies.

## Inntektskilder i prioritert rekkefølge
| # | Kilde | Slik fungerer det | Anslag ved 100k visninger/mnd |
|---|---|---|---|
| 1 | **Displayannonser (hovedinntekt)** | Annonsenettverk med høy RPM. Journey by Mediavine tar inn fra ca. 10 000 økter/mnd, Raptive krever 25 000 økter (med krav om andel fra USA og andre krav), og Mediavine fullt fra 50 000 økter. Ezoic og AdSense er start eller reserve. Historie- og utdanningsinnhold med mye trafikk fra USA gir typisk 15–30 USD per 1 000 økter hos premium-nettverk. Krever samtykkebanner (CMP) for EU/UK, og det leverer nettverket selv. | 6 000–15 000 kr/mnd (ca. 35 000 økter × 15–30 USD RPM) |
| 2 | **Slektsforskning – affiliate** | Brukeren tenker allerede «slekt». En rolig boks på personsider og trær: «Find your own ancestors» med lenke til MyHeritage (partnerprogram via Impact, provisjon på abonnement, vanligvis 15–40 % av første betaling avhengig av produkt og avtale), Ancestry (Ancestry Affiliate Program via Partnerize / CJ, per kvalifisert prøveperiode eller salg), FamilySearch (gratis, ingen inntekt – brukes som nøytral lenke) og DNA-tester (MyHeritage DNA, AncestryDNA) rundt Black Friday og jul. | 2 000–8 000 kr/mnd. Vokser med «make your own family tree» |
| 3 | **Egen slektstre-maker (gratis) + betalt eksport** | «Make your own family tree» (høyt i backloggen): gratis i nettleseren, data lagres lokalt. Betaling bare for høyoppløst PDF/plakat (A2/A1) eller pene maler. «Family tree template» har ca. 60k søk/mnd og gir trafikk som kan kjøpe. | 2 000–10 000 kr/mnd ved 5–10 kjøp per dag à 5–9 USD |
| 4 | **Plakater og trykk (print-on-demand)** | «British royal family tree poster», «Greek gods family tree poster» og elevplakater for klasserom. Produseres av Printful/Gelato eller selges via Etsy uten lager. Bare data fra Wikidata (CC0) og egen design, ikke portretter med CC BY-SA. | 1 000–5 000 kr/mnd, med topp i august/september og desember |
| 5 | **Bøker og kurs – affiliate** | Amazon Associates på trær og personsider: biografier, «The Tudors», mytologibøker, Percy Jackson. Lav provisjon (ca. 3–4,5 %), men treffer godt i sammenheng. | 500–2 000 kr/mnd |
| 6 | **Lisens / innbygging** | Innbyggbare trær (iframe/widget) for lærere, historieblogger og nettaviser ved kongelige hendelser. Gratis med lenke tilbake (vekst), betalt uten merkevare for medier og forlag. | Vekstverktøy først, senere 0–10 000 kr per avtale |
| 7 | **Sponsor** | Én fast sponsor per tema, for eksempel et slektsforskningsselskap på kongehustrærne. Er realistisk først ved 200k+. | Senere |

**Realistisk samlet ved målet:** 10 000–30 000 kr/mnd. Annonser står for over halvparten, og affiliate og egne produkter for resten. **Størst oppside:** tre-makeren + eksport (eget produkt med margin) og at annonsene skalerer lineært med trafikken.

## Det vi gjør allerede nå, så det blir lett senere
- **Rene data og lisenser.** Wikidata er CC0 og kan brukes kommersielt. Portretter brukes bare med fri lisens og kreditering. Plakater/trykk bruker bare CC0-data og egne illustrasjoner, ikke CC BY-SA-portretter (det krever deling på samme vilkår).
- **Plass til annonser i malen.** Introduksjon → tre → tekst. Det er naturlige plasser under treet og mellom seksjonene på personsider. Vi legger inn faste, tomme plasser (`.ad-slot`) først når et nettverk er godkjent, så vi ikke får CLS-hopp.
- **Måling fra dag én.** Med GoatCounter (uten cookies) måler vi sider per økt, de mest besøkte trærne og hendelsen `event-relation` (bruk av søkeren). Det er tallene annonsenettverkene spør etter.
- **Personvern.** Ingen cookies nå. Når annonser kommer: CMP fra nettverket, oppdatert personvernside og tillegg om annonsepartnere.
- **Ingen levende privatpersoner.** Dette holder oss trygge mot klager og «brand safety»-problemer hos annonsenettverkene.

## Før første krone kommer inn (ved ca. 10 000 økter/mnd)
Det Claude ikke kan gjøre alene, samlet i én forespørsel til eier:
1. **Mottaker av penger:** eierens selskap (fakturering og skatt). Annonsenettverk og affiliate-programmer krever skatteskjema (W-8BEN-E for utenlandsk selskap).
2. **Hosting:** flytte fra GitHub Pages (vilkårene passer dårlig for kommersielle nettsteder) til Cloudflare Pages (gratis, kommersiell bruk tillatt). Claude gjør flyttingen, eier oppretter kontoen.
3. **Statistikk:** GoatCounter er gratis bare for ikke-kommersiell bruk. Det betyr oppgradering (ca. 5 USD/mnd) eller bytte til Cloudflare Web Analytics (gratis).
4. **Søknad til annonsenettverk:** Journey/Mediavine eller Ezoic. Eier sender søknaden (konto i eget navn), og Claude forbereder alt: ads.txt, personvern, plassering.
5. **Affiliate-kontoer:** MyHeritage (Impact), Ancestry og Amazon Associates. Eier oppretter dem, Claude legger inn lenkene.

## Hvem gjør hva
- **Claude og teamet:** plassering og testing av annonser, affiliate-bokser, tre-maker og eksport, plakatdesign, mediekit med tall, utkast til søknader (godkjennes samlet).
- **Eier:** selskap, kontoer hos nettverk og programmer, signering og utbetalinger.

## Milepæler
| Visninger/mnd | Kommersielt steg |
|---|---|
| 10 000 | Affiliate-boks (MyHeritage/Ancestry) testes på 5 trær, og tre-makeren er lansert gratis |
| 25 000 (≈10k økter) | Søke Journey by Mediavine eller Ezoic. Flytte til Cloudflare Pages |
| 50 000 | Betalt PDF-/plakateksport fra tre-makeren. Plakatbutikk for de 5 største trærne |
| 100 000 (≈35k økter) | Raptive eller Mediavine. Mediekit og widget-lisens til medier ved kongelige hendelser |
