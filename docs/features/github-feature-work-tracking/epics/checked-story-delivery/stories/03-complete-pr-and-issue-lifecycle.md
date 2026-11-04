# Complete PR and Issue Lifecycle

**Story ID:** GFW-S05

## Epic

[Checked Story Delivery](../epic_brief.md)

**Status:** ready-for-planning

## User Story

As an Epic reviewer, I want verified Story work consolidated in one human-reviewed Epic PR and completed issues closed at the right time, so that GitHub reflects what actually merged.

## Context and Source Traceability

- BRD: `../../../brd.md`, REQ-08, REQ-10, AC-05, AC-07.
- SDD: `../../../sdd.md`, Complete Stories, Epics, and Feature, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence.
- Domain and capability: `docs/business-domain-model.md`, Story Pull Request, Epic Pull Request, and Feature-Work Tracking and Cross-Machine Handoff; `docs/capabilities-map.md`, **Integrate verified Stories sequentially**, **Close completed GitHub issues**, and **Present a consolidated Epic PR**.
- UX: `../../../ux.md`, Resume and hand off Story work; binding verified-completion mockup and Interaction States and Feedback.

## In Scope

- After required Story checks and evidence, verify PR identity, head/base, host checks, merge policy, and safe state; make the draft PR ready and squash-merge it into the current Epic branch without routine human Story review.
- Close the Story issue only after its PR merge is verified; start the next Story from the updated Epic head.
- Present one Epic PR linking all merged Story PRs and actual checks for final human review; do not merge it automatically.
- Close the Epic issue after its human-reviewed PR merge is verified and the Feature issue after every Epic PR merge is verified; read back ambiguous effects.

## Out of Scope

- Native PR-to-issue linking, GitHub Projects, production deployment, separate behavioral QA, and automatic human Epic acceptance.

## Acceptance Criteria

- **AC-01 — Verified Story integration:** A Story issue closes only after its checked draft PR is made ready and verified squash-merged into the observed Epic branch; the next Story uses that updated head (BRD REQ-08, REQ-10). Verification: test.
- **AC-02 — Human Epic review:** The Epic PR links every merged Story PR and reports actual checks and limits; it stays open for human review and is not merged automatically (BRD REQ-08, REQ-10). Verification: test.
- **AC-03 — Verified issue closure:** The Epic issue closes only after its human-reviewed PR merge is verified, and the Feature issue closes only after all Epic PR merges are verified; no native PR-to-issue link is required (BRD REQ-08). Verification: test.
- **AC-04 — Ambiguous effect stop:** Uncertain merge or closure effects are read back before retrying or announcing completion (BRD REQ-08, REQ-10). Verification: test.
- **AC-05 — Completion message:** Compact completion output shows the verified Epic PR and the Feature's actual open or complete state, matching the binding UX mockup (BRD REQ-08). Verification: visual comparison.

## Verification Expectations

- Deterministic fake-host scenarios cover draft-to-ready Story PR, required check and merge-policy facts, verified squash merge before Story closure, human Epic merge before Epic closure, all Epic merges before Feature closure, ambiguous effects, and no native-link dependency.
- Output assertions and final-Epic-review visual comparison cover verified-completion status. Static guidance checks cannot prove live GitHub or agent behavior.
- Planned Task and Story checks remain required. No separate behavioral QA, disposable-repository integration, or live-model eval is required.

## Validation

- Focused deterministic guidance/fake-host tests, then `pnpm verify` after changes stabilize.
- Applicable Sibu template-manifest and sync lifecycle checks with fakes.

## Domain Context

Primary bounded context: AI-Augmented Development Pipeline. Story and Epic PR merge events govern issue closure; the Feature closes only after its Epics are verified merged.

## Technical Context

Prompt-owned integration guidance follows the SDD's PR and issue lifecycle contracts. PR and issue mutations occur through existing external GitHub/Git host access, not a new CLI module.

## UX References

`../../../ux.md`, Resume and hand off Story work, binding verified-completion mockup, and Interaction States and Feedback.

## Non-Functional Criteria

Do not infer merge permission from local checks, claim an ambiguous merge as success, fabricate human approval, or close an issue merely because a PR is ready (BRD REQ-08, REQ-10).

## Deployability and Feature Flag

**Behind flag:** no. This completes the PR and issue lifecycle on top of the published Story checkpoints; each closure action remains guarded by its independently observed merge condition.

## Dependencies

Depends on: GFW-S03 and GFW-S04. Blocks: none.

## Open Questions and Assumptions

none
