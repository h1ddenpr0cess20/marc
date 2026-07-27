/**
 * Marc's pure maths. No WebGL — three's geometry and colour classes are plain
 * arithmetic and run fine in Node, and the skin quietly goes inert without a
 * document, which is exactly the path this exercises.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import { createEggBuddy } from '../../src/client/egg/index.js';
import { ENERGY_GAIN, MOODS } from '../../src/client/egg/moods.js';
import { approach, spring } from '../../src/client/egg/motion.js';
import { shapeEgg } from '../../src/client/egg/shell.js';
import { createShellSkin } from '../../src/client/egg/skin.js';

describe('MOODS', () => {
  const CHANNELS = ['jitter', 'lean', 'rock', 'rockSpeed', 'roll', 'spin', 'squash', 'fidget'];

  it('covers the four conversational states', () => {
    assert.deepEqual(Object.keys(MOODS).sort(), ['idle', 'listening', 'speaking', 'thinking']);
  });

  it('gives every state every channel', () => {
    // The easing loop walks the keys of the idle mood and reads mood[k] off
    // whichever state is current. A channel missing from one state would ease
    // toward undefined and put NaN into the transform — Marc vanishes.
    for (const [name, mood] of Object.entries(MOODS)) {
      assert.deepEqual(Object.keys(mood).sort(), [...CHANNELS].sort(), `${name} is missing a channel`);
      for (const [channel, value] of Object.entries(mood)) {
        assert.equal(typeof value, 'number', `${name}.${channel}`);
        assert.ok(Number.isFinite(value), `${name}.${channel} is not finite`);
      }
    }
  });

  it('names only channels that exist when energy pushes them', () => {
    for (const channel of Object.keys(ENERGY_GAIN)) {
      assert.ok(channel in MOODS.idle, `ENERGY_GAIN.${channel} has no matching mood channel`);
    }
  });

  it('spins for thinking and nothing else, which is the pose that reads', () => {
    assert.ok(MOODS.thinking.spin > 0);
    for (const name of ['idle', 'listening', 'speaking']) {
      assert.equal(MOODS[name].spin, 0, `${name} would spin`);
    }
  });

  it('keeps listening calmer than speaking, and rolls only while talking', () => {
    assert.ok(MOODS.listening.jitter < MOODS.speaking.jitter);
    assert.ok(MOODS.listening.squash < MOODS.speaking.squash);
    assert.ok(MOODS.speaking.roll > 0);
    assert.equal(MOODS.idle.roll, 0);
  });

  it('leaves the states that should hold still with nothing for energy to scale', () => {
    // squash multiplies its baseline, so a zero here is a hard stop however
    // loud the room gets — a spinning egg shouldn't also be bobbing.
    assert.equal(MOODS.thinking.squash, 0);
    assert.equal(MOODS.idle.squash, 0);
  });
});

describe('motion', () => {
  describe('spring', () => {
    it('settles on its target from either side', () => {
      for (const from of [-2, 0, 5]) {
        const s = { p: from, v: 0 };
        for (let i = 0; i < 2000; i++) spring(s, 175, 10.5, 1 / 60, 1);
        assert.ok(Math.abs(s.p - 1) < 1e-6, `from ${from} settled at ${s.p}`);
        assert.ok(Math.abs(s.v) < 1e-6);
      }
    });

    it('overshoots before it settles — that is the whole point of a spring', () => {
      const s = { p: 0, v: 0 };
      let peak = 0;
      for (let i = 0; i < 240; i++) peak = Math.max(peak, spring(s, 175, 6, 1 / 60, 1));
      assert.ok(peak > 1, `never overshot, peaked at ${peak}`);
    });

    it('stays finite at the longest frame the loop will hand it', () => {
      const s = { p: 0, v: 0 };
      for (let i = 0; i < 500; i++) spring(s, 175, 10.5, 0.05, 1);
      assert.ok(Number.isFinite(s.p) && Number.isFinite(s.v));
      assert.ok(Math.abs(s.p - 1) < 1e-3);
    });

    it('returns the position it just wrote, so a caller can read it inline', () => {
      const s = { p: 0, v: 0 };
      assert.equal(spring(s, 68, 6.2, 1 / 60, 1), s.p);
    });
  });

  describe('approach', () => {
    it('closes a fixed fraction of the gap per second', () => {
      assert.equal(approach(0, 1, 2, 0.25), 0.5);
    });

    it('lands exactly on target rather than overshooting on a long frame', () => {
      // dt * rate above 1 would otherwise fly past and oscillate.
      assert.equal(approach(0, 1, 10, 1), 1);
      assert.equal(approach(5, -3, 40, 0.5), -3);
    });

    it('is a no-op when it is already there', () => {
      assert.equal(approach(0.4, 0.4, 3.2, 1 / 60), 0.4);
    });
  });
});

describe('shapeEgg', () => {
  const profile = () => {
    const geometry = new THREE.SphereGeometry(1, 64, 48);
    const p = shapeEgg(geometry.attributes.position.array);
    let top = 0, bottom = 0, height = 0, width = 0;
    for (let i = 0; i < p.length; i += 3) {
      const r = Math.hypot(p[i], p[i + 2]);
      const y = p[i + 1];
      width = Math.max(width, r);
      height = Math.max(height, Math.abs(y));
      if (y > 0.55) top = Math.max(top, r);
      if (y < -0.55) bottom = Math.max(bottom, r);
    }
    return { top, bottom, height, width };
  };

  it('is taller than it is wide', () => {
    const { height, width } = profile();
    assert.ok(height > width, `${height} is not taller than ${width}`);
  });

  it('is fuller at the base than at the crown, which is what makes it an egg', () => {
    const { top, bottom } = profile();
    assert.ok(bottom > top, `base ${bottom} is not fuller than crown ${top}`);
  });

  it('keeps both ends rounded — a point would read as a teardrop', () => {
    const geometry = new THREE.SphereGeometry(1, 64, 48);
    const p = shapeEgg(geometry.attributes.position.array);
    let widest = 0;
    for (let i = 0; i < p.length; i += 3) widest = Math.max(widest, Math.hypot(p[i], p[i + 2]));
    // Nothing collapses to zero radius except the two poles themselves.
    let near = 0;
    for (let i = 0; i < p.length; i += 3) {
      const y = p[i + 1];
      if (Math.abs(y) < 0.9) near = Math.max(near, 1);
      assert.ok(Number.isFinite(y));
    }
    assert.equal(near, 1);
    assert.ok(widest > 0.5);
  });

  it('writes in place and hands the same array back', () => {
    const positions = new Float32Array([0, 1, 0, 1, 0, 0]);
    assert.equal(shapeEgg(positions), positions);
    assert.notEqual(positions[1], 1);
  });

  it('is deterministic — no randomness to make Marc differ per load', () => {
    const once = shapeEgg(new THREE.SphereGeometry(1, 16, 12).attributes.position.array.slice());
    const twice = shapeEgg(new THREE.SphereGeometry(1, 16, 12).attributes.position.array.slice());
    assert.deepEqual(Array.from(once), Array.from(twice));
  });
});

describe('createShellSkin', () => {
  it('goes inert without a document instead of throwing', () => {
    // The whole module is a nicety: no canvas, no speckles, plain cream shell.
    const skin = createShellSkin(THREE);
    assert.equal(skin.map, null);
    assert.equal(skin.bumpMap, null);
  });
});

describe('createEggBuddy', () => {
  /* No renderer and no document, so the environment map and the skin both
     quietly give up — which is what they are written to do, and all this needs
     is the rig. */
  const stubStage = () => ({ _scene: {}, _renderer: null, setObject() {} });

  it('ignores a state that is not one of the four', () => {
    const marc = createEggBuddy({ stage: stubStage(), THREE });
    marc.setState('speaking');

    // `constructor` and `__proto__` are the ones a truth test lets through:
    // both are truthy on any object literal, and interpolating towards one
    // turns every channel into NaN and never recovers.
    for (const junk of ['nonsense', 'constructor', '__proto__', 'toString']) {
      marc.setState(junk);
      assert.equal(marc.state, 'speaking', `${junk} was taken for a mood`);
    }
  });

  it('clamps what it is handed, so a bad level cannot escape the range', () => {
    const marc = createEggBuddy({ stage: stubStage(), THREE });
    assert.doesNotThrow(() => {
      marc.setLevel(4);
      marc.setLevel(-1);
      marc.pulse(9);
      marc.pulse(-3);
    });
  });

  it('hands the stage a named object, since the exporter writes those names out', () => {
    let object = null;
    createEggBuddy({ stage: { _scene: {}, _renderer: null, setObject: (o) => { object = o; } }, THREE });
    assert.equal(object.name, 'marc');
    assert.ok(object.getObjectByName('shell'), 'no shell under the group');
    // The nesting is load-bearing: spin lives between the world tilt and the
    // lie-down, so the two never fight.
    assert.ok(object.getObjectByName('spinner').getObjectByName('body'));
  });
});
