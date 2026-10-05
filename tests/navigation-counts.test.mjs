import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {escapeHtml} from '../src/utils/format.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function load(name,context){
 const start=source.indexOf(`function ${name}(`),rest=source.slice(start),end=rest.slice(1).search(/^(?:async )?function /m);
 assert.ok(start>=0);vm.runInContext(end<0?rest:rest.slice(0,end+1),context);return context[name];
}
test('open bestellingen volgen zichtbare orders en sluiten afgeronde statussen uit',()=>{
 const state={appUser:{id:1},session:{user:{email:'a@profo.be'}},data:{orders:[
  {id:1,besteller_id:1,status:'Goedgekeurd'},
  {id:2,besteller_id:2,status:'Besteld'},
  {id:3,besteller_id:1,status:'Gedeeltelijk geleverd'},
  ...['Geleverd','Afgesloten','Geweigerd'].map(status=>({besteller_id:1,status}))
 ]}};
 const c=vm.createContext({state,getNormalizedStatus:s=>s});load('getVisibleOrders',c);const open=load('getOpenOrders',c);
 assert.equal(open(false).length,2);assert.equal(open(true).length,3);assert.equal(open(false,true).length,3);
 state.data.orders[0].status='Geleverd';assert.equal(open(false).length,1);assert.equal(open(true).length,2);
});
test('navigatie houdt open bestellingen en ongelezen meldingen uit elkaar',()=>{
 const state={view:'start',session:{user:{email:'a@profo.be'}},appUser:{id:1}};
 const c=vm.createContext({state,escapeHtml,document:{documentElement:{dataset:{}}},isAdminUser:()=>false,isApproverUser:()=>false,getUserLabel:()=> 'Jorn',getUnreadNotifications:()=>[1,2,3,4],getOpenOrders:()=>[1,2,3,4,5],getCartItems:()=>[],renderCurrentView:()=>'',renderMobileCartBar:()=>'',renderProductPreview:()=>'',renderExpectedDeliveryModal:()=>''});
 load('renderIcon',c);load('navLink',c);const shell=load('renderShell',c)();
 const start=shell.match(/<a[^>]*href="#start"[^>]*>[\s\S]*?<\/a>/)[0];
 assert.doesNotMatch(start,/nav-badge/);
 assert.match(shell,/aria-label="Bestellingen: 5 open bestellingen"/);
 assert.match(shell,/aria-label="Meldingen: 4 ongelezen meldingen"/);
 state.view='meldingen';assert.match(c.navLink('meldingen','Meldingen',0,'bell','ongelezen meldingen'),/aria-current="page"/);
 assert.doesNotMatch(c.navLink('meldingen','Meldingen',0),/nav-badge/);
});
test('meldingenpagina toont alle ongelezen items en vervalt niet naar Start',()=>{
 const c=vm.createContext({window:{location:{hash:'#meldingen'}},getUnreadNotifications:()=>Array.from({length:8},(_,i)=>({id:i})),renderIcon:()=>'',renderPushControls:()=>'',renderNotificationCard:n=>`<article>${n.id}</article>`});
 assert.equal(load('getRoute',c)(),'meldingen');const panel=load('renderNotificationsPanel',c);
 assert.equal((panel().match(/<article>/g)||[]).length,6);
 assert.equal((panel(true).match(/<article>/g)||[]).length,8);
});
