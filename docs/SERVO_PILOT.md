# Capped-pin orientation validation case

Date: 2026-10-24. Private input mesh; not distributed.

A closed 2,116-triangle servo-adapter mesh exercised a 3.05 mm straight pin shaft
beneath a shaped tip. Its pin pointed along source -X; camera orbit alone could
make it look upright while leaving the build axis wrong.

## Explicit orientation and geometry

Selecting the flat bed face applied the proper rotation [x,y,z] → [z,y,-x] to the
whole working model. Dimensions became 8 × 24.525 × 7 mm, with volume unchanged
at 634.838647 mm³. Exported original vertices and triangle order matched that
explicit rotation.

The shaft had 2 mm local base support and 3 mm of constant height above the root.
The browser selected that shaft and exported depth 1.5 mm, overlap 2 mm and wall
loops 4. Its modifier was closed, consistently wound, 284 triangles and
25.539133 mm³. Shared bed placement put it at build Z=0.5–4 mm.

The initial depth 3 mm exceeded the local base. The new-selection fitting behavior
now reduces it to 2 mm before the first preview, while later typed values above
the limit remain errors. Synthetic capped-pin regression meshes cover domed,
flared and terminal concave caps; overlap stops below an unsupported indentation.

## Native Bambu Studio 2.8.2.61

Two real CLI import/save cycles retained types, wall overrides, volume, bounds
and reconstructed geometry. A second-cycle timeout on an initial run was kept
separately; the final sequential retry passed. Native GUI slicing/layer comparison
and physical tests have not been performed for this case.

Local evidence remains under ignored artifacts/servo-pilot and artifacts/bambu-check.
[Overall test coverage](../TEST_STATUS.md) · [Orientation design](ARCHITECTURE.md)
