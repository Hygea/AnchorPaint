# Hollow-post validation case

Date: 2026-10-23. Private input mesh; not distributed.

A closed 2,758-triangle part with dimensions 61.942 × 43.284 × 20 mm exercised
selection outside the synthetic fixtures. It contained an isolated hollow post
and another post joined to a wall. Offset XY and negative source Z were retained.

## Geometry and interaction

The isolated post had an 8 mm outer diameter, approximately 2.7 mm bore and 5 mm
of supporting base. A real browser raycast selected its side; sections derived
the footprint without supplied contour, center, radius or root coordinates.
The joined post/wall was rejected as an irregular complete section after base
confirmation. No cylindrical boundary was invented inside the joined footprint.

At depth 3 mm, overlap 2 mm and wall loops 4, the modifier's footprint area was
44.483414 mm² and volume 222.417071 mm³. A single common bed translation put the
model bottom at Z=0, root at Z=5 and modifier at Z=2–7 mm.

## Native Bambu Studio 2.8.2.61

Two real CLI import/save cycles retained normal/modifier types, wall override,
volume, bounds and every reconstructed vertex/index. Direct GUI import displayed
wall loops 4 and slicing succeeded at 100 layers. A separate bundled-default
export also passed two cycles; a later UI-refinement export was byte-identical.

An earlier non-indexed generated mesh showed warning icons. Shared exact indices
for cap/side vertices removed them; no mesh repair or source movement was used.
Concurrent-startup CLI timeouts were recorded before a passing sequential retry.

These checks do not establish controlled baseline/manual/generated layer
agreement, a separate final GUI save/reopen, printer-profile switching or strength.
No print command or physical test was performed. Local evidence remains under
ignored artifacts/real-part and artifacts/bambu-check.

[Overall test coverage](../TEST_STATUS.md) · [Protocol](TEST_PROTOCOL.md)
