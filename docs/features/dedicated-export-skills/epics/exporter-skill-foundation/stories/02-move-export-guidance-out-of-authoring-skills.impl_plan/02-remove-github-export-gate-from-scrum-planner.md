# Step: Remove GitHub export gate from Scrum planner

## Goal

Remove the mandatory GitHub export gate from the Scrum planner template so Scrum planning only creates local Epic and User Story Markdown artifacts.

## Scope

- Delete the `Mandatory GitHub export gate` section from the Scrum planner template.
- Preserve the final response behavior for local Epic and Story output.
- Remove final-response requirements that report GitHub export gate outcomes.
- Do not add GitHub export instructions outside the dedicated `export-to-github` template.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`

## Done when

- The Scrum planner no longer requires or describes a GitHub export gate.
- The final response behavior no longer asks for a GitHub export gate outcome.
- Local Epic and User Story planning behavior remains intact.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:32:30-06:00
