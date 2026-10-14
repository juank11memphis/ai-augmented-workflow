# Step: Verify installed distribution and existing paths

## Goal

Make the new mandatory guidance observable in lifecycle and packed-package fixtures while preserving the existing authoring and UI paths.

## Scope

- Task ID: AGE-US-02-T03; Milestone ID: AGE-US-02-M03 (reviewable installed-package and regression evidence); Status: done; Depends on: AGE-US-02-T02a, AGE-US-02-T02b, AGE-US-02-T02c, AGE-US-02-T02d (which repaired T02's two remaining stale test assumptions before T03 resumed). T03's preserved edits were checked and committed as 0393216.
- Story acceptance criteria: AC-01, AC-05; BRD `docs/features/agent-guided-evals/brd.md` REQ-08–REQ-10, AC-01, AC-07. Source decisions: one installed skill in both hosts, sync must protect customization, packed package must include it, headless CLI/browser and authoring remain usable; no new runtime. On-demand pointers: SDD §§Quality strategy and planned verification, Risks and tradeoffs; `src/modules/template-catalog/eval-authoring-lifecycle.test.ts`, `scripts/validate-packed-cli-runtime.mjs`, `scripts/validate-packed-headless-evals.mjs`, `src/modules/template-catalog/templates-eval-authoring.test.ts`. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md` where TS changes, `.agents/skills/sibu-template-change/SKILL.md`.
- Add disposable lifecycle fixture checks: init for Codex-only and Claude-only, doctor healthy, sync update/adoption, and customized guidance preserved without overwrite. Extend installed-package fixture to inspect the packed skill and route from both host setups; use existing packed validator rather than a separate publishing flow. In its offline failing-run fixture, assert installed `run` and unselected `result` yield the same T00 case/attempt/failed-assertion locator, then request one selected failure through that locator; assert no raw output leaks from summaries. Preserve explicit browser-default and authoring regressions using existing checks. If `scripts/validate-packed-cli-runtime.mjs` is near/over 500 lines when touched, extract a cohesive guided-skill validation helper instead of extending a large script.
- Final validation strategy after T02d and T03 changes stabilize: rerun failed `pnpm run test` once (includes build, compiled unit/integration/regression suite), plus any now-stale passes from `pnpm run check` and `pnpm run validate:packed-runtime` (distinct installed-package semantics); run `node .agents/scripts/check-touched-source-file-lines.mjs` and `git diff --check`. Do not duplicate standalone focused tests after aggregate suite passes. These answer SDD §Quality strategy deterministic CLI/handler, catalog metadata, retirement, lifecycle and package methods; expected evidence is clean typecheck, all named deterministic tests including retained retirement and legacy template contracts and guided-skill routing, packaged locator-to-selected-evidence fixture pass, <=500 touched source lines, and no whitespace errors.
- Explicit exclusion: no routine live-agent evals, no full-suite guided interaction until AGE-US-03, and no claim that static tests prove an agent's behavior. User has deferred disposable Codex and Claude Code QA; it must observe single-case choice/run, bounded diagnosis, declined/approved/unsafe paths, actual edit scope, rerun, and blocked outcomes with nondeterministic limits reported. Do not mark AC-01–AC-04 behaviorally verified or merge/integrate the Story before that QA and required human decision.
- Deeper-check rationale: focused edge/invariant tests in T00 cover locator completeness, bounds and raw-evidence exclusion; separate fuzz/mutation testing is not planned for this narrow projection. Residual risk is agent noncompliance and host-specific routing, addressed only by user-deferred QA and Story PR review.

## Files

- `src/modules/template-catalog/agent-guided-evals-lifecycle.test.ts`
- `scripts/validate-packed-cli-runtime.mjs`
- `scripts/validate-packed-headless-evals.mjs` (offline locator-to-selected-evidence fixture)
- `scripts/validate-packed-agent-guided-evals.mjs` (cohesive helper if needed for source-file size or separation)
- `src/modules/template-catalog/templates-agent-guided-evals.test.ts` (only direct adjacent assertions)

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/template-catalog/agent-guided-evals-lifecycle.test.js`; pass: disposable init/doctor/sync fixture tests pass for Codex and Claude and preserve customized files; expected evidence: named lifecycle tests (SDD §Quality strategy, integration/regression; Story AC-01/AC-05).
- Task check: `pnpm run validate:packed-runtime`; pass: installed package contains/routes the skill; offline installed CLI runs expose T00's bounded locator in run and unselected result and use it for one selected failure; existing headless eval, browser and authoring regression assertions remain green; expected evidence: packed-runtime success output from isolated fixture (SDD §Quality strategy, package smoke; Story AC-01/AC-02/AC-05).
- Touched source-file gate passes at `node .agents/scripts/check-touched-source-file-lines.mjs` after all edits. Final strategy above is run once after stabilization, not after each tiny edit.
- Human-judgment limit remains explicit: deterministic/static/package checks do not establish AC-01–AC-04 live-agent behavior. User-deferred QA is a Story integration/merge stop; do not fabricate approval or observation evidence.
