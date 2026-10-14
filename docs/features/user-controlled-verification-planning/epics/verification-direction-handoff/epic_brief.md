# Engineer-Directed Verification Handoff Epic Brief

**Epic ID:** UCVP-E01

## Summary

Make feature verification direction visible and engineer-owned during SDD discovery, then carry it into unattended Story planning and checked execution without a new routine human approval gate.

## Source Context

- BRD: `docs/features/user-controlled-verification-planning/brd.md`, Scope and Exclusions, REQ-01–REQ-06, and Business Acceptance Criteria.
- Technical design: `docs/features/user-controlled-verification-planning/sdd.md`, Workflow design and ownership, Verification approach contract, Main interaction and exception flow, Change classification and failure behavior, and Quality strategy for this feature.
- Domain and capabilities: `docs/business-domain-model.md` (AI-Augmented Development Pipeline and User Control); `docs/capabilities-map.md` (AI-Augmented Development Pipeline: carry reviewed context, checked Tasks, material-decision stops, unattended progression; Skill Guidance: focused skills and handoffs).
- UX: not applicable; this feature changes workflow guidance, not a UI.

## Scope

- Present and settle a concrete verification approach before SDD writing, including the UX-derived visual-review branch for future UI-changing features.
- Preserve the settled SDD direction in Story expectations, implementation plans, independent plan review, and checked execution; distinguish routine refinement from material departures.
- Update Sibu source templates, manifest/update notes, and relevant deterministic tests and lifecycle evidence without adding an approval record or runtime module.

## Out of Scope

- New test or visual-regression tooling, live-model evals, a guarantee of LLM compliance, routine engineer review of Story/Task plans, and changes to production deployment.

## User Stories and Sequence

1. [UCVP-01 — Review verification direction during SDD discovery](./stories/01-review-verification-direction-during-sdd-discovery.md) — gives the engineer the front-loaded choice; no Story dependency.
2. [UCVP-02 — Preserve verification direction through delivery](./stories/02-preserve-verification-direction-through-delivery.md) — carries the SDD approach into planning and execution; depends on UCVP-01's authoring contract.

## Feature Flags

- none; each Story is a complete, backward-compatible guidance increment with no new runtime path requiring gated exposure.

## Acceptance Criteria

- The SDD writer guidance provides a concrete pre-writing verification proposal and records the settled direction without a formal approval status; UI guidance distinguishes visual judgment from functional and automated accessibility checks (`docs/features/user-controlled-verification-planning/brd.md` REQ-01–REQ-03).
- Story and implementation guidance preserve that direction, allow routine check selection without asking again, and stop for an engineer-directed SDD revision on a material departure (`docs/features/user-controlled-verification-planning/brd.md` REQ-04–REQ-06).
- Changed templates and sync metadata pass focused lifecycle checks. The named Epic-level aggregate check is `pnpm verify`; packed-runtime validation is additionally required if changed templates affect installed-package behavior. Evidence states that deterministic checks cannot prove future LLM behavior.

## Dependencies / Risks

- UCVP-02 relies on the SDD verification contract established by UCVP-01; each Story remains independently mergeable.
- Prompt wording may be interpreted inconsistently. Static contracts, lifecycle checks, and human semantic review provide limited evidence, not a behavioral guarantee.
- An overly broad material-change rule could reduce AFK progression; Story evidence must distinguish routine equivalent checks from genuine strategy changes.
