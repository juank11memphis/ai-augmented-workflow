# Step: Warn on SemVer bump mismatch

## Goal

Compare the maintainer-provided version with the previous release version when available and add a non-blocking warning if the chosen bump differs from commit-derived guidance.

## Scope

- Use `sourceRange.fromRef` as the previous release version when it contains a valid SemVer value, including optional leading `v`.
- Determine the actual chosen bump from previous version to normalized target version.
- Add a warning when the actual bump differs from the suggested bump.
- Ensure mismatch warnings do not block proposal generation.
- Do not warn when no previous SemVer version is available.
- Do not auto-change the provided version.
- Do not enforce strict bump correctness as a blocking rule.
- Do not write files, tag releases, update package metadata, or add public CLI wiring.

## Files

- `src/admin/generate-changelog/semver.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/handler.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- Tests prove a breaking-change proposal with a non-major chosen version returns a proposed result with a mismatch warning.
- Tests prove a feature-only proposal with a patch chosen version returns a proposed result with a mismatch warning.
- Tests prove a matching chosen bump does not add a mismatch warning.
- Tests prove missing or non-SemVer previous refs do not block and do not produce misleading mismatch warnings.
- The normalized version remains in the target section.
- `pnpm build`, `pnpm check`, and the focused changelog test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:29:51-06:00
