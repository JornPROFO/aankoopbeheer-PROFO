insert into public.locaties (naam, adres, actief, sort_order)
values
  ('Beringen', null, true, 10),
  ('Boom', null, true, 20),
  ('Brussel', null, true, 30),
  ('Dendermonde', null, true, 40),
  ('Hasselt', null, true, 50),
  ('Heist Op Den Berg', null, true, 60),
  ('Leuven', null, true, 70),
  ('Leuven - Brussel', null, true, 80),
  ('Lommel', null, true, 90),
  ('Lommel - Pelt', null, true, 100),
  ('Maasmechelen', null, true, 110),
  ('Mechelen', null, true, 120),
  ('Merksem', null, true, 130),
  ('Nieuwpoort', null, true, 140),
  ('Oostende', null, true, 150),
  ('Oudenaarde', null, true, 160),
  ('Pelt', null, true, 170),
  ('Sint-Niklaas', null, true, 180),
  ('Sint-Niklaas - Dendermonde', null, true, 190)
on conflict ((lower(naam))) do update
set
  actief = excluded.actief,
  sort_order = excluded.sort_order;
