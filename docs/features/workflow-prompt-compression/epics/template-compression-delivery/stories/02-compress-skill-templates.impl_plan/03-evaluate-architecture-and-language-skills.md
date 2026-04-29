# Step: Evaluate architecture and language skills for safe compression

## Goal

Review architecture, language, and framework skill templates against the audit and apply compression only where it is clearly safe; otherwise leave concise or uncertain templates unchanged with the rationale captured in the step report.

## Scope

- Review these templates against `template_audit.md`:
  - `templates/skills/architecture/command-pattern/SKILL.md`
  - `templates/skills/architecture/ddd-hexagonal/SKILL.md`
  - `templates/skills/clean-code/SKILL.md`
  - `templates/skills/golang/SKILL.md`
  - `templates/skills/nextjs/SKILL.md`
  - `templates/skills/react/SKILL.md`
  - `templates/skills/typescript/SKILL.md`
- Apply compression only if the audit supports it and the edit preserves practical guidance, examples that prevent mistakes, and quality-critical nuance.
- Treat `command-pattern` broad style alignment as defer unless a small safe edit is obvious; do not perform a full rewrite in this story.
- Leave already-concise or uncertain language/framework skills unchanged.
- Do not edit generated `.agents/skills/**` files.
- Do not update `templates/manifest.json`.

## Files

- `templates/skills/architecture/command-pattern/SKILL.md`
- `templates/skills/architecture/ddd-hexagonal/SKILL.md`
- `templates/skills/clean-code/SKILL.md`
- `templates/skills/golang/SKILL.md`
- `templates/skills/nextjs/SKILL.md`
- `templates/skills/react/SKILL.md`
- `templates/skills/typescript/SKILL.md`
- `docs/features/workflow-prompt-compression/template_audit.md`

## Done when

- Any changed architecture/language/framework skill still preserves its core decision rules and practical examples or constraints.
- Templates with uncertain compression value are left unchanged rather than reduced speculatively.
- The step report identifies which templates were intentionally left unchanged because the audit found no obvious no-value prompt load or only deferred broader rewrite opportunities.
- Every removed or reduced instruction is traceable to audit rationale in `template_audit.md`.
- `git diff -- .agents templates/manifest.json` shows generated skill copies and manifest metadata were not edited.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T22:01:48-06:00
