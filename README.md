# PROFO Aankoopbeheer

Interne bestelapp voor PROFO vzw. Medewerkers melden aan met hun PROFO-account, kiezen een locatie en besteller uit de bestaande Supabase-lijsten, plaatsen producten in de winkelmand, controleren de samenvatting en dienen de bestelling in.

## Kern

- Startscherm met nieuwe bestelling, opvolging en recente herhaalopties.
- Catalogus met foto, omschrijving, leverancier, eenheid en prijs incl. btw.
- Winkelmand met categorie, prioriteit, gewenste datum, toelichting en samenvatting voor indienen.
- Bestellingen gekoppeld aan bestaande `gebruikers` en `locaties`.
- Duidelijke statussen zonder technische statuscodes in de gebruikersinterface.
- Beheerluik voor producten, prijzen, printers, inkt/toner, analyse en statusopvolging.
- Supabase Edge Function voor automatische mail, zonder dat de werking afhankelijk wordt van mail.

## Gebruik en testen

De praktische gebruiksflow, testscenario's, mobiele controles, rechtencontrole en mailafhankelijkheden staan in:

```text
docs/gebruik-en-testscenario-profo-aankoopbeheer.md
```

Gebruik dat document als vaste checklist wanneer er een nieuwe versie getest wordt met een medewerker, Jorn, Kathleen of een externe beheerder.

De governance-, privacy- en beveiligingsafspraken voor de stap van piloot naar beheerste toepassing staan in:

```text
docs/security-roadmap-en-rollenmatrix-profo-aankoopbeheer.md
```

Gebruik dat document als basis voor de rollenmatrix, RLS-controle, logging, bewaartermijnen, incidentopvolging en de latere verwerkingsregisterfiche.

De installatie als app op laptop, Android en iOS staat in:

```text
docs/installatie-profo-aankoopbeheer.md
```

De mail- en DNS-afspraken voor Resend staan in:

```text
docs/mail-en-dns-resend.md
```

## Supabase

Voer eerst dit bestand uit in de Supabase SQL-editor:

```text
supabase/manual-sql/20260623_aankoopbeheer_schema.sql
```

Selecteer in de Supabase SQL Editor de volledige inhoud van het bestand voordat je op Run klikt. Als alleen een losse regel uit een tabeldefinitie geselecteerd is, bijvoorbeeld `eenheidsprijs_excl_btw numeric(12, 2) not null,`, geeft Supabase terecht een syntax error omdat die regel alleen geldig is binnen het volledige `create table ... );`-blok.

Omdat Aankoopbeheer een apart Supabase-project is, krijgt het project eigen tabellen voor dezelfde basisgegevens. Gebruik daarom deze volgorde:

```text
supabase/manual-sql/20260623_aankoopbeheer_stap_0_basisgegevens.sql
supabase/manual-sql/20260623_aankoopbeheer_stap_1_tabellen.sql
supabase/manual-sql/20260623_aankoopbeheer_stap_2_inrichting.sql
supabase/manual-sql/20260623_aankoopbeheer_stap_3_optionele_koppelingen.sql
```

Voer stap 0 volledig uit om `public.gebruikers` en `public.locaties` in het aankoopproject aan te maken. Voer daarna stap 1, stap 2 en stap 3 volledig uit.

Daarna kan de bestaande gebruikerslijst uit Voertuigenbeheer opnieuw ingeladen worden:

```bash
npm run import:users
```

Voor locaties kan een CSV met kolom `naam` of `locatie` ingeladen worden:

```bash
npm run import:locations -- pad/naar/locaties.csv
```

Er staan ook rechtstreekse SQL-seeds klaar, afgeleid uit de map Voertuigenbeheer:

```text
supabase/manual-sql/seeds/20260623_seed_gebruikers_uit_voertuigenbeheer.sql
supabase/manual-sql/seeds/20260623_seed_locaties_uit_voertuigenbeheer.sql
```

Die kan je na stap 0 rechtstreeks uitvoeren in Supabase.

## Mail

De app mag geen tweede Outlook openen en werkt niet met handmatige mailknoppen. De bedoeling is:

1. de bestelling wordt bewaard in Supabase;
2. de app roept automatisch de Edge Function `send-aankoopbestelling` aan;
3. de besteller krijgt automatisch een bevestiging met de inhoud van de bestelling;
4. Jorn krijgt automatisch een korte melding dat er een bestelling klaarstaat voor verwerking.

Configureer voor die functie deze secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY of SERVICE_ROLE_KEY
RESEND_API_KEY
MAIL_FROM
AANKOOPBEHEER_MAIL_TO=jorn.neeus@profo.be
```

Gebruik voor `MAIL_FROM` alleen een afzender op een domein of subdomein dat in Resend volledig geverifieerd is. Zolang de DNS-check in Resend faalt, zullen bevestigingsmails niet betrouwbaar vertrekken.

De beheerdersmail is bewust kort: die dient alleen als signaal dat er een bestelling klaarstaat. De inhoudelijke bestelbevestiging gaat naar de besteller.

Zolang de Edge Function of mailprovider nog niet geconfigureerd is, wordt de bestelling wel bewaard maar verschijnt er een melding dat de automatische mail nog niet verzonden is. Voor echte automatische verzending is een mailprovider nodig, bijvoorbeeld Resend. De browser zelf kan dit niet betrouwbaar en veilig doen.

## Vercel

De repository is voorbereid voor Vercel met `vercel.json`.

Gebruik in Vercel deze instellingen:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
```

Zet in Vercel bij Environment Variables:

```text
VITE_SUPABASE_URL=https://rxkffollbimmsvwhucgd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key uit Supabase>
```

Als Vercel meldt dat de GitHub-gebruiker geen lid is van het team, moet de repository aan het juiste Vercel-account of team gekoppeld worden. De applicatie zelf kan dan pas publiek via een Vercel-adres gedeeld worden.

## Lokaal starten

```bash
npm install
npm run dev
```
