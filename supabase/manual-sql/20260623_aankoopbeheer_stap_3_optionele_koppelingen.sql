-- PROFO Aankoopbeheer - stap 3 optionele koppelingen
-- Voer dit pas uit wanneer public.gebruikers en public.locaties bestaan.
-- Deze stap voegt foreign keys toe zonder de bestaande aankoop-tabellen opnieuw aan te maken.

do $$
begin
  if to_regclass('public.locaties') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'aankoop_bestellingen_locatie_id_fkey'
    ) then
      alter table public.aankoop_bestellingen
        add constraint aankoop_bestellingen_locatie_id_fkey
        foreign key (locatie_id) references public.locaties(id) on delete set null;
    end if;
  end if;

  if to_regclass('public.gebruikers') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'aankoop_bestellingen_besteller_id_fkey'
    ) then
      alter table public.aankoop_bestellingen
        add constraint aankoop_bestellingen_besteller_id_fkey
        foreign key (besteller_id) references public.gebruikers(id) on delete set null;
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'aankoop_bestellingen_aangemaakt_door_id_fkey'
    ) then
      alter table public.aankoop_bestellingen
        add constraint aankoop_bestellingen_aangemaakt_door_id_fkey
        foreign key (aangemaakt_door_id) references public.gebruikers(id) on delete set null;
    end if;
  end if;
end $$;
