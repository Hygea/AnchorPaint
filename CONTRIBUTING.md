# Contributing

AnchorPaint is an experimental, local-first STL modifier tool. Contributions
should preserve its small browser-only architecture and documented geometry scope.

## Report an issue

Use [GitHub Issues](https://github.com/Hygea/AnchorPaint/issues). Include:

- Browser/OS and the AnchorPaint version or commit.
- Steps to reproduce, expected behavior and the actual result.
- Relevant settings, model dimensions and a screenshot when useful.
- For export issues, slicer name/version and whether modifier type, placement,
  wall settings, save/reopen and sliced layers were checked.

Share a minimal synthetic STL when possible. Only attach models or settings you
have permission to publish. Remove private paths, credentials, account/device
data and custom printer snippets that should not be public.

## Propose a change

Read [scope](MVP_SPEC.md), [architecture](docs/ARCHITECTURE.md) and the
[development guide](docs/DEVELOPMENT.md). Keep pull requests focused and explain
behavior, relevant limitations and validation. Run the appropriate automated
checks; geometry/export changes also need meaningful regression coverage.
Do not claim slicer compatibility from ZIP structure or download success alone.

New original code and documentation are contributed under this project's MIT
license. Third-party additions must retain their own notices and source terms;
see [NOTICE.md](NOTICE.md). Never commit generated dist/, local artifacts,
node_modules, credentials or private printer profiles.
