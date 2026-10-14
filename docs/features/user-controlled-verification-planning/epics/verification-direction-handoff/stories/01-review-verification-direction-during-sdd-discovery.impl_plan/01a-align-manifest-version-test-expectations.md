# Step: Align stale manifest-version test expectations

## Goal

Repair the five Template Catalog regression tests that still expect global manifest version 218 after the checked T01 template change advanced it to 219.

## Scope

- Task ID: UCVP-01-T01A; Milestone ID: UCVP-01-M02 (distributable, protected guidance); Status: checked; Depends on: UCVP-01-T01. This is a bounded same-Story follow-up for T02's failed `pnpm verify`, not a new reviewer finding or change to T01 evidence.
- Story acceptance criteria: UCVP-01 AC-04 and distribution expectation; source decisions: `docs/features/user-controlled-verification-planning/brd.md` REQ-01, REQ-02, REQ-03, REQ-06 and AC-01/AC-02; `docs/features/user-controlled-verification-planning/sdd.md` §§ “Workflow design and ownership” and “Quality strategy for this feature” require manifest/update-note and lifecycle evidence. On-demand pointers: `docs/features/user-controlled-verification-planning/epics/verification-direction-handoff/epic_brief.md` § “Acceptance Criteria”; `.agents/skills/sibu-template-change/SKILL.md` §§ “Workflow” and “Manifest rules”.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Owning area: Template Catalog deterministic tests only. In the five named test files, align the global `manifest.templateVersion` expectation with the current `templates/manifest.json` value 219; preserve each independent template version, current sync-note assertion, installed-copy assertion, and test intent. Prefer the direct 219 expectation for this narrow regression rather than broadening assertions to accept any version. Do not edit the manifest, writer guidance, production behavior, T01 checked evidence, or T02's unstaged `sync-preview.test.ts` change. Flags: none.
- Failure attribution: T01's committed `templates/manifest.json` bump from 218 to 219 caused five otherwise-existing template-catalog cases to fail during T02's `pnpm verify`; T02's own focused sync-preview check passed 18/18. This repair is path-disjoint from T02's preserved edit. T02 resumes its prescribed checks after this Task is checked and reviewed through the existing plan-only gate.

## Files

- `src/modules/template-catalog/retirements.test.ts`
- `src/modules/template-catalog/templates-story-pr.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-base.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`

## Done when

- Task check: `node --test bin/modules/template-catalog/retirements.test.js bin/modules/template-catalog/templates-story-pr.test.js bin/modules/template-catalog/templates-unattended-epic-base.test.js bin/modules/template-catalog/templates-unattended-epic-handoff.test.js bin/modules/template-catalog/templates-unattended-epic-integration.test.js` (after `pnpm build`); pass: all five formerly failing manifest-version cases and their neighboring assertions pass against global version 219; expected evidence: successful build and focused TAP summary identifying these five files with zero failures.
- The only code edits are the five stale global-version expectations; existing assertions for template-specific versions, release notes, installed guidance, and retirements remain intact. Record a focused diff inspection and `git diff --check` result, without staging or rewriting T02's sync-test edit.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for the five touched test files (each currently under 120 lines); record pass/fail evidence. This deterministic regression repair neither claims LLM behavior nor adds live-model, fuzz, mutation, or load tests; T02 retains the stabilized final `pnpm verify` and packed-runtime checks.
