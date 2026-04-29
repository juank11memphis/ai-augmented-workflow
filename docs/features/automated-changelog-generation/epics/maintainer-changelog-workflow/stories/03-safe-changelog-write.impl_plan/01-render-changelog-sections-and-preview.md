# Step: Render changelog sections and preview

## Goal

Add pure formatting helpers that turn an existing changelog proposal into Keep a Changelog-style Markdown sections and a human-readable preview, without reading or writing files.

## Scope

- Add or extend changelog formatting code to render generated entries grouped by category.
- Omit empty categories from rendered changelog Markdown.
- Render `## Unreleased` when no version is provided.
- Render `## <normalized-version> - <YYYY-MM-DD>` for versioned releases.
- Render a preview that includes git range, commit count, target changelog path, target section, categorized entries, SemVer guidance, and warnings.
- Keep this step pure and testable; do not add filesystem writes, confirmation prompts, package scripts, tags, or public CLI wiring.

## Files

- `src/admin/generate-changelog/changelog-format.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- Tests prove an `Unreleased` proposal renders a Keep a Changelog-style section.
- Tests prove a versioned proposal renders a heading with normalized SemVer and ISO date.
- Tests prove empty categories are omitted.
- Tests prove preview text includes source range, commit count, target path, target section, categorized entries, SemVer guidance, and warnings.
- Existing proposal generation and SemVer guidance tests still pass.
- `pnpm build`, `pnpm check`, and the focused changelog test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:36:24-06:00
