/**
 * The one piece Marc is made of.
 *
 * A sphere pulled into an egg profile, wearing the speckled skin. Mesh and
 * material names are load-bearing: the stage's OBJ export turns them into `o`
 * and `usemtl` entries.
 */

/**
 * Sphere → egg, in place, on a flat XYZ position array.
 *
 * The asymmetry is deliberate and slight: both ends stay rounded and only the
 * base is fuller, because a sharp point reads as a teardrop rather than an egg.
 * Exported on its own so the profile can be checked without a renderer.
 */
export function shapeEgg(positions) {
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1];
    const taper = 1 - 0.075 * y - 0.055 * y * y;
    positions[i] *= 0.84 * taper;
    positions[i + 2] *= 0.84 * taper;
    positions[i + 1] = y * 1.03 + 0.01;
  }
  return positions;
}

export function createShell(THREE, skin) {
  const geometry = new THREE.SphereGeometry(1, 128, 96);
  shapeEgg(geometry.attributes.position.array);
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    name: 'eggshell',
    // White under a map, since colour multiplies it; cream when the skin went
    // inert and there is no map to tint.
    color: new THREE.Color(skin.map ? '#ffffff' : '#f0e3cd'),
    map: skin.map,
    bumpMap: skin.bumpMap,
    bumpScale: 0.7,
    roughness: 0.52,
    metalness: 0,
    // A thin waxy layer over a matte shell — the highlight travels, the body
    // of the colour doesn't.
    clearcoat: 0.35,
    clearcoatRoughness: 0.6,
    sheen: 0.4,
    sheenColor: new THREE.Color('#fff2dd'),
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'shell';

  return { mesh, geometry, material };
}
