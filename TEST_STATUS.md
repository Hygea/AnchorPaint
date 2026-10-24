# Verification status

Last updated: 2026-10-24. AnchorPaint v0.1.0 is an experimental browser application.
Software tests establish the cases below; they do not establish print strength or
compatibility with every slicer/version.

## Automated coverage

| Check | Recorded result |
| --- | --- |
| Geometry, export, selection and settings tests | 86 passed |
| Browser interaction/download tests | 17 passed in installed Chrome |
| Production browser acceptance | 1 passed locally and on GitHub Ubuntu/Node 24.21.0 |
| TypeScript and production build | Passed; existing non-fatal bundle-size warning |
| Clean dependency installation/audit | Passed; zero reported vulnerabilities at the recorded check |
| GitHub Pages pipeline | Build, production check and artifact upload passed; deployment skipped for PR |

The automated suite checks:

- All 15 synthetic STL references for bounds, winding, closed edges and volume.
- Twelve footprints derived from selected triangles against independent reference
  modifiers, preserving holes and indexed cap/side connectivity.
- Smart Fill around a cylinder; sharp-boundary stops; ambiguous through-bores;
  local support limits; unsupported slopes, tapers, joined and irregular sections.
- Six proper print-orientation rotations, original-frame restoration, unchanged
  scale/winding/triangle order and explicitly rotated source coordinates.
- Domed/flared/concave cap limits, thin/short-feature default fitting, independent
  depth/overlap, visible orange overlap and rejection of later invalid values.
- Real canvas raycasts, size-confirmation continuation/cancellation/replacement,
  multiple targets, duplicates, remove/undo, shared settings and export bounds.
- Slider drags leaving/re-entering controls; native text-drag isolation; file drops;
  camera movement versus selection; controls at 320, 390, 820 and 1440 px widths.
- ZIP/XML metadata, names, wall overrides, shared bed translation and preservation
  of every loaded original vertex/index in structural export checks.

The built production app is tested under /AnchorPaint/. JS, CSS, sample and preset
load, a supported shaft is selected, depth 1.5/overlap 1.2 yields Z=2.5–5.2 mm, an
orange modifier renders and a two-volume 3MF downloads. Local STL and optional
settings inputs generate no upload requests; the tested app requests only local
site resources. The source/license snapshot is also served with the artifact.
Exact preset-source bytes are checked: Bambu's resolved JSON preserves CRLF
line endings via a file-specific .gitattributes rule. This prevents checkout
normalization from changing the reproduced archive on Linux.

Commands and environment setup are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
The local baseline used Windows/Node 23.10.0/Chrome; CI uses supported Node.js 24.
Historical local evidence is kept under ignored artifacts/, not distributed.

## Bambu Studio 2.8.2.61

Native source inspection is pinned to upstream revision
926a7192574bcb9b3a732e1ec59a46d79cb45466. Test settings used stock P1S 0.4 mm,
PLA Basic, 0.20 mm layers, Classic wall generation, global wall loops 2 and modifier
wall loops 4. These describe the test environment, not universal print settings.

| Native check | Result |
| --- | --- |
| Three reference cases: hollow post, straight wall, ten posts | Two CLI import/save cycles passed with types, names, wall overrides, volume and bounds retained |
| Original/modifier coordinates after both cycles | Every reconstructed vertex/index checked within 0.00002 mm |
| Ten-post GUI import | Ten aligned modifier entries; first selected override displayed wall loops 4 |
| Ten-post GUI slicing | Succeeded, 80 layers; selected root/above-root layers inspected |
| Privately supplied hollow-post part | Two CLI cycles passed; direct GUI import displayed wall override and sliced 100 layers |
| Same part with bundled stock defaults | Two CLI cycles passed; later UI export byte-identical to the earlier verified default export |
| Synthetic solid post | Two CLI cycles passed; native GUI slicing not performed |
| Reoriented capped-pin part | Two CLI cycles passed on sequential retry; geometry and overrides preserved; native GUI slicing unverified |
| Profile-free candidate | Failed GUI acceptance: modifier geometry retained but wall override discarded; CLI-saved diagnostic also crashed on reopening |
| Legacy-format probe | Failed Bambu GUI acceptance; not a supported fallback |

CLI timeouts during concurrent GUI work and an initial second-cycle pin timeout
were recorded; final sequential retries passed. Indexed generated geometry removed
warning icons seen in an earlier non-indexed candidate. These outcomes do not
establish controlled baseline/manual/generated toolpath equivalence.

## OrcaSlicer 2.4.2 portable

A maintainer-reported smoke test confirmed direct import, aligned modifier
placement, retained wall-loop overrides and expected slicing. This is manual
reported evidence, not an independently automated native round trip.

Import displayed newer-version/configuration warnings and substituted
ensure_vertical_shell_thickness=enabled with ensure_all. The bundled Bambu value
and Orca's v2.4.2 setting definition were inspected. That setting controls solid
infill near sloping surfaces, so warning-free import and identical toolpaths are
not claimed. Save/reopen, printer-profile switching and other Orca versions remain
unverified. [Pinned Orca definition](https://github.com/OrcaSlicer/OrcaSlicer/blob/v2.4.2/src/libslic3r/PrintConfig.cpp#L1867-L1884).

## Remaining checks

- Public Pages activation and acceptance at the live URL.
- Full baseline/manual/generated per-layer comparisons under matching settings.
- Separate final native GUI save/reopen and printer-profile-switch checks.
- Broader supported/unsupported geometry testing and guided usability checks.
- PrusaSlicer, other Bambu/Orca versions and other slicers.
- Controlled physical strength comparisons.

No print job, printer upload or physical strength result is implied by software
or slicing checks. Inspect sliced output before printing.

[Hollow-post case](docs/BASEEXT_PILOT.md) · [Capped-pin case](docs/SERVO_PILOT.md) ·
[Test protocol](docs/TEST_PROTOCOL.md) · [Format findings](docs/BAMBU_FORMAT.md)
