-- PROFO Aankoopbeheer - volledige navulling voor EHBO-koffer A toevoegen.
-- Productpagina gecontroleerd op 20/08/2026.
-- De app bewaart in prijs_excl_btw historisch de zichtbare catalogusprijs inclusief btw.

with bron as (
  select
    'Inhoud EHBO-koffer A - volledige navulling'::text as naam,
    'Veiligheid/EHBO'::text as categorie,
    'EHBO-koffer.be'::text as leverancier,
    '{"artikelnummer":"27.858820|STUK","url":"https://www.ehbo-koffer.be/product/inhoud-ehbo-koffer-a/","prijsbron":"ehbo-koffer.be","prijsdatum":"2026-08-20","prijssoort":"reguliere prijs incl. btw","producttype":"volledige navulling zonder koffer"}'::text as leverancier_url,
    'Complete navulling voor EHBO-koffer A, als één set te bestellen. Bedoeld om de volledige inhoud in één keer te vervangen, bijvoorbeeld wanneer meerdere materialen gebruikt, beschadigd of vervallen zijn. De lege EHBO-koffer zelf is niet inbegrepen.'::text as omschrijving,
    'complete navulset'::text as eenheid,
    40.23::numeric(12, 2) as prijs_excl_btw,
    6.00::numeric(5, 2) as btw_percentage,
    1::integer as minimum_bestelhoeveelheid,
    '/assets/inhoud-ehbo-koffer-a-volledige-navulling.jpg'::text as image_url,
    true::boolean as actief,
    590::integer as sort_order
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

select naam, categorie, leverancier, prijs_excl_btw, btw_percentage, eenheid, image_url, actief
from public.aankoop_producten
where lower(naam) = lower('Inhoud EHBO-koffer A - volledige navulling');
