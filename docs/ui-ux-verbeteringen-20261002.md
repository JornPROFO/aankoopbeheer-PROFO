# Verbeteringen in bediening en opvolging

## Wijzigingen

1. De hoofding is compacter. Accountacties en de bestaande weergavekeuzes staan onder de gebruikersnaam. Zoeken blijft zichtbaar; de overige bestelfilters staan in een uitklapbaar vak. Op smalle schermen krijgen alle velden voldoende breedte.
2. Bestelkaarten tonen eerst nummer, locatie, besteller, bedrag, voortgang en de volgende actie. Details blijven beschikbaar. Bij de besteller verschijnt de ontvangstbevestiging bovenaan de uitgeklapte kaart.
3. De besteller kiest een gedeeltelijke of volledige levering en vult alleen de vandaag ontvangen aantallen in. De app telt eerdere leveringen mee. Een afzonderlijke controle gaat vooraf aan het opslaan. Een herhaalde poging gebruikt dezelfde beginstand, bestelversie en aanvraagcode.
4. Het startscherm toont vervolgstappen volgens de rol. Het vak ‘EHBO-status: Op peil’ is verwijderd. Er is geen voorraadbeheer toegevoegd.
5. Productkaarten tonen het aantal in de winkelmand met plus- en minknoppen. Op smartphone blijft een winkelmandknop met bedrag zichtbaar, naast het hulpvosje.
6. De leveranciersoverdracht toont vijf stappen en verwijst bij een blokkering naar de passende vervolgstap. Na externe aankoop kan aankoopbeheer vanuit dit venster de bestaande registratie met leverdatum openen. De app rekent niet automatisch af en registreert niet alleen op basis van een gevulde winkelwagen.
7. Het vosje opent het relevante hoofdstuk in een nieuw tabblad. De handleiding in de app en de lokale tekstversie zijn bijgewerkt.

## Controle

De productiebuild slaagt. De relevante tests voor ontvangst, bestelregels, weergave, hulp, tonersets en leveranciersoverdracht slagen: 47 tests. De ontvangsttests omvatten deelleveringen, ongeldige aantallen, geannuleerde regels en een herhaling na een verloren antwoord. De overdrachtstest controleert dat registratie pas volgt op de expliciete bevestiging van de externe aankoop.

De interface is in Chrome gecontroleerd met lokale demogegevens op 320, 390 en 1536 pixels breed. De zes extra filters blijven bruikbaar zonder horizontale overloop. De mobiele hoofding meet circa 69 pixels; de gesloten demobestelling circa 365 pixels. Plus/minbediening, behoud van toetsenbordfocus, donkere en rustige weergave en rechtstreekse hoofdstuklinks zijn gecontroleerd. Bij een eerdere levering van 2 dozen en een nieuwe levering van 1 toont de app 3 ontvangen; ‘Alles ontvangen’ vult daarna de resterende 2 van de 5 in.

Deze validatie maakt geen echte bestellingen aan, verstuurt geen testmails en wijzigt geen ontvangstgegevens in productie. De database en browserextensie zijn voor deze wijziging niet aangepast.
