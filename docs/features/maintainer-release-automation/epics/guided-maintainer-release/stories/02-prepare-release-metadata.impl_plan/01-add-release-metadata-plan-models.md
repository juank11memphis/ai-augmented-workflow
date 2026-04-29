# Step: Add release metadata plan models

## Goal

Extend the release workflow planning model so a release plan can carry planned local metadata changes for later preview and execution without writing files yet.

## Scope

- Add typed release plan fields for planned `CHANGELOG.md` and root `package.json` updates.
- Model whether the changelog update creates a new version section or replaces an existing target version section.
- Model the package version update as a planned change from the current root package version to the target release version.
- Keep plan data transport-agnostic and suitable for preview/confirmation stories to render later.
- Do not write files, run validation, create commits, create tags, publish, push, create GitHub Releases, add `admin:release`, or wire public CLI commands in this step.

## Files

- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/handler.test.ts`

## Done when

- `ReleasePlan` can include both changelog and package metadata change plans.
- Tests can assert the planned metadata shape without requiring file writes.
- The planned changelog metadata distinguishes create-vs-replace behavior for the target version section.
- The planned package metadata identifies the root `package.json` path, current version, target version, and next content.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T19:14:40-06:00
