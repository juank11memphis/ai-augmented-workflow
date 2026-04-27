# Step: Add SemVer parsing and normalization

## Goal

Add focused SemVer validation helpers for maintainer-provided release versions so the changelog workflow can accept valid versions, normalize optional leading `v`, and reject invalid version strings before proposal generation succeeds.

## Scope

- Add a small SemVer module inside the maintainer changelog slice.
- Accept `MAJOR.MINOR.PATCH` versions such as `1.2.3`.
- Accept an optional leading `v`, such as `v1.2.3`.
- Normalize accepted versions to no leading `v` for `targetSection.version`.
- Reject invalid values such as `1`, `1.2`, `release-1`, empty strings, or non-numeric parts.
- Return explicit typed success/failure results rather than throwing for invalid maintainer input.
- Integrate version validation into `handleGenerateChangelogProposal` only far enough to block invalid `--version` values and normalize valid target sections.
- Do not implement bump suggestion or mismatch warnings in this step.
- Do not write `CHANGELOG.md`, add prompts, create tags, change package versions, or add public CLI wiring.

## Files

- `src/admin/generate-changelog/semver.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/handler.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- Tests prove `1.2.3` is accepted and used as `targetSection.version`.
- Tests prove `v1.2.3` is accepted and normalized to `1.2.3`.
- Tests prove invalid values such as `1`, `1.2`, and `release-1` return a clear blocked result.
- Blocked invalid-version results include a specific warning code/message and do not read or write changelog files.
- Existing proposal generation tests still pass.
- `pnpm build`, `pnpm check`, and the focused changelog test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:24:34-06:00
