Bambu Studio stock preset sources for AnchorPaint

License: GNU Affero General Public License, version 3 (AGPL-3.0-only).
Attribution: Bambu Lab and contributors; Bambu Studio is based on PrusaSlicer
by Prusa Research and Slic3r. The original AnchorPaint code is separately MIT.

The full upstream license is ../licenses/BambuStudio-AGPL-3.0.txt.
The manifest records upstream source URLs, revision and SHA-256 values.
All 17 JSON presets/templates under BBL/ are unchanged upstream files.
Their source revision is 926a7192574bcb9b3a732e1ec59a46d79cb45466:
https://github.com/bambulab/BambuStudio/tree/926a7192574bcb9b3a732e1ec59a46d79cb45466/resources/profiles

default-settings.json is the editable resolved configuration stored inside
src/assets/default-bambu-settings.3mf. It includes stock P1S 0.4 mm, PLA Basic
and 0.20 mm Standard settings and printer templates. It contains no model,
account, device or private source-path information.

To repackage this editable source from the AnchorPaint source repository:

  npm ci
  npm run profile:rebuild

The output is artifacts/preset-rebuild/default-bambu-settings.3mf. Unmodified
source reproduces the bundled archive's hash in manifest.json. This command
uses the original MIT repackaging helper and fflate; no slicer is required.

To resolve fresh stock defaults, tools/build-default-profile.ts uses the stock
presets and Bambu Studio 2.8.2.61 as an external tool. That path is documented
in docs/DEVELOPMENT.md. The Bambu executable and networking plugin are not
part of this distribution. Retain notices and review terms when redistributing
or modifying the preset material.
