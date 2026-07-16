---
name: command-pattern
description: Use this skill to design and implement software features as independent, end-to-end Vertical Slices using the Command Pattern, Hexagonal Architecture, and DDD principles.
---

# Skill: Command-Oriented Vertical Slice Architect

## Description
Use this skill to design and implement software features as independent, end-to-end Vertical Slices. This approach combines the Command Pattern with Hexagonal Architecture and DDD principles. It ensures that business logic is decoupled from transport layers (CLI, API) and infrastructure (Databases, Third-party SDKs).

---


## Downstream Sibu workflow handoff

Use this selected architecture model as binding guidance for technical design, implementation planning, execution, and review. Downstream artifacts should make the command boundary and execution flow explicit without adding ceremony that does not protect the slice.

### Technical design

Design the executable operation first. Name the owning Deep Module and feature slice, then define the Command intent, Result contract, Handler responsibilities, required Ports, driving entrypoints, and driven Adapters. Business rules and orchestration belong in the Handler or domain objects it coordinates; infrastructure behavior belongs behind Ports in adapters; entrypoints only adapt transport input into Commands and translate Results. Dependencies flow entrypoint -> Command -> Handler -> Ports, with adapters implementing Ports from outside the slice.

### Implementation planning

Plan each story as one or more end-to-end command slices. For each slice, sequence work as Command and Result shape first, Port contracts second, Handler orchestration and business validation third, Adapter implementations fourth, and entrypoint wiring last. Keep tests aligned to that sequence: handler tests with fake ports before adapter or transport tests.

### Implementation execution

Implementation agents should build vertical slices instead of technical-layer batches. Avoid handlers that instantiate databases, clients, or framework objects; entrypoints that call repositories directly; commands with behavior; ports shared too early across unrelated slices; and feature slices importing another slice's internals. Use composition/bootstrap code for wiring concrete adapters into handlers.

### Review and compliance

Reviewers should check that every operation has an explicit Command, focused Handler, Result, and required Ports; handlers are transport-agnostic; adapters implement ports without leaking SDK/database shapes inward; entrypoints are thin; and dependencies follow the command flow. A change that requires touching unrelated feature slices or framework code to alter handler business behavior signals a boundary problem.

## Deep Module Compatibility

Deep Modules answer “where does this implementation work belong?” Command Pattern guidance answers “how is that work structured as command-oriented vertical slices inside the selected module?”

When `docs/deep-module-map.md`, a feature brief, or a technical design names Deep Modules, place each vertical slice inside the relevant Deep Module. The feature-local Command, Handler, Port, Adapter, and Result guidance still applies inside that module boundary.

Do not invent new Deep Modules during design or implementation. If work does not fit the approved modules, stop and route the decision back to the `deep-module-map-writer` workflow.

Do not treat shallow technical buckets such as `utils`, `api`, `db`, or `services` as Deep Modules. A Deep Module should expose a small, stable interface while hiding meaningful implementation complexity; product alignment can help explain why work changes together, but product category alone does not make a module deep.

---

## 1. The Component Contract
Every feature is defined by four distinct roles. This separation ensures that the "Core" logic remains pure and testable.

| Component | Responsibility | Constraints |
| :--- | :--- | :--- |
| **Command** | Represents Intent | A flat, immutable data structure. No logic, no dependencies. |
| **Handler** | Represents Execution | The orchestrator. Receives one Command, coordinates with Ports, and returns a Result. |
| **Port** | Represents Requirement | An interface defined inside the feature folder describing what the handler needs (e.g., SaveUserPort). |
| **Adapter** | Represents Implementation | The low-level code (SQL, HTTP Client) that satisfies a Port. |

---

## 2. Directory Structure (The "Vertical Slice" Blueprint)
Organize by Capability (what the system does) rather than Technical Layer (what the code is). This minimizes "shotgun surgery" and increases cohesion.

```text
/src
  ├── /entrypoints                  # Driving Adapters (The "Edges")
  │    └── /cli                     # Parses flags/args -> creates Command -> calls Handler
  ├── /modules                      # Deep Modules from docs/deep-module-map.md
  │    └── /module-slug             # e.g., "workflow-adoption"
  │         └── /feature-slice      # e.g., "archive-project"
  │              ├── command        # The Input DTO
  │              ├── handler        # The Orchestration logic
  │              ├── ports          # Interfaces required by the handler
  │              └── result         # The Output DTO/Contract
  ├── /shared                       # Universal logic only
  │    ├── /domain                  # Global Entities (e.g., "User", "Project")
  │    └── /errors                  # Global error definitions
  └── /infrastructure               # Driven Adapters (Implementation Details)
       ├── /persistence             # DB implementations of feature Ports
       └── /clients                 # External API implementations of feature Ports
```

Default slice paths:

```text
/src/modules/<module-slug>/<feature-slice>/command
/src/modules/<module-slug>/<feature-slice>/handler
/src/modules/<module-slug>/<feature-slice>/ports
/src/modules/<module-slug>/<feature-slice>/result
```

---

## 3. Operational Rules for Implementation

### Rule 1: Feature Isolation
A feature-slice folder must never import from another feature-slice folder. If two slices need the same logic, that logic must be promoted to the owning Deep Module or to /shared when it is truly universal.

### Rule 2: Dependency Inversion
The Handler must never instantiate a database, a file system, or a network client. It must receive its dependencies (via Ports) through its constructor or initialization.

### Rule 3: Transport Agnosticism
The Handler must be "blind" to the entrypoint. It should not know if it is being triggered by a CLI terminal, a Cron job, or a REST API. It returns domain results, never transport-specific codes (e.g., no HTTP 404s or CLI exit codes).

### Rule 4: Thin Entrypoints
Entrypoints (CLI/API) are responsible for Syntactic Validation (is the input the right type?). Handlers are responsible for Semantic Validation (does this operation make sense in the current state of the system?).

### Rule 5: Entrypoints Call Commands, Not Lower Layers
Entrypoints are driving adapters. Examples include CLI commands, HTTP routes, Next.js App Router files, server actions, queue consumers, jobs, webhooks, RPC handlers, and GraphQL resolvers.

An entrypoint may:
- adapt framework or transport input into a Command
- call the feature Handler directly, or call an application-level command dispatcher/orchestration API
- translate the Result into a framework or transport response

An entrypoint must not directly import or call:
- infrastructure adapters
- database clients or repository implementations
- SDK clients
- persistence models or external API response shapes
- another feature-slice's internals
- domain workflow logic that bypasses the Handler

Allowed flow:

```txt
entrypoint / framework adapter -> Command -> Handler / dispatcher -> Ports -> infrastructure adapters
```

Forbidden flow:

```txt
entrypoint / framework adapter -> infrastructure / database / SDK / repository implementation
entrypoint / framework adapter -> domain workflow internals that bypass the Handler
```

If dependency wiring needs infrastructure implementations, prefer a composition/bootstrap module or small factory that constructs the Handler. Keep request handling, command creation, and result translation separate from infrastructure behavior.

### Rule 6: Operational Behavior Uses Structured Logging
When workflows, command handlers, entrypoints, jobs, external calls, retries, state changes, or operational outcomes need logging, also use `structured-logging`. Keep this architecture guidance focused on boundaries and delegate logging policy to that skill.

---

## 4. Implementation Workflow
1. Define the Command: Identify the minimum data needed to represent the user's intent.
2. Define the Ports: Identify what external systems the handler needs to talk to. Define these as interfaces in the feature folder.
3. Implement the Handler: Write the coordination logic. Fetch entities, apply business rules, and use Ports to persist changes.
4. Wire the Adapter: Implement the concrete infrastructure code in the /infrastructure layer.
5. Connect the Entrypoint: In the CLI layer, map raw input to the Command and trigger the Handler.

---

## 5. Constraint Checklist for Agent Reviews
- [ ] Zero Leakage: Does the Handler contain CLI-specific code (like fmt.Printf or flags)?
- [ ] Interface-Driven: Does the Handler depend on a concrete Database class or an Interface (Port)?
- [ ] Folder Integrity: Does the Deep Module feature-slice folder contain the Command, Handler, and Ports?
- [ ] Dependency Direction: Does the infrastructure layer depend on the feature ports, and not the other way around?
