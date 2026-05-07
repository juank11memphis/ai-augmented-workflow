# Step: Sync installed Scrum planner skill copy

## Goal

Apply the same post-planning GitHub export guidance to this repository's installed Scrum planner skill so local agents use the new behavior immediately while the reusable template carries it for future Sibu users.

## Scope

- Update `.agents/skills/scrum-master-planner/SKILL.md` to match the new Scrum planner export guidance added to the template.
- Keep the installed copy consistent with the reusable template for the changed section.
- Do not change unrelated installed skills.
- Do not update `templates/manifest.json` in this step.
- Do not perform any live GitHub issue export.

## Files

- `.agents/skills/scrum-master-planner/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`

## Done when

- The installed skill copy includes the same post-planning GitHub issue export behavior as the template.
- The installed skill copy preserves the Scrum planner's existing pipeline contract, required inputs, output locations, planning rules, and final response behavior.
- The changed section is easy to compare against the template.
- No other installed skill files are changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T03:25:43Z
