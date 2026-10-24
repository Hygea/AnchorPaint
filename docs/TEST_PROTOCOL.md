# Acceptance and print-test protocol

## Software checks

1. Preserve the original geometry; verify bounds, hole dimensions and coordinates.
2. On single_boss, derive an annular footprint. Reference root = 4 mm; depth =
   3 mm; upward overlap = 2 mm, hence modifier Z range = [1, 6] mm.
3. On straight_wall, select one long side but recover the complete rectangular
   wall footprint, not a zero-thickness plane or the whole base.
4. On ten_bosses, create ten independent modifiers without entering coordinates.
   Export/reimport and verify all ten relative placements and wall overrides.
5. Check every modifier has finite coordinates, a positive volume, a closed
   watertight mesh, consistent winding and correct holes.
6. Show errors for unsupported/ambiguous selections; do not silently repair
   geometry, cap holes, recenter individual volumes or change print orientation.
7. Test different Smart Fill thresholds and a translated model. Add rotated
   source-mesh handling only with an explicit, tested build-frame transform.

## Bambu compatibility: gate still open

Real Bambu 2.8.2.61 CLI import/save/reopen checks now exist. Their exact scope,
the bundled/default settings mechanism, GUI findings and remaining layer checks
are recorded in ../TEST_STATUS.md. The steps below remain the acceptance protocol.

Record Bambu Studio version, printer/nozzle, process profile, layer height,
wall generator, global wall count and modifier wall count. Use a modifier count
that differs from the global count when testing the reported internal-wall effect.

Open the new 3MF as a project. Confirm each added volume is a settings modifier
and that the original exterior and through-holes remain unchanged. Save/reopen.
Inspect individual layers below the root, at the root and above it; distinguish
actual new perimeter paths from paths around an already existing bore.

Compare three cases with otherwise identical settings: baseline without modifier,
manual modifier, automatically generated modifier. Check for unwanted internal
interfaces, gaps, loss of solid infill, or perimeter paths that fail to continue
through the root. Capture section screenshots and record any difference.

Passing this gate establishes workflow/toolpath equivalence only, not strength.

## Physical comparison: currently NOT tested

Print at least three specimens per case with the same filament batch, orientation,
printer, layer settings and conditioning. Apply load at the same lever arm using
a consistent fixture. Record failure load, failure location, mass and print time.
Avoid uncontrolled hand snapping as the only measurement. Compare scatter, not
just the best specimen. More internal walls can introduce a weak interface;
report negative or neutral results as well as improvements.

## Original fixture verification

The synthetic STL fixtures are generated locally. Their watertightness, winding,
bounds and expected volume were checked with trimesh; numerical results are in
fixtures/mesh_validation.json. No application, 3MF export, Bambu slicing or
mechanical performance had been tested when the original handoff was prepared.
Application and export implementation results are now maintained in
../TEST_STATUS.md; do not treat this historical fixture note as current status.
