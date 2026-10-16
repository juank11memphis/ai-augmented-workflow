# Step: Prove the disposable fake-judge CLI path

## Goal

Verify that an engineer can select a failed rubric, distinguish its score from judge text, and reconstruct a large exact judge exchange through bounded CLI continuation.

## Scope

- Task ID: EFE-S02-T04; Milestone ID: EFE-S02-M3 (complete selected rubric path); Status: done; Depends on: EFE-S02-T03, EFE-S02-T06.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; source decisions: run locator → selected result → `--field`/`--offset` via existing CLI and result handler; no bulk artifact access or CLI-side file read; fake judge emits the actual evaluated rubric/reference, request, response, parsed score and ID. On-demand pointers: SDD `## Main interaction`, `## Persistence, limits, and selected reads`, `## Quality strategy and planned verification`; BRD AC-02/03/04/06 and REQ-08.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Extend disposable Local Evals Workbench fixture and acceptance tests to emit a version-2 rubric judge record (including a large multibyte field), save/reopen artifacts, select its failed check, follow every Base64 byte range to exact original bytes, and verify score/threshold/comparison and actual Judge Model remain separate. Add a grading-error fixture with the exact available request and malformed response retained but no numeric score/completed comparison; when a declared rubric check can be selected, retrieve its retained fields through the selected path, and otherwise show the run/case error and gap without inventing a failed assertion locator. Cover unavailable judging, interrupted/over-limit gaps without partial raw fields, runner-reported redaction markers, old-run `not-captured`, deterministic non-judge checks, wrong selection, and absence of judge payload in ordinary run JSON/logs. Keep tests self-contained and idempotent; no live judge.
- Add concise CLI documentation for selected rubric fields and continuation only if existing README guidance cannot already describe the new result shape; do not change CLI flags unless the existing result transport demonstrably cannot carry the source contract. No dashboard work.

## Files

- `src/modules/local-evals-workbench/run-execution/source-evidence-project-fixture.ts`
- `src/modules/local-evals-workbench/run-execution/offline-acceptance.test.ts`
- `src/modules/local-evals-workbench/run-history/artifact-history-acceptance.test.ts`
- `src/entrypoints/cli/evals-json.test.ts`
- `README.md`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/run-execution/offline-acceptance.test.js bin/modules/local-evals-workbench/run-history/artifact-history-acceptance.test.js bin/entrypoints/cli/evals-json.test.js`; pass: disposable artifact-to-CLI tests reproduce exact fake judge request and response bytes after save/reopen, show actual completed score/threshold/model, reconstruct a large UTF-8 field through `nextOffset`, and retrieve a selectable malformed-response grading error's exact available bytes without a score or false model-failure comparison; when no failed assertion exists, the error/gap remains visible without a fabricated failure locator. Old-run, interrupted/over-limit, unavailable and redacted fields show the proper gaps with no partial raw value; wrong selections are rejected and compact JSON/log safety holds. Expected evidence: named passing integration, edge/failure and regression tests with no bulk read/live judge (SDD integration and boundary methods; Story AC-01–04).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T04 touched sources ≤500 lines; expected evidence recorded before commit.
- README shows the existing locator-to-selected-rubric-to-field continuation path without suggesting that a low score proves judge correctness or that deterministic checks are judge-scored.
