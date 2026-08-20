-- PROFO Aankoopbeheer - aankoopbeheerders hebben geen goedkeurder nodig
-- wanneer zij zelf als besteller vermeld staan.

begin;

update public.aankoop_goedkeurder_scopes scope
set actief = false,
    updated_at = now()
where scope.teamlid_id in (
  select gebruiker.id
  from public.gebruikers gebruiker
  where lower(gebruiker.email) in (
    'jorn.neeus@profo.be',
    'kathleen.nerinckx@profo.be'
  )
);

update public.aankoop_bestellingen bestelling
set status = 'Goedgekeurd',
    mail_status = 'Automatisch goedgekeurd: besteller is aankoopbeheerder',
    updated_at = now()
where bestelling.status in ('Concept', 'Nieuw', 'Ingediend', 'Ter goedkeuring')
  and lower(coalesce(bestelling.besteller_email, '')) in (
    'jorn.neeus@profo.be',
    'kathleen.nerinckx@profo.be'
  );

commit;

select id, status, locatie_naam, besteller_naam, besteller_email, mail_status
from public.aankoop_bestellingen
where lower(coalesce(besteller_email, '')) in (
  'jorn.neeus@profo.be',
  'kathleen.nerinckx@profo.be'
)
order by id desc;
