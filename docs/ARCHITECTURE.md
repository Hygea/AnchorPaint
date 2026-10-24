# Architecture

AnchorPaint is a static Vite/TypeScript application using Three.js. It has no
backend, account system, upload API, general CSG kernel or UI framework. All
runtime assets are packaged with the app and geometry/export work runs locally.

## Components

| Module | Responsibility |
| --- | --- |
| src/core/mesh.ts | ASCII/binary STL loading, exact-coordinate indexing and mesh validation |
| src/core/selection.ts | Analysis-only tolerance welding, adjacency and neighbour-based Smart Fill |
| src/core/orientation.ts | Explicit proper 90-degree axis rotations from a chosen bed face |
| src/core/anchors.ts | Cross-sections, closed contour/holes, feature association and local support limits |
| src/core/extrude.ts | Closed indexed extrusion, including hole topology |
| src/export/profile.ts | Native settings extraction with size/XML checks |
| src/export/bambu-3mf.ts | ZIP/XML project writer with separate normal/modifier parts and wall overrides |
| src/main.ts | Model, selection, settings, target history and browser workflow |
| src/viewer.ts | Display groups, raycasts, orbit handling and event-driven rendering |

## Geometry pipeline

1. Load STL vertices and triangle indices through Three's STLLoader. Reject
   non-finite, degenerate, open, inconsistently wound or non-positive meshes.
2. Build welded adjacency separately from the loaded export geometry. Smart Fill
   compares neighbouring dihedral angles so it can wrap a complete cylinder.
3. Identify an upright side region and propose the horizontal supporting root.
   Ambiguous cases require an explicit base-face click.
4. Slice at non-critical Z levels, stitch closed contours, classify holes and
   associate the selected feature. Accept only the documented primitive scope.
5. Check a constant section above the root and supporting material below the
   entire hole-aware footprint. Limit depth locally, not by model-wide minimum Z.
6. Extrude the footprint from root minus depth to root plus overlap. Cap and side
   vertices share exact indices so every indexed edge has two triangle uses.
7. Export original and modifier parts in one shared frame with one common bed
   translation. Source model coordinates are never recentered per modifier.

Polygon-clipping supplies 2D difference/intersection/XOR checks. It is not a 3D
boolean kernel. Sections that are ambiguous, too complex or outside the supported
scope are rejected rather than silently repaired.

## Orientation and shaped caps

Camera Fit/Top/3D and orbit do not change the build frame. **Set upright** applies
one of six proper signed-axis permutations to the entire working mesh, preserving
scale, winding and triangle order. It resets confirmation, selections and targets;
an in-memory original supports restoration. Arbitrary-angle rotation is unsupported.

For a constant cylindrical shaft beneath a shaped tip, the modifier uses the shaft
footprint. A terminal concave interior change may limit overlap below the cap if
the outer contour stays constant and at most one hole is present. Outer changes,
returning sections, tapers, root fillets and joined/branching features are rejected.
The modifier never follows or fills the curved cap itself.

## Interaction and display

An unconfirmed side click opens the size dialog and retains that exact pending
face/revision until confirmation. Cancellation or replacement discards it. Hover
can run before confirmation; a drag returning to its start remains a drag.

Depth/overlap are independent shared settings. Sliders use the minimum applicable
limits across the candidate and all added targets. A new valid candidate fits
out-of-range initial settings; later typed invalid values remain visible errors.
Frame-throttled slider updates disable Add/Export until committed. Remove/undo
operates on serializable anchor records; editing sessions are not saved.

Source, selection, hover, modifier and root outlines have separate display groups.
Blue identifies upright sides, teal marks selection, orange shows the modifier
and purple marks the root. Orange fill/edges render above selection overlays.
These colors and transparency never alter export meshes. Replaced geometry and
materials are disposed; hover regions are cached and rendering is event-driven.
Native internal drags are blocked; STL drop feedback requires a file transfer.

## Native project export

The writer creates separate normal_part and modifier_part resources under one
assembly and stores wall_loops on modifiers. A usable native Bambu settings
payload and Application version marker select the project import path. Native
profile-free probes retained geometry but lost GUI wall overrides, so they are
not a product fallback. Description identifies AnchorPaint as the actual writer.

Stock settings load automatically; a custom native project can supply settings.
Existing models, painting, thumbnails, cached toolpaths and plates are ignored.
Printer/process/filament templates are reused unchanged. Bed checks currently
support rectangular areas with a shared centering translation and exclusions.
See [format findings](BAMBU_FORMAT.md) and [licensing](LICENSING.md).

## Static hosting and verification

Relative Vite asset paths preserve both local root hosting and /AnchorPaint/.
The production test serves built files at that prefix and checks asset loading,
real selection/preview/download, source/license availability and absence of model
uploads. CI uses Node.js 24; PRs build/test, while main push/manual runs may deploy
only dist/ through the github-pages environment. Permissions and official-action
pins are recorded in the workflow. [Deployment guide](DEPLOYMENT.md).

## Limits

- STL units require confirmation; Three's STLLoader uses float32 coordinates.
  Round-trip guarantees apply to loaded data, not arbitrary higher-precision input.
- Edge manifoldness and signed volume do not establish absence of self-intersection.
  Analysis welding does not relax source validation or repair meshes.
- Tiny features, many section levels, sloped bases and unresolved boundaries may
  be conservatively rejected. General solid-containment proof is not implemented.
- Parsing, geometry and ZIP generation are synchronous with input size limits.
  Browser workers may be appropriate if future measured workloads require them.
- Slicer metadata and settings are version-dependent. Current evidence is in
  [TEST_STATUS.md](../TEST_STATUS.md); physical strength remains unverified.
