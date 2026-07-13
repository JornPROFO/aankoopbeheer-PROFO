# Pushnotificaties in PROFO Aankoopbeheer

## Kern

Pushnotificaties zijn bedoeld als aanvullend kanaal naast de interne meldingen in de app. De interne melding blijft de bron: wie de app opent, ziet daar altijd de status. Push zorgt ervoor dat een gebruiker of goedkeurder ook buiten de app een korte melding krijgt wanneer een bestelling werd ingediend, goedgekeurd of geweigerd.

## Inrichting

1. Voer `00_OPEN_DIT_SQL_PUSH_NOTIFICATIES_KOPIEERBAAR.txt` volledig uit in de Supabase SQL editor.
2. Maak VAPID-sleutels aan voor web push.
3. Zet de publieke sleutel in Vercel als `VITE_PUSH_PUBLIC_KEY`.
4. Zet in Supabase Edge Function secrets:
   - `PUSH_VAPID_PUBLIC_KEY`
   - `PUSH_VAPID_PRIVATE_KEY`
   - `PUSH_VAPID_SUBJECT`, bijvoorbeeld `mailto:jorn.neeus@profo.be`
5. Deploy de Supabase Edge Function `send-aankoop-push`.
6. Deploy de webapp opnieuw via Vercel.

## Testscenario

Test minstens met twee accounts:

1. Een gewone gebruiker dient een bestelling in.
2. Een goedkeurder heeft pushmeldingen op zijn toestel ingeschakeld en krijgt een melding.
3. De goedkeurder keurt de bestelling goed.
4. De aanvrager en aankoopbeheer krijgen een interne melding en, wanneer ingeschakeld, een pushmelding.
5. Markeer de melding als gelezen en controleer of de badge in de app verdwijnt.

## Aandachtspunten

Pushmeldingen werken alleen wanneer de browser, het toestel en de installatievorm dit ondersteunen. Op iPhone en iPad werkt dit normaal via een geinstalleerde webapp, niet zomaar in elke losse browsertab. Wanneer push niet beschikbaar is, blijft de interne meldingenlijst in Aankoopbeheer de betrouwbare terugval.
