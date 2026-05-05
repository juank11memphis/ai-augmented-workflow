# Deep Module Map Refactor Feature Brief

## Summary

Sibu should refactor the existing Product Context Map pipeline concept into a **Deep Module Map** concept. The current Product Context Map language is too abstract for the intended job: helping humans and agents decide how application work should be organized before technical design and implementation. This feature renames the artifact, skill, and downstream references from Product Contexts to Deep Modules, making the primary output a product-aligned, architecture-agnostic list of suggested implementation modules.

## Product Vision Fit

This feature supports Sibu's promise to help developers move faster with AI without lowering quality. It gives agents a clearer answer to “where should this work go?” before they start designing or changing code, which reduces arbitrary folder choices, vague architecture decisions, and cross-module spaghetti.

The change also fits Sibu's philosophy of strong defaults without a cage. Deep Modules should guide top-level code organization, but they should not force DDD, Hexagonal Architecture, services, packages, layers, or a specific framework. They create a durable module map that later architecture choices can structure internally.

## Deep Module

- **AI Development Pipeline:** Primary context. This feature changes a core pipeline stage and the handoffs from product vision into feature briefs, technical designs, implementation plans, and execution.
- **Guidance Library:** Supporting context. The refactor is delivered through reusable Sibu skill templates and architecture guidance.
- **Workflow Adoption & Maintenance:** Supporting context only if template metadata, managed skill names, or sync behavior must change so existing projects can review the renamed templates safely.

## User / Customer Problem

The Product Context Map concept was introduced to help downstream agents preserve durable product responsibility boundaries. In practice, the wording now creates confusion because it repeatedly says the map is not an implementation structure, while the user's actual goal is to use the map to organize implementation work.

Users need a clearer artifact that says:

- these are the durable top-level modules the app should use;
- each module owns a specific product responsibility;
- modules are deep enough to absorb multiple features over time;
- modules are architecture-agnostic internally;
- downstream skills should preserve these module boundaries during design and implementation.

Without this refactor, agents may keep treating the map as a loose product-planning artifact instead of a practical guide for code organization.

## Business Goal

Increase pipeline clarity and implementation consistency by making Deep Modules the shared boundary language between product planning and code organization. The goal is for users and agents to move from product vision to feature work with a concrete, durable module map that prevents scattered implementation decisions while remaining flexible across architectures.

## Target User / Scenario

This feature is for developers and teams using Sibu's product-to-code pipeline.

A typical scenario:

1. The user creates or updates `docs/product-vision.md`.
2. The user asks Sibu to create a Deep Module Map.
3. The new `deep-module-map-writer` skill interviews the user and writes `docs/deep-module-map.md`.
4. The map lists suggested top-level implementation modules, each with a stable responsibility boundary and module slug.
5. A later feature brief names the Deep Module or Modules that own the feature.
6. Technical design chooses how those modules are organized internally based on the selected architecture.
7. Implementation planning and execution keep code changes inside the approved module boundaries unless cross-module work is explicit.

## Proposed Experience

Sibu renames and repurposes the Product Context Map stage:

```txt
product vision
-> deep module map
-> feature brief
-> technical design
-> optional UX design
-> epics / user stories
-> AI implementation plan
-> AI executor
```

The Deep Module Map should answer:

```txt
What top-level implementation modules should this app have, and what product responsibility does each module own?
```

The map should be architecture-agnostic. A Deep Module may later contain vertical slices, domain/application/infra layers, MVC-style files, package boundaries, or another internal structure. The map should not require DDD, Hexagonal Architecture, microservices, package-per-module, database-per-module, or team ownership.

Each Deep Module should include:

- human-readable module name;
- suggested module slug for code organization;
- purpose;
- what it owns;
- what it does not own;
- key scenarios;
- related modules;
- boundary notes.

Downstream skills should use Deep Modules as the source of truth for implementation ownership. Feature briefs should name the relevant Deep Modules. Technical designs should translate selected Deep Modules into concrete architecture, folder, file, command, adapter, or package boundaries. Implementation planners and executors should preserve the selected module boundaries.

## MVP Scope

- Rename `product-context-map-writer` to `deep-module-map-writer`.
- Rename the standard artifact from `docs/product-context-map.md` to `docs/deep-module-map.md`.
- Replace user-facing language:
  - “Product Context Map” → “Deep Module Map”
  - “Product Context” → “Deep Module”
  - “contexts” → “modules” where the meaning is the pipeline artifact.
- Refactor the map-writer skill so its main output is an architecture-agnostic list of suggested implementation modules.
- Include `Suggested module slug` or equivalent in each Deep Module.
- Update the pipeline order in Sibu instructions and skill routing.
- Update all pipeline skills that currently require or mention `docs/product-context-map.md`:
  - feature brief writer;
  - technical design writer;
  - Scrum planner;
  - AI implementation planner;
  - AI implementation plan executor;
  - any UX guidance that references the artifact.
- Update architecture skills that currently mention Product Contexts:
  - `command-pattern`;
  - `ddd-hexagonal`.
- Ensure `command-pattern` places vertical slices inside the selected Deep Module.
- Ensure `ddd-hexagonal` treats each Deep Module as the default top-level module boundary, while still allowing each module's internals to follow DDD + Hexagonal patterns.
- Update Sibu template manifest metadata and sync notes for renamed/changed templates.

## Out of Scope

- Choosing a specific internal architecture for every Deep Module.
- Forcing all projects to use DDD, Hexagonal Architecture, Command Pattern, microservices, or package-per-module.
- Building automated code scaffolding for module folders.
- Providing backwards compatibility or migration support for `docs/product-context-map.md`. The old concept should be removed rather than preserved.
- Updating production code beyond what is necessary to manage renamed templates, if any.
- Creating the final Sibu `docs/deep-module-map.md` content as part of this feature unless a later stage explicitly asks for it.
- Redesigning unrelated pipeline stages beyond terminology, required inputs, and handoff behavior.

## Success Signals

- Users understand that the map's purpose is to define suggested top-level implementation modules.
- Agents stop saying the map is “not a folder structure” in a way that undermines its practical value.
- Feature briefs name Deep Modules instead of Product Contexts.
- Technical designs translate Deep Modules into concrete implementation boundaries.
- Architecture skills consistently place code inside selected Deep Modules before choosing internal structure.
- Implementation plans and executors preserve Deep Module boundaries.
- Existing Product Context terminology is removed rather than treated as a supported legacy concept.
- The renamed skill and artifact feel simpler and less DDD-confusing to users.

## Business-Level Acceptance Criteria

- Given a user asks to create the module map, the workflow routes to `deep-module-map-writer`, not `product-context-map-writer`.
- Given `docs/product-vision.md` exists, `deep-module-map-writer` can create or update `docs/deep-module-map.md`.
- Given the Deep Module Map is written, it lists suggested implementation modules with names, slugs, ownership, exclusions, scenarios, related modules, and boundary notes.
- Given a downstream skill requires module ownership context, it reads or trusts `docs/deep-module-map.md` instead of `docs/product-context-map.md`.
- Given a feature brief is created, it names one or more existing Deep Modules.
- Given a requested feature does not fit any existing Deep Module, the feature brief skill stops and directs the user to update the Deep Module Map first.
- Given a technical design is created, it explains how the selected Deep Module or Modules affect implementation boundaries.
- Given `command-pattern` is used, vertical slices are placed inside the relevant Deep Module.
- Given `ddd-hexagonal` is used, each Deep Module is treated as the default top-level module boundary while internal domain/application/infra structure remains architecture guidance.
- Given existing templates refer to Product Context Map or Product Contexts, those references are renamed or rewritten to Deep Module Map and Deep Modules.
- Given template files are renamed or changed, Sibu sync notes explain that the old Product Context Map concept has been replaced by the Deep Module Map.

## Risks / Tradeoffs

- Removing the old Product Context Map concept without compatibility may surprise existing users, but the product direction intentionally favors a clean conceptual reset.
- “Deep Module” is more implementation-oriented, so guidance must prevent shallow technical buckets like `utils`, `api`, `db`, or `services` from becoming top-level modules.
- Some projects may not want physical module folders. The guidance should say Deep Modules are suggested implementation modules and default top-level boundaries, not mandatory scaffolding automation.
- Updating terminology across many skills may create inconsistent wording if not handled in one focused pass.
- If the refactor becomes too architectural, it may overstep the product-planning role of early pipeline stages.

## Open Questions

- None currently.
