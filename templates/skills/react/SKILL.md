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
- constructing or refactoring page-level UI from smaller route-local components
- deciding when a page file should delegate sections, repeated items, panels, overlays, menus, states, and formatting helpers to focused files
- deciding where state should live
- separating presentational components from server-interacting or data-owning components
- reviewing component responsibility and prop design

## Core principles

### 1. Treat components like focused functions
- A component should have one clear reason to exist.
- Apply the Single Responsibility Principle aggressively: split components whenever rendering, state ownership, event handling, data access, layout, formatting, or low-level UI concerns start to blur together.
- Create as many components as needed to keep each component easy to name, test, scan, and change independently.
- Prefer small components with clear names and explicit responsibilities over broad components with internal sections.
- Do not preserve a large component just to avoid adding files; a few extra focused components are better than one file that hides multiple responsibilities.

### 2. Separate stateless, stateful, and data-owning components
- Stateless presentational components should render UI from props and avoid owning state or side effects.
- Stateful interaction components may own local UI state when that state belongs only to their focused responsibility.
- Data-owning components may fetch, subscribe, mutate, or coordinate server data.
- Keep stateless, stateful, and server-interacting responsibilities visibly separate; split components when those roles mix.
- Avoid hiding state transitions, server interactions, or mutations deep inside components that look presentational.

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
- Each component should live in its own file by default; do not define multiple components in the same file just because they are currently small.
- If a helper component is only temporary, promote it to its own file as soon as it represents a meaningful UI responsibility.

### 9. Build screens as composition roots, not component dumping grounds
- Treat page-level components, route-level containers, and major feature components as composition roots: they should assemble focused child components, not define every section, repeated item, overlay, menu, state, helper, and interaction inline.
- A top-level screen component may own data loading, high-level layout, route states, and wiring, but should delegate meaningful UI regions to named components.
- If a UI region has its own state, interaction, repeated rendering, overlay, menu, empty/error/loading state, or domain formatting concern, strongly prefer extracting it to a focused nearby file.
- Keep route entry files especially thin: they should fetch or prepare data, handle route-level states, and compose the screen. Avoid placing substantial presentational or interactive subcomponents directly inside them.
- Route-local or feature-local components are good defaults for UI that belongs to one screen or feature. Shared components should be extracted only when reuse is real, not speculative.

## File splitting triggers

When editing a React page, route container, or major component, extract a separate component or helper file when any of these are true:

- The file defines more than one meaningful UI responsibility, such as a container plus repeated item plus action surface plus state view.
- A nested component has a product/UI name a user, designer, or teammate would recognize.
- A UI region owns local state, submission or mutation behavior, pending/optimistic feedback, validation, confirmation, or recovery behavior.
- A component renders a repeated unit, such as a row, card, list item, tile, timeline entry, tab panel, or menu group.
- A component represents an empty state, error state, no-results state, loading state, permission state, or other named screen state.
- A helper formats domain-visible values, such as money, dates, percentages, names, quantities, labels, or statuses, and is used by more than one component.
- The parent component becomes hard to scan in one pass or requires scrolling through implementation details to understand the screen structure.

Prefer nearby files first, using names from the product or UI. For example:

```txt
page.tsx
feature-shell.tsx
feature-summary.tsx
feature-list.tsx
feature-item.tsx
feature-actions.tsx
feature-state.tsx
feature-format.ts
feature-types.ts
```

## Decision rule

When unsure, prefer:
1. route entry files as thin composition roots
2. route-level or feature-level containers that own only the interaction state they coordinate
3. one clear responsibility per component
4. more focused components instead of fewer overloaded components
5. one meaningful component per file by default
6. nearby component files before shared abstractions
7. stateless presentational components that render from props
8. stateful components only where local interaction state is genuinely owned
9. data/server interaction in obvious owner components
10. local state unless coordination requires lifting it
11. composition over flag-heavy component APIs
12. no duplicated derived state

## Componentization self-review

Before finishing a React change, ask:

- Can I understand the screen structure from the top-level file without reading repeated item, action surface, overlay, state, or formatting internals?
- Are meaningful UI regions and repeated units in named components?
- Does each file have one obvious reason to change?
- Are server/client boundaries still as small as practical?
- Did I avoid creating shared abstractions before there is real reuse?
