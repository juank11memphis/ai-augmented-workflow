# Step: Add commit-derived SemVer bump suggestion

## Goal

Add SemVer bump guidance derived from the generated changelog proposal so maintainers can see whether the commits suggest a MAJOR, MINOR, or PATCH release while retaining final ownership of the version choice.

## Scope

- Add explicit SemVer bump types for `major`, `minor`, and `patch`.
- Add bump guidance to the proposal model in a way later preview/write stories can display.
- Suggest MAJOR when any proposal entry has a breaking-change marker.
- Suggest MINOR when no breaking changes exist and at least one feature-derived Added entry exists.
- Suggest PATCH when only fixes or lower-impact changes exist.
- Treat non-Conventional Commit entries conservatively without allowing them to hide breaking changes or feature commits.
- Add tests for MAJOR, MINOR, and PATCH guidance from proposal contents.
- Do not compare the chosen version to the previous version yet.
- Do not block on bump guidance.
- Do not write files, tag releases, update package metadata, or add public CLI wiring.

## Files

- `src/admin/generate-changelog/semver.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/changelog-format.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- Breaking-change commits produce MAJOR guidance.
- Feature commits without breaking changes produce MINOR guidance.
- Fix-only commits produce PATCH guidance.
- Existing proposal metadata remains intact.
- The guidance is represented in exported types for later preview rendering.
- `pnpm build`, `pnpm check`, and the focused changelog test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:26:38-06:00
