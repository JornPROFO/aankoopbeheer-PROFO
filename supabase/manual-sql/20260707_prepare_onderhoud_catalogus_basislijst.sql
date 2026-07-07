-- PROFO Aankoopbeheer - voorbereidende basislijst onderhoudsartikelen.
-- Voer dit volledige bestand uit in de Supabase SQL Editor.
--
-- Deze versie vermijdt bewust ON CONFLICT en lange losse NULL-regels.
-- Eerst worden bestaande producten bijgewerkt. Daarna worden ontbrekende
-- producten toegevoegd. Zo blijft het bestand opnieuw uitvoerbaar.

with bron (
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
) as (
  values
    ('Ander product - omschrijven op bestelbon', 'Algemeen', cast(null as text), cast(null as text), 'Gebruik dit alleen wanneer het gewenste product nog niet in de catalogus staat. De besteller moet op de bestelbon verduidelijken welk product nodig is.', 'aanvraag', 0, 21, 1, cast(null as text), true, 900),
    ('WC-reiniger - product nog te bepalen', 'Sanitair en hygiene', '123schoon.nl', 'https://www.123schoon.nl/search/?search=wc%20reiniger', 'Voorbereide catalogusregel voor WC-reiniger of toiletreiniger. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.', 'stuk', 0, 21, 1, cast(null as text), false, 210),
    ('Toiletblok of toiletverfrisser - product nog te bepalen', 'Sanitair en hygiene', '123schoon.nl', 'https://www.123schoon.nl/search/?search=toiletblok', 'Voorbereide catalogusregel voor toiletblok, toiletverfrisser of gelijkaardig WC-product. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.', 'stuk', 0, 21, 1, cast(null as text), false, 215),
    ('Koffiebonen - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor koffiebonen. Leverancier, verpakking, prijs en foto nog te bepalen.', 'pak', 0, 21, 1, cast(null as text), false, 300),
    ('Koffiepads - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor koffiepads. Type, leverancier, verpakking, prijs en foto nog te bepalen.', 'pak', 0, 21, 1, cast(null as text), false, 305),
    ('Koffiecups - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor koffiecups. Compatibel systeem, leverancier, prijs en foto nog te bepalen.', 'doos', 0, 21, 1, cast(null as text), false, 310),
    ('Gemalen koffie - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor gemalen koffie. Leverancier, verpakking, prijs en foto nog te bepalen.', 'pak', 0, 21, 1, cast(null as text), false, 315),
    ('Oploskoffie - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor oploskoffie. Leverancier, verpakking, prijs en foto nog te bepalen.', 'pot', 0, 21, 1, cast(null as text), false, 320),
    ('Koffiemelk of melkjes - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor koffiemelk, melkkuipjes of melkjes. Leverancier, verpakking, prijs en foto nog te bepalen.', 'doos', 0, 21, 1, cast(null as text), false, 325),
    ('Suikersticks of suikerklontjes - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor suikersticks, suikerzakjes of suikerklontjes. Leverancier, verpakking, prijs en foto nog te bepalen.', 'doos', 0, 21, 1, cast(null as text), false, 330),
    ('Koekjes voor koffie of meetings - product nog te bepalen', 'Koffie en vergaderingen', cast(null as text), cast(null as text), 'Voorbereide catalogusregel voor koekjes bij koffie, overleg of vergaderingen. Leverancier, verpakking, prijs en foto nog te bepalen.', 'doos', 0, 21, 1, cast(null as text), false, 335),
    ('Vaatdoeken - product nog te bepalen', 'Keuken', '123schoon.nl', 'https://www.123schoon.nl/search/?search=vaatdoeken', 'Voorbereide catalogusregel voor vaatdoeken. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.', 'pak', 0, 21, 1, cast(null as text), false, 400),
    ('Theedoeken - product nog te bepalen', 'Keuken', '123schoon.nl', 'https://www.123schoon.nl/search/?search=theedoeken', 'Voorbereide catalogusregel voor theedoeken. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.', 'pak', 0, 21, 1, cast(null as text), false, 405),
    ('Dweilen of mopdoeken - product nog te bepalen', 'Schoonmaak', '123schoon.nl', 'https://www.123schoon.nl/search/?search=dweilen', 'Voorbereide catalogusregel voor dweilen, mopdoeken of vloerdoeken. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.', 'stuk', 0, 21, 1, cast(null as text), false, 500),
    ('Sponzen of schoonmaaksponzen - product nog te bepalen', 'Schoonmaak', '123schoon.nl', 'https://www.123schoon.nl/search/?search=sponzen', 'Voorbereide catalogusregel voor sponzen of schoonmaaksponzen naast de reeds bestaande schuursponzen. Prijs, foto en definitieve productkeuze nog te bevestigen in beheer.', 'pak', 0, 21, 1, cast(null as text), false, 505)
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
select
  bron.naam,
  bron.categorie,
  bron.leverancier,
  bron.leverancier_url,
  bron.omschrijving,
  bron.eenheid,
  bron.prijs_excl_btw,
  bron.btw_percentage,
  bron.minimum_bestelhoeveelheid,
  bron.image_url,
  bron.actief,
  bron.sort_order
from bron
where not exists (
  select 1
  from public.aankoop_producten product
  where lower(product.naam) = lower(bron.naam)
);

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
