# Step: Prove safe template distribution and validate the completed Story

## Goal

Verify that the changed SDD-authoring guidance is delivered with meaningful sync notes to fresh and stale installations while customized guidance remains protected, then run the stabilized Story validation once.

## Scope

- Task ID: FDH-01-T02; Milestone ID: FDH-01-M02 (safe distribution and Story confidence); Status: done; Depends on: FDH-01-T01.
- Story acceptance criteria: FDH-01 AC-01–AC-04 via the T01 contract and distribution; business source `docs/features/feature-decision-handoff/brd.md` REQ-01–REQ-04, AC-01–AC-02, RULE-01–RULE-02. Source decisions: `docs/features/feature-decision-handoff/sdd.md` §§ Ownership and boundaries (Template Catalog and customized installations), Feature Decision record and reuse contract, Quality strategy and planned verification. On-demand pointers: `src/modules/template-catalog/eval-authoring-lifecycle.test.ts` for disposable init/doctor/sync patterns; `src/modules/template-catalog/templates-sad-sdd.test.ts` for existing writer contracts; `scripts/run-tests.mjs` and `package.json` for check responsibilities. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Add focused disposable-project lifecycle coverage for the changed `software-design-writer` template: fresh init installs it, doctor is healthy, stale managed guidance receives current-version sync notes and updates, and customized guidance is not silently overwritten. Do not run `sibu sync` against this repository or change CLI behavior.
- Keep lifecycle tests self-contained, deterministic, and under 500 lines; use synthetic temporary projects, no live LLM or external service. Preserve T01's focused contract tests and the existing SDD writer checks. If a touched source file is already near/over 500 lines, add a cohesive split before completion instead of bypassing the source-file gate.
- Final validation strategy, after edits stabilize: run `pnpm verify` once (build plus compiled deterministic suite, including both focused tests and existing regressions), `pnpm run validate:packed-runtime` once (distinct packed/install behavior because template assets ship in the package), and `node .agents/scripts/check-touched-source-file-lines.mjs` for changed `.ts` files. Do not redundantly rerun standalone focused tests as final checks. Record actual outcomes; if the packed check is sandbox-blocked, request exact-command host escalation once and report denial rather than using a wrapper. No live-model eval or separate human-judgment check is planned.

## Files

- `src/modules/template-catalog/templates-feature-decision-lifecycle.test.ts` (new, focused lifecycle tests)
- `templates/skills/software-design-writer/SKILL.md` and `templates/manifest.json` (T01 outputs read by the lifecycle test; change only if its focused check reveals a bounded defect)

## Done when

- Task check: after `pnpm build`, run `node --test bin/modules/template-catalog/templates-feature-decision-lifecycle.test.js`; pass: all disposable-project init/doctor/sync cases pass; expected evidence: named Node subtests for fresh install, stale managed update and current notes, and customized preservation, with temporary fixtures cleaned up.
- Lifecycle assertions verify installed bytes match the changed template on fresh init, the manifest exposes the current meaningful note to stale managed installations, doctor returns healthy after safe update, and customized bytes survive review. This answers the SDD's template-distribution method for REQ-03 and prevents an approval-record contract that exists only in source templates.
- `pnpm verify` passes after stabilization; expected evidence: one successful aggregate build/compiled-test result covering T01 contract cases, T02 lifecycle cases, and existing writer/template regression tests. `pnpm run validate:packed-runtime` passes separately; expected evidence: successful package/install/runtime check for distributed skill assets. Neither proves future agent compliance or human provenance.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes with zero touched source files over 500 lines; expected evidence: checker success. Record each final command/result, manifest note inspection, and remaining static-prompt limitation in the T02 progress entry before its scoped commit. Preserve separate operational authorization and final human Epic review; no feature flag or removal check applies.
