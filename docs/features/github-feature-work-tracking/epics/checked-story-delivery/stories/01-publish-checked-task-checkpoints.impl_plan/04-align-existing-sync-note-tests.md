# Step: Align existing lifecycle tests with the current handoff sync note

## Goal

Restore the aggregate suite after the checked-Task handoff template note changed, without changing template semantics or weakening the existing feature-decision, milestone, Epic, targeted-handoff, and Sibu lifecycle checks.

## Scope

- Task ID: GFW-S03-T04; Milestone ID: GFW-S03-M04; Status: done; Depends on: GFW-S03-T03
- Story acceptance criteria: AC-02, AC-03, AC-04; source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-04, REQ-05, REQ-08, AC-03, AC-05; `docs/features/github-feature-work-tracking/sdd.md` §§ Publish a checked Task handoff, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence require honest partial-publication output and deterministic template lifecycle evidence; `docs/features/github-feature-work-tracking/ux.md` §§ Binding Mockups, Terminal-Width Strategy, Interaction States and Feedback govern compact, medium, and wide handoff states; on-demand pointers: those exact sections and `templates/manifest.json` entry `skills/ai-implementation-plan-executor/SKILL.md`; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`
- Owning area: `src/modules/template-catalog` deterministic template guidance and fake Sibu lifecycle tests. At Story head `86f4dafa55b7494b47c7a87f8344e29c8106b598`, `pnpm verify` passed 44/52 tests in the focused eight-file inventory; eight assertions still require `/confirmed Story and plan links.*publication-unconfirmed stop/`, while the current executor-template manifest sync note says “Clarifies compact, medium, and wide checked Task handoff messages and pauses honestly on partial publication.” The identical focused check passed 52/52 at the prior Epic/base head `824520dd1c21abaecccdb0d4b63139a3b6a21037`. This is an earlier T01/T03 same-Story regression, not a new template behavior requirement.
- In only the eight listed test files, replace the stale executor-note expectation with an assertion of the current note's *meaning*: compact, medium, and wide checked-Task handoff messages plus an honest partial-publication pause. Retain manifest-to-sync-preview equality and version/ownership/update assertions, and retain every existing Feature Decision, milestone, Epic, targeted-handoff, and init/doctor/sync behavior assertion. Avoid a new literal note, fixed version, or test helper that hides what each case proves.
- Do not edit `templates/`, production code, other tests, or completed Task evidence. The final Story validation remains `pnpm verify` once after stabilization, `node .agents/scripts/check-touched-source-file-lines.mjs`, and `pnpm run validate:packed-runtime` because templates affect installed behavior; no separate live-model, live GitHub, or human QA gate is introduced.

## Files

- `src/modules/template-catalog/verification-handoff-lifecycle.test.ts`
- `src/modules/template-catalog/templates-milestone-review.test.ts`
- `src/modules/template-catalog/templates-feature-decision-reuse.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-base.test.ts`
- `src/modules/template-catalog/templates-feature-decision-reuse-lifecycle.test.ts`
- `src/modules/template-catalog/templates-targeted-handoffs.test.ts`

## Done when

- Prerequisite build: `pnpm build` passes so the focused compiled TypeScript tests reflect the edited sources.
- Task check: `node --test bin/modules/template-catalog/verification-handoff-lifecycle.test.js bin/modules/template-catalog/templates-milestone-review.test.js bin/modules/template-catalog/templates-feature-decision-reuse.test.js bin/modules/template-catalog/templates-unattended-epic-integration.test.js bin/modules/template-catalog/templates-unattended-epic-handoff.test.js bin/modules/template-catalog/templates-unattended-epic-base.test.js bin/modules/template-catalog/templates-feature-decision-reuse-lifecycle.test.js bin/modules/template-catalog/templates-targeted-handoffs.test.js`; pass: all 52 focused tests pass, including all eight current-note assertions and the unchanged behavioral assertions; expected evidence: named 52/52 passing compiled tests and no failure in the previously failing eight locations.
- The eight assertions verify current user-facing sync-note meaning and each test still verifies its original Feature Decision, milestone, Epic, targeted-handoff, or fake init/doctor/sync behavior. No literal manifest-note snapshot, version pin, template edit, or weakened assertion substitutes for the behavior checks.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for touched TypeScript tests; the eight known files are well below 500 lines before this edit. The focused check gives deterministic regression and lifecycle confidence, not proof of live-agent compliance, real GitHub effects, subjective UX fidelity, or a cross-machine handoff. Deeper fuzz/mutation and live integration remain excluded per SDD; final Story checks and Epic PR visual judgment retain their existing roles.
