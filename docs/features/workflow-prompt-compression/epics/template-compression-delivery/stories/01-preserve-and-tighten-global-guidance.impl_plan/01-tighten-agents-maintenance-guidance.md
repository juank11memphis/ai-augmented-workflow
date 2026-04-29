# Step: Tighten AGENTS maintenance guidance

## Goal

Apply the audit-approved light compression to `templates/AGENTS.md` by tightening only the duplicated Sibu maintenance outcome guidance while preserving all pre-skill safety, confirmation, routing, communication, and workflow preflight behavior.

## Scope

- Edit only the Sibu maintenance section of `templates/AGENTS.md`.
- Preserve the required meaning of `sibu init`, `sibu doctor`, and `sibu sync`.
- Preserve the session-start `sibu doctor` preflight requirement and all outcome guidance for healthy, missing state, drift, and unavailable Sibu cases.
- Remove or merge only duplicated maintenance wording already identified in `docs/features/workflow-prompt-compression/template_audit.md`.
- Do not change the project overview placeholder, security/safety rules, confirmation gate, communication style, skill routing rules, or `{{OPTIONAL_SKILL_ROUTING}}` placeholder.
- Do not edit generated `AGENTS.md`, `.agents/**`, skill templates, `src/shared/catalog.ts`, or `templates/manifest.json` in this step.

## Files

- `templates/AGENTS.md`
- `docs/features/workflow-prompt-compression/template_audit.md`

## Done when

- `templates/AGENTS.md` still contains the repo overview placeholder, safety rules, code-change confirmation gate, communication style, mandatory routing rules, optional routing placeholder, and Sibu preflight/maintenance guidance.
- Any removed or reduced global instruction is traceable to the audit rationale about duplicated Sibu maintenance wording.
- Manual before/after review confirms no safety, user-control, confirmation, routing, or workflow-maintenance behavior was weakened.
- `git diff -- . ':!templates/AGENTS.md'` shows this step did not modify generated workspace files, routing code, manifest metadata, or unrelated files.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:51:45-06:00
