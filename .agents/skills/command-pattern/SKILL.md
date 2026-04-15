---
name: command-pattern
description: Use this skill when structuring actions, workflows, executable operations, command handlers, dispatch, request processing, or task execution with the Command Pattern.
---

# command-pattern

Use this skill when applying the Command Pattern to structure work as explicit executable operations.

Use it when deciding how to represent an action, where validation belongs, how command handlers should coordinate behavior, or how to keep request parsing separate from execution logic.

This skill is use-case agnostic. It can apply to CLIs, APIs, jobs, UI actions, workflow engines, developer tools, automation, or any codebase with named operations.

## Use this skill for

- command handler design
- operation/request processing
- action or task dispatch
- workflow orchestration
- queueable, retryable, auditable, or undoable operations
- separating entrypoint parsing from execution logic
- refactoring large procedural handlers into focused operations
- reviewing whether command code has clear responsibilities

## Main rule

> **Represent each meaningful operation explicitly, keep entrypoints thin, and put execution logic in focused command handlers.**

If a plain function is enough, use a plain function. Do not add command infrastructure unless it improves clarity, testability, dispatch, logging, retries, composition, or reuse.

## Core pieces

### Command

A command represents a request to perform one meaningful operation.

A command should contain:
- the input needed to execute the operation
- names that describe intent, not transport details
- validated or clearly validateable data

A command should not contain:
- UI framework objects
- HTTP request objects
- terminal prompt objects
- database clients
- hidden execution side effects

Use the simplest representation that works:
- a named function argument object for simple cases
- a typed object when the command is passed around
- a class only when behavior, construction rules, or framework conventions justify it

### Command handler

A command handler executes one command.

A handler should:
- perform or coordinate the operation
- validate command-level preconditions
- call services, repositories, clients, or other collaborators explicitly
- return a useful result or throw a clear error

A handler should not:
- parse transport-specific input
- format UI or transport-specific output
- become a dumping ground for unrelated helper logic
- handle multiple unrelated commands

### Dispatcher or registry

A dispatcher maps command names/types to handlers.

Use a dispatcher when:
- commands are selected dynamically
- commands come from queues, scripts, plugins, APIs, or user input
- cross-cutting behavior such as logging, authorization, metrics, retries, or transactions should wrap command execution

Avoid a dispatcher when direct function calls are clearer.

## Practical structure

Use this default mapping when the project does not already have a clearer convention:

- `commands/**` → command definitions and handlers
- `services/**` → reusable behavior used by handlers
- `models/**` or `types/**` → shared data types
- entrypoints such as routes, CLI commands, workers, event listeners, or UI controllers → thin adapters that create commands and call handlers

Small projects can combine command type and handler in one file. Split only when the file becomes hard to scan or reuse.

## Flow

A typical flow is:

1. Entrypoint receives input from a user, system, queue, API, or scheduler.
2. Entrypoint parses transport-specific input.
3. Entrypoint builds a command using application-level names.
4. Handler validates and executes the command.
5. Handler returns a result.
6. Entrypoint translates the result into transport-specific output.

Keep transport details at the edges.

## Naming

Use verb-first names that describe the operation:

- `CreateProjectCommand`
- `CreateProjectHandler`
- `SyncWorkflowCommand`
- `RunHealthCheckHandler`
- `ArchiveMessagesCommand`

Avoid names that only describe technology:

- `PostRequestHandler`
- `ButtonClickCommand`
- `CliInputHandler`

## Validation

Put validation where it belongs:

- entrypoint validation: syntax, flags, request shape, required raw fields
- command validation: operation-level preconditions and input consistency
- domain/service validation: business rules and invariants

Do not let transport parsing leak into handlers.

## Cross-cutting concerns

Use decorators, middleware, or dispatcher wrappers when cross-cutting behavior must be consistent across commands:

- logging
- metrics
- retries
- transactions
- authorization
- audit trails
- idempotency

Keep wrappers small and explicit. Do not hide important behavior behind surprising magic.

## Undo, retry, and queues

The Command Pattern is especially useful when operations need to be:

- stored for later
- queued or scheduled
- retried safely
- logged or audited
- undone or compensated
- replayed in tests or automation

When these needs do not exist, prefer the simplest handler structure.

## Common mistakes

### 1. Treating every helper as a command

Only model meaningful operations as commands. Helpers should stay helpers.

### 2. Putting parsing and presentation in handlers

Handlers should execute application behavior, not know about HTTP, terminal UI, UI widgets, or queue payload formats unless that is truly the application boundary.

### 3. Creating abstract command infrastructure too early

Start with direct handlers. Add registries, buses, decorators, or middleware only when there is a concrete need.

### 4. Making one handler do too much

If a handler coordinates multiple unrelated operations, split it or extract services.

### 5. Hiding dependencies

Pass dependencies explicitly through constructors, factories, or parameters. Avoid global state unless the project convention already relies on it.

## Boundary questions

When deciding where code belongs, ask:

1. Is this transport/input parsing, or operation execution?
2. Is this one meaningful operation, or several unrelated operations?
3. Would this handler still make sense if the entrypoint changed?
4. Is command infrastructure solving a real problem, or adding ceremony?
5. Are dependencies and side effects visible enough to test and reason about?

## Practical default

When unsure, prefer:

1. thin entrypoints
2. one focused handler per meaningful operation
3. plain functions before classes or buses
4. explicit dependencies
5. simple command objects with clear names
6. infrastructure only when it removes duplication or enables required behavior
