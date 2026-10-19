# Step: Select an incomplete attempt without an assertion

## Goal

Extend the existing read-result command slice to return a bounded incomplete attempt overview and truthful run summary while preserving failed-assertion selection.

## Scope

- Task ID: IERE-S01-T03; Milestone ID: IERE-S01-M02 (selectable bounded diagnosis); Status: done; Depends on: IERE-S01-T02.
- Story acceptance criteria: AC-01, AC-03, AC-04; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-02, REQ-03, REQ-05, REQ-08 and AC-02/AC-05; `docs/features/incomplete-eval-run-evidence/sdd.md` “Execution and evidence boundaries”, “State, limits, and inspection”, “Quality strategy — planned, not yet run”; on-demand pointers: `src/modules/local-evals-workbench/headless-eval-result/{command,result,handler,ports}.ts`, `src/modules/local-evals-workbench/run-history/{failed-assertion-locators,file-artifact-reader,contracts}.ts`; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench headless-result slice. Extend immutable command and result types first, then reader port and handler, then artifact-reader implementation. Allow `{caseId, attempt}` only for a genuinely incomplete attempt; keep `{caseId, attempt, assertionId}` selection and field reads for actual assertion evidence unchanged. Reject selection mismatch rather than exposing another case's artifact.
- Unselected summary reports completed/incomplete/not-run counts and ordered, bounded failed-or-incomplete attempt locators. Selected incomplete attempt returns its true state, bounded safe case/attempt diagnostics, observed turn/call IDs and persisted failure facts, with `not-captured` when no response record exists. No raw response or ordinary source body is projected into summary or selected overview. Do not imply historical v1/v2 evidence can be reconstructed.
- Keep read policy in handler/reader, not CLI. If no durable response locator exists, show a gap; do not invent a source-field locator. Any reader validation extension must preserve artifact path safety and version compatibility. Add focused fake-port tests rather than bloating `headless-eval-result/handler.test.ts`.

## Files

- `src/modules/local-evals-workbench/headless-eval-result/command.ts`
- `src/modules/local-evals-workbench/headless-eval-result/result.ts`
- `src/modules/local-evals-workbench/headless-eval-result/ports.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.ts`
- `src/modules/local-evals-workbench/run-history/failed-assertion-locators.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.ts`
- `src/modules/local-evals-workbench/headless-eval-result/incomplete-attempt.test.ts` (new)
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.test.ts`

## Done when

- Task check: `pnpm build`; pass: command/result/port and reader changes compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/headless-eval-result/incomplete-attempt.test.js bin/modules/local-evals-workbench/headless-eval-result/handler.test.js bin/modules/local-evals-workbench/run-history/failed-assertion-locators.test.js bin/modules/local-evals-workbench/run-history/file-artifact-reader.test.js`; pass: fake-port and reader tests select no-assertion incomplete attempt, preserve assertion selection, reject mismatches, expose bounded safe diagnostics/provenance, report `not-captured` without a response locator, and count two completed/one incomplete/14 not run; expected evidence: named tests pass, JSON byte budget assertion passes, sentinel raw body absent from ordinary JSON.
- The summary locator leads to that exact incomplete attempt, and missing response evidence is an explicit gap, not empty success. Old artifacts lacking provenance remain readable and honestly unclassified rather than falsely runner-reported.
- Evidence class: handler unit, reader contract, compatibility/selection regression, output-boundary invariant. Skip live model and manual QA; residual risk is whether an actual project runner emits sufficient evidence.
