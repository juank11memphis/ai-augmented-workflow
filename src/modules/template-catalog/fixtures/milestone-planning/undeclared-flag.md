# Step: Add invented flag

## Goal

Introduce undeclared behavior.

## Scope

- Flags: none declared by Epic or Stories; proposes `secret-mode`.
- Task ID: T-01; Milestone ID: M-01; Status: executable; Depends on: none.
- Story acceptance criteria: AC-01; source decisions: invent `secret-mode`; on-demand pointers: `epic_brief.md#feature-flags`; applicable skills: `.agents/skills/typescript/SKILL.md`.
- Files/area: flag tests.

## Files

- src/flag.test.ts

## Done when

- Task check: `node --test bin/flag.test.js`; pass: assertion passes; expected evidence: TAP pass.
