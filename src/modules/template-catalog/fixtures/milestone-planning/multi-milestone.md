# Step: Define checked Milestone and Task planner guidance

## Goal

Update the planner toolbox to produce executor-compatible Milestones and checked Tasks with durable state.

## Scope

- Story: AFK-E01-S01; source: `docs/features/afk-story-planning-and-execution/epics/reviewed-story-delivery/stories/01-produce-milestone-plans-with-checked-tasks.md`; architecture: `command-pattern`.
- Flags: none. Coverage: AC-01 -> T-01; AC-02 -> T-01; AC-03 -> T-01; AC-04 -> T-01; AC-05 -> T-02. Plan review: not started; human decision: pending.
- Milestone M-01: reviewable outcome: toolbox guidance yields checked, executor-compatible plans and rejects uncheckable Tasks; ordered Tasks: T-01; completion evidence: named compatibility, positive-plan, and uncheckable-Task TAP passes; automatic progression after verification.
- Milestone M-02: reviewable outcome: gatekeeper requires source-grounded flag handling and both changed skills ship with versioned notes; ordered Tasks: T-02; completion evidence: named flag-handoff and distribution TAP passes; final Story PR review: pending.
- Task/status list: T-01 pending, T-02 pending. Conventions: preserve executor step headings and selected architecture.
- Progress log: `progress.log` (non-Markdown); append Task ID, outcome, actual check result, commit reference when present, blocker, and gotchas.
- Task ID: T-01; Milestone ID: M-01; Status: pending; Depends on: none.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; source decisions: toolbox guidance needs reviewable Milestones, bounded checked Tasks, complete Story coverage, durable state, and uncheckable-Task rejection without changing ordered-step consumption; on-demand pointers: `docs/features/afk-story-planning-and-execution/sdd.md#plan-and-state-contracts`, `docs/features/afk-story-planning-and-execution/sdd.md#quality-strategy-and-planned-verification`; applicable skills: `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Files/area: `templates/skills/ai-implementation-planner-toolbox/SKILL.md`, `src/modules/template-catalog/templates-milestone-planning.test.ts`, and positive/uncheckable fixtures.

## Files

- templates/skills/ai-implementation-planner-toolbox/SKILL.md
- src/modules/template-catalog/templates-milestone-planning.test.ts
- src/modules/template-catalog/fixtures/milestone-planning/

## Done when

- Task check: `node --test --test-name-pattern='keeps checked Tasks in executor-compatible ordered step files|covers one-Milestone and multi-Milestone plans with durable state|rejects a subjective unchecked Task before handoff' bin/modules/template-catalog/templates-milestone-planning.test.js`; pass: named compatibility, positive-plan, and uncheckable-Task assertions pass against toolbox guidance and fixtures; expected evidence: TAP reports all three named assertions passing.
