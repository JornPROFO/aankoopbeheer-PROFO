-- PROFO Aankoopbeheer - lege of voorbereidende producten verbergen uit de bestelcatalogus.
-- Voer dit volledige bestand uit in de Supabase SQL Editor.
--
-- Doel:
-- - voorbereidende regels zoals "product nog te bepalen" blijven bewaarbaar in beheer;
-- - medewerkers zien in de gewone bestelomgeving alleen producten die voldoende ingevuld zijn;
-- - de vrije tekst "Andere producten" in het bestelformulier blijft de juiste weg voor uitzonderingen.

update public.aankoop_producten
set
  actief = false,
  updated_at = now()
where actief = true
  and (
    lower(coalesce(naam, '')) like '%nog te bepalen%'
    or lower(coalesce(naam, '')) like 'ander product%'
    or coalesce(prijs_excl_btw, 0) <= 0
    or nullif(trim(coalesce(omschrijving, '')), '') is null
    or nullif(trim(coalesce(eenheid, '')), '') is null
  );

select
  naam,
  categorie,
  leverancier,
  prijs_excl_btw,
  actief
from public.aankoop_producten
where actief = false
  and (
    lower(coalesce(naam, '')) like '%nog te bepalen%'
    or lower(coalesce(naam, '')) like 'ander product%'
    or coalesce(prijs_excl_btw, 0) <= 0
    or nullif(trim(coalesce(omschrijving, '')), '') is null
    or nullif(trim(coalesce(eenheid, '')), '') is null
  )
order by categorie, sort_order, naam;
