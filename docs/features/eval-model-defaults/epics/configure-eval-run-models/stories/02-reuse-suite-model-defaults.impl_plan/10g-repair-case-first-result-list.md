# Step: Repair case-first result-list regression

## Goal

Make the result-list client and its deterministic harness honor the binding case-first UX and actual saved per-case evidence.

## Scope

- Task ID: EMD-S02-T19; Milestone ID: EMD-S02-M5; Status: done; Depends on: EMD-S02-T18; blocks EMD-S02-T08.
- Story acceptance criteria: AC-05, AC-06; source decisions: BRD `REQ-06`, `AC-06`; SDD Run Evidence, Presentation, Quality Strategy; binding `ux.md` → Phone blocked choice and case-first result, Tablet, Desktop, Results/Interaction States. On-demand pointers: `src/modules/local-evals-workbench/workbench-ui/workspace-results-client.ts` → `completedResultsForSelectedRun`/`renderWorkspace`; `src/modules/local-evals-workbench/workbench-ui/workspace-result-data.ts` → static per-case projection. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Five `workspace-results-client` failures reproduce on the Epic base, so first identify whether each is stale harness/assertion or a real S01/S02 presentation defect. Repair against current UX: one row/card per completed case, actual per-case tested/nullable Judge model, honest incomplete/excluded summaries, result search/filter/focus and existing inspection/repair access. Do not restore a model-column matrix or run-wide label to satisfy old tests. Preserve historical run fallback; do not touch T08 paths.
- `workspace-results-client.test.ts` is already 515 lines and `workspace-results-client.ts` is 433: extract read-notice/history cases into `workspace-results-client-read.test.ts` before the size gate; if source growth crosses 500, extract a cohesive client responsibility. Do not discard cases to meet the limit.

## Files

- `src/modules/local-evals-workbench/workbench-ui/workspace-results-client.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-results-client.ts` only for a demonstrated UX/contract defect
- `src/modules/local-evals-workbench/workbench-ui/workspace-results-client-read.test.ts`
- Cohesive sibling source module only if needed for the source-size gate.

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/workbench-ui/workspace-results-client.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-results-client-read.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-rendering.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-selected-evidence.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: all five formerly failing result-client cases, case-first static/interactive parity, actual per-case labels, legacy run readability, and search/filter/detail recovery remain asserted; touched source files are ≤500 lines.
- Deterministic fake-DOM and historical-result regression evidence cannot replace the user's responsive/visual/accessibility QA. If the current UX and required repair conflict materially, stop for engineer decision rather than choosing a new product contract. Flags: none.
