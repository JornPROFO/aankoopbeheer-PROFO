-- PROFO Aankoopbeheer - koppel bestaande M282/M283-cartridges aan Jorns printer.
-- De bestaande catalogusgegevens worden hergebruikt; er worden geen nieuwe
-- productnamen, prijzen of leverancierslinks verondersteld.

begin;

with doelprinter as (
  select id
  from public.aankoop_printers
  where inventaris_id = 'PROFO-PT-20XX-018'
),
bronregels as (
  select distinct on (cartridge.kleur, cartridge.artikelnummer)
    cartridge.kleur,
    cartridge.naam,
    cartridge.artikelnummer,
    cartridge.leverancier,
    cartridge.leverancier_url,
    cartridge.prijs_incl_btw,
    cartridge.btw_percentage,
    cartridge.eenheid,
    cartridge.image_url,
    cartridge.sort_order
  from public.aankoop_printer_cartridges cartridge
  join public.aankoop_printers printer
    on printer.id = cartridge.printer_id
  where printer.actief = true
    and cartridge.actief = true
    and printer.inventaris_id <> 'PROFO-PT-20XX-018'
    and (
      lower(coalesce(printer.model, '')) like '%m282%'
      or lower(coalesce(printer.model, '')) like '%m283%'
      or lower(coalesce(printer.naam, '')) like '%m282%'
      or lower(coalesce(printer.naam, '')) like '%m283%'
    )
  order by cartridge.kleur, cartridge.artikelnummer, cartridge.updated_at desc, cartridge.id desc
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
  image_url,
  actief,
  sort_order
)
select
  doelprinter.id,
  bronregels.kleur,
  bronregels.naam,
  bronregels.artikelnummer,
  bronregels.leverancier,
  bronregels.leverancier_url,
  bronregels.prijs_incl_btw,
  bronregels.btw_percentage,
  bronregels.eenheid,
  bronregels.image_url,
  true,
  bronregels.sort_order
from doelprinter
cross join bronregels
where not exists (
  select 1
  from public.aankoop_printer_cartridges bestaand
  where bestaand.printer_id = doelprinter.id
    and bestaand.kleur = bronregels.kleur
    and coalesce(bestaand.artikelnummer, '') = coalesce(bronregels.artikelnummer, '')
);

commit;

-- Controle: dit overzicht moet de bestelbare toners voor Jorn Thuis tonen.
select
  printer.locatie_naam,
  printer.naam as printer,
  printer.model,
  cartridge.kleur,
  cartridge.naam as cartridge,
  cartridge.artikelnummer,
  cartridge.prijs_incl_btw,
  cartridge.actief
from public.aankoop_printers printer
join public.aankoop_printer_cartridges cartridge
  on cartridge.printer_id = printer.id
where printer.inventaris_id = 'PROFO-PT-20XX-018'
order by cartridge.sort_order, cartridge.kleur, cartridge.naam;
