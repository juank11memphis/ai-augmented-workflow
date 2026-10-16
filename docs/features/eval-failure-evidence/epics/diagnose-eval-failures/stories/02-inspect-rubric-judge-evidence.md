# Inspect Exact Rubric-Judge Evidence

**Story ID:** EFE-S02

## Epic
[Diagnose Eval Failures from Selected CLI Evidence](../epic_brief.md)

**Status:** verified/integrated

## User Story
As an engineer examining a failed rubric assertion, I want to see exactly what the judge received and returned alongside the score, so that I can distinguish the model's answer from the judge's evaluation.

## Context and Source Traceability
- BRD: [`../../../brd.md`](../../../brd.md), REQ-04–REQ-06, REQ-08; AC-02–AC-04, AC-06.
- SDD: [`../../../sdd.md`](../../../sdd.md), Evidence and ordering contract, Persistence, limits, and selected reads, Failure behavior, and Quality strategy.
- Domain and capability: Local Evals Workbench Assertion / Grader, Judge Model, Eval Result, and Failure Analysis; Inspect failure evidence and Classify likely failure cause in `docs/capabilities-map.md`.
- UX: not applicable.

## In Scope
- Capture and link the actual rubric/reference context, exact judge request and response/rationale, parsed score, threshold, Judge Model ID, and grading errors for a selected assertion.
- Reuse EFE-S01's bounded selected-result and field-continuation path; mark uncaptured judge evidence explicitly in older runs.

## Out of Scope
- Changing rubric semantics, scores, thresholds, or assertions to make a case pass; automatically deciding that the judge is wrong; dashboard changes.

## Acceptance Criteria
- **AC-01 — Judge exchange:** A failed rubric result exposes the exact judge request, including instructions, evaluated answer, and supplied references, plus the exact judge response/rationale and actual Judge Model ID (BRD REQ-04, REQ-05). Verification: test.
- **AC-02 — Scoring distinction:** The evaluated rubric, numeric score, threshold, and pass/fail comparison remain distinct from the raw judge text; a deterministic check is not presented as judge-scored (BRD REQ-04, REQ-05). Verification: test.
- **AC-03 — Missing or faulty judge:** A malformed, failed, or uncaptured judge exchange is labeled as grading error or evidence gap rather than a model assertion failure; existing artifact reads remain valid (BRD REQ-05, REQ-06). Verification: test.
- **AC-04 — Complete selected path:** A large judge field can be retrieved through bounded continuation, and an artifact-to-CLI fake rubric case reconstructs the exact judge exchange without bulk artifact access (BRD REQ-04, REQ-06, REQ-08). Verification: test.

## Verification Expectations
- Fake-judge unit tests compare exact requests, responses, parsed scores, and links to the selected assertion.
- Disposable artifact-to-CLI integration tests cover the rubric case, old-run gaps, and bounded field reconstruction; failure tests cover malformed or unavailable judging. No live judge or human QA gate.

## Validation
- Focused deterministic runner, artifact, result, and CLI tests; `pnpm verify`; `pnpm run validate:packed-runtime` when packaged CLI behavior changes.

## Domain Context
Primary bounded context: Local Evals Workbench. A Judge Model evaluates an Assertion / Grader on an Eval Run; the judge exchange is evidence in that run's Eval Result, not an instruction to alter the rubric or repair a project.

## Technical Context
Extend the existing versioned evidence records and selected result command from EFE-S01. Keep raw judge content out of compact manifests and logs, and apply the SDD's grading-error distinctions.

## UX References
not applicable.

## Non-Functional Criteria
Exact judge fields remain retrievable when the selected JSON is bounded; gaps and artifact safety remain explicit (BRD REQ-06–REQ-07).

## Deployability and Feature Flag
**Behind flag:** no.
This is a complete additive rubric-case path on top of EFE-S01. Non-rubric cases and older artifacts retain their valid behavior with explicit missing-source markers.

## Dependencies
Depends on EFE-S01; blocks EFE-S03.

## Open Questions and Assumptions
Accepted assumption: the project runner is the source of truth for the actual judge request and response; absent payloads are marked `not-captured`. No unresolved material question.
