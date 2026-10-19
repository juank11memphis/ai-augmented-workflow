# Step: Validate versioned tested-model observations at the runner boundary

## Goal

Accept ordered tested-model response observations before turn completion while preserving strict v1/v2 behavior and truthful gaps on malformed or interrupted streams.

## Scope

- Task ID: IERE-S02-T02; Milestone ID: IERE-S02-M01 (truthful pre-turn capture); Status: completed; Depends on: IERE-S02-T01.
- Story acceptance criteria: AC-01, AC-03, AC-04; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01, REQ-02, REQ-06–REQ-08 and AC-01/AC-04/AC-05; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, Main flow and failure branches (sequence diagram), Project-runner contract and GeniusCR dependency, Quality strategy — planned, not yet run; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench runner-process adapter. Add opt-in protocol v3 execute-envelope/event validation, without relaxing v2 source-record rules or changing the v1 request. Define a bounded tested-model observation form separate from `model-call.rawText`; validate run/case/attempt, unique call ID, provisional turn ID or index, selected tested model, content type when known, declared original byte length or unknown extent, strict byte/chunk ordering, and completion/truncation. Permit an observed non-success body and response before any `conversation-turn-completed`; do not create a turn or assertion to satisfy old links.
- Use explicit hard per-response and per-run retained-byte ceilings, coordinated with NDJSON line/event/stdout limits. A compliant runner emits only bounded chunks/prefix plus known original size; an over-limit response becomes a truncated observation or precise gap, not an opaque run-wide protocol error. Malformed/reordered/duplicate/cross-attempt events still reject, preserving the last valid observation checkpoint. An unfinished chunk or call without a response yields a specific gap when observable; v1/v2 remain `not-captured` for this new evidence. Do not expose bytes in stderr or logs.
- Keep changes cohesive; split validator or test responsibilities rather than pushing touched files over 500 lines. Do not add judge observation support in this Story.

## Files

- `src/modules/local-evals-workbench/runner-process/execute-events.ts`
- `src/modules/local-evals-workbench/runner-process/execute-adapter.ts`
- `src/modules/local-evals-workbench/runner-process/execute-stream.ts`
- `src/modules/local-evals-workbench/runner-process/limits.ts`
- `src/modules/local-evals-workbench/runner-process/provider-response-events.ts` (new, if a cohesive validator helper is needed)
- `src/modules/local-evals-workbench/runner-process/provider-response-events.test.ts` (new)
- `src/modules/local-evals-workbench/runner-process/execute-adapter.test.ts`

## Done when

- Task check: `pnpm build`; pass: the versioned event/adapter contracts compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/runner-process/provider-response-events.test.js bin/modules/local-evals-workbench/runner-process/execute-events.test.js bin/modules/local-evals-workbench/runner-process/execute-adapter.test.js`; pass: named tests accept pre-turn malformed and non-success response bytes, reject reordered/duplicate/cross-attempt/invalid-size events, report unfinished and unavailable observations, preserve a prior observation on trailing failure/exit, and keep v1/v2 strict/readable; expected evidence: passing protocol/adapter test names and byte-exact synthetic payload assertions.
- The accepted observation is delivered to the handler before downstream parse/failure events; oversized content is represented as a bounded prefix and explicit truncation/known missing extent rather than silently lost or complete. No raw-body sentinel appears in ordinary adapter logs/stderr.
- Evidence class: protocol contract, edge/failure, compatibility regression, ordering/size invariant. T03 proves file durability and safe paths; T04 proves CLI behavior.
