# Inspect Incomplete Attempt Failures

**Story ID:** IERE-S01

## Epic

[Diagnose Incomplete Eval Runs](../epic_brief.md)

**Status:** in-progress

## User Story

As an engineer or coding agent, I want to select an incomplete eval attempt and see its observed diagnostics and failure origin, so that I can investigate a stopped run without inventing a failed assertion.

## Context and Source Traceability

- BRD: `docs/features/incomplete-eval-run-evidence/brd.md`, REQ-02–REQ-04, REQ-05, REQ-08; AC-02 and AC-05.
- SDD: `docs/features/incomplete-eval-run-evidence/sdd.md`, Main flow and failure branches, State/limits/inspection, and Quality strategy.
- Domain and capability: `docs/business-domain-model.md`, Eval Run, Eval Result, and Failure Analysis; `docs/capabilities-map.md`, Show eval result status and Inspect failure evidence.
- UX: not applicable.

## In Scope

- Make `evals result` locate and select an incomplete case/attempt without an assertion ID while preserving existing assertion selection.
- Persist and present bounded case/attempt diagnostic codes and structured failure provenance, distinguishing a valid runner error report, unexpected exit, timeout, and protocol or storage failure without claiming an unproven root cause.
- Preserve partial-run counts and the last valid attempt checkpoint; show `not-captured` when no response record exists.

## Out of Scope

- New raw provider-response capture, judge response capture, dashboard changes, and automatic repair.

## Acceptance Criteria

- **AC-01 — Select an incomplete attempt:** A partial or error run with no assertion result offers a case/attempt locator and returns a selected attempt rather than a selection error. Verification: test. Source: REQ-03.
- **AC-02 — Distinguish failure origins:** A valid runner-reported error and a process exit without a valid report produce different persisted/result origins; when both occur, both facts remain visible. Verification: test. Source: REQ-04.
- **AC-03 — Preserve bounded context:** The selected attempt shows bounded linked diagnostic codes and its true incomplete state; the unselected summary gives completed/incomplete/not-run counts without raw provider content. Verification: test. Source: REQ-02, REQ-05.
- **AC-04 — Report absence honestly:** When the runner did not emit response evidence, the selected attempt reports `not-captured` and does not imply a response is recoverable. Verification: test. Source: REQ-03, REQ-08.

## Verification Expectations

- Fake-port handler tests and disposable fake-runner CLI tests demonstrate the runner report/exit branches, incomplete selection without assertion, and the GeniusCR-shaped two-completed/one-incomplete/14-not-run summary.
- Edge tests retain the last valid checkpoint after timeout or malformed trailing events and do not fabricate a completed turn, assertion, or case. Review structured output for bounded size and safe codes; no live model is used.

## Validation

- Focused handler, runner-adapter, artifact-reader, and CLI tests; `pnpm verify` and `pnpm run validate:packed-runtime` after implementation stabilizes.

## Domain Context

Primary context: Local Evals Workbench. Eval Run and Eval Result retain a truthful incomplete attempt; Failure Analysis consumes observed diagnostics, not an inferred cause. The project runner is an external collaborator.

## Technical Context

Extend existing execute-run and headless-result command slices, artifact reader/store contracts, and the CLI driving adapter as described in the SDD. Do not add a deep module or bypass handlers from the CLI.

## UX References

Not applicable.

## Non-Functional Criteria

Bounded ordinary JSON, safe diagnostic codes, and no raw provider body in routine result or logs (BRD REQ-05).

## Deployability and Feature Flag

**Behind flag:** no. This Story is a complete, backward-compatible CLI diagnosis improvement; a missing raw response remains an explicit gap until later Stories and project runners supply it.

## Dependencies

Depends on: none. Blocks: IERE-S02.

## Open Questions and Assumptions

Accepted assumption: existing runner protocol versions continue to read, with absent new response evidence labeled `not-captured` rather than reconstructed.
