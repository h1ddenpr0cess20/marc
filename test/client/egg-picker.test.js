import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { LOOKS } from '../../src/client/egg/looks.js';
import { createEggPicker } from '../../src/client/ui/egg.js';
import { loadPage } from '../helpers/dom.js';

describe('createEggPicker', () => {
  let page;
  let changes;

  beforeEach(async () => {
    page = await loadPage();
    changes = [];
  });

  afterEach(() => page.close());

  const make = (look) => createEggPicker({ root: page.document, look, onChange: (next) => changes.push(next) });
  const pick = (sel, value) => {
    const el = page.$(sel);
    el.value = value;
    el.dispatchEvent(new page.window.Event('change'));
  };

  it('finds its pickers in the shipped markup, under the menu', () => {
    assert.ok(page.$('#menu-items #egg'));
    assert.ok(page.$('#menu-items #egg-variant'));
  });

  it('lists every kind of egg and shows the one it starts with', () => {
    make({ kind: 'wood', variant: 'teak' });
    assert.deepEqual([...page.$('#egg').options].map((o) => o.value), Object.keys(LOOKS));
    assert.equal(page.$('#egg').value, 'wood');
    assert.deepEqual([...page.$('#egg-variant').options].map((o) => o.value), LOOKS.wood.variants);
    assert.equal(page.$('#egg-variant').value, 'teak');
  });

  it('offers the original egg speckled, white or brown, and shows its finish picker for every kind', () => {
    make({ kind: 'original' });
    assert.deepEqual([...page.$('#egg-variant').options].map((o) => o.value), ['speckled', 'white', 'brown']);
    assert.equal(page.$('#egg-variant').value, 'speckled');
    for (const kind of Object.keys(LOOKS)) {
      pick('#egg', kind);
      assert.equal(page.$('#egg-variant').hidden, false, kind);
    }
  });

  it('says which variety of the original was picked', () => {
    make({ kind: 'original' });
    pick('#egg-variant', 'white');
    assert.deepEqual(changes.at(-1), { kind: 'original', variant: 'white' });
  });

  it('starts a new kind in its first finish and says what was picked', () => {
    make({ kind: 'original' });
    pick('#egg', 'metal');
    assert.deepEqual(changes.at(-1), { kind: 'metal', variant: 'steel' });
    pick('#egg-variant', 'gold');
    assert.deepEqual(changes.at(-1), { kind: 'metal', variant: 'gold' });
    pick('#egg', 'chocolate');
    assert.deepEqual(changes.at(-1), { kind: 'chocolate', variant: 'milk' });
    assert.deepEqual([...page.$('#egg-variant').options].map((o) => o.value), LOOKS.chocolate.variants);
  });

  it('says which egg it was on, and goes back to it when the change is refused', async () => {
    const calls = [];
    createEggPicker({
      root: page.document, look: { kind: 'metal', variant: 'gold' },
      onChange: (next, before) => { calls.push([next, before]); return false; },
    });
    pick('#egg', 'wood');
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls[0][0], { kind: 'wood', variant: 'walnut' });
    assert.deepEqual(calls[0][1], { kind: 'metal', variant: 'gold' });
    assert.equal(page.$('#egg').value, 'metal');
    assert.equal(page.$('#egg-variant').value, 'gold');
    assert.deepEqual([...page.$('#egg-variant').options].map((o) => o.value), LOOKS.metal.variants);
  });

  it('goes back when the refusal comes later', async () => {
    createEggPicker({ root: page.document, look: { kind: 'original' }, onChange: async () => false });
    pick('#egg-variant', 'brown');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(page.$('#egg-variant').value, 'speckled');
  });

  it('stays where it is for any answer but a refusal', async () => {
    const kept = createEggPicker({ root: page.document, look: { kind: 'original' }, onChange: async () => true });
    pick('#egg-variant', 'white');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(page.$('#egg-variant').value, 'white');
    assert.deepEqual(kept.look, { kind: 'original', variant: 'white' });
  });

  it('can be set from outside without announcing it', () => {
    const picker = make({ kind: 'original' });
    picker.set({ kind: 'glass', variant: 'clear' });
    assert.equal(page.$('#egg').value, 'glass');
    assert.equal(page.$('#egg-variant').value, 'clear');
    assert.deepEqual(changes, []);
  });
});
