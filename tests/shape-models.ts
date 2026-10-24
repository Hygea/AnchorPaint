import type { MeshData, Triangle, Vec3 } from '../src/core/mesh';

/** Independent, explicitly stitched closed test model: solid round post on a
 * round base. There are no overlapping shells, bore, CSG or modifier operations. */
export function solidPostModel(segments = 64): MeshData {
  const vertices: Vec3[] = [], triangles: Triangle[] = [];
  for (const [radius, z] of [[15, 0], [15, 4], [6, 4], [6, 18]]) {
    for (let i = 0; i < segments; i++) {
      const a = i * Math.PI * 2 / segments;
      vertices.push([Math.cos(a) * radius, Math.sin(a) * radius, z]);
    }
  }
  const bottom = vertices.length; vertices.push([0, 0, 0]);
  const top = vertices.length; vertices.push([0, 0, 18]);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    for (const lower of [0, 2 * segments]) {
      triangles.push([lower + i, lower + next, lower + segments + next], [lower + i, lower + segments + next, lower + segments + i]);
    }
    triangles.push([segments + i, segments + next, 2 * segments + next], [segments + i, 2 * segments + next, 2 * segments + i]);
    triangles.push([bottom, next, i], [top, 3 * segments + i, 3 * segments + next]);
  }
  return { vertices, triangles };
}

/** Closed pin with a 3 mm straight shaft above a 4 mm base, followed by a cap.
 * Explicit rings supply an independent shape oracle without CSG/extrusion. */
export function cappedPostModel(cap: 'domed' | 'flared' | 'concave', segments = 64): MeshData {
  const tips = {
    domed: [[1.8, 7.7], [1.2, 8.4], [.6, 8.8]],
    flared: [[2.5, 8], [2.5, 8.2]],
    concave: [[1.2, 6.8], [.6, 6.7]],
  };
  const profile = [[15, 0], [15, 4], [2, 4], [2, 7], ...tips[cap]];
  const vertices: Vec3[] = [], triangles: Triangle[] = [];
  for (const [r, z] of profile) for (let i = 0; i < segments; i++) {
    const a = i * Math.PI * 2 / segments; vertices.push([r * Math.cos(a), r * Math.sin(a), z]);
  }
  const bottom = vertices.length; vertices.push([0, 0, 0]);
  const top = vertices.length; vertices.push([0, 0, cap === 'domed' ? 9 : cap === 'flared' ? 8.2 : 6.6]);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    for (let ring = 0; ring < profile.length - 1; ring++) {
      const a = ring * segments, b = a + segments;
      triangles.push([a + i, a + next, b + next], [a + i, b + next, b + i]);
    }
    const last = (profile.length - 1) * segments;
    triangles.push([bottom, next, i], [top, last + i, last + next]);
  }
  return { vertices, triangles };
}
