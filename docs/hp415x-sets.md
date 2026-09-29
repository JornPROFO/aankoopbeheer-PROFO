# HP 415X: productlinks en sets

De vier 123inkt-huismerktoners W2030X/W2031X/W2032X/W2033X gebruiken sinds 29 september 2026 de exacte Belgische productpagina's. De koppelingen voor Mechelen, Nieuwpoort, Oudenaarde en Sint-Niklaas zijn bijgewerkt. Bestaande inactieve duplicaten blijven inactief.

De set (123inkt-artikel 132198) bevat één zwarte, cyaan, gele en magenta toner. De gecontroleerde prijs op 29 september 2026 is 532,50 euro inclusief 21% btw. De prijs blijft bewerkbaar in printerbeheer.

Bij het bewaren en laden van de winkelmand worden volledige combinaties voor dezelfde printer omgezet naar de gekoppelde set. Bij ongelijke aantallen blijven de extra losse toners behouden. Bestaande expliciet gekozen sets worden opgeteld. De omzetting gebeurt uitsluitend voor de exact gecontroleerde huismerklinks, met één actieve catalogusregel per kleur en set. Ontbrekende, onduidelijke, inactieve of duurdere sets worden niet automatisch gebruikt. Andere printerfamilies en originele HP-toners blijven ongewijzigd.

De gewone winkelmand, bestelcontrole, opgeslagen bestelregels en leverancieroverdracht gebruiken daardoor dezelfde setregel, verpakking en prijs. Er wordt geen bestelling bij de leverancier geplaatst.

Bestelling 17 is afzonderlijk gecorrigeerd: de vier opgeslagen tonerlinks zijn vervangen. Het goedgekeurde bedrag (570,98 euro), de acht bestelregels, aantallen en goedkeuringsstatus zijn behouden. Reeds verzonden e-mails worden niet gewijzigd of opnieuw verzonden.

Data-aanpassing: `supabase/manual-sql/20260929_hp415x_links_en_sets.sql`. Deze is uitgevoerd en gecontroleerd: 36 cataloguslinks (inclusief inactieve kopieën), vier setkoppelingen en vier links in bestelling 17. De gegevens vóór de wijziging zijn lokaal bewaard in `tmp/hp415x-before.json` van de hoofdwerkruimte.

Verificatie: `node --test tests/ink-bundles.test.mjs tests/supplier-cart.test.mjs` en `npm run build`.
