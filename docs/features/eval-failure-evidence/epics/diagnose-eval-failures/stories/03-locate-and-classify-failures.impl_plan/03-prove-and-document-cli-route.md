# Step: Prove and document the artifact-to-CLI route

## Goal

Verify the complete compact-run → locator continuation → selected-result → retained-field continuation workflow using disposable fake-run artifacts, then document only commands proven by the CLI.

## Scope

- Task ID: EFE-S03-T03; Milestone ID: EFE-S03-M3 (verified CLI diagnosis path); Status: pending; Depends on: EFE-S03-T02.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; source decisions: selected CLI reads only one persisted assertion through workbench ports, field ranges remain bounded and reconstruct retained UTF-8 bytes, unsafe artifact paths/tracked output refuse, and documentation states Git-ignore and live-model limits honestly. On-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Persistence, limits, and selected reads`, `## Main interaction`, `## Failure behavior and operational safety`, `## Quality strategy and planned verification`; `docs/features/eval-failure-evidence/brd.md` REQ-01/05/06/07/08 and AC-01/03/04/05/06; `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/epic_brief.md` `## Scope` and `## Feature Flags`.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- In Local Evals Workbench and the thin CLI adapter, add a disposable artifact-to-real-CLI integration fixture with multiple cases, failed attempts/assertions spanning locator pages, distinct per-case model choices, multi-turn/tool and judge evidence, partial/error/gap states, and a large retained field. Drive actual `sibu evals run`/`sibu evals result` options where a fake runner fixture supports them; use real artifact store plus spawned compiled CLI for persisted readback. Verify exact locator-to-selection identity and ordered field byte reconstruction. Keep tests deterministic and self-contained; no live provider or external judge.
- Include three disposable Git cases: an effectively ignored root permits artifact creation, a root where `evals/artifacts/` is not effectively ignored refuses the run before detailed artifact creation, and a force-tracked run artifact refuses a further run before detailed artifact creation. Also test unsafe/corrupt reads, wrong selection, and raw-sentinel absence in run JSON and operational stderr/logs. Reuse the existing unignored-root coverage only if the prescribed focused check executes that test and asserts pre-write refusal; otherwise add the assertion to the new acceptance file. Preserve S01/S02 score, raw provider, and judge capture; do not broaden artifact retention or change privacy policy. Prefer a new focused acceptance test file rather than growing `artifact-history-acceptance.test.ts` toward 500 lines.
- Update `README.md` `### Inspect local eval failures` to show commands/options and output field names exercised by the integration test: run locator, `--locator-offset`, selected `--case/--attempt/--assertion`, and `--field/--offset` continuation. State observed model failure versus possible judge disagreement, judge/tool/runner/incomplete gaps, older-run `not-captured`, Git-ignore limitations, and that deterministic tests do not prove live LLM diagnosis. Do not imply a human QA gate.
- Final strategy: after all Tasks stabilize, execute `pnpm verify` once (canonical build and compiled deterministic suite) and `pnpm run validate:packed-runtime` once (distinct package/installed CLI coverage because README/CLI workflow and packaged assets are affected). Expected evidence is zero-exit plus named integration tests; a failed check is reported, not bypassed. Unit, artifact-to-CLI acceptance/integration, edge/failure, and existing regression checks cover the SDD methods. Skip live-model eval, human QA, fuzz, and mutation: deterministic fixtures answer contract/safety questions, while actual model behavior and human judge interpretation remain residual limits.

## Files

- `src/modules/local-evals-workbench/run-history/failure-locator-cli-acceptance.test.ts` (new)
- `src/modules/local-evals-workbench/run-history/test-project.ts`
- `src/entrypoints/cli/evals-json.ts`
- `src/entrypoints/cli/evals-json.test.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/create-program.test.ts`
- `README.md`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/run-history/failure-locator-cli-acceptance.test.js bin/entrypoints/cli/evals-json.test.js bin/entrypoints/cli/create-program.test.js`; pass: disposable fake-run CLI tests traverse every ordered locator and retained-field byte range, prove actual selection/model/score/state/gap identity, reject wrong/unsafe/corrupt reads, and find no raw sentinel in compact output or operational logs; expected evidence: named passing artifact-to-CLI and documentation-example assertions, plus run-gate assertions that an ignored root permits creation while an unignored root and a root with a force-tracked run artifact each refuse a new run before any detailed artifact is written (SDD integration and boundary methods; Story AC-01–04; BRD AC-01/03–06, especially AC-05).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T03 touched sources ≤500 lines; expected evidence: the gate result recorded before its commit.
- README commands and output names match the real compiled CLI and tested JSON shape; retained-field continuation is explicit, privacy and live-model limitations are accurate, and no full transcript appears in run summary.
- Final validation after stabilization: `pnpm verify` and `pnpm run validate:packed-runtime`; pass: both exit zero; expected evidence: canonical build/full compiled deterministic tests and installed packaged CLI behavior. Do not rerun covered standalone suites merely for a different permission outcome.
