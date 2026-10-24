import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import validation from '../fixtures/mesh_validation.json';
import { extrudeFootprint } from '../src/core/extrude';
import { parseStl, validateMesh, type MeshData } from '../src/core/mesh';
import { fixtureMesh, manifest } from './fixtures';

describe('STL validation', () => {
  for (const expected of validation.checks) {
    it(`reloads ${expected.file} as a closed solid in original coordinates`, () => {
      const stats = validateMesh(fixtureMesh(expected.file));
      expect(stats.bounds.min).toEqual(expected.bounds_mm[0]);
      expect(stats.bounds.max).toEqual(expected.bounds_mm[1]);
      expect(stats.triangles).toBe(expected.triangles);
      expect(stats.volume).toBeCloseTo(expected.expected_polyhedral_volume_mm3, 2);
    });
  }
  const source = fixtureMesh('straight_wall_modifier_01.stl');
  it('rejects missing faces instead of silently repairing them', () => {
    expect(() => validateMesh({ ...source, triangles: source.triangles.slice(1) })).toThrow(/open|non-manifold/);
  });
  it('rejects reversed winding', () => {
    const mesh: MeshData = { ...source, triangles: source.triangles.map(([a, b, c]) => [c, b, a]) };
    expect(() => validateMesh(mesh)).toThrow(/winding/);
  });
  it('rejects non-finite vertices and invalid indices', () => {
    expect(() => validateMesh({ ...source, vertices: [[NaN, 0, 0], ...source.vertices.slice(1)] })).toThrow(/non-finite/);
    expect(() => validateMesh({ ...source, triangles: [[99999, 0, 1], ...source.triangles.slice(1)] })).toThrow(/index/);
  });
  it('rejects empty and truncated STL data', () => {
    expect(() => parseStl(new ArrayBuffer(0))).toThrow();
    expect(() => parseStl(new ArrayBuffer(100))).toThrow(/truncated/);
  });
  it('accepts ASCII STL without trusting supplied normals', () => {
    const ascii = 'solid test\n' + source.triangles.map(t => 'facet normal 0 0 0\nouter loop\n' +
      t.map(i => `vertex ${source.vertices[i].join(' ')}`).join('\n') + '\nendloop\nendfacet\n').join('') + 'endsolid test';
    expect(validateMesh(parseStl(new TextEncoder().encode(ascii).buffer)).volume).toBeCloseTo(680, 4);
  });
});

describe('known-footprint extrusion along build Z', () => {
  for (const fixture of manifest.cases) {
    for (const part of fixture.modifiers) {
      it(`generates ${part.file} from loops, preserving its holes and position`, () => {
        const generated = extrudeFootprint({ outer: part.outer_loop_xy, holes: part.holes_xy }, 4, 3, 2);
        const stats = validateMesh(generated);
        // Native 3MF consumers need shared vertex indices as well as coincident
        // positions. Three's extrusion starts with disconnected triangle data.
        expect(new Set(generated.vertices.map(v => v.join(','))).size).toBe(generated.vertices.length);
        const edges = new Map<string, number>();
        for (const t of generated.triangles) for (let i = 0; i < 3; i++) {
          const a = t[i], b = t[(i + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`;
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
        expect([...edges.values()].every(count => count === 2)).toBe(true);
        const reference = validateMesh(fixtureMesh(part.file));
        expect(stats.bounds).toEqual(reference.bounds);
        expect(stats.volume).toBeCloseTo(reference.volume, 2);
        // An annular volume, not its outer solid cylinder: the volume oracle includes the bore.
        if (part.holes_xy.length) expect(stats.volume).toBeLessThan(565);
        expect(stats.bounds.min[2]).toBe(1);
        expect(stats.bounds.max[2]).toBe(6);
      });
    }
  }
  it('preserves a translated build frame and uses negative Z for anchor depth', () => {
    const part = manifest.cases[0].modifiers[0];
    const translate = (loop: readonly PointTuple[]) => loop.map(([x, y]) => [x + 123, y - 87] as const);
    const mesh = extrudeFootprint({ outer: translate(part.outer_loop_xy), holes: part.holes_xy.map(translate) }, 24, 3, 2);
    expect(validateMesh(mesh).bounds).toEqual({ min: [117, -93, 21], max: [129, -81, 26] });
  });
  for (const depth of [0, -1, NaN, Infinity]) it(`rejects invalid depth ${depth}`, () => {
    expect(() => extrudeFootprint({ outer: [[0, 0], [2, 0], [0, 2]], holes: [] }, 4, depth, 1)).toThrow();
  });
});
type PointTuple = readonly [number, number];
