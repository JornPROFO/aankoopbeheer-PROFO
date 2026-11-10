# Wekelijkse cataloguscontrole

De controle draait binnen het bestaande Supabase-project. De computer van de beheerder, Codex, een browsersessie en leveranciersaccounts zijn niet nodig. De databankplanning start elke maandag om 08.00 uur in `Europe/Brussels`; zomer- en wintertijd worden door PostgreSQL berekend. De minutentaak verstuurt alleen werk wanneer een wekelijkse controle of een herneming klaarstaat.

Elke ronde leest de actuele producten en cartridges, inclusief inactieve historische regels. De vrije aanvraagregel zonder leveranciersartikel wordt overgeslagen. De referenties van de 263 concrete artikelen zijn bij ingebruikname vergeleken met de afzonderlijk gecontroleerde leveranciersgegevens van 10 november 2026. Deze brongegevens en de volledige database-export worden niet in de publieke Git-repository opgenomen.

## Werking en grenzen

De worker volgt gecontroleerde doorverwijzingen en controleert artikelnummer, leveranciers-ID, naam inclusief verpakking en geselecteerde variant. Hij controleert ook het bestandstype en de inhoud van afbeeldingen. Alleen een link of afbeelding van hetzelfde bevestigde artikel mag worden aangepast. Een gezonde bestaande alternatieve productfoto blijft behouden zolang de officiële bronfoto niet verandert.

Een ontbrekende referentie, gewijzigde verpakking, ander artikel, verdwenen variant, onbeschikbaarheid, onverwachte host of leverancierspagina zonder betrouwbare productgegevens vraagt beoordeling. Er worden geen vervangende artikelen gekozen. Een foutmelding of aanmeldpagina wordt nooit een productlink. Nieuwe artikelen zonder bevestigde bronreferentie worden zichtbaar gemeld; hun identiteit mag niet op basis van alleen een gelijkende naam worden aangenomen.

De worker mag geen prijzen, artikelcodes, verpakkingseenheden, statussen of bestellingen veranderen. De transactie vergelijkt de actuele volledige catalogusregel met de vooraf gelezen regel. Een tussentijdse beheerwijziging blokkeert de automatische correctie voor die regel. De volgende ronde leest de actuele toestand opnieuw.

## Planning en herstel

De SQL-migratie maakt de planning aanvankelijk inactief. Na validatie kan de databasebeheerder `aankoop_catalogus.config.enabled` inschakelen. `next_run_at` bevat de concrete volgende uitvoering. `aankoop_catalogus.start_run(true)` maakt een testronde zonder cataloguswijzigingen; `false` past uitsluitend bevestigde link- en fotocorrecties toe. Er kan maar één ronde tegelijk lopen.

Per taak worden maximaal acht regels gecontroleerd, met drie gelijktijdige leveranciersaanvragen. Een aanvraag heeft een beperkte looptijd en bestandsgrootte. Tijdelijke netwerk- en serverfouten krijgen één herpoging binnen de tijdslimiet. De database herneemt vastgelopen taken na vier minuten, maximaal drie pogingen. Definitief mislukte taken blijven als fout in het logboek staan; de overige taken gaan door.

Elke taak krijgt een willekeurige code van 256 bits, vier minuten geldig. De databank bewaart alleen de hash; de aanvraagcode wordt eenmalig geclaimd en bij afronding gewist. De gateway-JWT-controle staat uitsluitend voor `cataloguscontrole` uit, omdat dit endpoint zijn eigen taakcode valideert. Ongeldige, verlopen of hergebruikte codes worden geweigerd. De Supabase-servicesleutel blijft binnen de serveromgeving. De interne tabellen en worker-RPC's zijn niet bereikbaar voor gewone appaccounts.

Het logboek in **Beheer > Cataloguscontrole** is alleen leesbaar door actieve aankoopbeheerders. Jorn krijgt bij correcties of aandachtspunten een interne melding in Aankoopbeheer. Er wordt geen e-mail verstuurd en er wordt geen winkelwagen gevuld of bestelling geplaatst. Een ongewijzigde succesvolle ronde geeft geen melding.

Supabase beheert de rechten op de `pg_net`-wachtrij zelf; `postgres` kan die niet intrekken. Daarom moet `net` buiten de blootgestelde Data API-schema's blijven. Een directe databanklogin kan tijdelijk in de wachtrij kijken. De wachtrij bevat uitsluitend de beperkte taakcode, nooit een servicesleutel; de HTTP-antwoorden bevatten alleen het aantal verwerkte regels. Dit is gecontroleerd via de echte Data API en sluit aan bij de [Supabase-uitleg over pg_net-rechten](https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).

## Publicatie en verificatie

1. Controleer de live projectidentiteit, maak een catalogusmomentopname en voer uitsluitend `supabase/migrations/20261110142537_cataloguscontrole_cloud.sql` uit. Importeer de bevestigde bronreferenties afzonderlijk via de beheerverbinding; publiceer geen database-export.
2. Publiceer alleen deze functie met `supabase functions deploy cataloguscontrole --project-ref rxkffollbimmsvwhucgd --use-api --no-verify-jwt`.
3. Voer de unit-tests en `tests/cataloguscontrole-rollback.sql` uit. Controleer de RLS-zichtbaarheid als beheerder én gewone gebruiker en controleer het endpoint met een ongeldige taakcode.
4. Laat eerst een volledige testronde op de server draaien. Controleer alle regels, eindstatus, HTTP-resultaten en ongewijzigde hashes van catalogus en bestellingen. Activeer daarna de planning en bewijs een uitvoering die door `pg_cron` gestart is.
5. Publiceer de frontend en controleer het logboek met de echte beheerderssessie, ook op smalle schermen. Pauzeer de oude lokale Codex-planning pas nadat de serveruitvoering is bewezen.

Een beheerder kan de toekomstige weekrondes pauzeren met `update aankoop_catalogus.config set enabled=false where id;`. Een reeds lopende ronde wordt dan nog afgewerkt. Onderbreek een actieve ronde alleen na afzonderlijke controle van de lopende taken. Het uitschakelen van de planning verandert geen catalogusregels of bestelgegevens.

Bronnen: [Supabase: Edge Functions plannen](https://supabase.com/docs/guides/functions/schedule-functions), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [limieten van Edge Functions](https://supabase.com/docs/guides/functions/limits). Gecontroleerd op 10 november 2026.
