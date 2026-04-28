# Step: Plan changelog and package metadata updates

## Goal

Integrate changelog and package metadata planning into the release workflow so the release plan includes both local file changes and blocks safely before any metadata write can occur.

## Scope

- Reuse `buildChangelogProposal` with a versioned target section for the release target version and release date.
- Reuse `planChangelogUpdate` from `src/admin/generate-changelog/changelog-writer.ts` instead of duplicating changelog section replacement logic.
- Read the existing `CHANGELOG.md` and root `package.json` through release workflow ports or narrowly scoped helper inputs.
- Plan the changelog update before planning the package update so unsafe changelog content blocks before package metadata is changed or planned for execution.
- Add planned changelog and package metadata changes to `ReleasePlan` for later preview and execution stories.
- Preserve current release planning behavior for range resolution, SemVer derivation, explicit version overrides, and target tag availability checks.
- Do not write files, prompt for confirmation, run validation, create commits, create tags, publish, push, create GitHub Releases, add `admin:release`, or wire public CLI commands in this step.

## Files

- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/package-json.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/generate-changelog/changelog-writer.ts`

## Done when

- Tests prove the planned changelog update creates a target version section when one does not exist.
- Tests prove the planned changelog update replaces the existing target version section when it already exists.
- Tests prove unsafe or malformed `CHANGELOG.md` blocks before package metadata planning can proceed.
- Tests prove the release plan includes both metadata changes for later preview and execution.
- Existing release planning tests for SemVer derivation, version overrides, dirty tree blocking, and target tag blocking still pass.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T19:48:20-06:00
