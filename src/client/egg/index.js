import { createEgg, createEggBlot } from 'madness-engine/heroes/debater-egg/index';
import { createTileKitchen } from 'madness-engine/props/tile-kitchen';
import { environmentFrom, studioEnvironment } from 'madness-engine/props/metalglobe';
import { paintRoom } from 'madness-engine/textures/rooms/house';

import { DEFAULT_LOOK, eggOptions, normalizeLook } from './looks.js';

/**
 * How far he rolls from where he stands while he talks, in tiles. The engine's
 * Egg keeps closer to a lectern; Marc has the whole floor.
 */
export const ROLL_REACH = 0.42;

/** How far behind him the tile wall stands, in tiles. */
export const WALL_BEHIND = 2.6;

/**
 * Marc: the engine's Egg on the stage, and what the call drives it by.
 *
 * The egg itself — its shape, its shells, its moods and the way it rocks,
 * squashes and spins — is `heroes/debater-egg` in the engine, and so is the
 * light it is seen in (`props/metalglobe`'s studio). This holds one of them at
 * a time, swaps it for another when the look changes, and hands the new one
 * the state the old one was in.
 */
/** No mesh of his casts a shadow or takes one: the blot under him is all the shadow he has. A shadow map leaves a lit gap under a rounded egg, and a glass one would throw as solid a shadow as a stone one. */
function unshadow(group) {
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = false;
  });
}

export function createEggBuddy({ stage, GFX, look = DEFAULT_LOOK }) {
  /**
   * What the shell and the kitchen are seen in. Polished metal and glass are
   * all reflection and want the engine's bright studio, where chrome stays
   * chrome; everything else is lit by the warm house room, which keeps the
   * speckles and the grain readable and the brass on the wall gold.
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

  /** What the egg moves under itself as it goes, on the floor the stage rests it on. */
  const blot = createEggBlot(GFX);
  blot.name = 'blot';
  mount.add(blot);

  let current = normalizeLook(look);
  let egg = null;
  let state = 'idle';
  let level = 0;

  function make(next) {
    const made = createEgg({ GFX, reach: ROLL_REACH, shadow: blot, ...eggOptions(next) });
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
  /** Framed on the egg alone: the blot is wider than he is, and would pull the camera back. */
  mount.remove(blot);
  stage.setObject(mount);
  mount.add(blot);
  /** `setObject` switches every mesh's shadows on, and the renderer's with them: both go back off. */
  unshadow(mount);
  if (stage._renderer?.shadowMap) stage._renderer.shadowMap.enabled = false;
  /** The floor is where his base is. A hair above it, so it is not fighting the stage's own ground. */
  const floor = new GFX.Box3().setFromObject(egg.group).min.y;
  blot.position.y = floor + 0.004;

  /**
   * He stands on a marble counter against a green tile wall with a brass rail,
   * the engine's kitchen. The camera looks down at him from the front and may
   * swing about him, but never behind the wall, under the counter or off to
   * its sides where there is nothing to see.
   */
  const kitchen = createTileKitchen(GFX);
  kitchen.group.position.set(0, floor - 0.002, -WALL_BEHIND);
  stage._scene?.add?.(kitchen.group);
  const camera = stage._camera, controls = stage._controls;
  if (camera && controls) {
    /**
     * He stands high in the frame, since the bar and the caption take the lower
     * third, and a tall, narrow window sees less of the sides: so the camera
     * stands back until he fits, as far as its limit.
     */
    const aspect = (globalThis.innerWidth || 1) / (globalThis.innerHeight || 1);
    const back = aspect < 1 ? Math.min(1.9, 1 / Math.max(0.5, aspect) ** 0.9) : 1;
    camera.position.set(0, floor + 3.0 * back, 6.6 * back);
    controls.target.set(0, floor + 0.05, 0.3);
    Object.assign(controls, {
      enablePan: false,
      minDistance: 3.4,
      maxDistance: 16,
      minPolarAngle: 0.55,
      maxPolarAngle: 1.45,
      minAzimuthAngle: -0.95,
      maxAzimuthAngle: 0.95,
    });
    camera.updateProjectionMatrix?.();
    controls.update();
  }

  return {
    get state() { return state; },
    get look() { return { ...current }; },
    /** The group the stage holds. */
    group: mount,
    /** The counter and the wall behind him. */
    kitchen,

    /** Puts on another look. Where only the finish changes, the egg already there is refinished. */
    setLook(next) {
      const wanted = normalizeLook(next);
      if (wanted.kind === current.kind && wanted.variant === current.variant) return current;
      if (wanted.kind === current.kind) {
        if (wanted.kind === 'original') egg.setVariety(wanted.variant);
        else if (wanted.kind === 'metal') egg.setMetal(wanted.variant);
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
