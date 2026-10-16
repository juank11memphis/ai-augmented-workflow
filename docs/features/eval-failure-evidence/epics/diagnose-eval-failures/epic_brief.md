# Diagnose Eval Failures from Selected CLI Evidence Epic Brief

**Epic ID:** EFE-E01

## Summary
Give engineers and coding agents a compact route from an eval run to exact, selected failure evidence, so they can distinguish observed model behavior from grading and execution problems without opening bulk artifacts.

## Source Context
- BRD: [`../../brd.md`](../../brd.md), REQ-01–REQ-08 and AC-01–AC-06.
- Technical design: [`../../sdd.md`](../../sdd.md), Owning operations and interfaces, Evidence and ordering contract, Persistence, limits, and selected reads, Failure behavior, and Quality strategy.
- Domain and capabilities: `docs/business-domain-model.md` Local Evals Workbench, Eval Run/Result, Assertion / Grader, and Failure Analysis; `docs/capabilities-map.md` Preserve isolated run evidence, Inspect failure evidence, Show eval result status, Classify likely failure cause, and Guide agent-based eval sessions.
- UX: not applicable; CLI-only scope.

## Scope
- Capture and retrieve exact model inputs, responses, tool evidence, and rubric-judge exchanges for one selected failure.
- Keep run output compact with reliable locators, explicit evidence gaps, and bounded continuation for retained details.
- Distinguish evaluated failures from judge, tool, runner, and incomplete-run states; document and deterministically verify the CLI workflow.

## Out of Scope
- Dashboard changes, rubric/assertion changes to improve pass rates, automated repairs, live-model routine tests, and new privacy/redaction policy.

## User Stories and Sequence
1. [EFE-S01 — Inspect exact model and tool evidence](./stories/01-inspect-model-and-tool-evidence.md) — complete selected deterministic-failure evidence path; none.
2. [EFE-S02 — Inspect exact rubric-judge evidence](./stories/02-inspect-rubric-judge-evidence.md) — extend the selected evidence path to judge requests, responses, and scores; depends on EFE-S01.
3. [EFE-S03 — Locate and classify eval failures reliably](./stories/03-locate-and-classify-failures.md) — finish compact locators, failure-state distinctions, CLI guidance, and regressions; depends on EFE-S01 and EFE-S02.

## Feature Flags
- none; each Story preserves existing behavior where enhanced evidence is not yet captured.

## Acceptance Criteria
- A failed multi-turn rubric case can be selected from a compact run locator; its CLI result exposes the exact relevant model and judge evidence, tool/context sequence, score, and any explicit remaining gap without opening bulk artifacts (BRD AC-01–AC-04).
- Unsafe artifact storage is blocked, and deterministic tests plus CLI documentation cover the workflow without claiming that tests prove LLM reasoning (BRD AC-05–AC-06).

## Dependencies / Risks
- Project runners that emit only the older protocol cannot supply historical raw model or judge payloads; selected results must label those fields `not-captured` until a runner emits the versioned evidence extension.
- Retaining exact evidence increases local artifact size and may expose sensitive content; existing Git-exclusion and no-raw-logging safeguards remain mandatory, while broader privacy policy is deferred.
