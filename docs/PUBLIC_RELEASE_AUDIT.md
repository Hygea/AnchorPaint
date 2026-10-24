# Public-release audit — 2026-10-24

Scope: the current source, bundled sample/preset, npm lockfile and six existing
main-line commit diffs through `ccefef4d9d41ddae858ded44f0374970984727c2`.
Repository metadata confirms `Hygea/AnchorPaint` is private with default `main`.
The local folder is not a Git checkout; preparation is committed through GitHub
on a separate review branch. No visibility change, history rewrite, tag, release
or public deployment was authorized by this preparation task.

## Publication decisions still required

| Finding | Status and required owner decision |
| --- | --- |
| Original-code license absent | Approve a license and copyright holder before describing the project as open source. MIT is recommended for independently authored code if permissive reuse is intended; it does not cover the Bambu asset. No LICENSE or package license declaration was added. |
| Bundled Bambu preset redistribution | **Publication blocker.** Establish permission and applicable attribution/source/license obligations for the generated preset and included templates before distributing it publicly. Do not treat the dependency notices as clearance. |
| Personal path in Git history | Current pilot documentation is redacted, but the original upload commit retains a personal username and Downloads path. Owner must approve disclosure or arrange a reviewed history cleanup before public visibility. No force push was performed. |
| Fixture/pilot publication rights | Fixtures are synthetic and have a regeneration script; actual user STL files are not committed. Owner should confirm authority to license the supplied/generated fixtures and publish the remaining case descriptions, filenames and hashes. |

These are decisions about publication, not reasons to change the working export
algorithm. All safe deployment preparation can be reviewed while the repository
stays private. See [DEPLOYMENT.md](DEPLOYMENT.md) for activation steps.

## Security and privacy findings

- Focused scans of source/docs/configuration and the six retrieved commit diffs
  found no high-confidence GitHub/AWS credentials or private-key material. No
  `.env`, account database, application secret or private printer profile is in
  the upload. This is a focused repository audit, not a guarantee against every
  secret pattern or uninspected branch. `.env*`, build output, dependencies and
  local evidence stay ignored.
- `docs/BASEEXT_PILOT.md` contained a private user directory. The source now names
  only the pilot file; older commit content remains accessible in repository
  history. Generic `C:/Program Files/…` executable examples are software install
  locations, not private user paths, and are retained. Old `/modifier-painter/`
  references in dated verification history describe actual earlier tests and
  remain historical; current deployment instructions use `/AnchorPaint/`.
- Actual `baseext.stl` and servo-adapter STLs are outside the repository. The
  shipped sample is `fixtures/single_boss.stl`, generated synthetic geometry.
  STL headers and the preset archive were inspected for private paths/account
  fields; none were identified. The preset contains only model metadata and
  `Metadata/project_settings.config`, no source geometry or device/account data.
- Source review finds two application fetches: the packaged sample STL and the
  packaged default 3MF. Local STL and optional settings inputs use
  `File.arrayBuffer()`. Parsing, adjacency/contours, extrusion and ZIP/XML export
  execute in browser code; downloads use a Blob/object URL. There is no upload
  request, analytics, remote font, API endpoint, WebSocket, beacon or account flow.
  No external-entity resolution request was found in the app's XML path; settings
  XML rejects DOCTYPE/ENTITY declarations.
- Production browser acceptance monitors request destinations/methods and console
  errors through sample loading, selection, preview, 3MF download and private
  STL/settings selection. It requires same-origin GET requests under the project
  prefix and no missing assets. These checks support the local-processing claim
  for the tested flow, not a promise about browser extensions or modified builds.
- A hosted visit necessarily downloads site files. GitHub states it logs visitor
  IP addresses for security. That ordinary hosting traffic is distinct from
  model uploads. [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).
- `npm ci` completed with zero reported dependency vulnerabilities on this date.
  The first attempt hit a Windows lock held by the running dev server; stopping
  that project's Vite/build helper allowed a successful clean retry. The local
  preview was restarted. No dependency version or lockfile change was required.

## Third-party code and resources

The runtime lockfile includes 13 packages. Twelve declare MIT; robust-predicates
declares Unlicense. Three.js includes Mapbox Earcut 3.0.2 under ISC, used during
cap triangulation. Full license/copyright notices for these 14 entries are in
`public/THIRD_PARTY_NOTICES.txt`; Vite copies it into the deployed artifact. This
is not a license grant for AnchorPaint's original code or the Bambu preset.

| Components | Recorded terms/source |
| --- | --- |
| three 0.186.1, fflate 0.8.3, fast-xml-parser 5.11.2, polygon-clipping 0.15.7 | MIT texts from the installed pinned packages |
| @nodable/entities 3.1.0, anynum 1.0.1, fast-xml-builder 1.3.1, is-unsafe 2.0.2, path-expression-matcher 1.6.2, splaytree 3.2.3, strnum 2.5.1, xml-naming 0.3.0 | MIT; package license files or splaytree README. Entities omits a license file in npm; upstream LICENSE at commit b89ecb0d419969e2989b74c5304bc9b66931727e supplies its notice. |
| robust-predicates 3.0.3 | Unlicense, installed package LICENSE |
| Mapbox Earcut 3.0.2 inside Three.js | ISC, upstream v3.0.2 LICENSE retained |
| TypeScript, Vite, Playwright, tsx, @types packages and build/test dependencies | Development tools, not deployed as runtime libraries. Installed package license files remain with dependencies; no node_modules or browser binaries are published. |
| Synthetic sample, fixtures and ap brand mark | Fixtures are reproducible using tools/generate_fixtures.py; mark is repository CSS/text. No downloaded font, stock illustration or external icon library is shipped. Original-work license still needs owner approval. |

Dependency terms should be rechecked when versions change. The notices include
all production dependencies even if tree shaking omits some modules. The entire
91-package install was audited for advisories; the license review above focuses
on distributed runtime code and resources, not a certification of every tool.

References: [entities LICENSE](https://github.com/nodable/val-parsers/blob/b89ecb0d419969e2989b74c5304bc9b66931727e/LICENSE),
[Earcut ISC](https://github.com/mapbox/earcut/blob/v3.0.2/LICENSE),
[MIT license description](https://choosealicense.com/licenses/mit/),
[why a missing license matters](https://choosealicense.com/no-permission/).

## Bundled stock Bambu settings: unresolved redistribution review

Asset: `src/assets/default-bambu-settings.3mf`, 10,274 bytes.
SHA-256: `e5b05dcb13c04697ab267c62b92a53eae63a168397814f1da61b137b12de5ce0`.
The asset was generated by installed Bambu Studio 2.8.2.61 using stock P1S 0.4,
PLA Basic and 0.20 mm Standard presets. `tools/build-default-profile.ts` records
the regeneration process and explicit version gate. The archive's exported
settings include printer start/end and other template snippets; the start/end
strings alone have 6,551 and 1,333 characters. Thus this is more than a list of
independently chosen numeric defaults.

The corresponding Bambu repository revision is
`926a7192574bcb9b3a732e1ec59a46d79cb45466`. Its
[root license](https://github.com/bambulab/BambuStudio/blob/926a7192574bcb9b3a732e1ec59a46d79cb45466/LICENSE)
is AGPL v3. A recursive path inspection at that revision found no separate
LICENSE/COPYING/NOTICE under `resources/profiles`; that absence does not establish
a permissive exception. Relevant source includes
[the P1S start template](https://github.com/bambulab/BambuStudio/blob/926a7192574bcb9b3a732e1ec59a46d79cb45466/resources/profiles/BBL/machine/Bambu%20Lab%20P1S%200.4%20nozzle%20template%20machine_start_gcode.json)
and [common process settings](https://github.com/bambulab/BambuStudio/blob/926a7192574bcb9b3a732e1ec59a46d79cb45466/resources/profiles/BBL/process/fdm_process_common.json).
The exact installed templates are listed in local regeneration provenance;
the asset's output is not automatically given a separate permissive license by
the fact that Bambu generated it.

AGPL's output/covered-work distinction and source/notice requirements must be
evaluated for the contents actually copied. The evidence here does **not** settle
whether the archive is a covered derivative, a separate aggregate, or whether
another permission applies. It also does not establish that AnchorPaint's
independent format writer or original application must take Bambu's code license.
This is a documented unresolved licensing question, not a legal clearance.

Before public distribution, the owner must establish an applicable permission
and compliance approach, including attribution, license text and corresponding
source/regeneration material if required, or obtain clarification from the rights
holder. Choosing MIT for original app code alone would not clear this asset.
No asset was removed, substituted, re-stamped or modified during preparation.
No Bambu implementation code was copied into the app as part of this task.

## Version and release decision

Validation was actually run: clean dependency installation, 86 core tests,
17 local UI tests, TypeScript/production build and one production browser check.
The production test also passed in the Node 24.21.0 Ubuntu GitHub build, which
uploaded the static artifact and skipped deployment for the PR. The run is
[40082934227](https://github.com/Hygea/AnchorPaint/actions/runs/40082934227)
at commit `e001949e1afb42cd86571cc6c04640ae1bdbf92a`. No successful public
deployment, native slicer rerun or release approval is implied.

`0.1.0` remains appropriate as an initial experimental MVP version. The package
and export generator already use it consistently; no bump is needed for
deployment preparation. The npm package stays `private: true`, which prevents
accidental npm publishing and is separate from GitHub visibility. Draft notes
are in [releases/v0.1.0.md](releases/v0.1.0.md). Owner approval of licensing and
history disclosure, a successful live deployment and live browser checks are
still required before a release tag or public GitHub Release.
