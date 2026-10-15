# Reuse Suite Model Defaults

**Story ID:** EMD-S02

## Epic

[Configure Eval Run Models](../epic_brief.md)

**Status:** ready-for-planning

## User Story

As an engineer running evals, I want to save separate suite defaults for evaluation and rubric judging, so that I can rerun without choosing models every time while retaining a one-run choice for a single case.

## Context and Source Traceability

- BRD: [Eval Model Defaults](../../../brd.md), REQ-01, REQ-03–REQ-06 and AC-01, AC-02, AC-04–AC-06.
- SDD: [Software Design](../../../sdd.md), Responsibilities and Contracts, Project-Owned Suite Format and Persistence, Main Flow, and Quality Strategy.
- Domain and capability: [Business Domain Model](../../../../../business-domain-model.md), Suite Model Default, One-Run Model Choice, and unavailable choice rules; [Capabilities Map](../../../../../capabilities-map.md), Manage suite model defaults and Resolve models for eval runs.
- UX: [UX Spec](../../../ux.md), suite summary, Suite models dialog, single-case This run only, and missing/unavailable suite states.

## In Scope

- Add optional separate suite defaults to project-owned version-2 eval suite definitions, including optional selection during suite authoring, while preserving old-suite discovery and validating saved choices.
- Let users set, change, and reset defaults through the Suite models dialog; a change is saved only on explicit Save and protected from unsafe paths or concurrent edits.
- Make preview/start use valid suite defaults for full-suite and single-case runs, require missing defaults when needed, and pause on unavailable suite choices without fallback.
- Let a single-case run use a temporary Model or applicable Judge model without saving it; reject run-only model inputs for full-suite scope.
- Apply the same defaults and blocking choices in the UI and agent-guided flow, including updated distributed guidance. Preserve preview, existing runner execution, and result detail behavior.

## Out of Scope

- Test-case overrides, mixed-model full-suite execution, automatic recommendations/fallback, and UI automation.

## Acceptance Criteria

- **AC-01 — Repeatable suite choice:** Defaults may be chosen during suite authoring or later; a user can set or change the suite Model and applicable Judge model, rerun without choosing them again, and see the saved choices in the suite summary. Source: BRD REQ-01, REQ-03, AC-01, AC-02. Verification: test.
- **AC-02 — Reset and missing choice:** Reset leaves a suite default unset; Start run pauses for an explicit choice, including when an old suite has no default. Deterministic-only scope does not require a Judge model. Source: BRD REQ-01, REQ-05, AC-01, AC-02, AC-05. Verification: test.
- **AC-03 — Unavailable choice:** An unavailable saved suite model blocks preview/start until a compatible replacement is explicitly saved, with no paid runner call or silent substitution. Source: BRD REQ-05, AC-05. Verification: test.
- **AC-04 — Temporary single-case choice:** A single-case run can choose another compatible Model or applicable Judge model without changing saved suite defaults; full-suite scope rejects that temporary input. Source: BRD REQ-04, AC-04. Verification: test.
- **AC-05 — Surface parity:** The UI and agent-guided flow reach the same defaults and blocked outcomes; the user judges suite controls and dialogs against binding phone/tablet/desktop UX mockups afterward. Source: BRD REQ-06, AC-06. Verification: needs human/LLM-judge review.

## Verification Expectations

- Fake-port handler and suite-file fixture tests show valid set/change/reset, no accidental mutation on preview/run/Cancel, old suite compatibility, symlink/root-escape refusal, concurrent-edit conflicts, and no fallback.
- Non-UI integration tests show the same effective choice through preview and start, a single-case temporary choice not persisted, and agent-facing result parity. No live LLM or automated UI review.
- The user performs post-implementation QA of suite summary, Suite models dialog, missing/unavailable states, This run only controls, and phone/tablet/desktop fidelity.

## Validation

- `pnpm run build`; focused non-UI suite-contract, saved-choice, preview/start, and agent-guidance tests; `pnpm run validate:packed-runtime` after changes stabilize. Do not run automated UI tests as a verification method for this Story.

## Domain Context

Primary context: Local Evals Workbench. A suite's separate defaults govern its cases until an explicit user change; the external runner supplies compatibility information. Template Catalog distributes revised guidance without owning project choices.

## Technical Context

Command/Handler/Result slices for saved-choice mutation and shared preview/start selection, with project-file, runner-description, and artifact ports. See SDD Responsibilities and Contracts and Project-Owned Suite Format and Persistence.

## UX References

`docs/features/eval-model-defaults/ux.md`: Phone suite defaults and full-suite run, Phone persistent model dialogs (Suite models), Phone blocked choice, Tablet, Desktop, and Interaction States.

## Non-Functional Criteria

No silent fallback, unsafe suite-file write, lost concurrent edit, or credential storage. Preserve user control and existing evidence/repair paths. Source: BRD REQ-05 and SDD Security, Failure, and Operational Behavior.

## Deployability and Feature Flag

**Behind flag:** no. With no test-case overrides yet, every case inherits the working suite pair, which the existing runner protocol can execute. A missing or unavailable suite default yields the complete reviewed stop-and-recover path; no unmerged Story is needed for safe use.

## Dependencies

Depends on EMD-S01; blocks EMD-S03.

## Open Questions and Assumptions

Accepted assumption: case-level override controls remain absent until EMD-S03; no invalid case override is exposed by this Story. No unresolved questions.
