# Step: Add implementation-step summary guidance

## Goal

Tune the implementation executor skill so step-completion reports stay useful without pasting large diffs, logs, or command output by default.

## Scope

- Update `templates/skills/ai-implementation-plan-executor/SKILL.md` only where it describes final response behavior after each step.
- Add a concise instruction to summarize diffs, validation output, and command output by default, using focused excerpts only for failures, risks, or review decisions.
- Preserve the human review gate, one-step-at-a-time execution model, approval marker behavior, commit requirement, and epic continuation check.
- Do not add broad context-budget rules already covered by `templates/AGENTS.md`.
- Do not change implementation-planner, Scrum, product, feature, language, framework, or architecture skills in this step.

## Files

- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/03-tune-skill-guidance-and-validate-template-updates.md`
- `docs/features/token-conscious-ai-workflow/token_consumption_inventory.md`

## Done when

- The executor's final response guidance says to summarize diffs/logs/command output by default.
- The guidance still requires enough evidence for validation results, risks, blockers, and user review.
- The addition is local to implementation-step reporting and does not duplicate the full global context-budget section.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T18:47:39-06:00
