# Step: Move changelog support into module

## Goal

Move changelog generation internals and tests into Maintainer Release Support while preserving current changelog planning, formatting, git-history, and write behavior.

## Scope

- Move `src/admin/generate-changelog/*` into `src/modules/maintainer-release-support/generate-changelog/` with stable exported names.
- Move `src/admin/generate-changelog/handler.test.ts` with the changelog behavior it protects.
- Update relative imports inside moved changelog implementation and tests to use the new module-local paths.
- Keep `src/admin/changelog.ts` as a compatibility CLI entrypoint for now, but update it to import command types and handlers from Maintainer Release Support.
- Preserve CLI argument parsing behavior, changelog formatting, semver warnings, git history behavior, write confirmation behavior, output meaning, and exit-code behavior.
- Do not change changelog copy, categories, target section semantics, or release policy.

## Files

- `src/admin/changelog.ts`
- `src/admin/generate-changelog/changelog-format.ts`
- `src/admin/generate-changelog/changelog-writer.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/git-history.ts`
- `src/admin/generate-changelog/handler.ts`
- `src/admin/generate-changelog/handler.test.ts`
- `src/admin/generate-changelog/semver.ts`
- `src/modules/maintainer-release-support/generate-changelog/changelog-format.ts`
- `src/modules/maintainer-release-support/generate-changelog/changelog-writer.ts`
- `src/modules/maintainer-release-support/generate-changelog/command.ts`
- `src/modules/maintainer-release-support/generate-changelog/git-history.ts`
- `src/modules/maintainer-release-support/generate-changelog/handler.ts`
- `src/modules/maintainer-release-support/generate-changelog/handler.test.ts`
- `src/modules/maintainer-release-support/generate-changelog/semver.ts`
- `src/modules/maintainer-release-support/index.ts`

## Done when

- Maintainer Release Support owns changelog generation internals and changelog handler tests.
- `src/admin/changelog.ts` is a thin compatibility entrypoint that imports from the module.
- Moved changelog tests retain equivalent assertions.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/maintainer-release-support/generate-changelog/handler.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:35:15-06:00
