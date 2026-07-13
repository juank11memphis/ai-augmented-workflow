---
name: golang
description: Use this skill when writing or modifying Go files and you need practical Go guidance grounded in Effective Go and standard Go conventions.
---

# golang

Use this skill when writing or modifying `.go` files and you need practical Go guidance.

Apply this skill together with `clean-code`. Keep this skill focused on Go-specific decisions, not generic code-quality advice.

## Use this skill for

- writing new Go code
- editing existing Go packages
- shaping package APIs
- choosing between structs, interfaces, methods, and functions
- writing idiomatic Go error handling, concurrency, and tests

## Core principles

### 1. Follow Go's default shape
- Let `gofmt` and standard Go conventions decide most formatting.
- Prefer short, clear names that match common Go usage.
- Use lowercase package names with no underscores when possible.
- Favor the standard library before adding dependencies.

### 2. Keep packages small and APIs narrower than implementations
- Organize code around packages with clear responsibilities.
- Keep exported surface area small.
- Export only what callers truly need.

### 3. Prefer concrete types and useful zero values
- Design structs so the zero value is useful when practical.
- Prefer plain structs and functions over unnecessary constructors or class-like patterns.
- Avoid pointers unless mutation, sharing, interface contracts, or copy cost justify them.
- Return concrete types unless callers truly benefit from an interface.

### 4. Keep interfaces small and define them where they are used
- Prefer tiny behavior-focused interfaces, often with one or two methods.
- Usually define interfaces in the consuming package, not the implementing package.
- Do not introduce interfaces just for future flexibility or mocking.
- Accept interfaces when you need abstraction; return concrete types when you can.

### 5. Handle errors explicitly
- Return `error` for expected failure paths.
- Add context with wrapping, such as `fmt.Errorf("read config: %w", err)`.
- Use sentinel errors or typed errors only when callers need branching behavior.
- Do not use `panic` for normal control flow.

### 6. Choose methods and receivers deliberately
- Use value receivers for small immutable-like values.
- Use pointer receivers when methods mutate state, the type is large, or receiver consistency matters.
- Keep receiver style consistent for a given type.
- Prefer functions over methods when behavior does not depend on receiver state.

### 7. Keep control flow straightforward
- Prefer early returns for error handling.
- Use `switch` when it reads better than long `if` chains.
- Use `for` and `range` directly instead of trying to simulate other loop styles.
- Keep `defer` close to the resource acquisition it cleans up.

### 8. Use concurrency only when it clarifies or improves the design
- Do not add goroutines or channels unless they solve a real coordination or latency problem.
- Use `context.Context` for cancellation, deadlines, and request-scoped work.
- Be explicit about goroutine lifetime and shutdown paths.
- Prefer simple ownership and communication over shared mutable state.

### 9. Write table-driven tests when they improve coverage and readability
- Prefer small, focused tests in the same package unless external-package tests add value.
- Use table-driven tests for repeated input/output cases.
- Keep test cases named so failures explain themselves.
- Test exported behavior and important package contracts, not private implementation trivia.

### 10. Use structured logging for operational behavior
- When Go changes affect logs, workflows, handlers, jobs, external calls, errors, retries, state changes, or important outcomes, also use `structured-logging`.

## Decision rule

When unsure, prefer:
1. standard library and Go conventions
2. smaller package APIs
3. concrete types over premature interfaces
4. explicit error handling
5. simple sequential code before concurrency
