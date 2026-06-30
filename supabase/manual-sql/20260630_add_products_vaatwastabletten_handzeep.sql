-- PROFO Aankoopbeheer - producten toevoegen: vaatwastabletten + handzeep
-- Voer dit bestand volledig uit in de Supabase SQL Editor.
-- De kolom heet technisch prijs_excl_btw, maar de app gebruikt dit veld momenteel als prijs inclusief btw.

insert into public.aankoop_producten (
  naam,
  categorie,
  leverancier,
  leverancier_url,
  omschrijving,
  eenheid,
  prijs_excl_btw,
  btw_percentage,
  minimum_bestelhoeveelheid,
  image_url,
  actief,
  sort_order
)
values (
  'At Home Clean Premium Vaatwastabletten - 222 stuks',
  'Keuken',
  '123schoon.nl',
  'https://www.123schoon.nl/Vaatwastabletten-aanbieding-p49573.html',
  'Aanbieding met 6 verpakkingen At Home Clean Premium vaatwastabletten, samen goed voor 222 wasbeurten. Voor een schone vaat, ook bij hardnekkige resten. Controleer regelmatig zout- en glansspoelniveau en was bij voorkeur op de aanbevolen temperatuur.',
  'pakket van 222 tabletten',
  26.99,
  21,
  1,
  '/assets/at-home-clean-premium-vaatwastabletten-222.jpg',
  true,
  60
)
on conflict do nothing;

update public.aankoop_producten
set
  categorie = 'Keuken',
  leverancier = '123schoon.nl',
  leverancier_url = 'https://www.123schoon.nl/Vaatwastabletten-aanbieding-p49573.html',
  omschrijving = 'Aanbieding met 6 verpakkingen At Home Clean Premium vaatwastabletten, samen goed voor 222 wasbeurten. Voor een schone vaat, ook bij hardnekkige resten. Controleer regelmatig zout- en glansspoelniveau en was bij voorkeur op de aanbevolen temperatuur.',
  eenheid = 'pakket van 222 tabletten',
  prijs_excl_btw = 26.99,
  btw_percentage = 21,
  minimum_bestelhoeveelheid = 1,
  image_url = '/assets/at-home-clean-premium-vaatwastabletten-222.jpg',
  actief = true,
  sort_order = 60,
  updated_at = now()
where lower(naam) = lower('At Home Clean Premium Vaatwastabletten - 222 stuks');


insert into public.aankoop_producten (
  naam,
  categorie,
  leverancier,
  leverancier_url,
  omschrijving,
  eenheid,
  prijs_excl_btw,
  btw_percentage,
  minimum_bestelhoeveelheid,
  image_url,
  actief,
  sort_order
)
values (
  'Handzeep aloe vera 500 ml - 123schoon huismerk',
  'Sanitair en hygiene',
  '123schoon.nl',
  'https://www.123schoon.nl/Huis/WC-schoonmaken/Handzeep/Zeeppompjes/123schoon-zeeppompjes-p69248.html',
  'Vloeibare handzeep met aloe vera in pompflacon van 500 ml. Voor grondige reiniging en een frisse geur. De zeep is pH-neutraal en eenvoudig te doseren met de pompdispenser.',
  'pompflacon 500 ml',
  2.79,
  21,
  1,
  '/assets/123schoon-handzeep-aloe-vera-500ml.jpg',
  true,
  70
)
on conflict do nothing;

update public.aankoop_producten
set
  categorie = 'Sanitair en hygiene',
  leverancier = '123schoon.nl',
  leverancier_url = 'https://www.123schoon.nl/Huis/WC-schoonmaken/Handzeep/Zeeppompjes/123schoon-zeeppompjes-p69248.html',
  omschrijving = 'Vloeibare handzeep met aloe vera in pompflacon van 500 ml. Voor grondige reiniging en een frisse geur. De zeep is pH-neutraal en eenvoudig te doseren met de pompdispenser.',
  eenheid = 'pompflacon 500 ml',
  prijs_excl_btw = 2.79,
  btw_percentage = 21,
  minimum_bestelhoeveelheid = 1,
  image_url = '/assets/123schoon-handzeep-aloe-vera-500ml.jpg',
  actief = true,
  sort_order = 70,
  updated_at = now()
where lower(naam) = lower('Handzeep aloe vera 500 ml - 123schoon huismerk');
