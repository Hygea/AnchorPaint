# Release readiness review

Review date: 2026-10-24. Version: 0.1.0 experimental preview.
This document records technical/privacy/licensing preparation. Public deployment
and release approval are separate maintainer actions.

## Licensing and distribution

- Original application code, documentation, mark and synthetic fixtures are MIT
  licensed; the full grant is in LICENSE and the site's licenses directory.
- Bambu preset material retains its upstream AGPL v3 terms. Full license,
  attribution, editable resolved configuration and all 17 unchanged source
  templates are included in the repository and built site. All 17 were checked
  against the pinned upstream revision, and offline repackaging reproduces the
  10,274-byte preset exactly. See [LICENSING.md](LICENSING.md) and [NOTICE.md](../NOTICE.md).
- The preset is not relicensed as MIT. No exemption is inferred from free use or
  MakerWorld sharing. No Bambu executable or networking plugin is distributed.
- Runtime dependency notices cover 13 npm packages plus Earcut inside Three.js:
  MIT, ISC and Unlicense terms as listed in the distributed notices.
- Imported models/settings retain their owners' rights. Actual private-part
  meshes are not in the repository; the shipped sample and fixtures are synthetic.

This records a conservative distribution approach using published upstream terms;
it is not a universal legal determination about derivative works or output files.

## Privacy and repository hygiene

Focused scans found no high-confidence credentials, private keys, sensitive
environment files, account/device data or private printer profiles in the source.
The editable preset and source templates contain no personal filesystem paths.
Generic software-install paths in developer commands are retained.

A historical personal-directory reference was redacted from the current source.
Both known branches, main and release/pages-v0.1.0, were rewritten with expected-head
leases; the seven affected historical commits were checked after rewriting. No
remote backup branch retains the removed path. GitHub
still serves an old copy by its commit ID after the rewrite. Complete platform
cache erasure is therefore not verified. Before publication, the maintainer
reviewed and accepted the residual historical folder-path disclosure; Support
removal was not requested. The fully merged preparation branch was subsequently
deleted, leaving only main. A maintainer requiring complete erasure would need
to review the retained commit/PR records with GitHub Support.
This is distinct from removing a line in the latest file. Do not merge older
clones into cleaned history, because doing so can restore the removed data.
[GitHub history-removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Case reports preserve test outcomes using generic descriptions; private input
models, personal paths and account/device data are not part of the current tree.

## Local processing

Source inspection identifies packaged-sample and packaged-preset fetches only.
Local STL/settings inputs use File.arrayBuffer; parsing, geometry and export run
in browser code. Downloads use Blob/object URLs. There is no upload API,
analytics, remote font, beacon or account flow. The tested production interaction
makes no model-upload or unexpected external request.

Hosting still sends ordinary site requests to GitHub Pages, whose service logs
visitor IP addresses for security. This is disclosed in the README. Local file
processing does not imply zero network traffic while loading the website.

## Verification and final publication

Core, UI, build and production acceptance results are in [TEST_STATUS.md](../TEST_STATUS.md).
The pipeline's Node.js 24 build, production path check and public deployment
passed on GitHub. The live HTTPS site passed production acceptance in Chrome on
Windows on 2026-10-24, including preset source/license availability and the
local-file/no-upload boundary. See the recorded deployment run and source commit
in TEST_STATUS.md. Native slicer and physical tests were not rerun.

Version 0.1.0 remains an experimental initial release. The npm package stays
private to prevent accidental npm publishing; that setting is independent of
GitHub repository visibility. The repository and Pages site are now public;
final approval of a version tag and GitHub Release remains separate.
[Deployment reference](DEPLOYMENT.md).
