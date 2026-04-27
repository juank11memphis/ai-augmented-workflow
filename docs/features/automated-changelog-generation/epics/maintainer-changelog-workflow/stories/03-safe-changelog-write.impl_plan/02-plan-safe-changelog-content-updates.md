# Step: Plan safe changelog content updates

## Goal

Add conservative changelog content update helpers that can create a new `CHANGELOG.md` or update only the target section of an existing changelog while preserving all other content.

## Scope

- Add a small changelog update module in the maintainer changelog slice.
- Create a standard Keep a Changelog-style file when existing content is absent.
- Replace or insert the target `Unreleased` section when no version is provided.
- Add or replace the requested versioned section near the top of the changelog when `--version` is provided.
- Preserve older release sections and any content outside the target section.
- Block with a clear unsafe-parse result when an existing changelog cannot be parsed safely enough to preserve content.
- Return typed success/failure results instead of throwing for unsafe changelog content.
- Do not read or write files, prompt users, publish releases, update package metadata, tag releases, or add public CLI wiring.

## Files

- `src/admin/generate-changelog/changelog-writer.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- Tests prove missing changelog content produces a complete standard changelog.
- Tests prove an existing `Unreleased` section can be updated without losing older release sections.
- Tests prove a dated versioned section can be added using the normalized version heading.
- Tests prove unrelated existing content outside the target section is preserved.
- Tests prove unsafe changelog content returns a blocked result with a specific warning/message.
- `pnpm build`, `pnpm check`, and the focused changelog test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:39:53-06:00
