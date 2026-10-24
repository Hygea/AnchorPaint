# AnchorPaint - MVP build specification

Status: MVP specification; export-first implementation in progress. See TEST_STATUS.md.
Date: 2026-10-23. First tested Bambu Studio version: 2.8.2.61; other versions unverified.

## 1. Outcome

Select the side surface of an upright boss or wall, specify a depth into its
supporting base, and create a separate settings-modifier volume automatically.
Repeat for ten features without entering positions, diameters, or dimensions.
Export one file that opens in Bambu Studio with the modifiers in place.

Success means less manual geometry placement. Improved printed strength is a
separate hypothesis, not a claim made by the software.

## 2. Non-negotiable design decisions

- Do not boolean-union an entirely internal volume into the original mesh.
  That leaves the boundary unchanged and does not encode a settings region.
- Do not add artificial voids, duplicate internal faces, or non-manifold shells
  to trick the slicer. Do not generate or modify printer G-code.
- Keep the original printable geometry and modifier meshes separate.
- Anchor direction is negative build Z, NOT the selected surface normal.
  Selecting a cylinder's side must not produce a radial inward extrusion.
- Use a closed feature cross-section, including holes, not a flat selected
  surface. Surface selection identifies the feature; it is not the volume.
- Bambu-compatible 3MF export is an acceptance gate, not a cosmetic extra.
  A generic 3MF with extra printable bodies is not a successful export.
- Do not claim a stronger part merely because internal perimeter paths appear.

## 3. Narrow first release

Input: one valid STL interpreted in millimetres with explicit dimensions
confirmation. Normally it is already oriented for printing. Per the user's
2026-10-24 servo-adapter request, an explicit Set upright action may rotate the
whole working mesh by an axis-aligned 90-degree rotation from a chosen bed face.
This resets targets and confirmation; the original file is retained. General
rotation/scaling, existing painted 3MF project import, STEP and OBJ import remain
out of scope.

Supported geometry: upright cylindrical bosses, hollow bosses, and straight
walls of constant cross-section on a horizontal base. Multiple targets may
share settings. Reject or require clarification for tapering, curved roots,
fillets at the root, sloped bases, touching/branching features or broken meshes.
An isolated straight shaft below a domed/flared cap is supported. A terminal
concave indentation may limit upward overlap below the cap; modifiers never
follow curved cap geometry or extend into that indentation.

Interaction: rotate/zoom the model, then click a side surface. Smart Fill grows
across edge-adjacent triangles using the dihedral angle between neighbours, not
only comparison to the first normal. Otherwise it cannot wrap a cylinder.
Stop at sharp feature boundaries; display the selection before adding it.

The app proposes a root height. If the root or footprint is ambiguous, ask for
one click on the horizontal base face. Do not silently pick a guessed root.
Expose depth and upward overlap in millimetres, integer wall count, fill-angle
threshold, add/remove/undo, and one common profile for several selections.
Suggested UI examples: depth 3 mm, overlap 1 mm, wall loops 4. These are test
values, not universal printing recommendations.

Preview the entire generated modifier translucently, with an optional section
view. Show the root plane, depth limits, count of targets, and unsupported cases.
The initial version is click/Smart Fill, not a freehand 3D brush.

## 4. Geometry pipeline

1. Parse STL, validate finite coordinates/scale, and construct a welded adjacency
   representation without mutating the original export geometry.
2. Raycast to a triangle and grow the candidate side-surface region.
3. Identify and confirm the horizontal wall-to-base root plane z_root.
4. Intersect the original mesh with a plane just ABOVE the root. Use a numerical
   tolerance related to model scale and resolve vertex/coplanar degeneracies.
5. Stitch closed contours, classify outer loops and holes, and identify the
   connected cross-section associated with the selected surface. An open wall
   face alone does not define its thickness; this section provides it.
6. For footprint F, create an extrusion from z_root - depth to z_root + overlap.
   Keep it separate from the printable mesh. Preserve the hole topology.
7. Check feature-height and depth limits. Warn about local cavities, neighbouring
   features and sections extending outside the supporting base. Do not mistake
   the model-wide minimum Z for a valid local base thickness.
8. Keep all targets in a shared source coordinate system; apply any display
   transform consistently and never recenter each modifier independently.

Store anchors as serializable records: id, selected region/seed, root plane,
footprint loops, depth, overlap, wall settings, and shared model transform.
Geometry and export code must be callable without the UI for testing.

## 5. Export contract

First implement a small round-trip spike using the supplied reference meshes.
Inspect a project saved by the user's Bambu Studio with a manually placed
modifier, plus the official importer/exporter code. Record the tested version.

Write one new 3MF containing the original model and separately identified
settings modifiers, their transforms, and their wall-loop overrides. Preserve
relative positions and holes. Bundle a clearly labelled stock default so users
can export without preparing a settings project, then choose their printer,
filament and process in Bambu Studio. Keep a custom settings-project override
optional. This follows the user's clarified workflow. Do not overwrite an input.

The output must open with the generated regions identified as modifiers, not
as new printable objects. Settings must still exist after save/reopen. Validate
in the actual slicer, not only by checking XML syntax or ZIP contents.

STL export of modifiers is useful for diagnostics, but a workflow that requires
manually repositioning ten STLs does NOT satisfy this MVP's usability goal.
If 3MF needs a compatibility workaround, report that clearly before polishing UI.

## 6. Implementation recommendation

Local browser app: TypeScript + Vite + Three.js, a ZIP/XML library for 3MF,
Vitest for geometry/export tests and Playwright for the interaction flow.
No accounts, hosted backend, model uploads or API calls in the app.
Three.js provides STL loading, picking and extrusion; adjacency, contour
classification, anchoring rules and Bambu export still require implementation.
Pin and lock dependencies. Do not add a general CSG kernel unless needed.

## 7. Build order and release gates

A. Export spike: known original + modifier -> 3MF -> Bambu Studio. Record
modifier type, transforms, overrides and per-layer toolpaths. Block compatibility
claims until this passes; UI work may continue with the gate visibly unresolved.

B. Geometry: derive the modifier from a selected feature on the fixtures. Check
closed meshes, loop/hole topology, dimensions and coordinate preservation.

C. Interaction: STL -> select -> preview -> multiple targets -> export. No manual
coordinate entry. Include useful rejection messages, undo and a runnable demo.

D. User pilot: one actual part, then ten bosses. Compare baseline, manually made
modifier and automatically generated modifier in the same slicer/profile.
Only then run controlled physical tests for the strength hypothesis.

Release requires passing A-C plus a documented real-part pilot, or explicit
pre-release labeling for any gate still open. Maintain a truthful TEST_STATUS.md.
