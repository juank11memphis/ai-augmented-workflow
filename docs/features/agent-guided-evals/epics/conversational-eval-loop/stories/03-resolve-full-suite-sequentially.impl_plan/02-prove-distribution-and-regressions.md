# Step: Prove shared distribution and catalog regressions

## Goal

Verify the revised skill reaches both coding hosts without overwriting customized guidance, align dependent catalog metadata expectations with the global manifest bump, and prove the installed package retains existing paths.

## Scope

- Task ID: AGE-US-03-T02; Milestone ID: AGE-US-03-M02 (reviewable distribution and regression evidence); Status: done; Depends on: AGE-US-03-T01.
- Story acceptance criteria: AC-01, AC-04, AC-05; source decisions: Template Catalog owns mandatory Codex/Claude routing, versioned sync, and package assets; Local Evals Workbench CLI behavior stays unchanged. On-demand pointers: SDD §§Architecture and responsibilities, Quality strategy and planned verification, Risks and tradeoffs; `src/modules/template-catalog/agent-guided-evals-lifecycle.test.ts`; `scripts/validate-packed-agent-guided-evals.mjs`; `scripts/validate-packed-cli-runtime.mjs`; `src/entrypoints/cli/evals-json.test.ts`. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Extend the disposable Codex/Claude lifecycle assertions to verify init installs the revised suite-capable shared guidance, stale managed installs receive the update, and a locally customized skill remains byte-for-byte preserved with reviewed metadata. Keep existing single-case checks and mandatory routing assertions; do not change host-specific templates or introduce a separate host workflow.
- Update only the stale global `templateVersion` 225 assertions to 226 in `retirements.test.ts`, `templates-unattended-epic-base.test.ts`, `templates-unattended-epic-handoff.test.ts`, `templates-unattended-epic-integration.test.ts`, and `templates-story-pr.test.ts`. Preserve their existing per-template version, sync-note, retirement, and content assertions; these unrelated templates are not rebumped. This is a same-change manifest metadata regression, not a new feature surface.
- Extend the packed-runtime guided-skill assertion to require the installed asset's sequential, fresh-evidence, and final-suite rules in addition to its existing single-case CLI/route assertions. The existing packed-runtime driver already calls this validator; do not create a second package path or live provider call.
- Keep deterministic fixture/static/integration proof distinct from behavioral proof. Existing headless/UI regression tests in the repository remain the regression surface; do not alter product code, UI, CLI result schema, or eval suites merely to make tests pass. If a test exposes an actual bounded regression, report it for reviewed recovery instead of broadening this Task.

## Files

- `src/modules/template-catalog/agent-guided-evals-lifecycle.test.ts`
- `src/modules/template-catalog/retirements.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-base.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`
- `src/modules/template-catalog/templates-story-pr.test.ts`
- `scripts/validate-packed-agent-guided-evals.mjs`
- `src/modules/template-catalog/templates-agent-guided-evals.test.ts` (only if a shared assertion from T01 needs a directly related refinement)

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/template-catalog/agent-guided-evals-lifecycle.test.js bin/modules/template-catalog/templates-agent-guided-evals.test.js bin/modules/template-catalog/retirements.test.js bin/modules/template-catalog/templates-unattended-epic-base.test.js bin/modules/template-catalog/templates-unattended-epic-handoff.test.js bin/modules/template-catalog/templates-unattended-epic-integration.test.js bin/modules/template-catalog/templates-story-pr.test.js bin/entrypoints/cli/evals-json.test.js`; pass: named disposable lifecycle tests show both hosts receive the current skill via init/sync without replacing customized content, all catalog metadata assertions agree on global version 226 without weakening unchanged template contracts, static skill contract remains intact, and the existing all/case JSON CLI contract remains usable; expected evidence: passing compiled focused tests (SDD §Quality strategy, integration/regression; Story AC-05). These tests do not call live models or claim behavioral adherence.
- Task check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: changed TypeScript/JavaScript source files remain at or below 500 lines; expected evidence: source-size gate passes. Known files are well below the limit; split cohesively only if an unexpected addition would exceed it.
- Final validation, once changes stabilize: run `pnpm verify` once (canonical build/type/test aggregate, covering the Story's planned `pnpm run check` and `pnpm run test` responsibilities without duplicate full runs), then `pnpm run validate:packed-runtime` once because the changed mandatory skill/manifest are distributed package assets. Pass: aggregate tests and installed-package smoke check pass, including packed guided-skill, CLI, and lifecycle assertions; expected evidence: exact command results and installed asset validation (SDD §Quality strategy; SAD §Quality verification). `pnpm verify` also satisfies the template-change skill's required validation.
- Do not treat passing static, fixture, package, or source-size checks as AC-01–AC-04 behavioral proof. Before Story success/integration, obtain separate explicit authorization for disposable live Codex **and** Claude Code QA: one case and full-suite scenarios with multiple failures within and across cases, persistent active failure/new approval, later stale failure invalidated by an earlier edit, and final-suite regression; capture prompts, approvals, run IDs/results, actual touched paths, one-active-failure ordering, blockers, and observed nondeterministic limits. If authorization or viable fixtures/host access are absent, stop and report an unverified behavioral gate rather than mark acceptance.
- Deeper property/fuzz or mutation testing is skipped: this Story changes guidance and distribution assertions, not a deterministic selection algorithm. Residual risk is prompt-governed approval and nondeterministic host behavior, addressed only by the separately authorized live QA and honest limits, not by more unit tests.
