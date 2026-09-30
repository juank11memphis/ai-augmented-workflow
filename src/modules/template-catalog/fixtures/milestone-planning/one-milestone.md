# Step: Ship the checked Milestone planner contract

## Goal

Ship executor-compatible Milestone and Task guidance for this Story, with regression evidence for all five acceptance criteria.

## Scope

- Story: AFK-E01-S01; source: `docs/features/afk-story-planning-and-execution/epics/reviewed-story-delivery/stories/01-produce-milestone-plans-with-checked-tasks.md`; architecture: `command-pattern`.
- Flags: none. Coverage: AC-01 -> T-01; AC-02 -> T-01; AC-03 -> T-01; AC-04 -> T-01; AC-05 -> T-01. Plan review: not started; human decision: pending.
- Milestone M-01: reviewable outcome: planner guidance produces checked Milestone plans and rejects unsafe handoffs; ordered Tasks: T-01; completion evidence: focused TAP output for template, fixture, and distribution assertions; final Story PR review: pending.
- Task/status list: T-01 pending. Conventions: preserve existing executor step headings; do not invent flags.
- Progress log: `progress.log` (non-Markdown); append Task ID, outcome, actual check result, commit reference when present, blocker, and gotchas.
- Task ID: T-01; Milestone ID: M-01; Status: pending; Depends on: none.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04, AC-05; source decisions: preserve ordered step-file consumption while the toolbox defines checked Tasks and durable state, the gatekeeper rejects uncheckable or undeclared-flag handoffs, and versioned templates distribute both changes; on-demand pointers: `docs/features/afk-story-planning-and-execution/sdd.md#plan-and-state-contracts`, `docs/features/afk-story-planning-and-execution/sdd.md#distribution-and-migration-boundary`, `docs/features/afk-story-planning-and-execution/sdd.md#quality-strategy-and-planned-verification`; applicable skills: `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Files/area: `templates/skills/ai-implementation-planner-toolbox/SKILL.md`, `templates/skills/ai-implementation-planner/SKILL.md`, `templates/manifest.json`, `src/modules/template-catalog/templates-milestone-planning.test.ts`, and its positive/negative fixtures.

## Files

- templates/skills/ai-implementation-planner-toolbox/SKILL.md
- templates/skills/ai-implementation-planner/SKILL.md
- templates/manifest.json
- src/modules/template-catalog/templates-milestone-planning.test.ts
- src/modules/template-catalog/fixtures/milestone-planning/

## Done when

- Task check: `node --test bin/modules/template-catalog/templates-milestone-planning.test.js`; pass: ordered-step compatibility, positive-plan, uncheckable-Task, declared-flag, and template-version assertions all pass; expected evidence: TAP reports passes for each named contract test against the changed planner skills, manifest, and fixtures.
