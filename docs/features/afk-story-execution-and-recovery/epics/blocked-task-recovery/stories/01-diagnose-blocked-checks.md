# Diagnose Blocked Checks Against the Epic Baseline

**Story ID:** AFK-REC-01

## Epic
[Blocked Task Recovery](../epic_brief.md)

**Status:** ready-for-planning

## User Story
As an engineer running a Story AFK, I want failed checks inventoried and compared with the Epic baseline, so that a repair decision is grounded in the actual blocker rather than a truncated log or guess.

## Context and Source Traceability
- BRD: `../../../brd.md` — REQ-01, REQ-02, AC-01, RULE-01.
- SDD: `../../../sdd.md` — Ownership and boundaries; Blocked-check diagnosis and recovery flow, steps 1–2 and sequence diagram; Quality strategy and planned verification.
- Domain and capability: `docs/business-domain-model.md` — Failure Inventory and Blocked Task Recovery; `docs/capabilities-map.md` — Inventory blocked-check failures and Attribute failures against the Epic baseline.
- UX: not applicable.

## In Scope
- Guide the main agent to obtain a complete, compact failure inventory grouped by likely cause and linked to the affected Task, expected contract, owning paths, observed check/head, and evidence locator.
- Guide isolated focused comparison at the observed Epic/base head without disturbing blocked Task edits; classify active-Story regression, pre-existing failure, host/test-runner failure, or unresolved with supporting evidence.
- Stop diagnosis when the full failure set, stable heads, or safe isolation cannot be established; record the evidence gap rather than choose a repair.

## Out of Scope
- Dispatching recovery work, changing a Story plan, PR integration, and separate behavioral QA.

## Acceptance Criteria
- **AC-01 — Complete failure inventory:** Multiple aggregate failures are listed compactly by likely cause and each links to Task, contract, owning paths, observed check/head, and evidence locator (REQ-01). Verification: test.
- **AC-02 — No attribution from partial output:** A count or truncated output triggers focused read-only evidence retrieval; if the complete set remains unavailable, the record says so and attribution stops (REQ-01, REQ-02). Verification: test.
- **AC-03 — Isolated baseline classification:** Focused failures are compared with an observed Epic/base head away from the blocked Task's uncommitted edits, and the four possible classifications are distinguished with evidence and uncertainty (REQ-02). Verification: test.
- **AC-04 — Moving-head and isolation stop:** Changed heads, unsafe isolation, or missing attribution evidence prevent a repair claim and yield a focused human stop (REQ-02). Verification: test.

## Verification Expectations
- Static assertions and disposable deterministic fixture scenarios cover multiple failures, truncation, pre-existing versus active-Story failures, host/test-runner failure, and changed heads against the exact changed guidance. Source review confirms that isolation never relies on stashing, resetting, or overwriting blocked edits. These checks verify the written contract, not live-agent behavior.

## Validation
- Focused deterministic guidance checks for the diagnosis contract; `pnpm verify` and `pnpm run validate:packed-runtime` after template changes stabilize; review manifest version and sync notes, with disposable init/doctor/sync lifecycle validation when practical.

## Domain Context
Primary bounded context: AI-Augmented Development Pipeline. Failure Inventory records observations separately from attribution; the blocked Task retains its edits. External collaborators are local Git and the isolated Epic baseline.

## Technical Context
Prompt-owned main-agent executor guidance and versioned Template Catalog assets per the SDD ownership and diagnosis flow; no new runtime handler or recovery ledger.

## UX References
not applicable.

## Non-Functional Criteria
Inventory is complete but compact; evidence locators avoid raw private logs. No numeric threshold is specified.

## Deployability and Feature Flag
**Behind flag:** no.
This increment improves failure diagnosis and stops safely before unimplemented recovery routing; it does not need an unmerged sibling Story to leave the workflow valid.

## Dependencies
Depends on none; blocks AFK-REC-02.

## Open Questions and Assumptions
none.
