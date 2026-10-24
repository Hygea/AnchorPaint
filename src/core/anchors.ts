import clipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { Footprint, Point2 } from './extrude';
import type { MeshAnalysis, SurfaceRegion } from './selection';

export interface Anchor {
  id: string;
  seed: number;
  region: number[];
  rootZ: number;
  topZ: number;
  overlapLimitedByCap?: boolean;
  footprint: Footprint;
  maxDepth: number;
  kind: 'wall' | 'boss';
}
interface Ring { points: Point2[]; faces: number[] }
export interface Section { footprint: Footprint; faces: number[] }
const polygon = (f: Footprint): Polygon => [f.outer, ...f.holes].map(loop => loop.map(p => [p[0], p[1]]));
export const footprintArea = (f: Footprint) => Math.abs(ringArea(f.outer)) - f.holes.reduce((a, h) => a + Math.abs(ringArea(h)), 0);
function ringArea(loop: readonly Point2[]) {
  // Local origin avoids cancellation on offset STL coordinates.
  const o = loop[0];
  return loop.reduce((sum, a, i) => {
    const b = loop[(i + 1) % loop.length];
    return sum + (a[0] - o[0]) * (b[1] - o[1]) - (b[0] - o[0]) * (a[1] - o[1]);
  }, 0) / 2;
}
function area(polygons: MultiPolygon) {
  return polygons.reduce((total, p) => total + Math.abs(ringArea(p[0])) - p.slice(1).reduce((a, h) => a + Math.abs(ringArea(h)), 0), 0);
}
function inside(p: Point2, ring: readonly Point2[]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function simplify(points: Point2[], tolerance: number) {
  let result = points;
  let changed = true;
  while (changed && result.length > 3) {
    changed = false;
    const next = result.filter((b, i) => {
      const a = result[(i + result.length - 1) % result.length], c = result[(i + 1) % result.length];
      const length = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (length > tolerance && Math.abs(cross) < tolerance * length &&
        (b[0] - a[0]) * (b[0] - c[0]) + (b[1] - a[1]) * (b[1] - c[1]) <= tolerance * tolerance) {
        changed = true; return false;
      }
      return true;
    });
    result = next;
  }
  return result;
}

/** Slice only between vertex levels. Ambiguous, touching, or open contours fail. */
export function sectionAt(analysis: MeshAnalysis, z: number): Section[] {
  const { mesh, tolerance } = analysis;
  if (!Number.isFinite(z) || mesh.vertices.some(v => Math.abs(v[2] - z) < tolerance)) throw new Error('Section is too close to an STL vertex level.');
  const points: Point2[] = [], adjacency: { next: number; face: number }[][] = [];
  const cells = new Map<string, number[]>();
  function pointId(p: Point2) {
    const x = Math.floor(p[0] / tolerance), y = Math.floor(p[1] / tolerance);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const id of cells.get(`${x + dx},${y + dy}`) ?? []) {
        if (Math.hypot(p[0] - points[id][0], p[1] - points[id][1]) <= tolerance) return id;
      }
    }
    const id = points.length, key = `${x},${y}`;
    points.push(p); adjacency.push([]); cells.set(key, [...(cells.get(key) ?? []), id]); return id;
  }
  mesh.triangles.forEach((t, face) => {
    const vertices = t.map(v => mesh.vertices[v]);
    const min = Math.min(...vertices.map(v => v[2])), max = Math.max(...vertices.map(v => v[2]));
    if (z <= min || z >= max) return;
    if (vertices.some(v => Math.abs(v[2] - z) < tolerance)) throw new Error('Section is too close to an STL vertex level.');
    const intersections: Point2[] = [];
    for (let e = 0; e < 3; e++) {
      const a = vertices[e], b = vertices[(e + 1) % 3];
      if ((a[2] > z) === (b[2] > z)) continue;
      const u = (z - a[2]) / (b[2] - a[2]);
      intersections.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]);
    }
    if (intersections.length !== 2) throw new Error('Could not resolve a closed section.');
    const [a, b] = intersections.map(pointId);
    if (a === b) throw new Error('Section contains an edge smaller than the selection tolerance.');
    adjacency[a].push({ next: b, face }); adjacency[b].push({ next: a, face });
  });
  if (adjacency.some(edges => edges.length !== 2)) throw new Error('Section contours are open, touching or branching.');
  const visited = new Set<number>(), rings: Ring[] = [];
  for (let start = 0; start < points.length; start++) {
    if (visited.has(start)) continue;
    let previous = -1, current = start;
    const loop: Point2[] = [], faces: number[] = [];
    do {
      if (visited.has(current)) throw new Error('Section contours intersect.');
      visited.add(current); loop.push(points[current]);
      const edge = adjacency[current].find(e => e.next !== previous)!;
      faces.push(edge.face); previous = current; current = edge.next;
    } while (current !== start);
    // Intersections near a triangle vertex create a short segment next to a
    // real polygon corner. A welding-size collinearity threshold would erase
    // both that corner and its neighbouring point in the same pass.
    const simplified = simplify(loop, tolerance * 0.001);
    if (simplified.length < 3 || Math.abs(ringArea(simplified)) <= tolerance * tolerance) throw new Error('Section has a degenerate contour.');
    rings.push({ points: simplified, faces });
  }
  const parents = rings.map((ring, i) => rings.map((r, j) => j !== i && inside(ring.points[0], r.points) ? j : -1)
    .filter(j => j >= 0).sort((a, b) => Math.abs(ringArea(rings[a].points)) - Math.abs(ringArea(rings[b].points)))[0] ?? -1);
  function depth(i: number): number { return parents[i] < 0 ? 0 : 1 + depth(parents[i]); }
  return rings.flatMap((ring, i) => {
    if (depth(i) % 2) return [];
    const holes = rings.filter((_, j) => parents[j] === i);
    return [{ footprint: { outer: ring.points, holes: holes.map(h => h.points) }, faces: [...ring.faces, ...holes.flatMap(h => h.faces)] }];
  });
}

function kindOf(f: Footprint, tolerance: number): Anchor['kind'] {
  if (!f.holes.length && f.outer.length === 4) {
    const edges = f.outer.map((p, i) => { const q = f.outer[(i + 1) % 4]; return [q[0] - p[0], q[1] - p[1]]; });
    if (edges.every((a, i) => { const b = edges[(i + 1) % 4]; return Math.abs(a[0] * b[0] + a[1] * b[1]) <= tolerance * Math.hypot(...a) * 4; })) return 'wall';
  }
  // A polygonal approximation of a cylinder, optionally with one coaxial bore.
  const center: Point2 = [f.outer.reduce((a, p) => a + p[0], 0) / f.outer.length, f.outer.reduce((a, p) => a + p[1], 0) / f.outer.length];
  function circular(loop: readonly Point2[]) {
    if (loop.length < 8) return false;
    const radii = loop.map(p => Math.hypot(p[0] - center[0], p[1] - center[1]));
    const radius = radii.reduce((a, b) => a + b, 0) / radii.length;
    // Triangle chord angles must progress in one direction, ruling out stars.
    const signs = loop.map((p, i) => { const q = loop[(i + 1) % loop.length]; return (p[0] - center[0]) * (q[1] - center[1]) - (p[1] - center[1]) * (q[0] - center[0]); });
    return Math.max(...radii) - Math.min(...radii) <= tolerance * 12 && (signs.every(s => s > 0) || signs.every(s => s < 0));
  }
  if (f.holes.length <= 1 && circular(f.outer) && f.holes.every(circular)) return 'boss';
  throw new Error('This footprint is joined, branched or irregular. This preview supports isolated round bosses and rectangular straight walls.');
}

function levels(analysis: MeshAnalysis, low: number, high: number): number[] {
  const values = [...new Set([low, high, ...analysis.mesh.vertices.map(v => v[2]).filter(z => z > low && z < high)])].sort((a, b) => a - b);
  if (values.length > 512) throw new Error('Too many height changes for this synchronous preview.');
  return values;
}
function samples(values: number[], tolerance: number) {
  return values.slice(1).flatMap((high, i) => {
    const low = values[i], gap = high - low;
    if (gap < tolerance * 32) throw new Error('Height changes are too close to resolve safely.');
    const inset = Math.max(tolerance * 8, Math.min(gap * 0.01, 0.001));
    return [low + inset, (low + high) / 2, high - inset];
  });
}
function perimeter(f: Footprint) {
  return [f.outer, ...f.holes].reduce((sum, loop) => sum + loop.reduce((a, p, i) => {
    const q = loop[(i + 1) % loop.length]; return a + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0), 0);
}

export function deriveAnchor(analysis: MeshAnalysis, region: SurfaceRegion, rootZ: number, id: string): Anchor {
  const { tolerance } = analysis;
  if (!Number.isFinite(rootZ) || rootZ < region.minZ - tolerance || rootZ >= region.maxZ - tolerance * 32) throw new Error('Base height must meet the selected side below its top.');
  const roots = analysis.mesh.triangles.some((t, face) => analysis.normals[face][2] > 1 - 1e-6 && t.every(v => Math.abs(analysis.mesh.vertices[v][2] - rootZ) <= tolerance));
  if (!roots) throw new Error('Confirm an upward horizontal supporting base face.');
  const selected = new Set(region.triangles);
  let footprint: Footprint | undefined;
  let topZ = region.maxZ, overlapLimitedByCap = false;
  const heights = levels(analysis, rootZ, region.maxZ);
  for (let i = 1; i < heights.length; i++) for (const z of samples([heights[i - 1], heights[i]], tolerance)) {
    const matches = sectionAt(analysis, z).filter(s => s.faces.some(face => selected.has(face)));
    if (matches.length !== 1) throw new Error('Selected surface does not identify one closed feature at every height.');
    if (!footprint) footprint = matches[0].footprint;
    else if (area(clipping.xor(polygon(footprint), polygon(matches[0].footprint))) > tolerance * perimeter(footprint) * 8) {
      // A concave cap can cut into the top of an otherwise straight shaft.
      // Permit only a terminal interior change with the SAME outer
      // cylinder. Limit overlap to the first changed height; never fill the cap.
      const section = matches[0].footprint, low = heights[i - 1];
      if (kindOf(footprint, tolerance) !== 'boss' || low <= rootZ + tolerance * 32 ||
        area(clipping.xor(polygon({ outer: footprint.outer, holes: [] }), polygon({ outer: section.outer, holes: [] }))) > tolerance * perimeter(footprint) * 8 ||
        section.holes.length > 1) {
        throw new Error('Feature cross-section changes with height. Tapers, fillets and joined features are outside this preview.');
      }
      topZ = Math.min(topZ, low); overlapLimitedByCap = true;
    } else if (overlapLimitedByCap) {
      throw new Error('Feature cross-section changes below its top. Only a terminal concave cap can limit overlap.');
    }
  }
  if (!footprint) throw new Error('No feature footprint found.');
  const kind = kindOf(footprint, tolerance);
  const limit = Math.min(...analysis.mesh.vertices.map(v => v[2]));
  const descending = levels(analysis, limit, rootZ).reverse();
  let bottom = rootZ;
  const target = polygon(footprint), allowedArea = tolerance * perimeter(footprint) * 8;
  for (let i = 1; i < descending.length; i++) {
    const high = descending[i - 1], low = descending[i];
    let supported = true;
    for (const z of samples([low, high], tolerance)) {
      const support: MultiPolygon = sectionAt(analysis, z).map(s => polygon(s.footprint));
      if (!support.length || area(clipping.difference(target, support)) > allowedArea) { supported = false; break; }
    }
    if (!supported) break;
    // Accept only horizontal/vertical support geometry intersecting this footprint.
    // A sloped surface can hide between sample planes; reject its XY projection.
    const sloped = analysis.mesh.triangles.some((t, face) => {
      const nz = Math.abs(analysis.normals[face][2]);
      if (nz < 1e-4 || nz > 1 - 1e-6) return false;
      const vertices = t.map(v => analysis.mesh.vertices[v]);
      if (Math.max(...vertices.map(v => v[2])) <= low || Math.min(...vertices.map(v => v[2])) >= high) return false;
      const projected: Polygon = [vertices.map(v => [v[0], v[1]])];
      return area(clipping.intersection(target, projected)) > allowedArea;
    });
    if (sloped) break;
    bottom = low;
  }
  const maxDepth = rootZ - bottom;
  if (maxDepth <= tolerance * 32) throw new Error('No continuous local supporting base was found beneath this footprint.');
  return { id, seed: region.seed, region: region.triangles, rootZ, topZ, footprint, maxDepth, kind,
    ...(overlapLimitedByCap ? { overlapLimitedByCap } : {}) };
}

export function validateAnchorSettings(anchor: Anchor, depth: number, overlap: number) {
  if (!Number.isFinite(depth) || depth <= 0 || depth > anchor.maxDepth + 1e-7) throw new Error(`Anchor depth must be greater than 0 and at most ${anchor.maxDepth.toFixed(3)} mm for this local base.`);
  if (!Number.isFinite(overlap) || overlap <= 0 || overlap > anchor.topZ - anchor.rootZ) throw new Error('Upward overlap must stay within the selected feature height.');
}
