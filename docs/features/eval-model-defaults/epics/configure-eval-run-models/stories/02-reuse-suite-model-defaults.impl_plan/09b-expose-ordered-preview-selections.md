# Step: Expose ordered case selections in run preview

## Goal

Return the resolver's complete ordered per-case tested and applicable Judge choices through the preview result and HTTP response so T07 can present a truthful full-suite preview without calculating inheritance in the UI.

## Scope

- Task ID: EMD-S02-T12; Milestone ID: EMD-S02-M4 (binding workbench controls); Status: done (commit 0ad2359); Depends on: EMD-S02-T04, EMD-S02-T10, EMD-S02-T11; blocks EMD-S02-T07.
- Story acceptance criteria: AC-01–AC-04, AC-06; source decisions: BRD `REQ-03`, `REQ-05`, `REQ-06`, `AC-05`, `AC-06`; SDD preview/start shared resolver and ordered per-case preview, no call-count/price estimates, blocked results without partial selections; EMD-S03 alone owns case override controls and X/Y execution. On-demand pointers: `docs/features/eval-model-defaults/sdd.md` → Responsibilities and Contracts, Main Flow and Runner Coordination (sequence diagram and preview paragraph), Run Evidence, Presentation, and Compatibility, Quality Strategy and Planned Verification; `docs/features/eval-model-defaults/ux.md` → Phone: suite defaults and full-suite run, Phone: selected case and temporary choice. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Local Evals Workbench preview slice: extend the ready Result with one ordered per-case selection collection containing case ID, tested model, and nullable Judge model from the existing shared resolver. Preserve `selectedCaseIds`, current ready fields and preview token for compatibility; do not independently resolve choices, infer a run-wide Judge model from the first case, or expose partial choices on blocked/error outcomes. No suite write, runner execution, paid call, batch protocol change, or estimator.
- Keep the HTTP entrypoint a thin translation of the ready Result. Add deterministic fake-port handler and HTTP contract assertions for deterministic → rubric → deterministic source order and nullable Judge applicability, rubric-first order, single-case run-only choice, and blocked-before-ready behavior. Assert the response has no call-count, price, or cost estimates. Avoid changing UI logic in this Task.

## Files

- `src/modules/local-evals-workbench/preview-eval-run/result.ts`
- `src/modules/local-evals-workbench/preview-eval-run/handler.ts`
- `src/modules/local-evals-workbench/preview-eval-run/handler.test.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-starter.ts` only if explicit ready-result translation is needed; keep it below 500 lines (currently ~477) by cohesive extraction if touched growth requires it.
- `src/modules/local-evals-workbench/start-local-evals-workbench/local-server-suite-contract.test.ts` or a focused adjacent HTTP contract test.

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/preview-eval-run/handler.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/local-server-suite-contract.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: direct fake-port and HTTP assertions show exact ordered case IDs and tested/Judge pairs for deterministic → rubric → deterministic and rubric-first suites; one-case run-only choice appears only in that ready preview; blocked missing/unavailable selection has no partial case-choice collection and causes no execution or suite mutation; no call-count/price/cost estimate fields; touched source files finish ≤500 lines.
- Existing preview token, selected-case IDs, blocked reason/stage, start recheck, and current first-pair compatibility fields remain intact. The browser need not infer inheritance; T07 consumes this ready collection. This covers the SDD pure/fake-port, preview/start regression, and deterministic HTTP contract methods for BRD REQ-03/05/06 and AC-05/06; it does not prove UI rendering or live-model behavior.
- Record the actual check, assertion-level Done-item evidence, and one scoped T12 commit in append-only `progress.log` before resuming T07. User-owned visual/accessibility QA remains later; no browser, live LLM, or automated visual review.
