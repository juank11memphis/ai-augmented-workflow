# Step: Persist judge-linked grader state at the source checkpoint

## Goal

Repair the execution handler's intermediate attempt checkpoint so a scored judge source record links to its already-completed rubric assertion before the artifact store checks the reference.

## Scope

- Task ID: EFE-S02-T06; Milestone ID: EFE-S02-M2 (safe linked judge evidence); Status: done; Depends on: EFE-S02-T02, EFE-S02-T03; must pass before EFE-S02-T04 resumes.
- Story acceptance criteria: AC-01, AC-02, AC-03; source decisions: `execute-eval-run` persists ordered source records through the existing artifact-store port; the store validates a complete judge record against an assertion with the same check, actual Judge Model, score, threshold and outcome, while grading-error records link only to an incomplete grader with no score. On-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Evidence and ordering contract`, `## Persistence, limits, and selected reads`, `## Failure behavior and operational safety`, `## Quality strategy and planned verification`; `docs/features/eval-failure-evidence/brd.md` REQ-04/05/06 and AC-02/03.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- In the existing Local Evals Workbench execute-run handler only, derive the intermediate attempt's visible completed-grader assertion(s) from previously validated grader events before checkpointing a scored judge source. Preserve the actual event sequence, selected case/attempt/check ownership, and later final assertion evaluation. Keep a grading-error checkpoint incomplete with a null score and safely captured source; do not invent a completed comparison or relax `run-history` store validation. Avoid raw judge content in run JSON or operational logs.
- This is the bounded regression from committed T02/T03 exposed by T04's disposable fake judge. T04's uncommitted edits are only `README.md`, `src/modules/local-evals-workbench/run-execution/offline-acceptance.test.ts`, and `src/modules/local-evals-workbench/run-execution/source-evidence-project-fixture.ts`; do not edit, stage, reset, or commit those paths. Preserve T04's failed-check evidence and sole authority to commit those edits after this repair passes. No new module, protocol shape, dependency, or product rule.

## Files

- `src/modules/local-evals-workbench/execute-eval-run/handler.ts`
- `src/modules/local-evals-workbench/execute-eval-run/handler.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/execute-eval-run/handler.test.js`; pass: a real disposable artifact-store handler test emits a completed rubric grader then its scored judge source, persists/reopens the linked checkpoint without `corrupt` or `nonterminal-artifact`, and verifies matching score/threshold/outcome/check/attempt; a grading-error case retains the exact available source with null score/incomplete outcome, while a wrong link still fails. Expected evidence: named passing regression and failure tests using fake judge events and real local artifacts, with no live judge (SDD unit, artifact integration and boundary methods; Story AC-01/02/03).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T06's touched source files (currently 209-line handler and 439-line test) at or below 500 lines, with cohesive test extraction if the test would exceed the gate; expected evidence recorded before T06's separate checked-Task commit.
- Intermediate and final attempt checkpoints preserve judge link integrity and error distinction; no raw judge payload enters compact manifest/run JSON/logs. The original T04 prescribed three-file test remains for T04 to rerun unchanged after fresh plan-only review and T06 completion.
