import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';
import { readBambuProfile } from '../src/export/profile';

// Repackage the editable third-party configuration without changing the shipped
// asset. The source is separately AGPL; this original packaging code is MIT.
const source = resolve('public/preset-source');
const manifest = JSON.parse(readFileSync(resolve(source, 'manifest.json'), 'utf8'));
if (!/^BambuStudio-\d+\.\d+\.\d+\.\d+$/.test(manifest.application)) throw new Error('Invalid source application marker.');
const config = readFileSync(resolve(source, 'default-settings.json'));
const archive = zipSync({
  '3D/3dmodel.model': strToU8(`<?xml version="1.0"?><model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">${manifest.application}</metadata><resources/></model>`),
  'Metadata/project_settings.config': config,
}, { level: 9, mtime: new Date(2026, 0, 1) });
readBambuProfile(archive);
const directory = resolve('artifacts/preset-rebuild');
mkdirSync(directory, { recursive: true });
const output = resolve(directory, 'default-bambu-settings.3mf');
writeFileSync(output, archive);
const sha256 = createHash('sha256').update(archive).digest('hex');
console.log(JSON.stringify({ output, bytes: archive.length, sha256, matchesBundled: sha256 === manifest.preset.sha256 }));
