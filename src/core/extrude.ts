import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three';
import { validateMesh, type MeshData, type Vec3 } from './mesh';

export type Point2 = readonly [number, number];
export interface Footprint {
  outer: readonly Point2[];
  holes: readonly (readonly Point2[])[];
}

/** Closed footprints from section analysis or trusted fixtures; no model union. */
export function extrudeFootprint(footprint: Footprint, rootZ: number, depth: number, overlap: number): MeshData {
  if (![rootZ, depth, overlap].every(Number.isFinite) || depth <= 0 || overlap <= 0) {
    throw new Error('Root must be finite; depth and upward overlap must be greater than zero.');
  }
  for (const loop of [footprint.outer, ...footprint.holes]) {
    if (loop.length < 3 || loop.some(p => p.length !== 2 || !p.every(Number.isFinite))) {
      throw new Error('Footprints require finite, closed polygon loops with at least three points.');
    }
  }
  const shape = new Shape(footprint.outer.map(p => new Vector2(...p)));
  shape.holes = footprint.holes.map(loop => new Path(loop.map(p => new Vector2(...p))));
  const geometry = new ExtrudeGeometry(shape, { depth: depth + overlap, steps: 1, bevelEnabled: false });
  geometry.translate(0, 0, rootZ - depth);
  try {
    const position = geometry.getAttribute('position');
    const vertices: Vec3[] = [];
    const byCoordinate = new Map<string, number>();
    const indices: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const vertex: Vec3 = [position.getX(i), position.getY(i), position.getZ(i)];
      const key = vertex.join(',');
      let index = byCoordinate.get(key);
      if (index === undefined) { index = vertices.length; vertices.push(vertex); byCoordinate.set(key, index); }
      indices.push(index);
    }
    const triangles: [number, number, number][] = [];
    for (let i = 0; i < indices.length; i += 3) triangles.push([indices[i], indices[i + 1], indices[i + 2]]);
    const mesh = { vertices, triangles };
    validateMesh(mesh);
    return mesh;
  } finally {
    geometry.dispose();
  }
}
