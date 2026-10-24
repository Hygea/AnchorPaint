# AnchorPaint

Create aligned slicer modifiers by selecting surfaces on an STL. Choose a post
or wall, set how far the modifier extends below and above its base, and export
one 3MF with the model and modifiers already positioned.

**v0.1.0 · First experimental release**

[Open AnchorPaint](https://hygea.github.io/AnchorPaint/)

[v0.1.0 release notes](https://github.com/Hygea/AnchorPaint/releases/tag/v0.1.0)
record the first tested public version. The hosted app follows main and may
receive later updates; the release tag preserves this version's source.

AnchorPaint runs in your browser. No installation, account or backend is required
for the hosted app. STL processing and 3MF generation happen on your computer.

## Quick start

1. Open an STL, or try the included sample.
2. If the model is sideways, use **Set upright** and choose its flat underside.
3. Click a blue side surface and confirm the dimensions in millimetres.
4. Set **Depth into base**, **Overlap above base** and **Walls in modifier**.
   Review the orange volume and purple base outline, then **Add modifier**.
5. Repeat for more features and **Export 3MF**. Open it as a project in your
   slicer, choose your printer and material, and inspect the sliced layers.

[Detailed usage](docs/USAGE.md)

## Supported geometry

- Isolated upright round posts, solid or with a bore.
- Straight rectangular walls on horizontal bases.
- Straight pin shafts beneath supported domed, flared or concave caps.
- Multiple modifiers sharing depth, overlap and wall settings.

Tapered features, filleted roots, sloping bases, joined/branching features, mesh
repair and freehand painting are outside this version's scope. Modifiers are
settings regions; they do not reshape the original model or guarantee strength.
See [scope and design](MVP_SPEC.md).

## Slicer compatibility

| Slicer | Test coverage |
| --- | --- |
| Bambu Studio 2.8.2.61 | Repeated native import/save checks and selected GUI import/slicing checks. Full comparative layer and physical testing remain open. |
| OrcaSlicer 2.4.2 portable | Maintainer-reported placement, wall overrides and slicing test. Import produces a shell-setting conversion warning; save/reopen is unverified. |
| PrusaSlicer and other versions | Untested. |

Orca replaces the stock preset's enabled vertical-shell-thickness value with
ensure_all. This affects solid infill near sloping surfaces, so identical
slicing is not promised. [Verification details](TEST_STATUS.md).

## Privacy

Files selected in AnchorPaint are read in browser memory; the application does
not upload models or settings. There are no accounts, analytics, remote fonts
or tracking requests. The website downloads its own code, sample and preset
from its host. GitHub Pages handles normal site requests under its
[privacy practices](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).

## Development

Use Node.js 22.12+ or 24 LTS and a browser with WebGL.

    npm ci
    npm run dev

Open the local address printed by Vite, normally http://127.0.0.1:5173/.

    npm test
    npm run test:ui
    npm run build
    npm run test:site

The build creates a static site in dist/. The Pages workflow uses Node.js 24,
checks geometry/exports and the production browser flow, then deploys a passing
main build. Pull requests build and test without deploying.

[Development guide](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Deployment](docs/DEPLOYMENT.md) · [Contributing](CONTRIBUTING.md) ·
[Changelog](CHANGELOG.md)

## License and credits

AnchorPaint's original code, documentation and synthetic fixtures are
[MIT licensed](LICENSE). The bundled stock Bambu preset and source templates
retain their separate upstream AGPL-3.0 terms. Their full license and editable
sources are included with the site. JavaScript libraries retain their own
licenses. [Credits and license scope](NOTICE.md) · [Preset provenance](docs/LICENSING.md).

AnchorPaint is an independent project and is not affiliated with or endorsed by
Bambu Lab, OrcaSlicer or Prusa Research. Imported models retain their owners' rights.
