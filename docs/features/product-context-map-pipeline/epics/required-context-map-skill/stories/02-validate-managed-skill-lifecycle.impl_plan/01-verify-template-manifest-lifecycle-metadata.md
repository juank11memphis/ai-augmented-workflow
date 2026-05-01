# Step: Verify template manifest lifecycle metadata

## Goal

Ensure the Product Context Map writer skill and any changed workflow templates have manifest metadata that supports Sibu sync review and managed-file lifecycle behavior.

## Scope

- Inspect `templates/manifest.json` for `skills/product-context-map-writer/SKILL.md`.
- Confirm the new skill template entry has a user-facing description and current-version `changes` note.
- Confirm the global `templateVersion` and any changed template versions follow `sibu-template-change` rules.
- Confirm changed template `changes` entries describe user-visible behavior, not implementation details.
- Do not add `docs/product-context-map.md` to `templates/manifest.json`.

## Files

- `templates/manifest.json`
- `templates/skills/product-context-map-writer/SKILL.md`
- `templates/AGENTS.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/architecture/ddd-hexagonal/SKILL.md`
- `templates/skills/architecture/command-pattern/SKILL.md`

## Done when

- Manifest metadata includes `skills/product-context-map-writer/SKILL.md` with user-facing change notes.
- Every changed template has an appropriate version bump and current-version change note.
- `docs/product-context-map.md` is absent from manifest templates.
- `pnpm build` succeeds after any manifest/template adjustments.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-01T13:13:19-06:00
