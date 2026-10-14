# Step: Include the guided skill in expected workflow targets

## Goal

Restore the expected-target regression after T02 made agent-guided-evals a mandatory skill for Codex and Claude Code.

## Scope

- Task ID: AGE-US-02-T02b; Milestone ID: AGE-US-02-M02b (reviewable mandatory-target regression repair); Status: done; Depends on: AGE-US-02-T02, AGE-US-02-T02a.
- Story acceptance criteria: AC-05; BRD `docs/features/agent-guided-evals/brd.md` REQ-08, REQ-10, AC-01, AC-07. Source decisions: SDD §§Architecture and responsibilities, Quality strategy and planned verification; SAD §Template Catalog. T02 registered the shared mandatory skill; this Task repairs only the stale expected-target test list. On-demand pointers: `src/support/expected-workflow-targets.test.ts` (`getWorkflowTargets` all-agent target assertions), `src/modules/template-catalog/mandatory-skills.ts` (registered target). Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- In the support test's existing all-agent expected-target assertions, add `.agents/skills/agent-guided-evals/SKILL.md` exactly once beside the other mandatory skill targets. Preserve the test's existing target semantics and assertions; do not change production target resolution, T02's registration, or T03's preserved uncommitted validators and lifecycle test.

## Files

- `src/support/expected-workflow-targets.test.ts`

## Done when

- Task check: `pnpm run build`, then `node --test bin/support/expected-workflow-targets.test.js`; pass: the expected-target suite is green and the all-agent target list asserts the new guided skill occurs exactly once while existing target assertions remain intact; expected evidence: named compiled support-test pass (SDD §Quality strategy, deterministic catalog regression; Story AC-05).
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes; expected evidence: the one touched TypeScript test file remains at or below 500 lines. `git diff --check` passes for this Task's scoped diff.
- This repairs the T02-attributable aggregate failure only; it does not claim agent routing or live-agent behavior. User-deferred Codex/Claude QA remains a Story integration/merge stop.
