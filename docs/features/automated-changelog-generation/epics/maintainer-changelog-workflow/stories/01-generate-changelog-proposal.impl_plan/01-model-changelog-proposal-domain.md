# Step: Model the changelog proposal domain

## Goal

Create the typed domain model and classification behavior needed to turn raw commit data into a structured changelog proposal without touching git or the filesystem.

## Scope

- Add the `src/admin/generate-changelog/` folder if it does not exist.
- Define the story-local command and result types for proposal generation.
- Define raw commit, categorized changelog entry, warning, category, and proposal types.
- Implement Conventional Commit parsing and category classification.
- Detect breaking-change markers from `!` and `BREAKING CHANGE:`.
- Include non-Conventional Commit messages as review-needed entries instead of dropping them.
- Do not implement git command execution in this step.
- Do not write to `CHANGELOG.md` or add confirmation prompts.
- Do not wire a public `sibu` CLI command.

## Files

- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/changelog-format.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- The exported types clearly model a proposal that includes categories, entries, warnings, commit counts, and source range information.
- Tests prove `feat`, `fix`, and other Conventional Commit types map to the expected Keep a Changelog categories.
- Tests prove security, deprecated, and removed wording are classified into the expected categories when obvious.
- Tests prove breaking-change markers are recorded as maintainer-review concerns.
- Tests prove non-Conventional Commit messages are included and marked as review-needed.
- `pnpm build` and the new focused test file pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-24T21:40:48.056722Z
