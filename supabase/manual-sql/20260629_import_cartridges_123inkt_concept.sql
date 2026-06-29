-- PROFO Aankoopbeheer - conceptimport toners/cartridges per printermodel.
-- Basis: Picture360-printerlijst + gangbare HP-tonercodes per model.
-- Belangrijk:
-- 1. Deze regels worden bewust inactief aangemaakt.
-- 2. Controleer per regel in beheer de 123inkt.nl-variant, prijs incl. btw en leverbaarheid.
-- 3. Activeer daarna pas de regels die medewerkers effectief mogen bestellen.
-- 4. Dymo, Ricoh, Kyocera en onduidelijke HP Color Laserjet Pro zijn niet automatisch gekoppeld.

with printer_koppeling(inventaris_id, toner_set) as (
  values
    ('PROFO-PT-20XX-015', 'HP_5550N_645A'),
    ('PROFO-PT-2024-001', 'HP_4302FDW_220X'),
    ('PROFO-PT-20XX-017', 'HP_4250_42X'),
    ('PROFO-PT-20XX-004', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-005', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-006', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-007', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-008', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-009', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-010', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-013', 'HP_P4015X_64X'),
    ('PROFO-PT-20XX-014', 'HP_P4015X_64X'),
    ('PROFO-PT-2023-004', 'HP_M479FDW_415X'),
    ('PROFO-PT-2019-002', 'HP_M477FDW_410X'),
    ('PROFO-PT-2019-003', 'HP_M477FDW_410X'),
    ('PROFO-PT-2020-001', 'HP_M479FDW_415X'),
    ('PROFO-PT-2020-003', 'HP_M282_M283_207X'),
    ('PROFO-PT-2020-006', 'HP_M479FDW_415X'),
    ('PROFO-PT-2021-001', 'HP_M479FDW_415X'),
    ('PROFO-PT-2021-002', 'HP_M282_M283_207X'),
    ('PROFO-PT-2022-001', 'HP_M282_M283_207X'),
    ('PROFO-PT-2023-003', 'HP_M282_M283_207X')
),
cartridges(toner_set, kleur, naam, artikelnummer, leverancier_url, sort_order) as (
  values
    ('HP_4250_42X', 'BK', '123inkt huismerk alternatief voor HP 42X zwart', 'Q5942X', 'https://www.123inkt.nl/search/?search=Q5942X%20huismerk', 100),
    ('HP_4250_42X', 'BK', 'Originele HP 42X zwarte toner', 'Q5942X', 'https://www.123inkt.nl/search/?search=Q5942X%20HP', 110),

    ('HP_P4015X_64X', 'BK', '123inkt huismerk alternatief voor HP 64X zwart', 'CC364X', 'https://www.123inkt.nl/search/?search=CC364X%20huismerk', 100),
    ('HP_P4015X_64X', 'BK', 'Originele HP 64X zwarte toner', 'CC364X', 'https://www.123inkt.nl/search/?search=CC364X%20HP', 110),

    ('HP_5550N_645A', 'BK', '123inkt huismerk alternatief voor HP 645A zwart', 'C9730A', 'https://www.123inkt.nl/search/?search=C9730A%20huismerk', 100),
    ('HP_5550N_645A', 'C', '123inkt huismerk alternatief voor HP 645A cyaan', 'C9731A', 'https://www.123inkt.nl/search/?search=C9731A%20huismerk', 101),
    ('HP_5550N_645A', 'Y', '123inkt huismerk alternatief voor HP 645A geel', 'C9732A', 'https://www.123inkt.nl/search/?search=C9732A%20huismerk', 102),
    ('HP_5550N_645A', 'M', '123inkt huismerk alternatief voor HP 645A magenta', 'C9733A', 'https://www.123inkt.nl/search/?search=C9733A%20huismerk', 103),
    ('HP_5550N_645A', 'BK', 'Originele HP 645A zwarte toner', 'C9730A', 'https://www.123inkt.nl/search/?search=C9730A%20HP', 110),
    ('HP_5550N_645A', 'C', 'Originele HP 645A cyaan toner', 'C9731A', 'https://www.123inkt.nl/search/?search=C9731A%20HP', 111),
    ('HP_5550N_645A', 'Y', 'Originele HP 645A gele toner', 'C9732A', 'https://www.123inkt.nl/search/?search=C9732A%20HP', 112),
    ('HP_5550N_645A', 'M', 'Originele HP 645A magenta toner', 'C9733A', 'https://www.123inkt.nl/search/?search=C9733A%20HP', 113),

    ('HP_4302FDW_220X', 'BK', '123inkt huismerk alternatief voor HP 220X zwart', 'W2200X', 'https://www.123inkt.nl/search/?search=W2200X%20huismerk', 100),
    ('HP_4302FDW_220X', 'C', '123inkt huismerk alternatief voor HP 220X cyaan', 'W2201X', 'https://www.123inkt.nl/search/?search=W2201X%20huismerk', 101),
    ('HP_4302FDW_220X', 'Y', '123inkt huismerk alternatief voor HP 220X geel', 'W2202X', 'https://www.123inkt.nl/search/?search=W2202X%20huismerk', 102),
    ('HP_4302FDW_220X', 'M', '123inkt huismerk alternatief voor HP 220X magenta', 'W2203X', 'https://www.123inkt.nl/search/?search=W2203X%20huismerk', 103),
    ('HP_4302FDW_220X', 'BK', 'Originele HP 220X zwarte toner', 'W2200X', 'https://www.123inkt.nl/search/?search=W2200X%20HP', 110),
    ('HP_4302FDW_220X', 'C', 'Originele HP 220X cyaan toner', 'W2201X', 'https://www.123inkt.nl/search/?search=W2201X%20HP', 111),
    ('HP_4302FDW_220X', 'Y', 'Originele HP 220X gele toner', 'W2202X', 'https://www.123inkt.nl/search/?search=W2202X%20HP', 112),
    ('HP_4302FDW_220X', 'M', 'Originele HP 220X magenta toner', 'W2203X', 'https://www.123inkt.nl/search/?search=W2203X%20HP', 113),

    ('HP_M479FDW_415X', 'BK', '123inkt huismerk alternatief voor HP 415X zwart', 'W2030X', 'https://www.123inkt.nl/search/?search=W2030X%20huismerk', 100),
    ('HP_M479FDW_415X', 'C', '123inkt huismerk alternatief voor HP 415X cyaan', 'W2031X', 'https://www.123inkt.nl/search/?search=W2031X%20huismerk', 101),
    ('HP_M479FDW_415X', 'Y', '123inkt huismerk alternatief voor HP 415X geel', 'W2032X', 'https://www.123inkt.nl/search/?search=W2032X%20huismerk', 102),
    ('HP_M479FDW_415X', 'M', '123inkt huismerk alternatief voor HP 415X magenta', 'W2033X', 'https://www.123inkt.nl/search/?search=W2033X%20huismerk', 103),
    ('HP_M479FDW_415X', 'BK', 'Originele HP 415X zwarte toner', 'W2030X', 'https://www.123inkt.nl/search/?search=W2030X%20HP', 110),
    ('HP_M479FDW_415X', 'C', 'Originele HP 415X cyaan toner', 'W2031X', 'https://www.123inkt.nl/search/?search=W2031X%20HP', 111),
    ('HP_M479FDW_415X', 'Y', 'Originele HP 415X gele toner', 'W2032X', 'https://www.123inkt.nl/search/?search=W2032X%20HP', 112),
    ('HP_M479FDW_415X', 'M', 'Originele HP 415X magenta toner', 'W2033X', 'https://www.123inkt.nl/search/?search=W2033X%20HP', 113),

    ('HP_M477FDW_410X', 'BK', '123inkt huismerk alternatief voor HP 410X zwart', 'CF410X', 'https://www.123inkt.nl/search/?search=CF410X%20huismerk', 100),
    ('HP_M477FDW_410X', 'C', '123inkt huismerk alternatief voor HP 410X cyaan', 'CF411X', 'https://www.123inkt.nl/search/?search=CF411X%20huismerk', 101),
    ('HP_M477FDW_410X', 'Y', '123inkt huismerk alternatief voor HP 410X geel', 'CF412X', 'https://www.123inkt.nl/search/?search=CF412X%20huismerk', 102),
    ('HP_M477FDW_410X', 'M', '123inkt huismerk alternatief voor HP 410X magenta', 'CF413X', 'https://www.123inkt.nl/search/?search=CF413X%20huismerk', 103),
    ('HP_M477FDW_410X', 'BK', 'Originele HP 410X zwarte toner', 'CF410X', 'https://www.123inkt.nl/search/?search=CF410X%20HP', 110),
    ('HP_M477FDW_410X', 'C', 'Originele HP 410X cyaan toner', 'CF411X', 'https://www.123inkt.nl/search/?search=CF411X%20HP', 111),
    ('HP_M477FDW_410X', 'Y', 'Originele HP 410X gele toner', 'CF412X', 'https://www.123inkt.nl/search/?search=CF412X%20HP', 112),
    ('HP_M477FDW_410X', 'M', 'Originele HP 410X magenta toner', 'CF413X', 'https://www.123inkt.nl/search/?search=CF413X%20HP', 113),

    ('HP_M282_M283_207X', 'BK', '123inkt huismerk alternatief voor HP 207X zwart', 'W2210X', 'https://www.123inkt.nl/search/?search=W2210X%20huismerk', 100),
    ('HP_M282_M283_207X', 'C', '123inkt huismerk alternatief voor HP 207X cyaan', 'W2211X', 'https://www.123inkt.nl/search/?search=W2211X%20huismerk', 101),
    ('HP_M282_M283_207X', 'Y', '123inkt huismerk alternatief voor HP 207X geel', 'W2212X', 'https://www.123inkt.nl/search/?search=W2212X%20huismerk', 102),
    ('HP_M282_M283_207X', 'M', '123inkt huismerk alternatief voor HP 207X magenta', 'W2213X', 'https://www.123inkt.nl/search/?search=W2213X%20huismerk', 103),
    ('HP_M282_M283_207X', 'BK', 'Originele HP 207X zwarte toner', 'W2210X', 'https://www.123inkt.nl/search/?search=W2210X%20HP', 110),
    ('HP_M282_M283_207X', 'C', 'Originele HP 207X cyaan toner', 'W2211X', 'https://www.123inkt.nl/search/?search=W2211X%20HP', 111),
    ('HP_M282_M283_207X', 'Y', 'Originele HP 207X gele toner', 'W2212X', 'https://www.123inkt.nl/search/?search=W2212X%20HP', 112),
    ('HP_M282_M283_207X', 'M', 'Originele HP 207X magenta toner', 'W2213X', 'https://www.123inkt.nl/search/?search=W2213X%20HP', 113)
),
conceptregels as (
  select
    printer.id as printer_id,
    cartridges.kleur,
    cartridges.naam,
    cartridges.artikelnummer,
    '123inkt.nl' as leverancier,
    cartridges.leverancier_url,
    0::numeric(12, 2) as prijs_incl_btw,
    21::numeric(5, 2) as btw_percentage,
    'stuk' as eenheid,
    false as actief,
    cartridges.sort_order
  from public.aankoop_printers printer
  join printer_koppeling koppeling
    on koppeling.inventaris_id = printer.inventaris_id
  join cartridges
    on cartridges.toner_set = koppeling.toner_set
)
insert into public.aankoop_printer_cartridges (
  printer_id,
  kleur,
  naam,
  artikelnummer,
  leverancier,
  leverancier_url,
  prijs_incl_btw,
  btw_percentage,
  eenheid,
  actief,
  sort_order
)
select
  conceptregels.printer_id,
  conceptregels.kleur,
  conceptregels.naam,
  conceptregels.artikelnummer,
  conceptregels.leverancier,
  conceptregels.leverancier_url,
  conceptregels.prijs_incl_btw,
  conceptregels.btw_percentage,
  conceptregels.eenheid,
  conceptregels.actief,
  conceptregels.sort_order
from conceptregels
where not exists (
  select 1
  from public.aankoop_printer_cartridges bestaand
  where bestaand.printer_id = conceptregels.printer_id
    and bestaand.kleur = conceptregels.kleur
    and bestaand.artikelnummer = conceptregels.artikelnummer
    and bestaand.naam = conceptregels.naam
);

-- Controle: printers waarvoor nog geen conceptkoppeling gemaakt kon worden.
select
  printer.locatie_naam,
  printer.naam,
  printer.model,
  printer.inventaris_id
from public.aankoop_printers printer
where printer.actief = true
  and not exists (
    select 1
    from public.aankoop_printer_cartridges cartridge
    where cartridge.printer_id = printer.id
  )
order by printer.locatie_naam, printer.naam, printer.inventaris_id;
