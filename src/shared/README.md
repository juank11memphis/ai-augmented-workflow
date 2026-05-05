# Shared source boundary

`src/shared` is reserved for universal primitives that do not own a Sibu product capability.

During the Deep Module code reorganization, the intended shared primitives are:

- `hash`
- `object`
- `paths`
- `types`

Product behavior from the Deep Module Map should move into the owning `src/modules/<deep-module-slug>/` folder in later stories. Do not use `src/shared` as a generic place for workflow, template, state, prompt, sync, skill, version, or release behavior.
