# Step: Present case-first results in the active workspace

## Goal

Replace the active workspace result list with case-first cards/list/rows that show recorded model labels while retaining evidence and failure-inspection entry points.

## Scope

- Task ID: EMD-S01-T02; Milestone ID: EMD-S01-M02 (inspectable case-first workbench); Status: done; Depends on: EMD-S01-T01.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; business source `docs/features/eval-model-defaults/brd.md` REQ-06 and AC-06; source decisions: `sdd.md` **Run Evidence, Presentation, and Compatibility** forbids model-column matrices and current-default relabeling; `ux.md` binding Phone/Tablet/Desktop result mockups fix hierarchy and visible labels. On-demand pointers: `docs/features/eval-model-defaults/ux.md` **Binding Mockups** (especially **Phone: blocked choice and case-first result**, **Tablet: suite controls, selected case, and results**, **Desktop: suite controls and case-first results**), **Interaction States and Recovery**, **Accessibility and Visual Direction**; `docs/features/eval-model-defaults/sdd.md` **Quality Strategy and Planned Verification**. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Owning module: Local Evals Workbench, active workspace rendered by `start-local-evals-workbench/local-server-starter.ts` via `workspace-layout.ts`, not the older `render-workbench-shell.ts` matrix. Adapt the existing presentation entrypoint to T01's read-only result data; keep the read handler/port and thin browser boundary. Do not import runner or suite persistence into presentation.
- Render `Results` by case: phone stacked card with status text, case name, `Model`, optional `Judge model`, and **View result**; tablet case-first list; desktop case-first columns **Case**, **Status**, **Model**, **Judge**, **Action**. Keep each long model name readable without hover or phone horizontal scroll, escape all untrusted labels, and keep status understandable without color alone. Show exactly one entry per completed case; preserve accurate incomplete/not-run context without pretending it completed. Avoid a model-column matrix or new pre-run case list.
- Keep live/history result switching, search/failure filter, keyboard/focus behavior, click-to-detail, failed-assertion inspection, evidence-unavailable messaging, and repair action routing. An active result must use the run just read, not the current setup `model`/`judgeModel`. Refactor the 417-line `workspace-results-client.ts` cohesively if edits risk crossing the 500-line source gate; do not mechanically split code or disturb unrelated workflows.
- Update only existing non-UI result-contract/presentation-data and history/detail regression assertions necessary for the new data shape. No new automated UI, DOM visual, accessibility, or agent-performed review; static code compilation is not proof of visual fidelity. If preserving a required detail/failure path has no non-UI equivalent check, flag the remaining user QA limit rather than claiming it proved UI behavior.

## Files

- `src/modules/local-evals-workbench/workbench-ui/workspace-results.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-results-client.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-styles.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-result-data.ts` (T01 contract, if created)
- `src/modules/local-evals-workbench/workbench-ui/workspace-view-model.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-view-model.test.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.test.ts`

## Done when

- Task check: `pnpm run build`; pass: exits 0 after stabilized changes, compiling the active workspace and copied packaged assets; expected evidence: build output. Then `node --test bin/modules/local-evals-workbench/workbench-ui/workspace-view-model.test.js bin/modules/local-evals-workbench/run-history/file-artifact-reader.test.js bin/modules/local-evals-workbench/run-history/artifact-history-acceptance.test.js`; pass: exits 0 with result-data/history/detail-contract regressions green; expected evidence: named tests demonstrating selected-run model truth, optional judge, historical fallback, case/attempt evidence access, and unaffected failure inspection data. Then `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: exits 0 with every touched source file ≤500 lines; expected evidence: line-gate output. No UI test result is claimed.
- The active initial and refreshed result presentations use the same recorded-label contract. Existing case detail and repair triggers still use their prior case/attempt identifiers, and incomplete/partial results remain honest. There is no suite-default lookup or runner selection in rendering.
- The generated visual structure follows the binding UX mockups for phone, tablet, and desktop and meets the specified text, focus, and no-horizontal-scroll intent. This is an implementation requirement, **not** a worker-performed visual/accessibility verification; user-owned QA after implementation remains pending.
- **Final validation strategy after stabilization:** use this Task's final `pnpm run build` once, then the focused compiled non-UI tests above plus `pnpm run validate:packed-runtime` once (changed `src/` is shipped as `bin/`, so installed behavior is relevant), and `node .agents/scripts/check-touched-source-file-lines.mjs`. Record exact pass/fail output and map test names to AC-01–AC-03 and BRD REQ-06/AC-06. Do not run `pnpm verify`: its aggregate includes excluded UI tests. Do not add a duplicate broad test run. The packed-runtime check is distribution smoke evidence, not model-label or UI proof.
- **Residual judgment and exclusions:** user later compares phone/tablet/desktop results to UX mockups, including readable labels, keyboard/screen-reader access, focus return, failure/repair navigation, and practical fit; mark that QA **not performed by worker**. No live LLM, automated UI/accessibility tests, or agent visual review. Deeper fuzz/mutation testing is skipped because label projection and history fallback have bounded deterministic fixtures; residual risk is visual/accessibility fidelity and future mixed-model run evidence until EMD-S03.
