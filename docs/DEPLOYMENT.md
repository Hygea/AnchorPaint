# GitHub Pages deployment

Target: https://hygea.github.io/AnchorPaint/ — deployment pending.
The repository and site remain unpublished until the maintainer activates them.
A passing CI build is not a successful public deployment.

## Before publication

Review [release readiness](PUBLIC_RELEASE_AUDIT.md), [license scope](../NOTICE.md)
and the [draft release notes](releases/v0.1.0.md). Original code is MIT; preset
licenses and editable sources are included in the site. Review any remaining
GitHub cached-history privacy issue before changing repository visibility.

## Activate Pages

1. Confirm the account's Pages eligibility. GitHub Free needs a public repository;
   a private personal repository needs GitHub Pro. The maintainer decides whether
   to change visibility. A public site distributes the preset even if source
   hosting stays private.
2. Review and merge the preparation PR only when publication is authorized.
   Main pushes can publish once Pages is enabled; PR builds never deploy.
3. Under **Settings → Actions → General**, allow the official actions used by
   the workflow, including pinned commits. Read-only default token permissions
   can remain; only deploy requests pages:write and id-token:write. No application
   secret or personal access token is required.
4. Under **Settings → Environments**, review github-pages and restrict deployment
   branches to main. Add an approval reviewer if supported and desired.
5. Under **Settings → Pages → Build and deployment → Source**, choose
   **GitHub Actions**. The workflow does not enable Pages or change visibility.
6. Under **Actions → Build and deploy AnchorPaint**, run the workflow on main if
   the merge did not already start a successful run. Inspect build, artifact and
   deploy results and any environment approval.
7. Open the URL reported by deploy. In a fresh tab, load the sample, confirm size,
   select a shaft, change depth/overlap, add a modifier and export 3MF. Verify the
   orange preview, asset/console health and absence of model-upload requests.
   Check the credits link, preset license and editable sources at the same prefix.
8. Record the live run/commit/browser result and update the README's pending-link
   language only after success. Then separately approve tag v0.1.0 and publish the
   release notes. No desktop installer is required.

## Pipeline

The official-action workflow uses Node.js 24, npm ci, core tests, production build
and a Chromium production check under /AnchorPaint/. It uploads only dist/.
A dependent deploy job runs only for main push/manual events through github-pages.
Same-ref runs are serialized without cancelling an active deployment. Actions
are pinned to reviewed releases; deploy write/OIDC permissions are job-scoped.

Vite keeps relative asset paths so one artifact works locally at / and at the
project prefix. The production check validates the actual prefix instead of
relying only on a build command. No dist/ or node_modules files are committed.
For local commands and Windows notes, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Publication milestones

| Milestone | Status |
| --- | --- |
| Deployment prepared | Workflow and production checks pass; license/source packaging included |
| Deployment successfully published | Pending activation and live verification |
| Public release approved | Requires final maintainer review and live acceptance |
| Public release published | No tag or release created by preparation |

References: [Vite deployment](https://vite.dev/guide/static-deploy.html#github-pages),
[GitHub custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Pages eligibility](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
