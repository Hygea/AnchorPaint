# AnchorPaint

A local-first development preview for generating aligned slicer modifier volumes.
**Current milestone: local STL loading, click/Smart Fill and aligned export.**
Supports isolated upright round bosses (with optional bore) and rectangular
straight walls on horizontal bases. See [TEST_STATUS.md](TEST_STATUS.md) for
tested behavior and open acceptance gates.

## Run locally

Use Node.js 22.12+ or 24 LTS and a browser with WebGL. No Python or Bambu install
is needed to run the workbench itself.

```powershell
npm install
npm run dev
```

Open the loopback address printed by Vite, normally `http://127.0.0.1:5173`.
For a repeat install use `npm ci`. Dependencies are pinned and locked. After
dependencies are installed, the app needs no Internet connection, account or API.
Files stay on this computer.

## Hosting online

The app builds to a static website. Node.js is used for development and building;
STL parsing, selection, geometry generation and 3MF export run in the visitor's
browser. There is no backend, database or model-upload service to host.

```powershell
npm run build
npm run preview
```

The first command creates `dist/`, the folder to publish. The second previews
that build locally; it is not a production server. The build already uses
relative asset paths (`base: './'`) and has been checked under a
`/modifier-painter/` URL prefix with sample loading, selection and 3MF download.

**GitHub Pages is a suitable simple option.** Put the source in a GitHub
repository, choose **Settings → Pages → GitHub Actions**, and use the
[official Vite deployment workflow](https://vite.dev/guide/static-deploy.html#github-pages)
to install dependencies, run `npm run build` and publish only `dist/`.
Use Node 22.12+ or 24 LTS for that build. GitHub can build future source updates
and publish them automatically. A custom server or domain is unnecessary;
the default address is `https://<owner>.github.io/<repository>/`.
[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
is available with GitHub Free for public repositories. Other static hosts can
serve the same `dist/` folder. No online deployment has been performed yet.

## Try your own STL

1. Open your STL and click a side face. On the first click, a size prompt shows
   its width, depth and height in millimetres. **Confirm & select surface**
   continues that same selection; no second surface click is needed. Go back or
   Esc cancels the prompt. The sidebar checkbox remains an optional alternative.
   If it opens sideways, choose **Model sideways? Set upright** and click the
   flat underside that should sit on the print bed. Drag to see that face if
   needed. This explicitly rotates the whole model in 90-degree steps, clears
   current modifiers, and asks you to confirm its dimensions again. **Original
   orientation** restores the loaded file's orientation. The disk file is never
   changed. Negative/offset coordinates are fine. STL files carry no unit
   metadata; confirmation does not rescale the model.
2. Hover a blue side face to preview its surface, then click it. Review the green
   selection, orange modifier and purple outline at its base.
   The complete footprint, including holes, is derived from STL cross-sections.
   Review the available depth, then **Add modifier** to confirm it. If the
   starting point is ambiguous, use **Pick base surface** and click the flat
   supporting top surface before adding.
3. Adjust **Depth into base** with the slider or number field. The slider uses
   the available local base depth; across several targets it uses the smallest
   limit. It updates shared depth and preview while dragged. A number typed
   beyond the limit stays invalid until you change it. **Advanced options →
   Overlap above base** also has a slider and number field, limited by the
   shortest selected feature's height. Integer wall loops remain adjustable. Add more features;
   all targets share these settings. Remove targets or undo target changes.
4. Export one aligned 3MF. Open it as a project in
   Bambu Studio and select your printer, filament and process. The assembly is centered on the export preset's rectangular printer bed
   with a single shared translation; no modifier needs separate positioning.

No starter project is needed. Export includes clearly labelled stock Bambu P1S
0.4 mm / PLA / 0.20 mm Standard settings. Change to your actual printer and material
in Bambu before slicing. Recheck bed placement after changing printer sizes.
Under **Advanced options → Use my own Bambu settings** you can choose an existing saved
3MF if you prefer your own export presets, and restore the default at any time.
The same optional settings source can be reused for many STL models.

**Or try a sample** loads a single hollow-post example. It uses the same real
selection pipeline and starts without any modifiers. Fixture/reference modes
and baseline export are developer tools rather than choices in the product UI.
The remaining fixture files stay in the repository for automated tests.

The model is solid by default. Blue indicates upright sides that can be checked;
hover is a selection preview, not a promise that a feature is supported. The
geometry check runs when you click, after size confirmation. **See inside** switches to a transparent
view, and **Fit / 3D / Top** help inspect or recover the view. Orange volumes are
shown through the model so their depth is visible. **Esc** cancels a selection;
**Undo** (Ctrl+Z outside text fields) restores target changes. Overlap and surface
fill angle are in Advanced options. Export remains visible at the bottom.

Joined/branching features, irregular walls, tapers, fillets, sloped supporting
bases and broken meshes are rejected. A click on a bore that continues through
the base needs horizontal-root confirmation. The current UI does not
rescale meshes, perform arbitrary-angle rotation, save editing sessions, or
provide a freehand brush. Straight cylindrical shafts can be selected beneath
domed or flared tips. A terminal concave indentation limits upward overlap below
the cap and is shown as **Overlap stops below cap**; the modifier never follows
or fills that indentation. Select the blue cylindrical side, rather than the cap.

**Compatibility mechanism:** a native settings payload is embedded automatically. Actual Bambu
2.8.2.61 GUI testing showed that the profile-free candidate discarded wall-loop
overrides. Native project recognition plus complete settings passes real CLI
save/reopen tests. The output retains the Bambu Application version marker for
recognition and explicitly identifies AnchorPaint as the generator in its
Description. Details: [docs/BAMBU_FORMAT.md](docs/BAMBU_FORMAT.md).

The bundled 10 KB settings asset is generated by Bambu Studio 2.8.2.61 from its
installed system presets with one PLA filament. It contains no geometry, user
project, account or device information. Developer regeneration:

```powershell
npm run profile:build-default
```

Regeneration requires that exact Bambu version and installed stock preset bundle;
normal app use does not require Bambu installed or access to its files.

The settings source is not an existing-project editing feature. Source geometry,
painted data, cached toolpaths, thumbnails and plates are not preserved. Printer
and process settings are reused unchanged, including any existing custom snippets;
review any warnings Bambu itself displays. This app does not generate toolpaths
or change printer G-code.

## Tests and repeatable exports

```powershell
npm test
npm run test:ui
npm run build
```

Unit tests cover all 15 supplied STLs, 12 STL-derived feature footprints against
the reference modifiers, neighbour-based cylindrical selection, root ambiguity,
local support limits, hole-aware indexed extrusion, translated frames, invalid
solids, 3MF coordinate/triangle/setting preservation, and settings extraction.
Browser tests include hover and actual raycast clicks, orbit versus click,
multiple targets, duplicates, remove/undo, base picking, depth limits, download,
unchanged original export coordinates, size-prompt continuation/cancellation/reset,
depth/overlap-slider input/export, native drag isolation and narrow-screen layout. They use installed Chrome. If Chrome is absent,
install Playwright Chromium with `npx playwright install chromium` and set
`channel: undefined` in `playwright.config.ts`.

Generate all three fixture packages using an explicitly chosen native settings
project, then run the **real installed Bambu Studio** round-trip test:

```powershell
npm run spike:export -- "C:\path\to\bambu-settings.3mf"
npm run spike:verify-bambu
```

The default Bambu executable is `C:/Program Files/Bambu Studio/bambu-studio.exe`.
Override executable and input folder when necessary:

```powershell
npm run spike:verify-bambu -- "C:\path\to\bambu-studio.exe" artifacts/export-spike/profile-backed
npm run spike:inspect -- artifacts/export-spike/profile-backed/ten_bosses.3mf
```

Exports are written to `artifacts/export-spike/profile-backed/`. The second tool
imports/saves each file twice, verifies all component geometry and settings, and
writes `artifacts/bambu-check/verification.json`. It accepts only the recorded
Bambu 2.8.2.61 version until the version check is deliberately reviewed.

For the known **failing** profile-free diagnostic only:

```powershell
npm run spike:export -- --diagnostic-no-profile
```

Those packages go to `artifacts/export-spike/diagnostic/` and do not satisfy the
MVP. ZIP/XML correctness alone is not a slicer compatibility result.

The same verifier accepts additional file stems after the folder, for example:

```powershell
npm run spike:verify-bambu -- "C:\Program Files\Bambu Studio\bambu-studio.exe" artifacts/real-part baseext
```

It writes a separate case-specific report so fixture verification is preserved.
The local `baseext` pilot and its limits are documented in
[docs/BASEEXT_PILOT.md](docs/BASEEXT_PILOT.md).

## Project map and next work

- [MVP_SPEC.md](MVP_SPEC.md): intended workflow, strict scope and acceptance gates.
- [CODEX_START.md](CODEX_START.md): original implementation instructions.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): plan, decisions, dependencies and risks.
- [docs/BAMBU_FORMAT.md](docs/BAMBU_FORMAT.md): pinned source research and workaround.
- [docs/TEST_PROTOCOL.md](docs/TEST_PROTOCOL.md): software, layer comparison and print tests.
- [TEST_STATUS.md](TEST_STATUS.md): actual results and remaining work.
- `fixtures/`: synthetic models, known reference modifier meshes, dimensions and
  numerical geometry oracles. These are not reconstructions of a user's part.

Next: finish the controlled baseline/manual/generated slicer comparison and
guided user pilot. The basic selection pipeline is implemented and tested; the
release gate remains open for broader geometry and interaction validation.

The fixture generator is optional developer tooling. It uses Python with numpy,
shapely and trimesh; versions from the original fixture verification are recorded
in `fixtures/mesh_validation.json`. Python is not an application dependency.

Improved printed strength has not been demonstrated. A real-part pilot and
controlled physical comparisons remain separate work.
