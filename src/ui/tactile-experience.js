const soundKey = 'profo-click-sound';
let sound = true;
try { sound = localStorage.getItem(soundKey) !== 'off'; } catch { /* Optional preference. */ }

const paths = {
  home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  products:'<path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9"/>',
  cart:'<path d="M3 3h2l3 13h11l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18"/>',
  route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h8a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h8"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  sound:'<path d="m11 4-6 5H2v6h3l6 5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.products}</svg>`;
export function renderSoundControl() {
  return `<button type="button" data-click-sound aria-pressed="${sound}" aria-label="Klikgeluiden ${sound?'uitschakelen':'inschakelen'}">${icon('sound')}<span>Geluid ${sound?'aan':'uit'}</span></button>`;
}
export function renderExperienceDock(app,active) {
  const links=app==='purchase'?[['start','Start','home'],['bestellen','Producten','products'],['winkelmand','Winkelmand','cart']]:[['dashboard','Start','home'],['reservaties','Reserveren','calendar'],['ritten','Ritten','route']];
  return `<nav class="experience-dock" aria-label="Snelle navigatie">${links.map(([route,label,glyph])=>`<a href="#${route}"${active===route?' aria-current="page"':''}>${icon(glyph)}<span>${label}</span></a>`).join('')}<button type="button" data-experience-menu aria-haspopup="dialog" aria-expanded="false">${icon('menu')}<span>Menu</span></button></nav>`;
}

/** Delegated, local-only feedback; never submits a form or changes a business status. */
export function initializeTactileExperience() {
  let audio, lastSound=0, frame=0, previousOverflow='';
  const menu=document.createElement('dialog');
  menu.className='experience-menu';menu.setAttribute('aria-labelledby','experience-menu-title');
  document.body.append(menu);
  const close=()=>{
    if(!menu.open)return;
    menu.close();document.body.style.overflow=previousOverflow;
    const trigger=document.querySelector('[data-experience-menu]');
    trigger?.setAttribute('aria-expanded','false');trigger?.focus();
  };
  const open=()=>{
    const source=document.querySelector('.family-nav .sidebar');if(!source)return;
    const heading=document.createElement('div');heading.className='experience-menu-heading';
    const title=document.createElement('h2');title.id='experience-menu-title';title.textContent='Waar wil je naartoe?';
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.dataset.experienceClose='';dismiss.setAttribute('aria-label','Menu sluiten');dismiss.textContent='×';
    heading.append(title,dismiss);
    const navigation=source.cloneNode(true);navigation.removeAttribute('id');navigation.className='experience-menu-links';navigation.setAttribute('aria-label','Alle onderdelen');
    menu.replaceChildren(heading,navigation);previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    document.querySelector('[data-experience-menu]')?.setAttribute('aria-expanded','true');menu.showModal();
  };
  menu.addEventListener('cancel',event=>{event.preventDefault();close();});
  menu.addEventListener('click',event=>{if(event.target===menu||event.target.closest('[data-experience-close],a[href]'))close();});
  window.addEventListener('hashchange',close);
  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const control=event.target.closest('button,a[href],summary,[role=button]');
    if(!control||control.matches(':disabled,[aria-disabled=true]'))return;
    if(control.matches('[data-click-sound]')) {
      sound=!sound;try{localStorage.setItem(soundKey,sound?'on':'off');}catch{}
      document.querySelectorAll('[data-click-sound]').forEach(button=>{button.setAttribute('aria-pressed',String(sound));button.setAttribute('aria-label',`Klikgeluiden ${sound?'uitschakelen':'inschakelen'}`);button.querySelector('span').textContent=`Geluid ${sound?'aan':'uit'}`;});
    }
    if(control.matches('[data-experience-menu]'))open();
    if(sound&&Date.now()-lastSound>70){
      lastSound=Date.now();
      try {
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(Audio){audio??=new Audio();if(audio.state==='suspended')void audio.resume().catch(()=>{});
          const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime;
          oscillator.frequency.setValueAtTime(760,start);oscillator.frequency.exponentialRampToValueAtTime(420,start+.045);
          gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.035,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+.055);
          oscillator.connect(gain);gain.connect(audio.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+.06);
        }
      }catch{/* Audio support must never block an action. */}
    }
    if(document.documentElement.dataset.motion!=='calm'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      const bounds=control.getBoundingClientRect(),pulse=document.createElement('i');pulse.className='experience-pulse';pulse.setAttribute('aria-hidden','true');
      pulse.style.left=`${event.detail?event.clientX:bounds.left+bounds.width/2}px`;pulse.style.top=`${event.detail?event.clientY:bounds.top+bounds.height/2}px`;
      document.body.append(pulse);setTimeout(()=>pulse.remove(),450);
    }
  });
  const decorate=()=>{
    frame=0;
    const main=document.querySelector('main.content');if(!main)return;
    const route=location.hash.slice(1).split('?')[0]||'start';
    main.dataset.experienceRoute=route;
    const glyph=document.querySelector('.sidebar [aria-current=page] svg');
    main.querySelectorAll('.page-heading:not([data-experience-heading])').forEach(heading=>{
      heading.dataset.experienceHeading='';
      if(glyph){const emblem=document.createElement('span');emblem.className='experience-emblem';emblem.setAttribute('aria-hidden','true');emblem.append(glyph.cloneNode(true));heading.prepend(emblem);}
    });
  };
  new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(decorate);}).observe(document.getElementById('app')||document.getElementById('preview')||document.body,{childList:true,subtree:true});
  decorate();
}
