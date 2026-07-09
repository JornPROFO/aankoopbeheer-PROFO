-- PROFO Aankoopbeheer
-- EHBO-koffer A: reguliere prijzen koppelen aan de bestelbare aanvulartikelen.
-- Bron: ehbo-koffer.be, gecontroleerd op 09/07/2026.
-- Werkwijze: tijdelijke kortingen worden niet gebruikt; de reguliere prijs inclusief btw wordt bewaard.
-- Opmerking: in deze applicatie wordt prijs_excl_btw historisch gebruikt als bestelprijs inclusief btw.

with bron (
  naam,
  leverancier_url,
  match_naam,
  match_status,
  prijs_incl_btw,
  btw_percentage
) as (
  values
    ('Allesknipper 18 cm', 'https://www.ehbo-koffer.be/product/allesknipper/', 'Allesknipper', 'Exacte productmatch.', 4.50, 6.00),
    ('Reinigingsalcohol 30 ml', 'https://www.ehbo-koffer.be/product/desinfectant/', 'Desinfectant - 30 ml', 'Productmatch via variant 30 ml.', 3.00, 6.00),
    ('Mitella', 'https://www.ehbo-koffer.be/product/mitella/', 'Mitella', 'Exacte productmatch.', 0.41, 6.00),
    ('Kleurenwijzer EHBO', 'https://www.ehbo-koffer.be/product/ehbo-koffer-a/', 'EHBO-koffer A', 'Geen losse productmatch gevonden; prijs blijft te bevestigen.', 0.00, 6.00),
    ('Redding deken goud/zilver 210 cm x 160 cm', 'https://www.ehbo-koffer.be/product/reddingsdeken-goud-zilver/', 'Reddingsdeken goud/zilver', 'Exacte productmatch.', 1.98, 6.00),
    ('Hechtpleister op rol 2,5 cm x 5 m', 'https://www.ehbo-koffer.be/product/hechtpleister-250-x-5-m/', 'Hechtpleister 2,50 cm x 5 m', 'Productmatch via variant 2,5 cm x 5 m.', 2.11, 6.00),
    ('Safe Kiss beademingsdoekje', 'https://www.ehbo-koffer.be/product/quick-safe-kiss-beademingsdoekje/', 'Quick Safe Kiss beademingsdoekje', 'Exacte productmatch.', 2.01, 6.00),
    ('Splinterpincet RVS 8 cm', 'https://www.ehbo-koffer.be/product/splinterpincet/', 'Splinterpincet', 'Exacte productmatch.', 1.92, 6.00),
    ('Veiligheidsspelden - 3 stuks', 'https://www.ehbo-koffer.be/product/veiligheidsspelden-3-stuks/', 'Veiligheidsspelden - 3 stuks', 'Exacte productmatch.', 0.35, 6.00),
    ('Pleister assortiment - 30 stuks', 'https://www.ehbo-koffer.be/product/pleister-assortiment-30-stuks/', 'Pleister assortiment - 30 stuks', 'Reguliere prijs gebruikt; tijdelijke korting genegeerd.', 1.92, 6.00),
    ('Tekenpincet plastic', 'https://www.ehbo-koffer.be/product/plastic-tekenpincet/', 'Plastic tekenpincet', 'Exacte productmatch.', 1.82, 6.00),
    ('Vinyl handschoenen per paar verpakt - maat L', 'https://www.ehbo-koffer.be/product/gepoederde-vinyl-handschoenen-per-paar/', 'Gepoederde vinyl handschoenen per paar', 'Productmatch voor per paar verpakte vinyl handschoenen.', 0.68, 6.00),
    ('Elastisch hydrofiel 6 cm x 4 m', 'https://www.ehbo-koffer.be/product/hydrofiel-zwachtel/', 'Hydrofiel zwachtel - 6 cm x 4 m', 'Productmatch via variant 6 cm x 4 m.', 0.51, 6.00),
    ('Elastisch hydrofiel 8 cm x 4 m', 'https://www.ehbo-koffer.be/product/hydrofiel-zwachtel/', 'Hydrofiel zwachtel - 8 cm x 4 m', 'Productmatch via variant 8 cm x 4 m.', 0.76, 6.00),
    ('Gaaskompres steriel 10 cm x 10 cm', 'https://www.ehbo-koffer.be/product/gaaskompres-steriel/', 'Gaaskompres steriel - 10 x 10 cm - 10 stuks', 'Productmatch via variant 10 x 10 cm en 10 stuks.', 2.93, 6.00),
    ('Gaaskompres steriel 5 cm x 5 cm', 'https://www.ehbo-koffer.be/product/gaaskompres-steriel/', 'Gaaskompres steriel - 5 x 5 cm - 10 stuks', 'Productmatch via variant 5 x 5 cm en 10 stuks.', 1.48, 6.00),
    ('Gaaskompres steriel 5 cm x 7,5 cm - 1/16', 'https://www.ehbo-koffer.be/product/gaaskompres-steriel/', 'Gaaskompres steriel - 5 x 7,5 cm - 16 stuks', 'Productmatch via variant 5 x 7,5 cm en 16 stuks.', 2.31, 6.00),
    ('Non woven hechtstrips 3 x 75 mm - 5 stuks', 'https://www.ehbo-koffer.be/product/hechtstrips-3-mm-x-75-mm-5-stuks/', 'Hechtstrips 3 mm x 75 mm - 5 stuks', 'Exacte productmatch.', 1.19, 6.00),
    ('Niet-verklevend wondkompres 10 x 10 cm', 'https://www.ehbo-koffer.be/product/niet-verklevend-wondkompres/', 'Niet-verklevend wondkompres - 10 x 10 cm', 'Productmatch via variant 10 x 10 cm.', 0.52, 6.00),
    ('Niet-verklevend wondkompres 7,5 x 7,5 cm - 1/16', 'https://www.ehbo-koffer.be/product/niet-verklevend-wondkompres/', 'Niet-verklevend wondkompres - 7,5 x 7,5 cm', 'Productmatch via variant 7,5 x 7,5 cm.', 0.27, 6.00),
    ('Snelverband gerold 10 cm x 12 cm - groot', 'https://www.ehbo-koffer.be/product/snelverband/', 'Snelverband - 10 x 12 cm', 'Productmatch via variant 10 x 12 cm.', 0.84, 6.00),
    ('Snelverband gerold 6 cm x 8 cm - klein', 'https://www.ehbo-koffer.be/product/snelverband/', 'Snelverband - 6 x 8 cm', 'Productmatch via variant 6 x 8 cm.', 0.63, 6.00),
    ('Snelverband gerold 8 cm x 10 cm - middel', 'https://www.ehbo-koffer.be/product/snelverband/', 'Snelverband - 8 x 10 cm', 'Productmatch via variant 8 x 10 cm.', 0.84, 6.00),
    ('Universeel/Ideaal windsel 10 cm x 5 m', 'https://www.ehbo-koffer.be/product/universeel-windsel/', 'Universeel windsel - 10 cm x 5 m', 'Productmatch via variant 10 cm x 5 m.', 1.79, 6.00),
    ('Universeel/Ideaal windsel 8 cm x 5 m', 'https://www.ehbo-koffer.be/product/universeel-windsel/', 'Universeel windsel - 8 cm x 5 m', 'Productmatch via variant 8 cm x 5 m.', 1.33, 6.00),
    ('Vingerbob wit - 5 stuks', 'https://www.ehbo-koffer.be/product/vingerbob-wit/', 'Vingerbob wit - 5 stuks', 'Exacte productmatch.', 1.22, 6.00),
    ('Wondsnelverband plat model 6 cm x 8 cm', 'https://www.ehbo-koffer.be/product/wondsnelverband-plat/', 'Wondsnelverband plat', 'Productmatch voor plat wondsnelverband 6 x 8 cm.', 1.05, 6.00)
),
bijgewerkt as (
  update public.aankoop_producten product
  set
    leverancier = 'EHBO-koffer.be',
    leverancier_url = jsonb_build_object(
      'url', bron.leverancier_url,
      'match_naam', bron.match_naam,
      'match_status', bron.match_status,
      'prijsbron', 'ehbo-koffer.be',
      'prijsdatum', '2026-07-09',
      'prijssoort', 'reguliere prijs incl. btw'
    )::text,
    prijs_excl_btw = bron.prijs_incl_btw,
    btw_percentage = bron.btw_percentage,
    actief = true,
    updated_at = now()
  from bron
  where lower(product.naam) = lower(bron.naam)
  returning product.naam
),
ontbrekend as (
  select bron.naam
  from bron
  left join bijgewerkt on lower(bijgewerkt.naam) = lower(bron.naam)
  where bijgewerkt.naam is null
)
select
  'bijgewerkt' as controle,
  count(*) as aantal
from bijgewerkt
union all
select
  'niet gevonden in aankoop_producten' as controle,
  count(*) as aantal
from ontbrekend;
