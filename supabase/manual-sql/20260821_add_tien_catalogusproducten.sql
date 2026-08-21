-- PROFO Aankoopbeheer - tien bijkomende catalogusproducten.
-- Productpagina's en zichtbare catalogusprijzen gecontroleerd op 21/08/2026.
-- De app bewaart in prijs_excl_btw historisch de zichtbare catalogusprijs inclusief btw.
-- Bij de Pritt-lijmstiften wordt de reguliere prijs gebruikt; tijdelijke korting is niet overgenomen.

with bron (
  naam, categorie, leverancier, leverancier_url, omschrijving, eenheid,
  prijs_excl_btw, btw_percentage, minimum_bestelhoeveelheid, image_url, actief, sort_order
) as (
  values
    (
      'Duster met houder en 3 navullingen - 123schoon huismerk',
      'Schoonmaak',
      '123schoon.nl',
      '{"artikelnummer":"SDR06383","url":"https://www.123schoon.nl/123schoon-Duster-met-houder-navulling-3-stuks-123schoon-huismerk-i17251.html","prijsbron":"123schoon.nl","prijsdatum":"2026-08-21","prijssoort":"reguliere prijs incl. btw"}',
      'Starterkit voor droog afstoffen met één inklapbare houder en drie microvezelnavullingen. Geschikt voor onder meer meubels, jaloezieën, beeldschermen en toetsenborden.',
      'starterkit met houder en 3 navullingen',
      1.99, 21.00, 1,
      '/assets/123schoon-duster-houder-3-navullingen.jpg',
      true, 600
    ),
    (
      'Duster navullingen - 15 stuks - 123schoon huismerk',
      'Schoonmaak',
      '123schoon.nl',
      '{"artikelnummer":"SDR00558","url":"https://www.123schoon.nl/123schoon-Aanbieding-Duster-Navulling-15-stuks-123schoon-huismerk-i19653.html","prijsbron":"123schoon.nl","prijsdatum":"2026-08-21","prijssoort":"aanbiedingsverpakking incl. btw"}',
      'Verpakking met vijftien microvezelnavullingen voor de 123schoon-huismerk duster en de Swiffer Duster. Uitsluitend bedoeld voor droog afstoffen.',
      'verpakking van 15 navullingen',
      6.50, 21.00, 1,
      '/assets/123schoon-duster-navulling-15-stuks.jpg',
      true, 605
    ),
    (
      'HY@PRO latex huishoudhandschoenen blauw maat M - 1 paar',
      'Schoonmaak',
      '123schoon.nl',
      '{"artikelnummer":"SHY00294","url":"https://www.123schoon.nl/HY-PRO-Latex-Huishoudhandschoenen-Blauw-M-45-gram-i22288.html","prijsbron":"123schoon.nl","prijsdatum":"2026-08-21","prijssoort":"reguliere prijs incl. btw","waarschuwing":"bevat latex"}',
      'Herbruikbare blauwe huishoudhandschoenen in maat M voor schoonmaakwerkzaamheden. Antislipoppervlak voor extra grip. Bevat latex en kan bij latexallergie een reactie veroorzaken.',
      'paar',
      1.49, 21.00, 1,
      '/assets/hypro-latex-huishoudhandschoenen-blauw-m.jpg',
      true, 610
    ),
    (
      '123inkt kopieerpapier A4 80 g/m² - doos van 2500 vellen',
      'Kantoorbenodigdheden',
      '123inkt.be',
      '{"artikelnummer":"390001","url":"https://www.123inkt.be/123inkt-kopieerpapier-1-doos-van-2500-vellen-A4-80-g-m-065130C-065201C-068820C-068837C-250385C-i63548.html","prijsbron":"123inkt.be","prijsdatum":"2026-08-21","prijssoort":"reguliere prijs incl. btw"}',
      'Doos met vijf pakken van 500 vellen extra wit A4-kopieerpapier van 80 g/m². Geschikt voor dubbelzijdig printen en kopiëren met laser- en inkjetprinters.',
      'doos van 2500 vellen',
      33.50, 21.00, 1,
      '/assets/123inkt-kopieerpapier-a4-2500-vellen.jpg',
      true, 620
    ),
    (
      '123inkt kopieerpapier A3 80 g/m² - pak van 500 vellen',
      'Kantoorbenodigdheden',
      '123inkt.be',
      '{"artikelnummer":"300644","url":"https://www.123inkt.be/123inkt-kopieerpapier-1-pak-van-500-vellen-A3-80-g-m-065158C-065159C-298333C-298339C-378895C-i70452.html","prijsbron":"123inkt.be","prijsdatum":"2026-08-21","prijssoort":"reguliere prijs incl. btw"}',
      'Pak met 500 vellen extra wit A3-kopieerpapier van 80 g/m². Geschikt voor dubbelzijdig printen en kopiëren met laser- en inkjetprinters.',
      'pak van 500 vellen',
      13.95, 21.00, 1,
      '/assets/123inkt-kopieerpapier-a3-500-vellen.jpg',
      true, 625
    ),
    (
      'Clairefontaine intens gekleurd A4-papier 80 g/m² - 5 x 100 vellen',
      'Kantoorbenodigdheden',
      '123inkt.be',
      '{"artikelnummer":"250012","url":"https://www.123inkt.be/Clairefontaine-multipack-intens-geel-groen-oranje-blauw-roze-80-g-m-5-x-100-vellen-1704-i28418.html","prijsbron":"123inkt.be","prijsdatum":"2026-08-21","prijssoort":"reguliere prijs incl. btw"}',
      'Multipack met telkens 100 A4-vellen in intens geel, groen, oranje, blauw en roze. Papier van 80 g/m², geschikt voor laser- en inkjetprinters.',
      'multipack van 500 vellen',
      13.95, 21.00, 1,
      '/assets/clairefontaine-multipack-intens-a4-500-vellen.jpg',
      true, 630
    ),
    (
      '123inkt lamineerhoezen A3 glanzend 2 x 80 micron - 200 stuks',
      'Kantoorbenodigdheden',
      '123inkt.be',
      '{"artikelnummer":"301602","url":"https://www.123inkt.be/123inkt-Aanbieding-2x-123inkt-document-lamineerhoes-A3-glanzend-2x80-micron-100-stuks-i93208.html","prijsbron":"123inkt.be","prijsdatum":"2026-08-21","prijssoort":"aanbiedingsverpakking incl. btw"}',
      'Voordeelverpakking met 200 glanzende A3-lamineerhoezen van 2 x 80 micron. Geschikt om A3-documenten of kleinere formaten te beschermen.',
      'voordeelpak van 200 hoezen',
      48.50, 21.00, 1,
      '/assets/123inkt-lamineerhoezen-a3-200-stuks.jpg',
      true, 635
    ),
    (
      '123inkt lamineerhoezen A4 glanzend 2 x 80 micron - 300 stuks',
      'Kantoorbenodigdheden',
      '123inkt.be',
      '{"artikelnummer":"300820","url":"https://www.123inkt.be/123inkt-Aanbieding-3x-123inkt-document-lamineerhoes-A4-glanzend-2x80-micron-100-stuks-i73399.html","prijsbron":"123inkt.be","prijsdatum":"2026-08-21","prijssoort":"aanbiedingsverpakking incl. btw"}',
      'Voordeelverpakking met 300 glanzende A4-lamineerhoezen van 2 x 80 micron. Geschikt om A4-documenten of kleinere formaten te beschermen.',
      'voordeelpak van 300 hoezen',
      29.95, 21.00, 1,
      '/assets/123inkt-lamineerhoezen-a4-300-stuks.jpg',
      true, 640
    ),
    (
      'Pritt lijmstift groot 43 gram',
      'Kantoorbenodigdheden',
      '123inkt.be',
      '{"artikelnummer":"201504","url":"https://www.123inkt.be/Pritt-lijmstift-groot-43-gram-1561147-i16250.html","prijsbron":"123inkt.be","prijsdatum":"2026-08-21","prijssoort":"reguliere prijs incl. btw; tijdelijke korting niet overgenomen"}',
      'Grote permanent hechtende Pritt-lijmstift van 43 gram. Geschikt voor papier, karton en foto''s en praktisch voor frequent gebruik of grotere oppervlakken.',
      'lijmstift van 43 gram',
      2.95, 21.00, 1,
      '/assets/pritt-lijmstift-43g.jpg',
      true, 645
    ),
    (
      'Pritt lijmstift medium 22 gram',
      'Kantoorbenodigdheden',
      '123inkt.be',
      '{"artikelnummer":"201502","url":"https://www.123inkt.be/Pritt-lijmstift-medium-22-gram-1561146-i16249.html","prijsbron":"123inkt.be","prijsdatum":"2026-08-21","prijssoort":"reguliere prijs incl. btw; tijdelijke korting niet overgenomen"}',
      'Medium permanent hechtende Pritt-lijmstift van 22 gram. Geschikt voor papier, karton en foto''s en bruikbaar voor algemeen kantoor- en educatief gebruik.',
      'lijmstift van 22 gram',
      2.25, 21.00, 1,
      '/assets/pritt-lijmstift-22g.jpg',
      true, 650
    )
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
  where lower(product.naam) = lower(bron.naam)
  returning product.id
)
insert into public.aankoop_producten (
  naam, categorie, leverancier, leverancier_url, omschrijving, eenheid,
  prijs_excl_btw, btw_percentage, minimum_bestelhoeveelheid, image_url, actief, sort_order
)
select
  bron.naam, bron.categorie, bron.leverancier, bron.leverancier_url, bron.omschrijving, bron.eenheid,
  bron.prijs_excl_btw, bron.btw_percentage, bron.minimum_bestelhoeveelheid, bron.image_url, bron.actief, bron.sort_order
from bron
where not exists (
  select 1
  from public.aankoop_producten product
  where lower(product.naam) = lower(bron.naam)
);

select naam, categorie, leverancier, prijs_excl_btw, btw_percentage, eenheid, image_url, actief
from public.aankoop_producten
where sort_order between 600 and 650
order by sort_order, naam;
