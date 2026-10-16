# Step: Prove the disposable artifact-to-CLI path

## Goal

Verify the completed deterministic-failure path end to end and run one final aggregate and packaged-runtime validation after stabilization.

## Scope

- Task ID: EFE-S01-T05; Milestone ID: EFE-S01-M3; Status: pending; Depends on: EFE-S01-T04
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; source decisions: disposable multi-turn fake runner/tool fixture, selected failed deterministic assertion only, exact context and payload, selected byte reconstruction, old-artifact gaps, wrong-selection refusal, artifact safety and no raw logs; on-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Quality strategy and planned verification`, `## Main interaction`; `docs/features/eval-failure-evidence/brd.md` AC-01/02/04/05/06; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Add an isolated artifact-to-CLI integration fixture/test and focused boundary regressions. Assert actual delivered tool results differ from fixture-declared expectations, raw versus normalized outputs are unequal, turn and attempt identities stay exact, approved-fact provenance is included only when attested, and old runner/artifact gaps remain explicit. Include a fake runner-reported redaction marker through save/reopen and selected CLI output: its typed marker survives, its hidden content is neither reconstructed nor labeled raw. Include large/incomplete payload, corrupt record, ignored versus tracked paths, and absence of raw values in logs/full-run JSON.
- Do not add live model calls, rubric-judge capture, dashboard changes, a human QA gate, or a new privacy policy. Preserve Story-level review/approval/commit controls for later execution.

## Files

- `src/modules/local-evals-workbench/run-execution/offline-acceptance.test.ts`
- `src/modules/local-evals-workbench/run-history/artifact-history-acceptance.test.ts`
- `src/entrypoints/cli/evals-json.test.ts`
- `src/modules/local-evals-workbench/runner-process/execute-events.test.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/run-execution/offline-acceptance.test.js bin/modules/local-evals-workbench/run-history/artifact-history-acceptance.test.js bin/entrypoints/cli/evals-json.test.js`; pass: disposable integration proves save/reopen, compact run locators, exact selected context/raw/normalized separation, field-range reconstruction, old `not-captured`, preserved runner-reported `redacted` without reconstructed/raw content, wrong selection, safety and no-raw-log behavior; expected evidence: named acceptance/integration and edge/failure tests, no live model.
- Pre-commit source-size check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: all source files touched by T05 are at most 500 lines; expected evidence: recorded zero exit before T05 commit, with cohesive splitting if needed.
- Final validation, once changes stabilize: `pnpm verify` (canonical build + compiled suite, including template contract/sync tests), `pnpm run validate:packed-runtime` (distinct packed/installed CLI and managed template behavior), and `git diff --check`; pass: all exit zero with recorded actual output. The packed-runtime check is retained because CLI/runtime-distributed assets and a managed template change; `pnpm verify` already covers build and compiled tests, so do not repeat them separately as final checks. The source-size gate is per-Task pre-commit evidence above, not a cumulative final check after commits.
- Evidence maps every Story AC to a completed Task and test outcome. If a prescribed method cannot answer the SDD scenario without a material new method/dependency or an actual source file would exceed 500 lines without cohesive refactoring, stop for an engineer decision rather than silently weakening scope. Residual limit: deterministic tests cannot establish how a live model or agent will interpret evidence.
