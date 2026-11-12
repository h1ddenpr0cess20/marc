import { createEgg } from 'madness-engine/heroes/debater-egg/index';
import { environmentFrom, studioEnvironment } from 'madness-engine/props/metalglobe';
import { paintRoom } from 'madness-engine/textures/rooms/studio';

import { DEFAULT_LOOK, eggOptions, normalizeLook } from './looks.js';

/**
 * How far he rolls from where he stands while he talks, in tiles. The engine's
 * Egg keeps closer to a lectern; Marc has the whole floor.
 */
export const ROLL_REACH = 0.42;

/**
 * Marc: the engine's Egg on the stage, and what the call drives it by.
 *
 * The egg itself — its shape, its shells, its moods and the way it rocks,
 * squashes and spins — is `heroes/debater-egg` in the engine, and so is the
 * light it is seen in (`props/metalglobe`'s studio). This holds one of them at
 * a time, swaps it for another when the look changes, and hands the new one
 * the state the old one was in.
 */
/** No mesh of his casts a shadow or takes one: the stage's own ground shadow and the egg's self-shadowing both went. */
function unshadow(group) {
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = false;
  });
}

export function createEggBuddy({ stage, GFX, look = DEFAULT_LOOK }) {
  /**
   * What the shell is seen in. Metal and glass are all reflection and want the
   * engine's bright studio; the rest are lit from a darker room, so the
   * speckles and the grain stay readable rather than blowing out.
   */
  const rooms = new Map();
  function lightFor(kind) {
    const bright = kind === 'metal' || kind === 'glass';
    if (!stage._renderer || typeof document === 'undefined') return;
    if (!rooms.has(bright)) {
      rooms.set(bright, bright ? studioEnvironment(GFX, stage._renderer) : environmentFrom(GFX, stage._renderer, paintRoom()));
    }
    const environment = rooms.get(bright);
    if (environment) stage._scene.environment = environment;
  }

  /** What the stage frames and the egg hangs from, so a swap leaves the camera where it was. */
  const mount = new GFX.Group();
  mount.name = 'marc';

  let current = normalizeLook(look);
  let egg = null;
  let state = 'idle';
  let level = 0;

  function make(next) {
    const made = createEgg({ GFX, reach: ROLL_REACH, ...eggOptions(next) });
    unshadow(made.group);
    made.setState(state);
    made.setLevel(level);
    return made;
  }

  function discard(old) {
    old.group.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }

  function swap(next) {
    const old = egg;
    egg = make(next);
    mount.add(egg.group);
    if (old) {
      mount.remove(old.group);
      discard(old);
    }
  }

  lightFor(current.kind);
  swap(current);
  stage.setObject(mount);
  /** `setObject` switches every mesh's shadows on, and the renderer's with them: both go back off. */
  unshadow(mount);
  if (stage._renderer?.shadowMap) stage._renderer.shadowMap.enabled = false;

  return {
    get state() { return state; },
    get look() { return { ...current }; },
    /** The group the stage holds. */
    group: mount,

    /** Puts on another look. Where only the finish changes, the egg already there is refinished. */
    setLook(next) {
      const wanted = normalizeLook(next);
      if (wanted.kind === current.kind && wanted.variant === current.variant) return current;
      if (wanted.kind === current.kind) {
        if (wanted.kind === 'metal') egg.setMetal(wanted.variant);
        else if (wanted.kind === 'wood') egg.setWood(wanted.variant);
        else if (wanted.kind === 'chocolate') egg.setChocolate(wanted.variant);
        else if (wanted.kind === 'glass') egg.setMist(wanted.variant === 'mist');
      } else {
        lightFor(wanted.kind);
        swap(wanted);
      }
      current = wanted;
      return { ...current };
    },

    setState(next) {
      egg.setState(next);
      state = egg.state;
    },

    setLevel(next) {
      level = Math.min(1, Math.max(0, next));
      egg.setLevel(level);
    },

    pulse(weight = 0.3) {
      egg.pulse(weight);
    },
  };
}
