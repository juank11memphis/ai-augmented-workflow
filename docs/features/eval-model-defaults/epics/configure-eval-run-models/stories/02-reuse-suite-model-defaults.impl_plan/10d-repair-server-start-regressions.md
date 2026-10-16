# Step: Repair server start and correlation regressions

## Goal

Preserve start, history, background, and recovery behavior under saved suite defaults and the new run-only scope rule.

## Scope

- Task ID: EMD-S02-T16; Milestone ID: EMD-S02-M5; Status: done; Depends on: EMD-S02-T15; blocks EMD-S02-T08.
- Story acceptance criteria: AC-01–AC-04, AC-05; source decisions: BRD `REQ-03`–`REQ-06`, `AC-01`, `AC-04`, `AC-05`; SDD Main Flow, Security/Failure, Quality Strategy. On-demand pointers: `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-starter-test-fixture.ts` → offline suite; the five listed tests → preview/start and correlation cases. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md` only if operational behavior changes.
- Local-server test/fixture ownership: add an explicit saved default to the shared ready fixture and adapt ready full-suite requests to use it; retain an explicit no-default fixture for blocked recovery. Convert case-scoped alternate values to the supported run-only input and keep full-suite run-only rejection. Preserve start-reference correlation, lost-response reconciliation, history truth, unsafe-request failures, and zero paid calls on blocked selection. Production changes are permitted only if a source-aligned defect is demonstrated; do not mutate production semantics merely to restore old assertions or touch T08 paths.
- `local-server-starter.test.ts` is 491 lines: if edited beyond 500, extract cohesive tests into a sibling file; do not mechanically truncate coverage.

## Files

- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-starter-test-fixture.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-setup-recovery.test.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/start-http-correlation.test.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-starter.test.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/lost-start-integration.test.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/start-background-correlation.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/start-local-evals-workbench/local-server-setup-recovery.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/start-http-correlation.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/local-server-starter.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/lost-start-integration.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/start-background-correlation.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: five failing server files pass, ready and blocked choices have distinct fixture preconditions, start/reference/history invariants remain asserted, and touched source files are ≤500 lines.
- Disposable HTTP and fake-runner acceptance/regression evidence answers SDD preview/start recheck and recovery questions; no live runner or automatic retry. Flags: none.
