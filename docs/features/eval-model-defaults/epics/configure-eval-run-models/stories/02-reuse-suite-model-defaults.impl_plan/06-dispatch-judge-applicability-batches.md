# Step: Dispatch Judge-applicability batches as one logical run

## Goal

Execute deterministic and rubric cases under correct nullable Judge choices, preserving order, partial evidence, and one run identity.

## Scope

- Task ID: EMD-S02-T10; Milestone ID: EMD-S02-M3; Status: checked-committed (777cc31); Depends on: EMD-S02-T09.
- Story acceptance criteria: AC-02, AC-03, AC-05, AC-06; source decisions: BRD `REQ-03`, `REQ-05`, `REQ-06`, `AC-02`, `AC-05`, `AC-06`; SDD preflight, ordered homogeneous batches, single logical result, interruption/malformed stop without paid retry. On-demand pointers: `sdd.md` → Main Flow and Runner Coordination sequence diagram, Run Evidence, Presentation, and Compatibility, Security, Failure, and Operational Behavior, Quality Strategy and Planned Verification; `ux.md` → Phone: blocked choice and case-first result. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Local Evals Workbench start, run-execution, and UI result adapters consume T09 plan. Partition consecutive cases only when tested/Judge pair changes; deterministic→rubric→deterministic and rubric-first produce null→saved Judge→null as applicable, preserving source order and one run ID/completion. Preflight all selected cases before paid calls; no fallback. Stop on interrupted/malformed event, preserve completed-case evidence, do not retry. Homogeneous legacy works; mixed legacy input without full plan rejects. Case overrides remain EMD-S03.

## Files

- `src/modules/local-evals-workbench/run-execution/{batches,contracts}.ts`
- `src/modules/local-evals-workbench/start-eval-run/{handler,ports}.ts`
- `src/modules/local-evals-workbench/start-eval-run/handler.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/{workspace-client,workspace-layout,workspace-results-client,workspace-setup-client}.ts`
- `src/modules/local-evals-workbench/workbench-ui/{workspace-rendering,workspace-setup-interactions}.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/start-eval-run/handler.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-rendering.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: fake-runner/artifact cases for both Judge-applicability orders, one logical completion/ID, true labels, missing/unavailable/stale zero calls, interruption/malformed stop later batches without retry, homogeneous legacy accepted, mixed legacy rejected, size gate ≤500 lines. Observed focused check history supplied by main: 36/36 passed, build/size passed; commit `777cc31`.
- This answers SDD runner/artifact integration and edge/failure for Story AC-06. Eight-X/one-Y override execution and override-specific partial run remain EMD-S03; no browser or live model test.
