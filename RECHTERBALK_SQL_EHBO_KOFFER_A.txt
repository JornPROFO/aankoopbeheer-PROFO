-- PROFO Aankoopbeheer - EHBO-onderdeel: aanvulartikelen EHBO-koffer A.
-- Voer dit bestand volledig uit in de Supabase SQL Editor.
-- De artikelen worden bestelbaar gemaakt onder de categorie Veiligheid/EHBO.
--
-- Bron voor de inhoud: gecontroleerde productpagina EHBO-koffer A op 09/07/2026.
-- Bron: https://www.ehbo-koffer.be/product/ehbo-koffer-a/
-- Losse stukprijzen zijn nog niet vastgelegd. Daarom wordt voorlopig 0,00 gebruikt.
-- De app toont deze EHBO-artikelen als "Prijs te bevestigen".

with bron(naam, onderdeel, richtaantal, eenheid, sort_order) as (
  values
    ('Allesknipper 18 cm', 'Algemene EHBO-artikelen', '1x', 'stuk', 600),
    ('Reinigingsalcohol 30 ml', 'Algemene EHBO-artikelen', '1x', 'flacon', 601),
    ('Mitella', 'Algemene EHBO-artikelen', '3x', 'stuk', 602),
    ('Kleurenwijzer EHBO', 'Algemene EHBO-artikelen', '1x', 'stuk', 603),
    ('Redding deken goud/zilver 210 cm x 160 cm', 'Algemene EHBO-artikelen', '1x', 'stuk', 604),
    ('Hechtpleister op rol 2,5 cm x 5 m', 'Algemene EHBO-artikelen', '1x', 'rol', 605),
    ('Safe Kiss beademingsdoekje', 'Algemene EHBO-artikelen', '1x', 'stuk', 606),
    ('Splinterpincet RVS 8 cm', 'Algemene EHBO-artikelen', '1x', 'stuk', 607),
    ('Veiligheidsspelden - 3 stuks', 'Algemene EHBO-artikelen', '2x', 'verpakking', 608),
    ('Pleister assortiment - 30 stuks', 'Algemene EHBO-artikelen', '1x', 'verpakking', 609),
    ('Tekenpincet plastic', 'Algemene EHBO-artikelen', '1x', 'stuk', 610),
    ('Vinyl handschoenen per paar verpakt - maat L', 'Algemene EHBO-artikelen', '1x', 'paar', 611),
    ('Elastisch hydrofiel 6 cm x 4 m', 'Algemene verbandartikelen', '2x', 'stuk', 620),
    ('Elastisch hydrofiel 8 cm x 4 m', 'Algemene verbandartikelen', '2x', 'stuk', 621),
    ('Gaaskompres steriel 10 cm x 10 cm', 'Algemene verbandartikelen', '10x', 'stuk', 622),
    ('Gaaskompres steriel 5 cm x 5 cm', 'Algemene verbandartikelen', '10x', 'stuk', 623),
    ('Gaaskompres steriel 5 cm x 7,5 cm - 1/16', 'Algemene verbandartikelen', '16x', 'stuk', 624),
    ('Non woven hechtstrips 3 x 75 mm - 5 stuks', 'Algemene verbandartikelen', '1x', 'verpakking', 625),
    ('Niet-verklevend wondkompres 10 x 10 cm', 'Algemene verbandartikelen', '2x', 'stuk', 626),
    ('Niet-verklevend wondkompres 7,5 x 7,5 cm - 1/16', 'Algemene verbandartikelen', '2x', 'stuk', 627),
    ('Snelverband gerold 10 cm x 12 cm - groot', 'Algemene verbandartikelen', '2x', 'stuk', 628),
    ('Snelverband gerold 6 cm x 8 cm - klein', 'Algemene verbandartikelen', '4x', 'stuk', 629),
    ('Snelverband gerold 8 cm x 10 cm - middel', 'Algemene verbandartikelen', '2x', 'stuk', 630),
    ('Universeel/Ideaal windsel 10 cm x 5 m', 'Algemene verbandartikelen', '2x', 'stuk', 631),
    ('Universeel/Ideaal windsel 8 cm x 5 m', 'Algemene verbandartikelen', '2x', 'stuk', 632),
    ('Vingerbob wit - 5 stuks', 'Algemene verbandartikelen', '1x', 'verpakking', 633),
    ('Wondsnelverband plat model 6 cm x 8 cm', 'Algemene verbandartikelen', '2x', 'stuk', 634)
),
regels as (
  select
    naam,
    'Veiligheid/EHBO'::text as categorie,
    'EHBO-koffer.be'::text as leverancier,
    jsonb_build_object(
      'bron',
      'EHBO-koffer A',
      'url',
      'https://www.ehbo-koffer.be/product/ehbo-koffer-a/',
      'richtaantal',
      richtaantal,
      'onderdeel',
      onderdeel
    )::text as leverancier_url,
    ('Aanvulartikel voor EHBO-koffer A. Onderdeel: ' || onderdeel || '. Richtaantal volgens inhoudslijst: ' || richtaantal || '.')::text as omschrijving,
    eenheid,
    0.00::numeric(12, 2) as prijs_excl_btw,
    6.00::numeric(5, 2) as btw_percentage,
    1::integer as minimum_bestelhoeveelheid,
    '/assets/ehbo-koffer-a-aanvulling.svg'::text as image_url,
    true::boolean as actief,
    sort_order::integer as sort_order
  from bron
),
bijgewerkt as (
  update public.aankoop_producten product
  set
    categorie = regels.categorie,
    leverancier = regels.leverancier,
    leverancier_url = regels.leverancier_url,
    omschrijving = regels.omschrijving,
    eenheid = regels.eenheid,
    prijs_excl_btw = regels.prijs_excl_btw,
    btw_percentage = regels.btw_percentage,
    minimum_bestelhoeveelheid = regels.minimum_bestelhoeveelheid,
    image_url = regels.image_url,
    actief = regels.actief,
    sort_order = regels.sort_order,
    updated_at = now()
  from regels
  where lower(product.naam) = lower(regels.naam)
  returning product.id, product.naam
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
  regels.naam,
  regels.categorie,
  regels.leverancier,
  regels.leverancier_url,
  regels.omschrijving,
  regels.eenheid,
  regels.prijs_excl_btw,
  regels.btw_percentage,
  regels.minimum_bestelhoeveelheid,
  regels.image_url,
  regels.actief,
  regels.sort_order
from regels
where not exists (
  select 1
  from public.aankoop_producten product
  where lower(product.naam) = lower(regels.naam)
);

select
  naam,
  categorie,
  leverancier,
  prijs_excl_btw,
  btw_percentage,
  actief,
  sort_order
from public.aankoop_producten
where categorie = 'Veiligheid/EHBO'
order by sort_order, naam;
