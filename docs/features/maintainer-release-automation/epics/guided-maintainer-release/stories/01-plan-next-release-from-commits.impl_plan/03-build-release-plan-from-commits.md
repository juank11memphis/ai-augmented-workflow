# Step: Build release plan from commit history

## Goal

Implement the first release planning handler that combines git discovery, commit-derived SemVer guidance, optional version override, and target tag checks into a typed release plan.

## Scope

- Add `handler.ts` for the release workflow planning slice.
- Read commits from the resolved release range using existing changelog git history behavior where practical.
- Derive suggested bump from commits using existing changelog classification and SemVer guidance.
- When `--version` is omitted, increment the previous SemVer version by the suggested bump.
- When `--version` is provided, validate and normalize it, preserving maintainer override ownership.
- Build a typed release plan containing release range, commit count, suggested bump, target version, tag name, warnings, and enough metadata for later preview rendering.
- Detect and block target tags after the target version is known.
- Do not write `CHANGELOG.md`, update `package.json`, run validation, create commits, create tags, publish, push, create GitHub Releases, or add package scripts in this step.

## Files

- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/git-release.ts`
- `src/admin/release-workflow/handler.test.ts`

## Done when

- Tests prove fix-only commits produce a patch target version.
- Tests prove feature commits produce a minor target version.
- Tests prove breaking-change commits produce a major target version.
- Tests prove explicit valid version overrides are accepted and normalized.
- Tests prove invalid explicit versions block planning.
- Tests prove release plans include range, target version, tag, suggested bump, commit count, and warnings.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T21:03:40-06:00
