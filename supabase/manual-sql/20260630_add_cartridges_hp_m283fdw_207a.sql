-- PROFO Aankoopbeheer - HP Color LaserJet Pro MFP M283fdw
-- Courante PROFO-printer. Deze printer werkt met HP 207A en HP 207X toners.
-- Deze set voegt de 123inkt-huismerktoners HP 207A toe aan alle actieve M283-printers.
-- Prijzen incl. btw op basis van de doorgegeven 123inkt-screenshots van 30/06/2026.

with doelprinters as (
  select printer.id
  from public.aankoop_printers printer
  where printer.actief = true
    and (
      lower(coalesce(printer.model, '')) like '%m283%'
      or lower(coalesce(printer.naam, '')) like '%m283%'
    )
),
toners(kleur, naam, artikelnummer, leverancier_url, prijs_incl_btw, sort_order) as (
  values
    (
      'BK',
      '123inkt huismerk vervangt HP 207A (W2210A) toner zwart',
      'W2210A',
      'https://www.123inkt.nl/search/?search=W2210A%20123inkt%20huismerk',
      67.50::numeric(12, 2),
      80
    ),
    (
      'C',
      '123inkt huismerk vervangt HP 207A (W2211A) toner cyaan',
      'W2211A',
      'https://www.123inkt.nl/search/?search=W2211A%20123inkt%20huismerk',
      77.50::numeric(12, 2),
      81
    ),
    (
      'Y',
      '123inkt huismerk vervangt HP 207A (W2212A) toner geel',
      'W2212A',
      'https://www.123inkt.nl/search/?search=W2212A%20123inkt%20huismerk',
      77.50::numeric(12, 2),
      82
    ),
    (
      'M',
      '123inkt huismerk vervangt HP 207A (W2213A) toner magenta',
      'W2213A',
      'https://www.123inkt.nl/search/?search=W2213A%20123inkt%20huismerk',
      77.50::numeric(12, 2),
      83
    )
),
conceptregels as (
  select
    doelprinters.id as printer_id,
    toners.kleur,
    toners.naam,
    toners.artikelnummer,
    '123inkt.nl' as leverancier,
    toners.leverancier_url,
    toners.prijs_incl_btw,
    21::numeric(5, 2) as btw_percentage,
    'stuk' as eenheid,
    true as actief,
    toners.sort_order
  from doelprinters
  cross join toners
)
update public.aankoop_printer_cartridges cartridge
set
  naam = conceptregels.naam,
  leverancier = conceptregels.leverancier,
  leverancier_url = conceptregels.leverancier_url,
  prijs_incl_btw = conceptregels.prijs_incl_btw,
  btw_percentage = conceptregels.btw_percentage,
  eenheid = conceptregels.eenheid,
  actief = true,
  sort_order = conceptregels.sort_order,
  updated_at = now()
from conceptregels
where cartridge.printer_id = conceptregels.printer_id
  and cartridge.kleur = conceptregels.kleur
  and cartridge.artikelnummer = conceptregels.artikelnummer;

with doelprinters as (
  select printer.id
  from public.aankoop_printers printer
  where printer.actief = true
    and (
      lower(coalesce(printer.model, '')) like '%m283%'
      or lower(coalesce(printer.naam, '')) like '%m283%'
    )
),
toners(kleur, naam, artikelnummer, leverancier_url, prijs_incl_btw, sort_order) as (
  values
    ('BK', '123inkt huismerk vervangt HP 207A (W2210A) toner zwart', 'W2210A', 'https://www.123inkt.nl/search/?search=W2210A%20123inkt%20huismerk', 67.50::numeric(12, 2), 80),
    ('C', '123inkt huismerk vervangt HP 207A (W2211A) toner cyaan', 'W2211A', 'https://www.123inkt.nl/search/?search=W2211A%20123inkt%20huismerk', 77.50::numeric(12, 2), 81),
    ('Y', '123inkt huismerk vervangt HP 207A (W2212A) toner geel', 'W2212A', 'https://www.123inkt.nl/search/?search=W2212A%20123inkt%20huismerk', 77.50::numeric(12, 2), 82),
    ('M', '123inkt huismerk vervangt HP 207A (W2213A) toner magenta', 'W2213A', 'https://www.123inkt.nl/search/?search=W2213A%20123inkt%20huismerk', 77.50::numeric(12, 2), 83)
),
conceptregels as (
  select
    doelprinters.id as printer_id,
    toners.kleur,
    toners.naam,
    toners.artikelnummer,
    '123inkt.nl' as leverancier,
    toners.leverancier_url,
    toners.prijs_incl_btw,
    21::numeric(5, 2) as btw_percentage,
    'stuk' as eenheid,
    true as actief,
    toners.sort_order
  from doelprinters
  cross join toners
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
);

select
  printer.locatie_naam,
  printer.naam as printer_naam,
  printer.model,
  printer.inventaris_id,
  cartridge.kleur,
  cartridge.naam,
  cartridge.artikelnummer,
  cartridge.prijs_incl_btw,
  cartridge.actief
from public.aankoop_printers printer
join public.aankoop_printer_cartridges cartridge
  on cartridge.printer_id = printer.id
where printer.actief = true
  and (
    lower(coalesce(printer.model, '')) like '%m283%'
    or lower(coalesce(printer.naam, '')) like '%m283%'
  )
order by printer.locatie_naam, printer.inventaris_id, cartridge.sort_order, cartridge.kleur;
