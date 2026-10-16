# Step: Resolve saved and run-only choices in one policy

## Goal

Provide a shared, transport-independent selection result for suite and single-case scope before adapters can preview or queue a run.

## Scope

- Task ID: EMD-S02-T02; Milestone ID: EMD-S02-M1; Status: checked-committed (5a0cabd); Depends on: EMD-S02-T01.
- Story acceptance criteria: AC-01–AC-04; source decisions: BRD `REQ-01`, `REQ-03`–`REQ-05`, `AC-01`, `AC-02`, `AC-04`, `AC-05`; SDD shared resolver, saved suite defaults required first, judge only for selected rubric cases, temporary choice single-case only, typed blocked outcomes and no fallback. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Project-Owned Suite Format and Persistence, Main Flow and Runner Coordination sequence diagram, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Local Evals Workbench selection slice: define command/result and runner-description port, then pure resolver/handler policy and fake-port tests. Preserve source case order and one model pair per selected case; no case override controls; T10 handles Judge-applicability batching, while tested-model X/Y overrides remain EMD-S03.
- Explicitly distinguish missing suite default, unavailable saved model, malformed run-only input, and ready selection with affected suite/case/role. A run-only choice cannot bypass a missing or unavailable saved suite default. No paid runner call in this slice.

## Files

- `src/modules/local-evals-workbench/resolve-eval-run-selection/command.ts`
- `src/modules/local-evals-workbench/resolve-eval-run-selection/result.ts`
- `src/modules/local-evals-workbench/resolve-eval-run-selection/handler.ts`
- `src/modules/local-evals-workbench/resolve-eval-run-selection/ports.ts`
- `src/modules/local-evals-workbench/resolve-eval-run-selection/handler.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/resolve-eval-run-selection/handler.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: fake-port cases for independent tested/judge defaults, deterministic-only no-judge, old missing default, unavailable saved choice, compatibility change, single-case one-run model/judge, unchanged saved suite, and full-suite run-only rejection with typed reason and zero execution calls, plus the size-checker's count and ≤500-line result for this Task's uncommitted source changes.
- The same command/result can be consumed by both preview and start. This is the SDD pure/fake-port method for REQ-01/03–05; later Tasks prove transport integration. Property/fuzz testing is skipped because finite role/scope/state combinations are covered deterministically; residual filesystem race risk belongs to T03.
