# Diagnose Incomplete Eval Runs Epic Brief

**Epic ID:** IERE-E01

## Summary

Make a partial or errored local eval run inspectable from `sibu evals result`: identify the incomplete attempt and failure origin, then provide selected access to provider responses the runner actually observed or an explicit evidence gap.

## Source Context

- BRD: `docs/features/incomplete-eval-run-evidence/brd.md`, Requirements REQ-01–REQ-08 and Business Acceptance Criteria AC-01–AC-05.
- Technical design: `docs/features/incomplete-eval-run-evidence/sdd.md`, Execution and evidence boundaries, Main flow and failure branches, State/limits/inspection, and Quality strategy.
- Domain and capabilities: `docs/business-domain-model.md`, Local Evals Workbench and Failure Analysis; `docs/capabilities-map.md`, Show eval result status, Preserve isolated run evidence, Inspect failure evidence, and Explain agent-guided failures plainly.
- UX: not applicable; this Epic changes CLI JSON and local artifacts, not the dashboard.

## Scope

- Show incomplete attempts without requiring an assertion and distinguish runner-reported failures from unexpected exits.
- Incrementally capture, persist, and inspect bounded raw tested-model and judge provider responses, including failure paths, with explicit truncation and capture gaps.
- Document the project-runner obligation and verify the end-to-end evidence path with deterministic fake runners.

## Out of Scope

- Dashboard changes, live-model tests, separate automated or human QA, automatic repair, a general eval-system refactor, and edits to GeniusCR.

## User Stories and Sequence

1. [IERE-S01 — Inspect incomplete attempt failures](./stories/01-inspect-incomplete-attempt-failures.md) — independently useful CLI diagnosis; no prior Story.
2. [IERE-S02 — Inspect observed tested-model responses](./stories/02-inspect-observed-model-responses.md) — uses S01's attempt selection and provenance.
3. [IERE-S03 — Cover judge responses and runner evidence gaps](./stories/03-cover-judge-responses-and-runner-gaps.md) — extends S02's response contract and completes the multi-failure contract.

## Feature Flags

- None. Each Story is a backward-compatible, working increment with a bounded CLI result; the complete response coverage is an Epic completion condition.

## Acceptance Criteria

- A GeniusCR-shaped partial or error run identifies the incomplete case/attempt, observed diagnostic and failure origin, and selected response evidence or a precise gap; it does not claim to reconstruct historical responses that were not emitted.
- Updated runners can emit tested-model and judge responses before downstream parsing or turn completion, and Sibu preserves their bounded raw bytes in Git-excluded local artifacts without placing bodies in routine results or logs.
- Fake-runner tests cover the runner-to-artifact-to-result path, truncation, missing evidence, and runner-reported versus unexpected-exit outcomes without live model calls.

## Dependencies / Risks

- GeniusCR's runner needs its own later update to emit response observations; this Epic defines Sibu's contract but does not change that repository.
- Raw artifacts may contain sensitive data; Git exclusion is not access control. Byte ceilings and selected reads must remain truthful about truncation or missing evidence.
