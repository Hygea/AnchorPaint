# First actual-part pilot: baseext.stl

Date: 2026-10-23. Development test; complete MVP acceptance remains open.

## Input and supported target

User-provided file: `baseext.stl`.
SHA-256: `57448f0fea23e9e2d2c5a8247a10e786f767d8db5f45052450c243eddb084789`.
The source was read without modification and is not bundled in the browser app.

- 2,758 triangles; closed-edge/winding/positive-volume validation passed.
- Dimensions: 61.942139 × 43.284271 × 20 mm.
- Bounds: [92.199997, 138.057861, -20] to [154.142136, 181.342133, 0].
- Base top/root Z=-15 mm, bottom Z=-20 mm; local support depth 5 mm.
- The isolated post is centered near [99.7, 159.7], outer diameter 8 mm,
  bore diameter approximately 2.7 mm, height above base 15 mm.
- The other post near [139.7, 159.7] joins a large wall. Its complete section is
  irregular. Selection is rejected by the current primitive scope rule; the
  app does not invent a cylindrical boundary inside that connected component.
  A browser check clicked the joined wall, followed its ambiguous-root prompt,
  clicked the horizontal base, and confirmed the irregular-footprint rejection
  with Add disabled.

## Workflow actually exercised

Loaded the user's STL through the browser file input and explicitly selected the
existing local stock P1S settings reference. This was a development test choice,
not an automatic product default or a claim about the user's intended printer.
An actual raycast click selected the isolated post (288 triangles), Smart Fill
grew the surface, and sections derived the footprint. No fixture loops or manually
entered center, radius or root were supplied. Reviewed the root, added the target,
confirmed dimensions and exported through the UI.

Test values: depth 3 mm, overlap 2 mm, wall loops 4. The footprint has an outer
loop and one bore loop, area 44.483414 mm². Modifier volume 222.417071 mm³;
bounds [95.699997, 155.699997, -18] to [103.699997, 163.699997, -13].
After common bed placement, the model bottom is Z=0, root Z=5 and modifier
Z=2..7 mm. The original and modifier remain separate volumes.

## Actual Bambu verification

Bambu Studio **2.8.2.61**. Bambu Lab P1S 0.4 nozzle, 0.20mm Standard @BBL X1C,
0.2 mm layers, Classic wall generator, global walls 2, modifier walls 4.
First filament Bambu PLA Basic; other unused filament slots are in the source.

- Final indexed export imported/saved **twice through the real CLI**. One normal
  part and one `modifier_part`, names, wall loops, every reconstructed vertex and
  triangle index, volume and common placement were checked after both passes.
- Direct GUI import in a separate test instance showed the aligned modifier.
  Selected modifier displayed wall loops **4** with an override indicator.
- Clicked Slice plate: **Slice ok**, **100 layers**, 20 mm height. No printer
  command, upload or print was initiated.
- An earlier non-indexed extrusion displayed orange mesh-warning icons. Three's
  cap/side data had coincident positions but separate vertex indices. Exact
  indexing of generated coordinates removed those visible warning icons in a
  fresh GUI import. No repair or geometry movement was performed. Regression
  tests now require two uses of every actual indexed edge.
- Two CLI runs timed out during concurrent GUI test startup. The final sequential
  retry completed both passes. The harness records failures and uses a 120-second
  per-process timeout. The final case-specific report is passing.

Local ignored evidence:

- `artifacts/real-part/baseext.3mf`: final browser-exported indexed modifier test.
- `artifacts/real-part/baseext_baseline.3mf`: original/settings without a modifier.
- `artifacts/real-part/baseext_indexed.3mf`: byte-identical copy for a distinct GUI title.
- `artifacts/real-part/baseext-selected.png`: selection/preview screenshot.
- `artifacts/bambu-check/baseext_pass1.3mf`, `baseext_pass2.3mf`.
- `artifacts/bambu-check/baseext-verification.json`: final actual CLI results.

Repeat without overwriting the original fixture report:

```powershell
npm run spike:verify-bambu -- "C:\Program Files\Bambu Studio\bambu-studio.exe" artifacts/real-part baseext
```

## Still open

The user has not yet performed the guided interaction pilot. The joined post/wall
is unsupported. Baseline versus manual versus generated layer comparisons,
a separate final GUI save/reopen and physical strength tests were **not done**.
The prepared baseline is not evidence of toolpath equivalence or strength.
The subsequent UI refinement adds a purple footprint outline at the root,
base height relative to the model bottom, solid side-face shading and hover
selection. A new browser export of this part is byte-identical to the previous
bundled-default export that passed real CLI checks. Broader unsupported-case
tests and the controlled comparisons above remain work.
