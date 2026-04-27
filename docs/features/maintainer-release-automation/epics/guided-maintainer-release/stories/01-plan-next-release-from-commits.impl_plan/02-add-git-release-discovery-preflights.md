# Step: Add git release discovery preflights

## Goal

Add git-focused release discovery helpers that can confirm a clean working tree, find the latest SemVer-like tag, resolve release ranges, and detect existing target tags without performing release side effects.

## Scope

- Add `git-release.ts` helpers under the release workflow slice.
- Confirm the current directory is inside a git repository.
- Detect whether the working tree has uncommitted or untracked changes and block planning when dirty.
- Resolve `toRef`, defaulting to `HEAD`.
- Resolve `fromRef`, defaulting to the latest reachable SemVer-like tag.
- Block when no SemVer-like baseline tag exists and the command does not provide a safe explicit baseline/version path described by the technical design.
- Detect whether a planned tag such as `v0.2.0` already exists.
- Use explicit `git` argument arrays rather than shell-composed command strings.
- Do not write files, create commits, create tags, publish, push, or add package scripts in this step.

## Files

- `src/admin/release-workflow/git-release.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/generate-changelog/git-history.ts`

## Done when

- Tests prove dirty working trees block release planning.
- Tests prove the latest SemVer-like tag is selected when `--from` is omitted.
- Tests prove non-SemVer tags are ignored for automatic baseline selection.
- Tests prove missing SemVer-like baseline blocks with a clear message.
- Tests prove an existing target tag blocks planning.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T20:57:46-06:00
