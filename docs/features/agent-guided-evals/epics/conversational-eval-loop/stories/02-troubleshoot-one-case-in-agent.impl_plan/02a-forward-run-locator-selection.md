# Step: Forward run locator selection through headless composition

## Goal

Make the actual headless run adapter deliver each selected attempt to the existing bounded run-history reader so persisted failed assertions yield usable locators.

## Scope

- Task ID: AGE-US-02-T02a; Milestone ID: AGE-US-02-M02a (reviewable persisted-run locator integration); Status: done; Depends on: AGE-US-02-T00, AGE-US-02-T02.
- Story acceptance criteria: AC-01, AC-02; BRD `docs/features/agent-guided-evals/brd.md` REQ-01, REQ-03, REQ-09, AC-01, AC-02, AC-06. Source decisions: SDD §§Command contracts and boundaries, Main interaction and verification loop (sequence diagram), Safety/state/failure behavior, Quality strategy and planned verification require a bounded selected failure read after a terminal run, honest unavailable status, and no raw evidence in summaries. SAD §Local Evals Workbench owns the adapter. On-demand pointers: `src/modules/local-evals-workbench/headless-composition.ts` (`createHeadlessWorkbench` run/result reader wiring), `src/modules/local-evals-workbench/headless-composition.test.ts` (offline persisted-run fixture), `src/modules/local-evals-workbench/headless-eval-run/ports.ts` (`reader.get`), `src/modules/local-evals-workbench/run-history/contracts.ts` (`Selection` and `ArtifactReaderPort.get`). Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- In the Local Evals Workbench composition adapter only, forward the optional run-reader selection to `history.get` just as the result adapter already does. Keep the handler, port contract, persisted artifact schema, CLI JSON, and locator cap unchanged; do not alter or overwrite T03's preserved uncommitted validator/lifecycle edits.
- Extend the existing disposable offline composition integration test to run an actually failing case, assert run JSON's failed attempt has the expected stable `failedAssertionIds` and `locatorStatus: 'available'`, assert unselected result reports the same locator, then use `{caseId, attempt, assertionId}` from it to read the bounded selected failure. Assert summaries exclude raw output. Keep no-HTTP/no-live-model and project-edit-preservation expectations.

## Files

- `src/modules/local-evals-workbench/headless-composition.ts`
- `src/modules/local-evals-workbench/headless-composition.test.ts`

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/local-evals-workbench/headless-composition.test.js`; pass: the offline persisted failing run exposes `failedAssertionIds: ['unsupported']` with `locatorStatus: 'available'` for the existing `schema` attempt in run and unselected result, and that exact locator resolves to a selected failure without HTTP or a live model; expected evidence: named composition integration tests pass with locator equality, selected assertion ID, and raw-evidence-exclusion assertions (SDD §Quality strategy, integration and regression; Story AC-01/AC-02).
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes; expected evidence: both touched TypeScript source files at or below 500 lines.
- The run reader forwards selection without changing bounded reader semantics, persisted data, JSON shape, or structured-log safety. This closes the T00 integration evidence gap only; T03 must resume with its preserved edits and rerun its failed `pnpm run validate:packed-runtime` and any now-stale passes.
- Human-judgment limit: deterministic integration tests cannot prove Codex/Claude behavior. User-deferred live-agent QA remains a Story integration/merge stop; no routine live-model call is authorized.
