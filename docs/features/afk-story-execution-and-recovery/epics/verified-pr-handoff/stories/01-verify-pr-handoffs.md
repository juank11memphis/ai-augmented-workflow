# Verify and Report Story and Epic PR Handoffs

**Story ID:** AFK-PR-01

## Epic
[Verified PR Handoff](../epic_brief.md)

**Status:** in-progress

## User Story
As an engineer reviewing an AFK Epic, I want Story merges gated by verified host facts and PR summaries that disclose recovery and checks, so that integration is safe and the final Epic review is informed.

## Context and Source Traceability
- BRD: `../../../brd.md` — REQ-07–REQ-08, AC-04–AC-05, RULE-05–RULE-06.
- SDD: `../../../sdd.md` — Ownership and boundaries; Story and Epic PR handoff; Quality strategy and planned verification.
- Domain and capability: `docs/business-domain-model.md` — Story Pull Request and Epic Pull Request; `docs/capabilities-map.md` — Verify Story PR handoff facts, Stop unsafe integration, Present a consolidated Epic PR.
- UX: not applicable.

## In Scope
- Verify exact Story plan identity, Task commits and evidence, Story checks, PR head/base, local Git safety, required host checks, and merge policy before squash-only Story integration.
- Prefer configured GitHub MCP for host facts and effects; disclose any missing capability and use only necessary read-only host verification. Block merge for missing, pending, failed, stale, or ambiguous required facts; read back actual PR and Epic-head state after a possible effect before retry or continuation.
- At Epic PR handoff, reconcile merged Story PRs against the observed Epic head, run or observe named Epic-level check, report known required-check and merge-policy status or verification gap, and leave Epic PR for human review.
- Carry compact failures, attribution, reviewed repairs, actual checks, residual limits, and stops into Story/Epic summaries. Remove stale separate behavioral-QA gates and PR fields without removing planned Task/Story checks.

## Out of Scope
- Automatic Epic merge, changes to external branch policy, raw private-log publication, separate QA or eval execution, and production deployment.

## Acceptance Criteria
- **AC-01 — Verified Story integration:** A Story PR is squash-merged only after exact head/base, local safety, reviewed plan, Task and `Done when` evidence, Story validation, and required host checks and merge policy are established (REQ-07). Verification: test.
- **AC-02 — Honest host-fact fallback:** MCP is preferred when capable; a disclosed capability gap permits only necessary read-only host verification, and unavailable, pending, failed, stale, or ambiguous required facts block merge (REQ-07). Verification: test.
- **AC-03 — Ambiguous effect readback:** A possible PR effect is followed by actual PR and Epic-head readback before any retry or next Story, with no guessed merge outcome (REQ-07). Verification: test.
- **AC-04 — Human Epic handoff:** The Epic PR reconciles merged Story PRs, names the Epic-level check outcome and known host check/merge-policy status or gap, and remains unmerged for human review (REQ-07, REQ-08). Verification: test.
- **AC-05 — Truthful summaries and gates:** Story/Epic PR summaries record noteworthy failure attribution, reviewed repairs, actual checks and unresolved stops without raw private logs; obsolete separate-QA gates and fields are absent while planned checks remain (REQ-08). Verification: test.

## Verification Expectations
- Deterministic contract cases cover MCP facts available, capability gap with narrow read-only fallback, unavailable required fact, and ambiguous possible merge effect. Static assertions and source review confirm summary content, removed stale QA gates, no automatic Epic merge, and retention of planned checks. No real GitHub PR/merge or live-agent behavior is claimed by unit tests.

## Validation
- Focused deterministic handoff guidance checks; `pnpm verify` and `pnpm run validate:packed-runtime` after template changes stabilize; manifest and sync-note review, with disposable init/doctor/sync lifecycle validation when practical.

## Domain Context
Primary bounded context: AI-Augmented Development Pipeline. Story Pull Request integrates into the Epic Branch; Epic Pull Request is the final human review surface. Local Git and external source-control host provide distinct authoritative facts.

## Technical Context
Prompt-owned main-agent executor guidance and distributed templates. Preserve existing PR and progress artifacts; the SDD's handoff section governs MCP preference, narrow host fallback, and effect readback.

## UX References
not applicable.

## Non-Functional Criteria
Report host and check evidence accurately without raw private logs or false pass claims; do not add routine host-approval prompts when MCP supplies the facts.

## Deployability and Feature Flag
**Behind flag:** no.
The entire Story PR gate and final Epic handoff remain a working increment without recovery guidance: if no repair occurred, summaries report only actual checks; missing facts stop integration safely.

## Dependencies
Depends on none; blocks none. Can be planned independently of AFK-REC-01 and AFK-REC-02.

## Open Questions and Assumptions
none.
