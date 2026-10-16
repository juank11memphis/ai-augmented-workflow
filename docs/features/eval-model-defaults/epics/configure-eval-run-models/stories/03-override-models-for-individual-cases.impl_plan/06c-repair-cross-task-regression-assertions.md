# Step: Repair cross-task run-result and blocked-start regression assertions

## Goal

Restore the existing deterministic evidence assertions after earlier same-Story Tasks expanded run-result and blocked-selection contracts, without weakening those contracts or touching the preserved distribution work.

## Scope

- Task ID: EMD-S03-T06C; Milestone ID: EMD-S03-M3 (surface parity); Status: done; Depends on: EMD-S03-T03, EMD-S03-T05, EMD-S03-T06, EMD-S03-T06B.
- Story acceptance criteria: AC-03, AC-04, AC-05. Preserve actual per-case tested/judge labels (REQ-06), typed blocked source (REQ-05), blocked Start focus behavior (UX Interaction States and Recovery), and no paid start after a blocked choice.
- Bounded regression follow-up attributed to T03/T06's result/blocked metadata contract and T05's setup-control refresh behavior. Update the stale expectations/fixture wiring to reflect the true contracts; do not suppress actual fields, weaken equality/behavior assertions, or change production behavior without further evidence.
- Own only `headless-eval-run/handler.test.ts` and `workbench-ui/preview-acceptance.test.ts` unless direct same-module evidence proves another test file is necessary. Do not touch T07's preserved Template Catalog/distribution files.
- On-demand source pointers: `sdd.md` → Run Evidence, Presentation, and Compatibility; Quality Strategy and Planned Verification; `ux.md` → Interaction States and Recovery. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`.

## Files

- `src/modules/local-evals-workbench/headless-eval-run/handler.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/preview-acceptance.test.ts`

## Done when

- Task check, in exact order: `pnpm run build`; `node --test bin/modules/local-evals-workbench/headless-eval-run/handler.test.js bin/modules/local-evals-workbench/workbench-ui/preview-acceptance.test.js`; `node .agents/scripts/check-touched-source-file-lines.mjs`.
- Each exact command exits zero. Expected evidence: completed headless result assertions retain actual `testedModel: 'fake/model'` and `judgeModel: null`; both blocked result expectations retain `source: 'suite-default'`; blocked Start followed by Save returns focus to Start run through a fixture containing the required `refreshSetupControls` collaborator; and blocked paths do not start paid execution. Assertions continue to fail if actual model/source metadata, focus return, or no-start behavior regresses.
- This restores SDD fake-port/result-presentation and UI-interaction regression evidence for REQ-05/06 and AC-03/04/05. Do not alter the required SDD methods or add external/live-model checks. Human visual/accessibility QA remains user-owned as specified by the SDD/UX.
