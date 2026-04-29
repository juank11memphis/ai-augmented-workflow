# Step: Add release workflow models and SemVer helpers

## Goal

Create the release workflow's typed planning model and small SemVer utilities needed to represent a proposed release before adding git discovery or handler orchestration.

## Scope

- Add a release workflow slice under `src/admin/release-workflow/`.
- Define command, result, warning, release range, target version, tag, and release plan types.
- Add helpers for incrementing a parsed SemVer version by `major`, `minor`, or `patch`.
- Add helpers for formatting release tag names such as `v0.2.0`.
- Reuse existing `SemverBump` and parsed SemVer types from `src/admin/generate-changelog/semver.ts` where practical.
- Do not read git history, inspect the working tree, write files, run validation, create tags, publish, push, or add package scripts in this step.

## Files

- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/generate-changelog/semver.ts`

## Done when

- Release workflow command/result/plan types are exported for later handler use.
- Tests prove patch/minor/major version increments from a parsed previous version.
- Tests prove release tag names are formatted as `v<version>`.
- Existing changelog tests still pass.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T20:54:18-06:00
