# Review Verification Direction During SDD Discovery

**Story ID:** UCVP-01

## Epic

[Engineer-Directed Verification Handoff](../epic_brief.md)

**Status:** in-progress

## User Story

As an engineer directing a feature, I want to see and correct its proposed verification approach before the SDD is written, so that my chosen quality direction is clear without a formal sign-off ceremony.

## Context and Source Traceability

- BRD: `docs/features/user-controlled-verification-planning/brd.md`, Scope and Exclusions, REQ-01–REQ-03 and REQ-06, AC-01–AC-02.
- SDD: `docs/features/user-controlled-verification-planning/sdd.md`, Workflow design and ownership, Verification approach contract, Main interaction and exception flow, and Quality strategy for this feature.
- Domain and capability: `docs/business-domain-model.md` (AI-Augmented Development Pipeline, User Control); `docs/capabilities-map.md` (ground feature designs, keep progression user-directed, Skill Guidance handoffs).
- UX: not applicable to this Story; its guidance must account for a future feature's required UX mockups when that feature changes UI.

## In Scope

- Make the SDD writer propose methods, coverage, evidence, human decisions, and meaningful exclusions/constraints in plain language before writing.
- Allow corrections and confirm the revised direction separately from the existing generic final check-in.
- Make the resulting SDD quality strategy easy to find and specific to the feature, including the UX-derived visual-fidelity branch when UI changes.
- Update applicable managed template metadata and focused deterministic contract/lifecycle checks.

## Out of Scope

- Downstream Story-plan or execution behavior (UCVP-02), new approval metadata, live-model tests, and visual-regression tooling.

## Acceptance Criteria

- **AC-01 — Concrete pre-writing proposal:** SDD writer guidance requires a proposed approach covering what, method, scenarios/surfaces, expected evidence, human-owned judgments, and meaningful exclusions before SDD writing, not merely a buried SDD section (`docs/features/user-controlled-verification-planning/brd.md` REQ-01, REQ-02). Verification: test.
- **AC-02 — Correction and distinct check-in:** Guidance lets the engineer correct the proposal, confirms the changed direction, and retains the separate final discovery check-in without using it as the proposal (`docs/features/user-controlled-verification-planning/brd.md` REQ-01, REQ-06). Verification: test.
- **AC-03 — UI visual judgment:** For UI-changing features, guidance names UX-derived screens, states, and breakpoints and separates human visual-fidelity review from functional and automated accessibility checks; non-UI features need no visual boilerplate (`docs/features/user-controlled-verification-planning/brd.md` REQ-03). Verification: test.
- **AC-04 — No formal sign-off:** The SDD records the settled approach as a quality strategy without an approval status, signature, or new routine gate (`docs/features/user-controlled-verification-planning/brd.md` REQ-01, REQ-06). Verification: needs human/LLM-judge review.

## Verification Expectations

- Deterministic prompt-contract assertions cover order, required proposal elements, corrections, the distinct check-in, and UI/non-UI branches; they check text contracts, not actual model compliance.
- Manual semantic review of the changed guidance checks that a real engineer could understand and correct the proposal without a universal method checklist or formal sign-off.
- Template and sync lifecycle evidence confirms the guidance is distributable and customized installed files remain protected.

## Validation

- Focused repository test(s) for the SDD writer template contract and relevant template/sync lifecycle behavior, selected from existing test definitions during implementation.
- `pnpm verify` after changes stabilize; `pnpm run validate:packed-runtime` if the changed template affects installed-package behavior.
- Review the final diff and manifest/update notes against the Sibu template-change contract.

## Domain Context

Primary context: AI-Augmented Development Pipeline, supported by Skill Guidance. Artifact and User Control concepts apply; no new aggregate or event is introduced.

## Technical Context

Prompt/template-owned `software-design-writer` guidance inside the SDD's Workflow design and ownership boundary. No Command, Handler, Port, CLI entrypoint, or runtime state change.

## UX References

not applicable; no UI is changed by this Story.

## Non-Functional Criteria

Keep the proposal concise and feature-specific; do not require a universal checklist or claim that automated checks prove subjective visual quality.

## Deployability and Feature Flag

**Behind flag:** no.
The SDD discovery improvement works on its own. Existing downstream guidance still reads the SDD quality strategy until UCVP-02 strengthens the handoff; this Story does not weaken existing checks or require an unmerged sibling to operate.

## Dependencies

Depends on: none. Blocks: UCVP-02.

## Open Questions and Assumptions

Open questions: none. Accepted assumption: existing Sibu template/lifecycle conventions provide the distribution path; no new runtime module is needed.
