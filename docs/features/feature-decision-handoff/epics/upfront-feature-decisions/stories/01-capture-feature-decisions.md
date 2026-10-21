# Capture Scoped Feature Decisions During SDD Discovery

**Story ID:** FDH-01

## Epic
[Upfront Feature Decisions](../epic_brief.md)

**Status:** ready-for-planning

## User Story
As an engineer defining a planned feature, I want applicable human decisions raised and recorded during SDD discovery, so that implementation starts with the choices I have already made.

## Context and Source Traceability
- BRD: `../../../brd.md` — REQ-01–REQ-04; AC-01–AC-02; RULE-01–RULE-02.
- SDD: `../../../sdd.md` — Ownership and boundaries; Feature Decision record and reuse contract; Main flow and failure paths; Quality strategy and planned verification.
- Domain and capability: `docs/business-domain-model.md` — Feature Decision and AI-Augmented Development Pipeline; `docs/capabilities-map.md` — Discover feature decision gates during SDD authoring and Record scoped feature approvals.
- UX: not applicable.

## In Scope
- Guide SDD authoring to inspect the planned feature and applicable downstream skill gates, asking only relevant feature-specific human questions within its existing interview.
- Record each explicit, scoped human approval in an easy-to-find SDD Feature Decisions section; distinguish it from blanket SDD sign-off and from unanswered or inferred choices.
- Pause SDD finalization for any known required unanswered decision, including eval target or coverage decisions when eval authoring is part of the feature; explicitly note when no feature-specific gates apply.

## Out of Scope
- Downstream approval reuse, new runtime state or CLI operations, independent eval artifact generation, and operational permissions.

## Acceptance Criteria
- **AC-01 — Applicable gates only:** SDD discovery identifies known relevant downstream feature-decision gates and does not ask eval-coverage questions for a feature without eval work (REQ-01, REQ-02). Verification: test.
- **AC-02 — Explicit scoped record:** Each applicable approved decision records a stable local ID, governing gate, approved choice, scope, and human confirmation; a generic SDD approval is not substituted (REQ-03). Verification: test.
- **AC-03 — Unanswered decision stops:** A required missing or unresolved human answer prevents SDD finalization and yields the specific question needed (REQ-04). Verification: test.
- **AC-04 — Eval example is complete:** When planned eval authoring applies, SDD discovery obtains confirmed Evaluation Targets and approval of coverage, grading/tool choices, and known gaps before recording them (REQ-01, REQ-03, REQ-04). Verification: test.

## Verification Expectations
- Deterministic skill-contract assertions and synthetic feature examples cover applicable versus inapplicable gates, explicit versus inferred approval, and unresolved-input stops. Check that eval target confirmation alone is not treated as coverage approval. Passing static checks verify the written contract, not live-agent conduct; no live eval or separate human-judgment check is planned.

## Validation
- Focused deterministic guidance checks; after template edits stabilize, `pnpm verify` and `pnpm run validate:packed-runtime`; review manifest version and sync notes with disposable-project lifecycle coverage.

## Domain Context
Primary bounded context: AI-Augmented Development Pipeline. Feature Decision approval is scoped to one known gate and remains separate from SDD-wide sign-off and operational authority. Skill Guidance supplies applicable gate criteria; the SDD is the project-owned record.

## Technical Context
Prompt-owned SDD authoring guidance and versioned Template Catalog assets, following the SDD decision-record contract. No Command/Handler/Port layer or new deep module is needed.

## UX References
not applicable.

## Non-Functional Criteria
Questions are conditional and concise; approval records are self-contained and reviewable. No numeric threshold is specified.

## Deployability and Feature Flag
**Behind flag:** no.
This increment makes SDD discovery safer and its decisions inspectable even before downstream reuse is added. Existing downstream approval questions remain intact, so merging this Story alone does not bypass a gate.

## Dependencies
Depends on none; blocks FDH-02.

## Open Questions and Assumptions
none.
