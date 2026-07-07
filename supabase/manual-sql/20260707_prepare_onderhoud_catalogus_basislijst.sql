-- PROFO Aankoopbeheer - voorbereidende basislijst onderhoudsartikelen.
-- Voer dit bestand uit in de Supabase SQL Editor.
--
-- Doel:
-- - ruimte voorzien voor vaak terugkerende onderhouds-, koffie- en vergaderproducten;
-- - producten standaard NIET actief zetten zolang prijs, foto en leverancierslink nog niet bevestigd zijn;
-- - bestaande actieve producten zoals toiletpapier, keukenrol, handzeep en schuursponzen ongemoeid laten.
--
-- Praktisch:
-- - vul later in Beheer de juiste 123schoon-link, foto en prijs incl. btw aan;
-- - zet een product pas actief wanneer het bestelbaar mag worden voor gewone gebruikers.

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
values
  (
    'Ander product - omschrijven op bestelbon',
    'Algemeen',
    null,
    null,
    'Gebruik dit alleen wanneer het gewenste product nog niet in de catalogus staat. De besteller moet op de bestelbon verduidelijken welk product nodig is.',
    'aanvraag',
    0,
    21,
    1,
    null,
    true,
    900
  ),
  (
    'WC-reiniger - product nog te bepalen',
    'Sanitair en hygiene',
    '123schoon.nl',
    'https://www.123schoon.nl/search/?search=wc%20reiniger',
    'Voorbereide catalogusregel voor WC-reiniger of toiletreiniger. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.',
    'stuk',
    0,
    21,
    1,
    null,
    false,
    210
  ),
  (
    'Toiletblok of toiletverfrisser - product nog te bepalen',
    'Sanitair en hygiene',
    '123schoon.nl',
    'https://www.123schoon.nl/search/?search=toiletblok',
    'Voorbereide catalogusregel voor toiletblok, toiletverfrisser of gelijkaardig WC-product. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.',
    'stuk',
    0,
    21,
    1,
    null,
    false,
    215
  ),
  (
    'Koffiebonen - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor koffiebonen. Leverancier, verpakking, prijs en foto nog te bepalen.',
    'pak',
    0,
    21,
    1,
    null,
    false,
    300
  ),
  (
    'Koffiepads - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor koffiepads. Type, leverancier, verpakking, prijs en foto nog te bepalen.',
    'pak',
    0,
    21,
    1,
    null,
    false,
    305
  ),
  (
    'Koffiecups - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor koffiecups. Compatibel systeem, leverancier, prijs en foto nog te bepalen.',
    'doos',
    0,
    21,
    1,
    null,
    false,
    310
  ),
  (
    'Gemalen koffie - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor gemalen koffie. Leverancier, verpakking, prijs en foto nog te bepalen.',
    'pak',
    0,
    21,
    1,
    null,
    false,
    315
  ),
  (
    'Oploskoffie - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor oploskoffie. Leverancier, verpakking, prijs en foto nog te bepalen.',
    'pot',
    0,
    21,
    1,
    null,
    false,
    320
  ),
  (
    'Koffiemelk of melkjes - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor koffiemelk, melkkuipjes of melkjes. Leverancier, verpakking, prijs en foto nog te bepalen.',
    'doos',
    0,
    21,
    1,
    null,
    false,
    325
  ),
  (
    'Suikersticks of suikerklontjes - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor suikersticks, suikerzakjes of suikerklontjes. Leverancier, verpakking, prijs en foto nog te bepalen.',
    'doos',
    0,
    21,
    1,
    null,
    false,
    330
  ),
  (
    'Koekjes voor koffie of meetings - product nog te bepalen',
    'Koffie en vergaderingen',
    null,
    null,
    'Voorbereide catalogusregel voor koekjes bij koffie, overleg of vergaderingen. Leverancier, verpakking, prijs en foto nog te bepalen.',
    'doos',
    0,
    21,
    1,
    null,
    false,
    335
  ),
  (
    'Vaatdoeken - product nog te bepalen',
    'Keuken',
    '123schoon.nl',
    'https://www.123schoon.nl/search/?search=vaatdoeken',
    'Voorbereide catalogusregel voor vaatdoeken. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.',
    'pak',
    0,
    21,
    1,
    null,
    false,
    400
  ),
  (
    'Theedoeken - product nog te bepalen',
    'Keuken',
    '123schoon.nl',
    'https://www.123schoon.nl/search/?search=theedoeken',
    'Voorbereide catalogusregel voor theedoeken. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.',
    'pak',
    0,
    21,
    1,
    null,
    false,
    405
  ),
  (
    'Dweilen of mopdoeken - product nog te bepalen',
    'Schoonmaak',
    '123schoon.nl',
    'https://www.123schoon.nl/search/?search=dweilen',
    'Voorbereide catalogusregel voor dweilen, mopdoeken of vloerdoeken. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.',
    'stuk',
    0,
    21,
    1,
    null,
    false,
    500
  ),
  (
    'Sponzen of schoonmaaksponzen - product nog te bepalen',
    'Schoonmaak',
    '123schoon.nl',
    'https://www.123schoon.nl/search/?search=sponzen',
    'Voorbereide catalogusregel voor sponzen of schoonmaaksponzen naast de reeds bestaande schuursponzen. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.',
    'pak',
    0,
    21,
    1,
    null,
    false,
    505
  )
on conflict (lower(naam))
do update set
  categorie = excluded.categorie,
  leverancier = excluded.leverancier,
  leverancier_url = excluded.leverancier_url,
  omschrijving = excluded.omschrijving,
  eenheid = excluded.eenheid,
  prijs_excl_btw = excluded.prijs_excl_btw,
  btw_percentage = excluded.btw_percentage,
  minimum_bestelhoeveelheid = excluded.minimum_bestelhoeveelheid,
  image_url = excluded.image_url,
  actief = excluded.actief,
  sort_order = excluded.sort_order,
  updated_at = now();

select
  naam,
  categorie,
  leverancier,
  actief,
  sort_order
from public.aankoop_producten
where naam in (
  'Ander product - omschrijven op bestelbon',
  'WC-reiniger - product nog te bepalen',
  'Toiletblok of toiletverfrisser - product nog te bepalen',
  'Koffiebonen - product nog te bepalen',
  'Koffiepads - product nog te bepalen',
  'Koffiecups - product nog te bepalen',
  'Gemalen koffie - product nog te bepalen',
  'Oploskoffie - product nog te bepalen',
  'Koffiemelk of melkjes - product nog te bepalen',
  'Suikersticks of suikerklontjes - product nog te bepalen',
  'Koekjes voor koffie of meetings - product nog te bepalen',
  'Vaatdoeken - product nog te bepalen',
  'Theedoeken - product nog te bepalen',
  'Dweilen of mopdoeken - product nog te bepalen',
  'Sponzen of schoonmaaksponzen - product nog te bepalen'
)
order by categorie, sort_order, naam;
