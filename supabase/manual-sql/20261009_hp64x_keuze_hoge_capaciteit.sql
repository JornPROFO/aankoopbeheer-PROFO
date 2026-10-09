-- Jorn kiest op 2026-10-09 voor HP 64X altijd de huismerkuitvoering hoge capaciteit.
-- Artikel 039815, product i12836. Extra hoge capaciteit niet geselecteerd.
begin;
create temporary table hp64_before on commit drop as
select id,to_jsonb(c)-'artikelnummer'-'leverancier_url'-'updated_at' as value
from public.aankoop_printer_cartridges c
where id in (1,2,3,4,13,14,15,16,33,34,51,52,53,54,81,82,115,120,121);
do $fix$
declare n integer;
begin
 update public.aankoop_printer_cartridges
 set artikelnummer='039815',
 leverancier_url='https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-64X-CC364X-toner-zwart-hoge-capaciteit-i12836.html'
 where id in (1,2,3,4,13,14,15,16,33,34,51,52,53,54,81,82,115,120,121)
 and naam='123inkt huismerk alternatief voor HP 64X zwart'
 and artikelnummer='CC364X' and leverancier='123inkt.be'
 and leverancier_url='https://www.123inkt.be/search/?search=CC364X%20huismerk';
 get diagnostics n=row_count;
 if n<>19 then raise exception 'Verwacht 19 ongewijzigde vermeldingen, gevonden %',n; end if;
 if exists(select 1 from hp64_before b join public.aankoop_printer_cartridges c using(id) where b.value<>to_jsonb(c)-'artikelnummer'-'leverancier_url'-'updated_at') then raise exception 'Onbedoelde wijziging'; end if;
end $fix$;
commit;
select count(*) as hp64_correct, count(*) filter(where actief) as actief
from public.aankoop_printer_cartridges where naam like '%HP 64X%'
and artikelnummer='039815' and leverancier_url='https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-64X-CC364X-toner-zwart-hoge-capaciteit-i12836.html';
