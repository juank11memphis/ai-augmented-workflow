---
name: ddd-hexagonal
description: Use this skill for back-end architecture decisions in projects that selected DDD and Hexagonal Architecture.
---

# ddd-hexagonal

Use this skill for back-end architecture decisions in projects that selected DDD and Hexagonal Architecture.

Use it when deciding where code belongs, how to structure a feature, whether a port is needed, or how to keep business logic separated from infrastructure.

This skill is backend-focused. It does not cover frontend component architecture, React patterns, or UX concerns.

## Use this skill for

- backend feature design
- domain/application/infra placement
- use case design
- port and adapter decisions
- repository and external service boundaries
- server-side refactors that affect architecture
- reviewing whether backend code respects DDD + Hexagonal Architecture

## Main rule

> **Keep the domain pure, let the application orchestrate, let adapters translate, and keep dependencies pointing inward.**

If a simpler structure preserves clear boundaries, prefer the simpler structure.


## Downstream Sibu workflow handoff

Use this selected architecture model as binding guidance for technical design, implementation planning, execution, and review. Keep the guidance concise in downstream artifacts, but make the boundary decisions explicit.

### Technical design

Design use-case-first and domain-first. Name the owning Deep Module, then identify the domain concepts, invariants, and application use cases before choosing infrastructure details. Place business rules and invariants in `domain/**`; place orchestration, transaction coordination, input/output contracts, and outgoing ports in `application/**`; place repositories, SDK clients, persistence mappings, and anti-corruption translation in `infra/**`; keep entrypoints as driving adapters. Dependencies must point inward: entrypoint -> application -> domain + ports, and infrastructure -> application/domain contracts.

### Implementation planning

Plan slices around one externally meaningful use case at a time. For each slice, sequence the work as domain model/invariants first, application use case and ports second, infrastructure adapters third, and framework or CLI entrypoints last. Call out any cross-module dependency explicitly instead of sharing internals or inventing new modules.

### Implementation execution

Implementation agents should keep framework, database, filesystem, SDK, and transport types out of domain and application boundaries unless they are explicit adapter translations. Define application orchestration and ports before infrastructure adapters, then wire entrypoints last. Avoid direct entrypoint-to-database calls, infrastructure imports from the domain, anemic pass-through use cases that hide business rules in adapters, and broad shared services created only for convenience.

### Review and compliance

Reviewers should check that use cases and domain concepts were designed before adapters, invariants live in the domain, application orchestration owns the workflow, ports describe required external capabilities, adapters translate at the boundary, entrypoints stay thin, and all dependencies point inward. If a business rule changes because an external DTO, database row, or framework object changed, the hexagonal boundary is leaking.

## Deep Module compatibility

Deep Modules answer “where does this implementation work belong?” DDD + Hexagonal answers “how is that module structured internally?”

When `docs/deep-module-map.md`, a feature brief, or a technical design names Deep Modules, treat each selected Deep Module as the default top-level implementation boundary before choosing domain/application/infra placement. Prefer placing domain concepts, use cases, ports, and adapters under the selected module's ownership. If work crosses modules, name the owning module for each part and keep dependencies explicit.

A Deep Module may contain `domain`, `application`, and `infra`/adapter concerns, but it is not automatically a DDD Bounded Context, service, package, database boundary, or team boundary. Projects that already use DDD Bounded Contexts may align a Bounded Context one-to-one with a Deep Module when that preserves the model and language.

Do not invent new Deep Modules during design or implementation. If work does not fit the approved modules, stop and route the decision back to the `deep-module-map-writer` workflow.

Do not treat shallow technical buckets such as `utils`, `api`, `db`, or `services` as Deep Modules. A Deep Module should expose a small, stable interface while hiding meaningful implementation complexity; product alignment can help explain why work changes together, but product category alone does not make a module deep.

## The layers

### Domain
The domain contains business concepts, rules, and invariants.

Domain should contain:
- business concepts
- domain rules
- invariants
- domain language

Domain should not contain:
- framework code
- database concerns
- SDK clients
- filesystem code
- transport-specific request/response shapes

### Application
The application layer coordinates use cases.

Application should contain:
- use cases
- application orchestration
- outgoing ports when external capabilities are needed
- incoming ports when they add clarity

Application should not contain:
- infrastructure implementations
- low-level SDK or DB details
- framework entrypoint logic

### Infrastructure
Infrastructure contains technical details and adapter implementations.

Infrastructure should contain:
- repository implementations
- external API clients
- SDK integrations
- filesystem/storage integrations
- queue or messaging integrations

Infrastructure should not own business rules.

## Dependency rule

> **Dependencies point inward. Implementations point outward.**

This means:
- driving code depends on the application boundary
- the application depends on domain concepts and outgoing ports
- infrastructure depends on application/domain contracts to implement them
- the domain depends on nothing outside itself

If business logic needs a DB client, SDK response, HTTP object, or framework context directly, the boundary is probably wrong.

## Framework adapter dependency rule

Framework code is a driving adapter. Examples include HTTP routes, controllers, Next.js App Router files, server actions, CLI commands, queue consumers, jobs, webhooks, RPC handlers, and GraphQL resolvers.

Framework adapters may adapt framework input/output and call the application/orchestration boundary. They must not directly import or call:

- repository implementations or database clients
- SDK clients or infrastructure adapters
- persistence models or external API response shapes
- domain internals that perform a business workflow outside an application use case
- other delivery/framework adapters

Allowed flow:

```txt
framework adapter -> application use case / orchestration API -> domain + ports
infrastructure adapter -> application/domain port contracts
```

Forbidden flow:

```txt
framework adapter -> infrastructure / database / SDK / repository implementation
framework adapter -> domain workflow internals that bypass the application boundary
```

When planning or implementing a feature, name the application/orchestration API each framework entrypoint is allowed to call. Add an explicit allow/deny import list when the boundary could be ambiguous.

## Domain modeling: entity, value object, or neither

Do not force DDD labels onto every concept. Use them only when they buy clarity, express real business meaning, or protect invariants.

### Use an entity when identity matters
Model something as an entity when:
- it has continuity over time
- it can change while remaining the same conceptual thing
- the business cares which specific instance it is
- identity matters more than raw field equality

Examples often include users, playlists, subscriptions, or other concepts with lifecycle and identity.

### Use a value object when value and invariants matter
Model something as a value object when:
- identity does not matter
- equality is based on value
- the concept has validation or invariants worth protecting
- wrapping a primitive or object makes the domain clearer

Examples often include email addresses, money, ranges, normalized names, or other validated domain values.

### Use neither when the concept is simple and gains little from extra modeling
Do not create an entity or value object when:
- the data is simple and obvious
- there are no meaningful invariants to protect
- identity is not important
- a plain type, plain object, or application-level DTO is enough
- introducing a domain type would add ceremony without improving understanding

### Rule
> **Prefer the lightest model that preserves meaning and invariants.**

## Practical project mapping

Use this default mapping when the project does not already have a clearer convention:

```text
/src/modules/<module-slug>/domain/**       # Domain concepts and rules
/src/modules/<module-slug>/application/**  # Use cases and application orchestration
/src/modules/<module-slug>/infra/**        # Technical implementations and external integrations
```

Structure each application use case with files, not nested subfolders:

```text
/src/modules/<module-slug>/application/<usecase-slug>/input.*    # Input DTO/schema/command shape
/src/modules/<module-slug>/application/<usecase-slug>/output.*   # Output DTO/result shape
/src/modules/<module-slug>/application/<usecase-slug>/usecase.*  # Use case orchestration
/src/modules/<module-slug>/application/<usecase-slug>/ports.*    # Ports required by this use case
```

Use the project language's normal extension, such as `.ts`, `.go`, or `.py`. Keep ports local to the use case by default. Extract shared application ports only when multiple use cases truly need the same abstraction. Do not create `input/`, `output/`, `usecase/`, or `ports/` folders unless an existing project convention already requires it.

Entrypoints such as routes, jobs, or handlers should remain thin driving adapters that call application behavior inside the selected Deep Module.

## Ports and adapters

### Use ports where they buy clarity
Introduce a port when the application needs a capability but should not depend on its implementation.

Good reasons:
- isolation
- testability
- clearer boundaries

Bad reasons:
- habit
- ceremony
- abstraction for its own sake

### Adapters translate
Adapters translate between the application model and external systems.

Typical driven adapters:
- repository implementations
- external API clients
- storage clients
- SDK wrappers

Adapters should hide technical details rather than leak them inward.

### Anti-corruption adapters

When integrating with an external API, SDK, database shape, file format, or third-party model, treat the infrastructure adapter as the anti-corruption layer. Translate external language and data shapes into application/domain concepts at the boundary.

Place anti-corruption translation in infrastructure adapter files by default:

```text
/src/modules/<module-slug>/infra/<adapter-slug>.*        # Adapter and translation logic
/src/modules/<module-slug>/infra/<adapter-slug>.types.*  # External DTOs/types when useful
```

Do not create a separate `acl/` folder by default. Split translation into extra infrastructure-local files only when the adapter becomes too large.

External DTOs, SDK response types, database rows, and third-party vocabulary must not leak into `domain/**` or use case `input.*` / `output.*` unless the product language truly matches the external language. If changing an external API response would force changes in domain entities, value objects, or use case boundaries, the anti-corruption boundary is leaking.

## Use cases, application services, and domain services

### Use case

A use case represents one externally meaningful backend capability triggered by a route, CLI command, job, handler, or other driving adapter.

Place each use case at:

```text
/src/modules/<module-slug>/application/<usecase-slug>/usecase.*
```

Its sibling files should define its boundary:

```text
/src/modules/<module-slug>/application/<usecase-slug>/input.*
/src/modules/<module-slug>/application/<usecase-slug>/output.*
/src/modules/<module-slug>/application/<usecase-slug>/ports.*
```

A use case should:
- orchestrate domain logic and required ports explicitly
- stay readable and focused
- express one meaningful application action

A use case should not:
- become a dumping ground for unrelated helpers
- hide infrastructure details inline
- absorb framework behavior that belongs in adapters

### Application service

An application service is reusable application-layer orchestration shared by multiple use cases. Use it only when multiple use cases truly need the same orchestration, transaction coordination, or port coordination. Do not create application services just to shorten one use case; prefer private helpers first.

Place application services under:

```text
/src/modules/<module-slug>/application/services/<service-slug>.*
```

Application services may depend on domain concepts and application ports, but must not depend on infrastructure implementations, SDK clients, database clients, or framework request/response objects.

### Domain service

A domain service contains pure business behavior that does not naturally belong on one entity or value object. Use it when the rule is domain language, needs multiple domain concepts, and has no dependency on ports, databases, SDKs, frameworks, or technical time/randomness unless those are passed in as values.

Place domain services under:

```text
/src/modules/<module-slug>/domain/services/<service-slug>.*
```

Domain services must stay pure and should not orchestrate use cases or external capabilities.

Rule of thumb:
- Use case: “Do this application action.”
- Application service: “Reuse this application orchestration.”
- Domain service: “Evaluate or perform this pure domain rule.”

## Simplicity rule

- Use the fewest layers that preserve clear boundaries.
- Do not add ports, services, or abstractions unless they clearly improve clarity or isolation.
- Do not split concepts just to look architecturally sophisticated.
- Architecture should reduce confusion, not create it.

## Boundary tests

When deciding where code belongs, ask:

1. Is this business logic or technical plumbing?
2. Does this concept exist in the business, or only because of a framework, API, or DB?
3. Would this code still make sense if we changed the underlying technology?
4. Is this orchestrating behavior, or implementing a technical detail?
5. Is this abstraction buying clarity, or only adding indirection?

## Common mistakes

### 1. Putting business logic in entrypoint code
Route handlers, jobs, or other entrypoints should trigger application behavior, not contain meaningful business rules.

### 2. Letting use cases depend directly on SDKs, DB clients, or framework objects
This collapses the application boundary.

### 3. Treating every helper as a domain concept
This makes the domain noisy and artificial.

### 4. Over-abstracting with too many ports and interfaces
This creates ceremony instead of clarity.

### 5. Letting technical data shapes define the internal model
This allows infrastructure concerns to leak inward.

### 6. Creating layers without real responsibility
This grows file structure without improving understanding.

## Practical default

When unsure, prefer:
1. clear boundaries
2. simple code
3. explicit orchestration
4. minimal necessary abstraction
5. business concepts over technical leakage
