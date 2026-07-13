# Step: Reference structured logging from language and architecture skills

## Goal

Add minimal handoff references from relevant code-writing skills so language- and architecture-specific guidance reinforces the canonical structured logging trigger without restating the policy.

## Scope

- Add a short `structured-logging` reference to TypeScript template and dogfood guidance when TypeScript work affects observability-relevant behavior.
- Add a short `structured-logging` reference to the Golang template guidance; do not create a `.agents/skills/golang` dogfood copy unless one already exists.
- Add a short `structured-logging` reference to command-pattern template and dogfood guidance for workflows, command handlers, entrypoints, jobs, and operational outcomes.
- Do not add structured logging references to exporter or non-code-writing skills.

## Files

- `templates/skills/typescript/SKILL.md`
- `.agents/skills/typescript/SKILL.md`
- `templates/skills/golang/SKILL.md`
- `templates/skills/architecture/command-pattern/SKILL.md`
- `.agents/skills/command-pattern/SKILL.md`

## Done when

- TypeScript, Golang, and command-pattern guidance briefly reference `structured-logging` for observability-relevant code changes.
- Active dogfood copies are updated only for installed skills that exist in `.agents/skills/`.
- The references are concise handoffs and do not duplicate the canonical logging policy.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T19:05:53Z
