# Implementation references

Checked 2026-10-23. These are references, not copied implementation code.
Recheck the exact target version and API documentation during implementation.

Implementation source inspection is pinned to Bambu Studio **v02.08.02.61**,
commit `926a7192574bcb9b3a732e1ec59a46d79cb45466`, matching the installed version.
See BAMBU_FORMAT.md for direct permanent links, GUI import-policy findings and
the native settings compatibility mechanism. A separate master revision was viewed
during discovery; it is not the compatibility target.

- Bambu modifier documentation (English entry point):
  https://wiki.bambulab.com/en/software/bambu-studio/modifier
  Official translated page accessible during review:
  https://wiki.bambulab.com/it/software/bambu-studio/modifier
  Explains settings in model/modifier overlap and loading STL modifiers.
- Bambu issue #10222, reported for 2.5.0.66:
  https://github.com/bambulab/BambuStudio/issues/10222
  Reports internal walls when modifier wall count differs. This is a report,
  not an API guarantee or evidence of improved strength.
- Bambu 3MF implementation:
  https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/Format/bbs_3mf.cpp
  Inspect Metadata/model_settings.config, part subtype, configuration values,
  object/component identifiers and transforms. Pin a commit for implementation.
  Do not copy AGPL implementation code into a differently licensed application.
- Three.js STLLoader:
  https://threejs.org/docs/pages/STLLoader.html
- Three.js ExtrudeGeometry:
  https://threejs.org/docs/pages/ExtrudeGeometry.html
- Polygon-clipping 0.15.7 (MIT), 2D polygon predicates and boolean operations:
  https://github.com/mfogel/polygon-clipping
- OpenAI Codex CLI, for repository development:
  https://developers.openai.com/codex/cli/
