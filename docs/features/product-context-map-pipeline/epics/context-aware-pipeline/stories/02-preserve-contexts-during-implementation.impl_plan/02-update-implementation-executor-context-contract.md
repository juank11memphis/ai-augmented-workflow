# Step: Update implementation executor context contract

## Goal

Make the AI implementation plan executor treat Product Context guidance as part of the execution contract and avoid silent movement into unrelated contexts.

## Scope

- Update `templates/skills/ai-implementation-plan-executor/SKILL.md` to read and apply Product Context guidance from the story, implementation plan, feature brief, and technical design when present.
- Add concise execution guidance that approved Product Contexts define where work belongs during code changes.
- Require the executor to follow context boundaries from the approved step and technical design.
- Make the executor stop and ask before moving work into unrelated contexts unless the approved step or technical design explicitly justifies it.
- Do not update planner behavior in this step.

## Files

- `templates/skills/ai-implementation-plan-executor/SKILL.md`

## Done when

- Executor instructions treat Product Context guidance as part of the execution contract.
- Executor rules prevent silent movement of work into unrelated contexts.
- Exceptions require justification from the approved step or technical design.
- Added guidance is concise and non-duplicative.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:32:10Z
