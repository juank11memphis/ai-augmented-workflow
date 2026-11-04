# Checked Story Delivery Epic Brief

**Epic ID:** GFW-E02

## Summary

Make each checked Task a trustworthy remote checkpoint, allow another engineer to resume from GitHub without overwriting local work, and carry verified Story outcomes through a human-reviewed Epic PR and issue closure.

## Source Context

- BRD: `../../brd.md`, Scope, REQ-04–REQ-08, REQ-10, AC-03–AC-05, AC-07.
- Technical design: `../../sdd.md`, Publish a checked Task handoff, Complete Stories, Epics, and Feature, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence.
- Domain and capabilities: `docs/business-domain-model.md`, Task Handoff Published, Task Superseded, Story/Epic PR lifecycle; `docs/capabilities-map.md`, **Publish checked-Task handoffs**, **Resume work across machines**, **Reconcile superseded local work safely**, **Integrate verified Stories sequentially**, and **Close completed GitHub issues**.
- UX: `../../ux.md`, Resume and hand off Story work and binding checkpoint, supersession, conflict, completion, medium, and wide terminal mockups.

## Scope

- Push checked Task commits and matching Story progress, opening a draft Story PR after the first checked Task.
- Resume from current remote issue, PR, and branch facts; safely reconcile a Task completed by another engineer.
- Verify Story and Epic PR integration before closing the corresponding issues; close the Feature issue after all Epic merges. Preserve final human Epic review.

## Out of Scope

- Feature-document authoring, Epic/Story hierarchy creation, in-progress Task claims, uncommitted-edit handoff, native PR-to-issue linking, GitHub Projects, separate behavioral QA, and disposable-repository integration checks.

## User Stories and Sequence

1. [GFW-S03 Publish checked Task checkpoints](./stories/01-publish-checked-task-checkpoints.md) — remote Task handoff and early draft PR; depends on GFW-S02.
2. [GFW-S04 Resume safely across engineers](./stories/02-resume-safely-across-engineers.md) — current-state selection and superseded-edit reconciliation; depends on GFW-S03.
3. [GFW-S05 Complete PR and issue lifecycle](./stories/03-complete-pr-and-issue-lifecycle.md) — verified integration, final human Epic PR, and issue closure; depends on GFW-S03 and GFW-S04.

## Feature Flags

- none

## Acceptance Criteria

- A checked Task is a handoff only after its commit is pushed and matching Story status and progress are confirmed; the first checked Task opens a confirmed draft Story PR (BRD REQ-04, REQ-05, REQ-08).
- A returning engineer uses current remote facts, does not repeat a completed Task, and protects unrelated or ambiguous local edits (BRD REQ-06, REQ-07).
- Story, Epic, and Feature issues close only after their respective verified merge conditions; the Epic PR remains human-reviewed and links merged Story PRs (BRD REQ-08, REQ-10).

## Dependencies / Risks

- Requires GFW-E01's authoritative Story issue, plan, and progress artifacts.
- Git push and issue updates are not atomic; ambiguous partial effects require readback and may stop progression. Deterministic tests cannot demonstrate live cross-machine success, as recorded in the SDD.
