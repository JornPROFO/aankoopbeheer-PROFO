/** Keep help available across route renders, including keyboard-trapped dialogs. */
export function initializeGuideHelper(root) {
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
  helper.innerHTML = `<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <ellipse cx="47" cy="86" rx="33" ry="5" fill="#603827" opacity=".12"/>
    <g class="guide-pet-tail"><path d="M57 77C89 88 94 61 85 45C84 60 64 54 57 77Z" fill="#c46d44"/><path d="M85 45C89 52 91 61 87 68L76 59C81 56 84 52 85 45Z" fill="#fff1da"/></g>
    <path d="M30 80Q25 48 47 46Q66 49 65 81Z" fill="#c46d44"/>
    <path d="M36 79Q35 54 47 54Q59 55 59 79Z" fill="#fff1da"/>
    <path d="M22 37L20 10L39 23Q47 20 55 23L73 10L71 38Q70 56 47 62Q24 54 22 37Z" fill="#d78254" stroke="#9b5336" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M25 17L27 32L35 27ZM68 17L58 27L67 32Z" fill="#f3c3a4"/>
    <path d="M24 37Q36 33 47 49Q59 33 70 37Q67 54 47 60Q28 54 24 37Z" fill="#fff1da"/>
    <g fill="#56352a"><ellipse cx="35" cy="38" rx="2.4" ry="3"/><ellipse cx="59" cy="38" rx="2.4" ry="3"/><path d="M42 48Q47 45 52 48L47 53Z"/></g>
    <path d="M43 56Q47 59 51 56" fill="none" stroke="#56352a" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M24 66Q35 63 47 69Q59 63 70 66V85Q59 82 47 87Q35 82 24 85Z" fill="#b61917" stroke="#891811" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M47 70V85M30 72L40 74M54 74L64 72M30 77L40 79M54 79L64 77" stroke="#ffe8df" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="26" cy="72" rx="5" ry="7" fill="#d78254"/><ellipse cx="68" cy="72" rx="5" ry="7" fill="#d78254"/>
  </svg><span>Handleiding <span aria-hidden="true">↗</span></span>`;
  const sync = () => {
    const modal = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
    const parent = modal || document.body;
    helper.classList.toggle('guide-pet-in-dialog', Boolean(modal));
    if (helper.parentElement !== parent) parent.append(helper);
  };
  sync();
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
}
