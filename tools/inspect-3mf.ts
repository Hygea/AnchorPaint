import { readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Matrix4, Vector3 } from 'three';
import { validateMesh, type MeshData, type Vec3 } from '../src/core/mesh';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: false });
// Format inspection is a development tool for trusted local test archives, not an application importer.
const array = (v: any): any[] => v === undefined ? [] : Array.isArray(v) ? v : [v];
function transform(value?: string) {
  if (!value) return new Matrix4();
  const t = value.split(/\s+/).map(Number);
  if (t.length !== 12 || !t.every(Number.isFinite)) throw new Error('Invalid 3MF transform');
  return new Matrix4().set(t[0], t[3], t[6], t[9], t[1], t[4], t[7], t[10], t[2], t[5], t[8], t[11], 0, 0, 0, 1);
}
export function inspect3mf(filename: string) {
  const files = unzipSync(readFileSync(filename));
  function xml(path: string) {
    if (!files[path]) throw new Error(`Missing archive entry ${path}`);
    const text = strFromU8(files[path]);
    if (XMLValidator.validate(text) !== true) throw new Error(`Invalid XML in ${path}`);
    return parser.parse(text);
  }
  const mainPath = '3D/3dmodel.model';
  const model = xml(mainPath).model;
  const config = xml('Metadata/model_settings.config').config;
  const buildItems = array(model.build.item);
  if (buildItems.length !== 1) throw new Error('Spike requires exactly one assembly build item.');
  const item = buildItems[0];
  const assembly = array(model.resources.object).find(o => o.id === item.objectid);
  if (!assembly?.components) throw new Error('No component assembly found.');
  const configObject = array(config.object).find(o => o.id === item.objectid);
  if (!configObject) throw new Error('Missing assembly metadata.');
  const parts = array(configObject.part);
  const volumes = array(assembly.components.component).map(component => {
    const path = component['p:path'] ? posix.normalize(component['p:path'].replace(/^\//, '')) : mainPath;
    const source = xml(path).model;
    const object = array(source.resources.object).find(o => o.id === component.objectid);
    if (!object?.mesh) throw new Error('Expected a direct mesh component.');
    const matrix = transform(component.transform);
    const mesh: MeshData = {
      vertices: array(object.mesh.vertices.vertex).map(v => {
        const p = new Vector3(Number(v.x), Number(v.y), Number(v.z)).applyMatrix4(matrix);
        return [p.x, p.y, p.z] as Vec3;
      }),
      triangles: array(object.mesh.triangles.triangle).map(t => [Number(t.v1), Number(t.v2), Number(t.v3)]),
    };
    const part = parts.find(p => p.id === component.objectid);
    if (!part) throw new Error('Mesh has no part semantics.');
    const metadata = Object.fromEntries(array(part.metadata).filter(m => m.key).map(m => [m.key, m.value]));
    return { id: part.id, subtype: part.subtype, name: metadata.name, wallLoops: metadata.wall_loops, stats: validateMesh(mesh), mesh };
  });
  return {
    application: array(model.metadata).find(m => m.name === 'Application')?.['#text'],
    units: model.unit, buildTransform: item.transform, volumes,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: npm run spike:inspect -- path/to/file.3mf');
  const result = inspect3mf(resolve(process.argv[2]));
  console.log(JSON.stringify({ ...result, volumes: result.volumes.map(({ mesh: _, ...volume }) => volume) }, null, 2));
}
