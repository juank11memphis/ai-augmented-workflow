# Checkout Capability Epic Brief

**Epic ID:** SAMPLE-E02
**Status:** draft illustrative fragment; not ready for planning

## Summary
Illustrate a checkout Epic using one temporary capability flag. This is not an approved checkout delivery plan.

## Source Context
- Authoring rules only: `docs/features/deployable-epic-story-authoring/brd.md`, `REQ-06`, `REQ-07`, `REQ-08`, `REQ-10`; and its `sdd.md`, Conditional feature-flag decision and SDD handoff. These sources do not define checkout behavior.
- Checkout authority missing: the checkout feature BRD, revised checkout SDD, applicable project SAD flag mechanism, domain/capability references, and any required checkout UX. Supply and verify these before finalizing this Epic.

## Scope
- Illustrative sequence: deliver a gated checkout slice and later remove its temporary gate, subject to checkout source decisions.

## Out of Scope
- Production deployment and rollout-audience decisions.

## User Stories and Sequence
1. [SAMPLE-S02 — Gated checkout](./flagged-story.md) — establishes working off/on behavior.
2. [SAMPLE-S03 — Remove checkout flag](./flag-removal-story.md) — final; depends on SAMPLE-S02.

## Feature Flags
- `checkout_enabled`: coarse checkout capability flag; used by SAMPLE-S02 and removed by SAMPLE-S03.

## Acceptance Criteria
- Illustrative authoring check: a source-defined checkout behavior must be preserved when off and work when on (authoring rule `REQ-07`; checkout contract missing).
- Illustrative completion check: the Epic cannot be done until SAMPLE-S03 removes all introduced flag code references (authoring rule `REQ-08`).

## Dependencies / Risks
- Completion condition, if checkout sources authorize this Epic: both Stories are done and scoped executable code/configuration contains no `checkout_enabled` references. No production-deployment check.
- Blocker: checkout source authority and feature-specific off/on behavior are unresolved; do not mark this Epic ready or done.
