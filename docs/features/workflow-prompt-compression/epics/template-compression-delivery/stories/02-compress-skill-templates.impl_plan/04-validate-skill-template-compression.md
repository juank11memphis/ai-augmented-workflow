# Step: Validate skill template compression

## Goal

Validate that all skill-template compression in this story is audit-backed, preserves quality-critical behavior, and leaves generated skill copies and manifest metadata untouched.

## Scope

- Manually review every changed `templates/skills/**/SKILL.md` diff against `docs/features/workflow-prompt-compression/template_audit.md`.
- Confirm each changed skill still documents when to use it, required inputs or source context when applicable, hard stop conditions when applicable, output locations when applicable, and final response behavior when applicable.
- Confirm every removed or reduced instruction has value-based rationale in the audit.
- Confirm intentionally retained redundancy is quality-, safety-, or routing-relevant, or that uncertain reductions were left unchanged.
- Run practical validation commands when useful for template/source consistency.
- Do not update `templates/manifest.json`; metadata updates belong to story 03.
- Do not edit generated `.agents/skills/**` files.

## Files

- `templates/skills/**/SKILL.md`
- `docs/features/workflow-prompt-compression/template_audit.md`
- `.agents/skills/**`
- `templates/manifest.json`

## Done when

- Manual diff review confirms no quality-critical rule, stop condition, required input, output location, artifact format, approval gate, or binding UX rule was removed without equivalent replacement.
- Every reduced or removed skill instruction is covered by `template_audit.md` rationale.
- `git diff -- .agents/skills templates/manifest.json` shows generated skill copies and manifest metadata were not edited.
- Run `pnpm build` if any TypeScript or template-loading source was changed; otherwise document that no build was needed because the story changed Markdown templates only.
- The story's acceptance criteria are satisfied.

## Validation notes

- Reviewed changed skill template diffs against `docs/features/workflow-prompt-compression/template_audit.md`.
- Confirmed changed skills still preserve required use triggers, source context, stop conditions, output paths, artifact formats, approval gates, and binding UX behavior where applicable.
- Confirmed architecture/language/framework skills with uncertain or low compression value were left unchanged.
- Confirmed `git diff -- .agents/skills templates/manifest.json` had no output; generated skill copies and manifest metadata were not edited.
- No build was needed for this story because the implementation changed Markdown skill templates only.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T22:02:38-06:00
