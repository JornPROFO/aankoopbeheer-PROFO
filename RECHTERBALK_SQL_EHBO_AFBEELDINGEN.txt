-- PROFO Aankoopbeheer
-- EHBO-koffer A: productafbeeldingen koppelen aan de bestelbare aanvulartikelen.
-- Bron: ehbo-koffer.be, gecontroleerd op 09/07/2026.

with bron (
  naam,
  image_url
) as (
  values
    ('Allesknipper 18 cm', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Allesknipper-18-cm.jpg'),
    ('Reinigingsalcohol 30 ml', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/11/Desinfectant-10_30-ml.jpg'),
    ('Mitella', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Mitella.jpg'),
    ('Kleurenwijzer EHBO', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/EHBO-koffer-A.jpg'),
    ('Redding deken goud/zilver 210 cm x 160 cm', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/11/Reddingsdeken-goud-zilver.jpg'),
    ('Hechtpleister op rol 2,5 cm x 5 m', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Hechtpleister-250-x-5-m.jpg'),
    ('Safe Kiss beademingsdoekje', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/11/Safe-Kiss-Beademingsdoekje.jpg'),
    ('Splinterpincet RVS 8 cm', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/splinterpincet-1.jpg'),
    ('Veiligheidsspelden - 3 stuks', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/veiligheidsspelden.jpg'),
    ('Pleister assortiment - 30 stuks', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Pleister-Assortiment-30-stuks-1.jpg'),
    ('Tekenpincet plastic', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Q8390.jpg'),
    ('Vinyl handschoenen per paar verpakt - maat L', 'https://www.ehbo-koffer.be/wp-content/uploads/8944.webp'),
    ('Elastisch hydrofiel 6 cm x 4 m', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Hydrofiel-Zwachtel-3.jpg'),
    ('Elastisch hydrofiel 8 cm x 4 m', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Hydrofiel-Zwachtel-3.jpg'),
    ('Gaaskompres steriel 10 cm x 10 cm', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Gaaskompres-steriel-116-5-x-75-cm.jpg'),
    ('Gaaskompres steriel 5 cm x 5 cm', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Gaaskompres-steriel-116-5-x-75-cm.jpg'),
    ('Gaaskompres steriel 5 cm x 7,5 cm - 1/16', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Gaaskompres-steriel-116-5-x-75-cm.jpg'),
    ('Non woven hechtstrips 3 x 75 mm - 5 stuks', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/11/Hechtstrips-3-mm-x-75-mm-a-5-stuks-2.jpg'),
    ('Niet-verklevend wondkompres 10 x 10 cm', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Q40004-2.jpg'),
    ('Niet-verklevend wondkompres 7,5 x 7,5 cm - 1/16', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Q40004-2.jpg'),
    ('Snelverband gerold 10 cm x 12 cm - groot', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Snelverband-1.jpg'),
    ('Snelverband gerold 6 cm x 8 cm - klein', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Snelverband-1.jpg'),
    ('Snelverband gerold 8 cm x 10 cm - middel', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Snelverband-1.jpg'),
    ('Universeel/Ideaal windsel 10 cm x 5 m', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Universeel-Windsel-3maten.jpg'),
    ('Universeel/Ideaal windsel 8 cm x 5 m', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Universeel-Windsel-3maten.jpg'),
    ('Vingerbob wit - 5 stuks', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/11/Vingerbob-wit-50-stuks.png'),
    ('Wondsnelverband plat model 6 cm x 8 cm', 'https://www.ehbo-koffer.be/wp-content/uploads/2023/10/Wondsnelverband-6-cm-x-8-cm-plat-model-1.jpg')
),
bijgewerkt as (
  update public.aankoop_producten product
  set
    image_url = bron.image_url,
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
