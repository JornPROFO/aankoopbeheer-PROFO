# Winkelwagen bij leverancier

## Browseragent — versie 1.0.1

De knop **Vul winkelwagen bij leverancier** gebruikt nu de lokale PROFO Winkelwagenagent in Chrome of Edge op desktop/laptop. De app controleert de bevoegdheid; de agent vraagt daarnaast zelfstandig via Supabase de actuele goedgekeurde bestelregels op. Alleen Jorn en Kathleen krijgen toegang. Er is geen automatische afrekenhandeling.

De agent staat in `browser-agent/`; het downloadpakket staat in `public/profo-winkelwagenagent.zip`. De installatieprocedure staat in `public/winkelwagenagent-installatie.html` en is vanuit het dialoogvenster bereikbaar. Eenmalig lokaal installeren via het extensiebeheer is noodzakelijk. De extensie is nog niet in een browserwinkel gepubliceerd. Een website kan deze installatie niet zelf uitvoeren.

### Gebruik

1. Installeer de extensie, herlaad Aankoopbeheer en meld je rechtstreeks aan bij de leverancier in hetzelfde browserprofiel.
2. Open een goedgekeurde bestelling en kies **Vul winkelwagen bij leverancier**. De voorcontrole opent de exacte productpagina's en leest de winkelwagens. Controleer in de app de opgehaalde producttitels en verpakkingen en bevestig de selectie.
3. **Vul winkelwagen nu** voegt de ontbrekende artikelen met het aangevraagde aantal toe. Een reeds aanwezig exact aantal blijft staan. Een afwijkend bestaand aantal wordt overgeslagen met een concrete reden. Andere artikelen worden niet verwijderd. De agent vergelijkt de overige regels na toevoegen.
4. De agent leest na iedere toevoeging het artikelnummer, de productlink, titel en het aantal van de winkelwagenregel terug. De resultaten verschijnen in de app en de leverancierswinkelwagens blijven open voor controle. Rond zelf af en gebruik pas daarna de bestaande bevestiging **Besteld bij leverancier**.

Leverancierswachtwoorden, cookies en betaalgegevens worden niet gelezen of opgeslagen. Alleen de Aankoopbeheer-JWT wordt tijdelijk in het uitvoeringsgeheugen gebruikt voor bevoegdheidscontrole en resultaatregistratie en nooit opgeslagen. De voorcontrole met bestel- en productgegevens blijft maximaal tien minuten bruikbaar in `chrome.storage.session`, zodat het pauzeren van de Chrome-serviceworker die niet verliest. Deze sessieopslag wordt bij sluiten van de browser gewist; ze bevat geen aanmeldgegevens. CAPTCHA en tweestapsverificatie blijven bij de gebruiker. Gebruik tijdens uitvoering geen andere tab om dezelfde winkelwagen te wijzigen.

### Implementatie en hervatten

`dom.js` bevat de begrensde leveranciershandelingen: productinspectie, exacte toevoeging en winkelwageninspectie. `worker.js` orkestreert de tabbladen, hercontrole van bevoegdheid en actuele bestelgegevens en auditregistratie. Alleen de twee vaste leveranciersdomeinen en exacte product- of winkelwagenroutes zijn toegestaan. De extensie ontvangt alleen berichten vanuit de productieapp, in het bovenste frame. Er is geen generieke URL-, script- of afrekenopdracht.

Het leveranciersartikelnummer moet overeenkomen met het productformulier en de titel bij de bestelknop. Als de catalogus alleen een exacte link bevat, wordt het artikelnummer van diezelfde productpagina gelezen. Gewijzigde of onbekende selectors, doorverwijzingen, ontbrekende beschikbaarheid, dubbele artikelen en afwijkende verpakkingen stoppen de regel. De gebruiker bevestigt de live producttitel en verpakking vóór uitvoering; die titel wordt bij toevoegen opnieuw gecontroleerd.

Installeer na de eerdere winkelwagen-SQL ook `supabase/manual-sql/20260928_winkelwagen_browser_agent.sql`. Deze voegt de methode `browser_agent`, bron en begrensde toelichting toe. Elke bewuste poging heeft een eigen starter, tijdstip en onveranderlijke snapshot. Vóór een mutatie wordt een onzeker resultaat geregistreerd; daarna het teruggelezen resultaat. Bij onderbreking opnieuw voorcontroleren: de huidige winkelwagen bepaalt de actie, nooit alleen een eerder opgeslagen succes. Falen van resultaatopslag stopt verdere mutaties.

### Verificatie en grenzen

De gerichte tests omvatten de DOM-adapter, meerdere producten, bestaande aantallen, herhaling, gedeeltelijke storing, verkeerde SKU, afwijkende verpakking, aanmelding, selectorwijziging, bevoegdheid en ontbreken van afrekenhandelingen. De test van de volledige orkestratie gebruikt een gesimuleerde browser en database; die vervangt geen test van een geïnstalleerde extensie.

Op 28 september 2026 heeft Jorn de extensie geladen. De volledige productieproef via de appknop, de geïnstalleerde extensie en 123schoon is geslaagd voor bestelling 15: eerst **Reeds aanwezig** met aantal 1, daarna — na het terugzetten van uitsluitend de eigen testtoevoeging — **Toegevoegd** met opnieuw teruggelezen aantal 1. Ook de pauze tussen voorcontrole en bevestiging is in de echte browser getest. De database bevestigt methode en bron `browser_agent`, het gecontroleerde aantal 1 en aankoopstatus **Goedgekeurd**. Er is nooit afgerekend. Alle 21 gerichte tests en de productiebuild slagen.

Bij 123inkt zijn de echte productknop en lege winkelwagen gecontroleerd en gebruikt de adapter dezelfde begrensde structuur. Er is nog geen volledige toevoegproef met een goedgekeurde 123inkt-bestelling uitgevoerd; er is geen willekeurig testartikel toegevoegd. De conclusie over de volledige live toevoeging geldt dus voor 123schoon.

<details><summary>Historiek: eerste handmatige tussenstap en herstel productreferenties</summary>

Deze uitbreiding maakt deel uit van de bestaande Aankoopbeheer-app. Alleen de actieve, aan hun Supabase Auth-account gekoppelde gebruikers **Jorn Neeus** (`jorn.neeus@profo.be`) en **Kathleen Nerinckx** (`kathleen.nerinckx@profo.be`) mogen ze gebruiken. Een beheer- of goedkeuringsrol alleen geeft geen toegang.

## Wat beschikbaar is

Bij goedgekeurde bestellingen met een herkenbare leverancier 123inkt.be of 123schoon.nl verschijnt **Handmatige controlelijst leverancier**. Ook de bestaande status *In behandeling* komt in aanmerking. De knop opent een overzicht van de bestelregels en de interne opmerking. Beide leveranciers werken in deze versie **begeleid handmatig**. De app vult geen leverancierswinkelwagen automatisch en presenteert een geopend product nooit als een toegevoegd product. De eerdere knoptekst *Vul winkelwagen bij leverancier* is gecorrigeerd omdat deze een werking beloofde die niet beschikbaar was.

De registratie bevat het oorspronkelijke overzicht, de ingelogde starter, het tijdstip en afzonderlijke controleresultaten. Herstarten hervat dezelfde registratie zolang de bestel- en catalogusgegevens gelijk zijn. Gewijzigde gegevens vereisen een nieuw overzicht. Resultaten worden toegevoegd aan de geschiedenis, niet overschreven. De aankoopstatus wordt niet veranderd.

## Aanmelden en controleren

1. Open de controlelijst en controleer productnaam, artikelnummer, link, verpakking, variant en aantal. Open daarna bewust de handmatige registratie. Wanneer geen enkele regel een bruikbare referentie heeft, is deze actie geblokkeerd.
2. Open een productlink of kopieer het artikelnummer om op de leverancierssite te zoeken. Meld je rechtstreeks aan bij die leverancier in de browser waarin de link opent. Gebruik diezelfde browser voor alle regels. Aankoopbeheer ontvangt geen leverancierswachtwoord, sessiecookie of betaalgegevens. Los een CAPTCHA of tweestapsverificatie zelf op.
3. Vergelijk het exacte artikel, de variant en de verpakking met de aanvraag. Een link is een catalogusreferentie, geen actuele productverificatie. Een verkeerd artikelnummer, niet-beschikbaar product of afwijkende verpakking betekent overslaan en de reden registreren. Kies geen alternatief zonder een uitdrukkelijke nieuwe keuze.
4. Controleer de bestaande winkelwagen. Staat exact het aangevraagde aantal er al voor deze aanvraag, voeg dan niets toe en registreer **Reeds aanwezig**. Tel bij herhaling nooit nogmaals het aangevraagde aantal erbij. Bij een afwijkend aantal stel je eerst vast of dat artikel voor deze of een andere bestelling bestemd is. Bij twijfel: **Onzeker**, met reden *Artikel in winkelwagen behoort mogelijk tot een andere bestelling*. Andere producten blijven staan.
5. Registreer per regel **Toegevoegd**, **Reeds aanwezig**, **Aantal aangepast**, **Onzeker** of **Mislukt**. Een geslaagd resultaat vereist het daadwerkelijk gecontroleerde aantal en een expliciete bevestiging van product, variant en verpakking. De app benoemt dit als handmatige bevestiging.
6. Open de winkelwagen via **Controleer winkelwagen**. Controleer zelf producten, aantallen, prijzen en levergegevens en plaats de effectieve bestelling handmatig. Bevestig die pas daarna via de bestaande bestelworkflow van Aankoopbeheer.

Op smartphone wissel je tussen Aankoopbeheer en de leveranciersbrowser. Een geïnstalleerde webapp kan links in een andere browser openen. Er is geen veronderstelde gedeelde aanmelding. Na een onderbreking hervat je de registratie en controleer je de huidige winkelwagen opnieuw; oude resultaten bewijzen niet dat het artikel daar nog staat.

## Onderzoek en afbakening — 28 september 2026

De bestelhulppagina's van [123inkt.be](https://www.123inkt.be/page/info_bestellen.html) en [123schoon.nl](https://www.123schoon.nl/page/info_bestellen.html) beschrijven zoeken op artikelnummer, toevoegen met aantal en controle in de winkelwagen. Beide actuele websites zijn ook via de browser bekeken. Hun zichtbare winkelwagenlink is `/shoppingcart.html`. Er zijn tijdens dit onderzoek geen leveranciersbestellingen geplaatst en geen producten aan een echte winkelwagen toegevoegd.

In de geraadpleegde openbare informatie kon geen officiële API of koppeling voor het vullen én betrouwbaar teruglezen van de winkelwagen worden vastgesteld. Dit is geen bevestiging dat een zakelijke koppeling niet bestaat. De huidige app bestaat uit een Vite-webclient met Supabase; er is geen eigen browserextensie, gekoppelde lokale browserdienst of sessiegebonden browserwerkplek. De Codex-browserbediening tijdens ontwikkeling is geen API die de geïnstalleerde app kan aanroepen.

Daarom zijn voor **beide leveranciers** uitsluitend productnavigatie en begeleide registratie geïmplementeerd. Er worden geen verborgen formulieraanroepen, cookies, sessietokens, zoekresultaten op vergelijkbare namen of veronderstelde winkelwagen-API's gebruikt. Productlinks zijn beperkt tot HTTPS, het exacte leveranciersdomein en de waargenomen productdetailstructuur. Actieroutes, afrekenroutes, queryparameters, gebruikersgegevens in URL's, categoriepagina's en automatische omzetting van .nl naar .be zijn uitgesloten. Bestaande expliciete inktreferenties in de regelomschrijving kunnen worden overgenomen; ontbrekende of afwijkende referenties blijven handmatig.

Voor volledig automatisch vullen is eerst een door de leverancier bevestigde API met een testomgeving nodig, of een expliciet gekoppelde browseromgeving met eigen installatie en sessiebeheer. Die laatste optie vereist afzonderlijke leveranciersadapters, exacte product- en verpakkingscontrole, uitlezen vóór en na elke wijziging, een vastgelegde toewijzing van bestaande aantallen aan aanvragen, een herstartprotocol en een technische blokkering van afrekenen. Een smartphone heeft daarvoor een afzonderlijke gekoppelde browserwerkplek nodig; toegang tot willekeurige andere tabs volstaat niet. Deze onderdelen zijn niet als werkende integratie voorgesteld.

## Installatie in de bestaande omgeving

Voer `supabase/manual-sql/20260928_aankoop_winkelwagenoverdracht.sql` volledig uit in het bestaande aankoopproject, na de bestaande rollen- en goedkeuringsinrichting. De repository gebruikt handmatige SQL-uitbreidingen. Controleer dat Jorn en Kathleen elk een actieve gebruikersrij hebben met hun eigen correcte `auth_user_id`; alleen een gelijk e-mailadres is onvoldoende. Publiceer daarna de normale Vite-build via de bestaande releaseprocedure.

De uitbreiding gebruikt RLS en SECURITY INVOKER. Identiteit en tijdstippen worden door de database ingevuld; de snapshot wordt uit de database afgeleid. Alleen lezen en toevoegen is toegestaan aan de twee bevoegde gebruikers. Er is geen nieuwe algemene beheerbevoegdheid. De scheiding tussen authenticatie en rijtoegang volgt de gecontroleerde [Supabase-documentatie over RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Zonder geïnstalleerde database-uitbreiding stopt de actie met een duidelijke foutmelding vóór leveranciersnavigatie. De SQL is lokaal met PostgreSQL via PGlite getest en op 28 september 2026 geïnstalleerd in het live project `rxkffollbimmsvwhucgd`. De accountkoppelingen van Jorn en Kathleen zijn daar gecontroleerd. De live integratietest `tests/supplier-cart-rollback.sql` slaagt: beide accounts kunnen registreren, een andere identiteit krijgt geen toegang, herstarten hervat dezelfde registratie en de aankoopstatus blijft ongewijzigd. Alle testgegevens zijn teruggedraaid.

## Testen

Modeltests: `node --test tests/supplier-cart.test.mjs`.

Databaseproef, geïsoleerd van productie:

```powershell
npm install --prefix tmp/cart-test-runtime --cache tmp/npm-cache --no-save --package-lock=false @electric-sql/pglite@0.3.14
node --test tests/supplier-cart.test.mjs tests/supplier-cart-db.test.mjs
npm run build
```

De proeven behandelen meerdere artikelen, bestaande winkelwagenregistratie, herhaald starten, fout artikelnummer, afwijkende verpakking, gedeeltelijke mislukking, onjuist gecontroleerd aantal, onbevoegde gebruikers, onjuiste accountkoppeling, gewijzigde gegevens, niet-goedgekeurde of reeds bestelde dossiers, onveranderbare auditregels en afwezigheid van een automatische afrekenroute. Het zijn tests van de begeleide werkwijze, geen bewijs van automatische winkelwagenmutaties bij de leveranciers.

`tests/supplier-cart-ui.html` is uitsluitend een lokale testfixture die de productiecomponent met gesimuleerde opslag opent. Ze wordt niet in de Vite-productiebuild opgenomen. Daarmee worden desktop, mobiel, gedeeltelijke resultaten, hervatten en databasefouten gecontroleerd zonder echte bestellingen te wijzigen.

Uitgevoerd resultaat: alle negen nieuwe geautomatiseerde tests slagen; de productiebuild slaagt. In de browser zijn verkeerde aantallen, verplichte foutredenen, gedeeltelijke resultaten, hervatten en een ontbrekende database-uitbreiding gecontroleerd. De mobiele controle op 390 × 844 pixels toont geen horizontale overloop.

De release is overgezet op GitHub-versie `841154b`, zodat de inmiddels toegevoegde ontvangstworkflow en bewerking van bestelregels behouden blijven. De gezamenlijke testset geeft 19 geslaagde en 2 mislukte tests. Beide mislukkingen zijn afzonderlijk gereproduceerd op de ongewijzigde GitHub-versie: de fototest verwacht nog een oude EHBO-terugvalafbeelding, en de test voor achtergrondverversing mist de inmiddels gebruikte variabele `receiptBusy` in zijn testomgeving. Die bestaande testproblemen zijn buiten deze release gehouden.

De Supabase Security Advisor meldt aandachtspunten voor bestaande SECURITY DEFINER-functies en uitgeschakelde bescherming tegen gelekte wachtwoorden. Deze melding vraagt afzonderlijke beoordeling van de bestaande inrichting; ze betreft geen nieuwe winkelwagenfunctie. De nieuwe functies gebruiken SECURITY INVOKER en weigeren anonieme aanroepen.

## Herstel na gebruikerstest

Op 28 september bleek bij de handdoeken alleen de homepage opgeslagen. Jorn heeft de exacte productlink opnieuw aangeleverd. De productpagina is gecontroleerd: artikel SDR02017, 2-laags huismerk, geschikt voor Tork H2, 20 pakken van 120 vellen. De productreferentie is via `20260928_herstel_handdoeken_productreferentie.sql` hersteld. De bestelde eenheid, prijzen en historische bestelregels zijn behouden. Na opnieuw openen wordt de gewijzigde catalogusreferentie meegenomen; een eerder gemaakte snapshot blijft als geschiedenis bewaard.

Jorn heeft vervolgens ook de zes ontbrekende productlinks aangeleverd. Deze zijn op de productpagina's gecontroleerd en via `20260928_herstel_zes_productreferenties.sql` in de live catalogus opgeslagen, inclusief artikelnummer: Glorix SGL00700, schuurspons SDR00019, vaatwastabletten SAT00087, handzeep SDR06201, toiletpapier SDR02112 en keukenrol SDR02031. De keukenrol is op zijn aanwijzing gecorrigeerd naar 2 rollen van 50 vellen in naam, eenheid en omschrijving. Historische bestelregels en prijzen blijven behouden. Eerdere regels met een verpakking van 4 rollen blijven door de bestaande verpakkingscontrole geblokkeerd totdat een bevoegde gebruiker de bestelling controleert en aanpast.

Automatisch vullen is uitsluitend bedoeld voor desktop en laptop, voor Jorn en Kathleen. Een smartphone hoeft geen overdracht te kunnen starten. Deze keuze is bevestigd door Jorn; de browserkoppeling zelf is nog niet geïmplementeerd.

De gebruikersinterface vermeldt nu vóór elke registratie dat geen winkelwagen wordt gevuld. Een homepage zonder artikelnummer krijgt een specifieke foutmelding. Automatisch vullen blijft onvoltooid en vereist een expliciet gekoppelde browseromgeving; herstelde productlinks alleen lossen dit niet op.

Na dit herstel slagen alle twaalf gerichte model- en databasetests en de productiebuild. De aangepaste dialoog is in de browser gecontroleerd op de waarschuwing, de geblokkeerde regel en het behoud van de overige productregels.

</details>
