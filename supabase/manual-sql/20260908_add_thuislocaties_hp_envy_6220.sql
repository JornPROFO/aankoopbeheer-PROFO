-- PROFO Aankoopbeheer - thuislocaties en HP ENVY Photo 6220.
-- Veilig opnieuw uitvoerbaar.

begin;

alter table public.aankoop_printers
  add column if not exists image_url text;

alter table public.aankoop_printer_cartridges
  add column if not exists image_url text;

update public.locaties
set adres = 'Maasfortbaan 108, 2500 Lier', actief = true
where lower(naam) = lower('Jorn Thuis');

insert into public.locaties (naam, adres, actief, sort_order)
select 'Jorn Thuis', 'Maasfortbaan 108, 2500 Lier', true, 900
where not exists (
  select 1 from public.locaties where lower(naam) = lower('Jorn Thuis')
);

update public.locaties
set adres = 'Ravenshoek 7, 3020 Herent', actief = true
where lower(naam) = lower('Karima Thuis');

insert into public.locaties (naam, adres, actief, sort_order)
select 'Karima Thuis', 'Ravenshoek 7, 3020 Herent', true, 910
where not exists (
  select 1 from public.locaties where lower(naam) = lower('Karima Thuis')
);

-- Verplaats het bestaande inventaristoestel van Jorn. De bestaande cartridgekoppelingen
-- blijven behouden doordat de printerrij zelf behouden blijft.
update public.aankoop_printers printer
set
  locatie_id = locatie.id::text,
  locatie_naam = locatie.naam,
  inventaris_url = 'https://inventaris.picture360.eu/hardware/953',
  actief = true,
  updated_at = now()
from public.locaties locatie
where lower(locatie.naam) = lower('Jorn Thuis')
  and (
    printer.inventaris_url like '%/hardware/953%'
    or printer.inventaris_id in ('953', 'PICTURE360-953')
  );

-- Voeg Karima's printer toe of werk hem bij op basis van de unieke inventarislink.
update public.aankoop_printers printer
set
  locatie_id = locatie.id::text,
  locatie_naam = locatie.naam,
  naam = 'HP ENVY Photo 6220',
  merk = 'HP',
  model = 'HP ENVY Photo 6220',
  inventaris_url = 'https://inventaris.picture360.eu/hardware/139',
  image_url = '/assets/hp-envy-photo-6220.png',
  actief = true,
  updated_at = now()
from public.locaties locatie
where lower(locatie.naam) = lower('Karima Thuis')
  and (
    printer.inventaris_url like '%/hardware/139%'
    or printer.inventaris_id in ('139', 'PICTURE360-139')
  );

insert into public.aankoop_printers (
  locatie_id, locatie_naam, naam, merk, model, inventaris_id,
  inventaris_url, image_url, actief, sort_order
)
select
  locatie.id::text, locatie.naam, 'HP ENVY Photo 6220', 'HP',
  'HP ENVY Photo 6220', 'PICTURE360-139',
  'https://inventaris.picture360.eu/hardware/139',
  '/assets/hp-envy-photo-6220.png', true, 100
from public.locaties locatie
where lower(locatie.naam) = lower('Karima Thuis')
  and not exists (
    select 1
    from public.aankoop_printers printer
    where printer.inventaris_url like '%/hardware/139%'
       or printer.inventaris_id in ('139', 'PICTURE360-139')
  );

-- HP bevestigt HP 303/303XL zwart en driekleur voor de ENVY Photo 6220.
update public.aankoop_printer_cartridges cartridge
set
  kleur = 'SET',
  naam = '123inkt huismerk HP 303 zwart + kleur doublepack',
  leverancier = '123inkt.be',
  leverancier_url = 'https://www.123inkt.be/HP-Aanbieding-123inkt-huismerk-vervangt-HP-303-zwart-kleur-3YM92AEC-i91912.html',
  prijs_incl_btw = 59.50,
  btw_percentage = 21,
  eenheid = 'set',
  image_url = '/assets/123inkt-hp-303-zwart-kleur-doublepack.jpg',
  actief = true,
  updated_at = now()
from public.aankoop_printers printer
where cartridge.printer_id = printer.id
  and printer.inventaris_url like '%/hardware/139%'
  and cartridge.artikelnummer = '3YM92AE';

insert into public.aankoop_printer_cartridges (
  printer_id, kleur, naam, artikelnummer, leverancier, leverancier_url,
  prijs_incl_btw, btw_percentage, eenheid, image_url, actief, sort_order
)
select
  printer.id, 'SET', '123inkt huismerk HP 303 zwart + kleur doublepack',
  '3YM92AE', '123inkt.be',
  'https://www.123inkt.be/HP-Aanbieding-123inkt-huismerk-vervangt-HP-303-zwart-kleur-3YM92AEC-i91912.html',
  59.50, 21, 'set', '/assets/123inkt-hp-303-zwart-kleur-doublepack.jpg', true, 100
from public.aankoop_printers printer
where printer.inventaris_url like '%/hardware/139%'
  and not exists (
    select 1
    from public.aankoop_printer_cartridges cartridge
    where cartridge.printer_id = printer.id
      and cartridge.artikelnummer = '3YM92AE'
  );

commit;

-- Controle: beide thuislocaties, hun printers en de gekoppelde cartridges.
select
  locatie.naam as locatie,
  locatie.adres,
  printer.naam as printer,
  printer.inventaris_url,
  cartridge.naam as cartridge,
  cartridge.artikelnummer,
  cartridge.prijs_incl_btw
from public.locaties locatie
left join public.aankoop_printers printer
  on printer.locatie_id = locatie.id::text
left join public.aankoop_printer_cartridges cartridge
  on cartridge.printer_id = printer.id and cartridge.actief = true
where lower(locatie.naam) in (lower('Jorn Thuis'), lower('Karima Thuis'))
order by locatie.naam, printer.naam, cartridge.sort_order;

-- Als Jorn hieronder niet verschijnt, bestond inventarisitem 953 nog niet in de
-- printertabel. Voeg het dan niet blind toe: model en inventarisnummer eerst controleren.
select id, naam, model, inventaris_id, inventaris_url, locatie_naam
from public.aankoop_printers
where inventaris_url like '%/hardware/953%'
   or inventaris_id in ('953', 'PICTURE360-953');
