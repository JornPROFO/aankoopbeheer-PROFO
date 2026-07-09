# PROFO Aankoopbeheer - security-roadmap en rollenmatrix

Laatste bijwerking: 09/07/2026

## Kern

PROFO Aankoopbeheer moet evolueren van een werkende piloot naar een beheerste interne toepassing. Dat betekent niet dat de app zwaarder of ingewikkelder moet worden voor medewerkers. Het betekent wel dat rollen scherp staan, dat gegevens beperkt blijven tot wat nodig is, dat logging bruikbaar is, dat incidenten kunnen worden opgevolgd en dat afspraken intern gedocumenteerd zijn.

Voor deze toepassing gaat het niet over voertuigen, ritten of reservaties, maar over interne bestellingen, producten, EHBO-aanvullingen, inkt en toner, leveranciersinformatie, gebruikers en locaties. De privacy- en veiligheidslogica blijft dezelfde: medewerkers mogen vlot kunnen bestellen, maar niet meer gegevens zien of wijzigen dan nodig is voor hun opdracht.

Deze roadmap sluit aan bij de AVG/GDPR, in het bijzonder artikel 25 over gegevensbescherming door ontwerp en standaardinstellingen, artikel 30 over het verwerkingsregister, artikel 32 over passende beveiliging en artikel 33 over de opvolging van persoonsgegevenslekken. Voor de technische invulling gebruiken we Supabase Row Level Security als toegangsgrens in de databank en OWASP ASVS als praktische beveiligingschecklist.

## Uitgangspunten

De gebruikersinterface mag helpen om de app begrijpelijk te houden, maar mag niet de enige beveiliging zijn. Wat een gebruiker wel of niet mag zien, moet uiteindelijk afgedwongen worden in Supabase via RLS-policies en niet alleen via verborgen knoppen in de browser.

De app verwerkt in principe gewone persoonsgegevens van medewerkers: naam, e-mailadres, rol, locatie, bestelgedrag, opmerkingen bij bestellingen en opvolgingsinformatie. Er worden normaal geen bijzondere categorieen van persoonsgegevens verwerkt. Toch kan een vrije opmerking onverwacht gevoelige informatie bevatten. Daarom moet de app ook daar terughoudend mee omgaan: geen onnodige vrije tekstvelden, duidelijke instructie bij opmerkingen en beperkte zichtbaarheid.

Bestellingen zijn organisatiegegevens met een persoonsgegevenscomponent. De verwerking is functioneel nodig om interne aankopen te beheren, maar dat betekent niet dat alle medewerkers alle bestellingen moeten kunnen zien.

## Rollenmatrix

| Rol | Doel | Mag zien | Mag aanmaken | Mag wijzigen | Mag verwijderen |
| --- | --- | --- | --- | --- | --- |
| Gebruiker | Bestellen voor de eigen werking of locatie | Eigen bestellingen en eigen concepten. Productcatalogus, EHBO-lijst en inkt/tonerkeuzes die actief bestelbaar zijn. | Nieuwe bestellingen, concepten en opmerkingen bij de eigen bestelling. | Eigen concepten en eigen nog niet verwerkte aanvragen beperkt corrigeren, zolang de bestelling nog niet in behandeling is. | Geen harde delete. Hoogstens eigen concept leegmaken of annuleren als dat functioneel voorzien wordt. |
| Beheerder aankoop | Bestellingen verwerken en catalogus beheren | Alle bestellingen, bestelregels, producten, EHBO-artikelen, inkt/toner, printers, leveranciersinformatie en analyses. | Producten, catalogusregels, printer- en tonerregels, statusnotities en verwerkingsacties. | Statussen, productgegevens, prijzen, actieve/inactieve artikelen, catalogusvolgorde, mailopvolging en verwerkingsnotities. | Geen gewone delete in de app. Deactiveren of archiveren is de standaard. |
| Superadmin | Technisch en uitzonderlijk beheer | Alles wat nodig is voor technische ondersteuning, rechtenbeheer en incidentopvolging. | Gebruikers- en rolconfiguratie, technische correcties, noodherstelacties. | RLS- en configuratiecorrecties, gebruikersactivatie, noodcorrecties en technische instellingen. | Alleen uitzonderlijk en gedocumenteerd. Harde delete gebeurt niet als normale beheeractie. |
| Locatieverantwoordelijke of regiodirecteur | Mogelijke latere rol voor lokale opvolging | Bestellingen van de eigen locatie of regio. | Eventueel bestellingen namens de locatie. | Eventueel status of interne toelichting voor de eigen locatie, als PROFO dat beleidsmatig wil. | Geen delete. |

Voorlopig blijft een regiodirecteur in Aankoopbeheer best gewoon gebruiker, tenzij PROFO expliciet beslist dat lokale opvolging van bestellingen op regio- of locatieniveau nodig is. Die keuze is organisatorisch belangrijker dan technisch: zodra een regiodirecteur meer ziet dan eigen bestellingen, ontstaat er een ruimere verwerkingsnoodzaak die ook in het verwerkingsregister en de privacy-informatie moet worden beschreven.

## Praktische rechten per onderdeel

| Onderdeel | Gebruiker | Beheerder aankoop | Superadmin |
| --- | --- | --- | --- |
| Productcatalogus | Actieve producten zien en bestellen. | Producten toevoegen, corrigeren, deactiveren en prijzen beheren. | Technische correcties en bulkherstel. |
| EHBO | Actieve EHBO-aanvulartikelen zien en bestellen. | EHBO-lijst beheren, prijzen/afbeeldingen aanvullen en niet-bestelbare regels deactiveren. | Technische correcties en bulkimport. |
| Inkt en toner | Alleen actieve, bestelbare cartridges/toners zien per gekozen printer. | Printers, cartridges, prijzen en leverancierslinks beheren. Inactieve regels mogen in beheer zichtbaar blijven. | Technische correcties en RLS-controle. |
| Bestellingen | Eigen bestellingen en eigen concepten zien. | Alle bestellingen opvolgen en statussen beheren. | Alles voor technische ondersteuning en audit. |
| Analyse | Niet zichtbaar. | Overzichten voor opvolging, budgetindicatie en bestelpatronen. | Volledige controle, inclusief technische analyses. |
| Gebruikers | Eigen identiteit via login. Geen gebruikersbeheer. | Normaal geen gebruikersbeheer, tenzij PROFO dat expliciet toewijst. | Gebruikers activeren/deactiveren en rollen beheren. |
| Mailstatus | Eigen bevestiging en beperkte melding in de app. | Mailstatus opvolgen bij verwerking. | Technische foutanalyse. |

## RLS-richting per tabel

De exacte SQL moet nog per tabel worden afgetoetst, maar de gewenste richting is duidelijk.

| Tabel | Select | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| `gebruikers` | Gebruiker ziet alleen zichzelf. Beheerders/superadmin zien wat nodig is voor verwerking. | Alleen superadmin of gecontroleerde import. | Alleen superadmin voor activatie, deactivatie en rol. | Niet via app. |
| `locaties` | Actieve locaties zichtbaar voor ingelogde gebruikers. | Alleen beheerder/superadmin. | Alleen beheerder/superadmin. | Niet via app. |
| `aankoop_producten` | Gebruikers zien alleen actieve en bestelbare producten. Beheer ziet ook inactieve regels. | Beheerder/superadmin. | Beheerder/superadmin. | Niet via app; deactiveren. |
| `aankoop_printers` | Gebruikers zien alleen actieve printers voor hun bestelproces. Beheer ziet ook inactieve printers. | Beheerder/superadmin. | Beheerder/superadmin. | Niet via app; deactiveren. |
| `aankoop_printer_cartridges` | Gebruikers zien alleen actieve bestelbare regels. Beheer ziet ook concepten en inactieve regels. | Beheerder/superadmin. | Beheerder/superadmin. | Niet via app; deactiveren. |
| `aankoop_bestellingen` | Gebruiker ziet eigen bestellingen. Beheerder ziet alle bestellingen. | Ingelogde actieve gebruiker. | Gebruiker beperkt zolang concept of nog niet verwerkt. Beheerder voor status en opvolging. | Niet via app. |
| `aankoop_bestelregels` | Zelfde zichtbaarheid als de bovenliggende bestelling. | Via bestelling door actieve gebruiker. | Beperkt zolang concept of nog niet verwerkt. | Niet via app. |
| `aankoop_statuslog` | Gebruiker ziet relevante status op eigen bestelling. Beheer ziet log voor opvolging. | Automatisch via statuswijziging. | Niet manueel, tenzij technische correctie. | Niet via app. |
| `aankoop_audit_log` | Niet zichtbaar voor gewone gebruiker. Beperkt zichtbaar voor beheer/superadmin. | Automatisch. | Niet manueel. | Niet via app. |

De belangrijkste technische afspraak is dat delete voor gewone gebruikers nergens nodig is. Functioneel verwijderen betekent in deze app: concept leegmaken, bestelling annuleren, product deactiveren of regel archiveren. Harde delete blijft voor uitzonderlijk technisch onderhoud en moet traceerbaar zijn.

## Logging en aantoonbaarheid

Voor Aankoopbeheer moet logging vooral bruikbaar zijn. We moeten kunnen aantonen wie een bestelling heeft ingediend, wie de status heeft gewijzigd, wanneer dat gebeurde en welke verwerking daarna volgde. Voor catalogusbeheer is relevant wie producten, prijzen, leverancierslinks of actieve status heeft aangepast.

Minimaal te loggen:

- aanmaak van bestelling;
- wijziging van status;
- wijziging van productprijs, productnaam, leverancierlink of actieve status;
- wijziging van inkt/toner-koppeling, prijs of actieve status;
- activatie/deactivatie van gebruiker;
- mislukte of verdachte toegangspogingen voor zover technisch beschikbaar zonder disproportionele logging.

Bij elke auditregel is het doel: aantoonbaarheid zonder overmatige technische ruis. Een log moet helpen bij interne controle, foutcorrectie, incidentopvolging en vragen van betrokkenen. Logbestanden mogen zelf geen tweede onbeperkte gegevensbron worden.

## Verwerkingsregister en privacy-nota

Voor het PROFO-verwerkingsregister is een aparte fiche nodig voor Aankoopbeheer. Die fiche moet minstens bevatten:

- doel: intern aanvragen, verwerken en opvolgen van aankopen en verbruiksgoederen;
- betrokkenen: medewerkers en eventueel personen die namens een locatie bestellen;
- gegevenscategorieen: naam, e-mailadres, rol, locatie, bestelgegevens, opmerkingen, statusinformatie, mailstatus en technische logging;
- ontvangers: interne beheerders, eventueel mailprovider, Supabase als verwerker en Vercel/GitHub voor hosting/deployment waar relevant;
- bewaartermijnen: beleidsmatig vast te leggen;
- beveiligingsmaatregelen: login, actieve gebruikerslijst, rollen, RLS, beperkte zichtbaarheid, logging, back-up/herstel en beheer van secrets;
- rechten van betrokkenen: inzage, correctie en relevante privacyvragen via de bestaande PROFO-kanalen.

Daarnaast hoort er een korte gebruikersnota in gewone taal te komen. Die moet niet juridisch zwaar zijn, maar wel duidelijk maken waarom de app gegevens gebruikt, wie wat kan zien en bij wie medewerkers terechtkunnen met vragen.

## Bewaartermijnen

De bewaartermijnen moeten nog beleidsmatig worden vastgelegd. Mijn voorstel als werkbasis:

| Gegevens | Voorstel bewaartermijn | Reden |
| --- | --- | --- |
| Conceptbestellingen | 3 tot 6 maanden | Concepten zijn werkmateriaal en hoeven niet lang te blijven staan. |
| Ingediende bestellingen en bestelregels | 5 tot 7 jaar | Nuttig voor interne controle, budgetopvolging, leveranciersvragen en boekhoudkundige aansluiting. Afstemming met boekhouding is nodig. |
| Statuslogs | Zelfde termijn als bestelling | Nodig om verwerking en beslissingen te kunnen reconstrueren. |
| Catalogusgegevens | Actief zolang artikel gebruikt wordt; daarna historisch bewaren zolang bestellingen ernaar verwijzen | Oude bestellingen moeten begrijpelijk blijven. |
| Gebruikersgegevens | Actief zolang medewerker toegang nodig heeft; daarna deactiveren en beperken | Deactiveren is beter dan verwijderen zolang historische bestellingen gekoppeld blijven. |
| Technische logs | Kort en doelgericht, bijvoorbeeld 6 tot 12 maanden | Nuttig voor beveiliging en foutanalyse, maar niet bedoeld als permanente personeelsregistratie. |

Dit zijn voorstellen, geen definitief beleid. De definitieve termijn moet afgestemd worden met boekhouding, directie en DPO-context.

## Incidenten en datalekken

Niet elk incident is een datalek, en niet elk datalek moet aan de toezichthouder gemeld worden. Wel moet elk relevant privacy- of beveiligingsincident intern snel beoordeeld en gedocumenteerd worden.

Voor Aankoopbeheer zijn realistische incidenten bijvoorbeeld:

- een gedeactiveerde gebruiker blijft toegang hebben;
- een gewone gebruiker ziet bestellingen van anderen;
- een beheerder zet per ongeluk een grote set gegevens publiek of exporteert die foutief;
- een fout in RLS maakt tabellen breder zichtbaar dan bedoeld;
- een mail met bestelgegevens wordt naar een verkeerde ontvanger gestuurd;
- een token, sleutel of service role key raakt zichtbaar.

De werkafspraak moet zijn dat een vermoed incident onmiddellijk intern wordt gemeld aan de functionele beheerder en DPO-context. Daarna wordt beoordeeld of er sprake is van een persoonsgegevenslek, welke personen geraakt kunnen zijn, welke maatregelen genomen zijn en of melding aan de Gegevensbeschermingsautoriteit nodig is. De AVG vermeldt bij een meldingsplicht aan de toezichthouder een termijn van uiterlijk 72 uur nadat de verwerkingsverantwoordelijke kennis heeft gekregen van het lek, tenzij het onwaarschijnlijk is dat het lek een risico inhoudt voor de rechten en vrijheden van natuurlijke personen.

## Back-up en herstel

Het is onvoldoende om te zeggen dat de data in Supabase staat. We moeten concreet weten wat er gebeurt bij foutieve wijziging, misbruik van een account, verkeerde bulkimport of beschadigde gegevens.

Te testen:

- herstel van een foutief gewijzigde productprijs;
- herstel van een foutief gedeactiveerde gebruiker;
- herstel van een verkeerd uitgevoerde SQL-import;
- controle of historische bestellingen begrijpelijk blijven na productdeactivatie;
- controle of service keys niet in de frontend of repository terechtkomen;
- procedure voor wie beslist wanneer een herstelactie wordt uitgevoerd.

## Technische veiligheidscheck

Voor deze toepassing is een compacte OWASP ASVS-check voldoende als werkbasis. Focuspunten:

- authenticatie: alleen PROFO-accounts en actieve gebruikers;
- toegangscontrole: RLS per tabel, geen vertrouwen op verborgen knoppen;
- inputvalidatie: vrije tekst, URL's, prijzen, aantallen en statuswaarden;
- foutmeldingen: begrijpelijk voor gebruiker, niet te technisch;
- logging: statuswijzigingen en beheeracties aantoonbaar;
- secrets: geen service role key in frontend, `.env` niet publiceren;
- opslag: geen gevoelige documenten of exports publiek beschikbaar;
- dependencybeheer: npm-afhankelijkheden regelmatig controleren;
- deployment: Vercel-variabelen en Supabase-configuratie documenteren.

## Testscenario's met echte rollen

Minimaal te testen voor ingebruikname:

1. Gewone gebruiker ziet geen Beheer en Analyse.
2. Gewone gebruiker kan een bestelling indienen voor een actieve locatie.
3. Gewone gebruiker ziet alleen eigen bestellingen.
4. Gewone gebruiker kan geen producten, prijzen, printers of cartridges aanpassen.
5. Gewone gebruiker ziet bij inkt/toner alleen actieve bestelbare keuzes.
6. Beheerder ziet alle bestellingen en kan statussen wijzigen.
7. Beheerder kan producten, EHBO-artikelen, printers en cartridges beheren.
8. Gedeactiveerde gebruiker kan niet meer binnen.
9. Gebruiker probeert via browsertools een product of bestelling van iemand anders aan te passen; RLS moet dit blokkeren.
10. Beheerder deactiveert een product; het product verdwijnt uit de gewone catalogus maar blijft historisch begrijpelijk in oude bestellingen.
11. Mailfout blokkeert de bestelling niet, maar wordt zichtbaar voor beheer.
12. Een testincident wordt geregistreerd en beoordeeld volgens de datalekprocedure.

## Praktische volgorde

1. Rollenmatrix finaliseren en bevestigen wie beheerder en superadmin is.
2. RLS per tabel controleren: select, insert, update en delete.
3. Gebruikersbeheer aanscherpen: alleen actieve PROFO-gebruikers, deactiveren in plaats van verwijderen.
4. Catalogusbeheer opschonen: alleen actieve bestelbare producten in de gewone flow; concepten alleen in beheer.
5. Audit en statuslog vastleggen op de acties die we echt willen kunnen aantonen.
6. Verwerkingsregisterfiche en korte privacy-nota opmaken.
7. Bewaartermijnen afkloppen met boekhouding/directie.
8. Back-up en herstel praktisch testen.
9. OWASP ASVS-light checklist uitvoeren.
10. Testen met echte rollen en daarna pas als beheerste toepassing beschouwen.

## Besluit

De juiste richting is niet om Aankoopbeheer meteen zwaar te formaliseren, maar wel om de basis professioneel vast te zetten. Voor medewerkers moet de app eenvoudig blijven: kiezen, bestellen, opvolgen. Achter de schermen moeten rollen, RLS, logging, bewaartermijnen en incidentopvolging voldoende sterk zijn om de toepassing intern te verantwoorden.

Mijn voorstel is om eerst RLS en rollen technisch af te werken, daarna de verwerkingsfiche en privacy-nota te maken, en vervolgens de audit- en bewaartermijnen definitief te verankeren. Dat is de meest beheerste volgorde.

## Geraadpleegde bronnen

- GDPR-info.eu, tekst van AVG/GDPR artikel 25, 30, 32 en 33, geraadpleegd op 09/07/2026: https://gdpr-info.eu/
- Supabase documentatie over Row Level Security, geraadpleegd op 09/07/2026: https://supabase.com/docs/guides/database/postgres/row-level-security
- OWASP Application Security Verification Standard, geraadpleegd op 09/07/2026: https://owasp.org/www-project-application-security-verification-standard/
- Bestaande PROFO Aankoopbeheer-documenten in Google Drive: gebruik- en testscenario Aankoopbeheer en overdrachtsnota Aankoopbeheer, gecontroleerd op 09/07/2026.
