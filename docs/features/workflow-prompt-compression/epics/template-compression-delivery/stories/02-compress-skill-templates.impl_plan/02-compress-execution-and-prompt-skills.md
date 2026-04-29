# Step: Compress execution and prompt-engineering skills

## Goal

Apply audit-backed, conservative compression to execution and prompt-engineering skill templates while preserving review gates, user-control behavior, quality-first prompt discipline, and required output contracts.

## Scope

- Edit only these skill templates where the audit supports compression:
  - `templates/skills/ai-implementation-plan-executor/SKILL.md`
  - `templates/skills/ai-prompt-engineer-master/SKILL.md`
  - `templates/skills/ux-expert/SKILL.md`
- Preserve executor one-step-at-a-time behavior, approval marker format, commit requirement, hard start rules, and Epic continuation check.
- Preserve prompt-engineering quality-first compression principles, missing-context behavior, output pattern, and token discipline safeguards.
- Preserve UX product grounding, no-code boundary, mockup authority, phone-first rule, output location, and binding downstream mockup behavior.
- Reduce only wording that the audit identifies as useful-but-compressible or duplicated without added behavioral value.
- Leave uncertain reductions unchanged.
- Do not edit generated `.agents/skills/**` files.
- Do not update `templates/manifest.json`.

## Files

- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/ai-prompt-engineer-master/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `docs/features/workflow-prompt-compression/template_audit.md`

## Done when

- The executor skill still prevents missing-plan execution, multi-step unreviewed execution, premature approval marking, and uncommitted approved changes.
- The prompt-engineering skill still says quality comes before token reduction and preserves prompt-verification guidance.
- The UX skill still requires product grounding and binding mockups for UI-changing features.
- Every removed or reduced instruction is traceable to audit rationale in `template_audit.md`.
- `git diff -- .agents templates/manifest.json` shows generated skill copies and manifest metadata were not edited.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T22:00:36-06:00
