import { Vector3 } from 'three';
import type { MeshData, Vec3 } from './mesh';

export interface MeshAnalysis {
  mesh: MeshData;
  tolerance: number;
  neighbours: number[][];
  normals: Vec3[];
}
export interface SurfaceRegion {
  seed: number;
  triangles: number[];
  minZ: number;
  maxZ: number;
  proposedRoot?: number;
}

/** Analysis-only welding. Source vertices and triangle ordering are never changed. */
export function analyseMesh(mesh: MeshData): MeshAnalysis {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const v of mesh.vertices) for (let a = 0; a < 3; a++) {
    min[a] = Math.min(min[a], v[a]); max[a] = Math.max(max[a], v[a]);
  }
  const tolerance = Math.max(1e-6, Math.max(...max.map((v, a) => v - min[a])) * 1e-7);
  const buckets = new Map<string, number[]>();
  const points: Vec3[] = [];
  const ids = mesh.vertices.map(v => {
    const cell = v.map(x => Math.floor(x / tolerance));
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      for (const id of buckets.get([cell[0] + x, cell[1] + y, cell[2] + z].join(',')) ?? []) {
        if (Math.hypot(...v.map((n, a) => n - points[id][a])) <= tolerance) return id;
      }
    }
    const id = points.length, key = cell.join(',');
    points.push(v); buckets.set(key, [...(buckets.get(key) ?? []), id]);
    return id;
  });
  const neighbours = mesh.triangles.map(() => [] as number[]);
  const edges = new Map<string, number[]>();
  const normals: Vec3[] = mesh.triangles.map((t, face) => {
    const [a, b, c] = t.map(i => new Vector3(...mesh.vertices[i]));
    const n = b.sub(a).cross(c.sub(a)).normalize();
    for (let i = 0; i < 3; i++) {
      const u = ids[t[i]], v = ids[t[(i + 1) % 3]];
      if (u === v) throw new Error('Feature edges are too small for the selection tolerance.');
      const key = `${Math.min(u, v)},${Math.max(u, v)}`;
      edges.set(key, [...(edges.get(key) ?? []), face]);
    }
    return [n.x, n.y, n.z];
  });
  for (const faces of edges.values()) {
    if (faces.length !== 2) throw new Error('Selection topology is ambiguous at the welding tolerance.');
    neighbours[faces[0]].push(faces[1]); neighbours[faces[1]].push(faces[0]);
  }
  return { mesh, tolerance, neighbours, normals };
}

export function smartFill(analysis: MeshAnalysis, seed: number, angleDegrees = 20): SurfaceRegion {
  const { mesh, normals, neighbours, tolerance } = analysis;
  if (!Number.isInteger(seed) || !normals[seed]) throw new Error('Select a triangle on the model.');
  if (!Number.isFinite(angleDegrees) || angleDegrees < 1 || angleDegrees > 60) throw new Error('Fill angle must be between 1 and 60 degrees.');
  if (Math.abs(normals[seed][2]) > 1e-4) throw new Error('Click an upright side surface. Slopes and horizontal faces are not supported targets.');
  const seen = new Set([seed]), pending = [seed];
  const cosine = Math.cos(angleDegrees * Math.PI / 180);
  for (let i = 0; i < pending.length; i++) {
    const face = pending[i];
    for (const next of neighbours[face]) {
      const dot = normals[face].reduce((sum, n, a) => sum + n * normals[next][a], 0);
      if (!seen.has(next) && Math.abs(normals[next][2]) <= 1e-4 && dot >= cosine - 1e-10) {
        seen.add(next); pending.push(next);
      }
    }
  }
  let minZ = Infinity, maxZ = -Infinity;
  for (const face of pending) for (const v of mesh.triangles[face]) {
    minZ = Math.min(minZ, mesh.vertices[v][2]); maxZ = Math.max(maxZ, mesh.vertices[v][2]);
  }
  // A bore can continue through the base. Only suggest the region minimum when
  // an adjacent upward horizontal base face actually meets that minimum.
  const hasBase = pending.some(face => neighbours[face].some(next => normals[next][2] > 1 - 1e-6 &&
    mesh.triangles[next].every(v => Math.abs(mesh.vertices[v][2] - minZ) <= tolerance)));
  return { seed, triangles: pending.sort((a, b) => a - b), minZ, maxZ, proposedRoot: hasBase ? minZ : undefined };
}

export function horizontalRoot(analysis: MeshAnalysis, face: number): number {
  if (!analysis.normals[face] || analysis.normals[face][2] < 1 - 1e-6) throw new Error('Click an upward-facing horizontal base face.');
  return analysis.mesh.vertices[analysis.mesh.triangles[face][0]][2];
}
