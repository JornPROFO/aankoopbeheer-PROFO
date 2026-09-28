-- Exacte productlink opnieuw aangeleverd door Jorn op 28/09/2026.
-- Op productpagina gecontroleerd: SDR02017, 2-laags, 20 pakken van 120 vellen,
-- 123schoon huismerk, geschikt voor Tork H2. Prijs en bestelhistoriek blijven behouden.
begin;
do $$
declare gewijzigd integer;
begin
  update public.aankoop_producten
  set leverancier_url = jsonb_build_object(
    'artikelnummer', 'SDR02017',
    'url', 'https://www.123schoon.nl/123schoon-Gevouwen-handdoeken-2-laags-20-pakken-123schoon-huismerk-Geschikt-voor-Tork-H2-dispenser-i3737.html'
  )::text
  where id = 1
    and naam = 'Gevouwen handdoeken 2-laags - geschikt voor Tork H2 dispenser'
    and leverancier = '123schoon.nl'
    and eenheid = 'doos van 20 pakken'
    and (leverancier_url = 'https://www.123schoon.nl/' or leverancier_url like '%-i3737.html%');
  get diagnostics gewijzigd = row_count;
  if gewijzigd <> 1 then raise exception 'Productgegevens gewijzigd; handmatige controle vereist'; end if;
end $$;
commit;
select id, naam, leverancier_url, eenheid from public.aankoop_producten where id = 1;
