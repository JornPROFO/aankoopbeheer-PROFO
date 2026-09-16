# Bestelregels aanpassen

Aankoopbeheer kan bij **Bestellingen → Bestelregels aanpassen** een catalogusproduct en aantal toevoegen of een bestaande regel verwijderen. Dit kan zolang de bestelling nog niet extern is geplaatst. Voeg bij vervanging eerst het nieuwe product toe; er blijft minstens één regel in de bestelling.

Toevoegen wordt meteen opgeslagen. Voor verwijderen verschijnt een bevestiging met product, aantal en bedrag. Het totaal, de btw en de invoerlijst worden automatisch bijgewerkt. De goedkeuringsstatus, oorspronkelijke opmerkingen en bestaande prijzen van andere regels blijven behouden. De invoerlijst voor externe sites toont de gewijzigde bestelling zodra ze goedgekeurd of in behandeling is. Er wordt door deze bewerking geen e-mail verzonden.

Nieuwe regels gebruiken de actuele catalogusprijs. Het catalogusveld `prijs_excl_btw` bevat historisch de prijs **inclusief** btw; de nieuwe functie volgt dezelfde berekening als de bestaande winkelmand.

## Installatie en controle

Voer `supabase/manual-sql/20260916_bestelregels_beheren.sql` uit vóór de frontend wordt gepubliceerd. De functie gebruikt `SECURITY INVOKER`, de bestaande beheerderscontrole en RLS. De transactie vergrendelt de bestelling, controleert `updated_at`, verwerkt één regel en schrijft totalen en historiek samen weg. Een request-id voorkomt dubbele uitvoering na een onzekere netwerkuitkomst.

De tabel `aankoop_bestelregel_wijzigingen` bewaart de volledige toegevoegde of verwijderde regel, het tijdstip, de ingelogde actor en het totaal vóór en na de wijziging. Deze tabel is alleen leesbaar door aankoopbeheer; de frontend heeft geen update- of verwijderrecht op deze historiek.

Validatie: `node --test tests/order-editing.test.mjs` en `npm run build`. `tests/order-editing-rollback.sql` controleert de echte functie onder de authenticated-rol, inclusief herhalen, verouderde versies, ongeldige aantallen, verwijderen, historiek, statusbeperking en onbevoegde toegang. De volledige testtransactie wordt teruggedraaid.
