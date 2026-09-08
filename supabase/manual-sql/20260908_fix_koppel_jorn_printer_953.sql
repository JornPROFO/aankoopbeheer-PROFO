-- PROFO Aankoopbeheer - herstel koppeling inventarisitem 953 aan Jorn Thuis.
-- Picture360-identificatie gecontroleerd op 08/09/2026:
-- inventarisnummer PROFO-PT-20XX-018, HP Color LaserJet Pro MFP M283fdw.

begin;

update public.aankoop_printers printer
set
  locatie_id = locatie.id::text,
  locatie_naam = locatie.naam,
  naam = 'HP Printer/Scanner',
  merk = 'HP',
  model = 'HP Color LaserJet Pro MFP M283fdw',
  inventaris_url = 'https://inventaris.picture360.eu/hardware/953',
  actief = true,
  updated_at = now()
from public.locaties locatie
where lower(locatie.naam) = lower('Jorn Thuis')
  and printer.inventaris_id = 'PROFO-PT-20XX-018';

commit;

-- Controle: er moet exact één printerrij verschijnen. Bestaande cartridges blijven
-- gekoppeld omdat de printer-id niet wordt vervangen.
select
  printer.id,
  printer.naam,
  printer.model,
  printer.inventaris_id,
  printer.inventaris_url,
  printer.locatie_naam,
  count(cartridge.id) filter (where cartridge.actief = true) as actieve_cartridges
from public.aankoop_printers printer
left join public.aankoop_printer_cartridges cartridge
  on cartridge.printer_id = printer.id
where printer.inventaris_id = 'PROFO-PT-20XX-018'
group by printer.id, printer.naam, printer.model, printer.inventaris_id,
  printer.inventaris_url, printer.locatie_naam;
