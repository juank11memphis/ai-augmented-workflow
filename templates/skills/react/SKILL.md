---
name: react
description: Use this skill when working on React components and component design.
---

# react

Use this skill when working on React components and component design.

This skill covers React componentization, component responsibility, state ownership, and presentation-vs-interaction boundaries.

## Use this skill for

- creating or editing React components
- splitting large components
- deciding where state should live
- separating presentational components from server-interacting or data-owning components
- reviewing component responsibility and prop design

## Core principles

### 1. Treat components like focused functions
- A component should have one clear reason to exist.
- If a component does too many unrelated things, split it.
- Prefer small components with clear names and explicit responsibilities.
- Do not split components just to create more files; split when it improves understanding.

### 2. Separate presentational components from data-owning components
- Presentational components should mostly render UI from props.
- Data-owning components may fetch, subscribe, mutate, or coordinate data.
- Keep it obvious which components interact with the server and which are purely presentational.
- Avoid hiding server interactions deep inside components that look presentational.

### 3. Keep props narrow and explicit
- Pass only what the child component needs.
- Prefer specific props over large loosely typed objects.
- Use prop names that describe component intent, not implementation details.
- Avoid prop drilling when it makes the component tree hard to understand; do not add context prematurely.

### 4. Keep render logic pure
- Rendering should depend on props, state, and context.
- Do not mutate external values during render.
- Keep side effects out of render logic.
- Calculate derived values during render when they are cheap and deterministic.

### 5. Put state at the right level
- Keep state local when only one component needs it.
- Lift state to the closest common parent when multiple components need to coordinate.
- Avoid duplicating derived state that can be computed from props or existing state.
- Prefer a single clear source of truth.

### 6. Isolate interactivity
- Keep interactive behavior close to the component that owns it.
- If only a small part of the UI needs interactivity, isolate that part instead of making a larger tree interactive.
- Separate event handling from presentation when doing so makes responsibility clearer.

### 7. Prefer composition over configuration-heavy components
- Compose smaller components instead of building one component with many modes and flags.
- If a component needs many boolean props, consider whether it is doing too much.
- Use `children` or named subcomponents when composition makes the API clearer.

### 8. Make component boundaries visible
- Name components by what they represent in the UI or product.
- Keep server-interacting, stateful, and presentational responsibilities easy to identify from the component shape.
- Avoid mixing data fetching, mutation, layout, formatting, and low-level UI rendering in one component.

## Decision rule

When unsure, prefer:
1. one clear responsibility per component
2. presentational components that render from props
3. data/server interaction in obvious owner components
4. local state unless coordination requires lifting it
5. composition over flag-heavy component APIs
6. no duplicated derived state
