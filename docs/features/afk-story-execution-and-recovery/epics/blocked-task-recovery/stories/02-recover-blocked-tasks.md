# Recover Attributable Blocked Tasks

**Story ID:** AFK-REC-02

## Epic
[Blocked Task Recovery](../epic_brief.md)

**Status:** in-progress

## User Story
As an engineer running a Story AFK, I want bounded, clearly attributable failures repaired through reviewed checked work, so that the Story can resume without losing Task edits or bypassing evidence.

## Context and Source Traceability
- BRD: `../../../brd.md` — REQ-03–REQ-06, AC-02–AC-03, RULE-02–RULE-04.
- SDD: `../../../sdd.md` — Ownership and boundaries; Blocked-check diagnosis and recovery flow, steps 3–5 and sequence diagram; Quality strategy and planned verification.
- Domain and capability: `docs/business-domain-model.md` — Blocked Task Recovery, Same-Task Continuation, Follow-up Checked Task; `docs/capabilities-map.md` — Recover blocked Tasks safely and Revalidate recovery outcomes.
- UX: not applicable.

## In Scope
- Source-aligned prerequisite repair for a clear bounded pre-existing failure on the active Story branch; same-Task continuation for repair paths overlapping blocked edits, including a pre-existing bug.
- Separate ordered checked repair for a clear path-disjoint earlier same-Story regression or safe path-disjoint prerequisite, followed by resumption of the blocked Task.
- Smallest plan revision, new exact-plan identity, fresh independent plan-only review, safe branch/index/worktree and preserved-edit checks before dispatch, and explicit stops for missing evidence, material decisions, unsafe state, or non-convergence.
- Revalidation of stale checks plus the original blocked Task goal, prescribed checks, every `Done when` item, and single eventual scoped commit where paths overlap.

## Out of Scope
- Open-ended retries, speculative source changes for host/test-runner failures, PR effects, behavioral QA, and weakened checks.

## Acceptance Criteria
- **AC-01 — Reviewed bounded route:** A clearly attributable, source-aligned pre-existing failure can receive a checked prerequisite repair only after a changed plan receives fresh independent review of its exact identity (REQ-03, REQ-06). Verification: test.
- **AC-02 — Overlap retains Task authority:** A bounded repair overlapping blocked uncommitted paths continues under the same Task ID and original goal, preserves those edits, and produces only that Task's eventual scoped commit, including when the bug predates the Story (REQ-04). Verification: test.
- **AC-03 — Disjoint repair precedes resumption:** A clear path-disjoint regression from an earlier committed Task uses a freshly reviewed follow-up checked Task whose commit excludes blocked edits, then resumes the blocked Task; a safe disjoint pre-existing prerequisite may follow the same pattern (REQ-03, REQ-04). Verification: test.
- **AC-04 — Current evidence before advance:** The original goal, prescribed check, every planned `Done when` item, and all checks made stale by the repair have current passing evidence before the blocked Task advances (REQ-05). Verification: test.
- **AC-05 — Unsafe recovery stops:** Ambiguous ownership or attribution, changed plan/head, unsafe Git state, material decision, failed required check, or non-converging attempts stop for a focused human decision rather than claiming success (REQ-06). Verification: test.

## Verification Expectations
- Deterministic fixture cases cover pre-existing overlap, earlier-Task path-disjoint regression, preserved edits and index, changed heads, stale checks, missing `Done when` evidence, and non-convergence. Static contract assertions and focused source review verify planner/reviewer/executor authority boundaries; they do not prove live-model compliance. No live-agent eval is in scope.

## Validation
- Focused deterministic recovery guidance checks; `pnpm verify` and `pnpm run validate:packed-runtime` after template changes stabilize; manifest and sync-note review, plus disposable lifecycle validation when practical.

## Domain Context
Primary bounded context: AI-Augmented Development Pipeline. The blocked Task, Story Implementation Plan, Task Check, and progress log are existing artifacts; planner, independent plan reviewer, checked-Task executor, and main agent retain their SDD-defined responsibilities.

## Technical Context
Prompt-owned executor, planner, and checked-Task guidance and their versioned templates; use existing reviewable Story plan and non-Markdown progress log, not a new runtime operation or ledger.

## UX References
not applicable.

## Non-Functional Criteria
Preserve blocked edits and single-commit authority for overlap; do not weaken planned checks or treat stale evidence as current.

## Deployability and Feature Flag
**Behind flag:** no.
The guidance allows only complete checked repairs after fresh review and safe-state checks; uncertainty keeps the existing human-stop path, so it can merge without the PR-handoff Story.

## Dependencies
Depends on AFK-REC-01; blocks none.

## Open Questions and Assumptions
none.
