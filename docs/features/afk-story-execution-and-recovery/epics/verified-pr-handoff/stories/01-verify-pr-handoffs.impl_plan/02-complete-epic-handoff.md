# Step: Complete the human Epic PR handoff and truthful summaries

## Goal

Make the final Epic PR a verified human-review surface and keep Story/Epic summaries accurate without a separate behavioral-QA gate.

## Scope

- Task ID: AFK-PR-01-T02; Milestone ID: AFK-PR-01-M02 (truthful human handoff); Status: done; Depends on: AFK-PR-01-T01.
- Story acceptance criteria: AC-04, AC-05, and regression coverage of AC-01–AC-03. Source decisions: `docs/features/afk-story-execution-and-recovery/brd.md` REQ-07–REQ-08, AC-04–AC-05, RULE-05–RULE-06; `sdd.md` **Story and Epic PR handoff**, **Quality strategy and planned verification**. On-demand: Story **Verification Expectations** and **Validation**; `docs/architecture.md` **Template Catalog**. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/command-pattern/SKILL.md` (no executable operation).
- Owning areas: main-agent executor guidance, distributed template, and their deterministic Template Catalog contract tests. Reconcile each merged child Story PR against the observed Epic-head chain; an unreconciled Story chain or Epic head blocks a trustworthy handoff. Name the Epic-level check, source, observed head, and actual result. Report known required host-check and merge-policy status or an explicit verification gap in the open Epic PR for human review; unavailable host check or policy facts are not passing evidence or permission to merge. Read back the one Epic PR's body, head/base, and state; leave it open for human review and never merge it automatically.
- Story and Epic PR descriptions contain compact noteworthy failure attribution, reviewed repairs, actual checks, residual limits, and unresolved stops from existing plan/progress evidence. No raw private logs, false pass claims, second recovery ledger, or invented human approval metadata. If no recovery happened, report only actual checks rather than manufacturing a repair narrative.
- Remove stale separate behavioral-QA prerequisites, `not performed` PR fields, and final-response QA labels from this workflow guidance; retain planned Task checks, `Done when` evidence, Story-level validation, named Epic-level check, and required human Epic PR review. Do not remove optional risk-justified manual QA discussion from unrelated planner guidance.
- Keep installed and packaged executor text synchronized. Update the changed template and global manifest versions and current-version user-facing sync note again for this Task's template edit. Replace assertions that require obsolete QA text; retain unrelated PR/body/readback and safety assertions. Static/source review confirms the absent QA gate across the changed executor guidance and its focused tests.

## Files

- `.agents/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-story-pr.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts`
- `src/modules/template-catalog/templates-afk-pr-handoff.test.ts`

## Done when

- Task check: `pnpm build` followed by `node --test bin/modules/template-catalog/templates-story-pr.test.js bin/modules/template-catalog/templates-unattended-epic-integration.test.js bin/modules/template-catalog/templates-unattended-epic-handoff.test.js bin/modules/template-catalog/templates-afk-pr-handoff.test.js`; pass: both commands exit 0; expected evidence: deterministic Epic-chain, named-check, host-gap, summary, readback, no-auto-merge, and stale-QA contract assertions. Tests do not claim a real PR, merge, or live-agent behavior.
- Source review records that all merged Story PRs are reconciled to the latest observed Epic head (otherwise handoff stops), the exact named Epic check is represented, unavailable host check/policy facts are disclosed as gaps rather than passing results in the open Epic PR, and that PR is read back and reserved for human review without automatic merge. Record a compact evidence locator, not raw private logs.
- Focused tests and source inspection show Story/Epic summaries retain actual checks and recovery attribution/stops when present, while the separate-QA gate and PR fields are absent. No planned Task, Story, or Epic check is removed. Manifest/sync note is current; touched `.ts` files remain at or below 500 lines and `node .agents/scripts/check-touched-source-file-lines.mjs` exits 0.
- Final validation strategy, once template edits stabilize: run `pnpm verify` exactly once for compiled build/type/full deterministic test coverage, then `pnpm run validate:packed-runtime` once because the changed skill is a packaged asset. Record actual pass/fail and the inspected manifest/version/sync note. When practical, exercise init/doctor/sync in a disposable project and record whether customized files are protected; do not mutate this project or claim lifecycle evidence if it was not run. Avoid duplicate standalone final tests already covered by `pnpm verify`.
- Residual limit: static contracts and disposable lifecycle checks cannot prove live agent adherence or GitHub policy behavior. No live PR/merge, live-model eval, separate behavioral QA, production deployment, fuzz/mutation, or UI review is prescribed; those deeper checks would not answer this prompt-owned Story's deterministic contract question proportionately. Human judgment remains at final Epic PR review.
