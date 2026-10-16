# Step: Validate exact judge source records at the runner boundary

## Goal

Accept a versioned, linked rubric-judge source record from a capable project runner while preserving older runner validity and explicit grading errors.

## Scope

- Task ID: EFE-S02-T02; Milestone ID: EFE-S02-M1; Status: pending; Depends on: EFE-S02-T01.
- Story acceptance criteria: AC-01, AC-02, AC-03; source decisions: runner is the source of truth for what was sent and returned; a judge record identifies the declared rubric check, selected case/attempt and actual Judge Model, exact request including instructions/evaluated answer/references, exact response/rationale, parsed score and its link to the grader event. Do not infer raw payloads from a rubric definition or concise `evidence` string. On-demand pointers: SDD `## Evidence and ordering contract`, `## Failure behavior and operational safety`, `## Main interaction`; BRD REQ-04/05/08.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Extend the existing version-2 source-record/chunk grammar, runner validator, and `execute-eval-run` handler, not a new protocol service. Accept judge source only for declared rubric checks, after the relevant evaluated turn, with unique ID, ordered sequence and matching case/attempt/check and actual Judge Model. A **completed judgment** links to its completed grader event and requires a valid numeric score, evaluated threshold, and consistent pass/fail comparison. A **grading-error capture** links to the attempted rubric check and safe error diagnostic instead, may have no parsed score or completed comparison, and retains the exact request and any returned malformed response/rationale. Reject duplicate, cross-check, reordered, and false-complete claims; a malformed score must not discard safely captured source bytes or become a completed judgment. Keep version-1 and earlier version-2 events valid with honest `not-captured` judge gaps. The handler validates and links the event before asking the artifact-store port to persist it.
- Preserve distinct grading-error diagnostics for failed/unavailable/malformed judging and any safely captured earlier request/response; never turn absent or invalid scoring into a completed failed rubric. Test interrupted chunks and over-limit capture as explicit `incomplete`/`capture-failed` gaps with no partial field advertised as raw; test a false-complete claim is rejected. Keep runner-reported redaction markers attached to retained judge fields without reconstructing hidden content. Ensure concise structured logs and normal run JSON do not include raw judge content. Implement handler/domain validation before adapter specifics; no rubric/assertion mutation.

## Files

- `src/modules/local-evals-workbench/run-execution/contracts.ts`
- `src/modules/local-evals-workbench/run-execution/attempt-evidence.ts`
- `src/modules/local-evals-workbench/run-execution/attempt-evidence.test.ts`
- `src/modules/local-evals-workbench/runner-process/source-records.ts`
- `src/modules/local-evals-workbench/runner-process/execute-events.ts`
- `src/modules/local-evals-workbench/runner-process/execute-events.test.ts`
- `src/modules/local-evals-workbench/runner-process/execute-adapter.test.ts`
- `src/modules/local-evals-workbench/execute-eval-run/handler.ts`
- `src/modules/local-evals-workbench/execute-eval-run/handler.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/runner-process/execute-events.test.js bin/modules/local-evals-workbench/run-execution/attempt-evidence.test.js bin/modules/local-evals-workbench/runner-process/execute-adapter.test.js bin/modules/local-evals-workbench/execute-eval-run/handler.test.js`; pass: fake judge tests compare exact completed request/response/rationale and parsed score links; malformed/failed judge capture retains available exact request/response with absent score and no false comparison; wrong judge/check/attempt/order and false-complete claims are rejected; interrupted and over-limit capture yield explicit gaps without partial raw fields; runner redaction markers survive validation; old-runner events remain accepted and handler-to-store links and safe diagnostics are proven. Expected evidence: named passing protocol/unit/error tests and no live model (SDD fake-judge unit plus boundary methods; Story AC-01/02/03).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T02 touched sources ≤500 lines; expected evidence recorded before commit.
- Completed rubric comparison uses the evaluated threshold and numeric score, not judge prose; failed judge execution is a grading error/gap and does not fabricate a model assertion failure.
