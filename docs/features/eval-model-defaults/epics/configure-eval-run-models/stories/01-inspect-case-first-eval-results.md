# Inspect Case-First Eval Results

**Story ID:** EMD-S01

## Epic

[Configure Eval Run Models](../epic_brief.md)

**Status:** ready-for-planning

## User Story

As an engineer reviewing evals, I want each test case's result to show the model and judge actually used, so that I can understand outcomes without interpreting a model-column matrix.

## Context and Source Traceability

- BRD: [Eval Model Defaults](../../../brd.md), REQ-06 and AC-06.
- SDD: [Software Design](../../../sdd.md), Run Evidence, Presentation, and Compatibility; Quality Strategy.
- Domain and capability: [Business Domain Model](../../../../../business-domain-model.md), Eval Run and Eval Result; [Capabilities Map](../../../../../capabilities-map.md), Show eval result status and Preserve isolated run evidence.
- UX: [UX Spec](../../../ux.md), case-first result mockups at phone, tablet, and desktop sizes, plus Interaction States.

## In Scope

- Replace model-column result grouping with a case-first row/card layout that shows status, case name, actual Model, optional Judge model, and the existing result-detail action.
- Use the model pair recorded by existing runs; do not label a historical result with a suite's current settings.
- Preserve result inspection and repair entry points.

## Out of Scope

- New saved defaults, test-case overrides, per-case runner choices, or UI automation.

## Acceptance Criteria

- **AC-01 — Case-first results:** Each completed case appears once with its status, name, and recorded evaluation model; rubric results also show the recorded judge model. Source: BRD REQ-06, AC-06. Verification: test.
- **AC-02 — Historical truth:** Changing current suite context does not relabel a prior run's model or judge. Source: BRD REQ-06, AC-06. Verification: test.
- **AC-03 — Detail path retained:** Opening a case result still reaches its existing evidence and failure-inspection actions. Source: BRD REQ-06, AC-06. Verification: test.
- **AC-04 — Binding layout:** Phone cards, tablet case list, and desktop case-first rows follow the applicable UX mockups; the user judges visual and accessibility fidelity after implementation. Source: BRD REQ-06, AC-06. Verification: needs human/LLM-judge review.

## Verification Expectations

- Deterministic non-UI result-contract and presentation-data tests prove recorded model labels and preserved detail links. Do not add or run automated UI review.
- The user performs post-implementation comparison with the UX phone, tablet, and desktop result mockups, including readable labels and accessible interactions.

## Validation

- `pnpm run build`; focused non-UI result/history tests; `pnpm run validate:packed-runtime` after changes stabilize. No automated UI tests or agent visual review.

## Domain Context

Primary context: Local Evals Workbench. One Eval Run yields per-case Eval Results; the result view reports recorded choices, not current suite defaults.

## Technical Context

Existing result-read contracts and workbench presentation within the Local Evals Workbench; see SDD Run Evidence, Presentation, and Compatibility. This Story does not change runner selection or suite persistence.

## UX References

`docs/features/eval-model-defaults/ux.md`: Phone blocked choice and case-first result, Tablet, Desktop, Interaction States, and Accessibility and Visual Direction.

## Non-Functional Criteria

Results remain inspectable without provider credentials; model labels are readable without hover or phone horizontal scrolling. Source: UX Accessibility and Visual Direction; SDD Run Evidence.

## Deployability and Feature Flag

**Behind flag:** no. Case-first results work with the existing single-model run contract and preserve all existing result-detail actions; no later Story is required for this layout to function.

## Dependencies

Blocks EMD-S02; no prerequisite Story.

## Open Questions and Assumptions

Accepted assumption: existing run-wide model metadata truthfully represents every case in historical runs, as described in the SDD. No unresolved questions.
