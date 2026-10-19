# Step: Expose selected response evidence and publish the runner contract

## Goal

Complete the selected-attempt CLI path for tested-model bytes and gaps, and document a deterministic runner emission-before-parsing example.

## Scope

- Task ID: IERE-S02-T04; Milestone ID: IERE-S02-M02 (safe retained/selected inspection); Status: completed; Depends on: IERE-S02-T01, IERE-S02-T02, IERE-S02-T03, IERE-S02-T05.
- Story acceptance criteria: AC-01–AC-04; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01–REQ-03, REQ-05–REQ-08 and AC-01/AC-03/AC-04/AC-05; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, Main flow and failure branches (sequence diagram), State, limits, and inspection, Project-runner contract and GeniusCR dependency, Quality strategy — planned, not yet run; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md` (managed template guidance).
- Owner: Local Evals Workbench existing headless-eval-result command/result/reader slice and thin CLI translation. S01's `--case` plus `--attempt` without assertion lists bounded tested-model response locators with call/provisional-turn links, capture status, original/retained byte lengths or unknown missing extent, and specific gaps. `--field` on such a selected attempt requests one bounded byte range, returns Base64 plus next offset, and rejects unlisted/foreign locators. Keep unselected and selected-overview JSON bounded and body-free; preserve existing assertion-field behavior and v1/v2 `not-captured`.
- Publish v3 tested-model producer obligation in existing managed runner guidance: capture bytes before parsing, emit promptly for malformed and non-success responses, use a stable call/provisional-turn link, bound chunks and declare original size/truncation, emit a safe reason and precise gap for no response or inability to emit, never put body in stderr/diagnostics. Include a deterministic failure-path fixture/contract case exercising observation-before-malformed and a no-response gap. Say explicitly that current GeniusCR code-only output needs a separate project-side update; do not edit GeniusCR or promise historical reconstruction. If editing `templates/`, update `templates/manifest.json` versions/current-version user-facing change notes per `sibu-template-change`.
- Disposable fake-runner CLI acceptance covers malformed, non-success, unavailable, oversized, pre-turn and process-exit-after-observation flows, incomplete selection without assertion, v1/v2 compatibility, source-field continuation, output budget, and raw-body sentinel absence from normal JSON/stderr/logs. Reuse S01 failure-origin and 17-case count fixtures for regression; judge response capture remains S03.
- Reviewed continuation of this same still-uncommitted Task: the unchanged `pnpm verify` reached 1515/1516 passing tests after two bounded in-context fixes. Its sole remaining failure is `src/modules/template-catalog/eval-authoring-lifecycle.test.ts:80`: the stale meaningful-sync-note regex omits the current managed note, “Adds the version-3 tested-model response emission contract, failure-path fixture, and explicit missing-response guidance.” Update only that expectation to recognize the v3 response-evidence note while still requiring a meaningful update; do not weaken the assertion or alter the manifest note to fit the old regex. Preserve all current T04 edits and single-commit authority, rerun the same `pnpm verify`, then run the remaining unchanged final checks. Build, the prescribed CLI/handler command (33/33), and template contract command (8/8) already passed; their existing evidence remains in the append-only progress log. No new Task or check is introduced.

## Files

- `src/modules/local-evals-workbench/headless-eval-result/command.ts`
- `src/modules/local-evals-workbench/headless-eval-result/result.ts`
- `src/modules/local-evals-workbench/headless-eval-result/ports.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.ts`
- `src/modules/local-evals-workbench/headless-eval-result/provider-response.test.ts` (new)
- `src/modules/local-evals-workbench/run-history/provider-response-cli-acceptance.test.ts` (new)
- `src/modules/local-evals-workbench/run-history/incomplete-attempt-cli-acceptance.test.ts`
- `src/modules/local-evals-workbench/run-history/composition.ts`
- `src/entrypoints/cli/evals-json.ts` (only if current CLI mapping needs change)
- `templates/skills/eval-authoring/references/version-2-contract.md`
- `templates/manifest.json`
- `src/modules/template-catalog/eval-authoring-lifecycle.test.ts` (remaining stale sync-note expectation only)
- `README.md`

## Done when

- Task check: `pnpm build`; pass: result/CLI and managed runtime assets compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/headless-eval-result/provider-response.test.js bin/modules/local-evals-workbench/run-history/provider-response-cli-acceptance.test.js bin/modules/local-evals-workbench/run-history/incomplete-attempt-cli-acceptance.test.js bin/modules/local-evals-workbench/headless-eval-result/handler.test.js`; pass: named cases prove fake-runner-to-artifact-to-result locator/range/gap behavior, v1/v2 regression, malformed/non-success/unavailable/oversized and process-exit branches, bounded JSON, and sentinel absence outside explicit field bytes; expected evidence: passing test names and JSON/range assertions.
- Task check: `node --test bin/modules/template-catalog/templates-eval-authoring-contract.test.js`; pass: installed managed guidance and deterministic contract fixture agree with the v3 emission-before-parsing and no-response-gap wire contract while preserving v2 guidance; expected evidence: passing template contract test names. Add a focused deterministic contract test if the existing test does not exercise the new fixture; static guidance checks do not prove live runner behavior.
- Runner guidance names the project-side obligation and GeniusCR dependency without claiming Sibu observed a response from older runs. Human PR review can judge whether the example is implementable, but there is no routine manual QA gate; fake runners prove only Sibu handling, not live-provider or project-runner compliance.
- Final Story validation, after stabilization: `pnpm verify` once; pass: build and all compiled tests succeed; expected evidence: exit 0. `pnpm run validate:packed-runtime` once; pass: packaged CLI/runtime checks succeed; expected evidence: exit 0. `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: every touched source file is at most 500 lines; expected evidence: exit 0. `git diff --check`; pass: no whitespace errors; expected evidence: exit 0. Do not duplicate aggregate build/tests as extra final commands.
- Evidence class: CLI acceptance/integration, privacy/output-budget invariant, protocol/compatibility regression, distribution check. No live model, dashboard, human QA, fuzz, or mutation check is in scope; residual risk is whether a real project runner follows the documented contract.
