# PROFO Aankoopbeheer - gebruik en testscenario

Dit document beschrijft hoe de bestelapplicatie praktisch gebruikt en getest wordt. De bedoeling is dat een medewerker op locatie zonder technische uitleg een bestelling kan plaatsen, opvolgen en eventueel later herhalen. Voor beheerders moet duidelijk zijn welke aanvragen nieuw, dringend of in verwerking zijn.

## Gebruik door medewerker

Een medewerker meldt zich aan met het PROFO-account en komt op het startscherm. Daar zijn drie acties onmiddellijk zichtbaar:

- een nieuwe bestelling plaatsen;
- eigen bestellingen opvolgen;
- een recente bestelling opnieuw gebruiken.

Bij een nieuwe bestelling kiest de medewerker de locatie, de besteller, de categorie, de prioriteit en eventueel een gewenste datum. Producten worden eerst in het winkelmandje geplaatst. Pas daarna krijgt de medewerker een samenvatting. Op dat moment kan de bestelling nog aangepast worden. Er worden geen halve bestellingen of conceptbestellingen bewaard: wie indient, maakt bewust een aanvraag aan die ter goedkeuring wordt doorgestuurd.

## Gebruik door goedkeurder

De algemeen directeur en de regiodirecteurs krijgen een aparte goedkeuringsrol. Zij kunnen bestellingen binnen hun bevoegdheid controleren en daarna goedkeuren, weigeren of extra informatie vragen. Pas na goedkeuring komt de bestelling op de invoerlijst voor aankoopbeheer, zodat Jorn of Kathleen ze kan invoeren bij de externe leverancier.

De voorziene goedkeurders zijn Timothy Van Raemdonck, Karima Lakdim, Nathan Blondeel, Annelies Vuye en Joke DeLille. De exacte koppeling tussen regiodirecteur en teamleden wordt beheerd in Supabase via goedkeuringsscopes en moet overeenkomen met de actuele personeels- of teamlijst.

## Gebruik door beheerder

Beheerders kunnen alle bestellingen opvolgen via het overzicht Bestellingen. Daar kan gefilterd worden op locatie, status, categorie, prioriteit, datum en vrije zoektekst. De zoekfunctie kijkt onder meer naar productnaam, locatie, aanvrager en status.

Bij elke bestelling ziet de beheerder minstens:

- aanvrager;
- locatie;
- datum van aanvraag;
- gevraagde producten of materialen;
- categorie;
- prioriteit;
- gewenste datum, als die werd ingevuld;
- toelichting of motivatie;
- mailstatus;
- huidige status.

Een beheerder kan de status aanpassen naar onder meer ter goedkeuring, goedgekeurd, in behandeling, extra informatie gevraagd, geweigerd, besteld, gedeeltelijk geleverd, geleverd of afgesloten. De applicatie probeert elke statuswijziging ook in een aparte statuslog te bewaren. Als die optionele logtabel nog niet in Supabase bestaat, blijft de statuswijziging zelf wel werken.

Voor de praktische verwerking kan de beheerder een invoerlijst voor externe bestelplatformen openen. Die lijst bundelt goedgekeurde en lopende bestelregels per leverancier. De lijst kan via de browser afgedrukt of als PDF bewaard worden. Na invoer op de externe website zet beheer de betrokken bestelling op Besteld.

## Rechten en zichtbaarheid

De applicatie beperkt het gewone gebruikersbeeld tot de eigen bestellingen. Beheerders kunnen ruimer opvolgen. De twee beheeraccounts die functioneel voorzien zijn, zijn:

- jorn.neeus@profo.be;
- kathleen.nerinckx@profo.be.

Belangrijk: de gebruikersinterface is niet de enige beveiliging. Supabase RLS moet de uiteindelijke toegangsgrenzen afdwingen. Test daarom altijd met minstens drie accounts: Jorn, Kathleen en een gewone medewerker.

Te controleren:

- een gewone medewerker ziet geen beheerknop;
- een gewone medewerker kan geen producten aanpassen;
- een gewone medewerker ziet alleen de bestellingen die voor hem of haar bedoeld zijn;
- een goedkeurder ziet alleen bestellingen binnen de toegewezen scope;
- Jorn en Kathleen zien beheer, analyse en alle bestellingen;
- directe databasevragen via de app leveren geen gegevens op buiten de toegelaten rechten.

## Mobiel gebruik

De applicatie moet bruikbaar zijn op smartphone. Test minstens:

- geen horizontale scroll;
- duidelijke knoppen die goed aantikbaar zijn;
- formulieren die onder elkaar vallen;
- productkaarten die leesbaar blijven;
- bestellingen die als kaarten zichtbaar zijn in plaats van brede tabellen;
- winkelmand en samenvatting blijven begrijpelijk op een klein scherm.

## Mailverkeer

De applicatie mag bruikbaar blijven zonder mail. Mail is ondersteunend, niet leidend.

Voorziene automatische mails:

- bevestiging van doorgestuurde bestelling aan de besteller;
- melding aan goedkeurder bij nieuwe bestelling;
- melding aan aankoopbeheer wanneer een bestelling goedgekeurd is;
- melding bij statuswijziging;
- vraag om extra informatie;
- melding bij levering of afsluiting.

Zolang Resend en de DNS-validatie nog niet volledig klaar zijn, moet de interne opvolging via statussen en dashboards blijven werken. Een mailfout mag de bestelling niet blokkeren.

## Testscenario's

1. Meld aan als beheerder en controleer of Start, Nieuwe bestelling, Inkt, Bestellingen, Analyse en Beheer zichtbaar zijn.
2. Meld aan als gewone medewerker en controleer of Analyse en Beheer niet zichtbaar zijn.
3. Plaats een onderhoudsproduct in het winkelmandje.
4. Vul locatie, besteller, categorie, prioriteit en toelichting in.
5. Ga naar de samenvatting van de bestelling.
6. Pas de bestelling in de samenvatting opnieuw aan.
7. Dien de bestelling definitief in.
8. Controleer dat er geen knop of status voor conceptbestellingen zichtbaar is.
9. Controleer als medewerker of de bestelling zichtbaar is bij eigen bestellingen.
10. Controleer als beheerder of dezelfde bestelling zichtbaar is in het beheerbeeld.
11. Filter als beheerder op locatie, status, categorie, prioriteit en datum.
12. Controleer als goedkeurder of de bestelling zichtbaar is binnen de eigen scope.
13. Keur de bestelling goed en controleer of aankoopbeheer daarna een melding krijgt.
14. Test een weigering of vraag om extra informatie.
15. Wijzig als beheerder de status naar in behandeling, besteld en geleverd.
16. Open als beheerder de invoerlijst externe sites en controleer of alleen goedgekeurde of lopende regels per leverancier gegroepeerd staan.
17. Print de invoerlijst of bewaar ze als PDF via de browser.
18. Gebruik een vorige bestelling opnieuw en controleer of de producten opnieuw in het winkelmandje staan.
19. Test de inktmodule: kies locatie, printer en gekoppelde kleuren of set.
20. Test op smartphone of smalle browserbreedte.
21. Test foutafhandeling door verplicht veld leeg te laten.
22. Test dat de applicatie blijft werken wanneer mail tijdelijk faalt.

## Aandachtspunten

De belangrijkste resterende controle zit in RLS en productiepublicatie. De app is voorbereid om veilig en duidelijk te werken, maar de Supabase-regels moeten met echte gebruikers getest worden. Voor Vercel moet de GitHub-repository correct gekoppeld zijn aan het Vercel-account of team dat mag deployen.

Mail via Resend vraagt een geverifieerd domein. Tot dat rond is, blijft interne opvolging via het bestellingenoverzicht de betrouwbare basis.
