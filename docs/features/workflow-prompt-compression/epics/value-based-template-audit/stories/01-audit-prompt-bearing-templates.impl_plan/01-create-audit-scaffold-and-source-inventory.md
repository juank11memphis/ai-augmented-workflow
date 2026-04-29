# Step: Create audit scaffold and source inventory

## Goal

Create the `template_audit.md` artifact with a clear, repeatable structure and a complete inventory of every prompt-bearing source that must be audited for this story.

## Scope

- Create `docs/features/workflow-prompt-compression/template_audit.md`.
- Add a brief purpose statement that compression is value-based, not token-count-driven.
- Add the required classification vocabulary: quality-critical, useful-and-worth-keeping, useful-but-compressible, misplaced, duplicated-without-added-value, stale, removable.
- Add an audit entry scaffold that captures current role, instruction categories, recommended action, value rationale, quality risk if compressed, and prerequisite/context-loading assessment.
- Inventory all required sources:
  - `templates/AGENTS.md`
  - `templates/skills/**/SKILL.md`
  - `src/shared/catalog.ts` routing instructions
  - `templates/CLAUDE.md`, `templates/GEMINI.md`, and `templates/.codex/config.toml` when they contain meaningful prompt text beyond delegation
- Do not edit source templates, `src/shared/catalog.ts`, `templates/manifest.json`, or generated workspace files.

## Files

- `docs/features/workflow-prompt-compression/template_audit.md`
- `templates/AGENTS.md`
- `templates/CLAUDE.md`
- `templates/GEMINI.md`
- `templates/.codex/config.toml`
- `templates/skills/**/SKILL.md`
- `src/shared/catalog.ts`

## Done when

- `template_audit.md` exists and includes the audit purpose, classification vocabulary, and entry format.
- Every required prompt-bearing source is listed before detailed recommendations are added.
- The scaffold makes it impossible to recommend compress/move/remove without documenting value rationale and quality risk.
- No template, routing source, manifest, or generated managed file has been changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:40:16-06:00
