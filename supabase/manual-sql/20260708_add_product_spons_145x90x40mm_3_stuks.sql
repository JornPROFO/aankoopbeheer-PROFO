-- PROFO Aankoopbeheer - product toevoegen: Spons 14,5 x 9 x 4 cm - 3 stuks - 123schoon huismerk.
-- Voer dit bestand volledig uit in de Supabase SQL Editor.
-- De prijs wordt in deze app als prijs inclusief btw gebruikt.
--
-- Bron voor de productgegevens: screenshot, productfoto en gecontroleerde 123schoon-productpagina op 08/07/2026.
-- De normale catalogusprijs wordt gebruikt. Tijdelijke actieprijzen worden niet als permanente bestelprijs overgenomen.
-- Artikelnummer volgens aangeleverde bestandsnaam en 123schoon-productpagina: SDR00021.

with bron as (
  select
    'Spons 14,5 x 9 x 4 cm - 3 stuks - 123schoon huismerk'::text as naam,
    'Schoonmaak'::text as categorie,
    '123schoon.nl'::text as leverancier,
    '{"artikelnummer":"SDR00021","url":"https://www.123schoon.nl/123schoon-Spons-14-5-x-9-x-4-cm-3-stuks-123schoon-huismerk-i264.html"}'::text as leverancier_url,
    'Set van 3 zachte sponzen van 14,5 x 9 x 4 cm. De sponzen hebben een groot oppervlak, schuren niet en zijn geschikt voor het reinigen van gevoelige oppervlakken. Elke set bevat drie sponzen in verschillende kleuren; de kleurcombinatie kan afwijken van de afbeelding.'::text as omschrijving,
    'pak van 3 stuks'::text as eenheid,
    1.69::numeric(12, 2) as prijs_excl_btw,
    21::numeric(5, 2) as btw_percentage,
    1::integer as minimum_bestelhoeveelheid,
    '/assets/123schoon-spons-145x90x40mm-3-stuks.jpg'::text as image_url,
    true::boolean as actief,
    505::integer as sort_order
),
target as (
  select product.id
  from public.aankoop_producten product
  cross join bron
  where lower(product.naam) in (
    lower(bron.naam),
    lower('Sponzen of schoonmaaksponzen - product nog te bepalen')
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
where lower(naam) = lower('Spons 14,5 x 9 x 4 cm - 3 stuks - 123schoon huismerk');
