---
name: layered-architecture
description: Use this skill for smaller apps that need lightweight separation of concerns with controllers, services, models, and repositories.
---

# layered-architecture

Use this skill for smaller apps that need basic separation of concerns.

This is Sibu's pragmatic layered architecture guidance. It is not the only valid meaning of “Layered Architecture”; it is the lightweight shape Sibu recommends when a project needs clearer boundaries but not a full domain-architecture framework.

## Main rule

> **Controllers adapt input, services coordinate behavior, models represent core concepts, and repositories hide persistence details.**

Keep the layers useful, not ceremonial. If splitting a small function across layers makes the code harder to understand, prefer the simpler code.


## Downstream Sibu workflow handoff

Use this selected architecture model as binding guidance for technical design, implementation planning, execution, and review. Keep the design lightweight, but make layer ownership and dependency direction clear.

### Technical design

Design the user-facing operation and service responsibility first, then decide which models and repositories the service needs. Business rules and workflow orchestration belong in services, simple invariants and meaningful states belong in models, persistence details belong in repositories, and framework or transport adaptation belongs in controllers. Dependencies should flow controller -> service -> repository and service -> model; repositories may map storage records to models but should not own workflows.

### Implementation planning

Plan work by feature behavior, not by sweeping all controllers or all repositories at once. For each slice, sequence the service contract and business behavior first, model changes second, repository interface/implementation third, and controller wiring last. Keep the layer split proportional: use existing project folders when clear and avoid adding layers where a small function stays easier to understand.

### Implementation execution

Implementation agents should keep controllers thin, services framework-free, repositories persistence-focused, and models meaningful. Avoid controller-to-repository shortcuts, services that embed SQL/ORM/SDK calls, repositories that return raw storage details to services, models that import controllers or repositories, and miscellaneous service/helper bags that hide unrelated behavior.

### Review and compliance

Reviewers should check that controllers only adapt input/output and call services, services coordinate business behavior without framework objects, repositories hide data access and persistence mappings, models express useful concepts or states without over-modeling, and dependency flow follows the approved layer direction. If the layer split makes a small change harder to understand, simplify while preserving controller/service/repository boundaries.

## Layer responsibilities

### Controllers

Controllers are entrypoints. They adapt the outside world into application calls.

Controllers may:

- parse request, CLI, job, or UI-facing input
- call services
- translate service results into response, CLI, or UI-facing output
- handle transport-specific validation and formatting

Controllers should not:

- own business rules
- talk directly to persistence
- coordinate multi-step business behavior that belongs in a service
- leak framework-specific objects into services

### Services

Services coordinate application behavior and business rules.

Services may:

- run use-case or workflow logic
- validate business conditions
- coordinate models and repositories
- return plain results that controllers can adapt

Services should not:

- depend on framework request/response objects
- embed SQL, ORM, SDK, or filesystem details directly
- become generic “miscellaneous helper” bags

### Models

Models represent core data shapes or business concepts.

Models may:

- define meaningful application data structures
- contain simple validation or derived behavior when it clarifies the concept
- make important states and invariants explicit

Models should not:

- mirror persistence tables blindly when that hides business meaning
- know about controllers, framework concerns, or repository implementations
- become over-modeled when a plain type or object is enough

### Repositories

Repositories hide persistence and data-access details.

Repositories may:

- load and save models or data shapes
- translate between storage records and application-facing data
- contain SQL, ORM, filesystem, or external data-access details

Repositories should not:

- own business workflows
- expose low-level persistence details to services
- import controllers or transport-layer code

## Dependency direction

Use this default flow:

```txt
controller -> service -> repository
service -> model
repository -> model or storage mapping
```

Avoid these flows:

```txt
controller -> repository
service -> controller
model -> controller
repository -> service
```

## Practical project mapping

Use the project's existing folders when they are already clear. If no convention exists, this simple shape is enough:

```text
src/controllers/**    # entrypoints and adapters
src/services/**       # application behavior and business rules
src/models/**         # core data shapes and business concepts
src/repositories/**   # persistence and data access
```

For modular projects, place those layers inside the owning module instead:

```text
src/modules/<module-slug>/controllers/**
src/modules/<module-slug>/services/**
src/modules/<module-slug>/models/**
src/modules/<module-slug>/repositories/**
```

## Review checklist

- Does each controller stay thin and call services instead of persistence?
- Does each service coordinate behavior without depending on framework objects?
- Do repositories hide data-access details from services?
- Are models meaningful without unnecessary ceremony?
- Is the layer split making the app easier to understand?
