-- PROFO Aankoopbeheer - afwasmiddel Green Sensation toevoegen.
-- Productpagina gecontroleerd op 19/08/2026.
-- De app bewaart in prijs_excl_btw historisch de zichtbare catalogusprijs inclusief btw.

with bron as (
  select
    'Afwasmiddel Green Sensation appel 500 ml - 123schoon huismerk'::text as naam,
    'Keuken'::text as categorie,
    '123schoon.nl'::text as leverancier,
    '{"artikelnummer":"SDR06067","url":"https://www.123schoon.nl/123schoon-Afwasmiddel-Green-Sensation-500-ml-123schoon-huismerk-i13473.html","prijsbron":"123schoon.nl","prijsdatum":"2026-08-19","prijssoort":"reguliere prijs incl. btw"}'::text as leverancier_url,
    'Biologisch afbreekbaar vloeibaar handafwasmiddel met appelgeur. Klaar voor gebruik en geschikt voor pannen, ovenschalen, borden, glazen en bestek. Fles van 500 ml; verdund of onverdund te gebruiken volgens het etiket.'::text as omschrijving,
    'fles van 500 ml'::text as eenheid,
    1.99::numeric(12, 2) as prijs_excl_btw,
    21::numeric(5, 2) as btw_percentage,
    1::integer as minimum_bestelhoeveelheid,
    '/assets/123schoon-afwasmiddel-green-sensation-appel-500ml.jpg'::text as image_url,
    true::boolean as actief,
    65::integer as sort_order
),
target as (
  select product.id
  from public.aankoop_producten product
  cross join bron
  where lower(product.naam) = lower(bron.naam)
  order by product.id
  limit 1
),
bijgewerkt as (
  update public.aankoop_producten product
  set
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
  naam, categorie, leverancier, leverancier_url, omschrijving, eenheid,
  prijs_excl_btw, btw_percentage, minimum_bestelhoeveelheid, image_url, actief, sort_order
)
select
  naam, categorie, leverancier, leverancier_url, omschrijving, eenheid,
  prijs_excl_btw, btw_percentage, minimum_bestelhoeveelheid, image_url, actief, sort_order
from bron
where not exists (select 1 from bijgewerkt)
  and not exists (
    select 1 from public.aankoop_producten product where lower(product.naam) = lower(bron.naam)
  );

select naam, categorie, leverancier, prijs_excl_btw, btw_percentage, image_url, actief
from public.aankoop_producten
where lower(naam) = lower('Afwasmiddel Green Sensation appel 500 ml - 123schoon huismerk');
