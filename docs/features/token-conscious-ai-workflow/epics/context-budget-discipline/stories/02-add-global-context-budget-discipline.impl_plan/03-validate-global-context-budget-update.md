# Step: Validate the global context-budget update

## Goal

Confirm the template and manifest changes satisfy the story acceptance criteria, remain concise, and keep the repository workflow healthy.

## Scope

- Manually review the template diff for brevity, clarity, and quality-preserving wording.
- Confirm every story acceptance criterion is covered by `templates/AGENTS.md` and `templates/manifest.json`.
- Run the story's requested validation commands.
- Prefer summarized validation output in the final report, with key failure lines only if a command fails.
- Do not broaden into skill-template tuning; that belongs to story `03-tune-skill-guidance-and-validate-template-updates.md`.

## Files

- `templates/AGENTS.md`
- `templates/manifest.json`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/02-add-global-context-budget-discipline.md`

## Done when

- Manual diff review confirms the guidance is brief, clear, non-repetitive, and quality-preserving.
- Every acceptance criterion in `02-add-global-context-budget-discipline.md` is satisfied.
- `pnpm test` passes.
- `sibu doctor` reports a healthy workflow.
- Any validation failure is reported with the command, result, and focused failure evidence before continuing.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T18:35:27-06:00
