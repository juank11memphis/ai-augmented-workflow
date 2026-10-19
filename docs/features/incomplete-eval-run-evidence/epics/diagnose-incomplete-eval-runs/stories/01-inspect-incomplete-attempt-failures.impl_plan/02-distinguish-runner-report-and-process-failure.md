# Step: Distinguish runner reports from process and protocol failures

## Goal

Make the runner-process adapter report independently observed terminal-report and process facts to the execute-run handler, preserving the last accepted event when termination is abnormal.

## Scope

- Task ID: IERE-S01-T02; Milestone ID: IERE-S01-M01 (durable truthful failure evidence); Status: done; Depends on: IERE-S01-T01.
- Story acceptance criteria: AC-02, AC-03; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-02, REQ-04, REQ-08 and AC-02/AC-05; `docs/features/incomplete-eval-run-evidence/sdd.md` “Main flow and failure branches” sequence diagram and “Quality strategy — planned, not yet run”; on-demand pointers: those headings, `src/modules/local-evals-workbench/runner-process/execute-adapter.ts`, `execute-events.ts`; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench runner-process adapter behind execute-run's runner port. Preserve a validated `run-completed` error report and its safe reported code independently of process exit; a nonzero exit with no valid report is an unexpected exit, while report plus nonzero exit exposes both facts. Timeout and protocol rejection keep their own stages. Never use stderr or an unvalidated runner message as a persisted reported reason; old protocol-v1/v2 event acceptance remains compatible.
- On timeout, malformed trailing event, or death, return the last successfully consumed case/attempt checkpoint; incomplete chunks remain gaps where current protocol can identify them. Do not synthesize a completed turn/case or response record. Keep operational logs structured and safe.
- Use disposable fake-runner adapter tests, preferably new focused tests rather than growing existing suites toward the 500-line limit. No provider/judge body capture or new protocol version in S01.

## Files

- `src/modules/local-evals-workbench/runner-process/execute-adapter.ts`
- `src/modules/local-evals-workbench/runner-process/execute-events.ts` (only if terminal-report contract needs a validator change)
- `src/modules/local-evals-workbench/runner-process/failure-origin.test.ts` (new)
- `src/modules/local-evals-workbench/run-execution/contracts.ts`

## Done when

- Task check: `pnpm build`; pass: adapter implements the revised runner-port outcome and old callers compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/runner-process/failure-origin.test.js bin/modules/local-evals-workbench/runner-process/execute-adapter.test.js bin/modules/local-evals-workbench/runner-process/execute-events.test.js`; pass: disposable fake runner proves valid error report vs exit-only vs report-plus-exit, timeout and malformed trailing-event checkpoint preservation, valid v1/v2 behavior, and no raw stderr/response content in safe outcome/logs; expected evidence: named branch tests pass with observed event list and typed adapter outcome.
- The adapter hands only validated, bounded facts to the handler; terminal order does not erase earlier valid attempt evidence, and process status alone never becomes a runner-reported error.
- Evidence class: adapter contract, edge/failure, regression. Skip live models and torture/fuzz because deterministic sequences cover the failure transitions; residual risk is external runner timing beyond fake-process cases.
