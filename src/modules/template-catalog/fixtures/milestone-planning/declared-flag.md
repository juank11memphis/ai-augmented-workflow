# Step: Check declared flag behavior

## Goal

Preserve off behavior and add on behavior for the declared flag.

## Scope

- Story: EX-01; source: `stories/01.md`; architecture: `command-pattern`.
- Flags: `demo-mode` declared by Epic `epic_brief.md`; final removal declared by Story `stories/03-remove-demo-mode.md`.
- Milestone M-01: reviewable outcome: both flag states pass; ordered Tasks: T-01; completion evidence: off/on TAP output; human review: pending.
- Task/status list: T-01 pending. Conventions: do not invent flags.
- Progress log: `progress.log` (non-Markdown); append Task ID, outcome, actual check result, commit reference when present, blocker, and gotchas.
- Task ID: T-01; Milestone ID: M-01; Status: pending; Depends on: none.
- Story acceptance criteria: AC-01; source decisions: only Epic-declared `demo-mode`; on-demand pointers: `epic_brief.md#feature-flags`; applicable skills: `.agents/skills/typescript/SKILL.md`.
- Files/area: flag tests.

## Files

- src/flag.test.ts

## Done when

- Task check flag-off: `node --test bin/flag-off.test.js`; pass: legacy behavior assertion passes; expected evidence: off TAP pass.
- Task check flag-on: `node --test bin/flag-on.test.js`; pass: new behavior assertion passes; expected evidence: on TAP pass.
- Final removal Task in declared Story: remove `demo-mode`; no-reference check: `rg -n 'demo-mode' src` returns no matches; expected evidence: no references.
