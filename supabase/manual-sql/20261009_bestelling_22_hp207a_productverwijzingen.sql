-- Bestelling 22: exacte, op 2026-10-09 geverifieerde HP 207A-huismerkverwijzingen.
-- Alleen identificatie bijwerken; bestelaantallen, prijzen en status behouden.
begin;
create temporary table hp207_links(old_article text,new_article text,url text) on commit drop;
insert into hp207_links values
('W2210A','093043','https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-207A-W2210A-toner-zwart-W2210AC-i56528.html'),
('W2211A','093045','https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-207A-W2211A-toner-cyaan-W2211AC-i56529.html'),
('W2212A','093049','https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-207A-W2212A-toner-geel-W2212AC-i56530.html'),
('W2213A','093047','https://www.123inkt.be/HP-123inkt-huismerk-vervangt-HP-207A-W2213A-toner-magenta-W2213AC-i56531.html');
create temporary table order22_before on commit drop as select to_jsonb(r)-'product_omschrijving' as value from public.aankoop_bestelregels r where bestelling_id=22;
do $repair$
declare n integer;
begin
 perform 1 from public.aankoop_bestellingen where id=22 and status='Goedgekeurd' for update;
 if not found then raise exception 'Bestelling 22 niet meer goedgekeurd'; end if;
 update public.aankoop_bestelregels r
 set product_omschrijving=replace(r.product_omschrijving,' - art. '||m.old_article||' - link: https://www.123inkt.be/search/?search='||m.old_article||'%20huismerk',' - art. '||m.new_article||' - link: '||m.url)
 from hp207_links m
 where r.bestelling_id=22 and r.id in (160,161,162,163) and r.product_id is null
 and r.product_naam like '%123inkt huismerk alternatief voor HP 207A%'
 and r.product_omschrijving='Inkt/toner voor HP printer/scanner - HP - HP M283fdw (PROFO-PT-2021-002) - art. '||m.old_article||' - link: https://www.123inkt.be/search/?search='||m.old_article||'%20huismerk';
 get diagnostics n=row_count;
 if n<>4 then raise exception 'Verwacht 4 regels, gevonden %',n; end if;
 update public.aankoop_printer_cartridges c
 set artikelnummer=m.new_article,leverancier_url=m.url
 from hp207_links m
 where c.id in (126,127,128,129,130,131,132,133,134,135,136,137,143,144,145,146,148,149,150,151)
 and c.artikelnummer=m.old_article and c.leverancier='123inkt.be'
 and c.naam like '123inkt huismerk alternatief voor HP 207A %'
 and c.leverancier_url='https://www.123inkt.be/search/?search='||m.old_article||'%20huismerk';
 get diagnostics n=row_count;
 if n<>20 then raise exception 'Verwacht 20 catalogusvermeldingen, gevonden %',n; end if;
 if exists ((select value from order22_before) except (select to_jsonb(r)-'product_omschrijving' from public.aankoop_bestelregels r where bestelling_id=22)) then raise exception 'Onbedoelde wijziging aan bestelling'; end if;
end $repair$;
commit;
select jsonb_build_object('bestelling', (select jsonb_build_object('id',id,'status',status) from public.aankoop_bestellingen where id=22),'lines',(select jsonb_agg(to_jsonb(r) order by id) from public.aankoop_bestelregels r where bestelling_id=22),'herstelde_catalogusregels',(select count(*) from public.aankoop_printer_cartridges where id in (126,127,128,129,130,131,132,133,134,135,136,137,143,144,145,146,148,149,150,151) and leverancier_url not like '%/search/%')) as verification;
