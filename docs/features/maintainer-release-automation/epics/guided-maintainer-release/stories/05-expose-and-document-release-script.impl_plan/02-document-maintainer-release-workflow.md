# Step: Document maintainer release workflow

## Goal

Update maintainer-facing release guidance so Sibu maintainers know when and how to use `pnpm admin:release` safely.

## Scope

- Update `docs/releasing.md` to describe `pnpm admin:release` as the preferred guided maintainer workflow after `pnpm build`.
- Document supported flags: `--version`, `--from`, `--to`, `--date`, `--yes`, and `--dry-run`.
- Explain that the workflow previews the release plan before writes or public side effects.
- Explain what the workflow performs after confirmation: changelog/package metadata writes, release validation, release commit, tag, npm publish, push, and GitHub Release creation.
- Keep `CHANGELOG.md` as the canonical release-note source and note that the GitHub Release uses the finalized changelog section.
- Preserve or reposition existing `admin:changelog` documentation as a lower-level/manual helper, not the primary guided release path.
- Do not add end-user README guidance, public CLI documentation, or unrelated release policy changes in this step.

## Files

- `docs/releasing.md`

## Done when

- `docs/releasing.md` explains when to run `pnpm admin:release -- --dry-run`.
- `docs/releasing.md` explains the confirmation and `--yes` behavior without implying warnings or validation are skipped.
- `docs/releasing.md` documents the supported flags and recovery mindset for failed public side effects.
- `docs/releasing.md` clearly states the workflow remains maintainer-only and is not a public `sibu release` command.
- Markdown changes stay focused on maintainer release automation.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T22:06:18-06:00
