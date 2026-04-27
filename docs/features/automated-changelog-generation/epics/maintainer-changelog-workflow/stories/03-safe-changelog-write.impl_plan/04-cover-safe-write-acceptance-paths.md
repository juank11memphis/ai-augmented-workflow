# Step: Cover safe write acceptance paths

## Goal

Round out focused test coverage for the safe changelog write story so creation, update, preservation, confirmation, `--yes`, and blocked paths are all proven together.

## Scope

- Add or refine tests around the public handler APIs for the maintainer changelog slice.
- Cover creating a new `CHANGELOG.md` from git history when the file is missing.
- Cover updating `Unreleased` without losing older releases.
- Cover adding a dated versioned section with a normalized SemVer heading.
- Cover preserving existing content outside the touched section.
- Cover no file changes when confirmation is declined.
- Cover preview-before-write behavior when `assumeYes` is true.
- Cover unsafe changelog parse failure with no file changes.
- Keep tests focused on the maintainer-only admin slice; do not add public CLI command tests or package script expectations in this story.

## Files

- `src/admin/generate-changelog/handler.test.ts`
- `src/admin/generate-changelog/changelog-format.ts`
- `src/admin/generate-changelog/changelog-writer.ts`
- `src/admin/generate-changelog/handler.ts`

## Done when

- Each acceptance criterion in `03-safe-changelog-write.md` is covered by at least one focused test.
- Tests assert both written content and no-write behavior where applicable.
- Tests assert generated version headings use normalized SemVer and ISO dates.
- Tests remain deterministic and avoid relying on the current calendar date unless explicitly controlled.
- `pnpm build`, `pnpm check`, and the focused changelog test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:50:19-06:00
