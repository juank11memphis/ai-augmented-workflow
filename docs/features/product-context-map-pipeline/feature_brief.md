# Product Context Map Pipeline Feature Brief

## Summary

Sibu should add a required **Product Context Map** step to the AI development pipeline before feature briefs. The Product Context Map is an architecture-agnostic, DDD-inspired artifact that names the major responsibility areas a product deals with, clarifies their boundaries, and gives downstream AI workflow skills a stable vocabulary for deciding where new work belongs. This feature introduces a new required `product-context-map-writer` skill and updates Sibu’s built-in/local planning and architecture skills so Product Contexts guide feature definition, technical design, implementation planning, and execution.

## Product Vision Fit

This feature directly supports Sibu’s promise of helping developers move faster without lowering quality or surrendering control. It strengthens the small-work pipeline by adding a shared product-level structure before individual features are defined. It also reinforces Sibu’s emphasis on clean, maintainable work: agents should not invent arbitrary modules or folders while implementing features; they should respect stable product responsibility boundaries chosen intentionally by the user.

The feature keeps Sibu flexible by avoiding architecture lock-in. Product Contexts decide **where work belongs**. Architecture skills decide **how that context is structured internally**.

## User / Customer Problem

Today, Sibu’s pipeline can guide a user from product vision to feature brief, technical design, stories, implementation plan, and execution. However, there is no required artifact that identifies the durable responsibility areas of the product before feature work begins.

Without that shared map:

- feature briefs may define work without saying which product area owns it;
- technical designs may choose architecture patterns without stable context boundaries;
- implementation plans may organize code inconsistently;
- architecture skills may invent generic top-level modules that do not reflect the product;
- agents may silently create new “contexts” during feature work without user awareness.

Users need a lightweight way to identify product responsibility boundaries early, then have the rest of the AI workflow respect those boundaries consistently.

## Business Goal

Increase trust and consistency across Sibu’s AI development pipeline by making product responsibility boundaries explicit before feature work starts. The goal is to help users produce cleaner technical designs, better-scoped implementation plans, and more coherent code organization while preserving human control over major product structure decisions.

## Target User / Scenario

This feature is for developers and teams using Sibu to guide AI-assisted development from product vision through implementation.

A typical scenario:

1. The user creates or updates `docs/product-vision.md`.
2. The user creates `docs/product-context-map.md` with the new required `product-context-map-writer` skill.
3. Later, the user asks Sibu to write a feature brief.
4. The feature brief skill checks the Product Context Map.
5. If the feature fits existing Product Contexts, the brief names them.
6. If the feature requires a new context, the skill stops and instructs the user to update the Product Context Map first.
7. Technical design and implementation planning then combine the selected Product Contexts with the chosen architecture guidance.

## Proposed Experience

Sibu introduces Product Context Maps as a first-class pipeline artifact:

```txt
product-vision
-> product-context-map
-> feature brief
-> technical design
-> optional UX design
-> epics / user stories
-> AI implementation plan
-> AI executor
```

The Product Context Map should define product-level contexts, not implementation structure. Each Product Context should describe:

- its name;
- its purpose;
- what it owns;
- what it does not own;
- related contexts;
- user or workflow scenarios where it matters;
- any naming or boundary notes that downstream work should respect.

Product Contexts should follow a **deep modules** principle: they should expose a clear, simple boundary while allowing rich internal behavior. A context should not be created for every small feature, screen, command, or folder. It should represent a durable area of product responsibility.

Feature brief creation should be context-aware. A feature brief must identify one or more existing Product Contexts. If no existing Product Context fits, the feature brief skill must stop completely and tell the user to update `docs/product-context-map.md` first. It should include a suggested prompt the user can give the LLM to add or revise the missing context.

Technical design should then translate Product Contexts through the selected architecture approach. For example:

- with DDD + Hexagonal Architecture, a context may be organized internally around `domain`, `application`, and `infra`;
- with Layered Architecture, the same context may be organized around `presentation`, `services`, `repositories`, or similar layers.

The Product Context remains stable; the architecture determines the internal structure.

## MVP Scope

- Add a new required `product-context-map-writer` skill.
- Define `docs/product-context-map.md` as the standard artifact path.
- Make `product-context-map-writer` a required Sibu-managed skill installed with the rest of the mandatory workflow skills.
- Update Sibu’s built-in/local pipeline skills so Product Contexts are fully integrated:
  - `feature-brief-writer` reads the Product Context Map before drafting;
  - `feature-brief-writer` adds a required Product Context section to feature briefs;
  - `feature-brief-writer` stops if a feature needs a new context and instructs the user to update the map first;
  - `technical-design-writer` reads the feature’s Product Contexts and combines them with architecture guidance;
  - `ai-implementation-planner` preserves Product Context boundaries in implementation plans;
  - `ai-implementation-plan-executor` follows Product Context guidance during execution;
  - the existing DDD + Hexagonal architecture skill and `command-pattern` respect Product Contexts when present.
- Add guidance that Product Contexts are architecture-agnostic and should not be treated as a specific framework, folder structure, service boundary, or DDD requirement.
- Add deep-module guidance so contexts are durable responsibility areas rather than shallow feature buckets.
- Require `product-context-map-writer` to interview deliberately: ask one focused question at a time until it has practical understanding and explicit user alignment before writing or updating the map.
- Ensure downstream skills treat Product Contexts as the answer to “where does this belong?” and architecture skills as the answer to “how is this organized internally?”
- Update Sibu maintenance behavior so `sibu doctor` and `sibu sync` understand the required managed `product-context-map-writer` skill, including missing, outdated, or locally modified skill files.
- Keep new and updated skill instructions token-conscious: quality and correctness come first, but prompts should stay as concise as possible and avoid unnecessary repetition.

## Out of Scope

- Creating Sibu’s own product-specific context map content as part of this feature; the user will later use the new skill to define Sibu’s actual contexts.
- Managing `docs/product-context-map.md` as a Sibu template. The file is the user’s product artifact, created or updated by the skill, not a Sibu-managed workflow template.
- Defining or enforcing a specific software architecture.
- Building code-generation automation for folder structures.
- Supporting third-party or custom architecture skills.
- Creating full DDD tactical modeling artifacts such as aggregates, entities, repositories, domain events, or ubiquitous language glossaries unless a separate feature asks for them.
- Replacing technical design, UX design, epics, stories, or implementation plans.

## Success Signals

- A user can create a Product Context Map before starting feature work through a guided, one-question-at-a-time interview.
- New feature briefs consistently name existing Product Contexts.
- Feature brief generation stops instead of inventing a new Product Context silently.
- The stop message gives the user clear instructions and a usable prompt for updating the Product Context Map.
- Technical designs clearly explain how the feature’s Product Contexts interact with the selected architecture guidance.
- Implementation plans and executors preserve context boundaries during code work.
- The existing DDD + Hexagonal architecture skill and `command-pattern` respect Product Contexts when present.
- `sibu doctor` reports required `product-context-map-writer` skill drift, and `sibu sync` can help users review or repair that skill through the normal managed-template workflow.
- New and updated skills remain concise enough to preserve context budget while maintaining output quality.
- Users can understand the same context names across product planning, technical design, implementation planning, and code organization.

## Business-Level Acceptance Criteria

- Given `product-context-map-writer` is a required managed skill, when Sibu checks workflow health, missing or outdated Product Context Map skill support is visible to the user.
- Given `docs/product-context-map.md` exists, when a user asks for a feature brief, the feature brief skill reads it before drafting.
- Given `docs/product-context-map.md` is missing, when a downstream skill needs it, the skill stops and tells the user to create it with `product-context-map-writer`.
- Given a requested feature fits one or more existing Product Contexts, the generated feature brief identifies those contexts explicitly.
- Given a requested feature does not fit existing Product Contexts, the feature brief skill does not draft the brief and instead instructs the user to update the Product Context Map first.
- Given the feature brief names Product Contexts, the technical design skill uses those contexts when explaining where the feature belongs.
- Given the DDD + Hexagonal architecture skill or `command-pattern` is used during technical design or implementation planning, the architecture guidance is applied inside or around the selected Product Contexts rather than replacing them.
- Given an implementation plan is created, the plan preserves the Product Context boundary and avoids scattering work into unrelated contexts without explanation.
- Given an implementation executor works through a plan, it treats Product Context guidance from the feature brief and technical design as part of the execution contract.
- Given a Product Context is proposed, the guidance encourages deep, durable responsibility boundaries instead of shallow feature-, screen-, or folder-level contexts.
- Given the Product Context Map direction is incomplete or ambiguous, `product-context-map-writer` asks one focused question at a time and does not write the map until the user confirms alignment.
- Given a skill is created or updated for this feature, its instructions are concise, avoid duplicated guidance, and preserve context budget unless additional detail is necessary for quality.

## Risks / Tradeoffs

- Users may confuse Product Contexts with DDD Bounded Contexts and assume they must adopt DDD. The skill guidance must clearly state that Product Contexts are DDD-inspired but architecture-agnostic.
- Users may create too many shallow contexts. Deep-module guidance is necessary to keep the map useful.
- Users may treat the Product Context Map as fixed forever. The workflow should allow intentional updates while preventing silent invention during feature brief creation.
- Architecture skills may become inconsistent if Product Context compatibility is added unevenly. First implementation should update only the existing DDD + Hexagonal architecture skill and `command-pattern`, using a shared rule: contexts define ownership; architecture defines internal structure.
- Stopping feature brief generation when a new context is needed adds friction, but the friction is intentional because context creation is a product-structure decision that should remain under user control.
- Adding Product Context guidance across many skills can increase prompt size. The implementation should prefer compact shared language and avoid restating the full concept in every skill unless necessary.

## Open Questions

- None currently.
