# Development

## Requirements and checks

Use Node.js 22.12+ or 24 LTS. Dependencies are pinned in package-lock.json.
Bambu Studio and Python are optional developer tools, not browser dependencies.

    npm ci
    npm run dev
    npm test
    npm run test:ui
    npm run build
    npm run test:site

UI tests use installed Chrome locally. CI installs Playwright Chromium for the
production check. The production config starts Vite preview on port 4174 under
/AnchorPaint/ and tests the built files, not the development server.

For a manual build preview:

    npm run preview -- --base /AnchorPaint/ --port 4174 --strictPort

On Windows PowerShell, use npm.cmd if npm's PowerShell shim strips option
separators. Stop the app's dev server before npm ci if Windows locks esbuild.exe.
Preview is a local test server, not a production hosting service.

## Project layout

- src/core/: mesh validation, orientation, selection, sections and extrusion.
- src/export/: native Bambu 3MF writer and settings extraction.
- src/main.ts and src/viewer.ts: browser workflow and Three.js display.
- fixtures/: reproducible synthetic STLs, expected dimensions and geometry oracles.
- tests/: geometry/export/selection tests, UI tests and production acceptance.
- tools/: fixture generation, native export inspection and preset regeneration.
- public/: static licenses/notices and editable third-party preset sources.

[Architecture](ARCHITECTURE.md) · [Scope](../MVP_SPEC.md) ·
[Test evidence](../TEST_STATUS.md)

## Native slicer checks

Run structural tests before involving a slicer. A valid ZIP/XML file or successful
download does not establish modifier recognition or sliced behavior.

    npm run spike:export -- "path/to/bambu-settings.3mf"
    npm run spike:verify-bambu -- "path/to/bambu-studio.exe" artifacts/export-spike/profile-backed
    npm run spike:inspect -- artifacts/export-spike/profile-backed/ten_bosses.3mf

The native verifier is pinned to Bambu Studio 2.8.2.61, imports/saves twice and
checks reconstructed geometry and overrides. It records failures and case-specific
reports under ignored artifacts/. Version changes require deliberate review.
Profile-free diagnostic exports are intentionally failing probes, not supported
product exports. See [format findings](BAMBU_FORMAT.md) and [test protocol](TEST_PROTOCOL.md).

## Preset sources and regeneration

The preset is a separate third-party asset under its upstream AGPL v3 terms.
See [licensing and source provenance](LICENSING.md).

The source snapshot includes all 17 unchanged upstream JSON presets/templates
and the editable resolved configuration. Repackage that editable configuration
without requiring Bambu Studio:

    npm run profile:rebuild

The output is written under ignored artifacts/preset-rebuild/. With the committed
source it must match the bundled preset's SHA-256 recorded in the manifest.

To resolve fresh stock defaults instead, the existing regeneration tool requires
Bambu Studio 2.8.2.61 and its stock preset installation:

    npm run profile:build-default

When updating presets, review upstream licensing, refresh editable sources,
manifest and notices, run all checks, and repeat native slicer acceptance. Do not
silently replace printer templates, relabel the producing slicer, or introduce
user/device data into the bundled source.

## Fixtures and contributions

The optional Python fixture generator uses numpy, shapely and trimesh. Recorded
reference versions are in fixtures/mesh_validation.json. It is not required for
normal development or app use. Actual private-part STLs are not bundled.

Keep generated builds, local test evidence, credentials and private settings out
of Git. See [contribution guidelines](../CONTRIBUTING.md).
