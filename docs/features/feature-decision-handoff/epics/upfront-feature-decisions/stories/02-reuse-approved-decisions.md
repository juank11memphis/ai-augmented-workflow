# Reuse Approved Decisions in Planned-Feature Work

**Story ID:** FDH-02

## Epic
[Upfront Feature Decisions](../epic_brief.md)

**Status:** in-progress

## User Story
As an engineer implementing a planned feature, I want downstream skills to honor the scoped choices I approved in the SDD, so that work continues without repeat approval requests while genuine changes still return to me.

## Context and Source Traceability
- BRD: `../../../brd.md` — REQ-05–REQ-07; AC-03–AC-05; RULE-03–RULE-04.
- SDD: `../../../sdd.md` — Ownership and boundaries; Feature Decision record and reuse contract; Main flow and failure paths; Quality strategy and planned verification.
- Domain and capability: `docs/business-domain-model.md` — Feature Decision, Eval Coverage Plan, and AI-Augmented Development Pipeline; `docs/capabilities-map.md` — Reuse approved feature decisions, Keep operational authority separate, and Require coverage review.
- UX: not applicable.

## In Scope
- Carry relevant Feature Decision IDs and authoritative SDD pointers through Story planning and fresh Task context without treating packet summaries as approval evidence.
- At a planned-feature downstream gate, verify the governing approved SDD choice and scope against the current work and proceed without re-asking when unchanged. Planned eval authoring may reuse both confirmed targets and approved coverage; independent eval authoring retains its own questions.
- Stop only affected work for missing, ambiguous, or materially changed approval, without invalidating unrelated decisions or weakening operational permissions and final Epic review.

## Out of Scope
- New approval persistence or cryptographic attestation; live-model evals; blanket SDD authorization; automatic permission for external writes, credentials, destructive actions, or Epic merge.

## Acceptance Criteria
- **AC-01 — Authoritative handoff:** Story planning and Task handoff identify applicable Feature Decisions by SDD source, and downstream guidance verifies the original record rather than trusting a packet summary (REQ-05). Verification: test.
- **AC-02 — No duplicate approval:** A relevant unchanged SDD-approved choice permits the corresponding planned-feature downstream work without asking the engineer to approve that same choice again, including eval targets and coverage when applicable (REQ-05). Verification: test.
- **AC-03 — Scoped reapproval:** A missing, ambiguous, or materially changed choice or scope stops affected work for explicit reapproval; unrelated decisions and unrelated SDD prose edits do not trigger repeat approval (REQ-06). Verification: test.
- **AC-04 — Independent eval boundary:** Eval authoring outside a planned feature still confirms targets and obtains coverage approval before writing artifacts (REQ-05, REQ-07). Verification: test.
- **AC-05 — Operational gates preserved:** SDD decisions cannot authorize access, model routes, external or destructive mutations, or final Epic acceptance, and a newly discovered material decision still stops safely (REQ-07). Verification: test.

## Verification Expectations
- Deterministic contract cases cover unchanged, missing, ambiguous, and changed SDD decisions; unrelated prose edits; planned versus independent eval authoring; and attempted operational overreach. Disposable template lifecycle checks confirm distribution and customized-file protection. These checks verify guidance and fixture behavior, not actual live-agent compliance; no live eval or separate human-judgment check is planned.

## Validation
- Focused deterministic guidance and disposable-project lifecycle checks; after template edits stabilize, `pnpm verify` and `pnpm run validate:packed-runtime`; review manifest version and sync notes.

## Domain Context
Primary bounded context: AI-Augmented Development Pipeline, collaborating with Skill Guidance and Template Catalog. Feature Decision reuse is scoped to its governing gate; Eval Coverage Plan approval is distinct from target confirmation and from operational permission.

## Technical Context
Prompt-owned planner, executor, and eval-authoring handoff guidance under the SDD record/reuse contract. No new runtime handler, approval ledger, or deep module is authorized.

## UX References
not applicable.

## Non-Functional Criteria
Stops name the affected decision without replaying unrelated approvals. No numeric threshold is specified.

## Deployability and Feature Flag
**Behind flag:** no.
This increment can merge after FDH-01 because the approved SDD record then exists as an authoritative source; when it does not match current work, existing hard-stop behavior remains safe.

## Dependencies
Depends on FDH-01; blocks none.

## Open Questions and Assumptions
none.
