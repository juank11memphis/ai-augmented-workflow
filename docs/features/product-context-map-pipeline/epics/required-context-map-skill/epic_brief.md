# Required Product Context Map Skill Epic Brief

## Summary

Deliver the new required `product-context-map-writer` skill as a Sibu-managed mandatory workflow skill. This gives users a guided way to create and update `docs/product-context-map.md` without making the generated map itself a Sibu-managed template.

## Source Context

- Feature brief: `docs/features/product-context-map-pipeline/feature_brief.md`
- Technical design: `docs/features/product-context-map-pipeline/technical_design.md`

## Scope

- Add the `product-context-map-writer` skill template.
- Register the skill as mandatory for all supported agents.
- Update template manifest metadata and user-facing sync notes.
- Update workflow target tests so the required skill is covered by Sibu’s managed-file lifecycle.

## Out of Scope

- Creating Sibu’s own product-specific Product Context Map.
- Managing `docs/product-context-map.md` as a Sibu template.
- Updating downstream pipeline or architecture skills; those belong to the context-aware pipeline Epic.

## User Stories

- [Install required Product Context Map writer skill](./stories/01-install-required-product-context-map-writer.md)
- [Validate managed skill lifecycle](./stories/02-validate-managed-skill-lifecycle.md)

## Acceptance Criteria

- `product-context-map-writer` is installed as a mandatory skill for every supported agent.
- `sibu init`, `sibu doctor`, and `sibu sync` handle the skill through the normal managed-template lifecycle.
- `docs/product-context-map.md` is not installed or tracked as a managed Sibu template.
- Template manifest metadata clearly explains the new required skill.

## Dependencies / Risks

- The skill instructions must stay concise while still preserving the one-question-at-a-time interview and alignment behavior.
- Existing projects will see a new required skill during sync, so change notes must be clear.
