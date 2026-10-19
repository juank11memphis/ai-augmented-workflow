# Step: Validate judge response and gap events in the v3 runner adapter

## Goal

Accept judge responses before normal grading completion while rejecting invalid identity, ordering, and malformed streams without losing earlier valid checkpoints.

## Scope

- Task ID: IERE-S03-T02; Milestone ID: IERE-S03-M01 (truthful two-role capture); Status: completed; Depends on: IERE-S03-T01.
- Story acceptance criteria: AC-01, AC-02, AC-04; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01, REQ-02, REQ-04, REQ-06–REQ-08 and AC-01/AC-04/AC-05; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, Main flow and failure branches, Project-runner contract and GeniusCR dependency, Quality strategy — planned, not yet run; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench runner-process adapter. Reuse S02 v3 chunked, bounded exact-byte observation for explicit judge role and declared rubric/check identity; validate selected judge model separately from tested model, case/attempt, call and provisional-turn links, chunk order/size, and no duplicate or cross-role ambiguity. An observation can precede `rubric-judgment-error` and must not imply a completed judgment; retain the last valid event after malformed trailing input. Preserve v1/v2 strictness and existing v3 tested-model payload compatibility.
- Test non-success/malformed judge response bodies, binary and UTF-8 boundaries, per-response/per-run truncation, interrupted chunks, no response, response received but not emitted, invalid/missing check, wrong model/role, duplicate call, malformed/reordered event, valid terminal runner report followed by nonzero exit, and process exit without report. Keep bounded error codes body-free; do not attribute a provider or adapter root cause from a generic diagnostic.

## Files

- `src/modules/local-evals-workbench/runner-process/provider-response-events.ts`
- `src/modules/local-evals-workbench/runner-process/execute-events.ts`
- `src/modules/local-evals-workbench/runner-process/execute-adapter.ts` (only if event propagation requires it)
- `src/modules/local-evals-workbench/runner-process/judge-response-events.test.ts` (new)
- `src/modules/local-evals-workbench/runner-process/execute-adapter.test.ts`

## Done when

- Task check: `pnpm build`; pass: v3 adapter and event contracts compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/runner-process/judge-response-events.test.js bin/modules/local-evals-workbench/runner-process/provider-response-events.test.js bin/modules/local-evals-workbench/runner-process/execute-adapter.test.js`; pass: named protocol/adapter cases assert exact decoded bytes, correct role/model/check and provisional links, truthful gaps/truncation, preservation of prior valid events, v1/v2 rejection of v3 response events, and distinct runner-report/exit facts; expected evidence: passing test names plus observed event/failure-origin assertions.
- New judge paths do not weaken v2 source-record validation or accept a scored judgment from response bytes alone. Invalid trailing streams retain earlier valid observations only; an unfinished chunk is explicitly incomplete.
- Evidence class: protocol contract, edge/failure, invariant, version regression. File persistence and selected reads remain T03; end-to-end runner obligations remain T04.
