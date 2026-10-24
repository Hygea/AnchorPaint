import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import manifestJson from '../fixtures/manifest.json';
import { parseStl } from '../src/core/mesh';
import type { Point2 } from '../src/core/extrude';

export const manifest = manifestJson as unknown as {
  root_z: number; reference_depth: number; reference_overlap: number;
  cases: { name: string; model: string; root_z: number; top_z: number; modifier_count: number;
    modifiers: { file: string; centre_xy: Point2; outer_loop_xy: Point2[]; holes_xy: Point2[][] }[] }[];
};
export function fixtureMesh(filename: string) {
  const bytes = readFileSync(resolve('fixtures', filename));
  return parseStl(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
