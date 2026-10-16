# Locate and Classify Eval Failures Reliably

**Story ID:** EFE-S03

## Epic
[Diagnose Eval Failures from Selected CLI Evidence](../epic_brief.md)

**Status:** verified/integrated

## User Story
As an engineer or coding agent reading a full-suite run, I want reliable locators and honest failure states, so that I can open the right assertion and avoid diagnosing a tool, judge, or incomplete-run problem as a model failure.

## Context and Source Traceability
- BRD: [`../../../brd.md`](../../../brd.md), REQ-01, REQ-05–REQ-08; AC-01, AC-03–AC-06.
- SDD: [`../../../sdd.md`](../../../sdd.md), Design summary, Owning operations and interfaces, Failure behavior, Main interaction, and Quality strategy.
- Domain and capability: Local Evals Workbench Eval Run/Result and Failure Analysis; Show eval result status, Analyze one failed assertion at a time, Classify likely failure cause, and Guide agent-based eval sessions in `docs/capabilities-map.md`.
- UX: not applicable.

## In Scope
- Ensure every failed assertion remains reachable through compact case/attempt/assertion locators, including an explicit continuation when a locator list is bounded.
- Report the selected run, case, attempt, assertion, tested/judge model IDs, relevant diagnostics, and distinct evaluated failure, judge, tool/runner, and incomplete states without unsupported causal claims.
- Document the run-locator → selected-result → omitted-field workflow and complete deterministic regression coverage across the CLI surface.

## Out of Scope
- Human QA gate, live-model routine evals, automatic repair decisions, dashboard changes, and new privacy/redaction rules.

## Acceptance Criteria
- **AC-01 — Reliable locators:** A failed full-suite run returns ordered run/case/attempt/assertion identifiers; if the compact list is bounded, its continuation reaches every remaining failure without a transcript dump (BRD REQ-01, REQ-06). Verification: test.
- **AC-02 — Distinct states:** Model assertion failure, judge error or possible disagreement, tool/runner error, and partial/interrupted execution are not conflated; missing evidence is named, not filled with a guessed cause (BRD REQ-05, REQ-06). Verification: test.
- **AC-03 — Correct selection:** A locator opens only its own persisted attempt/assertion and reports the actual per-case model IDs, score, errors, and ordering evidence; a wrong or unavailable selection does not fall back silently (BRD REQ-01, REQ-05). Verification: test.
- **AC-04 — Documented CLI path:** CLI documentation shows how to use a run locator, selected result, and retained-field continuation, while stating the privacy and live-LLM testing limits accurately (BRD REQ-07, REQ-08). Verification: build/check.

## Verification Expectations
- Fake-run unit and artifact-to-CLI integration tests cover multiple cases/failures, locator continuation, result identity, partial/error states, and absence of raw payloads in compact output and logs.
- Disposable Git fixtures prove unsafe artifact tracking remains blocked. Documentation examples are checked against the implemented CLI. No live model or human QA gate.

## Validation
- Focused deterministic run/result/CLI and artifact-safety tests; `pnpm verify`; `pnpm run validate:packed-runtime` for installed CLI behavior.

## Domain Context
Primary bounded context: Local Evals Workbench. An Eval Run can contain several Eval Test Cases and assertions; Failure Analysis focuses on one selected failed assertion while incomplete/error states remain separately inspectable.

## Technical Context
Use the existing `headless-eval-run`, `headless-eval-result`, run-history, and CLI boundaries. Preserve the SDD's compact manifest, selected evidence projection, typed gap, and safe diagnostic contracts.

## UX References
not applicable.

## Non-Functional Criteria
Full-suite output remains compact; detailed payloads require an explicit selected read, and artifact Git-exclusion safeguards remain in force (BRD REQ-01, REQ-06–REQ-07).

## Deployability and Feature Flag
**Behind flag:** no.
This Story finishes the backward-compatible CLI workflow and does not depend on an unmerged sibling once EFE-S01 and EFE-S02 are integrated.

## Dependencies
Depends on EFE-S01 and EFE-S02; blocks Epic completion.

## Open Questions and Assumptions
Accepted assumption: classifications report observed states and uncertainty rather than asserting that a human or LLM has proven the root cause. No unresolved material question.
