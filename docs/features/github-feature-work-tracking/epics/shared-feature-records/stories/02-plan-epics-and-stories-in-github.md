# Plan Epics and Stories in GitHub

**Story ID:** GFW-S02

## Epic

[Shared Feature Records](../epic_brief.md)

**Status:** in-progress

## User Story

As an engineer, I want Epics and Stories organized under the Feature issue with their plans in GitHub, so that collaborators can find the next planned work from one shared hierarchy.

## Context and Source Traceability

- BRD: `../../../brd.md`, Scope, REQ-02, REQ-09, AC-02, AC-06.
- SDD: `../../../sdd.md`, Start and publish a feature stage, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence.
- Domain and capability: `docs/business-domain-model.md`, GitHub Issue Hierarchy, Story Implementation Plan, and Feature-Work Tracking and Cross-Machine Handoff; `docs/capabilities-map.md`, **Organize GitHub feature work**, **Place feature artifacts in GitHub**, and **Read GitHub artifacts selectively**.
- UX: `../../../ux.md`, Publish feature documents, Resume and hand off Story work, and the Feature-created and publication-unconfirmed mockups.

## In Scope

- Create Epic issues as native Feature sub-issues and Story issues as native Epic sub-issues; keep definitions and acceptance criteria in the corresponding issues.
- Keep compact ordered Task status inside each Story issue and its exact implementation plan plus concise progress in Story issue artifacts.
- Selectively read required published Feature/Epic/Story context through MCP; identify intended issue/artifact before writes and read back ambiguous effects.
- Avoid duplicate local Epic, Story, plan, or progress files and stop if required GitHub hierarchy/artifact access disappears.

## Out of Scope

- Executing Tasks, publishing Task commits, draft PRs, cross-machine reconciliation, and issue closure.

## Acceptance Criteria

- **AC-01 — Native hierarchy:** A Feature issue contains native Epic sub-issues, and each Epic contains its Story sub-issues with their settled definitions and acceptance criteria (BRD REQ-02). Verification: test.
- **AC-02 — Story planning record:** Each planned Story exposes compact Task status in its issue and the exact plan and concise progress as issue artifacts, without duplicate local planning files (BRD REQ-02). Verification: test.
- **AC-03 — Selective and safe access:** Planning reads only required published context into session, stops on missing access or conflicting content, and reads back ambiguous issue/artifact writes before retrying (BRD REQ-09). Verification: test.
- **AC-04 — Navigable handoff:** After successful creation, the engineer sees the relevant Feature, Epic, or Story link; an unconfirmed write does not appear as completed (BRD REQ-02, REQ-09). Verification: visual comparison.

## Verification Expectations

- Deterministic fake-MCP scenarios cover native-parent relationships, issue/artifact identities, selective reads, no on-disk duplicates, missing capability, stale content, and uncertain-write readback.
- Output assertions and a final-Epic-review visual comparison cover compact link hierarchy and publication-blocker wording from the binding UX. Static guidance checks cannot establish live model or GitHub behavior.
- No disposable-repository integration, live-model eval, or separate manual QA gate is required.

## Validation

- Focused deterministic guidance and fake-MCP contract tests, then `pnpm verify` after changes stabilize.
- Applicable Sibu template-manifest and sync lifecycle checks with fakes.

## Domain Context

Primary bounded context: AI-Augmented Development Pipeline. Feature, Epic, and Story issues form the GitHub Issue Hierarchy; a Story Implementation Plan is reviewed from its exact published artifact content.

## Technical Context

Prompt-owned planning skills use the SDD's issue hierarchy and exact-plan review contracts. GitHub MCP is the external access boundary; no new CLI runtime module or local feature-file cache.

## UX References

`../../../ux.md`, Publish feature documents, Resume and hand off Story work, binding Feature-created and publication-unconfirmed mockups.

## Non-Functional Criteria

Ambiguous external effects do not create duplicate issues or falsely report completion; artifact reads remain selective and no feature-artifact cache is written (BRD REQ-09).

## Deployability and Feature Flag

**Behind flag:** no. The hierarchy and planning flow is complete when merged; execution that has not yet gained checked-Task publication must stop at its own unsupported checkpoint rather than silently revert to local progress.

## Dependencies

Depends on: GFW-S01. Blocks: GFW-S03.

## Open Questions and Assumptions

none
