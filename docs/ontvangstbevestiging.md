# Ontvangstbevestiging door de besteller

Zodra aankoopbeheer een bestelling via de app op **Besteld** zet, krijgt de besteller naast de bestaande statusmail een e-mail met de vraag om de ontvangst te bevestigen. De link opent de betrokken bestelling na aanmelding met het PROFO-account. De mail vraagt om te bevestigen zodra de spullen aankomen; de verwachte leverdatum geldt niet als bewijs van ontvangst.

Bij bestaande bestellingen met status Besteld of Gedeeltelijk geleverd kan aankoopbeheer **Ontvangstbevestiging vragen per mail** kiezen. De aanvraag verschijnt ook in de app van de besteller. Een reeds verzonden aanvraag wordt niet opnieuw verstuurd bij herhaalde klikken. Als de mail niet kon worden verzonden, blijft de aanvraag zichtbaar en kan aankoopbeheer de verzending opnieuw proberen.

De besteller vult per artikel het totaal ontvangen aantal verpakkingen in. **Alles is ontvangen: aantallen invullen** vult alle aantallen; de besteller moet daarna nog **Ontvangst bevestigen** kiezen. Bij een nalevering vult de besteller de nieuwe cumulatieve aantallen in. Eerdere ontvangen aantallen kunnen niet worden verminderd. Een foutieve eerdere bevestiging moet aan aankoopbeheer worden gemeld; deze versie heeft geen correctieknop voor ontvangsthistoriek.

Bij gedeeltelijke ontvangst krijgt de bestelling de status Gedeeltelijk geleverd. Bij volledige ontvangst wordt dit Geleverd. Geannuleerde regels tellen niet mee. Prijzen, bestelregels en betaalgegevens worden niet gewijzigd. Opmerkingen zijn optioneel; er worden geen vertrouwelijke persoonsgegevens gevraagd.

Alle actieve gebruikers met rol Beheerder aankoop of Superadmin krijgen een interne melding. Zij zien de bevestiging, het tijdstip, de naam van de besteller en de nog te ontvangen aantallen. Historische bevestigingen worden bewaard; het scherm toont de meest recente bevestiging. Deze functie verstuurt geen automatische periodieke herinneringen.

## Installatie en controle

1. Voer `supabase/manual-sql/20260917_ontvangstbevestiging.sql` uit.
2. Publiceer Edge Function `aankoop-ontvangst` met JWT-verificatie ingeschakeld. De functie valideert bovendien het account via `getUser` en de actieve gebruiker. De bestaande `RESEND_API_KEY` en `MAIL_FROM` worden gebruikt.
3. Publiceer de frontend.

De tabellen hebben RLS en uitsluitend leesrechten voor ingelogde gebruikers met toegang tot de bestelling. De transactionele schrijffunctie is alleen uitvoerbaar door de serverrol. De Edge Function ontleent de actor aan de gecontroleerde aanmelding. De database controleert daarnaast bestellereigenaarschap, actieve gebruiker, status, versie en aantallen. Dubbele bevestigingen met hetzelfde kenmerk zijn idempotent. Resend-verzoeken gebruiken het opgeslagen aanvraagkenmerk als idempotentiesleutel.

Validatie: `node --test tests/receipt.test.mjs tests/order-editing.test.mjs`, `npm run build` en `tests/receipt-rollback.sql`. De SQL-test gebruikt tijdelijke testgegevens en eindigt met ROLLBACK; er worden geen testmails verstuurd. De Supabase Security Advisor rapporteerde geen waarschuwing voor de nieuwe tabellen of functie; bestaande projectwaarschuwingen zijn buiten deze wijziging gelaten.
