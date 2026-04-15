---
name: command-pattern
description: Use this skill to design and implement software features as independent, end-to-end Vertical Slices using the Command Pattern, Hexagonal Architecture, and DDD principles.
---

# Skill: Command-Oriented Vertical Slice Architect

## Description
Use this skill to design and implement software features as independent, end-to-end Vertical Slices. This approach combines the Command Pattern with Hexagonal Architecture and DDD principles. It ensures that business logic is decoupled from transport layers (CLI, API) and infrastructure (Databases, Third-party SDKs).

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
  ├── /entrypoints          # Driving Adapters (The "Edges")
  │    └── /cli             # Parses flags/args -> creates Command -> calls Handler
  ├── /features             # THE HEXAGON (Domain & Application Logic)
  │    └── /feature-name    # e.g., "archive-project"
  │         ├── command     # The Input DTO
  │         ├── handler     # The Orchestration logic
  │         ├── ports       # Interfaces required by the handler
  │         └── result      # The Output DTO/Contract
  ├── /shared               # Universal logic only
  │    ├── /domain          # Global Entities (e.g., "User", "Project")
  │    └── /errors          # Global error definitions
  └── /infrastructure       # Driven Adapters (Implementation Details)
       ├── /persistence     # DB implementations of feature Ports
       └── /clients         # External API implementations of feature Ports
```

---

## 3. Operational Rules for Implementation

### Rule 1: Feature Isolation
A feature folder must never import from another feature folder. If two features need the same logic, that logic must be promoted to the /shared directory.

### Rule 2: Dependency Inversion
The Handler must never instantiate a database, a file system, or a network client. It must receive its dependencies (via Ports) through its constructor or initialization.

### Rule 3: Transport Agnosticism
The Handler must be "blind" to the entrypoint. It should not know if it is being triggered by a CLI terminal, a Cron job, or a REST API. It returns domain results, never transport-specific codes (e.g., no HTTP 404s or CLI exit codes).

### Rule 4: Thin Entrypoints
Entrypoints (CLI/API) are responsible for Syntactic Validation (is the input the right type?). Handlers are responsible for Semantic Validation (does this operation make sense in the current state of the system?).

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
- [ ] Folder Integrity: Does the feature folder contain the Command, Handler, and Ports?
- [ ] Dependency Direction: Does the infrastructure layer depend on the feature ports, and not the other way around?
