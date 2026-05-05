# Update Architecture Guidance for Deep Module Boundaries

## Epic
[Deep Module Map Workflow](../epic_brief.md)

## User Story
As an implementation agent, I want architecture skills to place work inside selected Deep Modules first, so that internal architecture choices do not scatter code across unrelated areas.

## Context
The architecture skills should treat Deep Modules as the default top-level implementation boundary while leaving each module's internal structure to the selected architecture.

## Scope
- Update `templates/skills/architecture/command-pattern/SKILL.md` to use Deep Module compatibility language.
- Change the command-pattern default slice path to `/src/modules/<module-slug>/<feature-slice>/...`.
- Update `templates/skills/architecture/ddd-hexagonal/SKILL.md` to use Deep Modules as default top-level module boundaries.
- Clarify that Deep Modules are not automatically DDD Bounded Contexts, while DDD projects may align them when appropriate.
- Update matching repository-local installed architecture skill copies where applicable.

## Out of Scope
- Changing production source folder structure.
- Creating code scaffolding automation.
- Forcing DDD, Hexagonal Architecture, or Command Pattern on projects that did not select them.

## Acceptance Criteria
- `command-pattern` says vertical slices live inside the selected Deep Module.
- `command-pattern` recommends `/src/modules/<module-slug>/<feature-slice>/command`, `handler`, `ports`, and `result` paths.
- `ddd-hexagonal` says each Deep Module is the default top-level module boundary before internal `domain`, `application`, and `infra` organization.
- Architecture guidance no longer uses active Product Context Map terminology.
- The guidance warns against shallow technical buckets as Deep Modules.

## Validation
- Search architecture skill templates and local copies for old Product Context terms.
- Confirm examples match the technical design's desired path shapes.
- Run repository verification from the technical design.
