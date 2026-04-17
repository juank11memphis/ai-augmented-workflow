# Workflow Lifecycle Epic Brief

## Summary
Deliver the core Ekko workflow loop so a repository can adopt Ekko, inspect workflow health, and safely maintain managed workflow files over time.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- `ekko init` as the one-time adoption command.
- `ekko doctor` as the read-only workflow health check.
- `ekko sync` as the safe review and repair flow for drift, missing files, template updates, and new expected templates.
- Clear communication about what Ekko creates, manages, detects, updates, defers, or refuses to overwrite.

## Out of Scope
- Post-init explicit skill selection through `ekko skills use <skill_name>`.
- Windsurf-specific agent target support.
- Missing-skill inventory documentation.
- Full project-management, assignment, analytics, or multi-repo workflows.

## User Stories
- [Adopt Ekko in a repository](./adopt-ekko-in-a-repository.md)
- [Inspect workflow health without changes](./inspect-workflow-health-without-changes.md)
- [Review and repair workflow drift](./review-and-repair-workflow-drift.md)

## Acceptance Criteria
- A repository without Ekko can adopt the MVP workflow through `ekko init` without unexpected overwrites.
- A repository with Ekko can be checked through `ekko doctor` without file changes.
- A repository with drift, missing files, older templates, or new expected templates can be guided through `ekko sync`.
- Ekko clearly communicates managed files, local-control boundaries, and recommended next steps.

## Dependencies / Risks
- `ekko sync` must remain trusted; silent overwrites or unclear drift handling would undermine the MVP.
- The CLI output must stay concise enough to create momentum rather than bureaucracy.
