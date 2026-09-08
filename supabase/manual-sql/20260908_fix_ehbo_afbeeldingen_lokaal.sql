-- PROFO Aankoopbeheer - vervang externe EHBO-afbeeldingen door lokale assets.
-- De leverancier-URL blijft ongewijzigd; alleen de presentatieafbeelding verhuist.

begin;

update public.aankoop_producten
set
  image_url = case
    when image_url ~ '^https://www[.]ehbo-koffer[.]be/wp-content/uploads/[0-9]{4}/[0-9]{2}/'
      then regexp_replace(
        image_url,
        '^https://www[.]ehbo-koffer[.]be/wp-content/uploads/[0-9]{4}/[0-9]{2}/',
        '/assets/ehbo/'
      )
    else replace(
      image_url,
      'https://www.ehbo-koffer.be/wp-content/uploads/',
      '/assets/ehbo/'
    )
  end,
  updated_at = now()
where categorie = 'Veiligheid/EHBO'
  and image_url like 'https://www.ehbo-koffer.be/wp-content/uploads/%';

commit;

-- Controle: voor de herstelde artikelen moet image_url met /assets/ehbo/ beginnen.
select naam, image_url
from public.aankoop_producten
where categorie = 'Veiligheid/EHBO'
order by naam;
