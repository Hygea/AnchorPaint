# Using AnchorPaint

## Load and orient a model

Open a valid STL or choose the included hollow-post sample. STL has no unit
metadata, so AnchorPaint asks you to confirm the displayed size in millimetres
before selecting a surface. Confirmation does not rescale the file.

The printing axis is +Z. Orbiting the camera only changes the view. If the
feature points sideways, choose **Set upright** in the viewport and click the
flat underside that should sit on the bed. The whole working mesh rotates in
90-degree steps. This clears selections/modifiers and resets size confirmation.
**Original orientation** restores the loaded frame; the file on disk is unchanged.

## Select a supported surface

Blue faces are upright sides. Hover previews the connected surface; click to
check its geometry. Choose the shaft's side beneath a shaped cap, rather than
the cap itself. Unsupported features show an explanation instead of a modifier.

The purple outline marks where the feature meets its supporting base. If that
height is ambiguous, use **Pick base surface** and click the flat base next to
it. A bore continuing through the base commonly needs this extra click.

## Set the modifier

- **Depth into base:** distance below the purple base outline. Its limit is the
  thickness of supporting material beneath the whole footprint.
- **Overlap above base:** distance upward into the selected feature. It stops
  before an unsupported cap or cross-section change.
- **Walls in modifier:** the slicer's local wall-loop override.

Depth and overlap are independent. New selections fit values that exceed their
available ranges; already valid values are kept. Later typed values outside the
range remain errors until corrected. Sliders and precise number fields stay in sync.

Review the orange volume and select **Add modifier**. Repeat for other supported
features. All added modifiers share the settings and therefore use the smallest
available limits. Remove an entry or use **Undo** to restore a target change.

**See inside** changes transparency. **Fit**, **3D** and **Top** change the camera.
Drag to orbit, scroll to zoom, and press Esc to cancel the current selection.
Advanced options contain the surface fill angle and optional export settings.

## Export to a slicer

Export one 3MF and open it as a project. Original geometry and modifiers remain
separate parts of one assembly, with a shared placement on the printer bed.
No modifier needs separate alignment.

The built-in default contains stock P1S 0.4 mm / PLA / 0.20 mm Standard settings.
Choose your actual printer, filament and process before slicing, and recheck bed
placement if the printer size changes. An existing native Bambu settings project
can be selected under **Advanced options → Use my own Bambu settings**. Only its
settings are reused; existing models, painting, plates and toolpaths are ignored.

The specific P1S preset is a convenient default, not a requirement of the geometry
algorithm. The current Bambu export needs a native settings payload to preserve
modifier overrides reliably. Removing it failed native acceptance checks; a
profile-free export is not shipped as a compatible alternative.

Inspect the sliced layers through the modifier's lower and upper bounds before
printing. The app does not generate G-code, send print jobs, repair arbitrary
meshes or establish a strength improvement. [Slicer test coverage](../TEST_STATUS.md).
