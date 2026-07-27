/** Posture, motion and fidget rate per conversational state.
 *
 *  `spin` is the one that carries a state on its own: thinking lays Marc on his
 *  side and spins him like a hard-boiled egg, which is the only pose the other
 *  three ever take.
 */
export const MOODS = {
  idle:      { jitter: 0.06, lean:  0.00, rock: 0.05, rockSpeed: 1.0, roll: 0.00, spin: 0,  squash: 0.00, fidget: 0.35 },
  listening: { jitter: 0.03, lean: -0.60, rock: 0.10, rockSpeed: 1.5, roll: 0.00, spin: 0,  squash: 0.12, fidget: 0.20 },
  thinking:  { jitter: 0.05, lean:  0.10, rock: 0.02, rockSpeed: 1.2, roll: 0.00, spin: 24, squash: 0.00, fidget: 0.00 },
  speaking:  { jitter: 0.16, lean:  0.20, rock: 0.05, rockSpeed: 1.6, roll: 0.32, spin: 0,  squash: 0.50, fidget: 0.10 },
};

/** How far energy pushes each channel past its state baseline at full level.
 *  `squash` is the voice: the shell compresses and springs back with whoever is
 *  making sound, so a loud line reads as a bounce rather than a brighter colour.
 *  It multiplies the baseline rather than adding to it, so a state that isn't
 *  meant to move — thinking, mid-spin — stays still however loud the room is. */
export const ENERGY_GAIN = { squash: 2.2, jitter: 0.9, rock: 0.04 };
