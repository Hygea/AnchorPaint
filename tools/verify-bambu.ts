import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { inspect3mf } from './inspect-3mf';

const executable = process.argv[2] ?? 'C:/Program Files/Bambu Studio/bambu-studio.exe';
const inputFolder = resolve(process.argv[3] ?? 'artifacts/export-spike/profile-backed');
const names = process.argv.length > 4 ? process.argv.slice(4) : ['single_boss', 'straight_wall', 'ten_bosses'];
if (names.some(name => !/^[a-zA-Z0-9_-]+$/.test(name))) throw new Error('Use simple file stems as case names.');
const folder = resolve('artifacts/bambu-check');
mkdirSync(folder, { recursive: true });
const results: unknown[] = [];
let failed = false;
function close(a: number, b: number, tolerance = 0.00002) { assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`); }
for (const name of names) {
  const originalPath = resolve(inputFolder, `${name}.3mf`);
  const original = inspect3mf(originalPath);
  let input = originalPath;
  const passes = [];
  try { for (let pass = 1; pass <= 2; pass++) {
    const output = resolve(folder, `${name}_pass${pass}.3mf`);
    execFileSync(executable, ['--arrange', '0', '--orient', '0', '--export-3mf', output, input], { cwd: folder, windowsHide: true, timeout: 120_000 });
    const actual = inspect3mf(output);
    assert.equal(actual.application, 'BambuStudio-02.08.02.61', 'Record and review this script before accepting a different Bambu version.');
    assert.equal(actual.units, 'millimeter');
    assert.equal(actual.volumes.length, original.volumes.length);
    for (let i = 0; i < original.volumes.length; i++) {
      const expected = original.volumes[i], part = actual.volumes[i];
      assert.equal(part.subtype, expected.subtype);
      assert.equal(part.wallLoops, expected.wallLoops);
      assert.equal(part.name, expected.name);
      assert.equal(part.mesh.triangles.length, expected.mesh.triangles.length);
      close(part.stats.volume, expected.stats.volume, Math.max(0.001, expected.stats.volume * 1e-6));
      for (let axis = 0; axis < 3; axis++) {
        close(part.stats.bounds.min[axis], expected.stats.bounds.min[axis]);
        close(part.stats.bounds.max[axis], expected.stats.bounds.max[axis]);
      }
      // Coordinate comparison after Bambu's volume transforms; also protects hole topology.
      assert.equal(part.mesh.vertices.length, expected.mesh.vertices.length);
      for (let v = 0; v < expected.mesh.vertices.length; v++) for (let axis = 0; axis < 3; axis++) {
        close(part.mesh.vertices[v][axis], expected.mesh.vertices[v][axis]);
      }
      assert.deepEqual(part.mesh.triangles, expected.mesh.triangles);
    }
    passes.push({ output, application: actual.application, buildTransform: actual.buildTransform,
      volumes: actual.volumes.map(({ mesh: _, ...part }) => part) });
    input = output;
  } } catch (error) {
    failed = true;
    const failure = { name, passes, error: String(error), exitStatus: (error as { status?: number }).status };
    results.push(failure);
    console.error(`${name}: round trip failed; ${String(error)}`);
    continue;
  }
  console.log(`${name}: ${original.volumes.length - 1} modifier(s) preserved across two real Bambu CLI round trips.`);
  results.push({ name, passes });
}
writeFileSync(resolve(folder, process.argv.length > 4 ? `${names.join('_')}-verification.json` : 'verification.json'), JSON.stringify({
  testedAt: new Date().toISOString(), application: 'Bambu Studio 2.8.2.61',
  scope: 'Actual CLI import/export twice. No GUI or per-layer toolpath acceptance implied.',
  passed: !failed, inputFolder,
  commands: ['--arrange 0 --orient 0 --export-3mf <output> <input>'], results,
}, null, 2) + '\n');
if (failed) process.exitCode = 1;
