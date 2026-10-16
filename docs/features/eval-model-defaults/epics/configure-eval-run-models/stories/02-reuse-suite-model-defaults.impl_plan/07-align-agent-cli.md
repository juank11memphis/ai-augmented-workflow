# Step: Align the agent-facing CLI with saved-choice outcomes

## Goal

Let the agent-guided command flow use the same saved default and blocking decisions as the UI without requiring a run-wide model on every invocation.

## Scope

- Task ID: EMD-S02-T05; Milestone ID: EMD-S02-M3; Status: checked-committed (b89c49f); Depends on: EMD-S02-T03, EMD-S02-T04, EMD-S02-T09, EMD-S02-T10.
- Story acceptance criteria: AC-01–AC-05; source decisions: BRD `REQ-01`, `REQ-03`–`REQ-06`, `AC-01`, `AC-02`, `AC-04`–`AC-06`; SDD agent-facing CLI drives the same commands/results and does not calculate fallback or persist run-only input. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Run Evidence, Presentation, and Compatibility, Quality Strategy and Planned Verification; `ux.md` → Interaction States and Recovery (Agent-guided parity). Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Evolve `evals describe`/`evals run` and explicit saved-choice command parsing/result translation through existing composition, without a second model policy in CLI. Omitted run model means use saved default; provided model is legal only for one case as This run only. Expose a deliberate suite set/change/reset operation through the established CLI command routing if needed for agent recovery; do not make a blocked run silently save the proposed choice.
- Return affected suite/role, missing/unavailable/conflict reason, and explicit safe next action. Preserve bounded JSON output and current result/repair flow. Never log model output, prompts, credentials, or rubric text.

## Files

- `src/entrypoints/cli/evals-json.ts`
- `src/entrypoints/cli/evals-json.test.ts`
- `src/entrypoints/cli/` eval command parser/dispatcher tests and types directly needed for saved-choice operation.
- `src/modules/local-evals-workbench/headless-eval-run/{command,handler,result}.ts`
- `src/modules/local-evals-workbench/headless-eval-run/handler.test.ts`
- `src/modules/local-evals-workbench/workbench-composition.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/entrypoints/cli/evals-json.test.js bin/modules/local-evals-workbench/headless-eval-run/handler.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: same ready/missing/unavailable/temporary/full-suite-rejection outcome as UI-facing handlers, explicit set/reset recovery, no suite mutation on preview/run, no paid call on blocked choice, mixed deterministic/rubric headless run and interruption with one logical run and truthful labels, plus the size-checker's count and ≤500-line result for this Task's uncommitted source changes.
- This deterministic CLI/handler evidence covers SDD agent parity and regression for REQ-06/AC-06; it cannot prove a live agent follows distributed guidance. No live agent or LLM eval is in scope.
