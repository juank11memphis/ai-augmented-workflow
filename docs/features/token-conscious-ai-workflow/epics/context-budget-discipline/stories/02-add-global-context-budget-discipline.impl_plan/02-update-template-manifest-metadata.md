# Step: Update template manifest metadata

## Goal

Keep Sibu template metadata consistent with the changed managed global template so `sibu sync` can explain the update to users.

## Scope

- Update `templates/manifest.json` for the `templates/AGENTS.md` change.
- Bump the global `templateVersion` once for this template set change.
- Bump the `AGENTS.md` template `version` once.
- Replace the `AGENTS.md` `changes` entry with concise user-facing release notes for the new version only.
- Preserve all other template paths, descriptions, versions, and change notes unless another file was intentionally changed.
- Do not edit generated project files or add unrelated manifest changes.

## Files

- `templates/manifest.json`
- `templates/AGENTS.md`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/02-add-global-context-budget-discipline.md`

## Done when

- `templates/manifest.json` has a bumped global `templateVersion` relative to the pre-change value.
- The `AGENTS.md` template entry has a bumped `version` relative to the pre-change value.
- The `AGENTS.md` `changes` notes describe the added context-budget discipline in user-facing language.
- Manifest metadata reflects the changed template and does not claim unrelated template changes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T18:31:35-06:00
