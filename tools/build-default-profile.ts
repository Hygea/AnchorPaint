import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { readBambuProfile } from '../src/export/profile';

// Developer-only regeneration from installed stock presets. Never reads a user
// settings directory or modifies templates/G-code. Bambu resolves its own defaults.
const install = process.argv[2] ?? 'C:/Program Files/Bambu Studio';
const root = join(install, 'resources/profiles/BBL');
const output = resolve('artifacts/default-profile-build');
mkdirSync(output, { recursive: true });
const entries = new Map<string, { data: Record<string, any>; filename: string }>();
function scan(directory: string) {
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.isDirectory()) scan(path);
    else if (file.name.endsWith('.json')) {
      const data = JSON.parse(readFileSync(path, 'utf8'));
      if (typeof data.name === 'string') entries.set(data.name, { data, filename: path });
    }
  }
}
scan(root);
const sources = new Set<string>();
function flatten(name: string, parents: string[] = []): Record<string, any> {
  if (parents.includes(name)) throw new Error(`Preset inheritance cycle: ${name}`);
  const entry = entries.get(name);
  if (!entry) throw new Error(`Stock preset not found: ${name}`);
  sources.add(entry.filename);
  const { inherits, include, ...own } = entry.data;
  const merged = inherits ? flatten(inherits, [...parents, name]) : {};
  for (const dependency of include ?? []) Object.assign(merged, flatten(dependency, [...parents, name]));
  return Object.assign(merged, own);
}
const names = {
  machine: 'Bambu Lab P1S 0.4 nozzle',
  process: '0.20mm Standard @BBL X1C',
  filament: 'Bambu PLA Basic @BBL P1S 0.4 nozzle',
};
const paths = Object.fromEntries(Object.entries(names).map(([type, name]) => {
  const path = join(output, `${type}.json`);
  writeFileSync(path, JSON.stringify(flatten(name), null, 2) + '\n');
  return [type, path];
}));
const projectPath = join(output, 'stock-default.3mf');
const log = execFileSync(join(install, 'bambu-studio.exe'), [
  '--arrange', '1', '--orient', '0', '--load-settings', `${paths.machine};${paths.process}`,
  '--load-filaments', paths.filament, '--export-3mf', projectPath, resolve('fixtures/single_boss.stl'),
], { cwd: output, windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
writeFileSync(join(output, 'bambu.log'), log);
const files = unzipSync(readFileSync(projectPath));
const settings = JSON.parse(strFromU8(files['Metadata/project_settings.config']));
if (settings.printer_settings_id !== names.machine || settings.print_settings_id !== names.process ||
  settings.filament_settings_id?.length !== 1 || settings.filament_settings_id[0] !== names.filament) {
  throw new Error('Bambu did not produce the requested single-filament stock defaults.');
}
// Retain the actual exporter version but strip all geometry, cached data,
// thumbnails and source paths. This asset is a settings source, not a model.
const metadata = strFromU8(files['3D/3dmodel.model']).match(/<metadata name="Application">([^<]+)<\/metadata>/)?.[1];
if (metadata !== 'BambuStudio-02.08.02.61') throw new Error('Review a new Bambu version before updating the bundled defaults.');
const asset = zipSync({
  '3D/3dmodel.model': strToU8(`<?xml version="1.0"?><model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">${metadata}</metadata><resources/></model>`),
  'Metadata/project_settings.config': files['Metadata/project_settings.config'],
}, { level: 9, mtime: new Date(2026, 0, 1) });
readBambuProfile(asset);
mkdirSync(resolve('src/assets'), { recursive: true });
writeFileSync(resolve('src/assets/default-bambu-settings.3mf'), asset);
writeFileSync(join(output, 'provenance.json'), JSON.stringify({
  application: metadata, names, sources: [...sources], generatedAt: new Date().toISOString(),
  scope: 'Stock settings only. No user project, account, printer device, geometry or cached toolpaths bundled.',
}, null, 2) + '\n');
console.log(`Bundled stock default: ${asset.byteLength} bytes; ${names.machine}; one PLA filament.`);
