# Step: Wire existing eval runtime through headless adapters

## Goal

Connect the new handlers to the same project-owned discovery, runtime description, runner, safety checks, and artifact history used by the UI, without starting the HTTP workbench.

## Scope

- Task ID: AGE-US-01-T03; Milestone ID: AGE-US-01-M02; Status: done; Depends on: AGE-US-01-T02.
- Story acceptance criteria: AC-01, AC-02, AC-04; source decisions: SDD no parallel engine, terminal run, shared artifact contracts and safety; BRD `REQ-01/02/09/10`, `AC-06/07`; on-demand pointers: `docs/features/agent-guided-evals/sdd.md` §§ Architecture and responsibilities, Command contracts and boundaries, Safety, state, and failure behavior, Quality strategy and planned verification; `src/modules/local-evals-workbench/workbench-composition.ts`; `src/modules/local-evals-workbench/run-history/composition.ts`; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning area: Local Evals Workbench composition/adapters. Build separate headless composition that injects existing public discovery/description/start/execution/history capabilities; resolve suite inputs and artifact readiness through existing protections. Unlike the UI's queued `queueMicrotask` scheduler, this adapter must await `executeEvalRun` (or an equivalent shared public completion operation) and read the persisted terminal manifest before returning. Do not import `NodeLocalWorkbenchServerStarter` or require a listening port.
- Keep each adapter outward-facing and thin; reuse the current runner protocol, model/judge compatibility, artifact root/symlink/ignored-path guards, and `createRunHistory`. If adapting `startEvalRun` needs an awaited execution seam, add only a narrow module-owned seam and preserve UI behavior; do not make `start-local-evals-workbench/local-server-starter.ts` exceed 500 lines.
- Use disposable local fixture runners. Exercise completion, assertion failure, partial progress, runner interruption, missing credentials, unsafe artifacts, and pre-existing/concurrent project edits without treating them as authorization for any file mutation. Explicitly document the existing one-process-per-project artifact-index limitation; do not claim cross-process concurrency safety.

## Files

- `src/modules/local-evals-workbench/headless-composition.ts` and `headless-composition.test.ts`.
- `src/modules/local-evals-workbench/run-execution/offline-project-fixture.ts` and a focused new offline acceptance test, if fixture reuse requires it.
- `src/modules/local-evals-workbench/workbench-composition.ts` only for a narrow shared seam; avoid unrelated UI refactor.

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/local-evals-workbench/headless-composition.test.js`; pass: disposable fixture tests show headless discovery/run/result share suite IDs, run schema and persisted artifacts with the existing workbench route, and no HTTP server is started; expected evidence: matching suite/case IDs, a terminal manifest/readback, and explicit assertion on zero server start.
- Edge/failure fixture cases show invalid IDs, unavailable model/judge or credentials, runner interruption/partial, and unsafe artifact path produce typed non-success with any persisted run ID/state preserved; project tracked files and pre-existing edits are unchanged. This answers SDD Quality strategy and `REQ-09/10` without a live LLM.
- Existing UI scheduler remains queued/asynchronous; headless completion is awaited. No second suite parser, runner implementation, or artifact store is introduced.
