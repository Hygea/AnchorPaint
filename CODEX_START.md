# First implementation task

Read MVP_SPEC.md, docs/TEST_PROTOCOL.md, docs/SOURCES.md and fixtures/manifest.json.
Build a local AnchorPaint prototype. This directory began as a specification
and validated synthetic reference meshes. Milestone A and the basic B/C selection
pipeline are now present; read
README.md and TEST_STATUS.md for current progress before continuing this handoff.

Start with the export round-trip spike. Use the reference original and modifier
meshes to write the smallest Bambu-compatible 3MF with separate modifier semantics,
shared coordinates and wall-loop overrides. Inspect actual Bambu output/source;
do not guess the metadata schema or say that a valid ZIP proves compatibility.

If a user-saved Bambu project is available, use it as a reference fixture and
record the version. If not, proceed with schema/unit tests and clearly mark the
actual Bambu import-and-slice gate as unverified. Do not claim it passed.

Then implement the geometry core and a TypeScript/Vite/Three.js UI. Support
upright hollow bosses and straight walls on a horizontal base, selected by
click/Smart Fill. Obtain a complete closed footprint from a cross-section just
above the selected root, and extrude a separate modifier along build Z. Do not
boolean-union it into the printable mesh or use thin voids as a workaround.

Implement multiple targets with shared depth/overlap/wall settings, preview,
undo/remove, validation and one aligned 3MF export. Arbitrary freehand paint,
fillets, sloping bases and existing painted-project preservation are not required.

Deliver source, package lock, clear local run instructions, fixtures, automated
geometry/export/UI tests and TEST_STATUS.md separating what was actually tested
from what is inferred or still awaiting Bambu/physical validation.
Do not add accounts, cloud storage, telemetry, AI API calls, or slicer forks.
