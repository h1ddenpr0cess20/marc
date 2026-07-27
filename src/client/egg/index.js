/**
 * Marc, as a controller.
 *
 * Everything visual lives under this directory; nothing in it knows where its
 * input comes from. The controller surface is deliberately audio-shaped so a
 * voice pipeline drops in without touching the geometry:
 *
 *   marc.setState('speaking')   idle | listening | thinking | speaking
 *   marc.setLevel(0.62)         sustained amplitude 0..1 — mic RMS, or a TTS
 *                               AnalyserNode, sampled per frame
 *   marc.pulse(0.4)             transient impulse 0..1 — a token arriving now, or
 *                               a phoneme onset later
 *
 * The text path drives `pulse` because tokens are discrete. Audio drives
 * `setLevel` because waveforms are continuous. Both land on the same internal
 * `energy` value, so he moves identically either way — swapping transports is a
 * change of caller, not of code in here.
 *
 * Three nested groups, because the motions have to compose rather than fight:
 *
 *   marc      position and tilt in the world — rock, lean, tremor, precession
 *     spinner spin about world up, so a spinning egg doesn't drag its tilt round
 *       body  lie-down, roll and squash, all in his own frame
 */

import { buildEnvironment } from './environment.js';
import { ENERGY_GAIN, MOODS } from './moods.js';
import { approach, spring } from './motion.js';
import { createShell } from './shell.js';
import { createShellSkin } from './skin.js';

/** Contact radius while rolling — how far he travels per radian, so the roll
 *  doesn't skate. */
const RADIUS = 0.78;
/** How far he wanders from centre before turning back. */
const ROLL_REACH = 0.42;

export function createEggBuddy({ stage, THREE }) {
  buildEnvironment({ stage, THREE });

  const skin = createShellSkin(THREE);
  const shell = createShell(THREE, skin);

  const marc = new THREE.Group();
  marc.name = 'marc';
  const spinner = new THREE.Group();
  spinner.name = 'spinner';
  const body = new THREE.Group();
  body.name = 'body';

  marc.add(spinner);
  spinner.add(body);
  body.add(shell.mesh);

  let mood = MOODS.idle;
  let state = 'idle';
  const m = { ...MOODS.idle };

  /* `energy` is the animated value the rig actually reads. `sustain` is where it
     settles (continuous audio level); `impulse` is what decays on top of it
     (discrete token arrivals). A voice pipeline drives sustain and leaves
     impulse at zero; the text pipeline does the reverse. */
  let sustain = 0;
  let impulse = 0;
  let energy = 0;

  /* Squash, and tilt on all three axes. Every one of them is a spring, so a
     knock overshoots and settles instead of sliding. */
  const sq = { p: 0, v: 0 };
  const tx = { p: 0, v: 0 };
  const ty = { p: 0, v: 0 };
  const tz = { p: 0, v: 0 };

  let t = 0;
  let spinA = 0;
  let spinV = 0;
  let lie = 0;          // 0 upright, 1 flat on his side
  let ang = 0;          // how far he has rolled, in radians
  let x = 0;            // and how far that carried him
  let dir = 1;
  let rollPhase = 0;
  let rest = 0;
  let fidgetT = 2.4;

  const timer = new THREE.Timer();

  shell.mesh.onBeforeRender = () => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    t += dt;

    // Impulses fade fast enough to read as individual events; energy chases the
    // sum so nothing steps discontinuously.
    impulse = Math.max(0, impulse - impulse * Math.min(1, dt * 3.4) - dt * 0.05);
    energy = approach(energy, Math.min(1, sustain + impulse), 6, dt);

    for (const k in m) m[k] = approach(m[k], mood[k], 3.4, dt);

    const jitter = m.jitter * (1 + energy * ENERGY_GAIN.jitter);
    const squash = m.squash * (1 + energy * ENERGY_GAIN.squash);
    const rockAmp = m.rock + energy * ENERGY_GAIN.rock;

    /* --- thinking: lies down and spins like a hard-boiled egg --------------
       Solid all through, so it spins up fast and true — the precession is only
       there to keep the axis from looking mechanically fixed. */
    const spinning = state === 'thinking';
    lie = approach(lie, spinning ? 1 : 0, 3.2, dt);
    if (spinning) {
      spinV += (m.spin - spinV) * Math.min(1, dt * 4.1) - spinV * 0.12 * dt;
    } else {
      spinV = approach(spinV, 0, 3.2, dt);
      if (Math.abs(spinV) < 0.05) spinV = 0;
    }
    spinA += spinV * dt;
    const precAmp = 0.018 * Math.min(1, Math.abs(spinV) / 6);
    const precA = spinA * 0.9;

    /* --- speaking: rolls, because an egg can't stay put while it talks -----
       Rolling without slip: `ang` and `x` advance together, so the shell turns
       exactly as far as the ground it covers. It arcs out, thinks better of it,
       and comes back. */
    const rolling = m.roll > 0.02 && !spinning;
    let lift = 0;
    if (rolling) {
      if (rest > 0) {
        rest -= dt;
      } else {
        const speed = 1.15 * m.roll;
        rollPhase += dt * speed;
        ang += dir * dt * speed;
        x += dir * dt * speed * RADIUS;
        lift = Math.abs(Math.sin(rollPhase * 1.5)) * 0.035;   // pivots over his fat end
        if (Math.abs(x) > ROLL_REACH) {
          dir *= -1;
          rest = 0.5 + Math.random() * 0.6;
          sq.v += 1.2;
        }
      }
    } else {
      // Both unwind at the same rate, so he arrives back upright and centred
      // together rather than standing tipped over.
      x = approach(x, 0, 1.8, dt);
      ang = approach(ang, 0, 1.8, dt);
      rest = 0;
    }

    /* --- fidgets: the small movements that keep a still egg alive --------- */
    if (m.fidget > 0.01) {
      fidgetT -= dt * m.fidget;
      if (fidgetT <= 0) {
        const r = Math.random();
        if (r < 0.45) sq.v += 1.8;
        else if (r < 0.75) ty.v += (Math.random() < 0.5 ? -1 : 1) * 2.2;
        else { tz.v += (Math.random() - 0.5) * 4; tx.v += 1.2; }
        fidgetT = 2.6 + Math.random() * 4;
      }
    }

    spring(sq, 175, 10.5, dt, squash);
    const rock = Math.sin(t * m.rockSpeed * 2.0) * rockAmp;
    // Mid-roll he leans into the direction of travel; otherwise he rocks.
    spring(tz, 68, 6.2, dt, rolling && rest <= 0 ? dir * 0.1 : rock);
    spring(tx, 68, 6.2, dt, m.lean * 0.2);
    spring(ty, 38, 4.8, dt, 0);

    const tremor = jitter * 0.014;
    const breathe = Math.sin(t * 1.3) * 0.007;
    // A spinning egg drifts in a small circle rather than staying on its mark.
    const orbit = lie * Math.min(1, Math.abs(spinV) / 9) * 0.075;

    marc.position.set(
      x + Math.cos(spinA * 0.9) * orbit + (Math.random() - 0.5) * tremor,
      lift + breathe * 0.5 + Math.abs(rock) * 0.34 - lie * 0.2,
      Math.sin(spinA * 0.9) * orbit + (Math.random() - 0.5) * tremor,
    );
    marc.rotation.set(
      tx.p + Math.sin(precA) * precAmp + (Math.random() - 0.5) * tremor,
      ty.p,
      tz.p + Math.cos(precA) * precAmp + (Math.random() - 0.5) * tremor * 1.3,
    );

    spinner.rotation.y = spinA;
    body.rotation.set(lie * Math.PI * 0.5, 0, -ang + lie * Math.sin(spinA * 0.9) * 0.05);

    // Volume-preserving, near enough: what leaves the height goes to the width.
    const s = sq.p * 0.085 + breathe;
    body.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
  };

  stage.setObject(marc);

  return {
    get state() { return state; },

    /** idle | listening | thinking | speaking. Unknown names are ignored —
     *  hasOwn, not a truth test: `MOODS.constructor` is truthy and NaNs every channel. */
    setState(next) {
      if (!Object.hasOwn(MOODS, next) || next === state) return;
      state = next;
      mood = MOODS[next];
      if (next === 'idle' || next === 'thinking') sustain = 0;
    },

    /** Sustained amplitude, 0..1. Call per frame from an AnalyserNode. */
    setLevel(level) {
      sustain = Math.min(1, Math.max(0, level));
    },

    /** Transient impulse, 0..1. Call once per discrete event (a token, an onset).
     *  A turn changing hands is a knock as well as a level, so it kicks the
     *  springs directly — that beat should land whatever the audio is doing. */
    pulse(weight = 0.3) {
      const w = Math.min(1, Math.max(0, weight));
      impulse = Math.min(1, impulse + w);
      sq.v += w * 2.4;
      tz.v += (Math.random() - 0.5) * w * 2.6;
    },
  };
}
