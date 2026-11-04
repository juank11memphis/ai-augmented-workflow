# Publish Checked Task Checkpoints

**Story ID:** GFW-S03

## Epic

[Checked Story Delivery](../epic_brief.md)

**Status:** ready-for-planning

## User Story

As an engineer, I want each checked Task pushed with matching Story progress and an early draft PR, so that another engineer can see a trustworthy handoff point.

## Context and Source Traceability

- BRD: `../../../brd.md`, REQ-04, REQ-05, REQ-08, AC-03, AC-05.
- SDD: `../../../sdd.md`, Publish a checked Task handoff, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence.
- Domain and capability: `docs/business-domain-model.md`, Task Handoff Published, Story Branch, Progress Log, and Story Pull Request; `docs/capabilities-map.md`, **Execute checked tasks on a Story branch** and **Publish checked-Task handoffs**.
- UX: `../../../ux.md`, Resume and hand off Story work, binding checked-Task handoff and medium/wide resume mockups.

## In Scope

- Keep existing prescribed Task checks and scoped commits; push each checked Task to its Story branch before marking remote handoff complete.
- Update the Story's compact Task status and progress artifact with matching check evidence, commit reference, and next-work context; read back ambiguous effects.
- Open one draft Story PR against the Epic branch after the first checked Task is pushed and keep subsequent Tasks on that branch/PR without routine continuation prompts.
- Report confirmed partial effects and stop when push, issue progress, or draft PR publication cannot be established.

## Out of Scope

- Remote Task selection by another engineer, superseded local edit cleanup, Story PR merge, Epic PR, and issue closure.

## Acceptance Criteria

- **AC-01 — Checked remote commit:** A Task is not published until its prescribed check passes and its scoped commit is confirmed on the remote Story branch (BRD REQ-05). Verification: test.
- **AC-02 — Matching Story progress:** The Story checklist and progress artifact identify the same completed Task and pushed commit, with check evidence and next-work context; a partial or ambiguous update is not called a handoff (BRD REQ-04, REQ-05). Verification: test.
- **AC-03 — Early draft PR:** After the first checked Task is pushed, the in-progress Story has one confirmed draft PR against its Epic branch; later Tasks update the same branch and PR without a routine continuation choice (BRD REQ-08). Verification: test.
- **AC-04 — Honest status:** Compact and wide success or partial-publication output identifies only confirmed effects and follows the UX checkpoint hierarchy (BRD REQ-04, REQ-05). Verification: visual comparison.

## Verification Expectations

- Deterministic fake-Git/MCP/host scenarios cover check-before-commit, matching pushed hash and Story status, failed or uncertain issue update, draft PR creation after the first Task, one-Task Story, and later Task reuse of the same PR.
- Output assertions and final-Epic-review visual comparison cover the compact handoff and wide routine-continuation mockups. Static guidance tests cannot prove live agent behavior.
- No live GitHub, disposable-repository integration, live-model eval, or separate human QA gate is required.

## Validation

- Focused deterministic guidance/fake-host tests, then `pnpm verify` after changes stabilize.
- Applicable Sibu template-manifest and sync lifecycle checks with fakes.

## Domain Context

Primary bounded context: AI-Augmented Development Pipeline. A Story Branch and Progress Log form a Task Handoff Published only when the checked commit and Story evidence match.

## Technical Context

Prompt-owned execution guidance follows the SDD's checked-Task publication sequence. Git and GitHub MCP/PR host access are external effects; the CLI does not become a delivery engine.

## UX References

`../../../ux.md`, Resume and hand off Story work; binding checked-Task handoff, medium resume, and wide resume mockups.

## Non-Functional Criteria

Ambiguous or partly confirmed remote effects stop progression; no blind retry, force push, or false handoff claim (BRD REQ-05).

## Deployability and Feature Flag

**Behind flag:** no. This is a complete checked-Task publication path; a Task with uncertain remote effects stops safely rather than appearing available for cross-machine continuation.

## Dependencies

Depends on: GFW-S02. Blocks: GFW-S04 and GFW-S05.

## Open Questions and Assumptions

none
