-- PROFO Aankoopbeheer - import printers uit Picture360-export van 29/06/2026.
-- Eerst 20260629_aankoopbeheer_inktmodule.sql uitvoeren.
-- De import gebruikt het inventarisnummer als herkenningspunt, zodat opnieuw uitvoeren geen dubbele printers maakt.

with bron(locatie_naam, printer_naam, merk, model, inventaris_id, inventaris_url, sort_order) as (
  values
    ('Merksem', 'Dymo Label Manager', 'Dymo', 'Dymo Labelmaker 350D', 'PROFO-PT-20XX-016', '', 100),
    ('Brussel', 'Dymo Labelwriter', 'Dymo', 'Dymo Labelwriter 450', 'PROFO-PT-20XX-011', '', 100),
    ('Merksem', 'HP Color Laserjet A3 kleurenprinter', 'HP', 'HP Color Laserjet 5550n', 'PROFO-PT-20XX-015', '', 100),
    ('Heist Op Den Berg', 'HP Color LaserJet Pro MFP 4302fdw', 'HP', 'HP printer/scanner', 'PROFO-PT-2024-001', 'https://inventaris.picture360.eu/hardware/966', 100),
    ('Zele', 'HP Laserjet 4250', 'HP', 'HP Laserjet 4250dtn', 'PROFO-PT-20XX-017', '', 100),
    ('Leuven', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-004', 'https://inventaris.picture360.eu/hardware/600', 100),
    ('Hasselt', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-005', '', 100),
    ('Heist Op Den Berg', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-006', '', 100),
    ('Heist Op Den Berg', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-007', '', 100),
    ('Nieuwpoort', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-008', '', 100),
    ('Oostende', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-009', '', 100),
    ('Maasmechelen', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-010', '', 100),
    ('Merksem', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-013', '', 100),
    ('Merksem', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-014', '', 100),
    ('Mechelen', 'HP LASERJET PRO MFP M479fdw', 'HP', 'HP printer/scanner', 'PROFO-PT-2023-004', '', 100),
    ('Merksem', 'HP Printer/Scanner', 'HP', 'HP Laserjet M477fdw', 'PROFO-PT-2019-002', '', 100),
    ('Oostende', 'HP Printer/Scanner', 'HP', 'HP Laserjet M477fdw', 'PROFO-PT-2019-003', '', 100),
    ('Nieuwpoort', 'HP printer/scanner', 'HP', 'HP MFP M479fdw', 'PROFO-PT-2020-001', '', 100),
    ('Lommel', 'HP printer/scanner', 'HP', 'HP MFP M282nw', 'PROFO-PT-2020-003', '', 100),
    ('Sint-Niklaas', 'HP printer/scanner', 'HP', 'HP MFP M479fdw', 'PROFO-PT-2020-006', '', 100),
    ('Oudenaarde', 'HP printer/scanner', 'HP', 'HP MFP M479fdw', 'PROFO-PT-2021-001', '', 100),
    ('Maasmechelen', 'HP printer/scanner', 'HP', 'HP M283fdw', 'PROFO-PT-2021-002', '', 100),
    ('Leuven', 'HP printer/scanner', 'HP', 'HP M283fdw', 'PROFO-PT-2022-001', '', 100),
    ('Oostende', 'HP printer/scanner', 'HP', 'HP M283fdw', 'PROFO-PT-2023-003', '', 100),
    ('Brussel', 'HP Printer/Scanner', 'HP', 'HP Color Laserjet Pro', 'PROFO-PT-20XX-018', '', 100),
    ('Maasmechelen', 'KYOCERA printer', 'KYOCERA', 'KYOCERA', 'PROFO-PT-2024-003', '', 100),
    ('Oudenaarde', 'Ricoh Gelprinter', 'Ricoh', 'Ricoh Gelprinter', 'PROFO-PT-20XX-002', '', 100)
),
bron_met_locatie as (
  select
    locatie.id::text as locatie_id,
    locatie.naam as locatie_naam,
    bron.printer_naam,
    bron.merk,
    bron.model,
    bron.inventaris_id,
    nullif(bron.inventaris_url, '') as inventaris_url,
    bron.sort_order
  from bron
  join public.locaties locatie
    on regexp_replace(lower(locatie.naam), '[^a-z0-9]+', '', 'g')
     = regexp_replace(lower(bron.locatie_naam), '[^a-z0-9]+', '', 'g')
)
update public.aankoop_printers printer
set
  locatie_id = bron.locatie_id,
  locatie_naam = bron.locatie_naam,
  naam = bron.printer_naam,
  merk = bron.merk,
  model = bron.model,
  inventaris_url = bron.inventaris_url,
  sort_order = bron.sort_order,
  actief = true,
  updated_at = now()
from bron_met_locatie bron
where printer.inventaris_id = bron.inventaris_id;

with bron(locatie_naam, printer_naam, merk, model, inventaris_id, inventaris_url, sort_order) as (
  values
    ('Merksem', 'Dymo Label Manager', 'Dymo', 'Dymo Labelmaker 350D', 'PROFO-PT-20XX-016', '', 100),
    ('Brussel', 'Dymo Labelwriter', 'Dymo', 'Dymo Labelwriter 450', 'PROFO-PT-20XX-011', '', 100),
    ('Merksem', 'HP Color Laserjet A3 kleurenprinter', 'HP', 'HP Color Laserjet 5550n', 'PROFO-PT-20XX-015', '', 100),
    ('Heist Op Den Berg', 'HP Color LaserJet Pro MFP 4302fdw', 'HP', 'HP printer/scanner', 'PROFO-PT-2024-001', 'https://inventaris.picture360.eu/hardware/966', 100),
    ('Zele', 'HP Laserjet 4250', 'HP', 'HP Laserjet 4250dtn', 'PROFO-PT-20XX-017', '', 100),
    ('Leuven', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-004', 'https://inventaris.picture360.eu/hardware/600', 100),
    ('Hasselt', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-005', '', 100),
    ('Heist Op Den Berg', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-006', '', 100),
    ('Heist Op Den Berg', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-007', '', 100),
    ('Nieuwpoort', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-008', '', 100),
    ('Oostende', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-009', '', 100),
    ('Maasmechelen', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-010', '', 100),
    ('Merksem', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-013', '', 100),
    ('Merksem', 'HP Laserjet P4015x', 'HP', 'HP Laserjet', 'PROFO-PT-20XX-014', '', 100),
    ('Mechelen', 'HP LASERJET PRO MFP M479fdw', 'HP', 'HP printer/scanner', 'PROFO-PT-2023-004', '', 100),
    ('Merksem', 'HP Printer/Scanner', 'HP', 'HP Laserjet M477fdw', 'PROFO-PT-2019-002', '', 100),
    ('Oostende', 'HP Printer/Scanner', 'HP', 'HP Laserjet M477fdw', 'PROFO-PT-2019-003', '', 100),
    ('Nieuwpoort', 'HP printer/scanner', 'HP', 'HP MFP M479fdw', 'PROFO-PT-2020-001', '', 100),
    ('Lommel', 'HP printer/scanner', 'HP', 'HP MFP M282nw', 'PROFO-PT-2020-003', '', 100),
    ('Sint-Niklaas', 'HP printer/scanner', 'HP', 'HP MFP M479fdw', 'PROFO-PT-2020-006', '', 100),
    ('Oudenaarde', 'HP printer/scanner', 'HP', 'HP MFP M479fdw', 'PROFO-PT-2021-001', '', 100),
    ('Maasmechelen', 'HP printer/scanner', 'HP', 'HP M283fdw', 'PROFO-PT-2021-002', '', 100),
    ('Leuven', 'HP printer/scanner', 'HP', 'HP M283fdw', 'PROFO-PT-2022-001', '', 100),
    ('Oostende', 'HP printer/scanner', 'HP', 'HP M283fdw', 'PROFO-PT-2023-003', '', 100),
    ('Brussel', 'HP Printer/Scanner', 'HP', 'HP Color Laserjet Pro', 'PROFO-PT-20XX-018', '', 100),
    ('Maasmechelen', 'KYOCERA printer', 'KYOCERA', 'KYOCERA', 'PROFO-PT-2024-003', '', 100),
    ('Oudenaarde', 'Ricoh Gelprinter', 'Ricoh', 'Ricoh Gelprinter', 'PROFO-PT-20XX-002', '', 100)
),
bron_met_locatie as (
  select
    locatie.id::text as locatie_id,
    locatie.naam as locatie_naam,
    bron.printer_naam,
    bron.merk,
    bron.model,
    bron.inventaris_id,
    nullif(bron.inventaris_url, '') as inventaris_url,
    bron.sort_order
  from bron
  join public.locaties locatie
    on regexp_replace(lower(locatie.naam), '[^a-z0-9]+', '', 'g')
     = regexp_replace(lower(bron.locatie_naam), '[^a-z0-9]+', '', 'g')
)
insert into public.aankoop_printers (
  locatie_id,
  locatie_naam,
  naam,
  merk,
  model,
  inventaris_id,
  inventaris_url,
  actief,
  sort_order
)
select
  bron.locatie_id,
  bron.locatie_naam,
  bron.printer_naam,
  bron.merk,
  bron.model,
  bron.inventaris_id,
  bron.inventaris_url,
  true,
  bron.sort_order
from bron_met_locatie bron
where not exists (
  select 1
  from public.aankoop_printers printer
  where printer.inventaris_id = bron.inventaris_id
);

-- Controle: toont bronlocaties waarvoor geen actieve locatie in Supabase werd gevonden.
with bron(locatie_naam, inventaris_id) as (
  values
    ('Merksem', 'PROFO-PT-20XX-016'),
    ('Brussel', 'PROFO-PT-20XX-011'),
    ('Merksem', 'PROFO-PT-20XX-015'),
    ('Heist Op Den Berg', 'PROFO-PT-2024-001'),
    ('Zele', 'PROFO-PT-20XX-017'),
    ('Leuven', 'PROFO-PT-20XX-004'),
    ('Hasselt', 'PROFO-PT-20XX-005'),
    ('Heist Op Den Berg', 'PROFO-PT-20XX-006'),
    ('Heist Op Den Berg', 'PROFO-PT-20XX-007'),
    ('Nieuwpoort', 'PROFO-PT-20XX-008'),
    ('Oostende', 'PROFO-PT-20XX-009'),
    ('Maasmechelen', 'PROFO-PT-20XX-010'),
    ('Merksem', 'PROFO-PT-20XX-013'),
    ('Merksem', 'PROFO-PT-20XX-014'),
    ('Mechelen', 'PROFO-PT-2023-004'),
    ('Merksem', 'PROFO-PT-2019-002'),
    ('Oostende', 'PROFO-PT-2019-003'),
    ('Nieuwpoort', 'PROFO-PT-2020-001'),
    ('Lommel', 'PROFO-PT-2020-003'),
    ('Sint-Niklaas', 'PROFO-PT-2020-006'),
    ('Oudenaarde', 'PROFO-PT-2021-001'),
    ('Maasmechelen', 'PROFO-PT-2021-002'),
    ('Leuven', 'PROFO-PT-2022-001'),
    ('Oostende', 'PROFO-PT-2023-003'),
    ('Brussel', 'PROFO-PT-20XX-018'),
    ('Maasmechelen', 'PROFO-PT-2024-003'),
    ('Oudenaarde', 'PROFO-PT-20XX-002')
)
select bron.*
from bron
where not exists (
  select 1
  from public.locaties locatie
  where regexp_replace(lower(locatie.naam), '[^a-z0-9]+', '', 'g')
      = regexp_replace(lower(bron.locatie_naam), '[^a-z0-9]+', '', 'g')
);
