# Step: Repair saved-default dialog close and focus regression

## Goal

Restore the selected-case Models dialog's successful Save close and focus-return behavior without changing the saved-default operation contract.

## Scope

- Task ID: EMD-S03-T06B; Milestone ID: EMD-S03-M3 (surface parity); Status: done; Depends on: EMD-S03-T05, EMD-S03-T06A.
- Story acceptance criteria: AC-05. Source decisions: `brd.md` REQ-02/06 and AC-03/06; `sdd.md` Presentation, Compatibility and Quality Strategy; `ux.md` Test-case models dialog and Interaction States and Recovery. The dialog closes on a successful explicit Save, returns focus to the originating Models action, and never auto-starts a run; Cancel/close remains non-mutating.
- Owning area: Local Evals Workbench setup UI adapter and deterministic interaction contract only. Diagnose the saved-default success path and its isolated fixture; keep the repair path disjoint from T07's Template Catalog/distribution edits. Do not alter model-selection, persistence, runner, or template behavior.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md` only if operational paths change.

## Files

- `src/modules/local-evals-workbench/workbench-ui/workspace-suite-models-client.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.ts`

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: each exact command exits zero. Expected evidence: build compiles current source before the focused test; successful Save in the saved-default interaction fixture closes the dialog exactly once and restores focus to its originating Models trigger; Cancel and close remain non-mutating; saving does not auto-start execution; touched source files are ≤500 lines. This is the focused deterministic UI interaction/regression method for REQ-02/06 and Story AC-05. The observed regression is bounded to the successful saved-default UI path: the existing T05 post-save refresh can throw in an incomplete test fixture before close/focus handling.
- User-owned visual, keyboard, and screen-reader QA remains outside this deterministic test.
