import type { MeshData, Vec3 } from './mesh';
import type { MeshAnalysis } from './selection';

export type PrintDirection = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

/** Explicit build-frame rotation. Integer axis permutations preserve every
 * source coordinate exactly and keep winding (determinant +1). No auto-orient. */
export function orientMesh(mesh: MeshData, direction: PrintDirection): MeshData {
  const rotations: Record<PrintDirection, (v: Vec3) => Vec3> = {
    '+X': ([x, y, z]) => [-z, y, x], '-X': ([x, y, z]) => [z, y, -x],
    '+Y': ([x, y, z]) => [x, -z, y], '-Y': ([x, y, z]) => [x, z, -y],
    '+Z': v => [...v], '-Z': ([x, y, z]) => [x, -y, -z],
  };
  return { vertices: mesh.vertices.map(rotations[direction]), triangles: mesh.triangles };
}

export function directionFromFace(analysis: MeshAnalysis, face: number): PrintDirection {
  const normal = analysis.normals[face];
  if (!normal) throw new Error('Click a flat supporting base surface.');
  const axis = normal.findIndex(n => Math.abs(n) > 1 - 1e-10);
  if (axis < 0 || normal.some((n, i) => i !== axis && Math.abs(n) > 1e-6)) {
    throw new Error('Click a flat base face aligned with the model axes, beside the pin. Curved and sloping faces cannot set upright.');
  }
  // The chosen face lies on the bed: its outward normal must point DOWN.
  return `${normal[axis] > 0 ? '-' : '+'}${'XYZ'[axis]}` as PrintDirection;
}

/** Connected, coplanar patch for base/orientation hover feedback. */
export function planarFaces(analysis: MeshAnalysis, face: number): number[] {
  const { mesh, normals, neighbours, tolerance } = analysis;
  const normal = normals[face], origin = mesh.vertices[mesh.triangles[face][0]];
  const faces = [face], seen = new Set(faces);
  for (let i = 0; i < faces.length; i++) for (const next of neighbours[faces[i]]) {
    if (!seen.has(next) && normals[next].reduce((s, n, a) => s + n * normal[a], 0) > 1 - 1e-10 &&
      mesh.triangles[next].every(v => Math.abs(mesh.vertices[v].reduce((s, x, a) => s + (x - origin[a]) * normal[a], 0)) <= tolerance)) {
      faces.push(next); seen.add(next);
    }
  }
  return faces;
}
