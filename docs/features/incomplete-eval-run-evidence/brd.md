# Incomplete Eval Run Evidence Business Requirements Document

## Executive Summary and Business Need

An engineer or coding agent troubleshooting an eval run needs to see what was actually observed, not only that a case was `incomplete`. In the reported GeniusCR `website-assistant-conversations` incident, a full run was partial and a focused `approximate-price` run ended `runner-exited`; safe diagnostic codes named malformed output and provider-loop failure, but `sibu evals result` did not expose bounded, linked failure evidence or the provider response needed to investigate. A read-only source inspection suggests the project runner emits diagnostic codes but not a provider-response source record on that failure path, while Sibu's compact result summary omits attempt diagnostics and its selected detail route expects an assertion that an incomplete attempt may never produce. This feature closes the evidence path from runner observation through local persistence to CLI inspection, without promising that every failure has a knowable root cause.

## Objectives and Measurable Success

- OBJ-01 — Make ordinary eval failures diagnosable: across representative assertion, provider, project-adapter, judge, runner/protocol, timeout, and process-exit scenarios, the engineer or repo agent can locate the case, attempt, turn, observed raw response when one exists, relevant diagnostics, and the stage that reported the failure—or identify the precise evidence gap.
- OBJ-02 — Keep failure evidence honest and usable: partial/error runs retain observed evidence, `evals result` stays bounded, and a runner-reported failure is not misrepresented as an unexplained process exit or as a model-quality failure.

## Stakeholders and Needs

- **Engineer running local evals:** needs a concise status and a direct route to the failed or incomplete attempt rather than searching a full run artifact.
- **Coding agent troubleshooting in the project repo:** needs the actual provider response and linked turn/tool context when the runner observed them, plus clear evidence gaps when it did not.
- **Project runner author:** needs a clear responsibility to emit observed source evidence even when an attempt fails before normal completion.
- **Engineer responsible for sensitive data:** needs raw bodies kept out of routine logs and CLI summaries and local evidence excluded from normal Git tracking; Git-ignore alone is not a complete privacy control.

## Scope and Exclusions

**First useful scope:** CLI `sibu evals result`, its persisted local run evidence, and the project-runner evidence contract. Capture observed provider responses as model calls happen in every eval run so a later failure does not erase them. Preserve source records and safe diagnostics across incomplete, partial, error, and interrupted outcomes; link them to run, case, attempt, model call, and turn where known. The normal result view remains compact and gives an agent a direct locator for selected source evidence. Complete raw response content remains in Git-ignored local source artifacts when within a hard storage limit. If that limit is exceeded, retain the bounded portion and report truncation and the missing extent when known. Distinguish a runner-reported failure from an unexpected runner process exit.

**Excluded:** dashboard changes; live-model tests in the routine suite; automatic repair of the target application or project runner; a general eval-system refactor; a guarantee of root-cause diagnosis for events that produced no observable response; raw provider bodies in routine logs or unselected CLI summaries; hidden model reasoning; production deployment.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-01, OBJ-02. Preserve each provider response the project runner observes as linked source evidence when the call occurs, including calls followed by malformed output, adapter failure, judge failure, or an attempt that never completes. Preserve the observed response rather than replacing it with a diagnostic code or paraphrase. (RULE-01)
- REQ-02 — Type: functional; Objectives: OBJ-01, OBJ-02. Persist the latest valid case/attempt/turn-linked source records and diagnostics through partial, error, interrupted, and unexpected-exit outcomes without marking an incomplete attempt completed or inventing absent records. (RULE-01, RULE-02)
- REQ-03 — Type: functional; Objectives: OBJ-01. Make an incomplete or errored attempt selectable in `sibu evals result` even if it produced no failed assertion; show bounded diagnostic context and locators to its actual source evidence, including the raw provider response when available. (RULE-02, RULE-03)
- REQ-04 — Type: functional; Objectives: OBJ-01, OBJ-02. Distinguish a failure explicitly reported by a project runner from a process that exited or disappeared unexpectedly, and retain the runner's specific reported reason when valid. Do not label a provider, adapter, or Sibu protocol problem more precisely than the evidence permits. (RULE-04)
- REQ-05 — Type: quality; Objectives: OBJ-01, OBJ-02. Keep routine CLI output bounded and free of raw provider bodies, credentials, secrets, and hidden reasoning. Keep detailed source evidence in local artifacts excluded from normal Git tracking and accessible through a selected, bounded inspection path; do not bulk-load a full run into ordinary agent context. (RULE-03, RULE-05)
- REQ-06 — Type: quality; Objectives: OBJ-01, OBJ-02. If a response was not observed, not emitted, not persisted, or exceeded the hard artifact limit, identify that specific gap. For over-limit content, mark the retained record truncated and report original size or missing extent when known; do not present it as a complete raw response. (RULE-02, RULE-05)
- REQ-07 — Type: stakeholder; Objectives: OBJ-01. State the project-runner obligation: emit source records for every provider response it can observe, including on failure paths and before normal case completion; emit a failure reason and evidence-gap signal when a response cannot be emitted. Identify project-side changes needed when a runner currently emits only codes. (RULE-01, RULE-04)
- REQ-08 — Type: transition; Objectives: OBJ-01, OBJ-02. Verify the runner-to-artifact-to-result path with deterministic fake-runner scenarios for malformed response, provider/adapter failure, judge failure, runner-reported error, unexpected exit, incomplete attempt, missing source record, and storage-limit truncation. Do not call live models in routine unit tests. (RULE-06)

## Business Rules

- RULE-01 — Source evidence records what the runner actually observed. Failure before a case completes does not excuse losing an already observed provider response.
- RULE-02 — `partial`, `error`, `interrupted`, and `incomplete` are distinct from an assertion failure or a completed case. Missing or partial evidence remains visibly missing or partial.
- RULE-03 — The normal run summary is a locator, not a dump of raw responses. A selected attempt must be inspectable without inventing a failed assertion as its selection key.
- RULE-04 — A runner's valid terminal failure report and an unexpected process exit are different facts. If both are observed, preserve both without collapsing them into an unsupported cause claim.
- RULE-05 — Detailed source artifacts are local and Git-excluded, with a hard size boundary and explicit truncation or capture-gap markers. Git exclusion limits accidental commits but does not itself protect sensitive content or authorize sharing it.
- RULE-06 — Deterministic tests can prove Sibu's handling of fake runner evidence and output contracts, not that a live provider or agent will behave the same way.

## Business Acceptance Criteria

- AC-01 (REQ-01, REQ-02) — A fake runner emits a provider response, then reports malformed output before completing the case. The persisted incomplete attempt still links to that actual response and its case, attempt, model call, and turn; no completed result is fabricated.
- AC-02 (REQ-03, REQ-04) — For the reported `approximate-price` shape, `evals result` identifies the incomplete attempt, its runner diagnostics and turn, and a selected evidence locator. It distinguishes a runner-reported error from an unexpected exit; an unavailable response is shown as a specific gap, not an empty success-shaped result.
- AC-03 (REQ-05, REQ-06) — The unselected run view remains compact and contains no raw provider body. Selected inspection can retrieve linked raw evidence within the hard limit; over-limit evidence is marked truncated with the missing extent when known.
- AC-04 (REQ-07) — Runner guidance and a deterministic contract case show what a project runner emits when it observed a response before failing, and how it declares a response it could not observe or emit.
- AC-05 (REQ-08) — Fake-runner tests cover the listed ordinary failure classes and assert persisted evidence, result locators, truthful state/reason distinctions, and explicit gaps without making live-model calls.

## Illustrative `evals result` Outcome

The following is the expected **information**, not a prescribed CLI schema or a claim that the historical runs can be reconstructed after the fact:

```text
suite: website-assistant-conversations
run: 0001a15529f5e5-d3eb601d8f004687994059b5ddbe8d8e
status: error  case: approximate-price  attempt: 1  state: incomplete
failure origin: runner-reported error (or unexpected exit if no valid report was emitted)
turn: 0  diagnostics: malformed-output, loop-provider-failure
observed activity: model calls 2; tool calls 4; embedding trace at turn 0
source evidence: selected case/attempt/turn/model-call locator for observed provider response
evidence gap: none, or the specific missing/truncated record and extent
```

For the full partial run, the summary should identify two completed cases, `approximate-price` as incomplete, and 14 not run, then point to the incomplete attempt. It must not imply that either historical run already has a raw response artifact if its runner did not emit one.

## Product Vision Fit

Sibu should let engineers and agents improve AI behavior with evidence while keeping the local workflow clear, reviewable, and honest. This feature replaces an opaque `incomplete` label with linked observations and explicit limits, without treating an agent's explanation as proof or moving ownership away from the engineer.

## Business Domain Model Fit

This feature uses the existing **Local Evals Workbench**, **Eval Suite**, **Eval Test Case**, **Eval Run**, **Eval Result**, **Local Eval Artifact**, and **Failure Analysis** concepts in `docs/business-domain-model.md`. It strengthens the run-to-result evidence path, including incomplete attempts, without changing the user-approval rule for any later repair proposal.

## Capability Coverage

The **Local Evals Workbench** capabilities in `docs/capabilities-map.md` already include **Show eval result status**, **Preserve isolated run evidence**, **Inspect failure evidence**, **Classify likely failure cause**, **Run focused eval scope**, and **Explain agent-guided failures plainly**. This feature makes those abilities usable when a case stops before an assertion result exists. The external project runner remains responsible for emitting the provider response that Sibu cannot observe directly.

## Known Project-Runner Dependency

Read-only inspection of GeniusCR's `website-assistant-conversations` runner indicates its failure path currently emits diagnostic codes and an errored case result, but not a provider-response source record. A GeniusCR-side runner/adapter change is therefore needed to capture and emit the observed response incrementally through Sibu's source-evidence contract, including malformed-response paths. Sibu can preserve and expose records it receives, but it cannot recreate a provider body from diagnostic codes alone. This BRD does not authorize edits to GeniusCR.
