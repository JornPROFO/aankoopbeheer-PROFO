/** Focus stays in the visible modal; no access to application data or permissions. */
export function initializeDialogAccessibility(root) {
  let dialog = null;
  let restore = null;
  let restoreSelector = '';
  const controls = () => dialog ? [...dialog.querySelectorAll('button:not(:disabled):not(.image-modal-backdrop),a[href],input:not([type="hidden"]):not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length) : [];
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-preview-product],[data-expected-delivery],[data-order-status]');
    if (!opener || dialog) return;
    restore = opener;
    restoreSelector = [...opener.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
  }, true);
  const sync = () => {
    const next = root.querySelector('[role="dialog"][aria-modal="true"]');
    if (next === dialog) return;
    const wasOpen = Boolean(dialog);
    dialog = next;
    for (const element of root.children) {
      element.inert = Boolean(dialog) && element !== dialog && !element.contains(dialog);
    }
    if (dialog) {
      dialog.tabIndex = -1;
      (controls()[0] || dialog).focus();
    } else if (wasOpen) {
      (restore?.isConnected ? restore : (restoreSelector && root.querySelector(restoreSelector)) || root.querySelector('#main-content'))?.focus();
      restore = null;
    }
  };
  document.addEventListener('keydown', event => {
    if (!dialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.querySelector('[data-close-preview],[data-cancel-expected-delivery]')?.click();
    }
    if (event.key === 'Tab') {
      const items = controls();
      if (!items.length) {event.preventDefault();dialog.focus();return;}
      const first = items[0], last = items[items.length-1];
      if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) {event.preventDefault();last.focus();}
      else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement))) {event.preventDefault();first.focus();}
    }
  });
  new MutationObserver(sync).observe(root,{childList:true,subtree:true});
  sync();
}
