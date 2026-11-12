import { CHOCOLATES, METALS, WOOD_SPECIES } from 'madness-engine/heroes/debater-egg/index';

/**
 * The looks Marc comes in. What each one is — its shell, its finish, how it
 * catches the light — is the engine's: `heroes/debater-egg` makes every one
 * of these, and this only lists them for the picker.
 *
 * `appearance` is the engine's own name for the egg; `variants` is the finish
 * it takes, with the first as the one it starts in.
 */
export const LOOKS = Object.freeze({
  original: { label: 'speckled', appearance: 'original', variants: [] },
  glass: { label: 'glass', appearance: 'glass', variants: ['mist', 'clear'] },
  metal: { label: 'metal', appearance: 'metal', variants: Object.keys(METALS) },
  wood: { label: 'wood', appearance: 'wood', variants: Object.keys(WOOD_SPECIES) },
  chocolate: { label: 'chocolate', appearance: 'chocolate', variants: Object.keys(CHOCOLATES) },
});

export const DEFAULT_LOOK = Object.freeze({ kind: 'original', variant: null });

/** A look made well-formed: an unknown kind is the original, a variant the kind does not have is its first. */
export function normalizeLook(look) {
  const entry = Object.hasOwn(LOOKS, look?.kind) ? LOOKS[look.kind] : null;
  if (!entry) return { ...DEFAULT_LOOK };
  const variant = entry.variants.includes(look.variant) ? look.variant : (entry.variants[0] ?? null);
  return { kind: look.kind, variant };
}

/** What the engine's `createEgg` is asked for, to make `look`. */
export function eggOptions(look) {
  const { kind, variant } = normalizeLook(look);
  switch (kind) {
    case 'glass': return { appearance: 'glass', mist: variant === 'mist' };
    case 'metal': return { appearance: 'metal', metal: variant };
    case 'wood': return { appearance: 'wood', species: variant, finish: 'lacquered' };
    case 'chocolate': return { appearance: 'chocolate', chocolate: variant };
    default: return { appearance: 'original' };
  }
}

const KEY = 'marc.egg.v1';

function store() {
  try {
    const s = globalThis.localStorage;
    s.setItem(`${KEY}.probe`, '1');
    s.removeItem(`${KEY}.probe`);
    return s;
  } catch {
    return null;
  }
}

/** The look this browser picked last time, or the original. */
export function loadLook(storage = store()) {
  try {
    return normalizeLook(JSON.parse(storage?.getItem(KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_LOOK };
  }
}

export function saveLook(look, storage = store()) {
  try {
    storage?.setItem(KEY, JSON.stringify(normalizeLook(look)));
  } catch {
    /* A full or refused store only means the choice is not remembered. */
  }
}
