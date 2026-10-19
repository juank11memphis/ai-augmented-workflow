# Step: Persist bounded response bytes and read selected ranges safely

## Goal

Store observed tested-model bytes as local source artifacts with truthful truncation and gaps, then expose only validated selected byte ranges through the existing artifact ports.

## Scope

- Task ID: IERE-S02-T03; Milestone ID: IERE-S02-M02 (safe retained/selected inspection); Status: completed; Depends on: IERE-S02-T01, IERE-S02-T02.
- Story acceptance criteria: AC-01, AC-02, AC-03; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01–REQ-03, REQ-05, REQ-06, REQ-08 and AC-01/AC-03/AC-05; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, Main flow and failure branches (sequence diagram), State, limits, and inspection, Quality strategy — planned, not yet run; `docs/architecture.md` § Local Evals Workbench; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench run-history artifact adapters and contracts. Define a distinct tested-model response reference/record with call/provisional-turn link, retained byte count, original length or unknown missing extent, content type if known, and `complete`/`truncated` status. Keep raw bytes out of manifest, attempt JSON, ordinary logs, and selected overview. Reuse the established Git-ignored artifact root, containment and symlink checks, atomic write, identity validation, and selected range semantics; never accept runner-supplied paths.
- Enforce explicit per-response and cumulative per-run raw-byte ceilings on write, not merely transport size. Accept a bounded prefix with `truncated` metadata when a cap is crossed; do not advertise complete capture until durable write succeeds. On failed/partial write, retain a specific `capture-failed` gap if safe checkpointing remains possible; otherwise surface storage failure. Link only records belonging to the selected case/attempt/call, with no assertion requirement. Existing v1/v2 artifacts remain readable and do not claim this evidence.
- Test binary and split UTF-8 bytes as bytes, not decoded text; use selected offset and cap to return exact Base64-ready bytes and `nextOffset`. Verify Git-exclusion/tracked-artifact and unsafe path failures on both writes and reads. Split cohesive helpers/tests if a touched source file approaches 500 lines; do not modify unrelated artifact functionality.

## Files

- `src/modules/local-evals-workbench/run-history/contracts.ts`
- `src/modules/local-evals-workbench/run-history/limits.ts`
- `src/modules/local-evals-workbench/run-history/validation.ts`
- `src/modules/local-evals-workbench/run-history/artifact-paths.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-store.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.ts`
- `src/modules/local-evals-workbench/run-history/composition.ts`
- `src/modules/local-evals-workbench/run-history/provider-response-artifact.test.ts` (new)
- `src/modules/local-evals-workbench/run-history/git-artifact-safety.test.ts`

## Done when

- Task check: `pnpm build`; pass: artifact port/adapter and schema changes compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/run-history/provider-response-artifact.test.js bin/modules/local-evals-workbench/run-history/file-artifact-reader.test.js bin/modules/local-evals-workbench/run-history/git-artifact-safety.test.js`; pass: named tests reopen exact retained binary/UTF-8 bytes, enforce per-response and per-run limits, verify complete versus truncated original/missing extent, reject mismatched IDs/unsafe or tracked paths, and show no complete locator after failed/partial write; expected evidence: passing contract tests with disposable Git-ignored artifact fixtures and exact range/offset comparisons.
- A range read never loads or returns an unselected full run; it enforces the reader cap and validates locator, path, identity, and Git exclusion. Compact manifest/attempt and safe logger assertions contain metadata only, not the raw-body sentinel.
- Evidence class: artifact contract, byte-boundary invariant, safety/edge failure, v1/v2 compatibility regression. T04 proves public CLI selection and JSON budget.
