-- PROFO Aankoopbeheer - stap 2 minimale inrichting
-- Voer dit volledige bestand uit nadat stap 0 en stap 1 gelukt zijn.
-- Deze stap bevat bewust geen functies, triggers of RLS-policies.
-- Zo vermijden we dat Supabase per ongeluk een fragment binnen een functie uitvoert.

create index if not exists aankoop_producten_actief_idx
  on public.aankoop_producten (actief, categorie, naam);

create unique index if not exists aankoop_producten_naam_unique_idx
  on public.aankoop_producten (lower(naam));

create index if not exists aankoop_bestellingen_besteller_idx
  on public.aankoop_bestellingen (besteller_id, created_at desc);

create index if not exists aankoop_bestellingen_aangemaakt_door_idx
  on public.aankoop_bestellingen (aangemaakt_door_id, created_at desc);

create index if not exists aankoop_bestelregels_bestelling_idx
  on public.aankoop_bestelregels (bestelling_id);

insert into public.aankoop_producten (
  naam,
  categorie,
  leverancier,
  leverancier_url,
  omschrijving,
  eenheid,
  prijs_excl_btw,
  btw_percentage,
  minimum_bestelhoeveelheid,
  image_url,
  sort_order
)
values (
  'Gevouwen handdoeken 2-laags - geschikt voor Tork H2 dispenser',
  'Sanitair en hygiene',
  '123schoon.nl',
  'https://www.123schoon.nl/',
  'Papieren handdoekjes voor professioneel sanitair gebruik. Startproduct op basis van het aangeleverde voorbeeld; prijs blijft door beheer te controleren bij de leverancier.',
  'doos van 20 pakken',
  35.12,
  21,
  1,
  '/assets/gevouwen-handdoeken-voorbeeld.png',
  10
)
on conflict do nothing;

comment on table public.gebruikers is 'Basislijst van PROFO-medewerkers voor Aankoopbeheer.';
comment on table public.locaties is 'Basislijst van PROFO-locaties voor Aankoopbeheer.';
comment on table public.aankoop_producten is 'Catalogus voor het interne PROFO-bestelportaal.';
comment on table public.aankoop_bestellingen is 'Bestellingen door PROFO-medewerkers voor locaties.';
comment on table public.aankoop_bestelregels is 'Productregels gekoppeld aan interne PROFO-bestellingen.';
