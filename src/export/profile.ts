import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface BambuProfile {
  readonly application: string;
  readonly printer: string;
  readonly process: string;
  readonly files: Readonly<Record<string, Uint8Array>>;
  readonly bed: { readonly min: readonly [number, number]; readonly max: readonly [number, number] };
  readonly excluded: readonly { readonly min: readonly [number, number]; readonly max: readonly [number, number] }[];
}
const settingsPath = /^Metadata\/(?:project_settings\.config|(?:process|machine|filament)_settings_[^/]+\.(?:config|json))$/;

/** Extract settings only. Model geometry, painting and cached toolpaths are never copied. */
export function readBambuProfile(bytes: Uint8Array): BambuProfile {
  if (bytes.byteLength > 100 * 1024 * 1024) throw new Error('Choose a small Bambu settings project under 100 MB.');
  let expandedSize = 0;
  const entries = unzipSync(bytes, { filter(info) {
    const keep = info.name === '3D/3dmodel.model' || settingsPath.test(info.name);
    if (keep && (expandedSize += info.originalSize) > 20 * 1024 * 1024) throw new Error('Settings project exceeds the 20 MB extracted-data limit. Save a small reference project.');
    return keep;
  } });
  if (!entries['3D/3dmodel.model'] || !entries['Metadata/project_settings.config']) {
    throw new Error('Choose a project saved by Bambu Studio with printer, filament and process settings.');
  }
  const xml = strFromU8(entries['3D/3dmodel.model']);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Invalid settings-project XML.');
  const model = new XMLParser({ ignoreAttributes: false }).parse(xml).model;
  const metadata = Array.isArray(model?.metadata) ? model.metadata : [model?.metadata];
  const application = metadata.find((m: any) => m?.['@_name'] === 'Application')?.['#text'];
  if (typeof application !== 'string' || !/^BambuStudio-\d+\.\d+\.\d+\.\d+$/.test(application)) {
    throw new Error('Settings source must be a native Bambu Studio project.');
  }
  const config = JSON.parse(strFromU8(entries['Metadata/project_settings.config']));
  if (typeof config.printer_model !== 'string' || !config.printer_model ||
      typeof config.print_settings_id !== 'string' || !config.print_settings_id ||
      !Array.isArray(config.nozzle_diameter) || !config.nozzle_diameter.length) {
    throw new Error('Settings source has incomplete printer or process settings.');
  }
  function polygonBounds(points: unknown): { min: [number, number]; max: [number, number] } {
    if (!Array.isArray(points) || points.length < 3) throw new Error('Settings source has no usable printable bed area.');
    const xy = points.map(p => typeof p === 'string' ? p.split('x').map(Number) : []);
    if (xy.some(p => p.length !== 2 || !p.every(Number.isFinite))) throw new Error('Invalid printer bed coordinates.');
    return { min: [Math.min(...xy.map(p => p[0])), Math.min(...xy.map(p => p[1]))],
      max: [Math.max(...xy.map(p => p[0])), Math.max(...xy.map(p => p[1]))] };
  }
  const bed = polygonBounds(config.printable_area);
  const expectedCorners = new Set([`${bed.min[0]}x${bed.min[1]}`, `${bed.min[0]}x${bed.max[1]}`, `${bed.max[0]}x${bed.min[1]}`, `${bed.max[0]}x${bed.max[1]}`]);
  if (config.printable_area.length !== 4 || config.printable_area.some((p: string) => !expectedCorners.delete(p)) ||
      expectedCorners.size || bed.max.some((n, i) => n <= bed.min[i])) throw new Error('This prototype supports rectangular printer beds only.');
  const excluded = Array.isArray(config.bed_exclude_area) && config.bed_exclude_area.length >= 3 ? [polygonBounds(config.bed_exclude_area)] : [];
  return {
    application, printer: config.printer_model, process: config.print_settings_id, bed, excluded,
    files: Object.fromEntries(Object.entries(entries).filter(([name]) => settingsPath.test(name))),
  };
}
