# Mail en DNS voor PROFO Aankoopbeheer

## Kern

De bevestigingsmail van PROFO Aankoopbeheer loopt via de Supabase Edge Function `send-aankoopbestelling` en Resend. De app kan de bestelling bewaren zonder mail, maar de bevestigingsmail vertrekt pas wanneer drie zaken tegelijk kloppen:

- de Edge Function is gedeployed onder de naam `send-aankoopbestelling`;
- de Supabase Function secrets zijn ingevuld;
- het afzenderdomein in Resend is DNS-matig geverifieerd.

## Huidige publieke DNS-controle

Op 10 juli 2026 is publiek zichtbaar dat `profo.be` een Microsoft 365 SPF-record heeft:

```text
v=spf1 include:spf.protection.outlook.com -all
```

Er is publiek geen Resend DKIM-record zichtbaar op:

```text
resend._domainkey.profo.be
```

Dat verklaart waarom een Resend DNS-check voor `profo.be` of een afzender op `@profo.be` kan blijven falen. De exacte hostnamen en waarden moeten altijd overgenomen worden uit het Resend-dashboard, omdat Resend die per domein genereert.

Op 15 juli 2026 is `meldingen.profo.be` in Resend geverifieerd voor verzenden. De app gebruikt daarom dit subdomein als verzenddomein. Inkomende mail via Resend is bewust uitgeschakeld, omdat Aankoopbeheer Resend alleen gebruikt voor transactionele uitgaande meldingen.

## Aanbevolen aanpak

Gebruik een apart subdomein voor transactionele mails:

```text
meldingen.profo.be
```

Dat is beheerbaarder dan rechtstreeks op het hoofddomein `profo.be` werken, omdat het hoofddomein al gebruikt wordt voor Microsoft 365. Resend zelf raadt aan om een subdomein te gebruiken voor verzenddoeleinden, zodat reputatie en doel duidelijk gescheiden blijven.

## Records die de webprovider nodig heeft

Bezorg de webprovider niet alleen de algemene vraag "zet Resend aan", maar letterlijk de records uit Resend:

- recordtype;
- host/naam;
- waarde;
- TTL indien opgegeven;
- aanduiding of het om rootdomein of subdomein gaat.

Let op: sommige providers willen bij een subdomein alleen het linkerdeel als host. Voor `resend._domainkey.mail.profo.be` kan de provider dus vragen om alleen `resend._domainkey.mail` in te vullen. Dat hangt af van het DNS-paneel.

## Secrets in Supabase

Voor de Edge Function moeten deze secrets bestaan:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
MAIL_FROM
AANKOOPBEHEER_MAIL_TO
```

`MAIL_FROM` voor Aankoopbeheer:

```text
PROFO Aankoopbeheer <aankoopbeheer@meldingen.profo.be>
```

Gebruik geen afzender op een domein dat in Resend nog niet verified is.

## Edge Function deploy

De app roept deze Supabase Edge Function aan:

```text
send-aankoopbestelling
```

Controleer in Supabase of die functie effectief bestaat en gedeployed is. Als ze opnieuw gedeployed moet worden, gebruik dan vanuit de projectmap:

```bash
npx supabase functions deploy send-aankoopbestelling
```

Daarna moeten de secrets opnieuw of minstens gecontroleerd worden via Supabase.

## Bronnen

- Resend, Managing Domains: `https://resend.com/docs/dashboard/domains/introduction`
- Publieke DNS-controle via `Resolve-DnsName` op 10 juli 2026 voor `profo.be`, TXT en MX.
