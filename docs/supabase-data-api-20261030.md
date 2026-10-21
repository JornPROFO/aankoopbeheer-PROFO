# Expliciete Supabase-toegangsrechten

Gecontroleerd op 21 oktober 2026.

Vanaf 30 oktober 2026 krijgen nieuwe tabellen in public niet automatisch Data API-rechten. Bestaande tabellen behouden hun rechten. De aanmaakscripts bevatten daarom expliciete rechten per tabel en bijbehorende nummerreeks, samen met ingeschakelde RLS. De rechten zijn afgeleid van de gecontroleerde productie-instellingen; rollen, RLS-policies, functies en gegevens zijn niet gewijzigd.

Het overzicht staat in supabase/data-api-grants.json. Het bevat uitsluitend de rechten die door deze wijziging geraakt worden: SELECT, INSERT, UPDATE, DELETE voor tabellen en USAGE, SELECT voor nummerreeksen. Overige bestaande privileges blijven ongewijzigd. De bestaande anon-rechten worden alleen behouden waar ze al aanwezig waren; de bestaande RLS-regels blijven de feitelijke toegang beperken. Dit overzicht is geen opdracht om nieuwe tabellen dezelfde rechten te geven.

## Bij nieuwe tabellen

Bepaal de noodzakelijke rechten per rol. Leg de GRANT-statements, RLS en policies vast in hetzelfde aanmaakscript. Voeg de tabel en de bijbehorende nummerreeksen toe aan het rechtenoverzicht en laat de automatische controle slagen met npm run check:db-grants. De GitHub-controle meldt nieuwe public-tabellen zonder vastgelegde rechten en afwijkingen in bestaande blokken. Wijzig een rechtenoverzicht nooit alleen om een foutmelding weg te werken: controleer eerst het toegangsmodel.

## Bestaande productie en heropbouw

De aangepaste historische scripts zijn bedoeld voor toekomstige installatie of heropbouw. Voer ze niet opnieuw op productie uit: ze bevatten ook oorspronkelijke inrichting en gegevensbewerkingen. Voor de overgang op 30 oktober is geen productiemigratie nodig voor de bestaande tabellen. De compatibiliteitscontrole is uitgevoerd op lege tijdelijke objecten zonder automatische rechten, binnen transacties die met ROLLBACK zijn afgesloten.

Een volledige heropbouw blijft afhankelijk van de oorspronkelijke basisinrichting en de juiste volgorde van de gedeelde PROFO-projecten. De controle van de rechten is geen volledige hersteltest van alle historische migraties, Auth, Storage en gegevensimporten.

De optionele tabel aankoop_bestelling_statuslog bestaat niet in productie. Het bestaande optionele script is voorbereid voor SELECT en INSERT conform zijn bestaande policies, zonder de tabel te activeren.

Bronnen: [Supabase-aankondiging](https://github.com/orgs/supabase/discussions/45329) en [API-beveiliging](https://supabase.com/docs/guides/api/securing-your-api).
