/**
 * The two easings the rig is built from.
 *
 * Marc has a rigid shell rather than a body to displace, so the rig is built on
 * springs: squash, tilt and lean are second-order, which is what makes a knock
 * overshoot and settle instead of sliding into place.
 */

/** One damped-spring step, in place. `s` is `{ p, v }`; `k` is stiffness and
 *  `c` damping. Semi-implicit Euler — velocity first, so it stays stable at the
 *  stiffness the squash channel wants. */
export function spring(s, k, c, dt, to = 0) {
  s.v += (to - s.p) * k * dt - s.v * c * dt;
  s.p += s.v * dt;
  return s.p;
}

/** First-order chase, frame-rate independent and clamped so a long frame eases
 *  all the way to `target` rather than overshooting past it. */
export function approach(value, target, rate, dt) {
  return value + (target - value) * Math.min(1, dt * rate);
}
