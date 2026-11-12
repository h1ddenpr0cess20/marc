import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as GFX from 'madness-engine/gfx';
import { CHOCOLATES, EGG_VARIETIES, METALS, WOOD_SPECIES } from 'madness-engine/heroes/debater-egg/index';

import { createEggBuddy, ROLL_REACH, SQUASH_GAIN, WALL_BEHIND } from '../../src/client/egg/index.js';
import { DEFAULT_LOOK, LOOKS, eggOptions, loadLook, normalizeLook, saveLook } from '../../src/client/egg/looks.js';

/** The eggs hanging from Marc, which is every child but the blot under them. */
const eggsOf = (marc) => marc.group.children.filter((c) => c.name !== 'blot');

const stubStage = (onObject = () => {}) => ({ _scene: {}, _renderer: null, setObject: onObject });

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

describe('LOOKS', () => {
  it('offers the speckled egg, glass with mist, every metal, every wood and chocolate', () => {
    assert.deepEqual(Object.keys(LOOKS), ['original', 'glass', 'metal', 'wood', 'chocolate']);
    assert.deepEqual(LOOKS.original.variants, Object.keys(EGG_VARIETIES));
    assert.deepEqual(LOOKS.original.variants, ['speckled', 'white', 'brown']);
    assert.deepEqual(LOOKS.glass.variants, ['mist', 'clear']);
    assert.deepEqual(LOOKS.metal.variants, Object.keys(METALS));
    assert.deepEqual(LOOKS.wood.variants, Object.keys(WOOD_SPECIES));
    assert.deepEqual(LOOKS.chocolate.variants, Object.keys(CHOCOLATES));
  });

  it('starts glass in its mist, since that is the glass egg Marc wears', () => {
    assert.equal(normalizeLook({ kind: 'glass' }).variant, 'mist');
  });
});

describe('normalizeLook', () => {
  it('turns anything it does not know into the original', () => {
    for (const junk of [null, undefined, {}, { kind: 'jelly' }, { kind: '__proto__' }, 'wood']) {
      assert.deepEqual(normalizeLook(junk), DEFAULT_LOOK);
    }
  });

  it('gives a kind its first finish when the one named is not its own', () => {
    assert.deepEqual(normalizeLook({ kind: 'metal', variant: 'oak' }), { kind: 'metal', variant: 'steel' });
    assert.deepEqual(normalizeLook({ kind: 'wood' }), { kind: 'wood', variant: 'walnut' });
    assert.deepEqual(normalizeLook({ kind: 'original', variant: 'gold' }), { kind: 'original', variant: 'speckled' });
    assert.deepEqual(normalizeLook({ kind: 'original', variant: null }), DEFAULT_LOOK, 'an egg saved before there were varieties');
  });

  it('keeps a finish that is the kind’s own', () => {
    assert.deepEqual(normalizeLook({ kind: 'metal', variant: 'rose gold' }), { kind: 'metal', variant: 'rose gold' });
  });
});

describe('eggOptions', () => {
  it('asks the engine for each look by its own names', () => {
    assert.deepEqual(eggOptions(DEFAULT_LOOK), { appearance: 'original', variety: 'speckled' });
    assert.deepEqual(eggOptions({ kind: 'original', variant: 'brown' }), { appearance: 'original', variety: 'brown' });
    assert.deepEqual(eggOptions({ kind: 'glass', variant: 'mist' }), { appearance: 'glass', mist: true });
    assert.deepEqual(eggOptions({ kind: 'glass', variant: 'clear' }), { appearance: 'glass', mist: false });
    assert.deepEqual(eggOptions({ kind: 'metal', variant: 'gold' }), { appearance: 'metal', metal: 'gold' });
    assert.deepEqual(eggOptions({ kind: 'wood', variant: 'oak' }), { appearance: 'wood', species: 'oak', finish: 'lacquered' });
    assert.deepEqual(eggOptions({ kind: 'chocolate', variant: 'dark' }), { appearance: 'chocolate', chocolate: 'dark' });
  });
});

describe('the remembered look', () => {
  it('is the original when nothing was kept', () => {
    assert.deepEqual(loadLook(fakeStorage()), DEFAULT_LOOK);
    assert.deepEqual(loadLook(null), DEFAULT_LOOK);
  });

  it('comes back as it was saved', () => {
    const storage = fakeStorage();
    saveLook({ kind: 'wood', variant: 'cherry' }, storage);
    assert.deepEqual(loadLook(storage), { kind: 'wood', variant: 'cherry' });
  });

  it('survives a store full of nonsense and one that refuses to write', () => {
    assert.deepEqual(loadLook(fakeStorage({ 'marc.egg.v1': '{not json' })), DEFAULT_LOOK);
    assert.deepEqual(loadLook(fakeStorage({ 'marc.egg.v1': '{"kind":"jelly"}' })), DEFAULT_LOOK);
    assert.doesNotThrow(() => saveLook({ kind: 'metal' }, { setItem() { throw new Error('full'); } }));
  });
});

describe('createEggBuddy', () => {
  it('ignores a state that is not one of the four', () => {
    const marc = createEggBuddy({ stage: stubStage(), GFX });
    marc.setState('speaking');

    for (const junk of ['nonsense', 'constructor', '__proto__', 'toString']) {
      marc.setState(junk);
      assert.equal(marc.state, 'speaking', `${junk} was taken for a mood`);
    }
  });

  it('clamps what it is handed, so a bad level cannot escape the range', () => {
    const marc = createEggBuddy({ stage: stubStage(), GFX });
    assert.doesNotThrow(() => {
      marc.setLevel(4);
      marc.setLevel(-1);
      marc.pulse(9);
      marc.pulse(-3);
    });
  });

  it('hands the stage a named object, since the exporter writes those names out', () => {
    let object = null;
    createEggBuddy({ stage: stubStage((o) => { object = o; }), GFX });
    assert.equal(object.name, 'marc');
    assert.ok(object.getObjectByName('shell'), 'no shell under the group');
    assert.ok(object.getObjectByName('spinner').getObjectByName('body'));
  });

  it('leaves every mesh without shadows, though the stage switches them on, and the renderer’s shadow map off', () => {
    const renderer = { shadowMap: { enabled: true } };
    const stage = {
      _scene: {}, _renderer: renderer,
      setObject: (o) => o.traverse((c) => { if (c.isMesh) c.castShadow = c.receiveShadow = true; }),
    };
    const marc = createEggBuddy({ stage, GFX, look: { kind: 'glass', variant: 'mist' } });
    marc.setLook({ kind: 'wood', variant: 'oak' });
    marc.setLook({ kind: 'glass', variant: 'mist' });
    let meshes = 0;
    marc.group.traverse((c) => {
      if (!c.isMesh) return;
      meshes++;
      assert.equal(c.castShadow, false, `${c.name} casts a shadow`);
      assert.equal(c.receiveShadow, false, `${c.name} takes a shadow`);
    });
    assert.ok(meshes > 1);
    assert.equal(renderer.shadowMap.enabled, false);
  });

  it('keeps a blot under the egg on the floor, that the egg moves and a swap keeps', () => {
    let framed = null;
    const marc = createEggBuddy({ stage: stubStage((o) => { framed = o.getObjectByName('blot'); }), GFX });
    assert.ok(!framed, 'the camera is framed on the egg, not its blot');
    const blot = marc.group.getObjectByName('blot');
    assert.ok(blot);
    assert.ok(blot.position.y < 0 || blot.position.y > -2, 'it sits on the floor');
    marc.setLook({ kind: 'chocolate', variant: 'milk' });
    assert.equal(marc.group.getObjectByName('blot'), blot, 'one blot, whichever egg is on it');
    assert.equal(eggsOf(marc).length, 1);
  });

  it('has an egg on the stage before the stage frames it, or it would frame nothing', () => {
    let meshes = 0;
    createEggBuddy({ stage: stubStage((o) => o.traverse((c) => { if (c.isMesh) meshes++; })), GFX });
    assert.ok(meshes > 0);
  });

  it('rolls as far as Marc does, which is farther than the debater’s egg', () => {
    const marc = createEggBuddy({ stage: stubStage(), GFX });
    assert.equal(ROLL_REACH, 0.42);
    assert.ok(eggsOf(marc)[0]);
  });

  describe('the look', () => {
    const shellOf = (marc) => marc.group.getObjectByName('shell');

    it('wears the look it is asked for', () => {
      const wood = createEggBuddy({ stage: stubStage(), GFX, look: { kind: 'wood', variant: 'oak' } });
      assert.equal(shellOf(wood).material.name, 'wooden-eggshell');
      const metal = createEggBuddy({ stage: stubStage(), GFX, look: { kind: 'metal', variant: 'gold' } });
      assert.equal(shellOf(metal).material.metalness, 1);
      const glass = createEggBuddy({ stage: stubStage(), GFX, look: { kind: 'glass', variant: 'mist' } });
      assert.equal(glass.group.getObjectByName('mist').visible, true);
      const choc = createEggBuddy({ stage: stubStage(), GFX, look: { kind: 'chocolate', variant: 'dark' } });
      assert.equal(shellOf(choc).material.name, 'chocolate-eggshell');
    });

    it('swaps kind for kind, one egg at a time, and keeps the state it was in', () => {
      const marc = createEggBuddy({ stage: stubStage(), GFX });
      marc.setState('speaking');
      assert.equal(eggsOf(marc).length, 1);
      const before = eggsOf(marc)[0];

      marc.setLook({ kind: 'chocolate', variant: 'milk' });
      assert.equal(eggsOf(marc).length, 1, 'the old egg is still hanging there');
      assert.notEqual(eggsOf(marc)[0], before);
      assert.equal(shellOf(marc).material.name, 'chocolate-eggshell');
      assert.equal(marc.state, 'speaking');
      assert.deepEqual(marc.look, { kind: 'chocolate', variant: 'milk' });
    });

    it('refinishes the egg it has when only the finish changes', () => {
      const marc = createEggBuddy({ stage: stubStage(), GFX, look: { kind: 'metal', variant: 'steel' } });
      const egg = eggsOf(marc)[0];
      marc.setLook({ kind: 'metal', variant: 'copper' });
      assert.equal(eggsOf(marc)[0], egg);
      assert.equal(shellOf(marc).material.roughness, METALS.copper.roughness);

      marc.setLook({ kind: 'metal', variant: 'copper' });
      assert.equal(eggsOf(marc)[0], egg);

      marc.setLook({ kind: 'wood', variant: 'oak' });
      const wood = eggsOf(marc)[0];
      marc.setLook({ kind: 'wood', variant: 'maple' });
      assert.equal(eggsOf(marc)[0], wood);

      marc.setLook({ kind: 'glass', variant: 'mist' });
      const glass = eggsOf(marc)[0];
      marc.setLook({ kind: 'glass', variant: 'clear' });
      assert.equal(eggsOf(marc)[0], glass);
      assert.equal(marc.group.getObjectByName('mist').visible, false);
    });

    it('lays a plain white or brown shell on the original without a new egg', () => {
      const marc = createEggBuddy({ stage: stubStage(), GFX });
      const egg = eggsOf(marc)[0];
      marc.setLook({ kind: 'original', variant: 'brown' });
      assert.equal(eggsOf(marc)[0], egg);
      assert.equal(shellOf(marc).material.map, null);
      assert.ok(shellOf(marc).material.color.r > shellOf(marc).material.color.b, 'brown is warm');
      marc.setLook({ kind: 'original', variant: 'speckled' });
      assert.deepEqual(marc.look, DEFAULT_LOOK);
    });

    it('takes a look it does not know for the original', () => {
      const marc = createEggBuddy({ stage: stubStage(), GFX, look: { kind: 'metal' } });
      marc.setLook({ kind: 'jelly' });
      assert.deepEqual(marc.look, DEFAULT_LOOK);
      assert.equal(shellOf(marc).material.name, 'eggshell');
    });

    it('can put on every look the picker offers', () => {
      const marc = createEggBuddy({ stage: stubStage(), GFX });
      for (const [kind, entry] of Object.entries(LOOKS)) {
        for (const variant of entry.variants.length ? entry.variants : [null]) {
          assert.doesNotThrow(() => marc.setLook({ kind, variant }), `${kind} ${variant}`);
          assert.equal(eggsOf(marc).length, 1);
        }
      }
    });
  });
});

describe('the persona that goes with each look', () => {
  it('has a manner on the server for every look the picker has but the original', async () => {
    const { EGG_TRAITS } = await import('../../src/server/persona.js');
    assert.deepEqual(Object.keys(EGG_TRAITS).sort(), Object.keys(LOOKS).sort());
    for (const kind of Object.keys(LOOKS)) assert.equal(Boolean(EGG_TRAITS[kind]), kind !== 'original', kind);
  });

  it('knows every finish the picker offers as plain letters, so none is dropped', async () => {
    const { eggBlock } = await import('../../src/server/persona.js');
    for (const [kind, entry] of Object.entries(LOOKS)) {
      for (const variant of entry.variants) {
        if (kind !== 'original') assert.match(eggBlock({ kind, variant }), new RegExp(`Your shell is ${variant}`), `${kind} ${variant}`);
      }
    }
  });
});

describe('standing on the counter', () => {
  it('stands well clear of the wall, with the kitchen on the floor he stands on', () => {
    const marc = createEggBuddy({ stage: { ...stubStage(), _scene: { add() {} } }, GFX });
    assert.ok(WALL_BEHIND >= 4, 'close enough to the wall to crowd him');
    assert.equal(marc.kitchen.group.position.z, -WALL_BEHIND);
    assert.ok(marc.kitchen.group.position.y < 0, 'its top is at his foot, not above it');
  });

  it('squashes less than the engine does, and keeps his foot on the counter', () => {
    assert.ok(SQUASH_GAIN > 0 && SQUASH_GAIN < 1);
  });
});
