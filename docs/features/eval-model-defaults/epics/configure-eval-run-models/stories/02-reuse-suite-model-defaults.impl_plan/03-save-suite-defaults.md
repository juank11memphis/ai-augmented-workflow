# Step: Save one suite default through a guarded mutation slice

## Goal

Let an explicit set, change, or reset persist exactly one suite choice while preserving unrelated content and failing safely on unsafe paths, stale edits, or write errors.

## Scope

- Task ID: EMD-S02-T03; Milestone ID: EMD-S02-M2 (safe persistent choice); Status: checked-committed (d629f9c); Depends on: EMD-S02-T01, EMD-S02-T02.
- Story acceptance criteria: AC-01–AC-03; source decisions: BRD `REQ-01`, `REQ-05`, `AC-01`, `AC-02`, `AC-05`; SDD explicit Save, direct project-root `evals/` file only, complete re-read/validation, compare-before-write token, atomic replacement where supported, no `.sibu/state.json`, no lost concurrent edit or credential/provider-response persistence. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Project-Owned Suite Format and Persistence, Security, Failure, and Operational Behavior; `ux.md` → Phone: persistent model dialogs, Interaction States and Recovery. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Local Evals Workbench change-saved-model-choice slice: command/result and ports first, handler with fake-port validation second, contained project-file adapter third, thin HTTP route/composition last. Save one suite role per command; reset removes that field. Validate model compatibility at save; surface conflict/blocked, not success. Do not mutate for dialog Cancel, preview, start, or This run only.
- Use disposable fixture projects for direct-path, symlink/root-escape, malformed/oversized JSON, stale token/concurrent edit, and injected write failure. Preserve previous bytes on non-success; distinguish safe reason codes and log only safe identifiers/reasons.

## Files

- `src/modules/local-evals-workbench/change-saved-model-choice/{command,result,ports,handler,index}.ts`
- `src/modules/local-evals-workbench/change-saved-model-choice/{handler,project-file-adapter}.test.ts`
- `src/modules/local-evals-workbench/change-saved-model-choice/project-file-adapter.ts`
- `src/modules/local-evals-workbench/workbench-composition.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-starter.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-suite-contract.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/change-saved-model-choice/handler.test.js bin/modules/local-evals-workbench/change-saved-model-choice/project-file-adapter.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/local-server-suite-contract.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: set/change/reset of either independent role, single-field mutation with unrelated bytes/semantic content preserved, conflict and injected failure non-success with previous file intact, path/symlink escapes refused, thin save-route result translation, zero writes on cancel-equivalent/no-save path, plus the size-checker's count and ≤500-line result for this Task's uncommitted source changes.
- The fixture tests establish SDD suite-mutation and edge/failure methods for REQ-01/05. If the chosen adapter cannot provide compare-before-write protection against the tested concurrent edit, stop for an engineer-directed persistence decision rather than weakening this check. Repeated stress/fuzz runs are skipped as nondeterministic; controlled interleaving proves the required conflict path, with host-filesystem behavior a residual risk.
- `local-server-starter.ts` is ~470 lines: extract a cohesive route/result translator before any touched source exceeds 500 lines.
