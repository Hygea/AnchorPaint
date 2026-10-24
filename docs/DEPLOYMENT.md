# GitHub Pages publication checklist

Prepared 2026-10-24 for `Hygea/AnchorPaint`, default branch `main`.
Target: https://hygea.github.io/AnchorPaint/ (planned, not verified live).

## Current milestones

| Milestone | Status |
| --- | --- |
| Deployment prepared | Workflow, production path check, notices and documentation prepared for review |
| Deployment successfully published | Not performed or verified |
| Public release approved | No; licensing and history privacy decisions remain open |
| Public release published | No tag or GitHub Release created |

## Owner actions, in order

1. **Resolve the audit first.** Read [PUBLIC_RELEASE_AUDIT.md](PUBLIC_RELEASE_AUDIT.md).
   Approve an original-code license; resolve redistribution of the bundled Bambu
   preset, including required notices/source; decide whether the personal path
   in existing Git history may be disclosed or must be removed. Confirm you may
   publish the synthetic fixtures and remaining pilot descriptions. The current
   working copy redacts the personal path; that does not erase older commits.
   No repository visibility changes or history rewrites have been performed.
2. **Choose repository visibility and plan.** The repository is currently private.
   GitHub Free requires a public repository for Pages. A private personal
   repository needs GitHub Pro (organizations need an eligible paid plan).
   The owner alone decides whether to change visibility after step 1; making
   the site public can distribute the bundled preset even when the repo stays
   private. Confirm the account's actual plan in GitHub; it was not inspected.
3. **Review and merge the preparation branch.** Pull-request builds do not deploy.
   Do not merge to `main` until distribution is authorized. Once activated,
   future pushes to `main` automatically publish a passing build.
4. **Allow the required Actions.** In **Settings → Actions → General**, enable
   Actions and allow the official `actions/*` actions used by the workflow,
   including pinned commits. Retain read-only default workflow permissions;
   the workflow requests `pages: write` and `id-token: write` only for deploy.
   No personal access token or application secret is required. An organization
   policy must permit these permissions if applicable.
5. **Configure the deployment environment.** Under **Settings → Environments**,
   create or review `github-pages`; allow deployments from `main` only. A required
   reviewer is useful for deliberate publication if the account's plan supports
   that protection. Do not approve a deployment before the audit decisions are
   resolved. Jobs reference this environment and report the deployed URL there.
6. **Enable Pages.** Under **Settings → Pages → Build and deployment → Source**,
   choose **GitHub Actions**. The workflow deliberately does not automatically
   enable Pages or change repository visibility.
7. **Run the first deployment.** After merging and enabling Pages, use
   **Actions → Build and deploy AnchorPaint → Run workflow → main** if the merge
   did not already produce a successful run. `build` must pass before `deploy`.
   Inspect both jobs and any environment approval. The workflow serializes runs
   per ref with `cancel-in-progress: false`; an active publication is not cancelled.
8. **Verify the live URL.** Open the URL reported by the successful deployment,
   expected to be https://hygea.github.io/AnchorPaint/. In a fresh browser tab,
   check that JS/CSS, the sample, preset and `THIRD_PARTY_NOTICES.txt` return
   successfully below `/AnchorPaint/`. Load the sample, confirm size, select a
   shaft, change depth/overlap, add a modifier and download 3MF. Confirm an orange
   preview, no console/asset errors and no model-upload requests. Test one local
   STL and optional settings file. Download success is not native slicer validation.
   Record run URL, commit, browser, date and outcomes in `TEST_STATUS.md`; only
   then replace the README's planned-link language with a live-app link.
9. **Approve and publish v0.1.0 separately.** Review
   [draft release notes](releases/v0.1.0.md), retain the compatibility limits and
   print-preview reminder, and confirm audit/sign-off and live checks are complete.
   Then the owner may create tag `v0.1.0` at the verified commit and publish a
   GitHub Release. Pages is the distribution method; no desktop installer is needed.

## Workflow and local verification

The `build` job installs locked dependencies on Node.js 24, tests geometry/export,
builds, installs Playwright Chromium and checks the production app, then uploads
only `dist/`. The `deploy` job is limited to `main` push/manual events and uses
the official configure/deploy actions. The Pages token is GitHub's ephemeral
`GITHUB_TOKEN`. Nothing is deployed from pull requests. No backend or API key exists.

Vite's explicit `/AnchorPaint/` base is a normal alternative. This project retains
`base: './'` to preserve local root URLs and the already functioning build; the
production test verifies the exact project prefix and every runtime asset type.
No runtime path is hardcoded to `/assets/`, `/fixtures/` or `/src/` in `dist/`.
If a custom domain or repository name is introduced, rerun the path check.

```powershell
npm ci
npm test
npm run build
npm run test:ui
npm run test:site
npm run preview -- --base /AnchorPaint/ --port 4174 --strictPort
```

The final command is a manual alternative after the automated production test
has stopped its server. On Windows PowerShell use `npm.cmd` if npm's PowerShell
shim strips option separators. Preview is a local test server, not production
hosting. Tests use installed Chrome locally; CI installs Playwright Chromium.
No new native slicer test is required by a path-only deployment change, and none
is implied by these checks. Existing slicer evidence remains in `TEST_STATUS.md`.

## References checked

- [Vite static deployment](https://vite.dev/guide/static-deploy.html#github-pages).
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- [Pages eligibility and public-site behavior](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
- [GitHub Pages request data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).
