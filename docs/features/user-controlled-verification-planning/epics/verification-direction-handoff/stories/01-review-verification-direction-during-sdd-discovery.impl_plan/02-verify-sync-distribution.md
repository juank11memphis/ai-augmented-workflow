# Step: Verify sync distribution and local customization protection

## Goal

Show that the revised SDD writer guidance is distributed with meaningful update notes while `sibu sync` protects a locally customized installed skill.

## Scope

- Task ID: UCVP-01-T02; Milestone ID: UCVP-01-M02 (distributable, protected guidance); Status: checked; Depends on: UCVP-01-T01A. The preserved `src/modules/sync-review-orchestrator/sync-preview.test.ts` edit was checked and committed after T01A.
- Story acceptance criteria: UCVP-01 AC-04 and distribution expectation, with AC-01 through AC-03 retained by T01; source decisions: `docs/features/user-controlled-verification-planning/brd.md` REQ-01/02/03/06 and AC-01/AC-02, and `docs/features/user-controlled-verification-planning/sdd.md` §§ “Workflow design and ownership” and “Quality strategy for this feature”. On-demand pointers: `docs/features/user-controlled-verification-planning/epics/verification-direction-handoff/epic_brief.md` §§ “Scope” and “Acceptance Criteria”; `.agents/skills/sibu-template-change/SKILL.md` §§ “Workflow” and “Manifest rules”.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Owning area: Sync Review Orchestrator tests for Sibu-managed skill distribution. Add a focused disposable-project lifecycle case for `software-design-writer`: the updated manifest's current-version note appears in sync preview, a local edit is reported as `modified-with-update`, and marking it reviewed preserves bytes and records customized ownership. Use existing fixture/helper conventions; avoid production sync behavior changes unless the focused test exposes a bounded same-Story defect for the established recovery path.
- Inspect the final Story diff and manifest note against the template-change contract. Do not run a live LLM unit test or claim the lifecycle test proves future agent behavior. Flags: none.

## Files

- `src/modules/sync-review-orchestrator/sync-preview.test.ts`
- `templates/manifest.json` (readback of T01 metadata; edit only if correcting T01's in-scope note)
- `templates/skills/software-design-writer/SKILL.md` (readback only)

## Done when

- Task check: `node --test bin/modules/sync-review-orchestrator/sync-preview.test.js` (after `pnpm build`); pass: the new writer-specific lifecycle case and existing sync-preview cases pass; expected evidence: focused test TAP summary showing preview note, modified-with-update, unchanged local bytes, and `customized` state assertions.
- Final validation strategy, once changes stabilize: run `pnpm verify` exactly once for build/type/full compiled test coverage, then `pnpm run validate:packed-runtime` for installed-package/distribution behavior because `templates/` is packaged; record both actual results. Focused tests above provide nearby feedback and are not substitutes for this aggregate and distinct package check. If a required check is blocked, preserve the failure/permission evidence and report the limitation rather than substituting a wrapper.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for touched source files (the expected sync-preview test is currently 396 lines; keep it at or below 500 or split by cohesive responsibility before final validation); record pass/fail evidence. `git diff --check` passes and final diff inspection finds only Story-scope template, manifest, and tests, with no sign-off metadata or runtime Command/Handler/Port.
- Manual semantic review evidence from T01 remains explicit at Story PR review. Unit/static checks, sync lifecycle, and package smoke evidence do not establish live-model compliance or subjective UI fidelity. Property/fuzz, mutation, and load checks are skipped as disproportionate for template wording; the residual prompt-interpretation risk is documented rather than hidden.
