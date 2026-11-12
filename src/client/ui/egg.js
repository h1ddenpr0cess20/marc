import { LOOKS, normalizeLook } from '../egg/looks.js';

/**
 * The two pickers in the menu that dress the egg: which kind, and the finish
 * that kind comes in (the metal, the wood, the chocolate, the mist, the
 * speckles).
 *
 * `onChange` may refuse by answering `false`, now or later (a promise): the
 * pickers then go back to the egg they were on.
 */
export function createEggPicker({ root = document, look, onChange } = {}) {
  const kindEl = root.querySelector('#egg');
  const variantEl = root.querySelector('#egg-variant');
  const doc = kindEl.ownerDocument;
  let current = normalizeLook(look);

  kindEl.replaceChildren(...Object.entries(LOOKS).map(([kind, entry]) => new doc.defaultView.Option(entry.label, kind)));

  function fillVariants() {
    const { variants } = LOOKS[current.kind];
    variantEl.replaceChildren(...variants.map((v) => new doc.defaultView.Option(v, v)));
    variantEl.hidden = variants.length === 0;
  }

  function show() {
    kindEl.value = current.kind;
    fillVariants();
    if (current.variant) variantEl.value = current.variant;
  }

  async function pick(next) {
    const before = current;
    current = normalizeLook(next);
    show();
    if ((await onChange?.({ ...current }, { ...before })) === false) {
      current = before;
      show();
    }
  }

  /** A new kind starts in its first finish. */
  kindEl.addEventListener('change', () => pick({ kind: kindEl.value }));
  variantEl.addEventListener('change', () => pick({ kind: current.kind, variant: variantEl.value }));

  show();

  return {
    get look() { return { ...current }; },
    set(next) { current = normalizeLook(next); show(); },
  };
}
