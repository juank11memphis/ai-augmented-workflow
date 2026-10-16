# Step: Resolve each selected case before execution

## Goal

Make preview and start resolve independent case overrides through the shared Workbench selection handler, blocking unavailable choices before a paid request.

## Scope

- Task ID: EMD-S03-T03; Milestone ID: EMD-S03-M2 (resolved mixed run); Status: done; Depends on: EMD-S03-T01, EMD-S03-T02.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-05. Source decisions: `brd.md` REQ-02/03/05/06, AC-03/05; `sdd.md` ordered per-case resolver, saved default required despite override, current runner compatibility, preview/start recheck and changed-selection stop. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Main Flow and Runner Coordination (sequence diagram), Quality Strategy and Planned Verification; `ux.md` → blocked choice. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning module: Local Evals Workbench `resolve-eval-run-selection` and preview/start command slices. Use override per role or suite default, with nullable judge for deterministic cases; validate every selected saved choice (including an overridden choice) against current runner description. Return a typed block naming affected case and role, with enough source information for explicit replacement or inheritance. A run-only single-case choice remains temporary and cannot repair a missing suite default; full-suite run-only input remains rejected.
- Preserve source order, preview token over actual per-case selections, and start's reload/re-resolve decision: a changed suite file or model catalog yields updated preview/blocked outcome and requires another explicit Start. No queue or paid call occurs after any preflight block.

## Files

- `src/modules/local-evals-workbench/resolve-eval-run-selection/{handler,result,handler.test}.ts`
- `src/modules/local-evals-workbench/resolve-run-snapshot.ts`
- `src/modules/local-evals-workbench/{preview-eval-run/preview-integration,start-eval-run/handler}.test.ts`
- Adjacent preview/start handler or result contracts only as required for a typed source-aware block.

## Done when

- Task check: after `pnpm run build`, `node --test bin/modules/local-evals-workbench/resolve-eval-run-selection/handler.test.js bin/modules/local-evals-workbench/preview-eval-run/preview-integration.test.js bin/modules/local-evals-workbench/start-eval-run/handler.test.js`; pass: zero failed tests; expected evidence: nine-case 8 X/1 Y ordered selection, independently inherited/overridden judge, reset, required missing default even with case override, unavailable override before scheduling, no silent fallback, and stale preview/start recheck after suite or catalog change. This is SDD pure/fake-port and preview/start integration evidence for REQ-02/03/05 and Story AC-01/02/03.
- Distinguish expected blocked outcomes from runner/filesystem failure; record safe reason/case/role only. Record `node .agents/scripts/check-touched-source-file-lines.mjs` pass/fail before commit.
