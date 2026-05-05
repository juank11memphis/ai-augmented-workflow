# Step: Update planning and executor Deep Module guidance

## Goal

Revise Scrum planning, AI implementation planning, and execution templates so they preserve Deep Module boundaries without rereading the full map by default.

## Scope

- Update `templates/skills/scrum-master-planner/SKILL.md` to avoid Product Context Map language and trust `technical_design.md` for Deep Module implementation boundaries.
- Update `templates/skills/ai-implementation-planner/SKILL.md` to preserve approved Deep Module boundaries from feature brief and technical design source artifacts.
- Update `templates/skills/ai-implementation-plan-executor/SKILL.md` to preserve approved Deep Module boundaries during execution.
- Update matching local copies under `.agents/skills/`.
- Do not update feature-brief or technical-design guidance in this step.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `.agents/skills/scrum-master-planner/SKILL.md`
- `.agents/skills/ai-implementation-planner/SKILL.md`
- `.agents/skills/ai-implementation-plan-executor/SKILL.md`

## Done when

- Scrum planning guidance says not to reread `docs/deep-module-map.md` by default and to trust `technical_design.md` for implementation boundaries.
- AI implementation planner and executor guidance preserve approved Deep Module boundaries.
- The changed templates and local copies no longer contain active Product Context Map terminology.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:55:33-06:00
