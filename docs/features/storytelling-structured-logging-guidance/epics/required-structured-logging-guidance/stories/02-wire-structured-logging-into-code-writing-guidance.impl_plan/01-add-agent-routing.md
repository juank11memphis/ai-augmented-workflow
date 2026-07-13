# Step: Add structured logging to agent skill routing

## Goal

Route code-writing agents to the canonical `structured-logging` skill whenever implementation work affects observability-relevant operational behavior, while keeping `AGENTS.md` guidance concise and non-duplicative.

## Scope

- Add a skill-routing rule to `templates/AGENTS.md` for code-writing tasks involving logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior.
- Apply the same routing rule to the root `AGENTS.md` dogfood copy.
- Keep the rule as a trigger/delegation hook; do not copy the full structured logging policy into agent instructions.

## Files

- `templates/AGENTS.md`
- `AGENTS.md`

## Done when

- Both AGENTS files instruct agents to use `structured-logging` for the story's observability-relevant code-writing triggers.
- The existing `clean-code` routing remains intact.
- The new wording delegates detailed logging rules to the skill and does not duplicate the canonical policy.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T19:05:53Z
