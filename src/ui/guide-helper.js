/** Keep help available across route renders, including keyboard-trapped dialogs. */
export function initializeGuideHelper(root) {
  const topics = {start:5, bestellen:5, ehbo:5, inkt:6, winkelmand:5, bestellingen:7, ontvangst:10, goedkeuren:11, leverancier:12, beheer:14, analyse:14, weergave:15};
  let focusedTopic = '', lastGuideHeading;
  root.addEventListener('click', event => {
    const jump = event.target.closest('[data-guide-jump]');
    if (!jump) return;
    const heading = [...root.querySelectorAll('.guide-card h3')].find(el => el.textContent.startsWith(`${jump.dataset.guideJump}.`));
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'start' }); }
  });
  const helper = document.createElement('a');
  helper.className = 'guide-pet';
  helper.href = '#handleiding';
  helper.target = '_blank';
  helper.rel = 'noopener';
  helper.setAttribute('aria-label', 'Handleiding openen in een nieuw tabblad');
  helper.title = 'Hulp nodig? Open de handleiding';
  helper.innerHTML = `<img class="guide-pet-portrait" src="/assets/profo-begeleider-help.webp" width="96" height="96" alt="" draggable="false" />
    <span class="guide-pet-label"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v14m0-14C9 4 5 4 2 5v15c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 2Z"/></svg><span>Handleiding</span><span aria-hidden="true">↗</span></span>`;
  const sync = () => {
    const modal = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
    const parent = modal || document.body;
    helper.classList.toggle('guide-pet-in-dialog', Boolean(modal));
    if (helper.parentElement !== parent) parent.append(helper);
    const route = window.location.hash.slice(1).split('?')[0] || 'start';
    const topic = modal?.hasAttribute('data-supplier-cart-dialog') ? 'leverancier' : focusedTopic || route;
    const href = '#handleiding?onderwerp=' + (topics[topic] ? topic : 'start');
    if (helper.getAttribute('href') !== href) helper.setAttribute('href', href);
    helper.setAttribute('aria-label', 'Handleiding voor deze stap openen in een nieuw tabblad');
    if (route === 'handleiding') {
      const section = topics[new URLSearchParams(window.location.hash.split('?')[1] || '').get('onderwerp')];
      const heading = [...root.querySelectorAll('.guide-card h3')].find(el => el.textContent.startsWith(`${section}.`));
      if (heading && heading !== lastGuideHeading) {
        lastGuideHeading = heading;
        requestAnimationFrame(() => { heading.tabIndex = -1; heading.focus({preventScroll:true}); heading.scrollIntoView({block:'start'}); });
      }
    }
  };
  document.addEventListener('focusin', event => {
    if (event.target.closest('.guide-pet')) return;
    focusedTopic = event.target.closest('[data-help-topic]')?.dataset.helpTopic || '';
    sync();
    // The fixed mobile controls must not cover a keyboard-focused field or action.
    if (!event.target.closest('.mobile-cart-bar') && !document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) {
      const rect = event.target.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 100) event.target.scrollIntoView({block:'center'});
    }
  });
  window.addEventListener('hashchange', () => { focusedTopic = ''; sync(); });
  sync();
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
}
