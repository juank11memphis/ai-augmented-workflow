# Step: Carry applicable SDD verification into Stories

## Goal

Make Scrum Story authoring preserve the applicable confirmed verification direction as verifiable acceptance and evidence expectations, without copying the entire feature strategy.

## Scope

- Task ID: UCVP-02-T01; Milestone ID: UCVP-02-M01 (source-faithful Story and Task handoff); Status: checked; Depends on: none.
- Story acceptance criteria: UCVP-02 AC-01; source decisions: `docs/features/user-controlled-verification-planning/brd.md` REQ-04, REQ-06, AC-03 and RULE-01/02; `docs/features/user-controlled-verification-planning/sdd.md` makes the SDD authoritative for methods, coverage, evidence, human limits, and material exclusions. On-demand pointers: SDD §§ “Workflow design and ownership” (Scrum row), “Verification approach contract”, “Main interaction and exception flow” (sequence diagram), “Quality strategy for this feature”; Story § “Verification Expectations”; `docs/architecture.md` § 6.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Owning area: source Sibu skill templates and Template Catalog static contracts; this is prompt/template-owned Skill Guidance, not a runtime Command/Handler/Port. Extend Scrum guidance to derive each Story's relevant methods, scenarios/surfaces, expected evidence, human-only judgment, and meaningful exclusions from the SDD quality strategy; keep source IDs and distinguish a Story slice from wholesale repetition. If the relevant SDD direction, source alignment, or required UX coverage is missing or contradictory, stop rather than guess. Do not add an SDD sign-off field or a routine Story approval.
- Add deterministic source/fixture assertions for a representative multi-Story quality strategy: an applicable required method and human limit survive into the Story contract; an unrelated method is not indiscriminately copied; exclusions remain visible. Include a semantic diff-review note about prompt clarity, without claiming model-behavior proof. Update `templates/manifest.json` global and changed-template versions with current-version user-facing sync notes; leave installed customized `.agents/skills/` copies to `sibu sync`.
- Story-plan view: Story UCVP-02 at `docs/features/user-controlled-verification-planning/epics/verification-direction-handoff/stories/02-preserve-verification-direction-through-delivery.md`; upstream Epic brief `docs/features/user-controlled-verification-planning/epics/verification-direction-handoff/epic_brief.md`, feature BRD and SDD, and `docs/architecture.md` § 6; selected architecture `.agents/skills/command-pattern/SKILL.md` (no executable slice for this Story). Flags: none; no final removal.
- Milestones and coverage: M01, source-faithful handoff (T01 AC-01, T02 AC-02 and AC-03); M02, independently reviewed, evidence-honest execution (T03 AC-02–AC-04); M03, protected distribution (T04 distribution and regression evidence for AC-01–AC-04). Ordered Task/status list: T01 checked, T02 checked, T03 checked, T04 pending. Later execution records each prescribed check and every `Done when` result before checked status. Story-local append-only `02-preserve-verification-direction-through-delivery.impl_plan/progress.log` entry shape: `Task ID | outcome | actual check/result | commit reference if present | blocker | gotchas`. Plan-review and human-decision fields are preparatory; exact-plan independent review, checked-Task commits, and final Story PR review remain later workflow gates, with no new routine engineer plan decision.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-verification-story.test.ts` (new focused deterministic contract/fixture test)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-verification-story.test.js`; pass: both exit zero and fixture assertions cover relevant method/coverage/evidence/human-limit/exclusion preservation and unrelated-method non-copying; expected evidence: build result and focused TAP case names/results.
- Scrum's changed wording traces to BRD REQ-04/06 and Story AC-01 without making the SDD an approval record; record a focused human semantic inspection of the actual passage and limitation that static assertions do not prove future agent behavior.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for touched TypeScript source; expected evidence: pass/fail result. No property/fuzz, mutation, or load test is justified for bounded guidance text; residual risk is model interpretation, retained for Story review.
