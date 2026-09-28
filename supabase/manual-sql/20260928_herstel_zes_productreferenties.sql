-- Door Jorn aangeleverde en op de productpagina gecontroleerde referenties, 28/09/2026.
-- Alleen cataloguswijzigingen; historische bestelregels en prijzen blijven behouden.
begin;
do $$
declare gewijzigd integer;
begin
  update public.aankoop_producten
  set leverancier_url = jsonb_build_object('artikelnummer', 'SGL00700', 'url', 'https://www.123schoon.nl/Glorix-Bleek-Original-1-liter-i26919.html')::text
  where id = 3 and leverancier = '123schoon.nl'
    and naam = 'Glorix Bleek Original 1 L' and eenheid = 'fles van 1 L'
    and leverancier_url = 'https://www.123schoon.nl/Schoonmaakmiddelen/Bleekmiddelen-p30468.html';
  get diagnostics gewijzigd = row_count;
  if gewijzigd <> 1 then raise exception 'Product 3 gewijzigd; controle vereist'; end if;
  update public.aankoop_producten
  set leverancier_url = jsonb_build_object('artikelnummer', 'SDR00019', 'url', 'https://www.123schoon.nl/123schoon-Schuurspons-10-stuks-123schoon-huismerk-i262.html')::text
  where id = 4 and leverancier = '123schoon.nl'
    and naam = '123schoon Schuurspons 10 stuks' and eenheid = 'pak van 10 stuks'
    and leverancier_url = 'https://www.123schoon.nl/Schoonmaakartikelen/123schoon-schoonmaakartikelen-p69609.html';
  get diagnostics gewijzigd = row_count;
  if gewijzigd <> 1 then raise exception 'Product 4 gewijzigd; controle vereist'; end if;
  update public.aankoop_producten
  set leverancier_url = jsonb_build_object('artikelnummer', 'SAT00087', 'url', 'https://www.123schoon.nl/At-Home-Aanbieding-At-Home-Clean-Premium-Vaatwastabletten-6-stuks-222-vaatwastabletten-i19667.html')::text
  where id = 5 and leverancier = '123schoon.nl'
    and naam = 'At Home Clean Premium Vaatwastabletten - 222 stuks' and eenheid = 'pakket van 222 tabletten'
    and leverancier_url = 'https://www.123schoon.nl/Vaatwastabletten-aanbieding-p49573.html';
  get diagnostics gewijzigd = row_count;
  if gewijzigd <> 1 then raise exception 'Product 5 gewijzigd; controle vereist'; end if;
  update public.aankoop_producten
  set leverancier_url = jsonb_build_object('artikelnummer', 'SDR06201', 'url', 'https://www.123schoon.nl/123schoon-Handzeep-aloe-vera-500-ml-123schoon-huismerk-i15443.html')::text
  where id = 6 and leverancier = '123schoon.nl'
    and naam = 'Handzeep aloe vera 500 ml - 123schoon huismerk' and eenheid = 'pompflacon 500 ml'
    and leverancier_url = 'https://www.123schoon.nl/Huis/WC-schoonmaken/Handzeep/Zeeppompjes/123schoon-zeeppompjes-p69248.html';
  get diagnostics gewijzigd = row_count;
  if gewijzigd <> 1 then raise exception 'Product 6 gewijzigd; controle vereist'; end if;
  update public.aankoop_producten
  set leverancier_url = jsonb_build_object('artikelnummer', 'SDR02112', 'url', 'https://www.123schoon.nl/123schoon-Toiletpapier-Traditioneel-4-laags-8-rollen-123schoon-huismerk-Geschikt-voor-Tork-T4-dispenser-i25882.html')::text
  where id = 7 and leverancier = '123schoon.nl'
    and naam = 'Toiletpapier Traditioneel 4-laags - 8 rollen - geschikt voor Tork T4 dispenser' and eenheid = 'pak van 8 rollen'
    and leverancier_url = 'https://www.123schoon.nl/Toilet-en-keukenpapier/WC-papier-p13321.html';
  get diagnostics gewijzigd = row_count;
  if gewijzigd <> 1 then raise exception 'Product 7 gewijzigd; controle vereist'; end if;
  update public.aankoop_producten
  set leverancier_url = jsonb_build_object('artikelnummer', 'SDR02031', 'url', 'https://www.123schoon.nl/123schoon-Keukenrol-2-laags-2-x-50-vel-123schoon-huismerk-i3751.html')::text,
      naam = 'Keukenrol 2-laags - 2 x 50 vel - 123schoon huismerk',
      eenheid = 'pak van 2 rollen',
      omschrijving = replace(omschrijving, '4 keukenrollen', '2 keukenrollen')
  where id = 8 and leverancier = '123schoon.nl'
    and naam = 'Keukenrol 2-laags - 4 x 50 vel - 123schoon huismerk' and eenheid = 'pak van 4 rollen'
    and leverancier_url = 'https://www.123schoon.nl/Toilet-en-keukenpapier/Keukenrollen-p13330.html';
  get diagnostics gewijzigd = row_count;
  if gewijzigd <> 1 then raise exception 'Product 8 gewijzigd; controle vereist'; end if;
end $$;
commit;
select id, naam, eenheid, leverancier_url from public.aankoop_producten where id in (3,4,5,6,7,8) order by id;

