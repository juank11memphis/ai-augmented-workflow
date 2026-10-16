# Step: Use the shared selection in preview and start

## Goal

Make preview and start consume suite defaults through the same resolver, and recheck immediately before queueing any paid work.

## Scope

- Task ID: EMD-S02-T04; Milestone ID: EMD-S02-M3 (consistent run decisions); Status: checked-committed (a2e1aae); Depends on: EMD-S02-T02, EMD-S02-T03.
- Story acceptance criteria: AC-01–AC-04; source decisions: BRD `REQ-03`–`REQ-05`, `AC-01`, `AC-02`, `AC-04`, `AC-05`; SDD preview/start shared snapshot-and-description resolver, stale preview not authority, missing/unavailable blocks before runner or artifact creation, one-run choice never persisted. On-demand pointers: `sdd.md` → Main Flow and Runner Coordination sequence diagram, Security, Failure, and Operational Behavior, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Local Evals Workbench preview/start slices: evolve command/result and parser contracts, then handlers with fake ports, then composition/HTTP adapters. Selection semantics remain in the shared resolver, not entrypoints. Preserve existing runner execution, run evidence, result detail, and repair behavior; T09 records the immutable per-case plan and T10 executes Judge-applicability batches; case-specific tested-model X/Y overrides remain EMD-S03.
- Start re-loads suite and re-describes compatible models; materially changed suite/catalog returns updated preview or blocked result requiring another explicit Start, with zero paid calls. Full suite rejects temporary input; single-case temporary tested/judge selection stays on the request and in actual run evidence, never in suite JSON.

## Files

- `src/modules/local-evals-workbench/preview-eval-run/{command,result,handler,request-parser}.ts`
- `src/modules/local-evals-workbench/start-eval-run/{command,result,handler,request-parser}.ts`
- `src/modules/local-evals-workbench/{workbench-composition,runtime-ports}.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-starter.ts`
- Focused handler, parser, and local-server integration tests beside those modules.

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/preview-eval-run/handler.test.js bin/modules/local-evals-workbench/start-eval-run/handler.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/local-server-suite-contract.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: preview/start agree on effective pair, saved rerun needs no new choice, missing/unavailable returns precise block with zero scheduling/paid runner calls, stale file/catalog yields no queue, temporary single-case run leaves suite bytes unchanged, full-suite temporary input is rejected, plus the size-checker's count and ≤500-line result for this Task's uncommitted source changes.
- Add or extend deterministic fixture integration coverage for actual selected model labels and existing result/detail/repair continuity; no historical artifact rewrite. This answers SDD pure/fake-port, preview/start recheck, and regression methods for REQ-03–06. T09/T10 prove this Story's deterministic/rubric Judge-applicability plan and interruption; EMD-S03 proves eight-X/one-Y override batching.
- `local-server-starter.ts` is ~470 lines: extract a cohesive route/result translator before any touched source exceeds 500 lines. Do not hide the limit by altering compiled output.
