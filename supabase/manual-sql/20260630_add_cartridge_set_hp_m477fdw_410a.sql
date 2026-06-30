-- PROFO Aankoopbeheer - multipack HP 410A voor HP M477fdw.
-- Voer dit uit na 20260629_aankoopbeheer_inktmodule.sql.
-- Dit voegt de 123inkt-huismerkset zwart + 3 kleuren toe aan alle actieve M477fdw-printers.
-- Prijs incl. btw op basis van de doorgegeven 123inkt-screenshot van 30/06/2026.

alter table public.aankoop_printer_cartridges
  drop constraint if exists aankoop_printer_cartridges_kleur_check;

alter table public.aankoop_printer_cartridges
  add constraint aankoop_printer_cartridges_kleur_check
  check (kleur in ('BK', 'C', 'M', 'Y', 'SET'));

with doelprinters as (
  select printer.id
  from public.aankoop_printers printer
  where printer.actief = true
    and (
      lower(coalesce(printer.model, '')) like '%m477%'
      or lower(coalesce(printer.naam, '')) like '%m477%'
    )
),
conceptregels as (
  select
    doelprinters.id as printer_id,
    'SET' as kleur,
    '123inkt huismerk set voor HP 410A zwart + 3 kleuren' as naam,
    'CF410A/CF411A/CF412A/CF413A' as artikelnummer,
    '123inkt.nl' as leverancier,
    'https://www.123inkt.nl/search/?search=HP%20410A%20set%20123inkt%20huismerk' as leverancier_url,
    345.50::numeric(12, 2) as prijs_incl_btw,
    21::numeric(5, 2) as btw_percentage,
    'set' as eenheid,
    true as actief,
    70 as sort_order
  from doelprinters
)
update public.aankoop_printer_cartridges cartridge
set
  naam = conceptregels.naam,
  artikelnummer = conceptregels.artikelnummer,
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
      lower(coalesce(printer.model, '')) like '%m477%'
      or lower(coalesce(printer.naam, '')) like '%m477%'
    )
),
conceptregels as (
  select
    doelprinters.id as printer_id,
    'SET' as kleur,
    '123inkt huismerk set voor HP 410A zwart + 3 kleuren' as naam,
    'CF410A/CF411A/CF412A/CF413A' as artikelnummer,
    '123inkt.nl' as leverancier,
    'https://www.123inkt.nl/search/?search=HP%20410A%20set%20123inkt%20huismerk' as leverancier_url,
    345.50::numeric(12, 2) as prijs_incl_btw,
    21::numeric(5, 2) as btw_percentage,
    'set' as eenheid,
    true as actief,
    70 as sort_order
  from doelprinters
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
  and cartridge.kleur = 'SET'
  and (
    lower(coalesce(printer.model, '')) like '%m477%'
    or lower(coalesce(printer.naam, '')) like '%m477%'
  )
order by printer.locatie_naam, printer.inventaris_id;
