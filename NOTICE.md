# Licenses and credits

AnchorPaint's original application code, documentation, brand mark and synthetic
test fixtures are licensed under [MIT](LICENSE), copyright 2026 Hygea.
The MIT grant does not replace third-party licenses or grant rights to models
and settings that people load into the application.

## Bambu Studio stock preset

The bundled default is generated from Bambu Studio 2.8.2.61 stock P1S 0.4 mm,
PLA Basic and 0.20 mm Standard settings. Bambu Studio is by Bambu Lab and
contributors, based on PrusaSlicer by Prusa Research and Slic3r.

The preset material is distributed separately under the upstream
[GNU AGPL version 3](public/licenses/BambuStudio-AGPL-3.0.txt), without an MIT
relicense. This scope includes:

- src/assets/default-bambu-settings.3mf;
- public/preset-source/default-settings.json, the editable configuration inside
  that archive;
- the 17 unchanged upstream JSON presets/templates under public/preset-source/BBL.

The app's geometry engine and format writer are independent implementations;
no Bambu executable or networking plugin is included. Bambu's printer templates
are retained in the settings asset, not copied into the application code.

[Preset source and regeneration](public/preset-source/README.txt),
[source manifest](public/preset-source/manifest.json),
[upstream revision](https://github.com/bambulab/BambuStudio/tree/926a7192574bcb9b3a732e1ec59a46d79cb45466).
The full license and editable preset sources are included with the static site,
so their availability does not depend on this repository being public.

## JavaScript libraries

The full notices for runtime libraries, their transitive dependencies and the
Mapbox Earcut code included in Three.js are in
[public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt).
These components retain their MIT, ISC or Unlicense terms as listed there.

The package license expression describes the combined distribution as
MIT AND AGPL-3.0-only; it does not place AnchorPaint's original code under AGPL.
See [licensing notes](docs/LICENSING.md) for the separation and provenance.

Bambu Lab, Bambu Studio, OrcaSlicer and PrusaSlicer are names of their respective
projects/owners. AnchorPaint is independent and is not endorsed by them.
