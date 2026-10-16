# Step: Execute and retain truthful mixed-case evidence

## Goal

Prove one logical run carries actual independent model pairs through ordered runner batches and persisted results, including partial and old-history reads.

## Scope

- Task ID: EMD-S03-T04; Milestone ID: EMD-S03-M2 (resolved mixed run); Status: done; Depends on: EMD-S03-T03.
- Story acceptance criteria: AC-02, AC-04. Source decisions: `brd.md` REQ-03/06, AC-03/06; `sdd.md` one run ID, consecutive homogeneous batches, unchanged one-pair runner protocol, no intermediate full-run completion, no paid retry, actual per-case manifest/evidence, old single-model history fallback. On-demand pointers: `sdd.md` → Main Flow and Runner Coordination (sequence diagram), Run Evidence, Presentation, and Compatibility, Security, Failure, and Operational Behavior, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning module: Local Evals Workbench execution and run-history slices. Reuse S02 ordered batching rather than changing runner requests; ensure both tested and judge pair changes create boundaries, all cases keep source order and one logical run ID, and persisted per-case labels derive from the immutable start plan rather than later suite defaults. Keep completed evidence on interruption or malformed event and mark remaining cases honestly incomplete/partial.
- Use disposable fake runner and artifact fixtures, including 8 X/1 Y, changed judge on rubric cases, mid-run interruption, and a pre-feature single-model manifest. Do not rewrite old artifacts or run a live model.

## Files

- `src/modules/local-evals-workbench/run-execution/{batches,offline-acceptance.test}.ts`
- `src/modules/local-evals-workbench/execute-eval-run/{handler,handler.test}.ts`
- `src/modules/local-evals-workbench/run-history/{contracts,file-artifact-reader,artifact-history-acceptance.test,interrupted-run-recovery.test}.ts`
- `src/modules/local-evals-workbench/workbench-ui/run-execution-acceptance.test.ts`

## Done when

- Task check: after `pnpm run build`, `node --test bin/modules/local-evals-workbench/run-execution/offline-acceptance.test.js bin/modules/local-evals-workbench/execute-eval-run/handler.test.js bin/modules/local-evals-workbench/run-history/artifact-history-acceptance.test.js bin/modules/local-evals-workbench/run-history/interrupted-run-recovery.test.js bin/modules/local-evals-workbench/workbench-ui/run-execution-acceptance.test.js`; pass: zero failed tests; expected evidence: isolated 8 X/1 Y and independent judge batch calls preserve order and one run ID, persisted/read case models match executed pairs, interrupted run retains completed cases and honest remainder, and old run-wide-pair history reads without artifact rewrite. This is SDD runner/artifact integration and backward-regression evidence for REQ-03/06 and Story AC-02/04.
- Do not introduce automatic paid retry or leak raw responses in logs. Record `node .agents/scripts/check-touched-source-file-lines.mjs` pass/fail before commit.
