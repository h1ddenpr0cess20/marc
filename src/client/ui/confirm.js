/**
 * A question the page asks before doing something it cannot take back, in the
 * page's own dress rather than the browser's: a cream card over a dimmed room,
 * two buttons, and an answer.
 *
 *   const confirm = createConfirm();
 *   if (await confirm.ask({ title, text, ok: 'Go on', cancel: 'Keep it' })) ...
 *
 * Declining is the easy way out: it is the button that has the focus, and
 * Escape and a click anywhere outside the card say the same thing.
 */
export function createConfirm({ root = document } = {}) {
  const dialogEl = root.querySelector('#confirm');
  const titleEl = root.querySelector('#confirm-title');
  const textEl = root.querySelector('#confirm-text');
  const okEl = root.querySelector('#confirm-ok');
  const cancelEl = root.querySelector('#confirm-cancel');
  const cardEl = root.querySelector('#confirm-card');

  let settle = null;
  let returnTo = null;

  function close(answer) {
    if (!settle) return;
    const done = settle;
    settle = null;
    dialogEl.hidden = true;
    returnTo?.focus?.();
    returnTo = null;
    done(answer);
  }

  okEl.addEventListener('click', () => close(true));
  cancelEl.addEventListener('click', () => close(false));
  dialogEl.addEventListener('pointerdown', (e) => {
    if (!cardEl.contains(e.target)) close(false);
  });

  /**
   * Escape is this question's and nobody else's: the page behind it uses the
   * same key to close a panel or stop Marc talking, and neither is wanted here.
   * Tab stays on the two buttons.
   */
  dialogEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(false);
    } else if (e.key === 'Tab') {
      const first = cancelEl, last = okEl;
      const active = root.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  });

  return {
    /** Resolves true for the button that goes ahead, false for anything else. A second question while one is up turns the first down. */
    ask({ title, text, ok = 'Continue', cancel = 'Cancel' }) {
      close(false);
      returnTo = root.activeElement;
      titleEl.textContent = title;
      textEl.textContent = text;
      okEl.textContent = ok;
      cancelEl.textContent = cancel;
      dialogEl.hidden = false;
      cancelEl.focus();
      return new Promise((resolve) => { settle = resolve; });
    },

    get isOpen() {
      return !dialogEl.hidden;
    },
  };
}
