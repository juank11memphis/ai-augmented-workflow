# Step: Prove selected failure identity and honest states

## Goal

Keep selected assertion evidence tied to its persisted case and attempt while reporting evaluated failures, grading issues, execution errors, and gaps as distinct observed states.

## Scope

- Task ID: EFE-S03-T02; Milestone ID: EFE-S03-M2 (truthful selected result); Status: done; Depends on: EFE-S03-T01.
- Story acceptance criteria: AC-02, AC-03; source decisions: selected result is evidence projection, not diagnosis; a failed completed assertion is distinct from malformed/missing judge scoring, tool/runner errors, and partial/interrupted runs; wrong selection rejects without fallback. On-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Design summary`, `## Owning operations and interfaces` (`headless-eval-result` row), `## Evidence and ordering contract`, `## Failure behavior and operational safety`, `## Quality strategy and planned verification`; `docs/features/eval-failure-evidence/brd.md` REQ-01/05/06/08 and AC-03/04/06; `docs/architecture.md` § Local Evals Workbench.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- In the existing `headless-eval-result` Command/Result/Handler slice, write fake-reader tests for exact selected case/attempt/assertion, per-case tested and judge model IDs, score/threshold/comparison, safe diagnostics, and causal order of model/tool/judge references. Test wrong case, attempt, assertion, field locator, and unavailable artifact as explicit blocks. Adjust contracts/handler only where tests reveal an SDD mismatch; preserve S01/S02 raw/normalized source and judge exchange fields.
- Exercise completed assertion failure; judge error/incomplete score (and possible disagreement as an unproven interpretation, not an automatic verdict); tool error; runner error; partial/interrupted case; old-run `not-captured`, capture-failed/incomplete/redacted gaps, and corruption. Show safe state/code and earlier captured evidence where available, without manufacturing missing turns or failed assertion IDs. Keep semantic state rules in the handler/domain, not CLI mapping or artifact adapter.
- Any operational logging change uses stable safe event fields only; no raw model messages, judge payload, tool output, or sensitive diagnostic text in logs. Do not add repair decisions, rubric changes, a privacy/redaction policy, or UI changes.

## Files

- `src/modules/local-evals-workbench/headless-eval-result/command.ts`
- `src/modules/local-evals-workbench/headless-eval-result/result.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.test.ts`
- `src/modules/local-evals-workbench/headless-eval-run/handler.test.ts`
- `src/modules/local-evals-workbench/run-history/contracts.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/headless-eval-result/handler.test.js bin/modules/local-evals-workbench/headless-eval-run/handler.test.js`; pass: named fake-port tests prove exact selection and model/score/diagnostic identity, correct evidence sequence, distinct observed states and typed gaps, explicit rejection of wrong/unavailable selections, and no raw sentinel in compact result or logs; expected evidence: passing unit and edge/failure assertions for each state and mismatch (SDD unit and boundary methods; Story AC-02/03; BRD AC-03/04/06).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T02 touched sources ≤500 lines; expected evidence: the gate result recorded before its commit.
- No result claims judge disagreement or model root cause as proven by a score alone; grading errors have no completed model comparison, and missing evidence remains an explicit gap. If a needed state cannot be represented without a new material policy, stop for engineer-directed SDD revision rather than guessing.
