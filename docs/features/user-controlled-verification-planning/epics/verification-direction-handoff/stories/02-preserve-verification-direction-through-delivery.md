# Preserve Verification Direction Through Delivery

**Story ID:** UCVP-02

## Epic

[Engineer-Directed Verification Handoff](../epic_brief.md)

**Status:** ready-for-planning

## User Story

As an engineer delegating feature delivery, I want Stories and implementation plans to refine my SDD verification direction without routine approval pauses, so that work remains AFK-capable and material deviations return to me.

## Context and Source Traceability

- BRD: `docs/features/user-controlled-verification-planning/brd.md`, REQ-04–REQ-06, AC-03–AC-04, and Business Rules.
- SDD: `docs/features/user-controlled-verification-planning/sdd.md`, Workflow design and ownership, Main interaction and exception flow, Change classification and failure behavior, and Quality strategy for this feature.
- Domain and capability: `docs/business-domain-model.md` (AI-Augmented Development Pipeline, Story Implementation Plan, Task Check, User Control); `docs/capabilities-map.md` (carry reviewed context, define executable Task checks, resolve plan findings, stop on material decisions, advance unattended).
- UX: not applicable; future UI Story expectations still inherit visual-review limits from that feature's SDD.

## In Scope

- Have Scrum Stories carry applicable SDD verification methods, coverage, evidence, human limits, and exclusions into acceptance criteria and verification expectations.
- Have implementation planning choose concrete, proportionate Task checks within that direction and pass enough context for independent plan review.
- Distinguish routine equivalent-check choices and ordinary failed-check recovery from material strategy departures; stop changed planning/execution until the engineer directs an SDD revision.
- Preserve existing automatic plan-review repair, checked-Task evidence, and Story progression controls without a new human plan gate.
- Update applicable managed templates, metadata, and focused deterministic contract/lifecycle checks.

## Out of Scope

- Rewriting the SDD itself, new routine Story/Task approval, automatic SDD mutation by an executor, new testing infrastructure, and live-model behavior guarantees.

## Acceptance Criteria

- **AC-01 — Story-level preservation:** Scrum guidance turns applicable SDD verification direction into Story acceptance criteria and evidence expectations without silently dropping methods, human limits, or material exclusions (`docs/features/user-controlled-verification-planning/brd.md` REQ-04). Verification: test.
- **AC-02 — Routine refinement stays unattended:** Implementation planning may select repo-appropriate commands or equivalent checks, and a clean independent plan review still proceeds to checked execution without engineer approval (`docs/features/user-controlled-verification-planning/brd.md` REQ-04, REQ-06). Verification: test.
- **AC-03 — Material change stops:** Guidance identifies an infeasible or insufficient approach, non-equivalent substitution, or material new method, expense, dependency, or human judgment; it explains the difference and stops the affected path for an engineer-directed SDD revision before planning or executing the changed approach (`docs/features/user-controlled-verification-planning/brd.md` REQ-05). Verification: test.
- **AC-04 — Evidence and failure boundaries remain honest:** Checked-Task evidence and `Done when` requirements remain, and an ordinary failed prescribed check is not misclassified as a strategy change (`docs/features/user-controlled-verification-planning/brd.md` REQ-04–REQ-06). Verification: needs human/LLM-judge review.

## Verification Expectations

- Deterministic contract/fixture checks cover SDD-to-Story-to-plan handoff, routine equivalent checks, material substitutions/new external dependencies, and a newly required human judgment point.
- Focused review verifies that the independent plan-review and executor stop paths preserve automatic source-aligned repair and do not add routine engineer approval or silent SDD edits.
- Lifecycle and packed-template evidence confirms that changed guidance reaches installed workflows without overwriting customized files. None of this proves future LLM behavior.

## Validation

- Focused repository tests for affected Scrum, planner, reviewer, and executor guidance contracts, plus relevant template/sync lifecycle checks, selected from actual definitions during implementation.
- `pnpm verify` once the change stabilizes; `pnpm run validate:packed-runtime` if template distribution changes installed behavior.
- Manual diff review of handoffs, manifest/update notes, and the no-new-approval boundary.

## Domain Context

Primary context: AI-Augmented Development Pipeline, supported by Skill Guidance. Story Implementation Plan, Task Check, Artifact, and User Control are existing concepts; no new aggregate or event is introduced.

## Technical Context

Prompt/template-owned Scrum, implementation planner/toolbox, independent plan-review, and executor/gatekeeper guidance identified in the SDD's Workflow design and ownership. Preserve source-artifact authority and existing review/evidence controls; no new runtime operation or deep module.

## UX References

not applicable; no UI is changed by this Story.

## Non-Functional Criteria

Keep handoffs concise and verification proportional to Story risk. Preserve unattended progression for routine choices and report the limit of deterministic prompt tests.

## Deployability and Feature Flag

**Behind flag:** no.
This Story completes the handoff from the SDD contract supplied by UCVP-01. It is a backward-compatible guidance change and leaves existing Story review and execution controls valid.

## Dependencies

Depends on: UCVP-01. Blocks: none.

## Open Questions and Assumptions

Open questions: none. Accepted assumption: the existing plan-review and checked-Task controls can carry the SDD direction without a new human approval stage.
