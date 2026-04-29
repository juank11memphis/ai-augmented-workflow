# Step: Validate audit coverage and story acceptance

## Goal

Verify the audit artifact fully satisfies the user story acceptance criteria and is ready to guide later template compression work without speculative reductions.

## Scope

- Review `template_audit.md` against the user story, Epic brief, feature brief, and technical design.
- Confirm every required source is represented exactly once or clearly grouped when appropriate.
- Confirm every audited source includes current role, instruction categories, recommended action, value rationale, quality risk if compressed, and prerequisite/context-loading assessment.
- Confirm compress, move, and remove recommendations are value-based and not justified by token count alone.
- Confirm source templates, routing code, manifest metadata, and generated managed files remain unchanged.
- Do not add new scope, automated token accounting, or template edits.

## Files

- `docs/features/workflow-prompt-compression/template_audit.md`
- `docs/features/workflow-prompt-compression/epics/value-based-template-audit/stories/01-audit-prompt-bearing-templates.md`
- `docs/features/workflow-prompt-compression/epics/value-based-template-audit/epic_brief.md`
- `docs/features/workflow-prompt-compression/feature_brief.md`
- `docs/features/workflow-prompt-compression/technical_design.md`
- `templates/`
- `src/shared/catalog.ts`
- `templates/manifest.json`

## Done when

- Manual review confirms `template_audit.md` covers every required prompt-bearing source.
- Manual review confirms no recommendation is based solely on token count, prompt length, or brevity.
- Manual review confirms any instruction with uncertain value is marked keep or defer, not remove.
- `git diff -- templates src/shared/catalog.ts templates/manifest.json` shows no source template, routing code, or manifest changes for this audit-only story.
- The story's acceptance criteria and validation bullets are all satisfied.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:45:37-06:00
