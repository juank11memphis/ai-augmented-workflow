# Publish an Unflagged Planning Contract

**Story ID:** SAMPLE-S01

## Epic
[SAMPLE-E01](./valid-epic.md)

**Status:** ready-for-planning

## User Story
As an engineer, I want the new Story template to express a complete unflagged planning contract, so implementation planning starts from checkable scope.

## Context and Source Traceability
- BRD: `docs/features/deployable-epic-story-authoring/brd.md`, Requirements `REQ-02`, `REQ-03`, `REQ-04`, `REQ-05`, `REQ-09`, `REQ-10`.
- SDD: `docs/features/deployable-epic-story-authoring/sdd.md`, Ownership and artifact contracts; Story boundary and template; Sizing and verification checks.
- Domain and capability: `docs/business-domain-model.md`, Skill Guidance; `docs/capabilities-map.md`, Skill Guidance (focused skill instructions) and Template Catalog (versioned templates).
- UX: not applicable; this is a domain-only guidance change with no UI impact.

## In Scope
- Publish the new Story structure and versioned manifest note as one working template update.

## Out of Scope
- Flag-decision workflow and implementation-planner behavior.

## Acceptance Criteria
- **AC-01 — Structure:** The distributed template contains all fixed Story sections in order (`REQ-03`, `REQ-09`). Verification: test.
- **AC-02 — Traceability:** The example names a served capability and valid source IDs (`REQ-05`). Verification: test.
- **AC-03 — Reviewability:** A reviewer can judge this as one independently deployable increment (`REQ-02`). Verification: needs human/LLM-judge review.

## Verification Expectations
- Focused template assertions and a human review of scope, mergeability, and the source-grounded example.

## Validation
- Run focused compiled template tests and repository verification.

## Domain Context
- Primary bounded context: Skill Guidance. Collaborator: Template Catalog for distribution. Aggregates and events: not applicable.

## Technical Context
- Prompt/template and manifest only; see the SDD's Ownership and artifact contracts. No runtime command or handler.

## UX References
Not applicable; no UI change.

## Non-Functional Criteria
Not applicable; no numeric threshold is sourced.

## Deployability and Feature Flag
**Behind flag:** no. The skill and manifest form a complete backwards-compatible package update; no unmerged sibling Story, migration, or runtime setting is required.

## Dependencies
Depends on: none. Blocks: none.

## Open Questions and Assumptions
Open questions: none. Accepted assumptions: existing Template Catalog distribution remains in place per SDD.
