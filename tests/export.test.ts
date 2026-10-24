import { strFromU8, unzipSync } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { describe, it } from 'node:test';
import { expect } from '@playwright/test';
import { exportBambu3mf, IDENTITY_3MF } from '../src/export/bambu-3mf';
import { fixtureMesh, manifest } from './fixtures';
import { validateMesh, type MeshData } from '../src/core/mesh';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: false });
const array = <T>(v: T | T[]): T[] => Array.isArray(v) ? v : [v];
function load(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  for (const file of Object.values(files)) expect(XMLValidator.validate(strFromU8(file))).toBe(true);
  return {
    files,
    model: parser.parse(strFromU8(files['3D/3dmodel.model'])).model,
    config: parser.parse(strFromU8(files['Metadata/model_settings.config'])).config,
  };
}
function project(index = 0) {
  const fixture = manifest.cases[index];
  return { name: fixture.name, model: fixtureMesh(fixture.model), modifiers: fixture.modifiers.map(part => ({
    name: part.file, mesh: fixtureMesh(part.file), wallLoops: 4,
  })) };
}

describe('Bambu format export (structural checks, not slicer acceptance)', () => {
  for (let i = 0; i < manifest.cases.length; i++) {
    it(`round trips ${manifest.cases[i].name} with all triangle coordinates intact`, () => {
      const input = project(i);
      const before = JSON.stringify(input);
      const { files, model, config } = load(exportBambu3mf(input));
      expect(Object.keys(files)).toHaveLength(4);
      expect(files['Metadata/project_settings.config']).toBeUndefined();
      expect(model.unit).toBe('millimeter');
      expect(model.build.item.objectid).toBe(String(input.modifiers.length + 2));
      expect(model.build.item.transform).toBe(IDENTITY_3MF);
      const resources = array(model.resources.object);
      const components = array(resources.at(-1).components.component);
      const parts = array(config.object.part);
      expect(components).toHaveLength(input.modifiers.length + 1);
      expect(parts.map(p => p.subtype)).toEqual(['normal_part', ...input.modifiers.map(() => 'modifier_part')]);
      expect(String(config.object.id)).toBe(String(model.build.item.objectid));
      const inputs = [input.model, ...input.modifiers.map(m => m.mesh)];
      components.forEach((component, partIndex) => {
        expect(component.transform).toBe(IDENTITY_3MF);
        expect(parts[partIndex].id).toBe(component.objectid);
        const mesh = resources.find(o => o.id === component.objectid).mesh;
        const decoded: MeshData = {
          vertices: array(mesh.vertices.vertex).map(v => [Number(v.x), Number(v.y), Number(v.z)]),
          triangles: array(mesh.triangles.triangle).map(t => [Number(t.v1), Number(t.v2), Number(t.v3)]),
        };
        expect(decoded).toEqual(inputs[partIndex]);
        expect(validateMesh(decoded).volume).toBeCloseTo(validateMesh(inputs[partIndex]).volume, 8);
        const settings = array(parts[partIndex].metadata);
        expect(settings.find(m => m.key === 'wall_loops')?.value).toBe(partIndex === 0 ? undefined : '4');
      });
      expect(JSON.stringify(input)).toBe(before);
    });
  }
  it('supports baseline without modifiers', () => {
    const { config } = load(exportBambu3mf({ ...project(), modifiers: [] }));
    expect(array(config.object.part)).toHaveLength(1);
  });
  it('uses one shared build translation, without recentering any child', () => {
    const { model } = load(exportBambu3mf({ ...project(2), translation: [60, 35, 0] }));
    expect(model.build.item.transform).toBe('1 0 0 0 1 0 0 0 1 60 35 0');
    for (const c of array(array(model.resources.object).at(-1).components.component)) expect(c.transform).toBe(IDENTITY_3MF);
  });
  it('escapes names in XML attributes and preserves Unicode', () => {
    const name = 'Boss & "walls" <test> å';
    const { config } = load(exportBambu3mf({ ...project(), name }));
    expect(array(config.object.metadata).find(m => m.key === 'name').value).toBe(name);
  });
  it('produces deterministic archives', () => expect(exportBambu3mf(project())).toEqual(exportBambu3mf(project())));
  for (const wallLoops of [0, -1, 1.5, NaN, Infinity, 101]) it(`rejects invalid wall count ${wallLoops}`, () => {
    const p = project();
    expect(() => exportBambu3mf({ ...p, modifiers: [{ ...p.modifiers[0], wallLoops }] })).toThrow(/Wall loops/);
  });
  it('rejects invalid shared transforms and illegal XML names', () => {
    expect(() => exportBambu3mf({ ...project(), translation: [NaN, 0, 0] })).toThrow(/translation/);
    expect(() => exportBambu3mf({ ...project(), name: '\u0001' })).toThrow(/XML/);
  });
});
