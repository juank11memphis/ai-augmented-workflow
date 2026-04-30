# Step: Validate targeted skill guidance

## Goal

Confirm the skill-template additions are minimal, non-repetitive, quality-preserving, and fully reflected in template metadata.

## Scope

- Manually review the changed skill-template diffs for brevity, local relevance, and quality-preserving wording.
- Confirm no changed skill repeats the full global context-budget guidance.
- Confirm required inputs, quality expectations, stop conditions, review gates, validation, and user control are preserved.
- Confirm `templates/manifest.json` matches all changed templates.
- Run the story's requested validation commands.
- Prefer summarized validation output in the final report, with key failure lines only if a command fails.
- Do not broaden into unrelated prompt compression or production TypeScript changes unless validation reveals a required fix.

## Files

- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/manifest.json`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/03-tune-skill-guidance-and-validate-template-updates.md`

## Done when

- Manual review confirms skill changes are targeted, minimal, non-repetitive, and quality-preserving.
- `templates/manifest.json` reflects every changed skill template.
- `pnpm test` passes.
- `sibu doctor` reports a healthy workflow.
- Any validation failure is reported with the command, result, and focused failure evidence before continuing.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T18:52:17-06:00
