# Tijdelijke goedkeuringsverdeling

Op verzoek van Jorn Neeus geldt vanaf 1 oktober 2026:

| Locatie | Tijdelijke goedkeurder |
| --- | --- |
| Merksem | Annelies Vuye |
| Heist Op Den Berg | Karima Lakdim |
| Mechelen | Karima Lakdim |

De oorspronkelijke achttien teamkoppelingen van Nathan (scope-ID's 6 t.e.m. 23, gebruiker 5) worden inactief bewaard. De vervangers krijgen drie locatiekoppelingen. Hun bestaande teamkoppelingen blijven behouden. Nathans account en rol blijven bestaan. De bestaande mailroutering, interne meldingen en toegangscontrole gebruiken dezelfde actieve scopes.

Er is geen einddatum opgegeven. Deze verdeling blijft gelden tot aankoopbeheer vraagt om ze terug te zetten. Er waren bij de controle geen aanvragen met status Nieuw, Ingediend, Ter goedkeuring of Extra informatie gevraagd. Eerdere goedkeuringen en bestelstatussen worden niet gewijzigd.

Uitvoering: `supabase/manual-sql/20261001_tijdelijke_goedkeurders.sql`. De wijziging is transactioneel en controleert de drie accounts en locaties vóór uitvoering.

## Later terugzetten

Alleen op nieuw verzoek: controleer eerst of de personeels- en locatieverdeling nog overeenkomt en of er intussen andere toewijzingen zijn gemaakt. Zet vervolgens in één transactie Nathans oorspronkelijke scope-ID's 6 t.e.m. 23 weer actief en de drie hier toegevoegde locatiekoppelingen (64/13, 33/6, 33/12) inactief. Controleer dan de wachtende aanvragen, toegang en notificatieroute. Verwijder geen historische orders of goedkeuringen.
