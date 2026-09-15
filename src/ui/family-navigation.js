/** Delegated navigation survives the existing whole-view renderer. */
export function initializeFamilyNavigation() {
  const network=document.createElement('p');
  network.className='family-network';network.setAttribute('role','status');
  network.textContent='Geen internetverbinding. Controleer je verbinding voordat je gegevens opslaat.';
  document.body.prepend(network);
  const updateNetwork=()=>{network.hidden=navigator.onLine;};
  window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();
  const close = (shell, restoreFocus = false) => {
    shell.dataset.open = 'false';
    const toggle = shell.querySelector('[data-family-menu]');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = 'Menu openen <span aria-hidden="true">+</span>';
    if (restoreFocus) toggle.focus();
  };
  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-family-menu]');
    if (toggle) {
      const shell = toggle.closest('.family-nav');
      if (shell.dataset.open === 'true') return close(shell);
      shell.dataset.open = 'true';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.innerHTML = 'Menu sluiten <span aria-hidden="true">−</span>';
      return;
    }
    const link = event.target.closest('.family-nav a');
    if (link) close(link.closest('.family-nav'));
    const skip = event.target.closest('.skip-link');
    if (skip) {
      event.preventDefault();
      document.getElementById('main-content')?.focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const shell = document.querySelector('.family-nav[data-open="true"]');
      if (shell) close(shell, true);
    }
  });
}
