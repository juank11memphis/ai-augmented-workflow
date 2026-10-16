# Step: Publish the versioned runner judge contract

## Goal

Make the distributed project-runner guidance describe the exact judge-evidence extension and its error, compatibility and safety rules.

## Scope

- Task ID: EFE-S02-T05; Milestone ID: EFE-S02-M3; Status: done; Depends on: EFE-S02-T04.
- Story acceptance criteria: AC-01, AC-03, AC-04; source decisions: existing version-1 runners remain valid but cannot reconstruct historic judge exchange; capable version-2 runners emit exact actual request/response and score-linked judge records; no rubric mutation, hidden reasoning, raw diagnostics or logs. On-demand pointers: SDD `## Evidence and ordering contract`, `## Failure behavior and operational safety`, `## Quality strategy and planned verification`; BRD REQ-04/05/06/08.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`.
- Update the existing distributed version-2 runner reference (currently excluding rubric judge records) with the validated judge record shape, event/chunk order, completeness and grading-error rules, safe no-raw-logging guidance, and a synthetic contract example. Keep template manifest versions and current-version user-facing `sibu sync` notes in step with any changed template. Update focused static/protocol contract tests; do not alter generated installed workflows or create a runtime generator.
- Same-Task continuation for the observed `pnpm verify` failure: the required global manifest bump from 229 to 230 leaves seven stale global-version assertions in six template-catalog tests. Update only those global expectations to 230, preserving their independent per-template version, sync-note, installed-target, and behavior checks. The four original T05 edits remain unstaged and owned by this single Task; no separate repair commit, production-code change, or manifest re-bump.
- After code/docs stabilize, run the single final canonical aggregate and distinct packed-runtime check specified in T01; report observed results and remaining no-live-judge interpretation limit. Lifecycle testing is only needed if template-install/sync behavior changes; this Task changes guidance content, not installer semantics.

## Files

- `templates/skills/eval-authoring/references/version-2-contract.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-eval-authoring-contract.test.ts`
- `src/modules/template-catalog/eval-authoring-lifecycle.test.ts`
- `src/modules/template-catalog/retirements.test.ts`
- `src/modules/template-catalog/templates-agent-guided-evals.test.ts`
- `src/modules/template-catalog/templates-story-pr.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-base.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-eval-authoring-contract.test.js bin/modules/template-catalog/eval-authoring-lifecycle.test.js`; pass: template contract's synthetic judge record is accepted by the production validator and wrong links/malformed score are rejected, while installation still carries the updated guidance; expected evidence: named passing static/protocol and template-lifecycle tests (SDD fake-judge and compatibility methods; Story AC-01/03/04).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T05 touched source files ≤500 lines; expected evidence recorded before commit.
- Final validation after stabilization: `pnpm verify` passes its compiled deterministic suite, including all seven formerly stale global-version assertions at 230 with unrelated per-template assertions intact, and `pnpm run validate:packed-runtime` passes installed CLI/runtime behavior; expected evidence: exact command results, no duplicate standalone final checks. If either cannot run, report the limitation rather than substitute an unrelated command. No live-model claim or human QA gate.
- The manifest global/template versions and current-version sync note change with the reference template; old-runner compatibility and `not-captured` guidance remain explicit.
