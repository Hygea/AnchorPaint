import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import { analyseMesh, horizontalRoot, smartFill } from '../src/core/selection';
import { deriveAnchor, footprintArea, sectionAt, validateAnchorSettings } from '../src/core/anchors';
import { extrudeFootprint } from '../src/core/extrude';
import { validateMesh, type MeshData } from '../src/core/mesh';
import { fixtureMesh, manifest } from './fixtures';
import { cappedPostModel, solidPostModel } from './shape-models';
import { directionFromFace, orientMesh, planarFaces, type PrintDirection } from '../src/core/orientation';

describe('STL-derived selection, footprints and local anchors', () => {
  for (const cap of ['domed', 'flared', 'concave'] as const) it(`derives the straight shaft beneath a ${cap} cap and limits overlap before it`, () => {
    const mesh = cappedPostModel(cap); validateMesh(mesh);
    const a = analyseMesh(mesh);
    const seed = mesh.triangles.findIndex((t, f) => Math.abs(a.normals[f][2]) < 1e-5 && t.every(v => mesh.vertices[v][2] >= 4 && mesh.vertices[v][2] <= 7));
    const region = smartFill(a, seed), anchor = deriveAnchor(a, region, region.proposedRoot!, cap);
    expect(anchor.rootZ).toBe(4); expect(anchor.maxDepth).toBe(4);
    expect(anchor.topZ).toBeCloseTo(cap === 'concave' ? 6.6 : 7, 8);
    expect(anchor.footprint.holes).toHaveLength(0);
    expect(validateMesh(extrudeFootprint(anchor.footprint, 4, 3, 2)).bounds).toEqual({ min: [-2, -2, 1], max: [2, 2, 6] });
    expect(() => validateAnchorSettings(anchor, 3, anchor.topZ - 4 + .1)).toThrow(/overlap/);
  });
  it('derives a closed full-cylinder modifier beneath a solid post without a bore', () => {
    const model = solidPostModel();
    validateMesh(model);
    const a = analyseMesh(model);
    const seed = model.triangles.findIndex((t, f) => Math.abs(a.normals[f][2]) < 1e-5 && t.every(v => model.vertices[v][2] >= 4));
    const region = smartFill(a, seed);
    expect(region.proposedRoot).toBe(4);
    const anchor = deriveAnchor(a, region, 4, 'solid');
    expect(anchor.kind).toBe('boss'); expect(anchor.maxDepth).toBe(4);
    expect(anchor.footprint.holes).toHaveLength(0);
    const stats = validateMesh(extrudeFootprint(anchor.footprint, 4, 3, 2));
    expect(stats.bounds).toEqual({ min: [-6, -6, 1], max: [6, 6, 6] });
    const expectedPolygonArea = 64 * 36 * Math.sin(2 * Math.PI / 64) / 2;
    expect(stats.volume).toBeCloseTo(expectedPolygonArea * 5, 3);
  });
  for (const fixture of manifest.cases) {
    const model = fixtureMesh(fixture.model);
    const analysis = analyseMesh(model);
    for (const part of fixture.modifiers) {
      it(`derives ${part.file} from a side triangle without manifest contours`, () => {
        const point = part.outer_loop_xy[0];
        const candidates = model.triangles.map((t, face) => {
          const v = t.map(i => model.vertices[i]);
          const x = v.reduce((s, p) => s + p[0], 0) / 3, y = v.reduce((s, p) => s + p[1], 0) / 3;
          return { face, distance: Math.hypot(x - point[0], y - point[1]), bottom: Math.min(...v.map(p => p[2])) };
        }).filter(t => Math.abs(analysis.normals[t.face][2]) < 1e-4 && t.bottom === 4).sort((a, b) => a.distance - b.distance);
        const region = smartFill(analysis, candidates[0].face);
        expect(region.proposedRoot).toBe(4);
        const anchor = deriveAnchor(analysis, region, region.proposedRoot!, '1');
        expect(anchor.maxDepth).toBe(4);
        expect(anchor.footprint.holes).toHaveLength(part.holes_xy.length);
        const generated = validateMesh(extrudeFootprint(anchor.footprint, anchor.rootZ, 3, 2));
        const reference = validateMesh(fixtureMesh(part.file));
        for (const bound of ['min', 'max'] as const) for (let axis = 0; axis < 3; axis++) expect(generated.bounds[bound][axis]).toBeCloseTo(reference.bounds[bound][axis], 4);
        expect(generated.volume).toBeCloseTo(reference.volume, 2);
      });
    }
  }
  it('grows across neighbouring normals to wrap a whole cylinder', () => {
    const a = analyseMesh(fixtureMesh('single_boss.stl'));
    const seed = a.mesh.triangles.findIndex((t, f) => Math.abs(a.normals[f][2]) < 1e-5 && t.every(v => a.mesh.vertices[v][2] >= 4));
    expect(smartFill(a, seed, 20).triangles.length).toBe(128);
    expect(smartFill(a, seed, 1).triangles.length).toBe(2);
    expect(() => smartFill(a, seed, NaN)).toThrow(/angle/);
  });
  it('requires base confirmation for a bore that continues below the root', () => {
    const a = analyseMesh(fixtureMesh('single_boss.stl'));
    const seed = a.mesh.triangles.findIndex((t, f) => Math.abs(a.normals[f][2]) < 1e-5 && t.some(v => a.mesh.vertices[v][2] === 0) && t.some(v => a.mesh.vertices[v][2] === 18));
    const region = smartFill(a, seed);
    expect(region.proposedRoot).toBeUndefined();
    const base = a.mesh.triangles.findIndex((t, f) => a.normals[f][2] > 0.99 && t.every(v => a.mesh.vertices[v][2] === 4));
    const anchor = deriveAnchor(a, region, horizontalRoot(a, base), '1');
    expect(anchor.footprint.holes).toHaveLength(1);
    expect(anchor.maxDepth).toBe(4);
    expect(() => horizontalRoot(a, seed)).toThrow(/horizontal/);
  });
  it('preserves translated coordinates, including negative build heights', () => {
    const source = fixtureMesh('straight_wall.stl');
    const model: MeshData = { ...source, vertices: source.vertices.map(v => [v[0] + 92, v[1] + 138, v[2] - 20]) };
    const a = analyseMesh(model);
    const seed = a.mesh.triangles.findIndex((t, f) => Math.abs(a.normals[f][2]) < 1e-5 && t.every(v => a.mesh.vertices[v][2] >= -16));
    const region = smartFill(a, seed);
    const anchor = deriveAnchor(a, region, -16, '1');
    expect(validateMesh(extrudeFootprint(anchor.footprint, -16, 3, 2)).bounds).toEqual({ min: [75, 136, -19], max: [109, 140, -14] });
  });
  it('rejects slopes, irregular/tapered features and unresolved plane levels', () => {
    const original = fixtureMesh('single_boss.stl');
    const model: MeshData = { ...original, vertices: original.vertices.map(v => v[2] > 4 ? [v[0] * 0.8, v[1] * 0.8, v[2]] : v) };
    const a = analyseMesh(model);
    const sloped = a.normals.findIndex(n => Math.abs(n[2]) > 0.001 && Math.abs(n[2]) < 0.99);
    expect(() => smartFill(a, sloped)).toThrow(/upright/);
    expect(() => sectionAt(analyseMesh(original), 4)).toThrow();
    const fakeRegion = { seed: sloped, triangles: a.mesh.triangles.map((_, f) => f), minZ: 4, maxZ: 18 };
    expect(() => deriveAnchor(a, fakeRegion, 4, '1')).toThrow(/cross-section/);
  });
  it('checks local support rather than the global model minimum', () => {
    const source = fixtureMesh('straight_wall.stl');
    // A narrow unsupported recess under half the wall, connected to the lower
    // base. The model still has a global bottom at 0, but local support ends at 2.
    const model: MeshData = { ...source, vertices: source.vertices.map(v => v[2] === 0 && v[0] < 0 ? [v[0], v[1], 2] : v) };
    const a = analyseMesh(model);
    const seed = a.mesh.triangles.findIndex((t, f) => Math.abs(a.normals[f][2]) < 1e-5 && t.every(v => a.mesh.vertices[v][2] >= 4));
    const anchor = deriveAnchor(a, smartFill(a, seed), 4, '1');
    expect(anchor.maxDepth).toBe(2);
    expect(() => validateAnchorSettings(anchor, 3, 1)).toThrow(/at most 2/);
    expect(() => validateAnchorSettings(anchor, 1, 99)).toThrow(/overlap/);
    expect(footprintArea(anchor.footprint)).toBe(136);
  });
  it('leaves source triangle coordinates and indices untouched during analysis', () => {
    const mesh = fixtureMesh('ten_bosses.stl');
    const before = JSON.stringify(mesh);
    const analysis = analyseMesh(mesh);
    const seed = mesh.triangles.findIndex((t, f) => Math.abs(analysis.normals[f][2]) < 1e-5 && t.every(v => mesh.vertices[v][2] >= 4));
    deriveAnchor(analysis, smartFill(analysis, seed), 4, '1');
    expect(JSON.stringify(mesh)).toBe(before);
  });
});

describe('explicit print orientation', () => {
  const directions: PrintDirection[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
  for (const direction of directions) it(`rotates ${direction} to up without changing scale, winding or triangle order`, () => {
    const source = solidPostModel(), before = JSON.stringify(source);
    const axis = 'XYZ'.indexOf(direction[1]), sign = direction[0] === '+' ? 1 : -1;
    const vector = [0, 0, 0]; vector[axis] = sign;
    const transformed = orientMesh({ vertices: [vector as unknown as readonly [number, number, number]], triangles: [] }, direction);
    expect(transformed.vertices[0].map(x => x || 0)).toEqual([0, 0, 1]);
    const oriented = orientMesh(source, direction), stats = validateMesh(oriented);
    expect(stats.volume).toBeCloseTo(validateMesh(source).volume, 8);
    expect(oriented.triangles).toBe(source.triangles);
    for (let i = 0; i < source.vertices.length; i++) {
      expect(Math.hypot(...oriented.vertices[i])).toBeCloseTo(Math.hypot(...source.vertices[i]), 10);
    }
    expect(JSON.stringify(source)).toBe(before);
  });
  it('puts the chosen bed face down and excludes the curved cap from its planar preview', () => {
    const source = orientMesh(cappedPostModel('domed'), '+X'), a = analyseMesh(source);
    const base = source.triangles.findIndex((t, f) => a.normals[f][0] > .99 && t.every(v => source.vertices[v][0] === 0));
    expect(directionFromFace(a, base)).toBe('-X');
    const faces = planarFaces(a, base);
    expect(faces.length).toBe(64);
    expect(faces.every(f => source.triangles[f].every(v => source.vertices[v][0] === 0))).toBe(true);
    const upright = orientMesh(source, directionFromFace(a, base));
    expect(upright).toEqual(cappedPostModel('domed'));
    const sloped = a.normals.findIndex(n => n.every(x => Math.abs(x) < .99));
    expect(() => directionFromFace(a, sloped)).toThrow(/flat base/);
    expect(() => directionFromFace(a, -1)).toThrow(/base/);
  });
});
