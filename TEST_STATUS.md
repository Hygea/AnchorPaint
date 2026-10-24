# Verification status — 2026-10-24

This is a working **STL selection development preview**, not the completed MVP.
The UI loads local STL files, selects upright surfaces by raycast/Smart Fill,
derives footprints and local depth limits, previews multiple anchors and exports
aligned 3MF modifiers. Support is restricted to isolated round bosses and
rectangular straight walls on horizontal bases. See docs/BASEEXT_PILOT.md.

The app was renamed **AnchorPaint** at the user's request. The servo-adapter
pilot adds explicit axis-aligned printing orientation and straight shafts below
shaped caps; details and exact limits are in docs/SERVO_PILOT.md.

## Automated checks actually run

| Check | Result |
| --- | --- |
| Geometry, export, selection and settings-source tests | **86 passed**, Node test runner |
| Browser interaction/download tests | **17 passed**, Playwright with installed Chrome |
| Production browser acceptance | **1 passed**, built files served by Vite preview under `/AnchorPaint/`; JS/CSS/sample/preset loading, rendered modifier, download, local-file privacy and console checks |
| TypeScript check and production build | **Passed** |
| Dependency audit | **0 reported vulnerabilities** after dependency selection |
| All 15 reference STLs reloaded | Closed, consistent winding, positive volumes and expected bounds checked |
| 12 modifiers extruded from known footprint loops | Match reference bounds and hole-aware volumes |
| 12 footprints derived from selected STL triangles | Match reference modifier bounds and hole-aware volumes without supplying contour coordinates |
| Neighbour-based Smart Fill | Wraps an entire cylinder; low-angle threshold stops at a facet |
| Root ambiguity | Through-base bore requires an upward horizontal base click |
| Local support limits | Sloped local underside limits depth above global minimum Z |
| Local STL interaction | Actual raycast clicks, two targets, depth errors, removal/undo and exported modifier count checked |
| Surface feedback | Hover preview, dimension gating, selected surface, base outline and duplicate blocking checked |
| First-click size prompt | Hover before confirmation, explicit confirm resumes the clicked surface, Go back/Esc cancellation, new-model pending-click reset and no repeated prompt checked |
| Depth slider | Local maximum, keyboard changes, typed-value synchronization, invalid-value recovery and actual exported Z bounds checked |
| Visible overlap slider | Accessible with Advanced closed; feature-height maximum, keyboard changes, typed-value synchronization, invalid-value recovery, reset on replacement and actual exported upper Z bound checked |
| New-selection defaults | Thin/short feature fits depth and overlap immediately after orientation/confirmation; manual base picking fits limits too; valid values persist and later typed invalid values remain errors |
| Visible upward overlap | Rendered-image pixel check finds a distinct orange band with both selection and hover active; its upper boundary moves with overlap |
| Explicit print orientation | Six proper axis rotations preserve scale, winding, triangle order and source input; browser bed-face rotation, dimensions reset, rotated-model export and original-orientation restoration checked |
| Shaped pin caps | Synthetic domed, flared and concave caps derive shaft modifiers; concave-cap upper limit and exported volume also checked through STL loading and the browser |
| Slider drag isolation | Repeated real pointer drags outside both sliders and back preserve selection, update the setting and cause no file chooser/download |
| Native drag/drop handling | Real selected-text drags blocked; synthetic text transfers ignored, file-drop import preserved, drag-end/Escape cleanup checked |
| Camera/input handling | Orbit returning to its start does not select a face; fit, top, 3D and See inside preserve exported source coordinates |
| Base-picking guidance | Through-bore ambiguity, invalid top click, purple base hover and recovery checked in the browser |
| Responsive layout | 320, 390, 820 and 1440 px widths: orientation/view controls stay within the model pane, toolbar clears instructions and no horizontal page overflow |
| Generated mesh indexing | Shared vertex indices across caps/sides; each indexed edge has two triangle uses |
| Translated footprint/build frame | Tested; depth follows negative build Z |
| Written 3MF geometry | Every loaded vertex/index preserved in structural round-trip tests |
| Bed placement | One shared translation; size and exclusion checks tested |
| Local-only browser behavior | Tested: no external requests during the interaction/export flow |

Environment: Windows, Node 23.10.0, Vite 7.3.7, Three.js 0.186.1.
Maintained Node 22/24 LTS is recommended for development. The build includes
approximately 199 KB gzipped application JavaScript, one 38,484-byte sample STL
and the 10,274-byte stock settings asset. The 13 former runtime STLs totalled
579,692 bytes; the remaining fixtures are now test/developer assets only.
Vite reports a non-fatal warning about the uncompressed chunk exceeding 500 KB.

## GitHub Pages and v0.1.0 preparation

The release-preparation task completed a clean `npm ci` (zero reported
vulnerabilities), all 86 geometry/export/profile/selection tests, all 17 existing
browser tests, the TypeScript/production build and one new production browser
acceptance test. Local runtime: Windows, Node 23.10.0, installed Chrome. The
workflow specifies Node.js 24 on Ubuntu; a successful GitHub-hosted run has not
yet been recorded here.

The built site was served with `npm run preview -- --base /AnchorPaint/` and
tested at the case-sensitive project prefix. The browser loaded JavaScript,
CSS, sample STL and stock 3MF settings, selected the sample shaft, changed depth
to 1.5 mm and overlap to 1.2 mm, rendered an orange modifier and downloaded a
two-volume 3MF. Its source mesh matched every loaded vertex/index; modifier
bounds were Z=2.5–5.2 mm. Local STL and custom settings inputs also loaded with
no network uploads. Only same-origin GETs below `/AnchorPaint/` were observed;
there were no missing assets or browser errors in the passing run. A first
production run caught a missing browser favicon; an app-owned SVG icon and
relative icon link fixed that 404 before the successful repeat.

The relative Vite base remains `./`; both existing root development tests and
the exact production subpath pass. The built app JavaScript/CSS hashes and the
bundled preset content are unchanged; geometry and export behavior were not
modified. Third-party notices and the favicon are additional static site files.
No new runtime dependency was introduced. The existing non-fatal large-chunk
warning remains.

`.github/workflows/deploy.yml` builds/tests PRs and uploads only `dist/`.
Successful main push/manual builds can deploy through the `github-pages`
environment. Official action releases were checked and pinned on 2026-10-24.
No Pages settings, repository visibility, release tag or GitHub Release was
changed. The site is **prepared, not verified published**; release approval is
blocked by the original-code license, bundled preset redistribution review and
the owner decision about a personal path retained in Git history. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md),
[docs/PUBLIC_RELEASE_AUDIT.md](docs/PUBLIC_RELEASE_AUDIT.md) and the
[draft v0.1.0 notes](docs/releases/v0.1.0.md).

Native Bambu/Orca checks were not rerun for this deployment-only preparation.
Their existing evidence and limitations below remain unchanged.

## Viewport orientation and visible depth/overlap controls

Set upright and Original orientation have moved from the model-file section to
a Print orientation group beside Fit / 3D / Top and See inside. Set upright shows
an active/cancel state while waiting for the bed face; the selection card explains
that changing orientation clears selections and added modifiers. Narrow screens
use two toolbar rows, with model instructions below the controls.

Depth into base and Overlap above base are now visible together in the selection
step, each with a number field, slider and available range. Short explanations
identify the downward depth below the base outline and upward overlap into the
feature. Values remain independent with the existing 3 mm / 2 mm starting values
and automatic fit to local geometry. Advanced now contains fill angle and optional
Bambu settings. No geometry or export algorithm changed.

The full 86 core tests, 17 browser tests and production build pass. Existing
orientation and export checks now exercise the relocated controls; overlap
interaction/export and slider-drag checks work with Advanced closed. Layout
checks cover 320, 390, 820 and 1440 px widths, including toolbar/hint separation.
Desktop and narrow-screen screenshots are recorded in `artifacts/control-layout/`.
Native Bambu checks were not rerun for this layout change.

## Immediate valid preview and overlap contrast

The user's servo screenshot showed depth 3 mm against a 2 mm local maximum.
Validation correctly rejected the modifier, leaving only the selected surface;
this looked like a missing preview until the slider was moved. Successful new
feature/root selection now fits out-of-range depth/overlap to the shared local
limits before generating the preview. The adjustment is explained in the card.
Later manual invalid edits are still rejected and valid existing values are kept.

Green selection/hover previously rendered over the orange modifier. Selection
now has a light tint and teal boundary; orange fill and dark orange edges render
above both selection and hover. The base outline remains purple. No source or
export geometry is changed by the visual treatment.

The full 86 core tests, 17 browser tests and production build pass. New browser
checks cover immediate depth 2 / overlap 1.2 on an independently generated thin,
short pin, native slider/number agreement, exported Z bounds, continued manual
validation and preservation of valid settings. A screenshot pixel check verifies
orange is visible above the root during hover and that the boundary moves when
overlap changes. Native Bambu checks were not rerun for this UI refinement.
The actual servo-adapter was also loaded/reoriented again: its first selection
was ready at depth 2 mm without a slider gesture. Its downloaded modifier had
source Z=-17.420025–-13.420025 mm as expected. Local screenshots and this export
are in `artifacts/selection-preview/` with `servo-verification.json`.

## Sideways servo-adapter and shaped-cap checks

The actual `Servoadapter bot34.stl` has its pin along source -X. Camera orbit does
not change the printing axis, which caused the original selection problem. Set
upright now lets the user click the flat bed face and rotates the whole working
mesh together. Confirmation and previous modifiers reset; Original orientation
restores the loaded frame. Only the six axis-aligned directions are supported.

The full UI workflow selected the 3.05 mm cylindrical shaft beneath its shaped
tip and exported depth 1.5 mm, overlap 2 mm, wall loops 4. Source-file volume and
all explicitly rotated vertices/indices were independently compared with the
download. The local base is 2 mm thick and the straight shaft is 3 mm high.
Synthetic dome/flare/concavity tests also pass. For a terminal concave cap,
overlap is limited below the first interior change and the cap is never filled.

That actual AnchorPaint export passed **two real Bambu Studio 2.8.2.61 CLI
import/save cycles**, preserving normal/modifier types, names, wall override,
volume, bounds and every reconstructed vertex/index. An initial attempt passed
the first cycle but timed out during the second; its report is retained as
`artifacts/bambu-check/servo_adapter-first-attempt.json`. A sequential retry
completed both cycles and is recorded in `servo_adapter-verification.json`.
No native GUI layer inspection or physical test was performed on this part.
See [docs/SERVO_PILOT.md](docs/SERVO_PILOT.md) for input hash and measurements.

## Advanced overlap slider and static hosting check

The initial overlap slider was added in Advanced options (it is now visible in
the selection step, as described above). Its
maximum is the minimum feature height (`topZ - rootZ`) across the current and
added targets; depth and overlap share range, preview and gesture handling.
The browser export test sets 1.6 mm overlap on the 4 mm root and checks the
written modifier reaches Z=5.6 mm while depth keeps its bottom at Z=1 mm.
Out-of-range typed values remain visibly invalid until corrected. Slider drag
regression coverage now exercises both controls. The full 76 core tests,
13 browser tests and build pass. An existing size-prompt test now explicitly
waits for asynchronous model loading before its canvas click.

The production `dist/` folder was also served by a plain local static file server
under `/modifier-painter/`, matching a GitHub Pages project URL layout. The
bundled sample and stock preset loaded, a surface was selected, overlap changed
to 0.2 mm and the downloaded 3MF had expected Z bounds 1–4.2 mm. All requests
were GETs for local site files; no external requests or browser errors occurred.
Evidence: `artifacts/overlap-slider/static-host-verification.json`,
`static-host.3mf` and `advanced.png`. This checks the packaged app locally;
no GitHub repository, workflow or hosted site was created. Native Bambu checks
were not rerun for this UI change.

## Intermittent drag/drop investigation

Using `baseext.stl`, direct slider drags outside the control and back did not
reproduce the user's exact intermittent gesture. A related path was reproduced:
selecting the displayed STL filename and dragging it into the model pane started
a native text drag (`text/plain` / `text/html`). The drop zone accepted every drag
as a file import and showed "Drop your STL here". Cancelling with Escape left that
highlight stuck. The hidden file input was only 1 px wide and did not overlap the
slider; the slider control was 16 px tall before this change.

Internal native drags are now cancelled, the depth control has a 28 px vertical
hit area with text selection disabled, and import feedback requires a file
transfer. Cancel/end cleanup also clears the highlight. Two regression checks
failed against the previous behavior and passed after the fix. Three new browser
tests cover actual selected-text drags, slider gestures leaving/re-entering the
control, and file/text transfer filtering with cancellation and STL import.
The full 76 core tests, 12 browser tests and production build passed. No native
Bambu test was rerun for this input-only change.

A final check on the running app with `baseext.stl` completed 12 pointer drags
out into the model pane and back. Depth ended at 2 mm, the selected post stayed
active, and no native drag, file chooser or download started. A subsequent real
filename-text drag fired `dragstart` with its default action cancelled and did
not activate the drop zone. Evidence: `artifacts/slider-drag/verification.json`
and `baseext.png`.

## User-reported OrcaSlicer check

On 2026-10-24, the user reported **OrcaSlicer 2.4.2 portable** (spoken as
"2.42") opened the existing AnchorPaint 3MF, kept the anchor aligned and the
wall-loop override in the intended region, and sliced as expected. No export
adaptation was needed for that reported case. The portable executable version
was supplied by the user and was not inspected independently. The model filename
and detailed layer-preview evidence were not supplied.

The user also reported newer-version/configuration warnings and one setting
substitution: `ensure_vertical_shell_thickness=enabled` was replaced with
`ensure_all`. Inspection of the bundled default confirms it carries `enabled`
and Bambu version 02.08.02.61. Orca's
[v2.4.2 setting definition](https://github.com/OrcaSlicer/OrcaSlicer/blob/v2.4.2/src/libslic3r/PrintConfig.cpp#L1867-L1884)
accepts `none`, `ensure_critical_only`, `ensure_moderate` and `ensure_all`, with
`ensure_all` as the default. Its legacy conversion handles `1` and `0`, not
`enabled`. The setting adds solid infill near sloping surfaces; it is separate
from modifier transforms and `wall_loops`, but can affect slicing. This result
is therefore **working with import warnings**, not warning-free compatibility
or proof of identical toolpaths. No preset, application marker or runtime export
behavior was changed to suppress the warning.

This is user-reported evidence, not an agent-run OrcaSlicer verification or a
claim about all OrcaSlicer versions. Save/reopen and (if used) changing to the
actual printer profile remain useful follow-ups. The user reported correct
slicing; a controlled comparison of affected layers has not been performed.
Multiple-target behavior and native round trips
have not been independently tested in OrcaSlicer. PrusaSlicer remains untested.

## Real Bambu Studio checks

Installed/tested version: **2.8.2.61** (file version 02.08.02.61).
Upstream source inspection is pinned to tag v02.08.02.61, commit
`926a7192574bcb9b3a732e1ec59a46d79cb45466`.

| Test | Actual outcome |
| --- | --- |
| Profile-free native candidate: first CLI import/export | Modifier types and wall loops retained in that first CLI output |
| Same profile-free candidate: GUI import/save | **Failed acceptance:** modifier geometry retained, wall-loop override discarded |
| Profile-free CLI-saved project reopened by CLI | **Failed:** Windows access violation 0xC0000005 |
| Legacy PrusaSlicer-compatible probe | **Failed:** GUI filtered out the wall override; not a shipped fallback |
| Profile settings without native project recognition | GUI still discarded override; not accepted |
| Native recognition + explicitly selected Bambu settings | **Passed actual CLI import/export twice for all 3 fixtures** |
| Bundled-default export of baseext | **Passed actual CLI import/export twice**; case report baseext_default-verification.json |
| Renamed AnchorPaint export of reoriented servo adapter | **Passed actual CLI import/export twice** on sequential retry; initial second-cycle timeout retained in a separate report |
| Printer change in final bundled-default GUI project | **Not verified by the agent**; Computer Use was stopped by the user before the switch check |
| Normal/modifier count, names, wall loops, volume and alignment after each CLI pass | Verified independently for single_boss, straight_wall and ten_bosses |
| Original and modifier triangle indices/coordinates after CLI passes | Verified after reconstructing Bambu component transforms; coordinate tolerance 0.00002 mm |
| Corrected ten-boss export loaded directly in GUI | All ten modifier entries present; assembly on the bed |
| GUI modifier wall-loop value | Selected first modifier displayed **4** with override indicator |
| GUI slicing of corrected ten-boss export | **Succeeded**, 80 layers |
| GUI layer inspection | Viewed 1.8 mm, 4.0 mm root, and 4.2 mm above-root layers in Line Type view |
| Full baseline/manual/generated layer comparison | **Not performed** |
| Separate GUI save/reopen inspection of final export | **Not performed**; save/reopen verification above is through the real CLI |
| OrcaSlicer 2.4.2 portable import, placement, wall-loop region and slicing | **User reported working with import warnings**, 2026-10-24; `enabled` replaced by `ensure_all`; save/reopen unconfirmed; see above |
| Other Bambu versions, PrusaSlicer and remaining slicers | **Not tested** |

The successful final CLI checks use unchanged settings from a Bambu GUI-saved
stock P1S project: Bambu Lab P1S 0.4 nozzle, process
`0.20mm Standard @BBL X1C`, Bambu PLA Basic in the first filament slot, 0.2 mm
layers, Classic wall generator, global wall loops 2 and modifier wall loops 4.
Other unused filament slots were present in the source project. This records the
test environment. That user-saved project is not bundled. A separately generated
single-filament stock default is now included following the user's clarification.

The toolpath views show concentric paths at the ten target locations within the
base and above it. No controlled baseline comparison was made, so this is **not**
a verified claim about additional internal perimeters, toolpath equivalence,
print safety, mechanical strength or root continuity.

A separate custom-profile probe reached Bambu's modified start-code warning.
That warning was not accepted automatically; final GUI validation instead used
the stock printer settings. No printer command, upload or print was initiated.

## First actual-part test: baseext.stl

The user's STL loaded and passed initial validation: 2,758 triangles,
61.942 × 43.284 × 20 mm, offset XY coordinates and negative source Z. The real
browser workflow selected an isolated hollow post, derived its footprint and
5 mm local base depth, and exported one modifier with 3 mm depth, 2 mm overlap
and wall loops 4. The connected post/wall is rejected as an irregular joined
footprint. No radius, center or root coordinates were entered by hand.

The final indexed export passed **two actual Bambu CLI import/save passes** with
all geometry and overrides preserved. Direct GUI import displayed the aligned
modifier with wall loops 4 and sliced successfully to **100 layers**. Exact
indexing of generated cap/side vertices removed mesh-warning icons seen on an
earlier candidate. CLI timeouts during concurrent GUI startup were recorded;
the final sequential retry passed. Tests now verify shared edge indices.

Evidence, input hash, settings and limitations are in
[docs/BASEEXT_PILOT.md](docs/BASEEXT_PILOT.md). Controlled per-layer comparisons,
separate GUI save/reopen, guided user acceptance and physical tests remain open.

## Additional supported-shape check: solid post

An independent stitched test mesh in `tests/shape-models.ts` models a solid
12 mm diameter post on a 30 mm diameter, 4 mm thick base. It has no bore and no
overlapping shells. The new test derives a full-cylinder footprint and checks
the modifier's manifoldness, lack of holes, bounds and polygon-volume oracle.
The existing straight-wall fixture continues to cover rectangular sections.

The solid post was also written as STL, loaded and selected through the current
UI, and exported with stock settings, depth 3, overlap 2 and wall loops 4. The
real Bambu Studio 2.8.2.61 CLI preserved that normal part and modifier through
**two import/save cycles**, with all reconstructed vertices/indices and overrides
checked. This new shape has **not** been inspected/sliced in the native GUI or
physically tested. No broader irregular-shape support is claimed.

Local evidence and files for a hands-on next test:

- `artifacts/shape-probes/solid_post.stl` and `straight_wall.stl`.
- `artifacts/depth-confirmation/solid_post.3mf` (exported through the UI).
- `artifacts/bambu-check/solid_post-verification.json` and both saved passes.
- `artifacts/depth-confirmation/`: desktop/mobile size prompt, live depth and
  solid-post screenshots. A real pointer drag changed baseext depth from 3 to
  2 mm and updated the preview; a mobile size prompt also confirmed successfully.

## Bundled default and optional settings source

The workbench now loads a **bundled stock default** automatically: P1S 0.4 nozzle,
Bambu PLA Basic, 0.20mm Standard. No starter project or settings upload is needed.
An existing Bambu project can still be chosen as an optional settings override.
The default was produced by Bambu from installed system presets, contains one
filament, and adds 10,274 bytes. It contains no model, user profile or device data.

The user reported that the default workflow works as intended. The agent's
specific verification remains two actual CLI passes for baseext with this preset;
the printer-switch GUI test was not completed. The UI refinement did not rerun
native GUI tests. Instead, the same real part was selected/exported through the
new interface and its 3MF was **byte-identical** to that earlier round-tripped
default export (SHA-256
`451b013d94f50f0644b85d6c412dd67b31c4df2344aeec7898145525dee08274`).
Local UI evidence is in `artifacts/ui-refinement/`: hover, selection, added and
mobile screenshots, plus `baseext.3mf`. These checks do not close the remaining
controlled layer-comparison or physical-test gates.

The writer copies only project settings and embedded
printer/filament/process settings into a new 3MF. Existing geometry, painting,
cached toolpaths, thumbnails and plates are ignored. It retains the source's
BambuStudio Application marker for recognition and identifies AnchorPaint
as the actual generator in Description. The default is labelled in the UI;
users select their actual printer/material/process in Bambu before slicing.

All parts share source coordinates; one common build translation centers them
on the chosen rectangular bed and moves the original bottom to build Z=0.
An early native candidate kept a zero build translation and appeared outside
the bed. The corrected writer and its bed checks were rerun through Bambu.

See [docs/BAMBU_FORMAT.md](docs/BAMBU_FORMAT.md) for format research and
[README.md](README.md) for commands. Generated local evidence is in:

- `artifacts/export-spike/profile-backed/*.3mf`
- `artifacts/bambu-check/*_pass1.3mf` and `*_pass2.3mf`
- `artifacts/bambu-check/verification.json`
- `artifacts/bambu-check/stock_profile.3mf` — local settings reference

These artifacts are ignored by Git. No user printer profile is bundled in the
application source or production build.

## Release gates and remaining implementation

| Gate | Status |
| --- | --- |
| A: reference export round trip | Core implementation and real CLI round trips pass; ten-target GUI import/slice passes; full comparative toolpath acceptance still open |
| B: geometry from selected STL features | Implemented for narrow primitive scope; 12 reference footprints pass, plus one actual-part boss; broader geometry validation still open |
| C: arbitrary STL → select → preview → multiple anchors → export | Implemented and browser-tested, including hover, base outline, two targets, remove/undo and mobile layout; broader user testing remains |
| D: real-part pilot | Initial baseext isolated-post pilot performed; controlled baseline/manual/generated layer comparison and user acceptance remain open |
| Controlled physical strength comparison | **Not performed** |

Next development work: finish the comparative slicer checks and guided user
pilot and broaden unsupported-case regression
coverage within the declared narrow scope. Fillets, tapering, sloped bases, touching/branching
features, freehand painting, existing painted-project editing and mesh repair
remain outside this first MVP.

The original fixture oracles and their Python-library versions remain in
`fixtures/mesh_validation.json`. They are synthetic references, not results of
automatic feature selection.
