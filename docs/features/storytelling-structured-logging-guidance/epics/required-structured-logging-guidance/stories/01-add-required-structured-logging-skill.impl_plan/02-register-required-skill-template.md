# Step: Register the required structured logging template

## Goal

Make `structured-logging` a required Sibu skill template with versioned manifest metadata and required-skill target registration so `sibu init` and `sibu sync` can install and explain it through existing template catalog behavior.

## Scope

- Add `skills/structured-logging/SKILL.md` to `templates/manifest.json` with a required-skill style description and current-version, user-facing change note.
- Bump the global `templateVersion` and only the new/changed template metadata required by this story.
- Add the skill to `MANDATORY_SKILLS` with target `.agents/skills/structured-logging/SKILL.md` for all supported agents.
- Do not update `templates/AGENTS.md`, `AGENTS.md`, `clean-code`, implementation executor/planner guidance, language skills, or architecture skills; that wiring belongs to story 02.

## Files

- `templates/manifest.json`
- `src/modules/template-catalog/catalog.ts`

## Done when

- The manifest includes `skills/structured-logging/SKILL.md` with appropriate version metadata and sync-facing notes.
- Required skill target registration installs the active skill for Codex, Gemini, and Claude workflows.
- No unrelated template versions or manifest entries are changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T18:52:49Z
