# Servo-adapter pin pilot — 2026-10-24

Input: user-provided `Servoadapter bot34.stl`, 105,884 bytes, 2,116 triangles.
SHA-256: `a009809b822957f986557810a4a0e576a1bd58eb675c6810bad39f8805b36042`.
The user STL is kept outside the source repository; synthetic capped-pin meshes
provide portable automated regression tests.

The source bounds are X=10.420025–17.420025, Y=-21.202641–3.322359,
Z=-34.839451–-26.839451 mm. Its pin points along **-X**, whereas selection and
anchor extrusion use build +Z. This explains why the initial click followed
surfaces unrelated to the shaft when the camera merely made it look upright.

The new **Set upright** operation chooses the flat bottom face at source
X=17.420025 and explicitly rotates the full working mesh by
`[x, y, z] → [z, y, -x]`. Working dimensions become 8 × 24.525 × 7 mm.
There is no scale change; volume remains 634.838647 mm³. Every exported original
vertex and triangle was compared against that exact proper rotation.

After size confirmation, clicking the cylindrical side derives an isolated
3.05 mm diameter footprint. Its root is Z=-15.420025, its straight shaft ends
at -12.420025, and the available base depth is 2 mm. The shaped tip is above
that shaft and does not enter the footprint/overlap calculation. Default depth
3 mm is visibly invalid for this base; the tested value was 1.5 mm.

The actual browser export used depth 1.5 mm, overlap 2 mm and wall loops 4.
Its modifier source-frame bounds are:

- X=-32.364452–-29.314451 mm.
- Y=-0.727641–2.322359 mm.
- Z=-16.920025–-13.420025 mm.

Modifier volume: 25.539133 mm³; 284 triangles, closed with consistent winding.
With the original bottom placed on the print bed, this occupies build Z=0.5–4 mm.
Evidence is in local `artifacts/servo-pilot/verification.json`, `servo_adapter.3mf`
and `anchorpaint-servo.png`. These are browser/structural checks, independent of
the native Bambu results recorded in `../TEST_STATUS.md`. No physical print or
comparative strength test has been performed for this part.

The renamed AnchorPaint export subsequently passed two real Bambu Studio
2.8.2.61 CLI import/save cycles. Normal/modifier types, wall loops, names, volume,
bounds and every reconstructed coordinate/index were preserved. An initial
second-cycle timeout is retained separately; the final sequential retry exited
successfully. Reports and saved passes are under `artifacts/bambu-check/`.
This is not a native GUI slicing or layer-comparison result.
