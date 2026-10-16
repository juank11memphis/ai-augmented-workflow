# Step: Record an immutable ordered per-case run plan

## Goal

Persist each case's actual tested model and nullable Judge model before execution without rewriting old run evidence.

## Scope

- Task ID: EMD-S02-T09; Milestone ID: EMD-S02-M3; Status: checked-committed (97336b9); Depends on: EMD-S02-T04.
- Story acceptance criteria: AC-01, AC-02, AC-04, AC-06; source decisions: BRD `REQ-03`, `REQ-06`, `AC-02`, `AC-06`; SDD immutable ordered selection, one logical run, true per-case labels, old history readable without rewrite. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Main Flow and Runner Coordination, Run Evidence, Presentation, and Compatibility, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Local Evals Workbench run-execution and run-history contracts own a complete immutable plan, ordered by source case. Deterministic cases record nullable Judge as null; rubric cases retain saved Judge choice. Do not derive actual choices from later defaults. Keep old single-pair artifacts readable and untouched. Case-override X/Y selection remains EMD-S03.

## Files

- `src/modules/local-evals-workbench/run-execution/contracts.ts`
- `src/modules/local-evals-workbench/run-history/{contracts,validation,file-artifact-reader,file-artifact-store}.ts`
- `src/modules/local-evals-workbench/run-history/{file-artifact-reader,file-artifact-store}.test.ts`
- `src/modules/local-evals-workbench/execute-eval-run/{handler.ts,handler.test.ts}`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/run-history/file-artifact-reader.test.js bin/modules/local-evals-workbench/run-history/file-artifact-store.test.js bin/modules/local-evals-workbench/execute-eval-run/handler.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: isolated artifact tests reject missing, duplicate, or out-of-order selections, persist complete immutable per-case tested/nullable Judge choices, read old artifacts without rewrite, and size gate ≤500 lines. Observed focused check history supplied by main: 18/18 passed, build/size passed; commit `97336b9`.
- This supplies the SDD artifact/compatibility method for REQ-03/06, not yet mixed-Judge dispatch; T10 proves execution. No live model or migration.
