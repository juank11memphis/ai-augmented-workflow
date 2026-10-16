# Step: Align workbench setup and preview regressions

## Goal

Test saved selection and one-case temporary controls against the current preview/start interaction contract.

## Scope

- Task ID: EMD-S02-T18; Milestone ID: EMD-S02-M5; Status: done (commit fd66292); Depends on: EMD-S02-T17; blocks EMD-S02-T08.
- Story acceptance criteria: AC-01–AC-05; source decisions: BRD `REQ-01`, `REQ-03`–`REQ-06`, `AC-01`, `AC-04`–`AC-06`; SDD Main Flow, Presentation, Quality Strategy; binding UX `ux.md` → Phone suite defaults and full-suite run, This run only, blocked choice, Interaction States. On-demand pointers: `src/modules/local-evals-workbench/workbench-ui/workspace-setup-client.ts` → run input; `src/modules/local-evals-workbench/start-local-evals-workbench/public-issue.ts` → startCopy. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Workbench setup test ownership: replace stale old model-field and run-wide request assertions with saved-default full-suite and one-case temporary request expectations. In `startCopy`, assert required reason keys/copy behavior rather than a brittle total when new typed choice blocks are valid. Preserve no-estimate preview, precise missing/unavailable dialog focus, Save/Cancel no auto-start, and no mutation from run-only input. Change production only for a proven source-aligned defect; do not touch T08 paths.

## Files

- `src/modules/local-evals-workbench/workbench-ui/workspace-preview-outcomes.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/workbench-ui/workspace-preview-outcomes.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.js bin/modules/local-evals-workbench/workbench-ui/preview-acceptance.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-recovery.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: both formerly failing files and T07/T13 regression checks pass, exact saved/run-only request bodies and blocked recovery remain asserted, no auto-start or price/call estimates appear, and touched source is ≤500 lines.
- Deterministic fake-DOM/markup evidence cannot prove browser focus or phone/tablet/desktop fidelity; user QA remains. Flags: none.
