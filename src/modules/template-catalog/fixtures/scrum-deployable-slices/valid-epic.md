# Traceable Unflagged Planning Epic Brief

**Epic ID:** SAMPLE-E01

## Summary
New unflagged planning artifacts are traceable and reviewable without waiting for another Story.

## Source Context
- BRD: `src/modules/template-catalog/fixtures/scrum-deployable-slices/sample-brd.md`, Requirements `REQ-01`–`REQ-05`, `REQ-09`, `REQ-10`.
- Technical design: `docs/features/deployable-epic-story-authoring/sdd.md`, Ownership and artifact contracts; Authoring behavior and output shape.
- Domain: `docs/business-domain-model.md`, Skill Guidance and AI-Augmented Development Pipeline.
- Capabilities served: `docs/capabilities-map.md`, Skill Guidance and Template Catalog.
- UX: not applicable; this Epic changes authoring guidance and has no UI impact.

## Scope
- Publish one unflagged authoring contract and its distribution metadata.

## Out of Scope
- Conditional flag decisions and runtime changes.

## User Stories and Sequence
1. [SAMPLE-S01 — Publish an unflagged planning contract](./valid-story.md) — standalone; depends on none and blocks none.

## Acceptance Criteria
- The distributed skill and manifest describe a coherent, traceable Story contract (`REQ-01`, `REQ-10`).

## Dependencies / Risks
- Completion condition: the standalone Story meets its acceptance checks and the updated skill is packaged. Prompt conformance remains subject to human review.
