# Step: Verify protected template distribution and final regression

## Goal

Prove the changed guidance is versioned, reaches a fresh installed workflow, and does not overwrite locally customized guidance.

## Scope

- Task ID: UCVP-02-T04; Milestone ID: UCVP-02-M03 (protected distribution); Status: checked; Depends on: UCVP-02-T03.
- Story acceptance criteria: UCVP-02 AC-01–AC-04 distribution/regression support; source decisions: `docs/features/user-controlled-verification-planning/brd.md` REQ-04/05/06, AC-03/AC-04; `docs/features/user-controlled-verification-planning/sdd.md` §§ “Workflow design and ownership”, “Quality strategy for this feature”; Epic brief §§ “Scope”, “Acceptance Criteria”. On-demand pointers: `.agents/skills/sibu-template-change/SKILL.md` §§ “Workflow”, “Manifest rules”; `src/modules/sync-review-orchestrator/sync-preview.test.ts`; `scripts/validate-packed-cli-runtime.mjs`; `package.json` scripts/files.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Owning area: Sync Review Orchestrator lifecycle tests and Template Catalog manifest readback, not production sync logic. Add a disposable-project test for representative changed skills: fresh init installs updated source bytes and healthy metadata; stale managed copy offers meaningful current-version sync note; a locally edited copy is classified `modified-with-update`, and `mark-reviewed` preserves bytes and records customized ownership. Use existing lifecycle fixture/helpers. Do not modify installed customized `.agents` files directly or widen to runtime sync behavior absent a focused defect. `sync-preview.test.ts` is 426 lines before this Story: prefer a cohesive new lifecycle test file to avoid crossing the 500-line source gate.
- Confirm Template Catalog metadata assertions against the `cd7d950` baseline: global manifest version `223`, plan-executor template version `71`, and its current overlapping-Task-continuation sync note. Correct only any remaining T04-attributable stale expectations while retaining separate assertions for the prior Story-PR, Epic, and safety behaviors. Inspect relevant assertions in `retirements`, `templates-story-pr`, `templates-unattended-epic-base`, `templates-unattended-epic-handoff`, `templates-unattended-epic-integration`, `templates-milestone-review`, and `templates-workers` tests; do not weaken their behavioral contracts to make versioning pass.
- Continuation of the same uncommitted T04: preserve the unstaged `verification-handoff-lifecycle.test.ts` edit. The initial check and two correction rounds failed on a superseded `templates-workers` planner-wording assertion; the separately committed workflow reconciliation `cd7d950` corrected that assertion. Its 60/60 focused-check preflight is baseline evidence, not T04 completion. Against this baseline, rerun the exact Task check, gather every remaining `Done when` item and final validation result, then make only T04's scoped single commit after all required evidence passes. Do not absorb the main-owned Story-status or plan/progress edits into that commit.
- Inspect manifest global/template version increments and one current-version user-facing `changes` entry for every changed template, plus the final Story diff for no unrelated module, SDD mutation, sign-off state, or new testing infrastructure. Flags: none; no flag-off/on or removal check. Static/lifecycle tests are not live agent-behavior evidence.

## Files

- `src/modules/template-catalog/verification-handoff-lifecycle.test.ts` (new focused disposable-project lifecycle test)
- `src/modules/template-catalog/retirements.test.ts` (stale global-version assertion)
- `src/modules/template-catalog/templates-story-pr.test.ts` (stale version/note assertions)
- `src/modules/template-catalog/templates-unattended-epic-base.test.ts` (stale version/note assertions)
- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts` (stale version/note assertions)
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts` (stale version/note assertions)
- `src/modules/template-catalog/templates-milestone-review.test.ts` (stale version/note assertions)
- `src/modules/template-catalog/templates-workers.test.ts` (stale current-version note assertion)
- `templates/manifest.json` (final readback, correct Story-local metadata defects only)
- `templates/skills/scrum-master-planner/SKILL.md` (readback)
- `templates/skills/ai-implementation-planner/SKILL.md` (readback)
- `templates/skills/ai-implementation-planner-toolbox/SKILL.md` (readback)
- `templates/skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md` (readback)
- `templates/skills/ai-implementation-plan-executor/SKILL.md` (readback)
- `templates/skills/ai-implementation-executor-toolbox/SKILL.md` (readback)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/verification-handoff-lifecycle.test.js bin/modules/template-catalog/retirements.test.js bin/modules/template-catalog/templates-story-pr.test.js bin/modules/template-catalog/templates-unattended-epic-base.test.js bin/modules/template-catalog/templates-unattended-epic-handoff.test.js bin/modules/template-catalog/templates-unattended-epic-integration.test.js bin/modules/template-catalog/templates-milestone-review.test.js bin/modules/template-catalog/templates-workers.test.js`; pass: both exit zero, lifecycle cases verify fresh installed bytes/healthy state/meaningful note/`modified-with-update`/unchanged customized bytes and state, and existing metadata plus Story-PR/Epic/worker behavioral assertions pass against the new manifest; expected evidence: build result and focused TAP case results, including updated version/current-note assertions and retained behavioral cases.
- Final validation strategy after stabilization: run `pnpm verify` once for build/type/full compiled-test coverage (so no duplicate standalone build/full test); then run distinct `pnpm run validate:packed-runtime` because `templates/` is package-distributed and installed behavior matters. Record actual results; focused tests above do not replace either final check. If a required command is blocked, preserve limitation evidence and use only the prescribed narrow host escalation process.
- `node .agents/scripts/check-touched-source-file-lines.mjs` and `git diff --check` pass; record results. Inspect final diff and manifest notes manually against AC-01–AC-04 and BRD REQ-04–06, including human limits, material stops, automatic review, and failed-check recovery. Human semantic inspection is required evidence, not a substitute for exact Task checks; no live LLM test or claim of future compliance. Property/fuzz, mutation, and load testing are skipped as disproportionate; residual prompt-interpretation risk is explicit for Story PR review.
