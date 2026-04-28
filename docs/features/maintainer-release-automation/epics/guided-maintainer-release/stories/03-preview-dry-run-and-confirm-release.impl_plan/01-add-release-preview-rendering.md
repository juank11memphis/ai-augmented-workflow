# Step: Add release preview rendering

## Goal

Add a readable release plan preview renderer that shows maintainers the full planned release before any writes or side effects can occur.

## Scope

- Add preview formatting for the existing `ReleasePlan` in the release workflow slice.
- Include release range, target version, suggested SemVer bump, commit count, warnings, changelog update summary, package version update, validation command, release commit message, git tag, npm publish, push target, and GitHub Release target.
- Include enough changelog preview content for maintainers to review the generated release notes without dumping unrelated file contents.
- Keep rendering pure and transport-agnostic; do not prompt, write files, run commands, commit, tag, publish, push, create GitHub Releases, add package scripts, or wire public CLI commands in this step.

## Files

- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.test.ts`

## Done when

- Tests prove preview output includes the release range, proposed version, SemVer basis, changelog preview, package version change, validation command, release commit, tag, npm publish, push, and GitHub Release target.
- Tests prove warnings are included when present.
- Preview rendering has no file writes or command side effects.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T20:10:19-06:00
