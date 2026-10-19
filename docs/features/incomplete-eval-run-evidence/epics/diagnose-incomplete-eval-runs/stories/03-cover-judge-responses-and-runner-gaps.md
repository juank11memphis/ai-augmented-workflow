# Cover Judge Responses and Runner Evidence Gaps

**Story ID:** IERE-S03

## Epic

[Diagnose Incomplete Eval Runs](../epic_brief.md)

**Status:** done

## User Story

As an engineer or coding agent, I want judge-call failures and missing runner evidence to appear alongside tested-model evidence, so that ordinary incomplete eval runs have a useful, honest diagnosis path across both provider roles.

## Context and Source Traceability

- BRD: `docs/features/incomplete-eval-run-evidence/brd.md`, REQ-01–REQ-08; AC-01–AC-05.
- SDD: `docs/features/incomplete-eval-run-evidence/sdd.md`, Execution and evidence boundaries, Main flow, Project-runner contract, and Quality strategy.
- Domain and capability: `docs/business-domain-model.md`, Eval Run, Local Eval Artifact, and Failure Analysis; `docs/capabilities-map.md`, Inspect failure evidence, Classify likely failure cause, and Explain agent-guided failures plainly.
- UX: not applicable.

## In Scope

- Apply the S02 response observation, persistence, limits, gaps, and selected inspection path to judge provider calls, including grading errors before normal completion.
- Complete runner guidance for both roles and the distinction among no response received, response not emitted, and response emitted but not persisted where observable.
- Cover the BRD's representative assertion, provider, adapter, judge, malformed-output, runner/protocol, timeout, and process-exit outcomes with deterministic end-to-end fixtures and accurate failure/gap classification.

## Out of Scope

- Changes to GeniusCR, live-model tests, dashboard work, automated repair, or a claim that every failure has a knowable root cause.

## Acceptance Criteria

- **AC-01 — Preserve judge response:** A fake runner emits a judge response before a grading error; the incomplete attempt links to its retained raw bytes and diagnostic without fabricating a completed judgment. Verification: test. Source: REQ-01, REQ-02.
- **AC-02 — Expose honest gaps:** Judge or model calls with no observed response, failed emission, failed persistence, or truncation show the specific known gap/limit; a runner-reported failure remains distinct from an unexpected exit. Verification: test. Source: REQ-04, REQ-06.
- **AC-03 — Demonstrate the incident shape:** The focused `approximate-price` fake run returns an incomplete attempt, linked diagnostics and response locator only when emitted; the full-run fake shows two completed cases, one incomplete, and 14 not run. Verification: test. Source: REQ-03, REQ-08.
- **AC-04 — Complete the runner contract:** Guidance and deterministic fixtures cover both tested-model and judge calls, malformed/non-success responses, and the evidence-gap obligations when Sibu cannot observe provider traffic itself. Verification: test. Source: REQ-07, REQ-08.

## Verification Expectations

- End-to-end disposable fake-runner cases demonstrate persisted response-to-result links, selected byte-range reads, safe bounded JSON, and accurate origin/gap markers across the listed failure classes. Unit and contract tests cover judge-specific links and interrupted or invalid event streams.
- Human review checks that conclusions do not outrun evidence and that the external-runner contract is implementable. No live-model eval or separate manual/automated QA phase is required.

## Validation

- Focused judge/protocol, artifact, headless-result, and CLI tests; `pnpm verify` and `pnpm run validate:packed-runtime` after implementation stabilizes.

## Domain Context

Primary context: Local Evals Workbench. Eval Run links model and judge observations to Local Eval Artifacts; Failure Analysis consumes those observations and explicit gaps without claiming certainty.

## Technical Context

Extend the S02 Local Evals Workbench response contract to judge calls and verify the SDD sequence across runner, execute handler, store, reader, and CLI. No new module or separate inspection API.

## UX References

Not applicable.

## Non-Functional Criteria

The same hard caps, Git-excluded local storage, selected bounded reads, and no-raw-body routine output/log policy apply to judge evidence (BRD REQ-05, REQ-06).

## Deployability and Feature Flag

**Behind flag:** no. This Story extends the already working selected-evidence path to judge calls and completes the Epic without requiring an unmerged sibling Story.

## Dependencies

Depends on: IERE-S02. Blocks: none.

## Open Questions and Assumptions

Accepted assumption: GeniusCR adoption is a separate project-side change; Sibu's fake-runner evidence can validate the contract without live-model access.
