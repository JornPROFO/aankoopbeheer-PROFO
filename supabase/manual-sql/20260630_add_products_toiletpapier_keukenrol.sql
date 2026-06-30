-- PROFO Aankoopbeheer - producten toevoegen: toiletpapier + keukenrol
-- Voer dit bestand volledig uit in de Supabase SQL Editor.
-- De kolom heet technisch prijs_excl_btw, maar de app gebruikt dit veld momenteel als prijs inclusief btw.

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
  'Toiletpapier Traditioneel 4-laags - 8 rollen - geschikt voor Tork T4 dispenser',
  'Sanitair en hygiene',
  '123schoon.nl',
  'https://www.123schoon.nl/Toilet-en-keukenpapier/WC-papier-p13321.html',
  'Traditioneel 4-laags toiletpapier van 123schoon huismerk. Een verpakking bevat 8 rollen met 150 vellen per rol. Geschikt voor dagelijks sanitair gebruik en voor Tork T4 dispensers.',
  'pak van 8 rollen',
  5.99,
  21,
  1,
  '/assets/123schoon-toiletpapier-tork-t4-8-rollen.jpg',
  true,
  20
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
  'Keukenrol 2-laags - 4 x 50 vel - 123schoon huismerk',
  'Keuken',
  '123schoon.nl',
  'https://www.123schoon.nl/Toilet-en-keukenpapier/Keukenrollen-p13330.html',
  'Sterke en zachte 2-laags keukenrollen van 123schoon huismerk. De verpakking bevat 4 keukenrollen van 50 vellen voor dagelijks gebruik in keuken en gemeenschappelijke ruimtes.',
  'pak van 4 rollen',
  2.99,
  21,
  1,
  '/assets/123schoon-keukenrol-2laags-4x50.jpg',
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
