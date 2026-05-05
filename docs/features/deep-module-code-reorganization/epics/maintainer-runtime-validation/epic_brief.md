# Maintainer Runtime Validation Epic Brief

## Summary

Move maintainer/admin release support into its Deep Module and update runtime packaging/validation so the reorganized source still produces a working installed CLI. This Epic closes the refactor by protecting package contents, admin entrypoints, and release-support behavior.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- Move changelog and release workflow internals into Maintainer Release Support.
- Preserve admin script behavior and package script compatibility.
- Update package runtime `files` entries for `bin/modules/` and any remaining `bin/shared/` runtime files.
- Run full verification and package/runtime validation.

## Out of Scope
- Publishing a release.
- Changing release policy.
- Adding new maintainer automation.

## User Stories
- [Move maintainer release support behavior](./stories/01-move-maintainer-release-support.md)
- [Update package runtime contents](./stories/02-update-package-runtime-contents.md)
- [Validate behavior preservation end to end](./stories/03-validate-behavior-preservation.md)

## Acceptance Criteria
- Maintainer Release Support owns admin changelog and release workflow internals.
- Existing admin scripts continue to work through compatibility entrypoints or updated script paths.
- Packaged runtime includes all compiled modules needed by the installed CLI.
- Full verification and runtime validation pass.

## Dependencies / Risks
- Package contents should be updated after the final runtime source locations are known.
- Installed CLI validation can fail even when local `pnpm build` succeeds if package `files` misses moved runtime code.
