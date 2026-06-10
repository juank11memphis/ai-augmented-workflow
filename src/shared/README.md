# Shared source boundary

`src/shared` is reserved for universal primitives and cross-module contracts that do not own a Sibu product capability.

Allowed shared contents:

- `hash`: hashing primitives used by multiple modules.
- `object`: generic object helpers.
- `paths`: low-level project path helpers that do not own workflow behavior.
- `types`: shared TypeScript contracts used across module boundaries.

Do not use `src/shared` as a generic place for workflow, template, state, prompt, sync, skill, version, release, or target-planning behavior. If code encodes product policy or workflow decisions, put it in the owning Deep Module or a clearly named `src/support/*` helper.
