-- PROFO Aankoopbeheer
-- Activeer reeds gekoppelde inkt- en tonertypes voor de testfase.
-- Dit laat patronen met prijs 0,00 toe in de bestelmodule.

update public.aankoop_printer_cartridges cartridge
set actief = true,
    updated_at = now()
where cartridge.actief = false
  and coalesce(trim(cartridge.naam), '') <> ''
  and exists (
    select 1
    from public.aankoop_printers printer
    where printer.id = cartridge.printer_id
      and printer.actief = true
  );

select
  cartridge.id,
  cartridge.printer_id,
  cartridge.kleur,
  cartridge.naam,
  cartridge.prijs_incl_btw,
  cartridge.actief
from public.aankoop_printer_cartridges cartridge
where cartridge.actief = true
order by cartridge.printer_id, cartridge.sort_order, cartridge.kleur;
