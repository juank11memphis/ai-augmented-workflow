# Step: Establish the pre-writing verification contract

## Goal

Make the SDD writer present and settle a concrete, feature-specific verification approach before writing, then record it in the SDD without a new approval ceremony.

## Scope

- Task ID: UCVP-01-T01; Milestone ID: UCVP-01-M01 (engineer-directed SDD discovery); Status: checked; Depends on: none.
- Story acceptance criteria: UCVP-01 AC-01, AC-02, AC-03, AC-04; source decisions: `docs/features/user-controlled-verification-planning/brd.md` REQ-01, REQ-02, REQ-03, REQ-06 and AC-01/AC-02; `sdd.md` requires proposal, correction/confirmation, distinct final check-in, then settled quality strategy. On-demand pointers: `docs/features/user-controlled-verification-planning/sdd.md` §§ “Workflow design and ownership”, “Verification approach contract”, “Main interaction and exception flow” (sequence diagram), “Quality strategy for this feature”; `docs/architecture.md` § 6 prompt/template-owned capability boundary.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Owning area: Sibu-managed `software-design-writer` skill template and Template Catalog contract tests. Extend discovery guidance so it asks focused follow-ups for unresolved material choices, proposes what/method/scenarios or surfaces/evidence/human decisions/meaningful exclusions and constraints in plain language, accepts corrections, and restates a changed direction before the existing separate final discovery check-in. If that check-in changes verification direction, reconfirm it before writing. The feature SDD must have an easy-to-find quality strategy with relevant BRD IDs and no signature, approval status, or routine Story/Task gate.
- For UI-changing features, derive named screens, states, and breakpoints from binding UX mockups, distinguish human visual-fidelity comparison from functional and automated accessibility checks, and avoid visual boilerplate for non-UI features. Do not add a universal test-method checklist, new visual tooling, live-model tests, downstream UCVP-02 behavior, or a runtime Command/Handler/Port: the selected architecture applies only if an executable operation is introduced, which this SDD explicitly excludes.
- Update `templates/manifest.json` global and writer-template versions and replace that template's `changes` with user-facing current-version notes in the same change. Extend focused deterministic assertions for ordering, required proposal dimensions, correction/reconfirmation, distinct final check-in, UI/non-UI branch, and absence of formal sign-off. Assert prompt text contracts only, not model compliance; inspect the changed passage semantically for clarity and proportionality.
- Story-plan view: Story UCVP-01 at `docs/features/user-controlled-verification-planning/epics/verification-direction-handoff/stories/01-review-verification-direction-during-sdd-discovery.md`; upstream sources are its Epic brief, feature BRD and SDD, and project SAD § 6; selected architecture is `.agents/skills/command-pattern/SKILL.md`. Flags: none; no final flag removal.
- Milestones and coverage: M01, engineer-directed SDD discovery (T01, static contract and human semantic evidence), covers AC-01 through AC-04; M02, distributable guidance with protected local customizations (T01A, stale manifest-version regression repair; T02, sync lifecycle, aggregate, and packed-runtime evidence), reinforces AC-04 and distribution expectation. Task/status list: T01 checked; T01A checked; T02 checked. Preserve Task IDs and filename order; record actual checks and `Done when` evidence before marking a Task checked. Use story-local append-only `01-review-verification-direction-during-sdd-discovery.impl_plan/progress.log` with one entry per attempt: `Task ID | outcome | actual check/result | commit reference if present | blocker | gotchas`; existing T01 evidence stays append-only and unchanged. Plan-review and human-decision fields remain preparatory; existing Story review/approval and commit controls apply later.

## Files

- `templates/skills/software-design-writer/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-sad-sdd.test.ts`

## Done when

- Task check: `node --test bin/modules/template-catalog/templates-sad-sdd.test.js` (after `pnpm build`); pass: all SAD/SDD static contract tests, including new proposal-order, content, correction, final-check-in, and UI/non-UI assertions, pass; expected evidence: build result and focused test TAP summary in the progress log.
- The changed guidance and manifest satisfy the four Story acceptance criteria and BRD REQ-01/02/03/06 without implying that text assertions prove live agent behavior. Human semantic review records the inspected guidance passage and whether an engineer can understand and correct its proposed direction without a formal sign-off or universal method checklist; any unresolved judgment is a stop, not a claimed test pass.
- The writer template retains existing SDD ownership, UX prerequisites, Mermaid validation, final discovery check-in, and user-directed progression. No runtime module or UCVP-02 handoff is changed.
- Source-file size gate: `node .agents/scripts/check-touched-source-file-lines.mjs` passes for touched source files (the expected TypeScript test file is currently well below 500 lines); record pass/fail evidence. No property/fuzz, mutation, or load test is planned because this is a bounded prompt contract; residual risk is future model interpretation, addressed only partly by human semantic review.
