# Step: Reconcile path-disjoint upstream template contract tests

## Goal

Restore eight deterministic template-contract suites invalidated by this Story's committed GitHub planning guidance and current manifest metadata, without touching preserved uncommitted T04 edits.

## Scope

- Task ID: GFW-S02-T02-R2; Milestone ID: GFW-S02-M01 (navigable GitHub planning hierarchy); Status: done; Depends on: GFW-S02-T02-R1, GFW-S02-T03. This checked follow-up must pass and commit before T04 resumes.
- Story acceptance criteria: AC-01, AC-02, AC-03 regression integrity; source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-02/REQ-09, AC-02/AC-06 and `docs/features/github-feature-work-tracking/sdd.md` Start and publish a feature stage, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence require native hierarchy, exact plan/source authority, selective safe reads, and deterministic template lifecycle evidence. On-demand pointers: `docs/features/github-feature-work-tracking/ux.md` Publish feature documents and Feature-created/publication-unconfirmed mockups; `templates/skills/scrum-master-planner/SKILL.md` GitHub issue output contract; `templates/skills/ai-implementation-planner-toolbox/SKILL.md` review-driven revision; `templates/manifest.json` current versions/notes. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Attribution: after T02-R1 commit `f0252e3`, a complete direct `pnpm verify` run exited 1 with exactly twelve failed tests in ten files. Eight files below are path-disjoint from preserved uncommitted T04 edits; the other two are T04-owned and stay in T04. In these eight files, remove obsolete absolute manifest-version pins, stale Scrum sync-note wording, two exact Scrum wording pins, and the stale planner-toolbox local-step-file phrase only where directly invalidated. Preserve actual native hierarchy, readiness/readback, retired-skill, Feature Decision, eval, source, milestone, and sync/manifest behavior assertions; test the current contract rather than replacing old literal pins with new brittle literals. No template, manifest, or runtime edits belong to this follow-up.
- Ownership/safety: HEAD `f0252e3`, index empty at diagnosis. T04 keeps its unstaged `templates/manifest.json`, Scrum/planner/executor skill templates, sixteen adjacent assertion-test edits, and two new output/lifecycle tests. This Task owns only the eight listed previously untouched test paths; do not stage, alter, or commit T04 paths or main-agent-owned Story status/plan/progress. Stop if attribution changes, a check fails for a different reason, or the repair would require changed template semantics or a material decision.

## Files

- `src/modules/template-catalog/retirements.test.ts`
- `src/modules/template-catalog/templates-agent-guided-evals.test.ts`
- `src/modules/template-catalog/templates-export-and-source.test.ts`
- `src/modules/template-catalog/templates-feature-decisions.test.ts`
- `src/modules/template-catalog/templates-feature-issue-hierarchy.test.ts`
- `src/modules/template-catalog/templates-feature-readback.test.ts`
- `src/modules/template-catalog/templates-feature-readiness.test.ts`
- `src/modules/template-catalog/templates-milestone-planning.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/retirements.test.js bin/modules/template-catalog/templates-agent-guided-evals.test.js bin/modules/template-catalog/templates-export-and-source.test.js bin/modules/template-catalog/templates-feature-decisions.test.js bin/modules/template-catalog/templates-feature-issue-hierarchy.test.js bin/modules/template-catalog/templates-feature-readback.test.js bin/modules/template-catalog/templates-feature-readiness.test.js bin/modules/template-catalog/templates-milestone-planning.test.js`; pass: both exit 0 and all eight suites pass with all previously inventoried failures assigned to these eight files resolved; expected evidence: named passing tests, current manifest/sync behavior assertions without obsolete absolute pins, and retained native hierarchy, selective-read/readback, prerequisite, and no-local-duplicate checks. This answers SDD deterministic fake-MCP/template contract and regression methods, not live agent/GitHub behavior.
- `git diff --check` and `node .agents/scripts/check-touched-source-file-lines.mjs` pass; staged/committed paths contain only these eight tests, with no T04 or main-agent-owned edits. The repair receives its own scoped checked commit. T04 still owns the final stabilized `pnpm verify` and its original focused check, not this follow-up.
