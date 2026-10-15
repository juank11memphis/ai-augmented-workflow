# Step: Align retirement and agent-target regression tests

## Goal

Restore the two remaining deterministic aggregate-test contracts after T02 advanced AGENTS to version 56 and added a mandatory Codex/Claude-only guided skill.

## Scope

- Task ID: AGE-US-02-T02d; Milestone ID: AGE-US-02-M02d (reviewable retirement and agent-target regression evidence); Status: done; Depends on: AGE-US-02-T02c. This is a bounded same-Story repair for two `pnpm run test` failures encountered by uncommitted T03, attributable to checked T02. Keep T03's preserved unstaged edits untouched and unstaged.
- Story acceptance criteria: AC-05; BRD `docs/features/agent-guided-evals/brd.md` REQ-08–REQ-10, AC-01, AC-07. Source decisions: SDD §§Architecture and responsibilities, Quality strategy and planned verification, Risks and tradeoffs; Template Catalog owns agent-specific targets and current template metadata, while Local Evals Workbench and the host edit boundary remain unchanged. On-demand pointers: `templates/manifest.json` AGENTS version and guided-skill entry; `src/modules/template-catalog/mandatory-skills.ts` guided target map; `src/modules/sync-review-orchestrator/retired-skill-review-handler.test.ts` shared-routing cleanup test; `src/modules/template-catalog/catalog.test.ts` mandatory-target map test. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`; `.agents/skills/sibu-template-change/SKILL.md` supplies manifest semantics but does not authorize template edits.
- In the retirement test, update only the stale expected AGENTS `templateVersion` from 55 to current 56; retain assertions that cleanup removes the retired skill, refreshes shared routing, preserves the other retired-skill guidance and user bytes, updates the state hash/status, and leaves the expected doctor finding.
- In the catalog test, replace the assumption that **every** skill targets all three hosts with an assertion that target-map keys are supported agent IDs, plus an explicit assertion that the guided skill targets Codex and Claude but not Gemini. Keep the exact all-host expectations for existing skills that require all hosts; do not weaken their coverage or make target presence optional in general. Avoid a production/catalog/manifest change or a new Command, Handler, Port, or Adapter.
- Stop and report if focused failures require broader test-contract changes, implementation changes, or edits to T03-owned files. Static tests prove manifest/target/retirement contracts, not live Codex or Claude behavior.

## Files

- `src/modules/sync-review-orchestrator/retired-skill-review-handler.test.ts`
- `src/modules/template-catalog/catalog.test.ts`

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/sync-review-orchestrator/retired-skill-review-handler.test.js bin/modules/template-catalog/catalog.test.js`; pass: both named compiled test files pass, including shared-routing retirement and target-map cases; expected evidence: current AGENTS version 56 is recorded after cleanup, retired guidance is removed without losing remaining guidance or user bytes, every target key belongs to a supported host, the guided skill has exactly Codex/Claude targets, and established all-host skill assertions remain effective (SDD §Quality strategy and planned verification; Story AC-05).
- Inspect changed assertions against existing manifest and catalog registration: no retirement behavior or agent-specific target contract is silently dropped. This is deterministic unit/regression evidence only; no live-agent behavior is claimed.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for T02d's two touched TypeScript test files; expected evidence: both remain at or below 500 lines. Deeper fuzz/mutation and live-agent checks are excluded from this test-only metadata repair; user-deferred live Codex/Claude QA remains a Story integration/merge stop.
