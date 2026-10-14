# Step: Align template-catalog metadata regression tests

## Goal

Restore deterministic template-catalog regression coverage after T01/T02 changed the current manifest and AGENTS sync-note metadata, without weakening the legacy workflow-content contracts.

## Scope

- Task ID: AGE-US-02-T02c; Milestone ID: AGE-US-02-M02c (reviewable current-version catalog regression evidence); Status: done; Depends on: AGE-US-02-T02b. This is a bounded same-Story repair for the `pnpm run test` failure encountered by uncommitted T03; T01/T02's checked template metadata changes are the cause. Keep T03's preserved unstaged edits untouched and unstaged.
- Story acceptance criteria: AC-05; BRD `docs/features/agent-guided-evals/brd.md` REQ-08–REQ-10, AC-01, AC-07. Source decisions: SDD §§Architecture and responsibilities, Quality strategy and planned verification, Risks and tradeoffs; the Template Catalog owns distribution/routing, current-version sync notes describe the latest changed template, and deterministic tests do not prove agent behavior. On-demand pointers: `templates/manifest.json` AGENTS, guided-skill, and retirement-resource entries; `src/modules/template-catalog/templates-agent-guided-evals.test.ts` current-version contract; the eight catalog tests in Files; `.agents/skills/sibu-template-change/SKILL.md`. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`.
- In Template Catalog tests only, align stale global `templateVersion` 223 expectations to the current 225 contract, including the retirement-resource test, and stale AGENTS version 55 expectations to 56. Replace assertions that AGENTS' *current* `changes` note still describes the prior same-Task continuation with assertions for its current guided-eval routing note; retain substantive assertions that the AGENTS/template content still contains the earlier checked-Task, handoff, safety, and eval-authoring behaviors. Keep unchanged executor-template version 71, retirement-resource version 1, and their current sync-note checks where applicable. Preserve direct guided-skill registration, host-target, routing, and retirement-resource assertions; do not erase or loosen a failing legacy contract merely to obtain green tests.
- No production implementation, template, manifest, CLI/runtime, workflow-guidance, or product-scope edits. The test update must not touch T03-owned `scripts/validate-packed-cli-runtime.mjs`, `scripts/validate-packed-headless-evals.mjs`, `scripts/validate-packed-agent-guided-evals.mjs`, or `src/modules/template-catalog/agent-guided-evals-lifecycle.test.ts`. If a failure needs changes beyond these stale metadata expectations, stop and report the new attribution rather than expanding this Task.

## Files

- `src/modules/template-catalog/templates-workers.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-base.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`
- `src/modules/template-catalog/templates-story-pr.test.ts`
- `src/modules/template-catalog/templates-checked-task-execution.test.ts`
- `src/modules/template-catalog/templates-eval-authoring.test.ts`
- `src/modules/template-catalog/retirements.test.ts`

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/template-catalog/templates-workers.test.js bin/modules/template-catalog/templates-unattended-epic-base.test.js bin/modules/template-catalog/templates-unattended-epic-handoff.test.js bin/modules/template-catalog/templates-unattended-epic-integration.test.js bin/modules/template-catalog/templates-story-pr.test.js bin/modules/template-catalog/templates-checked-task-execution.test.js bin/modules/template-catalog/templates-eval-authoring.test.js bin/modules/template-catalog/retirements.test.js bin/modules/template-catalog/templates-agent-guided-evals.test.js`; pass: every named compiled catalog test passes against current manifest 225, AGENTS 56 and its guided-eval sync note while prior workflow-content, executor, and retirement-resource assertions remain effective; expected evidence: named deterministic regression tests, including the previously failing cases, all pass (SDD §Quality strategy and planned verification; Story AC-05).
- Inspect the changed assertions against the existing template text and manifest: no prior checked-Task, Epic handoff, authoring, or safety behavior is silently dropped; the guided-skill route stays distinct from eval-authoring. This is static contract evidence only, not live Codex/Claude behavior.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for T02c's touched test source files, including the near-500-line workers test; expected evidence: all touched source files are at or below 500 lines. Deeper fuzz/mutation and live-agent checks are excluded here because this Task changes only deterministic metadata assertions; user-deferred live QA remains a Story integration/merge stop.
