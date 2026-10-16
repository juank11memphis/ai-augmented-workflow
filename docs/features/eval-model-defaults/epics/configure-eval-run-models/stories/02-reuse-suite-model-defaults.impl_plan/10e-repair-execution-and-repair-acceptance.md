# Step: Repair execution and repair-handoff acceptance fixtures

## Goal

Keep offline execution, rubric judging, and approved-repair reruns valid under saved defaults without changing historical evidence.

## Scope

- Task ID: EMD-S02-T17; Milestone ID: EMD-S02-M5; Status: done (commit 8e32db2); Depends on: EMD-S02-T16; blocks EMD-S02-T08.
- Story acceptance criteria: AC-01, AC-02, AC-04–AC-06; source decisions: BRD `REQ-03`–`REQ-06`, `AC-01`, `AC-04`–`AC-06`; SDD Main Flow, Run Evidence, Quality Strategy. On-demand pointers: `src/modules/local-evals-workbench/run-execution/offline-project-fixture.ts` → deterministic/rubric suites; `src/modules/local-evals-workbench/repair-context/guided-repair-acceptance.test.ts` → approved rerun; `src/modules/local-evals-workbench/run-execution/offline-acceptance.test.ts` → artifact evidence. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Local Evals Workbench offline acceptance ownership: give ready fixture suites deliberate tested and applicable Judge defaults, adapt full-suite reruns to saved selection, and use one-case run-only inputs only for case scope. Preserve deterministic no-Judge, rubric Judge, ordered evidence, immutable prior run/repair evidence, and explicit missing-default block. Do not weaken repair approval or mutate old artifacts; do not touch T08 paths.

## Files

- `src/modules/local-evals-workbench/run-execution/offline-project-fixture.ts`
- `src/modules/local-evals-workbench/run-execution/offline-acceptance.test.ts`
- `src/modules/local-evals-workbench/repair-context/guided-repair-acceptance.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/run-execution/offline-acceptance.test.js bin/modules/local-evals-workbench/repair-context/guided-repair-acceptance.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: deterministic/rubric disposable runs and distinct confirmed case/suite reruns pass, prior artifact bytes remain unchanged, actual per-case models/nullable Judge labels remain truthful, missing-default blocks before execution, and touched source is ≤500 lines.
- Fake-runner/artifact integration and repair regression evidence only; no live model call. Flags: none.
