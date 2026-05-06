# Step: Move release workflow into module

## Goal

Move release planning, package version planning, git release support, release execution, and tests into Maintainer Release Support while preserving admin release behavior.

## Scope

- Move `src/admin/release-workflow/*` into `src/modules/maintainer-release-support/release-workflow/` with stable exported names.
- Move `src/admin/release-workflow/handler.test.ts` and `src/admin/release-workflow/package-json.test.ts` with the release behavior they protect.
- Update relative imports inside moved release implementation and tests to use module-local changelog support and release workflow paths.
- Keep `src/admin/release.ts` as a compatibility CLI entrypoint for now, but update it to import command types and handlers from Maintainer Release Support.
- Move or update `src/admin/release.test.ts` only as needed to preserve coverage of the compatibility CLI entrypoint.
- Preserve release argument parsing behavior, release planning semantics, changelog/package update planning, git tag checks, execution step ordering, npm publish arguments, dry-run behavior, output meaning, and exit-code behavior.
- Do not publish a release, change release policy, or change release plan preview formatting.

## Files

- `src/admin/release.ts`
- `src/admin/release.test.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/git-release.ts`
- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/release-workflow/package-json.ts`
- `src/admin/release-workflow/package-json.test.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/modules/maintainer-release-support/release-workflow/command.ts`
- `src/modules/maintainer-release-support/release-workflow/git-release.ts`
- `src/modules/maintainer-release-support/release-workflow/handler.ts`
- `src/modules/maintainer-release-support/release-workflow/handler.test.ts`
- `src/modules/maintainer-release-support/release-workflow/package-json.ts`
- `src/modules/maintainer-release-support/release-workflow/package-json.test.ts`
- `src/modules/maintainer-release-support/release-workflow/release-plan.ts`
- `src/modules/maintainer-release-support/index.ts`

## Done when

- Maintainer Release Support owns release workflow internals and release workflow tests.
- `src/admin/release.ts` is a thin compatibility entrypoint that imports from the module.
- Existing admin release CLI tests continue to cover compatibility entrypoint behavior.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/maintainer-release-support/release-workflow/handler.test.js bin/modules/maintainer-release-support/release-workflow/package-json.test.js bin/admin/release.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:35:15-06:00
