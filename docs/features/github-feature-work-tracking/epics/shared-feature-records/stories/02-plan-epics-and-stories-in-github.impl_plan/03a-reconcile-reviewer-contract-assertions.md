# Step: Reconcile exact reviewer contract assertions

## Goal

Restore the deterministic reviewer-toolbox contract test after committed T02 changed the independent review packet from mandatory local plan paths to exact GitHub Story and plan-artifact identities.

## Scope

- Task ID: GFW-S02-T02-R1; Milestone ID: GFW-S02-M01 (navigable GitHub planning hierarchy); Status: done; Depends on: GFW-S02-T02, GFW-S02-T03. Run this follow-up before resuming uncommitted GFW-S02-T04.
- Story acceptance criteria: AC-02; source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-02/AC-02 and `docs/features/github-feature-work-tracking/sdd.md` State, Safety, and Operational Visibility require independent review of the exact published Story plan artifact, stable content fingerprint, and authoritative source verification without duplicate local feature files. On-demand pointers: `docs/features/github-feature-work-tracking/sdd.md` Start and publish a feature stage, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence; `templates/skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md` Required packet and source authority, Output contract. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Attribution and preserved-state boundary: committed T02 `d4cd6e4` changed the reviewer toolbox packet/output contract. `pnpm verify` now fails two stale static assertions in untouched `src/modules/template-catalog/templates-reviewers.test.ts` (line 17 local `exactly one User Story`, line 53 local `Reviewed plan identity: <exact identity and plan path>`); targeted `node --test bin/modules/template-catalog/templates-reviewers.test.js` confirms two failures. This test path is disjoint from every preserved uncommitted T04 edit; index is empty, HEAD `6b34c1c` at diagnosis. Do not stage, commit, reset, or rewrite T04's manifest, three skill templates, sixteen adjacent assertion tests, or two new output/lifecycle tests; main agent owns Story status and plan/progress metadata.
- Update only the two invalidated assertions to require exact GitHub Story issue and plan-artifact identities, transient reviewable content/stable fingerprint, and reviewer output identity matching the published artifact. Preserve other assertions for independent read-only authority, source verification, changed-plan review, reviewer categories, and thin read-only host wrappers. Do not change reviewer-toolbox template behavior or weaken the test to a generic string-presence check.
- This follow-up gets its own passing scoped check and test-only commit before T04 resumes. T04 retains its original goal, focused check, Done-when evidence, and single-commit authority; a failed or ambiguous check stops rather than absorbing T04 edits into this repair.

## Files

- `src/modules/template-catalog/templates-reviewers.test.ts` (only the two obsolete packet/output assertions)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-reviewers.test.js`; pass: both exit 0, including the previously failing required-packet and output-identity cases; expected evidence: five named passing reviewer-contract tests, exact GitHub Story/plan-artifact/fingerprint assertions, and preserved read-only/source-verification/changed-plan-review/wrapper assertions. This is a deterministic static contract check, not proof of live agent review behavior.
- `git diff --check` and `node .agents/scripts/check-touched-source-file-lines.mjs` pass for the scoped test edit; no T04-owned path appears in this follow-up's staged change or commit. Final `pnpm verify` remains T04's stabilized aggregate gate, not a substitute for this focused check.
