import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseStl, validateMesh } from '../src/core/mesh';
import { exportBambu3mf } from '../src/export/bambu-3mf';
import { readBambuProfile } from '../src/export/profile';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'fixtures/manifest.json'), 'utf8'));
if (!process.argv[2]) throw new Error('Usage: npm run spike:export -- path/to/bambu-settings.3mf (or --diagnostic-no-profile for the known failing profile-free case).');
const profileInput = process.argv[2] !== '--diagnostic-no-profile' ? resolve(process.argv[2]) : undefined;
const profile = profileInput ? readBambuProfile(await readFile(profileInput)) : undefined;
const out = resolve(root, 'artifacts/export-spike', profile ? 'profile-backed' : 'diagnostic');
if (profileInput && manifest.cases.some((fixture: { name: string }) => resolve(out, `${fixture.name}.3mf`).toLowerCase() === profileInput.toLowerCase())) {
  throw new Error('Settings source must not be an output file; inputs are never overwritten.');
}
await mkdir(out, { recursive: true });
async function mesh(file: string) {
  const bytes = await readFile(resolve(root, 'fixtures', file));
  return parseStl(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const summary = [];
for (const fixture of manifest.cases) {
  const model = await mesh(fixture.model);
  const modifiers = await Promise.all(fixture.modifiers.map(async (part: {file: string}) => ({
    name: part.file.replace('.stl', ''), mesh: await mesh(part.file), wallLoops: 4,
  })));
  const filename = `${fixture.name}.3mf`;
  await writeFile(resolve(out, filename), exportBambu3mf({ name: fixture.name, model, modifiers, profile }));
  summary.push({ filename, modifiers: modifiers.length, source: validateMesh(model), modifierStats: modifiers.map(m => validateMesh(m.mesh)) });
  console.log(`Wrote ${filename}: one original + ${modifiers.length} settings modifier(s), wall loops 4.`);
}
await writeFile(resolve(out, 'summary.json'), JSON.stringify({
  note: profile ? 'Reference meshes with explicitly chosen Bambu settings. Slicer acceptance is a separate gate.' : 'NEGATIVE DIAGNOSTIC: no project settings. Bambu GUI discards wall overrides; these files do not satisfy the MVP.',
  cases: summary,
}, null, 2) + '\n');
