# Resume Safely Across Engineers

**Story ID:** GFW-S04

## Epic

[Checked Story Delivery](../epic_brief.md)

**Status:** in-progress

## User Story

As a returning engineer, I want the agent to compare GitHub and my local work before continuing, so that I do not redo a completed Task or lose unrelated edits.

## Context and Source Traceability

- BRD: `../../../brd.md`, REQ-05–REQ-07, AC-03, AC-04.
- SDD: `../../../sdd.md`, Publish a checked Task handoff, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence.
- Domain and capability: `docs/business-domain-model.md`, Task Superseded, Task Handoff Published, and Story Branch; `docs/capabilities-map.md`, **Resume work across machines** and **Reconcile superseded local work safely**.
- UX: `../../../ux.md`, Resume and hand off Story work; binding Task-already-completed, local-work-needs-review, GitHub-progress-conflict, medium, and wide mockups.

## In Scope

- Before choosing or publishing a Task, compare authoritative Story status/progress, current remote branch, and draft PR when present.
- Let a second engineer restart an incomplete Task from the last verified pushed checkpoint without an owner or in-progress claim.
- Detect a Task completed elsewhere, discard only local edits confidently attributable to that superseded Task, reconcile the branch, and choose the actual next Task, Story, or Epic review step.
- Stop on conflicting issue/Git facts, concurrent push rejection, ambiguous edit ownership, or unsafe worktree; preserve unrelated edits.

## Out of Scope

- In-progress claims or locks, transfer of uncommitted Task edits, force push, broad reset, automatic stash, and PR/issue closure.

## Acceptance Criteria

- **AC-01 — Current remote choice:** The agent checks current Story, PR, and branch facts before choosing or publishing work; a complete Task is not offered again, while an incomplete Task may be restarted from the last verified checkpoint (BRD REQ-06). Verification: review the shipped guidance and actual remote readback before resuming work; do not infer a current Task from stale local status.
- **AC-02 — Safe supersession:** When another engineer completed the active Task, only clearly attributable local Task edits are discarded; unrelated or ambiguous edits are preserved and uncertain ownership pauses work (BRD REQ-07). Verification: inspect the attribution and preservation rules in shipped guidance and the actual worktree before any discard.
- **AC-03 — Conflict stop:** Conflicting issue and branch progress, concurrent remote advance, or unsafe local state stops rather than selecting a possibly wrong Task or overwriting work (BRD REQ-06, REQ-07). Verification: inspect the stop and readback rules in shipped guidance and actual conflicting facts when encountered.
- **AC-04 — Honest explanation:** Compact, medium, and wide messages state the observed checkpoint, actual next step, what was or was not discarded, and the specific review needed when blocked (BRD REQ-06, REQ-07). Verification: visual comparison.

## Verification Expectations

- Review the shipped prompt guidance against fresh-machine next-Task selection, incomplete Task restart, superseded attributable edits, protected unrelated/ambiguous edits, issue/branch mismatch, stale plan fingerprint, and concurrent push rejection. Test-local fake hosts do not prove agent behavior.
- Compare the binding superseded, protected-edits, conflict, medium, and wide guidance with the UX mockups at the existing Story and final Epic PR gates. Do not substitute Markdown wording assertions or a test-local output renderer for agent behavior or visual fidelity.
- No live two-engineer rehearsal, disposable-repository integration, live-model eval, or separate QA gate is required; the SDD's live-handoff evidence gap remains explicit.

## Validation

- `pnpm verify` after changes stabilize, plus applicable deterministic template-manifest/sync lifecycle and packed-runtime checks for changed distributed guidance.

## Domain Context

Primary bounded context: AI-Augmented Development Pipeline. A Task Superseded outcome is determined from remote Story and branch facts; local edits have separate safety ownership.

## Technical Context

Prompt-owned resumption guidance follows the SDD's current-state and reconciliation rules; Git and GitHub MCP remain external boundaries. No CLI delivery engine or in-progress ownership state is added.

## UX References

`../../../ux.md`, Resume and hand off Story work; binding Task-already-completed, local-work-needs-review, GitHub-progress-conflict, medium resume, and wide resume mockups.

## Non-Functional Criteria

Never discard unrelated or ambiguous edits, force-push, broadly reset, or claim reconciliation from conflicting evidence (BRD REQ-07).

## Deployability and Feature Flag

**Behind flag:** no. This adds a complete safe-resumption path to published Task checkpoints; a case that cannot be reconciled stops with the user's local work intact.

## Dependencies

Depends on: GFW-S03. Blocks: GFW-S05.

## Open Questions and Assumptions

none
