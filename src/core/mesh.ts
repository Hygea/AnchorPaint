import { STLLoader } from 'three/addons/loaders/STLLoader.js';

export type Vec3 = readonly [number, number, number];
export type Triangle = readonly [number, number, number];
export interface MeshData {
  readonly vertices: readonly Vec3[];
  readonly triangles: readonly Triangle[];
}
export interface MeshStats {
  bounds: { min: Vec3; max: Vec3 };
  dimensions: Vec3;
  volume: number;
  triangles: number;
}

/** Exact coordinate indexing only: no repair, rescale, rotation, or recentering. */
export function parseStl(input: ArrayBuffer): MeshData {
  if (input.byteLength > 100 * 1024 * 1024) throw new Error('STL exceeds the 100 MB prototype limit.');
  if (input.byteLength < 15) throw new Error('STL is empty or truncated.');
  const isBinary = input.byteLength >= 84 &&
    84 + new DataView(input).getUint32(80, true) * 50 === input.byteLength;
  if (!isBinary && !/^\s*solid\b/i.test(new TextDecoder().decode(input.slice(0, 256)))) {
    throw new Error('STL is truncated or has an invalid binary triangle count.');
  }
  const geometry = new STLLoader().parse(input);
  try {
    const positions = geometry.getAttribute('position');
    const vertices: Vec3[] = [];
    const indices: number[] = [];
    const byCoordinate = new Map<string, number>();
    for (let i = 0; i < positions.count; i++) {
      const vertex: Vec3 = [positions.getX(i), positions.getY(i), positions.getZ(i)];
      const key = vertex.join(',');
      let index = byCoordinate.get(key);
      if (index === undefined) {
        index = vertices.length;
        byCoordinate.set(key, index);
        vertices.push(vertex);
      }
      indices.push(index);
    }
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) triangles.push([indices[i], indices[i + 1], indices[i + 2]]);
    const mesh = { vertices, triangles };
    validateMesh(mesh);
    return mesh;
  } finally {
    geometry.dispose();
  }
}

/** A conservative manifold/winding check, not a general self-intersection detector. */
export function validateMesh(mesh: MeshData): MeshStats {
  if (mesh.vertices.length < 4 || mesh.triangles.length < 4) throw new Error('Mesh has no closed solid.');
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const vertex of mesh.vertices) {
    if (vertex.length !== 3 || vertex.some(v => !Number.isFinite(v))) throw new Error('Mesh has non-finite coordinates.');
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
  }
  const dimensions = max.map((v, i) => v - min[i]) as unknown as Vec3;
  const scale = Math.max(...dimensions);
  if (dimensions.some(d => d <= 0) || scale > 1_000_000) throw new Error('Mesh dimensions are invalid or exceed the prototype limit in mm.');
  const edgeUses = new Map<string, { count: number; balance: number }>();
  // Index coincident vertices logically without mutating the caller's geometry.
  const coordinateIds = new Map<string, number>();
  const welded = mesh.vertices.map(v => {
    const key = v.join(',');
    if (!coordinateIds.has(key)) coordinateIds.set(key, coordinateIds.size);
    return coordinateIds.get(key)!;
  });
  let signedVolume = 0;
  const origin = mesh.vertices[0];
  for (const triangle of mesh.triangles) {
    if (triangle.length !== 3 || triangle.some(i => !Number.isInteger(i) || i < 0 || i >= mesh.vertices.length)) {
      throw new Error('Mesh has an invalid triangle index.');
    }
    const [a, b, c] = triangle.map(i => mesh.vertices[i]);
    const ab = b.map((v, i) => v - a[i]);
    const ac = c.map((v, i) => v - a[i]);
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (Math.hypot(...cross) <= scale * scale * 1e-14) throw new Error('Mesh contains a degenerate triangle.');
    signedVolume += ((a[0] - origin[0]) * cross[0] + (a[1] - origin[1]) * cross[1] + (a[2] - origin[2]) * cross[2]) / 6;
    for (let e = 0; e < 3; e++) {
      const u = welded[triangle[e]], v = welded[triangle[(e + 1) % 3]];
      const key = `${Math.min(u, v)},${Math.max(u, v)}`;
      const usage = edgeUses.get(key) ?? { count: 0, balance: 0 };
      usage.count++;
      usage.balance += u < v ? 1 : -1;
      edgeUses.set(key, usage);
    }
  }
  if ([...edgeUses.values()].some(e => e.count !== 2)) throw new Error('Mesh is open or non-manifold; automatic repair is not supported.');
  if ([...edgeUses.values()].some(e => e.balance !== 0) || signedVolume <= 0) throw new Error('Mesh winding must consistently enclose a positive volume.');
  return {
    bounds: { min: min as unknown as Vec3, max: max as unknown as Vec3 },
    dimensions, volume: signedVolume, triangles: mesh.triangles.length,
  };
}
