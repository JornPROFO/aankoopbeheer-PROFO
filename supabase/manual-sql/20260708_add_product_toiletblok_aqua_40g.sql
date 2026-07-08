-- PROFO Aankoopbeheer - product toevoegen: At Home Clean toiletblok Aqua 40 gram.
-- Voer dit bestand volledig uit in de Supabase SQL Editor.
-- De prijs wordt in deze app als prijs inclusief btw gebruikt.
--
-- Bron voor de productgegevens: screenshot, productfoto en gecontroleerde 123schoon-productpagina op 08/07/2026.
-- De normale catalogusprijs wordt gebruikt. Tijdelijke actieprijzen worden niet als permanente bestelprijs overgenomen.
-- Artikelnummer volgens aangeleverde bestandsnaam en 123schoon-productpagina: SDR00145.

with bron as (
  select
    'At Home Clean toiletblok Aqua 40 gram'::text as naam,
    'Sanitair en hygiene'::text as categorie,
    '123schoon.nl'::text as leverancier,
    '{"artikelnummer":"SDR00145","url":"https://www.123schoon.nl/At-Home-Clean-toiletblok-Aqua-40-gram-i3371.html"}'::text as leverancier_url,
    'Toiletblok Aqua Power voor een schoner en frisser toilet. Het blok met drievoudige werking reinigt, verfrist en neutraliseert. Eenvoudig aan de rand van de toiletpot te plaatsen en werkzaam bij elke spoelbeurt. Inhoud: 40 gram. Gebruik volgens het etiket.'::text as omschrijving,
    'stuk van 40 gram'::text as eenheid,
    1.00::numeric(12, 2) as prijs_excl_btw,
    21::numeric(5, 2) as btw_percentage,
    1::integer as minimum_bestelhoeveelheid,
    '/assets/at-home-clean-toiletblok-aqua-40g.jpg'::text as image_url,
    true::boolean as actief,
    215::integer as sort_order
),
target as (
  select product.id
  from public.aankoop_producten product
  cross join bron
  where lower(product.naam) in (
    lower(bron.naam),
    lower('Toiletblok of toiletverfrisser - product nog te bepalen')
  )
  order by
    case
      when lower(product.naam) = lower(bron.naam) then 0
      else 1
    end,
    product.id
  limit 1
),
bijgewerkt as (
  update public.aankoop_producten product
  set
    naam = bron.naam,
    categorie = bron.categorie,
    leverancier = bron.leverancier,
    leverancier_url = bron.leverancier_url,
    omschrijving = bron.omschrijving,
    eenheid = bron.eenheid,
    prijs_excl_btw = bron.prijs_excl_btw,
    btw_percentage = bron.btw_percentage,
    minimum_bestelhoeveelheid = bron.minimum_bestelhoeveelheid,
    image_url = bron.image_url,
    actief = bron.actief,
    sort_order = bron.sort_order,
    updated_at = now()
  from bron
  where product.id in (select id from target)
  returning product.id
)
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
select
  bron.naam,
  bron.categorie,
  bron.leverancier,
  bron.leverancier_url,
  bron.omschrijving,
  bron.eenheid,
  bron.prijs_excl_btw,
  bron.btw_percentage,
  bron.minimum_bestelhoeveelheid,
  bron.image_url,
  bron.actief,
  bron.sort_order
from bron
where not exists (select 1 from bijgewerkt)
  and not exists (
    select 1
    from public.aankoop_producten product
    where lower(product.naam) = lower(bron.naam)
  );

select
  naam,
  categorie,
  leverancier,
  leverancier_url,
  prijs_excl_btw,
  actief,
  image_url
from public.aankoop_producten
where lower(naam) = lower('At Home Clean toiletblok Aqua 40 gram');
