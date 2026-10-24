import { strToU8, zipSync } from 'fflate';

// Synthetic settings for structural/UI tests. Never used for real Bambu acceptance.
export function settingsProject(extra: Record<string, Uint8Array> = {}) {
  return zipSync({
    '3D/3dmodel.model': strToU8('<model><metadata name="Application">BambuStudio-02.08.02.61</metadata><resources/></model>'),
    'Metadata/project_settings.config': strToU8(JSON.stringify({
      printer_model: 'Unit-test printer', print_settings_id: 'Unit-test process', nozzle_diameter: ['0.4'],
      printable_area: ['0x0', '200x0', '200x200', '0x200'], bed_exclude_area: [],
    })),
    ...extra,
  });
}
