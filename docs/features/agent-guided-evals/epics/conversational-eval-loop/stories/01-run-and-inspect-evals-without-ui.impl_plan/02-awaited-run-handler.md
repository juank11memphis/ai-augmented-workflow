# Step: Implement the awaited headless run handler

## Goal

Make one selected case or a whole suite reach a persisted terminal outcome before the headless command returns.

## Scope

- Task ID: AGE-US-01-T02; Milestone ID: AGE-US-01-M02; Status: done; Depends on: AGE-US-01-T01.
- Story acceptance criteria: AC-02, AC-04; source decisions: SDD `run` Command/Result, terminal-state and persisted-evidence rule, safety/state distinctions, sequence diagram; BRD `REQ-02/09/10`, `AC-06/07`; on-demand pointers: `docs/features/agent-guided-evals/sdd.md` §§ Command contracts and boundaries, Main interaction and verification loop (sequence diagram), Safety, state, and failure behavior, Quality strategy and planned verification; `docs/architecture.md` §§ Operation contract, Local Evals Workbench; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning area: `src/modules/local-evals-workbench/headless-eval-run/`. Add immutable selection Command, transport-neutral Result, slice-owned orchestration Ports, and Handler first. Ports represent existing suite/runner/artifact services in application terms; the Handler performs semantic scope/model/judge validation and awaits completion and persisted readback. Do not invent a second runner or access filesystem/process directly.
- Return run ID, actual terminal state, concise case/assertion status and diagnostics. Distinguish completed-with-failed-assertions from blocked, error, partial, interrupted, and missing artifact. Never translate queued/running into success; on interruption after allocation return run ID and persisted state where available. Preserve original reason and bounded next-action context.
- Inject safe operational logging. Emit bounded structured run/blocked events with valid run ID, scope, status/reason, duration; exclude credentials, raw outputs, full evidence and patches. A log sink failure must not change the operation result.

## Files

- `src/modules/local-evals-workbench/headless-eval-run/{command,result,ports,handler,index}.ts` and `handler.test.ts`.
- `src/modules/local-evals-workbench/index.ts`.
- `src/modules/local-evals-workbench/start-eval-run/{command,result,ports}.ts` and `execute-eval-run/{command,result,ports}.ts` as existing contracts to adapt rather than duplicate.

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/local-evals-workbench/headless-eval-run/handler.test.js`; pass: fake-port tests prove selected/all scope, model and required/forbidden judge validation, awaited terminal and persisted readback, failed assertions versus partial/blocked/error/interrupted, missing artifact, and safe logger fields; expected evidence: each state has a named assertion on Result status/run ID/reason and no queued false pass.
- Handler-level deterministic unit coverage answers SDD Quality strategy for run orchestration and `REQ-02/09/10`; no live model is called. No agent behavior is inferred.
- Command/Result/Ports/Handler remain transport-neutral and dependency-inverted; terminal persistence is a `Done when` invariant, not a background best-effort operation.
