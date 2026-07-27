/**
 * Soft warm studio environment, so the shell reads as smooth ceramic.
 *
 * A 64×32 canvas gradient with one blown-out highlight, run through PMREM so
 * roughness blur stays physically sane. Warmer than a neutral studio on
 * purpose: the clearcoat picks the highlight straight off this, and a cool one
 * turns the cream grey. A nicety, not a requirement — if anything here throws,
 * Marc still renders.
 */

export function buildEnvironment({ stage, THREE }) {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, '#fff6e8'); g.addColorStop(0.5, '#9aa0ad');
    // The hard stop at the horizon is what gives the shell a defined edge to
    // catch, rather than a wash.
    g.addColorStop(0.56, '#33302c'); g.addColorStop(1, '#14120f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = 'rgba(255,247,232,0.95)'; ctx.beginPath();
    ctx.ellipse(20, 6, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    const tex = new THREE.Texture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(stage._renderer);
    stage._scene.environment = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
  } catch {
    /* environment is a nicety, not a requirement */
  }
}
