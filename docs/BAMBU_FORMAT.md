# Bambu 3MF export spike

Investigated 2026-10-23 against installed **Bambu Studio 2.8.2.61** on Windows.
Source inspection uses tag `v02.08.02.61`, commit
`926a7192574bcb9b3a732e1ec59a46d79cb45466`.

Primary references:

- [Native importer/exporter](https://github.com/bambulab/BambuStudio/blob/926a7192574bcb9b3a732e1ec59a46d79cb45466/src/libslic3r/Format/bbs_3mf.cpp)
- [GUI import policy](https://github.com/bambulab/BambuStudio/blob/926a7192574bcb9b3a732e1ec59a46d79cb45466/src/slic3r/GUI/Plater.cpp)
- [Legacy importer and metadata filtering](https://github.com/bambulab/BambuStudio/blob/926a7192574bcb9b3a732e1ec59a46d79cb45466/src/libslic3r/Format/3mf.cpp)
- [Volume type strings](https://github.com/bambulab/BambuStudio/blob/926a7192574bcb9b3a732e1ec59a46d79cb45466/src/libslic3r/Model.cpp)

These sources were inspected for format facts. Their AGPL implementation was not
copied or vendored into this application.

## Native package

The writer creates OPC content types and root relationships, `3D/3dmodel.model`,
`Metadata/model_settings.config`, and bundled-default or custom project settings.

Mesh resources 1..N hold the original and separate closed modifier meshes. Object
N+1 references all resources as components and is the sole build item. Core 3MF
units are `millimeter`. Child transforms are identity; any shared placement lives
on the build item. Loaded source vertices and triangle winding remain untouched.
Generated modifiers use exact coordinate indexing so cap/side faces share actual
vertex indices. This removed orange mesh-warning icons observed in the first
non-indexed actual-part candidate; see BASEEXT_PILOT.md. No mesh repair is used.

`model_settings.config` associates the assembly ID with parts whose IDs match the
mesh resources. `subtype="normal_part"` identifies printable geometry;
`subtype="modifier_part"` identifies a settings region. Modifier metadata carries
`wall_loops` as an integer. The 16-value `matrix` metadata is row-major; the core
3MF component/build transform uses the separate 12-value 3MF convention.
The whole assembly is centered on the selected profile's rectangular bed, with
its bottom at Z=0, by one shared build translation. Source vertices stay intact.
An explicit plate/model_instance associates the assembly with the first plate.

The writer makes a new project and never overwrites an STL or selected settings
input. It does not preserve an existing project's geometry, painting or plates.

## Native project compatibility and defaults

**A profile-free native-looking mesh package is insufficient.** In the actual GUI
test, its modifier remained in the object tree but the requested four wall loops
were lost; a GUI-saved copy no longer contained the per-volume override. The CLI
alone had preserved it on the first save, so that test was a false reassurance.
Reopening that CLI-saved profile-free package also crashed with Windows status
`0xC0000005`. The cause of the native crash has not been isolated further.

The legacy PrusaSlicer-compatible probe also lost wall loops. The inspected
legacy parser filters metadata keys and does not accept that wall override.
It is not shipped as an alternative export mode.

The working native CLI route includes both:

1. A complete native project-settings payload. The default is stock P1S 0.4 /
   Bambu PLA Basic / 0.20mm Standard, generated from Bambu's installed system
   presets and bundled without geometry. A user settings project is optional.
2. That project's `Application` version marker beginning `BambuStudio-`, which
   selects Bambu's project import path. The output Description explicitly states
   that AnchorPaint wrote the file and retained the marker for compatibility.

Only project settings and embedded process/machine/filament settings are copied.
Source meshes, painting, thumbnails, cached toolpaths and other archive entries
are excluded. The chosen settings payload is retained byte-for-byte, including
any custom snippets it already contains. No code edits or generates printer
G-code. A custom source may cause Bambu to display its own modified-preset warning.

The app loads the bundled stock default automatically
and labels it clearly. Printer, filament and process can be selected in Bambu;
custom settings remain an optional override. This is still a native settings
payload, not a profile-free export. A deliberately named `--diagnostic-no-profile` option reproduces the
known failing case and must not be presented as a successful MVP export.

## What constitutes verification

Unit tests decode the written archive independently and compare resource IDs,
settings, every loaded vertex/triangle, bounds, volume, hole-aware fixture oracles
and shared transforms. They establish structural and numerical correctness.

`spike:verify-bambu` runs the real installed application twice for each fixture,
then reconstructs its component transforms and compares all coordinates/indices,
positive volumes, types and settings. This establishes real CLI round-trip
behavior for that source/version. CLI arrangement may change the shared build
placement; it does not move a modifier separately.

GUI import, save/reopen, slicing, baseline/manual/generated layer comparisons and
physical tests must be recorded separately. See TEST_STATUS.md for results.
