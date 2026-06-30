-- PROFO Aankoopbeheer - product toevoegen: 123schoon Schuurspons 10 stuks
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
  '123schoon Schuurspons 10 stuks',
  'Schoonmaakartikelen',
  '123schoon.nl',
  'https://www.123schoon.nl/Schoonmaakartikelen/123schoon-schoonmaakartikelen-p69609.html',
  'Set van 10 schuursponzen voor het verwijderen van vlekken en aangekoekte resten op oppervlakken in keuken, badkamer of werkplaats. De harde schuurlaag is geschikt voor intensief schuurwerk. Gebruik met aandacht voor kwetsbare oppervlakken.',
  'pak van 10 stuks',
  1.19,
  21,
  1,
  '/assets/123schoon-schuurspons-10-stuks.jpg',
  true,
  50
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
