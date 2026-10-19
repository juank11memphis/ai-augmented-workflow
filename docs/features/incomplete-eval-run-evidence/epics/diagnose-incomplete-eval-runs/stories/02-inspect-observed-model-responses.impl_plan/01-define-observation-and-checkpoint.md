# Step: Define tested-model observation and checkpoint it before failure

## Goal

Extend the existing execute-run command slice with a transport-neutral tested-model response observation and truthful gap state, proving checkpoint behavior with fake ports before adapter work.

## Scope

- Task ID: IERE-S02-T01; Milestone ID: IERE-S02-M01 (truthful pre-turn capture); Status: completed; Depends on: none.
- Story acceptance criteria: AC-01, AC-03; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01–REQ-03, REQ-05, REQ-06, REQ-08 and AC-01/AC-03/AC-05; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, Main flow and failure branches (sequence diagram), State, limits, and inspection, Quality strategy — planned, not yet run; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench, existing execute-eval-run command/result/port/handler slice. Define a tested-model-only response observation with stable case/attempt/call/provisional-turn identity, exact observed bytes and known content type/length/completeness; distinguish `not-observed`, `not-emitted`, `capture-failed`, `incomplete`, and legacy `not-captured` only where those facts can be known. Do not require a completed turn, assertion, or parsed model-call source record.
- Handler accepts a valid observation/gap, asks a port to durably save it, then checkpoints the incomplete attempt with a returned locator or precise gap before later events. A failed body write must not advertise a complete record; an unsafe or failed checkpoint must return storage failure rather than a false persisted claim. Keep the existing failure provenance and v1/v2 attempt reads intact.
- Fake-port unit tests cover response then malformed-output report, response then unexpected exit, pre-turn observation, no invented turn/assertion/completed case, storage rejection/partial write, and source-gap state. Use a new focused test file rather than expanding `execute-eval-run/handler.test.ts` (498 lines). No judge capture, GeniusCR edit, live model, or raw response in ordinary logs.
- Story-plan view: Story IERE-S02 at `docs/features/incomplete-eval-run-evidence/epics/diagnose-incomplete-eval-runs/stories/02-inspect-observed-model-responses.md`; upstream `docs/features/incomplete-eval-run-evidence/epics/diagnose-incomplete-eval-runs/epic_brief.md`, `docs/features/incomplete-eval-run-evidence/brd.md`, `docs/features/incomplete-eval-run-evidence/sdd.md`, `docs/architecture.md` § Local Evals Workbench; selected architecture `command-pattern`; Flags: none. M01 = pre-turn truthful capture (T01 fake-port checkpoint and T02 versioned protocol); M02 = safe retained/selected inspection (T03 artifact contract, T05 checkpoint-transition regression repair, then T04 CLI/guidance acceptance). AC-01 → M01/T01,T02 and M02/T03,T05,T04; AC-02 → M02/T03,T04; AC-03 → M01/T01,T02 and M02/T03,T05,T04; AC-04 → M01/T02 and M02/T04. Ordered status per append-only execution log: T01 done, T02 done, T03 done, T05 done, T04 done. Execution-only append-only log: `02-inspect-observed-model-responses.impl_plan/progress.log`; each entry records Task ID, outcome, actual check/result, evidence for every Done-when item, commit reference if any, blocker, and gotchas. Completed Task evidence remains in that log; no human approval is claimed.
- Durable validation convention: for focused compiled tests run `pnpm build` before the stated `node --test` command; capture both exits and named assertions. After changes stabilize, run exactly once `pnpm verify` (build and all compiled tests), once `pnpm run validate:packed-runtime` (distinct distributed CLI/runtime behavior; changed runtime files and managed runner guidance are packaged), plus `node .agents/scripts/check-touched-source-file-lines.mjs` and `git diff --check`. Focused checks do not replace the final checks. SDD methods are fake-port unit, protocol/artifact contract, disposable fake-runner CLI acceptance, and compatibility regression; no live model, dashboard, separate QA, fuzz or mutation. Exact bounded invariant/edge cases answer the Story risk; residual limits are real runner/provider behavior and human interpretation of evidence.

## Files

- `src/modules/local-evals-workbench/run-execution/contracts.ts`
- `src/modules/local-evals-workbench/execute-eval-run/ports.ts`
- `src/modules/local-evals-workbench/execute-eval-run/handler.ts`
- `src/modules/local-evals-workbench/run-history/contracts.ts`
- `src/modules/local-evals-workbench/execute-eval-run/provider-response-checkpoint.test.ts` (new)

## Done when

- Task check: `pnpm build`; pass: contracts and handler compile with no type errors; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/execute-eval-run/provider-response-checkpoint.test.js bin/modules/local-evals-workbench/execute-eval-run/failure-provenance.test.js`; pass: named fake-port cases show durable observation/gap checkpoint before reported failure or exit, exact call/provisional-turn link, no fabricated completion, and truthful storage failure; expected evidence: passing test names and captured fake-store snapshots.
- Handler/result contracts contain no CLI or filesystem policy, and safe structured logs contain metadata only, never the synthetic raw-body sentinel. Legacy absence remains `not-captured`, not an inferred response.
- Evidence class: unit, edge/failure, invariant, regression. This Task does not assert adapter, file durability, or CLI behavior; T02–T04 do.
