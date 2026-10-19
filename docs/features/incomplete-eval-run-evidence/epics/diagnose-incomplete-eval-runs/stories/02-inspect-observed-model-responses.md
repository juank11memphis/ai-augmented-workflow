# Inspect Observed Tested-Model Responses

**Story ID:** IERE-S02

## Epic

[Diagnose Incomplete Eval Runs](../epic_brief.md)

**Status:** in-progress

## User Story

As a coding agent troubleshooting an eval, I want selected access to the tested model's observed provider response even when parsing or turn completion fails, so that I can distinguish malformed provider output from missing evidence.

## Context and Source Traceability

- BRD: `docs/features/incomplete-eval-run-evidence/brd.md`, REQ-01–REQ-03, REQ-05–REQ-08; AC-01, AC-03, AC-04, and AC-05.
- SDD: `docs/features/incomplete-eval-run-evidence/sdd.md`, Execution and evidence boundaries, Main flow, State/limits/inspection, Project-runner contract, and Quality strategy.
- Domain and capability: `docs/business-domain-model.md`, Local Eval Artifact and Failure Analysis; `docs/capabilities-map.md`, Preserve isolated run evidence and Inspect failure evidence.
- UX: not applicable.

## In Scope

- Accept versioned tested-model provider-response observations before a turn or assertion completes, with stable case/attempt/call/provisional-turn links and backward-compatible handling of older runners.
- Persist observed raw bytes promptly in Git-excluded local source evidence, using per-response and per-run ceilings, explicit truncation metadata, and truthful capture gaps.
- Expose source locators from S01's selected attempt and retrieve only bounded selected byte ranges; publish the model-call runner obligation and an example failure-path contract.

## Out of Scope

- Judge provider-response capture, GeniusCR repository edits, dashboard changes, and automatic diagnosis or repair.

## Acceptance Criteria

- **AC-01 — Retain response before failure:** A fake runner emits a tested-model response, then malformed-output failure before turn completion; the incomplete attempt retains a selected locator to the observed bytes with its call/turn link and no fabricated completed turn. Verification: test. Source: REQ-01, REQ-02.
- **AC-02 — Bound and identify content:** Normal result output contains no raw body; selected field reads return bounded retained bytes and a continuation offset. Over-limit bodies are marked truncated with the known original size or missing extent. Verification: test. Source: REQ-05, REQ-06.
- **AC-03 — Preserve or report capture:** A response that cannot be observed, emitted, or persisted yields a specific gap; a partial write is not advertised as complete. Verification: test. Source: REQ-02, REQ-06.
- **AC-04 — State runner responsibility:** Runner guidance and a deterministic contract fixture show response emission before parsing and a gap when no response exists; v1/v2 runs remain readable and do not falsely claim this evidence. Verification: test. Source: REQ-07, REQ-08.

## Verification Expectations

- Fake-port unit, versioned protocol, artifact, and CLI acceptance tests cover malformed, non-success, unavailable, and oversized tested-model responses; reordered/chunked events; process exit after a persisted observation; and safe-path/Git-exclusion failures.
- Verify retained bytes and truncation metadata, bounded JSON, and absence of bodies in logs/ordinary results. Tests use disposable fake runners, not live models. Human review checks whether the emitted contract gives a project runner enough information to implement it; this is not a manual QA gate.

## Validation

- Focused protocol, execution, artifact, and CLI tests; `pnpm verify` and `pnpm run validate:packed-runtime` after implementation stabilizes.

## Domain Context

Primary context: Local Evals Workbench. Local Eval Artifact stores what the project runner actually observed for an Eval Run; Failure Analysis can inspect it without declaring an unsupported cause.

## Technical Context

Extend the Local Evals Workbench runner-process adapter, execute-run handler, artifact ports/adapters, and headless-result command slice as in the SDD. The new source observation does not require an assertion or completed turn.

## UX References

Not applicable.

## Non-Functional Criteria

Git-excluded local evidence, verified containment, hard per-response/run ceilings, bounded selected reads, and no raw bodies in routine output or logs (BRD REQ-05, REQ-06).

## Deployability and Feature Flag

**Behind flag:** no. This Story delivers a working tested-model evidence path for updated runners while existing runners keep truthful `not-captured` results; judge responses remain an explicit later capability, not a false promise.

## Dependencies

Depends on: IERE-S01. Blocks: IERE-S03.

## Open Questions and Assumptions

Accepted assumption: the SDD's versioned provider-response observation can be introduced compatibly within the existing Local Evals Workbench boundary.
