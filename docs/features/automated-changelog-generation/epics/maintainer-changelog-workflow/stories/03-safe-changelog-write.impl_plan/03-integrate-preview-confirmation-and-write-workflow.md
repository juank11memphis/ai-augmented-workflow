# Step: Integrate preview, confirmation, and write workflow

## Goal

Add the safe write orchestration around proposal generation so the workflow previews planned changelog changes, asks for confirmation unless `--yes` is provided, and writes `CHANGELOG.md` only when allowed.

## Scope

- Add a handler-level write workflow that reuses `handleGenerateChangelogProposal` and the changelog update helpers.
- Model filesystem, preview output, and confirmation as injectable ports/dependencies so the handler stays testable and entrypoint-agnostic.
- Always emit or return preview content before any write attempt, including when `assumeYes` is true.
- Ask for confirmation before writing when `assumeYes` is false.
- Do not modify files when confirmation is declined, proposal generation is blocked, git input is invalid, version input is invalid, date input is invalid, or changelog parsing is unsafe.
- Validate provided release dates as `YYYY-MM-DD` before generating a versioned changelog section.
- Keep `--yes` behavior limited to skipping confirmation after preview; do not skip validation or hide warnings.
- Do not add the `admin:changelog` package script, terminal argument parsing, tags, package version changes, publishing, or public CLI wiring.

## Files

- `src/admin/generate-changelog/handler.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/changelog-writer.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- Tests prove declined confirmation leaves `CHANGELOG.md` unchanged or absent.
- Tests prove `assumeYes: true` still produces preview output before writing.
- Tests prove successful confirmation writes the planned changelog content.
- Tests prove invalid git input, invalid version input, invalid date input, and unsafe changelog parsing do not write files.
- Handler dependencies remain injected through ports rather than direct terminal prompting.
- `pnpm build`, `pnpm check`, and the focused changelog test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:42:56-06:00
