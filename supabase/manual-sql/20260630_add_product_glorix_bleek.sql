-- PROFO Aankoopbeheer - product toevoegen: Glorix Bleek Original 1 L
-- Voer dit bestand volledig uit in de Supabase SQL Editor.
-- De prijs wordt in deze app als prijs inclusief btw gebruikt.

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
  actief,
  sort_order
)
values (
  'Glorix Bleek Original 1 L',
  'Sanitair en hygiene',
  '123schoon.nl',
  'https://www.123schoon.nl/Schoonmaakmiddelen/Bleekmiddelen-p30468.html',
  'Bleek- en toiletreiniger voor hygienische reiniging van toilet en ander sanitair. Geschikt voor dagelijks gebruik. Inhoud: 1 liter. Gebruik volgens het etiket en meng niet met andere reinigingsmiddelen.',
  'fles van 1 L',
  2.79,
  21,
  1,
  '/assets/glorix-bleek-original-1l.jpg',
  true,
  40
)
on conflict (lower(naam))
do update set
  categorie = excluded.categorie,
  leverancier = excluded.leverancier,
  leverancier_url = excluded.leverancier_url,
  omschrijving = excluded.omschrijving,
  eenheid = excluded.eenheid,
  prijs_excl_btw = excluded.prijs_excl_btw,
  btw_percentage = excluded.btw_percentage,
  minimum_bestelhoeveelheid = excluded.minimum_bestelhoeveelheid,
  image_url = excluded.image_url,
  actief = excluded.actief,
  sort_order = excluded.sort_order,
  updated_at = now();
